import SwiftUI

/// Live monitoring of the current 5-hour session block.
struct LiveView: View {
    @EnvironmentObject private var store: UsageStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if let block = store.snapshot?.activeBlock {
                    activeBlockSection(block)
                } else {
                    VStack(spacing: 8) {
                        Image(systemName: "moon.zzz")
                            .font(.system(size: 30))
                            .foregroundStyle(.secondary)
                        Text("No active session")
                            .font(.headline)
                        Text("A session block starts with your next Claude Code request.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
                }

                if let blocks = store.snapshot?.blocks, !blocks.isEmpty {
                    recentBlocksSection(blocks)
                }
            }
            .padding(14)
        }
    }

    private func activeBlockSection(_ block: SessionBlock) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Active 5-hour block")

            // Elapsed time within the 5h window.
            let elapsed = Date().timeIntervalSince(block.startTime)
            let fraction = min(1, max(0, elapsed / Aggregator.sessionDuration))
            VStack(alignment: .leading, spacing: 4) {
                ProgressView(value: fraction)
                HStack {
                    Text("Started \(Format.time(block.startTime))")
                    Spacer()
                    Text("Ends \(Format.time(block.endTime)) (\(Format.duration(block.endTime.timeIntervalSinceNow)) left)")
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }

            HStack(spacing: 8) {
                StatCard(title: "Tokens", value: Format.tokens(block.totalTokens),
                         subtitle: "\(block.entryCount) entries")
                StatCard(title: "Cost", value: Format.cost(block.costUSD))
            }
            HStack(spacing: 8) {
                StatCard(
                    title: "Burn rate",
                    value: block.burnRate.map { "\(Format.tokens(Int($0.tokensPerMinute)))/min" } ?? "—",
                    subtitle: block.burnRate.map { "\(Format.cost($0.costPerHour))/hr" }
                )
                StatCard(
                    title: "Projected",
                    value: block.projection(now: Date()).map { Format.tokens($0.projectedTotalTokens) } ?? "—",
                    subtitle: block.projection(now: Date()).map { "≈ \(Format.cost($0.projectedCost)) by block end" }
                )
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Token breakdown")
                    .font(.caption.weight(.medium))
                tokenRow("Input", block.tokens.input)
                tokenRow("Output", block.tokens.output)
                tokenRow("Cache write", block.tokens.cacheCreation)
                tokenRow("Cache read", block.tokens.cacheRead)
            }
            .padding(10)
            .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 8))

            if !block.models.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Models in this block")
                        .font(.caption.weight(.medium))
                    ForEach(block.models, id: \.self) { model in
                        Text("• \(Format.shortModelName(model))")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private func tokenRow(_ label: String, _ count: Int) -> some View {
        HStack {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Spacer()
            Text(Format.tokens(count))
                .font(.caption2)
                .monospacedDigit()
        }
    }

    private func recentBlocksSection(_ blocks: [SessionBlock]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionHeader(title: "Recent blocks")
            ForEach(blocks.suffix(6).reversed()) { block in
                HStack {
                    Circle()
                        .fill(block.isActive ? Color.green : Color.secondary.opacity(0.4))
                        .frame(width: 6, height: 6)
                    Text(block.startTime.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption2)
                    Spacer()
                    Text(Format.tokens(block.totalTokens))
                        .font(.caption2)
                        .monospacedDigit()
                    Text(Format.cost(block.costUSD))
                        .font(.caption2)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                        .frame(width: 56, alignment: .trailing)
                }
                .padding(.vertical, 2)
            }
        }
    }
}
