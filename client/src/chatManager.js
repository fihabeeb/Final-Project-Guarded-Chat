import { socket } from './socketIO.js';
import { addMessage } from './chatHistoryHandler.js';

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
  console.log(`Now chatting with: ${partnerName} (${partnerId})`);

  // Check if there are any pending messages from this user
  if (pendingMessagesByUser.has(partnerId)) {
    const messages = pendingMessagesByUser.get(partnerId);
    console.log(`Loading ${messages.length} pending messages from ${partnerName}`);

    // Display all pending messages
    messages.forEach(msg => {
      addMessage(msg.fromName, msg.message, 'other');
    });

    // Clear pending messages and remove badge
    pendingMessagesByUser.delete(partnerId);
    updatePendingBadge(partnerId, 0);
  }
}

export function getCurrentChatPartner() {
  return {
    id: currentChatPartnerId,
    name: currentChatPartnerName
  };
}

export function sendMessage(message) {
  if (!currentUserId) {
    console.error('User not logged in');
    return false;
  }

  if (!currentChatPartnerId) {
    console.error('No chat partner selected');
    alert('Please select a contact to chat with');
    return false;
  }

  // Send message through server
  socket.emit('chat message', {
    fromUserId: currentUserId,
    toUserId: currentChatPartnerId,
    message: message
  });

  // Add message to your own chat
  addMessage('You', message, 'self');

  console.log(`Message sent to ${currentChatPartnerName}: ${message}`);
  return true;
}

export function setupMessageListeners() {
  // Receive messages from others
  socket.on('chat message', (data) => {
    console.log('Message received:', data);

    // Add message to chat if it's from current chat partner
    if (data.from === currentChatPartnerId) {
      addMessage(data.fromName, data.message, 'other');
    } else {
      // Store message for later when user opens this chat
      if (!pendingMessagesByUser.has(data.from)) {
        pendingMessagesByUser.set(data.from, []);
      }
      pendingMessagesByUser.get(data.from).push(data);
      updatePendingBadge(data.from, pendingMessagesByUser.get(data.from).length);

      console.log(`Message from ${data.fromName} stored for later (not current chat): ${data.message}`);

      // Could show a notification badge on the contact here
    }
  });

  // Handle queued message confirmation
  socket.on('message queued', (data) => {
    console.log('Message queued for offline user:', data);
    // Could show a "Message will be delivered when user comes online" indicator
  });

  // Handle pending messages on login
  socket.on('pending messages', (messages) => {
    console.log('Received pending messages:', messages);

    if (messages.length > 0) {
      // Group messages by sender
      const groupedMessages = {};
      messages.forEach(msg => {
        if (!groupedMessages[msg.from]) {
          groupedMessages[msg.from] = [];
        }
        groupedMessages[msg.from].push(msg);
      });

      // Store pending messages for later display and show badges
      Object.keys(groupedMessages).forEach(senderId => {
        if (!pendingMessagesByUser.has(senderId)) {
          pendingMessagesByUser.set(senderId, []);
        }
        const userMessages = pendingMessagesByUser.get(senderId);
        userMessages.push(...groupedMessages[senderId]);
        updatePendingBadge(senderId, userMessages.length);
      });

      // If currently chatting with one of the senders, display those messages immediately
      if (currentChatPartnerId && groupedMessages[currentChatPartnerId]) {
        groupedMessages[currentChatPartnerId].forEach(msg => {
          addMessage(msg.fromName, msg.message, 'other');
        });
        pendingMessagesByUser.delete(currentChatPartnerId);
        updatePendingBadge(currentChatPartnerId, 0);
      }
    }
  });

  // Handle user offline notification
  socket.on('user offline', (data) => {
    console.log('User is offline:', data.userId);
    if (data.userId === currentChatPartnerId) {
      // Could show an indicator that the user is offline
      console.log(`${currentChatPartnerName} is currently offline`);
    }
  });

  // Handle incoming chat requests
  socket.on('incoming chat', (data) => {
    console.log('Incoming chat from:', data.fromName);
    // Could show notification or automatically open chat
  });

  // Handle chat started confirmation
  socket.on('chat started', (data) => {
    console.log('Chat started with:', data.with);
  });
}
