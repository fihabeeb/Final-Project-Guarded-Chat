// Online users tracking
// Structure: { userId: socketId }
const onlineUsers = new Map();

// Reverse lookup: { socketId: userId }
const socketToUser = new Map();

/**
 * Mark a user as online
 * @param {string} userId - The user's ID
 * @param {string} socketId - The socket ID
 */
export function setUserOnline(userId, socketId) {
  onlineUsers.set(userId, socketId);
  socketToUser.set(socketId, userId);
  console.log(`User ${userId} is now online (socket: ${socketId})`);
}

/**
 * Mark a user as offline
 * @param {string} socketId - The socket ID
 * @returns {string|null} The userId that went offline, or null
 */
export function setUserOffline(socketId) {
  const userId = socketToUser.get(socketId);

  if (userId) {
    onlineUsers.delete(userId);
    socketToUser.delete(socketId);
    console.log(`User ${userId} is now offline`);
    return userId;
  }

  return null;
}

/**
 * Check if a user is online
 * @param {string} userId - The user's ID
 * @returns {boolean} True if user is online
 */
export function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

/**
 * Get a user's socket ID
 * @param {string} userId - The user's ID
 * @returns {string|null} The socket ID or null
 */
export function getUserSocketId(userId) {
  return onlineUsers.get(userId) || null;
}

/**
 * Get user ID from socket ID
 * @param {string} socketId - The socket ID
 * @returns {string|null} The user ID or null
 */
export function getUserIdFromSocket(socketId) {
  return socketToUser.get(socketId) || null;
}

/**
 * Get all online users
 * @returns {Array} Array of user IDs
 */
export function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

/**
 * Get online users count
 * @returns {number} Number of online users
 */
export function getOnlineUsersCount() {
  return onlineUsers.size;
}
