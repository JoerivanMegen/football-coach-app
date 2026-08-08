import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppHeaderHeight, BottomTabInset, MaxContentWidth, PageTopPadding, Spacing } from "@/constants/theme";
import {
  endActiveSeasonAsync,
  getActiveSeasonAsync,
  getSeasonCompletionStatusAsync,
  listEndedSeasonsAsync,
} from "@/features/seasons/season-repository";
import type { Season } from "@/features/seasons/season-types";
import { useTheme } from "@/hooks/use-theme";
import { useScrollToTopOnFocus } from "@/hooks/use-scroll-to-top-on-focus";
import { useI18n } from "@/i18n/i18n-provider";

export default function SeasonsScreen() {
  const scrollViewRef = useScrollToTopOnFocus();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const safeAreaInsets = useSafeAreaInsets();
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [endedSeasons, setEndedSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEndingSeason, setIsEndingSeason] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      let isFocused = true;

      Promise.all([getActiveSeasonAsync(), listEndedSeasonsAsync()])
        .then(([current, history]) => {
          if (!isFocused) return;
          setActiveSeason(current);
          setEndedSeasons(history);
        })
        .catch((error: unknown) => {
          console.warn("Failed to load seasons", error);
        })
        .finally(() => {
          if (isFocused) setIsLoading(false);
        });

      return () => {
        isFocused = false;
      };
    }, []),
  );

  function openSummary(season: Season) {
    router.push({
      pathname: "/season-summary",
      params: { seasonId: String(season.id) },
    });
  }

  async function confirmEndSeason() {
    if (!activeSeason || isEndingSeason) return;

    try {
      const status = await getSeasonCompletionStatusAsync(activeSeason.id);
      const unfinished: string[] = [];
      if (status.matchesWithoutResults) {
        unfinished.push(`${status.matchesWithoutResults} match result${status.matchesWithoutResults === 1 ? "" : "s"}`);
      }
      if (status.trainingsWithoutAttendance) {
        unfinished.push(`${status.trainingsWithoutAttendance} training attendance record${status.trainingsWithoutAttendance === 1 ? "" : "s"}`);
      }
      const warning = unfinished.length
        ? `There are still ${unfinished.join(" and ")} unfinished. They will be archived as they are.\n\n`
        : "";

      Alert.alert(
        `End season ${activeSeason.name}?`,
        `${warning}This creates a permanent season summary and starts a new season. Your players and settings will carry over.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "End season", style: "destructive", onPress: () => void handleEndSeason() },
        ],
      );
    } catch (error) {
      console.warn("Failed to check season", error);
      Alert.alert(t("seasons.errors.load.title"), t("seasons.errors.load.message"));
    }
  }

  async function handleEndSeason() {
    setIsEndingSeason(true);
    try {
      const endedSeason = await endActiveSeasonAsync();
      const [nextSeason, history] = await Promise.all([
        getActiveSeasonAsync(),
        listEndedSeasonsAsync(),
      ]);
      setActiveSeason(nextSeason);
      setEndedSeasons(history);
      openSummary(endedSeason);
    } catch (error) {
      console.warn("Failed to end season", error);
      Alert.alert(t("seasons.errors.not_ended.title"), t("seasons.errors.not_ended.message"));
    } finally {
      setIsEndingSeason(false);
    }
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={{ backgroundColor: theme.background }}
      contentInset={insets}
      contentContainerStyle={[styles.screen, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>
        <View style={styles.heading}>
          <ThemedText type="subtitle">{t("seasons.overview.title")}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t("seasons.overview.subtitle")}
          </ThemedText>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#1C7C54" />
        ) : (
          <>
            {activeSeason ? (
              <ThemedView type="backgroundElement" style={styles.currentCard}>
                <View style={styles.cardTitleRow}>
                  <SymbolView
                    name={{ ios: "calendar", android: "event", web: "event" }}
                    size={22}
                    tintColor="#1C7C54"
                  />
                  <View style={styles.cardText}>
                    <ThemedText type="smallBold">{t("seasons.overview.current.title")}</ThemedText>
                    <ThemedText type="default">{activeSeason.name}</ThemedText>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openSummary(activeSeason)}
                  style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                >
                  <ThemedText type="smallBold" style={styles.greenText}>
                    {t("seasons.overview.current.view_statistics")}
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : null}

            <View style={styles.historyHeading}>
              <ThemedText type="default">{t("seasons.overview.history.title")}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {endedSeasons.length} completed {endedSeasons.length === 1 ? "season" : "seasons"}
              </ThemedText>
            </View>

            {endedSeasons.length ? (
              endedSeasons.map((season) => (
                <Pressable
                  key={season.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${season.name} season summary`}
                  onPress={() => openSummary(season)}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <ThemedView type="backgroundElement" style={styles.seasonCard}>
                    <View style={styles.cardText}>
                      <ThemedText type="default">{season.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatDate(season.startDate)} – {season.endDate ? formatDate(season.endDate) : ""}
                      </ThemedText>
                    </View>
                    <ThemedText type="smallBold" style={styles.greenText}>
                      {t("seasons.overview.history.view_summary")}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))
            ) : (
              <ThemedView type="backgroundElement" style={styles.emptyCard}>
                <ThemedText type="smallBold">{t("seasons.overview.history.empty.title")}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t("seasons.overview.history.empty.description")}
                </ThemedText>
              </ThemedView>
            )}

            <ThemedView type="backgroundElement" style={styles.endSeasonCard}>
              <ThemedText type="default">{t("seasons.overview.end_season.title")}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t("seasons.overview.end_season.description", { season: activeSeason?.name ?? "" })}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("seasons.overview.end_season.action")}
                disabled={!activeSeason || isEndingSeason}
                onPress={() => void confirmEndSeason()}
                style={({ pressed }) => [
                  styles.endSeasonButton,
                  pressed && styles.pressed,
                  isEndingSeason && styles.disabled,
                ]}
              >
                <ThemedText type="smallBold" style={styles.dangerText}>
                  {isEndingSeason ? t("common.loading") : t("seasons.overview.end_season.action")}
                </ThemedText>
              </Pressable>
            </ThemedView>
          </>
        )}
      </ThemedView>
    </ScrollView>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}-${month}-${year}` : value;
}

const styles = StyleSheet.create({
  screen: { alignItems: "center", paddingHorizontal: Spacing.four },
  container: {
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    paddingTop:
      Platform.select({
        web: AppHeaderHeight + PageTopPadding,
        default: AppHeaderHeight + Spacing.two,
      }) ?? AppHeaderHeight + Spacing.two,
    width: "100%",
  },
  heading: { gap: Spacing.one },
  currentCard: { borderColor: "#1C7C54", borderRadius: Spacing.three, borderWidth: 1, gap: Spacing.three, padding: Spacing.three },
  cardTitleRow: { alignItems: "center", flexDirection: "row", gap: Spacing.three },
  cardText: { flex: 1, gap: Spacing.one },
  outlineButton: { alignItems: "center", borderColor: "#1C7C54", borderRadius: Spacing.two, borderWidth: 1, justifyContent: "center", minHeight: 44 },
  greenText: { color: "#1C7C54" },
  historyHeading: { gap: Spacing.one, marginTop: Spacing.one },
  seasonCard: { alignItems: "center", borderRadius: Spacing.three, flexDirection: "row", gap: Spacing.three, minHeight: 78, padding: Spacing.three },
  emptyCard: { borderRadius: Spacing.three, gap: Spacing.one, padding: Spacing.three },
  endSeasonCard: { borderRadius: Spacing.three, gap: Spacing.two, marginTop: Spacing.three, padding: Spacing.three },
  endSeasonButton: { alignItems: "center", borderColor: "#DC2626", borderRadius: Spacing.two, borderWidth: 1, justifyContent: "center", minHeight: 48, width: "100%" },
  dangerText: { color: "#DC2626" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.65 },
});
