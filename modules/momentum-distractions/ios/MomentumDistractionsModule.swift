import DeviceActivity
import ExpoModulesCore
import FamilyControls
import ManagedSettings
import SwiftUI
import UIKit

private func authorizationStatus() -> String {
  let status = AuthorizationCenter.shared.authorizationStatus
  if status == .approved { return "approved" }
  if status == .denied { return "denied" }
  return "notDetermined"
}

private func decodeSelection(_ encoded: String?) -> FamilyActivitySelection? {
  guard let encoded, let data = Data(base64Encoded: encoded) else { return nil }
  return try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
}

private struct AppPicker: View {
  @State var selection: FamilyActivitySelection
  let rebuilding: Bool
  let finish: (FamilyActivitySelection?) -> Void

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        if rebuilding {
          Text("Your previous selection is unavailable. Choose the apps to use on this device.")
            .font(.footnote).padding()
        }
        FamilyActivityPicker(selection: $selection)
      }
      .navigationTitle("Distractions to set aside")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { finish(nil) } }
        ToolbarItem(placement: .confirmationAction) { Button("Save") { finish(selection) } }
      }
    }
  }
}

public final class MomentumDistractionsModule: Module {
  @MainActor private var picking = false
  @MainActor private weak var pickerController: UIViewController?

  public func definition() -> ModuleDefinition {
    Name("MomentumDistractions")
    AsyncFunction("getAuthorizationStatusAsync") { () -> String in authorizationStatus() }.runOnQueue(.main)
    AsyncFunction("pickAppsAsync") { (previous: String?, promise: Promise) in
      Task { @MainActor in await self.pick(previous: previous, promise: promise) }
    }
    AsyncFunction("getProtectionStatusAsync") { () throws -> String in
      // Reconcile a session that elapsed while the phone was asleep.
      guard Self.monitorAvailable else { return "unavailable" }
      try SharedFocusProtection.withLock { file in _ = try SharedFocusProtection.liveLease(file) }
      return authorizationStatus() == "approved" ? "ready" : "permissionRequired"
    }.runOnQueue(.main)
    AsyncFunction("startProtectionAsync") { (id: String, endMs: Double, encoded: String) in
      try Self.start(id: id, endMs: endMs, encoded: encoded)
    }.runOnQueue(.main)
    AsyncFunction("isProtectionActiveAsync") { (id: String) throws -> Bool in
      guard Self.monitorAvailable, authorizationStatus() == "approved" else { return false }
      let monitor = DeviceActivityName(SharedFocusProtection.activityPrefix + id)
      guard DeviceActivityCenter().activities.contains(monitor) else { return false }
      return try SharedFocusProtection.withLock { file in
        guard try SharedFocusProtection.liveLease(file)?.sessionId == id else { return false }
        let shield = SharedFocusProtection.store.shield
        return !(shield.applications ?? []).isEmpty || shield.applicationCategories != nil
          || !(shield.webDomains ?? []).isEmpty || shield.webDomainCategories != nil
      }
    }.runOnQueue(.main)
    AsyncFunction("stopProtectionAsync") { (id: String) in
      try SharedFocusProtection.clearOwned(by: id)
      DeviceActivityCenter().stopMonitoring([DeviceActivityName(SharedFocusProtection.activityPrefix + id)])
    }.runOnQueue(.main)
  }

  @MainActor private func pick(previous: String?, promise: Promise) async {
    guard !picking else { promise.reject("ERR_PICKER_BUSY", "The app picker is already open."); return }
    picking = true
    let previouslyAuthorized = authorizationStatus() == "approved"
    do {
      if !previouslyAuthorized { try await AuthorizationCenter.shared.requestAuthorization(for: .individual) }
      guard authorizationStatus() == "approved" else { throw FocusProtectionError.permission }
      guard let presenter = appContext?.utilities?.currentViewController(),
            presenter.viewIfLoaded?.window != nil,
            presenter.presentedViewController == nil else { throw FocusProtectionError.unavailable }

      // Apple voids tokens when access is revoked. A newly authorized user
      // chooses again, even if the old payload can still be decoded.
      let restored = previouslyAuthorized ? decodeSelection(previous) : nil
      let picker = AppPicker(
        selection: restored ?? FamilyActivitySelection(),
        rebuilding: previous != nil && restored == nil
      ) { [weak self] selection in
        guard let self, let controller = self.pickerController else { return }
        self.pickerController = nil
        controller.dismiss(animated: true) {
          self.picking = false
          guard let selection else { promise.resolve(); return }
          do {
            let encoded = try PropertyListEncoder().encode(selection)
            let result: [String: Any] = [
              "selection": encoded.base64EncodedString(),
              "applicationCount": selection.applicationTokens.count,
              "categoryCount": selection.categoryTokens.count,
              "webDomainCount": selection.webDomainTokens.count
            ]
            promise.resolve(result)
          } catch { promise.reject(error) }
        }
      }
      let controller = UIHostingController(rootView: picker)
      controller.modalPresentationStyle = .pageSheet
      controller.isModalInPresentation = true
      pickerController = controller
      presenter.present(controller, animated: true)
    } catch {
      picking = false
      promise.reject("ERR_SCREEN_TIME_PICKER", error.localizedDescription)
    }
  }

  private static var monitorAvailable: Bool {
    guard let plugins = Bundle.main.builtInPlugInsURL, SharedFocusProtection.directory != nil else { return false }
    return Bundle(url: plugins.appendingPathComponent("MomentumFocusMonitor.appex")) != nil
  }

  private static func start(id: String, endMs: Double, encoded: String) throws {
    guard monitorAvailable else { throw FocusProtectionError.unavailable }
    guard authorizationStatus() == "approved" else { throw FocusProtectionError.permission }
    guard let selection = decodeSelection(encoded) else { throw FocusProtectionError.selection }
    let counts = [selection.applicationTokens.count, selection.categoryTokens.count, selection.webDomainTokens.count]
    guard counts.contains(where: { $0 > 0 }) else { throw FocusProtectionError.selection }
    guard counts.allSatisfy({ $0 <= 50 }) else { throw FocusProtectionError.limit }
    let end = Date(timeIntervalSince1970: endMs / 1000)
    // Allow the fraction of a second spent crossing the JS/native boundary.
    guard endMs.isFinite, end.timeIntervalSinceNow >= 899, end.timeIntervalSinceNow <= 10801 else {
      throw FocusProtectionError.duration
    }
    let lease = try SharedFocusProtection.withLock { try SharedFocusProtection.liveLease($0) }
    if let lease {
      if lease.sessionId == id { return }
      throw FocusProtectionError.busy
    }
    let center = DeviceActivityCenter()
    let oldActivities = center.activities.filter { $0.rawValue.hasPrefix(SharedFocusProtection.activityPrefix) }
    if !oldActivities.isEmpty { center.stopMonitoring(oldActivities) }
    let name = DeviceActivityName(SharedFocusProtection.activityPrefix + id)
    let calendar = Calendar.current
    let fields: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second, .timeZone]
    let start = min(Date(), end.addingTimeInterval(-900))
    let schedule = DeviceActivitySchedule(
      intervalStart: calendar.dateComponents(fields, from: start),
      intervalEnd: calendar.dateComponents(fields, from: end),
      repeats: false
    )
    // Never apply a shield before the OS accepts the independent expiry schedule.
    try center.startMonitoring(name, during: schedule)
    do {
      try SharedFocusProtection.withLock { file in
        guard end > Date() else { throw FocusProtectionError.expired }
        let state = FocusLease(sessionId: id, end: end)
        try JSONEncoder().encode(state).write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        let store = SharedFocusProtection.store
        store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
        store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
        store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
        store.shield.webDomainCategories = selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
      }
    } catch {
      center.stopMonitoring([name])
      throw error
    }
  }
}
