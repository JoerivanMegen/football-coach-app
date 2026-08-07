import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
  iconName?: SymbolViewProps['name'];
  iconType?: 'training';
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
    label: 'Training',
    iconType: 'training',
  },
  {
    name: 'match-day',
    href: '/match-day',
    label: 'Match Day',
    iconName: { ios: 'sportscourt.fill', web: 'sports_soccer' },
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
              <TabButton iconName={tab.iconName} iconType={tab.iconType}>
                {tab.label}
              </TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  iconName?: SymbolViewProps['name'];
  iconType?: 'training';
};

export function TabButton({ children, iconName, iconType, isFocused, ...props }: TabButtonProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const iconColor = isFocused ? colors.text : colors.textSecondary;

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        {iconType === 'training' ? (
          <TrainingTabIcon color={iconColor} />
        ) : iconName ? (
          <SymbolView
            tintColor={iconColor}
            name={iconName}
            size={18}
          />
        ) : null}
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function TrainingTabIcon({ color }: { color: string }) {
  return (
    <View style={styles.trainingIcon}>
      <MaterialCommunityIcons
        name="traffic-cone"
        color="#FF7A1A"
        size={20}
        style={styles.trainingConeIcon}
      />
      <FontAwesome6
        name="soccer-ball"
        color={color}
        size={10}
        style={styles.trainingBallIcon}
      />
    </View>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    bottom: 0,
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
  trainingIcon: {
    height: 20,
    position: 'relative',
    width: 22,
  },
  trainingConeIcon: {
    left: 0,
    position: 'absolute',
    top: -1,
  },
  trainingBallIcon: {
    bottom: 1,
    position: 'absolute',
    right: 0,
  },
});
