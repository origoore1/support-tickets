/**
 * Lindgren-X v2.0 - Harmonizer Module
 * Standardizes data from different sources into unified schema
 */

class Harmonizer {
    constructor() {
        // Status mapping for different jurisdictions
        this.statusMappings = {
            'active': ['active', 'open', 'valid', 'current', 'maintained'],
            'expired': ['expired', 'lapsed', 'terminated'],
            'abandoned': ['abandoned', 'forfeited', 'relinquished', 'cancelled'],
            'pending': ['pending', 'application', 'under review'],
            'suspended': ['suspended', 'on hold', 'inactive'],
            'closed': ['closed', 'completed', 'withdrawn']
        };

        // Commodity standardization
        this.commodityMappings = {
            'gold': ['gold', 'au', 'gold ore'],
            'silver': ['silver', 'ag', 'silver ore'],
            'copper': ['copper', 'cu', 'copper ore'],
            'lithium': ['lithium', 'li', 'lithium ore', 'spodumene'],
            'nickel': ['nickel', 'ni', 'nickel ore'],
            'cobalt': ['cobalt', 'co', 'cobalt ore'],
            'rare earth': ['rare earth', 'ree', 'rare earth elements'],
            'uranium': ['uranium', 'u', 'uranium ore'],
            'iron': ['iron', 'fe', 'iron ore'],
            'zinc': ['zinc', 'zn', 'zinc ore'],
            'lead': ['lead', 'pb', 'lead ore'],
            'platinum': ['platinum', 'pt', 'platinum group'],
            'palladium': ['palladium', 'pd'],
            'molybdenum': ['molybdenum', 'mo'],
            'tungsten': ['tungsten', 'w'],
            'tin': ['tin', 'sn'],
            'manganese': ['manganese', 'mn'],
            'chromium': ['chromium', 'cr'],
            'vanadium': ['vanadium', 'v']
        };
    }

    /**
     * Harmonize claim data from any source
     */
    harmonize(rawData, sourceConfig, fieldMappings) {
        try {
            const harmonized = {
                external_id: this.extractField(rawData, fieldMappings.external_id),
                claim_type: this.extractField(rawData, fieldMappings.claim_type),
                claim_status: this.standardizeStatus(this.extractField(rawData, fieldMappings.claim_status)),
                commodity: this.standardizeCommodity(this.extractField(rawData, fieldMappings.commodity)),

                // Geographic
                country_code: sourceConfig.country_code,
                region: sourceConfig.region || this.extractField(rawData, fieldMappings.region),
                location_name: this.extractField(rawData, fieldMappings.location_name),
                geometry: this.extractGeometry(rawData, fieldMappings.geometry),
                area_hectares: this.convertToHectares(
                    this.extractField(rawData, fieldMappings.area),
                    fieldMappings.area_unit || 'hectares'
                ),

                // Temporal
                filing_date: this.parseDate(this.extractField(rawData, fieldMappings.filing_date)),
                expiry_date: this.parseDate(this.extractField(rawData, fieldMappings.expiry_date)),
                last_activity_date: this.parseDate(this.extractField(rawData, fieldMappings.last_activity_date)),

                // Ownership
                holder_name: this.extractField(rawData, fieldMappings.holder_name),
                holder_type: this.classifyHolderType(this.extractField(rawData, fieldMappings.holder_name)),

                // Economic
                work_required: this.parseNumeric(this.extractField(rawData, fieldMappings.work_required)),
                fees_due: this.parseNumeric(this.extractField(rawData, fieldMappings.fees_due)),

                // Metadata
                data_quality_score: this.calculateDataQuality(rawData, fieldMappings),
                raw_data: rawData
            };

            return harmonized;
        } catch (err) {
            console.error('Harmonization error:', err.message);
            throw err;
        }
    }

    /**
     * Extract field from raw data using mapping path
     */
    extractField(rawData, fieldPath) {
        if (!fieldPath || !rawData) return null;

        // Handle direct field access
        if (typeof fieldPath === 'string') {
            // Support nested paths like "properties.CLAIM_NAME"
            const parts = fieldPath.split('.');
            let value = rawData;

            for (const part of parts) {
                if (value && typeof value === 'object' && part in value) {
                    value = value[part];
                } else {
                    return null;
                }
            }

            return value;
        }

        // Handle function-based extraction
        if (typeof fieldPath === 'function') {
            return fieldPath(rawData);
        }

        return null;
    }

    /**
     * Standardize status across jurisdictions
     */
    standardizeStatus(rawStatus) {
        if (!rawStatus) return 'unknown';

        const normalized = rawStatus.toString().toLowerCase().trim();

        // Step 1: Check YAML explicit mapping first (exact match)
        if (this.yamlStatusMap && this.yamlStatusMap[normalized]) {
            return this.yamlStatusMap[normalized];
        }

        // Step 2: Exact match on predefined variations
        for (const [standard, variations] of Object.entries(this.statusMappings)) {
            if (variations.some(v => normalized === v)) {
                return standard;
            }
        }

        // Step 3: Fuzzy matching (startsWith to avoid false positives like "inactive" matching "active")
        for (const [standard, variations] of Object.entries(this.statusMappings)) {
            if (variations.some(v => normalized.startsWith(v))) {
                return standard;
            }
        }

        // Log unrecognized status for future mapping improvements
        if (!this.loggedUnknownStatuses) {
            this.loggedUnknownStatuses = new Set();
        }
        if (!this.loggedUnknownStatuses.has(rawStatus)) {
            console.warn(`⚠ Unrecognized claim status: "${rawStatus}" → mapped to "unknown"`);
            this.loggedUnknownStatuses.add(rawStatus);
        }

        return 'unknown';
    }

    /**
     * Standardize commodity names
     */
    standardizeCommodity(rawCommodity) {
        if (!rawCommodity) return null;

        const normalized = rawCommodity.toString().toLowerCase().trim();

        for (const [standard, variations] of Object.entries(this.commodityMappings)) {
            if (variations.some(v => normalized.includes(v))) {
                return standard;
            }
        }

        // Return original if no match found
        return rawCommodity;
    }

    /**
     * Extract and standardize geometry to GeoJSON
     */
    extractGeometry(rawData, geometryMapping) {
        if (!geometryMapping) return null;

        try {
            // If geometry is already in GeoJSON format
            if (rawData.geometry && rawData.geometry.type) {
                return rawData.geometry;
            }

            // If we have lat/lon fields
            if (geometryMapping.lat && geometryMapping.lon) {
                const lat = this.parseNumeric(this.extractField(rawData, geometryMapping.lat));
                const lon = this.parseNumeric(this.extractField(rawData, geometryMapping.lon));

                if (lat && lon) {
                    return {
                        type: 'Point',
                        coordinates: [lon, lat]
                    };
                }
            }

            // If geometry is in WKT format
            if (geometryMapping.wkt) {
                const wkt = this.extractField(rawData, geometryMapping.wkt);
                // WKT parsing would need additional library in production
                // For now, return null
                return null;
            }

            return null;
        } catch (err) {
            console.error('Geometry extraction error:', err.message);
            return null;
        }
    }

    /**
     * Convert area to hectares
     */
    convertToHectares(area, unit) {
        if (!area) return null;

        const numeric = this.parseNumeric(area);
        if (!numeric) return null;

        const conversions = {
            'hectares': 1,
            'acres': 0.404686,
            'sq_km': 100,
            'sq_mi': 258.999,
            'sq_m': 0.0001
        };

        const factor = conversions[unit] || 1;
        return Math.round(numeric * factor * 100) / 100;
    }

    /**
     * Parse date from various formats
     */
    parseDate(dateString) {
        if (!dateString) return null;

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;

            // Return ISO format date (YYYY-MM-DD)
            return date.toISOString().split('T')[0];
        } catch (err) {
            return null;
        }
    }

    /**
     * Parse numeric value
     */
    parseNumeric(value) {
        if (value === null || value === undefined) return null;

        if (typeof value === 'number') return value;

        if (typeof value === 'string') {
            // Remove currency symbols and commas
            const cleaned = value.replace(/[$,\s]/g, '');
            const numeric = parseFloat(cleaned);
            return isNaN(numeric) ? null : numeric;
        }

        return null;
    }

    /**
     * Classify holder type based on name
     */
    classifyHolderType(holderName) {
        if (!holderName) return null;

        const name = holderName.toLowerCase();

        // Corporate indicators
        const corporateKeywords = ['inc', 'corp', 'ltd', 'llc', 'plc', 'gmbh', 'sa', 'mining', 'resources', 'minerals', 'exploration'];
        if (corporateKeywords.some(kw => name.includes(kw))) {
            return 'company';
        }

        // Government indicators
        const govKeywords = ['government', 'bureau', 'department', 'ministry', 'federal', 'state'];
        if (govKeywords.some(kw => name.includes(kw))) {
            return 'government';
        }

        // Default to individual
        return 'individual';
    }

    /**
     * Calculate data quality score (0-100)
     */
    calculateDataQuality(rawData, fieldMappings) {
        let score = 0;
        let totalFields = 0;

        const criticalFields = [
            'external_id', 'claim_status', 'country_code', 'region'
        ];

        const importantFields = [
            'claim_type', 'commodity', 'geometry', 'area',
            'filing_date', 'expiry_date', 'holder_name'
        ];

        // Check critical fields (60 points)
        for (const field of criticalFields) {
            totalFields++;
            if (fieldMappings[field] && this.extractField(rawData, fieldMappings[field])) {
                score += 15;
            }
        }

        // Check important fields (40 points)
        for (const field of importantFields) {
            totalFields++;
            if (fieldMappings[field] && this.extractField(rawData, fieldMappings[field])) {
                score += 5.7;
            }
        }

        return Math.round(score);
    }

    /**
     * Batch harmonize multiple records
     */
    harmonizeBatch(rawDataArray, sourceConfig, fieldMappings, transformations = {}) {
        const harmonized = [];
        const errors = [];

        // Store transformations for use in harmonization methods
        this.currentTransformations = transformations;

        // Build YAML status mapping for exact lookups
        this.yamlStatusMap = {};
        if (transformations.status_mapping) {
            for (const [rawStatus, standardStatus] of Object.entries(transformations.status_mapping)) {
                this.yamlStatusMap[rawStatus.toLowerCase()] = standardStatus;
            }
        }

        for (let i = 0; i < rawDataArray.length; i++) {
            try {
                const result = this.harmonize(rawDataArray[i], sourceConfig, fieldMappings);
                harmonized.push(result);
            } catch (err) {
                errors.push({
                    index: i,
                    error: err.message,
                    data: rawDataArray[i]
                });
            }
        }

        // Clean up after batch
        this.currentTransformations = null;
        this.yamlStatusMap = {};

        return { harmonized, errors };
    }
}

module.exports = Harmonizer;
