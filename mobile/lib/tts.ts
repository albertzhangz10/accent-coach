import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import Constants from "expo-constants";
import { getCachedVoice, loadVoice } from "./settings";

// Kick off a cache warm-up so the first `speakNative()` call can use the
// stored voice without awaiting AsyncStorage.
loadVoice().catch(() => {});

function backendUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { backendUrl?: string };
  if (extra.backendUrl) return extra.backendUrl;
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost;
  if (typeof hostUri === "string" && hostUri.length > 0) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3001`;
  }
  return "http://localhost:3001";
}

let player: AudioPlayer | null = null;

/**
 * Force the iOS audio session back into playback mode so TTS comes out of the
 * loud speaker instead of the earpiece. After a recording session iOS stays in
 * Record/PlayAndRecord which routes to the receiver by default — we need to
 * explicitly flip `allowsRecording` off before playing.
 *
 * We call `setAudioModeAsync` twice intentionally: once to release the record
 * category, and a second time to nail down `playsInSilentMode`. On some
 * iOS versions the category change alone doesn't take effect if the app is
 * still holding a recorder reference.
 */
async function resetToPlaybackMode() {
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "doNotMix",
    });
  } catch (e) {
    console.warn("[tts] setAudioModeAsync pass 1 failed:", e);
  }
  // Second pass — belt and braces for the earpiece/speaker route flip.
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "doNotMix",
    });
  } catch {}
}

export async function speakNative(text: string, voice?: string) {
  if (!text) return;
  await resetToPlaybackMode();
  const effectiveVoice = voice ?? getCachedVoice();
  const url = `${backendUrl()}/api/tts?text=${encodeURIComponent(text)}${
    effectiveVoice ? `&voice=${encodeURIComponent(effectiveVoice)}` : ""
  }`;

  try {
    if (player) {
      try {
        player.pause();
      } catch {}
      player.replace({ uri: url });
    } else {
      player = createAudioPlayer({ uri: url });
    }
    player.volume = 1.0;
    player.muted = false;
    player.seekTo(0).catch(() => {});
    player.play();
  } catch (e) {
    console.warn("[tts] playback failed:", e);
  }
}

export function stopSpeaking() {
  try {
    player?.pause();
  } catch {}
}
