//let currentChatter = ''


const messages = document.getElementById("messages");


let lastChattedWith = localStorage.getItem('lastChattedWith');

if (lastChattedWith == null) {
    localStorage.setItem('lastChattedWith', '');
}
else
{
    //currentChatter = lastChattedWith;
}

let currenctChatHistory = [];
export function changeChatter(chatterId)
{
    const chatHistory = localStorage.getItem('chatHistory' + chatterId);
    if (chatHistory == null) {
        localStorage.setItem('chatHistory' + chatterId, '');
        return;
    }
    else{
        currenctChatHistory = JSON.parse(chatHistory);
    }
    lastChattedWith = chatterId;
    localStorage.setItem('lastChattedWith', lastChattedWith);
    replaceChatHistory();
}

function replaceChatHistory()
{
    messages.replaceChildren();
    currenctChatHistory.forEach(element => {
        addMessage(element.sender, element.message, 'self', element.time);
    });
}

// Add message to chat UI with timestamp
export function addMessage(sender, text, type = 'default', optionalTime = null) {
  const item = document.createElement("li");
  item.className = `message-${type}`;

  if (type === 'system') {
    // idk what this does tbh
    const textSpan = document.createElement("span");
    textSpan.className = "message-text";
    textSpan.textContent = text;
    item.appendChild(textSpan);
  } else {
    // puts the name at the top of the message
    if (sender && type !== 'self') {
      const senderSpan = document.createElement("span");
      senderSpan.className = "message-sender";
      senderSpan.textContent = sender;
      item.appendChild(senderSpan);
    }

    // shows the message
    const textSpan = document.createElement("span");
    textSpan.className = "message-text";
    textSpan.textContent = text;
    item.appendChild(textSpan);

    //shows the time
    const timeSpan = document.createElement("span");
    timeSpan.className = "message-time";
    const now = new Date();
    let textTime = null;
    if (optionalTime == null)
    {
        textTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    else{
        textTime = optionalTime
    }
    timeSpan.textContent = textTime;
    item.appendChild(timeSpan);

    //save to localstore
    currenctChatHistory.push({message: text, time: textTime, sender: sender});
    localStorage.setItem('chatHistory' + lastChattedWith, JSON.stringify(currenctChatHistory));
  }

  messages.appendChild(item);
  messages.parentElement.scrollTop = messages.parentElement.scrollHeight;
}