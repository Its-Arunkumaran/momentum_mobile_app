import { useState } from "react";
import { View } from "react-native";
import { dayKey } from "@/lib/model";
import { useMomentum } from "@/lib/store";
import { Button, Chip, Field, Sheet, Txt, common, useAction } from "./ui";
export function ReflectionEditor({ onClose }: { onClose: () => void }) {
  const { data, update } = useMomentum();
  const today = dayKey();
  const existing = data.reflections.find((r) => r.date === today);
  const [draft, setDraft] = useState(
    existing ?? {
      date: today,
      wentWell: "",
      obstacle: "",
      tomorrow: "",
      mood: "Okay",
    },
  );
  const action = useAction();
  return (
    <Sheet visible title="A moment to reflect" onClose={onClose}>
      <Txt muted>No perfect answers. Just a little awareness.</Txt>
      <View style={common.wrap}>
        {["Great", "Okay", "Tough"].map((mood) => (
          <Chip
            key={mood}
            label={mood}
            selected={draft.mood === mood}
            onPress={() => setDraft((d) => ({ ...d, mood }))}
          />
        ))}
      </View>
      <Field
        multiline
        maxLength={2000}
        label="What went well?"
        value={draft.wentWell}
        onChangeText={(wentWell) => setDraft((d) => ({ ...d, wentWell }))}
        placeholder="Even a small win counts."
      />
      <Field
        multiline
        maxLength={2000}
        label="What got in the way?"
        value={draft.obstacle}
        onChangeText={(obstacle) => setDraft((d) => ({ ...d, obstacle }))}
        placeholder="Notice the pattern without judging yourself."
      />
      <Field
        multiline
        maxLength={2000}
        label="Tomorrow’s first small step"
        value={draft.tomorrow}
        onChangeText={(tomorrow) => setDraft((d) => ({ ...d, tomorrow }))}
        placeholder="Make it specific and achievable."
      />
      {!!action.message && <Txt>{action.message}</Txt>}
      <Button
        title={action.busy ? "Saving…" : "Save reflection"}
        disabled={action.busy}
        onPress={() =>
          void action.run(async () => {
            await update((d) => ({
              ...d,
              reflections: [
                ...d.reflections.filter((r) => r.date !== today),
                draft,
              ],
            }));
            onClose();
          })
        }
      />
      <Txt muted size={12}>
        Stored only on this device. You can include your journal in a backup.
      </Txt>
    </Sheet>
  );
}
