import Charts
import SwiftUI

/// Historical charts, warm-themed: daily tokens & cost (14 days), per-model cost
/// breakdown, per-project cost for the current month, weekly totals.
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
                VStack(spacing: 16) {
                    dailyTokensChart
                    dailyCostChart
                    modelBreakdown(snap)
                    projectBreakdown(snap)
                    weeklySummary(snap)
                    if snap.hasUnpricedModels {
                        Text("Some models unpriced: \(snap.unknownModels.map(Format.shortModelName).joined(separator: ", "))")
                            .font(.firaCode(10))
                            .foregroundStyle(Color.neutral500)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(.bottom, 8)
            }
        } else {
            EmptyStateView()
        }
    }

    private var dailyTokensChart: some View {
        chartCard(title: "Daily Tokens — last 14 days") {
            Chart(last14Days) { day in
                BarMark(x: .value("Day", day.date, unit: .day),
                        y: .value("Tokens", day.tokens.total))
                    .foregroundStyle(Gradients.claudeText)
            }
            .chartYAxis { axisMarks { Format.tokens($0) } }
            .chartXAxis { AxisMarks { _ in AxisGridLine().foregroundStyle(Color.neutral800) } }
            .frame(height: 130)
        }
    }

    private var dailyCostChart: some View {
        chartCard(title: "Daily Cost — last 14 days") {
            Chart(last14Days) { day in
                BarMark(x: .value("Day", day.date, unit: .day),
                        y: .value("Cost", day.cost))
                    .foregroundStyle(LinearGradient(colors: [.accentOrange, .warnTo],
                                                    startPoint: .top, endPoint: .bottom))
            }
            .chartYAxis { axisMarksDouble { Format.cost($0) } }
            .chartXAxis { AxisMarks { _ in AxisGridLine().foregroundStyle(Color.neutral800) } }
            .frame(height: 130)
        }
    }

    private func modelBreakdown(_ snap: UsageSnapshot) -> some View {
        chartCard(title: "Cost by Model — last 30 days") {
            Chart(snap.modelBreakdown.prefix(6).map { $0 }) { model in
                BarMark(x: .value("Cost", model.cost),
                        y: .value("Model", Format.shortModelName(model.model)))
                    .foregroundStyle(LinearGradient(colors: [Color(hex: 0xA855F7), Color(hex: 0x6366F1)],
                                                    startPoint: .leading, endPoint: .trailing))
            }
            .chartXAxis { axisMarksDouble { Format.cost($0) } }
            .chartYAxis {
                AxisMarks(preset: .aligned, position: .leading) {
                    AxisValueLabel()
                        .font(.firaCode(9))
                        .foregroundStyle(Color.neutral400)
                }
            }
            .frame(height: CGFloat(max(1, min(snap.modelBreakdown.count, 6))) * 30 + 30)
        }
    }

    private func projectBreakdown(_ snap: UsageSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Projects This Month")
            ForEach(snap.projectsThisMonth.prefix(8)) { project in
                HStack {
                    Text(project.name).font(.firaCode(11)).foregroundStyle(Color.neutral100).lineLimit(1)
                    Spacer()
                    Text(Format.tokens(project.totalTokens))
                        .font(.firaCode(10)).foregroundStyle(Color.neutral400)
                    Text(Format.cost(project.cost))
                        .font(.firaCode(11, weight: .medium)).foregroundStyle(Color.neutral100)
                        .frame(width: 64, alignment: .trailing)
                }
                .padding(.vertical, 2)
            }
        }
        .warmCard()
    }

    private func weeklySummary(_ snap: UsageSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Weekly Totals (Mon–Sun)")
            ForEach(snap.weekly.suffix(4).reversed()) { week in
                HStack {
                    Text(week.weekStart.formatted(date: .abbreviated, time: .omitted))
                        .font(.firaCode(11)).foregroundStyle(Color.neutral100)
                    Spacer()
                    Text(Format.tokens(week.tokens.total))
                        .font(.firaCode(10)).foregroundStyle(Color.neutral400)
                    Text(Format.cost(week.cost))
                        .font(.firaCode(11, weight: .medium)).foregroundStyle(Color.neutral100)
                        .frame(width: 64, alignment: .trailing)
                }
                .padding(.vertical, 2)
            }
        }
        .warmCard()
    }

    // MARK: - Helpers

    private func chartCard<Content: View>(title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: title)
            content()
        }
        .warmCard()
    }

    private func axisMarks(_ format: @escaping (Int) -> String) -> some AxisContent {
        AxisMarks { value in
            AxisGridLine().foregroundStyle(Color.neutral800)
            AxisValueLabel {
                if let v = value.as(Int.self) {
                    Text(format(v)).font(.firaCode(9)).foregroundStyle(Color.neutral400)
                }
            }
        }
    }

    private func axisMarksDouble(_ format: @escaping (Double) -> String) -> some AxisContent {
        AxisMarks { value in
            AxisGridLine().foregroundStyle(Color.neutral800)
            AxisValueLabel {
                if let v = value.as(Double.self) {
                    Text(format(v)).font(.firaCode(9)).foregroundStyle(Color.neutral400)
                }
            }
        }
    }
}
