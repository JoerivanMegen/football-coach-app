import { reloadAppAsync } from "expo";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { StepperArrowButton } from "@/components/stepper-arrow-button";
import {
  AppHeaderHeight,
  BottomTabInset,
  MaxContentWidth,
  PageTopPadding,
  Spacing,
} from "@/constants/theme";
import {
  exportDatabaseBackupAsync,
  InvalidBackupError,
  restoreDatabaseBackupAsync,
} from "@/features/backup/backup-service";
import { clearAllUserDataAsync } from "@/features/backup/data-reset-service";
import { setOnboardingCompletedAsync } from "@/features/settings/app-preferences-repository";
import {
  getTeamSettingsAsync,
  saveTeamSettingsAsync,
} from "@/features/settings/team-settings-repository";
import type {
  KitDesign,
  SaveTeamSettingsInput,
  TrainingDay,
} from "@/features/settings/team-settings-types";
import { TRAINING_DAYS } from "@/features/settings/team-settings-types";
import {
  endActiveSeasonAsync,
  getActiveSeasonAsync,
  getSeasonCompletionStatusAsync,
  listEndedSeasonsAsync,
  updateSeasonNameAsync,
} from "@/features/seasons/season-repository";
import type { Season } from "@/features/seasons/season-types";
import { useTheme } from "@/hooks/use-theme";
import { useScrollToTopOnFocus } from "@/hooks/use-scroll-to-top-on-focus";
import {
  cancelAllAssistantCoachNotificationsAsync,
  scheduleMatchResultReminderAsync,
} from "@/features/notifications/match-result-notifications";
import { listMatchDayMatchesAsync } from "@/features/match-day/match-day-repository";

const defaultTeamSettingsForm: SaveTeamSettingsInput = {
  teamName: "",
  clubLocation: "",
  kitDesign: "solid",
  outfieldKitColor: "#FFFFFF",
  secondaryKitColor: "#536DFE",
  thirdKitColor: "#EF4444",
  kitNumberColor: "#111827",
  goalkeeperKitColor: "#111827",
  matchDurationMinutes: 90,
  trainingDays: [],
  trainingStartTime: "",
  preferNicknames: true,
  fineJarEnabled: false,
  matchDutyEnabled: true,
  includeFriendlyMatchesInStats: true,
};

const kitShirtPath =
  "M34 7 C38 11 62 11 66 7 L76 7 L95 25 Q98 27 96 31 L87 47 Q85 51 81 49 L73 44 L73 83 Q73 87 69 87 L31 87 Q27 87 27 83 L27 44 L19 49 Q15 51 13 47 L4 31 Q2 27 5 25 L24 7 Z";

const kitDesignOptions = [
  { value: "solid", label: "Regular" },
  { value: "stripes", label: "Stripes" },
  { value: "twoColorStripes", label: "Three colour stripes" },
  { value: "hoops", label: "Hoops" },
  { value: "sash", label: "Two colour sash" },
  { value: "halves", label: "Halves" },
  { value: "sides", label: "Sides" },
] satisfies { value: KitDesign; label: string }[];

const colorOptions = [
  "#FFFFFF",
  "#111827",
  "#1C7C54",
  "#536DFE",
  "#9333EA",
  "#38BDF8",
  "#FF7A1A",
  "#EF4444",
  "#7F1D1D",
  "#FACC15",
] as const;

const trainingDayLabels = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
} satisfies Record<TrainingDay, string>;

export default function SettingsScreen() {
  const scrollViewRef = useScrollToTopOnFocus();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const [form, setForm] = useState<SaveTeamSettingsInput>(
    defaultTeamSettingsForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isOpeningTutorial, setIsOpeningTutorial] = useState(false);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [endedSeasons, setEndedSeasons] = useState<Season[]>([]);
  const [isEndingSeason, setIsEndingSeason] = useState(false);
  const [seasonName, setSeasonName] = useState("");

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const [settings, loadedActiveSeason, loadedEndedSeasons] = await Promise.all([
          getTeamSettingsAsync(),
          getActiveSeasonAsync(),
          listEndedSeasonsAsync(),
        ]);

        if (isMounted) {
          setActiveSeason(loadedActiveSeason);
          setSeasonName(loadedActiveSeason?.name ?? "");
          setEndedSeasons(loadedEndedSeasons);
        }

        if (!isMounted || !settings) {
          return;
        }

        setForm({
          teamName: settings.teamName,
          clubLocation: settings.clubLocation,
          kitDesign: settings.kitDesign,
          outfieldKitColor: settings.outfieldKitColor,
          secondaryKitColor: settings.secondaryKitColor,
          thirdKitColor: settings.thirdKitColor,
          kitNumberColor: settings.kitNumberColor,
          goalkeeperKitColor: settings.goalkeeperKitColor,
          matchDurationMinutes: settings.matchDurationMinutes,
          trainingDays: settings.trainingDays,
          trainingStartTime: settings.trainingStartTime,
          preferNicknames: settings.preferNicknames,
          fineJarEnabled: settings.fineJarEnabled,
          matchDutyEnabled: settings.matchDutyEnabled,
          includeFriendlyMatchesInStats:
            settings.includeFriendlyMatchesInStats,
        });
      } catch (loadError) {
        console.warn("Failed to load team settings", loadError);
        setError("Could not load your team settings.");
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateFormValue<Key extends keyof SaveTeamSettingsInput>(
    key: Key,
    value: SaveTeamSettingsInput[Key],
  ) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
    setSaveMessage(null);
  }

  async function handleSave() {
    setError(null);
    setSaveMessage(null);

    if (!form.teamName.trim()) {
      setError("Team name is required.");
      return;
    }

    if (activeSeason && !seasonName.trim()) {
      setError("Season name is required.");
      return;
    }

    if (
      !Number.isFinite(form.matchDurationMinutes) ||
      form.matchDurationMinutes < 1 ||
      form.matchDurationMinutes > 120
    ) {
      setError("Match minutes must be between 1 and 120.");
      return;
    }

    if (form.trainingStartTime.trim() && !isValidTime(form.trainingStartTime)) {
      setError("Training time must use HH:MM, for example 19:30.");
      return;
    }

    setIsSaving(true);

    try {
      const savedSettings = await saveTeamSettingsAsync(form);
      if (activeSeason) {
        await updateSeasonNameAsync(activeSeason.id, seasonName);
        setActiveSeason({ ...activeSeason, name: seasonName.trim() });
      }

      if (savedSettings) {
        setForm({
          teamName: savedSettings.teamName,
          clubLocation: savedSettings.clubLocation,
          kitDesign: savedSettings.kitDesign,
          outfieldKitColor: savedSettings.outfieldKitColor,
          secondaryKitColor: savedSettings.secondaryKitColor,
          thirdKitColor: savedSettings.thirdKitColor,
          kitNumberColor: savedSettings.kitNumberColor,
          goalkeeperKitColor: savedSettings.goalkeeperKitColor,
          matchDurationMinutes: savedSettings.matchDurationMinutes,
          trainingDays: savedSettings.trainingDays,
          trainingStartTime: savedSettings.trainingStartTime,
          preferNicknames: savedSettings.preferNicknames,
          fineJarEnabled: savedSettings.fineJarEnabled,
          matchDutyEnabled: savedSettings.matchDutyEnabled,
          includeFriendlyMatchesInStats:
            savedSettings.includeFriendlyMatchesInStats,
        });
      }

      setSaveMessage("Settings saved.");
    } catch (saveError) {
      console.warn("Failed to save team settings", saveError);
      setError("Please check your team name and color values.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExportBackup() {
    setIsExportingBackup(true);

    try {
      await exportDatabaseBackupAsync();
    } catch (exportError) {
      console.warn("Failed to export data backup", exportError);
      Alert.alert(
        "Backup failed",
        "The backup file could not be created. Please try again.",
      );
    } finally {
      setIsExportingBackup(false);
    }
  }

  async function handleChooseBackup() {
    if (isRestoringBackup) {
      return;
    }

    setIsRestoringBackup(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: "*/*",
      });

      if (result.canceled) {
        setIsRestoringBackup(false);
        return;
      }

      const backup = result.assets[0];

      Alert.alert(
        "Restore this backup?",
        `Restoring “${backup.name}” will replace all players, trainings, matches, statistics, guest players, and settings currently in the app. This cannot be undone.`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setIsRestoringBackup(false),
          },
          {
            text: "Restore backup",
            style: "destructive",
            onPress: () => void handleRestoreBackup(backup.uri),
          },
        ],
        { cancelable: false },
      );
    } catch (pickerError) {
      console.warn("Failed to choose data backup", pickerError);
      setIsRestoringBackup(false);
      Alert.alert(
        "Could not open files",
        "The file picker could not be opened. Please try again.",
      );
    }
  }

  async function handleRestoreBackup(fileUri: string) {
    try {
      await restoreDatabaseBackupAsync(fileUri);
      await cancelAllAssistantCoachNotificationsAsync();
      const restoredMatches = await listMatchDayMatchesAsync();
      await Promise.all(
        restoredMatches
          .filter((match) => match.ownScore === null || match.opponentScore === null)
          .map((match) =>
            scheduleMatchResultReminderAsync(match.id, match.matchDate, match.startTime),
          ),
      );
      setIsRestoringBackup(false);
      Alert.alert(
        "Backup restored",
        "Your Assistant Coach data has been restored successfully. The app will now reload.",
        [
          {
            text: "Continue",
            onPress: () => void reloadAppAsync(),
          },
        ],
        { cancelable: false },
      );
    } catch (restoreError) {
      console.warn("Failed to restore data backup", restoreError);
      setIsRestoringBackup(false);
      Alert.alert(
        "Backup could not be restored",
        restoreError instanceof InvalidBackupError
          ? restoreError.message
          : "Your existing data has not been changed. Please try again with a valid Assistant Coach backup.",
      );
    }
  }

  function confirmDeleteAllData() {
    Alert.alert(
      "Delete all app data?",
      "This permanently deletes your players, trainings, matches, statistics, guest players, and team settings. Export a backup first if you may need this data again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: () => {
            void handleDeleteAllData();
          },
        },
      ],
    );
  }

  async function handleDeleteAllData() {
    setIsDeletingData(true);

    try {
      await clearAllUserDataAsync();
      await cancelAllAssistantCoachNotificationsAsync();
      router.replace("/");
    } catch (deleteError) {
      console.warn("Failed to delete app data", deleteError);
      Alert.alert(
        "Delete failed",
        "Your data could not be deleted. Please try again.",
      );
    } finally {
      setIsDeletingData(false);
    }
  }

  async function handleOpenTutorial() {
    setIsOpeningTutorial(true);
    try {
      await setOnboardingCompletedAsync(false);
      router.replace("/");
    } catch (tutorialError) {
      console.warn("Failed to reopen tutorial", tutorialError);
      Alert.alert("Could not open tutorial", "Please try again.");
    } finally {
      setIsOpeningTutorial(false);
    }
  }

  async function confirmEndSeason() {
    if (!activeSeason || isEndingSeason) return;

    try {
      const status = await getSeasonCompletionStatusAsync(activeSeason.id);
      const unfinished: string[] = [];
      if (status.matchesWithoutResults) unfinished.push(`${status.matchesWithoutResults} match result${status.matchesWithoutResults === 1 ? "" : "s"}`);
      if (status.trainingsWithoutAttendance) unfinished.push(`${status.trainingsWithoutAttendance} training attendance record${status.trainingsWithoutAttendance === 1 ? "" : "s"}`);
      const warning = unfinished.length
        ? `There are still ${unfinished.join(" and ")} unfinished. They will be archived as they are.\n\n`
        : "";

      Alert.alert(
        `End season ${activeSeason.name}?`,
        `${warning}This creates a permanent season summary and starts a new season. Your players and settings will carry over.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "End season", style: "destructive", onPress: () => void handleEndSeason() },
        ],
      );
    } catch (seasonError) {
      console.warn("Failed to check season", seasonError);
      Alert.alert("Could not check season", "Please try again.");
    }
  }

  async function handleEndSeason() {
    setIsEndingSeason(true);
    try {
      const endedSeason = await endActiveSeasonAsync();
      const [nextSeason, history] = await Promise.all([
        getActiveSeasonAsync(),
        listEndedSeasonsAsync(),
      ]);
      setActiveSeason(nextSeason);
      setSeasonName(nextSeason?.name ?? "");
      setEndedSeasons(history);
      router.push({ pathname: "/season-summary", params: { seasonId: String(endedSeason.id) } });
    } catch (seasonError) {
      console.warn("Failed to end season", seasonError);
      Alert.alert("Season not ended", "Your data has not been changed. Please try again.");
    } finally {
      setIsEndingSeason(false);
    }
  }

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: PageTopPadding,
      paddingBottom: Spacing.five,
    },
  });

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Settings
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.intro}>
            Update your team details, kit design, and match preferences.
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedView style={styles.sectionHeader}>
            <SymbolView
              name={{
                ios: "questionmark.circle",
                android: "help_outline",
                web: "help_outline",
              }}
              size={22}
              tintColor={theme.text}
            />
            <ThemedText type="default">Introduction</ThemedText>
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">
            Revisit the short guide to players, training, Match Day, sharing and
            settings.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View introduction again"
            disabled={isOpeningTutorial}
            onPress={() => void handleOpenTutorial()}
            style={({ pressed }) => [
              styles.tutorialButton,
              pressed && styles.pressed,
              isOpeningTutorial && styles.disabledButton,
            ]}
          >
            <ThemedText type="smallBold" style={styles.tutorialButtonText}>
              View introduction again
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedView style={styles.sectionHeader}>
            <SymbolView
              name={{
                ios: "tshirt.fill",
                android: "checkroom",
                web: "checkroom",
              }}
              size={22}
              tintColor={theme.text}
            />
            <ThemedText type="default">Team and kit</ThemedText>
          </ThemedView>

          <ThemedView style={styles.fieldGroup}>
            <ThemedText type="smallBold">Team name</ThemedText>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Example FC"
              placeholderTextColor={theme.textSecondary}
              value={form.teamName}
              onChangeText={(value) => updateFormValue("teamName", value)}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                  color: theme.text,
                },
              ]}
            />
          </ThemedView>

          <ThemedView style={styles.fieldGroup}>
            <ThemedText type="smallBold">Club location</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Used as the default location for home matches and trainings.
            </ThemedText>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Sports park, clubhouse, or address"
              placeholderTextColor={theme.textSecondary}
              value={form.clubLocation}
              onChangeText={(value) => updateFormValue("clubLocation", value)}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                  color: theme.text,
                },
              ]}
            />
          </ThemedView>

          <SettingsKitDesignField
            form={form}
            onChange={(kitDesign) => updateFormValue("kitDesign", kitDesign)}
          />

          <SettingsColorField
            label="Primary kit colour"
            value={form.outfieldKitColor}
            onChange={(value) => updateFormValue("outfieldKitColor", value)}
          />
          <SettingsColorField
            label="Secondary kit colour"
            value={form.secondaryKitColor}
            onChange={(value) => updateFormValue("secondaryKitColor", value)}
          />
          {form.kitDesign === "sash" || form.kitDesign === "twoColorStripes" ? (
            <SettingsColorField
              label="Third colour"
              value={form.thirdKitColor}
              onChange={(value) => updateFormValue("thirdKitColor", value)}
            />
          ) : null}
          <SettingsColorField
            label="Kit number colour"
            value={form.kitNumberColor}
            onChange={(value) => updateFormValue("kitNumberColor", value)}
          />
          <SettingsColorField
            label="Goalkeeper kit colour"
            value={form.goalkeeperKitColor}
            onChange={(value) => updateFormValue("goalkeeperKitColor", value)}
          />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedView style={styles.sectionHeader}>
            <SymbolView
              name={{
                ios: "slider.horizontal.3",
                android: "tune",
                web: "tune",
              }}
              size={22}
              tintColor={theme.text}
            />
            <ThemedText type="default">Match preferences</ThemedText>
          </ThemedView>

          <SettingsPreferencesFields form={form} onChange={updateFormValue} />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedView style={styles.sectionHeader}>
            <SymbolView
              name={{
                ios: "chart.bar.fill",
                android: "bar_chart",
                web: "bar_chart",
              }}
              size={22}
              tintColor={theme.text}
            />
            <ThemedText type="default">Player and team statistics</ThemedText>
          </ThemedView>

          <SettingsSegmentedField
            label="Friendly matches"
            helperText="Excluded friendlies remain saved and visible, but will not count toward player or team statistics."
            options={[
              { label: "Include", value: true },
              { label: "Exclude", value: false },
            ]}
            value={form.includeFriendlyMatchesInStats}
            onChange={(value) =>
              updateFormValue("includeFriendlyMatchesInStats", value)
            }
          />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedView style={styles.sectionHeader}>
            <SymbolView
              name={{
                ios: "figure.soccer",
                android: "sports_soccer",
                web: "sports_soccer",
              }}
              size={22}
              tintColor={theme.text}
            />
            <ThemedText type="default">Training preferences</ThemedText>
          </ThemedView>

          <SettingsTrainingFields form={form} onChange={updateFormValue} />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedView style={styles.sectionHeader}>
            <SymbolView
              name={{ ios: "calendar.badge.checkmark", android: "event_available", web: "event_available" }}
              size={22}
              tintColor={theme.text}
            />
            <ThemedText type="default">Season</ThemedText>
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">
            Current season: {activeSeason?.name ?? "Loading..."}
          </ThemedText>
          {activeSeason ? (
            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="smallBold">Season name</ThemedText>
              <TextInput
                value={seasonName}
                onChangeText={(value) => { setSeasonName(value); setSaveMessage(null); }}
                placeholder="2026/27"
                placeholderTextColor={theme.textSecondary}
                style={[styles.textInput, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, color: theme.text }]}
              />
              <ThemedText type="small" themeColor="textSecondary">Saved with the main Save settings button.</ThemedText>
            </ThemedView>
          ) : null}
          {endedSeasons.length ? (
            <ThemedView style={styles.seasonHistory}>
              <ThemedText type="smallBold">Season history</ThemedText>
              {endedSeasons.map((season) => (
                <Pressable
                  key={season.id}
                  onPress={() => router.push({ pathname: "/season-summary", params: { seasonId: String(season.id) } })}
                  style={({ pressed }) => [styles.seasonHistoryButton, { borderColor: theme.backgroundSelected }, pressed && styles.pressed]}
                >
                  <ThemedText type="smallBold">{season.name}</ThemedText>
                  <ThemedText type="small" style={styles.greenText}>View summary ›</ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End current season"
            disabled={!activeSeason || isEndingSeason}
            onPress={() => void confirmEndSeason()}
            style={({ pressed }) => [styles.endSeasonButton, pressed && styles.pressed, isEndingSeason && styles.disabledButton]}
          >
            <ThemedText type="smallBold" style={styles.dangerText}>
              {isEndingSeason ? "Ending season..." : "End season"}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedView style={styles.sectionHeader}>
            <SymbolView
              name={{
                ios: "externaldrive.fill",
                android: "cloud_upload",
                web: "cloud_upload",
              }}
              size={22}
              tintColor={theme.text}
            />
            <ThemedText type="default">Data backup</ThemedText>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary">
            Export all players, trainings, matches, statistics, and settings.
            Choose Files, iCloud Drive, Google Drive, or another available
            location when the share sheet opens. You can restore that file on
            this or a new phone later.
          </ThemedText>

          <ThemedView style={styles.backupActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Export data backup"
              disabled={isExportingBackup || isRestoringBackup}
              onPress={handleExportBackup}
              style={({ pressed }) => [
                styles.backupButton,
                pressed && styles.pressed,
                (isExportingBackup || isRestoringBackup) &&
                  styles.disabledButton,
              ]}
            >
              <SymbolView
                name={{
                  ios: "square.and.arrow.up",
                  android: "upload_file",
                  web: "upload_file",
                }}
                size={20}
                tintColor="#ffffff"
              />
              <ThemedText type="smallBold" style={styles.saveButtonText}>
                {isExportingBackup ? "Preparing backup..." : "Export backup"}
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Restore data backup"
              disabled={isExportingBackup || isRestoringBackup}
              onPress={() => void handleChooseBackup()}
              style={({ pressed }) => [
                styles.restoreButton,
                pressed && styles.pressed,
                (isExportingBackup || isRestoringBackup) &&
                  styles.disabledButton,
              ]}
            >
              <SymbolView
                name={{
                  ios: "square.and.arrow.down",
                  android: "download_for_offline",
                  web: "download_for_offline",
                }}
                size={20}
                tintColor="#2563EB"
              />
              <ThemedText type="smallBold" style={styles.restoreButtonText}>
                {isRestoringBackup ? "Restoring..." : "Restore backup"}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedView style={styles.sectionHeader}>
            <SymbolView
              name={{
                ios: "trash",
                android: "delete_forever",
                web: "delete_forever",
              }}
              size={22}
              tintColor="#DC2626"
            />
            <ThemedText type="default" style={styles.dangerText}>
              Delete app data
            </ThemedText>
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">
            Return the app to a completely empty state. This cannot be undone
            without a backup.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete all app data"
            disabled={isDeletingData}
            onPress={confirmDeleteAllData}
            style={({ pressed }) => [
              styles.deleteDataButton,
              pressed && styles.pressed,
              isDeletingData && styles.disabledButton,
            ]}
          >
            <ThemedText type="smallBold" style={styles.dangerText}>
              {isDeletingData ? "Deleting..." : "Delete all app data"}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {error ? (
          <ThemedText type="smallBold" style={styles.errorText}>
            {error}
          </ThemedText>
        ) : null}
        {saveMessage ? (
          <ThemedText type="smallBold" style={styles.successText}>
            {saveMessage}
          </ThemedText>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save settings"
          disabled={isSaving}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.pressed,
            isSaving && styles.disabledButton,
          ]}
        >
          <ThemedText type="smallBold" style={styles.saveButtonText}>
            {isSaving ? "Saving..." : "Save settings"}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

function SettingsKitDesignField({
  form,
  onChange,
}: {
  form: SaveTeamSettingsInput;
  onChange: (value: KitDesign) => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">Kit design</ThemedText>
      <ThemedView style={styles.kitDesignLayout}>
        <ThemedView style={styles.kitDesignOptions}>
          {kitDesignOptions.map((option) => {
            const isSelected = form.kitDesign === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onChange(option.value)}
                style={({ pressed }) => [
                  styles.kitDesignOption,
                  {
                    borderColor: isSelected
                      ? "#1C7C54"
                      : theme.backgroundSelected,
                  },
                  isSelected && styles.kitDesignOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={isSelected && styles.kitDesignOptionTextSelected}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
        <KitDesignPreview form={form} />
      </ThemedView>
    </ThemedView>
  );
}

function SettingsPreferencesFields({
  form,
  onChange,
}: {
  form: SaveTeamSettingsInput;
  onChange: <Key extends keyof SaveTeamSettingsInput>(
    key: Key,
    value: SaveTeamSettingsInput[Key],
  ) => void;
}) {
  const theme = useTheme();

  function updateMatchMinutes(value: number) {
    onChange("matchDurationMinutes", Math.min(Math.max(value, 1), 120));
  }

  function updateMatchMinutesText(value: string) {
    const numericValue = Number(value.replace(/\D/g, ""));
    onChange(
      "matchDurationMinutes",
      Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0,
    );
  }

  return (
    <>
      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">Match minutes</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Use this for youth teams or competitions with shorter matches.
        </ThemedText>
        <ThemedView style={styles.numberRow}>
          <StepperArrowButton
            accessibilityLabel="Decrease match minutes"
            direction="left"
            onPress={() => updateMatchMinutes(form.matchDurationMinutes - 5)}
          />
          <TextInput
            keyboardType="number-pad"
            maxLength={3}
            value={
              form.matchDurationMinutes > 0
                ? String(form.matchDurationMinutes)
                : ""
            }
            onChangeText={updateMatchMinutesText}
            style={[
              styles.numberInput,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
                color: theme.text,
              },
            ]}
          />
          <StepperArrowButton
            accessibilityLabel="Increase match minutes"
            direction="right"
            onPress={() => updateMatchMinutes(form.matchDurationMinutes + 5)}
          />
        </ThemedView>
      </ThemedView>

      <SettingsSegmentedField
        label="Lineup names"
        options={[
          { label: "Nicknames", value: true },
          { label: "First names", value: false },
        ]}
        value={form.preferNicknames}
        onChange={(value) => onChange("preferNicknames", value)}
      />

      <SettingsSegmentedField
        label="Fine jar"
        helperText="You can turn this into fines, reminders, and team rules later."
        options={[
          { label: "Use fine jar", value: true },
          { label: "Skip for now", value: false },
        ]}
        value={form.fineJarEnabled}
        onChange={(value) => onChange("fineJarEnabled", value)}
      />

      <SettingsSegmentedField
        label="Does your team have match duties?"
        helperText="Do your players take care of bringing the jerseys, warm-up equipment, or other match-day materials?"
        options={[
          { label: "Use match duties", value: true },
          { label: "No match duties", value: false },
        ]}
        value={form.matchDutyEnabled}
        onChange={(value) => onChange("matchDutyEnabled", value)}
      />
    </>
  );
}

function SettingsSegmentedField({
  helperText,
  label,
  onChange,
  options,
  value,
}: {
  helperText?: string;
  label: string;
  onChange: (value: boolean) => void;
  options: { label: string; value: boolean }[];
  value: boolean;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {helperText ? (
        <ThemedText type="small" themeColor="textSecondary">
          {helperText}
        </ThemedText>
      ) : null}
      <ThemedView style={styles.segmentedRow}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.segmentedOption,
                {
                  borderColor: isSelected
                    ? "#1C7C54"
                    : theme.backgroundSelected,
                },
                isSelected && styles.segmentedOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={isSelected && styles.segmentedOptionTextSelected}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

function SettingsTrainingFields({
  form,
  onChange,
}: {
  form: SaveTeamSettingsInput;
  onChange: <Key extends keyof SaveTeamSettingsInput>(
    key: Key,
    value: SaveTeamSettingsInput[Key],
  ) => void;
}) {
  const theme = useTheme();

  function toggleTrainingDay(day: TrainingDay) {
    const nextTrainingDays = form.trainingDays.includes(day)
      ? form.trainingDays.filter((trainingDay) => trainingDay !== day)
      : [...form.trainingDays, day];

    onChange("trainingDays", sortTrainingDays(nextTrainingDays));
  }

  return (
    <>
      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">Training days</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Useful for reminders later. Leave empty if training changes every
          week.
        </ThemedText>
        <ThemedView style={styles.trainingDayGrid}>
          {TRAINING_DAYS.map((day) => {
            const isSelected = form.trainingDays.includes(day);

            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={trainingDayLabels[day]}
                accessibilityState={{ selected: isSelected }}
                onPress={() => toggleTrainingDay(day)}
                style={({ pressed }) => [
                  styles.trainingDayOption,
                  { borderColor: "#1C7C54" },
                  isSelected && styles.trainingDayOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.trainingDayOptionText,
                    isSelected && styles.trainingDayOptionTextSelected,
                  ]}
                >
                  {trainingDayLabels[day]}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">Default training time</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          New trainings will use this start time automatically.
        </ThemedText>
        <TextInput
          keyboardType="number-pad"
          maxLength={5}
          placeholder="19:30"
          placeholderTextColor={theme.textSecondary}
          value={form.trainingStartTime}
          onChangeText={(value) =>
            onChange("trainingStartTime", formatTrainingTimeInput(value))
          }
          style={[
            styles.textInput,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
              color: theme.text,
            },
          ]}
        />
      </ThemedView>
    </>
  );
}

function KitDesignPreview({ form }: { form: SaveTeamSettingsInput }) {
  const kitOutlineColor = getKitOutlineColor(form.outfieldKitColor);

  return (
    <ThemedView style={styles.kitPreviewFrame}>
      <ThemedView style={styles.kitPreviewShirt}>
        <Svg viewBox="0 0 100 90" style={styles.kitPreviewSvg}>
          <Defs>
            <ClipPath id="settingsScreenKitPreviewClip">
              <Path d={kitShirtPath} />
            </ClipPath>
          </Defs>
          <Path d={kitShirtPath} fill={form.outfieldKitColor} />
          <G clipPath="url(#settingsScreenKitPreviewClip)">
            {form.kitDesign === "stripes" ? (
              <>
                <Rect
                  x="18"
                  y="0"
                  width="11"
                  height="90"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="45"
                  y="0"
                  width="11"
                  height="90"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="72"
                  y="0"
                  width="11"
                  height="90"
                  fill={form.secondaryKitColor}
                />
              </>
            ) : null}
            {form.kitDesign === "twoColorStripes" ? (
              <>
                <Rect
                  x="0"
                  y="0"
                  width="10"
                  height="90"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="22.5"
                  y="0"
                  width="10"
                  height="90"
                  fill={form.thirdKitColor}
                />
                <Rect
                  x="45"
                  y="0"
                  width="10"
                  height="90"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="67.5"
                  y="0"
                  width="10"
                  height="90"
                  fill={form.thirdKitColor}
                />
                <Rect
                  x="90"
                  y="0"
                  width="10"
                  height="90"
                  fill={form.secondaryKitColor}
                />
              </>
            ) : null}
            {form.kitDesign === "hoops" ? (
              <>
                <Rect
                  x="0"
                  y="21"
                  width="100"
                  height="10"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="0"
                  y="44"
                  width="100"
                  height="10"
                  fill={form.secondaryKitColor}
                />
                <Rect
                  x="0"
                  y="67"
                  width="100"
                  height="10"
                  fill={form.secondaryKitColor}
                />
              </>
            ) : null}
            {form.kitDesign === "halves" ? (
              <Rect
                x="50"
                y="0"
                width="50"
                height="90"
                fill={form.secondaryKitColor}
              />
            ) : null}
            {form.kitDesign === "sides" ? (
              <>
                <Path
                  d="M18 0 L32 0 L32 90 L18 90 Z"
                  fill={form.secondaryKitColor}
                />
                <Path
                  d="M68 0 L82 0 L82 90 L68 90 Z"
                  fill={form.secondaryKitColor}
                />
              </>
            ) : null}
            {form.kitDesign === "sash" ? (
              <>
                <Path
                  d="M4 90 L86 -16 L96 -16 L14 90 Z"
                  fill={form.secondaryKitColor}
                />
                <Path
                  d="M14 90 L96 -16 L106 -16 L24 90 Z"
                  fill={form.thirdKitColor}
                />
              </>
            ) : null}
          </G>
          <Path
            d={kitShirtPath}
            fill="none"
            stroke={kitOutlineColor}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth={5}
          />
          <Path
            d="M37 7 Q50 15 63 7"
            fill="none"
            stroke={kitOutlineColor}
            strokeLinecap="round"
            strokeWidth={5}
          />
        </Svg>
        <ThemedText
          type="smallBold"
          style={[
            styles.kitPreviewNumber,
            {
              color: form.kitNumberColor,
              textShadowColor: getKitNumberOutlineColor(form.kitNumberColor),
            },
          ]}
        >
          10
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

function SettingsColorField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedView style={styles.swatchRow}>
        {colorOptions.map((color) => (
          <Pressable
            key={`${label}-${color}`}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${color}`}
            accessibilityState={{
              selected: value.toUpperCase() === color,
            }}
            onPress={() => onChange(color)}
            style={({ pressed }) => [
              styles.swatch,
              { backgroundColor: color },
              value.toUpperCase() === color && styles.swatchSelected,
              pressed && styles.pressed,
            ]}
          />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

function getKitNumberOutlineColor(color: string) {
  const normalizedColor = color.trim().toUpperCase();
  return normalizedColor === "#000000" || normalizedColor === "#111827"
    ? "#FFFFFF"
    : "#111827";
}

function getKitOutlineColor(color: string) {
  const normalizedColor = color.trim().toUpperCase();
  return normalizedColor === "#000000" || normalizedColor === "#111827"
    ? "#FFFFFF"
    : "#111827";
}

function sortTrainingDays(days: TrainingDay[]) {
  return [...days].sort(
    (firstDay, secondDay) =>
      TRAINING_DAYS.indexOf(firstDay) - TRAINING_DAYS.indexOf(secondDay),
  );
}

function formatTrainingTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  container: {
    flexGrow: 1,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop:
      Platform.select({
        web: AppHeaderHeight + PageTopPadding,
        default: AppHeaderHeight + Spacing.two,
      }) ?? AppHeaderHeight + Spacing.two,
  },
  header: {
    gap: Spacing.two,
  },
  title: {
    lineHeight: 38,
  },
  intro: {
    maxWidth: 560,
  },
  panel: {
    borderRadius: Spacing.three,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  textInput: {
    backgroundColor: "#ffffff",
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  kitDesignLayout: {
    alignItems: "center",
    gap: Spacing.two,
  },
  kitDesignOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    justifyContent: "center",
    width: "100%",
  },
  kitDesignOption: {
    alignItems: "center",
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 104,
    paddingHorizontal: Spacing.two,
  },
  kitDesignOptionSelected: {
    backgroundColor: "#1C7C54",
  },
  kitDesignOptionTextSelected: {
    color: "#ffffff",
  },
  kitPreviewFrame: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#D1D5DB",
    borderRadius: Spacing.three,
    borderWidth: 1,
    height: 132,
    justifyContent: "center",
    width: 120,
  },
  kitPreviewShirt: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 104,
    justifyContent: "center",
    position: "relative",
    width: 116,
  },
  kitPreviewSvg: {
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  kitPreviewNumber: {
    fontSize: 30,
    lineHeight: 36,
    marginTop: 10,
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 4,
    zIndex: 2,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  swatch: {
    borderColor: "#D1D5DB",
    borderRadius: Spacing.one,
    borderWidth: 1,
    height: 28,
    width: 28,
  },
  swatchSelected: {
    borderColor: "#111827",
    borderWidth: 3,
  },
  numberRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  numberInput: {
    backgroundColor: "#ffffff",
    borderRadius: Spacing.two,
    borderWidth: 1,
    flex: 1,
    fontSize: 18,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    textAlign: "center",
  },
  segmentedRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  segmentedOption: {
    alignItems: "center",
    borderRadius: Spacing.two,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.two,
  },
  segmentedOptionSelected: {
    backgroundColor: "#1C7C54",
  },
  segmentedOptionTextSelected: {
    color: "#ffffff",
  },
  trainingDayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  trainingDayOption: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 64,
    paddingHorizontal: Spacing.two,
  },
  trainingDayOptionSelected: {
    backgroundColor: "#1C7C54",
  },
  trainingDayOptionText: {
    color: "#1C7C54",
  },
  trainingDayOptionTextSelected: {
    color: "#ffffff",
  },
  errorText: {
    color: "#EF4444",
  },
  dangerText: {
    color: "#DC2626",
  },
  successText: {
    color: "#1C7C54",
  },
  greenText: {
    color: "#1C7C54",
  },
  seasonHistory: {
    gap: Spacing.two,
  },
  seasonHistoryButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  endSeasonButton: {
    alignItems: "center",
    borderColor: "#DC2626",
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    width: "100%",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#1C7C54",
    borderRadius: Spacing.two,
    justifyContent: "center",
    minHeight: 48,
  },
  backupButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: Spacing.three,
    width: "100%",
  },
  backupActions: {
    gap: Spacing.two,
    width: "100%",
  },
  restoreButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "#2563EB",
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: Spacing.three,
    width: "100%",
  },
  restoreButtonText: {
    color: "#2563EB",
  },
  tutorialButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "transparent",
    borderColor: "#1C7C54",
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: Spacing.three,
  },
  tutorialButtonText: {
    color: "#1C7C54",
  },
  deleteDataButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "#DC2626",
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: Spacing.three,
    width: "100%",
  },
  saveButtonText: {
    color: "#ffffff",
  },
  disabledButton: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.7,
  },
});
