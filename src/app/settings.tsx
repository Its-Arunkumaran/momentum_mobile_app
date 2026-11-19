import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { Data, initialData, parseBackup, portableBackup } from "@/lib/model";
import { useMomentum } from "@/lib/store";
import { exportFile, importFile } from "@/lib/backup";
import { getDailyReminder, setDailyReminder } from "@/lib/reminders";
import {
  Button,
  Card,
  Chip,
  Field,
  Icon,
  Page,
  Row,
  Sheet,
  Txt,
  common,
  useAction,
  usePalette,
} from "@/components/momentum/ui";
export default function Settings() {
  const { data, update } = useMomentum();
  const c = usePalette();
  const action = useAction();
  const [nameDraft, setName] = useState<string | null>(null);
  const name = nameDraft ?? data.name;
  const [pending, setPending] = useState<Data | null>(null);
  const [reset, setReset] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [time, setTime] = useState("08:00");
  useEffect(() => {
    void getDailyReminder()
      .then(setReminder)
      .catch(() => {});
  }, []);
  return (
    <Page
      title="Make this space yours."
      subtitle="A few preferences. A little intention. All your choice."
      eyebrow="SETTINGS"
    >
      <Card>
        <Row>
          <View
            style={{
              width: 48,
              height: 48,
              backgroundColor: c.soft,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="user" color={c.primary} />
          </View>
          <View>
            <Txt bold size={18}>
              {data.name || "Your personal space"}
            </Txt>
            <Txt muted size={12}>
              No account needed · Always free
            </Txt>
          </View>
        </Row>
        <Field
          label="First name (optional)"
          value={name}
          onChangeText={setName}
          maxLength={40}
        />
        <Button
          title="Save name"
          secondary
          compact
          disabled={action.busy || name.trim() === data.name}
          onPress={() =>
            void action.run(
              () => update((d) => ({ ...d, name: name.trim() })),
              "Name saved.",
            )
          }
        />
      </Card>
      <Card>
        <Txt bold size={18}>
          Your coaching style
        </Txt>
        <Txt muted size={13}>
          Choose how your daily encouragement sounds.
        </Txt>
        <View style={common.wrap}>
          {(["Gentle", "Balanced", "Direct"] as const).map((tone) => (
            <Chip
              key={tone}
              label={tone}
              selected={data.tone === tone}
              onPress={() =>
                void update((d) => ({ ...d, tone })).catch(() => {})
              }
            />
          ))}
        </View>
        <Txt muted size={13}>
          Appearance
        </Txt>
        <View style={common.wrap}>
          {(["System", "Light", "Dark"] as const).map((appearance) => (
            <Chip
              key={appearance}
              label={appearance}
              selected={data.appearance === appearance}
              onPress={() =>
                void update((d) => ({ ...d, appearance })).catch(() => {})
              }
            />
          ))}
        </View>
      </Card>
      <Card>
        <Row>
          <Icon name="bell" color={c.primary} />
          <Txt bold size={18}>
            A daily nudge
          </Txt>
        </Row>
        <Txt muted size={13}>
          {Platform.OS === "web"
            ? "Scheduled notifications are available in the Android and iOS app. They are not simulated in this web preview."
            : reminder
              ? "A daily reminder is scheduled on this device. Delivery depends on system notification settings."
              : "An optional reminder to return to your plan. Permission is requested only when you enable it."}
        </Txt>
        {Platform.OS !== "web" && (
          <>
            <Field
              label="Reminder time (24-hour HH:MM)"
              value={time}
              onChangeText={setTime}
              maxLength={5}
            />
            <Button
              title={
                reminder ? "Update reminder time" : "Enable daily reminder"
              }
              secondary
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
                    throw new Error("Enter a valid time, such as 08:00.");
                  await setDailyReminder(time);
                  setReminder(true);
                }, `Daily reminder scheduled for ${time}.`)
              }
            />
            {reminder && (
              <Button
                title="Turn reminder off"
                secondary
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await setDailyReminder(null);
                    setReminder(false);
                  }, "Reminder turned off.")
                }
              />
            )}
          </>
        )}
      </Card>
      <Card>
        <Row>
          <Icon name="shield" color={c.primary} />
          <Txt bold size={18}>
            Your data belongs to you
          </Txt>
        </Row>
        <Txt muted size={13}>
          Plans, session history, preferences, and journal entries are stored
          locally. There is no account, server sync, advertising, or analytics
          in this prototype.
        </Txt>
        <Txt muted size={13}>
          Backups are readable JSON files, including your journal. Save them
          somewhere private. Active sessions, iOS app selections, and notification
          permissions stay on this device.
        </Txt>
        <Button
          title="Export my backup"
          icon="download"
          secondary
          disabled={action.busy}
          onPress={() =>
            void action.run(() =>
              exportFile(JSON.stringify(portableBackup(data), null, 2)),
            )
          }
        />
        <Button
          title="Restore from backup"
          icon="upload"
          secondary
          disabled={action.busy || !!data.active}
          onPress={() =>
            void action.run(async () => {
              const raw = await importFile();
              if (raw) setPending(parseBackup(raw));
            })
          }
        />
        {data.active && (
          <Txt size={12} muted>
            Restore and reset unlock when your active focus session ends.
          </Txt>
        )}
        <Button
          title="Delete my local data"
          danger
          disabled={action.busy || !!data.active}
          onPress={() => setReset(true)}
        />
      </Card>
      {!!action.message && (
        <Card>
          <Txt>{action.message}</Txt>
        </Card>
      )}
      <Txt size={12} muted style={{ textAlign: "center" }}>
        Momentum · Prototype 0.1.0 · English
      </Txt>
      <Sheet
        visible={!!pending}
        title="Restore this backup?"
        onClose={() => !action.busy && setPending(null)}
      >
        <Txt>
          This replaces your current local plans, history, journal, and
          preferences. Export your current data first if you want to keep it.
        </Txt>
        <Card>
          <Txt>{pending?.items.length ?? 0} actions</Txt>
          <Txt>{pending?.sessions.length ?? 0} completed sessions</Txt>
          <Txt>{pending?.reflections.length ?? 0} journal entries</Txt>
        </Card>
        <Txt muted size={13}>
          After restoring, choose your iOS apps again in Focus. Your existing
          reminder schedule stays on this device.
        </Txt>
        <Button
          title="Replace local data & restore"
          disabled={action.busy || !!data.active}
          onPress={() =>
            void action.run(async () => {
              if (!pending) return;
              await update((d) => {
                if (d.active)
                  throw new Error("Wait for your active session to finish.");
                return { ...pending, onboarded: true, active: null };
              });
                setPending(null);
                setName(null);
            }, "Backup restored.")
          }
        />
        <Button
          title="Keep my current data"
          secondary
          disabled={action.busy}
          onPress={() => setPending(null)}
        />
        {action.message && <Txt>{action.message}</Txt>}
      </Sheet>
      <Sheet
        visible={reset}
        title="Start with a clean slate?"
        onClose={() => !action.busy && setReset(false)}
      >
        <Txt>
          This permanently removes this device’s Momentum plans, session
          history, and journal. It cannot be undone without a backup.
        </Txt>
        <Button
          title="Delete all local data"
          danger
          disabled={action.busy || !!data.active}
          onPress={() =>
            void action.run(async () => {
              if (Platform.OS !== "web") await setDailyReminder(null);
              await update((d) => {
                if (d.active)
                  throw new Error("Wait for your active session to finish.");
                return initialData();
              });
              setReset(false);
            })
          }
        />
        <Button
          title="Keep my data"
          secondary
          disabled={action.busy}
          onPress={() => setReset(false)}
        />
        {action.message && <Txt>{action.message}</Txt>}
      </Sheet>
    </Page>
  );
}
