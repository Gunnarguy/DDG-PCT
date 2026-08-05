import SwiftUI
import SwiftData

/// Container view that stacks the Trail Map and the Elevation Profile chart,
/// sharing a state binding to synchronize the interactive hover/crosshair cursor.
struct MapContainerView: View {
    @State private var hoverPoint: HoverPoint? = nil
    @State private var selectedDay: Int? = nil
    @State private var conditionsStore = TrailConditionsStore()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TrailMapView(
                    hoverPoint: $hoverPoint,
                    selectedDay: $selectedDay,
                    waterConditions: conditionsStore.snapshot?.water?.sources ?? [],
                    waterReportUpdatedText: conditionsStore.snapshot?.water?.updatedText,
                    waterSnapshotFetchedAt: conditionsStore.snapshot?.fetchedDate,
                    waterSourceURL: conditionsStore.snapshot?.water?.sourceUrl
                )
                    .frame(maxHeight: .infinity)
                
                Divider()
                
                ElevationProfileView(
                    hoverPoint: $hoverPoint,
                    selectedDay: $selectedDay,
                    waterConditions: conditionsStore.snapshot?.water?.sources ?? [],
                    waterReportUpdatedText: conditionsStore.snapshot?.water?.updatedText,
                    waterSnapshotFetchedAt: conditionsStore.snapshot?.fetchedDate,
                    waterSourceURL: conditionsStore.snapshot?.water?.sourceUrl
                )
                    .frame(height: 300)
                    .padding(.bottom, 50)
                    .background(Color(uiColor: .systemBackground))
            }
            // The tab bar already says "Map" and the scope picker sits at the
            // top-left of the map itself, so a nav title here only collided
            // with those controls.
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
            .onAppear {
                print("DEBUG [MapContainerView]: Mounted on screen.")
            }
            .task {
                if conditionsStore.snapshot == nil {
                    await conditionsStore.refresh()
                }
            }
            .onChange(of: hoverPoint) { oldValue, newValue in
                if let newValue {
                    print("DEBUG [MapContainerView]: Active hover point - Mile: \(String(format: "%.2f", newValue.mile)) | Elevation: \(String(format: "%.1f", newValue.elevationFeet))ft | Coordinate: (\(newValue.latitude), \(newValue.longitude))")
                } else if oldValue != nil {
                    print("DEBUG [MapContainerView]: Hover point cleared.")
                }
            }
        }
    }
}

#Preview {
    MapContainerView()
        .modelContainer(for: [CampSite.self, TrailPoint.self, WaterSource.self], inMemory: true)
}
