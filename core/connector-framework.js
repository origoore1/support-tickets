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
                // Provide helpful error message, especially for Windows users
                let errorMsg = `Connector spec not found: ${fullPath}`;

                // Check if running on Windows and provide additional guidance
                if (process.platform === 'win32') {
                    const cwd = process.cwd();
                    const hasLindgrenFolder = fs.existsSync(path.join(cwd, 'lindgren-x-v2.js'));

                    if (!hasLindgrenFolder) {
                        errorMsg += `\n\n⚠️  WINDOWS USERS: You are running the application from the wrong directory!\n`;
                        errorMsg += `   Current directory: ${cwd}\n`;
                        errorMsg += `   \n`;
                        errorMsg += `   Please navigate to your project folder before starting:\n`;
                        errorMsg += `   1. Open PowerShell\n`;
                        errorMsg += `   2. Navigate to where you downloaded the files (should contain lindgren-x-v2.js)\n`;
                        errorMsg += `   3. Run: npm start\n`;
                        errorMsg += `   \n`;
                        errorMsg += `   Example: cd C:\\Users\\YourName\\lindgren-x-v2\n`;
                    }
                }

                throw new Error(errorMsg);
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

        const apiConfig = spec.extraction.api;
        const baseUrl = apiConfig.url;
        const maxRecords = apiConfig.max_records || 5000; // Default max 5000 records
        const pageSize = apiConfig.page_size || 1000; // Fetch 1000 at a time

        let allRecords = [];
        let offset = 0;
        let hasMore = true;

        console.log(`Fetching from API with pagination (page size: ${pageSize}, max: ${maxRecords})`);

        while (hasMore && allRecords.length < maxRecords) {
            const url = this.buildPaginatedUrl(baseUrl, offset, pageSize);
            console.log(`  Fetching page at offset ${offset}...`);

            try {
                const records = await this.fetchAPIPage(url);

                if (records.length === 0) {
                    hasMore = false;
                    console.log(`  No more records found`);
                } else {
                    allRecords = allRecords.concat(records);
                    console.log(`  Retrieved ${records.length} records (total: ${allRecords.length})`);

                    // Check if we got less than page size, meaning we're done
                    if (records.length < pageSize) {
                        hasMore = false;
                    } else {
                        offset += pageSize;
                    }
                }
            } catch (err) {
                console.error(`  Error fetching page: ${err.message}`);
                // If we have some records, return them; otherwise throw
                if (allRecords.length > 0) {
                    console.log(`  Returning ${allRecords.length} records fetched before error`);
                    hasMore = false;
                } else {
                    throw err;
                }
            }
        }

        console.log(`✓ Total records fetched: ${allRecords.length}`);
        return allRecords;
    }

    /**
     * Build paginated URL for API requests
     */
    buildPaginatedUrl(baseUrl, offset, pageSize) {
        const url = new URL(baseUrl);
        url.searchParams.set('resultOffset', offset.toString());
        url.searchParams.set('resultRecordCount', pageSize.toString());
        return url.toString();
    }

    /**
     * Fetch a single page from API
     */
    async fetchAPIPage(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                let data = '';

                // Handle redirects
                if (response.statusCode === 301 || response.statusCode === 302) {
                    return this.fetchAPIPage(response.headers.location)
                        .then(resolve)
                        .catch(reject);
                }

                // Check for error status codes
                if (response.statusCode !== 200) {
                    reject(new Error(`API returned status code ${response.statusCode}`));
                    return;
                }

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);

                        // Handle GeoJSON FeatureCollection
                        if (parsed.type === 'FeatureCollection' && parsed.features) {
                            resolve(parsed.features);
                        }
                        // Handle plain array
                        else if (Array.isArray(parsed)) {
                            resolve(parsed);
                        }
                        // Handle ArcGIS REST API response format
                        else if (parsed.features && Array.isArray(parsed.features)) {
                            resolve(parsed.features);
                        }
                        // Handle single object
                        else {
                            resolve([parsed]);
                        }
                    } catch (err) {
                        reject(new Error(`Failed to parse API response: ${err.message}`));
                    }
                });
            }).on('error', (err) => {
                reject(new Error(`API request failed: ${err.message}`));
            });
        });
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

        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            throw new Error('CSV file is empty');
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const data = [];

        // Parse rows
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || null;
            });

            // Wrap in GeoJSON-like structure if not already
            if (!row.properties) {
                data.push({ properties: row });
            } else {
                data.push(row);
            }
        }

        console.log(`✓ Parsed ${data.length} records from CSV`);
        return data;
    }

    /**
     * Parse JSON file
     */
    async parseJSONFile(jsonPath) {
        console.log('Parsing JSON file...');

        const content = fs.readFileSync(jsonPath, 'utf8');
        const parsed = JSON.parse(content);

        // Handle GeoJSON FeatureCollection
        if (parsed.type === 'FeatureCollection' && parsed.features) {
            console.log(`✓ Found GeoJSON with ${parsed.features.length} features`);
            return parsed.features;
        }

        // Handle plain array
        if (Array.isArray(parsed)) {
            return parsed;
        }

        // Handle single object - wrap in array
        return [parsed];
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
     * Process an uploaded file using a connector spec
     */
    async processUploadedFile(filePath, originalFilename, specPath) {
        const spec = this.loadSpec(specPath);
        const startTime = new Date();

        console.log(`\n${'='.repeat(60)}`);
        console.log(`PROCESSING UPLOADED FILE: ${originalFilename}`);
        console.log(`Using spec: ${spec.metadata.name}`);
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

            // Determine file type and parse accordingly
            let rawData = [];
            const extension = originalFilename.toLowerCase().split('.').pop();

            switch (extension) {
                case 'json':
                case 'geojson':
                    rawData = await this.parseJSONFile(filePath);
                    break;
                case 'csv':
                    rawData = await this.parseCSVFile(filePath);
                    break;
                case 'zip':
                    // For ZIP files, we need to extract and find the target file
                    const targetFile = spec.extraction.download?.target_file || null;
                    rawData = await this.parseZipFile(filePath, targetFile);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${extension}`);
            }

            console.log(`✓ Parsed ${rawData.length} raw records from uploaded file`);

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
            console.log(`FILE PROCESSING COMPLETED SUCCESSFULLY`);
            console.log(`Duration: ${duration}s`);
            console.log(`Records: ${rawData.length} parsed → ${insertedCount} inserted`);
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
            console.error(`✗ File processing failed: ${err.message}`);
            throw err;
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
