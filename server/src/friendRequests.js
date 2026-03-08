// Friend requests storage
// Structure: { userId: [{ from: senderId, timestamp: Date }, ...] }
const friendRequests = new Map();

// Pending friend additions (for when requester is offline)
// Structure: { userId: [friendId1, friendId2, ...] }
const pendingFriendAdditions = new Map();

/**
 * Send a friend request
 * @param {string} fromUserId - The sender's ID
 * @param {string} toUserId - The recipient's ID
 * @returns {object} Result with success status and message
 */
export function sendFriendRequest(fromUserId, toUserId, senderPublicKey) {
  if (fromUserId === toUserId) {
    return { success: false, message: "Cannot send friend request to yourself" };
  }

  // Get recipient's requests
  if (!friendRequests.has(toUserId)) {
    friendRequests.set(toUserId, []);
  }

  const requests = friendRequests.get(toUserId);

  // Check if request already exists
  const existingRequest = requests.find(req => req.from === fromUserId);
  if (existingRequest) {
    return { success: false, message: "Friend request already sent" };
  }

  // Add the request, storing the sender's ECDH public key for key exchange on acceptance
  requests.push({
    from: fromUserId,
    timestamp: new Date().toISOString(),
    senderPublicKey: senderPublicKey || null
  });

  console.log(`Friend request sent: ${fromUserId} -> ${toUserId}`);
  return { success: true, message: "Friend request sent" };
}

/**
 * Get all pending friend requests for a user
 * @param {string} userId - The user's ID
 * @returns {Array} Array of friend requests
 */
export function getFriendRequests(userId) {
  if (!friendRequests.has(userId)) {
    return [];
  }
  return friendRequests.get(userId);
}

/**
 * Accept a friend request
 * @param {string} userId - The user accepting the request
 * @param {string} fromUserId - The user who sent the request
 * @returns {object} Result with success status
 */
export function acceptFriendRequest(userId, fromUserId) {
  if (!friendRequests.has(userId)) {
    return { success: false, message: "No friend requests found" };
  }

  const requests = friendRequests.get(userId);
  const requestIndex = requests.findIndex(req => req.from === fromUserId);

  if (requestIndex === -1) {
    return { success: false, message: "Friend request not found" };
  }

  // Capture public key before removing the request
  const senderPublicKey = requests[requestIndex].senderPublicKey;
  requests.splice(requestIndex, 1);

  console.log(`Friend request accepted: ${userId} accepted ${fromUserId}`);
  return { success: true, fromUserId, senderPublicKey };
}

/**
 * Reject a friend request
 * @param {string} userId - The user rejecting the request
 * @param {string} fromUserId - The user who sent the request
 * @returns {object} Result with success status
 */
export function rejectFriendRequest(userId, fromUserId) {
  if (!friendRequests.has(userId)) {
    return { success: false, message: "No friend requests found" };
  }

  const requests = friendRequests.get(userId);
  const requestIndex = requests.findIndex(req => req.from === fromUserId);

  if (requestIndex === -1) {
    return { success: false, message: "Friend request not found" };
  }

  // Remove the request
  requests.splice(requestIndex, 1);

  console.log(`Friend request rejected: ${userId} rejected ${fromUserId}`);
  return { success: true };
}

/**
 * Add a pending friend addition (for when user is offline)
 * @param {string} userId - The user who will receive the friend
 * @param {string} friendId - The friend to add
 */
export function addPendingFriendAddition(userId, friendId) {
  if (!pendingFriendAdditions.has(userId)) {
    pendingFriendAdditions.set(userId, []);
  }

  const pending = pendingFriendAdditions.get(userId);

  // Only add if not already pending
  if (!pending.includes(friendId)) {
    pending.push(friendId);
    console.log(`Pending friend addition: ${friendId} will be added to ${userId} when they come online`);
  }
}

/**
 * Get and clear pending friend additions for a user
 * @param {string} userId - The user's ID
 * @returns {Array} Array of friend IDs to add
 */
export function getPendingFriendAdditions(userId) {
  if (!pendingFriendAdditions.has(userId)) {
    return [];
  }

  const pending = pendingFriendAdditions.get(userId);
  // Clear the pending list
  pendingFriendAdditions.set(userId, []);

  return pending;
}

/**
 * Check if a friend request exists
 * @param {string} fromUserId - The sender's ID
 * @param {string} toUserId - The recipient's ID
 * @returns {boolean} True if request exists
 */
export function hasFriendRequest(fromUserId, toUserId) {
  if (!friendRequests.has(toUserId)) {
    return false;
  }

  const requests = friendRequests.get(toUserId);
  return requests.some(req => req.from === fromUserId);
}

/**
 * Get all friend requests (for debugging)
 * @returns {Map} All friend requests
 */
export function getAllFriendRequests() {
  return friendRequests;
}

/**
 * Get all pending friend additions (for debugging)
 * @returns {Map} All pending friend additions
 */
export function getAllPendingAdditions() {
  return pendingFriendAdditions;
}
