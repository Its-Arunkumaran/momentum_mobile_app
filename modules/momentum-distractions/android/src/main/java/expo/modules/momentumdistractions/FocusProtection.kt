package expo.modules.momentumdistractions

import android.content.Context
import android.os.SystemClock

internal data class FocusRule(
  val id: String,
  val end: Long,
  val elapsedEnd: Long,
  val packages: Set<String>
) {
  fun remainingMs(): Long = minOf(end - System.currentTimeMillis(), elapsedEnd - SystemClock.elapsedRealtime())
}

internal object FocusProtection {
  private const val MAX_DURATION_MS = 180L * 60 * 1000
  fun preferences(context: Context) = context.getSharedPreferences("momentum_focus_rule", Context.MODE_PRIVATE)

  @Synchronized
  fun activeRule(context: Context): FocusRule? {
    val preferences = preferences(context)
    val id = preferences.getString("id", null) ?: return null
    val rule = FocusRule(id, preferences.getLong("end", 0), preferences.getLong("elapsedEnd", 0),
      preferences.getStringSet("packages", emptySet()).orEmpty())
    return rule.takeIf { it.remainingMs() > 0 && it.packages.isNotEmpty() }
  }

  @Synchronized
  fun start(context: Context, id: String, end: Double, packages: List<String>) {
    require(id.isNotBlank() && id.length <= 100) { "Invalid focus session." }
    val duration = end.toLong() - System.currentTimeMillis()
    require(end.isFinite() && duration in 1..MAX_DURATION_MS) { "Invalid focus duration." }
    check(FocusAccessibilityService.connected) { "Enable Momentum focus protection in Accessibility settings first." }
    val selected = packages.toSet()
    require(selected.isNotEmpty()) { "Select at least one app to restrict." }
    val eligible = AppCatalog.launchablePackages(context) - AppCatalog.essentialPackages(context)
    require(eligible.containsAll(selected)) { "An app is unavailable or essential to your device. Refresh your selection." }
    val active = activeRule(context)
    if (active != null) {
      check(active.id == id && active.end == end.toLong() && active.packages == selected) {
        "A different focus commitment is still active."
      }
      return
    }
    check(preferences(context).edit().clear()
      .putString("id", id).putLong("end", end.toLong())
      .putLong("elapsedEnd", SystemClock.elapsedRealtime() + duration)
      .putStringSet("packages", selected).commit()) { "Could not save focus protection." }
  }

  @Synchronized
  fun stop(context: Context, id: String) {
    val preferences = preferences(context)
    if (preferences.getString("id", null) == id) {
      check(preferences.edit().clear().commit()) { "Could not clear focus protection." }
    }
  }
}
