"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WavRecorder } from "@/lib/webRecorder";
import { speakNative, stopSpeaking } from "@/lib/webTts";
import { useI18n } from "@/lib/i18n";
import type { AttemptScore } from "@/lib/scoring";

type Props = {
  reference: string;
  onScored: (score: AttemptScore) => void;
};

type State = "idle" | "listening" | "recording" | "processing" | "error";

export function Recorder({ reference, onScored }: Props) {
  const { t } = useI18n();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const recorderRef = useRef<WavRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset on reference change
  useEffect(() => {
    setState("idle");
    setError(null);
    setDurationMs(0);
    return () => {
      recorderRef.current?.cancel();
      stopSpeaking();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reference]);

  const handleListen = useCallback(() => {
    setState("listening");
    speakNative(reference);
    // Return to idle after a brief moment — Audio plays async
    setTimeout(() => {
      setState((s) => (s === "listening" ? "idle" : s));
    }, 1500);
  }, [reference]);

  const handleRecord = useCallback(async () => {
    setError(null);
    try {
      const rec = new WavRecorder();
      recorderRef.current = rec;
      await rec.start();
      setState("recording");
      setDurationMs(0);
      timerRef.current = setInterval(() => {
        setDurationMs(rec.getDurationMs());
      }, 100);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg ? `${msg} — ${t.errMicDenied}` : t.errMicDenied);
      setState("error");
    }
  }, [t]);

  const handleCancel = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setState("idle");
    setDurationMs(0);
  }, []);

  const handleStop = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const rec = recorderRef.current;
    if (!rec) return;

    const duration = rec.getDurationMs();
    const peak = rec.getPeakLevel();

    if (duration < 800) {
      rec.cancel();
      recorderRef.current = null;
      setError(t.errTooShort);
      setState("error");
      return;
    }

    // -45 dB equivalent: 10^(-45/20) ~ 0.0056
    if (peak < 0.0056) {
      rec.cancel();
      recorderRef.current = null;
      setError(t.errSilent);
      setState("error");
      return;
    }

    const blob = rec.stop();
    recorderRef.current = null;
    setState("processing");

    const formData = new FormData();
    formData.append("audio", blob, "recording.wav");
    formData.append("reference", reference);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/score-audio", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Server error ${res.status}`);
      }

      const score: AttemptScore = await res.json();
      onScored(score);
      setState("idle");
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") {
        setState("idle");
        return;
      }
      const msg = e instanceof Error ? e.message : "Scoring failed";
      setError(msg);
      setState("error");
    } finally {
      abortRef.current = null;
    }
  }, [reference, onScored, t]);

  const handleCancelProcessing = useCallback(() => {
    abortRef.current?.abort();
    setState("idle");
  }, []);

  const formatDuration = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        {/* Listen / Cancel button */}
        {state === "recording" ? (
          <button
            onClick={handleCancel}
            className="btn px-5 py-2.5 bg-panel border border-border text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
          >
            {t.cancel}
          </button>
        ) : (
          <button
            onClick={handleListen}
            disabled={state === "processing"}
            className="btn px-5 py-2.5 bg-panel border border-border text-zinc-200 hover:border-accent2"
          >
            {state === "listening" ? (
              <svg
                className="animate-spin mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="opacity-75"
                />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="mr-2"
              >
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            )}
            {t.listen}
          </button>
        )}

        {/* Record / Stop / Processing */}
        {state === "recording" ? (
          <button
            onClick={handleStop}
            className="btn px-8 py-4 bg-rose-500 text-white text-lg shadow-lg shadow-rose-500/30 animate-pulse"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="mr-2"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            {t.stop}
          </button>
        ) : state === "processing" ? (
          <button
            onClick={handleCancelProcessing}
            className="btn px-8 py-4 bg-panel border border-border text-zinc-200"
          >
            <svg
              className="animate-spin mr-2 h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
              />
              <path
                d="M4 12a8 8 0 018-8"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="opacity-75"
              />
            </svg>
            {t.scoring}
          </button>
        ) : (
          <button
            onClick={handleRecord}
            disabled={state === "listening"}
            className="btn px-8 py-4 bg-accent text-white text-lg shadow-lg shadow-accent/30 hover:brightness-110"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="mr-2"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.998.998 0 00-.98-.85c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08a6.993 6.993 0 005.91-5.78c.1-.6-.39-1.14-1-1.14z" />
            </svg>
            {t.record}
          </button>
        )}
      </div>

      {/* Duration counter */}
      {state === "recording" && (
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          {formatDuration(durationMs)}
        </div>
      )}

      {/* Error */}
      {state === "error" && error && (
        <div className="text-sm text-rose-300 text-center max-w-md bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
          {error}
          <button
            onClick={() => {
              setError(null);
              setState("idle");
            }}
            className="block mx-auto mt-2 text-xs text-zinc-400 hover:text-zinc-200 underline"
          >
            {t.dismiss}
          </button>
        </div>
      )}
    </div>
  );
}
