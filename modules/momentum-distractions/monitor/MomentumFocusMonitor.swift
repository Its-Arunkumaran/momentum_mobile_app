import DeviceActivity

final class MomentumFocusMonitor: DeviceActivityMonitor {
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    let name = activity.rawValue
    guard name.hasPrefix(SharedFocusProtection.activityPrefix) else { return }
    let sessionId = String(name.dropFirst(SharedFocusProtection.activityPrefix.count))
    try? SharedFocusProtection.clearOwned(by: sessionId)
  }
}
