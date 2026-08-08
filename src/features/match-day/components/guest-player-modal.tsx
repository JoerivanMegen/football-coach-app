import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PlayerRoleOption } from "@/features/match-day/components/match-availability-step";
import { matchDayStyles as styles } from "@/features/match-day/components/match-day-styles";
import { addGuestPlayerAsync } from "@/features/match-day/guest-player-repository";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import { PLAYER_POSITIONS, type Player, type PlayerPosition } from "@/features/players/player-types";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

export function GuestPlayerModal({
  guestPlayers,
  matchGuestPlayerIds,
  onAddGuest,
  onClose,
  visible,
}: {
  guestPlayers: Player[];
  matchGuestPlayerIds: number[];
  onAddGuest: (player: Player) => void;
  onClose: () => void;
  visible: boolean;
}) {
  const { locale, t } = useI18n();
  const theme = useTheme();
  const [name, setName] = useState("");
  const [position, setPosition] = useState<PlayerPosition>("midfielder");
  const [isSaving, setIsSaving] = useState(false);

  async function handleAddName() {
    if (!name.trim() || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      const player = await addGuestPlayerAsync(name, position);
      onAddGuest(player);
      setName("");
      setPosition("midfielder");
    } catch (error) {
      console.warn("Failed to add guest player", error);
      Alert.alert(
        t("matchday.add_match.guest_players.error.title"),
        t("common.errors.generic_message"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    setName("");
    setPosition("midfielder");
    onClose();
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.guestModalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <ThemedView type="modalBackground" style={styles.guestModalCard}>
          <ThemedView style={styles.modalHeader}>
            <ThemedView style={styles.modalTitleGroup}>
              <ThemedText type="default">
                {t("matchday.add_match.guest_players.title")}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t("matchday.add_match.guest_players.description")}
              </ThemedText>
            </ThemedView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              onPress={handleClose}
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

          <ThemedView style={styles.guestNameRow}>
            <TextInput
              accessibilityLabel={t("matchday.add_match.guest_players.name")}
              autoCapitalize="words"
              autoFocus
              onChangeText={setName}
              onSubmitEditing={() => void handleAddName()}
              placeholder={t("matchday.add_match.guest_players.name_placeholder")}
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
              style={[
                styles.textInput,
                styles.guestNameInput,
                { backgroundColor: theme.backgroundElement, color: theme.text },
              ]}
              value={name}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("matchday.add_match.guest_players.title")}
              disabled={!name.trim() || isSaving}
              onPress={() => void handleAddName()}
              style={({ pressed }) => [
                styles.guestAddButton,
                (!name.trim() || isSaving) && styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                {t("common.add")}
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.fieldGroup}>
            <ThemedText type="smallBold">
              {t("matchday.add_match.guest_players.position")}
            </ThemedText>
            <ThemedView style={styles.guestPositionOptions}>
              {PLAYER_POSITIONS.map((playerPosition) => (
                <PlayerRoleOption
                  isSelected={position === playerPosition}
                  key={playerPosition}
                  label={getPlayerPositionLabel(playerPosition, locale)}
                  onPress={() => setPosition(playerPosition)}
                />
              ))}
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.guestHistorySection}>
            <ThemedText type="smallBold">
              {t("matchday.add_match.guest_players.previous")}
            </ThemedText>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.guestHistoryList}
            >
              {guestPlayers.length > 0 ? (
                guestPlayers.map((player) => {
                  const isAdded = matchGuestPlayerIds.includes(player.id);
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: isAdded }}
                      disabled={isAdded}
                      key={player.id}
                      onPress={() => onAddGuest(player)}
                      style={({ pressed }) => [
                        styles.guestHistoryRow,
                        { backgroundColor: theme.backgroundElement },
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        numberOfLines={1}
                        style={styles.guestHistoryName}
                      >
                        {formatPlayerDisplayName(player)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {getPlayerPositionLabel(player.position, locale)}
                      </ThemedText>
                      <ThemedText
                        type="small"
                        themeColor={isAdded ? "textSecondary" : undefined}
                        style={
                          !isAdded ? styles.guestHistoryAddText : undefined
                        }
                      >
                        {isAdded
                          ? t("matchday.add_match.guest_players.added")
                          : t("common.add")}
                      </ThemedText>
                    </Pressable>
                  );
                })
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  {t("matchday.add_match.guest_players.empty")}
                </ThemedText>
              )}
            </ScrollView>
          </ThemedView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function formatPlayerDisplayName(player: Player) { return [player.firstName, player.lastName].filter(Boolean).join(" "); }
