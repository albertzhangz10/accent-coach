import { NextResponse } from "next/server";
import { getLesson } from "@/lib/lessons";

/** Return a single lesson with full phrase data. */
export function GET(_req: Request, { params }: { params: { id: string } }) {
  const lesson = getLesson(params.id);
  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(lesson, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
