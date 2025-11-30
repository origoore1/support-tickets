/**
 * Lindgren-X v2.0 - Database Module
 * PostgreSQL + PostGIS operations
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class Database {
    constructor(config) {
        this.pool = new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password,
            max: 20, // Maximum pool size
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.pool.on('error', (err) => {
            console.error('Unexpected PostgreSQL pool error:', err);
        });
    }

    /**
     * Test database connection
     */
    async testConnection() {
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            client.release();
            console.log('✓ Database connected:', result.rows[0].now);
            return true;
        } catch (err) {
            console.error('✗ Database connection failed:', err.message);
            throw err;
        }
    }

    /**
     * Initialize database schema
     */
    async initializeSchema() {
        const schemaPath = path.join(__dirname, '../database/schema.sql');

        if (!fs.existsSync(schemaPath)) {
            throw new Error('Schema file not found: ' + schemaPath);
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        try {
            await this.pool.query(schemaSql);
            console.log('✓ Database schema initialized');
            return true;
        } catch (err) {
            console.error('✗ Schema initialization failed:', err.message);
            throw err;
        }
    }

    /**
     * Get or create data source
     */
    async getOrCreateSource(sourceConfig) {
        const { country_code, region, source_name, source_type, connector_spec } = sourceConfig;

        try {
            // Try to find existing source
            const result = await this.pool.query(
                `SELECT source_id FROM data_sources
                 WHERE country_code = $1 AND region = $2 AND source_name = $3`,
                [country_code, region, source_name]
            );

            if (result.rows.length > 0) {
                return result.rows[0].source_id;
            }

            // Create new source
            const insertResult = await this.pool.query(
                `INSERT INTO data_sources (country_code, region, source_name, source_type, connector_spec, status)
                 VALUES ($1, $2, $3, $4, $5, 'active')
                 RETURNING source_id`,
                [country_code, region, source_name, source_type, connector_spec]
            );

            return insertResult.rows[0].source_id;
        } catch (err) {
            console.error('Error getting/creating source:', err.message);
            throw err;
        }
    }

    /**
     * Create connector run record
     */
    async createConnectorRun(sourceId) {
        try {
            const result = await this.pool.query(
                `INSERT INTO connector_runs (source_id, start_time, status)
                 VALUES ($1, NOW(), 'running')
                 RETURNING run_id`,
                [sourceId]
            );
            return result.rows[0].run_id;
        } catch (err) {
            console.error('Error creating connector run:', err.message);
            throw err;
        }
    }

    /**
     * Update connector run status
     */
    async updateConnectorRun(runId, status, recordsFetched = 0, recordsHarmonized = 0, errorMessage = null) {
        try {
            await this.pool.query(
                `UPDATE connector_runs
                 SET end_time = NOW(), status = $2, records_fetched = $3,
                     records_harmonized = $4, error_message = $5
                 WHERE run_id = $1`,
                [runId, status, recordsFetched, recordsHarmonized, errorMessage]
            );
        } catch (err) {
            console.error('Error updating connector run:', err.message);
            throw err;
        }
    }

    /**
     * Insert harmonized claim data
     */
    async insertHarmonizedClaim(sourceId, runId, claimData) {
        try {
            const result = await this.pool.query(
                `INSERT INTO harmonized_claims (
                    source_id, run_id, external_id, claim_type, claim_status, commodity,
                    country_code, region, location_name, geometry, area_hectares,
                    filing_date, expiry_date, last_activity_date,
                    holder_name, holder_type, work_required, fees_due,
                    data_quality_score, raw_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                          ST_GeomFromGeoJSON($10), $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                ON CONFLICT (source_id, external_id)
                DO UPDATE SET
                    claim_status = EXCLUDED.claim_status,
                    expiry_date = EXCLUDED.expiry_date,
                    last_activity_date = EXCLUDED.last_activity_date,
                    holder_name = EXCLUDED.holder_name,
                    work_required = EXCLUDED.work_required,
                    fees_due = EXCLUDED.fees_due,
                    raw_data = EXCLUDED.raw_data,
                    ingestion_date = CURRENT_TIMESTAMP
                RETURNING claim_id`,
                [
                    sourceId, runId, claimData.external_id, claimData.claim_type,
                    claimData.claim_status, claimData.commodity, claimData.country_code,
                    claimData.region, claimData.location_name,
                    claimData.geometry ? JSON.stringify(claimData.geometry) : null,
                    claimData.area_hectares, claimData.filing_date, claimData.expiry_date,
                    claimData.last_activity_date, claimData.holder_name, claimData.holder_type,
                    claimData.work_required, claimData.fees_due, claimData.data_quality_score,
                    claimData.raw_data ? JSON.stringify(claimData.raw_data) : null
                ]
            );
            return result.rows[0].claim_id;
        } catch (err) {
            console.error('Error inserting harmonized claim:', err.message);
            throw err;
        }
    }

    /**
     * Bulk insert harmonized claims (faster for large datasets)
     */
    async bulkInsertHarmonizedClaims(sourceId, runId, claimsArray) {
        const client = await this.pool.connect();
        let insertedCount = 0;
        let errorCount = 0;

        try {
            await client.query('BEGIN');

            for (let i = 0; i < claimsArray.length; i++) {
                const claim = claimsArray[i];
                const savepointName = `claim_${i}`;

                try {
                    // Create savepoint before each insert to allow individual rollbacks
                    await client.query(`SAVEPOINT ${savepointName}`);

                    // Use client connection (not pool) to ensure operations are within transaction
                    await client.query(
                        `INSERT INTO harmonized_claims (
                            source_id, run_id, external_id, claim_type, claim_status, commodity,
                            country_code, region, location_name, geometry, area_hectares,
                            filing_date, expiry_date, last_activity_date,
                            holder_name, holder_type, work_required, fees_due,
                            data_quality_score, raw_data
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                                  ST_GeomFromGeoJSON($10), $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                        ON CONFLICT (source_id, external_id)
                        DO UPDATE SET
                            claim_status = EXCLUDED.claim_status,
                            expiry_date = EXCLUDED.expiry_date,
                            last_activity_date = EXCLUDED.last_activity_date,
                            holder_name = EXCLUDED.holder_name,
                            work_required = EXCLUDED.work_required,
                            fees_due = EXCLUDED.fees_due,
                            raw_data = EXCLUDED.raw_data,
                            ingestion_date = CURRENT_TIMESTAMP`,
                        [
                            sourceId, runId, claim.external_id, claim.claim_type,
                            claim.claim_status, claim.commodity, claim.country_code,
                            claim.region, claim.location_name,
                            claim.geometry ? JSON.stringify(claim.geometry) : null,
                            claim.area_hectares, claim.filing_date, claim.expiry_date,
                            claim.last_activity_date, claim.holder_name, claim.holder_type,
                            claim.work_required, claim.fees_due, claim.data_quality_score,
                            claim.raw_data ? JSON.stringify(claim.raw_data) : null
                        ]
                    );

                    // Release savepoint on success
                    await client.query(`RELEASE SAVEPOINT ${savepointName}`);
                    insertedCount++;
                } catch (err) {
                    // Rollback to savepoint on error, allowing transaction to continue
                    await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
                    errorCount++;

                    // Log detailed error information
                    if (err.code === '23514') {
                        // CHECK constraint violation
                        console.error(`Error inserting claim ${claim.external_id}: CHECK constraint violation`);
                        console.error(`  → claim_status: "${claim.claim_status}" (must be: active, expired, abandoned, pending, closed, suspended, unknown)`);
                    } else if (err.code === '23505') {
                        // Duplicate key
                        console.error(`Error inserting claim ${claim.external_id}: Duplicate record (already exists)`);
                    } else {
                        console.error(`Error inserting claim ${claim.external_id}:`, err.message);
                        if (err.code) console.error(`  → Error code: ${err.code}`);
                    }
                }
            }

            await client.query('COMMIT');
            console.log(`✓ Bulk insert: ${insertedCount} claims inserted, ${errorCount} errors`);
            return { insertedCount, errorCount };
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Bulk insert failed:', err.message);
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Get claims for scoring (expired/abandoned claims without opportunities)
     */
    async getClaimsForScoring() {
        try {
            const result = await this.pool.query(
                `SELECT c.* FROM harmonized_claims c
                 LEFT JOIN opportunities o ON c.claim_id = o.claim_id
                 WHERE c.claim_status IN ('expired', 'abandoned')
                 AND o.opportunity_id IS NULL
                 ORDER BY c.expiry_date DESC
                 LIMIT 1000`
            );
            return result.rows;
        } catch (err) {
            console.error('Error getting claims for scoring:', err.message);
            throw err;
        }
    }

    /**
     * Create opportunity from scored claim
     */
    async createOpportunity(claimId, scores) {
        try {
            const result = await this.pool.query(
                `INSERT INTO opportunities (
                    claim_id, geological_score, historical_score, infrastructure_score,
                    jurisdiction_score, market_score, total_minescore,
                    acquisition_complexity, estimated_cost, risk_level, opportunity_type
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING opportunity_id`,
                [
                    claimId, scores.geological, scores.historical, scores.infrastructure,
                    scores.jurisdiction, scores.market, scores.total,
                    scores.acquisition_complexity, scores.estimated_cost,
                    scores.risk_level, scores.opportunity_type
                ]
            );
            return result.rows[0].opportunity_id;
        } catch (err) {
            console.error('Error creating opportunity:', err.message);
            throw err;
        }
    }

    /**
     * Get top opportunities
     */
    async getTopOpportunities(limit = 100) {
        try {
            const result = await this.pool.query(
                `SELECT * FROM opportunity_summary
                 WHERE total_minescore >= 50
                 ORDER BY total_minescore DESC
                 LIMIT $1`,
                [limit]
            );
            return result.rows;
        } catch (err) {
            console.error('Error getting top opportunities:', err.message);
            throw err;
        }
    }

    /**
     * Get opportunities by filters
     */
    async getOpportunitiesByFilters(filters) {
        try {
            let query = 'SELECT * FROM opportunity_summary WHERE 1=1';
            const params = [];
            let paramCount = 1;

            if (filters.country_code) {
                query += ` AND country_code = $${paramCount}`;
                params.push(filters.country_code);
                paramCount++;
            }

            if (filters.region) {
                query += ` AND region = $${paramCount}`;
                params.push(filters.region);
                paramCount++;
            }

            if (filters.commodity) {
                query += ` AND commodity ILIKE $${paramCount}`;
                params.push(`%${filters.commodity}%`);
                paramCount++;
            }

            if (filters.min_score) {
                query += ` AND total_minescore >= $${paramCount}`;
                params.push(filters.min_score);
                paramCount++;
            }

            query += ' ORDER BY total_minescore DESC LIMIT 100';

            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (err) {
            console.error('Error getting filtered opportunities:', err.message);
            throw err;
        }
    }

    /**
     * Get statistics
     */
    async getStats() {
        try {
            const result = await this.pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM harmonized_claims) as total_claims,
                    (SELECT COUNT(*) FROM harmonized_claims WHERE claim_status = 'expired') as expired_claims,
                    (SELECT COUNT(*) FROM harmonized_claims WHERE claim_status = 'abandoned') as abandoned_claims,
                    (SELECT COUNT(*) FROM opportunities) as total_opportunities,
                    (SELECT COUNT(*) FROM opportunities WHERE total_minescore >= 70) as high_value_opportunities,
                    (SELECT COUNT(*) FROM data_sources WHERE status = 'active') as active_sources
            `);
            return result.rows[0];
        } catch (err) {
            console.error('Error getting stats:', err.message);
            throw err;
        }
    }

    /**
     * Close database connection
     */
    async close() {
        await this.pool.end();
        console.log('✓ Database connection closed');
    }
}

module.exports = Database;
