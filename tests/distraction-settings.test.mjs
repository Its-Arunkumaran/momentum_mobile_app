import assert from "node:assert/strict";
import { test } from "node:test";
import {
  finishExpired,
  initialData,
  parseBackup,
  parseStoredData,
  portableBackup,
  setAndroidAppSelected,
  setFocusMinutes,
  setIOSSelection,
  setPreviewAppSelected,
  startFocusSession,
} from "../src/lib/model.ts";

const books = { packageName: "com.example.books", label: "Reader" };
const news = { packageName: "com.example.news", label: "Reader" };
const ios = {
  encoded: "private-local-token",
  appCount: 2,
  categoryCount: 1,
  webDomainCount: 0,
};
const session = { title: "Read a chapter", minutes: 12, id: "session-id" };

test("migrates v1 names to preview choices only and preserves the active timer and history", () => {
  const legacy = {
    ...initialData(),
    version: 1,
    blockedApps: ["YouTube", "My Custom App", "YouTube"],
  };
  delete legacy.selection;
  delete legacy.focusMinutes;
  legacy.active = {
    id: "old",
    title: "Work",
    start: 1000,
    end: 61000,
    apps: ["Instagram"],
  };
  legacy.sessions = [{ ...legacy.active, id: "older" }];
  const migrated = parseStoredData(JSON.stringify(legacy));
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.selection, {
    androidApps: [],
    ios: null,
    previewAppIds: ["YouTube", "My Custom App"],
  });
  assert.equal(migrated.focusMinutes, 25);
  assert.deepEqual(migrated.active, legacy.active);
  assert.deepEqual(migrated.sessions, legacy.sessions);
  assert.equal(migrated.blockedApps, undefined);
});

test("same-name Android apps stay independent and idempotent toggles preserve other settings", () => {
  let data = setFocusMinutes(initialData(), 7);
  data = setAndroidAppSelected(data, books, true);
  assert.equal(setAndroidAppSelected(data, books, true), data);
  data = setAndroidAppSelected(data, news, true);
  data = setAndroidAppSelected(data, books, false);
  const reloaded = parseStoredData(JSON.stringify(data));
  assert.equal(reloaded.focusMinutes, 7);
  assert.deepEqual(reloaded.selection.androidApps, [news]);
  assert.equal(setFocusMinutes(data, 181), data);
});

test("active timers take a platform-specific snapshot and lock further selection and duration changes", () => {
  let data = setAndroidAppSelected(initialData(), books, true);
  data = setIOSSelection(data, ios);
  data = setPreviewAppSelected(data, "YouTube", true);
  const android = startFocusSession(
    data,
    { ...session, platform: "android", protection: "device" },
    1000,
  );
  assert.deepEqual(android.active.selection, {
    androidApps: [books],
    ios: null,
    previewAppIds: [],
  });
  assert.deepEqual(android.active.apps, ["Reader"]);
  assert.equal(android.active.id, session.id);
  assert.equal(android.active.protection, "device");
  assert.equal(android.active.end, 721000);
  assert.equal(setAndroidAppSelected(android, news, true), android);
  assert.equal(setFocusMinutes(android, 35), android);
  assert.equal(
    startFocusSession(android, { ...session, platform: "preview" }),
    android,
  );
  const preview = startFocusSession(
    data,
    { ...session, platform: "preview" },
    1000,
  );
  assert.deepEqual(preview.active.selection, {
    androidApps: [],
    ios: null,
    previewAppIds: ["YouTube"],
  });
  assert.deepEqual(preview.active.apps, ["YouTube"]);
  assert.equal(preview.active.protection, "timerOnly");
  assert.equal(setPreviewAppSelected(preview, "YouTube", false), preview);
});

test("iOS tokens survive an app restart, stay out of backups, and are removed from completed history", () => {
  const selected = setIOSSelection(initialData(), ios);
  const active = startFocusSession(
    selected,
    { ...session, platform: "ios" },
    1000,
  );
  const reloaded = parseStoredData(JSON.stringify(active));
  assert.deepEqual(reloaded.active, JSON.parse(JSON.stringify(active.active)));
  assert.deepEqual(reloaded.active.apps, ["2 apps, 1 category"]);
  assert.equal(setIOSSelection(reloaded, null), reloaded);
  const completed = finishExpired(reloaded, 800000);
  assert.equal(completed.sessions[0].selection, undefined);
  assert.equal(
    JSON.stringify(portableBackup(completed)).includes(ios.encoded),
    false,
  );
  // A manually assembled file must not start a timer or restore iOS tokens.
  const restored = parseBackup(
    JSON.stringify({ ...active, sessions: [active.active] }),
  );
  assert.equal(restored.active, null);
  assert.equal(restored.selection.ios, null);
  assert.equal(restored.sessions[0].selection, undefined);
  assert.equal(restored.focusMinutes, 12);
});

test("reject malformed selections and out-of-range saved durations before restore", () => {
  const base = initialData();
  for (const selection of [
    { ...base.selection, androidApps: [books, books] },
    {
      ...base.selection,
      androidApps: [{ ...books, packageName: "com.example/unsafe" }],
    },
    { ...base.selection, ios: { ...ios, appCount: -1 } },
    { ...base.selection, previewAppIds: [42] },
  ])
    assert.throws(() => parseBackup(JSON.stringify({ ...base, selection })));
  assert.throws(() =>
    parseBackup(JSON.stringify({ ...base, focusMinutes: 0 })),
  );
});
