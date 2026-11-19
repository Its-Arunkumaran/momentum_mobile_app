import { useState } from "react";
import { View } from "react-native";
import { categories, dayKey, Item, suggestedItem, uid } from "@/lib/model";
import { useMomentum } from "@/lib/store";
import { Button, Chip, Field, Sheet, Txt, common, useAction } from "./ui";
export function ItemEditor({
  item,
  onClose,
}: {
  item: Item | null;
  onClose: () => void;
}) {
  const { update } = useMomentum();
  const existing = item && item.id !== "template" ? item : null;
  const [draft, setDraft] = useState<Item>(
    item
      ? { ...item, id: item.id === "template" ? uid() : item.id }
      : {
          ...suggestedItem("Learning"),
          id: uid(),
          title: "",
          goal: "",
          minimum: "",
        },
  );
  const action = useAction();
  const set = <K extends keyof Item>(key: K, value: Item[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const save = () =>
    action.run(async () => {
      if (!draft.title.trim()) throw new Error("Give your action a name.");
      if (
        !Number.isInteger(draft.minutes) ||
        draft.minutes < 1 ||
        draft.minutes > 180
      )
        throw new Error("Choose a duration between 1 and 180 minutes.");
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time))
        throw new Error("Use a time such as 09:00 or 18:30.");
      if (draft.kind === "habit" && !draft.days.length)
        throw new Error("Choose at least one day.");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
        dayKey(new Date(draft.date + "T12:00:00")) !== draft.date
      )
        throw new Error("Use a valid date in YYYY-MM-DD format.");
      await update((d) => ({
        ...d,
        items: existing
          ? d.items.map((i) =>
              i.id === existing.id
                ? {
                    ...draft,
                    title: draft.title.trim(),
                    completed: i.completed,
                  }
                : i,
            )
          : [...d.items, { ...draft, title: draft.title.trim() }],
      }));
      onClose();
    });
  return (
    <Sheet
      visible
      title={existing ? "Edit your action" : "One small step"}
      onClose={onClose}
    >
      <View style={common.wrap}>
        {(["habit", "task"] as const).map((kind) => (
          <Chip
            key={kind}
            label={kind === "habit" ? "Repeating habit" : "One-time task"}
            selected={draft.kind === kind}
            onPress={() => set("kind", kind)}
          />
        ))}
      </View>
      <Field
        label="What will you do?"
        value={draft.title}
        onChangeText={(v) => set("title", v)}
        placeholder="Read a chapter, go for a walk…"
      />
      <View style={common.wrap}>
        {categories.map((category) => (
          <Chip
            key={category}
            label={category}
            selected={draft.category === category}
            onPress={() => set("category", category)}
          />
        ))}
      </View>
      <Field
        label="Goal / why this matters (optional)"
        value={draft.goal}
        onChangeText={(v) => set("goal", v)}
        placeholder="Build confidence for my next interview"
        maxLength={200}
      />
      <Field
        label="Duration in minutes"
        value={String(draft.minutes || "")}
        onChangeText={(v) => set("minutes", Number(v))}
        keyboardType="number-pad"
        maxLength={3}
      />
      <Field
        label="Planned time (24-hour HH:MM)"
        value={draft.time}
        onChangeText={(v) => set("time", v)}
        maxLength={5}
      />
      {draft.kind === "habit" ? (
        <>
          <Txt bold size={13}>
            Repeat on
          </Txt>
          <View style={common.wrap}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (label, day) => (
                <Chip
                  key={label}
                  label={label}
                  selected={draft.days.includes(day)}
                  onPress={() =>
                    set(
                      "days",
                      draft.days.includes(day)
                        ? draft.days.filter((n) => n !== day)
                        : [...draft.days, day],
                    )
                  }
                />
              ),
            )}
          </View>
          <Field
            label="Smallest version for a difficult day"
            value={draft.minimum}
            onChangeText={(v) => set("minimum", v)}
            placeholder="Read just one page"
            maxLength={200}
          />
        </>
      ) : (
        <Field
          label="Date (YYYY-MM-DD)"
          value={draft.date}
          onChangeText={(v) => set("date", v)}
          maxLength={10}
        />
      )}
      <Txt muted size={12}>
        Planned times organize your day. Enable a daily check-in reminder in
        Settings.
      </Txt>
      {!!action.message && <Txt>{action.message}</Txt>}
      <Button
        title={action.busy ? "Saving…" : "Save action"}
        disabled={action.busy}
        onPress={() => void save()}
      />
      {existing && (
        <Button
          title="Archive this action"
          danger
          disabled={action.busy}
          onPress={() =>
            void action.run(async () => {
              await update((d) => ({
                ...d,
                items: d.items.map((i) =>
                  i.id === existing.id ? { ...i, archived: true } : i,
                ),
              }));
              onClose();
            })
          }
        />
      )}
    </Sheet>
  );
}
