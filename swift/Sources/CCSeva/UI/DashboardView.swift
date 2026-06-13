import SwiftUI

/// Headline tab: server-truth limit gauges ("limit headroom"), pace prediction,
/// and today-at-a-glance stats.
struct DashboardView: View {
    @EnvironmentObject private var store: UsageStore

    var body: some View {
        if store.snapshot == nil {
            ProgressView("Scanning Claude Code data…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let snap = store.snapshot, snap.totalEntries == 0, !store.limitsState.isLive {
            EmptyStateView()
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    gauges
                    predictionLine
                    Divider()
                    todayStats
                    if case .estimated(let reason) = store.limitsState {
                        Text("Live limits unavailable: \(reason)")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
                }
                .padding(14)
            }
        }
    }

    private var gauges: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Limit headroom")
            HStack(alignment: .top, spacing: 6) {
                if store.limitsState.isLive, let limits = store.limits {
                    if let fiveHour = limits.fiveHour {
                        UtilizationRing(
                            label: fiveHour.label, utilization: fiveHour.utilization,
                            resetsAt: fiveHour.resetsAt, isLive: true
                        )
                    }
                    if let sevenDay = limits.sevenDay {
                        UtilizationRing(
                            label: sevenDay.label, utilization: sevenDay.utilization,
                            resetsAt: sevenDay.resetsAt, isLive: true
                        )
                    }
                    if let modelWeekly = limits.modelSpecificWeekly {
                        UtilizationRing(
                            label: modelWeekly.label, utilization: modelWeekly.utilization,
                            resetsAt: modelWeekly.resetsAt, isLive: true
                        )
                    }
                } else if let estimated = store.estimatedFiveHourWindow {
                    UtilizationRing(
                        label: estimated.label, utilization: estimated.utilization,
                        resetsAt: estimated.resetsAt, isLive: false
                    )
                    VStack(spacing: 6) {
                        Text("Weekly limits need the live endpoint")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        Text("Local estimate uses plan limit: \(Format.tokens(store.localTokenLimit)) tokens")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 18)
                }
            }
        }
    }

    @ViewBuilder
    private var predictionLine: some View {
        if let prediction = store.sessionPrediction {
            HStack(spacing: 6) {
                Image(systemName: prediction.contains("hit") ? "exclamationmark.triangle" : "checkmark.circle")
                    .foregroundStyle(prediction.contains("hit") ? Color.orange : Color.green)
                Text(prediction)
                    .font(.caption)
            }
            .padding(8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 8))
        }
    }

    @ViewBuilder
    private var todayStats: some View {
        if let snap = store.snapshot {
            VStack(alignment: .leading, spacing: 8) {
                SectionHeader(title: "Today")
                HStack(spacing: 8) {
                    StatCard(title: "Tokens", value: Format.tokens(snap.todayTokens))
                    StatCard(title: "Cost", value: Format.cost(snap.todayCost))
                }
                HStack(spacing: 8) {
                    StatCard(
                        title: "Session cost",
                        value: Format.cost(snap.activeBlock?.costUSD ?? 0),
                        subtitle: snap.activeBlock == nil ? "no active session" : "current 5h block"
                    )
                    StatCard(
                        title: "Burn rate",
                        value: snap.activeBlock?.burnRate.map {
                            "\(Format.tokens(Int($0.tokensPerMinute)))/min"
                        } ?? "—",
                        subtitle: snap.activeBlock?.burnRate.map {
                            "\(Format.cost($0.costPerHour))/hr"
                        }
                    )
                }
            }
        }
    }
}
