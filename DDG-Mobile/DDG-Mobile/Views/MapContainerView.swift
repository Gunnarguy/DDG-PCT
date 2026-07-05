import SwiftUI

/// Container view that stacks the Trail Map and the Elevation Profile chart,
/// sharing a state binding to synchronize the interactive hover/crosshair cursor.
struct MapContainerView: View {
    @State private var hoverPoint: HoverPoint? = nil

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TrailMapView(hoverPoint: $hoverPoint)
                    .frame(maxHeight: .infinity)
                
                Divider()
                
                ElevationProfileView(hoverPoint: $hoverPoint)
                    .frame(height: 260)
                    .background(Color(uiColor: .systemBackground))
            }
            .navigationTitle("Trail Map")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    MapContainerView()
        .modelContainer(for: [CampSite.self, TrailPoint.self, WaterSource.self], inMemory: true)
}
