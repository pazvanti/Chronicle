const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.resolve(__dirname, '..', 'public', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fontUrl = 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600;700&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Outfit:wght@400;500;600;700;800&display=swap';

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, headers).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}, status: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Downloading Google Fonts CSS...');
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const cssBuffer = await fetchUrl(fontUrl, { 'User-Agent': userAgent });
  const cssText = cssBuffer.toString('utf8');

  const localCssBlocks = [];
  const blocks = cssText.split('@font-face').slice(1);
  console.log(`Found ${blocks.length} @font-face definitions.`);

  let fontIndex = 0;
  for (const rawBlock of blocks) {
    const block = '@font-face ' + rawBlock;
    const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!urlMatch) continue;

    const remoteUrl = urlMatch[1];
    const famMatch = block.match(/font-family:\s*['"]?([^'";]+)/);
    const weightMatch = block.match(/font-weight:\s*([^;]+)/);
    const styleMatch = block.match(/font-style:\s*([^;]+)/);

    const family = famMatch ? famMatch[1].trim().replace(/\s+/g, '-').toLowerCase() : 'font';
    const weight = weightMatch ? weightMatch[1].trim().replace(/\s+/g, '') : 'normal';
    const style = styleMatch ? styleMatch[1].trim() : 'normal';

    const filename = `${family}-${weight}-${style}-${++fontIndex}.woff2`;
    const localFilePath = path.join(fontsDir, filename);

    process.stdout.write(`Downloading ${filename}... `);
    const fontBuffer = await fetchUrl(remoteUrl);
    fs.writeFileSync(localFilePath, fontBuffer);
    console.log('done.');

    // Replace remote URL with local path /fonts/filename
    const localBlock = block.replace(remoteUrl, `/fonts/${filename}`);
    localCssBlocks.push(localBlock.trim());
  }

  const outputCss = '/* Chronicle Offline Fonts - Bundled locally */\n\n' + localCssBlocks.join('\n\n') + '\n';
  const cssPath = path.join(fontsDir, 'fonts.css');
  fs.writeFileSync(cssPath, outputCss, 'utf8');
  console.log(`\nSuccessfully generated ${cssPath} with ${localCssBlocks.length} local font definitions!`);
}

run().catch(err => {
  console.error('Font download error:', err);
  process.exit(1);
});
