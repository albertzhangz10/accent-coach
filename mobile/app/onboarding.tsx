import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { markOnboarded } from "@/lib/settings";

type Slide = {
  emoji: string;
  title: string;
  body: string;
  accent: string;
};

const SLIDES: Slide[] = [
  {
    emoji: "\uD83D\uDD0A",
    title: "Listen to native speech",
    body: "Tap the reference phrase to hear it spoken by a neural voice. Train your ear before you train your mouth.",
    accent: "#7c5cff",
  },
  {
    emoji: "\uD83C\uDF99\uFE0F",
    title: "Record yourself",
    body: "Hit Record and say the phrase out loud. We capture crisp audio right from your device.",
    accent: "#ff4d6d",
  },
  {
    emoji: "\u2728",
    title: "Word-by-word feedback",
    body: "Azure pronunciation scoring highlights exactly which words need work and why. Try again until it clicks.",
    accent: "#6ee7b7",
  },
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    if (i !== index) setIndex(i);
  }

  async function finish() {
    Haptics.selectionAsync().catch(() => {});
    await markOnboarded();
    router.replace("/");
  }

  function nextOrFinish() {
    Haptics.selectionAsync().catch(() => {});
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    } else {
      finish();
    }
  }

  const isLast = index >= SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable
        style={[styles.skip, { top: insets.top + 8 }]}
        onPress={finish}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
        accessibilityHint="Skips the intro and goes to the home screen"
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.scroller}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View
              style={[
                styles.emojiWrap,
                { borderColor: slide.accent + "66", backgroundColor: slide.accent + "1a" },
              ]}
            >
              <Text style={styles.emoji}>{slide.emoji}</Text>
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 16, 32) },
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
        <Pressable
          style={styles.cta}
          onPress={nextOrFinish}
          accessibilityRole="button"
          accessibilityLabel={isLast ? "Let's go" : "Next"}
          accessibilityHint={
            isLast ? "Finishes onboarding and opens the home screen" : "Advances to the next slide"
          }
        >
          <Text style={styles.ctaText}>{isLast ? "Let's go" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0f" },
  skip: {
    position: "absolute",
    right: 20,
    zIndex: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: { color: "#9ca3af", fontSize: 14, fontWeight: "600" },
  scroller: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 24,
  },
  emojiWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emoji: { fontSize: 68 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f5f5f7",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 15,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 20,
    alignItems: "center",
  },
  dots: { flexDirection: "row", gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#26262f",
  },
  dotActive: { backgroundColor: "#7c5cff", width: 22 },
  cta: {
    backgroundColor: "#7c5cff",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 999,
    minWidth: 200,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
