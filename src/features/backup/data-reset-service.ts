import { getDatabaseAsync } from "@/db/database";

export async function clearAllUserDataAsync() {
  const db = await getDatabaseAsync();

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM event_attendance;
      DELETE FROM event_player_signups;
      DELETE FROM events;
      DELETE FROM match_day_matches;
      DELETE FROM guest_players;
      DELETE FROM players;
      DELETE FROM team_settings;
      DELETE FROM app_preferences;
      DELETE FROM seasons WHERE status = 'ended';
      UPDATE seasons
      SET start_date = date('now'), end_date = NULL, updated_at = datetime('now')
      WHERE status = 'active';
    `);
  });
}
