import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const LOGO_DIR = path.join(process.cwd(), 'data', 'logos');
const DOMAINS_FILE = path.join(process.cwd(), 'data', 'domains.json');

const domains = JSON.parse(fs.readFileSync(DOMAINS_FILE, 'utf8'));
const files = fs.readdirSync(LOGO_DIR).filter(f => f.endsWith('.jpg')).sort();

async function checkLogo(filePath, name, domain) {
  const stat = fs.statSync(filePath);
  const size = stat.size;
  const issues = [];

  try {
    const img = sharp(filePath);
    const meta = await img.metadata();

    // Sample 50x50
    const { data, info } = await img.resize(50, 50, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    let white = 0;
    let blackOrDarkGray = 0;
    let color = 0;

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      if (r > 235 && g > 235 && b > 235) {
        white++;
      } else if (maxDiff < 20 && r < 100 && g < 100 && b < 100) {
        blackOrDarkGray++;
      } else {
        color++;
      }
    }

    const total = 50 * 50;
    const whiteRatio = white / total;
    const darkRatio = blackOrDarkGray / total;
    const colorRatio = color / total;

    // Single letter fallback heuristic
    if (whiteRatio > 0.90 && colorRatio < 0.04 && size < 11000) {
      issues.push(`FALLBACK_LETTER (white: ${(whiteRatio*100).toFixed(1)}%, color: ${(colorRatio*100).toFixed(1)}%, size: ${size})`);
    }

    // Very small file size check
    if (size < 6000) {
      issues.push(`TINY_FILE_SIZE (${size} bytes)`);
    }

    return {
      size,
      width: meta.width,
      height: meta.height,
      whiteRatio,
      colorRatio,
      issues,
    };
  } catch (e) {
    return {
      size,
      issues: [`CORRUPT_OR_UNREADABLE (${e.message})`],
    };
  }
}

async function runAudit() {
  const BATCH_SIZE = Math.ceil(files.length / 16);
  const batchReports = [];

  for (let b = 0; b < 16; b++) {
    const start = b * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, files.length);
    const batchFiles = files.slice(start, end);
    const batchName = `Batch ${String(b).padStart(2, '0')}`;
    const batchItems = [];

    for (const f of batchFiles) {
      const name = f.replace('.jpg', '');
      const domEntry = domains.find(([d, n]) => n === name);
      const domain = domEntry ? domEntry[0] : 'UNKNOWN';
      const filePath = path.join(LOGO_DIR, f);
      const res = await checkLogo(filePath, name, domain);

      batchItems.push({
        file: f,
        name,
        domain,
        ...res,
      });
    }

    batchReports.push({
      batch: batchName,
      count: batchItems.length,
      items: batchItems,
      flagged: batchItems.filter(i => i.issues && i.issues.length > 0),
    });
  }

  console.log(`\n================ FULL AUDIT RESULTS ACROSS 16 BATCHES ================`);
  let totalFlagged = 0;
  for (const rep of batchReports) {
    console.log(`\n${rep.batch} (${rep.count} logos) — Flagged: ${rep.flagged.length}`);
    for (const item of rep.flagged) {
      totalFlagged++;
      console.log(`  - [${item.name}] (${item.domain}): ${item.issues.join(' | ')}`);
    }
  }

  console.log(`\nTotal flagged across all batches: ${totalFlagged}`);
  fs.writeFileSync('scripts/batch_audit_report.json', JSON.stringify(batchReports, null, 2));
}

runAudit();
