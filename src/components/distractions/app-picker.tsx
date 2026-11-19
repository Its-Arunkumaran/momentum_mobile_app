import { useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Button, Icon, Txt, usePalette } from "@/components/momentum/ui";
import { AppRow } from "./app-row";
import type { AppEntry } from "@/lib/distractions/device";

type Props = {
  apps: AppEntry[];
  selection: Set<string>;
  pending: Set<string>;
  loading: boolean;
  error: string;
  onSelect: (app: AppEntry, next: boolean) => void;
  onRefresh: () => void;
  onClose: () => void;
};
export function AppPicker({ apps, selection, pending, loading, error, onSelect, onRefresh, onClose }: Props) {
  const c = usePalette();
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const needle = query.trim().toLocaleLowerCase();
  const matches = apps.filter(app =>
    (!onlySelected || selection.has(app.id)) &&
    (app.name.toLocaleLowerCase().includes(needle) || app.id.toLocaleLowerCase().includes(needle)));
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[tw.style("flex-1"), { backgroundColor: c.bg }]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[tw.style("flex-1 w-full self-center px-5 py-3"), { maxWidth: 580 }]}>
          <View style={tw.style("flex-row items-center justify-between")}>
            <View style={tw.style("flex-1 mr-3")}><Txt bold size={23}>Choose apps</Txt><Txt muted size={13}>{selection.size} selected</Txt></View>
            <Button title="Done" compact onPress={onClose} />
          </View>
          <View style={[tw.style("flex-row items-center rounded-xl border px-3 my-4"), { backgroundColor: c.card, borderColor: c.line }]}>
            <Icon name="search" size={18} color={c.muted} />
            <TextInput accessibilityLabel="Search apps" placeholder="Search apps" placeholderTextColor={c.muted}
              value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none"
              style={[tw.style("flex-1 text-base px-3 py-3"), { color: c.text }]} />
          </View>
          <View style={tw.style("flex-row items-center justify-between mb-2")}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: onlySelected }}
              onPress={() => setOnlySelected(v => !v)} style={tw.style("py-2 pr-4")}>
              <Txt bold size={14} style={{ color: c.primary }}>{onlySelected ? "Show all apps" : "Show selected only"}</Txt>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Refresh app list" disabled={loading}
              onPress={onRefresh} style={tw.style("p-3")}><Icon name="refresh-cw" size={17} color={c.primary} /></Pressable>
          </View>
          {loading && <ActivityIndicator accessibilityLabel="Loading apps" color={c.primary} />}
          {!!error && <Txt style={{ color: c.danger }} size={13}>{error}</Txt>}
          <FlatList data={matches} keyExtractor={app => app.id} keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <AppRow app={item} selected={selection.has(item.id)}
              pending={pending.has(item.id)} onChange={next => onSelect(item, next)} />}
            ListEmptyComponent={!loading && !error ? <View style={tw.style("py-8")}><Txt muted>
              {needle ? "No apps match your search." : onlySelected ? "You haven’t selected any apps." : "No launchable apps found. Refresh to check again."}
            </Txt></View> : undefined} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
