/**
 * Automated pre-check using Rime's own Coverage (OOV) API.
 *
 * This tells us, objectively and repeatably, which drug names are NOT
 * already in Rime's pronunciation dictionary — i.e. which ones are real
 * candidates for a custom phonetic hint. It does NOT verify that a given
 * pronunciation is correct; it only flags words Rime doesn't recognize
 * out of the box. Correctness itself still needs a human ear (or an ASR
 * round-trip) against a reference pronunciation — see RIME_EVIDENCE.md.
 *
 * Usage:
 *   node scripts/check_coverage.js
 *
 * Reads RIME_API_KEY from .env directly (does not need the server running).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const RIME_API_KEY = process.env.RIME_API_KEY;
const OOV_URL = 'https://users.rime.ai/oov';
const fixturesPath = path.join(__dirname, '..', 'fixtures', 'drug_names.json');

async function checkCoverage(text) {
  const res = await fetch(OOV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RIME_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OOV request failed (${res.status}): ${detail}`);
  }
  return res.json(); // array of out-of-vocabulary words
}

async function main() {
  if (!RIME_API_KEY) {
    console.error('RIME_API_KEY is not set in .env');
    process.exit(1);
  }

  const { items } = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  const names = items.map((i) => i.plain_text);
  const joined = names.join(', ');

  console.log(`Checking dictionary coverage for ${names.length} drug names...\n`);
  const oovWords = await checkCoverage(joined);

  const oovSet = new Set(oovWords.map((w) => w.toLowerCase()));

  console.log('| Drug name | In Rime dictionary? |');
  console.log('|---|---|');
  for (const name of names) {
    // Coverage API flags whole words; a multi-token match isn't expected
    // here since drug names are single tokens, but we normalize case.
    const isOov = oovSet.has(name.toLowerCase());
    console.log(`| ${name} | ${isOov ? 'NOT covered (needs a hint)' : 'covered'} |`);
  }

  console.log(`\nRaw OOV response: ${JSON.stringify(oovWords)}`);
  console.log('\nPaste the table above into RIME_EVIDENCE.md under "Automated coverage check".');
}

main().catch((err) => {
  console.error('Coverage check failed:', err.message);
  process.exit(1);
});
