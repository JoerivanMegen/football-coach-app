import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import { SymbolView } from "expo-symbols";
import { useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Image as SvgImage,
  Text as SvgText,
} from "react-native-svg";
import { captureRef } from "react-native-view-shot";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { LineupJersey } from "@/features/match-day/components/lineup-components";
import { matchDayStyles as styles } from "@/features/match-day/components/match-day-styles";
import {
  assistantCoachLogo,
  matchFormations,
  sharePosterColorOptions,
  substituteSlots,
} from "@/features/match-day/match-day-config";
import type {
  JerseyResultBadges,
  LineupKitSettings,
  MatchFormation,
  MatchLocation,
  MatchResultSquadEntry,
  MatchSetupFormState,
  PosterColorSettings,
  SharePreviewState,
} from "@/features/match-day/match-day-view-types";
import type {
  MatchPlayerResultStat,
  MatchPlayerResultStats,
} from "@/features/match-day/match-day-types";
import { getAssignedPlayer } from "@/features/match-day/lineup-utils";
import {
  createSharePosterColorsFromKitSettings,
  darkenHexColor,
  getPosterTextShadowColor,
  getSharePosterSubstituteIndex,
  getSharePosterTextColor,
  getSharePosterTextConfig,
} from "@/features/match-day/share-poster-utils";
import type { Player } from "@/features/players/player-types";
import {
  type ShareBackgroundTemplateId,
  shareBackgroundTemplates,
} from "@/features/share/share-background-templates";
import { shareLineupFormationSlots } from "@/features/share/share-lineup-formations";
import {
  defaultSharePosterPositionsByOverlayStyle,
  type SharePosterOverlayStyle,
  sharePosterOverlayStyleOptions,
  type SharePosterTextPieceId,
  sharePosterTextPieces,
} from "@/features/share/share-poster-overlays";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

export function ShareMatchPreviewModal({
  kitSettings,
  matchDurationMinutes,
  onClose,
  preferNicknames,
  preview,
  teamName,
  visible,
}: {
  kitSettings: LineupKitSettings;
  matchDurationMinutes: number;
  onClose: () => void;
  preferNicknames: boolean;
  preview: SharePreviewState | null;
  teamName: string;
  visible: boolean;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const posterRef = useRef<View>(null);
  const [background, setBackground] =
    useState<ShareBackgroundTemplateId>("stadium-day");
  const [overlayStyle, setOverlayStyle] =
    useState<SharePosterOverlayStyle>("classic");
  const basePosterColors = useMemo(
    () => createSharePosterColorsFromKitSettings(kitSettings),
    [kitSettings],
  );
  const [posterColorOverrides, setPosterColorOverrides] = useState<
    Partial<PosterColorSettings>
  >({});
  const [areColorControlsOpen, setAreColorControlsOpen] = useState(false);
  const [isExportingPoster, setIsExportingPoster] = useState(false);
  const posterColors = {
    ...basePosterColors,
    ...posterColorOverrides,
  };
  const selectedBackground =
    shareBackgroundTemplates.find((option) => option.id === background) ??
    shareBackgroundTemplates[0];

  function handleClose() {
    setOverlayStyle("classic");
    onClose();
  }

  function updatePosterColor(key: keyof PosterColorSettings, value: string) {
    setPosterColorOverrides((currentColors) => ({
      ...currentColors,
      [key]: value,
    }));
  }

  async function handleExportPoster() {
    if (!preview || !posterRef.current) {
      Alert.alert(
        t("matchday.share.errors.no_image.title"),
        t("matchday.share.errors.no_image.message"),
      );
      return;
    }

    try {
      setIsExportingPoster(true);

      const uri = await captureRef(posterRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (!isSharingAvailable) {
        Alert.alert(
          t("matchday.share.success.title"),
          t("matchday.share.success.message", { uri }),
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        dialogTitle: t("matchday.share.title"),
        mimeType: "image/png",
      });
    } catch (error) {
      console.warn("Failed to export share image", error);
      Alert.alert(
        t("matchday.share.errors.export.title"),
        t("matchday.share.errors.export.message"),
      );
    } finally {
      setIsExportingPoster(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <ThemedView style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <ThemedView type="modalBackground" style={styles.shareModalSheet}>
          <ThemedView style={styles.modalHeader}>
            <ThemedView style={styles.modalTitleGroup}>
              <ThemedText type="default">
                {t("matchday.share.title")}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t("matchday.share.description")}
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("matchday.share.close_preview")}
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

          <ScrollView contentContainerStyle={styles.shareModalContent}>
            <ThemedView style={styles.shareOptionGroup}>
              <ThemedText type="small" themeColor="textSecondary">
                {t("matchday.share.background")}
              </ThemedText>
              <ThemedView style={styles.shareOptionRow}>
                {shareBackgroundTemplates.map((option) => {
                  const isSelected = option.id === background;

                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setBackground(option.id)}
                      style={({ pressed }) => [
                        styles.shareOptionButton,
                        isSelected && styles.shareOptionButtonSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={
                          isSelected && styles.shareOptionButtonTextSelected
                        }
                      >
                        {t(`matchday.share.backgrounds.${option.id}`)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.shareOptionGroup}>
              <ThemedText type="small" themeColor="textSecondary">
                {t("matchday.share.overlay")}
              </ThemedText>
              <ThemedView style={styles.shareOptionRow}>
                {sharePosterOverlayStyleOptions.map((option) => {
                  const isSelected = option.value === overlayStyle;

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setOverlayStyle(option.value)}
                      style={({ pressed }) => [
                        styles.shareOptionButton,
                        isSelected && styles.shareOptionButtonSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={
                          isSelected && styles.shareOptionButtonTextSelected
                        }
                      >
                        {t(`matchday.share.overlays.${option.value}`)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.shareColorPanel}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: areColorControlsOpen }}
                onPress={() =>
                  setAreColorControlsOpen((isCurrentlyOpen) => !isCurrentlyOpen)
                }
                style={({ pressed }) => [
                  styles.shareColorHeader,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedView style={styles.shareColorHeaderText}>
                  <ThemedText type="default">
                    {t("matchday.share.colors.title")}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t("matchday.share.colors.description")}
                  </ThemedText>
                </ThemedView>
                <SymbolView
                  name={{
                    ios: areColorControlsOpen ? "chevron.up" : "chevron.down",
                    android: areColorControlsOpen
                      ? "keyboard_arrow_up"
                      : "keyboard_arrow_down",
                    web: areColorControlsOpen
                      ? "keyboard_arrow_up"
                      : "keyboard_arrow_down",
                  }}
                  tintColor={theme.text}
                  size={18}
                  style={styles.shareColorHeaderChevron}
                />
              </Pressable>

              {areColorControlsOpen ? (
                <ThemedView style={styles.shareColorSectionList}>
                  <SharePosterColorSection
                    panelLabel={t("matchday.share.colors.panel")}
                    panelValue={posterColors.titlePanelColor}
                    textLabel={t("matchday.share.colors.text")}
                    textValue={posterColors.titleTextColor}
                    title={t("matchday.share.colors.team_section")}
                    onPanelChange={(color) =>
                      updatePosterColor("titlePanelColor", color)
                    }
                    onTextChange={(color) =>
                      updatePosterColor("titleTextColor", color)
                    }
                  />
                  <SharePosterColorSection
                    panelLabel={t("matchday.share.colors.panel")}
                    panelValue={posterColors.valuePanelColor}
                    textLabel={t("matchday.share.colors.text")}
                    textValue={posterColors.valueTextColor}
                    title={t("matchday.share.colors.opponent_section")}
                    onPanelChange={(color) =>
                      updatePosterColor("valuePanelColor", color)
                    }
                    onTextChange={(color) =>
                      updatePosterColor("valueTextColor", color)
                    }
                  />
                  <SharePosterColorSection
                    panelLabel={t("matchday.share.colors.panel")}
                    panelValue={posterColors.infoPanelColor}
                    textLabel={t("matchday.share.colors.text_icons")}
                    textValue={posterColors.infoTextColor}
                    title={t("matchday.share.colors.info_section")}
                    onPanelChange={(color) =>
                      updatePosterColor("infoPanelColor", color)
                    }
                    onTextChange={(color) =>
                      updatePosterColor("infoTextColor", color)
                    }
                  />
                </ThemedView>
              ) : null}
            </ThemedView>

            {preview ? (
              <View ref={posterRef} collapsable={false}>
                <ShareMatchPosterPreview
                  background={selectedBackground}
                  kitSettings={kitSettings}
                  matchDurationMinutes={matchDurationMinutes}
                  overlayStyle={overlayStyle}
                  posterColors={posterColors}
                  preferNicknames={preferNicknames}
                  preview={preview}
                  teamName={teamName}
                />
              </View>
            ) : null}
          </ScrollView>

          <ThemedView style={styles.formActions}>
            <Pressable
              accessibilityRole="button"
              onPress={handleClose}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">
                {t("common.close")}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!preview || isExportingPoster}
              onPress={handleExportPoster}
              style={({ pressed }) => [
                styles.primaryButton,
                (!preview || isExportingPoster) && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                {isExportingPoster
                  ? t("matchday.share.exporting")
                  : t("matchday.share.export")}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

function ShareMatchPosterPreview({
  background,
  kitSettings,
  matchDurationMinutes,
  overlayStyle,
  posterColors,
  preferNicknames,
  preview,
  teamName,
}: {
  background: (typeof shareBackgroundTemplates)[number];
  kitSettings: LineupKitSettings;
  matchDurationMinutes: number;
  overlayStyle: SharePosterOverlayStyle;
  posterColors: PosterColorSettings;
  preferNicknames: boolean;
  preview: SharePreviewState;
  teamName: string;
}) {
  const positions = defaultSharePosterPositionsByOverlayStyle[overlayStyle];
  const lineupFrame = background.lineupFrame;
  const selectedFormation = normalizeMatchFormation(preview.form.formation);
  const shareSlots = shareLineupFormationSlots[selectedFormation];
  const substitutes = getAssignedSubstitutes(preview.form, preview.players);
  const hasResult =
    typeof preview.ownScore === "number" &&
    typeof preview.opponentScore === "number";

  return (
    <ThemedView style={styles.sharePosterFrame}>
      <Image
        source={background.source}
        contentFit="cover"
        style={styles.sharePosterBackground}
      />
      <SharePosterOverlay
        location={preview.form.location}
        hasResult={hasResult}
        overlayStyle={overlayStyle}
        posterColors={posterColors}
      />
      <SharePosterTextLayer
        form={preview.form}
        hasResult={hasResult}
        opponentScore={preview.opponentScore}
        overlayStyle={overlayStyle}
        ownScore={preview.ownScore}
        playerResultStats={preview.playerResultStats}
        posterColors={posterColors}
        positions={positions}
        preferNicknames={preferNicknames}
        substitutes={substitutes.map(({ player }) => player)}
        teamName={teamName}
      />

      <ThemedView
        style={[
          styles.sharePosterLineupLayer,
          {
            left: `${lineupFrame.left}%`,
            top: `${lineupFrame.top}%`,
            transform: [{ scale: lineupFrame.scale }],
          },
        ]}
      >
        {shareSlots.map((slot) => {
          const player = getAssignedPlayer(
            preview.form.lineupAssignments[slot.id],
            preview.players,
          );

          if (!player) {
            return null;
          }

          return (
            <ThemedView
              key={slot.id}
              style={[
                styles.sharePosterPlayer,
                {
                  left: `${slot.left}%`,
                  top: `${slot.top}%`,
                },
              ]}
            >
              <LineupJersey
                compact
                isCaptain={player.id === preview.form.captainPlayerId}
                isGoalkeeper={slot.isGoalkeeper}
                kitSettings={kitSettings}
                player={player}
                preferNicknames={preferNicknames}
                resultBadges={
                  preview.playerResultStats
                    ? getJerseyResultBadges(
                        preview.playerResultStats[player.id],
                        preview.playerRoleById?.get(player.id) ?? "starter",
                        matchDurationMinutes,
                      )
                    : undefined
                }
                showName
              />
            </ThemedView>
          );
        })}
      </ThemedView>

      <ThemedView
        style={[
          styles.sharePosterLogoFrame,
          {
            left: `${(positions.logo.x / 1080) * 100}%`,
            top: `${(positions.logo.y / 1350) * 100}%`,
          },
        ]}
      >
        <Image
          source={assistantCoachLogo}
          contentFit="contain"
          style={styles.sharePosterLogo}
        />
      </ThemedView>
    </ThemedView>
  );
}

function SharePosterColorSection({
  onPanelChange,
  onTextChange,
  panelLabel,
  panelValue,
  textLabel,
  textValue,
  title,
}: {
  onPanelChange: (color: string) => void;
  onTextChange: (color: string) => void;
  panelLabel: string;
  panelValue: string;
  textLabel: string;
  textValue: string;
  title: string;
}) {
  return (
    <ThemedView style={styles.shareColorSection}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedView style={styles.shareColorFields}>
        <SharePosterColorField
          label={panelLabel}
          value={panelValue}
          onChange={onPanelChange}
        />
        <SharePosterColorField
          label={textLabel}
          value={textValue}
          onChange={onTextChange}
        />
      </ThemedView>
    </ThemedView>
  );
}

function SharePosterColorField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (color: string) => void;
  value: string;
}) {
  return (
    <ThemedView style={styles.shareColorField}>
      <ThemedView style={styles.shareColorFieldHeader}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.shareColorSwatchRow}>
        {sharePosterColorOptions.map((color) => (
          <Pressable
            key={`${label}-${color}`}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${color}`}
            accessibilityState={{ selected: value === color }}
            onPress={() => onChange(color)}
            style={({ pressed }) => [
              styles.shareColorSwatch,
              { backgroundColor: color },
              value === color && styles.shareColorSwatchSelected,
              pressed && styles.pressed,
            ]}
          />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

function SharePosterTextLayer({
  form,
  hasResult,
  opponentScore,
  overlayStyle,
  ownScore,
  playerResultStats,
  posterColors,
  positions,
  preferNicknames,
  substitutes,
  teamName,
}: {
  form: MatchSetupFormState;
  hasResult: boolean;
  opponentScore?: number;
  overlayStyle: SharePosterOverlayStyle;
  ownScore?: number;
  playerResultStats?: MatchPlayerResultStats;
  posterColors: PosterColorSettings;
  positions: (typeof defaultSharePosterPositionsByOverlayStyle)[SharePosterOverlayStyle];
  preferNicknames: boolean;
  substitutes: Player[];
  teamName: string;
}) {
  const { t } = useI18n();

  return (
    <Svg
      pointerEvents="none"
      viewBox="0 0 1080 1350"
      style={styles.posterOverlay}
    >
      {sharePosterTextPieces.map((textPiece) => {
        if (
          !hasResult &&
          (textPiece.id === "homeScore" || textPiece.id === "awayScore")
        ) {
          return null;
        }

        const position = positions[textPiece.id];
        const textColor = getSharePosterTextColor(
          textPiece.id,
          posterColors,
          overlayStyle,
          form.location,
        );

        if (textPiece.id === "locationLabel") {
          return (
            <LocationPinIcon
              key={textPiece.id}
              color={posterColors.titlePanelColor}
              x={position.x}
              y={position.y}
            />
          );
        }

        if (textPiece.id === "dateLabel") {
          return (
            <CalendarIcon
              key={textPiece.id}
              color={posterColors.titlePanelColor}
              x={position.x}
              y={position.y}
            />
          );
        }

        const textShadowColor = getPosterTextShadowColor(textColor);
        const textConfig = getSharePosterTextConfig(
          textPiece.id,
          form,
          overlayStyle,
          hasResult ? { opponentScore, ownScore } : null,
          preferNicknames,
          substitutes,
          teamName,
          {
            opponent: t("matchday.share.poster.opponent"),
            homeMatch: t("matchday.share.poster.home_match"),
            awayMatch: t("matchday.share.poster.away_match"),
            subs: t("matchday.share.poster.subs"),
            substitutes: t("matchday.share.poster.substitutes"),
          },
        );
        const showSubstituteIcon =
          getSharePosterSubstituteMinutesPlayed(
            textPiece.id,
            substitutes,
            playerResultStats,
          ) > 0;

        return (
          <G key={textPiece.id}>
            {showSubstituteIcon ? (
              <SvgImage
                href={require("@/assets/images/match-day/sub-on.png")}
                width={24}
                height={24}
                x={position.x - 10}
                y={position.y - textConfig.fontSize - 8}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : null}
            <SvgText
              fill={textShadowColor}
              fontSize={textConfig.fontSize}
              fontStyle={textConfig.fontStyle}
              fontWeight={textConfig.fontWeight}
              stroke={textShadowColor}
              strokeWidth={2}
              x={position.x + 2}
              y={position.y + 2}
            >
              {textConfig.value}
            </SvgText>
            <SvgText
              fill={textColor}
              fontSize={textConfig.fontSize}
              fontStyle={textConfig.fontStyle}
              fontWeight={textConfig.fontWeight}
              x={position.x}
              y={position.y}
            >
              {textConfig.value}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function getSharePosterSubstituteMinutesPlayed(
  pieceId: SharePosterTextPieceId,
  substitutes: Player[],
  playerResultStats?: MatchPlayerResultStats,
) {
  const substituteIndex = getSharePosterSubstituteIndex(pieceId);
  const substitute =
    typeof substituteIndex === "number" ? substitutes[substituteIndex] : null;

  if (!substitute) {
    return 0;
  }

  return playerResultStats?.[substitute.id]?.minutesPlayed ?? 0;
}

function SharePosterOverlay({
  hasResult,
  location,
  overlayStyle,
  posterColors,
}: {
  hasResult: boolean;
  location: MatchLocation;
  overlayStyle: SharePosterOverlayStyle;
  posterColors: PosterColorSettings;
}) {
  if (overlayStyle === "broadcast") {
    return (
      <BroadcastPosterOverlay
        hasResult={hasResult}
        location={location}
        posterColors={posterColors}
      />
    );
  }

  return (
    <Svg
      pointerEvents="none"
      viewBox="0 0 1080 1350"
      style={styles.posterOverlay}
    >
      <Defs>
        <LinearGradient id="primaryPanel" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={posterColors.titlePanelColor} />
          <Stop
            offset="1"
            stopColor={darkenHexColor(posterColors.titlePanelColor, 0.2)}
          />
        </LinearGradient>
        <LinearGradient id="secondaryPanel" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={posterColors.valuePanelColor} />
          <Stop
            offset="1"
            stopColor={darkenHexColor(posterColors.valuePanelColor, 0.25)}
          />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="1080" height="1350" fill="rgba(0,0,0,0.18)" />
      <Path
        d="M0 36 H780 L700 222 H0 Z"
        fill="url(#primaryPanel)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
      {hasResult ? (
        <>
          <Path
            d="M812 36 H1080 V222 H700 Z"
            fill="url(#secondaryPanel)"
            stroke="#FFFFFF"
            strokeWidth="3"
          />
          <Path d="M780 36 H812 L700 222 H668 Z" fill="#FFFFFF" />
          <Line
            x1="1000"
            y1="78"
            x2="1000"
            y2="178"
            stroke={posterColors.valueTextColor}
            strokeWidth="4"
          />
        </>
      ) : null}
      <Path
        d="M0 232 H880 Q902 232 892 254 L870 296 H0 Z"
        fill={posterColors.infoPanelColor}
      />
      <Line x1="424" y1="244" x2="424" y2="284" stroke="#D1D5DB" />
      <Path
        d="M0 1153 H354 Q364 1153 359 1167 L334 1233 H0 Z"
        fill="url(#primaryPanel)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
      <Path
        d="M364 1153 H1038 Q1062 1153 1052 1177 L1018 1311 H0 V1233 H334 Z"
        fill="url(#secondaryPanel)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
    </Svg>
  );
}

function BroadcastPosterOverlay({
  hasResult,
  location,
  posterColors,
}: {
  hasResult: boolean;
  location: MatchLocation;
  posterColors: PosterColorSettings;
}) {
  const homeScorePanelFill =
    location === "home" ? "url(#broadcastTitle)" : "url(#broadcastValue)";
  const awayScorePanelFill =
    location === "home" ? "url(#broadcastValue)" : "url(#broadcastTitle)";

  return (
    <Svg
      pointerEvents="none"
      viewBox="0 0 1080 1350"
      style={styles.posterOverlay}
    >
      <Defs>
        <LinearGradient id="broadcastTitle" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={posterColors.titlePanelColor} />
          <Stop
            offset="1"
            stopColor={darkenHexColor(posterColors.titlePanelColor, 0.25)}
          />
        </LinearGradient>
        <LinearGradient id="broadcastValue" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={posterColors.valuePanelColor} />
          <Stop
            offset="1"
            stopColor={darkenHexColor(posterColors.valuePanelColor, 0.28)}
          />
        </LinearGradient>
        <LinearGradient id="broadcastAccent" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={posterColors.infoPanelColor} />
          <Stop
            offset="1"
            stopColor={darkenHexColor(posterColors.infoPanelColor, 0.2)}
          />
        </LinearGradient>
        <LinearGradient id="broadcastDark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#080808" />
          <Stop offset="1" stopColor="#252525" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="1080" height="1350" fill="rgba(0,0,0,0.18)" />
      <Path
        d="M66 62 H682 L648 218 H66 Q58 218 58 210 V70 Q58 62 66 62 Z"
        fill="url(#broadcastTitle)"
        stroke="#FFFFFF"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <Path
        d="M66 62 H682 L674 82 H130 L102 218 H66 Q58 218 58 210 V70 Q58 62 66 62 Z"
        fill="url(#broadcastDark)"
        opacity="0.82"
      />
      <Path
        d="M84 218 H620 L596 294 H66 Q58 294 58 286 V234 Z"
        fill="url(#broadcastValue)"
        stroke="#FFFFFF"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <Path
        d="M58 236 H486 L464 292 H58 Z"
        fill="url(#broadcastValue)"
        opacity="0.92"
      />
      <Path d="M505 246 H521 L493 286 H477 Z" fill="url(#broadcastAccent)" />
      <Path d="M527 246 H543 L515 286 H499 Z" fill="url(#broadcastAccent)" />
      <Path d="M549 246 H565 L537 286 H521 Z" fill="url(#broadcastAccent)" />
      <Path d="M571 246 H587 L559 286 H543 Z" fill="url(#broadcastAccent)" />
      <Path d="M593 246 H609 L581 286 H565 Z" fill="url(#broadcastAccent)" />
      {hasResult ? (
        <>
          <Rect
            x="690"
            y="74"
            width="158"
            height="186"
            rx="8"
            fill={homeScorePanelFill}
          />
          <Rect
            x="866"
            y="74"
            width="158"
            height="186"
            rx="8"
            fill={awayScorePanelFill}
          />
          <Path d="M866 74 H926 L900 260 H866 Z" fill="url(#broadcastDark)" />
        </>
      ) : null}
      <Rect
        x="58"
        y="302"
        width="966"
        height="76"
        rx="16"
        fill="url(#broadcastAccent)"
      />
      <Line
        x1="532"
        y1="320"
        x2="532"
        y2="360"
        stroke={posterColors.infoTextColor}
      />
      <Rect
        x="46"
        y="1150"
        width="988"
        height="142"
        rx="16"
        fill="url(#broadcastDark)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
      <Path
        d="M58 1178 H204 L230 1224 L204 1264 H58 Z"
        fill="url(#broadcastTitle)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
      {[402, 532, 662, 792, 922].map((x) => (
        <Line
          key={x}
          x1={x}
          y1="1174"
          x2={x}
          y2="1268"
          stroke="#FFFFFF"
          strokeOpacity="0.55"
        />
      ))}
    </Svg>
  );
}


function normalizeMatchFormation(value: unknown): MatchFormation {
  return matchFormations.includes(value as MatchFormation)
    ? (value as MatchFormation)
    : "4-3-3";
}

function getAssignedSubstitutes(form: MatchSetupFormState, players: Player[]) {
  return substituteSlots.flatMap((slot) => {
    const player = getAssignedPlayer(form.lineupAssignments[slot.id], players);
    return player ? [{ player, slot }] : [];
  });
}

function getJerseyResultBadges(
  stat: MatchPlayerResultStat | undefined,
  role: MatchResultSquadEntry["role"],
  matchDurationMinutes: number,
): JerseyResultBadges | null {
  if (!stat) return null;
  return {
    assists: stat.assists,
    card: stat.card,
    goals: stat.goals,
    subDirection: getSubDirection(stat, role, matchDurationMinutes),
  };
}

function getSubDirection(
  stat: MatchPlayerResultStat,
  role: MatchResultSquadEntry["role"],
  matchDurationMinutes: number,
) {
  if (stat.attendance === "no-show") return null;
  if (role === "starter" && stat.minutesPlayed < matchDurationMinutes) return "off";
  if (role === "substitute" && stat.minutesPlayed > 0) return "on";
  return null;
}

function LocationPinIcon({
  color,
  x,
  y,
}: {
  color: string;
  x: number;
  y: number;
}) {
  return (
    <G transform={`translate(${x} ${y - 30})`}>
      <Path
        d="M18 2 C9.2 2 2 9.1 2 17.8 C2 29.4 18 44 18 44 C18 44 34 29.4 34 17.8 C34 9.1 26.8 2 18 2 Z"
        fill={color}
      />
      <Path
        d="M18 23.5 C21.4 23.5 24.2 20.7 24.2 17.3 C24.2 13.9 21.4 11.1 18 11.1 C14.6 11.1 11.8 13.9 11.8 17.3 C11.8 20.7 14.6 23.5 18 23.5 Z"
        fill="#FFFFFF"
      />
    </G>
  );
}

function CalendarIcon({
  color,
  x,
  y,
}: {
  color: string;
  x: number;
  y: number;
}) {
  return (
    <G transform={`translate(${x} ${y - 29})`}>
      <Rect x="2" y="6" width="40" height="36" rx="5" fill={color} />
      <Rect x="7" y="16" width="30" height="21" rx="2" fill="#FFFFFF" />
      <Line x1="11" y1="2" x2="11" y2="11" stroke={color} strokeWidth="5" />
      <Line x1="33" y1="2" x2="33" y2="11" stroke={color} strokeWidth="5" />
      <Line x1="13" y1="23" x2="31" y2="23" stroke={color} strokeWidth="3" />
      <Line x1="13" y1="30" x2="27" y2="30" stroke={color} strokeWidth="3" />
    </G>
  );
}
