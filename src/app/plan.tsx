import { useState } from "react";
import { View } from "react-native";
import { categories, Item, suggestedItem, suggestions } from "@/lib/model";
import { useMomentum } from "@/lib/store";
import { ItemEditor } from "@/components/momentum/item-editor";
import {
  Button,
  Card,
  Chip,
  Icon,
  Page,
  Row,
  Section,
  Txt,
  common,
  usePalette,
} from "@/components/momentum/ui";
export default function Plan() {
  const { data, update } = useMomentum();
  const c = usePalette();
  const [filter, setFilter] = useState("All");
  const [editor, setEditor] = useState<Item | null | undefined>();
  const [archive, setArchive] = useState(false);
  const items = data.items.filter(
    (i) =>
      i.archived === archive && (filter === "All" || i.category === filter),
  );
  return (
    <Page
      title="A little intention goes a long way."
      subtitle="Give your goals a place in your everyday life."
      eyebrow="YOUR PLAN"
    >
      <Button
        title="Add an action"
        icon="plus"
        onPress={() => setEditor(null)}
      />
      <View style={common.wrap}>
        {["All", ...categories].map((category) => (
          <Chip
            key={category}
            label={category}
            selected={filter === category}
            onPress={() => setFilter(category)}
          />
        ))}
      </View>
      <Section
        title={archive ? "Archived actions" : "Your actions"}
        action={archive ? "Show current" : "View archive"}
        onAction={() => setArchive(!archive)}
      />
      {items.length === 0 && (
        <Card>
          <Icon name="compass" size={30} color={c.primary} />
          <Txt bold>
            {archive ? "Nothing archived." : "Your next chapter starts here."}
          </Txt>
          <Txt muted>
            Add your own action or make one of the routines below your own.
          </Txt>
        </Card>
      )}
      {items.map((item) => (
        <Card key={item.id}>
          <Row>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt
                size={11}
                bold
                style={{ color: c.primary, letterSpacing: 1 }}
              >
                {item.category.toUpperCase()} · {item.kind.toUpperCase()}
              </Txt>
              <Txt size={19} bold>
                {item.title}
              </Txt>
              {!!item.goal && (
                <Txt size={13} muted>
                  {item.goal}
                </Txt>
              )}
            </View>
            <Icon
              name={item.kind === "habit" ? "repeat" : "check-square"}
              color={c.primary}
            />
          </Row>
          <Txt muted size={13}>
            {item.time} · {item.minutes} min ·{" "}
            {item.kind === "habit"
              ? item.days.length === 7
                ? "Every day"
                : item.days
                    .slice()
                    .sort()
                    .map(
                      (n) =>
                        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][n],
                    )
                    .join(", ")
              : item.date}
          </Txt>
          {!!item.minimum && <Txt size={13}>Smallest step: {item.minimum}</Txt>}
          <Button
            title={archive ? "Bring back to my plan" : "Edit action"}
            secondary
            compact
            onPress={() =>
              archive
                ? void update((d) => ({
                    ...d,
                    items: d.items.map((i) =>
                      i.id === item.id ? { ...i, archived: false } : i,
                    ),
                  })).catch(() => {})
                : setEditor(item)
            }
          />
        </Card>
      ))}
      <Section title="A starting point, made yours" />
      <Txt muted size={13}>
        Choose a template, adjust it, then save it to your plan.
      </Txt>
      <View style={common.columns}>
        {categories.map((category) => (
          <Card key={category} style={common.grow}>
            <Icon
              name={
                category === "Fitness"
                  ? "activity"
                  : category === "Learning"
                    ? "book-open"
                    : category === "Career"
                      ? "briefcase"
                      : "sun"
              }
              color={c.primary}
            />
            <Txt bold size={18}>
              {category}
            </Txt>
            <Txt muted size={13}>
              {suggestions[category].goal}
            </Txt>
            <Button
              title="Customize routine"
              secondary
              compact
              onPress={() =>
                setEditor({ ...suggestedItem(category), id: "template" })
              }
            />
          </Card>
        ))}
      </View>
      {editor !== undefined && (
        <ItemEditor
          key={editor?.id ?? "new"}
          item={editor}
          onClose={() => setEditor(undefined)}
        />
      )}
    </Page>
  );
}
