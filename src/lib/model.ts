export const categories = [
  "Fitness",
  "Learning",
  "Career",
  "Wellbeing",
] as const;
export type Category = (typeof categories)[number];
export type Tone = "Gentle" | "Balanced" | "Direct";
export type Item = {
  id: string;
  title: string;
  kind: "habit" | "task";
  category: Category;
  minutes: number;
  time: string;
  days: number[];
  date: string;
  minimum: string;
  goal: string;
  completed: string[];
  archived: boolean;
};
export type Session = {
  id: string;
  title: string;
  itemId?: string;
  start: number;
  end: number;
  apps: string[];
  platform?: "android" | "ios" | "preview";
  protection?: "timerOnly" | "device";
  selection?: DistractionSelection;
};
export type SelectedAndroidApp = { packageName: string; label: string };
export type IOSSelection = {
  encoded: string;
  appCount: number;
  categoryCount: number;
  webDomainCount: number;
};
export type DistractionSelection = {
  androidApps: SelectedAndroidApp[];
  ios: IOSSelection | null;
  previewAppIds: string[];
};
export type Reflection = {
  date: string;
  wentWell: string;
  obstacle: string;
  tomorrow: string;
  mood: string;
};
export type Data = {
  version: 2;
  onboarded: boolean;
  name: string;
  priorities: Category[];
  tone: Tone;
  appearance: "System" | "Light" | "Dark";
  items: Item[];
  sessions: Session[];
  active: Session | null;
  reflections: Reflection[];
  selection: DistractionSelection;
  focusMinutes: number;
};
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function initialData(): Data {
  return {
    version: 2,
    onboarded: false,
    name: "",
    priorities: [...categories],
    tone: "Balanced",
    appearance: "System",
    items: [],
    sessions: [],
    active: null,
    reflections: [],
    selection: { androidApps: [], ios: null, previewAppIds: [] },
    focusMinutes: 25,
  };
}
const validMinutes = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= 180;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function validAndroidApp(value: unknown): value is SelectedAndroidApp {
  return (
    isRecord(value) &&
    typeof value.packageName === "string" &&
    value.packageName.length <= 255 &&
    /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$/.test(
      value.packageName,
    ) &&
    typeof value.label === "string" &&
    !!value.label.trim() &&
    value.label.length <= 512
  );
}
function validIOSSelection(value: unknown): value is IOSSelection {
  if (
    !isRecord(value) ||
    typeof value.encoded !== "string" ||
    !value.encoded.length ||
    value.encoded.length > 512_000
  )
    return false;
  return [value.appCount, value.categoryCount, value.webDomainCount].every(
    (count) =>
      typeof count === "number" && Number.isSafeInteger(count) && count >= 0,
  );
}
function validSelection(value: unknown): value is DistractionSelection {
  if (
    !isRecord(value) ||
    !Array.isArray(value.androidApps) ||
    value.androidApps.length > 4_000
  )
    return false;
  return (
    value.androidApps.every(validAndroidApp) &&
    new Set(value.androidApps.map((app) => app.packageName)).size ===
      value.androidApps.length &&
    Array.isArray(value.previewAppIds) &&
    value.previewAppIds.length <= 128 &&
    value.previewAppIds.every(
      (id) => typeof id === "string" && id.length > 0 && id.length <= 80,
    ) &&
    new Set(value.previewAppIds).size === value.previewAppIds.length &&
    (value.ios === null || validIOSSelection(value.ios))
  );
}
export function setAndroidAppSelected(
  data: Data,
  app: SelectedAndroidApp,
  selected: boolean,
): Data {
  if (data.active || !validAndroidApp(app)) return data;
  const apps = data.selection.androidApps;
  const present = apps.some((entry) => entry.packageName === app.packageName);
  if (present === selected) return data;
  if (selected && apps.length >= 4_000)
    throw new Error("The app selection is full.");
  const androidApps = selected
    ? [...apps, { packageName: app.packageName, label: app.label }]
    : apps.filter((entry) => entry.packageName !== app.packageName);
  return { ...data, selection: { ...data.selection, androidApps } };
}
export function setIOSSelection(data: Data, ios: IOSSelection | null): Data {
  if (data.active) return data;
  if (ios && !validIOSSelection(ios))
    throw new Error("The iOS selection could not be saved.");
  return { ...data, selection: { ...data.selection, ios } };
}
export function setPreviewAppSelected(
  data: Data,
  id: string,
  selected: boolean,
): Data {
  if (data.active || !id.trim() || id.length > 80) return data;
  const ids = data.selection.previewAppIds;
  if (ids.includes(id) === selected || (selected && ids.length >= 128))
    return data;
  const previewAppIds = selected
    ? [...ids, id]
    : ids.filter((value) => value !== id);
  return { ...data, selection: { ...data.selection, previewAppIds } };
}
export function setFocusMinutes(data: Data, minutes: number): Data {
  if (data.active || !validMinutes(minutes) || data.focusMinutes === minutes)
    return data;
  return { ...data, focusMinutes: minutes };
}
export function iosSelectionSummary(selection: IOSSelection | null): string {
  if (!selection) return "";
  const { appCount, categoryCount, webDomainCount } = selection;
  return [
    appCount && `${appCount} ${appCount === 1 ? "app" : "apps"}`,
    categoryCount &&
      `${categoryCount} ${categoryCount === 1 ? "category" : "categories"}`,
    webDomainCount &&
      `${webDomainCount} ${webDomainCount === 1 ? "website" : "websites"}`,
  ]
    .filter(Boolean)
    .join(", ");
}
export function startFocusSession(
  data: Data,
  options: {
    id?: string;
    title: string;
    minutes: number;
    itemId?: string;
    platform: NonNullable<Session["platform"]>;
    protection?: Session["protection"];
  },
  now = Date.now(),
): Data {
  if (data.active) return data;
  const title = options.title.trim();
  if (!title || title.length > 120 || !validMinutes(options.minutes))
    throw new Error("Choose a task and a duration from 1 to 180 minutes.");
  const selection: DistractionSelection = {
    androidApps:
      options.platform === "android"
        ? data.selection.androidApps.map((app) => ({ ...app }))
        : [],
    ios:
      options.platform === "ios" && data.selection.ios
        ? { ...data.selection.ios }
        : null,
    previewAppIds:
      options.platform === "preview" ? [...data.selection.previewAppIds] : [],
  };
  const iosSummary = iosSelectionSummary(selection.ios);
  const apps =
    options.platform === "preview"
      ? [...selection.previewAppIds]
      : selection.androidApps.map((app) => app.label);
  if (iosSummary) apps.push(iosSummary);
  return {
    ...data,
    focusMinutes: options.minutes,
    active: {
      id: options.id ?? uid(),
      title,
      itemId: options.itemId,
      start: now,
      end: now + options.minutes * 60_000,
      platform: options.platform,
      protection: options.protection ?? "timerOnly",
      selection,
      apps,
    },
  };
}
export function isDue(item: Item, date = new Date()) {
  return (
    !item.archived &&
    (item.kind === "habit"
      ? item.days.includes(date.getDay())
      : item.date === dayKey(date))
  );
}
export function finishExpired(data: Data, now = Date.now()): Data {
  if (!data.active || data.active.end > now) return data;
  const active = data.active;
  const completed = { ...active };
  delete completed.selection;
  return {
    ...data,
    active: null,
    sessions: data.sessions.some((s) => s.id === active.id)
      ? data.sessions
      : [...data.sessions, completed],
  };
}
export const suggestions: Record<
  Category,
  {
    title: string;
    minutes: number;
    time: string;
    minimum: string;
    goal: string;
  }
> = {
  Fitness: {
    title: "Move your body",
    minutes: 15,
    time: "07:30",
    minimum: "Walk for two minutes",
    goal: "Feel stronger every day",
  },
  Learning: {
    title: "Learn something new",
    minutes: 20,
    time: "09:00",
    minimum: "Read one page",
    goal: "Make room for curiosity",
  },
  Career: {
    title: "Build your next chapter",
    minutes: 25,
    time: "10:00",
    minimum: "Write down one next step",
    goal: "Invest in your future",
  },
  Wellbeing: {
    title: "Take a screen-free break",
    minutes: 10,
    time: "18:00",
    minimum: "Put your phone down for one minute",
    goal: "Be more present",
  },
};
export function suggestedItem(category: Category): Item {
  return {
    ...suggestions[category],
    id: uid(),
    kind: "habit",
    category,
    days: [0, 1, 2, 3, 4, 5, 6],
    date: dayKey(),
    completed: [],
    archived: false,
  };
}

// Local storage keeps the active commitment and device-bound picker tokens.
export function parseStoredData(raw: string): Data {
  const d = JSON.parse(raw);
  const text = (v: unknown, max = 2000) =>
    typeof v === "string" && v.length <= max;
  const date = (v: unknown) =>
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    dayKey(new Date(v + "T12:00:00")) === v;
  const list = (v: unknown, max: number) => Array.isArray(v) && v.length <= max;
  const session = (s: any) =>
    s &&
    text(s.id, 100) &&
    text(s.title, 120) &&
    (s.itemId === undefined || text(s.itemId, 100)) &&
    Number.isFinite(s.start) &&
    Number.isFinite(s.end) &&
    s.start > 0 &&
    s.end > s.start &&
    s.end - s.start <= 180 * 60_000 &&
    list(s.apps, 4_000) &&
    s.apps.every((a: unknown) => text(a, 512)) &&
    (s.platform === undefined ||
      ["android", "ios", "preview"].includes(s.platform)) &&
    (s.protection === undefined ||
      ["timerOnly", "device"].includes(s.protection)) &&
    (s.selection === undefined || validSelection(s.selection));
  if (
    !d ||
    ![1, 2].includes(d.version) ||
    typeof d.onboarded !== "boolean" ||
    !text(d.name, 40) ||
    !list(d.priorities, 4) ||
    !d.priorities.every((c: any) => categories.includes(c)) ||
    !["Gentle", "Balanced", "Direct"].includes(d.tone) ||
    !["System", "Light", "Dark"].includes(d.appearance) ||
    !list(d.items, 2000) ||
    !list(d.sessions, 20000) ||
    !list(d.reflections, 10000)
  )
    throw new Error("This is not a supported Momentum backup.");
  if (d.version === 1) {
    if (
      !list(d.blockedApps, 30) ||
      !d.blockedApps.every((app: unknown) => text(app, 80))
    ) {
      throw new Error("The backup contains invalid distraction settings.");
    }
  } else if (!validSelection(d.selection) || !validMinutes(d.focusMinutes)) {
    throw new Error("The backup contains invalid distraction settings.");
  }
  if (
    !d.items.every(
      (i: any) =>
        i &&
        text(i.id, 100) &&
        text(i.title, 120) &&
        i.title.trim() &&
        ["habit", "task"].includes(i.kind) &&
        categories.includes(i.category) &&
        Number.isInteger(i.minutes) &&
        i.minutes >= 1 &&
        i.minutes <= 180 &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(i.time) &&
        list(i.days, 7) &&
        i.days.every((n: any) => Number.isInteger(n) && n >= 0 && n <= 6) &&
        (i.kind !== "habit" || i.days.length > 0) &&
        date(i.date) &&
        text(i.minimum, 200) &&
        text(i.goal, 200) &&
        list(i.completed, 20000) &&
        i.completed.every(date) &&
        typeof i.archived === "boolean",
    ) ||
    new Set(d.items.map((i: Item) => i.id)).size !== d.items.length
  )
    throw new Error("The backup contains invalid plans.");
  if (
    !d.sessions.every(session) ||
    (d.active !== null && !session(d.active)) ||
    new Set(d.sessions.map((s: Session) => s.id)).size !== d.sessions.length
  )
    throw new Error("The backup contains invalid sessions.");
  if (
    !d.reflections.every(
      (r: any) =>
        r &&
        date(r.date) &&
        text(r.wentWell) &&
        text(r.obstacle) &&
        text(r.tomorrow) &&
        ["Great", "Okay", "Tough"].includes(r.mood),
    )
  )
    throw new Error("The backup contains invalid reflections.");
  if (d.version === 1) {
    // Display names in v1 were mock choices. They cannot identify installed apps.
    const previewAppIds = [
      ...new Set(d.blockedApps.filter((id: string) => id.trim())),
    ];
    delete d.blockedApps;
    d.version = 2;
    d.selection = { androidApps: [], ios: null, previewAppIds };
    d.focusMinutes = 25;
    // Data claiming to be v1 must never turn on native enforcement.
    for (const s of d.active ? [...d.sessions, d.active] : d.sessions) {
      delete s.selection;
      delete s.platform;
      delete s.protection;
    }
  }
  return d as Data;
}

// iOS picker tokens and active timers are installation-specific. Apply this on
// import as well as export, including backups assembled outside Momentum.
export function portableBackup(data: Data): Data {
  return {
    ...data,
    active: null,
    selection: { ...data.selection, ios: null },
    sessions: data.sessions.map((session) => {
      const history = { ...session };
      delete history.selection;
      return history;
    }),
  };
}
export function parseBackup(raw: string): Data {
  if (raw.length > 5_000_000)
    throw new Error("This backup is too large (maximum 5 MB).");
  return portableBackup(parseStoredData(raw));
}
