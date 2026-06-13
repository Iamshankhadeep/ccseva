import SwiftUI

/// Circular utilization gauge with a reset countdown.
struct UtilizationRing: View {
    let label: String
    /// 0...100
    let utilization: Double
    let resetsAt: Date?
    let isLive: Bool

    private var color: Color {
        switch utilization {
        case 90...: return .red
        case 70..<90: return .orange
        default: return .green
        }
    }

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 7)
                Circle()
                    .trim(from: 0, to: min(utilization, 100) / 100)
                    .stroke(color, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(Int(utilization.rounded()))%")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .monospacedDigit()
            }
            .frame(width: 72, height: 72)

            Text(label)
                .font(.caption)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .frame(height: 26)

            Text(resetText)
                .font(.caption2)
                .foregroundStyle(.secondary)

            Text(isLive ? "live" : "estimated")
                .font(.system(size: 9, weight: .medium))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background((isLive ? Color.green : Color.orange).opacity(0.18), in: Capsule())
                .foregroundStyle(isLive ? Color.green : Color.orange)
        }
        .frame(maxWidth: .infinity)
    }

    private var resetText: String {
        guard let resetsAt else { return "—" }
        let remaining = resetsAt.timeIntervalSinceNow
        guard remaining > 0 else { return "resetting…" }
        return "resets in \(Format.duration(remaining))"
    }
}

/// Small labeled stat tile.
struct StatCard: View {
    let title: String
    let value: String
    var subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(.title3, design: .rounded).weight(.semibold))
                .monospacedDigit()
            if let subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 8))
    }
}

struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .textCase(.uppercase)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Shown when ~/.claude has no parseable data.
struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "tray")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
            Text("No Claude Code data found")
                .font(.headline)
            Text("CCSeva reads transcripts from ~/.claude/projects.\nUse Claude Code at least once, then refresh.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}
