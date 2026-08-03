import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, PageTopPadding, Spacing } from "@/constants/theme";
import { getTeamSettingsAsync } from "@/features/settings/team-settings-repository";
import type { TeamSettings } from "@/features/settings/team-settings-types";
import {
  shareBackgroundTemplates,
  type ShareBackgroundTemplateId,
} from "@/features/share/share-background-templates";
import { shareLineupFormationSlots } from "@/features/share/share-lineup-formations";
import {
  defaultSharePosterPositionsByOverlayStyle,
  sharePosterMovablePieces,
  sharePosterOverlayStyleOptions,
  sharePosterTextPieces,
  type SharePosterMovablePieceId,
  type SharePosterOverlayStyle,
  type SharePosterPositionMap,
  type SharePosterTextPieceId,
} from "@/features/share/share-poster-overlays";
import { useTheme } from "@/hooks/use-theme";

type PreviewPlayer = {
  id: string;
  name: string;
  number: number;
};
type ShareKitSettings = Pick<
  TeamSettings,
  | "kitDesign"
  | "outfieldKitColor"
  | "secondaryKitColor"
  | "sashAccentKitColor"
  | "kitNumberColor"
  | "goalkeeperKitColor"
>;
type PosterColorSettings = {
  titlePanelColor: string;
  valuePanelColor: string;
  infoPanelColor: string;
  titleTextColor: string;
  valueTextColor: string;
  infoTextColor: string;
};

const samplePlayers: PreviewPlayer[] = [
  { id: "1", name: "Noah", number: 11 },
  { id: "2", name: "Milan", number: 9 },
  { id: "3", name: "Finn", number: 7 },
  { id: "4", name: "Sem", number: 8 },
  { id: "5", name: "Daan", number: 6 },
  { id: "6", name: "Levi", number: 10 },
  { id: "7", name: "Jay", number: 5 },
  { id: "8", name: "Lars", number: 4 },
  { id: "9", name: "Tijn", number: 3 },
  { id: "10", name: "Ravi", number: 2 },
  { id: "11", name: "Max", number: 1 },
];
const defaultKitSettings: ShareKitSettings = {
  kitDesign: "solid",
  outfieldKitColor: "#FFFFFF",
  secondaryKitColor: "#536DFE",
  sashAccentKitColor: "#EF4444",
  kitNumberColor: "#111827",
  goalkeeperKitColor: "#111827",
};
const assistantCoachLogo = require("@/assets/images/match-day/assistant-coach-logo.png");
const colorOptions = [
  "#FFFFFF",
  "#111827",
  "#1C7C54",
  "#536DFE",
  "#9333EA",
  "#FF7A1A",
  "#EF4444",
  "#FACC15",
] as const;
const kitShirtPath =
  "M34 7 C38 11 62 11 66 7 L76 7 L95 25 Q98 27 96 31 L87 47 Q85 51 81 49 L73 44 L73 83 Q73 87 69 87 L31 87 Q27 87 27 83 L27 44 L19 49 Q15 51 13 47 L4 31 Q2 27 5 25 L24 7 Z";

export default function SharePositionPlaygroundScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [background, setBackground] =
    useState<ShareBackgroundTemplateId>("day");
  const [overlayStyle, setOverlayStyle] =
    useState<SharePosterOverlayStyle>("classic");
  const [kitSettings, setKitSettings] =
    useState<ShareKitSettings>(defaultKitSettings);
  const [posterColors, setPosterColors] = useState<PosterColorSettings>(() =>
    createPosterColorsFromKitSettings(defaultKitSettings),
  );
  const [selectedPieceId, setSelectedPieceId] =
    useState<SharePosterMovablePieceId>("teamName");
  const [textPositionsByOverlayStyle, setTextPositionsByOverlayStyle] =
    useState(defaultSharePosterPositionsByOverlayStyle);
  const selectedBackground =
    shareBackgroundTemplates.find((option) => option.id === background) ??
    shareBackgroundTemplates[0];
  const lineupFrame = selectedBackground.lineupFrame;
  const slots = shareLineupFormationSlots["4-3-3"];
  const textPositions = textPositionsByOverlayStyle[overlayStyle];
  const playersById = useMemo(
    () => new Map(samplePlayers.map((player) => [player.id, player])),
    [],
  );
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: PageTopPadding,
      paddingBottom: Spacing.five,
    },
  });

  useEffect(() => {
    let isMounted = true;

    getTeamSettingsAsync()
      .then((settings) => {
        if (isMounted) {
          const resolvedSettings = settings ?? defaultKitSettings;
          setKitSettings(resolvedSettings);
          setPosterColors(createPosterColorsFromKitSettings(resolvedSettings));
        }
      })
      .catch((error: unknown) => {
        console.warn(
          "Failed to load team settings for share playground",
          error,
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function nudgeSelectedPiece(x: number, y: number) {
    setTextPositionsByOverlayStyle((current) => ({
      ...current,
      [overlayStyle]: {
        ...current[overlayStyle],
        [selectedPieceId]: {
          x: current[overlayStyle][selectedPieceId].x + x,
          y: current[overlayStyle][selectedPieceId].y + y,
        },
      },
    }));
  }

  function resetSelectedPiece() {
    setTextPositionsByOverlayStyle((current) => ({
      ...current,
      [overlayStyle]: {
        ...current[overlayStyle],
        [selectedPieceId]:
          defaultSharePosterPositionsByOverlayStyle[overlayStyle][
            selectedPieceId
          ],
      },
    }));
  }

  function updatePosterColor(key: keyof PosterColorSettings, value: string) {
    setPosterColors((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            style={styles.eyebrow}
          >
            Temporary playground
          </ThemedText>
          <ThemedText type="subtitle" style={styles.title}>
            Share background positioning
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Tune the text positions over the share image. The selected text is
            highlighted green in the preview.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.backgroundPicker}>
          {shareBackgroundTemplates.map((option) => {
            const isSelected = option.id === background;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setBackground(option.id)}
                style={({ pressed }) => [
                  styles.backgroundButton,
                  isSelected && styles.backgroundButtonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={isSelected && styles.backgroundButtonTextSelected}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        <ThemedView style={styles.backgroundPicker}>
          {sharePosterOverlayStyleOptions.map((option) => {
            const isSelected = option.value === overlayStyle;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  setOverlayStyle(option.value);
                  setSelectedPieceId("teamName");
                }}
                style={({ pressed }) => [
                  styles.backgroundButton,
                  isSelected && styles.backgroundButtonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={isSelected && styles.backgroundButtonTextSelected}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.colorPanel}>
          <ThemedText type="default">Overlay colors</ThemedText>
          <ThemedView style={styles.colorGrid}>
            <ShareColorSection
              panelLabel="Background"
              panelValue={posterColors.titlePanelColor}
              textLabel="Text"
              textValue={posterColors.titleTextColor}
              title="Team, home score & subs title"
              onPanelChange={(color) =>
                updatePosterColor("titlePanelColor", color)
              }
              onTextChange={(color) =>
                updatePosterColor("titleTextColor", color)
              }
            />
            <ShareColorSection
              panelLabel="Background"
              panelValue={posterColors.valuePanelColor}
              textLabel="Text"
              textValue={posterColors.valueTextColor}
              title="Opponent, away score & subs"
              onPanelChange={(color) =>
                updatePosterColor("valuePanelColor", color)
              }
              onTextChange={(color) =>
                updatePosterColor("valueTextColor", color)
              }
            />
            <ShareColorSection
              panelLabel="Background"
              panelValue={posterColors.infoPanelColor}
              textLabel="Text & icons"
              textValue={posterColors.infoTextColor}
              title="Location, date & accents"
              onPanelChange={(color) =>
                updatePosterColor("infoPanelColor", color)
              }
              onTextChange={(color) =>
                updatePosterColor("infoTextColor", color)
              }
            />
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.textPicker}>
          {sharePosterMovablePieces.map((piece) => {
            const isSelected = piece.id === selectedPieceId;
            return (
              <Pressable
                key={piece.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedPieceId(piece.id)}
                style={({ pressed }) => [
                  styles.textButton,
                  isSelected && styles.textButtonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={isSelected && styles.textButtonTextSelected}
                >
                  {piece.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        <ThemedView style={styles.posterFrame}>
          <Image
            source={selectedBackground.source}
            contentFit="cover"
            style={styles.backgroundImage}
          />
          <SharePosterOverlay
            overlayStyle={overlayStyle}
            posterColors={posterColors}
          />
          <SharePosterTextPositionLayer
            overlayStyle={overlayStyle}
            posterColors={posterColors}
            selectedPieceId={selectedPieceId}
            textPositions={textPositions}
          />
          <ThemedView
            style={[
              styles.lineupLayer,
              {
                left: `${lineupFrame.left}%`,
                top: `${lineupFrame.top}%`,
                transform: [{ scale: lineupFrame.scale }],
              },
            ]}
          >
            {slots.map((slot) => {
              const player = playersById.get(slot.id);
              if (!player) {
                return null;
              }

              return (
                <ThemedView
                  key={slot.id}
                  style={[
                    styles.playerSpot,
                    {
                      left: `${slot.left}%`,
                      top: `${slot.top}%`,
                    },
                  ]}
                >
                  <ThemedView style={styles.playerKit}>
                    <ShareJerseyShape
                      isGoalkeeper={slot.isGoalkeeper}
                      kitSettings={kitSettings}
                    />
                    <ThemedText
                      type="smallBold"
                      style={[
                        styles.shirtNumber,
                        {
                          color: slot.isGoalkeeper
                            ? "#FFFFFF"
                            : kitSettings.kitNumberColor,
                          textShadowColor: getKitNumberOutlineColor(
                            slot.isGoalkeeper
                              ? "#FFFFFF"
                              : kitSettings.kitNumberColor,
                          ),
                        },
                      ]}
                    >
                      {player.number}
                    </ThemedText>
                  </ThemedView>
                  <ThemedText
                    type="code"
                    style={styles.playerName}
                    numberOfLines={1}
                  >
                    {player.name}
                  </ThemedText>
                </ThemedView>
              );
            })}
          </ThemedView>
          <ThemedView
            style={[
              styles.logoWatermarkFrame,
              {
                left: `${(textPositions.logo.x / 1080) * 100}%`,
                top: `${(textPositions.logo.y / 1350) * 100}%`,
              },
              selectedPieceId === "logo" && styles.logoWatermarkFrameSelected,
            ]}
          >
            <Image
              source={assistantCoachLogo}
              contentFit="contain"
              style={styles.logoWatermarkImage}
            />
          </ThemedView>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.tuningPanel}>
          <ThemedView style={styles.tuningHeader}>
            <ThemedView>
              <ThemedText type="default">Selected item</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {getMovablePieceLabel(selectedPieceId)} · x{" "}
                {textPositions[selectedPieceId].x} · y{" "}
                {textPositions[selectedPieceId].y}
              </ThemedText>
            </ThemedView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset selected item"
              onPress={resetSelectedPiece}
              style={({ pressed }) => [
                styles.resetButton,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  ios: "arrow.counterclockwise",
                  android: "refresh",
                  web: "refresh",
                }}
                size={16}
                tintColor={theme.text}
              />
              <ThemedText type="smallBold">Reset</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.nudgeGrid}>
            <NudgeButton
              label="Up"
              onPress={() => nudgeSelectedPiece(0, -10)}
            />
            <ThemedView style={styles.nudgeRow}>
              <NudgeButton
                label="Left"
                onPress={() => nudgeSelectedPiece(-10, 0)}
              />
              <NudgeButton
                label="Right"
                onPress={() => nudgeSelectedPiece(10, 0)}
              />
            </ThemedView>
            <NudgeButton
              label="Down"
              onPress={() => nudgeSelectedPiece(0, 10)}
            />
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

function SharePosterTextPositionLayer({
  overlayStyle,
  posterColors,
  selectedPieceId,
  textPositions,
}: {
  overlayStyle: SharePosterOverlayStyle;
  posterColors: PosterColorSettings;
  selectedPieceId: SharePosterMovablePieceId;
  textPositions: SharePosterPositionMap;
}) {
  return (
    <Svg
      pointerEvents="none"
      viewBox="0 0 1080 1350"
      style={styles.posterOverlay}
    >
      {sharePosterTextPieces.map((textPiece) => {
        const position = textPositions[textPiece.id];
        const isSelected = textPiece.id === selectedPieceId;
        const fillColor = isSelected ? "#22C55E" : undefined;

        if (textPiece.id === "locationLabel") {
          return (
            <LocationPinIcon
              key={textPiece.id}
              color={fillColor ?? posterColors.titlePanelColor}
              x={position.x}
              y={position.y}
            />
          );
        }

        if (textPiece.id === "dateLabel") {
          return (
            <CalendarIcon
              key={textPiece.id}
              color={fillColor ?? posterColors.titlePanelColor}
              x={position.x}
              y={position.y}
            />
          );
        }

        const piece = getTextPieceConfig(
          textPiece.id,
          getTextColorForPiece(textPiece.id, posterColors, overlayStyle),
          overlayStyle,
        );
        const textFill = fillColor ?? piece.fill;
        const textShadowColor = getPosterTextShadowColor(textFill);

        return (
          <G key={textPiece.id}>
            <SvgText
              fill={textShadowColor}
              fontSize={piece.fontSize}
              fontStyle={piece.fontStyle}
              fontWeight={piece.fontWeight}
              stroke={textShadowColor}
              strokeWidth={2}
              x={position.x + 2}
              y={position.y + 2}
            >
              {piece.value}
            </SvgText>
            <SvgText
              fill={textFill}
              fontSize={piece.fontSize}
              fontStyle={piece.fontStyle}
              fontWeight={piece.fontWeight}
              x={position.x}
              y={position.y}
            >
              {piece.value}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
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

function SharePosterOverlay({
  overlayStyle,
  posterColors,
}: {
  overlayStyle: SharePosterOverlayStyle;
  posterColors: PosterColorSettings;
}) {
  if (overlayStyle === "broadcast") {
    return <BroadcastPosterOverlay posterColors={posterColors} />;
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
      <Path
        d="M812 36 H1080 V222 H700 Z"
        fill="url(#secondaryPanel)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
      <Path d="M780 36 H812 L700 222 H668 Z" fill="#FFFFFF" />
      <Path d="M692 228 H0 V218 H696 Z" fill="rgba(0,0,0,0.3)" />
      <Line
        x1="1000"
        y1="78"
        x2="1000"
        y2="178"
        stroke={posterColors.valueTextColor}
        strokeWidth="4"
      />

      <Path
        d="M0 232 H880 Q902 232 892 254 L870 296 H0 Z"
        fill={posterColors.infoPanelColor}
      />
      <Line x1="424" y1="244" x2="424" y2="284" stroke="#D1D5DB" />
      <Line
        x1="0"
        y1="296"
        x2="870"
        y2="296"
        stroke={posterColors.titlePanelColor}
        strokeWidth="3"
      />

      <Path
        d="M0 1138 H354 Q364 1138 359 1152 L334 1218 H0 Z"
        fill="url(#primaryPanel)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
      <Path
        d="M364 1138 H1038 Q1062 1138 1052 1162 L1018 1296 H0 V1218 H334 Z"
        fill="url(#secondaryPanel)"
        stroke="#FFFFFF"
        strokeWidth="3"
      />
      <Line
        x1="0"
        y1="1300"
        x2="1012"
        y2="1300"
        stroke={posterColors.titlePanelColor}
        strokeWidth="4"
      />

      {Array.from({ length: 16 }, (_, index) => (
        <Line
          key={index}
          x1={730 + index * 18}
          y1="1148"
          x2={650 + index * 18}
          y2="1294"
          stroke="#FFFFFF"
          strokeOpacity="0.04"
          strokeWidth="8"
        />
      ))}
    </Svg>
  );
}

function BroadcastPosterOverlay({
  posterColors,
}: {
  posterColors: PosterColorSettings;
}) {
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
      <Rect
        x="660"
        y="74"
        width="158"
        height="186"
        rx="8"
        fill="url(#broadcastTitle)"
      />
      <Rect
        x="866"
        y="74"
        width="158"
        height="186"
        rx="8"
        fill="url(#broadcastValue)"
      />
      <Path d="M866 74 H926 L900 260 H866 Z" fill="url(#broadcastDark)" />

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

function getTextPieceConfig(
  pieceId: SharePosterTextPieceId,
  textColor: string,
  overlayStyle: SharePosterOverlayStyle,
) {
  switch (pieceId) {
    case "teamName":
      return {
        fill: textColor,
        fontSize: 58,
        fontStyle: "italic" as const,
        fontWeight: "900" as const,
        value: "YOUR TEAM",
      };
    case "opponentName":
      return {
        fill: textColor,
        fontSize: 34,
        fontStyle: "italic" as const,
        fontWeight: "900" as const,
        value: "OPPONENT",
      };
    case "homeScore":
      return {
        fill: textColor,
        fontSize: 78,
        fontStyle: "normal" as const,
        fontWeight: "900" as const,
        value: "3",
      };
    case "awayScore":
      return {
        fill: textColor,
        fontSize: 78,
        fontStyle: "normal" as const,
        fontWeight: "900" as const,
        value: "3",
      };
    case "locationLabel":
      return {
        fill: textColor,
        fontSize: 20,
        fontStyle: "normal" as const,
        fontWeight: "900" as const,
        value: "LOCATION",
      };
    case "locationValue":
      return {
        fill: textColor,
        fontSize: 20,
        fontStyle: "normal" as const,
        fontWeight: "500" as const,
        value: "Home Ground",
      };
    case "dateLabel":
      return {
        fill: textColor,
        fontSize: 20,
        fontStyle: "normal" as const,
        fontWeight: "900" as const,
        value: "DATE & TIME",
      };
    case "dateValue":
      return {
        fill: textColor,
        fontSize: 20,
        fontStyle: "normal" as const,
        fontWeight: "500" as const,
        value: "25 Jul 2026 · 15:00",
      };
    case "subsTitle":
      return {
        fill: textColor,
        fontSize: 34,
        fontStyle: "italic" as const,
        fontWeight: "900" as const,
        value: overlayStyle === "broadcast" ? "SUBS" : "SUBSTITUTES:",
      };
    case "subOne":
      return {
        fill: textColor,
        fontSize: 24,
        fontStyle: "normal" as const,
        fontWeight: "700" as const,
        value: "12 Jason",
      };
    case "subTwo":
      return {
        fill: textColor,
        fontSize: 24,
        fontStyle: "normal" as const,
        fontWeight: "700" as const,
        value: "14 Niek",
      };
    case "subThree":
      return {
        fill: textColor,
        fontSize: 24,
        fontStyle: "normal" as const,
        fontWeight: "700" as const,
        value: "15 Boaz",
      };
    case "subFour":
      return {
        fill: textColor,
        fontSize: 24,
        fontStyle: "normal" as const,
        fontWeight: "700" as const,
        value: "16 Mex",
      };
    case "subFive":
      return {
        fill: textColor,
        fontSize: 24,
        fontStyle: "normal" as const,
        fontWeight: "700" as const,
        value: "17 Tim",
      };
    case "subSix":
      return {
        fill: textColor,
        fontSize: 24,
        fontStyle: "normal" as const,
        fontWeight: "700" as const,
        value: "18 Sam",
      };
  }
}

function getTextColorForPiece(
  pieceId: SharePosterTextPieceId,
  posterColors: PosterColorSettings,
  overlayStyle: SharePosterOverlayStyle,
) {
  if (overlayStyle === "classic") {
    switch (pieceId) {
      case "teamName":
      case "opponentName":
      case "subsTitle":
        return posterColors.titleTextColor;
      case "homeScore":
      case "awayScore":
      case "subOne":
      case "subTwo":
      case "subThree":
      case "subFour":
      case "subFive":
      case "subSix":
        return posterColors.valueTextColor;
      case "locationLabel":
      case "locationValue":
      case "dateLabel":
      case "dateValue":
        return posterColors.infoTextColor;
    }
  }

  switch (pieceId) {
    case "teamName":
    case "homeScore":
    case "subsTitle":
      return posterColors.titleTextColor;
    case "opponentName":
    case "awayScore":
    case "subOne":
    case "subTwo":
    case "subThree":
    case "subFour":
    case "subFive":
    case "subSix":
      return posterColors.valueTextColor;
    case "locationLabel":
    case "locationValue":
    case "dateLabel":
    case "dateValue":
      return posterColors.infoTextColor;
  }
}

function getMovablePieceLabel(pieceId: SharePosterMovablePieceId) {
  return (
    sharePosterMovablePieces.find((piece) => piece.id === pieceId)?.label ??
    pieceId
  );
}

function ShareColorSection({
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
    <ThemedView style={styles.colorSection}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedView style={styles.colorSectionControls}>
        <ShareColorSwatches
          label={panelLabel}
          value={panelValue}
          onChange={onPanelChange}
        />
        <ShareColorSwatches
          label={textLabel}
          value={textValue}
          onChange={onTextChange}
        />
      </ThemedView>
    </ThemedView>
  );
}

function ShareColorSwatches({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (color: string) => void;
  value: string;
}) {
  return (
    <ThemedView style={styles.colorField}>
      <ThemedView style={styles.colorFieldHeader}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {value}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.swatchRow}>
        {colorOptions.map((color) => (
          <Pressable
            key={`${label}-${color}`}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${color}`}
            accessibilityState={{ selected: value === color }}
            onPress={() => onChange(color)}
            style={({ pressed }) => [
              styles.swatchButton,
              { backgroundColor: color },
              value === color && styles.swatchButtonSelected,
              pressed && styles.pressed,
            ]}
          />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

function NudgeButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.nudgeButton, pressed && styles.pressed]}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function ShareJerseyShape({
  isGoalkeeper,
  kitSettings,
}: {
  isGoalkeeper?: boolean;
  kitSettings: ShareKitSettings;
}) {
  const fillColor = isGoalkeeper
    ? kitSettings.goalkeeperKitColor
    : kitSettings.outfieldKitColor;
  const strokeColor = isGoalkeeper ? "#FFFFFF" : "#111827";

  return (
    <Svg viewBox="0 0 100 90" style={styles.jerseySvg}>
      <Defs>
        <ClipPath id="sharePlaygroundJerseyClip">
          <Path d={kitShirtPath} />
        </ClipPath>
      </Defs>
      <Path d={kitShirtPath} fill={fillColor} />
      {!isGoalkeeper ? (
        <G clipPath="url(#sharePlaygroundJerseyClip)">
          <ShareKitDesignBlocks kitSettings={kitSettings} />
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

function ShareKitDesignBlocks({
  kitSettings,
}: {
  kitSettings: ShareKitSettings;
}) {
  switch (kitSettings.kitDesign) {
    case "stripes":
      return (
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
      );
    case "hoops":
      return (
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
      );
    case "halves":
      return (
        <Rect
          x="50"
          y="0"
          width="50"
          height="90"
          fill={kitSettings.secondaryKitColor}
        />
      );
    case "sides":
      return (
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
      );
    case "sash":
      return (
        <>
          <Path
            d="M4 90 L86 -16 L96 -16 L14 90 Z"
            fill={kitSettings.secondaryKitColor}
          />
          <Path
            d="M14 90 L96 -16 L106 -16 L24 90 Z"
            fill={kitSettings.sashAccentKitColor}
          />
        </>
      );
    case "solid":
      return null;
  }
}

function getKitNumberOutlineColor(color: string) {
  return color.toLowerCase() === "#111827" || color.toLowerCase() === "#000000"
    ? "#FFFFFF"
    : "#111827";
}

function createPosterColorsFromKitSettings(
  kitSettings: ShareKitSettings,
): PosterColorSettings {
  return {
    titlePanelColor: kitSettings.outfieldKitColor,
    valuePanelColor: kitSettings.secondaryKitColor,
    infoPanelColor: "#FFFFFF",
    titleTextColor: kitSettings.kitNumberColor,
    valueTextColor: kitSettings.kitNumberColor,
    infoTextColor: "#111827",
  };
}

function getPosterTextShadowColor(textColor: string) {
  return isLightHexColor(textColor)
    ? "rgba(17,24,39,0.72)"
    : "rgba(255,255,255,0.7)";
}

function darkenHexColor(hexColor: string, amount: number) {
  const normalized = hexColor.replace("#", "");
  if (normalized.length !== 6) {
    return hexColor;
  }

  const colorValue = Number.parseInt(normalized, 16);
  const red = Math.max(
    0,
    Math.round(((colorValue >> 16) & 255) * (1 - amount)),
  );
  const green = Math.max(
    0,
    Math.round(((colorValue >> 8) & 255) * (1 - amount)),
  );
  const blue = Math.max(0, Math.round((colorValue & 255) * (1 - amount)));

  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function isLightHexColor(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  if (normalized.length !== 6) {
    return false;
  }

  const colorValue = Number.parseInt(normalized, 16);
  const red = (colorValue >> 16) & 255;
  const green = (colorValue >> 8) & 255;
  const blue = colorValue & 255;

  return (red * 299 + green * 587 + blue * 114) / 1000 > 180;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    justifyContent: "center",
    flexDirection: "row",
  },
  container: {
    flexGrow: 1,
    gap: Spacing.three,
    maxWidth: 1280,
    paddingHorizontal: Spacing.one,
    paddingTop: PageTopPadding,
  },
  header: {
    gap: Spacing.one,
  },
  eyebrow: {
    textTransform: "uppercase",
  },
  title: {
    lineHeight: 38,
  },
  backgroundPicker: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  backgroundButton: {
    borderColor: "#536DFE",
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backgroundButtonSelected: {
    backgroundColor: "#536DFE",
  },
  backgroundButtonTextSelected: {
    color: "#FFFFFF",
  },
  colorPanel: {
    borderRadius: Spacing.three,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  colorGrid: {
    gap: Spacing.three,
  },
  colorSection: {
    borderColor: "#D1D5DB",
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.two,
  },
  colorSectionControls: {
    gap: Spacing.two,
  },
  colorField: {
    gap: Spacing.one,
  },
  colorFieldHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  swatchButton: {
    borderColor: "#D1D5DB",
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    width: 30,
  },
  swatchButtonSelected: {
    borderColor: "#111827",
    borderWidth: 3,
  },
  textPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  textButton: {
    borderColor: "#111827",
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  textButtonSelected: {
    backgroundColor: "#111827",
  },
  textButtonTextSelected: {
    color: "#FFFFFF",
  },
  posterFrame: {
    aspectRatio: 1080 / 1350,
    backgroundColor: "#111827",
    borderRadius: Spacing.three,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  backgroundImage: {
    height: "100%",
    width: "100%",
  },
  posterOverlay: {
    ...StyleSheet.absoluteFill,
  },
  lineupLayer: {
    ...StyleSheet.absoluteFill,
    position: "absolute",
  },
  playerSpot: {
    alignItems: "center",
    gap: Spacing.half,
    position: "absolute",
    transform: [{ translateX: -40 }, { translateY: -43 }],
    width: 79,
  },
  playerKit: {
    height: 49,
    position: "relative",
    width: 58,
  },
  jerseySvg: {
    height: 49,
    width: 58,
  },
  shirtNumber: {
    fontSize: 14,
    left: 0,
    lineHeight: 17,
    position: "absolute",
    right: 0,
    textAlign: "center",
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 2,
    top: 14,
  },
  playerName: {
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "#111827",
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 2,
  },
  logoWatermarkFrame: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    borderRadius: Spacing.two,
    height: 74,
    justifyContent: "center",
    position: "absolute",
    width: 74,
  },
  logoWatermarkFrameSelected: {
    borderColor: "#22C55E",
    borderWidth: 2,
  },
  logoWatermarkImage: {
    height: 58,
    opacity: 0.86,
    width: 58,
  },
  tuningPanel: {
    borderRadius: Spacing.three,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  tuningHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  resetButton: {
    alignItems: "center",
    borderColor: "#536DFE",
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  nudgeGrid: {
    alignItems: "center",
    gap: Spacing.two,
  },
  nudgeRow: {
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
  },
  nudgeButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
    borderRadius: Spacing.two,
    borderWidth: 1,
    minWidth: 88,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
