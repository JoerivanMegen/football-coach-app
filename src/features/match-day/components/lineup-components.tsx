import { Image } from "expo-image";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import { Animated, type LayoutChangeEvent, Modal, PanResponder, Pressable, ScrollView, type StyleProp, type ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { OutlinedText } from "@/components/outlined-text";
import { ActionColors } from "@/constants/theme";
import { defaultMatchDurationMinutes, formationSlots, kitShirtPath, matchFormations, substituteSlots } from "@/features/match-day/match-day-config";
import { matchDayStyles as styles } from "@/features/match-day/components/match-day-styles";
import type { AssignmentSlot, DropTarget, JerseyResultBadges, LayoutBox, LineupAssignments, LineupKitSettings, MatchFormation, MatchResultSquadEntry, MatchSetupFormState, PitchLayout } from "@/features/match-day/match-day-view-types";
import type { MatchPlayerResultStat, MatchPlayerResultStats } from "@/features/match-day/match-day-types";
import { findNearestDropTarget, formatPlayerDisplayName, formatPlayerMeta, formatPlayerName, getAssignedPlayer, getPitchSlotCenter, resetDragPosition, sortPlayersForAssignmentSlot } from "@/features/match-day/lineup-utils";
import type { PlayerAttendanceStats } from "@/features/player-stats/player-stats-types";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import type { Player } from "@/features/players/player-types";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

export function ReviewPitch({
  form,
  kitSettings,
  matchDurationMinutes = defaultMatchDurationMinutes,
  onPlayerPress,
  playerResultStats,
  playerRoleById,
  players,
  preferNicknames,
}: {
  form: MatchSetupFormState;
  kitSettings: LineupKitSettings;
  matchDurationMinutes?: number;
  onPlayerPress?: (player: Player) => void;
  playerResultStats?: MatchPlayerResultStats;
  playerRoleById?: Map<number, MatchResultSquadEntry["role"]>;
  players: Player[];
  preferNicknames: boolean;
}) {
  const { t } = useI18n();
  const selectedFormation = normalizeMatchFormation(form.formation);
  const slots = formationSlots[selectedFormation];

  return (
    <ThemedView style={styles.reviewPitch}>
      <ThemedView style={styles.reviewPitchImageClip}>
        <Image
          source={require("@/assets/images/match-day/pitch.png")}
          contentFit="cover"
          style={styles.pitchImage}
        />
      </ThemedView>

      <ThemedView style={styles.pitchPlayersLayer}>
        {slots.map((slot) => {
          const assignedPlayer = getAssignedPlayer(
            form.lineupAssignments[slot.id],
            players,
          );

          if (!assignedPlayer) {
            return null;
          }

          return (
            <Pressable
              accessibilityRole={onPlayerPress ? "button" : undefined}
              accessibilityLabel={
                onPlayerPress
                  ? t("matchday.result.player_performance.edit_player", {
                      player: formatPlayerName(
                        assignedPlayer,
                        preferNicknames,
                      ),
                    })
                  : undefined
              }
              key={`${selectedFormation}-${slot.id}`}
              onPress={
                onPlayerPress
                  ? () => onPlayerPress(assignedPlayer)
                  : undefined
              }
              style={[
                styles.reviewPitchPlayer,
                {
                  left: slot.left,
                  top: slot.top,
                },
              ]}
            >
              <LineupJersey
                compact
                isCaptain={assignedPlayer.id === form.captainPlayerId}
                isGoalkeeper={slot.isGoalkeeper}
                kitSettings={kitSettings}
                player={assignedPlayer}
                preferNicknames={preferNicknames}
                resultBadges={
                  playerResultStats
                    ? getJerseyResultBadges(
                        playerResultStats[assignedPlayer.id],
                        playerRoleById?.get(assignedPlayer.id) ?? "starter",
                        matchDurationMinutes,
                      )
                    : undefined
                }
                showName
              />
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

export function SubstituteBench({
  assignments,
  captainPlayerId,
  dropTargets,
  kitSettings,
  onDragPlayerChange,
  onMovePlayer,
  onRegisterDropTarget,
  onSelectAssignedSlot,
  onSelectSlot,
  players,
  preferNicknames,
}: {
  assignments: LineupAssignments;
  captainPlayerId: number | null;
  dropTargets: Record<string, DropTarget>;
  kitSettings: LineupKitSettings;
  onDragPlayerChange: (isDragging: boolean) => void;
  onMovePlayer: (fromSlotId: string, toSlotId: string) => void;
  onRegisterDropTarget: (target: DropTarget) => void;
  onSelectAssignedSlot: (slotId: string) => void;
  onSelectSlot: (slotId: string) => void;
  players: Player[];
  preferNicknames: boolean;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const [sectionLayout, setSectionLayout] = useState<LayoutBox | null>(null);
  const [gridLayout, setGridLayout] = useState<LayoutBox | null>(null);
  const [slotLayouts, setSlotLayouts] = useState<Record<string, LayoutBox>>({});

  useEffect(() => {
    if (!sectionLayout || !gridLayout) {
      return;
    }

    for (const [slotId, slotLayout] of Object.entries(slotLayouts)) {
      onRegisterDropTarget({
        id: slotId,
        x: sectionLayout.x + gridLayout.x + slotLayout.x + slotLayout.width / 2,
        y:
          sectionLayout.y + gridLayout.y + slotLayout.y + slotLayout.height / 2,
      });
    }
  }, [gridLayout, onRegisterDropTarget, sectionLayout, slotLayouts]);

  function handleSlotLayout(slotId: string, event: LayoutChangeEvent) {
    const { height, width, x, y } = event.nativeEvent.layout;
    setSlotLayouts((currentLayouts) => ({
      ...currentLayouts,
      [slotId]: { height, width, x, y },
    }));
  }

  return (
    <ThemedView
      style={styles.substituteSection}
      onLayout={(event) => {
        const { height, width, x, y } = event.nativeEvent.layout;
        setSectionLayout({ height, width, x, y });
      }}
    >
      <ThemedText type="smallBold">
        {t("matchday.add_match.lineup.substitutes")}
      </ThemedText>
      <ThemedView
        style={styles.substituteGrid}
        onLayout={(event) => {
          const { height, width, x, y } = event.nativeEvent.layout;
          setGridLayout({ height, width, x, y });
        }}
      >
        {substituteSlots.map((slot) => {
          const assignedPlayer = getAssignedPlayer(
            assignments[slot.id],
            players,
          );

          if (assignedPlayer) {
            return (
              <DraggableLineupSlot
                key={slot.id}
                compact
                isCaptain={assignedPlayer.id === captainPlayerId}
                kitSettings={kitSettings}
                dropTargets={dropTargets}
                player={assignedPlayer}
                preferNicknames={preferNicknames}
                playerNameColor={theme.text}
                playerNameShadow={false}
                slot={slot}
                slotStyle={[
                  styles.substituteSlot,
                  styles.substituteSlotAssigned,
                ]}
                onDragPlayerChange={onDragPlayerChange}
                onLayout={(event) => handleSlotLayout(slot.id, event)}
                onMovePlayer={onMovePlayer}
                onSelectSlot={onSelectAssignedSlot}
                showName
              />
            );
          }

          return (
            <Pressable
              key={slot.id}
              accessibilityRole="button"
              accessibilityLabel={t("matchday.add_match.lineup.add_substitute", {
                label: slot.label,
              })}
              onLayout={(event) => handleSlotLayout(slot.id, event)}
              onPress={() => onSelectSlot(slot.id)}
              style={({ pressed }) => [
                styles.substituteSlot,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="subtitle" style={styles.substituteSlotPlus}>
                +
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

export function FootballPitch({
  assignments,
  captainPlayerId,
  dropTargets,
  formation,
  kitSettings,
  onDragPlayerChange,
  onMovePlayer,
  onRegisterDropTargets,
  onSelectAssignedSlot,
  onSelectSlot,
  players,
  preferNicknames,
}: {
  assignments: LineupAssignments;
  captainPlayerId: number | null;
  dropTargets: Record<string, DropTarget>;
  formation: MatchFormation;
  kitSettings: LineupKitSettings;
  onDragPlayerChange: (isDragging: boolean) => void;
  onMovePlayer: (fromSlotId: string, toSlotId: string) => void;
  onRegisterDropTargets: (targets: DropTarget[]) => void;
  onSelectAssignedSlot: (slotId: string) => void;
  onSelectSlot: (slotId: string) => void;
  players: Player[];
  preferNicknames: boolean;
}) {
  const selectedFormation = normalizeMatchFormation(formation);
  const slots = formationSlots[selectedFormation];
  const [pitchLayout, setPitchLayout] = useState<PitchLayout | null>(null);

  function handlePitchLayout(event: LayoutChangeEvent) {
    const { height, width, x, y } = event.nativeEvent.layout;
    setPitchLayout({ height, width, x, y });
  }

  useEffect(() => {
    if (!pitchLayout) {
      return;
    }

    onRegisterDropTargets(
      slots.map((slot) => ({
        id: slot.id,
        ...getPitchSlotCenter(slot, pitchLayout),
      })),
    );
  }, [onRegisterDropTargets, pitchLayout, slots]);

  return (
    <ThemedView style={styles.pitch} onLayout={handlePitchLayout}>
      <ThemedView style={styles.pitchImageClip}>
        <Image
          source={require("@/assets/images/match-day/pitch.png")}
          contentFit="cover"
          style={styles.pitchImage}
        />
      </ThemedView>

      <ThemedView style={styles.pitchPlayersLayer}>
        {slots.map((slot) => {
          const assignedPlayer = getAssignedPlayer(
            assignments[slot.id],
            players,
          );

          if (assignedPlayer) {
            return (
              <DraggableLineupSlot
                key={`${selectedFormation}-${slot.id}`}
                dropTargets={dropTargets}
                isCaptain={assignedPlayer.id === captainPlayerId}
                isGoalkeeper={slot.isGoalkeeper}
                kitSettings={kitSettings}
                player={assignedPlayer}
                preferNicknames={preferNicknames}
                slot={slot}
                slotStyle={[
                  styles.pitchSlot,
                  styles.pitchSlotAssigned,
                  { left: slot.left, top: slot.top },
                ]}
                onDragPlayerChange={onDragPlayerChange}
                onMovePlayer={onMovePlayer}
                onSelectSlot={onSelectAssignedSlot}
              />
            );
          }

          return (
            <Pressable
              key={`${selectedFormation}-${slot.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Add player to ${slot.id}`}
              onPress={() => onSelectSlot(slot.id)}
              style={({ pressed }) => [
                styles.pitchSlot,
                { left: slot.left, top: slot.top },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="subtitle" style={styles.pitchSlotPlus}>
                +
              </ThemedText>
              {slot.label ? (
                <ThemedText type="small" style={styles.pitchSlotLabel}>
                  {slot.label}
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

export function DraggableLineupSlot({
  compact,
  dropTargets,
  isCaptain,
  isGoalkeeper,
  kitSettings,
  onDragPlayerChange,
  onLayout,
  onMovePlayer,
  onSelectSlot,
  player,
  playerNameColor,
  playerNameShadow,
  preferNicknames,
  showName,
  slot,
  slotStyle,
}: {
  compact?: boolean;
  dropTargets: Record<string, DropTarget>;
  isCaptain?: boolean;
  isGoalkeeper?: boolean;
  kitSettings: LineupKitSettings;
  onDragPlayerChange: (isDragging: boolean) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  onMovePlayer: (fromSlotId: string, toSlotId: string) => void;
  onSelectSlot: (slotId: string) => void;
  player: Player;
  playerNameColor?: string;
  playerNameShadow?: boolean;
  preferNicknames: boolean;
  showName?: boolean;
  slot: AssignmentSlot;
  slotStyle: StyleProp<ViewStyle>;
}) {
  const [drag] = useState(() => new Animated.ValueXY());
  const [isDragging, setIsDragging] = useState(false);

  const translateStyle = useMemo(
    () => ({ transform: drag.getTranslateTransform() }),
    [drag],
  );
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6,
        onPanResponderGrant: () => {
          setIsDragging(true);
          onDragPlayerChange(true);
          drag.setOffset({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: drag.x, dy: drag.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gestureState) => {
          setIsDragging(false);
          onDragPlayerChange(false);

          const sourceCenter = dropTargets[slot.id];

          if (!sourceCenter) {
            resetDragPosition(drag);
            return;
          }

          const dropTarget = findNearestDropTarget(
            Object.values(dropTargets),
            {
              x: sourceCenter.x + gestureState.dx,
              y: sourceCenter.y + gestureState.dy,
            },
            slot.id,
          );

          resetDragPosition(drag);

          if (dropTarget) {
            onMovePlayer(slot.id, dropTarget);
          }
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
          onDragPlayerChange(false);
          resetDragPosition(drag);
        },
      }),
    [drag, dropTargets, onDragPlayerChange, onMovePlayer, slot],
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      onLayout={onLayout}
      style={[
        slotStyle,
        isDragging && styles.pitchSlotDragging,
        translateStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Change ${formatPlayerName(player, preferNicknames)}`}
        onPress={() => onSelectSlot(slot.id)}
        style={styles.assignedPitchSlotButton}
      >
        <LineupJersey
          compact={compact}
          displayScale={0.98}
          isCaptain={isCaptain}
          kitSettings={kitSettings}
          player={player}
          playerNameColor={playerNameColor}
          playerNameShadow={playerNameShadow}
          isGoalkeeper={isGoalkeeper}
          showName={showName}
          preferNicknames={preferNicknames}
        />
      </Pressable>
    </Animated.View>
  );
}

export function FloatingPlayerActions({
  onRemove,
  onShowStats,
  onSwap,
  player,
  preferNicknames,
  target,
}: {
  onRemove: () => void;
  onShowStats: () => void;
  onSwap: () => void;
  player: Player;
  preferNicknames: boolean;
  target: DropTarget;
}) {
  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.floatingPlayerActions,
        {
          left: target.x,
          top: target.y,
        },
      ]}
    >
      <PlayerActionButton
        icon={{
          ios: "arrow.left.arrow.right",
          android: "swap_horiz",
          web: "swap_horiz",
        }}
        label={`Swap ${formatPlayerName(player, preferNicknames)}`}
        onPress={onSwap}
      />
      <PlayerActionButton
        icon={{
          ios: "chart.bar.xaxis",
          android: "bar_chart",
          web: "bar_chart",
        }}
        label={`Show basic stats for ${formatPlayerName(player, preferNicknames)}`}
        onPress={onShowStats}
      />
      <PlayerActionButton
        danger
        icon={{
          ios: "person.crop.circle.badge.minus",
          android: "person_remove",
          web: "person_remove",
        }}
        label={`Remove ${formatPlayerName(player, preferNicknames)}`}
        onPress={onRemove}
      />
    </ThemedView>
  );
}

export function PlayerActionButton({
  danger,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;
  icon: SymbolViewProps["name"];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.playerActionButton,
        !danger && { backgroundColor: theme.backgroundSelected },
        danger && styles.playerActionButtonDanger,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={icon}
        tintColor={ActionColors.onAccent}
        size={18}
      />
    </Pressable>
  );
}

export function MatchdayPlayerStatsModal({
  onClose,
  player,
  stats,
  visible,
}: {
  onClose: () => void;
  player: Player | null;
  stats: PlayerAttendanceStats | null;
  visible: boolean;
}) {
  const { locale, t } = useI18n();
  const theme = useTheme();

  if (!player) {
    return null;
  }

  const recentRatings =
    stats?.recentMatchRatings.map((rating) => rating.rating) ?? [];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <ThemedView style={styles.statsPopupOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <ThemedView type="modalBackground" style={styles.statsPopupCard}>
          <ThemedView style={styles.statsPopupHeader}>
            <ThemedView style={styles.statsPopupTitleGroup}>
              <ThemedText style={styles.statsPopupName} numberOfLines={1}>
                {formatPlayerDisplayName(player)}
              </ThemedText>
              <ThemedText
                themeColor="textSecondary"
                style={styles.statsPopupPosition}
              >
                {getPlayerPositionLabel(player.position, locale)}
              </ThemedText>
            </ThemedView>

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

          <ThemedView style={styles.statsPopupGrid}>
            <ThemedView
              type="backgroundElement"
              style={[styles.statsPopupPanel, styles.statsPopupWidePanel]}
            >
              <ThemedText style={styles.statsPopupPanelTitle}>
                {t("matchday.player_stats.form")}
              </ThemedText>
              {recentRatings.length > 0 ? (
                <ThemedView style={styles.statsPopupRatingList}>
                  {recentRatings.map((rating, index) => (
                    <ThemedView
                      key={`${rating}-${index}`}
                      style={[
                        styles.statsPopupRatingPill,
                        getMatchdayRatingPillStyle(rating),
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={[
                          styles.statsPopupRatingText,
                          getMatchdayRatingTextStyle(rating),
                        ]}
                      >
                        {rating}
                      </ThemedText>
                    </ThemedView>
                  ))}
                </ThemedView>
              ) : (
                <ThemedText
                  themeColor="textSecondary"
                  style={styles.statsPopupEmptyText}
                >
                  {t("matchday.player_stats.no_ratings")}
                </ThemedText>
              )}
            </ThemedView>

            <ThemedView
              type="backgroundElement"
              style={[styles.statsPopupPanel, styles.statsPopupWidePanel]}
            >
              <ThemedText style={styles.statsPopupPanelTitle}>
                {t("matchday.player_stats.training")}
              </ThemedText>
              <ThemedText style={styles.statsPopupLargeValue}>
                {formatPercentage(
                  stats?.recentTrainingAttendancePercentage ?? null,
                )}
              </ThemedText>
              <ThemedText
                themeColor="textSecondary"
                style={styles.statsPopupSmallDetail}
              >
                {t("matchday.player_stats.recent_period")}
              </ThemedText>
            </ThemedView>

            <MatchdayStatsMetric
              label={t("matchday.result.player_performance.goals")}
              value="0"
            />
            <MatchdayStatsMetric
              label={t("matchday.result.player_performance.assists")}
              value="0"
            />
            <MatchdayStatsMetric
              label={t("matchday.player_stats.average_minutes")}
              value={formatNullableNumber(stats?.averageMatchMinutes ?? null)}
            />
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

export function MatchdayStatsMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.statsPopupPanel, styles.statsPopupMetricPanel]}
    >
      <ThemedText style={styles.statsPopupMetricTitle}>{label}</ThemedText>
      <ThemedText style={styles.statsPopupMetricValue}>{value}</ThemedText>
    </ThemedView>
  );
}

export function PlayerPickerSheet({
  assignedPlayerIds,
  kitSettings,
  onClose,
  onRemove,
  onSelectPlayer,
  players,
  preferNicknames,
  selectedSlot,
  visible,
}: {
  assignedPlayerIds: LineupAssignments;
  kitSettings: LineupKitSettings;
  onClose: () => void;
  onRemove: () => void;
  onSelectPlayer: (player: Player) => void;
  players: Player[];
  preferNicknames: boolean;
  selectedSlot: AssignmentSlot | null;
  visible: boolean;
}) {
  const { t } = useI18n();
  const assignedPlayerId = selectedSlot
    ? assignedPlayerIds[selectedSlot.id]
    : undefined;
  const selectedPlayer = getAssignedPlayer(assignedPlayerId, players);
  const assignedPlayerIdSet = new Set(Object.values(assignedPlayerIds));
  const availablePlayers = players.filter(
    (player) =>
      player.id === assignedPlayerId || !assignedPlayerIdSet.has(player.id),
  );
  const sortedAvailablePlayers = sortPlayersForAssignmentSlot(
    availablePlayers,
    selectedSlot,
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <ThemedView style={styles.playerPickerOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <ThemedView type="modalBackground" style={styles.playerPickerSheet}>
          <ThemedView style={styles.playerPickerHeader}>
            <ThemedView style={styles.modalTitleGroup}>
              <ThemedText type="default">
                {selectedPlayer
                  ? t("matchday.add_match.lineup.change_player")
                  : t("matchday.add_match.lineup.choose_player")}
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("matchday.add_match.lineup.close_picker")}
              onPress={onClose}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close", web: "close" }}
                size={18}
              />
            </Pressable>
          </ThemedView>

          <ScrollView contentContainerStyle={styles.playerPickerList}>
            {sortedAvailablePlayers.length > 0 ? (
              sortedAvailablePlayers.map((player) => {
                const isSelected = selectedPlayer?.id === player.id;

                return (
                  <Pressable
                    key={player.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => onSelectPlayer(player)}
                    style={({ pressed }) => [
                      styles.playerPickerItem,
                      isSelected && styles.playerPickerItemSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <LineupJersey
                      compact
                      kitSettings={kitSettings}
                      player={player}
                      preferNicknames={preferNicknames}
                    />
                    <ThemedView style={styles.playerPickerNameGroup}>
                      <ThemedText type="smallBold">
                        {formatPlayerName(player, preferNicknames)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatPlayerMeta(player)}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                );
              })
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {t("matchday.add_match.lineup.add_players_first")}
              </ThemedText>
            )}
          </ScrollView>

          {selectedPlayer ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("matchday.add_match.lineup.remove_player")}
              onPress={onRemove}
              style={({ pressed }) => [
                styles.removePlayerButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={styles.removePlayerButtonText}
              >
                {t("matchday.add_match.lineup.remove_player")}
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

export function LineupJersey({
  compact,
  dense,
  displayScale = 1,
  isCaptain,
  isGoalkeeper,
  kitSettings,
  player,
  playerNameColor,
  playerNameShadow = true,
  preferNicknames,
  resultBadges,
  resultBadgesCompact,
  showName,
}: {
  compact?: boolean;
  dense?: boolean;
  displayScale?: number;
  isCaptain?: boolean;
  isGoalkeeper?: boolean;
  kitSettings: LineupKitSettings;
  player: Player;
  playerNameColor?: string;
  playerNameShadow?: boolean;
  preferNicknames?: boolean;
  resultBadges?: JerseyResultBadges | null;
  resultBadgesCompact?: boolean;
  showName?: boolean;
}) {
  const usesGoalkeeperKit = isGoalkeeper || player.position === "goalkeeper";
  const kitNumberColor = usesGoalkeeperKit
    ? "#ffffff"
    : kitSettings.kitNumberColor;
  const playerDisplayName = formatPlayerName(
    player,
    preferNicknames ?? false,
  );
  const playerNameSize = getLineupPlayerNameSize(
    playerDisplayName,
    compact,
    dense,
    displayScale,
  );

  return (
    <ThemedView
      style={[
        styles.jerseyWrapper,
        compact && styles.jerseyWrapperCompact,
        dense && styles.jerseyWrapperDense,
        displayScale !== 1
          ? {
              width: (dense ? 78 : compact ? 96 : 108) * displayScale,
            }
          : undefined,
      ]}
    >
      <ThemedView
        style={[
          styles.jerseyShape,
          usesGoalkeeperKit && styles.goalkeeperJerseyShape,
          compact && styles.jerseyShapeCompact,
          dense && styles.jerseyShapeDense,
          displayScale !== 1
            ? {
                height: (dense ? 45 : compact ? 54 : 72) * displayScale,
                width: (dense ? 53 : compact ? 64 : 84) * displayScale,
              }
            : undefined,
        ]}
      >
        <LineupJerseyShape
          compact={compact}
          isGoalkeeper={usesGoalkeeperKit}
          kitSettings={kitSettings}
        />
        {isCaptain ? (
          <ThemedView
            style={[
              styles.captainBadge,
              compact && styles.captainBadgeCompact,
              dense && styles.captainBadgeDense,
            ]}
          >
            <ThemedText
              type="small"
              style={[
                styles.captainBadgeText,
                compact && styles.captainBadgeTextCompact,
                dense && styles.captainBadgeTextDense,
              ]}
            >
              C
            </ThemedText>
          </ThemedView>
        ) : null}
        <OutlinedText
          color={kitNumberColor}
          containerStyle={styles.jerseyNumberLayer}
          outlineColor={getKitNumberOutlineColor(kitNumberColor)}
          outlineWidth={1}
          type="smallBold"
          style={[
            styles.jerseyNumber,
            compact && styles.jerseyNumberCompact,
            dense && styles.jerseyNumberDense,
            displayScale !== 1
              ? {
                  fontSize: (dense ? 13 : compact ? 16 : 24) * displayScale,
                  lineHeight: (dense ? 16 : compact ? 19 : 28) * displayScale,
                  marginTop: (dense ? 6 : compact ? 8 : 10) * displayScale,
                }
              : undefined,
          ]}
        >
          {player.kitNumber ?? " "}
        </OutlinedText>
        {resultBadges ? (
          <JerseyResultBadgeOverlay
            badges={resultBadges}
            compact={compact || resultBadgesCompact}
          />
        ) : null}
      </ThemedView>
      {!compact || showName ? (
        <ThemedView
          style={[
            styles.jerseyNameRow,
            compact && styles.jerseyNameRowCompact,
            dense && styles.jerseyNameRowDense,
            displayScale !== 1
              ? { width: (dense ? 78 : compact ? 96 : 108) * displayScale }
              : undefined,
          ]}
        >
          <ThemedText
            allowFontScaling={false}
            type="default"
            style={[
              styles.jerseyName,
              compact && styles.jerseyNameCompact,
              dense && styles.jerseyNameDense,
              displayScale !== 1
                ? {
                    maxWidth:
                      (dense ? 78 : compact ? 96 : 108) * displayScale,
                  }
                : undefined,
              playerNameSize,
              playerNameColor ? { color: playerNameColor } : undefined,
              !playerNameShadow
                ? {
                    textShadowColor: "transparent",
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 0,
                  }
                : undefined,
            ]}
            numberOfLines={1}
          >
            {playerDisplayName}
          </ThemedText>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

function getLineupPlayerNameSize(
  name: string,
  compact?: boolean,
  dense?: boolean,
  scale = 1,
) {
  const baseFontSize = dense ? 14 : 16;
  const minimumFontSize = dense ? 8 : compact ? 9 : 10;
  const availableTextWidth = dense ? 70 : compact ? 88 : 100;
  const estimatedTextWidth =
    Math.max(Array.from(name.trim()).length, 1) * baseFontSize * 0.72;
  const fontSize = Math.max(
    minimumFontSize,
    Math.min(baseFontSize, (baseFontSize * availableTextWidth) / estimatedTextWidth),
  );

  return {
    fontSize: fontSize * scale,
    lineHeight: Math.ceil((fontSize + 4) * scale),
  };
}

function getMatchdayRatingPillStyle(rating: number) {
  if (rating >= 8) return styles.statsPopupRatingGood;
  if (rating >= 5) return styles.statsPopupRatingOk;
  return styles.statsPopupRatingPoor;
}

function getMatchdayRatingTextStyle(rating: number) {
  if (rating >= 8) return styles.statsPopupRatingTextGood;
  if (rating >= 5) return styles.statsPopupRatingTextOk;
  return styles.statsPopupRatingTextPoor;
}

export function LineupJerseyShape({
  compact,
  isGoalkeeper,
  kitSettings,
}: {
  compact?: boolean;
  isGoalkeeper?: boolean;
  kitSettings: LineupKitSettings;
}) {
  const fillColor = isGoalkeeper
    ? kitSettings.goalkeeperKitColor
    : kitSettings.outfieldKitColor;
  const strokeColor = isGoalkeeper
    ? getKitOutlineColor(fillColor)
    : "#111827";

  return (
    <Svg
      viewBox="0 0 100 90"
      style={[styles.jerseySvg, compact && styles.jerseySvgCompact]}
    >
      <Defs>
        <ClipPath id="lineupJerseyClip">
          <Path d={kitShirtPath} />
        </ClipPath>
      </Defs>
      <Path d={kitShirtPath} fill={fillColor} />
      {!isGoalkeeper ? (
        <G clipPath="url(#lineupJerseyClip)">
          {kitSettings.kitDesign === "stripes" ? (
            <>
              <Rect
                x="18"
                y="0"
                width="11"
                height="90"
                fill={kitSettings.secondaryKitColor}
              />
              <Rect
                x="45"
                y="0"
                width="11"
                height="90"
                fill={kitSettings.secondaryKitColor}
              />
              <Rect
                x="72"
                y="0"
                width="11"
                height="90"
                fill={kitSettings.secondaryKitColor}
              />
            </>
          ) : null}
          {kitSettings.kitDesign === "twoColorStripes" ? (
            <>
              <Rect
                x="0"
                y="0"
                width="10"
                height="90"
                fill={kitSettings.secondaryKitColor}
              />
              <Rect
                x="22.5"
                y="0"
                width="10"
                height="90"
                fill={kitSettings.thirdKitColor}
              />
              <Rect
                x="45"
                y="0"
                width="10"
                height="90"
                fill={kitSettings.secondaryKitColor}
              />
              <Rect
                x="67.5"
                y="0"
                width="10"
                height="90"
                fill={kitSettings.thirdKitColor}
              />
              <Rect
                x="90"
                y="0"
                width="10"
                height="90"
                fill={kitSettings.secondaryKitColor}
              />
            </>
          ) : null}
          {kitSettings.kitDesign === "hoops" ? (
            <>
              <Rect
                x="0"
                y="21"
                width="100"
                height="10"
                fill={kitSettings.secondaryKitColor}
              />
              <Rect
                x="0"
                y="44"
                width="100"
                height="10"
                fill={kitSettings.secondaryKitColor}
              />
              <Rect
                x="0"
                y="67"
                width="100"
                height="10"
                fill={kitSettings.secondaryKitColor}
              />
            </>
          ) : null}
          {kitSettings.kitDesign === "halves" ? (
            <Rect
              x="50"
              y="0"
              width="50"
              height="90"
              fill={kitSettings.secondaryKitColor}
            />
          ) : null}
          {kitSettings.kitDesign === "sides" ? (
            <>
              <Path
                d="M18 0 L32 0 L32 90 L18 90 Z"
                fill={kitSettings.secondaryKitColor}
              />
              <Path
                d="M68 0 L82 0 L82 90 L68 90 Z"
                fill={kitSettings.secondaryKitColor}
              />
            </>
          ) : null}
          {kitSettings.kitDesign === "sash" ? (
            <>
              <Path
                d="M4 90 L86 -16 L96 -16 L14 90 Z"
                fill={kitSettings.secondaryKitColor}
              />
              <Path
                d="M14 90 L96 -16 L106 -16 L24 90 Z"
                fill={kitSettings.thirdKitColor}
              />
            </>
          ) : null}
        </G>
      ) : null}
      <Path
        d={kitShirtPath}
        fill="none"
        stroke={strokeColor}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth={5}
      />
      <Path
        d="M37 7 Q50 15 63 7"
        fill="none"
        stroke={strokeColor}
        strokeLinecap="round"
        strokeWidth={5}
      />
    </Svg>
  );
}

export function JerseyResultBadgeOverlay({
  badges,
  compact,
}: {
  badges: JerseyResultBadges;
  compact?: boolean;
}) {
  const hasCard = badges.card !== "none";
  const visibleGoalCount = badges.goals > 3 ? 1 : badges.goals;
  const visibleAssistCount = badges.assists > 3 ? 1 : badges.assists;
  const eventBadgeStep = compact ? 10 : 13;

  return (
    <ThemedView
      pointerEvents="none"
      style={[
        styles.jerseyResultOverlay,
        compact && styles.jerseyResultOverlayCompact,
      ]}
    >
      {badges.subDirection ? (
        <ThemedView
          style={[
            styles.jerseyResultIconBadge,
            styles.jerseyResultSubBadge,
            compact && styles.jerseyResultIconBadgeCompact,
          ]}
        >
          <Image
            source={
              badges.subDirection === "on"
                ? require("@/assets/images/match-day/sub-on.png")
                : require("@/assets/images/match-day/sub-off.png")
            }
            style={[
              styles.jerseyResultImageBadge,
              compact && styles.jerseyResultImageBadgeCompact,
            ]}
            contentFit="contain"
          />
        </ThemedView>
      ) : null}

      {hasCard ? (
        <ThemedView
          style={[
            styles.jerseyResultCardShell,
            compact && styles.jerseyResultCardShellCompact,
          ]}
        >
          <Image
            source={
              badges.card === "yellow"
                ? require("@/assets/images/match-day/yellow-card.png")
                : require("@/assets/images/match-day/red-card.png")
            }
            style={[
              styles.jerseyResultImageBadge,
              compact && styles.jerseyResultImageBadgeCompact,
            ]}
            contentFit="cover"
          />
        </ThemedView>
      ) : null}

      {badges.goals > 0 ? (
        <ThemedView
          style={[
            styles.jerseyResultGoalStack,
            compact && styles.jerseyResultGoalStackCompact,
          ]}
        >
          {Array.from({ length: visibleGoalCount }, (_, index) => (
            <ThemedView
              key={`goal-${index}`}
              style={[
                styles.jerseyResultEventBadge,
                styles.jerseyResultGoalBadge,
                {
                  left: -index * eventBadgeStep,
                  zIndex: visibleGoalCount - index,
                },
                compact && styles.jerseyResultEventBadgeCompact,
              ]}
            >
              <Image
                source={require("@/assets/images/match-day/goal.png")}
                style={[
                  styles.jerseyResultImageBadge,
                  compact && styles.jerseyResultImageBadgeCompact,
                ]}
                contentFit="contain"
              />
            </ThemedView>
          ))}
          {badges.goals > 3 ? (
            <ThemedText type="small" style={styles.jerseyResultEventCount}>
              {badges.goals}
            </ThemedText>
          ) : null}
        </ThemedView>
      ) : null}

      {badges.assists > 0 ? (
        <ThemedView
          style={[
            styles.jerseyResultAssistStack,
            compact && styles.jerseyResultAssistStackCompact,
          ]}
        >
          {Array.from({ length: visibleAssistCount }, (_, index) => (
            <ThemedView
              key={`assist-${index}`}
              style={[
                styles.jerseyResultEventBadge,
                styles.jerseyResultAssistBadge,
                {
                  right: -index * eventBadgeStep,
                  zIndex: visibleAssistCount - index,
                },
                compact && styles.jerseyResultEventBadgeCompact,
              ]}
            >
              <Image
                source={require("@/assets/images/match-day/assist-boot.png")}
                style={[
                  styles.jerseyResultAssistImage,
                  compact && styles.jerseyResultAssistImageCompact,
                ]}
                contentFit="cover"
              />
            </ThemedView>
          ))}
          {badges.assists > 3 ? (
            <ThemedText type="small" style={styles.jerseyResultEventCount}>
              {badges.assists}
            </ThemedText>
          ) : null}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

function getKitNumberOutlineColor(color: string) {
  const normalizedColor = color.trim().toUpperCase();
  return normalizedColor === "#000000" || normalizedColor === "#111827"
    ? "#FFFFFF"
    : "#111827";
}
function normalizeMatchFormation(value: unknown): MatchFormation { return matchFormations.includes(value as MatchFormation) ? value as MatchFormation : "4-3-3"; }
function getKitOutlineColor(color: string) {
  const normalizedColor = color.trim().toUpperCase();
  return normalizedColor === "#000000" || normalizedColor === "#111827"
    ? "#FFFFFF"
    : "#111827";
}
function formatPercentage(value: number | null) { return value === null ? "-" : `${value}%`; }
function formatNullableNumber(value: number | null) { return value === null ? "-" : String(value); }
function getJerseyResultBadges(stat: MatchPlayerResultStat | undefined, role: MatchResultSquadEntry["role"], duration: number): JerseyResultBadges | null { if (!stat) return null; return { assists: stat.assists, card: stat.card, goals: stat.goals, subDirection: stat.attendance === "no-show" ? null : role === "starter" && stat.minutesPlayed < duration ? "off" : role === "substitute" && stat.minutesPlayed > 0 ? "on" : null }; }
