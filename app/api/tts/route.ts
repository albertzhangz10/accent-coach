import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_VOICE = "en-US-JennyNeural";
const ALLOWED_VOICES = new Set([
  "en-US-JennyNeural",
  "en-US-AriaNeural",
  "en-US-GuyNeural",
  "en-US-DavisNeural",
  "en-US-TonyNeural",
  "en-US-AmberNeural",
  "en-US-AnaNeural",
  "en-GB-SoniaNeural",
  "en-GB-RyanNeural",
]);

/**
 * Voices that support the `<mstts:express-as>` expressive style "friendly".
 * For a coaching app, a warmer delivery is a real improvement — but we can't
 * blindly apply it to every voice because Azure rejects SSML that references
 * an unsupported style on that voice.
 */
const FRIENDLY_CAPABLE = new Set([
  "en-US-JennyNeural",
  "en-US-AriaNeural",
  "en-US-DavisNeural",
]);

// Higher bitrate for a noticeably cleaner voice. 24kHz/96kbps is ~2x the size
// of the previous 48kbps format but still mobile-friendly. expo-audio plays it
// fine out of the box.
const OUTPUT_FORMAT = "audio-24khz-96kbitrate-mono-mp3";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Tiny in-memory LRU cache for TTS responses. Azure TTS is deterministic for a
 * given (text, voice, rate, style) tuple, so caching makes repeated "Listen"
 * taps cost zero latency. Capped at 200 entries to avoid unbounded growth
 * across hot-reloads during dev.
 */
type CachedAudio = { buf: Buffer; contentType: string };
const TTS_CACHE = new Map<string, CachedAudio>();
const TTS_CACHE_MAX = 200;

function cacheGet(key: string): CachedAudio | undefined {
  const v = TTS_CACHE.get(key);
  if (!v) return undefined;
  // LRU: re-insert to move to most-recent.
  TTS_CACHE.delete(key);
  TTS_CACHE.set(key, v);
  return v;
}

function cacheSet(key: string, value: CachedAudio) {
  if (TTS_CACHE.has(key)) TTS_CACHE.delete(key);
  TTS_CACHE.set(key, value);
  if (TTS_CACHE.size > TTS_CACHE_MAX) {
    const oldest = TTS_CACHE.keys().next().value;
    if (oldest !== undefined) TTS_CACHE.delete(oldest);
  }
}

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

export async function GET(req: Request) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    return NextResponse.json({ error: "Azure not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text")?.trim();
  const rawVoice = searchParams.get("voice") ?? DEFAULT_VOICE;
  const voice = ALLOWED_VOICES.has(rawVoice) ? rawVoice : DEFAULT_VOICE;
  const rate = searchParams.get("rate") ?? "-10%";
  const styleParam = searchParams.get("style") ?? "friendly";

  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }

  const useStyle = styleParam !== "none" && FRIENDLY_CAPABLE.has(voice) ? styleParam : null;
  const cacheKey = `${voice}|${rate}|${useStyle ?? "plain"}|${text}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return new Response(new Uint8Array(cached.buf), {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Content-Length": String(cached.buf.byteLength),
        "Cache-Control": "public, max-age=86400",
        "X-Cache": "HIT",
      },
    });
  }

  const lang = voice.startsWith("en-GB") ? "en-GB" : "en-US";
  const safeText = escapeXml(text);
  const safeRate = escapeXml(rate);

  // Wrap the prosody in `<mstts:express-as style="friendly">` when the voice
  // supports it — gives a warmer, more encouraging coaching delivery.
  const innerContent = useStyle
    ? `<mstts:express-as style='${escapeXml(useStyle)}' styledegree='1'><prosody rate='${safeRate}'>${safeText}</prosody></mstts:express-as>`
    : `<prosody rate='${safeRate}'>${safeText}</prosody>`;

  const ssml = `<speak version='1.0' xml:lang='${lang}' xmlns:mstts='https://www.w3.org/2001/mstts'>
    <voice xml:lang='${lang}' name='${voice}'>
      ${innerContent}
    </voice>
  </speak>`;

  let res: Response;
  try {
    res = await fetchWithRetry(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
          "User-Agent": "accent-coach",
        },
        body: ssml,
      }
    );
  } catch (e: any) {
    console.error(`[tts] network error:`, e?.message);
    return NextResponse.json(
      { error: `Azure TTS network error: ${e?.message ?? "unknown"}` },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error(`[tts] Azure ${res.status}: ${err}`);
    return NextResponse.json(
      { error: `Azure TTS ${res.status}` },
      { status: 502 }
    );
  }

  const audioArr = await res.arrayBuffer();
  const audioBuf = Buffer.from(audioArr);
  cacheSet(cacheKey, { buf: audioBuf, contentType: "audio/mpeg" });

  return new Response(new Uint8Array(audioBuf), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuf.byteLength),
      "Cache-Control": "public, max-age=86400",
      "X-Cache": "MISS",
    },
  });
}
