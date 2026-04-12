export type WordScore = {
  word: string;
  score: number;
  status: "good" | "ok" | "poor" | "missing";
};

export type AttemptScore = {
  overall: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  words: WordScore[];
  transcript: string;
  mode: "azure" | "fallback";
};

function normalize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - editDistance(a, b) / maxLen;
}

export function scoreAgainstReference(
  reference: string,
  transcript: string
): AttemptScore {
  const refWords = normalize(reference);
  const hypWords = normalize(transcript);

  const words: WordScore[] = refWords.map((ref) => {
    let best = 0;
    let bestIdx = -1;
    hypWords.forEach((h, i) => {
      const s = wordSimilarity(ref, h);
      if (s > best) {
        best = s;
        bestIdx = i;
      }
    });
    const score = Math.round(best * 100);
    let status: WordScore["status"] = "missing";
    if (score >= 85) status = "good";
    else if (score >= 60) status = "ok";
    else if (score >= 30) status = "poor";
    return { word: ref, score, status };
  });

  const accuracy =
    words.reduce((sum, w) => sum + w.score, 0) / Math.max(words.length, 1);
  const matched = words.filter((w) => w.score >= 60).length;
  const completeness = (matched / Math.max(words.length, 1)) * 100;
  const lengthRatio =
    Math.min(hypWords.length, refWords.length) /
    Math.max(hypWords.length, refWords.length, 1);
  const fluency = lengthRatio * 100;
  const overall = accuracy * 0.6 + completeness * 0.25 + fluency * 0.15;

  return {
    overall: Math.round(overall),
    accuracy: Math.round(accuracy),
    fluency: Math.round(fluency),
    completeness: Math.round(completeness),
    words,
    transcript,
    mode: "fallback",
  };
}
