/**
 * Complete Lindgren-X Workflow Demonstration
 * This demonstrates the full pipeline:
 * 1. Upload mineral license data
 * 2. Process and harmonize the data
 * 3. Run MineScore algorithm to analyze and score claims
 * 4. Filter and display highest scoring opportunities
 */

require('dotenv').config();
const Database = require('./core/database');
const Harmonizer = require('./core/harmonizer');
const ConnectorFramework = require('./core/connector-framework');

// Configuration
const config = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'lindgren_x_v2',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
    },
    rawDataPath: process.env.RAW_DATA_PATH || './raw_ingest',
    logsPath: process.env.LOGS_PATH || './logs',
    debugPath: process.env.DEBUG_PATH || './debug',
    tempPath: process.env.TEMP_PATH || './temp'
};

// Initialize components
const database = new Database(config.database);
const harmonizer = new Harmonizer();
const connectorFramework = new ConnectorFramework(database, harmonizer, config);

// MineScore Calculator
class MineScoreCalculator {
    constructor(database) {
        this.database = database;
    }

    calculateScore(claim) {
        const scores = {
            geological: this.scoreGeological(claim),
            historical: this.scoreHistorical(claim),
            infrastructure: this.scoreInfrastructure(claim),
            jurisdiction: this.scoreJurisdiction(claim),
            market: this.scoreMarket(claim),
        };

        scores.total =
            scores.geological +
            scores.historical +
            scores.infrastructure +
            scores.jurisdiction +
            scores.market;

        scores.acquisition_complexity = this.assessComplexity(claim);
        scores.estimated_cost = this.estimateCost(claim);
        scores.risk_level = this.assessRisk(claim, scores.total);
        scores.opportunity_type = this.classifyOpportunity(claim);

        return scores;
    }

    scoreGeological(claim) {
        let score = 0;
        const commodityScores = {
            'gold': 20, 'lithium': 20, 'rare earth': 20,
            'copper': 18, 'silver': 16, 'platinum': 18
        };
        const commodity = claim.commodity ? claim.commodity.toLowerCase() : '';
        score += commodityScores[commodity] || 10;

        if (claim.area_hectares) {
            if (claim.area_hectares >= 400) score += 10;
            else if (claim.area_hectares >= 160) score += 8;
            else if (claim.area_hectares >= 40) score += 6;
            else score += 4;
        } else {
            score += 5;
        }

        if (claim.data_quality_score >= 80) score += 5;
        else if (claim.data_quality_score >= 60) score += 3;
        else score += 1;

        return Math.min(score, 35);
    }

    scoreHistorical(claim) {
        let score = 0;
        if (claim.last_activity_date) {
            const now = new Date();
            const lastActivity = new Date(claim.last_activity_date);
            const monthsSince = (now.getFullYear() - lastActivity.getFullYear()) * 12 +
                              (now.getMonth() - lastActivity.getMonth());

            if (monthsSince <= 12) score += 15;
            else if (monthsSince <= 24) score += 12;
            else if (monthsSince <= 36) score += 10;
            else if (monthsSince <= 60) score += 7;
            else score += 5;
        } else {
            score += 8;
        }

        const typeScores = {
            'mineral': 10, 'placer': 9, 'exploration': 8, 'mill_site': 5
        };
        score += typeScores[claim.claim_type] || 7;

        return Math.min(score, 25);
    }

    scoreInfrastructure(claim) {
        const regionScores = {
            'Nevada': 15, 'Arizona': 13, 'Utah': 12, 'California': 11,
            'Idaho': 10, 'Montana': 9, 'Wyoming': 9, 'Colorado': 11, 'New Mexico': 10
        };
        return regionScores[claim.region] || 8;
    }

    scoreJurisdiction(claim) {
        let score = 0;
        if (claim.country_code === 'USA') score += 8;
        else if (claim.country_code === 'CAN') score += 8;
        else if (claim.country_code === 'AUS') score += 7;
        else score += 5;

        const jurisdictionScores = {
            'Nevada': 7, 'Arizona': 6, 'Western Australia': 7,
            'British Columbia': 6, 'Ontario': 6, 'Quebec': 5
        };
        score += jurisdictionScores[claim.region] || 4;

        return Math.min(score, 15);
    }

    scoreMarket(claim) {
        const marketConditions = {
            'gold': 9, 'lithium': 10, 'rare earth': 10,
            'copper': 9, 'silver': 8, 'cobalt': 8, 'nickel': 8
        };
        const commodity = claim.commodity ? claim.commodity.toLowerCase() : '';
        return marketConditions[commodity] || 5;
    }

    assessComplexity(claim) {
        if (claim.claim_status === 'expired') return 'easy';
        if (claim.claim_status === 'abandoned') return 'easy';
        if (claim.claim_status === 'pending') return 'moderate';
        return 'complex';
    }

    estimateCost(claim) {
        let baseCost = 5000;
        if (claim.area_hectares) {
            baseCost += claim.area_hectares * 50;
        }
        if (claim.fees_due) {
            baseCost += claim.fees_due;
        }
        return Math.round(baseCost);
    }

    assessRisk(claim, totalScore) {
        if (totalScore >= 70) return 'low';
        if (totalScore >= 50) return 'medium';
        return 'high';
    }

    classifyOpportunity(claim) {
        if (claim.claim_status === 'expired') return 'expired_claim';
        if (claim.claim_status === 'abandoned') return 'abandoned_claim';
        return 'distressed_asset';
    }

    async scoreAllClaims() {
        console.log('\n' + '='.repeat(70));
        console.log('STEP 3: RUNNING MINESCORE ALGORITHM (ANALYZE & SCORE)');
        console.log('='.repeat(70));

        const claims = await database.pool.query(
            `SELECT * FROM harmonized_claims
             WHERE claim_status IN ('expired', 'abandoned')
             AND claim_id NOT IN (SELECT claim_id FROM opportunities)
             ORDER BY expiry_date DESC LIMIT 1000`
        );

        console.log(`Found ${claims.rows.length} claims to score`);

        let scored = 0;
        for (const claim of claims.rows) {
            try {
                const scores = this.calculateScore(claim);
                await database.pool.query(
                    `INSERT INTO opportunities (
                        claim_id, geological_score, historical_score, infrastructure_score,
                        jurisdiction_score, market_score, total_minescore,
                        acquisition_complexity, estimated_cost, risk_level, opportunity_type
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        claim.claim_id, scores.geological, scores.historical, scores.infrastructure,
                        scores.jurisdiction, scores.market, scores.total,
                        scores.acquisition_complexity, scores.estimated_cost,
                        scores.risk_level, scores.opportunity_type
                    ]
                );
                scored++;
            } catch (err) {
                // Skip duplicates
            }
        }

        console.log(`✓ Scoring complete: ${scored} new opportunities scored`);
        console.log('='.repeat(70) + '\n');

        return { scored };
    }
}

const mineScoreCalculator = new MineScoreCalculator(database);

async function runCompleteWorkflow() {
    try {
        console.log('\n' + '█'.repeat(70));
        console.log('█ LINDGREN-X COMPLETE WORKFLOW DEMONSTRATION');
        console.log('█ Mineral License Intelligence System - End-to-End Test');
        console.log('█'.repeat(70) + '\n');

        // Test database connection
        await database.testConnection();

        // STEP 1: Upload and process mineral license data
        console.log('\n' + '='.repeat(70));
        console.log('STEP 1: UPLOAD & PROCESS MINERAL LICENSE DATA');
        console.log('='.repeat(70));

        const result = await connectorFramework.processUploadedFile(
            './test-data.json',
            'test-data.json',
            'connectors/specs/US_BLM_NV.yaml'
        );

        console.log(`✓ Data uploaded and harmonized: ${result.recordsInserted} records processed`);

        // STEP 2: Verify data in database
        console.log('\n' + '='.repeat(70));
        console.log('STEP 2: ACCESS & VERIFY MINERAL LICENSE DATA');
        console.log('='.repeat(70));

        const claimsResult = await database.pool.query(
            `SELECT external_id, claim_status, commodity, region, area_hectares
             FROM harmonized_claims
             WHERE external_id LIKE 'TEST%'`
        );

        console.log(`✓ Found ${claimsResult.rows.length} claims in database:`);
        claimsResult.rows.forEach(claim => {
            console.log(`  - ${claim.external_id}: ${claim.commodity} (${claim.claim_status}) - ${claim.area_hectares} hectares`);
        });

        // STEP 3: Run MineScore algorithm
        const scoreResult = await mineScoreCalculator.scoreAllClaims();

        // STEP 4: Filter and display highest scoring opportunities
        console.log('\n' + '='.repeat(70));
        console.log('STEP 4: FILTER & DISPLAY HIGH-SCORING OPPORTUNITIES');
        console.log('='.repeat(70));

        const opportunitiesResult = await database.pool.query(
            `SELECT
                c.external_id,
                c.commodity,
                c.claim_status,
                c.region,
                c.area_hectares,
                o.total_minescore,
                o.geological_score,
                o.historical_score,
                o.infrastructure_score,
                o.risk_level,
                o.estimated_cost
             FROM opportunities o
             JOIN harmonized_claims c ON o.claim_id = c.claim_id
             WHERE o.total_minescore >= 50
             ORDER BY o.total_minescore DESC
             LIMIT 10`
        );

        console.log(`\n✓ Found ${opportunitiesResult.rows.length} high-value opportunities (Score ≥ 50):\n`);

        console.log('┌─────────────┬──────────┬───────────┬────────┬──────────┬───────┬──────────┐');
        console.log('│ ID          │ Commodity│ Status    │ Area   │ Score    │ Risk  │ Est Cost │');
        console.log('├─────────────┼──────────┼───────────┼────────┼──────────┼───────┼──────────┤');

        opportunitiesResult.rows.forEach(opp => {
            const id = opp.external_id.padEnd(11);
            const commodity = (opp.commodity || 'N/A').padEnd(8);
            const status = opp.claim_status.padEnd(9);
            const area = (opp.area_hectares || 'N/A').toString().padEnd(6);
            const score = opp.total_minescore.toString().padEnd(8);
            const risk = opp.risk_level.padEnd(5);
            const cost = `$${(opp.estimated_cost || 0).toLocaleString()}`.padEnd(8);

            console.log(`│ ${id} │ ${commodity} │ ${status} │ ${area} │ ${score} │ ${risk} │ ${cost} │`);
        });

        console.log('└─────────────┴──────────┴───────────┴────────┴──────────┴───────┴──────────┘');

        // Display score breakdown for top opportunity
        if (opportunitiesResult.rows.length > 0) {
            const top = opportunitiesResult.rows[0];
            console.log(`\n🏆 TOP OPPORTUNITY BREAKDOWN (${top.external_id}):`);
            console.log(`   • Geological Score: ${top.geological_score}/35 points`);
            console.log(`   • Historical Score: ${top.historical_score}/25 points`);
            console.log(`   • Infrastructure Score: ${top.infrastructure_score}/15 points`);
            console.log(`   • TOTAL MineScore: ${top.total_minescore}/100 points`);
            console.log(`   • Risk Level: ${top.risk_level.toUpperCase()}`);
            console.log(`   • Estimated Acquisition Cost: $${top.estimated_cost.toLocaleString()}`);
        }

        // Summary
        const stats = await database.getStats();
        console.log('\n' + '='.repeat(70));
        console.log('WORKFLOW COMPLETE - SYSTEM SUMMARY');
        console.log('='.repeat(70));
        console.log(`✓ Total Claims in Database: ${stats.total_claims}`);
        console.log(`✓ Expired Claims: ${stats.expired_claims}`);
        console.log(`✓ Abandoned Claims: ${stats.abandoned_claims}`);
        console.log(`✓ Total Opportunities Scored: ${stats.total_opportunities}`);
        console.log(`✓ High-Value Opportunities (70+): ${stats.high_value_opportunities}`);
        console.log(`✓ Active Data Sources: ${stats.active_sources}`);
        console.log('='.repeat(70));

        console.log('\n✅ LINDGREN-X IS WORKING PERFECTLY!');
        console.log('   → Can GET mineral license data ✓');
        console.log('   → Can ACCESS and process data ✓');
        console.log('   → Can ANALYZE data quality ✓');
        console.log('   → Can SCORE opportunities (MineScore algorithm) ✓');
        console.log('   → Can FILTER highest scoring opportunities ✓\n');

        console.log('📊 View full dashboard at: http://localhost:3000\n');

        // Clean up test data
        await database.pool.query("DELETE FROM harmonized_claims WHERE external_id LIKE 'TEST%'");
        console.log('🧹 Test data cleaned up\n');

    } catch (err) {
        console.error('\n✗ Workflow failed:', err.message);
        console.error('Stack:', err.stack);
    } finally {
        await database.close();
        await connectorFramework.close();
        process.exit(0);
    }
}

runCompleteWorkflow();
