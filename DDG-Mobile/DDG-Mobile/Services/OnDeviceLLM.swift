import Foundation

// Apple Foundation Models requires iOS 26+ and Apple Intelligence enabled on device.
// Import is conditional — builds on older SDKs will skip this functionality.
#if canImport(FoundationModels)
import FoundationModels
#endif

/// On-device AI summarization using Apple Foundation Models (iOS 26+).
///
/// Leverages ALL app data: ops logs, itinerary/camps, gear loadouts, connectivity zones,
/// altitude physiology, transit/logistics, water sources, and team roster.
@MainActor
final class OnDeviceLLM {
    static let shared = OnDeviceLLM()

    /// Whether Apple Foundation Models are available on this device
    var isAvailable: Bool {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, macOS 26.0, *) {
            return SystemLanguageModel.default.isAvailable
        }
        #endif
        return false
    }

    // MARK: - Ops Log Summary

    /// Summarize ops log entries with full context (types, statuses, team activity)
    func summarizeOpsLog(entries: [(userName: String, content: String, type: String, status: String?, time: String)]) async throws -> String {
        guard !entries.isEmpty else {
            return "No ops log entries to summarize."
        }

        #if canImport(FoundationModels)
        if #available(iOS 26.0, macOS 26.0, *) {
            guard SystemLanguageModel.default.isAvailable else {
                return fallbackSummary(entries: entries)
            }

            let session = LanguageModelSession(model: .default)

            let entriesText = entries.map { entry in
                var line = "[\(entry.time)] \(entry.userName) (\(entry.type)"
                if let status = entry.status { line += "/\(status)" }
                line += "): \(entry.content)"
                return line
            }.joined(separator: "\n")

            let openTasks = entries.filter { $0.type == "TASK" && ($0.status == "OPEN" || $0.status == "IN_PROGRESS") }
            let alerts = entries.filter { $0.type == "ALERT" }
            let teamMembers = Set(entries.map(\.userName))

            let prompt = """
            You are a trail operations assistant for PCT hiking team DDG (Dan=Trail Boss, Drew=Navigator, Gunnar=Pace Setter).
            Summarize these ops log entries into a concise 2-3 sentence status update.

            Focus on: key decisions, open action items (\(openTasks.count) open tasks), \
            active alerts (\(alerts.count)), and team member activity (\(teamMembers.joined(separator: ", "))).
            Be concise, direct, and actionable.

            Entries:
            \(entriesText)
            """

            let response = try await session.respond(to: prompt)
            return response.content
        }
        #endif

        return fallbackSummary(entries: entries)
    }

    // MARK: - Safety Briefing (enhanced with all safety data)

    /// Full safety briefing: fires, AQI, altitude zones, water sources, connectivity gaps
    func safetyBriefing(
        fires: [(name: String, acres: Int, containment: Int)],
        aqi: [(location: String, aqi: Int?, category: String?, pm25: Int?)],
        waterSources: [(name: String, reliability: String, notes: String?)],
        currentAltitudeZone: AltitudeZone?,
        connectivityGaps: [ConnectivityZone]
    ) async throws -> String {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, macOS 26.0, *) {
            guard SystemLanguageModel.default.isAvailable else {
                return fallbackSafetyBriefing(fires: fires, aqi: aqi, waterSources: waterSources, connectivityGaps: connectivityGaps)
            }

            let session = LanguageModelSession(model: .default)

            var context = "Current conditions for the active PCT trip (Burney Falls → Ash Camp, 51.844 official mi / 51.664 Garmin mi, 8 hiking days):\n\n"

            // Fires
            if fires.isEmpty {
                context += "WILDFIRES: No active fires in corridor.\n"
            } else {
                context += "WILDFIRES:\n"
                for fire in fires {
                    context += "  - \(fire.name): \(fire.acres) acres, \(fire.containment)% contained\n"
                }
            }

            // Air quality
            if !aqi.isEmpty {
                context += "\nAIR QUALITY:\n"
                for reading in aqi {
                    var line = "  - \(reading.location): AQI \(reading.aqi.map { String($0) } ?? "Unknown")"
                    if let cat = reading.category { line += " (\(cat))" }
                    if let pm = reading.pm25 { line += ", PM2.5: \(pm)" }
                    context += line + "\n"
                }
            }

            // Altitude
            if let zone = currentAltitudeZone {
                context += "\nALTITUDE: \(zone.name) (\(Int(zone.minFt))-\(Int(zone.maxFt)) ft), risk: \(zone.risk)\n"
                if !zone.symptoms.isEmpty {
                    context += "  Possible symptoms: \(zone.symptoms.joined(separator: ", "))\n"
                    context += "  Mitigation: \(zone.mitigation)\n"
                }
            }

            // Water
            if !waterSources.isEmpty {
                context += "\nWATER SOURCES:\n"
                for source in waterSources {
                    var line = "  - \(source.name): \(source.reliability)"
                    if let notes = source.notes { line += " — \(notes)" }
                    context += line + "\n"
                }
            }

            // Connectivity dead zones
            let noCell = connectivityGaps.filter {
                $0.cellCoverage.verizon == "none" && $0.cellCoverage.att == "none" && $0.cellCoverage.tmobile == "none"
            }
            if !noCell.isEmpty {
                context += "\nNO CELL COVERAGE ZONES: \(noCell.map(\.name).joined(separator: ", "))\n"
                context += "  Satellite communicator required for emergency contact.\n"
            }

            let prompt = """
            You are a trail safety advisor for the DDG PCT hiking team (3 hikers, 8-day section hike plus a contingency day).
            Based on ALL these conditions, provide a comprehensive but concise safety briefing (3-4 sentences).
            Prioritize: immediate threats (fires, AQI), altitude concerns, water reliability, and communication gaps.
            Include specific actionable advice.

            \(context)
            """

            let response = try await session.respond(to: prompt)
            return response.content
        }
        #endif

        return fallbackSafetyBriefing(fires: fires, aqi: aqi, waterSources: waterSources, connectivityGaps: connectivityGaps)
    }

    // MARK: - Trip Briefing (Mission Overview)

    /// Pre-trip mission briefing combining itinerary, team, and logistics
    func tripBriefing(
        camps: [CampSite],
        trailPointCount: Int,
        waterSources: [WaterSource],
        team: [DDGTeam.Member]
    ) async throws -> String {
        let totalMiles = camps.last?.routeMile ?? 0
        let totalDays = Set(camps.map(\.day).filter { $0 > 0 }).count

        #if canImport(FoundationModels)
        if #available(iOS 26.0, macOS 26.0, *) {
            guard SystemLanguageModel.default.isAvailable else {
                return fallbackTripBriefing(camps: camps, totalMiles: totalMiles, totalDays: totalDays, waterSources: waterSources, team: team)
            }

            let session = LanguageModelSession(model: .default)

            var context = "PCT Section O Thru-Hike Overview:\n"
            context += "- Route: Burney Falls → Ash Camp, \(String(format: "%.1f", totalMiles)) miles, \(totalDays) days\n"
            context += "- Team: \(team.map { "\($0.name) (\($0.role))" }.joined(separator: ", "))\n"
            context += "- GPS data: \(trailPointCount) trail points mapped\n"
            context += "- Water sources: \(waterSources.count) identified\n\n"
            context += "Daily breakdown:\n"

            let grouped = Dictionary(grouping: camps, by: \.day).sorted { $0.key < $1.key }
            for (day, dayCamps) in grouped where day > 0 {
                let dayDist = dayCamps.reduce(0.0) { $0 + $1.distance }
                let names = dayCamps.map(\.name).joined(separator: " → ")
                context += "  Day \(day): \(String(format: "%.1f", dayDist)) mi — \(names)\n"
                if let first = dayCamps.first, !first.segment.isEmpty {
                    context += "    Terrain: \(first.segment)\n"
                }
            }

            // Connectivity overview
            let noCellZones = connectivityZones.filter {
                $0.cellCoverage.verizon == "none" && $0.cellCoverage.att == "none" && $0.cellCoverage.tmobile == "none"
            }
            context += "\n- Connectivity: \(noCellZones.count) of \(connectivityZones.count) zones have NO cell coverage\n"
            context += "- Resupply towns: \(resupplyTowns.map(\.town).joined(separator: ", "))\n"

            let prompt = """
            You are a PCT thru-hiking mission planner. Generate a concise mission briefing (3-4 sentences) \
            that captures the key details of this 8-day section hike. Include: total distance, daily averages, \
            terrain character, team composition, and any notable logistical considerations. \
            Make it sound like a professional trail operations brief.

            \(context)
            """

            let response = try await session.respond(to: prompt)
            return response.content
        }
        #endif

        return fallbackTripBriefing(camps: camps, totalMiles: totalMiles, totalDays: totalDays, waterSources: waterSources, team: team)
    }

    // MARK: - Day Briefing (Itinerary per-day)

    /// Per-day itinerary briefing with terrain, elevation, estimated time, and water
    func dayBriefing(
        day: Int,
        camps: [CampSite],
        waterSources: [WaterSource],
        trailPoints: [TrailPoint]
    ) async throws -> String {
        guard !camps.isEmpty else { return "No camp data for this day." }

        let profile = TrailConstants.profile(for: day)
        let dayDist = profile?.miles ?? camps.reduce(0.0) { $0 + $1.distance }
        let elevGainFt = profile?.gainFeet ?? 0
        let elevLossFt = profile?.lossFeet ?? 0
        let timeEstimate = profile.map(TrailConstants.timeEstimate(for:))
            ?? TrailConstants.timeEstimate(
                miles: dayDist,
                gainFeet: elevGainFt,
                lossFeet: elevLossFt
            )

        #if canImport(FoundationModels)
        if #available(iOS 26.0, macOS 26.0, *) {
            guard SystemLanguageModel.default.isAvailable else {
                return fallbackDayBriefing(day: day, camps: camps, dayDist: dayDist, elevGainFt: elevGainFt, elevLossFt: elevLossFt, timeEstimate: timeEstimate, waterSources: waterSources)
            }

            let session = LanguageModelSession(model: .default)

            var context = "Day \(day) Itinerary:\n"
            context += "- Distance: \(String(format: "%.1f", dayDist)) miles\n"
            if elevGainFt > 0 {
                context += "- Elevation gain: \(Int(elevGainFt)) ft\n"
            }
            context += "- Elevation loss: \(Int(elevLossFt)) ft\n"
            context += "- Estimated trail time: \(timeEstimate.rangeLabel) (loaded group pace with terrain and stop allowance)\n\n"

            context += "Waypoints:\n"
            for camp in camps {
                context += "  - \(camp.name) (\(camp.type)): mile \(String(format: "%.1f", camp.routeMile))"
                context += ", elev \(camp.startElevation) → \(camp.endElevation)\n"
                if !camp.segment.isEmpty {
                    context += "    Terrain: \(camp.segment)\n"
                }
                if !camp.notes.isEmpty {
                    context += "    Notes: \(camp.notes)\n"
                }
            }

            // Nearby water sources (rough proximity — same day's lat/lon range)
            if !waterSources.isEmpty {
                context += "\nWater sources available:\n"
                for source in waterSources {
                    context += "  - \(source.name): \(source.reliability)"
                    if let notes = source.notes { context += " — \(notes)" }
                    context += "\n"
                }
            }

            // Altitude zone for this day
            let avgElev = camps.compactMap { Double($0.startElevation.replacingOccurrences(of: ",", with: "").replacingOccurrences(of: "'", with: "").components(separatedBy: .letters).joined()) }.first ?? 0
            if let zone = altitudeZones.first(where: { avgElev >= $0.minFt && avgElev < $0.maxFt }) {
                context += "\nAltitude zone: \(zone.name) (\(zone.risk) risk)\n"
                if !zone.symptoms.isEmpty {
                    context += "  Watch for: \(zone.symptoms.joined(separator: ", "))\n"
                }
            }

            let prompt = """
            You are a PCT day-hiking briefing assistant for the DDG team.
            Generate a concise day briefing (2-3 sentences) covering: distance, difficulty, \
            terrain highlights, estimated time, and any key advisories (water, altitude, hazards). \
            Sound like a trail guide doing a morning briefing.

            \(context)
            """

            let response = try await session.respond(to: prompt)
            return response.content
        }
        #endif

        return fallbackDayBriefing(day: day, camps: camps, dayDist: dayDist, elevGainFt: elevGainFt, elevLossFt: elevLossFt, timeEstimate: timeEstimate, waterSources: waterSources)
    }

    // MARK: - Gear Analysis

    /// Analyze gear weight per hiker with team distribution and category breakdown
    func gearAnalysis(
        items: [CustomItem],
        team: [DDGTeam.Member]
    ) async throws -> String {
        guard !items.isEmpty else {
            return "No gear items to analyze. Add items in the gear planner."
        }

        let totalOz = items.reduce(0.0) { $0 + $1.weightInOz }
        let byCategory = Dictionary(grouping: items, by: \.category).mapValues { items in
            items.reduce(0.0) { $0 + $1.weightInOz }
        }.sorted { $0.value > $1.value }

        #if canImport(FoundationModels)
        if #available(iOS 26.0, macOS 26.0, *) {
            guard SystemLanguageModel.default.isAvailable else {
                return fallbackGearAnalysis(items: items, totalOz: totalOz, byCategory: byCategory)
            }

            let session = LanguageModelSession(model: .default)

            var context = "Gear Analysis for DDG PCT Section O (3 hikers, 8 hiking days plus 1 emergency food day):\n\n"
            context += "Total pack weight: \(String(format: "%.1f", totalOz)) oz (\(String(format: "%.1f", totalOz / 16.0)) lb)\n"
            context += "Team: \(team.map { "\($0.name) (\($0.role))" }.joined(separator: ", "))\n\n"

            context += "By category:\n"
            for (cat, weight) in byCategory {
                let pct = totalOz > 0 ? (weight / totalOz * 100) : 0
                context += "  - \(cat): \(String(format: "%.1f", weight)) oz (\(String(format: "%.0f", pct))%)\n"
            }

            context += "\nAll items:\n"
            for item in items.sorted(by: { $0.weightInOz > $1.weightInOz }) {
                context += "  - \(item.name): \(String(format: "%.1f", item.weightInOz)) oz [\(item.category)]\n"
            }

            context += "\nTrail context: 8-day section hike, 51.844 official miles, normalized Garmin route high point about 6,129 ft.\n"
            context += "Key considerations: water carry between sources, satellite communicator weight, camp cooking gear.\n"

            let prompt = """
            You are a gear optimization advisor for a 3-person PCT thru-hiking team.
            Analyze this gear list and provide a brief assessment (3-4 sentences).
            Cover: total weight judgment (ultralight <10lb, light 10-15lb, moderate 15-20lb, heavy 20+lb), \
            heaviest categories, and any specific suggestions for an 8-day section hike with one emergency food day, \
            water carries and moderate altitude. Be practical and specific.

            \(context)
            """

            let response = try await session.respond(to: prompt)
            return response.content
        }
        #endif

        return fallbackGearAnalysis(items: items, totalOz: totalOz, byCategory: byCategory)
    }

    // MARK: - Connectivity Strategy

    /// Communication strategy briefing based on route zones and available devices
    func connectivityBriefing() async throws -> String {
        let noCell = connectivityZones.filter {
            $0.cellCoverage.verizon == "none" && $0.cellCoverage.att == "none" && $0.cellCoverage.tmobile == "none"
        }

        #if canImport(FoundationModels)
        if #available(iOS 26.0, macOS 26.0, *) {
            guard SystemLanguageModel.default.isAvailable else {
                return fallbackConnectivityBriefing(noCellCount: noCell.count)
            }

            let session = LanguageModelSession(model: .default)

            var context = "PCT Section O Communication Coverage (\(connectivityZones.count) zones):\n\n"
            for zone in connectivityZones {
                context += "  \(zone.name) (mi \(String(format: "%.1f", zone.mile))):"
                context += " VZW=\(zone.cellCoverage.verizon), ATT=\(zone.cellCoverage.att), TMO=\(zone.cellCoverage.tmobile)"
                if zone.cellCoverage.verizon == "none" && zone.cellCoverage.att == "none" && zone.cellCoverage.tmobile == "none" {
                    context += " [NO CELL]"
                }
                context += "\n"
            }

            context += "\nAvailable satellite devices:\n"
            for device in satelliteDevices {
                context += "  - \(device.device): \(device.features.joined(separator: ", "))"
                context += " [\(device.cost)] — \(device.trailNotes)\n"
            }

            context += "\nTeam: Dan (Trail Boss), Drew (Navigator), Gunnar (Pace Setter)\n"
            context += "Key: \(noCell.count) of \(connectivityZones.count) zones have zero cell coverage.\n"

            let prompt = """
            You are a backcountry communications advisor. Based on this coverage data, \
            provide a concise communication strategy (3-4 sentences) for a 3-person hiking team. \
            Cover: recommended check-in schedule, device recommendation, which zones to send updates from, \
            and emergency protocol for dead zones. Be specific about the route.

            \(context)
            """

            let response = try await session.respond(to: prompt)
            return response.content
        }
        #endif

        return fallbackConnectivityBriefing(noCellCount: noCell.count)
    }

    // MARK: - Terrain Briefing (for TrailMap / ElevationProfile)

    /// Terrain analysis for a specific segment between camps
    func terrainBriefing(
        camp: CampSite,
        trailPointsForSegment: [TrailPoint]
    ) async throws -> String {
        var elevGain: Double = 0
        var elevLoss: Double = 0
        var maxElev: Double = 0
        var minElev: Double = Double.greatestFiniteMagnitude

        for i in 0..<trailPointsForSegment.count {
            let elevFt = trailPointsForSegment[i].elevationFeet
            maxElev = max(maxElev, elevFt)
            minElev = min(minElev, elevFt)
            if i > 0 {
                let diff = elevFt - trailPointsForSegment[i-1].elevationFeet
                if diff > TrailConstants.elevationThreshold { elevGain += diff }
                else if diff < -TrailConstants.elevationThreshold { elevLoss += abs(diff) }
            }
        }
        if minElev == Double.greatestFiniteMagnitude { minElev = 0 }

        if let profile = TrailConstants.profile(for: camp.day) {
            elevGain = profile.gainFeet
            elevLoss = profile.lossFeet
            maxElev = profile.highPointFeet
            minElev = min(profile.startFeet, profile.endFeet)
        }

        let grade = camp.distance > 0 ? (elevGain / (camp.distance * 5280)) * 100 : 0
        let difficulty = gradeDifficulty(for: grade)
        let timeEstimate = TrailConstants.profile(for: camp.day)
            .map(TrailConstants.timeEstimate(for:))
            ?? TrailConstants.timeEstimate(
                miles: camp.distance,
                gainFeet: elevGain,
                lossFeet: elevLoss,
                packMode: camp.packMode
            )

        #if canImport(FoundationModels)
        if #available(iOS 26.0, macOS 26.0, *) {
            guard SystemLanguageModel.default.isAvailable else {
                return fallbackTerrainBriefing(camp: camp, elevGain: elevGain, elevLoss: elevLoss, maxElev: maxElev, minElev: minElev, difficulty: difficulty, timeEstimate: timeEstimate)
            }

            let session = LanguageModelSession(model: .default)

            var context = "Terrain Analysis — \(camp.name) (Day \(camp.day)):\n"
            context += "- Distance: \(String(format: "%.1f", camp.distance)) mi\n"
            context += "- Elevation: \(camp.startElevation) → \(camp.endElevation)\n"
            context += "- Gain: \(Int(elevGain)) ft, Loss: \(Int(elevLoss)) ft\n"
            context += "- Max elevation: \(Int(maxElev)) ft, Min: \(Int(minElev)) ft\n"
            context += "- Average grade: \(String(format: "%.1f", grade))% (\(difficulty.label))\n"
            context += "- Estimated trail time: \(timeEstimate.rangeLabel)\n"
            if !camp.segment.isEmpty {
                context += "- Terrain description: \(camp.segment)\n"
            }
            if !camp.notes.isEmpty {
                context += "- Notes: \(camp.notes)\n"
            }

            // Altitude zone
            if let zone = altitudeZones.first(where: { maxElev >= $0.minFt && maxElev < $0.maxFt }) {
                context += "- Altitude zone: \(zone.name) (\(zone.risk) risk)\n"
            }

            let prompt = """
            You are a terrain analyst for PCT hikers. Provide a brief terrain assessment \
            (2-3 sentences) for this segment. Cover: difficulty, key elevation features, \
            estimated hiking pace, and any altitude or terrain hazards to watch for.

            \(context)
            """

            let response = try await session.respond(to: prompt)
            return response.content
        }
        #endif

        return fallbackTerrainBriefing(
            camp: camp,
            elevGain: elevGain,
            elevLoss: elevLoss,
            maxElev: maxElev,
            minElev: minElev,
            difficulty: difficulty,
            timeEstimate: timeEstimate
        )
    }

    // MARK: - Fallbacks (when Foundation Models unavailable)

    private func fallbackSummary(entries: [(userName: String, content: String, type: String, status: String?, time: String)]) -> String {
        let alerts = entries.filter { $0.type == "ALERT" }
        let openTasks = entries.filter { $0.type == "TASK" && ($0.status == "OPEN" || $0.status == "IN_PROGRESS") }
        let doneTasks = entries.filter { $0.type == "TASK" && $0.status == "DONE" }
        let notes = entries.filter { $0.type == "NOTE" }
        let authors = Set(entries.map(\.userName))

        var parts: [String] = ["\(entries.count) entries from \(authors.joined(separator: ", "))"]
        if !alerts.isEmpty { parts.append("⚠️ \(alerts.count) alert\(alerts.count == 1 ? "" : "s")") }
        if !openTasks.isEmpty { parts.append("📋 \(openTasks.count) open task\(openTasks.count == 1 ? "" : "s")") }
        if !doneTasks.isEmpty { parts.append("✅ \(doneTasks.count) completed") }
        if !notes.isEmpty { parts.append("📝 \(notes.count) note\(notes.count == 1 ? "" : "s")") }

        return "Today's ops log: " + parts.joined(separator: ", ") + "."
    }

    private func fallbackSafetyBriefing(
        fires: [(name: String, acres: Int, containment: Int)],
        aqi: [(location: String, aqi: Int?, category: String?, pm25: Int?)],
        waterSources: [(name: String, reliability: String, notes: String?)],
        connectivityGaps: [ConnectivityZone]
    ) -> String {
        var parts: [String] = []

        if fires.isEmpty {
            parts.append("No active wildfires in corridor")
        } else {
            let names = fires.map(\.name).joined(separator: ", ")
            parts.append("Active fires: \(names)")
        }

        let highAQI = aqi.filter { ($0.aqi ?? 0) > 100 }
        if !highAQI.isEmpty {
            parts.append("elevated AQI at \(highAQI.map(\.location).joined(separator: ", "))")
        }

        let sketchyWater = waterSources.filter { $0.reliability.lowercased().contains("sketchy") || $0.reliability.lowercased().contains("seasonal") }
        if !sketchyWater.isEmpty {
            parts.append("\(sketchyWater.count) unreliable water source\(sketchyWater.count == 1 ? "" : "s")")
        }

        let noCell = connectivityGaps.filter {
            $0.cellCoverage.verizon == "none" && $0.cellCoverage.att == "none" && $0.cellCoverage.tmobile == "none"
        }
        if !noCell.isEmpty {
            parts.append("\(noCell.count) zones with no cell coverage — satellite required")
        }

        return parts.isEmpty ? "Trail conditions appear normal." : parts.joined(separator: ". ") + "."
    }

    private func fallbackTripBriefing(
        camps: [CampSite],
        totalMiles: Double,
        totalDays: Int,
        waterSources: [WaterSource],
        team: [DDGTeam.Member]
    ) -> String {
        let avgMiles = totalDays > 0 ? totalMiles / Double(totalDays) : 0
        let campNames = camps.filter { $0.type == "Camp" }.map(\.name).joined(separator: ", ")
        return "DDG Section O: \(String(format: "%.1f", totalMiles)) mi over \(totalDays) days " +
            "(avg \(String(format: "%.1f", avgMiles)) mi/day). " +
            "Team: \(team.map(\.name).joined(separator: ", ")). " +
            "Camps: \(campNames). " +
            "\(waterSources.count) water sources identified along route."
    }

    private func fallbackDayBriefing(
        day: Int,
        camps: [CampSite],
        dayDist: Double,
        elevGainFt: Double,
        elevLossFt: Double,
        timeEstimate: TrailTimeEstimate,
        waterSources: [WaterSource]
    ) -> String {
        let names = camps.map(\.name).joined(separator: " → ")
        var brief = "Day \(day): \(String(format: "%.1f", dayDist)) mi, \(names)"
        if elevGainFt > 0 { brief += ", +\(Int(elevGainFt)) ft gain" }
        if elevLossFt > 0 { brief += ", −\(Int(elevLossFt)) ft loss" }
        brief += ", est. \(timeEstimate.rangeLabel)"
        if !waterSources.isEmpty { brief += ". \(waterSources.count) water source\(waterSources.count == 1 ? "" : "s") nearby." }
        if let seg = camps.first?.segment, !seg.isEmpty { brief += " Terrain: \(seg)" }
        return brief
    }

    private func fallbackGearAnalysis(
        items: [CustomItem],
        totalOz: Double,
        byCategory: [(key: String, value: Double)]
    ) -> String {
        let lbs = totalOz / 16.0
        let classification: String
        switch lbs {
        case ..<10: classification = "ultralight"
        case 10..<15: classification = "light"
        case 15..<20: classification = "moderate"
        default: classification = "heavy"
        }

        var brief = "Pack weight: \(String(format: "%.1f", lbs)) lb (\(classification)). "
        brief += "\(items.count) items across \(byCategory.count) categories."
        if let heaviest = byCategory.first {
            brief += " Heaviest: \(heaviest.key) at \(String(format: "%.1f", heaviest.value / 16.0)) lb."
        }
        return brief
    }

    private func fallbackConnectivityBriefing(noCellCount: Int) -> String {
        return "\(noCellCount) of \(connectivityZones.count) zones have no cell coverage. " +
            "Satellite communicator (inReach Mini 2 recommended) required for \(noCellCount > 3 ? "most of" : "parts of") the route. " +
            "Send check-ins from zones with coverage: \(connectivityZones.filter { $0.cellCoverage.verizon != "none" }.map(\.name).joined(separator: ", "))."
    }

    private func fallbackTerrainBriefing(
        camp: CampSite,
        elevGain: Double,
        elevLoss: Double,
        maxElev: Double,
        minElev: Double,
        difficulty: GradeDifficulty,
        timeEstimate: TrailTimeEstimate
    ) -> String {
        var brief = "\(camp.name) (Day \(camp.day)): \(String(format: "%.1f", camp.distance)) mi, "
        brief += "\(difficulty.label) grade. "
        brief += "+\(Int(elevGain)) ft / -\(Int(elevLoss)) ft, "
        brief += "peak \(Int(maxElev)) ft. "
        brief += "Est. \(timeEstimate.rangeLabel)."
        if !camp.segment.isEmpty { brief += " \(camp.segment)" }
        return brief
    }

    private init() {}
}
