import { Image } from "expo-image";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useState } from "react";
import { Modal, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type TutorialSlide = {
  eyebrow: string;
  title: string;
  description: string;
  icon: SymbolViewProps["name"];
};

const tutorialSlides: TutorialSlide[] = [
  {
    eyebrow: "Players",
    title: "Welcome to Assistant Coach",
    description:
      "Build your squad with positions, kit numbers and player details. Their statistics will grow as you use the app.",
    icon: { ios: "person.3.fill", android: "groups", web: "groups" },
  },
  {
    eyebrow: "Training",
    title: "Keep attendance effortless",
    description:
      "Schedule training sessions, record who attended and follow participation throughout the season.",
    icon: { ios: "calendar", android: "event", web: "event" },
  },
  {
    eyebrow: "Match Day",
    title: "Prepare every match",
    description:
      "Set availability, build your lineup and record the result, minutes, goals, assists, cards and ratings.",
    icon: {
      ios: "sportscourt.fill",
      android: "sports_soccer",
      web: "sports_soccer",
    },
  },
  {
    eyebrow: "Share",
    title: "Turn lineups into images",
    description:
      "Create polished lineup and result images to share with players, supporters and your club community.",
    icon: {
      ios: "square.and.arrow.up",
      android: "share",
      web: "share",
    },
  },
  {
    eyebrow: "Your data",
    title: "Your data stays with you",
    description:
      "We do not store your coaching data. It is kept locally on your phone, so uninstalling the app can permanently remove it. Before switching phones, export a backup from Settings and save it somewhere safe.",
    icon: {
      ios: "lock.iphone",
      android: "phonelink_lock",
      web: "phonelink_lock",
    },
  },
  {
    eyebrow: "Settings",
    title: "Make it your team",
    description:
      "Choose your kit, match duration and preferences. You can also export a complete data backup whenever needed.",
    icon: { ios: "gearshape.fill", android: "settings", web: "settings" },
  },
];

export function OnboardingTutorial({
  onFinish,
  visible,
}: {
  onFinish: () => Promise<void> | void;
  visible: boolean;
}) {
  const theme = useTheme();
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const slide = tutorialSlides[slideIndex];
  const isLastSlide = slideIndex === tutorialSlides.length - 1;

  async function finishTutorial() {
    if (isFinishing) {
      return;
    }

    setIsFinishing(true);
    try {
      await onFinish();
      setSlideIndex(0);
    } finally {
      setIsFinishing(false);
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => void finishTutorial()}
      transparent
      visible={visible}
    >
      <ThemedView style={styles.overlay}>
        <ThemedView type="modalBackground" style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip tutorial"
            disabled={isFinishing}
            onPress={() => void finishTutorial()}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              tintColor={theme.textSecondary}
              size={18}
            />
          </Pressable>

          <ThemedView
            type="backgroundSelected"
            style={[
              styles.visualPlaceholder,
              slideIndex === 0 && styles.welcomeVisual,
            ]}
          >
            {slideIndex === 0 ? (
              <Image
                accessibilityLabel="Assistant Coach"
                contentFit="cover"
                source={require("@/assets/images/assistant-coach-splash.png")}
                style={styles.welcomeLogo}
              />
            ) : (
              <SymbolView name={slide.icon} tintColor="#1C7C54" size={72} />
            )}
          </ThemedView>

          <ThemedView style={styles.copy}>
            <ThemedText type="smallBold" style={styles.eyebrow}>
              {slide.eyebrow}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.title}>
              {slide.title}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              {slide.description}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.progress}>
            {tutorialSlides.map((item, index) => (
              <ThemedView
                key={item.eyebrow}
                style={[
                  styles.progressDot,
                  index === slideIndex && styles.progressDotSelected,
                ]}
              />
            ))}
          </ThemedView>

          <ThemedView style={styles.actions}>
            {slideIndex > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSlideIndex((current) => current - 1)}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.backButtonText}>
                  Back
                </ThemedText>
              </Pressable>
            ) : (
              <ThemedView style={styles.actionSpacer} />
            )}

            <Pressable
              accessibilityRole="button"
              disabled={isFinishing}
              onPress={() =>
                isLastSlide
                  ? void finishTutorial()
                  : setSlideIndex((current) => current + 1)
              }
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.pressed,
                isFinishing && styles.disabled,
              ]}
            >
              <ThemedText type="smallBold" style={styles.nextButtonText}>
                {isLastSlide ? "Set up your team" : "Next"}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.three,
  },
  card: {
    borderRadius: Spacing.four,
    gap: Spacing.three,
    maxWidth: 520,
    padding: Spacing.three,
    position: "relative",
    width: "100%",
  },
  closeButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: Spacing.two,
    top: Spacing.two,
    width: 32,
    zIndex: 2,
  },
  visualPlaceholder: {
    alignItems: "center",
    aspectRatio: 16 / 9,
    borderRadius: Spacing.three,
    justifyContent: "center",
    marginTop: Spacing.two,
    overflow: "hidden",
    width: "100%",
  },
  welcomeLogo: {
    height: "100%",
    width: "100%",
  },
  welcomeVisual: {
    backgroundColor: "transparent",
  },
  copy: {
    gap: Spacing.one,
  },
  eyebrow: {
    color: "#1C7C54",
    textTransform: "uppercase",
  },
  title: {
    lineHeight: 38,
  },
  description: {
    lineHeight: 23,
  },
  progress: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
  },
  progressDot: {
    backgroundColor: "#6B7280",
    borderRadius: 999,
    height: 7,
    opacity: 0.45,
    width: 7,
  },
  progressDotSelected: {
    backgroundColor: "#1C7C54",
    opacity: 1,
    width: 22,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  actionSpacer: {
    flex: 1,
  },
  backButton: {
    alignItems: "center",
    borderColor: "#6B7280",
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  backButtonText: {
    color: "#6B7280",
  },
  nextButton: {
    alignItems: "center",
    backgroundColor: "#1C7C54",
    borderRadius: Spacing.two,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.two,
  },
  nextButtonText: {
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.55,
  },
});
