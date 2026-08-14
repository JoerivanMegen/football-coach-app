import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabaseAsync } from '@/db/database';
import { getActiveSeasonIdAsync } from '@/features/seasons/season-repository';
import { EventTypes, SignupStatuses } from '@/features/events/components/event-wizard/event-wizard-types';
import {
  EventAttendanceStatuses,
  type CoachEvent,
  type CreateEventInput,
  type EventAttendanceInput,
  type EventAttendancePlayer,
  type EventAttendanceStatus,
  type EventPlayerSignupInput,
  type UpdateEventInput,
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

type EventAttendancePlayerRow = {
  player_id: number;
  first_name: string;
  last_name: string;
  signup_status: string | null;
  is_present: number | null;
  is_late: number | null;
  minutes_played: number | null;
  match_rating: number | null;
};

export async function listEventsAsync() {
  const db = await getDatabaseAsync();
  await ensureEventStorageAsync(db);
  const seasonId = await getActiveSeasonIdAsync(db);
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
    WHERE events.season_id = ?
    GROUP BY events.id
    ORDER BY events.event_date ASC, events.start_time ASC, events.created_at ASC
  `, [seasonId]);

  return rows.map(mapEventRow);
}

export async function createEventAsync(input: CreateEventInput) {
  const db = await getDatabaseAsync();
  await ensureEventStorageAsync(db);
  const seasonId = await getActiveSeasonIdAsync(db);

  let createdEventId = 0;
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
          notes,
          season_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizeEventType(input.type),
        normalizeRequiredText(input.title, 'title'),
        normalizeRequiredText(input.eventDate, 'eventDate'),
        normalizeOptionalText(input.startTime),
        normalizeOptionalText(input.location),
        normalizeOptionalText(input.opponent),
        input.notes?.trim() ?? '',
        seasonId,
      ]
    );

    const eventId = result.lastInsertRowId;
    createdEventId = eventId;

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

  return createdEventId;
}

export async function updateEventAsync(input: UpdateEventInput) {
  const db = await getDatabaseAsync();
  await ensureEventStorageAsync(db);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        UPDATE events
        SET
          type = ?,
          title = ?,
          event_date = ?,
          start_time = ?,
          location = ?,
          opponent = ?,
          notes = ?
        WHERE id = ?
      `,
      [
        normalizeEventType(input.type),
        normalizeRequiredText(input.title, 'title'),
        normalizeRequiredText(input.eventDate, 'eventDate'),
        normalizeOptionalText(input.startTime),
        normalizeOptionalText(input.location),
        normalizeOptionalText(input.opponent),
        input.notes?.trim() ?? '',
        input.id,
      ]
    );

    await db.runAsync('DELETE FROM event_player_signups WHERE event_id = ?', [input.id]);

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
        [input.id, signup.playerId, normalizeSignupStatus(signup.signupStatus)]
      );
    }
  });
}

export async function deleteEventAsync(eventId: number) {
  const db = await getDatabaseAsync();
  await ensureEventStorageAsync(db);

  await db.runAsync('DELETE FROM events WHERE id = ?', [eventId]);
}

export async function listEventAttendancePlayersAsync(eventId: number) {
  const db = await getDatabaseAsync();
  await ensureEventStorageAsync(db);

  const rows = await db.getAllAsync<EventAttendancePlayerRow>(
    `
      SELECT
        players.id AS player_id,
        players.first_name,
        players.last_name,
        event_player_signups.signup_status,
        event_attendance.is_present,
        event_attendance.is_late,
        event_attendance.minutes_played,
        event_attendance.match_rating
      FROM players
      LEFT JOIN event_player_signups
        ON event_player_signups.player_id = players.id
       AND event_player_signups.event_id = ?
      LEFT JOIN event_attendance
        ON event_attendance.player_id = players.id
       AND event_attendance.event_id = ?
      WHERE players.is_active = 1
      ORDER BY
        CASE COALESCE(event_player_signups.signup_status, 'unknown')
          WHEN 'available' THEN 0
          WHEN 'unknown' THEN 1
          WHEN 'unavailable' THEN 2
          ELSE 3
        END,
        players.last_name COLLATE NOCASE,
        players.first_name COLLATE NOCASE
    `,
    [eventId, eventId]
  );

  return rows.map(mapAttendancePlayerRow);
}

export async function saveEventAttendanceAsync(eventId: number, attendance: EventAttendanceInput[]) {
  const db = await getDatabaseAsync();
  await ensureEventStorageAsync(db);

  await db.withTransactionAsync(async () => {
    for (const playerAttendance of attendance) {
      await db.runAsync(
        `
          INSERT INTO event_attendance (
            event_id,
            player_id,
            is_present,
            is_late,
            minutes_played,
            match_rating
          )
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(event_id, player_id)
          DO UPDATE SET
            is_present = excluded.is_present,
            is_late = excluded.is_late,
            minutes_played = excluded.minutes_played,
            match_rating = excluded.match_rating
        `,
        [
          eventId,
          playerAttendance.playerId,
          Number(playerAttendance.isPresent),
          Number(playerAttendance.isPresent && playerAttendance.isLate),
          playerAttendance.isPresent ? playerAttendance.minutesPlayed ?? null : null,
          playerAttendance.isPresent ? playerAttendance.matchRating ?? null : null,
        ]
      );
    }

    await db.runAsync(
      `
        UPDATE events
        SET attendance_status = 'marked'
        WHERE id = ?
      `,
      [eventId]
    );
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

    CREATE TABLE IF NOT EXISTS event_attendance (
      event_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      is_present INTEGER NOT NULL DEFAULT 0,
      is_late INTEGER NOT NULL DEFAULT 0,
      minutes_played INTEGER,
      match_rating INTEGER,
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
  await ensureEventAttendanceColumnAsync(db, 'minutes_played', 'INTEGER');
  await ensureEventAttendanceColumnAsync(db, 'match_rating', 'INTEGER');

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_events_event_date
      ON events (event_date);

    CREATE INDEX IF NOT EXISTS idx_events_attendance_status
      ON events (attendance_status);

    CREATE INDEX IF NOT EXISTS idx_event_player_signups_player_id
      ON event_player_signups (player_id);

    CREATE INDEX IF NOT EXISTS idx_event_attendance_player_id
      ON event_attendance (player_id);

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

function mapAttendancePlayerRow(row: EventAttendancePlayerRow): EventAttendancePlayer {
  const signupStatus = normalizeSignupStatus(row.signup_status ?? 'unknown');
  const hasSavedAttendance = row.is_present !== null;
  const isPresent = hasSavedAttendance ? row.is_present === 1 : signupStatus === 'available';

  return {
    playerId: row.player_id,
    firstName: row.first_name,
    lastName: row.last_name,
    signupStatus,
    isPresent,
    isLate: isPresent && row.is_late === 1,
    minutesPlayed: isPresent ? row.minutes_played : null,
    matchRating: isPresent ? row.match_rating : null,
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
