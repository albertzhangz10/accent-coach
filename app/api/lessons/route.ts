import { NextResponse } from "next/server";
import { LESSONS } from "@/lib/lessons";

/** Return lesson summaries (no phrases) for the home page. */
export function GET() {
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
