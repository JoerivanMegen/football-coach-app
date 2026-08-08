import type { ComponentProps, ReactNode } from "react";
import { Pressable } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ActionColors } from "@/constants/theme";
import { matchDayStyles as styles } from "@/features/match-day/components/match-day-styles";
import type { MatchDayMatch } from "@/features/match-day/match-day-types";
import { formatIsoDateForDisplay, getMatchCategoryIcon, getMatchLocationLabel, hasMatchResult, isMatchResultActionDue } from "@/features/match-day/match-day-utils";
import { useI18n } from "@/i18n/i18n-provider";

export function MatchOverviewCard({ children, isExpanded, match, onDelete, onEdit, onEditResult, onShare, onToggle, teamName }: {
  children: ReactNode; isExpanded: boolean; match: MatchDayMatch;
  onDelete: () => void; onEdit: () => void; onEditResult: () => void;
  onShare: () => void; onToggle: () => void; teamName: string;
}) {
  const { t } = useI18n();
  const hasResult = hasMatchResult(match);
  const score = `${teamName} ${match.ownScore} - ${match.opponentScore} ${match.opponent}`;
  return (
    <ThemedView type="backgroundElement" style={styles.matchCard}>
      {isMatchResultActionDue(match) ? <ThemedView style={styles.matchActionDueDot} /> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: isExpanded }} onPress={onToggle} style={({ pressed }) => [styles.matchCardHeader, pressed && styles.pressed]}>
        <ThemedView type="backgroundElement" style={styles.matchCardTitleGroup}>
          <ThemedView type="backgroundElement" style={styles.matchTitleRow}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.matchTitleText}>{match.opponent}</ThemedText>
            <SymbolView name={getMatchCategoryIcon(match.category)} size={16} />
          </ThemedView>
          <ThemedText type="code" themeColor="textSecondary">{formatIsoDateForDisplay(match.matchDate)} at {match.startTime}</ThemedText>
          {hasResult ? <ThemedText type="smallBold">{score}</ThemedText> : null}
        </ThemedView>
        <ThemedView type="backgroundElement" style={styles.matchCardMetaGroup}>
          <ThemedText type="code" themeColor="textSecondary">{getMatchLocationLabel(match.location)}</ThemedText>
          <SymbolView name={{ ios: isExpanded ? "chevron.up" : "chevron.down", android: isExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down", web: isExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down" }} size={18} />
        </ThemedView>
      </Pressable>

      {isExpanded ? (
        <ThemedView type="backgroundElement" style={styles.matchCardDetails}>
          {children}
          {hasResult ? (
            <ThemedView type="backgroundElement" style={styles.matchResultPanel}>
              <ThemedText type="default">{t("matchday.overview.result.title")}</ThemedText>
              <ThemedText type="subtitle" style={styles.matchResultScore}>{score}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{t("matchday.overview.result.stats_logged", { count: Object.keys(match.playerResultStats).length })}</ThemedText>
              {match.resultNotes.trim() ? <ThemedText type="small" themeColor="textSecondary">{match.resultNotes.trim()}</ThemedText> : null}
            </ThemedView>
          ) : null}
          <ThemedView type="backgroundElement" style={styles.matchCardActions}>
            <CardAction label={t("matchday.overview.actions.share")} color={ActionColors.primary} filled icon={{ ios: "square.and.arrow.up", android: "share", web: "share" }} onPress={onShare} buttonStyle={styles.shareMatchButton} textStyle={styles.shareMatchButtonText} />
            <CardAction label={t(hasResult ? "matchday.overview.actions.edit_result" : "matchday.overview.actions.add_result")} color={ActionColors.onAccent} filled icon={{ ios: "number", android: "scoreboard", web: "scoreboard" }} onPress={onEditResult} buttonStyle={styles.resultMatchButton} textStyle={styles.resultMatchButtonText} />
            <CardAction label={t("matchday.overview.actions.edit")} color={ActionColors.warning} icon={{ ios: "pencil", android: "edit", web: "edit" }} onPress={onEdit} buttonStyle={styles.editMatchButton} textStyle={styles.editMatchButtonText} />
            <CardAction label={t("matchday.overview.actions.delete")} color={ActionColors.danger} icon={{ ios: "trash", android: "delete", web: "delete" }} onPress={onDelete} buttonStyle={styles.deleteMatchButton} textStyle={styles.deleteMatchButtonText} />
          </ThemedView>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

function CardAction({
  buttonStyle,
  color,
  filled = false,
  icon,
  label,
  onPress,
  textStyle,
}: {
  buttonStyle: object;
  color: string;
  filled?: boolean;
  icon: ComponentProps<typeof SymbolView>["name"];
  label: string;
  onPress: () => void;
  textStyle: object;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [buttonStyle, pressed && styles.pressed]}
    >
      <SymbolView
        name={icon}
        tintColor={filled ? ActionColors.onAccent : color}
        size={16}
      />
      <ThemedText type="smallBold" style={textStyle}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
