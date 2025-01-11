# Article to PDF Converter

A web service that converts online articles to clean, readable PDFs with properly formatted references.

## Features

- Converts online articles to clean, readable PDFs
- Extracts main content using Mozilla's Readability
- Converts hyperlinks to numbered references
- Removes share buttons and other clutter
- Simple web interface

## Installation

1. Clone the repository: 

git clone https://github.com/lxzhng/article-to-pdf.git
cd article-to-pdf

2. Install dependencies:

npm install

3. Start the server:

npm start

4. Open http://localhost:3000 in your browser

## Usage

1. Open the web interface at http://localhost:3000
2. Enter the URL of the article you want to convert
3. Enter the author's name
4. Click "Convert to PDF"
5. The PDF will automatically download

## Dependencies

- puppeteer & puppeteer-extra: For PDF generation
- @mozilla/readability: For article content extraction
- cheerio: For HTML manipulation
- axios: For fetching web pages
- jsdom: For DOM manipulation

## License

MIT
