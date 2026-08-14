import { getDatabaseAsync } from "@/db/database";
import type {
  KitDesign,
  FineJarCurrency,
  SaveTeamSettingsInput,
  TeamSettings,
  TrainingDay,
} from "@/features/settings/team-settings-types";
import {
  KIT_DESIGNS,
  TRAINING_DAYS,
} from "@/features/settings/team-settings-types";

type TeamSettingsRow = {
  id: 1;
  team_name: string;
  club_location: string;
  kit_design: string;
  outfield_kit_color: string;
  secondary_kit_color: string;
  third_kit_color: string;
  kit_number_color: string;
  goalkeeper_kit_color: string;
  match_duration_minutes: number;
  training_days_json: string;
  training_start_time: string;
  prefer_nicknames: number;
  fine_jar_enabled: number;
  fine_jar_currency: string;
  match_duty_enabled: number;
  include_friendly_matches_in_stats: number;
  created_at: string;
  updated_at: string;
};

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

type TeamSettingsChangeListener = (settings: TeamSettings) => void;

const teamSettingsChangeListeners = new Set<TeamSettingsChangeListener>();

export function subscribeToTeamSettingsChanges(
  listener: TeamSettingsChangeListener,
) {
  teamSettingsChangeListeners.add(listener);

  return () => {
    teamSettingsChangeListeners.delete(listener);
  };
}

function notifyTeamSettingsChanged(settings: TeamSettings) {
  teamSettingsChangeListeners.forEach((listener) => listener(settings));
}

export async function getTeamSettingsAsync() {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<TeamSettingsRow>(
    "SELECT * FROM team_settings WHERE id = 1",
  );

  return row ? mapTeamSettingsRow(row) : null;
}

export async function saveTeamSettingsAsync(input: SaveTeamSettingsInput) {
  const db = await getDatabaseAsync();
  const normalizedInput = normalizeTeamSettingsInput(input);

  await db.runAsync(
    `
      INSERT INTO team_settings (
        id,
        team_name,
        club_location,
        kit_design,
        outfield_kit_color,
        secondary_kit_color,
        third_kit_color,
        kit_number_color,
        goalkeeper_kit_color,
        match_duration_minutes,
        training_days_json,
        training_start_time,
        prefer_nicknames,
        fine_jar_enabled,
        fine_jar_currency,
        match_duty_enabled,
        include_friendly_matches_in_stats
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        team_name = excluded.team_name,
        club_location = excluded.club_location,
        kit_design = excluded.kit_design,
        outfield_kit_color = excluded.outfield_kit_color,
        secondary_kit_color = excluded.secondary_kit_color,
        third_kit_color = excluded.third_kit_color,
        kit_number_color = excluded.kit_number_color,
        goalkeeper_kit_color = excluded.goalkeeper_kit_color,
        match_duration_minutes = excluded.match_duration_minutes,
        training_days_json = excluded.training_days_json,
        training_start_time = excluded.training_start_time,
        prefer_nicknames = excluded.prefer_nicknames,
        fine_jar_enabled = excluded.fine_jar_enabled,
        fine_jar_currency = excluded.fine_jar_currency,
        match_duty_enabled = excluded.match_duty_enabled,
        include_friendly_matches_in_stats = excluded.include_friendly_matches_in_stats
    `,
    [
      normalizedInput.teamName,
      normalizedInput.clubLocation,
      normalizedInput.kitDesign,
      normalizedInput.outfieldKitColor,
      normalizedInput.secondaryKitColor,
      normalizedInput.thirdKitColor,
      normalizedInput.kitNumberColor,
      normalizedInput.goalkeeperKitColor,
      normalizedInput.matchDurationMinutes,
      JSON.stringify(normalizedInput.trainingDays),
      normalizedInput.trainingStartTime,
      normalizedInput.preferNicknames ? 1 : 0,
      normalizedInput.fineJarEnabled ? 1 : 0,
      normalizedInput.fineJarCurrency,
      normalizedInput.matchDutyEnabled ? 1 : 0,
      normalizedInput.includeFriendlyMatchesInStats ? 1 : 0,
    ],
  );

  const savedSettings = await getTeamSettingsAsync();

  if (savedSettings) {
    notifyTeamSettingsChanged(savedSettings);
  }

  return savedSettings;
}

function normalizeTeamSettingsInput(
  input: SaveTeamSettingsInput,
): SaveTeamSettingsInput {
  return {
    teamName: normalizeRequiredText(input.teamName, "teamName"),
    clubLocation: input.clubLocation.trim(),
    kitDesign: normalizeKitDesign(input.kitDesign),
    outfieldKitColor: normalizeHexColor(
      input.outfieldKitColor,
      "outfieldKitColor",
    ),
    secondaryKitColor: normalizeHexColor(
      input.secondaryKitColor,
      "secondaryKitColor",
    ),
    thirdKitColor: normalizeHexColor(input.thirdKitColor, "thirdKitColor"),
    kitNumberColor: normalizeHexColor(input.kitNumberColor, "kitNumberColor"),
    goalkeeperKitColor: normalizeHexColor(
      input.goalkeeperKitColor,
      "goalkeeperKitColor",
    ),
    matchDurationMinutes: normalizeMatchDurationMinutes(
      input.matchDurationMinutes,
    ),
    trainingDays: normalizeTrainingDays(input.trainingDays),
    trainingStartTime: normalizeTrainingStartTime(input.trainingStartTime),
    preferNicknames: Boolean(input.preferNicknames),
    fineJarEnabled: Boolean(input.fineJarEnabled),
    fineJarCurrency: normalizeFineJarCurrency(input.fineJarCurrency),
    matchDutyEnabled: Boolean(input.matchDutyEnabled),
    includeFriendlyMatchesInStats: Boolean(
      input.includeFriendlyMatchesInStats,
    ),
  };
}

function normalizeKitDesign(value: string): KitDesign {
  if (KIT_DESIGNS.includes(value as KitDesign)) {
    return value as KitDesign;
  }

  return "solid";
}

function normalizeFineJarCurrency(value: string): FineJarCurrency {
  if (value === "GBP" || value === "USD") return value;
  return "EUR";
}

function normalizeRequiredText(value: string, fieldName: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeHexColor(value: string, fieldName: string) {
  const normalizedValue = value.trim();

  if (!HEX_COLOR_PATTERN.test(normalizedValue)) {
    throw new Error(`${fieldName} must be a valid hex color.`);
  }

  return normalizedValue.toUpperCase();
}

function normalizeMatchDurationMinutes(value: number) {
  if (!Number.isFinite(value)) {
    return 90;
  }

  return Math.min(Math.max(Math.round(value), 1), 120);
}

function normalizeTrainingDays(value: TrainingDay[]) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter((day): day is TrainingDay =>
        TRAINING_DAYS.includes(day as TrainingDay),
      ),
    ),
  );
}

function normalizeTrainingStartTime(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return "";
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(normalizedValue)) {
    throw new Error("trainingStartTime must use HH:MM format.");
  }

  return normalizedValue;
}

function parseTrainingDays(value: string) {
  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (Array.isArray(parsedValue)) {
      return normalizeTrainingDays(parsedValue as TrainingDay[]);
    }
  } catch {
    // Fall through to an empty list for old or corrupted local settings.
  }

  return [];
}

function mapTeamSettingsRow(row: TeamSettingsRow): TeamSettings {
  return {
    id: row.id,
    teamName: row.team_name,
    clubLocation: row.club_location ?? "",
    kitDesign: normalizeKitDesign(row.kit_design),
    outfieldKitColor: row.outfield_kit_color,
    secondaryKitColor: row.secondary_kit_color,
    thirdKitColor: row.third_kit_color,
    kitNumberColor: row.kit_number_color,
    goalkeeperKitColor: row.goalkeeper_kit_color,
    matchDurationMinutes: normalizeMatchDurationMinutes(
      row.match_duration_minutes,
    ),
    trainingDays: parseTrainingDays(row.training_days_json),
    trainingStartTime: normalizeTrainingStartTime(
      row.training_start_time ?? "",
    ),
    preferNicknames: row.prefer_nicknames === 1,
    fineJarEnabled: row.fine_jar_enabled === 1,
    fineJarCurrency: normalizeFineJarCurrency(row.fine_jar_currency),
    matchDutyEnabled: row.match_duty_enabled === 1,
    includeFriendlyMatchesInStats:
      row.include_friendly_matches_in_stats === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
