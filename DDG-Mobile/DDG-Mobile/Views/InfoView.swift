import SwiftUI

/// Catch-all tab for logistics, resources, transit, and connectivity details
struct InfoView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Transit & Logistics") {
                    ForEach(transitRoutes) { route in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(route.emoji)
                                Text(route.name)
                                    .font(.body.bold())
                                Spacer()
                                Text(route.type.capitalized)
                                    .font(.system(size: 10, weight: .bold))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(transitTypeColor(route.type).opacity(0.15), in: Capsule())
                                    .foregroundStyle(transitTypeColor(route.type))
                            }

                            Text("\(route.agency) · \(route.route)")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Text(route.relevantFor)
                                .font(.caption)
                                .foregroundStyle(.tint)

                            // Stops
                            HStack(spacing: 4) {
                                ForEach(Array(route.stops.enumerated()), id: \.offset) { idx, stop in
                                    Text(stop)
                                        .font(.system(size: 9))
                                    if idx < route.stops.count - 1 {
                                        Image(systemName: "arrow.right")
                                            .font(.system(size: 7))
                                            .foregroundStyle(.tertiary)
                                    }
                                }
                            }
                            .foregroundStyle(.secondary)

                            HStack(spacing: 12) {
                                Text(route.frequency)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                if let cost = route.cost {
                                    Text(cost)
                                        .font(.caption2.bold())
                                        .foregroundStyle(.green)
                                }
                            }

                            if !route.notes.isEmpty {
                                Text(route.notes)
                                    .font(.caption2)
                                    .foregroundStyle(.orange)
                            }

                            if let url = URL(string: route.url) {
                                Link(destination: url) {
                                    Label(route.url.replacingOccurrences(of: "https://www.", with: ""), systemImage: "link")
                                        .font(.caption2)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }

                Section("Airports & Rental Cars") {
                    ForEach(airportOptions) { airport in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(airport.id)
                                    .font(.caption.bold().monospaced())
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(.blue.opacity(0.15), in: RoundedRectangle(cornerRadius: 4))
                                Text(airport.name)
                                    .font(.body)
                                if airport.recommended {
                                    Image(systemName: "star.fill")
                                        .font(.caption)
                                        .foregroundStyle(.yellow)
                                }
                            }
                            Text(airport.distanceToBurney)
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Text(airport.notes)
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            if !airport.rentalAgencies.isEmpty {
                                HStack(spacing: 4) {
                                    Image(systemName: "car.fill")
                                        .font(.caption2)
                                        .foregroundStyle(.tint)
                                    Text(airport.rentalAgencies.joined(separator: ", "))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }

                Section("Trailhead Parking") {
                    ForEach(parkingLocations) { lot in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(lot.location)
                                .font(.body.bold())

                            Label(lot.address, systemImage: "mappin")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            HStack(spacing: 12) {
                                Label(lot.cost, systemImage: "dollarsign.circle")
                                    .font(.caption)
                                Label(lot.phone, systemImage: "phone")
                                    .font(.caption)
                                    .foregroundStyle(.blue)
                            }

                            Label(lot.security, systemImage: "lock.shield")
                                .font(.caption2)
                                .foregroundStyle(.secondary)

                            if !lot.notes.isEmpty {
                                Text(lot.notes)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }

                Section("Resupply Towns") {
                    ForEach(resupplyTowns) { town in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(town.town)
                                    .font(.body.bold())
                                Spacer()
                                Text(town.trailDistance)
                                    .font(.caption2)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(.green.opacity(0.12), in: Capsule())
                            }

                            Text(town.services.joined(separator: " · "))
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Label(town.transitAccess, systemImage: "bus.fill")
                                .font(.caption)

                            if !town.notes.isEmpty {
                                Text(town.notes)
                                    .font(.caption2)
                                    .foregroundStyle(.orange)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }

                Section("Satellite Devices") {
                    ForEach(satelliteDevices) { device in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(device.device)
                                .font(.body.bold())

                            // Features as individual chips
                            FlowLayout(spacing: 4) {
                                ForEach(device.features, id: \.self) { feature in
                                    Text(feature)
                                        .font(.system(size: 10))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(.blue.opacity(0.1), in: Capsule())
                                }
                            }

                            Text(device.coverage)
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Text(device.compatibility)
                                .font(.caption2)
                                .foregroundStyle(.secondary)

                            HStack {
                                Text(device.cost)
                                    .font(.caption.bold())
                                    .foregroundStyle(.tint)
                                Spacer()
                            }

                            Text(device.trailNotes)
                                .font(.caption)
                                .foregroundStyle(.orange)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Info & Resources")
        }
    }

    private func transitTypeColor(_ type: String) -> Color {
        switch type {
        case "train": .purple
        case "rail":  .blue
        case "bus":   .green
        default:      .gray
        }
    }
}

// MARK: - Flow Layout for feature chips

struct FlowLayout: Layout {
    var spacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, offset) in result.offsets.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + offset.x, y: bounds.minY + offset.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (offsets: [CGPoint], size: CGSize) {
        let maxW = proposal.width ?? .infinity
        var offsets: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxW, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            offsets.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return (offsets, CGSize(width: maxX, height: y + rowHeight))
    }
}

#Preview {
    InfoView()
}
