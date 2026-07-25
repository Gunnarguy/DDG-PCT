import Foundation

// MARK: - Altitude Physiology Zones

struct AltitudeZone: Identifiable, Sendable {
    let id: String
    let name: String
    let minFt: Double
    let maxFt: Double
    let fillColor: String      // rgba
    let borderColor: String    // hex
    let risk: String           // "none", "low", "moderate", "high"
    let description: String
    let symptoms: [String]
    let mitigation: String
}

let altitudeZones: [AltitudeZone] = [
    AltitudeZone(
        id: "sea-level", name: "Sea Level", minFt: 0, maxFt: 4000,
        fillColor: "rgba(76, 175, 80, 0.12)", borderColor: "#4CAF50",
        risk: "none", description: "Normal oxygen levels, no altitude effects",
        symptoms: [],
        mitigation: "None needed"
    ),
    AltitudeZone(
        id: "moderate", name: "Moderate Altitude", minFt: 4000, maxFt: 8000,
        fillColor: "rgba(255, 193, 7, 0.12)", borderColor: "#FFC107",
        risk: "low", description: "Slight decrease in oxygen availability",
        symptoms: ["Slight breathlessness", "Mild headache"],
        mitigation: "Stay hydrated, pace yourself"
    ),
    AltitudeZone(
        id: "high", name: "High Altitude", minFt: 8000, maxFt: 12000,
        fillColor: "rgba(255, 152, 0, 0.15)", borderColor: "#FF9800",
        risk: "moderate", description: "Noticeable oxygen reduction, AMS risk",
        symptoms: ["Headache", "Nausea", "Fatigue", "Dizziness", "Sleep disturbance"],
        mitigation: "Slow ascent, extra hydration, consider acclimatization day"
    ),
    AltitudeZone(
        id: "very-high", name: "Very High Altitude", minFt: 12000, maxFt: 18000,
        fillColor: "rgba(244, 67, 54, 0.18)", borderColor: "#F44336",
        risk: "high", description: "Significant AMS risk, potential for HAPE/HACE",
        symptoms: ["Severe headache", "Confusion", "Ataxia", "Cough", "Chest tightness"],
        mitigation: "Descend immediately if symptoms worsen"
    ),
]

// MARK: - Grade Difficulty

struct GradeDifficulty: Sendable {
    let label: String
    let color: String   // hex
}

func gradeDifficulty(for percent: Double) -> GradeDifficulty {
    let abs = Swift.abs(percent)
    if abs < 5       { return GradeDifficulty(label: "easy",     color: "#4CAF50") }
    else if abs < 10 { return GradeDifficulty(label: "moderate", color: "#FFC107") }
    else if abs < 15 { return GradeDifficulty(label: "steep",    color: "#FF9800") }
    else             { return GradeDifficulty(label: "brutal",   color: "#F44336") }
}

// MARK: - Trail Constants

enum TrailConstants {
    static let milesToMeters: Double = 1609.34
    static let metersToFeet: Double = 3.28084

    // Smoothing window for GPS noise (5-point moving average)
    static let smoothingWindow: Int = 5

    // Minimum elevation change to count as gain/loss (feet)
    static let elevationThreshold: Double = 10.0

    // Naismith's rule parameters (conservative for loaded hikers)
    static let baseSpeedMph: Double = 2.5
    static let gainPerHourFt: Double = 1500.0

    /// Estimate hiking time using Naismith's rule
    static func estimatedTime(miles: Double, gainFeet: Double) -> Double {
        let baseTime = miles / baseSpeedMph
        let gainTime = gainFeet / gainPerHourFt
        return baseTime + gainTime  // hours
    }

    /// Smoothed GPS elevation gain for the primary nine-day itinerary.
    static func elevationGain(for day: Int) -> Double {
        switch day {
        case 1: return 713
        case 2: return 2_027
        case 3: return 1_058
        case 4: return 852
        case 5: return 990
        case 6: return 129
        case 7: return 937
        case 8: return 1
        case 9: return 3
        default: return 0
        }
    }
}
