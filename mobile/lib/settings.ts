import AsyncStorage from "@react-native-async-storage/async-storage";

const VOICE_KEY = "accent-coach-voice";
const ONBOARDED_KEY = "accent-coach-onboarded";

export type VoiceOption = {
  id: string;
  label: string;
  accent: string;
  gender: "F" | "M";
};

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "jenny", label: "Jenny", accent: "US", gender: "F" },
  { id: "aria", label: "Aria", accent: "US", gender: "F" },
  { id: "guy", label: "Guy", accent: "US", gender: "M" },
  { id: "davis", label: "Davis", accent: "US", gender: "M" },
  { id: "tony", label: "Tony", accent: "US", gender: "M" },
  { id: "amber", label: "Amber", accent: "US", gender: "F" },
  { id: "sonia", label: "Sonia", accent: "UK", gender: "F" },
  { id: "ryan", label: "Ryan", accent: "UK", gender: "M" },
];

export const DEFAULT_VOICE = "jenny";

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
