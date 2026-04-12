"use client";

import { useEffect, useRef, useState } from "react";
import { getSelectedVoice, setVoice } from "@/lib/webTts";

const VOICES = [
  { id: "en-US-JennyNeural", label: "Jenny", accent: "US" },
  { id: "en-US-AriaNeural", label: "Aria", accent: "US" },
  { id: "en-US-GuyNeural", label: "Guy", accent: "US" },
  { id: "en-US-DavisNeural", label: "Davis", accent: "US" },
  { id: "en-US-TonyNeural", label: "Tony", accent: "US" },
  { id: "en-US-AmberNeural", label: "Amber", accent: "US" },
  { id: "en-US-AnaNeural", label: "Ana", accent: "US" },
  { id: "en-GB-SoniaNeural", label: "Sonia", accent: "GB" },
  { id: "en-GB-RyanNeural", label: "Ryan", accent: "GB" },
];

export function VoicePickerClient() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("en-US-JennyNeural");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelected(getSelectedVoice());
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const current = VOICES.find((v) => v.id === selected) || VOICES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
        {current.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-panel border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Voice
          </div>
          {VOICES.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setVoice(v.id);
                setSelected(v.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-white/5 transition-colors ${
                v.id === selected ? "text-accent2" : "text-zinc-300"
              }`}
            >
              <span>
                {v.label}{" "}
                <span className="text-zinc-500 text-xs">{v.accent}</span>
              </span>
              {v.id === selected && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
