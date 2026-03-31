import { changeChatter } from "./chatHistoryHandler.js";
import { socket } from "./socketIO.js";
import { setCurrentChatPartner, reapplyPendingBadges } from "./chatManager.js";

const sidebar = document.querySelector('.sidebar-content');
let currentUserId = null;
let friendsList = [];
let pendingAutoOpen = false;

export function sidebarListeners() {
    // Listen for friends list from server
    socket.on('friendsList', (friends) => {
        friendsList = friends;
        renderFriendsList(friends);
        if (currentUserId) {
            localStorage.setItem(`friends_${currentUserId}`, JSON.stringify(friends));
        }
    });

    socket.on('friend-name-updated', ({ userId, newName }) => {
        const friend = friendsList.find(f => String(f.id) === String(userId));
        if (!friend) return;

        friend.name = newName;

        // Update sidebar item
        const item = document.querySelector(`.contact-item[data-contact-id="${userId}"]`);
        if (item) {
            item.dataset.contact = newName;
            item.querySelector('.contact-avatar').textContent = newName[0].toUpperCase();
            item.querySelector('.contact-name').textContent = newName;
        }

        // Update chat header if this friend's chat is currently open
        const headerName = document.querySelector('.chat-info h3');
        const headerAvatar = document.querySelector('.chat-avatar');
        if (headerName && item && item.classList.contains('active')) {
            headerName.textContent = newName;
            headerAvatar.textContent = newName[0].toUpperCase();
        }

        if (currentUserId) {
            localStorage.setItem(`friends_${currentUserId}`, JSON.stringify(friendsList));
        }
    });

    // Handle contact clicks
    sidebar.addEventListener('click', (e) => {
        const item = e.target.closest('.contact-item');
        if (!item) return;

        openChat(item.dataset.contactId, item.dataset.contact);
    });
}

export function loadFriendsList(userId) {
    currentUserId = userId;
    pendingAutoOpen = true;

    const stored = localStorage.getItem(`friends_${userId}`);
    if (stored) {
        const localFriends = JSON.parse(stored);
        friendsList = localFriends;
        renderFriendsList(localFriends);
        socket.emit('restoreFriendsList', { userId, friendIds: localFriends.map(f => f.id) });
    } else {
        socket.emit('getFriendsList', userId);
    }
}

export function renderFriendsList(friends) {
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
                <div class="contact-status" data-peer-status="${friend.id}">offline</div>
            </div>
        `;
        sidebar.appendChild(div);
    });

    reapplyPendingBadges();

    if (pendingAutoOpen) {
        pendingAutoOpen = false;
        const lastId = localStorage.getItem('lastChattedWith');
        if (lastId) {
            const last = friends.find(f => String(f.id) === lastId);
            if (last) openChat(last.id, last.name);
        }
    }
}

function openChat(contactId, contactName) {
    // Update active state
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    const item = document.querySelector(`.contact-item[data-contact-id="${contactId}"]`);
    if (item) item.classList.add('active');

    // Update chat header
    document.querySelector('.chat-info h3').textContent = contactName;
    document.querySelector('.chat-avatar').textContent = contactName[0];

    const friend = friendsList.find(f => String(f.id) === String(contactId));
    if (friend) changeChatter(friend);

    setCurrentChatPartner(contactId, contactName);

    if (currentUserId) {
        socket.emit('start chat', { fromUserId: currentUserId, toUserId: contactId });
    }
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

export function getFriendIds() {
    return friendsList.map(f => f.id);
}

export function setContactPeerStatus(contactId, status) {
    const el = document.querySelector(`[data-peer-status="${contactId}"]`);
    if (!el) return;
    el.textContent = status;
    el.style.color = status === 'P2P connected' ? '#00a884' : '#8696a0';
}