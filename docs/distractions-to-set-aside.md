# Distractions to Set Aside

## Product behavior

The Focus screen stores a preferred duration and a platform-specific app selection on the device. Starting a commitment takes an immutable snapshot of both. The timer cannot be paused or ended early in Momentum. Device protection is optional only when the operating system cannot provide it or the user explicitly chooses timer-only mode at review time.

Expo Go and web cannot load the custom native module. They show an explicitly labelled sample selector and run timer-only sessions. App discovery and enforcement require a development or production build.

## Component structure

```text
src/app/focus.tsx
├── SelectionCard
│   ├── Android / native: AppPicker modal
│   │   └── AppRow + Switch (one per launchable app)
│   ├── iOS / native: Apple FamilyActivityPicker
│   └── Expo Go / web: labelled sample AppPicker
├── commitment review sheet
└── active-session dashboard
```

- `src/components/distractions/selection-card.tsx` binds the persisted selection to the appropriate platform UI.
- `src/components/distractions/app-picker.tsx` provides search, selected-only filtering, refresh, and a virtualized installed-app list.
- `src/components/distractions/app-row.tsx` provides the accessible one-tap switch and active/inactive styling.
- `src/lib/distractions/device.ts` is the typed boundary between React Native and the native module.
- `src/lib/distractions/use-protection.ts` re-checks real protection state on foreground and while a protected session runs. The UI never infers protection from the timer alone.

The distraction components use `twrnc` for the dark dashboard surfaces, spacing, rows, and state styling. Colors come from Momentum's shared palette so light/dark theme behavior remains consistent with the rest of the product.

## Local state

`src/lib/model.ts` owns the serializable state and pure transitions. `src/lib/store.tsx` persists it with AsyncStorage.

```text
Data.selection
├── androidApps[]: packageName + cached label
├── ios: opaque encoded FamilyActivitySelection + non-identifying counts
└── previewAppIds[]: samples only; never treated as enforceable

Data.focusMinutes: 1–180
Data.active
├── start/end and task metadata
├── platform + protection mode
└── frozen selection snapshot
```

Selection and duration changes are rejected while a session is active. Versioned parsing migrates the previous name-only choices to preview choices. Export omits the active session and iOS Screen Time token; Apple's token is device-private and must be chosen again after restore.

## Android implementation

`modules/momentum-distractions/android` is an Expo local module.

- Discovery queries activities with `MAIN` + `LAUNCHER`, deduplicates by package name, loads labels/icons dynamically, and does not request broad `QUERY_ALL_PACKAGES` access.
- Settings, System UI, Momentum, launchers, dialers, emergency handlers, permission controllers, and uninstall handlers are never eligible for restriction.
- The user sees an in-app disclosure before Momentum opens Accessibility Settings.
- During a protected lease, the accessibility service listens only for window changes from the chosen packages and returns those apps to Home. It does not request view content or inspect text.
- The lease stores both wall-clock and monotonic deadlines, validates selected packages again at start, and clears itself at expiry. Session-scoped stop calls cannot clear a later session.

This use of Accessibility Service requires prominent disclosure, consent, an accurate Play Console declaration, and policy review before release.

## iOS implementation

Apple intentionally does not expose a normal installed-app catalogue to third-party apps. The native module therefore requests individual Family Controls authorization and presents Apple's privacy-preserving `FamilyActivityPicker`. Momentum stores only the opaque encoded selection and item counts; it cannot render app names or icons itself.

Starting protection configures `ManagedSettings` shields and a non-repeating `DeviceActivity` schedule. The generated `MomentumFocusMonitor` app extension independently clears shields when the interval ends. A shared app-group lease and file lock prevent an old callback from clearing a newer commitment. Protected iOS sessions are limited to 15–180 minutes; shorter sessions remain timer-only.

`modules/momentum-distractions/withFocusMonitor.js` adds the Family Controls and app-group entitlements, copies the monitor sources, creates the extension target, and supplies extension signing metadata during Expo prebuild.

## Build and verification

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npx.cmd expo lint
npx.cmd expo prebuild --no-install --clean
npx.cmd expo run:android
```

Use a custom development build, not Expo Go, for installed-app discovery or protection. iOS must be built on macOS/Xcode or EAS with Family Controls capability approval and provisioning for both the host and monitor extension.

Before release, test permission denial/revocation, device reboot, expiry while the app is killed, uninstall during selection, default launcher/dialer changes, daylight-saving changes, and a second session immediately after the first expires.
