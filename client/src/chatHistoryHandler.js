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
        addMessage(element.sender, element.message, element.type, element.time, true);
    });
}

// Add message to chat UI with timestamp
export function addMessage(sender, text, type = 'default', optionalTime = null, storageGeneration = false) {
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

    if (!storageGeneration && lastChattedWith) {
        currenctChatHistory.push({ message: text, time: textTime, sender: sender, type: type });
        localStorage.setItem('chatHistory' + lastChattedWith.id, JSON.stringify(currenctChatHistory));
    }
  }

  messages.appendChild(item);
  messages.parentElement.scrollTop = messages.parentElement.scrollHeight;
}
