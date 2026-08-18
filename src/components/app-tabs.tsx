import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { type ComponentProps } from "react";
import { StyleSheet, useColorScheme, type ColorValue } from "react-native";

import { ActionColors, AppHeaderHeight, Colors } from "@/constants/theme";
import { useI18n } from "@/i18n/i18n-provider";

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export default function AppTabs() {
  const { t } = useI18n();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background,
          paddingTop: AppHeaderHeight,
        },
        tabBarActiveTintColor: ActionColors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: styles.label,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.backgroundElement,
          },
        ],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("navigation.home"),
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              color={color}
              name={focused ? "home" : "home-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: t("navigation.players"),
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              color={color}
              name={focused ? "account-group" : "account-group-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t("navigation.training"),
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="traffic-cone" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="match-day"
        options={{
          title: t("navigation.matchDay"),
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="soccer-field" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  color,
  name,
  size,
}: {
  color: ColorValue;
  name: MaterialIconName;
  size: number;
}) {
  return <MaterialCommunityIcons color={color} name={name} size={size} />;
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
    textAlign: "center",
  },
});
