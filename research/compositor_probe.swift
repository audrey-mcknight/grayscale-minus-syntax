// Isolated feasibility probe. It reads no other app's content and never captures the screen.
// Default: construct temporary offscreen panels and inspect their own layer trees.
// This proves runtime availability/configuration only, not on-screen filtering or energy use.
import AppKit
import QuartzCore

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
var results: [[String: Any]] = []
let materials: [(String, NSVisualEffectView.Material)] = [
    ("sidebar", .sidebar), ("underWindowBackground", .underWindowBackground),
    ("hudWindow", .hudWindow), ("selection", .selection)
]

func inspect(_ layer: CALayer, names: inout [String], filters: inout [String], saturation: inout [NSObject]) {
    names.append(NSStringFromClass(type(of: layer)))
    for filter in layer.filters ?? [] {
        guard let object = filter as? NSObject,
              object.responds(to: NSSelectorFromString("type")),
              let type = object.value(forKey: "type") as? String else { continue }
        filters.append(type)
        if type == "colorSaturate" { saturation.append(object) }
    }
    for child in layer.sublayers ?? [] { inspect(child, names: &names, filters: &filters, saturation: &saturation) }
}

for (name, material) in materials {
    let panel = NSPanel(contentRect: NSRect(x: -20_000, y: -20_000, width: 480, height: 280),
                        styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
    panel.isOpaque = false
    panel.backgroundColor = .clear
    panel.hasShadow = false
    panel.ignoresMouseEvents = true
    panel.isReleasedWhenClosed = false
    let effect = NSVisualEffectView(frame: NSRect(x: 0, y: 0, width: 480, height: 280))
    effect.material = material
    effect.blendingMode = .behindWindow
    effect.state = .active
    effect.wantsLayer = true
    panel.contentView = effect
    panel.orderFrontRegardless()
    effect.layoutSubtreeIfNeeded()
    RunLoop.main.run(until: Date().addingTimeInterval(0.15))
    var names: [String] = [], filters: [String] = [], saturation: [NSObject] = []
    if let layer = effect.layer { inspect(layer, names: &names, filters: &filters, saturation: &saturation) }
    var configured: [Double] = []
    for filter in saturation {
        filter.setValue(0.0, forKey: "inputAmount")
        if let amount = filter.value(forKey: "inputAmount") as? NSNumber { configured.append(amount.doubleValue) }
    }
    let mask = CAShapeLayer()
    let path = CGMutablePath()
    path.addRect(effect.bounds)
    path.addRect(CGRect(x: 100, y: 80, width: 240, height: 100))
    mask.path = path
    mask.fillRule = .evenOdd
    mask.fillColor = NSColor.white.cgColor
    effect.layer?.mask = mask
    results.append([
        "material": name,
        "layerClasses": names,
        "filters": filters,
        "saturationAmountsAfterSettingZero": configured,
        "maskAttached": effect.layer?.mask === mask,
        "onScreenAppearanceVerified": false,
        "crossWindowFilteringVerified": false
    ])
    panel.orderOut(nil)
    panel.close()
}
let report: [String: Any] = [
    "os": ProcessInfo.processInfo.operatingSystemVersionString,
    "screenCaptureUsed": false, "otherAppsInspected": false,
    "offscreenOnly": true, "materials": results,
    "note": "Configuration success is not proof of visible desaturation, functional mask cutouts, sharpness, or battery efficiency."
]
let data = try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys])
print(String(data: data, encoding: .utf8)!)
