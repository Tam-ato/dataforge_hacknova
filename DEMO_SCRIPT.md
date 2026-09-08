# Demo script (aim for 4 minutes)

1. **User & problem (30s).** "This is RxSpeak, built for a blind or low-vision patient picking up a prescription, or a pharmacist whose hands are full. The label has to be read aloud correctly — there's no screen to fall back on."
2. **Normal flow (60s).** Pick a drug from the dropdown, hit "Read prescription." Point out the provider badge showing Rime is live, model/speaker.
3. **Hard voice problem (60s).** Explain: default TTS mangles drug names. Play the "Default vs Tuned" comparison for one name live — let the mispronunciation be audible, then the corrected one.
4. **Stress case (60s).** Kill your Wi-Fi or API key briefly (or show the error path) to prove the fallback is visible and labeled, not silent. Then restore it and show "repeat slower" on a dosage line.
5. **Result / evidence (30s).** Show `RIME_EVIDENCE.md` with the filled-in correct/incorrect table — default vs tuned score.
6. **Close (20s).** Restate: Rime is the only spoken output; if you mute it, the product has nothing left to give a blind user.
