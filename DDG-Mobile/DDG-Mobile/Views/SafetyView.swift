import SwiftUI

/// The Field workspace's durable, source-backed reference. Live water, smoke,
/// closures, crossings, and road signals live one tap away in TrailConditionsView.
/// This screen intentionally works with no network and never presents a static
/// carrier estimate or an old field report as a clearance.
struct SafetyView: View {
    private let brief = FieldBrief.bundled

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    currentConditionsCard
                    routeContractCard
                    operatingRulesSection
                    dailyFieldCardSection
                    verificationGatesSection
                    emergencySection
                    checkInSection
                    offlineLimitsSection
                    sourceLinksSection
                }
                .padding()
                .padding(.bottom, 36)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Field Brief")
        }
    }

    private var currentConditionsCard: some View {
        NavigationLink {
            TrailConditionsView()
        } label: {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: "arrow.triangle.2.circlepath.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(.red)
                VStack(alignment: .leading, spacing: 5) {
                    Text("Open daily conditions before moving")
                        .font(.headline.bold())
                        .foregroundStyle(.primary)
                    Text("Water · closures · crossings · fires · smoke · weather. A source response is not a safety clearance.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .foregroundStyle(.tertiary)
            }
            .fieldCard(tint: .red)
        }
        .buttonStyle(.plain)
        .accessibilityHint("Opens the protected daily source snapshot and refresh control")
    }

    private var routeContractCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Offline route contract", systemImage: "shield.checkered")
                .font(.headline)
                .foregroundStyle(.teal)
            Text(brief.route.name)
                .font(.title3.bold())
            HStack(spacing: 10) {
                FieldMetric(value: String(format: "%.3f", brief.route.officialPctaMiles), label: "PCTA miles")
                FieldMetric(value: "+\(brief.route.totalGainFeet.formatted())", label: "ft up")
                FieldMetric(value: "−\(brief.route.totalLossFeet.formatted())", label: "ft down")
            }
            Text("Measured centerline: \(brief.route.centerlineGeometryMiles, specifier: "%.3f") mi · elevation \(brief.route.minElevationFeet.formatted())–\(brief.route.maxElevationFeet.formatted()) ft")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("\(brief.terrainContractVersion) · \(brief.terrainContractSha256.prefix(12))…")
                .font(.caption2.monospaced())
                .foregroundStyle(.secondary)
        }
        .fieldCard(tint: .teal)
    }

    private var operatingRulesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            FieldSectionHeader(title: "Operating rules", icon: "exclamationmark.shield.fill", color: .orange)
            ForEach(brief.operationalRules) { rule in
                VStack(alignment: .leading, spacing: 4) {
                    Text(rule.title)
                        .font(.subheadline.bold())
                    Text(rule.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .fieldCard(tint: .orange, compact: true)
            }
        }
    }

    private var dailyFieldCardSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            FieldSectionHeader(title: "Day-by-day field card", icon: "figure.hiking", color: .green)
            Text("The terrain numbers below are the same normalized PCTA + USGS contract used by the map and elevation profile.")
                .font(.caption)
                .foregroundStyle(.secondary)

            ForEach(brief.daily) { day in
                FieldDayCard(day: day)
            }
        }
    }

    private var verificationGatesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            FieldSectionHeader(title: "Remaining verification gates", icon: "checklist", color: .red)
            Text("Open is not a failure state—it means no one is allowed to pretend the fact has been verified. Record real confirmation in Field → Ops Log.")
                .font(.caption)
                .foregroundStyle(.secondary)

            ForEach(brief.operations.gates.filter { $0.state != "confirmed" }) { gate in
                VStack(alignment: .leading, spacing: 5) {
                    HStack(alignment: .top) {
                        Label(gate.priority.uppercased(), systemImage: gate.priority == "critical" ? "exclamationmark.triangle.fill" : "clock.badge.exclamationmark")
                            .font(.caption2.bold())
                            .foregroundStyle(gate.priority == "critical" ? .red : .orange)
                        Spacer()
                        Text(gate.due)
                            .font(.caption2.bold())
                            .foregroundStyle(.secondary)
                    }
                    Text(gate.title)
                        .font(.subheadline.bold())
                    Text("Owner: \(gate.owner) · blocks: \(gate.blocks)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .fieldCard(tint: gate.priority == "critical" ? .red : .orange, compact: true)
            }
        }
    }

    private var emergencySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            FieldSectionHeader(title: "Emergency coordination", icon: "cross.case.fill", color: .red)
            Text(brief.emergency.disclaimer)
                .font(.caption)
                .foregroundStyle(.secondary)

            ForEach(Array(brief.emergency.actions.enumerated()), id: \.element.id) { index, action in
                HStack(alignment: .top, spacing: 10) {
                    Text("\(index + 1)")
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                        .frame(width: 22, height: 22)
                        .background(.red, in: Circle())
                    VStack(alignment: .leading, spacing: 3) {
                        Text(action.title)
                            .font(.subheadline.bold())
                        Text(action.detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .fieldCard(tint: .red, compact: true)
            }

            ForEach(brief.emergency.contacts) { contact in
                VStack(alignment: .leading, spacing: 5) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(contact.title)
                                .font(.subheadline.bold())
                            Text(contact.when)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if let phoneURL = phoneURL(for: contact.value) {
                            Link(contact.value, destination: phoneURL)
                                .font(.subheadline.bold())
                                .foregroundStyle(.blue)
                        } else {
                            Text(contact.value)
                                .font(.subheadline.bold())
                        }
                    }
                    sourceLinks(for: contact.sourceIDs)
                }
                .fieldCard(tint: .red, compact: true)
            }
        }
    }

    private var checkInSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            FieldSectionHeader(title: "Comms and check-in protocol", icon: "antenna.radiowaves.left.and.right", color: .blue)
            Text("This replaces static carrier confidence with an actual tested-device and named-cadence plan.")
                .font(.caption)
                .foregroundStyle(.secondary)
            ForEach(brief.emergency.checkInProtocol) { item in
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.title)
                        .font(.subheadline.bold())
                    Text(item.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .fieldCard(tint: .blue, compact: true)
            }
        }
    }

    private var offlineLimitsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            FieldSectionHeader(title: "Offline limits", icon: "wifi.slash", color: .orange)
            ForEach(brief.offlineLimitations, id: \.self) { limitation in
                Label(limitation, systemImage: "exclamationmark.circle")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .fieldCard(tint: .orange)
    }

    private var sourceLinksSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            FieldSectionHeader(title: "Primary sources", icon: "link", color: .teal)
            Text("These were captured into the field brief on \(brief.updatedAt). Recheck live agencies before departure.")
                .font(.caption)
                .foregroundStyle(.secondary)
            sourceLinks(for: brief.sourceIDs)
        }
        .fieldCard(tint: .teal)
    }

    @ViewBuilder
    private func sourceLinks(for sourceIDs: [String]) -> some View {
        let sources = sourceIDs.compactMap { brief.sourcesByID[$0] }
        if !sources.isEmpty {
            FlowLayout(spacing: 7) {
                ForEach(sources) { source in
                    if let urlString = source.url, let url = URL(string: urlString) {
                        Link(source.title, destination: url)
                            .font(.caption2)
                            .lineLimit(1)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(.teal.opacity(0.1), in: Capsule())
                    } else {
                        Text(source.title)
                            .font(.caption2)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(.secondary.opacity(0.1), in: Capsule())
                    }
                }
            }
        }
    }

    private func phoneURL(for phone: String) -> URL? {
        let dialable = phone.filter { $0.isNumber || $0 == "+" }
        return URL(string: "tel://\(dialable)")
    }
}

private struct FieldMetric: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.subheadline.bold())
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct FieldPill: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption2.bold())
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.1), in: Capsule())
    }
}

private struct FieldDayCard: View {
    let day: FieldBrief.Day

    private var tint: Color {
        day.day == 3 ? .red : .green
    }

    var body: some View {
        DisclosureGroup {
            VStack(alignment: .leading, spacing: 9) {
                Text(day.detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                HStack(spacing: 8) {
                    FieldPill(
                        text: String(format: "PCT %.3f–%.3f", day.pctMileStart, day.pctMileEnd),
                        color: .secondary
                    )
                    if day.packMode == "day-pack-supported" {
                        FieldPill(text: "Day pack", color: .red)
                    }
                    if day.stopType == "support-transfer" {
                        FieldPill(text: "No camp", color: .red)
                    }
                }
                Text("End: \(day.endName) · \(day.endElevationFeet.formatted()) ft")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 6)
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Day \(day.day)")
                        .font(.headline.bold())
                        .foregroundStyle(tint)
                    Spacer()
                    Text(String(format: "%.3f mi", day.distanceMiles))
                        .font(.subheadline.bold())
                }
                Text(day.title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                HStack(spacing: 12) {
                    Label("+\(day.gainFeet.formatted())", systemImage: "arrow.up.right")
                        .foregroundStyle(.green)
                    Label("−\(day.lossFeet.formatted())", systemImage: "arrow.down.right")
                        .foregroundStyle(.red)
                }
                .font(.caption.bold())
            }
        }
        .tint(tint)
        .fieldCard(tint: tint, compact: true)
    }
}

private struct FieldSectionHeader: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        Label(title, systemImage: icon)
            .font(.title3.bold())
            .foregroundStyle(color)
    }
}

private extension View {
    func fieldCard(tint: Color, compact: Bool = false) -> some View {
        padding(compact ? 12 : 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: compact ? 13 : 16))
            .overlay(
                RoundedRectangle(cornerRadius: compact ? 13 : 16)
                    .stroke(tint.opacity(0.22), lineWidth: 1)
            )
    }
}

#Preview {
    SafetyView()
}
