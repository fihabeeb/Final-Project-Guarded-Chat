# Guarded Chat — Manual Testing Table

> **Application:** Guarded Chat (E2E Encrypted Real-Time Chat)
> **Testing Type:** Manual / Functional
> **Date:** 2026-03-23
> **Tester:** _______________
> **Environment:** _______________

---

## Legend

| Symbol | Meaning |
|--------|---------|
| PASS | Test passed as expected |
| FAIL | Test did not behave as expected |
| N/T | Not yet tested |

---

## 1. User Registration

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| R-01 | Successful registration | Enter a unique username (3+ chars), name, and password (6+ chars), click Register | Account created, user logged into main chat UI | PASS | |
| R-02 | Username too short | Enter a 2-character username and attempt to register | Error message: username must be at least 3 characters | PASS | |
| R-03 | Password too short | Enter a 5-character password and attempt to register | Error message: password must be at least 6 characters | PASS | |
| R-04 | Duplicate username | Attempt to register with an already-taken username | Error message: username already taken | PASS | |
| R-05 | Empty fields | Submit registration form with empty fields | Appropriate validation error shown | PASS | |

---

## 2. User Login

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| L-01 | Successful login | Enter valid credentials, click Login | User authenticated, redirected to main chat UI | PASS | |
| L-02 | Wrong password | Enter correct username, incorrect password | Error message displayed, access denied | PASS | |
| L-03 | Non-existent user | Enter a username that does not exist | Error message displayed, access denied | PASS | |
| L-04 | Auto-login on page reload | Log in, close tab, reopen application | User automatically logged in from localStorage | PASS | |
| L-05 | Empty login fields | Submit login form with empty fields | Appropriate validation error shown | PASS | |

---

## 3. End-to-End Encryption

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| E-01 | Key pair generation | Register a new user and inspect localStorage | ECDH P-256 key pair stored under user's key in localStorage | PASS | |
| E-02 | Key persistence across sessions | Log out and back in | Same ECDH key pair reloaded from localStorage | PASS | |
| E-03 | Message encryption before send | Send a message and inspect network traffic (browser DevTools) | Ciphertext visible in Socket.io event payload, not plaintext | PASS | |
| E-04 | Message decryption on receive | Send a message between two users | Receiving user sees readable plaintext in chat UI | PASS | |
| E-05 | Encryption key stored per-friend | Accept a friend request and inspect localStorage | AES-GCM derived key stored for that specific friend | PASS | |
| E-06 | Server never sees plaintext | Monitor server logs while messages are exchanged | Only ciphertext visible in server logs/database | PASS | |

---

## 4. Friend System

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| F-01 | Send friend request | Search for a user and send a friend request | Request appears in recipient's friend requests modal with badge | PASS | |
| F-02 | Accept friend request | Open friend requests modal, accept a pending request | Both users added to each other's friends list; ECDH key exchanged | PASS | |
| F-03 | Reject friend request | Open friend requests modal, reject a pending request | Request removed; sender notified of rejection | FAIL | |
| F-04 | Friend appears in sidebar | Accept a friend request | Accepted friend visible in the sidebar friends list | PASS | |
| F-05 | Offline friend addition | Send/accept friend request while one user is offline | Friend list correctly restored when offline user reconnects | PASS | |
| F-06 | Duplicate friend request | Send a friend request to an already-friended user | Application prevents duplicate request / shows appropriate message | PASS | |
| F-07 | Friend request to self | Search own username and attempt to send request | Application prevents self-request | PASS | |
| F-08 | Real-time request notification | Send friend request while recipient is online | Recipient sees real-time badge/notification without page refresh | PASS | |

---

## 5. User Search

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| S-01 | Search by username | Open user discovery modal, type a known username | Matching user(s) appear in results | PASS | |
| S-02 | Search by name | Open user discovery modal, type a known display name | Matching user(s) appear in results | PASS | |
| S-03 | Case-insensitive search | Search using uppercase for a lowercase username | Correct results returned regardless of case | PASS | |
| S-04 | No results found | Search for a non-existent username | Empty state or "no results" message shown | PASS | |
| S-05 | Debounce on search input | Type rapidly in search box | Search request fires after pause, not on every keystroke | PASS | |

---

## 6. Messaging (Socket.io)

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| M-01 | Send message to online friend | Open chat with an online friend, send a message | Message delivered and displayed in real time on both sides | PASS | |
| M-02 | Receive message | Have a friend send a message while chat is open | Message appears in chat without refresh | PASS | |
| M-03 | Message timestamp | Send a message and view chat history | Each message displays a correct timestamp | PASS | |
| M-04 | Sent receipt | Send a message to an online friend | Sender sees single tick ✓ (sent) indicator | PASS | |
| M-05 | Read receipt | Recipient opens and views the message | Sender's tick updates to double tick ✓✓ (read) | PASS | |
| M-06 | Read receipt toggled off | Disable read receipts in settings, send message | No read receipt sent to the sender | PASS | |
| M-07 | Enter-to-send enabled | Enable enter-to-send in settings, press Enter | Message submitted on Enter keypress | PASS | |
| M-08 | Enter-to-send disabled | Disable enter-to-send in settings, press Enter | Enter creates a new line, does not submit | FAIL | Enter does not submit, but also does not create a new line |

---

## 7. Offline Message Delivery

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| O-01 | Message queued when offline | Send a message to an offline friend | Server acknowledges message queued | PASS | |
| O-02 | Pending badge shown | Send a message to an offline friend | Pending badge appears on that contact in the sidebar | FAIL | No badge appears on the contact in the sidebar; sidebar needs work |
| O-03 | Messages delivered on reconnect | Recipient comes online after messages were queued | All queued messages delivered to recipient upon login | PASS | |
| O-04 | Queue cleared after delivery | Recipient receives queued messages | Message queue cleared from the database after delivery | PASS | |
| O-05 | Multiple queued messages | Send several messages while recipient is offline | All messages delivered in correct order on reconnect | PASS | |

---

## 8. Typing Indicators

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| T-01 | Typing indicator shown | Start typing in message input | Friend sees "User is typing..." indicator | PASS | |
| T-02 | Typing indicator stops | Stop typing for 2 seconds | Typing indicator disappears after 2-second timeout | PASS | |
| T-03 | Typing indicator on send | Send the message | Typing indicator immediately disappears on send | PASS | |

---

## 9. WebRTC P2P Connection

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| W-01 | P2P connection established | Open chat with an online friend (both on same/different networks) | WebRTC data channel established; friend status shows "P2P Connected" | PASS | |
| W-02 | P2P messaging | Send a message over an established P2P connection | Message sent via data channel, bypassing server | PASS | |
| W-03 | ICE candidate exchange | Observe WebRTC connection setup | ICE candidates exchanged correctly; connection not stuck | PASS | |
| W-04 | Fallback to Socket.io | Simulate failed P2P connection | Messaging falls back to server-relayed Socket.io | PASS | |
| W-05 | Multiple P2P connections | Open chats with two different online friends | Two simultaneous P2P data channels operational | PASS | |

---

## 10. Video Calling

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| V-01 | Initiate video call | Open a chat with an online friend, click video call button | Outgoing call modal shown to caller; incoming call modal shown to recipient | PASS | |
| V-02 | Accept video call | Recipient clicks Accept in incoming call modal | Video call established; local and remote video streams displayed | PASS | |
| V-03 | Decline video call | Recipient clicks Decline in incoming call modal | Call cancelled; caller notified of declined call | PASS | |
| V-04 | Local video preview | Accept or initiate a video call | Caller's own video shows in local preview | PASS | |
| V-05 | Remote video stream | Both users in active video call | Both users see each other's video stream | PASS | |
| V-06 | Mute microphone | Click mic toggle during a call | Mic muted; other party no longer hears audio | PASS | |
| V-07 | Toggle camera | Click camera toggle during a call | Video stream paused/resumed for other party | PASS | |
| V-08 | End call | Click end call button | Call terminated; streams cleaned up; UI returns to chat | PASS | |
| V-09 | Call without open chat | Attempt to initiate a call without opening a chat first | Error message: must open a chat before initiating a call | PASS | |
| V-10 | Call fails / modal closes | Simulate video call failure (deny camera permission) | Video modal closes; user returned to chat UI | PASS | |

---

## 11. User Settings

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| ST-01 | Switch to dark theme | Open settings, select Dark theme | UI switches to dark colour scheme | PASS | |
| ST-02 | Switch to light theme | Open settings, select Light theme | UI switches to light colour scheme | PASS | |
| ST-03 | System theme | Open settings, select System theme | UI follows OS dark/light preference | PASS | |
| ST-04 | Font size change | Change font size in settings (small/medium/large) | Chat text resizes accordingly | PASS | |
| ST-05 | Settings persist on reload | Change settings, reload the page | Settings are restored from localStorage | PASS | |
| ST-06 | Notifications toggle | Enable browser notifications | Browser prompts for notification permission; notifications appear for new messages | PASS | |
| ST-07 | Sound toggle | Enable/disable message sound | Sound plays/stops on new message receipt | PASS | |

---

## 12. Chat History

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| CH-01 | Chat history persists | Send messages, reload page, reopen chat | Previous messages still visible | PASS | |
| CH-02 | History loads on chat open | Click on a friend in the sidebar | Previous chat messages load immediately from localStorage | PASS | |
| CH-03 | History per contact | Open different friend chats | Each chat shows only that contact's messages | PASS | |
| CH-04 | Timestamps accurate | View chat history | Timestamps displayed per message are correct | PASS | |

---

## 13. Friends List & Status

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| FL-01 | Friends list populated on login | Log in with a user who has friends | Friends list restored and displayed in sidebar | PASS | |
| FL-02 | Online status | A friend comes online | Friend's status updates to "Online" in sidebar | PASS | |
| FL-03 | Offline status | A friend disconnects | Friend's status updates to "Offline" in sidebar | PASS | |
| FL-04 | P2P status | P2P data channel established with a friend | Friend's status updates to "P2P Connected" in sidebar | PASS | |
| FL-05 | Select friend opens chat | Click on a friend in the sidebar | Chat window opens for that friend | PASS | |

---

## 14. Security & Edge Cases

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| SEC-01 | Password not stored in plaintext | Inspect database `users` table | Only bcrypt hash stored, never plaintext password | PASS | |
| SEC-02 | Message not stored in plaintext | Inspect database `message_queue` table | Only ciphertext stored in queue | PASS | |
| SEC-03 | Send message without encryption key | Clear encryption key from localStorage, attempt to send | Message fails gracefully with an error, not sent in plaintext | PASS | |
| SEC-04 | Unauthorised socket event | Attempt to emit a restricted Socket.io event without authentication | Server rejects or ignores event | PASS | |
| SEC-05 | Invalid login JWT/session replay | Manually send a login-approved event with wrong data | Application does not accept spoofed auth | PASS | |

---

## Summary

| Category | Total Tests | PASS | FAIL | N/T |
|----------|------------|------|------|-----|
| Registration | 5 | 5 | 0 | 0 |
| Login | 5 | 5 | 0 | 0 |
| Encryption | 6 | 6 | 0 | 0 |
| Friend System | 8 | 7 | 1 | 0 |
| User Search | 5 | 5 | 0 | 0 |
| Messaging | 8 | 7 | 1 | 0 |
| Offline Delivery | 5 | 4 | 1 | 0 |
| Typing Indicators | 3 | 3 | 0 | 0 |
| WebRTC P2P | 5 | 5 | 0 | 0 |
| Video Calling | 10 | 10 | 0 | 0 |
| Settings | 7 | 7 | 0 | 0 |
| Chat History | 4 | 4 | 0 | 0 |
| Friends List | 5 | 5 | 0 | 0 |
| Security | 5 | 5 | 0 | 0 |
| **TOTAL** | **81** | **78** | **3** | **0** |
