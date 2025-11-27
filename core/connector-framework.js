/**
 * Lindgren-X v2.0 - Connector Framework
 * Executes YAML-based connector specifications
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { chromium } = require('playwright');
const https = require('https');
const AdmZip = require('adm-zip');
const shapefile = require('shapefile');

class ConnectorFramework {
    constructor(database, harmonizer, config) {
        this.database = database;
        this.harmonizer = harmonizer;
        this.config = config;
        this.browser = null;
    }

    /**
     * Load connector specification from YAML file
     */
    loadSpec(specPath) {
        try {
            const fullPath = path.isAbsolute(specPath) ? specPath : path.join(process.cwd(), specPath);

            if (!fs.existsSync(fullPath)) {
                throw new Error(`Connector spec not found: ${fullPath}`);
            }

            const yamlContent = fs.readFileSync(fullPath, 'utf8');
            const spec = yaml.parse(yamlContent);

            console.log(`✓ Loaded connector spec: ${spec.metadata.name}`);
            return spec;
        } catch (err) {
            console.error('Error loading connector spec:', err.message);
            throw err;
        }
    }

    /**
     * Execute connector based on specification
     */
    async executeConnector(specPath) {
        const spec = this.loadSpec(specPath);
        const startTime = new Date();

        console.log(`\n${'='.repeat(60)}`);
        console.log(`RUNNING CONNECTOR: ${spec.metadata.name}`);
        console.log(`${'='.repeat(60)}`);

        try {
            // Create data source and connector run
            const sourceId = await this.database.getOrCreateSource({
                country_code: spec.source.country_code,
                region: spec.source.region,
                source_name: spec.source.name,
                source_type: spec.source.type,
                connector_spec: specPath
            });

            const runId = await this.database.createConnectorRun(sourceId);

            console.log(`Source ID: ${sourceId}, Run ID: ${runId}`);

            // Execute based on method
            let rawData = [];
            switch (spec.extraction.method) {
                case 'download':
                    rawData = await this.executeDownload(spec);
                    break;
                case 'scrape':
                    rawData = await this.executeScrape(spec);
                    break;
                case 'api':
                    rawData = await this.executeAPI(spec);
                    break;
                default:
                    throw new Error(`Unknown extraction method: ${spec.extraction.method}`);
            }

            console.log(`✓ Extracted ${rawData.length} raw records`);

            // Harmonize data
            const { harmonized, errors } = this.harmonizer.harmonizeBatch(
                rawData,
                spec.source,
                spec.field_mappings
            );

            console.log(`✓ Harmonized ${harmonized.length} records (${errors.length} errors)`);

            // Insert into database
            const { insertedCount, errorCount } = await this.database.bulkInsertHarmonizedClaims(
                sourceId,
                runId,
                harmonized
            );

            // Update connector run status
            await this.database.updateConnectorRun(
                runId,
                'success',
                rawData.length,
                insertedCount
            );

            const duration = ((new Date() - startTime) / 1000).toFixed(2);

            console.log(`\n${'='.repeat(60)}`);
            console.log(`CONNECTOR COMPLETED SUCCESSFULLY`);
            console.log(`Duration: ${duration}s`);
            console.log(`Records: ${rawData.length} fetched → ${insertedCount} inserted`);
            console.log(`${'='.repeat(60)}\n`);

            return {
                success: true,
                sourceId,
                runId,
                recordsFetched: rawData.length,
                recordsInserted: insertedCount,
                duration
            };

        } catch (err) {
            console.error(`✗ Connector failed: ${err.message}`);

            // Try to update run status if we have a runId
            if (err.runId) {
                await this.database.updateConnectorRun(err.runId, 'failed', 0, 0, err.message);
            }

            throw err;
        }
    }

    /**
     * Execute download-based extraction
     */
    async executeDownload(spec) {
        console.log('Executing download extraction...');

        const downloadUrl = spec.extraction.download.url;
        const format = spec.extraction.download.format;

        // Download file
        const downloadPath = path.join(
            this.config.rawDataPath,
            `download_${Date.now()}.${format}`
        );

        await this.downloadFile(downloadUrl, downloadPath);
        console.log(`✓ Downloaded file: ${downloadPath}`);

        // Parse based on format
        let data = [];
        switch (format) {
            case 'zip':
                data = await this.parseZipFile(downloadPath, spec.extraction.download.target_file);
                break;
            case 'csv':
                data = await this.parseCSVFile(downloadPath);
                break;
            case 'json':
                data = await this.parseJSONFile(downloadPath);
                break;
            case 'shp':
                data = await this.parseShapefile(downloadPath);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

        return data;
    }

    /**
     * Execute web scraping extraction
     */
    async executeScrape(spec) {
        console.log('Executing web scraping extraction...');

        if (!this.browser) {
            this.browser = await chromium.launch({ headless: true });
        }

        const page = await this.browser.newPage();
        const data = [];

        try {
            await page.goto(spec.extraction.scrape.url, { waitUntil: 'networkidle' });
            console.log(`✓ Loaded page: ${spec.extraction.scrape.url}`);

            // Execute pre-actions if specified
            if (spec.extraction.scrape.pre_actions) {
                for (const action of spec.extraction.scrape.pre_actions) {
                    await this.executePageAction(page, action);
                }
            }

            // Wait for selector
            await page.waitForSelector(spec.extraction.scrape.selector);

            // Extract data
            const elements = await page.$$(spec.extraction.scrape.selector);
            console.log(`Found ${elements.length} elements`);

            for (const element of elements) {
                const record = {};

                // Extract fields based on mappings
                for (const [field, selector] of Object.entries(spec.extraction.scrape.field_selectors || {})) {
                    try {
                        const value = await element.$eval(selector, el => el.textContent.trim());
                        record[field] = value;
                    } catch (err) {
                        record[field] = null;
                    }
                }

                data.push(record);
            }

            await page.close();
            return data;

        } catch (err) {
            await page.close();
            throw err;
        }
    }

    /**
     * Execute API-based extraction
     */
    async executeAPI(spec) {
        console.log('Executing API extraction...');
        // API extraction implementation
        // This would depend on specific API requirements
        throw new Error('API extraction not yet implemented');
    }

    /**
     * Download file from URL
     */
    async downloadFile(url, destination) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destination);

            https.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Handle redirects
                    return this.downloadFile(response.headers.location, destination)
                        .then(resolve)
                        .catch(reject);
                }

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    resolve();
                });

            }).on('error', (err) => {
                fs.unlink(destination, () => {});
                reject(err);
            });
        });
    }

    /**
     * Parse ZIP file (extract and parse shapefile)
     */
    async parseZipFile(zipPath, targetFile) {
        console.log('Parsing ZIP file...');

        const zip = new AdmZip(zipPath);
        const extractPath = path.join(this.config.tempPath, `extract_${Date.now()}`);

        zip.extractAllTo(extractPath, true);
        console.log(`✓ Extracted to: ${extractPath}`);

        // Find shapefile
        const shpFile = path.join(extractPath, targetFile || this.findShapefile(extractPath));

        return await this.parseShapefile(shpFile);
    }

    /**
     * Find shapefile in directory
     */
    findShapefile(directory) {
        const files = fs.readdirSync(directory);
        const shpFile = files.find(f => f.endsWith('.shp'));

        if (!shpFile) {
            throw new Error('No shapefile found in extracted data');
        }

        return shpFile;
    }

    /**
     * Parse shapefile
     */
    async parseShapefile(shpPath) {
        console.log('Parsing shapefile...');

        const data = [];

        try {
            const source = await shapefile.open(shpPath);

            let result = await source.read();
            while (!result.done) {
                data.push(result.value);
                result = await source.read();
            }

            console.log(`✓ Parsed ${data.length} features from shapefile`);
            return data;

        } catch (err) {
            console.error('Shapefile parsing error:', err.message);
            throw err;
        }
    }

    /**
     * Parse CSV file
     */
    async parseCSVFile(csvPath) {
        console.log('Parsing CSV file...');
        // CSV parsing implementation
        // Would use a CSV parser library
        throw new Error('CSV parsing not yet implemented');
    }

    /**
     * Parse JSON file
     */
    async parseJSONFile(jsonPath) {
        console.log('Parsing JSON file...');

        const content = fs.readFileSync(jsonPath, 'utf8');
        return JSON.parse(content);
    }

    /**
     * Execute page action (for scraping)
     */
    async executePageAction(page, action) {
        switch (action.type) {
            case 'click':
                await page.click(action.selector);
                break;
            case 'fill':
                await page.fill(action.selector, action.value);
                break;
            case 'wait':
                await page.waitForTimeout(action.duration || 1000);
                break;
            default:
                console.warn(`Unknown action type: ${action.type}`);
        }
    }

    /**
     * List available connectors
     */
    listConnectors() {
        const specsDir = path.join(process.cwd(), 'connectors', 'specs');

        if (!fs.existsSync(specsDir)) {
            return [];
        }

        const files = fs.readdirSync(specsDir);
        const connectors = [];

        for (const file of files) {
            if (file.endsWith('.yaml') || file.endsWith('.yml')) {
                try {
                    const spec = this.loadSpec(path.join(specsDir, file));
                    connectors.push({
                        file,
                        name: spec.metadata.name,
                        country: spec.source.country_code,
                        region: spec.source.region,
                        method: spec.extraction.method
                    });
                } catch (err) {
                    console.error(`Error loading ${file}:`, err.message);
                }
            }
        }

        return connectors;
    }

    /**
     * Close browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = ConnectorFramework;
