Pod::Spec.new do |s|
  s.name = 'MomentumDistractions'
  s.version = '1.0.0'
  s.summary = 'Momentum Screen Time selection and session shields'
  s.author = 'Momentum'
  s.homepage = 'https://developer.apple.com/documentation/familycontrols'
  s.license = 'MIT'
  s.platform = :ios, '16.4'
  s.source = { :path => '.' }
  s.static_framework = true
  s.source_files = '*.swift'
  s.frameworks = 'DeviceActivity', 'FamilyControls', 'ManagedSettings', 'SwiftUI', 'UIKit'
  s.swift_version = '5.9'
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
