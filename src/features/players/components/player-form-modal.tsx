import { SymbolView } from "expo-symbols";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BirthDatePickerField, PlayerTextInput } from "@/features/players/components/player-form-fields";
import { playerStyles as styles } from "@/features/players/components/player-styles";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import { PLAYER_POSITIONS, type PlayerPosition } from "@/features/players/player-types";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

export type PlayerFormState = { firstName: string; lastName: string; nickName: string; birthDate: string; position: PlayerPosition | null; kitNumber: string };
export const emptyPlayerFormState: PlayerFormState = { firstName: "", lastName: "", nickName: "", birthDate: "", position: null, kitNumber: "" };

export function PlayerFormModal({ editing, form, isBirthDatePickerOpen, isSaving, onChange, onClose, onSave, onSetBirthDatePickerOpen, visible }: {
  editing: boolean; form: PlayerFormState; isBirthDatePickerOpen: boolean; isSaving: boolean;
  onChange: (next: PlayerFormState) => void; onClose: () => void; onSave: () => void;
  onSetBirthDatePickerOpen: (open: boolean) => void; visible: boolean;
}) {
  const theme = useTheme();
  const { locale, t } = useI18n();
  const update = (values: Partial<PlayerFormState>) => onChange({ ...form, ...values });
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <ThemedView type="modalBackground" style={styles.modalSheet}>
          <ThemedView style={styles.modalHeader}>
            <ThemedText type="default">{t(editing ? "players.form.edit_title" : "players.form.add_title")}</ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={onClose} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} tintColor={theme.text} size={18} />
            </Pressable>
          </ThemedView>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
            <PlayerTextInput label={t("players.form.first_name")} required value={form.firstName} onChangeText={(firstName) => update({ firstName })} />
            <PlayerTextInput label={t("players.form.last_name")} required value={form.lastName} onChangeText={(lastName) => update({ lastName })} />
            <PlayerTextInput label={t("players.form.nickname")} value={form.nickName} onChangeText={(nickName) => update({ nickName })} />
            {Platform.OS === "web" ? <PlayerTextInput label={t("players.form.birth_date")} placeholder={t("common.fields.date.placeholder")} value={form.birthDate} onChangeText={(birthDate) => update({ birthDate })} /> : <BirthDatePickerField isOpen={isBirthDatePickerOpen} value={form.birthDate} onOpen={() => onSetBirthDatePickerOpen(true)} onChange={(birthDate) => update({ birthDate })} onClose={() => onSetBirthDatePickerOpen(false)} />}
            <PlayerTextInput label={t("players.form.kit_number")} keyboardType="number-pad" value={form.kitNumber} onChangeText={(kitNumber) => update({ kitNumber })} />
            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="smallBold">{t("players.form.position")} *</ThemedText>
              <ThemedView style={styles.positionGrid}>
                {PLAYER_POSITIONS.map((position) => { const selected = form.position === position; return (
                  <Pressable key={position} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => update({ position })} style={({ pressed }) => [styles.positionOption, pressed && styles.pressed]}>
                    <ThemedView style={[styles.positionOptionInner, selected && styles.positionOptionInnerSelected]}><ThemedText type="smallBold" style={[styles.positionOptionText, selected && styles.positionOptionTextSelected]}>{getPlayerPositionLabel(position, locale)}</ThemedText></ThemedView>
                  </Pressable>
                ); })}
              </ThemedView>
            </ThemedView>
          </ScrollView>
          <ThemedView style={styles.formActions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><ThemedText type="smallBold">{t("common.cancel")}</ThemedText></Pressable>
            <Pressable accessibilityRole="button" disabled={isSaving} onPress={onSave} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, isSaving && styles.disabledButton]}><ThemedText type="smallBold" style={styles.primaryButtonText}>{isSaving ? t("players.form.saving") : t(editing ? "players.form.update" : "players.form.save")}</ThemedText></Pressable>
          </ThemedView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
