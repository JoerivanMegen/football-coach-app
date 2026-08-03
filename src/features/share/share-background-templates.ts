export type ShareBackgroundTemplateId =
  | "day"
  | "night"
  | "stadium-day"
  | "stadium-night";

export type ShareLineupFrame = {
  left: number;
  scale: number;
  top: number;
};

export type ShareBackgroundTemplate = {
  id: ShareBackgroundTemplateId;
  label: string;
  lineupFrame: ShareLineupFrame;
  source: number;
};

export const shareBackgroundTemplates = [
  {
    id: "day",
    label: "Day",
    lineupFrame: { left: -1, scale: 0.78, top: 12 },
    source: require("@/assets/images/match-day/share-background-1-day.png"),
  },
  {
    id: "night",
    label: "Night",
    lineupFrame: { left: 0, scale: 0.78, top: 12 },
    source: require("@/assets/images/match-day/share-background-1-night.png"),
  },
  {
    id: "stadium-day",
    label: "Stadium day",
    lineupFrame: { left: 0, scale: 0.76, top: 10 },
    source: require("@/assets/images/match-day/share-background-stadium-day.png"),
  },
  {
    id: "stadium-night",
    label: "Stadium night",
    lineupFrame: { left: 0, scale: 0.78, top: 12 },
    source: require("@/assets/images/match-day/share-background-stadium-night.png"),
  },
] satisfies ShareBackgroundTemplate[];
