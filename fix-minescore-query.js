/**
 * Fix: Allow MineScore to score ALL claims, not just expired/abandoned
 *
 * Current issue: MineScore only scores expired/abandoned claims
 * This fix enables scoring of active claims too
 */

const fs = require('fs');
const path = require('path');

console.log('\n=== MINESCORE QUERY FIX ===\n');

const lindgrenFile = 'lindgren-x-v2.js';
const databaseFile = 'core/database.js';

console.log('This script will modify:');
console.log(`  1. ${lindgrenFile} - MineScore eligibility`);
console.log(`  2. ${databaseFile} - getClaimsForScoring query`);
console.log('\nChanges:');
console.log('  - Allow scoring of ALL claim statuses');
console.log('  - Not just "expired" and "abandoned"');
console.log('  - This lets you see the system working with active claims\n');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('Proceed with fix? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        applyFix();
    } else {
        console.log('Fix cancelled.');
    }
    readline.close();
});

function applyFix() {
    try {
        // Fix database.js
        console.log('\n1. Fixing database.js...');
        let dbContent = fs.readFileSync(databaseFile, 'utf8');

        const oldDbQuery = `SELECT c.* FROM harmonized_claims c
                 LEFT JOIN opportunities o ON c.claim_id = o.claim_id
                 WHERE c.claim_status IN ('expired', 'abandoned')
                 AND o.opportunity_id IS NULL`;

        const newDbQuery = `SELECT c.* FROM harmonized_claims c
                 LEFT JOIN opportunities o ON c.claim_id = o.claim_id
                 WHERE o.opportunity_id IS NULL
                 -- MODIFIED: Score ALL claims, not just expired/abandoned
                 -- Original: WHERE c.claim_status IN ('expired', 'abandoned')`;

        if (dbContent.includes("WHERE c.claim_status IN ('expired', 'abandoned')")) {
            dbContent = dbContent.replace(
                "WHERE c.claim_status IN ('expired', 'abandoned')\n                 AND o.opportunity_id IS NULL",
                "WHERE o.opportunity_id IS NULL\n                 -- MODIFIED: Score ALL claims, not just expired/abandoned\n                 -- Original: WHERE c.claim_status IN ('expired', 'abandoned')"
            );

            // Backup original
            fs.writeFileSync(databaseFile + '.backup', fs.readFileSync(databaseFile));
            fs.writeFileSync(databaseFile, dbContent);
            console.log('✓ Fixed database.js');
            console.log('  Backup saved to: core/database.js.backup');
        } else {
            console.log('⚠ Could not find expected query in database.js');
        }

        // Fix lindgren-x-v2.js comments
        console.log('\n2. Adding comments to lindgren-x-v2.js...');
        let lindgrenContent = fs.readFileSync(lindgrenFile, 'utf8');

        const originalComment = '    /**\n     * Classify opportunity type\n     */\n    classifyOpportunity(claim) {';
        const newComment = '    /**\n     * Classify opportunity type\n     * NOTE: Now scoring ALL claims, not just expired/abandoned\n     */\n    classifyOpportunity(claim) {';

        if (lindgrenContent.includes(originalComment)) {
            lindgrenContent = lindgrenContent.replace(originalComment, newComment);
            fs.writeFileSync(lindgrenFile + '.backup', fs.readFileSync(lindgrenFile));
            fs.writeFileSync(lindgrenFile, lindgrenContent);
            console.log('✓ Updated lindgren-x-v2.js');
            console.log('  Backup saved to: lindgren-x-v2.js.backup');
        }

        console.log('\n=== FIX APPLIED ===\n');
        console.log('Next steps:');
        console.log('  1. Restart your application:');
        console.log('     npm start');
        console.log('  2. Go to dashboard: http://localhost:3000');
        console.log('  3. Click "Run MineScore Algorithm"');
        console.log('  4. All 78 claims should now be scored!');
        console.log('\nTo revert:');
        console.log('  mv core/database.js.backup core/database.js');
        console.log('  mv lindgren-x-v2.js.backup lindgren-x-v2.js\n');

    } catch (err) {
        console.error('Error applying fix:', err.message);
    }
}
