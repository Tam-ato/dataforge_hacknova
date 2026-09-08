require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/fixtures', express.static(path.join(__dirname, 'fixtures')));

const RIME_API_KEY = process.env.RIME_API_KEY;
const RIME_MODEL_ID = process.env.RIME_MODEL_ID || 'mistv2';
const RIME_SPEAKER = process.env.RIME_SPEAKER || 'astra';
const RIME_LANG = process.env.RIME_LANG || 'eng';
const RIME_URL = 'https://users.rime.ai/v1/rime-tts';

// Which provider actually served the last request. The UI polls this so
// the active speech provider is always visible, per the "make fallbacks
// visible" rule.
let lastProvider = { provider: 'none', detail: '' };

app.get('/api/status', (req, res) => {
  res.json({
    configured: Boolean(RIME_API_KEY),
    modelId: RIME_MODEL_ID,
    speaker: RIME_SPEAKER,
    lang: RIME_LANG,
    lastProvider,
  });
});

/**
 * POST /api/speak
 * body: {
 *   text: string,              // may contain {phonetic} and [word] speed markup
 *   tuned: boolean,             // whether to honor {..} pronunciation brackets
 *   speedAlpha: number,         // 1.0 normal, >1 slower, <1 faster
 *   pauseBetweenBrackets: bool  // honor <200> pause markup
 * }
 */
app.post('/api/speak', async (req, res) => {
  const {
    text,
    tuned = false,
    speedAlpha = 1.0,
    pauseBetweenBrackets = false,
  } = req.body || {};

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  if (!RIME_API_KEY) {
    lastProvider = { provider: 'none', detail: 'RIME_API_KEY not set' };
    return res.status(503).json({ error: 'RIME_API_KEY is not configured on the server' });
  }

  const payload = {
    text,
    modelId: RIME_MODEL_ID,
    speaker: RIME_SPEAKER,
    lang: RIME_LANG,
    speedAlpha: Number(speedAlpha) || 1.0,
    phonemizeBetweenBrackets: Boolean(tuned),
    pauseBetweenBrackets: Boolean(pauseBetweenBrackets),
  };

  try {
    const rimeRes = await fetch(RIME_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RIME_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'audio/mp3',
      },
      body: JSON.stringify(payload),
    });

    if (!rimeRes.ok) {
      const errText = await rimeRes.text().catch(() => '');
      lastProvider = { provider: 'error', detail: `Rime ${rimeRes.status}: ${errText.slice(0, 200)}` };
      return res.status(502).json({ error: 'Rime request failed', detail: errText });
    }

    lastProvider = {
      provider: 'rime',
      detail: `${RIME_MODEL_ID}/${RIME_SPEAKER} tuned=${Boolean(tuned)} speedAlpha=${payload.speedAlpha}`,
    };

    res.setHeader('Content-Type', 'audio/mpeg');
    const buf = await rimeRes.buffer();
    res.send(buf);
  } catch (err) {
    lastProvider = { provider: 'error', detail: String(err) };
    res.status(500).json({ error: 'Server error calling Rime', detail: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RxSpeak server listening on http://localhost:${PORT}`);
  if (!RIME_API_KEY) {
    console.warn('WARNING: RIME_API_KEY is not set. Copy .env.example to .env and add your key.');
  }
});
