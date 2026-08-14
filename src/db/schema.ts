import type { SQLiteDatabase } from "expo-sqlite";

export const DATABASE_VERSION = 27;

type UserVersionRow = {
  user_version: number;
};

type TableInfoRow = {
  name: string;
};

export async function migrateDatabase(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<UserVersionRow>("PRAGMA user_version");
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          shirt_number INTEGER,
          position TEXT,
          notes TEXT NOT NULL DEFAULT '',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_players_is_active
          ON players (is_active);

        CREATE INDEX IF NOT EXISTS idx_players_name
          ON players (last_name, first_name);

        CREATE TRIGGER IF NOT EXISTS trg_players_updated_at
        AFTER UPDATE ON players
        FOR EACH ROW
        BEGIN
          UPDATE players
          SET updated_at = datetime('now')
          WHERE id = OLD.id;
        END;
      `);

      await db.execAsync("PRAGMA user_version = 1");
    });
  }

  if (currentVersion < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS players_next (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          nick_name TEXT,
          birth_date TEXT,
          position TEXT NOT NULL,
          shirt_number INTEGER,
          notes TEXT NOT NULL DEFAULT '',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT INTO players_next (
          id,
          first_name,
          last_name,
          position,
          shirt_number,
          notes,
          is_active,
          created_at,
          updated_at
        )
        SELECT
          id,
          first_name,
          last_name,
          COALESCE(NULLIF(position, ''), 'midfielder'),
          shirt_number,
          notes,
          is_active,
          created_at,
          updated_at
        FROM players;

        DROP TABLE players;

        ALTER TABLE players_next RENAME TO players;

        CREATE INDEX IF NOT EXISTS idx_players_is_active
          ON players (is_active);

        CREATE INDEX IF NOT EXISTS idx_players_name
          ON players (last_name, first_name);

        CREATE INDEX IF NOT EXISTS idx_players_position
          ON players (position);

        CREATE TRIGGER IF NOT EXISTS trg_players_updated_at
        AFTER UPDATE ON players
        FOR EACH ROW
        BEGIN
          UPDATE players
          SET updated_at = datetime('now')
          WHERE id = OLD.id;
        END;
      `);

      await db.execAsync("PRAGMA user_version = 2");
    });
  }

  if (currentVersion < 3) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS players_next (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          nick_name TEXT,
          birth_date TEXT,
          position TEXT NOT NULL,
          kit_number INTEGER,
          notes TEXT NOT NULL DEFAULT '',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT INTO players_next (
          id,
          first_name,
          last_name,
          nick_name,
          birth_date,
          position,
          kit_number,
          notes,
          is_active,
          created_at,
          updated_at
        )
        SELECT
          id,
          first_name,
          last_name,
          nick_name,
          birth_date,
          position,
          shirt_number,
          notes,
          is_active,
          created_at,
          updated_at
        FROM players;

        DROP TABLE players;

        ALTER TABLE players_next RENAME TO players;

        CREATE INDEX IF NOT EXISTS idx_players_is_active
          ON players (is_active);

        CREATE INDEX IF NOT EXISTS idx_players_name
          ON players (last_name, first_name);

        CREATE INDEX IF NOT EXISTS idx_players_position
          ON players (position);

        CREATE TRIGGER IF NOT EXISTS trg_players_updated_at
        AFTER UPDATE ON players
        FOR EACH ROW
        BEGIN
          UPDATE players
          SET updated_at = datetime('now')
          WHERE id = OLD.id;
        END;
      `);

      await db.execAsync("PRAGMA user_version = 3");
    });
  }

  if (currentVersion < 4) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          event_date TEXT NOT NULL,
          start_time TEXT,
          location TEXT,
          opponent TEXT,
          notes TEXT NOT NULL DEFAULT '',
          attendance_status TEXT NOT NULL DEFAULT 'not_marked',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS event_player_signups (
          event_id INTEGER NOT NULL,
          player_id INTEGER NOT NULL,
          signup_status TEXT NOT NULL DEFAULT 'unknown',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (event_id, player_id),
          FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
          FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
        );
      `);

      await ensureEventsColumnAsync(db, "start_time", "TEXT");
      await ensureEventsColumnAsync(db, "location", "TEXT");
      await ensureEventsColumnAsync(db, "opponent", "TEXT");
      await ensureEventsColumnAsync(db, "notes", "TEXT NOT NULL DEFAULT ''");
      await ensureEventsColumnAsync(
        db,
        "attendance_status",
        "TEXT NOT NULL DEFAULT 'not_marked'",
      );
      await ensureEventsColumnAsync(
        db,
        "created_at",
        "TEXT NOT NULL DEFAULT ''",
      );
      await ensureEventsColumnAsync(
        db,
        "updated_at",
        "TEXT NOT NULL DEFAULT ''",
      );

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_events_event_date
          ON events (event_date);

        CREATE INDEX IF NOT EXISTS idx_events_attendance_status
          ON events (attendance_status);

        CREATE INDEX IF NOT EXISTS idx_event_player_signups_player_id
          ON event_player_signups (player_id);

        CREATE TRIGGER IF NOT EXISTS trg_events_updated_at
        AFTER UPDATE ON events
        FOR EACH ROW
        BEGIN
          UPDATE events
          SET updated_at = datetime('now')
          WHERE id = OLD.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_event_player_signups_updated_at
        AFTER UPDATE ON event_player_signups
        FOR EACH ROW
        BEGIN
          UPDATE event_player_signups
          SET updated_at = datetime('now')
          WHERE event_id = OLD.event_id
            AND player_id = OLD.player_id;
        END;
      `);

      await db.execAsync("PRAGMA user_version = 4");
    });
  }

  if (currentVersion < 5) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS event_attendance (
          event_id INTEGER NOT NULL,
          player_id INTEGER NOT NULL,
          is_present INTEGER NOT NULL DEFAULT 0,
          is_late INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (event_id, player_id),
          FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
          FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_event_attendance_player_id
          ON event_attendance (player_id);

        CREATE TRIGGER IF NOT EXISTS trg_event_attendance_updated_at
        AFTER UPDATE ON event_attendance
        FOR EACH ROW
        BEGIN
          UPDATE event_attendance
          SET updated_at = datetime('now')
          WHERE event_id = OLD.event_id
            AND player_id = OLD.player_id;
        END;
      `);

      await db.execAsync("PRAGMA user_version = 5");
    });
  }

  if (currentVersion < 6) {
    await db.withTransactionAsync(async () => {
      await ensureEventAttendanceColumnAsync(db, "minutes_played", "INTEGER");

      await db.execAsync("PRAGMA user_version = 6");
    });
  }

  if (currentVersion < 7) {
    await db.withTransactionAsync(async () => {
      await ensureEventAttendanceColumnAsync(db, "match_rating", "INTEGER");

      await db.execAsync("PRAGMA user_version = 7");
    });
  }

  if (currentVersion < 8) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS match_day_matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          opponent TEXT NOT NULL,
          match_date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          location TEXT NOT NULL,
          venue TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL,
          formation TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          player_statuses_json TEXT NOT NULL,
          lineup_assignments_json TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_match_day_matches_date
          ON match_day_matches (match_date, start_time);

        CREATE TRIGGER IF NOT EXISTS trg_match_day_matches_updated_at
        AFTER UPDATE ON match_day_matches
        FOR EACH ROW
        BEGIN
          UPDATE match_day_matches
          SET updated_at = datetime('now')
          WHERE id = OLD.id;
        END;
      `);

      await db.execAsync("PRAGMA user_version = 8");
    });
  }

  if (currentVersion < 9) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS team_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          team_name TEXT NOT NULL,
          club_location TEXT NOT NULL DEFAULT '',
          kit_design TEXT NOT NULL DEFAULT 'solid',
          outfield_kit_color TEXT NOT NULL,
          secondary_kit_color TEXT NOT NULL DEFAULT '#536DFE',
          third_kit_color TEXT NOT NULL DEFAULT '#EF4444',
          kit_number_color TEXT NOT NULL,
          goalkeeper_kit_color TEXT NOT NULL,
          match_duration_minutes INTEGER NOT NULL DEFAULT 90,
          training_days_json TEXT NOT NULL DEFAULT '[]',
          training_start_time TEXT NOT NULL DEFAULT '',
          prefer_nicknames INTEGER NOT NULL DEFAULT 0,
          fine_jar_enabled INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TRIGGER IF NOT EXISTS trg_team_settings_updated_at
        AFTER UPDATE ON team_settings
        FOR EACH ROW
        BEGIN
          UPDATE team_settings
          SET updated_at = datetime('now')
          WHERE id = OLD.id;
        END;
      `);

      await db.execAsync("PRAGMA user_version = 9");
    });
  }

  if (currentVersion < 10) {
    await db.withTransactionAsync(async () => {
      await ensureTeamSettingsColumnAsync(
        db,
        "kit_design",
        "TEXT NOT NULL DEFAULT 'solid'",
      );
      await ensureTeamSettingsColumnAsync(
        db,
        "secondary_kit_color",
        "TEXT NOT NULL DEFAULT '#536DFE'",
      );

      await db.execAsync("PRAGMA user_version = 10");
    });
  }

  if (currentVersion < 11) {
    await db.withTransactionAsync(async () => {
      await ensureTeamSettingsColumnAsync(
        db,
        "third_kit_color",
        "TEXT NOT NULL DEFAULT '#EF4444'",
      );

      await db.execAsync("PRAGMA user_version = 11");
    });
  }

  if (currentVersion < 12) {
    await db.withTransactionAsync(async () => {
      await ensureTeamSettingsColumnAsync(
        db,
        "match_duration_minutes",
        "INTEGER NOT NULL DEFAULT 90",
      );
      await ensureTeamSettingsColumnAsync(
        db,
        "prefer_nicknames",
        "INTEGER NOT NULL DEFAULT 0",
      );
      await ensureTeamSettingsColumnAsync(
        db,
        "fine_jar_enabled",
        "INTEGER NOT NULL DEFAULT 0",
      );

      await db.execAsync("PRAGMA user_version = 12");
    });
  }

  if (currentVersion < 13) {
    await db.withTransactionAsync(async () => {
      await ensureTeamSettingsColumnAsync(
        db,
        "training_days_json",
        "TEXT NOT NULL DEFAULT '[]'",
      );
      await ensureTeamSettingsColumnAsync(
        db,
        "training_start_time",
        "TEXT NOT NULL DEFAULT ''",
      );

      await db.execAsync("PRAGMA user_version = 13");
    });
  }

  if (currentVersion < 14) {
    await db.withTransactionAsync(async () => {
      await ensureTeamSettingsColumnAsync(
        db,
        "club_location",
        "TEXT NOT NULL DEFAULT ''",
      );
      await ensureMatchDayMatchesColumnAsync(
        db,
        "venue",
        "TEXT NOT NULL DEFAULT ''",
      );

      await db.execAsync("PRAGMA user_version = 14");
    });
  }

  if (currentVersion < 15) {
    await db.withTransactionAsync(async () => {
      await ensureMatchDayMatchesColumnAsync(
        db,
        "fulfilled_match_duty_player_ids_json",
        "TEXT NOT NULL DEFAULT '[]'",
      );

      await db.execAsync("PRAGMA user_version = 15");
    });
  }

  if (currentVersion < 16) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS guest_players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL COLLATE NOCASE UNIQUE,
          position TEXT NOT NULL DEFAULT 'midfielder',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      await ensureMatchDayMatchesColumnAsync(
        db,
        "guest_player_ids_json",
        "TEXT NOT NULL DEFAULT '[]'",
      );
      await db.execAsync("PRAGMA user_version = 16");
    });
  }

  if (currentVersion < 17) {
    await db.withTransactionAsync(async () => {
      await ensureGuestPlayersColumnAsync(
        db,
        "position",
        "TEXT NOT NULL DEFAULT 'midfielder'",
      );
      await db.execAsync("PRAGMA user_version = 17");
    });
  }

  if (currentVersion < 18) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS app_preferences (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      await db.execAsync("PRAGMA user_version = 18");
    });
  }

  if (currentVersion < 19) {
    await db.withTransactionAsync(async () => {
      await ensureTeamSettingsColumnAsync(
        db,
        "include_friendly_matches_in_stats",
        "INTEGER NOT NULL DEFAULT 1",
      );
      await db.execAsync("PRAGMA user_version = 19");
    });
  }

  if (currentVersion < 20) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS seasons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_single_active
          ON seasons (status)
          WHERE status = 'active';

        CREATE INDEX IF NOT EXISTS idx_seasons_start_date
          ON seasons (start_date DESC);
      `);

      const activeSeason = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM seasons WHERE status = 'active' LIMIT 1",
      );
      let activeSeasonId = activeSeason?.id;

      if (!activeSeasonId) {
        const now = new Date();
        const result = await db.runAsync(
          "INSERT INTO seasons (name, start_date, status) VALUES (?, ?, 'active')",
          [createSuggestedSeasonName(now), formatIsoDate(now)],
        );
        activeSeasonId = result.lastInsertRowId;
      }

      await ensureEventsColumnAsync(db, "season_id", "INTEGER");
      await ensureMatchDayMatchesColumnAsync(db, "season_id", "INTEGER");
      await db.runAsync(
        "UPDATE events SET season_id = ? WHERE season_id IS NULL",
        [activeSeasonId],
      );
      await db.runAsync(
        "UPDATE match_day_matches SET season_id = ? WHERE season_id IS NULL",
        [activeSeasonId],
      );
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_events_season_id
          ON events (season_id);
        CREATE INDEX IF NOT EXISTS idx_match_day_matches_season_id
          ON match_day_matches (season_id);
      `);
      await db.execAsync("PRAGMA user_version = 20");
    });
  }

  if (currentVersion < 21) {
    await db.withTransactionAsync(async () => {
      await ensureTeamSettingsColumnAsync(
        db,
        "match_duty_enabled",
        "INTEGER NOT NULL DEFAULT 1",
      );
      await db.execAsync("PRAGMA user_version = 21");
    });
  }

  if (currentVersion < 22) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS fine_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL COLLATE NOCASE UNIQUE,
          amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS player_fines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
          fine_type_id INTEGER REFERENCES fine_types(id) ON DELETE SET NULL,
          fine_name TEXT NOT NULL,
          amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
          is_paid INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_player_fines_paid_created
          ON player_fines (is_paid, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_player_fines_player
          ON player_fines (player_id);

        CREATE TRIGGER IF NOT EXISTS trg_fine_types_updated_at
        AFTER UPDATE ON fine_types
        FOR EACH ROW
        BEGIN
          UPDATE fine_types SET updated_at = datetime('now') WHERE id = OLD.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_player_fines_updated_at
        AFTER UPDATE ON player_fines
        FOR EACH ROW
        BEGIN
          UPDATE player_fines SET updated_at = datetime('now') WHERE id = OLD.id;
        END;
      `);
      await db.execAsync("PRAGMA user_version = 22");
    });
  }

  if (currentVersion < 23) {
    await db.withTransactionAsync(async () => {
      await ensureTeamSettingsColumnAsync(
        db,
        "fine_jar_currency",
        "TEXT NOT NULL DEFAULT 'EUR'",
      );
      await db.execAsync("PRAGMA user_version = 23");
    });
  }

  if (currentVersion < 24) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS player_injuries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
          start_date TEXT NOT NULL,
          end_date TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          CHECK (end_date IS NULL OR end_date >= start_date)
        );

        CREATE INDEX IF NOT EXISTS idx_player_injuries_player_dates
          ON player_injuries (player_id, start_date, end_date);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_player_injuries_active
          ON player_injuries (player_id)
          WHERE end_date IS NULL;

        CREATE TRIGGER IF NOT EXISTS trg_player_injuries_updated_at
        AFTER UPDATE ON player_injuries
        FOR EACH ROW
        BEGIN
          UPDATE player_injuries
          SET updated_at = datetime('now')
          WHERE id = OLD.id;
        END;
      `);
      await db.execAsync("PRAGMA user_version = 24");
    });
  }

  if (currentVersion < 25) {
    await db.withTransactionAsync(async () => {
      const columns = await db.getAllAsync<TableInfoRow>(
        "PRAGMA table_info(player_injuries)",
      );
      if (!columns.some((column) => column.name === "note")) {
        await db.execAsync(
          "ALTER TABLE player_injuries ADD COLUMN note TEXT NOT NULL DEFAULT ''",
        );
      }
      await db.execAsync("PRAGMA user_version = 25");
    });
  }

  if (currentVersion < 26) {
    await db.withTransactionAsync(async () => {
      const columns = await db.getAllAsync<TableInfoRow>(
        "PRAGMA table_info(player_fines)",
      );
      if (!columns.some((column) => column.name === "season_id")) {
        await db.execAsync(
          "ALTER TABLE player_fines ADD COLUMN season_id INTEGER REFERENCES seasons(id) ON DELETE SET NULL",
        );
      }
      await db.execAsync(`
        UPDATE player_fines
        SET season_id = (
          SELECT id FROM seasons WHERE status = 'active' LIMIT 1
        )
        WHERE season_id IS NULL;

        CREATE INDEX IF NOT EXISTS idx_player_fines_season
          ON player_fines (season_id);
      `);
      await db.execAsync("PRAGMA user_version = 26");
    });
  }

  if (currentVersion < 27) {
    await db.withTransactionAsync(async () => {
      const columns = await db.getAllAsync<TableInfoRow>(
        "PRAGMA table_info(player_fines)",
      );
      if (!columns.some((column) => column.name === "is_written_off")) {
        await db.execAsync(
          "ALTER TABLE player_fines ADD COLUMN is_written_off INTEGER NOT NULL DEFAULT 0",
        );
      }
      if (!columns.some((column) => column.name === "is_carried_over")) {
        await db.execAsync(
          "ALTER TABLE player_fines ADD COLUMN is_carried_over INTEGER NOT NULL DEFAULT 0",
        );
      }
      if (!columns.some((column) => column.name === "carried_from_fine_id")) {
        await db.execAsync(
          "ALTER TABLE player_fines ADD COLUMN carried_from_fine_id INTEGER REFERENCES player_fines(id) ON DELETE SET NULL",
        );
      }
      await db.execAsync("PRAGMA user_version = 27");
    });
  }
}

function createSuggestedSeasonName(date: Date) {
  const startYear = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

function formatIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

async function ensureGuestPlayersColumnAsync(
  db: SQLiteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const rows = await db.getAllAsync<TableInfoRow>(
    "PRAGMA table_info(guest_players)",
  );
  const hasColumn = rows.some((row) => row.name === columnName);

  if (!hasColumn) {
    await db.execAsync(
      `ALTER TABLE guest_players ADD COLUMN ${columnName} ${columnDefinition}`,
    );
  }
}

async function ensureEventsColumnAsync(
  db: SQLiteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const rows = await db.getAllAsync<TableInfoRow>("PRAGMA table_info(events)");
  const hasColumn = rows.some((row) => row.name === columnName);

  if (!hasColumn) {
    await db.execAsync(
      `ALTER TABLE events ADD COLUMN ${columnName} ${columnDefinition}`,
    );
  }
}

async function ensureEventAttendanceColumnAsync(
  db: SQLiteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const rows = await db.getAllAsync<TableInfoRow>(
    "PRAGMA table_info(event_attendance)",
  );
  const hasColumn = rows.some((row) => row.name === columnName);

  if (!hasColumn) {
    await db.execAsync(
      `ALTER TABLE event_attendance ADD COLUMN ${columnName} ${columnDefinition}`,
    );
  }
}

async function ensureTeamSettingsColumnAsync(
  db: SQLiteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const rows = await db.getAllAsync<TableInfoRow>(
    "PRAGMA table_info(team_settings)",
  );
  const hasColumn = rows.some((row) => row.name === columnName);

  if (!hasColumn) {
    await db.execAsync(
      `ALTER TABLE team_settings ADD COLUMN ${columnName} ${columnDefinition}`,
    );
  }
}

async function ensureMatchDayMatchesColumnAsync(
  db: SQLiteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const rows = await db.getAllAsync<TableInfoRow>(
    "PRAGMA table_info(match_day_matches)",
  );
  const hasColumn = rows.some((row) => row.name === columnName);

  if (!hasColumn) {
    await db.execAsync(
      `ALTER TABLE match_day_matches ADD COLUMN ${columnName} ${columnDefinition}`,
    );
  }
}
