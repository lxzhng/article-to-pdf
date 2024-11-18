const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');
const http = require('http');
const url = require('url');

puppeteer.use(StealthPlugin());

async function fetchArticleContent(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.google.com/'
            },
            timeout: 30000
        });

        // Parse the content with Readability
        const dom = new JSDOM(response.data, {
            url: url // This helps resolve relative URLs
        });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        // Process links and images using cheerio
        const $ = cheerio.load(article.content);
        const footnotes = [];
        
        // Remove share buttons and related elements
        $('button:contains("Share")').remove();
        $('.share-button').remove();
        $('[class*="share"]').remove();
        $('[id*="share"]').remove();
        
        // Process images: convert relative URLs to absolute
        $('img').each((i, elem) => {
            const $img = $(elem);
            const src = $img.attr('src');
            if (src) {
                // Convert relative URLs to absolute
                const absoluteUrl = new URL(src, url).href;
                $img.attr('src', absoluteUrl);
                
                // Add loading="lazy" to improve performance
                $img.attr('loading', 'lazy');
                
                // Add a container div for better styling
                $img.wrap('<div class="image-container"></div>');
            }
        });

        // Convert links to footnotes (existing code)
        $('a').each((i, elem) => {
            const $link = $(elem);
            const href = $link.attr('href');
            const linkText = $link.text();
            
            if (linkText.toLowerCase().includes('share') || 
                href?.toLowerCase().includes('share') ||
                linkText.trim() === '') {
                $link.remove();
                return;
            }
            
            const footnoteIndex = footnotes.length + 1;
            $link.replaceWith(`${linkText}<sup>[${footnoteIndex}]</sup>`);
            footnotes.push(`[${footnoteIndex}] ${href}`);
        });

        // Add references section
        if (footnotes.length > 0) {
            $('body').append(`
                <div class="references">
                    <h2>References</h2>
                    ${footnotes.map(note => `<p>${note}</p>`).join('\n')}
                </div>
            `);
        }

        return {
            title: article.title,
            content: $.html()
        };
    } catch (error) {
        throw new Error(`Failed to fetch article: ${error.message}`);
    }
}

async function convertWebpageToPDF(webUrl, authorName) {
    let browser = null;
    
    try {
        console.log('Fetching article content...');
        const article = await fetchArticleContent(webUrl);
        
        // Create clean HTML with the content
        const cleanHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { 
                        font-family: serif; 
                        max-width: 800px; 
                        margin: 0 auto; 
                        padding: 20px;
                        line-height: 1.6;
                    }
                    h1 { margin-bottom: 10px; }
                    h3 { color: #666; margin-top: 0; }
                    .references { 
                        margin-top: 50px; 
                        border-top: 1px solid #ccc;
                        padding-top: 20px;
                    }
                    sup { 
                        color: #666; 
                        text-decoration: none; /* Remove box around superscripts */
                    }
                    .image-container {
                        margin: 20px 0;
                        text-align: center;
                    }
                    img { 
                        max-width: 100%; 
                        height: auto;
                        display: block;
                        margin: 0 auto;
                    }
                    figure {
                        margin: 20px 0;
                        text-align: center;
                    }
                    figcaption {
                        color: #666;
                        font-size: 0.9em;
                        margin-top: 5px;
                    }
                </style>
            </head>
            <body>
                <h1>${article.title}</h1>
                <h3>By ${authorName}</h3>
                ${article.content}
            </body>
            </html>
        `;

        console.log('Starting PDF conversion...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(cleanHtml, { waitUntil: 'networkidle0' });
        
        // Generate PDF
        const pdf = await page.pdf({
            format: 'A4',
            margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
            printBackground: true
        });

        return pdf;
    } catch (error) {
        throw new Error(`PDF conversion failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Update the server route handler
const server = http.createServer(async (req, res) => {
    const queryObject = url.parse(req.url, true).query;
    
    if (req.method === 'GET' && !queryObject.url) {
        // Show form if no URL provided
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Article to PDF Converter</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                        .form-group { margin-bottom: 15px; }
                        input, button { padding: 5px; margin: 5px 0; }
                        input[type="url"], input[type="text"] { width: 300px; }
                    </style>
                </head>
                <body>
                    <h1>Article to PDF Converter</h1>
                    <form method="GET">
                        <div class="form-group">
                            <label>Article URL:<br>
                            <input type="url" name="url" required placeholder="https://example.com/article">
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Author Name:<br>
                            <input type="text" name="author" required placeholder="John Doe">
                            </label>
                        </div>
                        <button type="submit">Convert to PDF</button>
                    </form>
                </body>
            </html>
        `);
    } else if (req.method === 'GET' && queryObject.url) {
        try {
            console.log('Converting URL:', queryObject.url);
            const article = await fetchArticleContent(queryObject.url);
            const pdf = await convertWebpageToPDF(
                queryObject.url, 
                queryObject.author || 'Unknown Author'
            );

            // Create a safe filename from the article title
            const safeTitle = article.title
                .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric chars with underscore
                .replace(/_+/g, '_')         // Replace multiple underscores with single
                .toLowerCase()
                .substring(0, 50);           // Limit length

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
            res.end(pdf);
        } catch (error) {
            console.error('Error:', error);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>Error</h1>
                <p>${error.message}</p>
                <p><a href="/">Back to converter</a></p>
            `);
        }
    }
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
}); 