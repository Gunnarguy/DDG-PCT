import Foundation
import SwiftUI

// MARK: - DDG Team Configuration

/// The DDG hiking team — matches web app DDG_TEAM and DDG_ALLOWED_EMAILS
enum DDGTeam {
    struct Member: Identifiable, Sendable {
        let id: String          // hiker_id
        let name: String
        let emoji: String
        let role: String
        let color: String       // hex
        let emails: [String]
    }

    static let roster: [Member] = [
        Member(id: "dan",    name: "Dan",    emoji: "🧔", role: "Trail Boss",  color: "#2E7D32", emails: ["smileyguy@aol.com"]),
        Member(id: "drew",   name: "Drew",   emoji: "🏔️", role: "Navigator",  color: "#1565C0", emails: ["andrew.d.hostetler@gmail.com"]),
        Member(id: "gunnar", name: "Gunnar", emoji: "⚡", role: "Pace Setter", color: "#F57C00", emails: ["gunnarguy@me.com", "gunnarguy@aol.com"]),
    ]

    static let allowedEmails: Set<String> = Set(roster.flatMap(\.emails))

    static let adminEmails: Set<String> = ["gunnarguy@me.com", "gunnarguy@aol.com"]

    static func member(forEmail email: String) -> Member? {
        roster.first { $0.emails.contains(email.lowercased()) }
    }

    static func hikerId(forEmail email: String) -> String? {
        member(forEmail: email)?.id
    }
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
