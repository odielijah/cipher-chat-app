// ============================================================
// AuthContext.jsx — Global state for auth + crypto session
//
// WHY A CONTEXT:
// The private key needs to be accessible from anywhere in the app
// (to decrypt messages, send messages, etc.) but MUST stay in memory only.
// React Context is perfect for this — it lives in JS memory, never touches
// localStorage or sessionStorage, and is cleared when the tab closes.
//
// WHAT'S STORED HERE:
// - currentUser: user profile (id, username, display_name)
// - privateKey: CryptoKey object — the most sensitive piece of data
// - publicKey: CryptoKey object — needed to encrypt sent messages for self
// - isLoading: whether we're restoring session on page load
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as api from "./api";
import {
  generateKeyPair,
  exportPublicKey,
  generateSalt,
  wrapPrivateKey,
  unwrapPrivateKey,
  importPublicKey,
} from "./crypto";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [privateKey, setPrivateKey] = useState(null); // CryptoKey — never serialized
  const [publicKey, setPublicKey] = useState(null); // CryptoKey — for encrypting sent msgs
  const [isLoading, setIsLoading] = useState(true);

  // On mount: if there's a refresh token in sessionStorage,
  // we can restore the access token — but we still need the password
  // to unwrap the private key. So we restore user profile but mark
  // crypto as "needs password" (handled in the UI).
  useEffect(() => {
    async function restoreSession() {
      if (!api.hasSession()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await api.getMe();
        setCurrentUser(me);
        // privateKey is NOT restored here — user must log in again to provide password
        // This is intentional: private key never persists between sessions
      } catch {
        api.clearTokens();
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const register = useCallback(async ({ username, display_name, password }) => {
    // Generate keys entirely on client before touching the server
    const keyPair = await generateKeyPair();
    const salt = await generateSalt();

    const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
    const wrappedPrivateKeyBase64 = await wrapPrivateKey(
      keyPair.privateKey,
      password,
      salt,
    );

    const data = await api.register({
      username,
      display_name,
      password,
      public_key: publicKeyBase64,
      wrapped_private_key: wrappedPrivateKeyBase64,
      pbkdf2_salt: salt,
    });

    // Keep keys in memory
    setPrivateKey(keyPair.privateKey);
    setPublicKey(keyPair.publicKey);
    setCurrentUser(data.user);
    return data;
  }, []);

  const login = useCallback(async ({ username, password }) => {
    const data = await api.login({ username, password });
    // Unwrap private key using password — this is the critical step
    const restoredPrivateKey = await unwrapPrivateKey(
      data.user.wrapped_private_key,
      password,
      data.user.pbkdf2_salt,
    );
    const restoredPublicKey = await importPublicKey(data.user.public_key);

    setPrivateKey(restoredPrivateKey);
    setPublicKey(restoredPublicKey);
    setCurrentUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setCurrentUser(null);
      setPrivateKey(null);
      setPublicKey(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        privateKey,
        publicKey,
        isLoading,
        isAuthenticated: !!currentUser && !!privateKey,
        needsPassword: !!currentUser && !privateKey, // session restored but no crypto
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
