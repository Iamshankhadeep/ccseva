import Charts
import SwiftUI

/// Historical charts: daily tokens & cost (14 days), per-model cost breakdown,
/// per-project cost for the current month.
struct AnalyticsView: View {
    @EnvironmentObject private var store: UsageStore

    private var last14Days: [DailyUsage] {
        guard let snap = store.snapshot else { return [] }
        let cutoff = Calendar.current.date(byAdding: .day, value: -14, to: Date()) ?? Date()
        return snap.daily.filter { $0.date >= cutoff }
    }

    var body: some View {
        if let snap = store.snapshot, snap.totalEntries > 0 {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    dailyTokensChart
                    dailyCostChart
                    modelBreakdown(snap)
                    projectBreakdown(snap)
                    weeklySummary(snap)
                    if snap.hasUnpricedModels {
                        Text("(some models unpriced: \(snap.unknownModels.map(Format.shortModelName).joined(separator: ", ")))")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
                .padding(14)
            }
        } else {
            EmptyStateView()
        }
    }

    private var dailyTokensChart: some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionHeader(title: "Daily tokens — last 14 days")
            Chart(last14Days) { day in
                BarMark(
                    x: .value("Day", day.date, unit: .day),
                    y: .value("Tokens", day.tokens.total)
                )
                .foregroundStyle(Color.accentColor.gradient)
            }
            .chartYAxis {
                AxisMarks { value in
                    AxisGridLine()
                    AxisValueLabel {
                        if let intValue = value.as(Int.self) {
                            Text(Format.tokens(intValue))
                        }
                    }
                }
            }
            .frame(height: 120)
        }
    }

    private var dailyCostChart: some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionHeader(title: "Daily cost — last 14 days")
            Chart(last14Days) { day in
                BarMark(
                    x: .value("Day", day.date, unit: .day),
                    y: .value("Cost", day.cost)
                )
                .foregroundStyle(Color.orange.gradient)
            }
            .chartYAxis {
                AxisMarks { value in
                    AxisGridLine()
                    AxisValueLabel {
                        if let cost = value.as(Double.self) {
                            Text(Format.cost(cost))
                        }
                    }
                }
            }
            .frame(height: 120)
        }
    }

    private func modelBreakdown(_ snap: UsageSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionHeader(title: "Cost by model — last 30 days")
            Chart(snap.modelBreakdown.prefix(6).map { $0 }) { model in
                BarMark(
                    x: .value("Cost", model.cost),
                    y: .value("Model", Format.shortModelName(model.model))
                )
                .foregroundStyle(Color.purple.gradient)
            }
            .chartXAxis {
                AxisMarks { value in
                    AxisGridLine()
                    AxisValueLabel {
                        if let cost = value.as(Double.self) {
                            Text(Format.cost(cost))
                        }
                    }
                }
            }
            .frame(height: CGFloat(max(1, min(snap.modelBreakdown.count, 6))) * 28 + 30)
        }
    }

    private func projectBreakdown(_ snap: UsageSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionHeader(title: "Projects this month")
            ForEach(snap.projectsThisMonth.prefix(8)) { project in
                HStack {
                    Text(project.name)
                        .font(.caption)
                        .lineLimit(1)
                    Spacer()
                    Text(Format.tokens(project.totalTokens))
                        .font(.caption2)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                    Text(Format.cost(project.cost))
                        .font(.caption)
                        .monospacedDigit()
                        .frame(width: 64, alignment: .trailing)
                }
                .padding(.vertical, 2)
            }
        }
    }

    private func weeklySummary(_ snap: UsageSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionHeader(title: "Weekly totals (Mon–Sun)")
            ForEach(snap.weekly.suffix(4).reversed()) { week in
                HStack {
                    Text(week.weekStart.formatted(date: .abbreviated, time: .omitted))
                        .font(.caption)
                    Spacer()
                    Text(Format.tokens(week.tokens.total))
                        .font(.caption2)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                    Text(Format.cost(week.cost))
                        .font(.caption)
                        .monospacedDigit()
                        .frame(width: 64, alignment: .trailing)
                }
                .padding(.vertical, 2)
            }
        }
    }
}
