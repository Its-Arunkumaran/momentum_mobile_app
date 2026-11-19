package expo.modules.momentumdistractions

import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MomentumDistractionsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("MomentumDistractions")

    AsyncFunction("listInstalledApps") {
      AppCatalog.list(context)
    }

    AsyncFunction("getProtectionStatusAsync") {
      when {
        FocusAccessibilityService.connected -> "ready"
        settingsIntent().resolveActivity(context.packageManager) != null -> "permissionRequired"
        else -> "unavailable"
      }
    }

    AsyncFunction("openProtectionSettingsAsync") {
      val intent = settingsIntent()
      check(intent.resolveActivity(context.packageManager) != null) { "Accessibility settings are unavailable." }
      context.startActivity(intent)
    }

    AsyncFunction("startProtectionAsync") { sessionId: String, end: Double, packageIds: List<String> ->
      FocusProtection.start(context, sessionId, end, packageIds)
    }

    AsyncFunction("isProtectionActiveAsync") { sessionId: String ->
      FocusAccessibilityService.connected && FocusProtection.activeRule(context)?.id == sessionId
    }

    AsyncFunction("stopProtectionAsync") { sessionId: String ->
      FocusProtection.stop(context, sessionId)
    }
  }

  private fun settingsIntent() =
    Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
}
