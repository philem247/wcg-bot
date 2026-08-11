import fs from 'node:fs';
import { join } from 'node:path';

const DOMAINS = JSON.parse(fs.readFileSync(join(process.cwd(), 'data', 'domains.json'), 'utf8'));

const BATCH_SIZE = 10;
const OUT_DIR = join(process.cwd(), 'data', 'logos');

async function downloadLogo(domain, answer) {
  const url = `https://img.logo.dev/${domain}?token=pk_NJjbqadBSUiIPK-Azohdsw&size=400&format=jpg`;
  const dest = join(OUT_DIR, `${answer}.jpg`);

  if (fs.existsSync(dest)) {
    console.log(`[SKIP] ${answer} already exists`);
    return true;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[ERROR] ${domain} returned ${res.status}`);
      return false;
    }
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.error(`[ERROR] ${domain} didn't return an image: ${contentType}`);
      return false;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    console.log(`[SUCCESS] ${answer} (${domain})`);
    return true;
  } catch (e) {
    console.error(`[ERROR] ${domain} fetch failed:`, e.message);
    return false;
  }
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  let successCount = 0;
  for (let i = 0; i < DOMAINS.length; i += BATCH_SIZE) {
    const batch = DOMAINS.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(([domain, answer]) => downloadLogo(domain, answer))
    );
    successCount += results.filter(Boolean).length;
  }
  
  console.log(`\nFinished downloading logos. Success: ${successCount} / ${DOMAINS.length}`);
}

run();
