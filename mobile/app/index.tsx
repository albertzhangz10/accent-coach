import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { router, Stack, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LESSONS } from "@/lib/lessons";
import {
  loadProgress,
  lessonBest,
  isLessonCompleted,
  type Progress,
} from "@/lib/progress";
import { isOnboarded } from "@/lib/settings";

const LEVEL_COLORS: Record<string, string> = {
  Beginner: "#6ee7b7",
  Intermediate: "#fcd34d",
  Advanced: "#fca5a5",
};

const LEVEL_ORDER = ["Beginner", "Intermediate", "Advanced"] as const;
type Level = (typeof LEVEL_ORDER)[number];

export default function Home() {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    isOnboarded().then((done) => {
      if (!done) router.replace("/onboarding");
    });
  }, []);

  // Reload progress every time the screen regains focus so completion badges
  // update immediately after finishing a lesson.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadProgress().then((p) => {
        if (!cancelled) setProgress(p);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const grouped = useMemo(() => {
    const out: Record<Level, typeof LESSONS> = {
      Beginner: [],
      Intermediate: [],
      Advanced: [],
    };
    for (const l of LESSONS) {
      const lvl = (LEVEL_ORDER as readonly string[]).includes(l.level)
        ? (l.level as Level)
        : "Beginner";
      out[lvl].push(l);
    }
    return out;
  }, []);

  const isNewUser = !!progress && progress.totalPhrasesSpoken === 0;
  const firstBeginnerId = grouped.Beginner[0]?.id ?? null;

  function openLesson(id: string, title: string) {
    Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: `/lesson/${id}`, params: { title } });
  }

  function openSettings() {
    Haptics.selectionAsync().catch(() => {});
    router.push("/settings");
  }

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "Accent Coach",
          headerRight: () => (
            <Pressable
              onPress={openSettings}
              hitSlop={8}
              style={({ pressed }) => [
                styles.gearBtn,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              accessibilityHint="Opens app settings including voice selection"
            >
              <Ionicons name="settings-outline" size={22} color="#e5e5ea" />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Sound more natural in English.</Text>
        <Text style={styles.subtitle}>
          Pick a lesson, listen to the reference, and record yourself. Get
          instant word-by-word feedback on your pronunciation.
        </Text>

        {progress && isNewUser ? (
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Start with your first phrase</Text>
            <Text style={styles.heroBody}>
              Tap any lesson below to hear a native voice, record yourself, and
              get instant feedback.
            </Text>
          </View>
        ) : null}

        {progress && !isNewUser && (
          <View style={styles.stats}>
            <Stat
              label="DAY STREAK"
              value={progress.streak}
              highlight={progress.streak >= 3}
            />
            <Stat label="PHRASES" value={progress.totalPhrasesSpoken} />
            <Stat
              label="LESSONS"
              value={Object.keys(progress.lessonScores).length}
            />
          </View>
        )}

        {LEVEL_ORDER.map((level) => {
          const lessons = grouped[level];
          if (lessons.length === 0) return null;
          const doneCount = progress
            ? lessons.filter((l) => isLessonCompleted(progress, l.id)).length
            : 0;
          return (
            <View key={level} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.levelDot,
                    { backgroundColor: LEVEL_COLORS[level] },
                  ]}
                />
                <Text style={styles.sectionLabel}>
                  {level.toUpperCase()}
                </Text>
                <Text style={styles.sectionCount}>
                  {progress
                    ? `${doneCount} / ${lessons.length} done`
                    : `${lessons.length} lessons`}
                </Text>
              </View>
              <View style={styles.lessons}>
                {lessons.map((lesson) => {
                  const best = progress ? lessonBest(progress, lesson.id) : null;
                  const completed = progress
                    ? isLessonCompleted(progress, lesson.id)
                    : false;
                  const highlightFirst =
                    isNewUser && lesson.id === firstBeginnerId;
                  const accessibilityLabel = [
                    lesson.title,
                    lesson.level,
                    `${lesson.phrases.length} phrases`,
                    lesson.accent,
                    completed ? "completed" : null,
                    best !== null ? `best score ${best}` : null,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <Pressable
                      key={lesson.id}
                      style={({ pressed }) => [
                        styles.card,
                        highlightFirst && styles.cardHighlight,
                        completed && styles.cardCompleted,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => openLesson(lesson.id, lesson.title)}
                      accessibilityRole="button"
                      accessibilityLabel={accessibilityLabel}
                      accessibilityHint="Opens this lesson to practice its phrases"
                    >
                      <View style={styles.cardHeader}>
                        <View
                          style={[
                            styles.levelPill,
                            { borderColor: LEVEL_COLORS[lesson.level] + "66" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.levelText,
                              { color: LEVEL_COLORS[lesson.level] },
                            ]}
                          >
                            {lesson.level.toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.badgeRow}>
                          {completed ? (
                            <View style={styles.doneBadge}>
                              <Ionicons
                                name="checkmark"
                                size={12}
                                color="#6ee7b7"
                              />
                              <Text style={styles.doneBadgeText}>Done</Text>
                            </View>
                          ) : null}
                          {best !== null ? (
                            <View style={styles.bestBadge}>
                              <Text style={styles.bestBadgeText}>★ {best}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <Text style={styles.cardTitle}>{lesson.title}</Text>
                      <Text style={styles.cardFocus}>{lesson.focus}</Text>
                      <Text style={styles.cardMeta}>
                        {lesson.phrases.length} phrases · {lesson.accent}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0f" },
  scroll: { flex: 1, backgroundColor: "#0a0a0f" },
  content: { padding: 20, gap: 22, paddingBottom: 60 },
  gearBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#f5f5f7",
    marginTop: 8,
    lineHeight: 36,
  },
  subtitle: { fontSize: 14, color: "#9ca3af", lineHeight: 20 },
  heroCard: {
    backgroundColor: "rgba(124,92,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(124,92,255,0.4)",
    borderRadius: 20,
    padding: 18,
  },
  heroTitle: {
    color: "#f5f5f7",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroBody: { color: "#c4b5fd", fontSize: 13, lineHeight: 19 },
  stats: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: "#14141c",
    borderWidth: 1,
    borderColor: "#26262f",
    borderRadius: 16,
    padding: 14,
  },
  statHighlight: {
    borderColor: "rgba(252,211,77,0.7)",
    backgroundColor: "rgba(252,211,77,0.08)",
  },
  statValue: { color: "#f5f5f7", fontSize: 26, fontWeight: "800" },
  statLabel: {
    color: "#9ca3af",
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 2,
    fontWeight: "600",
  },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
    paddingBottom: 2,
  },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: {
    color: "#e5e5ea",
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "800",
  },
  sectionCount: {
    marginLeft: "auto",
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "600",
  },
  lessons: { gap: 12 },
  card: {
    backgroundColor: "#14141c",
    borderWidth: 1,
    borderColor: "#26262f",
    borderRadius: 20,
    padding: 18,
  },
  cardHighlight: {
    borderColor: "#7c5cff",
    borderWidth: 2,
    backgroundColor: "rgba(124,92,255,0.06)",
  },
  cardCompleted: {
    borderColor: "rgba(110,231,183,0.5)",
    backgroundColor: "rgba(110,231,183,0.05)",
  },
  cardPressed: { borderColor: "#7c5cff", transform: [{ scale: 0.99 }] },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(110,231,183,0.5)",
    backgroundColor: "rgba(110,231,183,0.14)",
  },
  doneBadgeText: { color: "#6ee7b7", fontSize: 11, fontWeight: "800" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  levelPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  levelText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  bestBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(110,231,183,0.4)",
    backgroundColor: "rgba(110,231,183,0.1)",
  },
  bestBadgeText: { color: "#6ee7b7", fontSize: 11, fontWeight: "800" },
  cardTitle: {
    color: "#f5f5f7",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardFocus: { color: "#9ca3af", fontSize: 14 },
  cardMeta: { color: "#9ca3af", fontSize: 12, marginTop: 10 },
});
