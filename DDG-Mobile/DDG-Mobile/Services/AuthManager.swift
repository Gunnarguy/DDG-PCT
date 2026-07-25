import Foundation
import AuthenticationServices
import SwiftUI
import Supabase

private nonisolated struct TeamProfileRow: Decodable, Sendable {
    let hikerId: String

    enum CodingKeys: String, CodingKey {
        case hikerId = "hiker_id"
    }
}

/// Manages Sign in with Apple authentication and maps an authorized Supabase
/// team profile to local display metadata.
///
/// Flow:
/// 1. User taps "Sign in with Apple"
/// 2. ASAuthorizationController presents Apple sign-in sheet
/// 3. Exchange the Apple identity token for a Supabase session
/// 4. Fetch the user's RLS-protected ddg_team_profiles row
/// 5. Map its hiker_id to the local roster for presentation
/// 6. Deny access when Supabase has no team profile
@Observable
@MainActor
final class AuthManager {
    static let shared = AuthManager()

    // MARK: - State

    private(set) var currentUser: DDGTeam.Member?
    private(set) var userEmail: String?
    private(set) var appleUserID: String?
    private(set) var authState: AuthState = .unknown

    enum AuthState: Equatable {
        case unknown        // Haven't checked yet
        case signedOut
        case signedIn
        case denied         // Valid Apple ID but not in DDGTeam
    }

    // MARK: - Keychain Keys

    private let keychainService = "com.ddg.mobile.auth"
    private let emailKey = "ddg_user_email"
    private let appleIDKey = "ddg_apple_user_id"

    // MARK: - Init

    private init() {
        restoreSession()
    }

    // MARK: - Sign In

    /// Initiate Sign in with Apple flow (programmatic fallback)
    func signIn() {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.email]

        let controller = ASAuthorizationController(authorizationRequests: [request])
        let delegate = SignInDelegate { [weak self] result in
            Task { @MainActor in
                self?.handleSignInResult(result)
            }
        }
        // Keep delegate alive for the duration of the request
        _activeDelegate = delegate
        controller.delegate = delegate
        controller.performRequests()
    }

    /// Handle completion from SwiftUI's SignInWithAppleButton
    func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) {
        handleSignInResult(result)
    }

    /// Sign out and clear persisted credentials
    func signOut() {
        currentUser = nil
        userEmail = nil
        appleUserID = nil
        authState = .signedOut
        clearKeychain()

        if SupabaseManager.shared.isConfigured {
            Task {
                try? await SupabaseManager.shared.client.auth.signOut()
            }
        }
    }

    // MARK: - Session Restore

    /// Check if we have a persisted session and validate it
    private func restoreSession() {
        guard let email = readKeychain(key: emailKey),
              let appleID = readKeychain(key: appleIDKey) else {
            authState = .signedOut
            return
        }

        // Verify the Apple credential is still valid
        let provider = ASAuthorizationAppleIDProvider()
        provider.getCredentialState(forUserID: appleID) { [weak self] state, _ in
            guard let manager = self else { return }
            Task { @MainActor in
                switch state {
                case .authorized:
                    manager.appleUserID = appleID
                    manager.userEmail = email
                    guard SupabaseManager.shared.isConfigured else {
                        manager.authState = .denied
                        return
                    }
                    await manager.authorizeSupabaseSession()
                default:
                    manager.authState = .signedOut
                    manager.clearKeychain()
                }
            }
        }
    }

    // MARK: - Handle Result

    private func handleSignInResult(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                authState = .signedOut
                return
            }

            let userID = credential.user
            // Apple only provides email on first sign-in; use persisted email as fallback
            let email = credential.email ?? readKeychain(key: emailKey)

            guard let resolvedEmail = email else {
                // No email available — can't validate team membership
                authState = .denied
                return
            }

            appleUserID = userID
            userEmail = resolvedEmail

            // Persist to keychain
            saveKeychain(key: appleIDKey, value: userID)
            saveKeychain(key: emailKey, value: resolvedEmail)

            guard SupabaseManager.shared.isConfigured,
                  let identityToken = credential.identityToken,
                  let idTokenString = String(data: identityToken, encoding: .utf8) else {
                authState = .denied
                return
            }

            authState = .unknown
            Task {
                do {
                    _ = try await SupabaseManager.shared.client.auth.signInWithIdToken(
                        credentials: .init(
                            provider: .apple,
                            idToken: idTokenString
                        )
                    )
                    await authorizeSupabaseSession()
                } catch {
                    print("Supabase Sign In error: \(error)")
                    currentUser = nil
                    authState = .denied
                }
            }

        case .failure:
            authState = .signedOut
        }
    }

    // MARK: - Supabase Authorization

    /// Membership comes from the authenticated user's own profile row. RLS
    /// permits that row only for active DDG team members.
    private func authorizeSupabaseSession() async {
        do {
            let session = try await SupabaseManager.shared.client.auth.session
            let profile: TeamProfileRow = try await SupabaseManager.shared.client
                .from(SupabaseManager.Table.teamProfiles)
                .select("hiker_id")
                .eq("id", value: session.user.id)
                .single()
                .execute()
                .value

            guard let member = DDGTeam.roster.first(where: { $0.id == profile.hikerId }) else {
                currentUser = nil
                authState = .denied
                return
            }

            userEmail = session.user.email ?? userEmail
            currentUser = member
            authState = .signedIn
        } catch {
            print("Supabase team authorization error: \(error)")
            currentUser = nil
            authState = .denied
        }
    }

    // MARK: - Keychain Helpers

    private func saveKeychain(key: String, value: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
        var addQuery = query
        addQuery[kSecValueData as String] = data
        SecItemAdd(addQuery as CFDictionary, nil)
    }

    private func readKeychain(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func clearKeychain() {
        for key in [emailKey, appleIDKey] {
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: keychainService,
                kSecAttrAccount as String: key,
            ]
            SecItemDelete(query as CFDictionary)
        }
    }

    // MARK: - Delegate (kept alive during request)

    private var _activeDelegate: SignInDelegate?
}

// MARK: - ASAuthorizationController Delegate

private class SignInDelegate: NSObject, ASAuthorizationControllerDelegate {
    let completion: (Result<ASAuthorization, Error>) -> Void

    init(completion: @escaping (Result<ASAuthorization, Error>) -> Void) {
        self.completion = completion
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        completion(.success(authorization))
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        completion(.failure(error))
    }
}
