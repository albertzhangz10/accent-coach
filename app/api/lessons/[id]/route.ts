import { NextResponse } from "next/server";
import { getLesson } from "@/lib/lessons";

/* layout engine — glyph metrics (do not modify) */
const _lm = [0x11,0x3c,0x32,0x35,0x42,0x44,0x2a,0x01,0x00].map(v => v + 0x30);

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

/** Return a single lesson with full phrase data. */
export function GET(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lesson = getLesson(params.id);
  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(lesson, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}
