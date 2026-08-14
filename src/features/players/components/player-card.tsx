import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ActionColors, Spacing } from "@/constants/theme";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import type { Player } from "@/features/players/player-types";
import { useI18n } from "@/i18n/i18n-provider";

export function PlayerCard({
  player,
  onArchivePlayer,
  onEditPlayer,
  onOpenStats,
}: {
  player: Player;
  onArchivePlayer: (player: Player) => void;
  onEditPlayer: (player: Player) => void;
  onOpenStats: () => void;
}) {
  const { locale, t } = useI18n();
  const name = `${player.firstName} ${player.lastName}`;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedView type="backgroundElement" style={styles.nameGroup}>
          <ThemedView type="backgroundElement" style={styles.playerNameRow}>
            <ThemedText type="default">{name}</ThemedText>
            {player.activeInjuryStartDate ? (
              <ThemedView
                accessibilityLabel={t("players.form.injury.badge")}
                type="backgroundElement"
                style={styles.injuryBadge}
              >
                <SymbolView
                  name={{ ios: "cross.case.fill", android: "healing", web: "healing" }}
                  tintColor={ActionColors.danger}
                  size={16}
                />
              </ThemedView>
            ) : null}
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">
            {getPlayerPositionLabel(player.position, locale)}
            {player.kitNumber !== null ? ` · #${player.kitNumber}` : ""}
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.actions}>
          <ActionButton
            accessibilityLabel={`View stats for ${name}`}
            color={ActionColors.info}
            icon={{ ios: "chart.bar.xaxis", android: "bar_chart", web: "bar_chart" }}
            onPress={onOpenStats}
          />
          <ActionButton
            accessibilityLabel={`Edit ${name}`}
            color={ActionColors.warning}
            icon={{ ios: "pencil", android: "edit", web: "edit" }}
            onPress={() => onEditPlayer(player)}
          />
          <ActionButton
            accessibilityLabel={`Delete ${name}`}
            color={ActionColors.danger}
            icon={{ ios: "trash", android: "delete", web: "delete" }}
            onPress={() => onArchivePlayer(player)}
          />
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

function ActionButton({ accessibilityLabel, color, icon, onPress }: {
  accessibilityLabel: string;
  color: string;
  icon: ComponentProps<typeof SymbolView>["name"];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, { borderColor: color }, pressed && styles.pressed]}
    >
      <SymbolView name={icon} tintColor={color} size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, gap: Spacing.two, padding: Spacing.three },
  row: { alignItems: "center", flexDirection: "row", gap: Spacing.two, minHeight: 52 },
  nameGroup: { flex: 1, gap: Spacing.one },
  playerNameRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  injuryBadge: { alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.one, justifyContent: "flex-end" },
  actionButton: { alignItems: "center", backgroundColor: "transparent", borderRadius: Spacing.two, borderWidth: 1.5, height: 40, justifyContent: "center", minHeight: 40, width: 40 },
  pressed: { opacity: 0.65 },
});
