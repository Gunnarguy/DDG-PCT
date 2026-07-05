import SwiftUI
import SwiftData

struct GearPlannerView: View {
    @Query private var loadouts: [GearLoadout]
    @Query private var customItems: [CustomItem]
    @Environment(AuthManager.self) private var auth
    @State private var selectedHiker: String = "gunnar"
    @State private var showingAddItem = false
    @State private var gearBriefing: String?
    @State private var isAnalyzing = false

    var body: some View {
        NavigationStack {
            VStack {
                // Hiker picker
                Picker("Hiker", selection: $selectedHiker) {
                    ForEach(DDGTeam.roster) { member in
                        Text("\(member.emoji) \(member.name)").tag(member.id)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                // Weight summary
                weightSummary

                // AI Gear Analysis
                if let briefing = gearBriefing {
                    gearBriefingBanner(briefing)
                }

                // Items list grouped by category
                List {
                    ForEach(categoryGroups, id: \.category) { group in
                        Section {
                            ForEach(group.items) { item in
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(item.name)
                                            .font(.body)
                                        if let detail = item.detail {
                                            Text(detail)
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    Spacer()
                                    if let weight = item.weightVal {
                                        Text(String(format: "%.1f %@", weight, item.weightLabel ?? "oz"))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        } header: {
                            HStack {
                                Image(systemName: categoryIcon(group.category))
                                    .font(.caption)
                                Text(group.category)
                                Spacer()
                                Text(String(format: "%.1f oz", group.totalOz))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    Section {
                        Button {
                            showingAddItem = true
                        } label: {
                            Label("Add Custom Item", systemImage: "plus.circle")
                        }
                    }
                }
            }
            .navigationTitle("Gear Planner")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await analyzeGear() }
                    } label: {
                        if isAnalyzing {
                            ProgressView()
                                .controlSize(.mini)
                        } else {
                            Image(systemName: "sparkles")
                        }
                    }
                    .disabled(customItems.isEmpty || isAnalyzing)
                }
            }
            .onAppear {
                if let user = auth.currentUser {
                    selectedHiker = user.id
                }
            }
            .sheet(isPresented: $showingAddItem) {
                AddCustomItemView()
            }
        }
    }

    // MARK: - AI Gear Analysis

    private func gearBriefingBanner(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(.purple)
                Text("Gear Analysis")
                    .font(.caption.bold())
                Spacer()
                Button {
                    gearBriefing = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            Text(text)
                .font(.callout)
        }
        .padding()
        .background(.purple.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
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

    private var totalWeight: Double {
        customItems.reduce(0) { $0 + $1.weightInOz }
    }

    // MARK: - Category Groups

    private struct CategoryGroup {
        let category: String
        let items: [CustomItem]
        var totalOz: Double { items.reduce(0) { $0 + $1.weightInOz } }
    }

    private var categoryGroups: [CategoryGroup] {
        let grouped = Dictionary(grouping: customItems, by: \.category)
        return grouped.map { CategoryGroup(category: $0.key, items: $0.value) }
            .sorted { $0.totalOz > $1.totalOz }
    }

    private func categoryIcon(_ cat: String) -> String {
        switch cat.lowercased() {
        case "shelter":     "tent.fill"
        case "sleep":       "moon.fill"
        case "cooking":     "flame.fill"
        case "water":       "drop.fill"
        case "clothing":    "tshirt.fill"
        case "electronics": "bolt.fill"
        case "safety":      "cross.case.fill"
        default:            "shippingbox.fill"
        }
    }

    private var weightSummary: some View {
        HStack(spacing: 20) {
            VStack {
                Text(String(format: "%.1f oz", totalWeight))
                    .font(.title2.bold())
                Text("Total Weight")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            VStack {
                Text(String(format: "%.1f lb", totalWeight / 16.0))
                    .font(.title2.bold())
                Text("Pounds")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

// MARK: - Add Custom Item Sheet

struct AddCustomItemView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var name = ""
    @State private var weight = ""
    @State private var category = "Custom"

    var body: some View {
        NavigationStack {
            Form {
                TextField("Item Name", text: $name)
                TextField("Weight (oz)", text: $weight)
                    .keyboardType(.decimalPad)
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
            }
            .navigationTitle("Add Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let item = CustomItem(
                            name: name,
                            weightVal: Double(weight),
                            weightLabel: "oz",
                            category: category
                        )
                        modelContext.insert(item)
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
