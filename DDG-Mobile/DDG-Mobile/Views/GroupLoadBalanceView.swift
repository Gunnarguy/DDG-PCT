import SwiftUI
import SwiftData

/// Shows all three packs at once.
///
/// The hiker picker answers "what am I carrying" and nothing else, which hides
/// the two questions that only exist across a group: what has nobody picked
/// up, and what are we carrying three of. Both are structurally invisible when
/// you can only see one pack at a time, and both are discovered at the
/// trailhead if they are not surfaced here.
struct GroupLoadBalanceView: View {
    let loadouts: [GearLoadout]
    let allItems: [CustomItem]

    @State private var showDetails = false

    /// Day 3 is the load peak, so the projection uses that day rather than a
    /// trailhead figure: about 7.5 days of food remaining at 2 lb/day, plus the
    /// self-supported Peavine-to-Moosehead water carry.
    private let dayThreeFoodPounds = 15.0
    private let dayThreeWaterLitres = 10.5
    private let poundsPerLitre = 2.2046

    private var dayThreeWaterPounds: Double { dayThreeWaterLitres * poundsPerLitre }

    private func itemsFor(_ hikerId: String) -> [CustomItem] {
        let ids = Set(loadouts.first { $0.hikerId == hikerId }?.itemIds ?? [])
        return allItems.filter { ids.contains($0.stableId) }
    }

    private func carriedPounds(_ hikerId: String) -> Double {
        itemsFor(hikerId).reduce(0) { total, item in
            guard item.weightBucket == "carried" else { return total }
            let ounces = (item.weightVal ?? 0) * Double(max(item.quantity, 1))
            return total + ounces / 16.0
        }
    }

    /// Default-packed catalog items nobody has claimed. These are real gaps —
    /// gear that will simply not be on the trail.
    private var unclaimed: [GearCatalogItem] {
        let claimed = Set(loadouts.flatMap(\.itemIds))
        return GearCatalog.bundled.items.filter { $0.defaultPacked && !claimed.contains($0.id) }
    }

    /// Items more than one hiker is carrying. Sometimes correct, sometimes
    /// three tents — listed rather than judged, because nothing here can tell
    /// those apart and a wrong guess is worse than a list.
    private var duplicated: [(item: GearCatalogItem, carriers: [String])] {
        var byId: [String: [String]] = [:]
        for loadout in loadouts {
            for id in loadout.itemIds {
                byId[id, default: []].append(loadout.hikerId)
            }
        }
        return byId
            .filter { $0.value.count > 1 }
            .compactMap { entry in
                guard let item = GearCatalog.bundled.items.first(where: { $0.id == entry.key }) else {
                    return nil
                }
                return (item, entry.value.sorted())
            }
            .sorted { $0.item.name < $1.item.name }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Group load balance")
                    .font(.headline)
                Spacer()
                Button(showDetails ? "Hide" : "Gaps & doubles") {
                    withAnimation(.easeOut(duration: 0.18)) { showDetails.toggle() }
                }
                .font(.caption.bold())
            }

            ForEach(DDGTeam.roster) { member in
                let base = carriedPounds(member.id)
                let dayThree = base + dayThreeFoodPounds + dayThreeWaterPounds
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text("\(member.emoji) \(member.name)")
                            .font(.subheadline.bold())
                        Spacer()
                        Text("~\(Int(dayThree.rounded())) lb on Day 3")
                            .font(.caption.bold())
                            .foregroundStyle(.orange)
                    }
                    Text(member.pack)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text("\(base, specifier: "%.1f") lb base · \(itemsFor(member.id).count) items")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(member.loadRole)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(10)
                .background(Color(uiColor: .secondarySystemBackground),
                            in: RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(hex: member.color))
                        .frame(width: 4)
                        .frame(maxWidth: .infinity, alignment: .leading)
                )
            }

            Text("Day 3 adds \(Int(dayThreeFoodPounds)) lb of remaining food and \(dayThreeWaterLitres, specifier: "%.1f") L (\(Int(dayThreeWaterPounds.rounded())) lb) of water each — the self-supported Peavine-to-Moosehead carry. Water is the only heavy thing that moves freely between packs, so it is the lever for protecting the group pace.")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            if showDetails {
                Divider()

                VStack(alignment: .leading, spacing: 6) {
                    Text("Nobody is carrying these (\(unclaimed.count))")
                        .font(.subheadline.bold())
                    if unclaimed.isEmpty {
                        Text("Every default item is assigned to someone.")
                            .font(.caption)
                            .foregroundStyle(.green)
                    } else {
                        ForEach(unclaimed, id: \.id) { item in
                            Text("• \(item.name) — \(item.weightDisplay)")
                                .font(.caption)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("Carried by more than one (\(duplicated.count))")
                        .font(.subheadline.bold())
                    if duplicated.isEmpty {
                        Text("No item is doubled up.")
                            .font(.caption)
                            .foregroundStyle(.green)
                    } else {
                        ForEach(duplicated, id: \.item.id) { entry in
                            Text("• \(entry.item.name) — \(entry.carriers.joined(separator: ", "))")
                                .font(.caption)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Text("Some duplication is right — everyone needs their own socks and filter. Three tents is not. Listed rather than guessed at.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .padding(14)
        .background(Color(uiColor: .tertiarySystemBackground),
                    in: RoundedRectangle(cornerRadius: 12))
    }
}
