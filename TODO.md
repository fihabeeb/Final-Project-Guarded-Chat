# Todo

## Features

- **Settings panel**: UI exists but all toggles are non-functional (notifications, theme, font size, privacy)
- **Server-side persistence**: Friend requests, message queue, and pending key exchanges are all in-memory only — lost on server restart
- **Typing indicators**: Not implemented
- **Read receipts**: Not implemented

## Security

- **Passwords in localStorage**: Auto-login stores plaintext password in localStorage — XSS risk. Consider storing a session token instead
- **Rate limiting**: No rate limiting on login or registration endpoints

## Polish / Pre-submission

- Remove all `console.log` debug statements from client code
- Remove unused Firebase dependency from client
- Test full flow end-to-end: register → add friend → key exchange → encrypted message → P2P chat → video call

---

### Long-term considerations

- If person A unfriends person B, it should reflect on both sides. Requires a server-side queue for friend removal sync
