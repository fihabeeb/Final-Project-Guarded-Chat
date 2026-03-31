# Guarded Chat

A real-time, end-to-end encrypted chat application built with WebRTC, Socket.io, and the Web Crypto API. Messages are encrypted on the sender's device before transmission — the server never sees plaintext.

## Features

- **End-to-end encryption** — ECDH (P-256) key exchange + AES-GCM-256 per-message encryption
- **P2P messaging** — WebRTC data channel; messages bypass the server once connected
- **Video calling** — integrated video/audio over the same peer connection
- **Friend system** — user discovery, friend requests, real-time notifications
- **Offline delivery** — messages and key exchanges queued for offline users and delivered on next login
- **Typing indicators & read receipts**
- **Persistent chat history** — stored locally in the browser
- **Account management** — change display name (propagates to online friends in real time) and change password
- **Settings** — theme (dark/light), font size, notifications, sound, read receipts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Client | Vanilla JS (ES modules), Vite |
| Realtime | Socket.io 4 |
| Server | Node.js, Express |
| Database | PostgreSQL 17 |
| Crypto | Web Crypto API (browser-native) |
| Auth | bcrypt (12 rounds) |
| Infrastructure | Docker Compose |

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run with Docker

```bash
git clone https://github.com/fihabeeb/Final-Project-Alpha.git
cd Final-Project-Alpha
docker compose up --build
```

Then open **http://localhost:5173** in your browser.

### Run locally (without Docker)

**1. Start a PostgreSQL instance** and create a database named `guardedchat`.

**2. Configure environment variables:**

```bash
cp .env.example .env
# Edit .env with your database connection string
```

**3. Start the server:**

```bash
cd server
npm install
npm run dev
```

**4. Start the client:**

```bash
cd client
npm install
npm run dev
```

Client runs on **http://localhost:5173**, server on **http://localhost:1111**.

## How the Encryption Works

1. On first load, each client generates an ECDH P-256 key pair stored in `localStorage`
2. When a friend request is sent, the sender's public key is attached
3. When the request is accepted, the accepter's public key is returned
4. Both sides independently derive the same AES-256-GCM shared key via ECDH — the server never sees the private keys or the derived key
5. Every message is encrypted with a random 12-byte IV before sending and decrypted immediately on receipt

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── main.js               # Entry point
│   │   ├── encryption.js         # ECDH + AES-GCM
│   │   ├── webrtc.js             # RTCPeerConnection, data channel, video
│   │   ├── videoCall.js          # Video call UI and signalling
│   │   ├── chatManager.js        # Message send/receive, typing, read receipts
│   │   ├── sidebar.js            # Friends list
│   │   ├── friendRequests.js     # Friend request UI and key exchange
│   │   ├── userDiscovery.js      # User search
│   │   ├── login.js              # Auth UI
│   │   └── appSettings.js        # User preferences and account management
│   └── index.html
├── server/
│   └── src/
│       ├── index.js              # Entry point
│       ├── RTCHandler.js         # All socket event handlers
│       ├── auth.js               # Registration, login, bcrypt, name/password updates
│       ├── friendsList.js        # In-memory friends map
│       ├── friendRequests.js     # DB-backed friend requests + key exchange
│       ├── messageQueue.js       # Offline message queue
│       ├── pendingKeyExchanges.js
│       └── db.js                 # PostgreSQL pool + schema init
├── compose.yaml
└── .env.example
```

## Known Limitations

- No TURN server configured — P2P requires STUN-compatible NAT traversal. Video calls may not work across all network configurations.
- Friends list is in-memory on the server and restored from the client on login. A server restart requires users to reload.
- Auto-login stores credentials in `localStorage` — not recommended for production deployments.
