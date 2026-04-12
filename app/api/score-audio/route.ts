import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type WordStatus = "good" | "ok" | "poor" | "missing";

type PhonemeAlternative = { phoneme: string; score: number };

type PhonemeScore = {
  phoneme: string; // IPA if available, else raw Azure value
  arpabet?: string; // ARPAbet equivalent for phonemeTips lookup
  score: number;
  alternatives?: PhonemeAlternative[];
};

type WordScore = {
  word: string;
  score: number;
  status: WordStatus;
  errorType?: string;
  worstPhoneme?: { phoneme: string; score: number; arpabet?: string } | null;
  phonemes?: PhonemeScore[];
};

/**
 * Walk RIFF chunks to find the `fmt ` subchunk. iOS-written WAVs sometimes
 * insert a JUNK or FLLR chunk before `fmt `, so the canonical offset 12 is not
 * reliable. Returns the parsed format fields or null on an invalid file.
 */
function parseWavHeader(bytes: Uint8Array) {
  if (bytes.length < 12) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const riff = String.fromCharCode(...Array.from(bytes.slice(0, 4)));
  const wave = String.fromCharCode(...Array.from(bytes.slice(8, 12)));
  if (riff !== "RIFF" || wave !== "WAVE") {
    return { riff, wave, valid: false as const };
  }

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(...Array.from(bytes.slice(offset, offset + 4)));
    const size = dv.getUint32(offset + 4, true);
    const dataStart = offset + 8;
    if (id === "fmt ") {
      if (dataStart + 16 > bytes.length) break;
      const audioFormat = dv.getUint16(dataStart + 0, true);
      const channels = dv.getUint16(dataStart + 2, true);
      const sampleRate = dv.getUint32(dataStart + 4, true);
      const bitsPerSample = dv.getUint16(dataStart + 14, true);
      return {
        riff,
        wave,
        valid: true as const,
        audioFormat,
        channels,
        sampleRate,
        bitsPerSample,
      };
    }
    // Chunks are word-aligned; advance by size + pad byte if odd.
    offset = dataStart + size + (size % 2);
  }
  return { riff, wave, valid: false as const };
}

function normalizeWords(s: string): string[] {
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

function wordSim(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - editDistance(a, b) / maxLen;
}

function fallbackScore(reference: string, transcript: string) {
  const refWords = normalizeWords(reference);
  const hypWords = normalizeWords(transcript);
  const words: WordScore[] = refWords.map((ref) => {
    let best = 0;
    hypWords.forEach((h) => {
      const s = wordSim(ref, h);
      if (s > best) best = s;
    });
    const score = Math.round(best * 100);
    let status: WordStatus = "missing";
    if (score >= 85) status = "good";
    else if (score >= 60) status = "ok";
    else if (score >= 30) status = "poor";
    return { word: ref, score, status, errorType: "Fallback", worstPhoneme: null };
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
  };
}

/**
 * IPA → ARPAbet lookup so the mobile `phonemeTips.ts` dictionary (which is
 * ARPAbet-keyed) continues to match the IPA symbols Azure returns when
 * `PhonemeAlphabet=IPA` is set. The raw IPA string is still passed through for
 * display.
 */
const IPA_TO_ARPABET: Record<string, string> = {
  // Consonants
  p: "p",
  b: "b",
  t: "t",
  d: "d",
  k: "k",
  ɡ: "g",
  g: "g",
  tʃ: "ch",
  dʒ: "jh",
  f: "f",
  v: "v",
  θ: "th",
  ð: "dh",
  s: "s",
  z: "z",
  ʃ: "sh",
  ʒ: "zh",
  h: "hh",
  m: "m",
  n: "n",
  ŋ: "ng",
  l: "l",
  ɹ: "r",
  r: "r",
  j: "y",
  w: "w",
  // Vowels / diphthongs
  i: "iy",
  "iː": "iy",
  ɪ: "ih",
  e: "eh",
  ɛ: "eh",
  æ: "ae",
  ɑ: "aa",
  "ɑː": "aa",
  ɒ: "aa",
  ʌ: "ah",
  ɔ: "ao",
  "ɔː": "ao",
  ʊ: "uh",
  u: "uw",
  "uː": "uw",
  ə: "ax",
  ɚ: "er",
  ɝ: "er",
  "ɜː": "er",
  eɪ: "ey",
  aɪ: "ay",
  ɔɪ: "oy",
  oʊ: "ow",
  əʊ: "ow",
  aʊ: "aw",
};

function ipaToArpabet(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  // Strip stress marks, length marks we already handle, and spaces.
  const cleaned = raw.replace(/[ˈˌ]/g, "").trim();
  if (!cleaned) return undefined;
  if (IPA_TO_ARPABET[cleaned]) return IPA_TO_ARPABET[cleaned];
  // Sometimes Azure emits a length mark separately; try without it.
  const noLen = cleaned.replace(/ː/g, "");
  if (IPA_TO_ARPABET[noLen]) return IPA_TO_ARPABET[noLen];
  // Fall back to lowercasing; if it already looks like ARPAbet (all ASCII), return it.
  if (/^[a-z]+$/.test(cleaned)) return cleaned;
  return undefined;
}

/**
 * Simple retry-with-backoff around fetch for transient Azure hiccups.
 * Retries 5xx responses and network errors. Returns the final Response so the
 * caller can handle non-retryable failures (4xx) themselves.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 2,
  delaysMs = [300, 900]
): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || res.status < 500) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries) {
      const wait = delaysMs[attempt] ?? 900;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetch failed");
}

export async function POST(req: Request) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    return NextResponse.json(
      { error: "Azure not configured. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION." },
      { status: 500 }
    );
  }

  let audioBytes: Uint8Array;
  let reference: string;
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const ref = form.get("reference");
    if (!audio || typeof ref !== "string") {
      return NextResponse.json({ error: "Missing audio or reference" }, { status: 400 });
    }
    audioBytes = new Uint8Array(await (audio as File).arrayBuffer());
    reference = ref;
  } catch (e: any) {
    return NextResponse.json({ error: `Bad form: ${e?.message}` }, { status: 400 });
  }

  const header = parseWavHeader(audioBytes);
  console.log(
    `[score-audio] ${audioBytes.length} bytes | header:`,
    header,
    `| ref: "${reference}"`
  );

  const paConfig = {
    ReferenceText: reference,
    GradingSystem: "HundredMark",
    Granularity: "Phoneme",
    Dimension: "Comprehensive",
    EnableMiscue: "True",
    // IPA phonemes are much more recognizable to end users than SAPI codes.
    PhonemeAlphabet: "IPA",
    // Top-5 closest-sounding phonemes — used for actionable "sounded like /s/" hints.
    NBestPhonemeCount: 5,
    // Prosody / intonation scoring on the NBest result.
    EnableProsodyAssessment: "True",
  };
  const paHeader = Buffer.from(JSON.stringify(paConfig)).toString("base64");

  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;

  let azureRes: Response;
  try {
    azureRes = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "audio/wav",
        "Pronunciation-Assessment": paHeader,
        Accept: "application/json",
      },
      body: audioBytes,
    });
  } catch (e: any) {
    console.error(`[score-audio] network error:`, e?.message);
    return NextResponse.json(
      { error: `Azure network error: ${e?.message ?? "unknown"}` },
      { status: 502 }
    );
  }

  if (!azureRes.ok) {
    const text = await azureRes.text().catch(() => "");
    console.error(`[score-audio] Azure ${azureRes.status}: ${text}`);
    return NextResponse.json(
      { error: `Azure ${azureRes.status}: ${text.slice(0, 300)}` },
      { status: 502 }
    );
  }

  const data = await azureRes.json();
  console.log(`[score-audio] Azure response:`, JSON.stringify(data).slice(0, 2000));

  if (data.RecognitionStatus && data.RecognitionStatus !== "Success") {
    return NextResponse.json(
      { error: `Recognition failed: ${data.RecognitionStatus}` },
      { status: 422 }
    );
  }

  const best = data?.NBest?.[0];
  if (!best) {
    return NextResponse.json({ error: "No recognition result" }, { status: 422 });
  }

  const paNested = best.PronunciationAssessment ?? {};
  const pronScore = best.PronScore ?? paNested.PronScore;
  const accuracyScore = best.AccuracyScore ?? paNested.AccuracyScore;
  const fluencyScore = best.FluencyScore ?? paNested.FluencyScore;
  const completenessScore = best.CompletenessScore ?? paNested.CompletenessScore;
  const prosodyScore = best.ProsodyScore ?? paNested.ProsodyScore;

  const hasRealScores =
    typeof pronScore === "number" &&
    typeof accuracyScore === "number" &&
    pronScore + accuracyScore > 0;

  const transcript = best.Display ?? data.DisplayText ?? "";

  if (!hasRealScores) {
    console.warn(`[score-audio] Azure returned no pronunciation scores. Using fallback.`);
    const fb = fallbackScore(reference, transcript);
    return NextResponse.json({
      ...fb,
      transcript,
      mode: "fallback",
      warning:
        "Azure did not return pronunciation scores for this recording. Showing a word-match estimate instead.",
    });
  }

  const words: WordScore[] = (best.Words ?? []).map((w: any) => {
    const acc = w?.AccuracyScore ?? w?.PronunciationAssessment?.AccuracyScore ?? 0;
    const err = w?.ErrorType ?? w?.PronunciationAssessment?.ErrorType ?? "None";
    let status: WordStatus = "good";
    if (err === "Omission") status = "missing";
    else if (acc < 60) status = "poor";
    else if (acc < 85) status = "ok";

    const rawPhonemes = (w?.Phonemes ?? []) as any[];
    const phonemes: PhonemeScore[] = rawPhonemes.map((p) => {
      const s = p?.AccuracyScore ?? p?.PronunciationAssessment?.AccuracyScore ?? 100;
      const rawSym: string = p?.Phoneme ?? "";
      const arpabet = ipaToArpabet(rawSym);
      const nbestRaw = (p?.NBestPhonemes ?? p?.PronunciationAssessment?.NBestPhonemes ?? []) as any[];
      const alternatives: PhonemeAlternative[] = nbestRaw
        .map((alt) => ({
          phoneme: alt?.Phoneme ?? "",
          score: Math.round(alt?.Score ?? alt?.AccuracyScore ?? 0),
        }))
        .filter((alt) => alt.phoneme);
      return {
        phoneme: rawSym,
        arpabet,
        score: Math.round(s),
        alternatives: alternatives.length ? alternatives : undefined,
      };
    });

    let worstPhoneme: WordScore["worstPhoneme"] = null;
    for (const p of phonemes) {
      if (!worstPhoneme || p.score < worstPhoneme.score) {
        worstPhoneme = {
          phoneme: p.phoneme,
          score: p.score,
          arpabet: p.arpabet,
        };
      }
    }

    return {
      word: w?.Word ?? "",
      score: Math.round(acc),
      status,
      errorType: err,
      worstPhoneme,
      phonemes: phonemes.length ? phonemes : undefined,
    };
  });

  return NextResponse.json({
    overall: Math.round(pronScore),
    accuracy: Math.round(accuracyScore),
    fluency: Math.round(fluencyScore ?? 0),
    completeness: Math.round(completenessScore ?? 0),
    prosody: typeof prosodyScore === "number" ? Math.round(prosodyScore) : undefined,
    words,
    transcript,
    mode: "azure",
  });
}
