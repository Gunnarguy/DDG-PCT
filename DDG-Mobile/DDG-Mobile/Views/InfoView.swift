import SwiftUI

/// Planning-only transport, access, parking, and resupply reference.
/// Safety and communications intentionally live in the Field workspace.
struct LogisticsView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Color(uiColor: .systemGroupedBackground).ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        
                        // Transit & Logistics
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Transit & Logistics").font(.title3.bold())
                            ForEach(transitRoutes) { route in
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(route.emoji)
                                        Text(route.name)
                                            .font(.headline)
                                        Spacer()
                                        Text(route.type.uppercased())
                                            .font(.system(size: 10, weight: .bold))
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(transitTypeColor(route.type).opacity(0.15), in: Capsule())
                                            .foregroundStyle(transitTypeColor(route.type))
                                    }

                                    Text("\(route.agency) · \(route.route)")
                                        .font(.subheadline.bold())
                                        .foregroundStyle(.secondary)

                                    Text(route.relevantFor)
                                        .font(.caption)
                                        .foregroundStyle(.tint)

                                    // Stops
                                    HStack(spacing: 4) {
                                        ForEach(Array(route.stops.enumerated()), id: \.offset) { idx, stop in
                                            Text(stop)
                                                .font(.system(size: 10))
                                            if idx < route.stops.count - 1 {
                                                Image(systemName: "arrow.right")
                                                    .font(.system(size: 8))
                                                    .foregroundStyle(.tertiary)
                                            }
                                        }
                                    }
                                    .foregroundStyle(.secondary)
                                    .padding(.top, 4)

                                    HStack(spacing: 12) {
                                        Text(route.frequency)
                                            .font(.caption2.bold())
                                            .foregroundStyle(.secondary)
                                        Spacer()
                                        if let cost = route.cost {
                                            Text(cost)
                                                .font(.caption.bold())
                                                .foregroundStyle(.green)
                                                .padding(.horizontal, 8)
                                                .padding(.vertical, 4)
                                                .background(.green.opacity(0.1), in: Capsule())
                                        }
                                    }
                                    .padding(.top, 4)

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
                                .padding()
                                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(.gray.opacity(0.2), lineWidth: 1))
                            }
                        }

                        // Airports & Rental Cars
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Airports & Rental Cars").font(.title3.bold())
                            ForEach(airportOptions) { airport in
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(airport.id)
                                            .font(.caption.bold().monospaced())
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(.blue.opacity(0.15), in: RoundedRectangle(cornerRadius: 6))
                                            .foregroundStyle(.blue)
                                        Text(airport.name)
                                            .font(.headline)
                                        if airport.recommended {
                                            Image(systemName: "star.fill")
                                                .font(.caption)
                                                .foregroundStyle(.yellow)
                                        }
                                    }
                                    
                                    HStack {
                                        Text(airport.distanceToBurney)
                                            .font(.caption.bold())
                                            .foregroundStyle(.secondary)
                                    }

                                    Text(airport.notes)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)

                                    if !airport.rentalAgencies.isEmpty {
                                        HStack(spacing: 6) {
                                            Image(systemName: "car.fill")
                                                .font(.caption2)
                                                .foregroundStyle(.tint)
                                            Text(airport.rentalAgencies.joined(separator: " · "))
                                                .font(.caption2.bold())
                                                .foregroundStyle(.secondary)
                                        }
                                        .padding(.top, 4)
                                    }
                                }
                                .padding()
                                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(.gray.opacity(0.2), lineWidth: 1))
                            }
                        }

                        // Trailhead Parking
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Trailhead Parking").font(.title3.bold())
                            ForEach(parkingLocations) { lot in
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(lot.location)
                                        .font(.headline)

                                    Label(lot.address, systemImage: "mappin")
                                        .font(.caption.bold())
                                        .foregroundStyle(.secondary)

                                    HStack(spacing: 12) {
                                        Label(lot.cost, systemImage: "dollarsign.circle")
                                            .font(.caption)
                                        Spacer()
                                        Label(lot.phone, systemImage: "phone")
                                            .font(.caption.bold())
                                            .foregroundStyle(.blue)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(.blue.opacity(0.1), in: Capsule())
                                    }
                                    .padding(.vertical, 4)

                                    Label(lot.security, systemImage: "lock.shield")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)

                                    if !lot.notes.isEmpty {
                                        Text(lot.notes)
                                            .font(.caption2)
                                            .foregroundStyle(.orange)
                                    }
                                }
                                .padding()
                                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(.gray.opacity(0.2), lineWidth: 1))
                            }
                        }

                        // Resupply Towns
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Resupply Towns").font(.title3.bold())
                            ForEach(resupplyTowns) { town in
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        Text(town.town)
                                            .font(.headline)
                                        Spacer()
                                        Text(town.trailDistance)
                                            .font(.caption2.bold())
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(.green.opacity(0.15), in: Capsule())
                                            .foregroundStyle(.green)
                                    }

                                    Text(town.services.joined(separator: " · "))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)

                                    Label(town.transitAccess, systemImage: "bus.fill")
                                        .font(.caption.bold())
                                        .foregroundStyle(.secondary)

                                    if !town.notes.isEmpty {
                                        Text(town.notes)
                                            .font(.caption2)
                                            .foregroundStyle(.orange)
                                    }
                                }
                                .padding()
                                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(.gray.opacity(0.2), lineWidth: 1))
                            }
                        }

                    }
                    .padding()
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("Travel & Logistics")
        }
    }

    private func transitTypeColor(_ type: String) -> Color {
        switch type {
        case "train": return .purple
        case "rail":  return .blue
        case "bus":   return .green
        default:      return .gray
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
    LogisticsView()
}
