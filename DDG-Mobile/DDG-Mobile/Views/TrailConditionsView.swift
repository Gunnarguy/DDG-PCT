import SwiftData
import SwiftUI

struct TrailConditionsView: View {
    @Query private var offlineWaterSources: [WaterSource]
    @State private var store = TrailConditionsStore()
    @State private var safetyBriefing: String?
    @State private var isGeneratingBriefing = false

    private var snapshot: TrailConditionsSnapshot? { store.snapshot }

    var body: some View {
        ZStack {
            Color(uiColor: .systemGroupedBackground).ignoresSafeArea()

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 18) {
                    statusCard

                    if let warning = store.warning {
                        messageCard(
                            icon: "clock.badge.exclamationmark",
                            color: .orange,
                            title: "Fallback data in use",
                            detail: warning
                        )
                    }

                    if let error = store.errorMessage {
                        messageCard(
                            icon: "wifi.exclamationmark",
                            color: .red,
                            title: "Conditions unavailable",
                            detail: error
                        )
                    }

                    if let snapshot {
                        verificationSection(snapshot)
                        crossingAndCampSection(snapshot)
                        waterSection(snapshot)
                        agencyAlertSection(snapshot)
                        wildfireSection(snapshot)
                        airQualitySection(snapshot)
                        briefingSection(snapshot)
                    }
                }
                .padding()
                .padding(.bottom, 40)
            }
        }
        .navigationTitle("Daily Trail Conditions")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await store.refresh(force: true) }
                } label: {
                    if store.isLoading {
                        ProgressView()
                    } else {
                        Image(systemName: "arrow.clockwise")
                    }
                }
                .disabled(store.isLoading)
                .accessibilityLabel("Refresh trail conditions")
            }
        }
        .refreshable {
            await store.refresh(force: true)
        }
        .task {
            if snapshot == nil {
                await store.refresh()
            }
        }
        .overlay {
            if store.isLoading && snapshot == nil {
                VStack(spacing: 10) {
                    ProgressView()
                    Text("Checking water, smoke, fires, and agency alerts…")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
            }
        }
    }

    private var statusCard: some View {
        let statuses = snapshot?.sourceStatus?.values ?? Dictionary<String, TrailConditionSourceState>().values
        let manualCount = statuses.filter { $0.status == "manual_required" }.count
        let errorCount = statuses.filter { $0.status == "error" }.count
        let needsReview = snapshot == nil || manualCount > 0 || errorCount > 0 || snapshot?.isDailySnapshotStale == true

        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                Image(systemName: needsReview ? "exclamationmark.shield.fill" : "checkmark.shield.fill")
                    .font(.title)
                    .foregroundStyle(needsReview ? .orange : .green)

                VStack(alignment: .leading, spacing: 4) {
                    Text(needsReview ? "Not fully cleared" : "Automated sources checked")
                        .font(.title3.bold())
                    Text("No inaccessible or missing source is treated as an all-clear.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if let fetchedDate = snapshot?.fetchedDate {
                HStack {
                    Label(
                        fetchedDate.formatted(date: .abbreviated, time: .shortened),
                        systemImage: "clock"
                    )
                    Spacer()
                    if let origin = store.origin {
                        Text(origin.rawValue)
                    }
                }
                .font(.caption.bold())
                .foregroundStyle(.secondary)
            } else {
                Text("Waiting for the first protected Supabase snapshot.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if manualCount > 0 || errorCount > 0 {
                HStack(spacing: 8) {
                    if manualCount > 0 {
                        ConditionPill(
                            text: "\(manualCount) manual checks",
                            color: .orange
                        )
                    }
                    if errorCount > 0 {
                        ConditionPill(
                            text: "\(errorCount) unavailable",
                            color: .red
                        )
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke((needsReview ? Color.orange : .green).opacity(0.35), lineWidth: 1)
        )
    }

    private func verificationSection(_ snapshot: TrailConditionsSnapshot) -> some View {
        section(title: "Verification Status", icon: "checklist") {
            let statuses = snapshot.sourceStatus ?? [:]
            ForEach(statuses.keys.sorted(by: sourceSort), id: \.self) { key in
                if let state = statuses[key] {
                    sourceRow(key: key, state: state)
                }
            }

            Text("“Live source read” only means the source responded. It does not certify that a trail, campsite, crossing, or water source is safe.")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private func crossingAndCampSection(_ snapshot: TrailConditionsSnapshot) -> some View {
        section(title: "Crossing & Campsites", icon: "signpost.right.and.left") {
            if let bridge = snapshot.bridgeCrossing {
                conditionLead(
                    title: bridge.name,
                    detail: bridge.verification?.detail
                        ?? "Confirm this crossing with PCTA and the land manager.",
                    status: bridge.verification?.status ?? "manual_required"
                )

                ForEach(bridge.reports) { report in
                    Text("Water report mile \(report.mile, specifier: "%.1f"): \(report.latestReport)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if let campsite = snapshot.campsiteAvailability {
                Divider()
                conditionLead(
                    title: "Dispersed campsite availability",
                    detail: campsite.detail
                        ?? "No authoritative occupancy feed exists for these dispersed sites.",
                    status: campsite.status
                )
            }
        }
    }

    private func waterSection(_ snapshot: TrailConditionsSnapshot) -> some View {
        section(title: "PCT Water Report", icon: "drop.fill") {
            if let water = snapshot.water {
                Text("\(water.count) entries · route miles 1420–1473")
                    .font(.subheadline.bold())
                Text(water.updatedText ?? "Source update time unavailable")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                ForEach(water.sources) { source in
                    DisclosureGroup {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(source.latestReport)
                                .font(.caption)
                            Text(
                                [
                                    source.reportDate.map { "Reported \($0)" },
                                    source.reportedBy.map { "by \($0)" },
                                ]
                                .compactMap { $0 }
                                .joined(separator: " ")
                            )
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        }
                        .padding(.top, 6)
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Mile \(source.mile, specifier: "%.1f")")
                                    .font(.caption2.bold())
                                    .foregroundStyle(.secondary)
                                Text(source.name)
                                    .font(.subheadline.bold())
                                    .lineLimit(2)
                            }
                            Spacer()
                            ConditionPill(
                                text: source.condition,
                                color: waterColor(source.condition)
                            )
                        }
                    }
                    Divider()
                }

                Text("Treat every backcountry source before drinking. The bundled map remains an offline location reference, not proof of flow.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            } else {
                unavailableText("No live water report is present in this snapshot.")
            }
        }
    }

    private func agencyAlertSection(_ snapshot: TrailConditionsSnapshot) -> some View {
        section(title: "Closures & Restrictions", icon: "exclamationmark.triangle.fill") {
            if let alerts = snapshot.agencyAlerts, !alerts.isEmpty {
                Text("These are review leads. Forest pages can include orders outside the 54.2-mile corridor; open each order and confirm its mapped boundary.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                ForEach(alerts) { alert in
                    if let url = URL(string: alert.url) {
                        Link(destination: url) {
                            VStack(alignment: .leading, spacing: 5) {
                                HStack {
                                    Text(alert.agency)
                                        .font(.caption.bold())
                                    Spacer()
                                    Image(systemName: "arrow.up.right")
                                        .font(.caption2)
                                }
                                Text(alert.text)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.leading)
                            }
                        }
                        .buttonStyle(.plain)
                        Divider()
                    }
                }
            } else {
                unavailableText("No agency alert text was extracted. This is not an all-clear.")
            }
        }
    }

    private func wildfireSection(_ snapshot: TrailConditionsSnapshot) -> some View {
        section(title: "Wildfire Incidents", icon: "flame.fill") {
            if let wildfire = snapshot.wildfire, wildfire.unavailable != true {
                if wildfire.fires.isEmpty {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("No current fire incidents are mapped inside the route monitoring box.")
                            .font(.subheadline.bold())
                    }
                } else {
                    ForEach(wildfire.fires) { fire in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(fire.name).font(.headline)
                            Text("\(fire.acres.formatted()) acres · \(fire.containment)% contained")
                                .font(.caption.bold())
                            Text(
                                fire.distanceToTrail.map {
                                    "\($0.formatted(.number.precision(.fractionLength(0)))) miles from trail"
                                } ?? "Inside the route monitoring area; exact trail distance requires map review."
                            )
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        }
                    }
                }

                if let source = wildfire.source {
                    Text(source)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else {
                unavailableText("Wildfire data is unavailable; status is unknown.")
            }
        }
    }

    private func airQualitySection(_ snapshot: TrailConditionsSnapshot) -> some View {
        section(title: "Smoke & Air Quality", icon: "aqi.medium") {
            if let readings = snapshot.airQuality?.readings, !readings.isEmpty {
                ForEach(readings) { reading in
                    HStack {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(reading.location).font(.headline)
                            Text(reading.category ?? "Category unavailable")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            if let pm25 = reading.pm25 {
                                Text("PM2.5 \(pm25.formatted()) \(reading.pm25Unit ?? "")")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        Text(reading.aqi.map(String.init) ?? "—")
                            .font(.title.bold())
                            .foregroundStyle(aqiColor(reading.aqi))
                    }
                    Divider()
                }

                if let note = snapshot.airQuality?.note {
                    Text(note)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else {
                unavailableText("No AQI readings are available.")
            }
        }
    }

    private func briefingSection(_ snapshot: TrailConditionsSnapshot) -> some View {
        section(title: "On-Device Safety Briefing", icon: "sparkles") {
            if let safetyBriefing {
                Text(safetyBriefing)
                    .font(.callout)
            }

            Button {
                Task { await generateBriefing(snapshot) }
            } label: {
                if isGeneratingBriefing {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Label(
                        safetyBriefing == nil ? "Generate from current snapshot" : "Regenerate briefing",
                        systemImage: "sparkles"
                    )
                    .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isGeneratingBriefing)
        }
    }

    private func sourceRow(key: String, state: TrailConditionSourceState) -> some View {
        let color = statusColor(state.status)
        return HStack(alignment: .top, spacing: 10) {
            Image(systemName: statusIcon(state.status))
                .foregroundStyle(color)
                .frame(width: 22)
            VStack(alignment: .leading, spacing: 3) {
                Text(sourceLabel(key))
                    .font(.subheadline.bold())
                Text(statusText(state.status))
                    .font(.caption)
                    .foregroundStyle(color)
                if let detail = state.detail {
                    Text(detail)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if let urlString = state.url, let url = URL(string: urlString) {
                Link(destination: url) {
                    Image(systemName: "arrow.up.right.square")
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func conditionLead(title: String, detail: String, status: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: statusIcon(status))
                .foregroundStyle(statusColor(status))
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(statusText(status))
                    .font(.caption.bold())
                    .foregroundStyle(statusColor(status))
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func messageCard(
        icon: String,
        color: Color,
        title: String,
        detail: String
    ) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon).foregroundStyle(color)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.subheadline.bold())
                Text(detail).font(.caption).foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
    }

    private func section<Content: View>(
        title: String,
        icon: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: icon)
                .font(.title3.bold())
            content()
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            Color(uiColor: .secondarySystemGroupedBackground),
            in: RoundedRectangle(cornerRadius: 16)
        )
    }

    private func unavailableText(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(.secondary)
    }

    private func generateBriefing(_ snapshot: TrailConditionsSnapshot) async {
        isGeneratingBriefing = true
        defer { isGeneratingBriefing = false }

        do {
            safetyBriefing = try await OnDeviceLLM.shared.safetyBriefing(
                fires: (snapshot.wildfire?.fires ?? []).map {
                    ($0.name, $0.acres, $0.containment)
                },
                aqi: (snapshot.airQuality?.readings ?? []).map {
                    ($0.location, $0.aqi, $0.category, nil as Int?)
                },
                waterSources: offlineWaterSources.map {
                    ($0.name, $0.reliability, $0.notes)
                },
                currentAltitudeZone: altitudeZones.first { $0.id == "moderate" },
                connectivityGaps: Array(connectivityZones)
            )
        } catch {
            safetyBriefing = "The on-device briefing could not be generated. Use the source cards above directly."
        }
    }

    private func sourceSort(_ lhs: String, _ rhs: String) -> Bool {
        let statuses = snapshot?.sourceStatus ?? [:]
        let rank = ["error": 0, "manual_required": 1, "live": 2]
        let left = rank[statuses[lhs]?.status ?? ""] ?? 3
        let right = rank[statuses[rhs]?.status ?? ""] ?? 3
        return left == right ? sourceLabel(lhs) < sourceLabel(rhs) : left < right
    }

    private func sourceLabel(_ key: String) -> String {
        [
            "pctWater": "PCT Water Report",
            "nifcFirePerimeters": "Wildfire incidents / perimeters",
            "smokeAqi": "Smoke / AQI model",
            "shastaTrinityAlerts": "Shasta-Trinity alerts",
            "lassenAlerts": "Lassen alerts",
            "burneyPark": "Burney Falls park",
            "burneyClosures": "California State Parks closures",
            "pctaClosures": "PCTA closure map",
            "campsiteAvailability": "Campsite availability",
            "lakeBrittonBridge": "Lake Britton crossing",
        ][key] ?? key
    }

    private func statusIcon(_ status: String) -> String {
        switch status {
        case "live": "checkmark.circle.fill"
        case "manual_required": "hand.raised.circle.fill"
        default: "exclamationmark.circle.fill"
        }
    }

    private func statusText(_ status: String) -> String {
        switch status {
        case "live": "Live source read"
        case "manual_required": "Manual verification required"
        default: "Source unavailable"
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "live": .green
        case "manual_required": .orange
        default: .red
        }
    }

    private func waterColor(_ condition: String) -> Color {
        switch condition {
        case "flowing": .blue
        case "limited": .orange
        case "dry": .red
        default: .gray
        }
    }

    private func aqiColor(_ aqi: Int?) -> Color {
        guard let aqi else { return .secondary }
        switch aqi {
        case 0...50: return Color.green
        case 51...100: return Color.yellow
        case 101...150: return Color.orange
        case 151...200: return Color.red
        case 201...300: return Color.purple
        default: return Color.brown
        }
    }
}

private struct ConditionPill: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text.replacingOccurrences(of: "_", with: " ").uppercased())
            .font(.system(size: 10, weight: .bold, design: .rounded))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.14), in: Capsule())
            .foregroundStyle(color)
    }
}

#Preview {
    NavigationStack {
        TrailConditionsView()
    }
    .modelContainer(for: [WaterSource.self], inMemory: true)
}
