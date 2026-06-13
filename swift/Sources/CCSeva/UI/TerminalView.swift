import SwiftUI

/// CLI-style panel mirroring Electron's TerminalView.tsx: a dark inner surface,
/// monospace green/neutral output rendering current stats as terminal lines.
struct TerminalView: View {
    @EnvironmentObject private var store: UsageStore

    private let green = Color(hex: 0x4ADE80)
    private let greenDim = Color(hex: 0x22C55E)
    private let yellow = Color(hex: 0xFACC15)
    private let orange = Color(hex: 0xFB923C)
    private let purple = Color(hex: 0xC084FC)
    private let red = Color(hex: 0xF87171)
    private let cyan = Color(hex: 0x22D3EE)
    private let gray = Color(hex: 0x9CA3AF)

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                headerBlock
                Divider().overlay(greenDim.opacity(0.3))
                tokenUsageBlock
                Divider().overlay(greenDim.opacity(0.2))
                statsGrid
                Divider().overlay(greenDim.opacity(0.2))
                sessionBlock
                Divider().overlay(greenDim.opacity(0.3))
                promptLine
                statusLine
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.black.opacity(0.9))
            .overlay(
                RoundedRectangle(cornerRadius: 12).stroke(greenDim.opacity(0.3), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private var percent: Double { store.localTokenPercentage }
    private var status: UsageStatus { store.tokenStatus }

    private var headerBlock: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                (Text("┌─ ").foregroundColor(greenDim)
                    + Text("Claude Code Usage Monitor").foregroundColor(green)
                    + Text(" ─┐").foregroundColor(greenDim))
                    .font(.firaCode(12))
                Spacer()
                Text(nowTime)
                    .font(.firaCode(10))
                    .foregroundColor(green.opacity(0.8))
            }
            Text("└─ Real-time terminal interface ─┘")
                .font(.firaCode(10))
                .foregroundColor(greenDim)
        }
    }

    private var tokenUsageBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                Text("TOKEN USAGE:").font(.firaCode(12)).foregroundColor(green)
                Text(String(format: "%.1f%%", percent))
                    .font(.firaCode(12, weight: .bold)).foregroundColor(.white)
                Text(status.emoji).font(.system(size: 16))
            }
            HStack(spacing: 6) {
                Text("[").foregroundColor(greenDim)
                Text(bar(percent)).foregroundColor(yellow)
                Text("]").foregroundColor(greenDim)
                Text("\(Format.tokens(store.activeBlockTokens))/\(Format.tokens(store.localTokenLimit))")
                    .foregroundColor(gray)
            }
            .font(.firaCode(11))
        }
    }

    private var statsGrid: some View {
        let rate = store.burnRatePerHour
        return LazyVGrid(
            columns: [GridItem(.flexible(), alignment: .leading),
                      GridItem(.flexible(), alignment: .leading)],
            spacing: 12
        ) {
            statCell(title: "BURN RATE:", titleColor: orange,
                     value: Format.tokens(rate), unit: "tokens/hr",
                     emoji: rate > 1000 ? "🔥" : rate > 500 ? "⚡" : "💤")
            statCell(title: "PLAN:", titleColor: purple,
                     value: store.planDisplayName, unit: store.settings.plan == .auto ? "detected" : "selected",
                     emoji: "📊")
            statCell(title: "COST TODAY:", titleColor: red,
                     value: String(format: "$%.3f", store.snapshot?.todayCost ?? 0), unit: "USD",
                     emoji: "💰")
            statCell(title: "REMAINING:", titleColor: yellow,
                     value: Format.tokens(store.tokensRemaining), unit: "tokens",
                     emoji: "📈")
        }
    }

    private func statCell(title: String, titleColor: Color, value: String, unit: String, emoji: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.firaCode(10)).foregroundColor(titleColor)
            HStack(spacing: 6) {
                Text(value).font(.firaCode(12, weight: .bold)).foregroundColor(.white).lineLimit(1)
                Text(unit).font(.firaCode(10)).foregroundColor(gray)
                Text(emoji).font(.system(size: 13))
            }
        }
    }

    @ViewBuilder
    private var sessionBlock: some View {
        if let block = store.snapshot?.activeBlock {
            VStack(alignment: .leading, spacing: 8) {
                Text("SESSION WINDOW (5H):").font(.firaCode(10)).foregroundColor(cyan)
                HStack(alignment: .top, spacing: 32) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Entries:").font(.firaCode(10)).foregroundColor(gray)
                        Text("\(block.entryCount)").font(.firaCode(11)).foregroundColor(.white)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Window Tokens:").font(.firaCode(10)).foregroundColor(gray)
                        Text(Format.tokens(block.totalTokens)).font(.firaCode(11)).foregroundColor(.white)
                    }
                }
            }
        }
    }

    private var promptLine: some View {
        HStack(spacing: 8) {
            Text("ccmonitor@terminal").font(.firaCode(11)).foregroundColor(green)
            Text("$").font(.firaCode(11)).foregroundColor(gray)
            Button("refresh") { store.manualRefresh() }
                .buttonStyle(.plain)
                .font(.firaCode(11)).foregroundColor(yellow)
            Text("|").foregroundColor(gray.opacity(0.6))
            Text("status").font(.firaCode(11)).foregroundColor(cyan)
            Text("|").foregroundColor(gray.opacity(0.6))
            Text("analytics").font(.firaCode(11)).foregroundColor(purple)
            Text("█").font(.firaCode(11)).foregroundColor(green)
        }
    }

    private var statusLine: some View {
        let label = percent >= 90 ? "CRITICAL" : percent >= 70 ? "WARNING" : "NORMAL"
        return HStack {
            Text("System: \(label)").font(.firaCode(10)).foregroundColor(gray)
            Spacer()
            Text("Uptime: \(nowTime)").font(.firaCode(10)).foregroundColor(gray)
        }
        .padding(.top, 4)
    }

    private func bar(_ percentage: Double, width: Int = 20) -> String {
        let filled = Int((percentage / 100 * Double(width)).rounded())
        let f = max(0, min(width, filled))
        return String(repeating: "█", count: f) + String(repeating: "░", count: width - f)
    }

    private var nowTime: String {
        let f = DateFormatter()
        f.dateFormat = "HH:mm:ss"
        return f.string(from: Date())
    }
}
