import { getDatabaseAsync } from "@/db/database";
import { APP_LOCALES, DEFAULT_LOCALE, type AppLocale } from "@/i18n/locales";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";
const APP_LOCALE_KEY = "app_locale";

export async function hasCompletedOnboardingAsync() {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_preferences WHERE key = ?",
    ONBOARDING_COMPLETED_KEY,
  );

  return row?.value === "true";
}

export async function setOnboardingCompletedAsync(isCompleted: boolean) {
  const db = await getDatabaseAsync();

  await db.runAsync(
    `
      INSERT INTO app_preferences (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    ONBOARDING_COMPLETED_KEY,
    String(isCompleted),
  );
}

export async function getAppLocaleAsync(): Promise<AppLocale> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_preferences WHERE key = ?",
    APP_LOCALE_KEY,
  );
  return APP_LOCALES.includes(row?.value as AppLocale)
    ? (row?.value as AppLocale)
    : DEFAULT_LOCALE;
}

export async function hasSelectedAppLocaleAsync() {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_preferences WHERE key = ?",
    APP_LOCALE_KEY,
  );
  return APP_LOCALES.includes(row?.value as AppLocale);
}

export async function setAppLocaleAsync(locale: AppLocale) {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT INTO app_preferences (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [APP_LOCALE_KEY, locale],
  );
}
