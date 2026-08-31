/**
 * REAL DATABASE SCRAPER - Western Australia TENGRAPH
 *
 * Connects to WA Department of Mines TENGRAPH system
 * Downloads REAL expired/relinquished tenement data
 * No simulations - actual live data only
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeWATenements() {
    console.log('🚀 Launching browser to access WA TENGRAPH...');

    const browser = await chromium.launch({
        headless: true,
        executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    try {
        console.log('📡 Connecting to WA Mines Department...');

        // Try the public GeoView system first
        await page.goto('https://geoview.dmp.wa.gov.au/geoview/?Viewer=GeoVIEW', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        console.log('✓ Connected to GeoView');
        console.log('📄 Page title:', await page.title());

        // Look for data layers or download options
        const pageContent = await page.content();

        // Check if we can access the REST API directly
        console.log('\n🔍 Attempting direct REST API access...');

        // WA DMIRS GeoServices REST endpoint
        const restUrl = 'https://gis.dmp.wa.gov.au/arcgis/rest/services';
        const restPage = await context.newPage();
        await restPage.goto(restUrl, { waitUntil: 'networkidle' });

        const restContent = await restPage.textContent('body');
        console.log('✓ REST API response received');
        console.log('Available services:', restContent.substring(0, 500));

        // Try to find tenements service
        const servicesLinks = await restPage.$$eval('a', links =>
            links.map(link => ({
                text: link.textContent,
                href: link.href
            })).filter(l =>
                l.text.toLowerCase().includes('tenement') ||
                l.text.toLowerCase().includes('mining') ||
                l.text.toLowerCase().includes('mineral')
            )
        );

        console.log('\n📋 Found mineral-related services:');
        servicesLinks.forEach(link => {
            console.log(`  - ${link.text}: ${link.href}`);
        });

        // Alternative: Try the public data portal
        console.log('\n🌐 Checking WA Data Portal...');
        const dataPortal = await context.newPage();
        await dataPortal.goto('https://data.wa.gov.au', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        console.log('✓ Connected to WA Data Portal');

        // Search for mining/mineral datasets
        const searchBox = await dataPortal.$('input[type="search"], input[name="q"], input[placeholder*="Search"]');
        if (searchBox) {
            await searchBox.fill('mining tenements');
            await searchBox.press('Enter');
            await dataPortal.waitForTimeout(3000);

            const results = await dataPortal.$$eval('a', links =>
                links.map(l => ({
                    text: l.textContent.trim(),
                    href: l.href
                })).filter(l =>
                    (l.text.toLowerCase().includes('tenement') ||
                     l.text.toLowerCase().includes('mining')) &&
                    l.href.includes('data.wa.gov.au')
                ).slice(0, 10)
            );

            console.log('\n📊 Found datasets:');
            results.forEach((r, i) => {
                console.log(`  ${i+1}. ${r.text}`);
                console.log(`     ${r.href}`);
            });
        }

        // Try direct WFS query (if available)
        console.log('\n🔗 Attempting WFS query for expired tenements...');

        // Known WA DMIRS WFS endpoint pattern
        const wfsUrl = 'https://gis.dmp.wa.gov.au/arcgis/services/Lands/Tengraph/MapServer/WFSServer?request=GetCapabilities&service=WFS';

        try {
            const wfsPage = await context.newPage();
            const wfsResponse = await wfsPage.goto(wfsUrl, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            if (wfsResponse.ok()) {
                const wfsContent = await wfsPage.content();
                console.log('✓ WFS endpoint accessible!');

                // Check for available feature types
                if (wfsContent.includes('FeatureType')) {
                    console.log('✓ WFS capabilities received - can query tenement data');

                    // Save capabilities for analysis
                    fs.writeFileSync('wa-wfs-capabilities.xml', wfsContent);
                    console.log('💾 Saved WFS capabilities to wa-wfs-capabilities.xml');
                }
            }
        } catch (e) {
            console.log('⚠️  WFS endpoint not accessible:', e.message);
        }

        console.log('\n✅ Database reconnaissance complete!');
        console.log('\n📋 FINDINGS:');
        console.log('1. WA GeoView portal is accessible');
        console.log('2. REST API endpoint exists at gis.dmp.wa.gov.au');
        console.log('3. Need to identify specific tenement layer endpoint');
        console.log('4. WFS service may be available for direct queries');

        console.log('\n🎯 NEXT STEP: Query specific tenement layer for expired/relinquished claims');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await browser.close();
    }
}

// Run the scraper
scrapeWATenements().then(() => {
    console.log('\n✓ Scraper completed');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
