import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { dayKey, uid, setFocusMinutes, startFocusSession, type Item, type Session } from "@/lib/model";
import { SelectionCard } from "@/components/distractions/selection-card";
import { devicePlatform, openAndroidProtectionSettings, selectionCount, selectionDescription, startDeviceProtection, stopDeviceProtection } from "@/lib/distractions/device";
import { useProtection } from "@/lib/distractions/use-protection";
import { useMomentum } from "@/lib/store";
import {
  Button,
  Card,
  Chip,
  Field,
  Icon,
  Page,
  ProgressBar,
  Row,
  Sheet,
  Txt,
  common,
  useAction,
  usePalette,
} from "@/components/momentum/ui";
export default function Focus() {
  const { data } = useMomentum();
  const params = useLocalSearchParams<{ itemId?: string }>();
  const initial = data.items.find(i => i.id === params.itemId);
  return <FocusSpace key={params.itemId ?? 'custom'} initial={initial} />;
}
function FocusSpace({ initial }: { initial?: Item }) {
  const { data, update } = useMomentum();
  const c = usePalette();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [itemId, setItemId] = useState<string | undefined>(initial?.id);
  const [draftMinutes, setDraftMinutes] = useState<string | null>(initial ? String(initial.minutes) : null);
  const duration = draftMinutes ?? String(data.focusMinutes);
  const setDuration = (value: string) => {
    setDraftMinutes(value);
    if (/^\d{1,3}$/.test(value)) void update(d => setFocusMinutes(d, Number(value))).catch(() => {});
  };
  const [review, setReview] = useState(false);
  const [consent, setConsent] = useState(false);
  const [timerOnly, setTimerOnly] = useState(false);
  const starting = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  const action = useAction();
  const active = data.active;
  const protection = useProtection(active?.protection === "device" ? active.id : undefined);
  const withTargets = selectionCount(data.selection) > 0;
  const shortIOS = devicePlatform === "ios" && Number(duration) < 15;
  const eligible = devicePlatform !== "preview" && protection.status === "ready" && withTargets && !shortIOS;
  const protectedStart = eligible && !timerOnly;
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  const seconds = active
    ? Math.max(0, Math.ceil((active.end - Math.max(now, active.start)) / 1000))
    : Number(duration) * 60;
  const recent = data.sessions[data.sessions.length - 1];
  const start = async () => {
    if (starting.current) return;
    starting.current = true;
    try {
      await action.run(async () => {
        const id = uid();
        const reservation: { session?: Session } = {};
        // Save the deadline and exact selection before making a cross-process change.
        await update(d => {
          if (d.active) throw new Error("A focus session is already running.");
          const next = startFocusSession(d, { id, title, itemId, minutes: Number(duration),
            platform: devicePlatform, protection: protectedStart ? "device" : "timerOnly" });
          reservation.session = next.active ?? undefined;
          return next;
        });
        if (protectedStart && reservation.session?.selection) {
          try {
            await startDeviceProtection(id, reservation.session.end, reservation.session.selection);
          } catch (error) {
            // Both rollback steps are session-scoped. A later session must remain intact.
            await stopDeviceProtection(id);
            await update(d => d.active?.id === id ? { ...d, active: null } : d);
            throw error;
          }
        }
        setReview(false);
      });
    } finally { starting.current = false; }
  };
  return (
    <Page
      title={active ? "Just this. Just now." : "Give your attention a home."}
      subtitle={
        active
          ? "Your commitment continues, even when you leave this screen."
          : "One task. A little time. A meaningful step forward."
      }
      eyebrow="FOCUS SPACE"
    >
      {active ? (
        <Card style={{ alignItems: "center", paddingVertical: 36, gap: 24 }}>
          <Row>
            <Icon name="lock" size={16} color={c.primary} />
            <Txt size={12} bold style={{ color: c.primary, letterSpacing: 1 }}>
              COMMITMENT IN PROGRESS
            </Txt>
          </Row>
          <Txt bold size={22} style={{ textAlign: "center" }}>
            {active.title}
          </Txt>
          <View
            style={{
              width: 230,
              height: 230,
              borderRadius: 115,
              borderWidth: 9,
              borderColor: c.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt
              size={50}
              bold
              style={{ fontVariant: ["tabular-nums"], letterSpacing: -2 }}
            >
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </Txt>
            <Txt muted size={13}>
              TIME TO BE PRESENT
            </Txt>
          </View>
          <View style={{ width: "100%", maxWidth: 360 }}>
            <ProgressBar
              value={(now - active.start) / (active.end - active.start)}
            />
          </View>
          <Txt muted size={13}>
            Ends at{" "}
            {new Date(active.end).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Txt>
          <Txt size={13} style={{ textAlign: "center" }}>
            No pause. No early finish. You made this time for yourself.
          </Txt>
          <Txt muted size={12}>
            {active.protection === "device" ?
              protection.enabled === undefined ? "Checking device restrictions…" :
              protection.enabled ? "Device restrictions active" : "Device restrictions inactive · timer continues"
              : "Timer only"}{active.apps.length > 0 ? " · " + active.apps.join(", ") : ""}
          </Txt>
        </Card>
      ) : (
        <>
          {recent && recent.id !== acknowledged && (
            <Card style={{ backgroundColor: c.soft }}>
              <Icon name="check-circle" color={c.primary} size={30} />
              <Txt bold size={21}>
                You made the time.
              </Txt>
              <Txt>
                {Math.round((recent.end - recent.start) / 60000)} minutes for “
                {recent.title}”.
              </Txt>
              <Txt muted size={13}>
                The timer finished. Did you complete the action?
              </Txt>
              {recent.itemId && (
                <Button
                  title="Yes, mark the action complete"
                  disabled={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      const date = dayKey(new Date(recent.end));
                      await update((d) => ({
                        ...d,
                        items: d.items.map((i) =>
                          i.id === recent.itemId && !i.completed.includes(date)
                            ? { ...i, completed: [...i.completed, date] }
                            : i,
                        ),
                      }));
                      setAcknowledged(recent.id);
                    })
                  }
                />
              )}
              <Button
                title="Keep going with my day"
                secondary
                onPress={() => setAcknowledged(recent.id)}
              />
            </Card>
          )}
          <Card>
            <Field
              label="What deserves your attention?"
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                setItemId(undefined);
              }}
              placeholder="Read a chapter, practice a skill…"
            />
            {data.items.some((i) => !i.archived) && (
              <>
                <Txt muted size={12}>
                  OR CHOOSE FROM YOUR PLAN
                </Txt>
                <View style={common.wrap}>
                  {data.items
                    .filter((i) => !i.archived)
                    .slice(0, 8)
                    .map((item) => (
                      <Chip
                        key={item.id}
                        label={item.title}
                        selected={itemId === item.id}
                        onPress={() => {
                          setTitle(item.title);
                          setItemId(item.id);
                          setDuration(String(item.minutes));
                        }}
                      />
                    ))}
                </View>
              </>
            )}
            <Txt bold>Make a little space</Txt>
            <View style={common.wrap}>
              {[10, 25, 45, 60].map((minutes) => (
                <Chip
                  key={minutes}
                  label={`${minutes} min`}
                  selected={duration === String(minutes)}
                  onPress={() => setDuration(String(minutes))}
                />
              ))}
            </View>
            <Field
              label="Or choose your own duration (1–180 min)"
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              maxLength={3}
            />
          </Card>
          <SelectionCard onPermissionChange={protection.refresh} />
          {devicePlatform === "android" && withTargets && protection.status === "permissionRequired" &&
            <Button title="Set up device restrictions" secondary icon="shield" onPress={() => setConsent(true)} />}
          <Button
            title="Review my commitment"
            icon="lock"
            disabled={
              !title.trim() ||
              !Number.isInteger(Number(duration)) ||
              Number(duration) < 1 ||
              Number(duration) > 180
            }
            onPress={() => { setTimerOnly(false); action.setMessage(""); setReview(true); }}
          />
        </>
      )}
      {!!action.message && <Txt>{action.message}</Txt>}
      <Sheet
        visible={review && !active}
        title="A promise to yourself"
        onClose={() => !action.busy && setReview(false)}
      >
        <Txt bold size={22}>
          {title}
        </Txt>
        <Txt>
          {duration} minutes · No pause or early finish inside Momentum.
        </Txt>
        <Txt muted>
          Closing the app will not reset the timer. Restore and data reset are
          unavailable while it runs.
        </Txt>
        <Txt bold>{protectedStart ? "Device restrictions" : "Timer only"}</Txt>
        <Txt size={13}>{selectionDescription(data.selection)}</Txt>
        {protectedStart ?
          <Txt muted size={13}>Momentum will restrict the selection until the session ends. You control the permission in device settings.</Txt>
          : <Txt muted size={13}>{shortIOS && withTargets ? "Screen Time requires at least 15 minutes for device restrictions. " : ""}Apps stay accessible during a timer-only session.</Txt>}
        {eligible && <Button title={timerOnly ? "Use device restrictions" : "Use timer only"} compact secondary
          disabled={action.busy} onPress={() => setTimerOnly(value => !value)} />}
        {!!action.message && <Txt>{action.message}</Txt>}
        <Button
          title={action.busy ? "Starting…" : protectedStart ? "Start with restrictions" : "Start timer only"}
          disabled={action.busy}
          icon="play"
          onPress={() => void start()}
        />
        <Button
          title="Not yet, edit my session"
          secondary
          disabled={action.busy}
          onPress={() => setReview(false)}
        />
      </Sheet>
      <Sheet visible={consent} title="Allow app restrictions?" onClose={() => setConsent(false)}>
        <Txt>During a protected session, Momentum’s accessibility service checks when a selected app opens and returns you to the Home screen.</Txt>
        <Txt muted size={14}>The service uses app package names on this device. It does not read screen contents, record text, or share app activity. You can turn it off in Android Accessibility settings.</Txt>
        <Button title="Agree and open settings" onPress={() => void action.run(async () => {
          setConsent(false); await openAndroidProtectionSettings();
        })} />
        <Button title="Keep timer only" secondary onPress={() => setConsent(false)} />
      </Sheet>
    </Page>
  );
}
