import { useState } from "react";
import { View } from "react-native";
import {
  categories,
  type Category,
  suggestedItem,
  suggestions,
  type Tone,
} from "@/lib/model";
import { useMomentum } from "@/lib/store";
import {
  Button,
  Card,
  Chip,
  Field,
  Icon,
  Page,
  Row,
  Txt,
  common,
  useAction,
  usePalette,
} from "./ui";
export function Onboarding() {
  const { update } = useMomentum();
  const c = usePalette();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [priorities, setPriorities] = useState<Category[]>([
    "Fitness",
    "Learning",
    "Career",
  ]);
  const [tone, setTone] = useState<Tone>("Balanced");
  const action = useAction();
  const finish = (empty = false) =>
    action.run(() =>
      update((d) => ({
        ...d,
        onboarded: true,
        name: name.trim(),
        priorities,
        tone,
        items: empty ? [] : priorities.map(suggestedItem),
      })),
    );
  return (
    <Page
      title={
        step === 0
          ? "Make room for what matters."
          : step === 1
            ? "Your life. Your direction."
            : "Start small. Make it yours."
      }
      subtitle={
        step === 0
          ? "A little less scrolling. A little more living."
          : step === 1
            ? "Choose the areas you want to give more attention."
            : "We’ll turn your priorities into a simple, editable routine."
      }
      eyebrow="WELCOME TO YOUR NEXT CHAPTER"
    >
      <Row>
        {[0, 1, 2].map((n) => (
          <View
            key={n}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: n <= step ? c.primary : c.line,
            }}
          />
        ))}
      </Row>
      {step === 0 ? (
        <>
          <View
            style={{
              backgroundColor: c.soft,
              height: 200,
              borderRadius: 26,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                width: 240,
                height: 240,
                borderRadius: 120,
                borderWidth: 1,
                borderColor: c.primary,
                opacity: 0.12,
              }}
            />
            <View
              style={{
                position: "absolute",
                width: 170,
                height: 170,
                borderRadius: 85,
                borderWidth: 1,
                borderColor: c.primary,
                opacity: 0.2,
              }}
            />
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 32,
                backgroundColor: c.primary,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ rotate: "-8deg" }],
              }}
            >
              <Icon name="trending-up" size={46} color={c.accent} />
            </View>
          </View>
          <Card>
            {[
              [
                "sunrise",
                "Build a rhythm",
                "Small habits that fit your actual life.",
              ],
              [
                "target",
                "Give one thing your attention",
                "A dedicated space to begin and follow through.",
              ],
              [
                "shield",
                "Keep it personal",
                "No account. No subscription. Your data stays here.",
              ],
            ].map(([icon, title, text]) => (
              <Row key={title}>
                <Icon name={icon as "sunrise"} color={c.primary} size={24} />
                <View style={{ flex: 1 }}>
                  <Txt bold>{title}</Txt>
                  <Txt muted size={13}>
                    {text}
                  </Txt>
                </View>
              </Row>
            ))}
          </Card>
        </>
      ) : step === 1 ? (
        <>
          <Field
            label="What should we call you? (optional)"
            value={name}
            onChangeText={setName}
            placeholder="Your first name"
            maxLength={40}
          />
          <View style={{ gap: 12 }}>
            {categories.map((category) => (
              <Chip
                key={category}
                label={`${priorities.includes(category) ? "✓  " : "+  "}${category}`}
                selected={priorities.includes(category)}
                onPress={() =>
                  setPriorities((p) =>
                    p.includes(category)
                      ? p.filter((x) => x !== category)
                      : [...p, category],
                  )
                }
              />
            ))}
          </View>
          <Txt muted size={13}>
            Less distraction supports every priority. You can change your
            routine anytime.
          </Txt>
        </>
      ) : (
        <>
          <Card>
            {priorities.length ? (
              priorities.map((category) => (
                <Row key={category}>
                  <Icon name="check-circle" color={c.primary} />
                  <View style={{ flex: 1 }}>
                    <Txt bold>{suggestions[category].title}</Txt>
                    <Txt size={13} muted>
                      {category} · {suggestions[category].minutes} min / day
                    </Txt>
                  </View>
                </Row>
              ))
            ) : (
              <Txt muted>
                Your plan starts empty. Add your first action whenever you’re
                ready.
              </Txt>
            )}
          </Card>
          <Txt bold>How should Momentum encourage you?</Txt>
          <View style={common.wrap}>
            {(["Gentle", "Balanced", "Direct"] as const).map((t) => (
              <Chip
                key={t}
                label={t}
                selected={tone === t}
                onPress={() => setTone(t)}
              />
            ))}
          </View>
          <Txt muted size={13}>
            Your routine and coaching style are always yours to change.
          </Txt>
        </>
      )}
      {!!action.message && <Txt>{action.message}</Txt>}
      <Button
        title={
          action.busy
            ? "Preparing your space…"
            : step === 2
              ? "Let’s build momentum"
              : "Continue"
        }
        icon="arrow-right"
        disabled={action.busy}
        onPress={() => (step < 2 ? setStep(step + 1) : void finish())}
      />
      {step > 0 && (
        <Button
          title="Back"
          secondary
          disabled={action.busy}
          onPress={() => setStep(step - 1)}
        />
      )}
      <Button
        title="Skip setup · start with a blank plan"
        secondary
        disabled={action.busy}
        onPress={() => void finish(true)}
      />
    </Page>
  );
}
