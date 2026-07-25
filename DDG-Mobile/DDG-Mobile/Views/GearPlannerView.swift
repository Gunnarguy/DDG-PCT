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
                let seedVersion = UserDefaults.standard.integer(forKey: "gearPlannerSeedVersion")
                if seedVersion < 2 {
                    for item in customItems {
                        modelContext.delete(item)
                    }
                    seedDefaultGear()
                    UserDefaults.standard.set(2, forKey: "gearPlannerSeedVersion")
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
        
        let categoryOrder = ["Shelter + Sleep", "Kitchen + Hydration", "Navigation + Tech", "Layers + Fuel Buffer", "Safety + Hygiene", "Secret Weapons (The Nuance)", "Custom"]
        
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
        case "shelter + sleep": return "tent.fill"
        case "kitchen + hydration": return "flame.fill"
        case "navigation + tech": return "bolt.fill"
        case "layers + fuel buffer": return "tshirt.fill"
        case "safety + hygiene": return "cross.case.fill"
        case "secret weapons (the nuance)": return "star.fill"
        default: return "shippingbox.fill"
        }
    }
    
    // MARK: - Default Seeding
    
    private func seedDefaultGear() {
        let defaults: [(String, String, Double, String, String)] = [
            ("tent", "1-person backpacking tent", 24.0, "Shelter + Sleep", "Ultralight tent that sets up with trekking poles or on its own. Keeps you dry in rain and blocks wind."),
            ("quilt", "Sleeping bag/quilt (rated to 20°F)", 22.4, "Shelter + Sleep", "Lightweight down blanket that wraps around you like a sleeping bag. Keeps you warm on cold mountain nights."),
            ("pad", "Inflatable sleeping pad", 14.4, "Shelter + Sleep", "Air mattress for sleeping outdoors—cushions you from rocks and insulates from cold ground. Packs small."),
            ("pillow", "Inflatable camp pillow", 3.2, "Shelter + Sleep", "Small inflatable pillow for better sleep. Optional comfort item—some hikers just use a stuffed jacket instead."),
            ("groundsheet", "Thin plastic groundsheet", 1.6, "Shelter + Sleep", "Sheet of plastic that goes under your tent to protect it from sharp rocks and moisture."),
            ("stove", "Lightweight canister stove (threaded, wind-tolerant)", 3.2, "Kitchen + Hydration", "Threaded canister stove for fast boils in breezy conditions. Target ~2–4 oz stove weight. CA Campfire Permit required (even for stoves)."),
            ("pot", "Small cooking pot (750ml)", 4.8, "Kitchen + Hydration", "Lightweight metal pot for boiling water and cooking meals. Holds about 3 cups—enough for one person."),
            ("fuel", "Small fuel canister (isobutane 100g)", 6.4, "Kitchen + Hydration", "Fuel for the canister stove; roughly 4 days of hot meals."),
            ("filter", "Water filter (squeeze-style, 0.1µm)", 3.2, "Kitchen + Hydration", "Squeeze-style hollow-fiber filter for streams. Prioritize a field-backflushable design to keep flow rate up."),
            ("grayl", "Grayl water purifier bottle", 11.2, "Kitchen + Hydration", "Press-to-purify water bottle with built-in filter. Removes viruses, bacteria, and protozoa. Great backup/camp option."),
            ("water-tabs", "Water treatment tablets (backup)", 1.6, "Kitchen + Hydration", "Chemical purification tablets for emergency backup when filters fail. Lightweight insurance policy."),
            ("dirty-bag", "Dirty water bag (2L, wide-mouth)", 3.2, "Kitchen + Hydration", "Collapsible dirty-water collection bag for filtering. Wide-mouth + tough seams matter more than brand."),
            ("smartwater", "Water bottle (1L) (x3)", 14.4, "Kitchen + Hydration", "Lightweight plastic drink bottle used as your main water carry. Pack three 1-liter bottles for 3L baseline capacity."),
            ("platypus", "Extra collapsible water bag (2L)", 3.2, "Kitchen + Hydration", "Soft bag that rolls up when empty. Use for extra water capacity when crossing long dry stretches."),
            ("bear-hang", "Bear-proof food bag + rope", 12.8, "Kitchen + Hydration", "Special bag and rope to hang your food from a tree at night. Keeps bears from eating your supplies."),
            ("spork", "Long-handled spoon", 1.6, "Kitchen + Hydration", "Long spoon to eat out of deep food bags. Lightweight metal version lasts forever."),
            ("tuna-packets", "Tuna/chicken packets", 3.2, "Kitchen + Hydration", "Shelf-stable protein packets. Dad swears by these—worked for him last time. Pack 2-3 per day for reliable protein."),
            ("protein-bars", "High-protein bars", 4.8, "Kitchen + Hydration", "Dense protein bars for quick calories. 15-20g protein per bar. Pack multiple per day."),
            ("jerky", "Beef/turkey jerky", 3.2, "Kitchen + Hydration", "Lightweight dried meat for trail snacking. High protein, low moisture. Lasts forever in a pack."),
            ("inreach", "Satellite messenger (2-way + SOS)", 3.2, "Navigation + Tech", "2-way satellite messaging for check-ins when there's no cell service, plus SOS capability for emergencies."),
            ("phone", "Smartphone with downloaded maps", 8.0, "Navigation + Tech", "Your phone with trail maps downloaded for offline use. Works even without cell service."),
            ("power-bank", "Portable battery charger (10,000mAh)", 4.8, "Navigation + Tech", "Rechargeable battery pack to charge your phone and devices."),
            ("cables", "Charging cables", 1.6, "Navigation + Tech", "Cables to charge your phone and satellite messenger from the battery pack."),
            ("headlamp", "Rechargeable headlamp (red mode)", 1.6, "Navigation + Tech", "Hands-free light with red mode for camp. Aim for USB-rechargeable, a low-power setting for long nights, and a real lockout so it doesn't turn on in the pack."),
            ("backup-nav", "Paper map + compass", 1.6, "Navigation + Tech", "Old-school backup navigation in case electronics die. Print trail maps before the trip."),
            ("watch", "GPS watch (optional)", 3.2, "Navigation + Tech", "Wristwatch with built-in GPS that tracks your route and shows elevation. Nice backup but not essential."),
            ("rain-jacket", "Lightweight rain jacket", 8.0, "Layers + Fuel Buffer", "Waterproof jacket that packs small. Storms can pop up suddenly in the mountains."),
            ("wind-pants", "Rain pants or rain skirt", 4.8, "Layers + Fuel Buffer", "Waterproof lower-body layer. Rain skirts are lighter; rain pants offer more coverage."),
            ("sun-hoodie", "Long-sleeve sun shirt with hood", 6.4, "Layers + Fuel Buffer", "Thin breathable shirt that protects from sunburn and also helps block ticks and poison oak."),
            ("base-layer", "Warm long-sleeve undershirt (wool or synthetic)", 6.4, "Layers + Fuel Buffer", "Thin warm layer to wear under your jacket. Wool stays warm even when damp and doesn't get stinky."),
            ("puffy", "Insulated down jacket", 9.6, "Layers + Fuel Buffer", "Puffy jacket filled with down feathers. Super warm and compresses small. Essential for cold camp evenings."),
            ("hiking-pants", "Zip-off hiking pants", 8.0, "Layers + Fuel Buffer", "Long pants that convert to shorts by unzipping the legs. Protects from ticks and brush."),
            ("socks", "Hiking socks (x3)", 4.8, "Layers + Fuel Buffer", "Wool hiking socks with cushioning. Rotate daily to prevent blisters. Wool dries fast and fights odor."),
            ("gaiters", "Ankle gaiters", 1.6, "Layers + Fuel Buffer", "Fabric sleeves that cover the gap between your shoe and pants to keep rocks and dirt out."),
            ("hat", "Wide-brim sun hat", 3.2, "Layers + Fuel Buffer", "Hat with a brim all around to shade your face, ears, and neck from intense mountain sun."),
            ("buff", "Neck tube (bandana alternative)", 1.6, "Layers + Fuel Buffer", "Stretchy fabric tube you wear around your neck. Pull it up to cover your face from sun or dust."),
            ("gloves", "Thin fleece gloves", 1.6, "Layers + Fuel Buffer", "Lightweight gloves for chilly mornings. Optional but nice when breaking camp in the cold."),
            ("camp-shoes", "Lightweight sandals or camp shoes", 6.4, "Layers + Fuel Buffer", "Something easy to slip on at camp so your feet can rest after hiking all day. Optional luxury item."),
            ("first-aid", "First aid kit", 8.0, "Safety + Hygiene", "Basic medical supplies: bandages, blister pads, pain relievers (ibuprofen), allergy pills."),
            ("leukotape", "High-adhesion medical tape for blisters", 1.6, "Safety + Hygiene", "Super-sticky tape that stays on sweaty feet."),
            ("sunscreen", "Sunscreen (SPF 50+)", 3.2, "Safety + Hygiene", "High-protection sunscreen. The sun is stronger at high elevations—you'll burn faster up there."),
            ("bug-spray", "Bug repellent (clothes treatment + skin spray)", 3.2, "Safety + Hygiene", "Spray your clothes with permethrin at home (lasts weeks). Bring picaridin spray for your skin."),
            ("trowel", "Small digging trowel", 1.6, "Safety + Hygiene", "For digging holes when you need to go to the bathroom in the woods. Required wilderness practice."),
            ("tp-kit", "Toilet paper + hand sanitizer", 1.6, "Safety + Hygiene", "Pack it in, pack it out. Bring a resealable odor-resistant bag for used TP."),
            ("toothbrush", "Toothbrush + small toothpaste", 1.6, "Safety + Hygiene", "Basic hygiene. A travel-size toothpaste tube is plenty for a week."),
            ("whistle", "Emergency whistle", 0.0, "Safety + Hygiene", "Loud whistle for signaling if you get lost or hurt. Three short blasts is the universal distress signal."),
            ("knife", "Small pocket knife or multitool", 1.6, "Safety + Hygiene", "Tiny knife for cutting tape, trimming moleskin, opening food packages, or fixing gear."),
            ("camera", "Camera (optional)", 8.0, "Custom", "For better photos than your phone. The sunrise at Vista Camp is spectacular."),
            ("book", "Book or e-reader (optional)", 4.8, "Custom", "Something to read at camp. Good for winding down and unplugging."),
            ("journal", "Small notebook + pen (optional)", 3.2, "Custom", "Write down memories, thoughts, and trail notes. Nice keepsake from the trip."),
            ("trekking-poles", "Trekking pole (x2)", 25.6, "Custom", "Adjustable hiking poles that save your knees on downhills and help balance on rough terrain. Highly recommended."),
            ("pack-liner", "Waterproof bag liner", 1.6, "Custom", "Heavy-duty plastic bag that lines your backpack to keep everything dry if it rains."),
            ("sit-pad", "Foam sit pad (optional)", 1.6, "Custom", "Small foam square to sit on during breaks. Keeps your butt dry and insulated from cold ground."),
            ("wallet", "Cash and credit cards", 1.6, "Custom", "Money for buying food and supplies in town. Some small shops are cash-only."),
            ("permits", "Printed permits (required!)", 0.0, "Custom", "Your wilderness camping permit and California campfire permit. Each person needs their own copies."),
            ("earplugs", "Foam earplugs (x3)", 0.0, "Secret Weapons (The Nuance)", "Sleep through snoring tentmates, wind flapping your tent, and 5am bird concerts. $2 life-saver."),
            ("sleep-mask", "Sleep mask", 0.0, "Secret Weapons (The Nuance)", "Blocks early sunrise (5:30am in summer) so you can actually sleep in. Game changer for recovery."),
            ("mini-bic", "Mini lighter (backup ignition)", 0.0, "Secret Weapons (The Nuance)", "Backup for your stove igniter. They WILL fail. Costs $1, weighs nothing, saves dinner."),
            ("duct-tape", "Duct tape (wrapped around trekking pole)", 0.0, "Secret Weapons (The Nuance)", "Fixes torn gear, blisters (in emergencies), broken poles, ripped shoes. Wrap 3ft around your pole."),
            ("safety-pins", "Safety pins (3-4)", 0.0, "Secret Weapons (The Nuance)", "Hang wet socks on your pack while hiking. Fix zipper pulls. Attach stuff. Weighs nothing."),
            ("ziplock-bags", "Resealable bags (assorted sizes)", 1.6, "Secret Weapons (The Nuance)", "Organize small items, protect phone from rain, store used TP, keep snacks fresh. Bring 5-6."),
            ("bandana", "Cotton bandana", 1.6, "Secret Weapons (The Nuance)", "Pot holder, sweat rag, pre-filter for silty water, napkin, signal flag, washcloth. One item, 20 uses."),
            ("aquaphor", "Skin barrier ointment (petrolatum-based)", 1.6, "Secret Weapons (The Nuance)", "Prevents chafing on thighs/underarms and helps cracked lips/dry hands."),
            ("body-glide", "Anti-chafe balm/stick", 1.6, "Secret Weapons (The Nuance)", "Rub on inner thighs, feet, anywhere that rubs."),
            ("nail-clippers", "Tiny nail clippers", 0.0, "Secret Weapons (The Nuance)", "Long toenails + hiking = black toenails and lost nails. Trim before and during the trip."),
            ("tweezers", "Tweezers (pointed tip)", 0.0, "Secret Weapons (The Nuance)", "For splinters, thorns, and TICK REMOVAL. Section O has ticks. Check yourself daily."),
            ("spare-laces", "Spare shoelaces or paracord (3ft)", 1.6, "Secret Weapons (The Nuance)", "Laces break at the worst times. Paracord works as backup laces, clothesline, or gear repair."),
            ("tenacious-tape", "Adhesive gear repair patches", 0.0, "Secret Weapons (The Nuance)", "Fixes holes in tents, sleeping pads, and jackets. Sticks even when wet. Bring 2-3 patches."),
            ("seam-grip", "Flexible gear/shoe adhesive (tiny tube)", 1.6, "Secret Weapons (The Nuance)", "Glue for when your shoe sole starts peeling off (it happens)."),
            ("cord-tensioners", "Guyline tensioners (if your tent needs them)", 0.0, "Secret Weapons (The Nuance)", "Tiny plastic clips that keep tent lines tight. Lose one and your tent flaps all night."),
            ("electrolytes", "Electrolyte powder packets (6-10)", 3.2, "Secret Weapons (The Nuance)", "Add to water on hot days. Prevents muscle cramps and headaches from sweating out salts."),
            ("caffeine-pills", "Caffeine pills (optional)", 0.0, "Secret Weapons (The Nuance)", "Lighter than carrying coffee. One pill = one cup. Good for early morning starts without stove time."),
            ("antihistamine", "Antihistamine tablets (4-6)", 0.0, "Secret Weapons (The Nuance)", "For allergic reactions to bee stings, plants, or unknown triggers. Pick a type you tolerate (some cause drowsiness)."),
            ("imodium", "Anti-diarrheal tablets (loperamide)", 0.0, "Secret Weapons (The Nuance)", "Trail food + water changes = stomach issues. This stops them FAST. Do not skip this."),
            ("pepto-tabs", "Upset-stomach tablets (bismuth)", 0.0, "Secret Weapons (The Nuance)", "For nausea and upset stomach. Chewable tabs are easier than liquid. Stomach issues are common."),
            ("mini-dropper", "Backup water treatment (chlorine dioxide)", 1.6, "Secret Weapons (The Nuance)", "If your filter clogs or breaks, you NEED a backup. Tablets weigh nothing. Bring 10+."),
            ("sewing-kit", "Tiny sewing kit (needle + thread)", 0.0, "Secret Weapons (The Nuance)", "Fix torn clothes, backpack straps, or tent mesh. Dental floss works as strong thread."),
            ("head-net", "Bug head net", 1.6, "Secret Weapons (The Nuance)", "When mosquitoes are BAD, this is the only thing that works. Weighs ~1 oz, saves your sanity."),
            ("sleep-socks", "Dedicated sleep socks (clean & dry)", 1.6, "Secret Weapons (The Nuance)", "Never hike in these. Keep them in your sleeping bag. Dry feet at night = warm feet = good sleep."),
            ("pee-rag", "Pee rag (for those who squat)", 0.0, "Secret Weapons (The Nuance)", "Bandana that clips to outside of pack to dry. Saves TP and is more sustainable. Antimicrobial ones exist."),
            ("pee-bottle", "Wide-mouth bottle for night pee (optional)", 1.6, "Secret Weapons (The Nuance)", "Avoids leaving your tent at 2am in the cold. Label it clearly. Any wide-mouth sports drink bottle works."),
            ("mini-carabiner", "Small carabiner (non-climbing)", 0.0, "Secret Weapons (The Nuance)", "Clip water bottles to your pack, hang stuff to dry, organize gear. Bring 2-3 tiny ones."),
            ("rubber-bands", "A few thick rubber bands", 0.0, "Secret Weapons (The Nuance)", "Secure rolled items, bundle trekking poles, keep bags closed. Stupid simple, surprisingly useful."),
            ("mirrror", "Tiny signal mirror or compact mirror", 0.0, "Secret Weapons (The Nuance)", "Check for ticks in hard-to-see places. Signal for help in emergencies. Doubles for personal care."),
            ("pack-cover", "Pack rain cover (if your pack needs one)", 3.2, "Secret Weapons (The Nuance)", "Some packs are water-resistant, some aren't."),
            ("pillow-stuff", "Use your clothes bag as a pillow", 0.0, "Secret Weapons (The Nuance)", "Stuff your puffy + extra clothes into a stuff sack = free pillow. Skip the inflatable."),
            ("gummy-vitamins", "Multivitamin gummies (optional)", 1.6, "Secret Weapons (The Nuance)", "Trail diet lacks nutrients. A few gummies a day might help. At minimum, they taste good."),
            ("olive-oil", "Tiny bottle of olive oil", 3.2, "Secret Weapons (The Nuance)", "Add calories to any meal.")
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
                        Text("Shelter + Sleep").tag("Shelter + Sleep")
                        Text("Kitchen + Hydration").tag("Kitchen + Hydration")
                        Text("Navigation + Tech").tag("Navigation + Tech")
                        Text("Layers + Fuel Buffer").tag("Layers + Fuel Buffer")
                        Text("Safety + Hygiene").tag("Safety + Hygiene")
                        Text("Secret Weapons (The Nuance)").tag("Secret Weapons (The Nuance)")
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
