"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadProgress,
  lessonBest,
  isLessonCompleted,
  type Progress,
} from "@/lib/progress";
import { useI18n, fmt } from "@/lib/i18n";

type LessonSummary = {
  id: string;
  title: string;
  focus: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  phraseCount: number;
};

const LEVEL_COLORS: Record<string, string> = {
  Beginner: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Intermediate: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Advanced: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const LEVEL_DOT: Record<string, string> = {
  Beginner: "bg-emerald-400",
  Intermediate: "bg-amber-400",
  Advanced: "bg-rose-400",
};

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

const LEVEL_KEY: Record<string, "beginner" | "intermediate" | "advanced"> = {
  Beginner: "beginner",
  Intermediate: "intermediate",
  Advanced: "advanced",
};

export default function Home() {
  const { t } = useI18n();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);

  useEffect(() => {
    setProgress(loadProgress());
    fetch("/api/lessons")
      .then((r) => r.json())
      .then(setLessons)
      .catch(() => {});
  }, []);

  const isNew =
    !progress || (progress.totalPhrasesSpoken === 0 && progress.streak === 0);

  const grouped = LEVELS.map((level) => {
    const filtered = lessons.filter((l) => l.level === level);
    const done = progress
      ? filtered.filter((l) => isLessonCompleted(progress, l.id)).length
      : 0;
    return { level, lessons: filtered, done };
  });

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section>
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          {t.heroTitle}
        </h1>
        <p className="text-zinc-400 max-w-2xl">{t.heroSubtitle}</p>
      </section>

      {/* Stats or New-user card */}
      {progress && !isNew ? (
        <section className="grid grid-cols-3 gap-4 max-w-xl">
          <Stat
            label={t.statStreak}
            value={progress.streak}
            suffix={progress.streak === 1 ? t.day : t.days}
          />
          <Stat label={t.statPhrases} value={progress.totalPhrasesSpoken} />
          <Stat
            label={t.statLessons}
            value={progress.completedLessons.length}
          />
        </section>
      ) : (
        <section className="card p-6 max-w-xl border-accent2/30">
          <h2 className="text-lg font-semibold mb-1">{t.welcomeTitle}</h2>
          <p className="text-sm text-zinc-400">{t.welcomeBody}</p>
        </section>
      )}

      {/* Lessons grouped by level */}
      {grouped.map(({ level, lessons: group, done }) => (
        <section key={level}>
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`inline-block w-2 h-2 rounded-full ${LEVEL_DOT[level]}`}
            />
            <h2 className="text-xs uppercase tracking-wider text-zinc-500">
              {t[LEVEL_KEY[level]]}
            </h2>
            <span className="text-xs text-zinc-600 ml-auto">
              {fmt(t.doneCount, { done, total: group.length })}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.map((lesson) => {
              const best = progress ? lessonBest(progress, lesson.id) : null;
              const completed = progress
                ? isLessonCompleted(progress, lesson.id)
                : false;
              return (
                <Link
                  key={lesson.id}
                  href={`/lesson/${lesson.id}`}
                  className="card p-5 hover:border-accent2/60 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${LEVEL_COLORS[lesson.level]}`}
                    >
                      {t[LEVEL_KEY[lesson.level]]}
                    </span>
                    <div className="flex items-center gap-2">
                      {best !== null && (
                        <span className="text-xs text-emerald-300 font-semibold">
                          {fmt(t.best, { score: best })}
                        </span>
                      )}
                      {completed && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {t.done}
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-1 group-hover:text-accent2 transition-colors">
                    {lesson.title}
                  </h3>
                  <p className="text-sm text-zinc-400">{lesson.focus}</p>
                  <div className="mt-4 text-xs text-zinc-500">
                    {fmt(t.phrasesCount, { n: lesson.phraseCount })}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold">
        {value}
        {suffix && (
          <span className="text-sm font-normal text-zinc-500 ml-1">
            {suffix}
          </span>
        )}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">
        {label}
      </div>
    </div>
  );
}
