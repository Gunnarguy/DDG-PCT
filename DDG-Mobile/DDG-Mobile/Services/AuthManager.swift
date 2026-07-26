import Foundation
import AuthenticationServices
import CryptoKit
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
        case error(String)   // Session/profile verification could not complete
    }

    // MARK: - Keychain Keys

    private let keychainService = "com.ddg.mobile.auth"
    private let emailKey = "ddg_user_email"
    private let appleIDKey = "ddg_apple_user_id"
    private var pendingAppleNonce: String?

    // MARK: - Init

    private init() {
        restoreSession()
    }

    // MARK: - Sign In

    /// Initiate Sign in with Apple flow (programmatic fallback)
    func signIn() {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        prepareAppleSignInRequest(request)

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

    /// Configures every Apple authorization request with the hashed nonce that
    /// Supabase requires to verify the returned identity token.
    func prepareAppleSignInRequest(_ request: ASAuthorizationAppleIDRequest) {
        let rawNonce = Self.makeNonce()
        pendingAppleNonce = rawNonce
        request.requestedScopes = [.email]
        request.nonce = Self.sha256(rawNonce)
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
        guard let appleID = readKeychain(key: appleIDKey) else {
            authState = .signedOut
            return
        }
        let savedEmail = readKeychain(key: emailKey)

        // Verify the Apple credential is still valid
        let provider = ASAuthorizationAppleIDProvider()
        provider.getCredentialState(forUserID: appleID) { [weak self] state, _ in
            guard let manager = self else { return }
            Task { @MainActor in
                switch state {
                case .authorized:
                    manager.appleUserID = appleID
                    manager.userEmail = savedEmail
                    guard SupabaseManager.shared.isConfigured else {
                        manager.authState = .error("Supabase is not configured on this build.")
                        return
                    }
                    await manager.authorizeStoredSupabaseSession()
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
                pendingAppleNonce = nil
                authState = .signedOut
                return
            }

            guard SupabaseManager.shared.isConfigured,
                  let rawNonce = pendingAppleNonce,
                  let identityToken = credential.identityToken,
                  let idTokenString = String(data: identityToken, encoding: .utf8) else {
                pendingAppleNonce = nil
                authState = .error("Apple did not provide a usable identity token.")
                return
            }
            pendingAppleNonce = nil

            let userID = credential.user
            // Apple commonly provides email only on the first authorization.
            // It is display metadata—not an authorization requirement. The
            // signed identity token and RLS-protected Supabase profile determine
            // access.
            let availableEmail = credential.email ?? readKeychain(key: emailKey)

            appleUserID = userID
            userEmail = availableEmail

            // Persist to keychain
            saveKeychain(key: appleIDKey, value: userID)
            if let availableEmail {
                saveKeychain(key: emailKey, value: availableEmail)
            }

            authState = .unknown
            Task {
                do {
                    let session = try await SupabaseManager.shared.client.auth.signInWithIdToken(
                        credentials: .init(
                            provider: .apple,
                            idToken: idTokenString,
                            nonce: rawNonce
                        )
                    )
                    await authorizeSupabaseSession(session)
                } catch {
                    print("Supabase Sign In error: \(error)")
                    currentUser = nil
                    authState = .error(
                        "Sign in succeeded with Apple, but the Supabase session could not be created."
                    )
                }
            }

        case .failure:
            pendingAppleNonce = nil
            authState = .signedOut
        }
    }

    private static func makeNonce(length: Int = 32) -> String {
        let characters = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var generator = SystemRandomNumberGenerator()
        return String((0..<length).compactMap { _ in
            characters.randomElement(using: &generator)
        })
    }

    private static func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8))
            .map { String(format: "%02x", $0) }
            .joined()
    }

    // MARK: - Supabase Authorization

    /// Restores a valid Supabase session. A missing/expired session is a
    /// signed-out state—not evidence that the user failed team authorization.
    private func authorizeStoredSupabaseSession() async {
        do {
            let session = try await SupabaseManager.shared.client.auth.session
            await authorizeSupabaseSession(session)
        } catch AuthError.sessionMissing {
            print("Supabase session is missing; returning to sign in.")
            currentUser = nil
            authState = .signedOut
        } catch {
            print("Supabase session restore error: \(error)")
            currentUser = nil
            authState = .error(
                "Your saved session could not be verified. Check connectivity and try again."
            )
        }
    }

    /// Membership comes from the authenticated user's own profile row. RLS
    /// permits that row only for active DDG team members.
    private func authorizeSupabaseSession(_ session: Session) async {
        guard !session.isExpired else {
            currentUser = nil
            authState = .signedOut
            return
        }

        do {
            let profiles: [TeamProfileRow] = try await SupabaseManager.shared.client
                .from(SupabaseManager.Table.teamProfiles)
                .select("hiker_id")
                .eq("id", value: session.user.id)
                .limit(1)
                .execute()
                .value

            guard let profile = profiles.first else {
                // A valid authenticated session with no RLS-visible team profile
                // is the only condition that means access is actually denied.
                currentUser = nil
                authState = .denied
                return
            }

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
            authState = .error(
                "Signed in, but the DDG team profile could not be verified. Check connectivity and retry."
            )
        }
    }

    func retryAuthorization() {
        guard SupabaseManager.shared.isConfigured else {
            authState = .error("Supabase is not configured on this build.")
            return
        }

        authState = .unknown
        Task {
            await authorizeStoredSupabaseSession()
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
