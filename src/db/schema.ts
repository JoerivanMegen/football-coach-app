import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_VERSION = 3;

type UserVersionRow = {
  user_version: number;
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
}
