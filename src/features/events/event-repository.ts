import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabaseAsync } from '@/db/database';
import { EventTypes, SignupStatuses } from '@/features/events/components/event-wizard/event-wizard-types';
import {
  EventAttendanceStatuses,
  type CoachEvent,
  type CreateEventInput,
  type EventAttendanceStatus,
  type EventPlayerSignupInput,
} from '@/features/events/event-types';

type EventRow = {
  id: number;
  type: string;
  title: string;
  event_date: string;
  start_time: string | null;
  location: string | null;
  opponent: string | null;
  notes: string;
  attendance_status: string;
  available_count: number;
  unavailable_count: number;
  unknown_count: number;
  created_at: string;
  updated_at: string;
};

type TableInfoRow = {
  name: string;
};

export async function listEventsAsync() {
  const db = await getDatabaseAsync();
  await ensureEventStorageAsync(db);
  const rows = await db.getAllAsync<EventRow>(`
    SELECT
      events.*,
      COALESCE(SUM(CASE WHEN event_player_signups.signup_status = 'available' THEN 1 ELSE 0 END), 0)
        AS available_count,
      COALESCE(SUM(CASE WHEN event_player_signups.signup_status = 'unavailable' THEN 1 ELSE 0 END), 0)
        AS unavailable_count,
      COALESCE(SUM(CASE WHEN event_player_signups.signup_status = 'unknown' THEN 1 ELSE 0 END), 0)
        AS unknown_count
    FROM events
    LEFT JOIN event_player_signups
      ON event_player_signups.event_id = events.id
    GROUP BY events.id
    ORDER BY events.event_date ASC, events.start_time ASC, events.created_at ASC
  `);

  return rows.map(mapEventRow);
}

export async function createEventAsync(input: CreateEventInput) {
  const db = await getDatabaseAsync();
  await ensureEventStorageAsync(db);

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `
        INSERT INTO events (
          type,
          title,
          event_date,
          start_time,
          location,
          opponent,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizeEventType(input.type),
        normalizeRequiredText(input.title, 'title'),
        normalizeRequiredText(input.eventDate, 'eventDate'),
        normalizeOptionalText(input.startTime),
        normalizeOptionalText(input.location),
        normalizeOptionalText(input.opponent),
        input.notes?.trim() ?? '',
      ]
    );

    const eventId = result.lastInsertRowId;

    for (const signup of input.playerSignups ?? []) {
      await db.runAsync(
        `
          INSERT INTO event_player_signups (
            event_id,
            player_id,
            signup_status
          )
          VALUES (?, ?, ?)
        `,
        [eventId, signup.playerId, normalizeSignupStatus(signup.signupStatus)]
      );
    }

  });
}

async function ensureEventStorageAsync(db: SQLiteDatabase) {
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

    PRAGMA user_version = 4;
  `);
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

function mapEventRow(row: EventRow): CoachEvent {
  return {
    id: row.id,
    type: normalizeEventType(row.type),
    title: row.title,
    eventDate: row.event_date,
    startTime: row.start_time,
    location: row.location,
    opponent: row.opponent,
    notes: row.notes,
    attendanceStatus: normalizeAttendanceStatus(row.attendance_status),
    availableCount: row.available_count,
    unavailableCount: row.unavailable_count,
    unknownCount: row.unknown_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRequiredText(value: string, fieldName: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeEventType(value: string) {
  if (EventTypes.includes(value as CoachEvent['type'])) {
    return value as CoachEvent['type'];
  }

  throw new Error(`Unsupported event type: ${value}`);
}

function normalizeSignupStatus(value: string) {
  if (SignupStatuses.includes(value as EventPlayerSignupInput['signupStatus'])) {
    return value as EventPlayerSignupInput['signupStatus'];
  }

  throw new Error(`Unsupported signup status: ${value}`);
}

function normalizeAttendanceStatus(value: string): EventAttendanceStatus {
  if (EventAttendanceStatuses.includes(value as EventAttendanceStatus)) {
    return value as EventAttendanceStatus;
  }

  throw new Error(`Unsupported attendance status: ${value}`);
}
