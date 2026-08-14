import { getDatabaseAsync } from "@/db/database";

export async function clearAllUserDataAsync() {
  const db = await getDatabaseAsync();
  const now = new Date();
  const seasonName = createSuggestedSeasonName(now);
  const seasonStartDate = formatIsoDate(now);

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM player_fines;
      DELETE FROM fine_types;
      DELETE FROM event_attendance;
      DELETE FROM event_player_signups;
      DELETE FROM events;
      DELETE FROM match_day_matches;
      DELETE FROM guest_players;
      DELETE FROM player_injuries;
      DELETE FROM players;
      DELETE FROM team_settings;
      DELETE FROM app_preferences;
      DELETE FROM seasons WHERE status = 'ended';
    `);
    await db.runAsync(
      `UPDATE seasons
       SET name = ?, start_date = ?, end_date = NULL, updated_at = datetime('now')
       WHERE status = 'active'`,
      [seasonName, seasonStartDate],
    );
  });
}

function createSuggestedSeasonName(date: Date) {
  const startYear =
    date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

function formatIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
