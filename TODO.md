# Todo

## Bug Fixes

- **WebRTC variable scope** (`client/src/webrtc.js`): `localStream`, `isInCall`, and `isMuted` are used but never declared at module level — video calls will crash
- **Missing socket import** (`client/src/videoCall.js`): `socket` is used on lines 70 & 88 but never imported — WebRTC signaling won't work
- **appSettings.js**: References `loggedIn` and `appContainer` which are undefined — settings panel will error
- **Debug logs**: `chatHistoryHandler.js` has leftover debug `console.log` statements — clean up before submission
- **Hardcoded call ID**: `peerConnectionId.js` has a test call ID of `555` hardcoded

## Features

- **Settings panel**: UI exists but all toggles are non-functional (notifications, theme, font size, privacy)
- **Server-side persistence**: Friends lists, friend requests, message queue, and pending key exchanges are all in-memory only — lost on server restart. Consider persisting to PostgreSQL
- **Typing indicators**: Not implemented
- **Read receipts**: Not implemented

## Security

- **Passwords in localStorage**: Auto-login stores plaintext password in localStorage — XSS risk. Consider storing a session token instead
- **Rate limiting**: No rate limiting on login or registration endpoints

## Polish / Pre-submission

- Remove all `console.log` debug statements from client code
- Remove unused Firebase dependency from client
- Test full flow end-to-end: register → add friend → key exchange → encrypted message → video call

---

### Long-term considerations

- If person A unfriends person B, it should reflect on both sides. Requires a server-side queue for friend removal sync
