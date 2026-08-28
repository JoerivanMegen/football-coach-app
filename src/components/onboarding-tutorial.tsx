import { Image } from "expo-image";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ActionColors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";
import type { TranslationKey } from "@/i18n/generated/translations";

type TutorialSlide = {
  eyebrowKey: TranslationKey;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: SymbolViewProps["name"];
};

const tutorialSlides: TutorialSlide[] = [
  {
    eyebrowKey: "onboarding.slides.welcome.eyebrow",
    titleKey: "onboarding.slides.welcome.title",
    descriptionKey: "onboarding.slides.welcome.description",
    icon: { ios: "person.3.fill", android: "groups", web: "groups" },
  },
  {
    eyebrowKey: "onboarding.slides.training.eyebrow",
    titleKey: "onboarding.slides.training.title",
    descriptionKey: "onboarding.slides.training.description",
    icon: { ios: "calendar", android: "event", web: "event" },
  },
  {
    eyebrowKey: "onboarding.slides.matchday.eyebrow",
    titleKey: "onboarding.slides.matchday.title",
    descriptionKey: "onboarding.slides.matchday.description",
    icon: {
      ios: "sportscourt.fill",
      android: "sports_soccer",
      web: "sports_soccer",
    },
  },
  {
    eyebrowKey: "onboarding.slides.sharing.eyebrow",
    titleKey: "onboarding.slides.sharing.title",
    descriptionKey: "onboarding.slides.sharing.description",
    icon: {
      ios: "square.and.arrow.up",
      android: "share",
      web: "share",
    },
  },
  {
    eyebrowKey: "onboarding.slides.privacy.eyebrow",
    titleKey: "onboarding.slides.privacy.title",
    descriptionKey: "onboarding.slides.privacy.description",
    icon: {
      ios: "lock.iphone",
      android: "phonelink_lock",
      web: "phonelink_lock",
    },
  },
  {
    eyebrowKey: "onboarding.slides.settings.eyebrow",
    titleKey: "onboarding.slides.settings.title",
    descriptionKey: "onboarding.slides.settings.description",
    icon: { ios: "gearshape.fill", android: "settings", web: "settings" },
  },
];

export function OnboardingTutorial({
  finalActionLabelKey = "onboarding.actions.finish",
  onFinish,
  visible,
}: {
  finalActionLabelKey?: TranslationKey;
  onFinish: () => Promise<void> | void;
  visible: boolean;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [slideTranslateX] = useState(() => new Animated.Value(0));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const slide = tutorialSlides[slideIndex];
  const isLastSlide = slideIndex === tutorialSlides.length - 1;
  const transitionDistance = Math.min(windowWidth, 520);

  const returnSlideToCenter = useCallback(() => {
    Animated.spring(slideTranslateX, {
      damping: 20,
      mass: 0.7,
      stiffness: 220,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [slideTranslateX]);

  const moveToSlide = useCallback(
    (direction: -1 | 1) => {
      const nextSlideIndex = slideIndex + direction;

      if (
        isTransitioning ||
        nextSlideIndex < 0 ||
        nextSlideIndex >= tutorialSlides.length
      ) {
        returnSlideToCenter();
        return;
      }

      setIsTransitioning(true);
      Animated.timing(slideTranslateX, {
        duration: 180,
        easing: (value) => 1 - Math.pow(1 - value, 3),
        toValue: direction > 0 ? -transitionDistance : transitionDistance,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          setIsTransitioning(false);
          returnSlideToCenter();
          return;
        }

        setSlideIndex(nextSlideIndex);
        slideTranslateX.setValue(
          direction > 0 ? transitionDistance : -transitionDistance,
        );

        requestAnimationFrame(() => {
          Animated.timing(slideTranslateX, {
            duration: 200,
            easing: (value) => 1 - Math.pow(1 - value, 3),
            toValue: 0,
            useNativeDriver: true,
          }).start(() => {
            setIsTransitioning(false);
          });
        });
      });
    },
    [
      returnSlideToCenter,
      isTransitioning,
      slideIndex,
      slideTranslateX,
      transitionDistance,
    ],
  );

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !isFinishing &&
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.25,
        onPanResponderMove: (_, gestureState) => {
          const isPastStart = slideIndex === 0 && gestureState.dx > 0;
          const isPastEnd = isLastSlide && gestureState.dx < 0;
          slideTranslateX.setValue(
            isPastStart || isPastEnd ? gestureState.dx * 0.25 : gestureState.dx,
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) < 50) {
            returnSlideToCenter();
            return;
          }

          moveToSlide(gestureState.dx < 0 ? 1 : -1);
        },
        onPanResponderTerminate: returnSlideToCenter,
      }),
    [
      isFinishing,
      isLastSlide,
      moveToSlide,
      returnSlideToCenter,
      slideIndex,
      slideTranslateX,
    ],
  );

  async function finishTutorial() {
    if (isFinishing) {
      return;
    }

    setIsFinishing(true);
    try {
      await onFinish();
      setSlideIndex(0);
      slideTranslateX.setValue(0);
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
        <ThemedView
          type="modalBackground"
          style={[styles.card, { backgroundColor: theme.modalBackground }]}
          {...swipeResponder.panHandlers}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("onboarding.actions.skip")}
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

          <Animated.View
            style={[
              styles.animatedSlide,
              { transform: [{ translateX: slideTranslateX }] },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.slideContent}
              showsVerticalScrollIndicator={false}
            >
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
                    contentFit="contain"
                    source={require("@/assets/images/assistant-coach-app-icon-1024.png")}
                    style={styles.welcomeLogo}
                  />
                ) : (
                  <SymbolView
                    name={slide.icon}
                    type="monochrome"
                    colors={ActionColors.onAccent}
                    tintColor={ActionColors.onAccent}
                    size={72}
                  />
                )}
              </ThemedView>

              <ThemedView style={styles.copy}>
                <ThemedText type="smallBold" style={styles.eyebrow}>
                  {t(slide.eyebrowKey)}
                </ThemedText>
                <ThemedText type="subtitle" style={styles.title}>
                  {t(slide.titleKey)}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  style={styles.description}
                >
                  {t(slide.descriptionKey)}
                </ThemedText>
              </ThemedView>
            </ScrollView>
          </Animated.View>

          <ThemedView style={styles.progress}>
            {tutorialSlides.map((item, index) => (
              <ThemedView
                key={item.eyebrowKey}
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
                onPress={() => moveToSlide(-1)}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.backButtonText}>
                  {t("common.back")}
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
                  : moveToSlide(1)
              }
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.pressed,
                isFinishing && styles.disabled,
              ]}
            >
              <ThemedText type="smallBold" style={styles.nextButtonText}>
                {isLastSlide ? t(finalActionLabelKey) : t("common.next")}
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
    height: "85%",
    maxHeight: 590,
    maxWidth: 520,
    overflow: "hidden",
    padding: Spacing.three,
    position: "relative",
    width: "100%",
  },
  slideContent: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  animatedSlide: {
    flex: 1,
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
