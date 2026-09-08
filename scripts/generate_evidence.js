/**
 * Acceptance-test runner for the pronunciation & controlled-delivery claim.
 *
 * For every drug name in fixtures/drug_names.json, this hits the local
 * RxSpeak server twice — once with the plain text (default Rime
 * pronunciation) and once with the tuned phonetic string
 * (phonemizeBetweenBrackets) — and saves both clips under evidence/.
 *
 * It does NOT auto-score correctness (that needs a human ear or a
 * pharmacist-verified reference). It prints a markdown table you paste
 * into RIME_EVIDENCE.md and fill in by listening to the paired clips.
 *
 * Usage:
 *   1. npm start              # in one terminal, run the server
 *   2. npm run evidence       # in another terminal, run this script
 */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const SERVER = process.env.RXSPEAK_SERVER || 'http://localhost:3000';
const fixturesPath = path.join(__dirname, '..', 'fixtures', 'drug_names.json');
const evidenceDir = path.join(__dirname, '..', 'evidence');

if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

async function speak(text, tuned) {
  const res = await fetch(`${SERVER}/api/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, tuned, speedAlpha: 1.0 }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${detail}`);
  }
  return res.buffer();
}

async function main() {
  const { items } = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  const rows = [];

  for (const item of items) {
    process.stdout.write(`Rendering ${item.id}... `);
    try {
      const defaultBuf = await speak(item.plain_text, false);
      const tunedBuf = await speak(item.tuned_text, true);

      const defaultPath = path.join(evidenceDir, `${item.id}_default.mp3`);
      const tunedPath = path.join(evidenceDir, `${item.id}_tuned.mp3`);
      fs.writeFileSync(defaultPath, defaultBuf);
      fs.writeFileSync(tunedPath, tunedBuf);

      rows.push({ id: item.id, plain_text: item.plain_text, defaultPath, tunedPath });
      console.log('done');
    } catch (err) {
      console.log('FAILED:', err.message);
      rows.push({ id: item.id, plain_text: item.plain_text, error: err.message });
    }
  }

  console.log('\n--- Paste into RIME_EVIDENCE.md and fill in "Correct?" after listening ---\n');
  console.log('| Drug name | Default clip | Tuned clip | Default correct? | Tuned correct? |');
  console.log('|---|---|---|---|---|');
  for (const r of rows) {
    if (r.error) {
      console.log(`| ${r.plain_text} | ERROR | ERROR | - | - |`);
    } else {
      console.log(`| ${r.plain_text} | evidence/${path.basename(r.defaultPath)} | evidence/${path.basename(r.tunedPath)} |  |  |`);
    }
  }
}

main().catch((err) => {
  console.error('Evidence generation failed:', err);
  process.exit(1);
});
