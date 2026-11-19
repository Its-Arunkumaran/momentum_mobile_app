package expo.modules.momentumdistractions

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.telecom.TelecomManager
import android.util.Base64
import java.io.ByteArrayOutputStream
import java.text.Collator

internal object AppCatalog {
  private const val ICON_SIZE_PX = 64
  private val homeIntent get() = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)

  private fun query(manager: PackageManager, intent: Intent): List<ResolveInfo> =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      manager.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
    } else {
      @Suppress("DEPRECATION")
      manager.queryIntentActivities(intent, 0)
    }

  private fun launchers(context: Context): List<ResolveInfo> {
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    return query(context.packageManager, intent)
      .filter { it.activityInfo.exported && it.activityInfo.packageName != context.packageName }
      .distinctBy { it.activityInfo.packageName }
  }

  fun launchablePackages(context: Context): Set<String> =
    launchers(context).mapTo(mutableSetOf()) { it.activityInfo.packageName }

  fun essentialPackages(context: Context): Set<String> = buildSet {
    val manager = context.packageManager
    add(context.packageName)
    add("android")
    add("com.android.systemui")
    add("com.android.permissioncontroller")
    add("com.google.android.permissioncontroller")
    add("com.android.emergency")
    add("com.google.android.apps.safetyhub")
    val telecom = context.getSystemService(TelecomManager::class.java)
    telecom?.defaultDialerPackage?.let(::add)
    telecom?.systemDialerPackage?.let(::add)
    val intents = listOf(homeIntent, Intent(Settings.ACTION_SETTINGS),
      Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS), Intent(Intent.ACTION_DIAL, Uri.parse("tel:")),
      Intent("android.intent.action.EMERGENCY_DIAL"), Intent("android.telephony.action.EMERGENCY_ASSISTANCE"),
      Intent(Intent.ACTION_DELETE, Uri.fromParts("package", context.packageName, null)))
    for (intent in intents) query(manager, intent).forEach { add(it.activityInfo.packageName) }
  }

  fun list(context: Context): List<Map<String, Any>> {
    val manager = context.packageManager
    val essential = essentialPackages(context)
    val collator = Collator.getInstance()
    return launchers(context).map { activity ->
      val id = activity.activityInfo.packageName
      val name = try {
        activity.activityInfo.applicationInfo.loadLabel(manager).toString().trim().ifEmpty { id }
      } catch (_: RuntimeException) {
        id // An app can be uninstalled during discovery.
      }
      buildMap<String, Any> {
        put("id", id)
        put("name", name)
        if (id in essential) put("restrictionUnavailable", true)
        iconUri(manager, activity)?.let { put("iconUri", it) }
      }
    }.sortedWith { left, right ->
      val byName = collator.compare(left.getValue("name"), right.getValue("name"))
      if (byName != 0) byName else left.getValue("id").toString().compareTo(right.getValue("id").toString())
    }
  }

  private fun iconUri(manager: PackageManager, activity: ResolveInfo): String? {
    return try {
      val icon = activity.loadIcon(manager).mutate()
      val bitmap = Bitmap.createBitmap(ICON_SIZE_PX, ICON_SIZE_PX, Bitmap.Config.ARGB_8888)
      try {
        icon.setBounds(0, 0, ICON_SIZE_PX, ICON_SIZE_PX)
        icon.draw(Canvas(bitmap))
        ByteArrayOutputStream().use { output ->
          if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) return null
          "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
        }
      } finally {
        bitmap.recycle()
      }
    } catch (_: RuntimeException) {
      null // Keep apps with missing artwork selectable.
    }
  }
}
