import Darwin
import DeviceActivity
import Foundation
import ManagedSettings

// Compiled into both targets. Serialize changes to the named store and its owner
// so a late end callback can never remove the next session's shields.
struct FocusLease: Codable {
  let sessionId: String
  let end: Date
}

enum FocusProtectionError: String, LocalizedError {
  case unavailable = "The focus monitor is unavailable in this build."
  case storage = "Momentum could not access the shared focus session."
  case busy = "Another focus session is already protecting this device."
  case duration = "Choose 15–180 minutes to protect apps with Screen Time."
  case permission = "Allow Screen Time access to protect this session."
  case selection = "Choose your apps in the Screen Time picker again."
  case limit = "Screen Time supports up to 50 apps, 50 categories and 50 websites in a session."
  case expired = "This focus session has already ended."
  var errorDescription: String? { rawValue }
}

enum SharedFocusProtection {
  static let activityPrefix = "momentum.focus."
  static var store: ManagedSettingsStore { ManagedSettingsStore(named: .init("momentum.focus")) }

  static var directory: URL? {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "MomentumFocusAppGroup") as? String else {
      return nil
    }
    return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
  }

  static func withLock<T>(_ operation: (URL) throws -> T) throws -> T {
    guard let directory else { throw FocusProtectionError.unavailable }
    let descriptor = open(directory.appendingPathComponent("focus.lock").path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard descriptor >= 0 else { throw FocusProtectionError.storage }
    defer { close(descriptor) }
    guard flock(descriptor, LOCK_EX) == 0 else { throw FocusProtectionError.storage }
    defer { flock(descriptor, LOCK_UN) }
    return try operation(directory.appendingPathComponent("focus-session.json"))
  }

  static func read(_ file: URL) throws -> FocusLease? {
    guard FileManager.default.fileExists(atPath: file.path) else { return nil }
    return try JSONDecoder().decode(FocusLease.self, from: Data(contentsOf: file))
  }

  static func clear(_ file: URL) throws {
    store.clearAllSettings()
    if FileManager.default.fileExists(atPath: file.path) {
      try FileManager.default.removeItem(at: file)
    }
  }

  static func clearOwned(by id: String) throws {
    try withLock { file in
      guard let lease = try read(file), lease.sessionId == id else { return }
      try clear(file)
    }
  }

  static func liveLease(_ file: URL) throws -> FocusLease? {
    guard let lease = try read(file) else { return nil }
    if lease.end > Date() { return lease }
    try clear(file)
    return nil
  }
}
