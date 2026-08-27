/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Dimensions, Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1b1b1b",
    background: "rgb(252, 252, 252)",
    backgroundElement: "rgb(231, 236, 231)",
    backgroundSelected: "#1C7C54",
    textSecondary: "#797979",
    modalBackground: "#ffffff",
    headerBackground: "#1C7C54",
    headerBorder: "#1C7C54",
    headerLogo: "#FFFFFF",
    headerMenu: "#FFFFFF",
    sideMenuBackground: "#1C7C54",
    sideMenuSelected: "rgb(205, 203, 203)",
    sideMenuSelectedText: "#1C7C54",
    sideMenuControlBorder: "#FFFFFF",
    dashboardIcon: "#fff9ed",
  },
  dark: {
    text: "#f4f4f4",
    background: "#090909",
    backgroundElement: "#252a26",
    backgroundSelected: "#2E3135",
    textSecondary: "#B0B4BA",
    modalBackground: "#1d1f1e",
    headerBackground: "#1b1b1b",
    headerBorder: "#1C7C54",
    headerLogo: "#FFFFFF",
    headerMenu: "#FFFFFF",
    sideMenuBackground: "#1b1b1b",
    sideMenuSelected: "#2E3135",
    sideMenuSelectedText: "#1C7C54",
    sideMenuControlBorder: "#1C7C54",
    dashboardIcon: "#f4f4f4",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Shared semantic colors for actions and status indicators. */
export const ActionColors = {
  primary: "#1C7C54",
  info: "#2563EB",
  warning: "#FF7A1A",
  warningText: "#111827",
  danger: "#B42318",
  onAccent: "#FFFFFF",
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

const isCompactIPhone =
  Platform.OS === "ios" && Dimensions.get("window").height <= 667;

export const PageTopPadding = -40;
export const CompactScreenTopMargin = isCompactIPhone ? Spacing.five : 0;
export const AppHeaderHeight = 56;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
