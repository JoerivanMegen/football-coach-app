import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import type { Href } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, useColorScheme, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

type AppTab = {
  name: string;
  href: Href;
  label: string;
  iconName: SymbolViewProps['name'];
};

const appTabs = [
  {
    name: 'home',
    href: '/',
    label: 'Home',
    iconName: { ios: 'house.fill', web: 'home' },
  },
  {
    name: 'players',
    href: '/players',
    label: 'Players',
    iconName: { ios: 'person.3.fill', web: 'groups' },
  },
  {
    name: 'events',
    href: '/events',
    label: 'Events',
    iconName: { ios: 'calendar', web: 'calendar_month' },
  },
  {
    name: 'match-day',
    href: '/match-day',
    label: 'Match Day',
    iconName: { ios: 'sportscourt.fill', web: 'sports_soccer' },
  },
  {
    name: 'settings',
    href: '/settings',
    label: 'Settings',
    iconName: { ios: 'gearshape.fill', web: 'settings' },
  },
] satisfies AppTab[];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {appTabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton iconName={tab.iconName}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  iconName: SymbolViewProps['name'];
};

export function TabButton({ children, iconName, isFocused, ...props }: TabButtonProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <SymbolView
          tintColor={isFocused ? colors.text : colors.textSecondary}
          name={iconName}
          size={18}
        />
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          Football Coach
        </ThemedText>

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
});
