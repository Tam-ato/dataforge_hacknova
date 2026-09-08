# RIME_EVIDENCE.md

## Claim

Rime's default pronunciation of multisyllabic prescription drug names is frequently wrong or unclear enough to confuse a patient relying on audio alone. Adding an inline phonetic hint (Rime phonetic alphabet, `phonemizeBetweenBrackets: true`, Mist v2) measurably improves correctness on a fixture list of 15 hard drug names, without needing a different model or voice.

## Acceptance test (defined before the demo)

1. Take the 15 drug names in `fixtures/drug_names.json`.
2. For each, render two clips with identical model/speaker/speed:
   - **Default:** plain text, `phonemizeBetweenBrackets: false`.
   - **Tuned:** the curly-brace phonetic string, `phonemizeBetweenBrackets: true`.
3. A listener who does not know which clip is which (blind the filenames, or have someone else press play) marks each clip **Correct** or **Incorrect** against how the word is actually meant to be pronounced.
4. Report the correct-count out of 15 for default vs. tuned. Tuned should score visibly higher; any remaining misses are disclosed, not hidden.
5. Repeat step 1–4 for the "repeat slower" control: render one dosage instruction at `speedAlpha=1.0` and `speedAlpha=1.6`, and confirm intelligibility is preserved (not just slowed and distorted).

## Procedure

```bash
npm run coverage      # step 0 — automated pre-check, no server needed
npm start              # terminal 1
npm run evidence       # terminal 2
```

**Step 0, automated: dictionary coverage check.** Before rendering anything, `npm run coverage` calls Rime's own Coverage (OOV) API to flag which of the 15 drug names are already in Rime's pronunciation dictionary versus which are out-of-vocabulary. This is a real automated, repeatable check — but it only tells us whether Rime recognizes the word, not whether its predicted pronunciation is correct. Out-of-vocabulary words are the clearest candidates for a custom phonetic hint; covered words may still need one if the dictionary's default reading doesn't match how a pharmacist says it.

### Automated coverage check

_Paste the table printed by `npm run coverage` here._

| Drug name | In Rime dictionary? |
|---|---|
| Levothyroxine | NOT covered (needs a hint) |
| Atorvastatin | covered |
| Hydroxyzine | NOT covered (needs a hint) |
| Clonazepam | NOT covered (needs a hint) |
| Montelukast | NOT covered (needs a hint) |
| Escitalopram | NOT covered (needs a hint) |
| Levetiracetam | NOT covered (needs a hint) |
| Dicyclomine | NOT covered (needs a hint) |
| Pantoprazole | covered |
| Rosuvastatin | NOT covered (needs a hint) |
| Buspirone | NOT covered (needs a hint) |
| Quetiapine | NOT covered (needs a hint) |
| Duloxetine | covered |
| Cyclobenzaprine | NOT covered (needs a hint) |
| Amlodipine | covered |

**Step 1–2, human-verified: default vs. tuned clips.** `npm run evidence` writes `evidence/<id>_default.mp3` and `evidence/<id>_tuned.mp3` for all 15 fixtures and prints a results table skeleton to the console. This is the ground-truth correctness check, since the Coverage API alone can't confirm a pronunciation is right — it can only confirm Rime recognizes the word.

## Results

_Fill in after running the listening test. Do not report this as final until it's actually been listened to — unverified numbers get no credit under the eligibility rules._

| Drug name | Default correct? | Tuned correct? | Notes |
|---|---|---|---|
| Levothyroxine | | | |
| Atorvastatin | | | |
| Hydroxyzine | | | |
| Clonazepam | | | |
| Montelukast | | | |
| Escitalopram | | | |
| Levetiracetam | | | |
| Dicyclomine | | | |
| Pantoprazole | | | |
| Rosuvastatin | | | |
| Buspirone | | | |
| Quetiapine | | | |
| Duloxetine | | | |
| Cyclobenzaprine | | | |
| Amlodipine | | | |

**Default correct: __ / 15**
**Tuned correct: __ / 15**

## Repeat-slower check

| Speed | Clip | Intelligible? | Notes |
|---|---|---|---|
| 1.0 (normal) | evidence/<dosage>_1x.mp3 | | |
| 1.6 (slower) | evidence/<dosage>_slow.mp3 | | |

## Limitations

- Scoring is by human ear, not an automated ASR-based phoneme match. An ASR round-trip (synthesize → transcribe → compare to the intended word) would make this repeatable without a human listener and is the natural next step.
- Phonetic strings in `fixtures/drug_names.json` were hand-built from the Rime phonetic alphabet reference, not generated from a verified reference recording via the `/phonemize` endpoint. Before treating results as final, regenerate them from real audio.
- 15 names is a small, English-only sample — treat results as exploratory, not a general accuracy claim about Rime.
