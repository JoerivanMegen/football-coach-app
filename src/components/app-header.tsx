import { Image } from "expo-image";
import { type Href, usePathname, useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeaderHeight, Spacing } from "@/constants/theme";
import { useI18n } from "@/i18n/i18n-provider";
import type { TranslationKey } from "@/i18n/generated/translations";
import {
  getTeamSettingsAsync,
  subscribeToTeamSettingsChanges,
} from "@/features/settings/team-settings-repository";
import { useTheme } from "@/hooks/use-theme";

type MenuItem = {
  href: Href;
  icon: SymbolViewProps["name"];
  labelKey: TranslationKey;
  requiresFineJar?: boolean;
};

const menuItems: MenuItem[] = [
  {
    href: "/",
    icon: { ios: "house.fill", android: "home", web: "home" },
    labelKey: "navigation.home",
  },
  {
    href: "/players",
    icon: { ios: "person.3.fill", android: "groups", web: "groups" },
    labelKey: "navigation.players",
  },
  {
    href: "/events",
    icon: { ios: "calendar", android: "event", web: "event" },
    labelKey: "navigation.training",
  },
  {
    href: "/match-day",
    icon: {
      ios: "sportscourt.fill",
      android: "sports_soccer",
      web: "sports_soccer",
    },
    labelKey: "navigation.matchDay",
  },
  {
    href: "/fine-jar",
    icon: { ios: "eurosign.circle.fill", android: "payments", web: "payments" },
    labelKey: "navigation.fineJar",
    requiresFineJar: true,
  },
  {
    href: "/seasons",
    icon: { ios: "calendar.badge.clock", android: "history", web: "history" },
    labelKey: "navigation.seasons",
  },
  {
    href: "/settings",
    icon: { ios: "gearshape.fill", android: "settings", web: "settings" },
    labelKey: "navigation.settings",
  },
];

export function AppHeader() {
  const theme = useTheme();
  const { locale, setLocale, t } = useI18n();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isFineJarEnabled, setIsFineJarEnabled] = useState(false);
  const [menuProgress] = useState(() => new Animated.Value(0));

  useEffect(
    () =>
      subscribeToTeamSettingsChanges((settings) => {
        setIsFineJarEnabled(settings.fineJarEnabled);
      }),
    [],
  );

  useEffect(() => {
    void getTeamSettingsAsync()
      .then((settings) => setIsFineJarEnabled(settings?.fineJarEnabled ?? false))
      .catch((error: unknown) => {
        console.warn("Failed to load Fine Jar preference", error);
      });
  }, [pathname]);

  function openMenu() {
    menuProgress.stopAnimation();
    menuProgress.setValue(0);
    setIsMenuVisible(true);
    requestAnimationFrame(() => {
      Animated.timing(menuProgress, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }).start();
    });
  }

  function closeMenu(onClosed?: () => void) {
    menuProgress.stopAnimation();
    Animated.timing(menuProgress, {
      duration: 220,
      easing: Easing.in(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMenuVisible(false);
        onClosed?.();
      }
    });
  }

  function navigateTo(href: Href) {
    closeMenu(() => router.navigate(href));
  }

  return (
    <>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBackground,
            borderBottomColor: theme.headerBorder,
            height: insets.top + AppHeaderHeight,
            paddingTop: insets.top,
          },
        ]}
      >
        <Image
          accessibilityLabel="Assistant Coach"
          contentFit="contain"
          contentPosition="left center"
          source={require("@/assets/images/assistant-coach-language-logo.png")}
          style={[styles.logo, { tintColor: theme.headerLogo }]}
        />
        <Pressable
          accessibilityLabel={
            isMenuVisible ? t("navigation.closeMenu") : t("navigation.openMenu")
          }
          accessibilityRole="button"
          accessibilityState={{ expanded: isMenuVisible }}
          onPress={isMenuVisible ? () => closeMenu() : openMenu}
          style={({ pressed }) => [
            styles.menuButton,
            pressed && styles.pressed,
          ]}
        >
          <AnimatedMenuIcon color={theme.headerMenu} progress={menuProgress} />
        </Pressable>
      </View>

      {isMenuVisible ? (
        <View style={styles.menuOverlay}>
          <Animated.View
            style={[styles.menuBackdrop, { opacity: menuProgress }]}
          >
            <Pressable
              accessibilityLabel={t("navigation.closeMenu")}
              onPress={() => closeMenu()}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.menuPanel,
              {
                backgroundColor: theme.sideMenuBackground,
                paddingTop: insets.top + AppHeaderHeight + Spacing.three,
                paddingBottom: insets.bottom + Spacing.three,
              },
              {
                transform: [
                  {
                    translateX: menuProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [360, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.menuList}>
              {menuItems.filter((item) => !item.requiresFineJar || isFineJarEnabled).map((item) => {
                const isSelected =
                  item.href === "/" ? pathname === "/" : pathname === item.href;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={String(item.href)}
                    onPress={() => navigateTo(item.href)}
                    style={({ pressed }) => [
                      styles.menuItem,
                      isSelected && {
                        backgroundColor: theme.sideMenuSelected,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={item.icon}
                      tintColor={
                        isSelected ? theme.sideMenuSelectedText : "#FFFFFF"
                      }
                      size={20}
                    />
                    <Text
                      style={[
                        styles.menuItemText,
                        isSelected && { color: theme.sideMenuSelectedText },
                      ]}
                    >
                      {t(item.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.languageSection}>
              <Text style={styles.languageTitle}>{t("settings.language.title")}</Text>
              <View style={styles.languageButtons}>
                {([
                  { code: "nl" as const, flag: "🇳🇱", label: "NL" },
                  { code: "en" as const, flag: "🇬🇧", label: "EN" },
                ]).map((option) => {
                  const isSelected = locale === option.code;
                  return (
                    <Pressable
                      key={option.code}
                      accessibilityLabel={t(
                        option.code === "nl"
                          ? "settings.language.dutch"
                          : "settings.language.english",
                      )}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => void setLocale(option.code)}
                      style={({ pressed }) => [
                        styles.languageButton,
                        { borderColor: theme.sideMenuControlBorder },
                        isSelected && {
                          backgroundColor: theme.sideMenuSelected,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.languageFlag}>{option.flag}</Text>
                      <Text
                        style={[
                          styles.languageCode,
                          isSelected && { color: theme.sideMenuSelectedText },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </>
  );
}

function AnimatedMenuIcon({
  color,
  progress,
}: {
  color: string;
  progress: Animated.Value;
}) {
  const topRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });
  const bottomRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-45deg"],
  });
  const topOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-7, 0],
  });
  const bottomOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [7, 0],
  });

  return (
    <View pointerEvents="none" style={styles.animatedMenuIcon}>
      <Animated.View
        style={[
          styles.menuIconLine,
          {
            backgroundColor: color,
            transform: [{ translateY: topOffset }, { rotate: topRotation }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.menuIconLine,
          { backgroundColor: color, opacity: Animated.subtract(1, progress) },
        ]}
      />
      <Animated.View
        style={[
          styles.menuIconLine,
          {
            backgroundColor: color,
            transform: [
              { translateY: bottomOffset },
              { rotate: bottomRotation },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderBottomWidth: 2,
    elevation: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 300,
    paddingHorizontal: Spacing.three,
  },
  logo: {
    height: 54,
    width: 270,
  },
  menuButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  animatedMenuIcon: {
    alignItems: "center",
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  menuIconLine: {
    borderRadius: 2,
    height: 2,
    position: "absolute",
    width: 24,
  },
  pressed: {
    opacity: 0.65,
  },
  menuOverlay: {
    bottom: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    elevation: 10,
    zIndex: 200,
  },
  menuBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  menuPanel: {
    gap: Spacing.four,
    height: "100%",
    maxWidth: 340,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    justifyContent: "space-between",
    width: "82%",
  },
  menuTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  menuList: {
    gap: Spacing.two,
  },
  menuItem: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  menuItemText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  languageSection: {
    borderTopColor: "rgba(255, 255, 255, 0.16)",
    borderTopWidth: 1,
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  languageTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
  },
  languageButtons: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  languageButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 46,
  },
  languageFlag: {
    fontSize: 21,
  },
  languageCode: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
