"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n, type Locale } from "@/lib/i18n";
import { getSelectedVoice, setVoice } from "@/lib/webTts";

const LANGUAGES: { id: Locale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
];

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

export function SettingsPanel() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("en-US-JennyNeural");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedVoice(getSelectedVoice());
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

  return (
    <div className="relative" ref={ref}>
      {/* Gear icon */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center hover:text-zinc-200 transition-colors p-1"
        aria-label="Settings"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-panel border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Language section */}
          <div className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            {t.language}
          </div>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setLocale(lang.id)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-white/5 transition-colors ${
                lang.id === locale ? "text-accent2" : "text-zinc-300"
              }`}
            >
              <span>{lang.label}</span>
              {lang.id === locale && <Check />}
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-border/50 my-1" />

          {/* Voice section */}
          <div className="px-3 pt-1.5 pb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            {t.referenceVoice}
          </div>
          <div className="max-h-52 overflow-y-auto">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setVoice(v.id);
                  setSelectedVoice(v.id);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-white/5 transition-colors ${
                  v.id === selectedVoice ? "text-accent2" : "text-zinc-300"
                }`}
              >
                <span>
                  {v.label}{" "}
                  <span className="text-zinc-500 text-xs">{v.accent}</span>
                </span>
                {v.id === selectedVoice && <Check />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}
