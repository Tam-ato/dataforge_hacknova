# RxSpeak

🎥 **Demo video:** https://drive.google.com/file/d/12TAR6GDyYHJH3t-868frJHV6dnQXAsZh/view?usp=sharing

A prescription-label voice reader for **low-vision and blind patients**, and for **pharmacists whose hands and eyes are busy** filling orders. Rime-generated speech is the primary and only output of the core flow — there is no visual fallback for reading the label; if you remove speech, the product is gone.

**Track:** Rime AI Track — DataForge 2026
**Hard voice problem chosen:** Pronunciation and controlled delivery.

## The problem this proves

Off-the-shelf TTS frequently mispronounces multisyllabic drug names (e.g. *Levothyroxine*, *Atorvastatin*, *Hydroxyzine*). For a sighted user this is a minor annoyance; for a blind patient confirming what they're about to take, it is a safety issue. We:

1. Maintain a fixture list of 15 hard drug names (`fixtures/drug_names.json`).
2. Render each one two ways: **default** Rime pronunciation, and **tuned** pronunciation using Rime's inline phonetic-bracket syntax (`phonemizeBetweenBrackets`, Mist-family models).
3. Save both clips and score them by ear against the intended pronunciation (see `RIME_EVIDENCE.md`).
4. Also expose a "repeat slower" control (`speedAlpha`) so a patient can ask for the dosage line again, more slowly, without re-reading the whole label.

**A second controlled-delivery issue surfaced during testing, not anticipated in advance:** dosage lines like "Take one 75 microgram tablet" were audibly blending "one" and "75" together, sounding close to "175" — a real safety-relevant ambiguity for an audio-only reader. Fixed using Rime's custom pause markup (`pauseBetweenBrackets`, `<250> ,`) inserted after every "one" in the dosage fixtures, so the quantity and following number are always spoken as distinct units. See `RIME_EVIDENCE.md` for before/after notes.

## Architecture

```
Browser (public/index.html, app.js)
   │  fetch('/api/speak', { text, tuned, speedAlpha })
   ▼
Express server (server.js)
   │  keeps RIME_API_KEY server-side
   │  POST https://users.rime.ai/v1/rime-tts
   ▼
Rime TTS (Mist v2) ──► MP3 audio ──► streamed back to browser ──► <audio> playback
```

- **Frontend:** plain HTML/CSS/JS. No build step.
- **Backend:** Node + Express, single route `/api/speak` that proxies to Rime so the API key never reaches the client.
- **Fallback:** if the Rime call fails (network, misconfigured key, rate limit), the browser's built-in `speechSynthesis` reads the text instead, and the UI visibly labels this as a fallback rather than silently swapping providers.
- **Active provider display:** `/api/status` reports the last provider used (`rime` / `error` / `none`) and the exact model/speaker/tuned/speed settings, shown in the header badge and footer.

## Exact Rime configuration used

| Setting | Value |
|---|---|
| Endpoint | `POST https://users.rime.ai/v1/rime-tts` |
| Model ID | `mistv2` (required for `phonemizeBetweenBrackets` pronunciation control) |
| Speaker | `astra` (English) — change via `RIME_SPEAKER` env var |
| Language | `eng` |
| Audio format | `audio/mp3` (`Accept: audio/mp3` header) |
| Transport | Plain HTTPS request/response (non-streaming), proxied through our Express server |
| Pronunciation control | `phonemizeBetweenBrackets: true` + curly-brace phonetic strings from `fixtures/drug_names.json` |
| Controlled delivery | `speedAlpha` (1.0 normal, 1.6 for "repeat slower") |

> These have been audio-verified against reference pronunciations (Google search results / drugs.com) — 15/15 tuned pronunciations scored correct, vs. 12/15 for Rime's default. Full methodology and per-drug results in `RIME_EVIDENCE.md`.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and paste your real RIME_API_KEY
npm start
# open http://localhost:3000
```

## Running the acceptance test

```bash
npm run coverage           # automated: which drug names are in Rime's dictionary at all
npm start                  # terminal 1
npm run evidence           # terminal 2 — renders every fixture, default + tuned
```

`npm run coverage` uses Rime's own Coverage (OOV) API to flag out-of-vocabulary words automatically and repeatably — no listening required for this step. It only confirms whether Rime recognizes a word, not whether the pronunciation is correct, so it's a useful pre-check, not a replacement for the listening pass in `npm run evidence`.

This writes paired MP3s to `evidence/<drug>_default.mp3` and `evidence/<drug>_tuned.mp3`, and prints a markdown table to paste into `RIME_EVIDENCE.md`. Listen to each pair and mark correct/incorrect.

## Known limitations

- Pronunciation correctness was verified by ear against text-based reference pronunciations (Google, drugs.com), not an automated phoneme-match score. An ASR round-trip (synthesize → transcribe → compare) would make this repeatable without a human listener — a natural next step, not implemented here.
- `phonemizeBetweenBrackets` only works on Mist v1/v2, so this project is pinned to `mistv2` rather than newer Coda/Arcana voices.
- The 15-name fixture list is representative, not exhaustive; it does not cover every drug class or non-English names.
- No OCR / photo-to-label pipeline yet — text is typed or picked from the fixture list. Real deployment would need a label-scanning step upstream of this TTS layer.
- Fallback browser speech does not carry the tuned pronunciation (Web Speech API doesn't support Rime's phonetic alphabet), so it is a degraded-but-labeled experience, not a silent swap.

## Third-party services

- Rime TTS API (`users.rime.ai`) — primary and required.
- Browser `speechSynthesis` — visible fallback only, not used in the judged happy path.
