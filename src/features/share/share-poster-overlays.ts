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
    subsTitle: { x: 72, y: 1203 },
    subOne: { x: 400, y: 1203 },
    subTwo: { x: 520, y: 1203 },
    subThree: { x: 640, y: 1203 },
    subFour: { x: 400, y: 1263 },
    subFive: { x: 520, y: 1263 },
    subSix: { x: 640, y: 1263 },
    logo: { x: 830, y: 1137 },
  },
  broadcast: {
    teamName: { x: 96, y: 162 },
    opponentName: { x: 90, y: 270 },
    homeScore: { x: 740, y: 194 },
    awayScore: { x: 920, y: 194 },
    locationLabel: { x: 84, y: 350 },
    locationValue: { x: 144, y: 350 },
    dateLabel: { x: 578, y: 350 },
    dateValue: { x: 648, y: 350 },
    subsTitle: { x: 82, y: 1232 },
    subOne: { x: 270, y: 1232 },
    subTwo: { x: 420, y: 1232 },
    subThree: { x: 550, y: 1232 },
    subFour: { x: 680, y: 1232 },
    subFive: { x: 810, y: 1232 },
    subSix: { x: 940, y: 1232 },
    logo: { x: 780, y: 952 },
  },
} satisfies Record<SharePosterOverlayStyle, SharePosterPositionMap>;
