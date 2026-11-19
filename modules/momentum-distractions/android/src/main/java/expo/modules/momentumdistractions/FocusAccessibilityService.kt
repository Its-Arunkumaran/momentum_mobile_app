package expo.modules.momentumdistractions

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent

class FocusAccessibilityService : AccessibilityService(), SharedPreferences.OnSharedPreferenceChangeListener {
  companion object {
    @Volatile
    internal var connected = false
      private set
  }

  private val handler = Handler(Looper.getMainLooper())
  private val refresh = Runnable { applyRule() }

  override fun onServiceConnected() {
    super.onServiceConnected()
    FocusProtection.preferences(this).registerOnSharedPreferenceChangeListener(this)
    applyRule()
    connected = true
  }

  private fun applyRule() {
    handler.removeCallbacks(refresh)
    val rule = FocusProtection.activeRule(this)
    val configuration = serviceInfo ?: return
    configuration.eventTypes = if (rule == null) 0 else AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
    configuration.packageNames = rule?.packages?.toTypedArray() ?: arrayOf(packageName)
    serviceInfo = configuration
    if (rule != null) handler.postDelayed(refresh, rule.remainingMs().coerceAtLeast(1))
  }

  override fun onSharedPreferenceChanged(preferences: SharedPreferences, key: String?) {
    // One settings transaction can update several keys. Apply its final state once.
    handler.removeCallbacks(refresh)
    handler.post(refresh)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val opened = event.packageName?.toString() ?: return
    val rule = FocusProtection.activeRule(this) ?: return
    if (opened !in rule.packages) return
    // Handles changes of default launcher/dialer mid-session. If the OS cannot
    // resolve its essential roles, leave the app accessible.
    val essential = try { AppCatalog.essentialPackages(this) } catch (_: RuntimeException) { return }
    if (opened !in essential && rule.remainingMs() > 0) performGlobalAction(GLOBAL_ACTION_HOME)
  }

  override fun onInterrupt() = Unit

  private fun disconnect() {
    connected = false
    handler.removeCallbacks(refresh)
    FocusProtection.preferences(this).unregisterOnSharedPreferenceChangeListener(this)
  }

  override fun onUnbind(intent: Intent?): Boolean {
    disconnect()
    return super.onUnbind(intent)
  }

  override fun onDestroy() {
    disconnect()
    super.onDestroy()
  }
}
