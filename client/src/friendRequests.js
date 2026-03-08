import { socket } from './socketIO.js';
import { getMyPublicKeyJWK, deriveAndStoreSharedKey } from './encryption.js';

const friendRequestsModal = document.getElementById('friendRequestsModal');
const friendRequestsButton = document.getElementById('friendRequestsButton');
const closeFriendRequestsButton = document.getElementById('closeFriendRequestsButton');
const friendRequestsList = document.getElementById('friendRequestsList');
const friendRequestsBadge = document.getElementById('friendRequestsBadge');

let currentUserId = null;
let pendingRequests = [];

export function friendRequestsListeners() {
  // Open friend requests modal
  friendRequestsButton.addEventListener('click', () => {
    friendRequestsModal.classList.add('active');
    if (currentUserId) {
      socket.emit('getFriendRequests', currentUserId);
    }
  });

  // Close friend requests modal
  closeFriendRequestsButton.addEventListener('click', () => {
    closeFriendRequestsModal();
  });

  // Close when clicking outside
  friendRequestsModal.addEventListener('click', (e) => {
    if (e.target === friendRequestsModal) {
      closeFriendRequestsModal();
    }
  });

  // Listen for friend requests from server
  socket.on('friendRequests', (requests) => {
    console.log('Received friend requests:', requests);
    pendingRequests = requests;
    displayFriendRequests(requests);
    updateBadge(requests.length);
  });

  // Listen for new friend requests in real-time
  socket.on('newFriendRequest', (request) => {
    console.log('New friend request received:', request);
    pendingRequests.push(request);
    displayFriendRequests(pendingRequests);
    updateBadge(pendingRequests.length);

    // Show notification
    showNotification(`${request.fromUser.name} sent you a friend request!`);
  });

  // Listen for friend request accepted confirmation
  socket.on('friendRequestAccepted', (result) => {
    if (result.success) {
      console.log('Friend request accepted successfully');
    }
  });

  // Listen for when someone accepts your friend request
  socket.on('friendRequestAcceptedByOther', (data) => {
    console.log('Your friend request was accepted by:', data.user.name);
    showNotification(`${data.user.name} accepted your friend request!`);
  });

  // Listen for friend request rejected confirmation
  socket.on('friendRequestRejected', (result) => {
    if (result.success) {
      console.log('Friend request rejected');
    }
  });

  // Receive the other party's ECDH public key and derive the shared AES key
  socket.on('keyExchange', async ({ friendId, publicKey }) => {
    try {
      await deriveAndStoreSharedKey(friendId, publicKey);
      console.log(`[Encryption] Key exchange complete with ${friendId}`);
    } catch (e) {
      console.error('[Encryption] Key exchange failed:', e);
    }
  });
}

export function setCurrentUserId(userId) {
  currentUserId = userId;
}

function displayFriendRequests(requests) {
  if (requests.length === 0) {
    showEmptyState();
    return;
  }

  const requestsHTML = requests.map(request => {
    const timeAgo = getTimeAgo(request.timestamp);
    return `
      <div class="friend-request-item" data-request-from="${request.from}">
        <div class="friend-request-avatar">${request.fromUser.name[0].toUpperCase()}</div>
        <div class="friend-request-info">
          <div class="friend-request-name">${request.fromUser.name}</div>
          <div class="friend-request-time">${timeAgo}</div>
        </div>
        <div class="friend-request-actions">
          <button class="friend-request-accept" data-from-id="${request.from}">
            Accept
          </button>
          <button class="friend-request-reject" data-from-id="${request.from}">
            Reject
          </button>
        </div>
      </div>
    `;
  }).join('');

  friendRequestsList.innerHTML = requestsHTML;

  // Add event listeners to buttons
  friendRequestsList.querySelectorAll('.friend-request-accept').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const fromId = button.dataset.fromId;
      acceptFriendRequest(fromId);
    });
  });

  friendRequestsList.querySelectorAll('.friend-request-reject').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const fromId = button.dataset.fromId;
      rejectFriendRequest(fromId);
    });
  });
}

async function acceptFriendRequest(fromUserId) {
  if (!currentUserId) {
    console.error('No current user ID');
    return;
  }

  // Include our ECDH public key so the requester can derive the shared key
  const accepterPublicKey = await getMyPublicKeyJWK();
  socket.emit('acceptFriendRequest', {
    userId: currentUserId,
    fromUserId: fromUserId,
    accepterPublicKey
  });
}

function rejectFriendRequest(fromUserId) {
  if (!currentUserId) {
    console.error('No current user ID');
    return;
  }

  socket.emit('rejectFriendRequest', {
    userId: currentUserId,
    fromUserId: fromUserId
  });
}

function showEmptyState() {
  friendRequestsList.innerHTML = `
    <div class="friend-requests-empty">
      <svg viewBox="0 0 24 24" width="64" height="64">
        <path fill="currentColor" opacity="0.3" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
      <p>No pending friend requests</p>
    </div>
  `;
}

function updateBadge(count) {
  if (count > 0) {
    friendRequestsBadge.textContent = count;
    friendRequestsBadge.style.display = 'flex';
  } else {
    friendRequestsBadge.style.display = 'none';
  }
}

function closeFriendRequestsModal() {
  friendRequestsModal.classList.remove('active');
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return time.toLocaleDateString();
}

function showNotification(message) {
  // Simple alert for now - could be replaced with a toast notification
  if (Notification.permission === 'granted') {
    new Notification('Guarded Chat', { body: message });
  } else {
    console.log('Notification:', message);
  }
}
