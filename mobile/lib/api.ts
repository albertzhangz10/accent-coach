import Constants from "expo-constants";

/**
 * Top-N closest-sounding phonemes Azure reports for a single spoken phoneme.
 * Great for actionable feedback: "your /θ/ sounded like /s/".
 */
export type PhonemeAlternative = {
  phoneme: string;
  score: number;
};

/**
 * Per-phoneme detail from the Azure pronunciation assessment. `phoneme` is the
 * raw symbol as returned (IPA when PhonemeAlphabet=IPA is set on the backend);
 * `arpabet` is the lowercased ARPAbet equivalent the server maps for lookup
 * against the mobile phonemeTips dictionary.
 */
export type PhonemeScore = {
  phoneme: string;
  arpabet?: string;
  score: number;
  alternatives?: PhonemeAlternative[];
};

export type WordScore = {
  word: string;
  score: number;
  status: "good" | "ok" | "poor" | "missing";
  errorType?: string;
  worstPhoneme?: { phoneme: string; score: number; arpabet?: string } | null;
  phonemes?: PhonemeScore[];
};

export type AttemptScore = {
  overall: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  /** Prosody / intonation score from Azure (0-100). Optional. */
  prosody?: number;
  words: WordScore[];
  transcript: string;
  mode: "azure" | "fallback";
  warning?: string;
};

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

export async function scoreAudio(uri: string, reference: string): Promise<AttemptScore> {
  const formData = new FormData();
  formData.append("audio", {
    uri,
    name: "recording.wav",
    type: "audio/wav",
  } as any);
  formData.append("reference", reference);

  const res = await fetch(`${backendUrl()}/api/score-audio`, {
    method: "POST",
    body: formData,
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Scoring failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}
