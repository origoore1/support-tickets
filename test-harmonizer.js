/**
 * Test Harmonizer with Sample BLM Data
 */

const Harmonizer = require('./core/harmonizer');
const yaml = require('yaml');
const fs = require('fs');

console.log('\n=== HARMONIZER TEST ===\n');

// Load connector spec
const specContent = fs.readFileSync('connectors/specs/US_BLM_NV.yaml', 'utf8');
const spec = yaml.parse(specContent);

// Sample BLM data (simulated based on spec)
const sampleData = {
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [-116.5, 39.5]
    },
    properties: {
        CSE_NR: 'NMC-12345',
        BLM_PROD: 'Lode',
        CSE_DISP: 'Active',  // This is the actual status from BLM
        CSE_TYPE_NR: 'Gold',
        CSE_NAME: 'Lucky Strike',
        RCRD_ACRS: 20.5,
        Created: '2020-01-15T00:00:00Z',
        Modified: '2024-01-15T00:00:00Z'
    }
};

console.log('Sample BLM data:');
console.log(JSON.stringify(sampleData, null, 2));

console.log('\n=== Running Harmonization ===\n');

const harmonizer = new Harmonizer();

try {
    const harmonized = harmonizer.harmonize(
        sampleData,
        spec.source,
        spec.field_mappings
    );

    console.log('Harmonized data:');
    console.log(JSON.stringify(harmonized, null, 2));

    console.log('\n=== Key Fields ===\n');
    console.log('External ID:', harmonized.external_id);
    console.log('Claim Type:', harmonized.claim_type);
    console.log('Claim Status:', harmonized.claim_status, '<-- CHECK THIS');
    console.log('Commodity:', harmonized.commodity);
    console.log('Region:', harmonized.region);
    console.log('Area (hectares):', harmonized.area_hectares);
    console.log('Data Quality:', harmonized.data_quality_score);

    console.log('\n=== Status Mapping Test ===\n');

    const testStatuses = [
        'Active',
        'Expired',
        'Closed',
        'Forfeited',
        'Pending',
        'Authorized',
        'Cancelled',
        'Unknown Status'
    ];

    console.log('Testing various status values:\n');
    testStatuses.forEach(status => {
        const mapped = harmonizer.standardizeStatus(status);
        console.log(`"${status}" -> "${mapped}"`);
    });

    console.log('\n=== MineScore Eligibility ===\n');

    const claimStatus = harmonized.claim_status;
    const isEligible = ['expired', 'abandoned'].includes(claimStatus);

    console.log(`Claim status: "${claimStatus}"`);
    console.log(`Eligible for MineScore: ${isEligible ? 'YES' : 'NO'}`);

    if (!isEligible) {
        console.log('\n⚠ WARNING: This claim will NOT be scored by MineScore!');
        console.log('MineScore only scores claims with status "expired" or "abandoned"');
        console.log('See lindgren-x-v2.js line 217-220');
    }

} catch (err) {
    console.error('Harmonization error:', err.message);
    console.error(err.stack);
}

console.log('\n=== TEST COMPLETE ===\n');
