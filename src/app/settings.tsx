import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
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
import {
  BottomTabInset,
  MaxContentWidth,
  PageTopPadding,
  Spacing,
} from "@/constants/theme";
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

const defaultTeamSettingsForm: SaveTeamSettingsInput = {
  teamName: "",
  clubLocation: "",
  kitDesign: "solid",
  outfieldKitColor: "#FFFFFF",
  secondaryKitColor: "#536DFE",
  sashAccentKitColor: "#EF4444",
  kitNumberColor: "#111827",
  goalkeeperKitColor: "#111827",
  matchDurationMinutes: 90,
  trainingDays: [],
  trainingStartTime: "",
  preferNicknames: true,
  fineJarEnabled: false,
};

const kitShirtPath =
  "M34 7 C38 11 62 11 66 7 L76 7 L95 25 Q98 27 96 31 L87 47 Q85 51 81 49 L73 44 L73 83 Q73 87 69 87 L31 87 Q27 87 27 83 L27 44 L19 49 Q15 51 13 47 L4 31 Q2 27 5 25 L24 7 Z";

const kitDesignOptions = [
  { value: "solid", label: "Regular" },
  { value: "stripes", label: "Stripes" },
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
  "#FF7A1A",
  "#EF4444",
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
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [form, setForm] = useState<SaveTeamSettingsInput>(
    defaultTeamSettingsForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const settings = await getTeamSettingsAsync();

        if (!isMounted || !settings) {
          return;
        }

        setForm({
          teamName: settings.teamName,
          clubLocation: settings.clubLocation,
          kitDesign: settings.kitDesign,
          outfieldKitColor: settings.outfieldKitColor,
          secondaryKitColor: settings.secondaryKitColor,
          sashAccentKitColor: settings.sashAccentKitColor,
          kitNumberColor: settings.kitNumberColor,
          goalkeeperKitColor: settings.goalkeeperKitColor,
          matchDurationMinutes: settings.matchDurationMinutes,
          trainingDays: settings.trainingDays,
          trainingStartTime: settings.trainingStartTime,
          preferNicknames: settings.preferNicknames,
          fineJarEnabled: settings.fineJarEnabled,
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

      if (savedSettings) {
        setForm({
          teamName: savedSettings.teamName,
          clubLocation: savedSettings.clubLocation,
          kitDesign: savedSettings.kitDesign,
          outfieldKitColor: savedSettings.outfieldKitColor,
          secondaryKitColor: savedSettings.secondaryKitColor,
          sashAccentKitColor: savedSettings.sashAccentKitColor,
          kitNumberColor: savedSettings.kitNumberColor,
          goalkeeperKitColor: savedSettings.goalkeeperKitColor,
          matchDurationMinutes: savedSettings.matchDurationMinutes,
          trainingDays: savedSettings.trainingDays,
          trainingStartTime: savedSettings.trainingStartTime,
          preferNicknames: savedSettings.preferNicknames,
          fineJarEnabled: savedSettings.fineJarEnabled,
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
              name={{ ios: "tshirt.fill", android: "checkroom", web: "checkroom" }}
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
          {form.kitDesign === "sash" ? (
            <SettingsColorField
              label="Third colour"
              value={form.sashAccentKitColor}
              onChange={(value) =>
                updateFormValue("sashAccentKitColor", value)
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
            onChange={(value) => updateFormValue("goalkeeperKitColor", value)}
          />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedView style={styles.sectionHeader}>
            <SymbolView
              name={{ ios: "slider.horizontal.3", android: "tune", web: "tune" }}
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
              name={{ ios: "figure.soccer", android: "sports_soccer", web: "sports_soccer" }}
              size={22}
              tintColor={theme.text}
            />
            <ThemedText type="default">Training preferences</ThemedText>
          </ThemedView>

          <SettingsTrainingFields form={form} onChange={updateFormValue} />
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
                      ? "#536DFE"
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease match minutes"
            onPress={() => updateMatchMinutes(form.matchDurationMinutes - 5)}
            style={({ pressed }) => [
              styles.stepperButton,
              { borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold">-</ThemedText>
          </Pressable>
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
                borderColor: theme.backgroundSelected,
                color: theme.text,
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase match minutes"
            onPress={() => updateMatchMinutes(form.matchDurationMinutes + 5)}
            style={({ pressed }) => [
              styles.stepperButton,
              { borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold">+</ThemedText>
          </Pressable>
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
                    ? "#536DFE"
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
          Useful for reminders later. Leave empty if training changes every week.
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
                  {
                    borderColor: isSelected
                      ? "#536DFE"
                      : theme.backgroundSelected,
                  },
                  isSelected && styles.trainingDayOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={isSelected && styles.trainingDayOptionTextSelected}
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
                  fill={form.sashAccentKitColor}
                />
              </>
            ) : null}
          </G>
          <Path
            d={kitShirtPath}
            fill="none"
            stroke="#111827"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth={5}
          />
          <Path
            d="M37 7 Q50 15 63 7"
            fill="none"
            stroke="#111827"
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
  const theme = useTheme();

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedView style={styles.colorRow}>
        <ThemedView
          style={[styles.colorPreview, { backgroundColor: value || "transparent" }]}
        />
        <TextInput
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          placeholder="#FFFFFF"
          placeholderTextColor={theme.textSecondary}
          value={value}
          onChangeText={onChange}
          style={[
            styles.colorInput,
            {
              borderColor: theme.backgroundSelected,
              color: theme.text,
            },
          ]}
        />
      </ThemedView>
      <ThemedView style={styles.swatchRow}>
        {colorOptions.map((color) => (
          <Pressable
            key={`${label}-${color}`}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${color}`}
            onPress={() => onChange(color)}
            style={[
              styles.swatch,
              { backgroundColor: color },
              value.toUpperCase() === color && styles.swatchSelected,
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
    paddingTop: PageTopPadding,
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
    backgroundColor: "#536DFE",
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
    textShadowRadius: 2,
    zIndex: 2,
  },
  colorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  colorPreview: {
    borderColor: "#D1D5DB",
    borderRadius: Spacing.two,
    borderWidth: 1,
    height: 44,
    width: 44,
  },
  colorInput: {
    backgroundColor: "#ffffff",
    borderRadius: Spacing.two,
    borderWidth: 1,
    flex: 1,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  swatch: {
    borderColor: "#D1D5DB",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    width: 28,
  },
  swatchSelected: {
    borderColor: "#536DFE",
    borderWidth: 3,
  },
  numberRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  stepperButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: Spacing.two,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
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
    backgroundColor: "#536DFE",
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
    backgroundColor: "#ffffff",
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 64,
    paddingHorizontal: Spacing.two,
  },
  trainingDayOptionSelected: {
    backgroundColor: "#536DFE",
  },
  trainingDayOptionTextSelected: {
    color: "#ffffff",
  },
  errorText: {
    color: "#EF4444",
  },
  successText: {
    color: "#1C7C54",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#536DFE",
    borderRadius: Spacing.two,
    justifyContent: "center",
    minHeight: 48,
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
