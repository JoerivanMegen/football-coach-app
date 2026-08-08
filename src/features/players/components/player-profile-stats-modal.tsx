import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import type { Player } from "@/features/players/player-types";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

export function PlayerProfileStatsModal({ children, onClose, player, visible }: {
  children: ReactNode;
  onClose: () => void;
  player: Player | null;
  visible: boolean;
}) {
  const theme = useTheme();
  const { locale, t } = useI18n();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <ThemedView type="modalBackground" style={styles.sheet}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.titleGroup}>
              <ThemedText type="subtitle" style={styles.playerName}>
                {player ? `${player.firstName} ${player.lastName}` : t("players.stats.player_title")}
              </ThemedText>
              {player ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {getPlayerPositionLabel(player.position, locale)}
                  {player.kitNumber !== null ? ` · #${player.kitNumber}` : ""}
                </ThemedText>
              ) : null}
            </ThemedView>
            <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} tintColor={theme.text} size={18} />
            </Pressable>
          </ThemedView>
          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(0, 0, 0, 0.45)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  sheet: { borderTopLeftRadius: Spacing.four, borderTopRightRadius: Spacing.four, gap: Spacing.three, maxHeight: "90%", padding: Spacing.four },
  header: { alignItems: "flex-start", flexDirection: "row", gap: Spacing.three, justifyContent: "space-between" },
  titleGroup: { flex: 1, gap: Spacing.one },
  playerName: { fontSize: 24, lineHeight: 30 },
  closeButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  content: { gap: Spacing.three, paddingBottom: Spacing.one },
  pressed: { opacity: 0.7 },
});
