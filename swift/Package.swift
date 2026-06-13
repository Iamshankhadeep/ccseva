// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "CCSeva",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "CCSeva", targets: ["CCSeva"])
    ],
    targets: [
        .executableTarget(
            name: "CCSeva",
            path: "Sources/CCSeva"
        )
    ]
)
