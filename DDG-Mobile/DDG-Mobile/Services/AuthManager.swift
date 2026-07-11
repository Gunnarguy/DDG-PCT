import Foundation
import AuthenticationServices
import SwiftUI
import Supabase

/// Manages Sign in with Apple authentication and maps to DDGTeam roster.
///
/// Flow:
/// 1. User taps "Sign in with Apple"
/// 2. ASAuthorizationController presents Apple sign-in sheet
/// 3. On success, we get email + user ID
/// 4. Check email against DDGTeam.allowedEmails
/// 5. If allowed → set currentUser, persist credential
/// 6. If not allowed → show "Access Denied" (team-only app)
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
                    if let member = DDGTeam.member(forEmail: email) {
                        manager.currentUser = member
                        manager.authState = .signedIn
                    } else {
                        manager.authState = .denied
                    }
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

            // Check team membership
            if let member = DDGTeam.member(forEmail: resolvedEmail) {
                currentUser = member
                authState = .signedIn

                // Asynchronously sign in to Supabase if configured
                if SupabaseManager.shared.isConfigured {
                    if let identityToken = credential.identityToken,
                       let idTokenString = String(data: identityToken, encoding: .utf8) {
                        Task {
                            do {
                                _ = try await SupabaseManager.shared.client.auth.signInWithIdToken(
                                    credentials: .init(
                                        provider: .apple,
                                        idToken: idTokenString
                                    )
                                )
                            } catch {
                                print("Supabase Sign In error: \(error)")
                            }
                        }
                    }
                }
            } else {
                authState = .denied
            }

        case .failure:
            authState = .signedOut
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
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
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
