const fs = require("node:fs/promises");
const path = require("node:path");
const plist = require("@expo/plist").default;
const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");

const targetName = "MomentumFocusMonitor";
const swiftFiles = ["MomentumFocusMonitor.swift", "SharedFocusProtection.swift"];
const familyControls = "com.apple.developer.family-controls";
const appGroups = "com.apple.security.application-groups";

function configureProject(project, extensionId, version, buildNumber) {
  const objects = project.hash.project.objects;
  let target = Object.values(objects.PBXNativeTarget).find(
    (value) => value.name?.replaceAll('"', "") === targetName,
  );
  if (!target) {
    // xcode's target creation only creates a dependency if both sections exist.
    objects.PBXTargetDependency ??= {};
    objects.PBXContainerItemProxy ??= {};
    const result = project.addTarget(targetName, "app_extension", targetName, extensionId);
    target = result.pbxNativeTarget;
    const group = project.addPbxGroup([], targetName, targetName);
    project.addToPbxGroup(group.uuid, project.getFirstProject().firstProject.mainGroup);
    project.addBuildPhase([], "PBXSourcesBuildPhase", "Sources", result.uuid);
    for (const filename of swiftFiles) {
      project.addSourceFile(filename, { target: result.uuid }, group.uuid);
    }
  }

  const extensionConfigs = objects.XCConfigurationList[target.buildConfigurationList].buildConfigurations;
  const host = project.getFirstTarget().firstTarget;
  const hostConfigs = objects.XCConfigurationList[host.buildConfigurationList].buildConfigurations;
  for (const { value } of extensionConfigs) {
    const build = objects.XCBuildConfiguration[value];
    const hostBuild = hostConfigs.map((ref) => objects.XCBuildConfiguration[ref.value])
      .find((config) => config.name === build.name)?.buildSettings ?? {};
    Object.assign(build.buildSettings, {
      PRODUCT_BUNDLE_IDENTIFIER: extensionId,
      INFOPLIST_FILE: targetName + "/Info.plist",
      CODE_SIGN_ENTITLEMENTS: targetName + "/FocusMonitor.entitlements",
      APPLICATION_EXTENSION_API_ONLY: "YES",
      TARGETED_DEVICE_FAMILY: '"1,2"',
      IPHONEOS_DEPLOYMENT_TARGET: hostBuild.IPHONEOS_DEPLOYMENT_TARGET ?? "16.4",
      SWIFT_VERSION: "5.0",
      MARKETING_VERSION: version,
      CURRENT_PROJECT_VERSION: buildNumber,
    });
    if (hostBuild.DEVELOPMENT_TEAM) build.buildSettings.DEVELOPMENT_TEAM = hostBuild.DEVELOPMENT_TEAM;
  }
  return project;
}

module.exports = function withFocusMonitor(config) {
  const bundleId = config.ios?.bundleIdentifier;
  if (!bundleId) throw new Error("Set expo.ios.bundleIdentifier to configure Momentum Screen Time.");
  const extensionId = bundleId + "." + targetName;
  const group = "group." + bundleId + ".focus";
  const entitlements = { [familyControls]: true, [appGroups]: [group] };
  const main = config.ios.entitlements ?? {};
  config.ios.entitlements = {
    ...main,
    [familyControls]: true,
    [appGroups]: [...new Set([...(main[appGroups] ?? []), group])],
  };
  config.ios.infoPlist = { ...config.ios.infoPlist, MomentumFocusAppGroup: group };

  // Expo Build uses this list when provisioning extension signing profiles.
  config.extra ??= {};
  config.extra.eas ??= {};
  config.extra.eas.build ??= {};
  config.extra.eas.build.experimental ??= {};
  const signing = (config.extra.eas.build.experimental.ios ??= {});
  signing.appExtensions = [
    ...(signing.appExtensions ?? []).filter((ext) => ext.targetName !== targetName),
    { targetName, bundleIdentifier: extensionId, entitlements },
  ];

  const version = config.version ?? "1.0.0";
  const buildNumber = config.ios.buildNumber ?? "1";
  config = withDangerousMod(config, ["ios", async (mod) => {
    const destination = path.join(mod.modRequest.platformProjectRoot, targetName);
    await fs.mkdir(destination, { recursive: true });
    await Promise.all([
      fs.copyFile(path.join(__dirname, "monitor", swiftFiles[0]), path.join(destination, swiftFiles[0])),
      fs.copyFile(path.join(__dirname, "ios", swiftFiles[1]), path.join(destination, swiftFiles[1])),
      fs.writeFile(path.join(destination, "FocusMonitor.entitlements"), plist.build(entitlements)),
      fs.writeFile(path.join(destination, "Info.plist"), plist.build({
        CFBundleDisplayName: "Momentum Focus Monitor",
        CFBundleExecutable: "$(EXECUTABLE_NAME)",
        CFBundleIdentifier: "$(PRODUCT_BUNDLE_IDENTIFIER)",
        CFBundleInfoDictionaryVersion: "6.0",
        CFBundleName: "$(PRODUCT_NAME)",
        CFBundlePackageType: "XPC!",
        CFBundleShortVersionString: "$(MARKETING_VERSION)",
        CFBundleVersion: "$(CURRENT_PROJECT_VERSION)",
        MomentumFocusAppGroup: group,
        NSExtension: {
          NSExtensionPointIdentifier: "com.apple.deviceactivity.monitor-extension",
          NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).MomentumFocusMonitor",
        },
      })),
    ]);
    return mod;
  }]);
  return withXcodeProject(config, (mod) => {
    configureProject(mod.modResults, extensionId, version, buildNumber);
    return mod;
  });
};
