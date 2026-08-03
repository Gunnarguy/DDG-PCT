import SwiftUI

/// The trip's source-backed access and extraction contract.
/// Field safety and shared notes stay in the Field workspace; gear stays in Gear.
struct LogisticsView: View {
    private let operations = TripOperations.bundled

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    RouteSummaryCard(route: operations.canonicalRoute)
                    FlightContractCard(flights: operations.workingFlights)
                    FlightWatchCard(tracking: operations.workingFlights.flightTracking)
                    ArrivalContractCard(plan: operations.arrivalPlan)
                    DayThreeSupportCard(support: operations.dayThreeSupport)
                    ExtractionContractCard(plan: operations.finishPlan)
                    VerificationGatesSection(
                        gates: operations.gates,
                        sourcesByID: operations.sourcesByID
                    )
                }
                .padding()
                .padding(.bottom, 36)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Access & Extraction")
        }
    }
}

private struct RouteSummaryCard: View {
    let route: TripOperations.CanonicalRoute

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Active route", systemImage: "point.topleft.down.curvedto.point.bottomright.up")
                .font(.caption.bold())
                .foregroundStyle(.tint)
            Text(route.name)
                .font(.title3.bold())
            Text("\(route.officialPctaMiles, specifier: "%.3f") official PCTA miles · \(route.centerlineGeometryMiles, specifier: "%.3f") mi measured centerline")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text("Terrain contract \(route.terrainContractVersion)")
                .font(.caption2.monospaced())
                .foregroundStyle(.secondary)
        }
        .missionCard(tint: .blue)
    }
}

private struct FlightContractCard: View {
    let flights: TripOperations.WorkingFlights

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Confirmed flight itinerary", systemImage: "airplane")
                .font(.headline)
                .foregroundStyle(.orange)
            Text(flights.disclaimer)
                .font(.caption)
                .foregroundStyle(.secondary)

            ForEach([flights.inbound, flights.outbound]) { flight in
                VStack(alignment: .leading, spacing: 5) {
                    HStack {
                        Text(flight.flightNumber)
                            .font(.headline.monospaced())
                        Spacer()
                        Text(flight.travelers.joined(separator: " + "))
                            .font(.caption.bold())
                            .foregroundStyle(.secondary)
                    }
                    Text("\(flight.origin) → \(flight.destination)")
                        .font(.subheadline.bold())
                    Text("\(flight.scheduledDepartureLocal) → \(flight.scheduledArrivalLocal)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.orange.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
            }
        }
        .missionCard(tint: .orange)
    }
}

private struct FlightWatchCard: View {
    let tracking: TripOperations.FlightTracking

    @State private var store = FlightWatchStore()

    private var displayFlights: [FlightWatchSnapshot.Flight] {
        store.snapshot?.flights ?? []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                Label("Flight Watch", systemImage: "airplane.departure")
                    .font(.headline)
                    .foregroundStyle(.blue)
                Spacer()
                Text(store.snapshot?.provider.state == "live" ? "LIVE PROVIDER" : "OFFICIAL CHECK READY")
                    .font(.caption2.bold())
                    .foregroundStyle(store.snapshot?.provider.state == "live" ? .green : .blue)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background((store.snapshot?.provider.state == "live" ? Color.green : Color.blue).opacity(0.1), in: Capsule())
            }

            Text(store.snapshot?.provider.detail ?? tracking.provider)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(store.snapshot?.provider.dataBoundary ?? tracking.dataBoundary)
                .font(.caption2)
                .foregroundStyle(.secondary)

            if !displayFlights.isEmpty {
                ForEach(displayFlights) { flight in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(flight.flightNumber)
                                .font(.subheadline.bold().monospaced())
                            Spacer()
                            Text(flight.live ? flight.status : "Scheduled — no live aircraft claim")
                                .font(.caption.bold())
                                .foregroundStyle(flight.live ? .green : .secondary)
                        }
                        if let origin = flight.origin, let destination = flight.destination {
                            Text("\(origin) → \(destination)")
                                .font(.caption)
                        }
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
                            Link("Track aircraft", destination: url)
                                .font(.caption.bold())
                        }
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.blue.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
                }
            } else {
                FlowLayout(spacing: 6) {
                    ForEach(tracking.flights) { flight in
                        if let url = URL(string: flight.trackerUrl) {
                            Link("Track \(flight.flightNumber) aircraft", destination: url)
                                .font(.caption.bold())
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(.blue.opacity(0.1), in: Capsule())
                        }
                    }
                }
            }

            HStack(spacing: 10) {
                if let url = URL(string: tracking.officialStatusUrl) {
                    Link("Open United Flight Status", destination: url)
                        .buttonStyle(.bordered)
                }
                Button(store.isLoading ? "Refreshing…" : "Refresh Flight Watch") {
                    refresh()
                }
                .buttonStyle(.bordered)
                .disabled(store.isLoading)
            }

            if let error = store.errorMessage {
                Text(error)
                    .font(.caption2)
                    .foregroundStyle(.orange)
            } else if let checkedAt = store.snapshot?.checkedAt {
                Text("Last dashboard check: \(formatted(checkedAt) ?? checkedAt)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .missionCard(tint: .blue)
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

private struct ArrivalContractCard: View {
    let plan: TripOperations.ArrivalPlan

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Arrival & trailhead insertion", systemImage: "car.fill")
                .font(.headline)
                .foregroundStyle(.indigo)
            Text(plan.instruction)
                .font(.subheadline)
            TripDriveSnapshotCard(snapshot: plan.driveSnapshot, tint: .indigo)
        }
        .missionCard(tint: .indigo)
    }
}

private struct DayThreeSupportCard: View {
    let support: TripOperations.DayThreeSupport

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Day 3 is a support transfer", systemImage: "arrow.left.arrow.right.circle.fill")
                .font(.headline)
                .foregroundStyle(.red)
            Text(support.instruction)
                .font(.subheadline)
            HStack(spacing: 12) {
                OperationalMetric(label: "Hikers", value: support.targetHikerWindow)
                OperationalMetric(label: "Driver ready", value: support.driverReadyBy)
            }
            Text("Exact field pin: PCT \(support.pctMile, specifier: "%.3f") · route mi \(support.routeMile, specifier: "%.3f") · \(support.fieldToTrailOffsetFeet, specifier: "%.0f") ft from the trail centerline")
                .font(.caption)
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 7) {
                Text("Before anyone starts Day 3")
                    .font(.subheadline.bold())
                ForEach(support.requiredBeforeStart, id: \.self) { requirement in
                    Label(requirement, systemImage: "checkmark.circle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Text("No-show rule: \(support.noShowRule)")
                .font(.caption)
                .foregroundStyle(.red)
                .padding(10)
                .background(.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
        }
        .missionCard(tint: .red)
    }
}

private struct ExtractionContractCard: View {
    let plan: TripOperations.FinishPlan

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Ash Camp extraction", systemImage: "flag.checkered")
                .font(.headline)
                .foregroundStyle(.teal)
            Text("Primary \(plan.primaryDate) · contingency \(plan.backupDate)")
                .font(.subheadline.bold())
            Text(plan.pickupWindow)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(plan.road)
                .font(.subheadline)
            TripDriveSnapshotCard(snapshot: plan.driveSnapshot, tint: .teal)
            Text("Fallback: \(plan.fallback)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(10)
                .background(.teal.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
        }
        .missionCard(tint: .teal)
    }
}

private struct VerificationGatesSection: View {
    let gates: [TripOperations.OperationalGate]
    let sourcesByID: [String: TripOperations.OperationalSource]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Remaining verification gates", systemImage: "checklist")
                .font(.title3.bold())
            Text("Open means exactly that: do not check it off in your head. Use the shared Ops Log after an actual confirmation.")
                .font(.caption)
                .foregroundStyle(.secondary)

            ForEach(gates.filter { $0.state != "confirmed" }) { gate in
                VerificationGateCard(
                    gate: gate,
                    sources: gate.sourceIDs.compactMap { sourcesByID[$0] }
                )
            }
        }
    }
}

private struct VerificationGateCard: View {
    let gate: TripOperations.OperationalGate
    let sources: [TripOperations.OperationalSource]

    private var tint: Color {
        gate.priority == "critical" ? .red : .orange
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(alignment: .top) {
                Image(systemName: gate.priority == "critical" ? "exclamationmark.triangle.fill" : "clock.badge.exclamationmark")
                    .foregroundStyle(tint)
                VStack(alignment: .leading, spacing: 3) {
                    Text(gate.title)
                        .font(.subheadline.bold())
                    Text("Owner: \(gate.owner) · due \(gate.due)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Text(gate.detail)
                .font(.caption)
            Text("Blocks: \(gate.blocks)")
                .font(.caption2.bold())
                .foregroundStyle(tint)

            if !sources.isEmpty {
                FlowLayout(spacing: 6) {
                    ForEach(sources) { source in
                        if let url = URL(string: source.url ?? "") {
                            Link(destination: url) {
                                Label(source.title, systemImage: "arrow.up.right.square")
                                    .font(.caption2)
                                    .lineLimit(1)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 5)
                                    .background(tint.opacity(0.1), in: Capsule())
                            }
                        } else {
                            Text(source.title)
                                .font(.caption2)
                                .lineLimit(1)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(.secondary.opacity(0.12), in: Capsule())
                        }
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(tint.opacity(0.25), lineWidth: 1))
    }
}

private struct TripDriveSnapshotCard: View {
    let snapshot: TripOperations.DriveSnapshot
    let tint: Color

    var body: some View {
        HStack(spacing: 12) {
            OperationalMetric(label: "Route", value: "\(snapshot.origin) → \(snapshot.destination)")
            OperationalMetric(
                label: "Snapshot",
                value: String(format: "%.1f mi · %.1f hr", snapshot.distanceMiles, snapshot.durationHours)
            )
        }
        .padding(10)
        .background(tint.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
    }
}

private struct OperationalMetric: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(.caption2.bold())
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.bold())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private extension View {
    func missionCard(tint: Color) -> some View {
        padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(tint.opacity(0.22), lineWidth: 1))
    }
}

#Preview {
    LogisticsView()
}
