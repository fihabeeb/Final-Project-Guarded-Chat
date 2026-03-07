// Friends list storage
// Structure: { userId: [friendId1, friendId2, ...] }
const friendsLists = new Map();

/**
 * Get a user's friends list
 * @param {string} userId - The user's ID
 * @returns {Array} Array of friend IDs
 */
export function getFriendsList(userId) {
  if (!friendsLists.has(userId)) {
    friendsLists.set(userId, []);
  }
  return friendsLists.get(userId);
}

/**
 * Add a friend to a user's friends list
 * @param {string} userId - The user's ID
 * @param {string} friendId - The friend's ID to add
 * @returns {boolean} True if added successfully, false if already exists
 */
export function addFriend(userId, friendId) {
  if (!friendsLists.has(userId)) {
    friendsLists.set(userId, []);
  }

  const friends = friendsLists.get(userId);

  // Check if friend already exists
  if (friends.includes(friendId)) {
    return false;
  }

  friends.push(friendId);
  return true;
}

/**
 * Remove a friend from a user's friends list
 * @param {string} userId - The user's ID
 * @param {string} friendId - The friend's ID to remove
 * @returns {boolean} True if removed successfully, false if not found
 */
export function removeFriend(userId, friendId) {
  if (!friendsLists.has(userId)) {
    return false;
  }

  const friends = friendsLists.get(userId);
  const index = friends.indexOf(friendId);

  if (index === -1) {
    return false;
  }

  friends.splice(index, 1);
  return true;
}

/**
 * Check if two users are friends
 * @param {string} userId - The user's ID
 * @param {string} friendId - The potential friend's ID
 * @returns {boolean} True if they are friends
 */
export function areFriends(userId, friendId) {
  if (!friendsLists.has(userId)) {
    return false;
  }

  return friendsLists.get(userId).includes(friendId);
}

/**
 * Get all friends lists (for debugging)
 * @returns {Map} The entire friends lists map
 */
export function getAllFriendsLists() {
  return friendsLists;
}

/**
 * Initialize default friends for testing
 */
export function initializeDefaultFriends() {
  // Alice's friends
  friendsLists.set('alice1', ['bob2', 'charlie3']);

  // Bob's friends
  friendsLists.set('bob2', ['alice1', 'dan4']);

  // Charlie's friends
  friendsLists.set('charlie3', ['alice1']);

  // Dan's friends
  friendsLists.set('dan4', ['bob2']);

  // Eve starts with no friends
  friendsLists.set('eve5', []);

  console.log('Initialized default friends lists');
}
