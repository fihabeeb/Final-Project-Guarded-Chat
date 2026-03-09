import { socket } from './socketIO.js';
import { addMessage, markMessagesAsRead } from './chatHistoryHandler.js';
import { encryptMessage, decryptMessage, hasKeyForFriend } from './encryption.js';
import { sendP2PMessage } from './webrtc.js';
import { setContactPeerStatus } from './sidebar.js';
import { playMessageSound, showNotification, loadSettings } from './appSettings.js';

const typingIndicator = document.getElementById('typingIndicator');

let currentUserId = null;
let currentChatPartnerId = null;
let currentChatPartnerName = null;

// Store pending messages by sender ID
const pendingMessagesByUser = new Map();

export function setChatManager(userId) {
  currentUserId = userId;
}

function updatePendingBadge(contactId, count) {
  const item = document.querySelector(`.contact-item[data-contact-id="${contactId}"]`);
  if (!item) return;
  let badge = item.querySelector('.pending-badge');
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'pending-badge';
      item.appendChild(badge);
    }
    badge.textContent = count > 99 ? '99+' : count;
  } else if (badge) {
    badge.remove();
  }
}

export function reapplyPendingBadges() {
  pendingMessagesByUser.forEach((messages, contactId) => {
    updatePendingBadge(contactId, messages.length);
  });
}

export function setCurrentChatPartner(partnerId, partnerName) {
  currentChatPartnerId = partnerId;
  currentChatPartnerName = partnerName;

  // Hide typing indicator when switching chats
  if (typingIndicator) typingIndicator.style.display = 'none';

  // Check if there are any pending messages from this user
  if (pendingMessagesByUser.has(partnerId)) {
    const messages = pendingMessagesByUser.get(partnerId);
    messages.forEach(msg => {
      addMessage(msg.fromName, msg.message, 'other');
    });
    pendingMessagesByUser.delete(partnerId);
    updatePendingBadge(partnerId, 0);
  }

  // Notify partner that we've read their messages
  if (loadSettings().readReceipts && currentUserId) {
    socket.emit('read receipt', { fromUserId: currentUserId, toUserId: partnerId });
  }
}

export function emitTyping() {
  if (!currentUserId || !currentChatPartnerId) return;
  socket.emit('typing', { fromUserId: currentUserId, toUserId: currentChatPartnerId });
}

export function emitStopTyping() {
  if (!currentUserId || !currentChatPartnerId) return;
  socket.emit('stop typing', { fromUserId: currentUserId, toUserId: currentChatPartnerId });
}

export function getCurrentChatPartner() {
  return {
    id: currentChatPartnerId,
    name: currentChatPartnerName
  };
}

export async function sendMessage(message) {
  if (!currentUserId) {
    console.error('User not logged in');
    return false;
  }

  if (!currentChatPartnerId) {
    console.error('No chat partner selected');
    alert('Please select a contact to chat with');
    return false;
  }

  // Use P2P data channel if available (handles its own encryption)
  const p2pSent = await sendP2PMessage(message);
  if (!p2pSent) {
    // Fall back to server relay
    let payload = message;
    if (hasKeyForFriend(currentChatPartnerId)) {
      payload = await encryptMessage(message, currentChatPartnerId);
    }
    socket.emit('chat message', {
      fromUserId: currentUserId,
      toUserId: currentChatPartnerId,
      message: payload
    });
  }

  addMessage('You', message, 'self');
  return true;
}

export function setupMessageListeners() {
  // Receive messages from others
  socket.on('chat message', async (data) => {
    if (hasKeyForFriend(data.from)) {
      try {
        data.message = await decryptMessage(data.message, data.from);
      } catch (e) {
        console.error('[Encryption] Decryption failed:', e);
        data.message = '[could not decrypt message]';
      }
    }

    playMessageSound();
    showNotification(data.fromName, data.message);

    // Add message to chat if it's from current chat partner
    if (data.from === currentChatPartnerId) {
      addMessage(data.fromName, data.message, 'other');
      // Immediately send read receipt since chat is open
      if (loadSettings().readReceipts && currentUserId) {
        socket.emit('read receipt', { fromUserId: currentUserId, toUserId: data.from });
      }
    } else {
      // Store message for later when user opens this chat
      if (!pendingMessagesByUser.has(data.from)) {
        pendingMessagesByUser.set(data.from, []);
      }
      pendingMessagesByUser.get(data.from).push(data);
      updatePendingBadge(data.from, pendingMessagesByUser.get(data.from).length);
    }
  });

  socket.on('message queued', () => {});

  // Typing indicators
  socket.on('typing', ({ fromUserId }) => {
    if (fromUserId === currentChatPartnerId && typingIndicator) {
      typingIndicator.style.display = 'flex';
    }
  });

  socket.on('stop typing', ({ fromUserId }) => {
    if (fromUserId === currentChatPartnerId && typingIndicator) {
      typingIndicator.style.display = 'none';
    }
  });

  // Read receipts
  socket.on('message read', ({ byUserId }) => {
    markMessagesAsRead(byUserId);
  });

  // Handle pending messages on login
  socket.on('pending messages', async (messages) => {

    if (messages.length === 0) return;

    // Decrypt all messages first
    const decrypted = await Promise.all(messages.map(async msg => {
      if (hasKeyForFriend(msg.from)) {
        try {
          msg.message = await decryptMessage(msg.message, msg.from);
        } catch (e) {
          console.error('[Encryption] Failed to decrypt pending message:', e);
          msg.message = '[could not decrypt message]';
        }
      }
      return msg;
    }));

    // Group by sender
    const groupedMessages = {};
    decrypted.forEach(msg => {
      if (!groupedMessages[msg.from]) groupedMessages[msg.from] = [];
      groupedMessages[msg.from].push(msg);
    });

    // Store and badge
    Object.keys(groupedMessages).forEach(senderId => {
      if (!pendingMessagesByUser.has(senderId)) {
        pendingMessagesByUser.set(senderId, []);
      }
      const userMessages = pendingMessagesByUser.get(senderId);
      userMessages.push(...groupedMessages[senderId]);
      updatePendingBadge(senderId, userMessages.length);
    });

    // If currently chatting with one of the senders, display immediately
    if (currentChatPartnerId && groupedMessages[currentChatPartnerId]) {
      groupedMessages[currentChatPartnerId].forEach(msg => {
        addMessage(msg.fromName, msg.message, 'other');
      });
      pendingMessagesByUser.delete(currentChatPartnerId);
      updatePendingBadge(currentChatPartnerId, 0);
      if (loadSettings().readReceipts && currentUserId) {
        socket.emit('read receipt', { fromUserId: currentUserId, toUserId: currentChatPartnerId });
      }
    }
  });

  // Handle user offline notification
  socket.on('user offline', (data) => {
    setContactPeerStatus(data.userId, 'offline');
  });

  // Handle incoming chat requests
  socket.on('incoming chat', () => {});

  // Handle chat started confirmation
  socket.on('chat started', () => {});
}
