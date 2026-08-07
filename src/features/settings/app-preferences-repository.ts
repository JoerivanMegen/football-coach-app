import { getDatabaseAsync } from "@/db/database";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

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
