const rxSelect = document.getElementById('rxSelect');
const drugName = document.getElementById('drugName');
const instructions = document.getElementById('instructions');
const tunedToggle = document.getElementById('tunedToggle');
const playBtn = document.getElementById('playBtn');
const repeatSlowBtn = document.getElementById('repeatSlowBtn');
const player = document.getElementById('player');
const statusEl = document.getElementById('status');
const providerBadge = document.getElementById('providerBadge');
const footerProvider = document.getElementById('footerProvider');
const playDefaultBtn = document.getElementById('playDefaultBtn');
const playTunedBtn = document.getElementById('playTunedBtn');
const comparePlayer = document.getElementById('comparePlayer');

let fixtures = [];
let currentFixture = null;

async function loadFixtures() {
  const res = await fetch('/fixtures/drug_names.json');
  const data = await res.json();
  fixtures = data.items;
  rxSelect.innerHTML = fixtures
    .map((f, i) => `<option value="${i}">${f.plain_text}</option>`)
    .join('');
  selectFixture(0);
}

function selectFixture(i) {
  currentFixture = fixtures[i];
  drugName.value = currentFixture.plain_text;
  instructions.value = currentFixture.dosage_example;
}

rxSelect.addEventListener('change', (e) => selectFixture(Number(e.target.value)));

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
}

async function refreshProviderBadge() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (!data.configured) {
      providerBadge.textContent = 'Rime not configured — set RIME_API_KEY in .env';
      footerProvider.textContent = 'not configured';
      return;
    }
    providerBadge.textContent = `Rime ${data.modelId} / ${data.speaker} ready`;
    footerProvider.textContent = data.lastProvider.provider === 'rime'
      ? `Rime (${data.lastProvider.detail})`
      : data.lastProvider.provider;
  } catch (e) {
    providerBadge.textContent = 'Server unreachable';
  }
}

// Builds the utterance text. When "tuned" is on, we substitute the drug
// name for its curly-brace phonetic string so Rime's phonemizeBetweenBrackets
// path is exercised; instructions are spoken plainly (Rime's normalizer
// handles numbers/dosages on its own).
function buildUtterance(tuned) {
  const name = tuned && currentFixture ? currentFixture.tuned_text : drugName.value;
  return `${name}. ${instructions.value}`;
}

async function speakAndPlay(text, tuned, speedAlpha, targetPlayer) {
  setStatus('Calling Rime…');
  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, tuned, speedAlpha }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      // Visible fallback: browser TTS, clearly labeled as non-Rime.
      setStatus(`Rime unavailable (${errBody.error || res.status}) — falling back to browser voice`, 'error');
      fallbackSpeak(text);
      return;
    }

    const blob = await res.blob();
    targetPlayer.src = URL.createObjectURL(blob);
    await targetPlayer.play();
    setStatus('Played via Rime.', 'ok');
  } catch (err) {
    setStatus('Network error — falling back to browser voice', 'error');
    fallbackSpeak(text);
  } finally {
    refreshProviderBadge();
  }
}

function fallbackSpeak(text) {
  if (!('speechSynthesis' in window)) return;
  const clean = text.replace(/[{}<>\[\]]/g, '');
  const utter = new SpeechSynthesisUtterance(clean);
  window.speechSynthesis.speak(utter);
}

playBtn.addEventListener('click', () => {
  const text = buildUtterance(tunedToggle.checked);
  speakAndPlay(text, tunedToggle.checked, 1.0, player);
});

repeatSlowBtn.addEventListener('click', () => {
  const text = buildUtterance(tunedToggle.checked);
  speakAndPlay(text, tunedToggle.checked, 1.6, player);
});

playDefaultBtn.addEventListener('click', () => {
  if (!currentFixture) return;
  speakAndPlay(currentFixture.plain_text, false, 1.0, comparePlayer);
});

playTunedBtn.addEventListener('click', () => {
  if (!currentFixture) return;
  speakAndPlay(currentFixture.tuned_text, true, 1.0, comparePlayer);
});

loadFixtures();
refreshProviderBadge();
setInterval(refreshProviderBadge, 5000);
