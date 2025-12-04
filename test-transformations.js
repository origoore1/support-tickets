/**
 * Test YAML transformations flow
 */

const Harmonizer = require('./core/harmonizer');
const yaml = require('yaml');
const fs = require('fs');

console.log('=== YAML TRANSFORMATIONS TEST ===\n');

// Load the US_BLM_NV.yaml spec
const specPath = './connectors/specs/US_BLM_NV.yaml';
const spec = yaml.parse(fs.readFileSync(specPath, 'utf8'));

console.log('Loaded YAML transformations:');
console.log(JSON.stringify(spec.transformations, null, 2));
console.log('');

// Create test data
const testData = [
    {
        properties: {
            CSE_NR: "TEST-001",
            CSE_DISP: "Active",
            CSE_TYPE_NR: "Gold",
            CSE_NAME: "Test Claim 1",
            RCRD_ACRS: 10,
            Created: "2020-01-01"
        },
        geometry: { type: "Point", coordinates: [-116, 39] }
    },
    {
        properties: {
            CSE_NR: "TEST-002",
            CSE_DISP: "Expired",
            CSE_TYPE_NR: "Silver",
            CSE_NAME: "Test Claim 2",
            RCRD_ACRS: 20,
            Created: "2019-01-01"
        },
        geometry: { type: "Point", coordinates: [-116.5, 39.5] }
    },
    {
        properties: {
            CSE_NR: "TEST-003",
            CSE_DISP: "Forfeited",
            CSE_TYPE_NR: "Copper",
            CSE_NAME: "Test Claim 3",
            RCRD_ACRS: 15,
            Created: "2018-01-01"
        },
        geometry: { type: "Point", coordinates: [-117, 40] }
    }
];

// Initialize harmonizer
const harmonizer = new Harmonizer();

// Test harmonization WITH transformations
console.log('=== Testing harmonization WITH YAML transformations ===\n');
const { harmonized, errors } = harmonizer.harmonizeBatch(
    testData,
    spec.source,
    spec.field_mappings,
    spec.transformations  // Pass transformations from YAML
);

console.log(`Harmonized ${harmonized.length} records with ${errors.length} errors\n`);

harmonized.forEach((claim, i) => {
    console.log(`Claim ${i + 1}:`);
    console.log(`  External ID: ${claim.external_id}`);
    console.log(`  Raw Status: "${testData[i].properties.CSE_DISP}"`);
    console.log(`  Harmonized Status: "${claim.claim_status}"`);
    console.log(`  Commodity: ${claim.commodity}`);
    console.log(`  MineScore Eligible: ${claim.claim_status === 'expired' || claim.claim_status === 'abandoned' ? 'YES ✓' : 'NO ✗'}`);
    console.log('');
});

// Summary
const statusCounts = {};
harmonized.forEach(claim => {
    statusCounts[claim.claim_status] = (statusCounts[claim.claim_status] || 0) + 1;
});

console.log('=== Status Distribution ===');
Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
});
console.log('');

const eligibleForMineScore = harmonized.filter(c =>
    c.claim_status === 'expired' || c.claim_status === 'abandoned'
).length;

console.log('=== MineScore Eligibility ===');
console.log(`  Total claims: ${harmonized.length}`);
console.log(`  Eligible for MineScore: ${eligibleForMineScore}`);
console.log(`  Not eligible: ${harmonized.length - eligibleForMineScore}`);
console.log('');

if (eligibleForMineScore > 0) {
    console.log('✓ SUCCESS: YAML transformations are working correctly!');
    console.log('  Expired/Abandoned claims will now be scored by MineScore.');
} else {
    console.log('⚠ WARNING: No claims eligible for MineScore.');
    console.log('  Check that YAML transformations map to "expired" or "abandoned".');
}

console.log('\n=== TEST COMPLETE ===');
