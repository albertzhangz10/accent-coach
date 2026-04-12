import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  VOICE_OPTIONS,
  DEFAULT_VOICE,
  loadVoice,
  saveVoice,
  type VoiceOption,
} from "@/lib/settings";
import { speakNative } from "@/lib/tts";

const SAMPLE_TEXT = "Hi, I'm your pronunciation coach. Let's get started.";

type Group = { title: string; voices: VoiceOption[] };

function groupVoices(): Group[] {
  const us: VoiceOption[] = [];
  const uk: VoiceOption[] = [];
  for (const v of VOICE_OPTIONS) {
    if (v.accent === "UK") uk.push(v);
    else us.push(v);
  }
  const groups: Group[] = [];
  if (us.length) groups.push({ title: "American English", voices: us });
  if (uk.length) groups.push({ title: "British English", voices: uk });
  return groups;
}

export default function SettingsScreen() {
  const [selected, setSelected] = useState<string>(DEFAULT_VOICE);
  const [loaded, setLoaded] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadVoice().then((v) => {
      setSelected(v);
      setLoaded(true);
    });
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, []);

  async function pick(id: string) {
    Haptics.selectionAsync().catch(() => {});
    setSelected(id);
    await saveVoice(id);
    preview(id);
  }

  function preview(id: string) {
    setPreviewingId(id);
    speakNative(SAMPLE_TEXT, id);
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      setPreviewingId(null);
      previewTimer.current = null;
    }, 1800);
  }

  async function resetDefault() {
    if (selected === DEFAULT_VOICE) return;
    Haptics.selectionAsync().catch(() => {});
    setSelected(DEFAULT_VOICE);
    await saveVoice(DEFAULT_VOICE);
  }

  const groups = groupVoices();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Settings" }} />

      <Text style={styles.sectionLabel}>REFERENCE VOICE</Text>
      <Text style={styles.sectionHelp}>
        Pick the neural voice used when you tap Listen on any phrase. Tap a
        voice to preview it.
      </Text>

      {!loaded ? null : (
        <View style={{ gap: 18 }}>
          {groups.map((g) => (
            <View key={g.title} style={{ gap: 10 }}>
              <Text style={styles.groupHeader}>{g.title.toUpperCase()}</Text>
              <View style={styles.list}>
                {g.voices.map((v) => {
                  const active = v.id === selected;
                  const isPreviewing = previewingId === v.id;
                  const label = `${v.label}, ${
                    v.accent === "UK" ? "British English" : "American English"
                  }, ${v.gender === "F" ? "Female" : "Male"}`;
                  return (
                    <Pressable
                      key={v.id}
                      style={[styles.row, active && styles.rowActive]}
                      onPress={() => pick(v.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={label}
                      accessibilityHint="Selects this voice and plays a short preview"
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{v.label}</Text>
                        <Text style={styles.rowMeta}>
                          {v.accent === "UK" ? "British English" : "American English"}
                          {" · "}
                          {v.gender === "F" ? "Female" : "Male"}
                        </Text>
                      </View>
                      {isPreviewing ? (
                        <ActivityIndicator color="#c4b5fd" size="small" />
                      ) : null}
                      <View
                        style={[
                          styles.radio,
                          active && styles.radioActive,
                        ]}
                      >
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={styles.resetLink}
        onPress={resetDefault}
        disabled={selected === DEFAULT_VOICE}
        accessibilityRole="button"
        accessibilityLabel="Reset voice to default"
        accessibilityHint="Restores the default reference voice"
        accessibilityState={{ disabled: selected === DEFAULT_VOICE }}
      >
        <Text
          style={[
            styles.resetLinkText,
            selected === DEFAULT_VOICE && { opacity: 0.4 },
          ]}
        >
          Reset to default
        </Text>
      </Pressable>

      <Text style={styles.footerNote}>
        Voice selection is saved to this device only. TTS is powered by Azure
        neural voices served by the backend.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0a0a0f" },
  content: { padding: 20, gap: 12, paddingBottom: 60 },
  sectionLabel: {
    color: "#9ca3af",
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "700",
    marginTop: 8,
  },
  sectionHelp: {
    color: "#9ca3af",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  groupHeader: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14141c",
    borderWidth: 1,
    borderColor: "#26262f",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    minHeight: 44,
  },
  rowActive: {
    borderColor: "#7c5cff",
    backgroundColor: "rgba(124,92,255,0.08)",
  },
  rowTitle: { color: "#f5f5f7", fontSize: 16, fontWeight: "700" },
  rowMeta: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#3f3f46",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: "#7c5cff" },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7c5cff",
  },
  resetLink: {
    marginTop: 18,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  resetLinkText: {
    color: "#c4b5fd",
    fontSize: 13,
    fontWeight: "700",
  },
  footerNote: {
    color: "#9ca3af",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
});
