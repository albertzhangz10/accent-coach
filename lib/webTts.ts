const VOICE_KEY = "accent-coach-web-voice";
const DEFAULT_VOICE = "en-US-JennyNeural";

let currentAudio: HTMLAudioElement | null = null;

function getVoice(): string {
  if (typeof window === "undefined") return DEFAULT_VOICE;
  return localStorage.getItem(VOICE_KEY) || DEFAULT_VOICE;
}

export function setVoice(voice: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOICE_KEY, voice);
}

export function getSelectedVoice(): string {
  return getVoice();
}

export function speakNative(text: string, voice?: string): void {
  stopSpeaking();
  const v = voice || getVoice();
  const url = `/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(v)}`;
  currentAudio = new Audio(url);
  currentAudio.play().catch(() => {});
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}
