/**
 * Check BLM API Response
 * Downloads actual data and shows field structure
 */

const https = require('https');

const BLM_URL = 'https://gis.blm.gov/nlsdb/rest/services/HUB/BLM_Natl_MLRS_Mining_Claims_Not_Closed/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=5';

console.log('\n=== BLM API RESPONSE CHECKER ===\n');
console.log('Fetching data from BLM Nevada...');
console.log('URL:', BLM_URL);
console.log('\nNOTE: This endpoint name "Not_Closed" suggests it only returns ACTIVE claims!\n');

https.get(BLM_URL, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const geojson = JSON.parse(data);

            console.log('Response Type:', geojson.type);
            console.log('Total Features:', geojson.features ? geojson.features.length : 0);

            if (geojson.features && geojson.features.length > 0) {
                console.log('\n=== SAMPLE CLAIM DATA ===\n');

                const sample = geojson.features[0];
                console.log('Geometry Type:', sample.geometry?.type);
                console.log('\nAvailable Properties:');

                const props = sample.properties || {};
                const propKeys = Object.keys(props).sort();

                propKeys.forEach(key => {
                    const value = props[key];
                    const type = typeof value;
                    const display = value === null ? 'null' :
                                  type === 'string' ? `"${value}"` :
                                  value;
                    console.log(`  ${key}: ${display} (${type})`);
                });

                console.log('\n=== FIELD MAPPING CHECK ===\n');

                // Check if fields from connector spec exist
                const specMappings = {
                    'external_id': 'CSE_NR',
                    'claim_type': 'BLM_PROD',
                    'claim_status': 'CSE_DISP',
                    'commodity': 'CSE_TYPE_NR',
                    'location_name': 'CSE_NAME',
                    'area': 'RCRD_ACRS',
                    'filing_date': 'Created',
                    'last_activity_date': 'Modified'
                };

                console.log('Checking if connector spec fields exist in API response:\n');
                for (const [harmField, rawField] of Object.entries(specMappings)) {
                    const exists = propKeys.includes(rawField);
                    const value = props[rawField];
                    const status = exists ? '✓' : '✗';
                    console.log(`${status} ${harmField} <- properties.${rawField}: ${exists ? value : 'MISSING'}`);
                }

                console.log('\n=== STATUS VALUES ===\n');

                // Check what status values actually exist
                console.log('Checking claim_status field (CSE_DISP):');
                const statusField = props['CSE_DISP'];
                console.log(`  Raw value: "${statusField}"`);
                console.log(`  Type: ${typeof statusField}`);

                if (statusField) {
                    console.log(`\nHow harmonizer will process "${statusField}":`);
                    const normalized = statusField.toString().toLowerCase().trim();
                    console.log(`  Normalized: "${normalized}"`);

                    // Check against harmonizer mappings
                    const statusMappings = {
                        'active': ['active', 'open', 'valid', 'current', 'maintained'],
                        'expired': ['expired', 'lapsed', 'terminated'],
                        'abandoned': ['abandoned', 'forfeited', 'relinquished', 'cancelled'],
                        'pending': ['pending', 'application', 'under review'],
                        'suspended': ['suspended', 'on hold', 'inactive'],
                        'closed': ['closed', 'completed', 'withdrawn']
                    };

                    let matched = false;
                    for (const [standard, variations] of Object.entries(statusMappings)) {
                        if (variations.some(v => normalized.includes(v))) {
                            console.log(`  ✓ Will map to: "${standard}"`);
                            matched = true;
                            break;
                        }
                    }

                    if (!matched) {
                        console.log(`  ⚠ Will map to: "unknown" (no match found)`);
                    }
                }

                console.log('\n=== ALL CLAIM STATUSES IN SAMPLE ===\n');
                geojson.features.forEach((feature, idx) => {
                    const status = feature.properties?.CSE_DISP || 'N/A';
                    const name = feature.properties?.CSE_NAME || 'Unnamed';
                    console.log(`${idx + 1}. ${name}: ${status}`);
                });

                console.log('\n=== CONCLUSION ===\n');
                console.log('API Endpoint: "BLM_Natl_MLRS_Mining_Claims_NOT_CLOSED"');
                console.log('This endpoint name suggests it EXCLUDES closed/expired claims!');
                console.log('\nTo find expired/abandoned claims for investment opportunities,');
                console.log('you may need a different API endpoint or data source.');

            } else {
                console.log('No features returned from API!');
            }

            console.log('\n=== CHECK COMPLETE ===\n');

        } catch (err) {
            console.error('Error parsing response:', err.message);
            console.log('Raw response:', data.substring(0, 500));
        }
    });

}).on('error', (err) => {
    console.error('Error fetching data:', err.message);
});
