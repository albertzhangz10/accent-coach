"use client";

import type { AttemptScore, WordScore } from "@/lib/scoring";
import { speakNative } from "@/lib/webTts";
import { getPhonemeTip } from "@/lib/phonemeTips";

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-300";
  if (score >= 70) return "text-lime-300";
  if (score >= 55) return "text-amber-300";
  return "text-rose-300";
}

function scoreStroke(score: number): string {
  if (score >= 85) return "stroke-emerald-400";
  if (score >= 70) return "stroke-lime-400";
  if (score >= 55) return "stroke-amber-400";
  return "stroke-rose-400";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "EXCELLENT";
  if (score >= 80) return "GREAT";
  if (score >= 70) return "GOOD";
  if (score >= 55) return "FAIR";
  return "NEEDS WORK";
}

const WORD_STYLE: Record<WordScore["status"], string> = {
  good: "text-white",
  ok: "text-amber-300 underline decoration-dashed decoration-amber-500/50",
  poor: "text-rose-300 font-bold underline decoration-rose-500",
  missing: "text-zinc-500 line-through",
};

type Props = {
  score: AttemptScore;
  reference: string;
};

export function ScoreDisplay({ score, reference }: Props) {
  const circumference = 2 * Math.PI * 44;
  const dashLength = (score.overall / 100) * circumference;

  // Find 3 worst words
  const worstWords = [...score.words]
    .filter((w) => w.status !== "good" && w.status !== "missing")
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  // If we don't have enough "ok"/"poor", include missing
  if (worstWords.length < 3) {
    const missing = score.words
      .filter((w) => w.status === "missing")
      .slice(0, 3 - worstWords.length);
    worstWords.push(...missing);
  }

  const metrics = [
    { label: "Accuracy", value: score.accuracy, help: "How well each sound matches" },
    { label: "Fluency", value: score.fluency, help: "Rhythm and natural flow" },
    { label: "Complete", value: score.completeness, help: "Words recognized" },
    {
      label: "Prosody",
      value: score.prosody,
      help: "Intonation and stress",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overall score ring */}
      <div className="flex items-center justify-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="fill-none stroke-border"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className={`fill-none transition-all duration-700 ${scoreStroke(score.overall)}`}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dashLength} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-5xl font-bold ${scoreColor(score.overall)}`}>
              {score.overall}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 mt-1">
              {scoreLabel(score.overall)}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="card p-3 text-center">
            <div
              className={`text-2xl font-semibold ${
                m.value != null ? scoreColor(m.value) : "text-zinc-500"
              }`}
            >
              {m.value != null ? m.value : "\u2014"}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">
              {m.label}
            </div>
            <div className="text-[9px] text-zinc-600 mt-0.5">{m.help}</div>
          </div>
        ))}
      </div>

      {/* Coach's Notes */}
      {score.coachNotes && score.coachNotes.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold mb-2">
            <span>&#10024;</span> Coach&apos;s Notes
          </div>
          <ul className="space-y-1">
            {score.coachNotes.map((note, i) => (
              <li key={i} className="text-sm text-emerald-100/80 flex gap-2">
                <span className="text-emerald-400 mt-0.5">&#8226;</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Your Attempt — highlighted sentence */}
      <div>
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Your attempt
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-lg leading-relaxed">
          {score.words.map((w, i) => (
            <button
              key={i}
              onClick={() => speakNative(w.word)}
              className={`cursor-pointer hover:opacity-70 transition-opacity ${WORD_STYLE[w.status]}`}
              title={`${w.word}: ${w.score}/100 (${w.status})`}
            >
              {w.word}
            </button>
          ))}
        </div>
      </div>

      {/* Focus on these words */}
      {worstWords.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            Focus on these words
          </div>
          <div className="space-y-3">
            {worstWords.map((w, i) => (
              <WordFocusCard key={i} word={w} />
            ))}
          </div>
        </div>
      )}

      {/* What we heard */}
      {score.transcript && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
            What we heard
          </div>
          <div className="text-sm text-zinc-300 italic">
            &ldquo;{score.transcript}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}

function WordFocusCard({ word }: { word: WordScore }) {
  const phonemeTip = word.worstPhoneme
    ? getPhonemeTip(word.worstPhoneme.arpabet || word.worstPhoneme.phoneme)
    : null;

  // Find the first alternative phoneme if available
  const soundedLike =
    word.phonemes
      ?.flatMap((p) => p.alternatives ?? [])
      .sort((a, b) => b.score - a.score)[0] ?? null;

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xl font-bold ${scoreColor(word.score)}`}>
            {word.word}
          </span>
          <span className="text-sm text-zinc-500">{word.score}/100</span>
        </div>
        <button
          onClick={() => speakNative(word.word)}
          className="btn px-3 py-1.5 bg-panel border border-border text-xs text-zinc-300 hover:border-accent2"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="mr-1"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          Listen
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {/* Weakest sound */}
        {word.worstPhoneme && (
          <span className="bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-lg px-2 py-1">
            Weakest sound: {phonemeTip?.symbol || word.worstPhoneme.phoneme}{" "}
            {word.worstPhoneme.arpabet && (
              <span className="text-zinc-500">({word.worstPhoneme.arpabet})</span>
            )}{" "}
            &mdash; {word.worstPhoneme.score}/100
          </span>
        )}

        {/* Weakest syllable */}
        {word.worstSyllable && (
          <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg px-2 py-1">
            Weak syllable: &ldquo;{word.worstSyllable.grapheme}&rdquo; &mdash;{" "}
            {word.worstSyllable.score}/100
          </span>
        )}

        {/* Sounded like */}
        {soundedLike && (
          <span className="bg-zinc-500/10 text-zinc-300 border border-zinc-500/20 rounded-lg px-2 py-1">
            Sounded like /{soundedLike.phoneme}/
          </span>
        )}

        {/* Prosody feedback */}
        {word.prosodyFeedback?.monotone && (
          <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg px-2 py-1">
            Monotone &mdash; vary your pitch
          </span>
        )}
        {word.prosodyFeedback?.breakErrorTypes &&
          word.prosodyFeedback.breakErrorTypes.length > 0 && (
            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg px-2 py-1">
              Unexpected break
            </span>
          )}
      </div>

      {/* Mechanical tip */}
      {phonemeTip && (
        <div className="text-xs text-zinc-400 border-l-2 border-accent2/40 pl-2">
          {phonemeTip.tip}
        </div>
      )}
    </div>
  );
}
