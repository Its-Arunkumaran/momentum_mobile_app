import { useState } from "react";
import { View } from "react-native";
import { dayKey, categories } from "@/lib/model";
import { useMomentum } from "@/lib/store";
import { ReflectionEditor } from "@/components/momentum/reflection";
import {
  Button,
  Card,
  Icon,
  Page,
  ProgressBar,
  Row,
  Section,
  Txt,
  common,
  usePalette,
} from "@/components/momentum/ui";
export default function Progress() {
  const { data } = useMomentum();
  const c = usePalette();
  const [reflection, setReflection] = useState(false);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    const key = dayKey(date);
    return {
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      count: data.items.filter((item) => item.completed.includes(key)).length,
    };
  });
  const weekKeys = days.map((d) => d.key);
  const sessions = data.sessions.filter((s) =>
    weekKeys.includes(dayKey(new Date(s.end))),
  );
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const activeDays = days.filter(
    (d) => d.count || sessions.some((s) => dayKey(new Date(s.end)) === d.key),
  ).length;
  const max = Math.max(3, ...days.map((d) => d.count));
  return (
    <Page
      title="Look how you’re showing up."
      subtitle="Every small action is a vote for the life you want."
      eyebrow="YOUR PROGRESS"
    >
      <View style={common.columns}>
        {[
          [String(total), "Actions completed", "check-circle"],
          [
            String(
              Math.round(
                sessions.reduce((sum, s) => sum + (s.end - s.start) / 60000, 0),
              ),
            ),
            "Focus minutes",
            "clock",
          ],
          [`${activeDays} / 7`, "Days you showed up", "sun"],
        ].map(([value, label, icon]) => (
          <Card key={label} style={{ flex: 1, minWidth: 140 }}>
            <Icon name={icon as "clock"} color={c.primary} />
            <Txt size={32} bold>
              {value}
            </Txt>
            <Txt size={12} muted>
              {label} · last 7 days
            </Txt>
          </Card>
        ))}
      </View>
      <Card>
        <Section title="A week of small steps" />
        <Txt muted size={13}>
          Completed actions, one day at a time.
        </Txt>
        <Row style={{ height: 180, alignItems: "flex-end", gap: 12 }}>
          {days.map((day, i) => (
            <View
              key={day.key}
              style={{
                flex: 1,
                height: "100%",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Txt size={12} muted>
                {day.count}
              </Txt>
              <View
                style={{
                  width: "75%",
                  maxWidth: 54,
                  minHeight: 5,
                  height: (day.count / max) * 112,
                  borderRadius: 7,
                  backgroundColor: i === 6 ? c.primary : c.soft,
                }}
              />
              <Txt size={11} bold={i === 6} muted={i !== 6}>
                {day.label}
              </Txt>
            </View>
          ))}
        </Row>
        {total === 0 && (
          <Txt muted size={13}>
            Your story starts with your first action. There’s no catching up to
            do.
          </Txt>
        )}
      </Card>
      <Section title="Where your energy goes" />
      <Card>
        {categories.map((category) => {
          const count = data.items
            .filter((i) => i.category === category)
            .reduce(
              (sum, i) =>
                sum + i.completed.filter((d) => weekKeys.includes(d)).length,
              0,
            );
          return (
            <View key={category} style={{ gap: 10 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Txt size={14}>{category}</Txt>
                <Txt muted size={12}>
                  {count} actions
                </Txt>
              </Row>
              <ProgressBar value={total ? count / total : 0} />
            </View>
          );
        })}
      </Card>
      <Card style={{ backgroundColor: c.soft }}>
        <Txt bold size={20}>
          A weekly check-in
        </Txt>
        <Txt>
          Which action felt easy to start? Which one needs to be smaller next
          week?
        </Txt>
        <Txt muted size={13}>
          Keep what works. Adjust what doesn’t. Your plan should grow with you.
        </Txt>
        <Button
          title="Write a reflection"
          secondary
          icon="feather"
          onPress={() => setReflection(true)}
        />
      </Card>
      <Section title="Your journal" />
      {data.reflections.length ? (
        [...data.reflections]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((r) => (
            <Card key={r.date}>
              <Row style={{ justifyContent: "space-between" }}>
                <Txt bold>
                  {new Date(r.date + "T12:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Txt>
                <Txt muted size={12}>
                  {r.mood}
                </Txt>
              </Row>
              {r.wentWell ? (
                <>
                  <Txt bold size={12}>
                    WHAT WENT WELL
                  </Txt>
                  <Txt size={14}>{r.wentWell}</Txt>
                </>
              ) : null}
              {r.obstacle ? (
                <>
                  <Txt bold size={12}>
                    WHAT GOT IN THE WAY
                  </Txt>
                  <Txt size={14}>{r.obstacle}</Txt>
                </>
              ) : null}
              {r.tomorrow ? (
                <>
                  <Txt bold size={12}>
                    THE NEXT SMALL STEP
                  </Txt>
                  <Txt size={14}>{r.tomorrow}</Txt>
                </>
              ) : null}
            </Card>
          ))
      ) : (
        <Card>
          <Txt muted>
            Your reflections will appear here. A sentence is enough.
          </Txt>
        </Card>
      )}
      <Txt muted size={12}>
        Focus minutes represent completed timers, not verified attention or
        reduced screen time. No app usage is monitored.
      </Txt>
      {reflection && <ReflectionEditor onClose={() => setReflection(false)} />}
    </Page>
  );
}
