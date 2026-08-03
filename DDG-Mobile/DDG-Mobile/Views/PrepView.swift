import SwiftUI

/// Personal preparation remains local; shared confirmation belongs in the Ops Log.
struct PrepView: View {
    @AppStorage("ddg.personal-prep") private var completedIDs: String = ""

    private var completed: Set<String> {
        Set(completedIDs.split(separator: ",").map(String.init))
    }

    private var personalTasks: [PrepTask] {
        [
            PrepTask(id: "water-filter", title: "Water treatment tested", detail: "Backflush/filter test and carry a backup treatment method.", icon: "drop.fill"),
            PrepTask(id: "food-carry", title: "Nine-day food carry packed", detail: "Eight hiking days plus one emergency day; no on-route resupply assumed.", icon: "fork.knife"),
            PrepTask(id: "offline-maps", title: "Offline route and field brief saved", detail: "Every hiker stores the GPX, route map, contacts, and extraction pins offline.", icon: "arrow.down.circle.fill"),
            PrepTask(id: "satellite-test", title: "Satellite communicator tested", detail: "Send a real outbound message and receive an acknowledgement before departure.", icon: "antenna.radiowaves.left.and.right"),
            PrepTask(id: "knee-foot", title: "Foot and knee system trialed", detail: "Use the shoes, socks, poles, and blister plan you will actually hike with.", icon: "figure.hiking"),
            PrepTask(id: "weather-48h", title: "48-hour forecast and restrictions reviewed", detail: "Recheck smoke, fire, water, closures, and weather immediately before leaving.", icon: "cloud.sun.bolt.fill")
        ]
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    PrepHeader(
                        completeCount: personalTasks.filter { completed.contains($0.id) }.count,
                        totalCount: personalTasks.count
                    )

                    VStack(alignment: .leading, spacing: 10) {
                        SectionHeader(title: "Your personal readiness", icon: "person.crop.circle.badge.checkmark", color: .blue)
                        Text("These checkmarks are stored on this phone only. They do not claim that a group gate is cleared.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        ForEach(personalTasks) { task in
                            PersonalPrepTaskCard(
                                task: task,
                                isChecked: completed.contains(task.id),
                                toggle: { toggle(task.id) }
                            )
                        }
                    }

                    Text("Group access, support, permits, and extraction decisions live once in Plan → Logistics. Use Field → Ops Log only to record real confirmations.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding()
                .padding(.bottom, 36)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Mission Prep")
        }
    }

    private func toggle(_ id: String) {
        var updated = completed
        if updated.contains(id) {
            updated.remove(id)
        } else {
            updated.insert(id)
        }
        completedIDs = updated.sorted().joined(separator: ",")
    }
}

struct SectionHeader: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        Label(title, systemImage: icon)
            .font(.title3.bold())
            .foregroundStyle(color)
    }
}

private struct PrepHeader: View {
    let completeCount: Int
    let totalCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Be ready; do not manufacture certainty.")
                .font(.title3.bold())
            Text("This screen is only for your personal readiness. Access, permits, crossings, private-land support, and extraction live once in Plan → Logistics.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text("\(completeCount) of \(totalCount) personal tasks complete")
                .font(.caption.bold())
                .foregroundStyle(.blue)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.blue.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
    }
}

private struct PrepTask: Identifiable {
    let id: String
    let title: String
    let detail: String
    let icon: String
}

private struct PersonalPrepTaskCard: View {
    let task: PrepTask
    let isChecked: Bool
    let toggle: () -> Void

    var body: some View {
        Button(action: toggle) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: isChecked ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isChecked ? .green : .secondary)
                VStack(alignment: .leading, spacing: 3) {
                    Text(task.title)
                        .font(.headline)
                        .strikethrough(isChecked)
                    Text(task.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
                Image(systemName: task.icon)
                    .foregroundStyle(isChecked ? Color.green : Color.secondary)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(isChecked ? .green.opacity(0.07) : Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(isChecked ? .green.opacity(0.28) : .gray.opacity(0.16), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    PrepView()
}
