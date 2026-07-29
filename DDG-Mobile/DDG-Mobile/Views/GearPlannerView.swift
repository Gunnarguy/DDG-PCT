import SwiftData
import SwiftUI

struct GearPlannerView: View {
    private enum ListMode: String, CaseIterable, Identifiable {
        case pack = "In Pack"
        case shed = "Missing"
        case all = "All Gear"

        var id: Self { self }
    }

    fileprivate struct CategoryGroup: Identifiable {
        let category: String
        let module: GearModule?
        let items: [CustomItem]

        var id: String { category }
    }

    @Environment(\.modelContext) private var modelContext
    @Environment(AuthManager.self) private var auth
    @Query private var loadouts: [GearLoadout]
    @Query private var customItems: [CustomItem]

    @State private var selectedHiker = "gunnar"
    @State private var listMode: ListMode = .all
    @State private var selectedCategory = "All"
    @State private var searchText = ""
    @State private var showingAddItem = false
    @State private var gearBriefing: String?
    @State private var isAnalyzing = false

    private let catalog = GearCatalog.bundled

    private var activeLoadout: GearLoadout? {
        loadouts.first { $0.hikerId == selectedHiker }
    }

    private var equippedIds: Set<String> {
        Set(activeLoadout?.itemIds ?? [])
    }

    private var equippedItems: [CustomItem] {
        customItems.filter { equippedIds.contains($0.stableId) }
    }

    private var categoryNames: [String] {
        ["All"] + catalog.modules.map(\.label) + ["Custom"]
    }

    private var filteredItems: [CustomItem] {
        customItems
            .filter { item in
                switch listMode {
                case .pack: equippedIds.contains(item.stableId)
                case .shed: !equippedIds.contains(item.stableId)
                case .all: true
                }
            }
            .filter { selectedCategory == "All" || $0.category == selectedCategory }
            .filter {
                searchText.isEmpty ||
                    $0.name.localizedCaseInsensitiveContains(searchText) ||
                    ($0.detail?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                    $0.specs.contains { $0.localizedCaseInsensitiveContains(searchText) }
            }
    }

    private var categoryGroups: [CategoryGroup] {
        let grouped = Dictionary(grouping: filteredItems, by: \.category)
        return grouped.map { category, items in
            CategoryGroup(
                category: category,
                module: catalog.modules.first { $0.label == category },
                items: items.sorted { $0.name.localizedCompare($1.name) == .orderedAscending }
            )
        }
        .sorted { first, second in
            let order = catalog.modules.map(\.label) + ["Custom"]
            return (order.firstIndex(of: first.category) ?? .max) <
                (order.firstIndex(of: second.category) ?? .max)
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    hikerPicker
                    GearWeightDashboard(
                        selectedHiker: selectedHiker,
                        equippedItems: equippedItems,
                        loadouts: loadouts,
                        allItems: customItems,
                        goalPounds: catalog.baseWeightGoalPounds
                    )

                    if let gearBriefing {
                        GearBriefingBanner(text: gearBriefing) {
                            withAnimation { self.gearBriefing = nil }
                        }
                    }

                    listControls

                    if categoryGroups.isEmpty {
                        ContentUnavailableView(
                            "No matching gear",
                            systemImage: "backpack",
                            description: Text("Change the pack filter, category, or search.")
                        )
                        .frame(minHeight: 240)
                    } else {
                        ForEach(categoryGroups) { group in
                            GearCategorySection(
                                group: group,
                                equippedIds: equippedIds,
                                selectedHiker: selectedHiker,
                                sourcesById: catalog.sourcesById,
                                carriersForItem: hikersCarrying,
                                onToggle: { toggleItem($0, for: selectedHiker) },
                                onToggleCarrier: toggleItem
                            )
                        }
                    }

                    addCustomItemButton
                }
                .padding()
                .padding(.bottom, 32)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Gear Loadouts")
            .searchable(text: $searchText, prompt: "Search \(customItems.count) gear items")
            .toolbar { toolbarContent }
            .onAppear(perform: prepareCatalog)
            .sheet(isPresented: $showingAddItem) {
                AddCustomItemView { newItemId in
                    toggleItem(newItemId, for: selectedHiker)
                }
            }
        }
    }

    private var hikerPicker: some View {
        Picker("Hiker", selection: $selectedHiker) {
            ForEach(DDGTeam.roster) { member in
                Text("\(member.emoji) \(member.name)").tag(member.id)
            }
        }
        .pickerStyle(.segmented)
        .onChange(of: selectedHiker) { _, _ in
            gearBriefing = nil
        }
    }

    private var listControls: some View {
        VStack(spacing: 12) {
            Picker("Gear view", selection: $listMode) {
                ForEach(ListMode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(categoryNames, id: \.self) { category in
                        Button(category) {
                            selectedCategory = category
                        }
                        .font(.caption.bold())
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .foregroundStyle(selectedCategory == category ? .white : .primary)
                        .background(
                            selectedCategory == category ? Color.blue : Color.gray.opacity(0.14),
                            in: Capsule()
                        )
                    }
                }
            }

            HStack {
                Text("\(filteredItems.count) shown")
                Spacer()
                Text("\(equippedItems.count) equipped · \(customItems.count - equippedItems.count) missing")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private var addCustomItemButton: some View {
        Button {
            showingAddItem = true
        } label: {
            Label("Add Custom Item", systemImage: "plus.circle.fill")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(.blue.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            Button {
                Task { await analyzeGear() }
            } label: {
                isAnalyzing ? AnyView(ProgressView().controlSize(.small)) :
                    AnyView(Image(systemName: "sparkles").foregroundStyle(.purple))
            }
            .disabled(equippedItems.isEmpty || isAnalyzing)

            Menu {
                Button("Equip Recommended \(catalog.items.filter(\.defaultPacked).count)") {
                    applyRecommendedDefaults()
                }
                Button("Show Missing Gear") {
                    listMode = .shed
                }
                Divider()
                Button("Clear \(selectedHiker.capitalized)'s Pack", role: .destructive) {
                    clearActiveLoadout()
                }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        }
    }

    private func prepareCatalog() {
        if let user = auth.currentUser {
            selectedHiker = user.id
        }
        let existingById = Dictionary(grouping: customItems, by: \.stableId)
            .compactMapValues(\.first)
        for catalogItem in catalog.items {
            if let item = existingById[catalogItem.id] {
                item.name = catalogItem.name
                item.detail = catalogItem.detail
                item.weightVal = catalogItem.weightOunces
                item.weightLabel = "oz"
                item.category = catalogItem.category
                item.moduleId = catalogItem.moduleId
                item.sourceIds = catalogItem.sourceIds
                item.specs = catalogItem.specs
                item.defaultPacked = catalogItem.defaultPacked
                item.weightBucket = catalogItem.weightBucket
                item.quantity = catalogItem.quantity
                item.syncStatus = .synced
            } else {
                modelContext.insert(
                    CustomItem(
                        stableId: catalogItem.id,
                        name: catalogItem.name,
                        detail: catalogItem.detail,
                        weightVal: catalogItem.weightOunces,
                        weightLabel: "oz",
                        category: catalogItem.category,
                        moduleId: catalogItem.moduleId,
                        sourceIds: catalogItem.sourceIds,
                        specs: catalogItem.specs,
                        defaultPacked: catalogItem.defaultPacked,
                        weightBucket: catalogItem.weightBucket,
                        quantity: catalogItem.quantity,
                        syncStatus: .synced
                    )
                )
            }
        }
        UserDefaults.standard.set(catalog.version, forKey: "gearPlannerSeedVersion")
        try? modelContext.save()
    }

    private func applyRecommendedDefaults() {
        let recommended = Set(catalog.items.filter(\.defaultPacked).map(\.id))
        let customEquipped = equippedIds.filter { id in
            !catalog.items.contains { $0.id == id }
        }
        setLoadoutItems(Array(recommended.union(customEquipped)), for: selectedHiker)
        listMode = .pack
    }

    private func clearActiveLoadout() {
        setLoadoutItems([], for: selectedHiker)
    }

    private func setLoadoutItems(_ itemIds: [String], for hikerId: String) {
        if let loadout = loadouts.first(where: { $0.hikerId == hikerId }) {
            loadout.itemIds = itemIds.sorted()
            loadout.updatedAt = .now
            loadout.syncStatus = .local
        } else {
            modelContext.insert(GearLoadout(hikerId: hikerId, itemIds: itemIds.sorted()))
        }
        try? modelContext.save()
        Task {
            await SyncEngine.shared.syncPendingChanges(modelContext: modelContext)
        }
    }

    private func toggleItem(_ stableId: String, for hikerId: String) {
        let loadout = loadouts.first { $0.hikerId == hikerId }
        var itemIds = Set(loadout?.itemIds ?? [])
        if itemIds.contains(stableId) {
            itemIds.remove(stableId)
        } else {
            itemIds.insert(stableId)
        }
        setLoadoutItems(Array(itemIds), for: hikerId)
    }

    private func hikersCarrying(_ stableId: String) -> [String] {
        let teamIds = Set(DDGTeam.roster.map(\.id))
        return loadouts
            .filter {
                teamIds.contains($0.hikerId) &&
                    $0.itemIds.contains(stableId)
            }
            .map(\.hikerId)
            .sorted()
    }

    private func analyzeGear() async {
        isAnalyzing = true
        defer { isAnalyzing = false }
        do {
            gearBriefing = try await OnDeviceLLM.shared.gearAnalysis(
                items: equippedItems,
                team: DDGTeam.roster
            )
        } catch {
            gearBriefing = "Could not analyze gear: \(error.localizedDescription)"
        }
    }
}

private struct GearWeightDashboard: View {
    let selectedHiker: String
    let equippedItems: [CustomItem]
    let loadouts: [GearLoadout]
    let allItems: [CustomItem]
    let goalPounds: Double

    private func pounds(for bucket: String) -> Double {
        equippedItems
            .filter { $0.weightBucket == bucket }
            .reduce(0) { $0 + $1.weightInOz } / 16
    }

    private func carriedPounds(for hikerId: String) -> Double {
        let ids = Set(loadouts.first { $0.hikerId == hikerId }?.itemIds ?? [])
        return allItems
            .filter { ids.contains($0.stableId) && $0.weightBucket == "carried" }
            .reduce(0) { $0 + $1.weightInOz } / 16
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                Text(String(format: "%.1f lb", pounds(for: "carried")))
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                Text("/ \(goalPounds.formatted()) lb base goal")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(equippedItems.count) items")
                    .font(.subheadline.bold())
            }

            ProgressView(
                value: min(pounds(for: "carried"), goalPounds),
                total: max(goalPounds, 1)
            )
            .tint(pounds(for: "carried") > goalPounds ? .red : .green)

            HStack {
                metric("Base", pounds(for: "carried"), .green)
                metric("Worn", pounds(for: "worn"), .blue)
                metric("Consumable", pounds(for: "consumable"), .orange)
            }

            Divider()

            HStack {
                ForEach(DDGTeam.roster) { member in
                    Text("\(member.emoji) \(String(format: "%.1f", carriedPounds(for: member.id))) lb")
                        .font(.caption.bold())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(
                            member.id == selectedHiker
                                ? Color(hex: member.color).opacity(0.18)
                                : Color.gray.opacity(0.1),
                            in: Capsule()
                        )
                }
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
    }

    private func metric(_ title: String, _ pounds: Double, _ color: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(String(format: "%.1f lb", pounds))
                .font(.headline)
                .foregroundStyle(color)
            Text(title)
                .font(.caption2.bold())
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct GearCategorySection: View {
    let group: GearPlannerView.CategoryGroup
    let equippedIds: Set<String>
    let selectedHiker: String
    let sourcesById: [String: GearSource]
    let carriersForItem: (String) -> [String]
    let onToggle: (String) -> Void
    let onToggleCarrier: (String, String) -> Void

    @State private var isExpanded = true

    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            VStack(spacing: 0) {
                ForEach(group.items) { item in
                    GearItemRow(
                        item: item,
                        isEquipped: equippedIds.contains(item.stableId),
                        selectedHiker: selectedHiker,
                        carrierIds: carriersForItem(item.stableId),
                        sources: item.sourceIds.compactMap { sourcesById[$0] },
                        onToggle: { onToggle(item.stableId) },
                        onToggleCarrier: { onToggleCarrier(item.stableId, $0) }
                    )
                    if item.stableId != group.items.last?.stableId {
                        Divider().padding(.leading, 44)
                    }
                }
            }
            .padding(.top, 8)
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Label(group.category, systemImage: categoryIcon(group.category))
                        .font(.headline)
                    Spacer()
                    Text("\(group.items.count)")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                }
                if let module = group.module {
                    Text("\(module.readiness.uppercased()) · \(module.focus)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
        }
        .padding()
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }

    private func categoryIcon(_ category: String) -> String {
        switch category {
        case "Shelter + Sleep": "tent.fill"
        case "Kitchen + Hydration": "flame.fill"
        case "Navigation + Tech": "location.north.fill"
        case "Layers + Fuel Buffer": "tshirt.fill"
        case "Safety + Hygiene": "cross.case.fill"
        case "Secret Weapons (The Nuance)": "star.fill"
        default: "shippingbox.fill"
        }
    }
}

private struct GearItemRow: View {
    let item: CustomItem
    let isEquipped: Bool
    let selectedHiker: String
    let carrierIds: [String]
    let sources: [GearSource]
    let onToggle: () -> Void
    let onToggleCarrier: (String) -> Void

    @State private var showsDetails = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 10) {
                Button(action: onToggle) {
                    Image(systemName: isEquipped ? "checkmark.circle.fill" : "circle")
                        .font(.title3)
                        .foregroundStyle(isEquipped ? .green : .secondary)
                }
                .accessibilityLabel(isEquipped ? "Unequip" : "Equip")

                Button {
                    withAnimation { showsDetails.toggle() }
                } label: {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.name)
                            .font(.subheadline.bold())
                            .foregroundStyle(.primary)
                            .multilineTextAlignment(.leading)
                        HStack(spacing: 6) {
                            Text(weightLabel)
                            Text(item.weightBucket.capitalized)
                            if item.quantity > 1 {
                                Text("Qty \(item.quantity)")
                            }
                        }
                        .font(.caption2.bold())
                        .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)

                Menu {
                    Section("Assign carriers") {
                        ForEach(DDGTeam.roster) { member in
                            Button {
                                onToggleCarrier(member.id)
                            } label: {
                                if carrierIds.contains(member.id) {
                                    Label(member.name, systemImage: "checkmark")
                                } else {
                                    Text(member.name)
                                }
                            }
                        }
                    }
                } label: {
                    Image(systemName: "person.2.circle")
                        .font(.title3)
                }
            }

            if !carrierIds.isEmpty {
                HStack(spacing: 5) {
                    Text("Carried by")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    ForEach(carrierIds, id: \.self) { id in
                        if let member = DDGTeam.roster.first(where: { $0.id == id }) {
                            Text("\(member.emoji) \(member.name)")
                                .font(.caption2.bold())
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(Color(hex: member.color).opacity(0.14), in: Capsule())
                        }
                    }
                }
                .padding(.leading, 34)
            }

            if showsDetails {
                VStack(alignment: .leading, spacing: 8) {
                    if let detail = item.detail, !detail.isEmpty {
                        Text(detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    FlowLayout(spacing: 5) {
                        ForEach(item.specs, id: \.self) { spec in
                            Text(spec)
                                .font(.system(size: 10, weight: .semibold))
                                .padding(.horizontal, 7)
                                .padding(.vertical, 4)
                                .background(.blue.opacity(0.1), in: Capsule())
                        }
                    }

                    if !sources.isEmpty {
                        FlowLayout(spacing: 5) {
                            ForEach(sources) { source in
                                if let urlString = source.url, let url = URL(string: urlString) {
                                    Link(source.title, destination: url)
                                        .font(.system(size: 10, weight: .semibold))
                                        .lineLimit(1)
                                } else {
                                    Text(source.title)
                                        .font(.system(size: 10, weight: .semibold))
                                        .lineLimit(1)
                                }
                            }
                        }
                    }
                }
                .padding(.leading, 34)
            }
        }
        .padding(.vertical, 10)
    }

    private var weightLabel: String {
        guard let weight = item.weightVal else { return "No weight" }
        if weight >= 16 {
            return String(format: "%.1f lb", weight / 16)
        }
        return String(format: "%.1f oz", weight)
    }
}

private struct GearBriefingBanner: View {
    let text: String
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label("Siri Gear Analysis", systemImage: "sparkles")
                    .font(.caption.bold())
                    .foregroundStyle(.purple)
                Spacer()
                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }
            Text(text)
                .font(.callout)
        }
        .padding()
        .background(
            LinearGradient(
                colors: [.purple.opacity(0.15), .blue.opacity(0.05)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 16)
        )
    }
}

struct AddCustomItemView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var name = ""
    @State private var detail = ""
    @State private var weight = ""
    @State private var category = "Custom"
    @State private var quantity = 1
    @State private var weightBucket = "carried"
    @State private var specs = ""

    let onAdd: (String) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section("Item") {
                    TextField("Item name", text: $name)
                    TextField("Why it matters", text: $detail, axis: .vertical)
                    TextField("Total weight (oz)", text: $weight)
                        .keyboardType(.decimalPad)
                    Stepper("Quantity: \(quantity)", value: $quantity, in: 1...20)
                }

                Section("Accounting") {
                    Picker("Weight bucket", selection: $weightBucket) {
                        Text("Base / carried").tag("carried")
                        Text("Worn").tag("worn")
                        Text("Consumable").tag("consumable")
                    }
                    Picker("Category", selection: $category) {
                        ForEach(GearCatalog.bundled.modules.map(\.label) + ["Custom"], id: \.self) {
                            Text($0).tag($0)
                        }
                    }
                    TextField("Specs, comma separated", text: $specs)
                }
            }
            .navigationTitle("Add Gear")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add", action: addItem)
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func addItem() {
        let moduleId = GearCatalog.bundled.modules.first { $0.label == category }?.id ?? "custom"
        let newItem = CustomItem(
            name: name.trimmingCharacters(in: .whitespaces),
            detail: detail.trimmingCharacters(in: .whitespaces),
            weightVal: Double(weight),
            weightLabel: "oz",
            category: category,
            moduleId: moduleId,
            specs: specs
                .split(separator: ",")
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty },
            weightBucket: weightBucket,
            quantity: quantity
        )
        modelContext.insert(newItem)
        onAdd(newItem.stableId)
        dismiss()
    }
}

#Preview {
    GearPlannerView()
        .modelContainer(for: [GearLoadout.self, CustomItem.self], inMemory: true)
        .environment(AuthManager.shared)
}
