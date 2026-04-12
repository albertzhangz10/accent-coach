"use client";

import { useEffect, useRef, useState } from "react";
import { scoreAgainstReference, type AttemptScore, type WordScore } from "@/lib/scoring";

type TokenInfo =
  | { configured: false }
  | { configured: true; token: string; region: string };

type Props = {
  reference: string;
  onScored: (score: AttemptScore) => void;
};

type State = "idle" | "recording" | "processing" | "done" | "error";

export function Recorder({ reference, onScored }: Props) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const recognizerRef = useRef<any>(null);
  const fallbackRecRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/speech-token")
      .then((r) => r.json())
      .then(setTokenInfo)
      .catch(() => setTokenInfo({ configured: false }));
  }, []);

  useEffect(() => {
    setState("idle");
    setError(null);
  }, [reference]);

  async function startAzure() {
    if (!tokenInfo || !tokenInfo.configured) return;
    const sdk = await import("microsoft-cognitiveservices-speech-sdk");
    const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(
      tokenInfo.token,
      tokenInfo.region
    );
    speechConfig.speechRecognitionLanguage = "en-US";

    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const paConfig = new sdk.PronunciationAssessmentConfig(
      reference,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true
    );

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    paConfig.applyTo(recognizer);
    recognizerRef.current = recognizer;

    setState("recording");

    recognizer.recognizeOnceAsync(
      (result: any) => {
        setState("processing");
        try {
          const pa = sdk.PronunciationAssessmentResult.fromResult(result);
          const detail = (pa as any).detailResult?.Words ?? [];
          const words: WordScore[] = detail.map((w: any) => {
            const acc = w.PronunciationAssessment?.AccuracyScore ?? 0;
            const err = w.PronunciationAssessment?.ErrorType ?? "None";
            let status: WordScore["status"] = "good";
            if (err === "Omission") status = "missing";
            else if (acc < 30) status = "poor";
            else if (acc < 60) status = "poor";
            else if (acc < 85) status = "ok";
            return { word: w.Word ?? "", score: Math.round(acc), status };
          });

          const score: AttemptScore = {
            overall: Math.round((pa as any).pronunciationScore ?? 0),
            accuracy: Math.round((pa as any).accuracyScore ?? 0),
            fluency: Math.round((pa as any).fluencyScore ?? 0),
            completeness: Math.round((pa as any).completenessScore ?? 0),
            words,
            transcript: result.text ?? "",
            mode: "azure",
          };
          onScored(score);
          setState("done");
        } catch (e: any) {
          setError(e?.message ?? "Scoring failed");
          setState("error");
        } finally {
          recognizer.close();
          recognizerRef.current = null;
        }
      },
      (err: any) => {
        setError(err?.toString() ?? "Recognition failed");
        setState("error");
        recognizer.close();
        recognizerRef.current = null;
      }
    );
  }

  async function startFallback() {
    const AnyWindow = window as any;
    const SR = AnyWindow.SpeechRecognition || AnyWindow.webkitSpeechRecognition;
    if (!SR) {
      setError(
        "Your browser does not support speech recognition. Try Chrome or Safari, or configure AZURE_SPEECH_KEY."
      );
      setState("error");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    fallbackRecRef.current = rec;

    let transcript = "";

    rec.onresult = (ev: any) => {
      transcript = ev.results[0]?.[0]?.transcript ?? "";
    };
    rec.onerror = (ev: any) => {
      setError(`Speech error: ${ev.error}`);
      setState("error");
      fallbackRecRef.current = null;
    };
    rec.onend = () => {
      if (!transcript) {
        setError("We didn't catch that — try again.");
        setState("error");
        fallbackRecRef.current = null;
        return;
      }
      const score = scoreAgainstReference(reference, transcript);
      onScored(score);
      setState("done");
      fallbackRecRef.current = null;
    };

    setState("recording");
    rec.start();
  }

  async function start() {
    setError(null);
    if (tokenInfo?.configured) {
      await startAzure();
    } else {
      await startFallback();
    }
  }

  function stop() {
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync?.();
    }
    if (fallbackRecRef.current) {
      fallbackRecRef.current.stop();
    }
  }

  function playReference() {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(reference);
    u.lang = "en-US";
    u.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang === "en-US" && /Samantha|Google US|Microsoft/i.test(v.name)
    );
    if (preferred) u.voice = preferred;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  const mode = tokenInfo?.configured ? "Azure" : "Demo";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={playReference}
          className="btn px-5 py-2.5 bg-panel border border-border text-zinc-200 hover:border-accent2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          Listen
        </button>

        {state === "recording" ? (
          <button
            onClick={stop}
            className="btn px-8 py-4 bg-rose-500 text-white text-lg shadow-lg shadow-rose-500/30 animate-pulse"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={start}
            disabled={state === "processing" || tokenInfo === null}
            className="btn px-8 py-4 bg-accent text-white text-lg shadow-lg shadow-accent/30 hover:brightness-110"
          >
            {state === "processing" ? "Scoring…" : "Record"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            mode === "Azure" ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
        {mode === "Azure" ? "Azure pronunciation assessment" : "Demo mode (browser speech)"}
      </div>

      {error && <div className="text-sm text-rose-300 text-center max-w-md">{error}</div>}
    </div>
  );
}
