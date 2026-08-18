import DateTimePicker from "@react-native-community/datetimepicker";
import { SymbolView } from "expo-symbols";
import { Keyboard, Platform, Pressable, StyleSheet, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ActionColors, Spacing } from "@/constants/theme";
import { formatDateForDisplay, parseDisplayDateToDate } from "@/features/players/player-form-utils";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

export function PlayerTextInput({ label, value, onChangeText, placeholder, required, keyboardType = "default" }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: "default" | "number-pad";
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">{label}{required ? " *" : ""}</ThemedText>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.textInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        value={value}
      />
    </ThemedView>
  );
}

export function BirthDatePickerField({ isOpen, value, onOpen, onChange, onClose }: {
  isOpen: boolean;
  value: string;
  onOpen: () => void;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const selectedDate = parseDisplayDateToDate(value) ?? new Date(2012, 0, 1);

  function handleValueChange(_: unknown, date: Date) {
    if (Platform.OS === "android") onClose();
    onChange(formatDateForDisplay(date));
  }

  return (
    <ThemedView style={styles.fieldGroup}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("players.form.birth_date")}
        onPress={() => {
          Keyboard.dismiss();
          onOpen();
        }}
        style={({ pressed }) => [styles.datePickerButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}
      >
        <SymbolView name={{ ios: "calendar", android: "calendar_month", web: "calendar_month" }} tintColor={theme.text} size={18} />
        <ThemedText type="smallBold">{value || t("players.form.birth_date")}</ThemedText>
      </Pressable>
      {isOpen ? (
        <>
          <DateTimePicker
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            maximumDate={new Date()}
            mode="date"
            onDismiss={() => { if (Platform.OS === "android") onClose(); }}
            onValueChange={handleValueChange}
            value={selectedDate}
          />
          {Platform.OS === "ios" ? <PickerDoneButton onPress={onClose} /> : null}
        </>
      ) : null}
    </ThemedView>
  );
}

export function InjuryDatePickerField({ isOpen, label, value, onOpen, onChange, onClose }: {
  isOpen: boolean;
  label: string;
  value: string;
  onOpen: () => void;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const selectedDate = parseDisplayDateToDate(value) ?? new Date();

  function handleValueChange(_: unknown, date: Date) {
    if (Platform.OS === "android") onClose();
    onChange(formatDateForDisplay(date));
  }

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          Keyboard.dismiss();
          onOpen();
        }}
        style={({ pressed }) => [styles.datePickerButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}
      >
        <SymbolView name={{ ios: "calendar", android: "calendar_month", web: "calendar_month" }} tintColor={theme.text} size={18} />
        <ThemedText type="smallBold">{value}</ThemedText>
      </Pressable>
      {isOpen ? (
        <>
          <DateTimePicker
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            maximumDate={new Date()}
            mode="date"
            onDismiss={() => { if (Platform.OS === "android") onClose(); }}
            onValueChange={handleValueChange}
            value={selectedDate}
          />
          {Platform.OS === "ios" ? <PickerDoneButton onPress={onClose} /> : null}
        </>
      ) : null}
    </ThemedView>
  );
}

function PickerDoneButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t("common.done")} onPress={onPress} style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={styles.doneText}>{t("common.done")}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { gap: Spacing.two },
  textInput: { borderRadius: Spacing.two, fontSize: 16, minHeight: 48, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  datePickerButton: { alignItems: "center", borderRadius: Spacing.two, flexDirection: "row", gap: Spacing.two, minHeight: 48, paddingHorizontal: Spacing.three },
  doneButton: { alignItems: "center", alignSelf: "flex-end", backgroundColor: ActionColors.primary, borderRadius: Spacing.two, justifyContent: "center", marginTop: Spacing.one, minHeight: 44, paddingHorizontal: Spacing.three },
  doneText: { color: ActionColors.onAccent },
  pressed: { opacity: 0.65 },
});
