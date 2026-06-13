import SwiftUI

/// Compact circular utilization gauge with a reset countdown (Limit Headroom).
struct UtilizationRing: View {
    let label: String
    /// 0...100
    let utilization: Double
    let resetsAt: Date?
    let isLive: Bool

    private var status: UsageStatus { UsageStatus(percentage: utilization) }

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.10), lineWidth: 6)
                Circle()
                    .trim(from: 0, to: min(utilization, 100) / 100)
                    .stroke(status.gradient, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(Int(utilization.rounded()))%")
                    .font(.firaCode(15, weight: .semibold))
                    .foregroundStyle(Color.neutral100)
            }
            .frame(width: 70, height: 70)

            Text(label)
                .font(.firaCode(10))
                .foregroundStyle(Color.neutral400)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .frame(height: 26)

            Text(resetText)
                .font(.firaCode(9))
                .foregroundStyle(Color.neutral500)

            ThemedPill(text: isLive ? "live" : "estimated",
                       color: isLive ? .safeFrom : .claudePrimary)
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

/// Section title in the warm style.
struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.firaCode(11, weight: .semibold))
            .tracking(0.8)
            .foregroundStyle(Color.neutral400)
            .textCase(.uppercase)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Right-aligned "value over label" figure used in strips and grids.
struct StatFigure: View {
    let value: String
    let label: String
    var alignment: HorizontalAlignment = .trailing

    var body: some View {
        VStack(alignment: alignment, spacing: 2) {
            Text(value)
                .font(.firaCode(13, weight: .bold))
                .foregroundStyle(Color.neutral100)
            Text(label)
                .font(.firaCode(10))
                .foregroundStyle(Color.neutral400)
        }
    }
}

/// Key/value row inside stat cards.
struct StatRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.firaCode(11))
                .foregroundStyle(Color.neutral400)
            Spacer()
            Text(value)
                .font(.firaCode(11, weight: .medium))
                .foregroundStyle(Color.neutral100)
        }
    }
}

/// Shown when ~/.claude has no parseable data.
struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 12) {
            GradientIconTile(systemName: "tray", colors: GradientIconTile.fiveHour, size: 56)
            Text("No Claude Code data found")
                .font(.firaCode(15, weight: .semibold))
                .foregroundStyle(Color.neutral100)
            Text("CCSeva reads transcripts from ~/.claude/projects.\nUse Claude Code at least once, then refresh.")
                .font(.firaCode(11))
                .foregroundStyle(Color.neutral400)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}
