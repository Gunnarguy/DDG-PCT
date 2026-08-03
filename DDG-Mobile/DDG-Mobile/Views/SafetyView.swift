import SwiftUI

/// The field workspace is intentionally compact at rest: live conditions first,
/// one chosen day card second, and the full offline emergency reference on demand.
/// Operational gates live only in Plan → Logistics.
struct SafetyView: View {
    private let brief = FieldBrief.bundled
    @State private var selectedDay = 1

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    CurrentConditionsCard()
                    OperatingRulesCard(rules: brief.operationalRules)
                    FieldDayDeck(
                        route: brief.route,
                        days: brief.daily,
                        selectedDay: $selectedDay
                    )
                    FieldReferenceCard(brief: brief)
                }
                .padding()
                .padding(.bottom, 36)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Field")
        }
    }
}

private struct CurrentConditionsCard: View {
    var body: some View {
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
                        .fixedSize(horizontal: false, vertical: true)
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
}

private struct OperatingRulesCard: View {
    let rules: [FieldBrief.OperationalRule]

    var body: some View {
        DisclosureGroup {
            VStack(alignment: .leading, spacing: 10) {
            ForEach(rules) { rule in
                VStack(alignment: .leading, spacing: 3) {
                    Text(rule.title)
                        .font(.subheadline.bold())
                    Text(rule.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.vertical, 2)
            }
            }
            .padding(.top, 8)
        } label: {
            Label("Always-on field rules", systemImage: "exclamationmark.shield.fill")
                .font(.headline)
                .foregroundStyle(.orange)
        }
        .fieldCard(tint: .orange)
    }
}

private struct FieldDayDeck: View {
    let route: FieldBrief.Route
    let days: [FieldBrief.Day]
    @Binding var selectedDay: Int

    private var selected: FieldBrief.Day? {
        days.first { $0.day == selectedDay } ?? days.first
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            FieldSectionHeader(title: "One day at a time", icon: "figure.hiking", color: .green)
            Text("Choose a day for the offline terrain card. This is the same normalized PCTA + USGS contract used by the map and elevation profile.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(days) { day in
                        Button {
                            selectedDay = day.day
                        } label: {
                            VStack(spacing: 2) {
                                Text("Day \(day.day)")
                                    .font(.caption.bold())
                                Text(String(format: "%.1f mi", day.distanceMiles))
                                    .font(.caption2)
                            }
                            .foregroundStyle(day.day == selectedDay ? .white : .primary)
                            .padding(.horizontal, 11)
                            .padding(.vertical, 8)
                            .background(day.day == selectedDay ? Color.green : Color(uiColor: .tertiarySystemGroupedBackground), in: Capsule())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Select Day \(day.day), \(String(format: "%.1f", day.distanceMiles)) miles")
                    }
                }
            }

            if let selected {
                FieldDayCard(day: selected, route: route)
            }
        }
        .fieldCard(tint: .green)
    }
}

private struct FieldDayCard: View {
    let day: FieldBrief.Day
    let route: FieldBrief.Route

    private var tint: Color { day.day == 3 ? .red : .green }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Day \(day.day) · \(day.title)")
                        .font(.headline.bold())
                        .foregroundStyle(tint)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("\(day.startName) → \(day.endName)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                Text(String(format: "%.3f mi", day.distanceMiles))
                    .font(.subheadline.bold())
            }

            HStack(spacing: 12) {
                FieldMetric(value: "+\(day.gainFeet.formatted())", label: "ft up")
                FieldMetric(value: "−\(day.lossFeet.formatted())", label: "ft down")
                FieldMetric(value: "\(day.highPointFeet.formatted())", label: "high ft")
            }
            Text(day.detail)
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 7) {
                FieldPill(text: String(format: "PCT %.3f–%.3f", day.pctMileStart, day.pctMileEnd), color: .secondary)
                if day.packMode == "day-pack-supported" {
                    FieldPill(text: "Day pack", color: .red)
                }
                if day.stopType == "support-transfer" {
                    FieldPill(text: "No camp", color: .red)
                }
            }

            Text("Elevation: \(day.startElevationFeet.formatted()) ft → \(day.endElevationFeet.formatted()) ft · route contract: \(String(format: "%.3f", route.officialPctaMiles)) PCTA mi")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.07), in: RoundedRectangle(cornerRadius: 13))
    }
}

private struct FieldReferenceCard: View {
    let brief: FieldBrief

    var body: some View {
        DisclosureGroup {
            VStack(alignment: .leading, spacing: 18) {
                EmergencyReference(brief: brief)
                CommsReference(items: brief.emergency.checkInProtocol)
                OfflineReference(brief: brief)
            }
            .padding(.top, 8)
        } label: {
            Label("Emergency, comms & offline reference", systemImage: "cross.case.fill")
                .font(.headline)
                .foregroundStyle(.red)
        }
        .fieldCard(tint: .red)
    }
}

private struct EmergencyReference: View {
    let brief: FieldBrief

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Emergency coordination")
                .font(.subheadline.bold())
            Text(brief.emergency.disclaimer)
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
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
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            ForEach(brief.emergency.contacts) { contact in
                VStack(alignment: .leading, spacing: 4) {
                    Text(contact.title)
                        .font(.subheadline.bold())
                    Text(contact.when)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    if let url = phoneURL(for: contact.value) {
                        Link(contact.value, destination: url)
                            .font(.subheadline.bold())
                    } else {
                        Text(contact.value)
                            .font(.subheadline.bold())
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    FieldSourceLinks(sources: contact.sourceIDs.compactMap { brief.sourcesByID[$0] })
                }
                .padding(10)
                .background(.red.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private func phoneURL(for phone: String) -> URL? {
        let dialable = phone.filter { $0.isNumber || $0 == "+" }
        return URL(string: "tel://\(dialable)")
    }
}

private struct CommsReference: View {
    let items: [FieldBrief.CheckInItem]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Comms and check-in")
                .font(.subheadline.bold())
            ForEach(items) { item in
                VStack(alignment: .leading, spacing: 3) {
                    Text(item.title)
                        .font(.subheadline.bold())
                    Text(item.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

private struct OfflineReference: View {
    let brief: FieldBrief

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Offline limits & data contract")
                .font(.subheadline.bold())
            ForEach(brief.offlineLimitations, id: \.self) { limitation in
                Label(limitation, systemImage: "exclamationmark.circle")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Text("\(brief.terrainContractVersion) · SHA-256 \(brief.terrainContractSha256)")
                .font(.caption2.monospaced())
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
                .fixedSize(horizontal: false, vertical: true)
            FieldSourceLinks(sources: brief.sourceIDs.compactMap { brief.sourcesByID[$0] })
        }
    }
}

private struct FieldSourceLinks: View {
    let sources: [TripOperations.OperationalSource]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(sources) { source in
                if let url = URL(string: source.url ?? "") {
                    Link(destination: url) {
                        Label(source.title, systemImage: "arrow.up.right.square")
                            .font(.caption2)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                } else {
                    Text(source.title)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
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
            .fixedSize(horizontal: false, vertical: true)
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
    func fieldCard(tint: Color) -> some View {
        padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(tint.opacity(0.22), lineWidth: 1))
    }
}

#Preview {
    SafetyView()
}
