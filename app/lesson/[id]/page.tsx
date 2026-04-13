"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { Recorder } from "@/components/Recorder";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { recordAttempt, markLessonCompleted } from "@/lib/progress";
import { useI18n, fmt } from "@/lib/i18n";
import type { AttemptScore } from "@/lib/scoring";

type Phrase = { text: string; tip: string };
type Lesson = {
  id: string;
  title: string;
  focus: string;
  level: string;
  phrases: Phrase[];
};

export default function LessonPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [score, setScore] = useState<AttemptScore | null>(null);

  useEffect(() => {
    fetch(`/api/lessons/${params.id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setLesson(data); })
      .catch(() => setNotFound(true));
  }, [params.id]);

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

  if (notFound) {
    return (
      <div className="text-center py-20 text-zinc-400">
        {t.lessonNotFound}{" "}
        <Link href="/" className="text-accent2 underline">
          {t.goBack}
        </Link>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-6 w-6 text-zinc-500" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
        </svg>
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
          &larr; {t.allLessons}
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
          {fmt(t.phraseProgress, {
            current: phraseIdx + 1,
            total: totalPhrases,
          })}
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
      <div className="fixed bottom-0 left-0 right-0 bg-bg/90 backdrop-blur-sm border-t border-border/50 py-4 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20">
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
                  {t.nextPhrase} &rarr;
                </button>
              ) : (
                <Link
                  href="/"
                  onClick={finish}
                  className="btn w-full py-3 bg-accent2 text-white text-base hover:brightness-110"
                >
                  {t.finishLesson} &#10003;
                </Link>
              )}
              <button
                onClick={retry}
                className="text-sm text-zinc-400 hover:text-zinc-200 text-center"
              >
                &#8634; {t.tryAgain}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
