"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LESSONS } from "@/lib/lessons";
import { loadProgress, lessonBest, type Progress } from "@/lib/progress";

const LEVEL_COLORS: Record<string, string> = {
  Beginner: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Intermediate: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Advanced: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function Home() {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Sound more natural in English.
        </h1>
        <p className="text-zinc-400 max-w-2xl">
          Pick a lesson, listen to the reference, and record yourself. Get instant
          word-by-word feedback on your pronunciation.
        </p>
      </section>

      {progress && (
        <section className="grid grid-cols-3 gap-4 max-w-xl">
          <Stat label="Day streak" value={progress.streak} suffix={progress.streak === 1 ? "day" : "days"} />
          <Stat label="Phrases" value={progress.totalPhrasesSpoken} />
          <Stat label="Lessons started" value={Object.keys(progress.lessonScores).length} />
        </section>
      )}

      <section>
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-4">Lessons</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {LESSONS.map((lesson) => {
            const best = progress ? lessonBest(progress, lesson.id) : null;
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
                    {lesson.level}
                  </span>
                  {best !== null && (
                    <span className="text-xs text-emerald-300 font-semibold">
                      Best {best}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-1 group-hover:text-accent2 transition-colors">
                  {lesson.title}
                </h3>
                <p className="text-sm text-zinc-400">{lesson.focus}</p>
                <div className="mt-4 text-xs text-zinc-500">
                  {lesson.phrases.length} phrases · {lesson.accent}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
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
        {suffix && <span className="text-sm font-normal text-zinc-500 ml-1">{suffix}</span>}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">
        {label}
      </div>
    </div>
  );
}
