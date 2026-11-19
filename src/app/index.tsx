import { useState, useEffect } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { dayKey, isDue } from "@/lib/model";
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
export default function Today() {
  const { data, update } = useMomentum();
  const c = usePalette();
  const [reflect, setReflect] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const today = dayKey(now);
  const items = data.items
    .filter((i) => isDue(i, now))
    .sort((a, b) => a.time.localeCompare(b.time));
  const complete = items.filter((i) => i.completed.includes(today));
  const next = items.find((i) => !i.completed.includes(today));
  const minutes = Math.round(
    data.sessions
      .filter((s) => dayKey(new Date(s.end)) === today)
      .reduce((sum, s) => sum + (s.end - s.start) / 60000, 0),
  );
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
        ? "Good afternoon"
        : "Good evening";
  const coach = {
    Gentle: "You don’t have to do it all. Just take one small step.",
    Balanced: "Small steps today. Meaningful change over time.",
    Direct: "Choose your next action. Give it your full attention.",
  }[data.tone];
  return (
    <Page
      title={`${greeting}${data.name ? `, ${data.name}` : ""}.`}
      subtitle={coach}
      eyebrow={now
        .toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
        .toUpperCase()}
    >
      <View style={common.columns}>
        <Card
          style={[
            common.grow,
            {
              backgroundColor: c.primary,
              borderColor: c.primary,
              padding: 26,
              gap: 18,
            },
          ]}
        >
          <Row>
            <Icon name="compass" color={c.accent} size={18} />
            <Txt size={11} bold style={{ color: c.accent, letterSpacing: 1.6 }}>
              {data.active
                ? "YOUR COMMITMENT IS ACTIVE"
                : "MAKE SPACE FOR YOUR NEXT STEP"}
            </Txt>
          </Row>
          <Txt size={27} bold style={{ color: c.bg, maxWidth: 500 }}>
            {data.active
              ? data.active.title
              : next
                ? next.title
                : items.length
                  ? "You showed up for yourself."
                  : "A fresh start is a powerful thing."}
          </Txt>
          <Txt size={14} style={{ color: c.bg, opacity: 0.85 }}>
            {data.active
              ? "Return to your session. One thing at a time."
              : next
                ? `${next.minutes} minutes for ${next.category.toLowerCase()}. That’s a great place to begin.`
                : items.length
                  ? "Your planned actions are complete. Take a moment to enjoy it."
                  : "Give one small action a place in your day."}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              data.active
                ? "Return to session"
                : next
                  ? "Start next action"
                  : "Open my plan"
            }
            onPress={() =>
              data.active
                ? router.push("/focus")
                : next
                  ? router.push({
                      pathname: "/focus",
                      params: { itemId: next.id },
                    })
                  : router.push("/plan")
            }
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              backgroundColor: c.accent,
              borderRadius: 13,
              paddingHorizontal: 20,
              paddingVertical: 14,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Row>
              <Txt bold style={{ color: "#223B35" }}>
                {data.active
                  ? "Return to session"
                  : next
                    ? "Let’s begin"
                    : "Open my plan"}
              </Txt>
              <Icon name="arrow-right" size={17} color="#223B35" />
            </Row>
          </Pressable>
        </Card>
        <Card style={{ flex: 0.65, minWidth: 220 }}>
          <Row>
            <Icon name="sun" color={c.primary} />
            <Txt bold>Today, at a glance</Txt>
          </Row>
          <Row style={{ alignItems: "baseline" }}>
            <Txt size={40} bold>
              {complete.length}
              <Txt size={22} muted>
                {" "}
                / {items.length}
              </Txt>
            </Txt>
            <Txt muted size={13}>
              actions complete
            </Txt>
          </Row>
          <ProgressBar
            value={items.length ? complete.length / items.length : 0}
          />
          <Row style={{ justifyContent: "space-between", marginTop: 6 }}>
            <Txt muted size={13}>
              Completed focus time
            </Txt>
            <Txt bold>{minutes} min</Txt>
          </Row>
          <Txt size={12} muted>
            Progress starts with showing up, not a perfect score.
          </Txt>
        </Card>
      </View>
      <Section
        title="Your daily rhythm"
        action="Edit plan"
        onAction={() => router.push("/plan")}
      />
      <Card style={{ padding: 8, gap: 0 }}>
        {items.length ? (
          items.map((item, index) => {
            const done = item.completed.includes(today);
            return (
              <View
                key={item.id}
                style={{
                  padding: 16,
                  gap: 9,
                  borderBottomWidth: index === items.length - 1 ? 0 : 1,
                  borderColor: c.line,
                }}
              >
                <Row>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Complete ${item.title}`}
                    accessibilityState={{ checked: done }}
                    onPress={() =>
                      void update((d) => ({
                        ...d,
                        items: d.items.map((i) =>
                          i.id === item.id
                            ? {
                                ...i,
                                completed: i.completed.includes(today)
                                  ? i.completed.filter((date) => date !== today)
                                  : [...i.completed, today],
                              }
                            : i,
                        ),
                      })).catch(() => {})
                    }
                    style={{
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 25,
                        height: 25,
                        borderRadius: 9,
                        borderWidth: 1.5,
                        borderColor: done ? c.primary : c.line,
                        backgroundColor: done ? c.primary : c.bg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {done && <Icon name="check" size={16} color={c.bg} />}
                    </View>
                  </Pressable>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt
                      bold
                      style={{
                        textDecorationLine: done ? "line-through" : "none",
                        color: done ? c.muted : c.text,
                      }}
                    >
                      {item.title}
                    </Txt>
                    <Txt size={12} muted>
                      {item.time} · {item.category} · {item.minutes} min
                    </Txt>
                  </View>
                  {!done && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Focus on ${item.title}`}
                      onPress={() =>
                        router.push({
                          pathname: "/focus",
                          params: { itemId: item.id },
                        })
                      }
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: c.soft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="play" size={18} color={c.primary} />
                    </Pressable>
                  )}
                </Row>
                {!done && !!item.minimum && (
                  <Txt size={12} muted style={{ paddingLeft: 56 }}>
                    Low on energy? {item.minimum}.
                  </Txt>
                )}
              </View>
            );
          })
        ) : (
          <View style={{ padding: 20, gap: 14 }}>
            <Txt bold>No actions scheduled today.</Txt>
            <Txt muted>
              Your plan can be small. One meaningful action is enough to begin.
            </Txt>
            <Button
              title="Create my first action"
              secondary
              icon="plus"
              onPress={() => router.push("/plan")}
            />
          </View>
        )}
      </Card>
      <Card style={{ backgroundColor: c.soft }}>
        <Row>
          <View style={{ flex: 1, gap: 5 }}>
            <Txt bold size={18}>
              Pause. Notice. Grow.
            </Txt>
            <Txt muted size={13}>
              {data.reflections.some((r) => r.date === today)
                ? "Your reflection is saved. Come back whenever you need."
                : "What worked today? A little reflection makes tomorrow easier."}
            </Txt>
          </View>
          <Icon name="feather" size={28} color={c.primary} />
        </Row>
        <Button
          title={
            data.reflections.some((r) => r.date === today)
              ? "Edit today’s reflection"
              : "Take a moment to reflect"
          }
          secondary
          onPress={() => setReflect(true)}
        />
      </Card>
      {reflect && <ReflectionEditor onClose={() => setReflect(false)} />}
    </Page>
  );
}
