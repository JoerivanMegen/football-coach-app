import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { AppLocale } from "@/i18n/locales";
import { useI18n } from "@/i18n/i18n-provider";

export function LanguageSelectionModal({
  onSelect,
  visible,
}: {
  onSelect: (locale: AppLocale) => Promise<void> | void;
  visible: boolean;
}) {
  const { t } = useI18n();
  const [isSelecting, setIsSelecting] = useState(false);

  async function selectLanguage(locale: AppLocale) {
    if (isSelecting) return;
    setIsSelecting(true);
    try {
      await onSelect(locale);
    } finally {
      setIsSelecting(false);
    }
  }

  return (
    <Modal animationType="fade" visible={visible}>
      <ThemedView type="modalBackground" style={styles.screen}>
        <ThemedView style={styles.content}>
          <ThemedText style={styles.heading}>
            {t("onboarding.language_selection.heading_english")}
          </ThemedText>

          <ThemedView style={styles.languageRow}>
            <LanguageButton
              accessibilityLabel={t(
                "onboarding.language_selection.dutch_name",
              )}
              flag={t("onboarding.language_selection.dutch_flag")}
              label={t("onboarding.language_selection.dutch_code")}
              disabled={isSelecting}
              onPress={() => void selectLanguage("nl")}
            />
            <LanguageButton
              accessibilityLabel={t(
                "onboarding.language_selection.english_name",
              )}
              flag={t("onboarding.language_selection.english_flag")}
              label={t("onboarding.language_selection.english_code")}
              filled
              disabled={isSelecting}
              onPress={() => void selectLanguage("en")}
            />
          </ThemedView>

          <ThemedText style={styles.heading}>
            {t("onboarding.language_selection.heading_dutch")}
          </ThemedText>

          <Image
            accessibilityLabel={t("onboarding.language_selection.logo_label")}
            contentFit="contain"
            source={require("@/assets/images/assistant-coach-app-icon-1024.png")}
            style={styles.logo}
          />
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

function LanguageButton({
  accessibilityLabel,
  disabled,
  filled = false,
  flag,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  disabled: boolean;
  filled?: boolean;
  flag: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.languageButton,
        filled && styles.languageButtonFilled,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedText style={styles.flag}>{flag}</ThemedText>
      <ThemedText
        style={[styles.languageLabel, filled && styles.languageLabelFilled]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.four,
  },
  content: {
    alignItems: "center",
    gap: Spacing.four,
    maxWidth: 520,
    width: "100%",
  },
  heading: {
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 58,
    textAlign: "center",
  },
  languageRow: {
    flexDirection: "row",
    gap: Spacing.two,
    width: "100%",
  },
  languageButton: {
    alignItems: "center",
    borderColor: "#1C7C54",
    borderRadius: Spacing.two,
    borderWidth: 2,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 72,
    paddingHorizontal: Spacing.two,
  },
  languageButtonFilled: {
    backgroundColor: "#1C7C54",
  },
  flag: {
    fontSize: 24,
    lineHeight: 30,
  },
  languageLabel: {
    color: "#1C7C54",
    fontSize: 22,
    fontWeight: "700",
  },
  languageLabelFilled: {
    color: "#FFFFFF",
  },
  logo: {
    height: 220,
    marginTop: Spacing.two,
    width: 280,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
});
