import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrateDatabase } from '@/db/schema';

const DATABASE_NAME = 'football-coach.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export function getDatabaseAsync() {
  databasePromise ??= openAndMigrateDatabaseAsync();
  return databasePromise;
}

async function openAndMigrateDatabaseAsync() {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON');
  await migrateDatabase(db);
  return db;
}
