import Foundation

/// Resolves SwiftPM resources in both execution modes:
/// - packaged app: Contents/Resources/CCSeva_CCSeva.bundle
/// - direct SwiftPM executable/tests: generated Bundle.module location
enum CCSevaResources {
    static let bundle: Bundle = {
        if let resourceURL = Bundle.main.resourceURL,
           let packagedBundle = Bundle(
               url: resourceURL.appendingPathComponent("CCSeva_CCSeva.bundle", isDirectory: true)
           )
        {
            return packagedBundle
        }
        return Bundle.module
    }()
}
