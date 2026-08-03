import Foundation
import Observation
import Supabase

nonisolated struct FlightWatchSnapshot: Decodable, Sendable {
    struct Provider: Decodable, Sendable {
        let id: String
        let state: String
        let detail: String
        let officialStatusUrl: String
        let dataBoundary: String
    }

    struct Flight: Decodable, Identifiable, Sendable {
        let flightNumber: String
        let origin: String?
        let destination: String?
        let trackerUrl: String?
        let live: Bool
        let status: String
        let actualDepartureAt: String?
        let estimatedArrivalAt: String?
        let originGate: String?

        var id: String { flightNumber }
    }

    let checkedAt: String
    let provider: Provider
    let refreshAfterSeconds: Int
    let flights: [Flight]
}

@Observable
@MainActor
final class FlightWatchStore {
    private(set) var snapshot: FlightWatchSnapshot?
    private(set) var errorMessage: String?
    private(set) var isLoading = false

    func refresh() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        guard SupabaseManager.shared.isConfigured else {
            errorMessage = "Supabase is unavailable on this iPhone. Use the official United Flight Status link."
            return
        }

        do {
            let value: FlightWatchSnapshot = try await SupabaseManager.shared.client
                .functions
                .invoke(
                    "flight-status",
                    options: FunctionInvokeOptions(body: ["refresh": false])
                )
            snapshot = value
        } catch is CancellationError {
            return
        } catch {
            errorMessage = "Flight Watch could not refresh. Use the official United Flight Status link."
        }
    }
}
