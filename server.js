/**
 * =======================================================================
 *                     LINDGREN-X v2.0
 *           Mineral License Intelligence System
 *
 *  Analyzes government mining databases to find high-value
 *  investment opportunities in expired/abandoned claims
 * =======================================================================
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const Database = require('./core/database');
const Harmonizer = require('./core/harmonizer');
const ConnectorFramework = require('./core/connector-framework');

// Configuration
const config = {
    port: process.env.PORT || 3000,
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

// Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// MINESCORE ALGORITHM (v1 preserved)
// ============================================================================

class MineScoreCalculator {
    constructor(database) {
        this.database = database;
    }

    /**
     * Calculate MineScore for a claim
     *
     * Total: 100 points
     * - Geological potential: 35 points
     * - Historical activity: 25 points
     * - Infrastructure access: 15 points
     * - Jurisdiction favorability: 15 points
     * - Market conditions: 10 points
     */
    async calculateScore(claim) {
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

        // Calculate investment metrics
        scores.acquisition_complexity = this.assessComplexity(claim);
        scores.estimated_cost = this.estimateCost(claim);
        scores.risk_level = this.assessRisk(claim, scores.total);
        scores.opportunity_type = this.classifyOpportunity(claim);

        return scores;
    }

    /**
     * Geological Potential Score (0-35 points)
     */
    scoreGeological(claim) {
        let score = 0;

        // Commodity value (0-20 points)
        const commodityScores = {
            'gold': 20,
            'lithium': 20,
            'rare earth': 20,
            'copper': 18,
            'silver': 16,
            'platinum': 18,
            'palladium': 18,
            'cobalt': 17,
            'nickel': 16,
            'uranium': 15,
            'zinc': 12,
            'lead': 10
        };

        const commodity = claim.commodity ? claim.commodity.toLowerCase() : '';
        score += commodityScores[commodity] || 10; // Default 10 for other minerals

        // Claim size (0-10 points)
        if (claim.area_hectares) {
            if (claim.area_hectares >= 400) score += 10; // Large claim
            else if (claim.area_hectares >= 160) score += 8;
            else if (claim.area_hectares >= 40) score += 6;
            else score += 4;
        } else {
            score += 5; // Default if area unknown
        }

        // Data quality bonus (0-5 points)
        if (claim.data_quality_score >= 80) score += 5;
        else if (claim.data_quality_score >= 60) score += 3;
        else score += 1;

        return Math.min(score, 35);
    }

    /**
     * Historical Activity Score (0-25 points)
     */
    scoreHistorical(claim) {
        let score = 0;

        // Time since last activity (0-15 points)
        if (claim.last_activity_date) {
            const monthsSinceActivity = this.monthsBetween(
                new Date(claim.last_activity_date),
                new Date()
            );

            if (monthsSinceActivity <= 12) score += 15; // Recent activity
            else if (monthsSinceActivity <= 24) score += 12;
            else if (monthsSinceActivity <= 36) score += 10;
            else if (monthsSinceActivity <= 60) score += 7;
            else score += 5;
        } else {
            score += 8; // Default if unknown
        }

        // Claim type (0-10 points)
        const typeScores = {
            'mineral': 10,
            'placer': 9,
            'exploration': 8,
            'mill_site': 5
        };
        score += typeScores[claim.claim_type] || 7;

        return Math.min(score, 25);
    }

    /**
     * Infrastructure Access Score (0-15 points)
     */
    scoreInfrastructure(claim) {
        let score = 0;

        // Region-based infrastructure scoring
        const regionScores = {
            'Nevada': 15,
            'Arizona': 13,
            'Utah': 12,
            'California': 11,
            'Idaho': 10,
            'Montana': 9,
            'Wyoming': 9,
            'Colorado': 11,
            'New Mexico': 10
        };

        score += regionScores[claim.region] || 8; // Default for other regions

        // If geometry is available, could calculate distance to roads/towns
        // For now, using region as proxy

        return Math.min(score, 15);
    }

    /**
     * Jurisdiction Favorability Score (0-15 points)
     */
    scoreJurisdiction(claim) {
        let score = 0;

        // Country scores
        if (claim.country_code === 'USA') score += 8;
        else if (claim.country_code === 'CAN') score += 8;
        else if (claim.country_code === 'AUS') score += 7;
        else score += 5;

        // State/Province specific scores
        const jurisdictionScores = {
            'Nevada': 7,
            'Arizona': 6,
            'Western Australia': 7,
            'British Columbia': 6,
            'Ontario': 6,
            'Quebec': 5
        };

        score += jurisdictionScores[claim.region] || 4;

        return Math.min(score, 15);
    }

    /**
     * Market Conditions Score (0-10 points)
     */
    scoreMarket(claim) {
        let score = 0;

        // Current market favorability for commodity
        const marketConditions = {
            'gold': 9,
            'lithium': 10,
            'rare earth': 10,
            'copper': 9,
            'silver': 8,
            'cobalt': 8,
            'nickel': 8,
            'uranium': 7,
            'platinum': 7,
            'zinc': 6
        };

        const commodity = claim.commodity ? claim.commodity.toLowerCase() : '';
        score += marketConditions[commodity] || 5;

        return Math.min(score, 10);
    }

    /**
     * Assess acquisition complexity
     */
    assessComplexity(claim) {
        if (claim.claim_status === 'expired') return 'easy';
        if (claim.claim_status === 'abandoned') return 'easy';
        if (claim.claim_status === 'pending') return 'moderate';
        return 'complex';
    }

    /**
     * Estimate acquisition cost (USD)
     */
    estimateCost(claim) {
        let baseCost = 5000; // Base filing and legal costs

        // Add per-hectare cost
        if (claim.area_hectares) {
            baseCost += claim.area_hectares * 50; // $50/hectare average
        }

        // Add outstanding fees if any
        if (claim.fees_due) {
            baseCost += claim.fees_due;
        }

        return Math.round(baseCost);
    }

    /**
     * Assess overall risk level
     */
    assessRisk(claim, totalScore) {
        if (totalScore >= 70) return 'low';
        if (totalScore >= 50) return 'medium';
        return 'high';
    }

    /**
     * Classify opportunity type
     */
    classifyOpportunity(claim) {
        if (claim.claim_status === 'expired') return 'expired_claim';
        if (claim.claim_status === 'abandoned') return 'abandoned_claim';
        return 'distressed_asset';
    }

    /**
     * Helper: Calculate months between dates
     */
    monthsBetween(date1, date2) {
        const months = (date2.getFullYear() - date1.getFullYear()) * 12;
        return months + date2.getMonth() - date1.getMonth();
    }

    /**
     * Score all unscored claims
     */
    async scoreAllClaims() {
        console.log('\n' + '='.repeat(60));
        console.log('RUNNING MINESCORE ALGORITHM');
        console.log('='.repeat(60));

        const claims = await database.getClaimsForScoring();
        console.log(`Found ${claims.length} claims to score`);

        let scored = 0;
        let errors = 0;

        for (const claim of claims) {
            try {
                const scores = await this.calculateScore(claim);
                await database.createOpportunity(claim.claim_id, scores);
                scored++;

                if (scored % 100 === 0) {
                    console.log(`  Scored ${scored}/${claims.length} claims...`);
                }
            } catch (err) {
                errors++;
                console.error(`Error scoring claim ${claim.claim_id}:`, err.message);
            }
        }

        console.log(`\n✓ Scoring complete: ${scored} scored, ${errors} errors`);
        console.log('='.repeat(60) + '\n');

        return { scored, errors };
    }
}

const mineScoreCalculator = new MineScoreCalculator(database);

// ============================================================================
// WEB DASHBOARD
// ============================================================================

/**
 * Dashboard HTML
 */
function getDashboardHTML(data = {}) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lindgren-X v2.0 - Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: #333;
            min-height: 100vh;
        }
        .header {
            background: rgba(0, 0, 0, 0.3);
            color: white;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .container {
            max-width: 1400px;
            margin: 2rem auto;
            padding: 0 2rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: white;
            border-radius: 10px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .stat-card h3 {
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
            margin-bottom: 0.5rem;
        }
        .stat-card .value {
            font-size: 2rem;
            font-weight: bold;
            color: #1e3c72;
        }
        .section {
            background: white;
            border-radius: 10px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .section h2 {
            color: #1e3c72;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #e0e0e0;
        }
        .connector-list {
            display: grid;
            gap: 1rem;
        }
        .connector-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 4px solid #1e3c72;
        }
        .connector-info h4 {
            margin-bottom: 0.25rem;
        }
        .connector-info p {
            color: #666;
            font-size: 0.9rem;
        }
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s;
        }
        .btn-primary {
            background: #1e3c72;
            color: white;
        }
        .btn-primary:hover {
            background: #2a5298;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-success:hover {
            background: #218838;
        }
        .opportunities-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        .opportunities-table th {
            background: #f8f9fa;
            padding: 1rem;
            text-align: left;
            border-bottom: 2px solid #dee2e6;
        }
        .opportunities-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #dee2e6;
        }
        .score-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9rem;
        }
        .score-high {
            background: #d4edda;
            color: #155724;
        }
        .score-medium {
            background: #fff3cd;
            color: #856404;
        }
        .score-low {
            background: #f8d7da;
            color: #721c24;
        }
        .action-buttons {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
        }
        .message {
            padding: 1rem;
            border-radius: 5px;
            margin-bottom: 1rem;
        }
        .message-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .message-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⛏️ LINDGREN-X v2.0</h1>
        <p>Mineral License Intelligence System</p>
    </div>

    <div class="container">
        ${data.message ? `<div class="message message-${data.message.type}">${data.message.text}</div>` : ''}

        <!-- Statistics -->
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Claims</h3>
                <div class="value">${data.stats?.total_claims || 0}</div>
            </div>
            <div class="stat-card">
                <h3>Opportunities</h3>
                <div class="value">${data.stats?.total_opportunities || 0}</div>
            </div>
            <div class="stat-card">
                <h3>High Value (70+)</h3>
                <div class="value">${data.stats?.high_value_opportunities || 0}</div>
            </div>
            <div class="stat-card">
                <h3>Expired Claims</h3>
                <div class="value">${data.stats?.expired_claims || 0}</div>
            </div>
            <div class="stat-card">
                <h3>Abandoned Claims</h3>
                <div class="value">${data.stats?.abandoned_claims || 0}</div>
            </div>
            <div class="stat-card">
                <h3>Active Sources</h3>
                <div class="value">${data.stats?.active_sources || 0}</div>
            </div>
        </div>

        <!-- Connectors -->
        <div class="section">
            <h2>Data Connectors</h2>
            <div class="connector-list">
                ${data.connectors?.map(c => `
                    <div class="connector-item">
                        <div class="connector-info">
                            <h4>${c.name}</h4>
                            <p>${c.country} ${c.region ? '- ' + c.region : ''} | Method: ${c.method}</p>
                        </div>
                        <form method="POST" action="/api/run-connector" style="display: inline;">
                            <input type="hidden" name="spec" value="${c.file}">
                            <button type="submit" class="btn btn-primary">Run Connector</button>
                        </form>
                    </div>
                `).join('') || '<p>No connectors found</p>'}
            </div>

            <div class="action-buttons">
                <form method="POST" action="/api/score-claims">
                    <button type="submit" class="btn btn-success">Run MineScore Algorithm</button>
                </form>
                <button class="btn btn-primary" onclick="location.reload()">Refresh Dashboard</button>
            </div>
        </div>

        <!-- Top Opportunities -->
        <div class="section">
            <h2>Top Investment Opportunities</h2>
            ${data.opportunities?.length > 0 ? `
                <table class="opportunities-table">
                    <thead>
                        <tr>
                            <th>Score</th>
                            <th>Location</th>
                            <th>Commodity</th>
                            <th>Status</th>
                            <th>Area (ha)</th>
                            <th>Risk</th>
                            <th>Est. Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.opportunities.map(opp => `
                            <tr>
                                <td>
                                    <span class="score-badge ${
                                        opp.total_minescore >= 70 ? 'score-high' :
                                        opp.total_minescore >= 50 ? 'score-medium' : 'score-low'
                                    }">
                                        ${opp.total_minescore}
                                    </span>
                                </td>
                                <td>${opp.location_name || 'Unknown'}, ${opp.region}</td>
                                <td>${opp.commodity || 'N/A'}</td>
                                <td>${opp.claim_status}</td>
                                <td>${opp.area_hectares || 'N/A'}</td>
                                <td>${opp.risk_level}</td>
                                <td>$${(opp.estimated_cost || 0).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p>No opportunities found. Run a connector to fetch data.</p>'}
        </div>
    </div>
</body>
</html>
    `;
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET / - Dashboard
 */
app.get('/', async (req, res) => {
    try {
        const stats = await database.getStats();
        const connectors = connectorFramework.listConnectors();
        const opportunities = await database.getTopOpportunities(50);

        res.send(getDashboardHTML({ stats, connectors, opportunities }));
    } catch (err) {
        res.send(getDashboardHTML({
            message: { type: 'error', text: `Error loading dashboard: ${err.message}` }
        }));
    }
});

/**
 * POST /api/run-connector - Run a specific connector
 */
app.post('/api/run-connector', async (req, res) => {
    try {
        const specFile = req.body.spec;

        if (!specFile) {
            throw new Error('No connector spec specified');
        }

        const specPath = `connectors/specs/${specFile}`;
        console.log(`\nRunning connector: ${specFile}`);

        const result = await connectorFramework.executeConnector(specPath);

        const stats = await database.getStats();
        const connectors = connectorFramework.listConnectors();
        const opportunities = await database.getTopOpportunities(50);

        res.send(getDashboardHTML({
            stats,
            connectors,
            opportunities,
            message: {
                type: 'success',
                text: `Connector completed! ${result.recordsInserted} records inserted in ${result.duration}s`
            }
        }));

    } catch (err) {
        console.error('Connector error:', err);

        const stats = await database.getStats();
        const connectors = connectorFramework.listConnectors();
        const opportunities = await database.getTopOpportunities(50);

        res.send(getDashboardHTML({
            stats,
            connectors,
            opportunities,
            message: {
                type: 'error',
                text: `Connector failed: ${err.message}`
            }
        }));
    }
});

/**
 * POST /api/score-claims - Run MineScore algorithm
 */
app.post('/api/score-claims', async (req, res) => {
    try {
        const result = await mineScoreCalculator.scoreAllClaims();

        const stats = await database.getStats();
        const connectors = connectorFramework.listConnectors();
        const opportunities = await database.getTopOpportunities(50);

        res.send(getDashboardHTML({
            stats,
            connectors,
            opportunities,
            message: {
                type: 'success',
                text: `MineScore complete! ${result.scored} claims scored`
            }
        }));

    } catch (err) {
        console.error('Scoring error:', err);

        const stats = await database.getStats();
        const connectors = connectorFramework.listConnectors();
        const opportunities = await database.getTopOpportunities(50);

        res.send(getDashboardHTML({
            stats,
            connectors,
            opportunities,
            message: {
                type: 'error',
                text: `Scoring failed: ${err.message}`
            }
        }));
    }
});

/**
 * GET /api/opportunities - JSON API for opportunities
 */
app.get('/api/opportunities', async (req, res) => {
    try {
        const filters = {
            country_code: req.query.country,
            region: req.query.region,
            commodity: req.query.commodity,
            min_score: req.query.min_score ? parseInt(req.query.min_score) : null
        };

        const opportunities = await database.getOpportunitiesByFilters(filters);
        res.json(opportunities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/stats - JSON API for statistics
 */
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await database.getStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// STARTUP
// ============================================================================

async function startup() {
    console.log('\n' + '='.repeat(70));
    console.log('  LINDGREN-X v2.0 - Mineral License Intelligence System');
    console.log('='.repeat(70) + '\n');

    try {
        // Test database connection
        console.log('Testing database connection...');
        await database.testConnection();

        // Get stats
        const stats = await database.getStats();
        console.log('\nCurrent Database Status:');
        console.log(`  Total Claims: ${stats.total_claims}`);
        console.log(`  Opportunities: ${stats.total_opportunities}`);
        console.log(`  Active Sources: ${stats.active_sources}`);

        // Start web server
        app.listen(config.port, () => {
            console.log('\n' + '='.repeat(70));
            console.log(`  🚀 Lindgren-X v2.0 is running!`);
            console.log(`  📊 Dashboard: http://localhost:${config.port}`);
            console.log(`  💾 Database: ${config.database.database}@${config.database.host}`);
            console.log('='.repeat(70) + '\n');
        });

    } catch (err) {
        console.error('\n✗ Startup failed:', err.message);
        console.error('\nPlease check:');
        console.error('  1. PostgreSQL is running');
        console.error('  2. Database exists (or run schema.sql to create it)');
        console.error('  3. .env file has correct credentials');
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\nShutting down Lindgren-X v2.0...');
    await connectorFramework.close();
    await database.close();
    process.exit(0);
});

// Start the application
startup();
