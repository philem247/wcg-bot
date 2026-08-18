import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const LOGO_DIR = path.join(process.cwd(), 'data', 'logos');
const DOMAINS_FILE = path.join(process.cwd(), 'data', 'domains.json');

const domains = JSON.parse(fs.readFileSync(DOMAINS_FILE, 'utf8'));
const files = fs.readdirSync(LOGO_DIR).filter(f => f.endsWith('.jpg'));

console.log(`Auditing ${files.length} logo files against ${domains.length} domain entries...`);

async function analyzeImage(filePath) {
  const fileStat = fs.statSync(filePath);
  const size = fileStat.size;

  try {
    const img = sharp(filePath);
    const metadata = await img.metadata();
    
    // Resize to 50x50 to analyze pixels
    const { data, info } = await img
      .resize(50, 50, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let whiteCount = 0;
    let grayOrBlackCount = 0;
    let colorCount = 0;
    const channels = info.channels;
    
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));

      if (r > 240 && g > 240 && b > 240) {
        whiteCount++;
      } else if (maxDiff < 15 && r < 100 && g < 100 && b < 100) {
        grayOrBlackCount++;
      } else {
        colorCount++;
      }
    }

    const totalPixels = info.width * info.height;
    const whiteRatio = whiteCount / totalPixels;
    const grayRatio = grayOrBlackCount / totalPixels;
    const colorRatio = colorCount / totalPixels;

    // logo.dev letter fallbacks are typically 88-97% white, 3-12% dark gray/black, 0% color
    const isLetterFallback = (whiteRatio > 0.82 && colorRatio < 0.015 && grayRatio > 0.02 && grayRatio < 0.18 && size < 12000);

    return {
      size,
      width: metadata.width,
      height: metadata.height,
      whiteRatio,
      grayRatio,
      colorRatio,
      isLetterFallback,
    };
  } catch (e) {
    return { size, error: e.message };
  }
}

async function run() {
  const results = [];
  const BATCH_SIZE = Math.ceil(files.length / 16); // 16 batches (00 to 15)

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = file.replace('.jpg', '');
    const domainEntry = domains.find(([d, n]) => n === name);
    const domain = domainEntry ? domainEntry[0] : 'UNKNOWN';
    const filePath = path.join(LOGO_DIR, file);

    const analysis = await analyzeImage(filePath);
    const batchIndex = String(Math.floor(i / BATCH_SIZE)).padStart(2, '0');

    results.push({
      batch: batchIndex,
      file,
      name,
      domain,
      ...analysis,
    });
  }

  const fallbacks = results.filter(r => r.isLetterFallback);
  console.log(`\n=== AUDIT SUMMARY ===`);
  console.log(`Total audited: ${results.length}`);
  console.log(`Detected letter fallbacks: ${fallbacks.length}`);

  console.log('\nList of detected letter fallbacks:');
  for (const fb of fallbacks) {
    console.log(`[Batch ${fb.batch}] ${fb.name} (${fb.domain}) - ${fb.size} bytes (white: ${(fb.whiteRatio*100).toFixed(1)}%, gray: ${(fb.grayRatio*100).toFixed(1)}%)`);
  }

  const outPath = path.join(process.cwd(), 'scripts', 'audit_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
}

run();
