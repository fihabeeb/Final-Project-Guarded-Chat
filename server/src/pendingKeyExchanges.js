// Queue for delivering ECDH public keys to users who were offline when a friend request was accepted.
// Structure: { userId: [{ friendId, publicKey }, ...] }
const pendingKeyExchanges = new Map();

export function queueKeyExchange(userId, friendId, publicKey) {
  if (!pendingKeyExchanges.has(userId)) {
    pendingKeyExchanges.set(userId, []);
  }
  pendingKeyExchanges.get(userId).push({ friendId, publicKey });
  console.log(`[KeyExchange] Queued for offline user ${userId} from ${friendId}`);
}

// Returns and clears all pending key exchanges for a user.
export function getPendingKeyExchanges(userId) {
  if (!pendingKeyExchanges.has(userId)) return [];
  const exchanges = pendingKeyExchanges.get(userId);
  pendingKeyExchanges.delete(userId);
  return exchanges;
}
