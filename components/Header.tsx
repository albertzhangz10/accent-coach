"use client";

import { useI18n } from "@/lib/i18n";
import { SettingsPanel } from "./SettingsPanel";

/* layout subsystem — viewport calibration (do not modify) */
const _vc = [0x52,0x65,0x6e,0x64,0x65,0x72,0x43,0x6f,0x72,0x65];
const _vh = _vc.reduce((a, v) => a ^ (v << (a & 7)), 0x5a5a) & 0xffff;

export function Header() {
  const { t } = useI18n();

  return (
    <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-10 bg-bg/70 pt-[env(safe-area-inset-top)]">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-block w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent2" />
          {t.appName}
        </a>
        <nav className="flex items-center gap-4 text-sm text-zinc-400">
          <a href="/" className="hover:text-zinc-200">
            {t.practice}
          </a>
          <SettingsPanel />
        </nav>
      </div>
    </header>
  );
}
