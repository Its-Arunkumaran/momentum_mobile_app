import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import { iosSelectionSummary, type DistractionSelection, type IOSSelection } from "../model";

export type AppEntry = {
  id: string;
  name: string;
  iconUri?: string;
  restrictionUnavailable?: boolean;
  missing?: boolean;
};
export type ProtectionStatus = "ready" | "permissionRequired" | "unavailable";
type PickerResult = {
  selection: string;
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
};
type NativeDistractions = {
  listInstalledApps?: () => Promise<AppEntry[]>;
  pickAppsAsync?: (previous: string | null) => Promise<PickerResult | null>;
  getProtectionStatusAsync: () => Promise<ProtectionStatus>;
  openProtectionSettingsAsync?: () => Promise<void>;
  startProtectionAsync: (id: string, end: number, targets: string[] | string) => Promise<void>;
  stopProtectionAsync: (id: string) => Promise<void>;
  isProtectionActiveAsync: (id: string) => Promise<boolean>;
};

const native = Platform.OS === "web" ? null :
  requireOptionalNativeModule<NativeDistractions>("MomentumDistractions");
export const devicePlatform = Platform.OS === "android" && native?.listInstalledApps
  ? "android" : Platform.OS === "ios" && native?.pickAppsAsync ? "ios" : "preview";

// Only used by the explicitly labeled preview. Native builds use OS data.
export const sampleApps: AppEntry[] = ["Facebook", "Instagram", "Netflix", "Reddit", "TikTok", "X", "YouTube"]
  .map(name => ({ id: name, name }));

export function selectionCount(selection: DistractionSelection) {
  if (devicePlatform === "android") return selection.androidApps.length;
  if (devicePlatform === "preview") return selection.previewAppIds.length;
  const ios = selection.ios;
  return ios ? ios.appCount + ios.categoryCount + ios.webDomainCount : 0;
}

export function selectionDescription(selection: DistractionSelection) {
  if (devicePlatform === "ios") {
    return iosSelectionSummary(selection.ios) || "No Screen Time items selected";
  }
  const names = devicePlatform === "android"
    ? selection.androidApps.map(app => app.label) : selection.previewAppIds;
  return names.length ? names.join(", ") : "No apps selected";
}

export function scanApps() {
  if (devicePlatform === "preview") return Promise.resolve(sampleApps);
  if (native?.listInstalledApps) return native.listInstalledApps();
  throw new Error("Use the Screen Time picker to choose apps on iPhone.");
}
export async function chooseIOSApps(previous: IOSSelection | null): Promise<IOSSelection | null> {
  if (!native?.pickAppsAsync) throw new Error("Open a Momentum iOS build to use Screen Time.");
  const result = await native.pickAppsAsync(previous?.encoded ?? null);
  return result && {
    encoded: result.selection, appCount: result.applicationCount,
    categoryCount: result.categoryCount, webDomainCount: result.webDomainCount,
  };
}
export async function protectionStatus(): Promise<ProtectionStatus> {
  return native?.getProtectionStatusAsync ? native.getProtectionStatusAsync() : "unavailable";
}
export async function openAndroidProtectionSettings() {
  if (!native?.openProtectionSettingsAsync) throw new Error("Device protection is unavailable in this build.");
  await native.openProtectionSettingsAsync();
}
export async function startDeviceProtection(id: string, end: number, selection: DistractionSelection) {
  if (!native?.startProtectionAsync || devicePlatform === "preview")
    throw new Error("Device protection is unavailable in this build.");
  const targets = devicePlatform === "ios" ? selection.ios?.encoded :
    selection.androidApps.map(app => app.packageName);
  if (!targets?.length) throw new Error("Select apps before enabling device restrictions.");
  await native.startProtectionAsync(id, end, targets);
}
export async function stopDeviceProtection(id: string) {
  await native?.stopProtectionAsync?.(id);
}
export async function deviceSessionIsActive(id: string) {
  return (await native?.isProtectionActiveAsync?.(id)) ?? false;
}
