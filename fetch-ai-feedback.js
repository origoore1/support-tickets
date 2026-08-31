/**
 * Fetch AI Editor Feedback - Lindgren-X v2.0 Plan Audit
 * Pulls responses from ChatGPT, Gemini, Skywork, Perplexity, Grok
 */

const { chromium } = require('playwright');
const fs = require('fs');

const sources = [
    {
        name: 'skywork',
        url: 'https://skywork.ai/session/01a058ad-6214-71b3-8629-4b41ffdb985e?mode=1',
        selector: 'body' // Will refine after seeing page structure
    },
    {
        name: 'perplexity',
        url: 'https://www.perplexity.ai/computer/tasks/1ef0c8f7-f9dd-45ef-af34-3efad28a273c',
        selector: 'body'
    },
    {
        name: 'grok',
        url: 'https://grok.com/c/4a4a11ba-ed29-42e0-9a80-2266334de714?rid=bbeeca33-1b5c-4363-a8fa-a7f55f0dcc6d',
        selector: 'body'
    },
    {
        name: 'gemini',
        url: 'https://gemini.google.com/app/9ebe69beb65d61fa',
        selector: 'body'
    },
    {
        name: 'chatgpt',
        url: 'https://chatgpt.com/c/6a95ad9e-b264-83eb-9730-4bfe245de5aa',
        selector: 'body'
    }
];

async function fetchAllFeedback() {
    console.log('🚀 Launching Chromium to fetch AI editor feedback...\n');

    const browser = await chromium.launch({
        headless: true,
        executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
    });

    const results = [];

    for (const source of sources) {
        console.log(`\n📡 Fetching ${source.name}...`);
        console.log(`   URL: ${source.url}`);

        try {
            const page = await context.newPage();

            const response = await page.goto(source.url, {
                waitUntil: 'networkidle',
                timeout: 60000
            });

            if (!response.ok()) {
                throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
            }

            console.log(`   ✓ Page loaded (${response.status()})`);

            // Wait for content to render
            await page.waitForTimeout(3000);

            // Get page title
            const title = await page.title();
            console.log(`   📄 Title: ${title}`);

            // Extract all text content
            const textContent = await page.evaluate(() => {
                // Remove script and style tags
                const scripts = document.querySelectorAll('script, style, noscript');
                scripts.forEach(s => s.remove());

                return document.body.innerText;
            });

            // Also get HTML for more detailed extraction if needed
            const htmlContent = await page.content();

            // Save both text and HTML
            const textFile = `feedback-${source.name}.txt`;
            const htmlFile = `feedback-${source.name}.html`;

            fs.writeFileSync(textFile, textContent);
            fs.writeFileSync(htmlFile, htmlContent);

            console.log(`   ✓ Saved to ${textFile} (${textContent.length} chars)`);
            console.log(`   ✓ Saved HTML to ${htmlFile}`);

            results.push({
                source: source.name,
                url: source.url,
                success: true,
                textFile,
                htmlFile,
                contentLength: textContent.length,
                title
            });

            await page.close();

        } catch (error) {
            console.error(`   ❌ Error fetching ${source.name}:`, error.message);

            results.push({
                source: source.name,
                url: source.url,
                success: false,
                error: error.message
            });
        }
    }

    await browser.close();

    // Summary report
    console.log('\n' + '='.repeat(80));
    console.log('FETCH SUMMARY');
    console.log('='.repeat(80));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
    successful.forEach(r => {
        console.log(`   - ${r.source}: ${r.contentLength} chars`);
    });

    if (failed.length > 0) {
        console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
        failed.forEach(r => {
            console.log(`   - ${r.source}: ${r.error}`);
        });
    }

    // Save summary
    const summary = {
        timestamp: new Date().toISOString(),
        results,
        successful: successful.length,
        failed: failed.length
    };

    fs.writeFileSync('fetch-summary.json', JSON.stringify(summary, null, 2));
    console.log('\n💾 Summary saved to fetch-summary.json');
}

// Run the fetcher
fetchAllFeedback().then(() => {
    console.log('\n✅ All fetches complete');
    process.exit(0);
}).catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});
