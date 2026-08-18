import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { LanguageSelectionModal } from "@/components/language-selection-modal";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ActionColors, Spacing } from "@/constants/theme";
import {
  hasCompletedOnboardingAsync,
  hasSelectedAppLocaleAsync,
  setOnboardingCompletedAsync,
  subscribeToAppPreferencesChanges,
} from "@/features/settings/app-preferences-repository";
import { useI18n } from "@/i18n/i18n-provider";

type StartupStage = "loading" | "language" | "tutorial" | "complete" | "error";

export function AppStartupGate({ children }: { children: ReactNode }) {
  const { setLocale, t } = useI18n();
  const [stage, setStage] = useState<StartupStage>("loading");

  const resolveStartupStage = useCallback(async (): Promise<StartupStage> => {
    try {
      const [hasCompletedOnboarding, hasSelectedLanguage] = await Promise.all([
        hasCompletedOnboardingAsync(),
        hasSelectedAppLocaleAsync(),
      ]);

      if (hasCompletedOnboarding) {
        return "complete";
      } else if (hasSelectedLanguage) {
        return "tutorial";
      }

      return "language";
    } catch (error) {
      console.warn("Failed to load startup state", error);
      return "error";
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const refreshStage = () => {
      void resolveStartupStage().then((nextStage) => {
        if (isMounted) {
          setStage(nextStage);
        }
      });
    };

    refreshStage();
    const unsubscribe = subscribeToAppPreferencesChanges(refreshStage);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [resolveStartupStage]);

  if (stage === "complete") {
    return children;
  }

  return (
    <ThemedView type="modalBackground" style={styles.screen}>
      {stage === "loading" ? (
        <ActivityIndicator color={ActionColors.primary} size="large" />
      ) : null}
      {stage === "error" ? (
        <ThemedView type="modalBackground" style={styles.errorContent}>
          <ThemedText type="subtitle">{t("common.errors.generic_title")}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.errorMessage}>
            {t("common.errors.generic_message")}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setStage("loading");
              void resolveStartupStage().then(setStage);
            }}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" style={styles.retryButtonText}>
              {t("common.actions.retry")}
            </ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}
      <LanguageSelectionModal
        visible={stage === "language"}
        onSelect={async (locale) => {
          await setLocale(locale);
          setStage("tutorial");
        }}
      />
      <OnboardingTutorial
        visible={stage === "tutorial"}
        onFinish={() => setOnboardingCompletedAsync(true)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  errorContent: {
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.four,
  },
  errorMessage: {
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: ActionColors.primary,
    borderRadius: Spacing.two,
    justifyContent: "center",
    marginTop: Spacing.two,
    minHeight: 46,
    paddingHorizontal: Spacing.four,
  },
  retryButtonText: {
    color: ActionColors.onAccent,
  },
  pressed: {
    opacity: 0.7,
  },
});
