import { formatPlayerName } from "@/features/match-day/lineup-utils";
import type {
  LineupKitSettings,
  MatchLocation,
  MatchSetupFormState,
  PosterColorSettings,
} from "@/features/match-day/match-day-view-types";
import type { Player } from "@/features/players/player-types";
import type { SharePosterOverlayStyle, SharePosterTextPieceId } from "@/features/share/share-poster-overlays";

export function createSharePosterColorsFromKitSettings(
  kitSettings: LineupKitSettings,
): PosterColorSettings {
  const titlePanelColor =
    kitSettings.kitDesign === "sash" ||
    kitSettings.kitDesign === "twoColorStripes"
      ? kitSettings.thirdKitColor
      : kitSettings.outfieldKitColor;
  const valuePanelColor = kitSettings.secondaryKitColor;
  const infoPanelColor =
    kitSettings.kitDesign === "sash" ||
    kitSettings.kitDesign === "twoColorStripes"
      ? kitSettings.outfieldKitColor
      : kitSettings.secondaryKitColor;

  return {
    titlePanelColor,
    valuePanelColor,
    infoPanelColor,
    titleTextColor: getReadableSharePosterTextColor(titlePanelColor),
    valueTextColor: getReadableSharePosterTextColor(valuePanelColor),
    infoTextColor: getReadableSharePosterTextColor(infoPanelColor),
  };
}

export function getReadableSharePosterTextColor(backgroundColor: string) {
  const normalizedColor = backgroundColor.trim().toUpperCase();

  return normalizedColor === "#FFFFFF" || normalizedColor === "#FACC15"
    ? "#111827"
    : "#FFFFFF";
}

export function getSharePosterTextConfig(
  pieceId: SharePosterTextPieceId,
  form: MatchSetupFormState,
  overlayStyle: SharePosterOverlayStyle,
  resultScore: { opponentScore?: number; ownScore?: number } | null,
  preferNicknames: boolean,
  substitutes: Player[],
  teamName: string,
  translations: {
    opponent: string;
    homeMatch: string;
    awayMatch: string;
    subs: string;
    substitutes: string;
  },
) {
  switch (pieceId) {
    case "teamName":
      return createSharePosterTextConfig(teamName.toUpperCase(), 58, "900");
    case "opponentName":
      return createSharePosterTextConfig(
        form.opponent.trim().toUpperCase() || translations.opponent,
        34,
        "900",
      );
    case "homeScore":
      return createSharePosterTextConfig(
        typeof getSharePosterScore(
          "home",
          form.location,
          overlayStyle,
          resultScore,
        ) === "number"
          ? String(
              getSharePosterScore(
                "home",
                form.location,
                overlayStyle,
                resultScore,
              ),
            )
          : "-",
        78,
        "900",
        "normal",
      );
    case "awayScore":
      return createSharePosterTextConfig(
        typeof getSharePosterScore(
          "away",
          form.location,
          overlayStyle,
          resultScore,
        ) === "number"
          ? String(
              getSharePosterScore(
                "away",
                form.location,
                overlayStyle,
                resultScore,
              ),
            )
          : "-",
        78,
        "900",
        "normal",
      );
    case "locationLabel":
    case "dateLabel":
      return createSharePosterTextConfig("", 20, "900", "normal");
    case "locationValue":
      return createSharePosterTextConfig(
        form.venue.trim() ||
          (form.location === "home"
            ? translations.homeMatch
            : translations.awayMatch),
        20,
        "500",
        "normal",
      );
    case "dateValue":
      return createSharePosterTextConfig(
        `${form.date} · ${form.startTime}`,
        20,
        "500",
        "normal",
      );
    case "subsTitle":
      return createSharePosterTextConfig(
        overlayStyle === "broadcast"
          ? translations.subs
          : translations.substitutes,
        34,
        "900",
      );
    case "subOne":
    case "subTwo":
    case "subThree":
    case "subFour":
    case "subFive":
    case "subSix":
    case "subSeven":
      return createSharePosterTextConfig(
        getShareSubstituteLabel(pieceId, substitutes, preferNicknames),
        24,
        "700",
        "normal",
      );
  }
}

export function getSharePosterScore(
  side: "home" | "away",
  location: MatchLocation,
  overlayStyle: SharePosterOverlayStyle,
  resultScore: { opponentScore?: number; ownScore?: number } | null,
) {
  if (overlayStyle !== "broadcast") {
    return side === "home" ? resultScore?.ownScore : resultScore?.opponentScore;
  }

  const isOwnTeamSide = side === location;
  return isOwnTeamSide ? resultScore?.ownScore : resultScore?.opponentScore;
}

export function createSharePosterTextConfig(
  value: string,
  fontSize: number,
  fontWeight: "500" | "700" | "900",
  fontStyle: "italic" | "normal" = "italic",
) {
  return {
    fontSize,
    fontStyle,
    fontWeight,
    value,
  };
}

export function getShareSubstituteLabel(
  pieceId: SharePosterTextPieceId,
  substitutes: Player[],
  preferNicknames: boolean,
) {
  const substituteIndex = getSharePosterSubstituteIndex(pieceId);
  const substitute =
    typeof substituteIndex === "number" ? substitutes[substituteIndex] : null;

  if (!substitute) {
    return "";
  }

  return `${substitute.kitNumber ?? " "} ${formatPlayerName(
    substitute,
    preferNicknames,
  )}`;
}

export function getSharePosterSubstituteIndex(pieceId: SharePosterTextPieceId) {
  const substituteIndexByPieceId: Partial<
    Record<SharePosterTextPieceId, number>
  > = {
    subOne: 0,
    subTwo: 1,
    subThree: 2,
    subFour: 3,
    subFive: 4,
    subSix: 5,
    subSeven: 6,
  };

  return substituteIndexByPieceId[pieceId];
}

export function getSharePosterTextColor(
  pieceId: SharePosterTextPieceId,
  posterColors: PosterColorSettings,
  overlayStyle: SharePosterOverlayStyle,
  location: MatchLocation,
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
      case "subSeven":
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
    case "subsTitle":
      return posterColors.titleTextColor;
    case "homeScore":
      return location === "home"
        ? posterColors.titleTextColor
        : posterColors.valueTextColor;
    case "opponentName":
    case "subOne":
    case "subTwo":
    case "subThree":
    case "subFour":
    case "subFive":
    case "subSix":
    case "subSeven":
      return posterColors.valueTextColor;
    case "awayScore":
      return location === "home"
        ? posterColors.valueTextColor
        : posterColors.titleTextColor;
    case "locationLabel":
    case "locationValue":
    case "dateLabel":
    case "dateValue":
      return posterColors.infoTextColor;
  }
}

export function getPosterTextShadowColor(textColor: string) {
  if (textColor.toLowerCase() === "#ffffff") {
    return "rgba(17, 24, 39, 0.75)";
  }

  return "rgba(255, 255, 255, 0.65)";
}

export function darkenHexColor(hexColor: string, amount: number) {
  const normalizedColor = hexColor.replace("#", "");
  const red = Number.parseInt(normalizedColor.slice(0, 2), 16);
  const green = Number.parseInt(normalizedColor.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedColor.slice(4, 6), 16);
  const nextColor = [red, green, blue]
    .map((value) => Math.max(0, Math.round(value * (1 - amount))))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  return `#${nextColor}`;
}
