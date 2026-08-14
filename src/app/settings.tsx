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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg";

import { StepperArrowButton } from "@/components/stepper-arrow-button";
import { OutlinedText } from "@/components/outlined-text";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  AppHeaderHeight,
  BottomTabInset,
  MaxContentWidth,
  PageTopPadding,
  Spacing,
} from "@/constants/theme";
import {
  exportDatabaseBackupAsync,
  restoreDatabaseBackupAsync,
} from "@/features/backup/backup-service";
import { clearAllUserDataAsync } from "@/features/backup/data-reset-service";
import { listEventsAsync } from "@/features/events/event-repository";
import { listMatchDayMatchesAsync } from "@/features/match-day/match-day-repository";
import {
  cancelAllAssistantCoachNotificationsAsync,
  scheduleMatchResultReminderAsync,
  scheduleTrainingAttendanceReminderAsync,
} from "@/features/notifications/match-result-notifications";
import {
  endActiveSeasonAsync,
  getActiveSeasonAsync,
  getSeasonCompletionStatusAsync,
  listEndedSeasonsAsync,
  updateSeasonNameAsync,
} from "@/features/seasons/season-repository";
import type {
  Season,
  SeasonCompletionStatus,
  UnpaidFineResolution,
} from "@/features/seasons/season-types";
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
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

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
  preferNicknames: false,
  fineJarEnabled: false,
  fineJarCurrency: "EUR",
  matchDutyEnabled: true,
  includeFriendlyMatchesInStats: true,
};

const kitShirtPath =
  "M34 7 C38 11 62 11 66 7 L76 7 L95 25 Q98 27 96 31 L87 47 Q85 51 81 49 L73 44 L73 83 Q73 87 69 87 L31 87 Q27 87 27 83 L27 44 L19 49 Q15 51 13 47 L4 31 Q2 27 5 25 L24 7 Z";

const kitDesignOptions = [
  { value: "solid", translationKey: "settings.kit.patterns.regular" },
  { value: "stripes", translationKey: "settings.kit.patterns.stripes" },
  {
    value: "twoColorStripes",
    translationKey: "settings.kit.patterns.three_color_stripes",
  },
  { value: "hoops", translationKey: "settings.kit.patterns.hoops" },
  { value: "sash", translationKey: "settings.kit.patterns.two_color_sash" },
  { value: "halves", translationKey: "settings.kit.patterns.halves" },
  { value: "sides", translationKey: "settings.kit.patterns.sides" },
] as const satisfies { value: KitDesign; translationKey: string }[];

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

export default function SettingsScreen() {
  const { locale, t } = useI18n();
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
        const [settings, loadedActiveSeason, loadedEndedSeasons] =
          await Promise.all([
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
          fineJarCurrency: settings.fineJarCurrency,
          matchDutyEnabled: settings.matchDutyEnabled,
          includeFriendlyMatchesInStats: settings.includeFriendlyMatchesInStats,
        });
      } catch (loadError) {
        console.warn("Failed to load team settings", loadError);
        setError(t("settings.errors.load"));
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, [t]);

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
      setError(t("settings.errors.team_name_required"));
      return;
    }

    if (activeSeason && !seasonName.trim()) {
      setError(t("settings.errors.season_name_required"));
      return;
    }

    if (
      !Number.isFinite(form.matchDurationMinutes) ||
      form.matchDurationMinutes < 1 ||
      form.matchDurationMinutes > 120
    ) {
      setError(t("settings.errors.match_minutes"));
      return;
    }

    if (form.trainingStartTime.trim() && !isValidTime(form.trainingStartTime)) {
      setError(t("settings.errors.training_time"));
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
          fineJarCurrency: savedSettings.fineJarCurrency,
          matchDutyEnabled: savedSettings.matchDutyEnabled,
          includeFriendlyMatchesInStats:
            savedSettings.includeFriendlyMatchesInStats,
        });
      }

      setSaveMessage(t("settings.actions.saved"));
    } catch (saveError) {
      console.warn("Failed to save team settings", saveError);
      setError(t("settings.errors.save"));
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
        t("backup.export.error.title"),
        t("backup.export.error.message"),
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
        t("backup.restore.confirm.title"),
        t("backup.restore.confirm.file_message", { name: backup.name }),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
            onPress: () => setIsRestoringBackup(false),
          },
          {
            text: t("backup.restore.confirm.action"),
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
        t("backup.restore.file_picker_error.title"),
        t("backup.restore.file_picker_error.message"),
      );
    }
  }

  async function handleRestoreBackup(fileUri: string) {
    try {
      await restoreDatabaseBackupAsync(fileUri);
      await cancelAllAssistantCoachNotificationsAsync();
      const [restoredMatches, restoredEvents] = await Promise.all([
        listMatchDayMatchesAsync(),
        listEventsAsync(),
      ]);
      await Promise.all([
        ...restoredMatches
          .filter(
            (match) => match.ownScore === null || match.opponentScore === null,
          )
          .map((match) =>
            scheduleMatchResultReminderAsync(
              match.id,
              match.matchDate,
              match.startTime,
              locale,
            ),
          ),
        ...restoredEvents
          .filter(
            (event) =>
              event.type === "training" && event.attendanceStatus !== "marked",
          )
          .map((event) =>
            scheduleTrainingAttendanceReminderAsync(
              event.id,
              event.eventDate,
              event.startTime,
              locale,
            ),
          ),
      ]);
      setIsRestoringBackup(false);
      Alert.alert(
        t("backup.restore.success.title"),
        t("backup.restore.success.message"),
        [
          {
            text: t("backup.restore.success.continue"),
            onPress: () => void reloadAppAsync(),
          },
        ],
        { cancelable: false },
      );
    } catch (restoreError) {
      console.warn("Failed to restore data backup", restoreError);
      setIsRestoringBackup(false);
      Alert.alert(
        t("backup.restore.error.title"),
        t("backup.restore.error.message"),
      );
    }
  }

  function confirmDeleteAllData() {
    Alert.alert(
      t("backup.delete.confirm.title"),
      t("backup.delete.confirm.message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("backup.delete.confirm.action"),
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
        t("backup.delete.error.title"),
        t("backup.delete.error.message"),
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
      Alert.alert(
        t("settings.errors.tutorial.title"),
        t("settings.errors.tutorial.message"),
      );
    } finally {
      setIsOpeningTutorial(false);
    }
  }

  async function confirmEndSeason() {
    if (!activeSeason || isEndingSeason) return;

    try {
      const status = await getSeasonCompletionStatusAsync(activeSeason.id);
      const unfinished: string[] = [];
      if (status.matchesWithoutResults) {
        unfinished.push(
          t(
            status.matchesWithoutResults === 1
              ? "settings.season.confirm.match_result"
              : "settings.season.confirm.match_results",
            { count: status.matchesWithoutResults },
          ),
        );
      }
      if (status.trainingsWithoutAttendance) {
        unfinished.push(
          t(
            status.trainingsWithoutAttendance === 1
              ? "settings.season.confirm.training_record"
              : "settings.season.confirm.training_records",
            { count: status.trainingsWithoutAttendance },
          ),
        );
      }
      const unfinishedItems =
        unfinished.length === 2
          ? t("settings.season.confirm.join", {
              first: unfinished[0],
              second: unfinished[1],
            })
          : unfinished[0];
      const warning = unfinished.length
        ? t("settings.season.confirm.unfinished", { items: unfinishedItems })
        : "";

      Alert.alert(
        t("settings.season.confirm.title", { name: activeSeason.name }),
        `${warning}${t("settings.season.confirm.message")}`,
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("settings.season.end"),
            style: "destructive",
            onPress: () => {
              if (status.unpaidFineCount > 0) {
                confirmUnpaidFineResolution(status);
              } else {
                void handleEndSeason("write_off");
              }
            },
          },
        ],
      );
    } catch (seasonError) {
      console.warn("Failed to check season", seasonError);
      Alert.alert(
        t("settings.errors.season_check.title"),
        t("settings.errors.season_check.message"),
      );
    }
  }

  function confirmUnpaidFineResolution(status: SeasonCompletionStatus) {
    const amount = new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-GB", {
      style: "currency",
      currency: form.fineJarCurrency,
      currencyDisplay: "narrowSymbol",
    }).format(status.unpaidFineAmountCents / 100);

    Alert.alert(
      t("seasons.confirm_end.unpaid_fines.title"),
      t("seasons.confirm_end.unpaid_fines.message", {
        count: status.unpaidFineCount,
        amount,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("seasons.confirm_end.unpaid_fines.write_off"),
          style: "destructive",
          onPress: () => void handleEndSeason("write_off"),
        },
        {
          text: t("seasons.confirm_end.unpaid_fines.carry"),
          onPress: () => void handleEndSeason("carry"),
        },
      ],
    );
  }

  async function handleEndSeason(unpaidFineResolution: UnpaidFineResolution) {
    setIsEndingSeason(true);
    try {
      const endedSeason = await endActiveSeasonAsync(unpaidFineResolution);
      const [nextSeason, history] = await Promise.all([
        getActiveSeasonAsync(),
        listEndedSeasonsAsync(),
      ]);
      setActiveSeason(nextSeason);
      setSeasonName(nextSeason?.name ?? "");
      setEndedSeasons(history);
      router.push({
        pathname: "/season-summary",
        params: { seasonId: String(endedSeason.id) },
      });
    } catch (seasonError) {
      console.warn("Failed to end season", seasonError);
      Alert.alert(
        t("settings.errors.season_end.title"),
        t("settings.errors.season_end.message"),
      );
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
      style={{ backgroundColor: theme.background }}
      contentInset={insets}
      contentContainerStyle={[styles.screen, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>
        <View style={styles.heading}>
          <ThemedText type="subtitle">{t("navigation.settings")}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.intro}>
            {t("settings.header.subtitle")}
          </ThemedText>
        </View>

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
            <ThemedText type="default">
              {t("settings.introduction.title")}
            </ThemedText>
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">
            {t("settings.introduction.description")}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("settings.introduction.action")}
            disabled={isOpeningTutorial}
            onPress={() => void handleOpenTutorial()}
            style={({ pressed }) => [
              styles.tutorialButton,
              pressed && styles.pressed,
              isOpeningTutorial && styles.disabledButton,
            ]}
          >
            <ThemedText type="smallBold" style={styles.tutorialButtonText}>
              {t("settings.introduction.action")}
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
            <ThemedText type="default">{t("settings.team.title")}</ThemedText>
          </ThemedView>

          <ThemedView style={styles.fieldGroup}>
            <ThemedText type="smallBold">{t("settings.team.name")}</ThemedText>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              placeholder={t("settings.team.name_placeholder")}
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
            <ThemedText type="smallBold">
              {t("settings.team.club_location")}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t("settings.team.club_location_help")}
            </ThemedText>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              placeholder={t("settings.team.club_location_placeholder")}
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
            label={t("settings.kit.player_primary")}
            value={form.outfieldKitColor}
            onChange={(value) => updateFormValue("outfieldKitColor", value)}
          />
          <SettingsColorField
            label={t("settings.kit.player_secondary")}
            value={form.secondaryKitColor}
            onChange={(value) => updateFormValue("secondaryKitColor", value)}
          />
          {form.kitDesign === "sash" || form.kitDesign === "twoColorStripes" ? (
            <SettingsColorField
              label={t("settings.kit.third")}
              value={form.thirdKitColor}
              onChange={(value) => updateFormValue("thirdKitColor", value)}
            />
          ) : null}
          <SettingsColorField
            label={t("settings.kit.number")}
            value={form.kitNumberColor}
            onChange={(value) => updateFormValue("kitNumberColor", value)}
          />
          <SettingsColorField
            label={t("settings.kit.goalkeeper_primary")}
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
            <ThemedText type="default">
              {t("settings.match_preferences.title")}
            </ThemedText>
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
            <ThemedText type="default">
              {t("settings.statistics.title")}
            </ThemedText>
          </ThemedView>

          <SettingsSegmentedField
            label={t("settings.statistics.friendlies.title")}
            helperText={t("settings.statistics.friendlies.description")}
            options={[
              {
                label: t("settings.statistics.friendlies.include"),
                value: true,
              },
              {
                label: t("settings.statistics.friendlies.exclude"),
                value: false,
              },
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
            <ThemedText type="default">
              {t("settings.training_preferences.title")}
            </ThemedText>
          </ThemedView>

          <SettingsTrainingFields form={form} onChange={updateFormValue} />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedView style={styles.sectionHeader}>
            <SymbolView
              name={{
                ios: "calendar.badge.checkmark",
                android: "event_available",
                web: "event_available",
              }}
              size={22}
              tintColor={theme.text}
            />
            <ThemedText type="default">{t("settings.season.title")}</ThemedText>
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">
            {t("settings.season.current")}{" "}
            {activeSeason?.name ?? t("common.loading")}
          </ThemedText>
          {activeSeason ? (
            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="smallBold">
                {t("settings.season.name")}
              </ThemedText>
              <TextInput
                value={seasonName}
                onChangeText={(value) => {
                  setSeasonName(value);
                  setSaveMessage(null);
                }}
                placeholder={t("settings.season.name_placeholder")}
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                    color: theme.text,
                  },
                ]}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {t("settings.season.save_help")}
              </ThemedText>
            </ThemedView>
          ) : null}
          {endedSeasons.length ? (
            <ThemedView style={styles.seasonHistory}>
              <ThemedText type="smallBold">
                {t("settings.season.history")}
              </ThemedText>
              {endedSeasons.map((season) => (
                <Pressable
                  key={season.id}
                  onPress={() =>
                    router.push({
                      pathname: "/season-summary",
                      params: { seasonId: String(season.id) },
                    })
                  }
                  style={({ pressed }) => [
                    styles.seasonHistoryButton,
                    { borderColor: theme.backgroundSelected },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold">{season.name}</ThemedText>
                  <ThemedText type="small" style={styles.greenText}>
                    {t("settings.season.view_summary")}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("settings.season.end")}
            disabled={!activeSeason || isEndingSeason}
            onPress={() => void confirmEndSeason()}
            style={({ pressed }) => [
              styles.endSeasonButton,
              pressed && styles.pressed,
              isEndingSeason && styles.disabledButton,
            ]}
          >
            <ThemedText type="smallBold" style={styles.dangerText}>
              {isEndingSeason
                ? t("settings.season.ending")
                : t("settings.season.end")}
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
            <ThemedText type="default">{t("backup.section.title")}</ThemedText>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary">
            {t("backup.section.description")}
          </ThemedText>

          <ThemedView style={styles.backupActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("backup.export.action")}
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
                {isExportingBackup
                  ? t("backup.export.preparing")
                  : t("backup.export.action")}
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("backup.restore.action")}
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
                {isRestoringBackup
                  ? t("backup.restore.restoring")
                  : t("backup.restore.action")}
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
              {t("backup.delete.title")}
            </ThemedText>
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">
            {t("backup.delete.description")}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("backup.delete.action")}
            disabled={isDeletingData}
            onPress={confirmDeleteAllData}
            style={({ pressed }) => [
              styles.deleteDataButton,
              pressed && styles.pressed,
              isDeletingData && styles.disabledButton,
            ]}
          >
            <ThemedText type="smallBold" style={styles.dangerText}>
              {isDeletingData ? t("common.loading") : t("backup.delete.action")}
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
          accessibilityLabel={t("settings.actions.save")}
          disabled={isSaving}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.pressed,
            isSaving && styles.disabledButton,
          ]}
        >
          <ThemedText type="smallBold" style={styles.saveButtonText}>
            {isSaving
              ? t("settings.actions.saving")
              : t("settings.actions.save")}
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
  const { t } = useI18n();

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">{t("settings.kit.title")}</ThemedText>
      <ThemedView style={styles.kitDesignLayout}>
        <ThemedView style={styles.kitDesignOptions}>
          {kitDesignOptions.map((option) => {
            const isSelected = form.kitDesign === option.value;
            const label = t(option.translationKey);

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={label}
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
                  {label}
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
  const { t } = useI18n();

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
        <ThemedText type="smallBold">
          {t("settings.match_preferences.match_minutes")}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("settings.match_preferences.match_minutes_help")}
        </ThemedText>
        <ThemedView style={styles.numberRow}>
          <StepperArrowButton
            accessibilityLabel={t(
              "settings.match_preferences.decrease_match_minutes",
            )}
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
            accessibilityLabel={t(
              "settings.match_preferences.increase_match_minutes",
            )}
            direction="right"
            onPress={() => updateMatchMinutes(form.matchDurationMinutes + 5)}
          />
        </ThemedView>
      </ThemedView>

      <SettingsSegmentedField
        label={t("settings.match_preferences.player_names.title")}
        options={[
          {
            label: t("settings.match_preferences.player_names.nicknames"),
            value: true,
          },
          {
            label: t("settings.match_preferences.player_names.first_names"),
            value: false,
          },
        ]}
        value={form.preferNicknames}
        onChange={(value) => onChange("preferNicknames", value)}
      />

      <SettingsSegmentedField
        label={t("settings.match_preferences.fine_jar.title")}
        helperText={t("settings.match_preferences.fine_jar.description")}
        options={[
          {
            label: t("settings.match_preferences.fine_jar.enabled"),
            value: true,
          },
          {
            label: t("settings.match_preferences.fine_jar.disabled"),
            value: false,
          },
        ]}
        value={form.fineJarEnabled}
        onChange={(value) => onChange("fineJarEnabled", value)}
      />

      {form.fineJarEnabled ? (
        <SettingsSegmentedField
          label={t("settings.match_preferences.fine_jar.currency.title")}
          helperText={t(
            "settings.match_preferences.fine_jar.currency.description",
          )}
          options={[
            {
              label: t("settings.match_preferences.fine_jar.currency.euro"),
              value: "EUR" as const,
            },
            {
              label: t("settings.match_preferences.fine_jar.currency.pound"),
              value: "GBP" as const,
            },
            {
              label: t("settings.match_preferences.fine_jar.currency.dollar"),
              value: "USD" as const,
            },
          ]}
          value={form.fineJarCurrency}
          onChange={(value) => onChange("fineJarCurrency", value)}
        />
      ) : null}

      <SettingsSegmentedField
        label={t("settings.match_preferences.match_duties.title")}
        helperText={t("settings.match_preferences.match_duties.description")}
        options={[
          {
            label: t("settings.match_preferences.match_duties.enabled"),
            value: true,
          },
          {
            label: t("settings.match_preferences.match_duties.disabled"),
            value: false,
          },
        ]}
        value={form.matchDutyEnabled}
        onChange={(value) => onChange("matchDutyEnabled", value)}
      />
    </>
  );
}

function SettingsSegmentedField<Value extends string | boolean>({
  helperText,
  label,
  onChange,
  options,
  value,
}: {
  helperText?: string;
  label: string;
  onChange: (value: Value) => void;
  options: { label: string; value: Value }[];
  value: Value;
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
  const { t } = useI18n();

  function toggleTrainingDay(day: TrainingDay) {
    const nextTrainingDays = form.trainingDays.includes(day)
      ? form.trainingDays.filter((trainingDay) => trainingDay !== day)
      : [...form.trainingDays, day];

    onChange("trainingDays", sortTrainingDays(nextTrainingDays));
  }

  return (
    <>
      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">
          {t("settings.training_preferences.days.title")}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("settings.training_preferences.days.description")}
        </ThemedText>
        <ThemedView style={styles.trainingDayGrid}>
          {TRAINING_DAYS.map((day) => {
            const isSelected = form.trainingDays.includes(day);
            const dayLabel = t(
              `settings.training_preferences.day_labels.${day}`,
            );

            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={dayLabel}
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
                  {dayLabel}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">
          {t("settings.training_preferences.default_time.title")}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("settings.training_preferences.default_time.description")}
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
  const kitOutlineColor = "#111827";

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
        <OutlinedText
          color={form.kitNumberColor}
          outlineColor={getKitNumberOutlineColor(form.kitNumberColor)}
          outlineWidth={1}
          type="smallBold"
          style={styles.kitPreviewNumber}
        >
          10
        </OutlinedText>
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
  screen: {
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.six,
  },
  container: {
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    paddingTop:
      Platform.select({
        web: AppHeaderHeight + PageTopPadding,
        default: AppHeaderHeight + Spacing.two,
      }) ?? AppHeaderHeight + Spacing.two,
    width: "100%",
  },
  heading: {
    gap: Spacing.one,
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
    height: 27,
    width: 27,
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
  languageOptionText: {
    color: "#1C7C54",
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
