export async function setDailyReminder(_time: string | null) {
  throw new Error(
    "Scheduled reminders are available in the Android and iOS app.",
  );
}
export async function getDailyReminder() {
  return false;
}
