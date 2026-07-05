import Foundation
import Network

/// Singleton that monitors network connectivity changes.
/// When path transitions from unsatisfied → satisfied, notifies listeners to trigger sync.
@Observable
final class NetworkMonitor: @unchecked Sendable {
    static let shared = NetworkMonitor()

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.ddg.networkmonitor", qos: .utility)

    private(set) var isConnected = false
    private(set) var isExpensive = false       // true for cellular
    private(set) var isConstrained = false     // true for Low Data Mode

    /// Fires when connectivity is regained after being offline
    var onReconnect: (() -> Void)?

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            guard let self else { return }
            let wasConnected = self.isConnected
            let nowConnected = path.status == .satisfied

            Task { @MainActor in
                self.isConnected = nowConnected
                self.isExpensive = path.isExpensive
                self.isConstrained = path.isConstrained

                // Trigger sync when transitioning from offline → online
                if !wasConnected && nowConnected {
                    self.onReconnect?()
                }
            }
        }
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }
}
