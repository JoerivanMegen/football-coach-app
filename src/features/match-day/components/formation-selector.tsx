import { useState } from "react";
import { Pressable } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { matchDayStyles as styles } from "@/features/match-day/components/match-day-styles";
import { matchFormationOptions } from "@/features/match-day/match-day-config";
import type { MatchFormation } from "@/features/match-day/match-day-view-types";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

export function FormationSelector({ onChange, value }: { onChange: (formation: MatchFormation) => void; value: MatchFormation }) {
  const theme = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const label = matchFormationOptions.find((option) => option.value === value)?.label ?? value;
  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">{t("matchday.add_match.lineup.formation")}</ThemedText>
      <ThemedView style={styles.formationPicker}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("matchday.add_match.lineup.select_formation")} accessibilityState={{ expanded: open }} onPress={() => setOpen((current) => !current)} style={({ pressed }) => [styles.dropdownButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <SymbolView name={{ ios: "chevron.down", android: "keyboard_arrow_down", web: "keyboard_arrow_down" }} tintColor={theme.text} size={20} />
        </Pressable>
        {open ? <ThemedView type="backgroundElement" style={styles.dropdownMenu}>{matchFormationOptions.map((option) => { const selected = value === option.value; return <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { onChange(option.value); setOpen(false); }} style={({ pressed }) => [styles.dropdownOption, selected && styles.dropdownOptionSelected, pressed && styles.pressed]}><ThemedText type="smallBold" style={selected && styles.dropdownOptionTextSelected}>{option.label}</ThemedText></Pressable>; })}</ThemedView> : null}
      </ThemedView>
    </ThemedView>
  );
}
