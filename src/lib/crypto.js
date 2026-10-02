// ============================================================
// crypto.js — ALL encryption/decryption logic lives here
//
// WHY THIS FILE EXISTS:
// The Web Crypto API (built into every browser) is what we use.
// We never use a third-party library for this — the browser's
// native crypto is faster, audited, and requires no install.
//
// THE TWO KEY CONCEPTS:
// 1. RSA-OAEP (asymmetric) — each user has a public + private key
//    - Public key: shared with everyone, used to LOCK a message for you
//    - Private key: only YOU have it, used to UNLOCK messages sent to you
//
// 2. AES-GCM (symmetric) — a one-time random key per message
//    - We don't encrypt messages directly with RSA (too slow/limited)
//    - Instead: generate a random AES key, encrypt the message with it,
//      then encrypt that AES key with RSA. Best of both worlds.
// ============================================================

const crypto = window.crypto.subtle;

// ─── HELPERS ────────────────────────────────────────────────

// Convert ArrayBuffer → base64 string (for sending over JSON)
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// Convert base64 string → ArrayBuffer (for using in crypto ops)
export function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Convert string → ArrayBuffer (for encrypting text)
function stringToBuffer(str) {
  return new TextEncoder().encode(str);
}

// Convert ArrayBuffer → string (after decrypting)
function bufferToString(buffer) {
  return new TextDecoder().decode(buffer);
}

// ─── RSA KEY GENERATION ─────────────────────────────────────
// Called ONCE when a user registers. Creates their identity keys.

export async function generateKeyPair() {
  // RSA-OAEP 2048-bit is the standard for key exchange.
  // We use SHA-256 as the hash function.
  const keyPair = await crypto.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // standard 65537
      hash: "SHA-256",
    },
    true, // extractable — we need to export and store them
    ["encrypt", "decrypt"],
  );
  return keyPair; // { publicKey, privateKey }
}

// Export public key as base64 to send to the server
export async function exportPublicKey(publicKey) {
  const exported = await crypto.exportKey("spki", publicKey);
  return bufferToBase64(exported);
}

// Import a base64 public key back into a usable CryptoKey object
// (Used when you fetch someone else's public key from the server)
export async function importPublicKey(base64Key) {
  const buffer = base64ToBuffer(base64Key);
  return crypto.importKey(
    "spki",
    buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"],
  );
}

// ─── PRIVATE KEY WRAPPING ───────────────────────────────────
// We NEVER store the private key in plain text (not even in IndexedDB).
// Instead, we encrypt it with a key derived from the user's password.
// This means: even if someone reads your storage, they can't get your key.
//
// The process: password + salt → PBKDF2 → AES-KW key → wraps private key

export async function generateSalt() {
  // 16 random bytes — used to make the same password produce different keys
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt.buffer);
}

async function deriveWrappingKey(password, saltBase64) {
  // Step 1: Import the raw password as a PBKDF2 key material
  const passwordBuffer = stringToBuffer(password);
  const keyMaterial = await crypto.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  // Step 2: Derive a strong AES-KW key from that password + salt
  // 600,000 iterations is the OWASP 2023 recommendation
  const salt = base64ToBuffer(saltBase64);
  return crypto.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 600_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

// Encrypt the private key using the password-derived key
export async function wrapPrivateKey(privateKey, password, saltBase64) {
  const wrappingKey = await deriveWrappingKey(password, saltBase64);
  const wrapped = await crypto.wrapKey(
    "pkcs8",
    privateKey,
    wrappingKey,
    "AES-KW",
  );
  return bufferToBase64(wrapped);
}

// Decrypt the private key using the password-derived key
// Called on login to restore the private key into memory
export async function unwrapPrivateKey(wrappedBase64, password, saltBase64) {
  const wrappingKey = await deriveWrappingKey(password, saltBase64);
  const wrappedBuffer = base64ToBuffer(wrappedBase64);
  return crypto.unwrapKey(
    "pkcs8",
    wrappedBuffer,
    wrappingKey,
    "AES-KW",
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"],
  );
}

// ─── MESSAGE ENCRYPTION ─────────────────────────────────────
// This is what happens every time you hit "send"

export async function encryptMessage(
  plaintext,
  recipientPublicKey,
  senderPublicKey,
) {
  // Step 1: Generate a fresh random AES-GCM key just for this message
  const aesKey = await crypto.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  // Step 2: Generate a random 96-bit IV (initialization vector)
  // IV is like a nonce — ensures the same plaintext encrypts differently each time
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Step 3: Encrypt the actual message with AES-GCM
  const ciphertext = await crypto.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    stringToBuffer(plaintext),
  );

  // Step 4: Export the raw AES key so we can encrypt it with RSA
  const rawAesKey = await crypto.exportKey("raw", aesKey);

  // Step 5: Encrypt the AES key with RECIPIENT's RSA public key
  // Only the recipient's private key can decrypt this
  const encryptedKey = await crypto.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawAesKey,
  );

  // Step 6: Encrypt the AES key with YOUR OWN RSA public key
  // This lets YOU read your own sent messages in conversation history
  const encryptedKeyForSelf = await crypto.encrypt(
    { name: "RSA-OAEP" },
    senderPublicKey,
    rawAesKey,
  );

  // Return everything as base64 — ready to send in the API payload
  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv.buffer),
    encryptedKey: bufferToBase64(encryptedKey),
    encryptedKeyForSelf: bufferToBase64(encryptedKeyForSelf),
  };
}

// ─── MESSAGE DECRYPTION ─────────────────────────────────────
// Called when you receive a message (or load history)

export async function decryptMessage(payload, privateKey, isSender = false) {
  // payload = { ciphertext, iv, encryptedKey, encryptedKeyForSelf }

  try {
    // Step 1: Decrypt the AES key using your RSA private key
    // If you're the sender, use encryptedKeyForSelf; if recipient, use encryptedKey
    const encryptedAesKey = isSender
      ? base64ToBuffer(payload.encryptedKeyForSelf)
      : base64ToBuffer(payload.encryptedKey);

    const rawAesKey = await crypto.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedAesKey,
    );

    // Step 2: Re-import the raw AES key
    const aesKey = await crypto.importKey(
      "raw",
      rawAesKey,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );

    // Step 3: Decrypt the ciphertext with AES-GCM
    const plaintext = await crypto.decrypt(
      { name: "AES-GCM", iv: base64ToBuffer(payload.iv) },
      aesKey,
      base64ToBuffer(payload.ciphertext),
    );

    return bufferToString(plaintext);
  } catch (err) {
    // Decryption failures should be caught gracefully — never crash the app
    console.error("Decryption failed:", err);
    return null; // UI will show "Unable to decrypt"
  }
}
