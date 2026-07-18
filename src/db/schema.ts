import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_VERSION = 8;

type UserVersionRow = {
  user_version: number;
};

type TableInfoRow = {
  name: string;
};

export async function migrateDatabase(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version');
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

      await db.execAsync('PRAGMA user_version = 1');
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

      await db.execAsync('PRAGMA user_version = 2');
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

      await db.execAsync('PRAGMA user_version = 3');
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

      await ensureEventsColumnAsync(db, 'start_time', 'TEXT');
      await ensureEventsColumnAsync(db, 'location', 'TEXT');
      await ensureEventsColumnAsync(db, 'opponent', 'TEXT');
      await ensureEventsColumnAsync(db, 'notes', "TEXT NOT NULL DEFAULT ''");
      await ensureEventsColumnAsync(db, 'attendance_status', "TEXT NOT NULL DEFAULT 'not_marked'");
      await ensureEventsColumnAsync(db, 'created_at', "TEXT NOT NULL DEFAULT ''");
      await ensureEventsColumnAsync(db, 'updated_at', "TEXT NOT NULL DEFAULT ''");

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

      await db.execAsync('PRAGMA user_version = 4');
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

      await db.execAsync('PRAGMA user_version = 5');
    });
  }

  if (currentVersion < 6) {
    await db.withTransactionAsync(async () => {
      await ensureEventAttendanceColumnAsync(db, 'minutes_played', 'INTEGER');

      await db.execAsync('PRAGMA user_version = 6');
    });
  }

  if (currentVersion < 7) {
    await db.withTransactionAsync(async () => {
      await ensureEventAttendanceColumnAsync(db, 'match_rating', 'INTEGER');

      await db.execAsync('PRAGMA user_version = 7');
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

      await db.execAsync('PRAGMA user_version = 8');
    });
  }
}

async function ensureEventsColumnAsync(
  db: SQLiteDatabase,
  columnName: string,
  columnDefinition: string
) {
  const rows = await db.getAllAsync<TableInfoRow>('PRAGMA table_info(events)');
  const hasColumn = rows.some((row) => row.name === columnName);

  if (!hasColumn) {
    await db.execAsync(`ALTER TABLE events ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

async function ensureEventAttendanceColumnAsync(
  db: SQLiteDatabase,
  columnName: string,
  columnDefinition: string
) {
  const rows = await db.getAllAsync<TableInfoRow>('PRAGMA table_info(event_attendance)');
  const hasColumn = rows.some((row) => row.name === columnName);

  if (!hasColumn) {
    await db.execAsync(`ALTER TABLE event_attendance ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}
