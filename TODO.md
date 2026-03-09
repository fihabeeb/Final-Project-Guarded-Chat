# Todo

## Features

## Security

- **Passwords in localStorage**: Auto-login stores plaintext password in localStorage — XSS risk. Consider storing a session token instead
- **Rate limiting**: No rate limiting on login or registration endpoints

## Polish / Pre-submission

- Test full flow end-to-end: register → add friend → key exchange → encrypted message → P2P chat → video call

---

### Long-term considerations

- If person A unfriends person B, it should reflect on both sides. Requires a server-side queue for friend removal sync
