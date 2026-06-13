import CoreText
import SwiftUI

// MARK: - Color palette (mirrors src/styles/index.css / tailwind.config.js)

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: 1)
    }

    // Warm neutral palette
    static let neutral900 = Color(hex: 0x1C1917)
    static let neutral800 = Color(hex: 0x292524)
    static let neutral700 = Color(hex: 0x44403C)
    static let neutral600 = Color(hex: 0x57534E)
    static let neutral500 = Color(hex: 0x78716C)
    static let neutral400 = Color(hex: 0xA8A29E)
    static let neutral300 = Color(hex: 0xD6D3D1)
    static let neutral100 = Color(hex: 0xF5F5F4)

    // Claude accents
    static let claudePrimary = Color(hex: 0xCC785C)
    static let claudePrimaryDark = Color(hex: 0xB86448)
    static let accentOrange = Color(hex: 0xFF6B35)

    // Status
    static let safeFrom = Color(hex: 0x10B981)
    static let safeTo = Color(hex: 0x059669)
    static let warnFrom = Color(hex: 0xF59E0B)
    static let warnTo = Color(hex: 0xD97706)
    static let critFrom = Color(hex: 0xEF4444)
    static let critTo = Color(hex: 0xDC2626)

    // Semantic text aliases
    static let textPrimary = Color.neutral100
    static let textSecondary = Color.neutral400
    static let textTertiary = Color.neutral500
}

// MARK: - Usage status

enum UsageStatus {
    case safe, warning, critical

    init(percentage: Double) {
        switch percentage {
        case 90...: self = .critical
        case 70..<90: self = .warning
        default: self = .safe
        }
    }

    var emoji: String {
        switch self {
        case .safe: return "🟢"
        case .warning: return "🟡"
        case .critical: return "🔴"
        }
    }

    var label: String {
        switch self {
        case .safe: return "safe"
        case .warning: return "warning"
        case .critical: return "critical"
        }
    }

    var gradient: LinearGradient {
        let pair: (Color, Color)
        switch self {
        case .safe: pair = (.safeFrom, .safeTo)
        case .warning: pair = (.warnFrom, .warnTo)
        case .critical: pair = (.critFrom, .critTo)
        }
        return LinearGradient(colors: [pair.0, pair.1], startPoint: .leading, endPoint: .trailing)
    }

    var color: Color {
        switch self {
        case .safe: return .safeFrom
        case .warning: return .warnFrom
        case .critical: return .critFrom
        }
    }
}

// MARK: - Gradients

enum Gradients {
    static let claudeText = LinearGradient(
        colors: [.claudePrimary, .claudePrimaryDark],
        startPoint: .leading, endPoint: .trailing
    )
    static let claudeActive = LinearGradient(
        colors: [.claudePrimary, .claudePrimaryDark],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )
    static let timeRing = LinearGradient(
        colors: [.claudePrimary, .accentOrange],
        startPoint: .leading, endPoint: .trailing
    )
}

// MARK: - Fira Code font

enum FiraCode {
    /// Whether registration succeeded; set by registerFonts().
    static private(set) var registeredCount = 0

    /// Family/face names verified from the bundled TTF name tables. Only "Fira Code"
    /// (Regular) and "Fira Code" + Bold map under the base family; Light/Medium/SemiBold
    /// each carry their own family name, so we address them directly.
    static func familyName(for weight: Font.Weight) -> String {
        switch weight {
        case .light, .thin, .ultraLight: return "Fira Code Light"
        case .medium: return "Fira Code Medium"
        case .semibold: return "Fira Code SemiBold"
        case .bold, .heavy, .black: return "Fira Code"
        default: return "Fira Code"
        }
    }

    static func isBoldFace(_ weight: Font.Weight) -> Bool {
        switch weight {
        case .bold, .heavy, .black: return true
        default: return false
        }
    }

    /// Register all bundled Fira Code faces with CoreText. Call once at launch.
    @discardableResult
    static func registerFonts() -> Int {
        let faces = [
            "FiraCode-Light", "FiraCode-Regular", "FiraCode-Medium",
            "FiraCode-SemiBold", "FiraCode-Bold",
        ]
        var count = 0
        for face in faces {
            guard let url = Bundle.module.url(forResource: face, withExtension: "ttf") else {
                continue
            }
            var error: Unmanaged<CFError>?
            if CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error) {
                count += 1
            } else {
                // Already registered (e.g. across relaunch) is not a fatal failure.
                error?.release()
            }
        }
        registeredCount = count
        return count
    }
}

extension Font {
    /// Fira Code at an explicit weight, resolving to the correct registered face.
    static func firaCode(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let base = Font.custom(FiraCode.familyName(for: weight), fixedSize: size)
        return FiraCode.isBoldFace(weight) ? base.weight(.bold) : base
    }
}

// MARK: - Warm card

struct WarmCard: ViewModifier {
    var padding: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.neutral900.opacity(0.80))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.neutral800, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .shadow(color: .black.opacity(0.25), radius: 8, x: 0, y: 4)
    }
}

extension View {
    func warmCard(padding: CGFloat = 16) -> some View {
        modifier(WarmCard(padding: padding))
    }
}

// MARK: - App background

/// Fixed warm gradient + soft radial glows behind the whole popover.
struct AppBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                stops: [
                    .init(color: .neutral900, location: 0),
                    .init(color: .neutral800, location: 0.5),
                    .init(color: .neutral900, location: 1),
                ],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            radial(Color(.sRGB, red: 204 / 255, green: 120 / 255, blue: 92 / 255, opacity: 0.08),
                   center: UnitPoint(x: 0.15, y: 0.12))
            radial(Color(.sRGB, red: 1, green: 107 / 255, blue: 53 / 255, opacity: 0.06),
                   center: UnitPoint(x: 0.88, y: 0.12))
            radial(Color(.sRGB, red: 120 / 255, green: 113 / 255, blue: 108 / 255, opacity: 0.04),
                   center: UnitPoint(x: 0.5, y: 0.5))
        }
        .ignoresSafeArea()
    }

    private func radial(_ color: Color, center: UnitPoint) -> some View {
        RadialGradient(colors: [color, .clear], center: center, startRadius: 0, endRadius: 280)
    }
}

// MARK: - Gradient icon tile

/// 40x40 rounded gradient tile with a white SF Symbol, matching the Electron tiles.
struct GradientIconTile: View {
    let systemName: String
    let colors: [Color]
    var size: CGFloat = 40

    var body: some View {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(LinearGradient(colors: colors, startPoint: .leading, endPoint: .trailing))
            .frame(width: size, height: size)
            .overlay(
                Image(systemName: systemName)
                    .font(.system(size: size * 0.45, weight: .semibold))
                    .foregroundStyle(.white)
            )
            .shadow(color: colors.first?.opacity(0.45) ?? .clear, radius: 6, x: 0, y: 3)
    }

    // Preset tints used across the dashboard.
    static let fiveHour: [Color] = [Color(hex: 0xA855F7), Color(hex: 0x6366F1)]
    static let burnRate: [Color] = [Color(hex: 0xF97316), Color(hex: 0xDC2626)]
    static let today: [Color] = [Color(hex: 0x3B82F6), Color(hex: 0xA855F7)]
    static let week: [Color] = [Color(hex: 0x22C55E), Color(hex: 0x14B8A6)]
}

// MARK: - Claude logo

/// Orange disc with the white Claude swirl (approximation of the App.tsx SVG path).
struct ClaudeLogo: View {
    var size: CGFloat = 28

    var body: some View {
        Canvas { context, canvasSize in
            let s = canvasSize.width
            // Background disc.
            context.fill(
                Path(ellipseIn: CGRect(x: 0, y: 0, width: s, height: s)),
                with: .color(.claudePrimary)
            )
            // White ring with an inner cut, mimicking the asymmetric swirl: a full
            // white annulus, then knock out a wedge on the bottom-right.
            let outer = s * 0.5
            let inner = s * 0.30
            var ring = Path()
            ring.addEllipse(in: CGRect(
                x: s / 2 - outer * 0.84, y: s / 2 - outer * 0.84,
                width: outer * 1.68, height: outer * 1.68
            ))
            ring.addEllipse(in: CGRect(
                x: s / 2 - inner, y: s / 2 - inner,
                width: inner * 2, height: inner * 2
            ))
            context.fill(ring, with: .color(.white), style: FillStyle(eoFill: true))

            // Re-fill the lower-right quadrant with the disc color to create the
            // open "C"/swirl shape.
            var wedge = Path()
            wedge.move(to: CGPoint(x: s * 0.5, y: s * 0.5))
            wedge.addArc(
                center: CGPoint(x: s * 0.5, y: s * 0.5),
                radius: outer,
                startAngle: .degrees(-30), endAngle: .degrees(95),
                clockwise: false
            )
            wedge.closeSubpath()
            context.fill(wedge, with: .color(.claudePrimary))
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Circular progress ring (dashboard hero)

struct ProgressRing: View {
    let percentage: Double
    let ringGradient: LinearGradient
    let centerLabel: String
    let bigText: String
    let subtitle: String
    var diameter: CGFloat = 160

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.10), lineWidth: 8)
            Circle()
                .trim(from: 0, to: min(max(percentage, 0), 100) / 100)
                .stroke(ringGradient, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 2) {
                Text("\(Int(percentage.rounded()))%")
                    .font(.firaCode(30, weight: .bold))
                    .foregroundStyle(Color.neutral100)
                Text(centerLabel)
                    .font(.firaCode(11, weight: .medium))
                    .tracking(1.5)
                    .foregroundStyle(Color.neutral400)
                Text(subtitle)
                    .font(.firaCode(10))
                    .foregroundStyle(Color.neutral500)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(width: diameter, height: diameter)
    }
}

// MARK: - Pill / badge

struct ThemedPill: View {
    let text: String
    var color: Color = .claudePrimary

    var body: some View {
        Text(text)
            .font(.firaCode(10, weight: .medium))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.16), in: Capsule())
    }
}

// MARK: - Themed progress bar

struct ThemedProgressBar: View {
    /// 0...1
    let value: Double
    var tint: LinearGradient = Gradients.claudeText
    var height: CGFloat = 6

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.neutral800)
                Capsule()
                    .fill(tint)
                    .frame(width: max(0, min(1, value)) * geo.size.width)
            }
        }
        .frame(height: height)
    }
}
