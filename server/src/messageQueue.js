// Message queue for offline users
// Structure: { recipientId: [{ from, fromName, message, timestamp }, ...] }
const messageQueues = new Map();

/**
 * Add a message to the queue for an offline user
 * @param {string} recipientId - The recipient's user ID
 * @param {string} senderId - The sender's user ID
 * @param {string} senderName - The sender's name
 * @param {string} message - The message content
 */
export function queueMessage(recipientId, senderId, senderName, message) {
  if (!messageQueues.has(recipientId)) {
    messageQueues.set(recipientId, []);
  }

  const queue = messageQueues.get(recipientId);
  queue.push({
    from: senderId,
    fromName: senderName,
    message: message,
    timestamp: new Date().toISOString()
  });

  console.log(`Message queued for ${recipientId} from ${senderName}: "${message}"`);
}

/**
 * Get all pending messages for a user
 * @param {string} userId - The user's ID
 * @returns {Array} Array of pending messages
 */
export function getPendingMessages(userId) {
  if (!messageQueues.has(userId)) {
    return [];
  }

  return messageQueues.get(userId);
}

/**
 * Clear all pending messages for a user after delivery
 * @param {string} userId - The user's ID
 * @returns {number} Number of messages cleared
 */
export function clearPendingMessages(userId) {
  if (!messageQueues.has(userId)) {
    return 0;
  }

  const count = messageQueues.get(userId).length;
  messageQueues.delete(userId);
  console.log(`Cleared ${count} pending messages for ${userId}`);
  return count;
}

/**
 * Get pending message count for a user
 * @param {string} userId - The user's ID
 * @returns {number} Number of pending messages
 */
export function getPendingMessageCount(userId) {
  if (!messageQueues.has(userId)) {
    return 0;
  }

  return messageQueues.get(userId).length;
}

/**
 * Get all message queues (for debugging)
 * @returns {Map} All message queues
 */
export function getAllMessageQueues() {
  return messageQueues;
}
