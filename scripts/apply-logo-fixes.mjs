import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const LOGO_DIR = path.join(process.cwd(), 'data', 'logos');
const DOMAINS_FILE = path.join(process.cwd(), 'data', 'domains.json');
const SCRATCH_DIR = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\0db0a409-3aff-4664-b97d-48c73072a2c0\\scratch';

const domains = JSON.parse(fs.readFileSync(DOMAINS_FILE, 'utf8'));

// Replacements mapping: Name -> { newDomain, localScratchFile, fetchDomain }
const fixes = {
  'Fitbit': { newDomain: 'fitbit.com', localScratchFile: 'fitbit.jpg' },
  'Dacia': { newDomain: 'dacia.ro', localScratchFile: 'test_dacia.jpg' },
  'Evening Standard': { newDomain: 'standard.co.uk', localScratchFile: 'evening_standard.jpg' },
  'Genuine Parts': { newDomain: 'genpt.com', localScratchFile: 'test_genpt.jpg' },
  'Flour Mills of Nigeria': { newDomain: 'fmnplc.com', localScratchFile: 'test_fmnplc.jpg' },
  'Degree': { newDomain: 'degreedeodorant.com', localScratchFile: 'test_degreedeodorant.jpg' },
  'Seven-Up Bottling': { newDomain: '7up.com', localScratchFile: 'test_7up.jpg' },
  'La Casera': { newDomain: 'thelacaseracompany.com', localScratchFile: 'test_thelacaseracompany.com.jpg' },
  'ADM': { newDomain: 'adm.com', fetchDomain: 'adm.com' },
  'Bayer Aspirin': { newDomain: 'bayer.com', fetchDomain: 'bayer.com' },
  'Chivita': { newDomain: 'chivitajuices.com', fetchDomain: 'chivitajuices.com' },
  'Estee Lauder': { newDomain: 'esteelauder.com', fetchDomain: 'esteelauder.com' },
  'Geely': { newDomain: 'geelyauto.com', fetchDomain: 'geelyauto.com' },
  'Heritage Bank': { newDomain: 'hbng.com', fetchDomain: 'hbng.com' },
  'Kinder Morgan': { newDomain: 'kindermorgan.com', fetchDomain: 'kindermorgan.com' },
  'Lindt': { newDomain: 'lindt.co.uk', fetchDomain: 'lindt.co.uk' },
  'Northern Trust': { newDomain: 'northerntrust.com', fetchDomain: 'northerntrust.com' },
  'Otis Worldwide': { newDomain: 'otis.com', fetchDomain: 'otis.com' },
  'PNC Financial Services': { newDomain: 'pnc.com', fetchDomain: 'pnc.com' },
  'Rosetta Stone': { newDomain: 'rosettastone.com', fetchDomain: 'rosettastone.com' },
  'Seiko': { newDomain: 'seikowatches.com', fetchDomain: 'seikowatches.com' },
  'ValueJet': { newDomain: 'flyvaluejet.com', fetchDomain: 'flyvaluejet.com' },
};

async function applyFixes() {
  console.log('Starting logo fixes application...');

  for (const [name, config] of Object.entries(fixes)) {
    const dest = path.join(LOGO_DIR, `${name}.jpg`);

    // 1. Get image buffer
    let buf;
    if (config.localScratchFile) {
      const scratchPath = path.join(SCRATCH_DIR, config.localScratchFile);
      if (fs.existsSync(scratchPath)) {
        buf = fs.readFileSync(scratchPath);
        console.log(`[LOCAL] Using scratch asset for ${name}`);
      }
    }

    if (!buf && config.fetchDomain) {
      const url = `https://img.logo.dev/${config.fetchDomain}?token=pk_NJjbqadBSUiIPK-Azohdsw&size=400&format=jpg`;
      const res = await fetch(url);
      if (res.ok) {
        buf = Buffer.from(await res.arrayBuffer());
        console.log(`[FETCHED] Downloaded ${config.fetchDomain} for ${name} (${buf.length} bytes)`);
      } else {
        console.error(`[FAIL] Could not fetch ${config.fetchDomain}: status ${res.status}`);
      }
    }

    if (buf) {
      fs.writeFileSync(dest, buf);
      console.log(`[UPDATED FILE] ${dest} (${buf.length} bytes)`);
    } else {
      console.error(`[ERROR] No image available for ${name}`);
    }

    // 2. Update domains.json
    const entry = domains.find(([d, n]) => n === name);
    if (entry) {
      entry[0] = config.newDomain;
      console.log(`[UPDATED DOMAIN] ${name} -> ${config.newDomain}`);
    } else {
      domains.push([config.newDomain, name]);
      console.log(`[ADDED DOMAIN] ${name} -> ${config.newDomain}`);
    }
  }

  fs.writeFileSync(DOMAINS_FILE, JSON.stringify(domains, null, 2));
  console.log('\nAll fixes applied and domains.json updated successfully!');
}

applyFixes();
