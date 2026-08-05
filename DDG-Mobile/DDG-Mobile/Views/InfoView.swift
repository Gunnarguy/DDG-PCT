import SwiftUI

/// Decision-first trip logistics. Each open gate appears here exactly once;
/// Field is reserved for live conditions and offline emergency reference.
struct LogisticsView: View {
    private let operations = TripOperations.bundled

    private var openGates: [TripOperations.OperationalGate] {
        operations.gates.filter { $0.state != "confirmed" }
    }

    private func gates(_ ids: Set<String>) -> [TripOperations.OperationalGate] {
        openGates.filter { ids.contains($0.id) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    LogisticsHeader(
                        route: operations.canonicalRoute,
                        openGateCount: openGates.count
                    )
                    StartLogisticsCard(
                        flights: operations.workingFlights,
                        arrival: operations.arrivalPlan,
                        gates: gates([
                            "arrival-night-staging",
                            "burney-day-use",
                            "lake-britton-crossing",
                        ]),
                        sourcesByID: operations.sourcesByID
                    )
                    DayThreeLogisticsCard(
                        support: operations.dayThreeSupport,
                        gates: gates([
                            "bartle-support",
                            "overnights-water",
                            "satellite-comms",
                        ]),
                        sourcesByID: operations.sourcesByID
                    )
                    FinishLogisticsCard(
                        finish: operations.finishPlan,
                        gates: gates(["ash-camp-road"]),
                        sourcesByID: operations.sourcesByID
                    )
                    FieldcraftTipsCard(
                        tips: operations.fieldcraftTips,
                        sourcesByID: operations.sourcesByID
                    )
                }
                .padding()
                .padding(.bottom, 36)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Logistics")
        }
    }
}

private struct LogisticsHeader: View {
    let route: TripOperations.CanonicalRoute
    let openGateCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Three handoffs. One place for every open decision.", systemImage: "point.3.connected.trianglepath.dotted")
                .font(.headline)
                .foregroundStyle(.blue)
            Text("Start safely · execute the Day 3 support transfer · get out from Ash Camp. Itinerary owns the day-by-day hiking story; Field owns live conditions and emergency reference.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 12) {
                LogisticsMetric(
                    label: "Route",
                    value: String(format: "%.3f PCTA mi", route.officialPctaMiles)
                )
                LogisticsMetric(label: "Open decisions", value: "\(openGateCount)")
            }
        }
        .logisticsCard(tint: .blue)
    }
}

private struct StartLogisticsCard: View {
    let flights: TripOperations.WorkingFlights
    let arrival: TripOperations.ArrivalPlan
    let gates: [TripOperations.OperationalGate]
    let sourcesByID: [String: TripOperations.OperationalSource]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            LogisticsStepHeader(
                step: "1",
                title: "Start: SJC → sleep → Saturday drive to Burney",
                subtitle: "Do not confuse the Pacific-time departure stamp with an SJC arrival."
            )

            Text("UA481 is due at SJC at \(flights.inbound.scheduledArrivalLocal). The team sleeps near SJC and drives north at about 5:00–5:30 AM on Aug 29 — no overnight drive. Expect to reach Burney in the early afternoon; no one starts Day 1 until the team has eaten, hydrated, and cleared current Burney access.")
                .font(.subheadline)
                .fixedSize(horizontal: false, vertical: true)

            DriveSnapshotCard(snapshot: arrival.driveSnapshot, tint: .indigo)
            FlightWatchCard(tracking: flights.flightTracking)
            GateChecklist(
                title: "Start-side actions",
                gates: gates,
                sourcesByID: sourcesByID
            )
        }
        .logisticsCard(tint: .indigo)
    }
}

private struct DayThreeLogisticsCard: View {
    let support: TripOperations.DayThreeSupport
    let gates: [TripOperations.OperationalGate]
    let sourcesByID: [String: TripOperations.OperationalSource]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            LogisticsStepHeader(
                step: "2",
                title: "Day 3: support transfer, not a campsite",
                subtitle: "The solution to the private corridor is logistics—not a loophole."
            )
            Text(support.instruction)
                .font(.subheadline)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 12) {
                LogisticsMetric(label: "Hiker window", value: support.targetHikerWindow)
                LogisticsMetric(label: "Driver ready", value: support.driverReadyBy)
            }
            Text("Field pin: PCT \(support.pctMile, specifier: "%.3f") · route mile \(support.routeMile, specifier: "%.3f") · \(support.fieldToTrailOffsetFeet, specifier: "%.0f") ft from trail centerline")
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: 7) {
                Text("Before anybody starts Day 3")
                    .font(.subheadline.bold())
                ForEach(support.requiredBeforeStart, id: \.self) { requirement in
                    Label(requirement, systemImage: "checkmark.circle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            Text("No-show rule: \(support.noShowRule)")
                .font(.caption)
                .foregroundStyle(.red)
                .fixedSize(horizontal: false, vertical: true)
                .padding(10)
                .background(.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))

            GateChecklist(
                title: "Support-day actions",
                gates: gates,
                sourcesByID: sourcesByID
            )
        }
        .logisticsCard(tint: .red)
    }
}

private struct FinishLogisticsCard: View {
    let finish: TripOperations.FinishPlan
    let gates: [TripOperations.OperationalGate]
    let sourcesByID: [String: TripOperations.OperationalSource]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            LogisticsStepHeader(
                step: "3",
                title: "Finish: Ash Camp extraction",
                subtitle: "Ash Camp is the real finish—not a random ‘mile 52’ teleport."
            )
            Text("Primary: \(finish.primaryDate) · backup: \(finish.backupDate)")
                .font(.subheadline.bold())
            Text("Pickup window: \(finish.pickupWindow)")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(finish.road)
                .font(.subheadline)
                .fixedSize(horizontal: false, vertical: true)
            DriveSnapshotCard(snapshot: finish.driveSnapshot, tint: .teal)
            Text("Fallback: \(finish.fallback)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .padding(10)
                .background(.teal.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
            GateChecklist(
                title: "Extraction actions",
                gates: gates,
                sourcesByID: sourcesByID
            )
        }
        .logisticsCard(tint: .teal)
    }
}

private struct LogisticsStepHeader: View {
    let step: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text(step)
                .font(.headline.bold())
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(.primary, in: Circle())
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.title3.bold())
                    .fixedSize(horizontal: false, vertical: true)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct FlightWatchCard: View {
    let tracking: TripOperations.FlightTracking

    @State private var store = FlightWatchStore()

    private var displayFlights: [FlightWatchSnapshot.Flight] {
        store.snapshot?.flights ?? []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                Label("Flight Watch", systemImage: "airplane.departure")
                    .font(.headline)
                    .foregroundStyle(.blue)
                Spacer(minLength: 8)
                Text(store.snapshot?.provider.state == "live" ? "LIVE" : "SCHEDULED")
                    .font(.caption2.bold())
                    .foregroundStyle(store.snapshot?.provider.state == "live" ? .green : .blue)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background((store.snapshot?.provider.state == "live" ? Color.green : Color.blue).opacity(0.1), in: Capsule())
            }

            Text(store.snapshot?.provider.detail ?? tracking.provider)
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            ForEach(displayFlights) { flight in
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(flight.flightNumber) · \(flight.origin ?? "") → \(flight.destination ?? "")")
                        .font(.subheadline.bold().monospaced())
                    Text(flight.live ? flight.status : "Scheduled — no live aircraft claim")
                        .font(.caption.bold())
                        .foregroundStyle(flight.live ? .green : .secondary)
                    if let estimate = formatted(flight.estimatedArrivalAt) {
                        Text("Estimated arrival: \(estimate)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    if let gate = flight.originGate {
                        Text("Departure gate: \(gate)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    if let url = URL(string: flight.trackerUrl ?? "") {
                        Link("Track this aircraft", destination: url)
                            .font(.caption.bold())
                    }
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.blue.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
            }

            if displayFlights.isEmpty {
                ForEach(tracking.flights) { flight in
                    if let url = URL(string: flight.trackerUrl) {
                        Link("Track \(flight.flightNumber) aircraft", destination: url)
                            .font(.caption.bold())
                    }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                if let url = URL(string: tracking.officialStatusUrl) {
                    Link("Open United Flight Status", destination: url)
                        .buttonStyle(.bordered)
                }
                Button(store.isLoading ? "Refreshing…" : "Refresh Flight Watch", action: refresh)
                    .buttonStyle(.bordered)
                    .disabled(store.isLoading)
            }

            if let error = store.errorMessage {
                Text(error)
                    .font(.caption2)
                    .foregroundStyle(.orange)
                    .fixedSize(horizontal: false, vertical: true)
            } else if let checkedAt = store.snapshot?.checkedAt {
                Text("Last dashboard check: \(formatted(checkedAt) ?? checkedAt)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(12)
        .background(.blue.opacity(0.07), in: RoundedRectangle(cornerRadius: 13))
        .task {
            while !Task.isCancelled {
                await store.refresh()
                let seconds = max(60, store.snapshot?.refreshAfterSeconds ?? 21_600)
                try? await Task.sleep(nanoseconds: UInt64(seconds) * 1_000_000_000)
            }
        }
    }

    private func refresh() {
        Task { await store.refresh() }
    }

    private func formatted(_ value: String?) -> String? {
        guard let value,
              let date = ISO8601DateFormatter().date(from: value) else {
            return nil
        }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}

private struct GateChecklist: View {
    let title: String
    let gates: [TripOperations.OperationalGate]
    let sourcesByID: [String: TripOperations.OperationalSource]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.subheadline.bold())
            ForEach(gates) { gate in
                GateChecklistRow(
                    gate: gate,
                    sources: gate.sourceIDs.compactMap { sourcesByID[$0] }
                )
            }
        }
    }
}

private struct GateChecklistRow: View {
    let gate: TripOperations.OperationalGate
    let sources: [TripOperations.OperationalSource]

    private var tint: Color { gate.priority == "critical" ? .red : .orange }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: gate.priority == "critical" ? "exclamationmark.triangle.fill" : "clock.badge.exclamationmark")
                    .foregroundStyle(tint)
                VStack(alignment: .leading, spacing: 3) {
                    Text(gate.title)
                        .font(.subheadline.bold())
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Owner: \(gate.owner) · due \(gate.due)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Text(gate.detail)
                .font(.caption)
                .fixedSize(horizontal: false, vertical: true)
            Text("Blocks: \(gate.blocks)")
                .font(.caption2.bold())
                .foregroundStyle(tint)
                .fixedSize(horizontal: false, vertical: true)
            if !sources.isEmpty {
                DisclosureGroup("Evidence sources") {
                    SourceLinkList(sources: sources)
                        .padding(.top, 6)
                }
                .font(.caption)
                .tint(tint)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
    }
}

private struct FieldcraftTipsCard: View {
    let tips: [TripOperations.FieldcraftTip]
    let sourcesByID: [String: TripOperations.OperationalSource]

    var body: some View {
        DisclosureGroup {
            VStack(alignment: .leading, spacing: 12) {
                Text("These are sourced lessons from past hikers and are deliberately separated from live access, water, smoke, and closure status.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                ForEach(tips) { tip in
                    VStack(alignment: .leading, spacing: 5) {
                        Text(tip.title)
                            .font(.subheadline.bold())
                            .fixedSize(horizontal: false, vertical: true)
                        Text(tip.detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(tip.kind.uppercased())
                            .font(.caption2.bold())
                            .foregroundStyle(.orange)
                        SourceLinkList(sources: tip.sourceIDs.compactMap { sourcesByID[$0] })
                    }
                    .padding(.vertical, 4)
                }
            }
            .padding(.top, 8)
        } label: {
            Label("Practical trail lessons & caveats", systemImage: "lightbulb.max.fill")
                .font(.headline)
                .foregroundStyle(.orange)
        }
        .logisticsCard(tint: .orange)
    }
}

private struct SourceLinkList: View {
    let sources: [TripOperations.OperationalSource]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(sources) { source in
                if let url = URL(string: source.url ?? "") {
                    Link(destination: url) {
                        Label(source.title, systemImage: "arrow.up.right.square")
                            .font(.caption2)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                } else {
                    Text(source.title)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

private struct DriveSnapshotCard: View {
    let snapshot: TripOperations.DriveSnapshot
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Road-routing snapshot")
                .font(.caption2.bold())
                .foregroundStyle(.secondary)
            Text("\(snapshot.origin) → \(snapshot.destination)")
                .font(.caption.bold())
                .fixedSize(horizontal: false, vertical: true)
            Text(String(format: "%.1f mi · %.1f hr before stops", snapshot.distanceMiles, snapshot.durationHours))
                .font(.caption.bold())
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
    }
}

private struct LogisticsMetric: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(.caption2.bold())
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.bold())
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private extension View {
    func logisticsCard(tint: Color) -> some View {
        padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(tint.opacity(0.22), lineWidth: 1))
    }
}

#Preview {
    LogisticsView()
}
