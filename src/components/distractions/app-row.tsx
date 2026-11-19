import { Image, Platform, Pressable, Switch, Text, View } from "react-native";
import tw from "twrnc";
import type { AppEntry } from "@/lib/distractions/device";
import { usePalette } from "@/components/momentum/ui";

type Props = { app: AppEntry; selected: boolean; pending: boolean; onChange: (next: boolean) => void };
export function AppRow({ app, selected, pending, onChange }: Props) {
  const c = usePalette();
  // A previously selected, now unavailable app can always be removed.
  const disabled = pending || (!selected && !!(app.restrictionUnavailable || app.missing));
  const detail = app.missing ? "No longer available on this device" : app.restrictionUnavailable
    ? "Essential app · always available" : selected ? "Set aside" : "Available";
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={app.name}
      accessibilityHint={detail}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={() => onChange(!selected)}
      style={({ pressed }) => [tw.style("flex-row items-center rounded-2xl border p-3 my-1"), {
        minHeight: 64, backgroundColor: selected ? c.soft : c.card,
        borderColor: selected ? c.primary : c.line, opacity: pressed || disabled ? 0.68 : 1,
      }]}
    >
      <View style={[tw.style("items-center justify-center rounded-xl mr-3"), { width: 38, height: 38, backgroundColor: c.bg }]}>
        {app.iconUri ? <Image source={{ uri: app.iconUri }} resizeMode="contain" style={tw.style("w-8 h-8")} />
          : <Text style={[tw.style("font-bold text-base"), { color: c.primary }]}>{app.name.slice(0, 1).toUpperCase()}</Text>}
      </View>
      <View style={tw.style("flex-1 mr-2")}>
        <Text numberOfLines={2} style={[tw.style("font-semibold text-base"), { color: c.text }]}>{app.name}</Text>
        <Text style={[tw.style("text-xs mt-0.5"), { color: selected ? c.primary : c.muted }]}>{detail}</Text>
      </View>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Switch accessible={false} focusable={false} tabIndex={-1} value={selected} disabled={disabled}
          trackColor={{ false: c.line, true: c.primary }} ios_backgroundColor={c.line}
          thumbColor={Platform.OS === "ios" ? undefined : selected ? c.bg : c.muted} />
      </View>
    </Pressable>
  );
}
