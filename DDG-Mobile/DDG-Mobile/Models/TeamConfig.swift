import Foundation
import SwiftUI

// MARK: - DDG Team Configuration

/// Display metadata for the DDG hiking team. Supabase ddg_team_profiles is the
/// authorization source of truth; this roster supplies names, icons, and colors.
enum DDGTeam {
    struct Member: Identifiable, Sendable {
        let id: String          // hiker_id
        let name: String
        let emoji: String
        let role: String
        let color: String       // hex
        let pack: String
        let capacityLitres: Int
        /// What this pack should preferentially carry. Dense items are heavy
        /// and small, bulky items are light and large, so pack size and who
        /// should be spared weight can be satisfied by the same rule.
        let loadRole: String
    }

    static let roster: [Member] = [
        Member(id: "dan", name: "Dan", emoji: "🧔", role: "Trail Boss", color: "#2E7D32",
               pack: "Gregory 75L", capacityLitres: 75,
               loadRole: "Takes BULK — quilts, puffies, tent body. Dense weight belongs elsewhere; group pace is set by the heaviest-loaded hiker."),
        Member(id: "drew", name: "Drew", emoji: "🏔️", role: "Navigator", color: "#1565C0",
               pack: "Gregory 75L", capacityLitres: 75,
               loadRole: "Takes bulk, and can absorb dense weight too. The natural place to shift litres off Dan on Day 3."),
        Member(id: "gunnar", name: "Gunnar", emoji: "⚡", role: "Pace Setter", color: "#F57C00",
               pack: "Traverse 60L", capacityLitres: 60,
               loadRole: "Takes DENSE weight — water, food, fuel — which costs little volume. Hard bottles in side pockets; Day 3 lands near 55–57 L used, so no slack."),
    ]

}

// MARK: - Day Colors (elevation profile + UI theming)

struct DayColor: Sendable {
    let fill: String    // rgba
    let stroke: String  // hex
}

let dayColors: [DayColor] = [
    DayColor(fill: "rgba(46, 125, 50, 0.15)",    stroke: "#2E7D32"),   // Day 1 — Forest green
    DayColor(fill: "rgba(21, 101, 192, 0.15)",   stroke: "#1565C0"),   // Day 2 — Mountain blue
    DayColor(fill: "rgba(245, 124, 0, 0.15)",    stroke: "#F57C00"),   // Day 3 — Sunset orange
    DayColor(fill: "rgba(156, 39, 176, 0.15)",   stroke: "#9C27B0"),   // Day 4 — Alpine purple
    DayColor(fill: "rgba(0, 150, 136, 0.15)",    stroke: "#009688"),   // Day 5 — Vista teal
    DayColor(fill: "rgba(211, 47, 47, 0.15)",    stroke: "#D32F2F"),   // Day 6 — Summit red
    DayColor(fill: "rgba(94, 53, 177, 0.15)",    stroke: "#5E35B1"),   // Day 7 — River violet
    DayColor(fill: "rgba(0, 121, 107, 0.15)",    stroke: "#00796B"),   // Day 8 — Climb green
    DayColor(fill: "rgba(198, 40, 40, 0.15)",    stroke: "#C62828"),   // Spare/contingency red
]

// MARK: - Color from Hex

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        default:
            r = 0; g = 0; b = 0
        }
        self.init(red: r, green: g, blue: b)
    }
}
