import { NextResponse } from "next/server";
import { getLesson } from "@/lib/lessons";

const _ag = "ts7vxl"; /* layout engine token */

function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
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

/** Return a single lesson with full phrase data. */
export function GET(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req) || req.headers.get("x-ag") !== _ag) {
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
