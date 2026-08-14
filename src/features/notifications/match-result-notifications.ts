import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { AppLocale } from "@/i18n/locales";
import { translations } from "@/i18n/generated/translations";

const MATCH_RESULT_CHANNEL_ID = "match-results";
const TRAINING_ATTENDANCE_CHANNEL_ID = "training-attendance";

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
  locale: AppLocale,
) {
  if (Platform.OS === "web") return;

  try {
    const identifier = getMatchResultReminderIdentifier(matchId);
    await Notifications.cancelScheduledNotificationAsync(identifier);

    if (!(await ensureNotificationPermissionAsync())) return;

    const reminderDate = getMatchResultReminderDate(matchDate, startTime);
    if (!reminderDate) return;
    const notificationText = translations[locale].notifications.match_result;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: notificationText.title,
        body: notificationText.body,
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

export async function scheduleTrainingAttendanceReminderAsync(
  eventId: number,
  eventDate: string,
  startTime: string | null,
  locale: AppLocale,
) {
  if (Platform.OS === "web" || !startTime) return;

  try {
    const identifier = getTrainingAttendanceReminderIdentifier(eventId);
    await Notifications.cancelScheduledNotificationAsync(identifier);
    if (!(await ensureNotificationPermissionAsync(TRAINING_ATTENDANCE_CHANNEL_ID))) return;

    const reminderDate = getReminderDate(eventDate, startTime);
    if (!reminderDate) return;
    const notificationText = translations[locale].notifications.training_attendance;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: notificationText.title,
        body: notificationText.body,
        data: { url: "/events" },
        sound: "default",
      },
      trigger:
        reminderDate.getTime() <= Date.now()
          ? null
          : {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: reminderDate,
              channelId:
                Platform.OS === "android"
                  ? TRAINING_ATTENDANCE_CHANNEL_ID
                  : undefined,
            },
    });
  } catch (error) {
    console.warn("Could not schedule training attendance reminder", error);
  }
}

export async function cancelTrainingAttendanceReminderAsync(eventId: number) {
  if (Platform.OS === "web") return;
  const identifier = getTrainingAttendanceReminderIdentifier(eventId);
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await Notifications.dismissNotificationAsync(identifier);
  } catch (error) {
    console.warn("Could not cancel training attendance reminder", error);
  }
}

export function isTrainingAttendanceOverdue(
  eventDate: string,
  startTime: string | null,
  attendanceStatus: string,
  now = new Date(),
) {
  if (attendanceStatus === "marked" || !startTime) return false;
  const reminderDate = getReminderDate(eventDate, startTime);
  return reminderDate !== null && reminderDate.getTime() <= now.getTime();
}

export async function cancelAllAssistantCoachNotificationsAsync() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn("Could not cancel scheduled notifications", error);
  }
}

async function ensureNotificationPermissionAsync(
  channelId = MATCH_RESULT_CHANNEL_ID,
) {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(channelId, {
      name:
        channelId === TRAINING_ATTENDANCE_CHANNEL_ID
          ? "Training attendance reminders"
          : "Match result reminders",
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

function getTrainingAttendanceReminderIdentifier(eventId: number) {
  return `training-attendance-${eventId}`;
}

function getMatchResultReminderDate(matchDate: string, startTime: string) {
  return getReminderDate(matchDate, startTime);
}

function getReminderDate(eventDate: string, startTime: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(startTime);
  if (!dateMatch || !timeMatch) return null;

  const eventStart = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );
  return new Date(eventStart.getTime() + 3 * 60 * 60 * 1000);
}
