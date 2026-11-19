import { useCallback, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { useFocusEffect } from "expo-router";
import tw from "twrnc";
import { Button, Card, Icon, Txt, usePalette } from "@/components/momentum/ui";
import { useMomentum } from "@/lib/store";
import { setAndroidAppSelected, setIOSSelection, setPreviewAppSelected } from "@/lib/model";
import { chooseIOSApps, devicePlatform, scanApps, selectionCount, selectionDescription, type AppEntry } from "@/lib/distractions/device";
import { AppRow } from "./app-row";
import { AppPicker } from "./app-picker";

export function SelectionCard({ onPermissionChange }: { onPermissionChange: () => void }) {
  const { data, update } = useMomentum();
  const c = usePalette();
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(new Set<string>());
  const busy = useRef(new Set<string>());
  const request = useRef(0);
  const refresh = useCallback(async () => {
    if (devicePlatform === "ios") return;
    const sequence = ++request.current;
    setLoading(true); setError("");
    try {
      const result = await scanApps();
      if (sequence === request.current) setApps(result);
    } catch {
      if (sequence === request.current) setError("Couldn’t read the app list. Refresh to try again.");
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    void refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
    return () => { subscription.remove(); request.current++; };
  }, [refresh]));

  const perform = async (key: string, operation: () => Promise<void>) => {
    if (busy.current.has(key)) return;
    busy.current.add(key); setPending(new Set(busy.current)); setError("");
    try { await operation(); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn’t save this selection. Try again."); }
    finally { busy.current.delete(key); setPending(new Set(busy.current)); }
  };
  const editIOS = () => perform("picker", async () => {
    try {
      const result = await chooseIOSApps(data.selection.ios);
      if (result) await update(current => setIOSSelection(current, result));
    } finally { onPermissionChange(); }
  });
  const toggle = (app: AppEntry, selected: boolean) => void perform(app.id, () =>
    update(current => devicePlatform === "android"
      ? setAndroidAppSelected(current, { packageName: app.id, label: app.name }, selected)
      : setPreviewAppSelected(current, app.id, selected)));
  const saved = devicePlatform === "android"
    ? data.selection.androidApps.map(app => ({ id: app.packageName, name: app.label }))
    : data.selection.previewAppIds.map(id => ({ id, name: id }));
  const selection = new Set(saved.map(app => app.id));
  const discovered = new Set(apps.map(app => app.id));
  const catalog = [...apps, ...saved.filter(app => !discovered.has(app.id)).map(app => ({
    ...app, missing: devicePlatform === "android",
  }))];
  const count = selectionCount(data.selection);
  return (
    <Card style={tw.style("rounded-3xl p-5")}>
      <View style={tw.style("flex-row items-center")}>
        <View style={[tw.style("p-2.5 rounded-xl mr-3"), { backgroundColor: c.soft }]}><Icon name="shield" color={c.primary} /></View>
        <View style={tw.style("flex-1")}><Txt bold size={17}>Distractions to set aside</Txt>
          <Txt muted size={12}>{devicePlatform === "preview" ? "Sample apps · timer-only preview" :
            devicePlatform === "ios" ? "Screen Time selection" : "Apps on this device"}</Txt></View>
        <View style={[tw.style("px-2.5 py-1 rounded-full"), { backgroundColor: c.soft }]}><Txt bold size={12} style={{ color: c.primary }}>{count}</Txt></View>
      </View>
      {devicePlatform === "ios" ? <>
        <Txt muted size={14}>{selectionDescription(data.selection)}</Txt>
        <Button secondary icon="grid" title="Choose in Screen Time" disabled={pending.has("picker")} onPress={() => void editIOS()} />
      </> : <>
        <View>{catalog.slice(0, 3).map(app => <AppRow key={app.id} app={app} selected={selection.has(app.id)}
          pending={pending.has(app.id)} onChange={next => toggle(app, next)} />)}
          {!catalog.length && <Txt muted size={14}>{loading ? "Finding apps…" : "No apps found."}</Txt>}
        </View>
        <Button secondary title={devicePlatform === "preview" ? "Browse sample apps" : "Browse installed apps"} icon="grid" onPress={() => setOpen(true)} />
        {devicePlatform === "preview" && <Txt muted size={12}>Device selection and blocking require a Momentum native build.</Txt>}
        {open && <AppPicker apps={catalog} selection={selection} pending={pending} loading={loading}
          error={error} onSelect={toggle} onRefresh={() => void refresh()} onClose={() => setOpen(false)} />}
      </>}
      {!!error && !open && <Txt size={13} style={{ color: c.danger }}>{error}</Txt>}
    </Card>
  );
}
