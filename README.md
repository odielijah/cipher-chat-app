# Cipher 🔒

> End-to-end encrypted messaging. The server stores only ciphertext — plaintext never leaves your device.

---

## What is Cipher?

Cipher is a secure, real-time messaging application built with React. It uses **End-to-End Encryption (E2EE)**, which means:

- Messages are **encrypted on your device** before being sent
- The server **never sees your actual messages** — only scrambled data
- Only the **intended recipient** can decrypt and read a message
- Even if the server were hacked, attackers would only find meaningless ciphertext

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        YOUR BROWSER                         │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  React UI    │───▶│  crypto.js   │───▶│   api.js     │   │
│  │  (Pages /    │    │  (Web Crypto │    │  (REST +     │   │
│  │   Components)│    │   API)       │    │  WebSocket)  │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  AuthContext │    │  Private Key │    │  JWT Tokens  │   │
│  │  (session    │    │  (memory     │    │  (session    │   │
│  │   state)     │    │   ONLY ✅)   │    │   storage)   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTPS / WSS only
                              │
┌─────────────────────────────────────────────────────────────┐
│                   WHISPERBOX SERVER                         │
│                                                             │
│   Stores ONLY:                                              │
│   • Encrypted ciphertext blobs      (cannot read ✅)        │
│   • Wrapped (encrypted) private keys (cannot unwrap ✅)     │
│   • RSA public keys                 (public by design ✅)   │
│   • User accounts & JWT tokens                              │
│                                                             │
│   NEVER sees: plaintext, raw private keys, passwords        │
└─────────────────────────────────────────────────────────────┘
```

---

## Encryption Flow (Step by Step)

### On Registration

```
User enters username + password
        │
        ▼
Generate RSA-OAEP 2048-bit keypair  ← happens in browser
        │
        ├──▶ Public Key  ──────────────────▶ Sent to server (stored)
        │
        └──▶ Private Key ──▶ Wrap with PBKDF2+AES-KW ──▶ Sent to server
                              (password-derived key)       (stored encrypted)
                              
Private key NEVER sent raw. Password NEVER sent to server.
```

### On Login

```
User enters password
        │
        ▼
Fetch wrapped_private_key + pbkdf2_salt from server
        │
        ▼
Re-derive wrapping key (PBKDF2: password + salt → AES-KW key)
        │
        ▼
Unwrap private key → lives in memory (JavaScript variable)
        │
        ▼
Tab closes → private key is gone. Must log in again to restore it.
```

### Sending a Message

```
You type: "Hello Bob"
        │
        ▼
1. Fetch Bob's public key from server
2. Generate random AES-GCM 256-bit key  ──▶ this is the "message key"
3. Generate random 96-bit IV (initialization vector)
4. Encrypt "Hello Bob" with AES-GCM key + IV  ──▶  ciphertext
5. Encrypt AES key with Bob's RSA public key   ──▶  encryptedKey
6. Encrypt AES key with YOUR RSA public key    ──▶  encryptedKeyForSelf
        │
        ▼
Send to server: { ciphertext, iv, encryptedKey, encryptedKeyForSelf }
Server stores this blob. It cannot read any of it.
```

### Receiving a Message

```
Server sends you: { ciphertext, iv, encryptedKey, encryptedKeyForSelf }
        │
        ▼
1. Decrypt encryptedKey using YOUR RSA private key  ──▶  AES key
2. Decrypt ciphertext using AES key + IV             ──▶  "Hello Bob" ✅
```

### Why Two Encrypted Keys?

```
encryptedKey        → encrypted for Bob   → Bob can read it
encryptedKeyForSelf → encrypted for Alice → Alice can read her OWN sent messages
```

Without `encryptedKeyForSelf`, the sender could never re-read what they sent.

---

## Key Management

### Public Key
- Generated fresh on registration
- Exported and stored on the server
- Anyone can access it (it's meant to be public)
- Used to encrypt messages FOR that user

### Private Key
- Generated on registration, **never sent to server in raw form**
- Immediately wrapped (encrypted) using a key derived from the user's password
- The **wrapped** version is stored on the server — safe because only the password can unwrap it
- On login, it's unwrapped and kept **in a JavaScript variable in memory**
- It is **never written to localStorage, sessionStorage, or IndexedDB**
- When the tab is closed, it's gone — this is intentional for security

### Password
- Never sent to the server
- Used locally via PBKDF2 (250,000 iterations, SHA-256) to derive an AES-KW key
- That derived key is used to wrap/unwrap the RSA private key

### Session Tokens (JWT)
- Access token: stored in memory, expires after 15 minutes
- Refresh token: stored in sessionStorage, used to get new access tokens
- On logout, refresh token is revoked on the server

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Encryption | Web Crypto API (built into the browser) |
| Real-time | WebSocket (native) |
| Styling | Pure CSS with CSS variables |
| API | REST + WebSocket (WhisperBox backend) |

---

## Project Structure

```
src/
├── lib/
│   ├── crypto.js        # All encryption logic (Web Crypto API)
│   └── api.js           # API client + WebSocket manager
├── context/
│   └── AuthContext.jsx  # Global auth + crypto session state
├── hooks/
│   └── useChat.js       # Chat state, WebSocket, message handling
├── pages/
│   ├── LoginPage.jsx    # Login form
│   ├── RegisterPage.jsx # Register form + key generation
│   └── ChatPage.jsx     # Main chat interface
├── components/
│   ├── Sidebar.jsx      # Conversations list + user search
│   ├── MessageList.jsx  # Decrypted message thread
│   └── MessageInput.jsx # Compose + send encrypted messages
├── App.jsx              # Routes + auth guard
└── index.css            # Global styles + theme
```

---

## Security Trade-offs

### What We Did Well ✅
- Private key never leaves the client in plaintext
- Password never sent to the server
- Server cannot read any message (verified by architecture)
- AES-GCM provides authenticated encryption (tamper detection built in)
- PBKDF2 with 250,000 iterations protects against brute-force on the wrapped key
- Access tokens are short-lived (15 minutes)
- HTTPS/WSS enforced for all communication

### Known Limitations ⚠️

**No Forward Secrecy**
If an attacker compromises your RSA private key in the future, they could decrypt all past messages (if they captured the ciphertext). True forward secrecy (like Signal's Double Ratchet) would require generating new keys per message.

**Key material lost on tab close**
The private key lives in memory. Closing the tab requires re-entering your password to restore it. This is intentional (security over convenience) but can feel disruptive.

**No multi-device support**
Because the private key is derived from your password and stored as a single blob, using a different device requires re-entering your password there too. There is no key sync mechanism.

**Password change breaks key access**
If the password changes, the wrapping key changes, but the stored wrapped private key was encrypted with the old wrapping key. This would require re-wrapping and re-uploading, which is not currently implemented.

**No replay attack protection (basic)**
The server does not enforce message ordering or timestamp validation on the client side. A determined attacker with server access could re-deliver old ciphertext blobs. (Bonus mitigation: AES-GCM with unique IVs per message means replaying doesn't help decrypt, but duplicate messages could appear in UI.)

**Trust in the server for public keys**
When you fetch Bob's public key, you trust the server to give you the real Bob's key. A compromised server could perform a key substitution attack (MITM). A future improvement would be key fingerprint verification out-of-band.

---

## How to Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/odielijah/cipher-chat-app.git
cd cipher-chat-app

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev

# 4. Open http://localhost:5173
```

No environment variables needed — the API base URL is `https://whisperbox.koyeb.app`.

---

## API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account (send public key + wrapped private key) |
| POST | `/auth/login` | Login (receive wrapped private key to unwrap locally) |
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/users/search?q=` | Search for users to message |
| GET | `/users/{id}/public-key` | Get a user's RSA public key |
| GET | `/conversations` | List all conversations |
| GET | `/conversations/{id}/messages` | Get message history (paginated) |
| POST | `/messages` | Send message (REST fallback if WS unavailable) |
| WS | `/ws?token=` | Real-time messaging via WebSocket |

---

## Encryption Algorithms Used

| Algorithm | Purpose | Key Size |
|---|---|---|
| RSA-OAEP | Encrypting the AES message key | 2048-bit |
| AES-GCM | Encrypting the actual message | 256-bit key, 96-bit IV |
| AES-KW | Wrapping (encrypting) the RSA private key | 256-bit |
| PBKDF2 | Deriving the AES-KW key from the user's password | 250,000 iterations, SHA-256 |

---
