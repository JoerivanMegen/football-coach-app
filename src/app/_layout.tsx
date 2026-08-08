import * as Notifications from "expo-notifications";
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppHeader } from '@/components/app-header';
import { getDatabaseAsync } from '@/db/database';
import { configureNotificationPresentation } from '@/features/notifications/match-result-notifications';
import { I18nProvider } from '@/i18n/i18n-provider';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    configureNotificationPresentation();
    void getDatabaseAsync().catch((error: unknown) => {
      console.warn('Failed to initialize database', error);
    });

    if (Platform.OS === "web") return;

    function openNotification(notification: Notifications.Notification) {
      if (notification.request.content.data?.url === "/match-day") {
        router.push("/match-day");
      }
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openNotification(response.notification);
        void Notifications.clearLastNotificationResponseAsync();
      }
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => openNotification(response.notification),
    );

    return () => subscription.remove();
  }, []);

  return (
    <I18nProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppHeader />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="seasons" />
          <Stack.Screen name="season-summary" />
        </Stack>
      </ThemeProvider>
    </I18nProvider>
  );
}
