import Foundation
import Combine
import CoreLocation

/// Requests and tracks when-in-use location authorization so the trail map can
/// draw the user's position.
///
/// This exists because `UserAnnotation()` and `MapUserLocationButton()` render
/// nothing at all until something has actually asked for authorization — the
/// map silently shows no dot rather than reporting a problem, which on trail is
/// the worst possible failure mode.
///
/// Nothing here needs a network. GPS is satellite-based and keeps producing a
/// fix with no cell service; only the basemap tiles underneath require data.
@MainActor
final class LocationAuthorizer: NSObject, ObservableObject {
    @Published private(set) var status: CLAuthorizationStatus
    @Published private(set) var lastFix: CLLocation?

    private let manager = CLLocationManager()

    override init() {
        status = manager.authorizationStatus
        super.init()
        manager.delegate = self
        // Hiking-grade accuracy. Best-for-navigation is a GPS/battery cost we
        // do not need to locate ourselves against a trail corridor.
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 10
    }

    /// Safe to call repeatedly; iOS ignores it once a decision exists.
    func requestIfNeeded() {
        guard status == .notDetermined else {
            startIfAuthorized()
            return
        }
        manager.requestWhenInUseAuthorization()
    }

    private func startIfAuthorized() {
        guard status == .authorizedWhenInUse || status == .authorizedAlways else { return }
        manager.startUpdatingLocation()
    }

    /// True when the map can draw a position dot.
    var isAuthorized: Bool {
        status == .authorizedWhenInUse || status == .authorizedAlways
    }

    /// User-facing explanation when there is no dot, so a blank map is never
    /// mistaken for "GPS is broken".
    var unavailableReason: String? {
        switch status {
        case .notDetermined:
            return "Location permission has not been granted yet. Tap the location button to enable it."
        case .denied:
            return "Location access is denied. Enable it in Settings › Privacy & Security › Location Services › DDG-Mobile. GPS itself still works without cell service; the app just cannot read it."
        case .restricted:
            return "Location access is restricted on this device."
        default:
            return nil
        }
    }
}

extension LocationAuthorizer: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let updated = manager.authorizationStatus
        Task { @MainActor in
            self.status = updated
            self.startIfAuthorized()
        }
    }

    nonisolated func locationManager(
        _ manager: CLLocationManager,
        didUpdateLocations locations: [CLLocation]
    ) {
        guard let latest = locations.last else { return }
        Task { @MainActor in
            self.lastFix = latest
        }
    }

    nonisolated func locationManager(
        _ manager: CLLocationManager,
        didFailWithError error: Error
    ) {
        // A transient failure is normal under canopy or in a canyon. Keep the
        // last good fix rather than blanking the dot.
    }
}
