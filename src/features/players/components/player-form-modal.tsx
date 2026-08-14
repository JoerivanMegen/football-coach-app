import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ActionColors } from "@/constants/theme";
import {
  BirthDatePickerField,
  InjuryDatePickerField,
  PlayerTextInput,
} from "@/features/players/components/player-form-fields";
import { playerStyles as styles } from "@/features/players/components/player-styles";
import {
  formatIsoDateForDisplay,
  parseDisplayDateToIsoDate,
} from "@/features/players/player-form-utils";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import {
  PLAYER_POSITIONS,
  type PlayerInjury,
  type PlayerPosition,
} from "@/features/players/player-types";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
} from "react-native";

export type PlayerFormState = {
  firstName: string;
  lastName: string;
  nickName: string;
  birthDate: string;
  position: PlayerPosition | null;
  kitNumber: string;
  isInjured: boolean;
  injuryDate: string;
  injuryNote: string;
};
export const emptyPlayerFormState: PlayerFormState = {
  firstName: "",
  lastName: "",
  nickName: "",
  birthDate: "",
  position: null,
  kitNumber: "",
  isInjured: false,
  injuryDate: "",
  injuryNote: "",
};

export function PlayerFormModal({
  editing,
  form,
  injuries,
  isBirthDatePickerOpen,
  isInjuryDatePickerOpen,
  isSaving,
  onChange,
  onClose,
  onDeleteInjury,
  onSave,
  onSetBirthDatePickerOpen,
  onSetInjuryDatePickerOpen,
  onUpdateInjury,
  originalInjuryDate,
  visible,
}: {
  editing: boolean;
  form: PlayerFormState;
  isBirthDatePickerOpen: boolean;
  isInjuryDatePickerOpen: boolean;
  isSaving: boolean;
  injuries: PlayerInjury[];
  onChange: (next: PlayerFormState) => void;
  onClose: () => void;
  onSave: () => void;
  onDeleteInjury: (injury: PlayerInjury) => void;
  onSetBirthDatePickerOpen: (open: boolean) => void;
  onSetInjuryDatePickerOpen: (open: boolean) => void;
  originalInjuryDate: string | null;
  visible: boolean;
  onUpdateInjury: (
    injuryId: number,
    input: { startDate: string; endDate: string | null; note: string },
  ) => Promise<boolean>;
}) {
  const theme = useTheme();
  const { locale, t } = useI18n();
  const scrollViewRef = useRef<ScrollView>(null);
  const shouldScrollToInjuryDate = useRef(false);
  const update = (values: Partial<PlayerFormState>) =>
    onChange({ ...form, ...values });

  function scrollToInjuryDate() {
    shouldScrollToInjuryDate.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!shouldScrollToInjuryDate.current) return;
        shouldScrollToInjuryDate.current = false;
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
    });
  }

  function revealInjuryDatePicker() {
    scrollToInjuryDate();
    if (Platform.OS !== "web") onSetInjuryDatePickerOpen(true);
  }

  function handleInjuryToggle(nextIsInjured: boolean) {
    update({
      isInjured: nextIsInjured,
      injuryDate:
        nextIsInjured && originalInjuryDate
          ? originalInjuryDate
          : formatTodayForDisplay(),
    });
    scrollToInjuryDate();
  }
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <ThemedView type="modalBackground" style={styles.modalSheet}>
          <ThemedView style={styles.modalHeader}>
            <ThemedText type="default">
              {t(
                editing ? "players.form.edit_title" : "players.form.add_title",
              )}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              onPress={onClose}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close", web: "close" }}
                tintColor={theme.text}
                size={18}
              />
            </Pressable>
          </ThemedView>
          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContent}
            onContentSizeChange={() => {
              if (!shouldScrollToInjuryDate.current) return;
              shouldScrollToInjuryDate.current = false;
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
          >
            <PlayerTextInput
              label={t("players.form.first_name")}
              required
              value={form.firstName}
              onChangeText={(firstName) => update({ firstName })}
            />
            <PlayerTextInput
              label={t("players.form.last_name")}
              required
              value={form.lastName}
              onChangeText={(lastName) => update({ lastName })}
            />
            <PlayerTextInput
              label={t("players.form.nickname")}
              value={form.nickName}
              onChangeText={(nickName) => update({ nickName })}
            />
            {Platform.OS === "web" ? (
              <PlayerTextInput
                label={t("players.form.birth_date")}
                placeholder={t("common.fields.date.placeholder")}
                value={form.birthDate}
                onChangeText={(birthDate) => update({ birthDate })}
              />
            ) : (
              <BirthDatePickerField
                isOpen={isBirthDatePickerOpen}
                value={form.birthDate}
                onOpen={() => onSetBirthDatePickerOpen(true)}
                onChange={(birthDate) => update({ birthDate })}
                onClose={() => onSetBirthDatePickerOpen(false)}
              />
            )}
            <PlayerTextInput
              label={t("players.form.kit_number")}
              keyboardType="number-pad"
              value={form.kitNumber}
              onChangeText={(kitNumber) => update({ kitNumber })}
            />
            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="smallBold">
                {t("players.form.position")} *
              </ThemedText>
              <ThemedView style={styles.positionGrid}>
                {PLAYER_POSITIONS.map((position) => {
                  const selected = form.position === position;
                  return (
                    <Pressable
                      key={position}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => update({ position })}
                      style={({ pressed }) => [
                        styles.positionOption,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedView
                        style={[
                          styles.positionOptionInner,
                          selected && styles.positionOptionInnerSelected,
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={[
                            styles.positionOptionText,
                            selected && styles.positionOptionTextSelected,
                          ]}
                        >
                          {getPlayerPositionLabel(position, locale)}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </ThemedView>
            </ThemedView>
            {editing ? (
              <ThemedView style={styles.injurySection}>
                <ThemedText type="smallBold">
                  {t("players.form.injury.title")}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t("players.form.injury.help")}
                </ThemedText>
                <ThemedView style={styles.injuryToggleRow}>
                  <ThemedText type="smallBold">
                    {t("players.form.injury.toggle_label")}
                  </ThemedText>
                  <Switch
                    accessibilityLabel={t("players.form.injury.injured")}
                    ios_backgroundColor={theme.backgroundSelected}
                    onValueChange={handleInjuryToggle}
                    thumbColor="#ffffff"
                    trackColor={{
                      false: theme.backgroundSelected,
                      true: ActionColors.primary,
                    }}
                    value={form.isInjured}
                  />
                </ThemedView>
                {form.isInjured || originalInjuryDate ? (
                  Platform.OS === "web" ? (
                    <PlayerTextInput
                      label={t(
                        form.isInjured
                          ? "players.form.injury.start_date"
                          : "players.form.injury.recovery_date",
                      )}
                      placeholder={t("common.fields.date.placeholder")}
                      value={form.injuryDate}
                      onChangeText={(injuryDate) => update({ injuryDate })}
                    />
                  ) : (
                    <InjuryDatePickerField
                      isOpen={isInjuryDatePickerOpen}
                      label={t(
                        form.isInjured
                          ? "players.form.injury.start_date"
                          : "players.form.injury.recovery_date",
                      )}
                      value={form.injuryDate}
                      onOpen={revealInjuryDatePicker}
                      onChange={(injuryDate) => update({ injuryDate })}
                      onClose={() => onSetInjuryDatePickerOpen(false)}
                    />
                  )
                ) : null}
                {form.isInjured ? (
                  <PlayerTextInput
                    label={t("players.form.injury.note")}
                    placeholder={t("players.form.injury.note_placeholder")}
                    value={form.injuryNote}
                    onChangeText={(injuryNote) => update({ injuryNote })}
                  />
                ) : null}
                <InjuryHistory
                  injuries={injuries}
                  onDelete={onDeleteInjury}
                  onUpdate={onUpdateInjury}
                />
              </ThemedView>
            ) : null}
          </ScrollView>
          {!isBirthDatePickerOpen && !isInjuryDatePickerOpen ? (
            <ThemedView style={styles.formActions}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">{t("common.cancel")}</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={onSave}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  isSaving && styles.disabledButton,
                ]}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {isSaving
                    ? t("players.form.saving")
                    : t(editing ? "players.form.update" : "players.form.save")}
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InjuryHistory({
  injuries,
  onDelete,
  onUpdate,
}: {
  injuries: PlayerInjury[];
  onDelete: (injury: PlayerInjury) => void;
  onUpdate: (
    injuryId: number,
    input: { startDate: string; endDate: string | null; note: string },
  ) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");

  function beginEdit(injury: PlayerInjury) {
    setEditingId(injury.id);
    setStartDate(formatIsoDateForDisplay(injury.startDate));
    setEndDate(formatIsoDateForDisplay(injury.endDate));
    setNote(injury.note);
  }

  async function saveEdit(injury: PlayerInjury) {
    const parsedStartDate = parseDisplayDateToIsoDate(startDate);
    const parsedEndDate = endDate.trim()
      ? parseDisplayDateToIsoDate(endDate)
      : null;
    if (!parsedStartDate || (endDate.trim() && !parsedEndDate)) {
      Alert.alert(
        t("players.form.validation.invalid_injury_date.title"),
        t("players.form.validation.invalid_injury_date.message"),
      );
      return;
    }
    const saved = await onUpdate(injury.id, {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      note,
    });
    if (saved) setEditingId(null);
  }

  return (
    <ThemedView style={styles.injuryHistory}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.injuryHistoryHeader,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold">
          {t("players.form.injury.history_title")}
        </ThemedText>
        <SymbolView
          name={
            expanded
              ? {
                  ios: "chevron.up",
                  android: "expand_less",
                  web: "expand_less",
                }
              : {
                  ios: "chevron.down",
                  android: "expand_more",
                  web: "expand_more",
                }
          }
          size={18}
          tintColor={theme.text}
        />
      </Pressable>
      {expanded ? (
        injuries.length ? (
          injuries.map((injury) => {
            const period = `${formatIsoDateForDisplay(injury.startDate)} – ${injury.endDate ? formatIsoDateForDisplay(injury.endDate) : t("players.form.injury.present")}`;
            const title = injury.note.trim()
              ? `${Array.from(injury.note.trim()).slice(0, 50).join("")}${Array.from(injury.note.trim()).length > 50 ? "..." : ""}`
              : period;
            return (
              <ThemedView
                key={injury.id}
                type="backgroundElement"
                style={styles.injuryCard}
              >
                {editingId === injury.id ? (
                  <>
                    <PlayerTextInput
                      label={t("players.form.injury.start_date")}
                      value={startDate}
                      onChangeText={setStartDate}
                    />
                    <PlayerTextInput
                      label={t("players.form.injury.recovery_date")}
                      value={endDate}
                      onChangeText={setEndDate}
                    />
                    <PlayerTextInput
                      label={t("players.form.injury.note")}
                      value={note}
                      onChangeText={setNote}
                    />
                    <ThemedView style={styles.injuryCardActions}>
                      <Pressable
                        onPress={() => setEditingId(null)}
                        style={styles.injurySecondaryAction}
                      >
                        <ThemedText type="smallBold">
                          {t("common.cancel")}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => void saveEdit(injury)}
                        style={styles.injuryPrimaryAction}
                      >
                        <ThemedText
                          type="smallBold"
                          style={styles.primaryButtonText}
                        >
                          {t("players.form.injury.save_changes")}
                        </ThemedText>
                      </Pressable>
                    </ThemedView>
                  </>
                ) : (
                  <>
                    <ThemedView
                      type="backgroundElement"
                      style={styles.injuryCardTitleRow}
                    >
                      <ThemedView
                        type="backgroundElement"
                        style={styles.injuryCardText}
                      >
                        <ThemedText type="smallBold">{title}</ThemedText>
                        {injury.note.trim() ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {period}
                          </ThemedText>
                        ) : null}
                      </ThemedView>
                      {!injury.endDate ? (
                        <ThemedText
                          type="smallBold"
                          style={styles.injuryActiveBadge}
                        >
                          {t("players.form.injury.active")}
                        </ThemedText>
                      ) : null}
                    </ThemedView>
                    <ThemedView style={styles.injuryCardActions}>
                      <Pressable
                        onPress={() => beginEdit(injury)}
                        style={styles.injuryEditAction}
                      >
                        <ThemedText
                          type="smallBold"
                          style={styles.injuryEditText}
                        >
                          {t("players.form.injury.edit")}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => onDelete(injury)}
                        style={styles.injuryDeleteAction}
                      >
                        <ThemedText
                          type="smallBold"
                          style={styles.injuryDeleteText}
                        >
                          {t("players.form.injury.delete")}
                        </ThemedText>
                      </Pressable>
                    </ThemedView>
                  </>
                )}
              </ThemedView>
            );
          })
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {t("players.form.injury.history_empty")}
          </ThemedText>
        )
      ) : null}
    </ThemedView>
  );
}

function formatTodayForDisplay() {
  const today = new Date();
  return [
    String(today.getDate()).padStart(2, "0"),
    String(today.getMonth() + 1).padStart(2, "0"),
    today.getFullYear(),
  ].join("-");
}
