import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  backupDatabaseAsync,
  deserializeDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";

import { getDatabaseAsync } from "@/db/database";
import { DATABASE_VERSION, migrateDatabase } from "@/db/schema";

type IntegrityCheckRow = {
  quick_check: string;
};

type TableRow = {
  name: string;
};

type UserVersionRow = {
  user_version: number;
};

export class InvalidBackupError extends Error {
  constructor(message = "This is not a valid Assistant Coach backup file.") {
    super(message);
    this.name = "InvalidBackupError";
  }
}

export async function exportDatabaseBackupAsync() {
  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    throw new Error("File sharing is not available on this device.");
  }

  const database = await getDatabaseAsync();
  const serializedDatabase = await database.serializeAsync();
  const fileName = createBackupFileName(new Date());
  const backupFile = new File(Paths.cache, fileName);

  try {
    backupFile.create({ overwrite: true });
    backupFile.write(serializedDatabase);

    await Sharing.shareAsync(backupFile.uri, {
      dialogTitle: "Save Assistant Coach backup",
      mimeType: "application/vnd.sqlite3",
      UTI: "public.database",
    });

    return fileName;
  } finally {
    if (backupFile.exists) {
      backupFile.delete();
    }
  }
}

export async function restoreDatabaseBackupAsync(fileUri: string) {
  const backupFile = new File(fileUri);
  const serializedBackup = new Uint8Array(await backupFile.arrayBuffer());

  if (serializedBackup.byteLength === 0) {
    throw new InvalidBackupError("The selected backup file is empty.");
  }

  let importedDatabase: SQLiteDatabase | null = null;
  let rollbackDatabase: SQLiteDatabase | null = null;
  let replacementStarted = false;

  try {
    try {
      importedDatabase = await deserializeDatabaseAsync(serializedBackup);
      await validateBackupDatabaseAsync(importedDatabase);
      await migrateDatabase(importedDatabase);
    } catch (error) {
      if (error instanceof InvalidBackupError) {
        throw error;
      }

      throw new InvalidBackupError();
    }

    const liveDatabase = await getDatabaseAsync();
    const currentDatabaseBackup = await liveDatabase.serializeAsync();
    rollbackDatabase = await deserializeDatabaseAsync(currentDatabaseBackup);

    replacementStarted = true;
    await backupDatabaseAsync({
      sourceDatabase: importedDatabase,
      destDatabase: liveDatabase,
    });
    await liveDatabase.execAsync("PRAGMA foreign_keys = ON");

    const restoredIntegrity =
      await liveDatabase.getFirstAsync<IntegrityCheckRow>("PRAGMA quick_check");

    if (restoredIntegrity?.quick_check !== "ok") {
      throw new Error("The restored database failed its integrity check.");
    }
  } catch (error) {
    if (replacementStarted && rollbackDatabase) {
      const liveDatabase = await getDatabaseAsync();
      await backupDatabaseAsync({
        sourceDatabase: rollbackDatabase,
        destDatabase: liveDatabase,
      });
      await liveDatabase.execAsync("PRAGMA foreign_keys = ON");
    }

    throw error;
  } finally {
    await importedDatabase?.closeAsync();
    await rollbackDatabase?.closeAsync();
  }
}

async function validateBackupDatabaseAsync(database: SQLiteDatabase) {
  const integrity =
    await database.getFirstAsync<IntegrityCheckRow>("PRAGMA quick_check");

  if (integrity?.quick_check !== "ok") {
    throw new InvalidBackupError("The selected backup file is damaged.");
  }

  const version =
    await database.getFirstAsync<UserVersionRow>("PRAGMA user_version");

  if (!version || version.user_version < 1) {
    throw new InvalidBackupError();
  }

  if (version.user_version > DATABASE_VERSION) {
    throw new InvalidBackupError(
      "This backup was created by a newer version of Assistant Coach. Update the app before restoring it.",
    );
  }

  const playersTable = await database.getFirstAsync<TableRow>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'players'",
  );

  if (!playersTable) {
    throw new InvalidBackupError();
  }
}

function createBackupFileName(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `assistant-coach-backup-${year}-${month}-${day}-${hours}${minutes}.sqlite3`;
}
