import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { getLesson } from "@/lib/lessons";
import { Recorder } from "@/components/Recorder";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { recordAttempt, markLessonCompleted } from "@/lib/progress";
import type { AttemptScore } from "@/lib/api";

export default function LessonScreen() {
  const params = useLocalSearchParams<{ id: string; title?: string }>();
  const id = params.id;
  const titleParam = params.title;
  const lesson = getLesson(id ?? "");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [score, setScore] = useState<AttemptScore | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const prevScoreRef = useRef<AttemptScore | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (score && !prevScoreRef.current) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
    prevScoreRef.current = score;
  }, [score]);

  if (!lesson) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: titleParam ?? "" }} />
        <Text style={styles.errorTitle}>Lesson not found</Text>
        <Text style={styles.errorBody}>
          We couldn’t find that lesson. It may have been removed.
        </Text>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            if (router.canGoBack()) router.back();
            else router.replace("/");
          }}
          accessibilityRole="button"
          accessibilityLabel="Back to lessons"
          accessibilityHint="Returns to the lessons list"
        >
          <Text style={styles.backBtnText}>← Back to lessons</Text>
        </Pressable>
      </View>
    );
  }

  const phrase = lesson.phrases[phraseIdx];
  const isLast = phraseIdx === lesson.phrases.length - 1;
  const headerTitle = titleParam || lesson.title;

  async function handleScored(s: AttemptScore) {
    // Persist before revealing the result so the ScoreDisplay haptic fires
    // only after progress is saved (M16).
    try {
      await recordAttempt(lesson!.id, s.overall);
    } catch {
      // Non-fatal; still show the score.
    }
    setScore(s);
  }

  function next() {
    Haptics.selectionAsync().catch(() => {});
    setScore(null);
    setPhraseIdx((i) => Math.min(i + 1, lesson!.phrases.length - 1));
  }

  function tryAgain() {
    Haptics.selectionAsync().catch(() => {});
    setScore(null);
  }

  async function finish() {
    Haptics.selectionAsync().catch(() => {});
    try {
      await markLessonCompleted(lesson!.id);
    } catch {
      // Non-fatal — still navigate back.
    }
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.focus}>{lesson.focus}</Text>
        <View style={styles.progress}>
          {lesson.phrases.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressBar,
                i < phraseIdx && styles.progressDone,
                i === phraseIdx && styles.progressActive,
              ]}
            />
          ))}
        </View>
        <View style={styles.card}>
          <Text style={styles.phraseLabel}>
            PHRASE {phraseIdx + 1} OF {lesson.phrases.length}
          </Text>
          <Text style={styles.phraseText}>{phrase.text}</Text>
          <View style={styles.tipBox}>
            <Text style={styles.tip}>{"\uD83D\uDCA1  "}{phrase.tip}</Text>
          </View>
        </View>
        {score ? (
          <ScoreDisplay score={score} reference={phrase.text} />
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 12 },
        ]}
      >
        {!score ? (
          <Recorder reference={phrase.text} onScored={handleScored} />
        ) : (
          <View style={styles.actions}>
            {!isLast ? (
              <Pressable
                style={styles.nextBtn}
                onPress={next}
                accessibilityRole="button"
                accessibilityLabel="Next phrase"
                accessibilityHint="Moves to the next phrase in this lesson"
              >
                <Text style={styles.nextText}>Next phrase →</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.nextBtn}
                onPress={finish}
                accessibilityRole="button"
                accessibilityLabel="Finish lesson"
                accessibilityHint="Ends this lesson and returns to the lessons list"
              >
                <Text style={styles.nextText}>Finish ✓</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.tryAgainLink}
              onPress={tryAgain}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              accessibilityHint="Clears this attempt and lets you record the same phrase again"
            >
              <Text style={styles.tryAgainText}>↺ Try again</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0f" },
  scroll: { flex: 1, backgroundColor: "#0a0a0f" },
  content: { padding: 20, gap: 20, paddingBottom: 24 },
  actionBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: "#0a0a0f",
    borderTopWidth: 1,
    borderTopColor: "#26262f",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0f",
    padding: 24,
    gap: 12,
  },
  errorTitle: { color: "#f5f5f7", fontSize: 20, fontWeight: "700" },
  errorBody: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  backBtn: {
    marginTop: 8,
    backgroundColor: "#7c5cff",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  focus: { color: "#9ca3af", fontSize: 14, marginTop: -4 },
  progress: { flexDirection: "row", gap: 6, alignItems: "center" },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#26262f",
  },
  progressDone: { backgroundColor: "#7c5cff" },
  progressActive: { backgroundColor: "#a78bfa", height: 6, borderRadius: 3 },
  card: {
    backgroundColor: "#14141c",
    borderWidth: 1,
    borderColor: "#26262f",
    borderRadius: 20,
    padding: 24,
  },
  phraseLabel: {
    color: "#9ca3af",
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: "600",
  },
  phraseText: {
    color: "#f5f5f7",
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 30,
    marginBottom: 18,
  },
  tipBox: {
    borderLeftWidth: 2,
    borderLeftColor: "rgba(124,92,255,0.6)",
    paddingLeft: 12,
  },
  tip: { color: "#a1a1aa", fontSize: 13, lineHeight: 18 },
  actions: { gap: 12, alignItems: "center" },
  nextBtn: {
    width: "100%",
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#7c5cff",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  nextText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  tryAgainLink: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tryAgainText: { color: "#a1a1aa", fontSize: 13, fontWeight: "600" },
});
