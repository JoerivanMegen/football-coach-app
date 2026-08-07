import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const MATCH_RESULT_CHANNEL_ID = "match-results";

export function configureNotificationPresentation() {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function scheduleMatchResultReminderAsync(
  matchId: number,
  matchDate: string,
  startTime: string,
) {
  if (Platform.OS === "web") return;

  try {
    const identifier = getMatchResultReminderIdentifier(matchId);
    await Notifications.cancelScheduledNotificationAsync(identifier);

    if (!(await ensureNotificationPermissionAsync())) return;

    const reminderDate = getMatchResultReminderDate(matchDate, startTime);
    if (!reminderDate) return;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "How did your match go?",
        body: "Fill in your result!",
        data: { url: "/match-day" },
        sound: "default",
      },
      trigger: reminderDate.getTime() <= Date.now()
        ? null
        : {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
            channelId: Platform.OS === "android" ? MATCH_RESULT_CHANNEL_ID : undefined,
          },
    });
  } catch (error) {
    console.warn("Could not schedule match result reminder", error);
  }
}

export async function cancelMatchResultReminderAsync(matchId: number) {
  if (Platform.OS === "web") return;

  const identifier = getMatchResultReminderIdentifier(matchId);
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await Notifications.dismissNotificationAsync(identifier);
  } catch (error) {
    console.warn("Could not cancel match result reminder", error);
  }
}

export async function cancelAllAssistantCoachNotificationsAsync() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn("Could not cancel scheduled notifications", error);
  }
}

async function ensureNotificationPermissionAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(MATCH_RESULT_CHANNEL_ID, {
      name: "Match result reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  if (currentPermission.status === "granted") return true;
  const requestedPermission = await Notifications.requestPermissionsAsync();
  return requestedPermission.status === "granted";
}

function getMatchResultReminderIdentifier(matchId: number) {
  return `match-result-${matchId}`;
}

function getMatchResultReminderDate(matchDate: string, startTime: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(matchDate);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(startTime);
  if (!dateMatch || !timeMatch) return null;

  const matchStart = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );
  return new Date(matchStart.getTime() + 3 * 60 * 60 * 1000);
}
