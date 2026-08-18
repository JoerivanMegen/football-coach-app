import DateTimePicker from "@react-native-community/datetimepicker";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Keyboard, Platform, Pressable, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { formatDateForDisplay, formatTimeForDisplay } from "@/features/events/components/event-wizard/event-details-step";
import { matchDayStyles as styles } from "@/features/match-day/components/match-day-styles";
import type { MatchCategory, MatchLocation } from "@/features/match-day/match-day-view-types";
import { parseDisplayDateToDate, parseDisplayTimeToDate } from "@/features/match-day/match-day-utils";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

const matchLocations = ["home", "away"] satisfies MatchLocation[];
const matchCategories = ["league", "cup", "friendly"] satisfies MatchCategory[];

export function MatchTextInput({
  label,
  multiline,
  onChangeText,
  placeholder,
  required,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">
        {label}
        {required ? " *" : ""}
      </ThemedText>
      <TextInput
        autoCapitalize="sentences"
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.textInput,
          multiline && styles.multilineTextInput,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
          },
        ]}
        value={value}
      />
    </ThemedView>
  );
}

export function MatchDatePickerField({
  maximumDate,
  onChange,
  value,
}: {
  maximumDate?: Date;
  onChange: (value: string) => void;
  value: string;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseDisplayDateToDate(value) ?? new Date();

  function handleValueChange(_: unknown, date: Date) {
    if (Platform.OS === "android") {
      setIsOpen(false);
    }

    onChange(formatDateForDisplay(date));
  }

  function handleDismiss() {
    if (Platform.OS === "android") {
      setIsOpen(false);
    }
  }

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">
        {t("matchday.add_match.match_details.date")} *
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.fields.date.choose")}
        onPress={() => {
          Keyboard.dismiss();
          setIsOpen(true);
        }}
        style={({ pressed }) => [
          styles.pickerButton,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{
            ios: "calendar",
            android: "calendar_month",
            web: "calendar_month",
          }}
          tintColor={theme.text}
          size={18}
        />
        <ThemedText type="smallBold">
          {value || t("common.fields.date.choose")}
        </ThemedText>
      </Pressable>

      {isOpen ? (
        <>
          <DateTimePicker
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            mode="date"
            maximumDate={maximumDate}
            onDismiss={handleDismiss}
            onValueChange={handleValueChange}
            value={selectedDate}
          />
          {Platform.OS === "ios" ? (
            <PickerDoneButton onPress={() => setIsOpen(false)} />
          ) : null}
        </>
      ) : null}
    </ThemedView>
  );
}

export function MatchTimePickerField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const selectedTime = parseDisplayTimeToDate(value) ?? new Date();

  function handleValueChange(_: unknown, date: Date) {
    if (Platform.OS === "android") {
      setIsOpen(false);
    }

    onChange(formatTimeForDisplay(date));
  }

  function handleDismiss() {
    if (Platform.OS === "android") {
      setIsOpen(false);
    }
  }

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">
        {t("matchday.add_match.match_details.time")} *
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.fields.time.choose")}
        onPress={() => {
          Keyboard.dismiss();
          setIsOpen(true);
        }}
        style={({ pressed }) => [
          styles.pickerButton,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ ios: "clock", android: "schedule", web: "schedule" }}
          tintColor={theme.text}
          size={18}
        />
        <ThemedText type="smallBold">
          {value || t("common.fields.time.choose")}
        </ThemedText>
      </Pressable>

      {isOpen ? (
        <>
          <DateTimePicker
            display={Platform.OS === "ios" ? "spinner" : "clock"}
            mode="time"
            onDismiss={handleDismiss}
            onValueChange={handleValueChange}
            value={selectedTime}
          />
          {Platform.OS === "ios" ? (
            <PickerDoneButton onPress={() => setIsOpen(false)} />
          ) : null}
        </>
      ) : null}
    </ThemedView>
  );
}

export function MatchLocationField({
  onChange,
  value,
}: {
  onChange: (value: MatchLocation) => void;
  value: MatchLocation;
}) {
  const { t } = useI18n();
  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">
        {t("matchday.add_match.match_details.location.label")} *
      </ThemedText>
      <ThemedView style={styles.segmentedControl}>
        {matchLocations.map((location) => {
          const isSelected = value === location;

          return (
            <Pressable
              key={location}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(location)}
              style={({ pressed }) => [
                styles.segmentedOption,
                isSelected && styles.segmentedOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={isSelected && styles.segmentedOptionTextSelected}
              >
                {t(
                  `matchday.add_match.match_details.location.${location}`,
                )}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

export function MatchCategoryField({
  onChange,
  value,
}: {
  onChange: (value: MatchCategory) => void;
  value: MatchCategory;
}) {
  const { t } = useI18n();
  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">
        {t("matchday.add_match.match_details.type.label")} *
      </ThemedText>
      <ThemedView style={styles.segmentedControl}>
        {matchCategories.map((category) => {
          const isSelected = value === category;

          return (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(category)}
              style={({ pressed }) => [
                styles.segmentedOption,
                isSelected && styles.segmentedOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={isSelected && styles.segmentedOptionTextSelected}
              >
                {t(`matchday.add_match.match_details.type.${category}`)}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

export function PickerDoneButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("common.done")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        styles.pickerDoneButton,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold" style={styles.primaryButtonText}>
        {t("common.done")}
      </ThemedText>
    </Pressable>
  );
}
