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

type SyllableScore = {
  syllable: string; // phonetic
  grapheme: string; // orthographic (e.g., "ba" in "banana")
  score: number;
};

type ProsodyFeedback = {
  breakErrorTypes?: string[];
  breakLengthMs?: number;
  intonationErrorTypes?: string[];
  monotone?: boolean;
};

type WordScore = {
  word: string;
  score: number;
  status: WordStatus;
  errorType?: string;
  worstPhoneme?: { phoneme: string; score: number; arpabet?: string } | null;
  worstSyllable?: { grapheme: string; score: number } | null;
  phonemes?: PhonemeScore[];
  syllables?: SyllableScore[];
  prosodyFeedback?: ProsodyFeedback;
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

/**
 * Find the `data` chunk inside a RIFF WAV. Returns offset of the PCM bytes and
 * the declared chunk size, or null if the chunk isn't found.
 */
function findDataChunk(
  bytes: Uint8Array
): { dataOffset: number; dataSize: number } | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(...Array.from(bytes.slice(offset, offset + 4)));
    const size = dv.getUint32(offset + 4, true);
    if (id === "data") return { dataOffset: offset + 8, dataSize: size };
    offset = offset + 8 + size + (size % 2);
  }
  return null;
}

/**
 * Trim leading and trailing silence from a 16-bit PCM WAV. Cuts away dead air
 * from before the user actually started speaking (often 200-400ms on iOS due
 * to audio session transition lag) and any trailing silence before Stop. This
 * improves Azure's fluency scoring because it no longer has to explain the
 * gaps, and speeds up recognition because there's less audio to process.
 *
 * Anything above ~1% of full scale counts as audio. Keeps a 60ms guard band on
 * each side so we never clip real speech onsets.
 *
 * Returns the original bytes unchanged if the file isn't 16-bit PCM, doesn't
 * have a data chunk, or is entirely silent (the silent-audio detector later
 * will catch that case explicitly).
 */
function trimSilence(bytes: Uint8Array): Uint8Array {
  const header = parseWavHeader(bytes);
  if (!header || !header.valid) return bytes;
  if (header.audioFormat !== 1) return bytes; // only raw PCM
  if (header.bitsPerSample !== 16) return bytes;

  const chunk = findDataChunk(bytes);
  if (!chunk) return bytes;
  const { dataOffset, dataSize } = chunk;
  if (dataOffset + dataSize > bytes.length) return bytes;

  const channels = header.channels || 1;
  const bytesPerFrame = 2 * channels;
  const totalFrames = Math.floor(dataSize / bytesPerFrame);
  if (totalFrames < header.sampleRate * 0.1) return bytes; // <100ms; skip

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const threshold = Math.floor(0x7fff * 0.012); // ~1.2% of full scale

  // Find first and last frame with any channel above threshold.
  let firstFrame = -1;
  for (let i = 0; i < totalFrames; i++) {
    const base = dataOffset + i * bytesPerFrame;
    let peak = 0;
    for (let c = 0; c < channels; c++) {
      const s = Math.abs(dv.getInt16(base + c * 2, true));
      if (s > peak) peak = s;
    }
    if (peak > threshold) {
      firstFrame = i;
      break;
    }
  }
  if (firstFrame < 0) return bytes; // entirely silent

  let lastFrame = totalFrames - 1;
  for (let i = totalFrames - 1; i >= 0; i--) {
    const base = dataOffset + i * bytesPerFrame;
    let peak = 0;
    for (let c = 0; c < channels; c++) {
      const s = Math.abs(dv.getInt16(base + c * 2, true));
      if (s > peak) peak = s;
    }
    if (peak > threshold) {
      lastFrame = i;
      break;
    }
  }

  const guardFrames = Math.floor(header.sampleRate * 0.06); // 60ms
  firstFrame = Math.max(0, firstFrame - guardFrames);
  lastFrame = Math.min(totalFrames - 1, lastFrame + guardFrames);

  const keptFrames = lastFrame - firstFrame + 1;
  // Only rewrite if we're actually saving meaningful bytes (>= 80ms trimmed).
  const savedFrames = totalFrames - keptFrames;
  if (savedFrames < header.sampleRate * 0.08) return bytes;

  const newDataSize = keptFrames * bytesPerFrame;
  const out = new Uint8Array(dataOffset + newDataSize);
  out.set(bytes.slice(0, dataOffset), 0);
  const outDv = new DataView(out.buffer);
  // Update `data` chunk size (the 4 bytes immediately before dataOffset).
  outDv.setUint32(dataOffset - 4, newDataSize, true);
  // Update RIFF total size at offset 4 (file size - 8).
  outDv.setUint32(4, out.length - 8, true);
  // Copy the kept PCM window.
  out.set(
    bytes.slice(
      dataOffset + firstFrame * bytesPerFrame,
      dataOffset + (lastFrame + 1) * bytesPerFrame
    ),
    dataOffset
  );

  return out;
}

/**
 * Detect the actual audio container format from the first bytes of the file.
 * Returns a format tag and the Content-Type header Azure expects.
 */
function detectAudioFormat(bytes: Uint8Array): {
  format: "wav" | "m4a" | "ogg" | "webm" | "unknown";
  contentType: string;
} {
  if (bytes.length < 12) return { format: "unknown", contentType: "application/octet-stream" };

  const magic4 = String.fromCharCode(...Array.from(bytes.slice(0, 4)));
  const wave = String.fromCharCode(...Array.from(bytes.slice(8, 12)));

  if (magic4 === "RIFF" && wave === "WAVE") {
    return { format: "wav", contentType: "audio/wav" };
  }
  // MP4/M4A: the `ftyp` box appears at bytes 4-7.
  const ftyp = String.fromCharCode(...Array.from(bytes.slice(4, 8)));
  if (ftyp === "ftyp") {
    return { format: "m4a", contentType: "audio/mp4" };
  }
  if (magic4 === "OggS") {
    return { format: "ogg", contentType: "audio/ogg" };
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { format: "webm", contentType: "audio/webm" };
  }
  return { format: "unknown", contentType: "application/octet-stream" };
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
 * Retry-with-backoff + per-attempt timeout around fetch. Azure occasionally
 * stalls for 10+ seconds when handed near-silent audio (it keeps trying to
 * recognize nothing); an 8-second timeout lets us fail fast and show a useful
 * error instead of a mystery hang. Retries 5xx responses, network errors, and
 * aborts.
 */
const AZURE_FETCH_TIMEOUT_MS = 8000;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 2,
  delaysMs = [300, 900],
  timeoutMs = AZURE_FETCH_TIMEOUT_MS
): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok || res.status < 500) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e: any) {
      clearTimeout(timer);
      if (e?.name === "AbortError") {
        lastErr = new Error(`Azure timeout after ${timeoutMs}ms`);
      } else {
        lastErr = e;
      }
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
    const form: any = await req.formData();
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

  // Detect the real container format from the file bytes. Android records to
  // MPEG-4/AAC (expo-audio's MediaRecorder cannot produce WAV), so we must
  // handle non-WAV audio gracefully: skip WAV-only processing (header parse,
  // silence trim) and tell Azure the correct Content-Type.
  const detected = detectAudioFormat(audioBytes);
  let bytesToSend: Uint8Array;
  let audioContentType: string;

  if (detected.format === "wav") {
    const header = parseWavHeader(audioBytes);
    // Strip leading/trailing silence — the single biggest accuracy-and-latency
    // win we can make on the server side.
    bytesToSend = trimSilence(audioBytes);
    audioContentType = "audio/wav";
    const trimmedMs =
      header && header.valid && header.sampleRate > 0
        ? Math.round(
            ((audioBytes.length - bytesToSend.length) /
              (header.sampleRate * (header.channels || 1) * 2)) *
              1000
          )
        : 0;
    console.log(
      `[score-audio] WAV ${audioBytes.length}b → ${bytesToSend.length}b (trimmed ${trimmedMs}ms) | header:`,
      header,
      `| ref: "${reference}"`
    );
  } else {
    // Non-WAV (M4A from Android, OGG, WebM, etc.) — Azure accepts these
    // formats natively so we forward them as-is. Silence trimming requires
    // raw PCM access and is skipped; Android's voice_recognition audio source
    // already applies echo cancellation and AGC which mitigates the issue.
    bytesToSend = audioBytes;
    audioContentType = detected.contentType;
    console.log(
      `[score-audio] ${detected.format} ${audioBytes.length}b (no trim) | ref: "${reference}"`
    );
  }

  const basePaConfig = {
    ReferenceText: reference,
    GradingSystem: "HundredMark",
    Granularity: "Phoneme",
    Dimension: "Comprehensive",
    EnableMiscue: "True",
    // IPA phonemes are much more recognizable to end users than SAPI codes.
    PhonemeAlphabet: "IPA",
    // Top-5 closest-sounding phonemes — used for actionable "sounded like /s/" hints.
    NBestPhonemeCount: 5,
  };

  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;

  // Azure hangs indefinitely when prosody assessment is enabled on silent or
  // near-silent audio. Try with prosody first; on timeout, retry without it so
  // we still get accuracy/fluency/completeness scores instead of a hard error.
  let azureRes: Response;
  let prosodyEnabled = true;
  try {
    const paConfigWithProsody = { ...basePaConfig, EnableProsodyAssessment: "True" };
    const paHeader = Buffer.from(JSON.stringify(paConfigWithProsody)).toString("base64");
    azureRes = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": audioContentType,
        "Pronunciation-Assessment": paHeader,
        Accept: "application/json",
      },
      body: bytesToSend,
    });
  } catch (firstErr: any) {
    // Prosody request timed out or failed — retry without prosody.
    console.warn(`[score-audio] prosody request failed (${firstErr?.message}), retrying without prosody`);
    prosodyEnabled = false;
    try {
      const paHeader = Buffer.from(JSON.stringify(basePaConfig)).toString("base64");
      azureRes = await fetchWithRetry(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": audioContentType,
          "Pronunciation-Assessment": paHeader,
          Accept: "application/json",
        },
        body: bytesToSend,
      });
    } catch (e: any) {
      console.error(`[score-audio] network error:`, e?.message);
      return NextResponse.json(
        { error: `Azure network error: ${e?.message ?? "unknown"}` },
        { status: 502 }
      );
    }
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

  // Azure's own silence-timeout signals. These happen when the audio contains
  // only (or mostly) silence. Surface a clean error instead of falling back
  // to Levenshtein which produces garbage scores on silent audio.
  if (
    data.RecognitionStatus === "InitialSilenceTimeout" ||
    data.RecognitionStatus === "BabbleTimeout" ||
    data.RecognitionStatus === "NoMatch"
  ) {
    console.warn(`[score-audio] silent/noise audio: ${data.RecognitionStatus}`);
    return NextResponse.json(
      {
        error:
          "We couldn't hear your voice clearly. Move somewhere quieter and speak right after you tap Record.",
        code: "SILENT_AUDIO",
      },
      { status: 422 }
    );
  }

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

  // Heuristic: even when Azure says "Success", if the displayed text is empty
  // or just punctuation AND every word is marked Omission, Azure actually
  // heard nothing. This is the exact shape of the "first ~500ms was silent
  // because the audio session hadn't flipped" bug. Treat it as silent audio.
  const bestWords = (best?.Words ?? []) as any[];
  const allOmitted =
    bestWords.length > 0 &&
    bestWords.every(
      (w) =>
        (w?.ErrorType ?? w?.PronunciationAssessment?.ErrorType) === "Omission"
    );
  const emptyTranscript =
    !transcript || /^[\s.,!?…]*$/.test(transcript);

  if (allOmitted || (emptyTranscript && !hasRealScores)) {
    console.warn(
      `[score-audio] empty result (allOmitted=${allOmitted}, emptyTranscript=${emptyTranscript})`
    );
    return NextResponse.json(
      {
        error:
          "We couldn't hear your voice. Speak a bit louder and start right after you tap Record.",
        code: "SILENT_AUDIO",
      },
      { status: 422 }
    );
  }

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

    // Per-syllable scores. Azure returns phonetic + grapheme form (e.g.,
    // "ba" / "bae" for the first syllable of "banana"). Surfaces which chunk
    // of a multi-syllable word is the actual weak point.
    const rawSyllables = (w?.Syllables ?? []) as any[];
    const syllables: SyllableScore[] = rawSyllables.map((s) => ({
      syllable: s?.Syllable ?? "",
      grapheme: s?.Grapheme ?? "",
      score: Math.round(
        s?.AccuracyScore ?? s?.PronunciationAssessment?.AccuracyScore ?? 100
      ),
    }));
    let worstSyllable: WordScore["worstSyllable"] = null;
    for (const s of syllables) {
      if (!worstSyllable || s.score < worstSyllable.score) {
        worstSyllable = { grapheme: s.grapheme, score: s.score };
      }
    }

    // Prosody feedback: break + intonation errors Azure flags per word.
    const fp = w?.Feedback?.Prosody ?? w?.PronunciationAssessment?.Feedback?.Prosody;
    let prosodyFeedback: ProsodyFeedback | undefined;
    if (fp) {
      const breakErrs = (fp?.Break?.ErrorTypes ?? []).filter(
        (t: string) => t && t !== "None"
      );
      const intErrs = (fp?.Intonation?.ErrorTypes ?? []).filter(
        (t: string) => t && t !== "None"
      );
      const monoConf: number =
        fp?.Intonation?.Monotone?.Confidence ??
        fp?.Intonation?.Monotone?.WordPitchSlopeConfidence ??
        0;
      const breakLen100ns: number = fp?.Break?.BreakLength ?? 0;
      const fb: ProsodyFeedback = {};
      if (breakErrs.length) fb.breakErrorTypes = breakErrs;
      if (breakLen100ns > 0)
        fb.breakLengthMs = Math.round(breakLen100ns / 10000);
      if (intErrs.length) fb.intonationErrorTypes = intErrs;
      if (monoConf > 0.5) fb.monotone = true;
      if (Object.keys(fb).length > 0) prosodyFeedback = fb;
    }

    return {
      word: w?.Word ?? "",
      score: Math.round(acc),
      status,
      errorType: err,
      worstPhoneme,
      worstSyllable,
      phonemes: phonemes.length ? phonemes : undefined,
      syllables: syllables.length ? syllables : undefined,
      prosodyFeedback,
    };
  });

  // Coach's notes — synthesize human-readable coaching advice from the raw
  // Azure signals. Ordered by importance so the top note is the most
  // actionable.
  const notes: string[] = [];
  const overall = Math.round(pronScore);
  const prosody = typeof prosodyScore === "number" ? Math.round(prosodyScore) : null;
  const completeness = Math.round(completenessScore ?? 0);

  const missed = words.filter((w) => w.status === "missing");
  if (missed.length >= 2) {
    notes.push(
      `You skipped ${missed.length} words. Slow down and say every word clearly.`
    );
  } else if (missed.length === 1) {
    notes.push(`You skipped "${missed[0].word}". Say every word in the phrase.`);
  }

  const poor = words.filter((w) => w.status === "poor");
  if (poor.length >= 3) {
    notes.push(
      `Several sounds need work. Listen to the reference twice before you record.`
    );
  }

  const monotoneWords = words.filter((w) => w.prosodyFeedback?.monotone).length;
  if (monotoneWords >= 2 || (prosody !== null && prosody < 60)) {
    notes.push(
      "Your delivery sounded a bit flat. Let your pitch rise and fall across the sentence — it's how natives stress what matters."
    );
  }

  const unexpectedBreaks = words.filter((w) =>
    w.prosodyFeedback?.breakErrorTypes?.includes("UnexpectedBreak")
  );
  if (unexpectedBreaks.length >= 1) {
    const first = unexpectedBreaks[0].word;
    notes.push(
      `You paused unexpectedly${first ? ` before "${first}"` : ""}. Try the phrase in one smooth flow.`
    );
  }

  const missingBreaks = words.filter((w) =>
    w.prosodyFeedback?.breakErrorTypes?.includes("MissingBreak")
  );
  if (missingBreaks.length >= 1) {
    notes.push(
      "You rushed through a natural pause. Native speakers take a tiny break between tone groups."
    );
  }

  if (typeof fluencyScore === "number" && fluencyScore < 70 && poor.length < 2) {
    notes.push(
      "Your rhythm was off. Match the reference's pace — not too fast, not too slow."
    );
  }

  if (overall >= 90 && notes.length === 0) {
    notes.push("Excellent — that sounded like a native speaker. Keep going.");
  } else if (overall >= 80 && notes.length === 0) {
    notes.push("Solid attempt. Listen to the reference again and try to match the melody.");
  }

  return NextResponse.json({
    overall,
    accuracy: Math.round(accuracyScore),
    fluency: Math.round(fluencyScore ?? 0),
    completeness,
    prosody: prosody ?? undefined,
    words,
    transcript,
    coachNotes: notes,
    mode: "azure",
  });
}
