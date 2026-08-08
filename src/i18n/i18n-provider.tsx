import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getAppLocaleAsync, setAppLocaleAsync } from "@/features/settings/app-preferences-repository";
import { translations, type TranslationKey } from "@/i18n/generated/translations";
import { DEFAULT_LOCALE, type AppLocale } from "@/i18n/locales";

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    void getAppLocaleAsync().then(setLocaleState).catch((error: unknown) => {
      console.warn("Could not load app language", error);
    });
  }, []);

  const setLocale = useCallback(async (nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    await setAppLocaleAsync(nextLocale);
  }, []);

  const t = useCallback((key: TranslationKey, values?: Record<string, string | number>) => {
    const dictionary = translations[locale] as unknown as Record<string, unknown>;
    const translated = key.split(".").reduce<unknown>(
      (current, segment) => current && typeof current === "object"
        ? (current as Record<string, unknown>)[segment]
        : undefined,
      dictionary,
    );
    const text = typeof translated === "string" ? translated : key;
    return Object.entries(values ?? {}).reduce(
      (result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)),
      text,
    );
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider.");
  return context;
}
