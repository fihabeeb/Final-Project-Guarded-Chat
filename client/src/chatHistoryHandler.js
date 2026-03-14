const messages = document.getElementById("messages");

let lastChattedWith = null;
let currenctChatHistory = [];

export function changeChatter(chatterId) {
    const chatHistory = localStorage.getItem('chatHistory' + chatterId.id);
    if (chatHistory == null) {
        currenctChatHistory = [];
        localStorage.setItem('chatHistory' + chatterId.id, JSON.stringify(currenctChatHistory));
    } else {
        currenctChatHistory = JSON.parse(chatHistory);
    }
    lastChattedWith = chatterId;
    localStorage.setItem('lastChattedWith', lastChattedWith.id);
    replaceChatHistory();
}

function replaceChatHistory() {
    messages.replaceChildren();
    currenctChatHistory.forEach(element => {
        addMessage(element.sender, element.message, element.type, element.time, true, element.read ?? false);
    });
}

// Add message to chat UI with timestamp
export function addMessage(sender, text, type = 'default', optionalTime = null, storageGeneration = false, isRead = false) {
  const item = document.createElement("li");
  item.className = `message-${type}`;

  if (type === 'system') {
    const textSpan = document.createElement("span");
    textSpan.className = "message-text";
    textSpan.textContent = text;
    item.appendChild(textSpan);
  } else {
    if (sender && type !== 'self') {
      const senderSpan = document.createElement("span");
      senderSpan.className = "message-sender";
      senderSpan.textContent = sender;
      item.appendChild(senderSpan);
    }

    const textSpan = document.createElement("span");
    textSpan.className = "message-text";
    textSpan.textContent = text;
    item.appendChild(textSpan);

    const timeSpan = document.createElement("span");
    timeSpan.className = "message-time";
    const textTime = optionalTime ?? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    timeSpan.textContent = textTime;
    item.appendChild(timeSpan);

    if (type === 'self') {
      const receiptSpan = document.createElement("span");
      receiptSpan.className = "message-receipt";
      receiptSpan.dataset.read = isRead ? 'true' : 'false';
      receiptSpan.textContent = isRead ? '✓✓' : '✓';
      item.appendChild(receiptSpan);
    }

    if (!storageGeneration && lastChattedWith) {
        currenctChatHistory.push({ message: text, time: textTime, sender: sender, type: type, read: false });
        localStorage.setItem('chatHistory' + lastChattedWith.id, JSON.stringify(currenctChatHistory));
    }
  }

  messages.appendChild(item);
  messages.parentElement.scrollTop = messages.parentElement.scrollHeight;
}

export function markMessagesAsRead(partnerId) {
  const key = 'chatHistory' + partnerId;
  const stored = localStorage.getItem(key);
  if (stored) {
    const history = JSON.parse(stored);
    history.forEach(msg => { if (msg.type === 'self') msg.read = true; });
    localStorage.setItem(key, JSON.stringify(history));
    if (String(lastChattedWith?.id) === String(partnerId)) {
      currenctChatHistory.forEach(msg => { if (msg.type === 'self') msg.read = true; });
    }
  }
  if (String(lastChattedWith?.id) === String(partnerId)) {
    document.querySelectorAll('.message-self .message-receipt').forEach(el => {
      el.dataset.read = 'true';
      el.textContent = '✓✓';
    });
  }
}
