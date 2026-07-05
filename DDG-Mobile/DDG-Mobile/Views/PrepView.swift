import SwiftUI

struct PrepView: View {
    private let parking = parkingLocations
    private let resupply = resupplyTowns
    private let transit = transitRoutes

    var body: some View {
        NavigationStack {
            List {
                Section("Permits & Reservations") {
                    ChecklistRow(title: "PCT Long-Distance Permit", subtitle: "PCTA — apply early")
                    ChecklistRow(title: "Burney Falls Day Use", subtitle: "$10/vehicle")
                    ChecklistRow(title: "Castle Crags Parking", subtitle: "$10/day")
                    ChecklistRow(title: "Campfire Permit", subtitle: "CAL FIRE — free")
                }

                Section("Pre-Trip Checklist") {
                    ChecklistRow(title: "Water filter serviced", subtitle: "Sawyer Squeeze backflush")
                    ChecklistRow(title: "Bear canister packed", subtitle: "Required in wilderness areas")
                    ChecklistRow(title: "Emergency contacts shared", subtitle: "InReach share link to family")
                    ChecklistRow(title: "Trail register signed", subtitle: "At trailhead kiosk")
                    ChecklistRow(title: "Weather forecast checked", subtitle: "48hr before departure")
                    ChecklistRow(title: "Offline maps downloaded", subtitle: "Apple Maps or Gaia GPS")
                }

                Section("Parking Logistics") {
                    ForEach(parking) { lot in
                        VStack(alignment: .leading, spacing: 4) {
                            ChecklistRow(
                                title: "Parking: \(lot.location)",
                                subtitle: "\(lot.cost) · \(lot.address)"
                            )
                            if !lot.security.isEmpty {
                                HStack(spacing: 4) {
                                    Image(systemName: "lock.shield")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                    Text(lot.security)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.leading, 28)
                            }
                            if !lot.notes.isEmpty {
                                Text(lot.notes)
                                    .font(.caption2)
                                    .foregroundStyle(.orange)
                                    .padding(.leading, 28)
                            }
                        }
                    }
                }

                Section("Resupply Points") {
                    ForEach(resupply) { town in
                        VStack(alignment: .leading, spacing: 2) {
                            ChecklistRow(
                                title: "\(town.town) resupply",
                                subtitle: town.services.joined(separator: ", ")
                            )
                            if !town.notes.isEmpty {
                                Text(town.notes)
                                    .font(.caption2)
                                    .foregroundStyle(.orange)
                                    .padding(.leading, 28)
                            }
                        }
                    }
                }

                Section("Transit to Trailhead") {
                    ForEach(transit.filter { $0.relevantFor.lowercased().contains("approach") || $0.relevantFor.lowercased().contains("trailhead") || $0.relevantFor.lowercased().contains("all") }) { route in
                        ChecklistRow(
                            title: "\(route.agency) \(route.route)",
                            subtitle: "\(route.frequency) · \(route.cost ?? "")"
                        )
                    }
                    if transit.filter({ $0.relevantFor.lowercased().contains("approach") || $0.relevantFor.lowercased().contains("trailhead") || $0.relevantFor.lowercased().contains("all") }).isEmpty {
                        ForEach(transit.prefix(3)) { route in
                            ChecklistRow(
                                title: "\(route.agency) \(route.route)",
                                subtitle: "\(route.frequency) · \(route.cost ?? "")"
                            )
                        }
                    }
                }
            }
            .navigationTitle("Trip Prep")
        }
    }
}

struct ChecklistRow: View {
    let title: String
    let subtitle: String
    @State private var isChecked = false

    var body: some View {
        HStack {
            Button {
                isChecked.toggle()
            } label: {
                Image(systemName: isChecked ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isChecked ? .green : .secondary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading) {
                Text(title)
                    .strikethrough(isChecked)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    PrepView()
}
