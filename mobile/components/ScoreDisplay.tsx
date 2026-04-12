import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
  AccessibilityInfo,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { speakNative } from "@/lib/tts";
import type { AttemptScore, WordScore, PhonemeScore } from "@/lib/api";
import { getPhonemeTip } from "@/lib/phonemeTips";

function scoreColor(n: number): string {
  if (n >= 85) return "#6ee7b7";
  if (n >= 70) return "#bef264";
  if (n >= 55) return "#fcd34d";
  return "#fca5a5";
}

function scoreLabel(n: number): string {
  if (n >= 90) return "Excellent";
  if (n >= 80) return "Great";
  if (n >= 70) return "Good";
  if (n >= 55) return "Getting there";
  return "Needs work";
}

const METRIC_HELP: Record<string, string> = {
  ACCURACY: "How close each sound was to native",
  FLUENCY: "Rhythm, pauses, and pace",
  COMPLETE: "Did you say every word",
  PROSODY: "Melody and rhythm",
};

type InlineToken =
  | { kind: "space"; text: string }
  | { kind: "punct"; text: string }
  | { kind: "word"; text: string; score: WordScore | undefined };

function tokenizeReference(reference: string, words: WordScore[]): InlineToken[] {
  const tokens: InlineToken[] = [];
  const parts = reference.match(/[A-Za-z']+|[^A-Za-z'\s]+|\s+/g) ?? [];
  let wordIdx = 0;
  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      tokens.push({ kind: "space", text: part });
    } else if (/^[A-Za-z']+$/.test(part)) {
      tokens.push({ kind: "word", text: part, score: words[wordIdx++] });
    } else {
      tokens.push({ kind: "punct", text: part });
    }
  }
  return tokens;
}

function wordStyle(status: WordScore["status"] | undefined) {
  switch (status) {
    case "good":
      return styles.wordGood;
    case "ok":
      return styles.wordOk;
    case "poor":
      return styles.wordPoor;
    case "missing":
      return styles.wordMissing;
    default:
      return styles.wordGood;
  }
}

function statusLabel(status: WordScore["status"] | undefined): string {
  switch (status) {
    case "good":
      return "said well";
    case "ok":
      return "close, could be cleaner";
    case "poor":
      return "needs work";
    case "missing":
      return "missed";
    default:
      return "";
  }
}

function tipForPhoneme(p: { phoneme?: string; arpabet?: string } | null | undefined) {
  if (!p) return null;
  if (p.arpabet) {
    const byArp = getPhonemeTip(p.arpabet);
    if (byArp) return byArp;
  }
  if (p.phoneme) return getPhonemeTip(p.phoneme);
  return null;
}

function firstDifferentAlternative(
  ref: PhonemeScore | { phoneme: string } | null | undefined,
  alts: { phoneme: string; score: number }[] | undefined,
): { phoneme: string; score: number } | null {
  if (!alts || alts.length === 0) return null;
  const refSym = ref?.phoneme;
  for (const a of alts) {
    if (a.phoneme && a.phoneme !== refSym) return a;
  }
  return null;
}

export function ScoreDisplay({
  score,
  reference,
}: {
  score: AttemptScore;
  reference: string;
}) {
  const tokens = tokenizeReference(reference, score.words);
  const problemWords = [...score.words]
    .filter(
      (w) => w.status === "poor" || w.status === "missing" || w.status === "ok",
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const bigScale = useRef(new Animated.Value(1)).current;
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (speakTimer.current) clearTimeout(speakTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let reduceMotion = false;
      try {
        reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      } catch {}
      if (cancelled) return;
      if (score.overall >= 85) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
        if (reduceMotion) {
          bigScale.setValue(1);
        } else {
          bigScale.setValue(0.6);
          Animated.spring(bigScale, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }).start();
        }
      } else if (score.overall < 40) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score.overall]);

  function speakWithKey(key: string, text: string) {
    if (speakingKey) return;
    Haptics.selectionAsync().catch(() => {});
    setSpeakingKey(key);
    speakNative(text);
    if (speakTimer.current) clearTimeout(speakTimer.current);
    speakTimer.current = setTimeout(() => {
      setSpeakingKey(null);
      speakTimer.current = null;
    }, 1500);
  }

  const metrics: { label: string; value: number | undefined }[] = [
    { label: "ACCURACY", value: score.accuracy },
    { label: "FLUENCY", value: score.fluency },
    { label: "COMPLETE", value: score.completeness },
    { label: "PROSODY", value: score.prosody },
  ];

  return (
    <View style={styles.wrap}>
      {score.warning ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>{"\u26A0\uFE0F  "}{score.warning}</Text>
        </View>
      ) : null}

      <View style={styles.overall}>
        <Animated.Text
          style={[
            styles.overallValue,
            { color: scoreColor(score.overall), transform: [{ scale: bigScale }] },
          ]}
        >
          {score.overall}
        </Animated.Text>
        <Text style={styles.overallLabel}>
          OVERALL · {scoreLabel(score.overall).toUpperCase()}
        </Text>
        <Text style={styles.overallSub}>out of 100</Text>
      </View>

      <View style={styles.metrics}>
        {metrics.map((m) => {
          const hasValue = typeof m.value === "number";
          return (
            <View key={m.label} style={styles.metric}>
              <Text
                style={[
                  styles.metricValue,
                  { color: hasValue ? scoreColor(m.value as number) : "#3f3f46" },
                ]}
              >
                {hasValue ? m.value : "—"}
              </Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricHelp}>{METRIC_HELP[m.label]}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.sentenceBox}>
        <Text style={styles.sectionLabel}>YOUR ATTEMPT</Text>
        <Text style={styles.sentenceHint}>
          Red = needs work · Yellow = close · Strikethrough = missed · Tap any
          word to hear it
        </Text>
        <Text style={styles.sentence}>
          {tokens.map((t, i) => {
            if (t.kind === "space") return <Text key={i}>{" "}</Text>;
            if (t.kind === "punct")
              return (
                <Text key={i} style={styles.wordGood}>
                  {t.text}
                </Text>
              );
            const label = `${t.text}, ${statusLabel(t.score?.status)}`;
            return (
              <Text
                key={i}
                style={wordStyle(t.score?.status)}
                onPress={() => speakWithKey(`w-${i}`, t.text)}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint="Plays this word"
              >
                {t.text}
              </Text>
            );
          })}
        </Text>
      </View>

      {problemWords.length > 0 && (
        <View style={styles.focusBox}>
          <Text style={styles.focusLabel}>
            {"\uD83C\uDFAF  FOCUS ON THESE WORDS"}
          </Text>
          <View style={{ gap: 12, marginTop: 14 }}>
            {problemWords.map((w, i) => {
              const worst = w.worstPhoneme ?? null;
              const tip = tipForPhoneme(worst);
              const phonemeAlts = (() => {
                if (!w.phonemes || !worst) return null;
                const match = w.phonemes.find(
                  (p) =>
                    p.phoneme === worst.phoneme ||
                    (p.arpabet && worst.arpabet && p.arpabet === worst.arpabet),
                );
                if (!match) return null;
                return firstDifferentAlternative(match, match.alternatives);
              })();
              const plainSuffix = tip?.example
                ? (() => {
                    const firstWord = tip.example.split(",")[0]?.trim() ?? "";
                    if (!firstWord) return null;
                    return ` — like in “${firstWord}”`;
                  })()
                : null;
              const speakKey = `f-${i}`;
              const isThisSpeaking = speakingKey === speakKey;
              const isLast = i === problemWords.length - 1;
              return (
                <View
                  key={i}
                  style={[
                    styles.focusItem,
                    isLast && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.focusItemTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.focusWord}>{w.word}</Text>
                      {worst && worst.phoneme ? (
                        <Text style={styles.focusPhoneme}>
                          weakest sound: {tip ? tip.symbol : `/${worst.phoneme}/`}
                          {" · "}
                          {worst.score}/100
                          {plainSuffix}
                        </Text>
                      ) : null}
                      {phonemeAlts ? (
                        <Text style={styles.focusSoundedLike}>
                          sounded like /{phonemeAlts.phoneme}/
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      style={[
                        styles.listenPill,
                        isThisSpeaking && styles.listenPillBusy,
                      ]}
                      disabled={!!speakingKey}
                      onPress={() => speakWithKey(speakKey, w.word)}
                      accessibilityRole="button"
                      accessibilityLabel={`Listen to ${w.word}`}
                      accessibilityHint="Plays the word spoken by a native voice"
                      accessibilityState={{
                        disabled: !!speakingKey,
                        busy: isThisSpeaking,
                      }}
                    >
                      {isThisSpeaking ? (
                        <ActivityIndicator color="#c4b5fd" size="small" />
                      ) : (
                        <Ionicons
                          name="volume-high"
                          size={12}
                          color="#c4b5fd"
                        />
                      )}
                      <Text style={styles.listenPillText}>Listen</Text>
                    </Pressable>
                    <Text
                      style={[styles.focusScore, { color: scoreColor(w.score) }]}
                    >
                      {w.score}
                    </Text>
                  </View>
                  {tip ? (
                    <View style={styles.tipCard}>
                      <Text style={styles.tipHow}>{tip.tip}</Text>
                      <View style={styles.tipExampleRow}>
                        <Text style={styles.tipExampleLabel}>Examples:</Text>
                        <Pressable
                          onPress={() => speakWithKey(`ex-${i}`, tip.example)}
                          accessibilityRole="button"
                          accessibilityLabel={`Listen to example words: ${tip.example}`}
                          accessibilityHint="Plays example words with this sound"
                        >
                          <Text style={styles.tipExampleText}>
                            {tip.example}  {"\uD83D\uDD0A"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          <Text style={styles.focusTip}>
            Tap <Text style={styles.focusTipBold}>Listen</Text> to hear the
            word, then <Text style={styles.focusTipBold}>Try again</Text>.
          </Text>
        </View>
      )}

      {score.transcript ? (
        <View>
          <Text style={styles.sectionLabel}>WHAT WE HEARD</Text>
          <Text style={styles.transcript}>
            {"\u201C"}
            {score.transcript}
            {"\u201D"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 22 },

  warnBox: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.35)",
    borderRadius: 12,
    padding: 12,
  },
  warnText: { color: "#fcd34d", fontSize: 12, lineHeight: 17 },

  overall: { alignItems: "center" },
  overallValue: { fontSize: 80, fontWeight: "800", letterSpacing: -2, lineHeight: 86 },
  overallLabel: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: "#d4d4d8",
    marginTop: 2,
    fontWeight: "700",
  },
  overallSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },

  metrics: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metric: {
    flexBasis: "22%",
    flexGrow: 1,
    backgroundColor: "#14141c",
    borderWidth: 1,
    borderColor: "#26262f",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
  },
  metricValue: { fontSize: 22, fontWeight: "700" },
  metricLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: "#a1a1aa",
    marginTop: 4,
    fontWeight: "700",
  },
  metricHelp: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 14,
  },

  sentenceBox: {
    backgroundColor: "#14141c",
    borderWidth: 1,
    borderColor: "#26262f",
    borderRadius: 16,
    padding: 18,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#a1a1aa",
    fontWeight: "700",
  },
  sentenceHint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 16,
  },
  sentence: {
    fontSize: 22,
    lineHeight: 34,
    fontWeight: "600",
  },

  wordGood: { color: "#f5f5f7" },
  wordOk: {
    color: "#fcd34d",
    backgroundColor: "rgba(252,211,77,0.18)",
    borderRadius: 4,
    paddingHorizontal: 2,
    textDecorationLine: "underline",
    textDecorationStyle: "dashed",
    textDecorationColor: "#fcd34d",
  },
  wordPoor: {
    color: "#fca5a5",
    fontWeight: "800",
    textDecorationLine: "underline",
    textDecorationStyle: "solid",
    textDecorationColor: "#f43f5e",
    backgroundColor: "rgba(244,63,94,0.15)",
  },
  wordMissing: {
    color: "#d4d4d8",
    opacity: 0.55,
    textDecorationLine: "line-through",
  },

  focusBox: {
    backgroundColor: "rgba(124,92,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(124,92,255,0.35)",
    borderRadius: 16,
    padding: 16,
  },
  focusLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#c4b5fd",
    fontWeight: "700",
  },
  focusItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(124,92,255,0.15)",
  },
  focusItemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  focusWord: { color: "#f5f5f7", fontSize: 17, fontWeight: "700" },
  focusPhoneme: { fontSize: 11, color: "#a1a1aa", marginTop: 2 },
  focusSoundedLike: {
    fontSize: 11,
    color: "#fca5a5",
    marginTop: 2,
    fontStyle: "italic",
  },
  focusScore: { fontSize: 20, fontWeight: "800", minWidth: 32, textAlign: "right" },
  listenPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(124,92,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(124,92,255,0.4)",
    minHeight: 32,
  },
  listenPillBusy: { opacity: 0.7 },
  listenPillText: { color: "#c4b5fd", fontSize: 11, fontWeight: "700" },
  tipCard: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(124,92,255,0.6)",
  },
  tipHow: { color: "#e5e5ea", fontSize: 13, lineHeight: 19 },
  tipExampleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },
  tipExampleLabel: {
    fontSize: 12,
    color: "#9ca3af",
    letterSpacing: 0.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tipExampleText: {
    fontSize: 13,
    color: "#c4b5fd",
    fontWeight: "600",
  },
  focusTip: {
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: 14,
    lineHeight: 17,
  },
  focusTipBold: { color: "#e5e5ea", fontWeight: "700" },

  transcript: { color: "#d4d4d8", fontSize: 14, fontStyle: "italic", marginTop: 6 },
});
