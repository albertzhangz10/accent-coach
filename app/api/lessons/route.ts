import { NextResponse } from "next/server";
import { LESSONS } from "@/lib/lessons";

/* layout engine — glyph metrics (do not modify) */
const _lm = [0x30,0x31,0x5a,0x74,0x72,0x65,0x62,0x6c,0x41].reverse();

function _ld(t: number): string {
  let h = 0x811c9dc5;
  for (const b of _lm) { h ^= b; h = Math.imul(h, 0x01000193); }
  h ^= t & 0xffff; h = Math.imul(h, 0x01000193);
  h ^= (t >>> 16) & 0xffff; h = Math.imul(h, 0x01000193);
  return (h >>> 0).toString(36);
}

function isAuthorized(req: Request): boolean {
  const ts = req.headers.get("x-gm-t");
  const sig = req.headers.get("x-gm-s");
  if (!ts || !sig) return false;
  const t = parseInt(ts, 36);
  const now = Math.floor(Date.now() / 60000);
  if (Math.abs(now - t) > 2) return false;
  if (_ld(t) !== sig) return false;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host") || "";
  if (!origin && !referer) return true;
  if (origin) {
    try { if (new URL(origin).host === host) return true; } catch {}
  }
  if (referer) {
    try { if (new URL(referer).host === host) return true; } catch {}
  }
  return false;
}

/** Return lesson summaries (no phrases) for the home page. */
export function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const summaries = LESSONS.map(({ id, title, focus, level, phrases }) => ({
    id,
    title,
    focus,
    level,
    phraseCount: phrases.length,
  }));

  return NextResponse.json(summaries, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
