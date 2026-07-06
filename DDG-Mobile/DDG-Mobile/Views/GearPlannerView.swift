import SwiftUI
import SwiftData
import Charts

struct GearPlannerView: View {
    @Query private var loadouts: [GearLoadout]
    @Query private var customItems: [CustomItem]
    @Environment(AuthManager.self) private var auth
    @State private var selectedHiker: String = "gunnar"
    @State private var showingAddItem = false
    @State private var gearBriefing: String?
    @State private var isAnalyzing = false
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        NavigationStack {
            ZStack {
                Color(uiColor: .systemGroupedBackground).ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Hiker picker
                        Picker("Hiker", selection: $selectedHiker) {
                            ForEach(DDGTeam.roster) { member in
                                Text("\(member.emoji) \(member.name)").tag(member.id)
                            }
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal)
                        
                        // Weight Dashboard
                        weightDashboard
                        
                        // AI Gear Analysis
                        if let briefing = gearBriefing {
                            gearBriefingBanner(briefing)
                        }
                        
                        // Category Cards
                        VStack(spacing: 16) {
                            ForEach(categoryGroups, id: \.category) { group in
                                categoryCard(for: group)
                            }
                        }
                        .padding(.horizontal)
                        
                        // Add Button
                        Button {
                            showingAddItem = true
                        } label: {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("Add Custom Item")
                            }
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(.blue.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
                            .foregroundStyle(.blue)
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationTitle("Gear Loadout")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await analyzeGear() }
                    } label: {
                        if isAnalyzing {
                            ProgressView().controlSize(.small)
                        } else {
                            Image(systemName: "sparkles")
                                .font(.title3)
                                .foregroundStyle(.purple)
                        }
                    }
                    .disabled(customItems.isEmpty || isAnalyzing)
                }
            }
            .onAppear {
                if let user = auth.currentUser { selectedHiker = user.id }
                if customItems.isEmpty {
                    seedDefaultGear()
                }
            }
            .sheet(isPresented: $showingAddItem) {
                AddCustomItemView { newItemId in
                    toggleItem(newItemId)
                }
            }
        }
    }

    // MARK: - Dashboard
    
    private var activeLoadout: GearLoadout? {
        loadouts.first { $0.hikerId == selectedHiker }
    }
    
    private var equippedItems: [CustomItem] {
        guard let itemIds = activeLoadout?.itemIds else { return [] }
        return customItems.filter { itemIds.contains($0.stableId) }
    }

    private var totalWeight: Double { equippedItems.reduce(0) { $0 + $1.weightInOz } }
    
    private var weightDashboard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(String(format: "%.1f lb", totalWeight / 16.0))
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                    Text("Base Weight (\(selectedHiker.capitalized))")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text(String(format: "%.0f oz", totalWeight))
                        .font(.title2.bold())
                    Text("Ounces")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                }
            }
            
            if !categoryGroups.isEmpty {
                Chart(categoryGroups, id: \.category) { group in
                    BarMark(
                        x: .value("Weight", group.totalOz),
                        y: .value("Total", "Total")
                    )
                    .foregroundStyle(by: .value("Category", group.category))
                }
                .chartXAxis(.hidden)
                .chartYAxis(.hidden)
                .frame(height: 30)
                .clipShape(Capsule())
                
                // Legend
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(categoryGroups, id: \.category) { group in
                            HStack(spacing: 4) {
                                Circle().fill(Color.blue) // Charts uses default palette if we don't map, but we'll let it auto-color or we can just show category text.
                                    .frame(width: 6, height: 6)
                                Text(group.category)
                                    .font(.caption2.bold())
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(.white.opacity(0.3), lineWidth: 1))
        .shadow(color: .black.opacity(0.05), radius: 10, y: 5)
        .padding(.horizontal)
    }

    // MARK: - Category Card
    
    private func categoryCard(for group: CategoryGroup) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Image(systemName: categoryIcon(group.category))
                    .foregroundStyle(.blue)
                    .font(.title3)
                Text(group.category)
                    .font(.headline)
                Spacer()
                Text(String(format: "%.1f oz", group.totalOz))
                    .font(.subheadline.bold())
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(.regularMaterial)
            
            Divider()
            
            // Items
            VStack(spacing: 12) {
                ForEach(group.items) { item in
                    let isEquipped = activeLoadout?.itemIds.contains(item.stableId) ?? false
                    Button {
                        toggleItem(item.stableId)
                    } label: {
                        HStack {
                            Image(systemName: isEquipped ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(isEquipped ? .green : .secondary)
                                .font(.title3)
                                .padding(.trailing, 4)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.name)
                                    .font(.subheadline.bold())
                                    .foregroundStyle(isEquipped ? .primary : .secondary)
                                if let detail = item.detail {
                                    Text(detail)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            
                            let carrying = hikersCarrying(item.stableId)
                            if !carrying.isEmpty {
                                HStack(spacing: 4) {
                                    ForEach(carrying, id: \.self) { hikerId in
                                        let member = DDGTeam.roster.first { $0.id == hikerId }
                                        Text(member?.name.prefix(1).uppercased() ?? "")
                                            .font(.system(size: 8, weight: .bold))
                                            .foregroundStyle(memberColor(hikerId))
                                            .frame(width: 16, height: 16)
                                            .background(memberColor(hikerId).opacity(0.15))
                                            .clipShape(Circle())
                                            .overlay(Circle().stroke(memberColor(hikerId).opacity(0.4), lineWidth: 0.5))
                                    }
                                }
                                .padding(.trailing, 4)
                            }
                            
                            Spacer()
                            if let weight = item.weightVal {
                                Text(String(format: "%.1f %@", weight, item.weightLabel ?? "oz"))
                                    .font(.caption.bold())
                                    .foregroundStyle(.secondary)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(.gray.opacity(0.15), in: Capsule())
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
            .background(Color(uiColor: .secondarySystemGroupedBackground))
        }
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.gray.opacity(0.2), lineWidth: 1))
        .shadow(color: .black.opacity(0.03), radius: 8, y: 4)
    }

    // MARK: - AI Gear Analysis

    private func gearBriefingBanner(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(.purple)
                Text("Siri Gear Analysis")
                    .font(.caption.bold())
                    .foregroundStyle(.purple)
                Spacer()
                Button {
                    withAnimation { gearBriefing = nil }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }
            Text(text)
                .font(.callout)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(LinearGradient(colors: [.purple.opacity(0.15), .blue.opacity(0.05)], startPoint: .topLeading, endPoint: .bottomTrailing))
        )
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.purple.opacity(0.2), lineWidth: 1))
        .padding(.horizontal)
    }

    private func analyzeGear() async {
        isAnalyzing = true
        defer { isAnalyzing = false }
        do {
            gearBriefing = try await OnDeviceLLM.shared.gearAnalysis(
                items: customItems,
                team: DDGTeam.roster
            )
        } catch {
            gearBriefing = "Could not analyze gear: \(error.localizedDescription)"
        }
    }

    // MARK: - Category Groups

    private struct CategoryGroup {
        let category: String
        let items: [CustomItem]
        let equippedItemIds: Set<String>
        var totalOz: Double {
            items.filter { equippedItemIds.contains($0.stableId) }
                .reduce(0) { $0 + $1.weightInOz }
        }
    }

    private var categoryGroups: [CategoryGroup] {
        let grouped = Dictionary(grouping: customItems, by: \.category)
        let equippedIds = Set(activeLoadout?.itemIds ?? [])
        
        let categoryOrder = ["Shelter", "Sleep", "Cooking", "Water", "Clothing", "Electronics", "Safety", "Custom"]
        
        return grouped.map { pair in
            // Sort items inside each category consistently alphabetically by name
            let sortedItems = pair.value.sorted { $0.name.localizedCompare($1.name) == .orderedAscending }
            return CategoryGroup(category: pair.key, items: sortedItems, equippedItemIds: equippedIds)
        }
        .sorted { g1, g2 in
            let idx1 = categoryOrder.firstIndex(of: g1.category) ?? 999
            let idx2 = categoryOrder.firstIndex(of: g2.category) ?? 999
            if idx1 != idx2 {
                return idx1 < idx2
            }
            return g1.category < g2.category
        }
    }

    private func categoryIcon(_ cat: String) -> String {
        switch cat.lowercased() {
        case "shelter": return "tent.fill"
        case "sleep": return "moon.fill"
        case "cooking": return "flame.fill"
        case "water": return "drop.fill"
        case "clothing": return "tshirt.fill"
        case "electronics": return "bolt.fill"
        case "safety": return "cross.case.fill"
        default: return "shippingbox.fill"
        }
    }
    
    // MARK: - Default Seeding
    
    private func seedDefaultGear() {
        let defaults: [(String, String, Double, String, String)] = [
            ("tent", "1-person backpacking tent", 24.0, "Shelter", "Ultralight tent"),
            ("quilt", "Sleeping bag/quilt (20°F)", 22.4, "Sleep", "Down quilt"),
            ("pad", "Inflatable sleeping pad", 14.4, "Sleep", "Insulated"),
            ("stove", "Canister stove", 3.2, "Cooking", "Threaded"),
            ("pot", "Small cooking pot (750ml)", 4.8, "Cooking", "Titanium"),
            ("filter", "Water filter (0.1µm)", 3.2, "Water", "Squeeze-style"),
            ("smartwater", "Smartwater bottle (1L) x3", 4.8, "Water", "Baseline capacity"),
            ("bear-proof", "Bear-proof food bag + rope", 12.8, "Safety", "Food storage"),
            ("satellite", "Satellite messenger", 3.2, "Electronics", "2-way + SOS"),
            ("smartphone", "Smartphone", 8.0, "Electronics", "Offline maps"),
            ("power-bank", "Power bank (10,000mAh)", 4.8, "Electronics", "Rechargeable"),
            ("headlamp", "Headlamp", 1.6, "Electronics", "Red mode"),
            ("rain-jacket", "Lightweight rain jacket", 8.0, "Clothing", "Waterproof shell"),
            ("sun-hoodie", "Sun hoodie", 6.4, "Clothing", "UPF long-sleeve"),
            ("down-jacket", "Insulated down jacket", 9.6, "Clothing", "Puffy"),
            ("socks", "Hiking socks (3 pairs)", 4.8, "Clothing", "Wool/synthetic"),
            ("first-aid", "First aid kit", 8.0, "Safety", "Trauma + blister tape")
        ]
        
        for item in defaults {
            let customItem = CustomItem(
                stableId: item.0,
                name: item.1,
                detail: item.4,
                weightVal: item.2,
                weightLabel: "oz",
                category: item.3
            )
            modelContext.insert(customItem)
        }
    }
    
    private func toggleItem(_ stableId: String) {
        if let loadout = activeLoadout {
            if loadout.itemIds.contains(stableId) {
                loadout.itemIds.removeAll { $0 == stableId }
            } else {
                loadout.itemIds.append(stableId)
            }
            loadout.updatedAt = Date()
            loadout.syncStatus = .local
        } else {
            let newLoadout = GearLoadout(hikerId: selectedHiker, itemIds: [stableId])
            modelContext.insert(newLoadout)
        }
        try? modelContext.save()
    }
    
    private func hikersCarrying(_ stableId: String) -> [String] {
        loadouts.filter { $0.itemIds.contains(stableId) }.map { $0.hikerId }.sorted()
    }
    
    private func memberColor(_ id: String) -> Color {
        switch id {
        case "gunnar": return .green
        case "dad":    return .blue
        case "drew":   return .purple
        default:       return .secondary
        }
    }
}

// MARK: - Add Custom Item Sheet

struct AddCustomItemView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var name = ""
    @State private var weight = ""
    @State private var category = "Custom"
    @State private var quantity = 1
    
    var onAdd: (String) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Item Name", text: $name)
                    TextField("Weight (oz)", text: $weight)
                        .keyboardType(.decimalPad)
                }
                
                Section {
                    Stepper("Quantity: \(quantity)", value: $quantity, in: 1...20)
                }
                
                Section {
                    Picker("Category", selection: $category) {
                        Text("Custom").tag("Custom")
                        Text("Shelter").tag("Shelter")
                        Text("Sleep").tag("Sleep")
                        Text("Cooking").tag("Cooking")
                        Text("Water").tag("Water")
                        Text("Clothing").tag("Clothing")
                        Text("Electronics").tag("Electronics")
                        Text("Safety").tag("Safety")
                    }
                    .pickerStyle(.menu)
                }
            }
            .navigationTitle("Add Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let finalName = quantity > 1 ? "\(name) (x\(quantity))" : name
                        let newItem = CustomItem(
                            name: finalName,
                            weightVal: Double(weight),
                            weightLabel: "oz",
                            category: category
                        )
                        modelContext.insert(newItem)
                        onAdd(newItem.stableId)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
}

#Preview {
    GearPlannerView()
        .modelContainer(for: [GearLoadout.self, CustomItem.self], inMemory: true)
        .environment(AuthManager.shared)
}
