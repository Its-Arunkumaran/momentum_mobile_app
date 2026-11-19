import { Platform } from "react-native";

// Load only on request: no permission prompt or push registration at startup.
export async function setDailyReminder(time: string | null) {
  const Notifications = await import("expo-notifications");
  if (!time) {
    await Notifications.cancelScheduledNotificationAsync("momentum-daily");
    return;
  }
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("daily", {
      name: "Daily check-in",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Notifications are disabled. You can enable them in your phone settings.",
    );
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  await Notifications.scheduleNotificationAsync({
    identifier: "momentum-daily",
    content: {
      title: "A little progress, every day.",
      body: "Your next small step is waiting in Momentum.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: Number(time.slice(0, 2)),
      minute: Number(time.slice(3)),
      channelId: "daily",
    },
  });
}
export async function getDailyReminder() {
  const Notifications = await import("expo-notifications");
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((n) => n.identifier === "momentum-daily");
}
