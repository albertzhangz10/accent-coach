import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "accent-coach-progress-v1";

export type Progress = {
  streak: number;
  lastPracticeDate: string | null;
  lessonScores: Record<string, number[]>;
  totalPhrasesSpoken: number;
};

const empty: Progress = {
  streak: 0,
  lastPracticeDate: null,
  lessonScores: {},
  totalPhrasesSpoken: 0,
};

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

export async function saveProgress(p: Progress): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function recordAttempt(lessonId: string, score: number): Promise<Progress> {
  const p = await loadProgress();
  const t = today();
  if (p.lastPracticeDate !== t) {
    p.streak = p.lastPracticeDate === yesterday() ? p.streak + 1 : 1;
    p.lastPracticeDate = t;
  }
  if (!p.lessonScores[lessonId]) p.lessonScores[lessonId] = [];
  p.lessonScores[lessonId].push(Math.round(score));
  p.totalPhrasesSpoken += 1;
  await saveProgress(p);
  return p;
}

export function lessonBest(p: Progress, lessonId: string): number | null {
  const arr = p.lessonScores[lessonId];
  if (!arr || arr.length === 0) return null;
  return Math.max(...arr);
}
