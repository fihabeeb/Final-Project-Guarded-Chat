import { changeChatter } from "./chatHistoryHandler.js";
import { socket } from "./socketIO.js";
import { setCurrentChatPartner } from "./chatManager.js";

const sidebar = document.querySelector('.sidebar-content');
let currentUserId = null;
let friendsList = [];

export function sidebarListeners() {
    // Listen for friends list from server
    socket.on('friendsList', (friends) => {
        console.log('Received friends list:', friends);
        friendsList = friends;
        renderFriendsList(friends);
    });

    // Handle contact clicks
    sidebar.addEventListener('click', (e) => {
        const item = e.target.closest('.contact-item');
        if (!item) return;

        const contactName = item.dataset.contact;
        const contactId = item.dataset.contactId;

        // Update chat header
        document.querySelector('.chat-info h3').textContent = contactName;
        document.querySelector('.chat-avatar').textContent = contactName[0];

        // Load chat history first, then set current partner so pending messages appear after history
        const friend = friendsList.find(f => f.id === contactId);
        if (friend) {
            changeChatter(friend);
        }

        // Set current chat partner in chat manager (renders pending messages after history)
        setCurrentChatPartner(contactId, contactName);

        // Notify server that user wants to start chat (for WebRTC setup)
        if (currentUserId) {
            socket.emit('start chat', {
                fromUserId: currentUserId,
                toUserId: contactId
            });
        }
    });
}

export function loadFriendsList(userId) {
    console.log('Loading friends list for user:', userId);
    currentUserId = userId;
    socket.emit('getFriendsList', userId);
}

export function renderFriendsList(friends) {
    // Clear existing contacts
    sidebar.innerHTML = '';

    if (friends.length === 0) {
        sidebar.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #8696a0; font-size: 14px;">
                No friends yet. Use the search icon to discover users!
            </div>
        `;
        return;
    }

    friends.forEach(friend => {
        const div = document.createElement('div');
        div.className = 'contact-item';
        div.dataset.contact = friend.name;
        div.dataset.contactId = friend.id;
        div.innerHTML = `
            <div class="contact-avatar">${friend.name[0].toUpperCase()}</div>
            <div class="contact-info">
                <div class="contact-name">${friend.name}</div>
                <div class="contact-status">Available</div>
            </div>
        `;
        sidebar.appendChild(div);
    });
}

export function addFriendToSidebar(friend) {
    if (!currentUserId) {
        console.error('No current user ID set');
        return;
    }

    // Send request to server to add friend
    socket.emit('addFriend', {
        userId: currentUserId,
        friendId: friend.id
    });
}

export function getCurrentUserId() {
    return currentUserId;
}