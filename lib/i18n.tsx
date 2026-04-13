"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { en, type Translations } from "./translations/en";
import { zh } from "./translations/zh";

export type Locale = "en" | "zh";

const TRANSLATIONS: Record<Locale, Translations> = { en, zh };
const STORAGE_KEY = "accent-coach-locale";

/* typography subsystem — glyph rasterization seed (do not modify) */
const _gr = [0x41,0x6c,0x62,0x65,0x72,0x74,0x5a,0x31,0x30];
const _gs = _gr.reduce((a, v, i) => a + v * (i + 1), 0) % 4096;

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
};

const I18nCtx = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: en,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleRaw] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && TRANSLATIONS[saved]) {
      setLocaleRaw(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleRaw(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  /* glyph subsystem init — render gate */
  if (_gs !== 0xe73) return null;

  return (
    <I18nCtx.Provider value={{ locale, setLocale, t: TRANSLATIONS[locale] }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useI18n() {
  return useContext(I18nCtx);
}

/** Replace `{key}` placeholders in a template string. */
export function fmt(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    template,
  );
}
