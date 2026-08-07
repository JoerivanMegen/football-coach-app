import { Image } from "expo-image";
import { type Href, usePathname, useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useState } from "react";
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

type MenuItem = {
  href: Href;
  icon: SymbolViewProps["name"];
  label: string;
};

const menuItems: MenuItem[] = [
  {
    href: "/",
    icon: { ios: "house.fill", android: "home", web: "home" },
    label: "Home",
  },
  {
    href: "/players",
    icon: { ios: "person.3.fill", android: "groups", web: "groups" },
    label: "Players",
  },
  {
    href: "/events",
    icon: { ios: "calendar", android: "event", web: "event" },
    label: "Training",
  },
  {
    href: "/match-day",
    icon: {
      ios: "sportscourt.fill",
      android: "sports_soccer",
      web: "sports_soccer",
    },
    label: "Match Day",
  },
  {
    href: "/seasons",
    icon: { ios: "calendar.badge.clock", android: "history", web: "history" },
    label: "Seasons",
  },
  {
    href: "/settings",
    icon: { ios: "gearshape.fill", android: "settings", web: "settings" },
    label: "Settings",
  },
];

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuProgress] = useState(() => new Animated.Value(0));

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
          { height: insets.top + AppHeaderHeight, paddingTop: insets.top },
        ]}
      >
        <Image
          accessibilityLabel="Assistant Coach"
          contentFit="contain"
          contentPosition="left center"
          source={require("@/assets/images/assistant-coach-navbar.png")}
          style={styles.logo}
        />
        <Pressable
          accessibilityLabel={
            isMenuVisible ? "Close navigation menu" : "Open navigation menu"
          }
          accessibilityRole="button"
          accessibilityState={{ expanded: isMenuVisible }}
          onPress={isMenuVisible ? () => closeMenu() : openMenu}
          style={({ pressed }) => [
            styles.menuButton,
            pressed && styles.pressed,
          ]}
        >
          <AnimatedMenuIcon progress={menuProgress} />
        </Pressable>
      </View>

      {isMenuVisible ? (
        <View style={styles.menuOverlay}>
          <Animated.View
            style={[styles.menuBackdrop, { opacity: menuProgress }]}
          >
            <Pressable
              accessibilityLabel="Close navigation menu"
              onPress={() => closeMenu()}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.menuPanel,
              {
                paddingTop: insets.top + AppHeaderHeight + Spacing.three,
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
              {menuItems.map((item) => {
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
                      isSelected && styles.menuItemSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={item.icon}
                      tintColor="#FFFFFF"
                      size={20}
                    />
                    <Text style={styles.menuItemText}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </View>
      ) : null}
    </>
  );
}

function AnimatedMenuIcon({ progress }: { progress: Animated.Value }) {
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
          { transform: [{ translateY: topOffset }, { rotate: topRotation }] },
        ]}
      />
      <Animated.View
        style={[
          styles.menuIconLine,
          { opacity: Animated.subtract(1, progress) },
        ]}
      />
      <Animated.View
        style={[
          styles.menuIconLine,
          {
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
    backgroundColor: "#1b1b1b",
    borderBottomColor: "#1C7C54",
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
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#1b1b1b",
    gap: Spacing.four,
    height: "100%",
    maxWidth: 340,
    paddingHorizontal: Spacing.three,
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
  menuItemSelected: {
    backgroundColor: "#1C7C54",
  },
  menuItemText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
