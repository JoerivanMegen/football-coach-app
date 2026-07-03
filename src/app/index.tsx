import { useRouter, type Href } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Platform, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, PageTopPadding, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type HomeAction = {
  title: string;
  description: string;
  iconName: SymbolViewProps["name"];
  href: Href;
};

const homeActions = [
  {
    title: "Players",
    description: "Manage your squad, positions, and player details.",
    iconName: { ios: "person.3.fill", android: "groups", web: "groups" },
    href: "/players",
  },
  {
    title: "Player Stats",
    description: "Review goals, assists, attendance, and progress.",
    iconName: {
      ios: "chart.bar.xaxis",
      android: "bar_chart",
      web: "bar_chart",
    },
    href: "/players",
  },
  {
    title: "Events",
    description: "Plan training sessions, friendlies, and team activities.",
    iconName: {
      ios: "calendar",
      android: "calendar_month",
      web: "calendar_month",
    },
    href: "/events",
  },
  {
    title: "Match Day",
    description: "Prepare lineups, record match events, and capture notes.",
    iconName: {
      ios: "sportscourt.fill",
      android: "sports_soccer",
      web: "sports_soccer",
    },
    href: "/match-day",
  },
] satisfies HomeAction[];

export default function HomeScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
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

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Team dashboard
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.intro}>
            Start with the core coaching workflows. Each section can grow into
            its own feature module when you add SQLite data.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.actionsGrid}>
          {homeActions.map((action) => (
            <Pressable
              key={action.title}
              accessibilityRole="button"
              accessibilityLabel={action.title}
              onPress={() => router.push(action.href)}
              style={({ pressed }) => [
                styles.actionPressable,
                pressed && styles.pressed,
              ]}
            >
              <ThemedView type="backgroundElement" style={styles.actionCard}>
                <ThemedView
                  type="backgroundSelected"
                  style={styles.iconContainer}
                >
                  <SymbolView
                    name={action.iconName}
                    tintColor={theme.text}
                    size={24}
                  />
                </ThemedView>
                <ThemedView
                  type="backgroundElement"
                  style={styles.actionContent}
                >
                  <ThemedText type="default">{action.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {action.description}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            </Pressable>
          ))}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
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
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: PageTopPadding,
  },
  header: {
    gap: Spacing.two,
  },
  eyebrow: {
    textTransform: "uppercase",
  },
  title: {
    lineHeight: 38,
  },
  intro: {
    maxWidth: 560,
  },
  actionsGrid: {
    gap: Spacing.three,
  },
  actionPressable: {
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  actionCard: {
    alignItems: "center",
    borderRadius: Spacing.three,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 104,
    padding: Spacing.three,
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: Spacing.three,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  actionContent: {
    flex: 1,
    gap: Spacing.one,
  },
});
