import { socket } from './socketIO.js';
import { addFriendToSidebar, getCurrentUserId, getFriendIds } from './sidebar.js';
import { getMyPublicKeyJWK } from './encryption.js';

const discoveryModal = document.getElementById('discoveryModal');
const discoveryButton = document.getElementById('discoverButton');
const closeDiscoveryButton = document.getElementById('closeDiscoveryButton');
const userSearchInput = document.getElementById('userSearchInput');
const searchResults = document.getElementById('searchResults');

let searchTimeout = null;

export function userDiscoveryListeners() {
  // Open discovery modal
  discoveryButton.addEventListener('click', () => {
    discoveryModal.classList.add('active');
    userSearchInput.focus();
  });

  // Close discovery modal
  closeDiscoveryButton.addEventListener('click', () => {
    closeDiscoveryModal();
  });

  // Close when clicking outside
  discoveryModal.addEventListener('click', (e) => {
    if (e.target === discoveryModal) {
      closeDiscoveryModal();
    }
  });

  // Search input handler with debounce
  userSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // If query is empty, show empty state
    if (query.length === 0) {
      showEmptyState();
      return;
    }

    // Show loading state
    showLoadingState();

    // Debounce search by 300ms
    searchTimeout = setTimeout(() => {
      searchUsers(query);
    }, 300);
  });

  // Listen for search results from server
  socket.on('userSearchResults', (results) => {
    displaySearchResults(results);
  });

  // Listen for friend request sent confirmation
  socket.on('friendRequestSent', (result) => {
    if (result.success) {
      alert('Friend request sent successfully!');
    } else {
      alert(`Failed to send friend request: ${result.message}`);
    }
  });
}

function searchUsers(query) {
  socket.emit('searchUsers', query);
}

function displaySearchResults(results) {
  const currentUserId = getCurrentUserId();
  const friendIds = getFriendIds();

  const filtered = results.filter(user =>
    user.id !== currentUserId && !friendIds.includes(user.id)
  );

  if (filtered.length === 0) {
    showNoResults();
    return;
  }

  results = filtered;

  const resultsHTML = results.map(user => `
    <div class="user-result-item" data-user-id="${user.id}">
      <div class="user-result-avatar">${user.name[0].toUpperCase()}</div>
      <div class="user-result-info">
        <div class="user-result-name">${user.name}</div>
        <div class="user-result-id">ID: ${user.id}</div>
      </div>
      <button class="user-result-action" data-user-id="${user.id}" data-user-name="${user.name}">
        Add Friend
      </button>
    </div>
  `).join('');

  searchResults.innerHTML = resultsHTML;

  // Add click handlers to chat buttons
  searchResults.querySelectorAll('.user-result-action').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const userId = button.dataset.userId;
      const userName = button.dataset.userName;
      startChatWithUser(userId, userName);
    });
  });
}

async function startChatWithUser(userId, userName) {
  const currentUserId = getCurrentUserId();

  if (!currentUserId) {
    console.error('User not logged in');
    return;
  }

  // Check if trying to add yourself
  if (userId === currentUserId) {
    alert("You can't add yourself as a friend!");
    return;
  }

  // Include our ECDH public key so the accepter can derive the shared key
  const senderPublicKey = await getMyPublicKeyJWK();
  socket.emit('sendFriendRequest', {
    fromUserId: currentUserId,
    toUserId: userId,
    senderPublicKey
  });

  // Close discovery modal
  closeDiscoveryModal();

  console.log(`Friend request sent to ${userName} (${userId})`);
}

function showEmptyState() {
  searchResults.innerHTML = `
    <div class="search-empty">
      <svg viewBox="0 0 24 24" width="64" height="64">
        <path fill="currentColor" opacity="0.3" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <p>Search for users to start chatting</p>
    </div>
  `;
}

function showLoadingState() {
  searchResults.innerHTML = `
    <div class="search-loading">
      Searching...
    </div>
  `;
}

function showNoResults() {
  searchResults.innerHTML = `
    <div class="search-no-results">
      <svg viewBox="0 0 24 24" width="64" height="64">
        <path fill="currentColor" opacity="0.3" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <p>No users found matching your search</p>
    </div>
  `;
}

function closeDiscoveryModal() {
  discoveryModal.classList.remove('active');
  userSearchInput.value = '';
  showEmptyState();
}
