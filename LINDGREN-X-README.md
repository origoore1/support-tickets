# 🏔️ LINDGREN-X v2.0

**Mineral License Intelligence System**

A professional-grade system that analyzes government mining databases to identify high-value investment opportunities in expired and abandoned mineral claims.

---

## 🎯 Overview

Lindgren-X v2.0 is a complete rewrite featuring a 5-layer architecture designed for scalability, extensibility, and professional deployment. The system screens mineral licenses from government databases (BLM, Australia DMIRS, Canada) and scores them using the proprietary **MineScore algorithm** to identify acquisition opportunities.

## ⚡ Key Features

- **5-Layer Architecture**: External Sources → Connectors → Harmonizer → Database → Scoring → API
- **YAML-Based Connectors**: Add new countries/regions without code changes
- **MineScore Algorithm**: Proprietary scoring system (geological 35%, historical 25%, infrastructure 15%, jurisdiction 15%, market 10%)
- **PostgreSQL + PostGIS**: Spatial queries for geographic analysis
- **Web Dashboard**: Real-time UI for running connectors and viewing opportunities
- **Professional Grade**: Built for mining exploration companies

---

## 📁 Architecture

```
lindgren-x-v2/
├── lindgren-x-v2.js          # Main application (Express server)
├── package.json              # Node.js dependencies
├── .env                      # Configuration (PostgreSQL credentials)
│
├── database/
│   └── schema.sql            # PostgreSQL + PostGIS schema
│
├── core/
│   ├── database.js           # Database operations
│   ├── harmonizer.js         # Data standardization
│   └── connector-framework.js # YAML connector execution
│
├── connectors/
│   └── specs/
│       └── US_BLM_NV.yaml    # Nevada BLM connector spec
│
├── raw_ingest/               # Downloaded raw data files
├── logs/                     # Application logs
├── debug/                    # Debug output
└── temp/                     # Temporary files
```

---

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v14+) - Already installed ✓
2. **PostgreSQL** (v12+) with PostGIS extension
3. **Playwright** browsers (for web scraping connectors)

### Installation

```bash
# 1. Install dependencies (DONE)
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Configure database
# Edit .env file with your PostgreSQL credentials:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lindgren_x_v2
DB_USER=postgres
DB_PASSWORD=your_password

# 4. Create database and initialize schema
createdb lindgren_x_v2
psql -d lindgren_x_v2 -f database/schema.sql

# 5. Start the application
npm start
```

### Access Dashboard

Open your browser to: **http://localhost:3000**

---

## 🔧 Configuration

### Environment Variables (.env)

```bash
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lindgren_x_v2
DB_USER=postgres
DB_PASSWORD=your_password

# Application
PORT=3000
NODE_ENV=development

# Paths
RAW_DATA_PATH=./raw_ingest
LOGS_PATH=./logs
DEBUG_PATH=./debug
TEMP_PATH=./temp
```

---

## 📊 Database Schema

### Tables

- **data_sources**: Configured data connectors
- **connector_runs**: Execution history
- **harmonized_claims**: Standardized mineral claims
- **opportunities**: Scored investment opportunities

### Views

- **opportunity_summary**: Denormalized view of top opportunities

---

## 🔌 Connectors

### Available Connectors

1. **US_BLM_NV.yaml**: Nevada Bureau of Land Management
   - Method: Download (GeoJSON)
   - Update: Monthly
   - Status: Active

### Creating New Connectors

Create a YAML file in `connectors/specs/`:

```yaml
metadata:
  name: "Your Connector Name"
  version: "1.0.0"

source:
  country_code: "USA"
  region: "Nevada"
  type: "government"

extraction:
  method: "download"  # or "scrape", "api"
  download:
    url: "https://..."
    format: "json"    # or "zip", "csv", "shp"

field_mappings:
  external_id: "properties.ID"
  claim_status: "properties.STATUS"
  # ... more mappings
```

---

## 📈 MineScore Algorithm

### Scoring Components

| Factor | Weight | Description |
|--------|--------|-------------|
| **Geological** | 35% | Commodity value, claim size, data quality |
| **Historical** | 25% | Recent activity, claim type, production history |
| **Infrastructure** | 15% | Access to roads, towns, services |
| **Jurisdiction** | 15% | Mining-friendly regulations, permit process |
| **Market** | 10% | Current commodity demand and prices |

### Score Ranges

- **70-100**: High-value opportunity (low risk)
- **50-69**: Medium-value opportunity (medium risk)
- **0-49**: Lower-value opportunity (higher risk)

---

## 🌐 API Endpoints

### Dashboard
- `GET /` - Web dashboard UI

### Actions
- `POST /api/run-connector` - Execute a connector
- `POST /api/score-claims` - Run MineScore algorithm

### Data API
- `GET /api/opportunities?country=USA&min_score=70` - Filter opportunities
- `GET /api/stats` - System statistics

---

## 🛠️ Usage Workflow

1. **Run Connector**: Click "Run Connector" on dashboard to fetch data
2. **Harmonize Data**: System automatically standardizes data
3. **Score Claims**: Click "Run MineScore Algorithm" to score opportunities
4. **Review Opportunities**: View top-scored opportunities in dashboard
5. **Export Data**: Use API endpoints for integration with other systems

---

## 📦 Dependencies

- **express**: Web server framework
- **pg**: PostgreSQL client
- **playwright**: Web scraping (headless browser)
- **yaml**: YAML parser for connector specs
- **adm-zip**: ZIP file extraction
- **shapefile**: Shapefile parsing
- **dotenv**: Environment configuration

---

## 🔒 Security Notes

- Never commit `.env` file to version control
- Use read-only database credentials for production
- Implement authentication for public deployments
- Rate-limit API endpoints for production use

---

## 🚀 Production Deployment

### Recommended Setup

1. **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL)
2. **Application**: Container deployment (Docker + Kubernetes)
3. **Scaling**: Horizontal scaling with load balancer
4. **Monitoring**: Application performance monitoring (APM)
5. **Backups**: Daily database backups with point-in-time recovery

---

## 📝 Development Roadmap

### Current Version (v2.0)
- ✅ YAML-based connector framework
- ✅ Nevada BLM connector
- ✅ MineScore algorithm
- ✅ Web dashboard
- ✅ PostgreSQL + PostGIS

### Future Enhancements (v2.1+)
- 🔜 Additional connectors (Australia, Canada)
- 🔜 Machine learning for scoring refinement
- 🔜 Email alerts for new high-value opportunities
- 🔜 Mobile-responsive dashboard
- 🔜 Export to CSV/Excel
- 🔜 Map visualization of claims

---

## 🐛 Troubleshooting

### Database Connection Failed
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Ensure database exists: `psql -l`

### Connector Fails
- Check internet connectivity
- Verify source URL is accessible
- Review logs in `./logs/` directory

### No Opportunities Found
- Run a connector first to fetch data
- Run MineScore algorithm to score claims
- Check claim status filter (expired/abandoned)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👤 Author

**Lindgren-X Team**
- Professional mining intelligence system
- Built for exploration companies

---

## 🙏 Acknowledgments

- Bureau of Land Management (BLM) for public data access
- Mining industry professionals for domain expertise
- Open-source community for excellent tools

---

**Last Updated**: November 2025
**Version**: 2.0.0
**Status**: Production Ready
