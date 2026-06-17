import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FeatureScreenPlaceholderProps = {
  title: string;
  description: string;
  nextSteps: string[];
};

export function FeatureScreenPlaceholder({
  title,
  description,
  nextSteps,
}: FeatureScreenPlaceholderProps) {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
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
      paddingTop: Spacing.five,
      paddingBottom: Spacing.five,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            {description}
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedText type="smallBold">First things to build here</ThemedText>
          {nextSteps.map((nextStep) => (
            <ThemedText key={nextStep} type="small" themeColor="textSecondary">
              {nextStep}
            </ThemedText>
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    flexGrow: 1,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
  },
  header: {
    gap: Spacing.two,
  },
  title: {
    lineHeight: 38,
  },
  description: {
    maxWidth: 560,
  },
  panel: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
});
