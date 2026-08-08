import { useFocusEffect, useRouter, type Href } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
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
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { LanguageSelectionModal } from "@/components/language-selection-modal";
import { StepperArrowButton } from "@/components/stepper-arrow-button";
import {
  AppHeaderHeight,
  BottomTabInset,
  MaxContentWidth,
  PageTopPadding,
  Spacing,
} from "@/constants/theme";
import {
  getTeamSettingsAsync,
  saveTeamSettingsAsync,
} from "@/features/settings/team-settings-repository";
import { listPlayersAsync } from "@/features/players/player-repository";
import { listMatchDayMatchesAsync } from "@/features/match-day/match-day-repository";
import type { MatchDayMatch } from "@/features/match-day/match-day-types";
import {
  hasCompletedOnboardingAsync,
  hasSelectedAppLocaleAsync,
  setOnboardingCompletedAsync,
} from "@/features/settings/app-preferences-repository";
import type {
  KitDesign,
  SaveTeamSettingsInput,
} from "@/features/settings/team-settings-types";
import { useTheme } from "@/hooks/use-theme";
import { useScrollToTopOnFocus } from "@/hooks/use-scroll-to-top-on-focus";
import { useI18n } from "@/i18n/i18n-provider";

type HomeAction = {
  title: string;
  description: string;
  iconName: SymbolViewProps["name"];
  href: Href;
  showNotification?: boolean;
};

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

export default function HomeScreen() {
  const scrollViewRef = useScrollToTopOnFocus();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const { setLocale, t } = useI18n();
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SaveTeamSettingsInput>(
    defaultTeamSettingsForm,
  );
  const [settingsStep, setSettingsStep] = useState<0 | 1>(0);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [hasTeamSettings, setHasTeamSettings] = useState(false);
  const [isTutorialVisible, setIsTutorialVisible] = useState(false);
  const [isLanguageSelectionVisible, setIsLanguageSelectionVisible] =
    useState(false);
  const [overdueMatchResultCount, setOverdueMatchResultCount] = useState(0);
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  useFocusEffect(
    useCallback(() => {
      let isFocused = true;

      async function loadHomeData() {
        try {
          const [settings, players, hasCompletedOnboarding, hasSelectedLanguage, matches] = await Promise.all([
            getTeamSettingsAsync(),
            listPlayersAsync(),
            hasCompletedOnboardingAsync(),
            hasSelectedAppLocaleAsync(),
            listMatchDayMatchesAsync(),
          ]);

          if (!isFocused) {
            return;
          }

          setPlayerCount(players.length);
          setHasTeamSettings(Boolean(settings));
          setIsLanguageSelectionVisible(
            !hasCompletedOnboarding && !hasSelectedLanguage,
          );
          setIsTutorialVisible(
            !hasCompletedOnboarding && hasSelectedLanguage,
          );
          setOverdueMatchResultCount(
            matches.filter((match) => isMatchResultOverdue(match, new Date())).length,
          );

          if (!settings) {
            setSettingsForm(defaultTeamSettingsForm);
            setSettingsStep(0);
            setIsSettingsModalVisible(hasCompletedOnboarding);
            return;
          }

          setIsSettingsModalVisible(false);

          setSettingsForm({
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
        } catch (error) {
          console.warn("Failed to load home data", error);
        }
      }

      void loadHomeData();

      return () => {
        isFocused = false;
      };
    }, []),
  );

  async function handleSaveSettings() {
    setSettingsError(null);

    if (!settingsForm.teamName.trim()) {
      setSettingsError("Team name is required.");
      setSettingsStep(0);
      return;
    }

    if (
      !Number.isFinite(settingsForm.matchDurationMinutes) ||
      settingsForm.matchDurationMinutes < 1 ||
      settingsForm.matchDurationMinutes > 120
    ) {
      setSettingsError("Match minutes must be between 1 and 120.");
      setSettingsStep(1);
      return;
    }

    setIsSavingSettings(true);

    try {
      await saveTeamSettingsAsync(settingsForm);
      setIsSettingsModalVisible(false);
    } catch (error) {
      console.warn("Failed to save team settings", error);
      setSettingsError("Please check your team name and color values.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  function handleContinueSettings() {
    setSettingsError(null);

    if (!settingsForm.teamName.trim()) {
      setSettingsError("Team name is required.");
      return;
    }

    setSettingsStep(1);
  }

  async function handleFinishTutorial() {
    try {
      await setOnboardingCompletedAsync(true);
      setIsTutorialVisible(false);
      if (!hasTeamSettings) {
        setSettingsStep(0);
        setIsSettingsModalVisible(true);
      }
    } catch (error) {
      console.warn("Failed to save tutorial progress", error);
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
  const hasNoPlayers = playerCount === 0;
  const homeActions = ([
    {
      title: hasNoPlayers ? t("dashboard.actions.add_first_players.title") : t("dashboard.actions.players.title"),
      description: hasNoPlayers
        ? t("dashboard.actions.add_first_players.description")
        : t("dashboard.actions.players.description"),
      iconName: { ios: "person.3.fill", android: "groups", web: "groups" },
      href: "/players",
      showNotification: hasNoPlayers,
    },
    {
      title: t("dashboard.actions.add_training.title"),
      description: t("dashboard.actions.add_training.description"),
      iconName: {
        ios: "calendar.badge.plus",
        android: "event",
        web: "event",
      },
      href: "/events",
    },
    {
      title: t("dashboard.actions.add_match.title"),
      description: t("dashboard.actions.add_match.description"),
      iconName: {
        ios: "sportscourt.fill",
        android: "sports_soccer",
        web: "sports_soccer",
      },
      href: "/match-day",
    },
    ...(overdueMatchResultCount > 0
      ? [{
          title: overdueMatchResultCount === 1 ? "Add match result" : "Add match results",
          description: overdueMatchResultCount === 1
            ? "A finished match is waiting for its result and player stats."
            : `${overdueMatchResultCount} finished matches are waiting for results and player stats.`,
          iconName: {
            ios: "exclamationmark.circle.fill" as const,
            android: "notification_important" as const,
            web: "notification_important" as const,
          },
          href: "/match-day" as const,
          showNotification: true,
        }]
      : []),
  ] satisfies HomeAction[]).sort(
    (left, right) =>
      Number(Boolean(right.showNotification)) -
      Number(Boolean(left.showNotification)),
  );

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      >
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              {t("dashboard.header.title")}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.intro}>
              {t("dashboard.header.subtitle")}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.actionsSection}>
            <ThemedText type="default">{t("dashboard.actions.title")}</ThemedText>
            <ThemedView style={styles.actionsGrid}>
              {homeActions.map((action) => (
                <Pressable
                  key={action.title}
                  accessibilityRole="button"
                  accessibilityLabel={action.title}
                  onPress={() => router.push(action.href)}
                  style={({ pressed }) => [
                    styles.actionPressable,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedView
                    type="backgroundElement"
                    style={styles.actionCard}
                  >
                    {action.showNotification ? (
                      <ThemedView style={styles.actionNotificationDot} />
                    ) : null}
                    <ThemedView
                      type="backgroundSelected"
                      style={styles.iconContainer}
                    >
                      <SymbolView
                        name={action.iconName}
                        tintColor={theme.text}
                        size={24}
                      />
                    </ThemedView>
                    <ThemedView
                      type="backgroundElement"
                      style={styles.actionContent}
                    >
                      <ThemedText type="default">{action.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {action.description}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                </Pressable>
              ))}
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>

      <OnboardingTutorial
        onFinish={handleFinishTutorial}
        visible={isTutorialVisible}
      />
      <LanguageSelectionModal
        visible={isLanguageSelectionVisible}
        onSelect={async (locale) => {
          await setLocale(locale);
          setIsLanguageSelectionVisible(false);
          setIsTutorialVisible(true);
        }}
      />
      <TeamSettingsSetupModal
        error={settingsError}
        form={settingsForm}
        isSaving={isSavingSettings}
        onChange={setSettingsForm}
        onBack={() => setSettingsStep(0)}
        onContinue={handleContinueSettings}
        onSave={handleSaveSettings}
        step={settingsStep}
        visible={isSettingsModalVisible && !isTutorialVisible}
      />
    </>
  );
}

function isMatchResultOverdue(match: MatchDayMatch, now: Date) {
  if (match.ownScore !== null && match.opponentScore !== null) return false;

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(match.matchDate);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(match.startTime);
  if (!dateMatch || !timeMatch) return false;

  const startTime = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );
  return now.getTime() - startTime.getTime() >= 3 * 60 * 60 * 1000;
}

function TeamSettingsSetupModal({
  error,
  form,
  isSaving,
  onChange,
  onBack,
  onContinue,
  onSave,
  step,
  visible,
}: {
  error: string | null;
  form: SaveTeamSettingsInput;
  isSaving: boolean;
  onChange: (form: SaveTeamSettingsInput) => void;
  onBack: () => void;
  onContinue: () => void;
  onSave: () => void;
  step: 0 | 1;
  visible: boolean;
}) {
  const theme = useTheme();

  function updateFormValue<Key extends keyof SaveTeamSettingsInput>(
    key: Key,
    value: SaveTeamSettingsInput[Key],
  ) {
    onChange({ ...form, [key]: value });
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => undefined}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.settingsModalOverlay}
      >
        <ThemedView type="modalBackground" style={styles.settingsModalCard}>
          <ThemedView style={styles.settingsModalHeader}>
            <ThemedText type="subtitle" style={styles.settingsModalTitle}>
              Set up your team
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Before you start managing your team, you will need to set up the
              app!
            </ThemedText>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Step {step + 1} of 2
            </ThemedText>
          </ThemedView>

          <ScrollView
            style={styles.settingsModalScroll}
            contentContainerStyle={styles.settingsModalForm}
          >
            {step === 0 ? (
              <>
                <ThemedView style={styles.settingsFieldGroup}>
                  <ThemedText type="smallBold">Team name</ThemedText>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    placeholder="Example FC"
                    placeholderTextColor={theme.textSecondary}
                    value={form.teamName}
                    onChangeText={(value) => updateFormValue("teamName", value)}
                    style={[
                      styles.settingsTextInput,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                      },
                    ]}
                  />
                </ThemedView>

                <ThemedView style={styles.settingsFieldGroup}>
                  <ThemedText type="smallBold">
                    Club location (optional)
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Used as the default location for home matches and trainings.
                  </ThemedText>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    placeholder="Sports park, clubhouse, or address"
                    placeholderTextColor={theme.textSecondary}
                    value={form.clubLocation}
                    onChangeText={(value) =>
                      updateFormValue("clubLocation", value)
                    }
                    style={[
                      styles.settingsTextInput,
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
                  onChange={(kitDesign) =>
                    updateFormValue("kitDesign", kitDesign)
                  }
                />

                <SettingsColorField
                  label="Primary kit colour"
                  value={form.outfieldKitColor}
                  onChange={(value) =>
                    updateFormValue("outfieldKitColor", value)
                  }
                />
                <SettingsColorField
                  label="Secondary kit colour"
                  value={form.secondaryKitColor}
                  onChange={(value) =>
                    updateFormValue("secondaryKitColor", value)
                  }
                />
                {form.kitDesign === "sash" ||
                form.kitDesign === "twoColorStripes" ? (
                  <SettingsColorField
                    label="Third colour"
                    value={form.thirdKitColor}
                    onChange={(value) =>
                      updateFormValue("thirdKitColor", value)
                    }
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
                  onChange={(value) =>
                    updateFormValue("goalkeeperKitColor", value)
                  }
                />
              </>
            ) : (
              <SettingsPreferencesStep form={form} onChange={updateFormValue} />
            )}

            {error ? (
              <ThemedText type="smallBold" style={styles.settingsError}>
                {error}
              </ThemedText>
            ) : null}
          </ScrollView>

          {step === 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue team settings setup"
              onPress={onContinue}
              style={({ pressed }) => [
                styles.settingsSaveButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={styles.settingsSaveButtonText}
              >
                Next
              </ThemedText>
            </Pressable>
          ) : (
            <ThemedView style={styles.settingsFooter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to kit settings"
                disabled={isSaving}
                onPress={onBack}
                style={({ pressed }) => [
                  styles.settingsBackButton,
                  pressed && styles.pressed,
                  isSaving && styles.disabledButton,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={styles.settingsBackButtonText}
                >
                  Back
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save team settings"
                disabled={isSaving}
                onPress={onSave}
                style={({ pressed }) => [
                  styles.settingsSaveButton,
                  styles.settingsFooterButton,
                  pressed && styles.pressed,
                  isSaving && styles.disabledButton,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={styles.settingsSaveButtonText}
                >
                  {isSaving ? "Saving..." : "Save setup"}
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
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
    <ThemedView style={styles.settingsFieldGroup}>
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

function SettingsPreferencesStep({
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
      <ThemedView style={styles.settingsFieldGroup}>
        <ThemedText type="smallBold">Match minutes</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Use this for youth teams or competitions with shorter matches.
        </ThemedText>
        <ThemedView style={styles.settingsNumberRow}>
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
              styles.settingsNumberInput,
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
    <ThemedView style={styles.settingsFieldGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {helperText ? (
        <ThemedText type="small" themeColor="textSecondary">
          {helperText}
        </ThemedText>
      ) : null}
      <ThemedView style={styles.settingsSegmentedRow}>
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
                styles.settingsSegmentedOption,
                {
                  borderColor: isSelected
                    ? "#1C7C54"
                    : theme.backgroundSelected,
                },
                isSelected && styles.settingsSegmentedOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={isSelected && styles.settingsSegmentedOptionTextSelected}
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

function KitDesignPreview({ form }: { form: SaveTeamSettingsInput }) {
  const kitOutlineColor = getKitOutlineColor(form.outfieldKitColor);

  return (
    <ThemedView style={styles.kitPreviewFrame}>
      <ThemedView style={styles.kitPreviewShirt}>
        <Svg viewBox="0 0 100 90" style={styles.kitPreviewSvg}>
          <Defs>
            <ClipPath id="settingsKitPreviewClip">
              <Path d={kitShirtPath} />
            </ClipPath>
          </Defs>
          <Path d={kitShirtPath} fill={form.outfieldKitColor} />
          <G clipPath="url(#settingsKitPreviewClip)">
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
    <ThemedView style={styles.settingsFieldGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedView style={styles.settingsSwatchRow}>
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
              styles.settingsSwatch,
              { backgroundColor: color },
              value.toUpperCase() === color && styles.settingsSwatchSelected,
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

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    justifyContent: "center",
    flexDirection: "row",
  },
  container: {
    flexGrow: 1,
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: AppHeaderHeight + PageTopPadding,
  },
  header: {
    gap: Spacing.two,
  },
  eyebrow: {
    textTransform: "uppercase",
  },
  title: {
    lineHeight: 38,
  },
  intro: {
    maxWidth: 560,
  },
  actionsGrid: {
    gap: Spacing.three,
  },
  actionsSection: {
    gap: Spacing.two,
  },
  actionPressable: {
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  actionCard: {
    alignItems: "center",
    borderRadius: Spacing.three,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 104,
    padding: Spacing.three,
    position: "relative",
  },
  actionNotificationDot: {
    backgroundColor: "#FF7A1A",
    borderColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    position: "absolute",
    right: -5,
    top: -5,
    width: 20,
    zIndex: 2,
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: Spacing.three,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  actionContent: {
    flex: 1,
    gap: Spacing.one,
  },
  settingsModalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.three,
  },
  settingsModalCard: {
    borderRadius: Spacing.three,
    gap: Spacing.three,
    maxHeight: "92%",
    maxWidth: 520,
    padding: Spacing.three,
    width: "100%",
  },
  settingsModalHeader: {
    gap: Spacing.one,
  },
  settingsModalTitle: {
    lineHeight: 38,
  },
  settingsModalScroll: {
    flexGrow: 0,
  },
  settingsModalForm: {
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  settingsFieldGroup: {
    gap: Spacing.one,
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
    height: 116,
    justifyContent: "center",
    width: 104,
  },
  kitPreviewShirt: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 90,
    justifyContent: "center",
    position: "relative",
    width: 100,
  },
  kitPreviewSvg: {
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  kitPreviewNumber: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: 8,
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 2,
    zIndex: 2,
  },
  settingsTextInput: {
    backgroundColor: "#ffffff",
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  settingsNumberRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  settingsNumberInput: {
    backgroundColor: "#ffffff",
    borderRadius: Spacing.two,
    borderWidth: 1,
    flex: 1,
    fontSize: 18,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    textAlign: "center",
  },
  settingsSegmentedRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  settingsSegmentedOption: {
    alignItems: "center",
    borderRadius: Spacing.two,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.two,
  },
  settingsSegmentedOptionSelected: {
    backgroundColor: "#1C7C54",
  },
  settingsSegmentedOptionTextSelected: {
    color: "#ffffff",
  },
  settingsSwatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  settingsSwatch: {
    borderColor: "#D1D5DB",
    borderRadius: Spacing.one,
    borderWidth: 1,
    height: 28,
    width: 28,
  },
  settingsSwatchSelected: {
    borderColor: "#111827",
    borderWidth: 3,
  },
  settingsError: {
    color: "#EF4444",
  },
  settingsSaveButton: {
    alignItems: "center",
    backgroundColor: "#536DFE",
    borderRadius: Spacing.two,
    justifyContent: "center",
    minHeight: 48,
  },
  settingsFooter: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  settingsFooterButton: {
    flex: 1,
  },
  settingsBackButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "#6B7280",
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  settingsBackButtonText: {
    color: "#6B7280",
  },
  settingsSaveButtonText: {
    color: "#ffffff",
  },
  disabledButton: {
    opacity: 0.55,
  },
});
