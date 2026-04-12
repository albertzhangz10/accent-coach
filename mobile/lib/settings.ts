import AsyncStorage from "@react-native-async-storage/async-storage";

const VOICE_KEY = "accent-coach-voice";
const ONBOARDED_KEY = "accent-coach-onboarded";

export type VoiceOption = {
  id: string;
  label: string;
  accent: string;
  gender: "F" | "M";
};

// IDs must match the backend `ALLOWED_VOICES` set in `app/api/tts/route.ts`.
// The backend rejects any unknown voice and silently falls back to its default,
// which made the picker appear broken when we previously stored short names
// like "jenny" here.
export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "en-US-JennyNeural", label: "Jenny", accent: "US", gender: "F" },
  { id: "en-US-AriaNeural", label: "Aria", accent: "US", gender: "F" },
  { id: "en-US-AmberNeural", label: "Amber", accent: "US", gender: "F" },
  { id: "en-US-AnaNeural", label: "Ana", accent: "US", gender: "F" },
  { id: "en-US-GuyNeural", label: "Guy", accent: "US", gender: "M" },
  { id: "en-US-DavisNeural", label: "Davis", accent: "US", gender: "M" },
  { id: "en-US-TonyNeural", label: "Tony", accent: "US", gender: "M" },
  { id: "en-GB-SoniaNeural", label: "Sonia", accent: "UK", gender: "F" },
  { id: "en-GB-RyanNeural", label: "Ryan", accent: "UK", gender: "M" },
];

export const DEFAULT_VOICE = "en-US-JennyNeural";

// In-memory cache so `speakNative()` can read the selection synchronously
// once it has been loaded once. Kept in sync by loadVoice/saveVoice.
let cachedVoice: string | null = null;

export async function loadVoice(): Promise<string> {
  if (cachedVoice) return cachedVoice;
  try {
    const raw = await AsyncStorage.getItem(VOICE_KEY);
    cachedVoice = raw && VOICE_OPTIONS.some((v) => v.id === raw) ? raw : DEFAULT_VOICE;
  } catch {
    cachedVoice = DEFAULT_VOICE;
  }
  return cachedVoice;
}

export function getCachedVoice(): string {
  return cachedVoice ?? DEFAULT_VOICE;
}

export async function saveVoice(voice: string): Promise<void> {
  cachedVoice = voice;
  try {
    await AsyncStorage.setItem(VOICE_KEY, voice);
  } catch {}
}

export async function isOnboarded(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDED_KEY);
    return raw === "1";
  } catch {
    return false;
  }
}

export async function markOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, "1");
  } catch {}
}
