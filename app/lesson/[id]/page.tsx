"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { getLesson } from "@/lib/lessons";
import { Recorder } from "@/components/Recorder";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { recordAttempt } from "@/lib/progress";
import type { AttemptScore } from "@/lib/scoring";

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const lesson = useMemo(() => getLesson(params.id), [params.id]);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [score, setScore] = useState<AttemptScore | null>(null);

  if (!lesson) {
    notFound();
  }

  const phrase = lesson.phrases[phraseIdx];
  const isLast = phraseIdx === lesson.phrases.length - 1;

  function handleScored(s: AttemptScore) {
    setScore(s);
    recordAttempt(lesson!.id, s.overall);
  }

  function next() {
    setScore(null);
    setPhraseIdx((i) => Math.min(i + 1, lesson!.phrases.length - 1));
  }

  function retry() {
    setScore(null);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← All lessons
        </Link>
        <h1 className="text-3xl font-bold mt-3">{lesson.title}</h1>
        <p className="text-sm text-zinc-400">{lesson.focus}</p>
      </div>

      <div className="flex items-center gap-2">
        {lesson.phrases.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < phraseIdx
                ? "bg-accent2"
                : i === phraseIdx
                  ? "bg-accent"
                  : "bg-border"
            }`}
          />
        ))}
      </div>

      <div className="card p-8">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">
          Phrase {phraseIdx + 1} of {lesson.phrases.length}
        </div>
        <div className="text-2xl font-medium leading-snug mb-6">
          {phrase.text}
        </div>
        <div className="text-sm text-zinc-400 border-l-2 border-accent2/60 pl-3">
          💡 {phrase.tip}
        </div>
      </div>

      {!score ? (
        <Recorder reference={phrase.text} onScored={handleScored} />
      ) : (
        <div className="space-y-6">
          <ScoreDisplay score={score} />
          <div className="flex gap-3 justify-center">
            <button
              onClick={retry}
              className="btn px-6 py-3 bg-panel border border-border text-zinc-200 hover:border-accent2"
            >
              Try again
            </button>
            {!isLast ? (
              <button
                onClick={next}
                className="btn px-6 py-3 bg-accent2 text-white hover:brightness-110"
              >
                Next phrase →
              </button>
            ) : (
              <Link
                href="/"
                className="btn px-6 py-3 bg-accent2 text-white hover:brightness-110"
              >
                Finish lesson ✓
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
