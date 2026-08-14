import { SymbolView } from "expo-symbols";
import { Alert, Pressable, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { clampNumber, parseNumericInputValue } from "@/features/match-day/match-result-utils";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

import { matchDayStyles as styles } from "./match-day-styles";

export function NumericStepperInput({ label, max, min = 0, onChange, value }: {
  label: string; max: number; min?: number; onChange: (value: number) => void; value: number;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <ThemedView style={styles.numericStepperGroup}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedView style={styles.numericStepper}>
        <StepperButton label={t("matchday.result.controls.decrease", { label })} symbol="minus" onPress={() => onChange(clampNumber(value - 1, min, max))} />
        <TextInput
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={3}
          onChangeText={(nextValue) => onChange(parseNumericInputValue(nextValue, min, max))}
          selectTextOnFocus
          style={[styles.numericStepperInput, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, color: theme.text }]}
          value={String(value)}
        />
        <StepperButton label={t("matchday.result.controls.increase", { label })} symbol="plus" onPress={() => onChange(clampNumber(value + 1, min, max))} />
      </ThemedView>
    </ThemedView>
  );
}

export function StatStepper({ label, max, maxWarning, min = 0, onChange, value }: {
  label: string; max?: number; maxWarning?: string; min?: number; onChange: (value: number) => void; value: number;
}) {
  const { t } = useI18n();
  function handleIncrease() {
    if (max !== undefined && value >= max) {
      if (maxWarning) {
        Alert.alert(t("matchday.result.validation.limit_reached"), maxWarning);
      }
      return;
    }
    onChange(max === undefined ? value + 1 : Math.min(max, value + 1));
  }
  return (
    <ThemedView style={styles.statStepperGroup}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedView style={styles.statStepper}>
        <StepperButton label={t("matchday.result.controls.decrease", { label })} symbol="minus" onPress={() => onChange(Math.max(min, value - 1))} />
        <ThemedText type="smallBold" style={styles.statStepperValue}>{value}</ThemedText>
        <StepperButton label={t("matchday.result.controls.increase", { label })} symbol="plus" onPress={handleIncrease} />
      </ThemedView>
    </ThemedView>
  );
}

export function ResultSegmentedField<TValue extends string>({ label, onChange, options, value }: {
  label: string; onChange: (value: TValue) => void; options: { label: string; value: TValue }[]; value: TValue;
}) {
  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedView style={styles.resultSegmentedControl}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [styles.resultSegmentedOption, isSelected && styles.resultSegmentedOptionSelected, pressed && styles.pressed]}
            >
              <ThemedText type="smallBold" style={[styles.resultSegmentedOptionText, isSelected && styles.resultSegmentedOptionTextSelected]}>{option.label}</ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

export function ScoreStepper({ accessibilityLabel, onChange, value }: {
  accessibilityLabel: string; onChange: (value: number) => void; value: number;
}) {
  const { t } = useI18n();
  return (
    <ThemedView style={styles.scoreStepper}>
      <ScoreButton label={t("matchday.result.controls.decrease", { label: accessibilityLabel })} symbol="minus" onPress={() => onChange(Math.max(0, value - 1))} />
      <ThemedText type="title" style={styles.scoreValue}>{value}</ThemedText>
      <ScoreButton label={t("matchday.result.controls.increase", { label: accessibilityLabel })} symbol="plus" onPress={() => onChange(value + 1)} />
    </ThemedView>
  );
}

function StepperButton({ label, onPress, symbol }: { label: string; onPress: () => void; symbol: "minus" | "plus" }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.statStepperButton, pressed && styles.pressed]}>
      <SymbolView name={symbol === "minus" ? { ios: "minus", android: "remove", web: "remove" } : { ios: "plus", android: "add", web: "add" }} tintColor="#1C7C54" size={14} />
    </Pressable>
  );
}

function ScoreButton({ label, onPress, symbol }: { label: string; onPress: () => void; symbol: "minus" | "plus" }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.scoreStepperButton, pressed && styles.pressed]}>
      <SymbolView name={symbol === "minus" ? { ios: "minus", android: "remove", web: "remove" } : { ios: "plus", android: "add", web: "add" }} tintColor="#1C7C54" size={18} />
    </Pressable>
  );
}
