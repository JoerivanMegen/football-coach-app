export type SharePosterTextPieceId =
  | "teamName"
  | "opponentName"
  | "homeScore"
  | "awayScore"
  | "locationLabel"
  | "locationValue"
  | "dateLabel"
  | "dateValue"
  | "subsTitle"
  | "subOne"
  | "subTwo"
  | "subThree"
  | "subFour"
  | "subFive"
  | "subSix";

export type SharePosterMovablePieceId = SharePosterTextPieceId | "logo";

export type SharePosterPosition = {
  x: number;
  y: number;
};

export type SharePosterOverlayStyle = "classic" | "broadcast";

export type SharePosterPositionMap = Record<
  SharePosterMovablePieceId,
  SharePosterPosition
>;

export const sharePosterOverlayStyleOptions = [
  { value: "classic", label: "Classic" },
  { value: "broadcast", label: "Broadcast" },
] satisfies { value: SharePosterOverlayStyle; label: string }[];

export const sharePosterTextPieces = [
  { id: "teamName", label: "Team name" },
  { id: "opponentName", label: "Opponent" },
  { id: "homeScore", label: "Home score" },
  { id: "awayScore", label: "Away score" },
  { id: "locationLabel", label: "Location icon" },
  { id: "locationValue", label: "Location value" },
  { id: "dateLabel", label: "Date icon" },
  { id: "dateValue", label: "Date value" },
  { id: "subsTitle", label: "Subs title" },
  { id: "subOne", label: "Sub 1" },
  { id: "subTwo", label: "Sub 2" },
  { id: "subThree", label: "Sub 3" },
  { id: "subFour", label: "Sub 4" },
  { id: "subFive", label: "Sub 5" },
  { id: "subSix", label: "Sub 6" },
] satisfies { id: SharePosterTextPieceId; label: string }[];

export const sharePosterMovablePieces = [
  ...sharePosterTextPieces,
  { id: "logo", label: "Logo" },
] satisfies { id: SharePosterMovablePieceId; label: string }[];

export const defaultSharePosterPositionsByOverlayStyle = {
  classic: {
    teamName: { x: 58, y: 122 },
    opponentName: { x: 64, y: 178 },
    homeScore: { x: 872, y: 122 },
    awayScore: { x: 872, y: 194 },
    locationLabel: { x: 34, y: 270 },
    locationValue: { x: 96, y: 270 },
    dateLabel: { x: 474, y: 274 },
    dateValue: { x: 536, y: 274 },
    subsTitle: { x: 72, y: 1223 },
    subOne: { x: 400, y: 1223 },
    subTwo: { x: 540, y: 1223 },
    subThree: { x: 680, y: 1223 },
    subFour: { x: 400, y: 1283 },
    subFive: { x: 540, y: 1283 },
    subSix: { x: 680, y: 1283 },
    logo: { x: 830, y: 1146 },
  },
  broadcast: {
    teamName: { x: 96, y: 122 },
    opponentName: { x: 90, y: 230 },
    homeScore: { x: 740, y: 154 },
    awayScore: { x: 920, y: 154 },
    locationLabel: { x: 84, y: 310 },
    locationValue: { x: 144, y: 310 },
    dateLabel: { x: 578, y: 310 },
    dateValue: { x: 648, y: 310 },
    subsTitle: { x: 82, y: 1252 },
    subOne: { x: 310, y: 1226 },
    subTwo: { x: 310, y: 1276 },
    subThree: { x: 510, y: 1226 },
    subFour: { x: 510, y: 1276 },
    subFive: { x: 710, y: 1226 },
    subSix: { x: 710, y: 1276 },
    logo: { x: 830, y: 1134 },
  },
} satisfies Record<SharePosterOverlayStyle, SharePosterPositionMap>;
