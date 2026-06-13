import SwiftUI

/// Live monitoring of the current 5-hour session block, warm-themed.
struct LiveView: View {
    @EnvironmentObject private var store: UsageStore

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let block = store.snapshot?.activeBlock {
                    activeBlockSection(block)
                } else {
                    idleState
                }
                if let blocks = store.snapshot?.blocks, !blocks.isEmpty {
                    recentBlocksSection(blocks)
                }
            }
            .padding(.bottom, 8)
        }
    }

    private var idleState: some View {
        VStack(spacing: 12) {
            GradientIconTile(systemName: "moon.zzz", colors: GradientIconTile.fiveHour, size: 52)
            Text("No active session")
                .font(.firaCode(15, weight: .semibold))
                .foregroundStyle(Color.neutral100)
            Text("A session block starts with your next Claude Code request.")
                .font(.firaCode(11))
                .foregroundStyle(Color.neutral400)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .warmCard()
    }

    private func activeBlockSection(_ block: SessionBlock) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                GradientIconTile(systemName: "waveform.path.ecg", colors: GradientIconTile.fiveHour)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Active 5-Hour Block")
                        .font(.firaCode(15, weight: .bold))
                        .foregroundStyle(Color.neutral100)
                    Text("Started \(Format.time(block.startTime)) · Ends \(Format.time(block.endTime))")
                        .font(.firaCode(10))
                        .foregroundStyle(Color.neutral400)
                }
                Spacer()
            }

            let fraction = store.sessionElapsedFraction
            VStack(alignment: .leading, spacing: 6) {
                ThemedProgressBar(value: fraction, tint: Gradients.timeRing, height: 8)
                HStack {
                    Text("\(Int(fraction * 100))% elapsed")
                    Spacer()
                    Text("\(Format.duration(block.endTime.timeIntervalSinceNow)) left")
                }
                .font(.firaCode(10))
                .foregroundStyle(Color.neutral500)
            }

            HStack(spacing: 12) {
                miniStat("Tokens", Format.tokens(block.totalTokens), "\(block.entryCount) entries")
                miniStat("Cost", Format.cost(block.costUSD), nil)
                miniStat(
                    "Burn Rate",
                    block.burnRate.map { "\(Format.tokens(Int($0.tokensPerMinute)))/min" } ?? "--",
                    block.burnRate.map { "\(Format.cost($0.costPerHour))/hr" }
                )
                miniStat(
                    "Projected",
                    block.projection(now: Date()).map { Format.tokens($0.projectedTotalTokens) } ?? "--",
                    block.projection(now: Date()).map { "≈ \(Format.cost($0.projectedCost))" }
                )
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Token Breakdown")
                    .font(.firaCode(11, weight: .semibold))
                    .foregroundStyle(Color.neutral300)
                tokenRow("Input", block.tokens.input, Color(hex: 0x3B82F6))
                tokenRow("Output", block.tokens.output, Color(hex: 0xA855F7))
                tokenRow("Cache write", block.tokens.cacheCreation, Color(hex: 0x22C55E))
                tokenRow("Cache read", block.tokens.cacheRead, Color(hex: 0xF59E0B))
            }
            .padding(12)
            .background(Color.neutral800.opacity(0.5), in: RoundedRectangle(cornerRadius: 8))

            if !block.models.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Models In This Block")
                        .font(.firaCode(11, weight: .semibold))
                        .foregroundStyle(Color.neutral300)
                    ForEach(block.models, id: \.self) { model in
                        HStack(spacing: 8) {
                            Circle().fill(Color.claudePrimary).frame(width: 6, height: 6)
                            Text(Format.shortModelName(model))
                                .font(.firaCode(10))
                                .foregroundStyle(Color.neutral400)
                        }
                    }
                }
            }
        }
        .warmCard()
    }

    private func miniStat(_ label: String, _ value: String, _ sub: String?) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.firaCode(10)).foregroundStyle(Color.neutral400)
            Text(value).font(.firaCode(14, weight: .bold)).foregroundStyle(Color.neutral100)
                .lineLimit(1).minimumScaleFactor(0.7)
            if let sub {
                Text(sub).font(.firaCode(9)).foregroundStyle(Color.neutral500).lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color.neutral800.opacity(0.5), in: RoundedRectangle(cornerRadius: 8))
    }

    private func tokenRow(_ label: String, _ count: Int, _ dot: Color) -> some View {
        HStack(spacing: 8) {
            Circle().fill(dot).frame(width: 6, height: 6)
            Text(label).font(.firaCode(10)).foregroundStyle(Color.neutral400)
            Spacer()
            Text(Format.tokens(count)).font(.firaCode(10, weight: .medium)).foregroundStyle(Color.neutral100)
        }
    }

    private func recentBlocksSection(_ blocks: [SessionBlock]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Recent Blocks")
            ForEach(blocks.suffix(6).reversed()) { block in
                HStack(spacing: 8) {
                    Circle()
                        .fill(block.isActive ? Color.safeFrom : Color.neutral600)
                        .frame(width: 7, height: 7)
                    Text(block.startTime.formatted(date: .abbreviated, time: .shortened))
                        .font(.firaCode(10))
                        .foregroundStyle(Color.neutral300)
                    Spacer()
                    Text(Format.tokens(block.totalTokens))
                        .font(.firaCode(10, weight: .medium))
                        .foregroundStyle(Color.neutral100)
                    Text(Format.cost(block.costUSD))
                        .font(.firaCode(10))
                        .foregroundStyle(Color.neutral400)
                        .frame(width: 56, alignment: .trailing)
                }
                .padding(.vertical, 2)
            }
        }
        .warmCard()
    }
}
