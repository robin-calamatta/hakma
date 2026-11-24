// Pronunciation via the browser's built-in speech synthesis (no network). Only used when a matching voice exists.
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];
const load = () => { try { voices = synth ? synth.getVoices() : []; } catch { voices = []; } };
if (synth) { load(); synth.onvoiceschanged = load; }
export function voiceFor(lang) {
  if (!synth || !lang) return null; if (!voices.length) load();
  const base = lang.split('-')[0].toLowerCase();
  return voices.find((v) => v.lang?.toLowerCase() === lang.toLowerCase()) || voices.find((v) => v.lang?.toLowerCase().startsWith(base)) || null;
}
export const canSpeak = (lang) => !!voiceFor(lang);
export function speak(text, lang, rate = 0.9) {
  const v = voiceFor(lang); if (!v || !text) return false;
  try { synth.cancel(); const u = new SpeechSynthesisUtterance(String(text).replace(/[«»“”]/g, '')); u.voice = v; u.lang = v.lang; u.rate = rate; synth.speak(u); return true; } catch { return false; }
}
export function stopSpeech() { try { synth?.cancel(); } catch {} }
