import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { matchDayStyles as styles } from "@/features/match-day/components/match-day-styles";
import type { MatchDayMatch } from "@/features/match-day/match-day-types";
import { hasMatchResult } from "@/features/match-day/match-day-utils";
import { useI18n } from "@/i18n/i18n-provider";

export function MatchOverviewList({ matches, renderMatchCard }: {
  matches: MatchDayMatch[];
  renderMatchCard: (match: MatchDayMatch) => ReactNode;
}) {
  const { t } = useI18n();
  const [isUnfinishedSectionOpen, setIsUnfinishedSectionOpen] = useState(true);

  if (matches.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.emptyMatchPanel}>
        <ThemedText type="smallBold">{t("matchday.overview.empty.title")}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{t("matchday.overview.empty.description")}</ThemedText>
      </ThemedView>
    );
  }

  const unfinishedMatches = matches.filter((match) => !hasMatchResult(match));
  const completedMatches = matches.filter(hasMatchResult);

  return (
    <ThemedView style={styles.matchCardList}>
      {unfinishedMatches.length > 0 ? (
        <ThemedView style={styles.matchSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isUnfinishedSectionOpen }}
            onPress={() => setIsUnfinishedSectionOpen((open) => !open)}
            style={({ pressed }) => [styles.matchSectionHeader, pressed && styles.pressed]}
          >
            <ThemedText type="smallBold" themeColor="textSecondary">{t("matchday.overview.sections.unfinished")}</ThemedText>
            <SymbolView
              name={{
                ios: isUnfinishedSectionOpen ? "chevron.up" : "chevron.down",
                android: isUnfinishedSectionOpen ? "keyboard_arrow_up" : "keyboard_arrow_down",
                web: isUnfinishedSectionOpen ? "keyboard_arrow_up" : "keyboard_arrow_down",
              }}
              size={18}
            />
          </Pressable>
          {isUnfinishedSectionOpen ? <ThemedView style={styles.matchSectionList}>{unfinishedMatches.map(renderMatchCard)}</ThemedView> : null}
        </ThemedView>
      ) : null}

      {completedMatches.length > 0 ? (
        <ThemedView style={styles.matchSectionList}>
          {unfinishedMatches.length > 0 ? <ThemedText type="smallBold" themeColor="textSecondary">{t("matchday.overview.sections.completed")}</ThemedText> : null}
          {completedMatches.map(renderMatchCard)}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}
