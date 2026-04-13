import { NextResponse } from "next/server";
import { LESSONS } from "@/lib/lessons";

function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  // Server-side fetch (e.g. during SSR) has no origin/referer — allow
  if (!origin && !referer) return true;
  const host = req.headers.get("host") || "";
  if (origin) {
    try { return new URL(origin).host === host; } catch { return false; }
  }
  if (referer) {
    try { return new URL(referer).host === host; } catch { return false; }
  }
  return false;
}

/** Return lesson summaries (no phrases) for the home page. */
export function GET(req: Request) {
  if (!isSameOrigin(req)) {
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
