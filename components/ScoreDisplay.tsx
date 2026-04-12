"use client";

import type { AttemptScore, WordScore } from "@/lib/scoring";

const STATUS_STYLES: Record<WordScore["status"], string> = {
  good: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  ok: "text-amber-200 bg-amber-500/10 border-amber-500/30",
  poor: "text-rose-300 bg-rose-500/10 border-rose-500/30",
  missing: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20 line-through",
};

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-300";
  if (score >= 70) return "text-lime-300";
  if (score >= 55) return "text-amber-300";
  return "text-rose-300";
}

export function ScoreDisplay({ score }: { score: AttemptScore }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="44" className="fill-none stroke-border" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="fill-none stroke-accent2 transition-all duration-700"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score.overall / 100) * 276} 276`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-5xl font-bold ${scoreColor(score.overall)}`}>
              {score.overall}
            </div>
            <div className="text-xs uppercase tracking-wider text-zinc-400">Overall</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Accuracy", value: score.accuracy },
          { label: "Fluency", value: score.fluency },
          { label: "Complete", value: score.completeness },
        ].map((m) => (
          <div key={m.label} className="card p-3 text-center">
            <div className={`text-2xl font-semibold ${scoreColor(m.value)}`}>
              {m.value}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">
              {m.label}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Word breakdown
        </div>
        <div className="flex flex-wrap gap-2">
          {score.words.map((w, i) => (
            <span
              key={i}
              className={`px-3 py-1.5 rounded-full border text-sm font-medium ${STATUS_STYLES[w.status]}`}
              title={`${w.score}/100`}
            >
              {w.word}
            </span>
          ))}
        </div>
      </div>

      {score.transcript && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
            What we heard
          </div>
          <div className="text-sm text-zinc-300 italic">"{score.transcript}"</div>
        </div>
      )}
    </div>
  );
}
