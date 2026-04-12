import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  Linking,
  AccessibilityInfo,
} from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { speakNative, stopSpeaking } from "@/lib/tts";
import { scoreAudio, type AttemptScore } from "@/lib/api";
import { RECORDING_OPTIONS } from "@/lib/audioConfig";

type Props = {
  reference: string;
  onScored: (score: AttemptScore) => void;
};

type RecState = "idle" | "recording" | "processing" | "error" | "denied";

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MAX_DURATION_MS = 20_000;
const MIN_DURATION_MS = 800;
// Minimum peak audio level (dB) that counts as "the user actually spoke".
// expo-audio metering ranges ~[-160, 0] where 0 is the loudest. Normal speech
// peaks around -30 to -10 dB; ambient silence sits below -50 dB.
const SILENCE_THRESHOLD_DB = -45;
// Delay between prepareToRecordAsync() and record() so iOS fully flips the
// audio session from Playback to Record before the first sample is written.
// At 250ms we still occasionally saw ~100ms of silence at the top of the
// recording; 400ms is boring but bulletproof on iPhone 12 and later.
const AUDIO_SESSION_SETTLE_MS = 400;

export function Recorder({ reference, onScored }: Props) {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recState = useAudioRecorderState(recorder);
  const [state, setState] = useState<RecState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const cancelledRef = useRef(false);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotionRef = useRef(false);
  const peakMeteringRef = useRef<number>(-160);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        reduceMotionRef.current = v;
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (v: boolean) => {
        reduceMotionRef.current = v;
      },
    );
    return () => {
      try {
        sub.remove();
      } catch {}
    };
  }, []);

  useEffect(() => {
    setState("idle");
    setError(null);
  }, [reference]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopSpeaking();
      if (speakTimer.current) {
        clearTimeout(speakTimer.current);
        speakTimer.current = null;
      }
      // Best-effort restore of audio session on unmount.
      setAudioModeAsync({
        allowsRecording: false,
        interruptionMode: "mixWithOthers",
        playsInSilentMode: true,
      }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (state === "recording" && !reduceMotionRef.current) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.12,
            duration: 650,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.current = loop;
      loop.start();
    } else {
      pulseLoop.current?.stop();
      pulseLoop.current = null;
      pulse.setValue(1);
    }
    return () => {
      pulseLoop.current?.stop();
      pulseLoop.current = null;
    };
  }, [state, pulse]);

  // Max-duration auto-stop + track the peak metering level across the session
  // so we can detect silent recordings before uploading them.
  useEffect(() => {
    if (state !== "recording") return;
    if (
      typeof recState.metering === "number" &&
      recState.metering > peakMeteringRef.current
    ) {
      peakMeteringRef.current = recState.metering;
    }
    if (recState.durationMillis > MAX_DURATION_MS) {
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState.durationMillis, recState.metering, state]);

  async function start() {
    setError(null);
    cancelledRef.current = false;
    peakMeteringRef.current = -160;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setCanAskAgain(perm.canAskAgain ?? true);
        setError("Microphone access is off. Enable it in Settings to record.");
        setState("denied");
        return;
      }
      // Stop any currently playing TTS so it doesn't bleed into the recording
      // and so the audio session can cleanly flip to record mode.
      stopSpeaking();
      await setAudioModeAsync({
        allowsRecording: true,
        interruptionMode: "doNotMix",
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      // Let iOS finish flipping from Playback to Record mode before we start
      // capturing. Without this, the first ~300ms is often silence and Azure
      // returns all-Omission.
      await new Promise((r) => setTimeout(r, AUDIO_SESSION_SETTLE_MS));
      recorder.record();
      setState("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e: any) {
      setError(e?.message ?? "Could not start recording");
      setState("error");
    }
  }

  async function stop() {
    if (state !== "recording") return;
    setState("processing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const durationAtStop = recState.durationMillis;
    const peakAtStop = peakMeteringRef.current;
    try {
      await recorder.stop();

      if (durationAtStop > 0 && durationAtStop < MIN_DURATION_MS) {
        setError("Hold longer — say the whole phrase.");
        setState("error");
        return;
      }

      // Local silence check: if we never saw audio above the threshold, don't
      // even bother uploading. Saves a 10-second Azure round-trip and the
      // resulting garbage scores. Threshold only applies when metering
      // actually produced values (peak > -160, the default).
      if (peakAtStop > -160 && peakAtStop < SILENCE_THRESHOLD_DB) {
        setError(
          "We didn't hear you — speak a bit louder and try again."
        );
        setState("error");
        return;
      }

      const uri = recorder.uri;
      if (!uri) throw new Error("No recording URI");
      const score = await scoreAudio(uri, reference);
      if (cancelledRef.current) {
        cancelledRef.current = false;
        setState("idle");
        return;
      }
      onScored(score);
      setState("idle");
    } catch (e: any) {
      if (cancelledRef.current) {
        cancelledRef.current = false;
        setState("idle");
        return;
      }
      setError(e?.message ?? "Scoring failed");
      setState("error");
    } finally {
      // Always restore the audio session — fixes the record-mode leak.
      setAudioModeAsync({
        allowsRecording: false,
        interruptionMode: "mixWithOthers",
        playsInSilentMode: true,
      }).catch(() => {});
    }
  }

  function cancelProcessing() {
    cancelledRef.current = true;
    setState("idle");
    setError(null);
    Haptics.selectionAsync().catch(() => {});
  }

  // Aborts an in-flight recording without uploading. Unlike stop(), this path
  // never calls scoreAudio and never shows a score — the audio buffer is
  // discarded and we go straight back to idle so the user can re-record.
  async function cancelRecording() {
    if (state !== "recording") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await recorder.stop();
    } catch {
      // The recorder may already be torn down; ignore.
    }
    peakMeteringRef.current = -160;
    setState("idle");
    setError(null);
    // Restore the audio session so TTS playback routes to the loud speaker
    // immediately — otherwise the next Listen tap would play through the
    // earpiece.
    setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: "mixWithOthers",
      playsInSilentMode: true,
    }).catch(() => {});
  }

  function playReference() {
    if (isSpeaking) return;
    Haptics.selectionAsync().catch(() => {});
    setIsSpeaking(true);
    speakNative(reference);
    if (speakTimer.current) clearTimeout(speakTimer.current);
    speakTimer.current = setTimeout(() => {
      setIsSpeaking(false);
      speakTimer.current = null;
    }, 1500);
  }

  async function openSettings() {
    Haptics.selectionAsync().catch(() => {});
    try {
      await Linking.openSettings();
    } catch {}
  }

  function retryPermission() {
    setState("idle");
    setError(null);
    start();
  }

  const durationMs = state === "recording" ? recState.durationMillis : 0;

  if (state === "denied") {
    return (
      <View style={styles.container}>
        <View style={styles.permBox}>
          <Text style={styles.permTitle}>Microphone access is off</Text>
          <Text style={styles.permBody}>
            Enable microphone access to record your voice and get feedback.
          </Text>
          {canAskAgain ? (
            <Pressable
              style={styles.permBtnPrimary}
              onPress={retryPermission}
              accessibilityRole="button"
              accessibilityLabel="Allow microphone"
              accessibilityHint="Prompts to grant microphone access"
            >
              <Text style={styles.permBtnPrimaryText}>Allow microphone</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.permBtnPrimary}
              onPress={openSettings}
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
              accessibilityHint="Opens the system Settings app so you can enable microphone access"
            >
              <Text style={styles.permBtnPrimaryText}>Open Settings</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {state === "recording" ? (
          <Pressable
            style={styles.cancelBtn}
            onPress={cancelRecording}
            accessibilityRole="button"
            accessibilityLabel="Cancel recording"
            accessibilityHint="Discards this recording without scoring it"
          >
            <Ionicons name="close" size={16} color="#d4d4d8" />
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.listenBtn, isSpeaking && styles.listenBtnBusy]}
            onPress={playReference}
            disabled={isSpeaking}
            accessibilityRole="button"
            accessibilityLabel="Listen to reference phrase"
            accessibilityHint="Plays the phrase spoken by a native voice"
            accessibilityState={{ disabled: isSpeaking, busy: isSpeaking }}
          >
            {isSpeaking ? (
              <ActivityIndicator color="#c4b5fd" size="small" />
            ) : (
              <Ionicons name="volume-high" size={16} color="#e5e5ea" />
            )}
            <Text style={styles.listenText}>Listen</Text>
          </Pressable>
        )}

        {state === "recording" ? (
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              style={[styles.recordBtn, styles.stopBtn]}
              onPress={stop}
              accessibilityRole="button"
              accessibilityLabel="Stop and score"
              accessibilityHint="Stops recording and sends it for scoring"
            >
              <Text style={styles.recordText}>Stop</Text>
            </Pressable>
          </Animated.View>
        ) : state === "processing" ? (
          <Pressable
            style={[styles.recordBtn, styles.processingBtn]}
            onPress={cancelProcessing}
            accessibilityRole="button"
            accessibilityLabel="Cancel scoring"
            accessibilityHint="Cancels the current scoring attempt"
          >
            <ActivityIndicator color="#fff" />
            <Text style={styles.cancelHint}>Tap to cancel</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.recordBtn}
            onPress={start}
            accessibilityRole="button"
            accessibilityLabel="Record"
            accessibilityHint="Starts recording your voice"
          >
            <Text style={styles.recordText}>Record</Text>
          </Pressable>
        )}
      </View>
      {state === "recording" ? (
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{formatDuration(durationMs)}</Text>
        </View>
      ) : (
        <Text style={styles.hint}>
          Tap Listen first, then Record and say the phrase.
        </Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  listenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#14141c",
    borderWidth: 1,
    borderColor: "#26262f",
    minHeight: 44,
  },
  listenBtnBusy: { opacity: 0.75 },
  listenText: { color: "#e5e5ea", fontWeight: "600" },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#14141c",
    borderWidth: 1,
    borderColor: "#3f3f46",
    minHeight: 44,
  },
  cancelBtnText: { color: "#d4d4d8", fontWeight: "700", fontSize: 14 },
  recordBtn: {
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: "#ff4d6d",
    shadowColor: "#ff4d6d",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: { backgroundColor: "#f43f5e" },
  processingBtn: {
    backgroundColor: "#7c5cff",
    flexDirection: "row",
    gap: 10,
  },
  recordText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelHint: { color: "#fff", fontWeight: "600", fontSize: 13 },
  hint: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.3,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff4d6d",
  },
  liveText: {
    color: "#f5f5f7",
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  error: {
    color: "#fca5a5",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  permBox: {
    backgroundColor: "#14141c",
    borderWidth: 1,
    borderColor: "#26262f",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 10,
    maxWidth: 340,
  },
  permTitle: {
    color: "#f5f5f7",
    fontSize: 16,
    fontWeight: "700",
  },
  permBody: {
    color: "#9ca3af",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  permBtnPrimary: {
    marginTop: 6,
    backgroundColor: "#7c5cff",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  permBtnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
