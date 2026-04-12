"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, useCallback } from "react";
import { getLesson } from "@/lib/lessons";
import { Recorder } from "@/components/Recorder";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { recordAttempt, markLessonCompleted } from "@/lib/progress";
import type { AttemptScore } from "@/lib/scoring";

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const lesson = useMemo(() => getLesson(params.id), [params.id]);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [score, setScore] = useState<AttemptScore | null>(null);

  const handleScored = useCallback(
    (s: AttemptScore) => {
      setScore(s);
      if (lesson) recordAttempt(lesson.id, s.overall);
    },
    [lesson],
  );

  const next = useCallback(() => {
    setScore(null);
    setPhraseIdx((i) => Math.min(i + 1, (lesson?.phrases.length ?? 1) - 1));
  }, [lesson]);

  const retry = useCallback(() => {
    setScore(null);
  }, []);

  const finish = useCallback(() => {
    if (lesson) markLessonCompleted(lesson.id);
  }, [lesson]);

  if (!lesson) {
    return (
      <div className="text-center py-20 text-zinc-400">
        Lesson not found.{" "}
        <Link href="/" className="text-accent2 underline">
          Go back
        </Link>
      </div>
    );
  }

  const phrase = lesson.phrases[phraseIdx];
  const isLast = phraseIdx === lesson.phrases.length - 1;
  const totalPhrases = lesson.phrases.length;

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; All lessons
        </Link>
        <h1 className="text-3xl font-bold mt-3">{lesson.title}</h1>
        <p className="text-sm text-zinc-400">{lesson.focus}</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1.5 mb-8">
        {lesson.phrases.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all ${
              i < phraseIdx
                ? "bg-accent2 h-1.5 flex-1"
                : i === phraseIdx
                  ? "bg-accent2/70 h-2.5 flex-1"
                  : "bg-border h-1.5 flex-1"
            }`}
          />
        ))}
      </div>

      {/* Phrase card */}
      <div className="card p-8 mb-6">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">
          Phrase {phraseIdx + 1} of {totalPhrases}
        </div>
        <div className="text-2xl font-medium leading-snug mb-6">
          {phrase.text}
        </div>
        <div className="text-sm text-zinc-400 border-l-2 border-accent2/60 pl-3">
          &#128161; {phrase.tip}
        </div>
      </div>

      {/* Score display when scored */}
      {score && (
        <div className="mb-6">
          <ScoreDisplay score={score} reference={phrase.text} />
        </div>
      )}

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg/90 backdrop-blur-sm border-t border-border/50 py-4 px-6 z-20">
        <div className="max-w-2xl mx-auto">
          {!score ? (
            <Recorder reference={phrase.text} onScored={handleScored} />
          ) : (
            <div className="flex flex-col gap-3">
              {!isLast ? (
                <button
                  onClick={next}
                  className="btn w-full py-3 bg-accent2 text-white text-base hover:brightness-110"
                >
                  Next phrase &rarr;
                </button>
              ) : (
                <Link
                  href="/"
                  onClick={finish}
                  className="btn w-full py-3 bg-accent2 text-white text-base hover:brightness-110"
                >
                  Finish lesson &#10003;
                </Link>
              )}
              <button
                onClick={retry}
                className="text-sm text-zinc-400 hover:text-zinc-200 text-center"
              >
                &#8634; Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
