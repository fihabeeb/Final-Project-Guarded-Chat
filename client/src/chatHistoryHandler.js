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

    const chatHistory = localStorage.getItem('chatHistory' + chatterId.id);
    if (chatHistory == null) {
        addMessage('System', `Debug: ${1}`, 'system');
        localStorage.setItem('chatHistory' + chatterId.id, JSON.stringify(currenctChatHistory));
        return;
    }
    else{
        addMessage('System', `Debug: ${2}`, 'system');
        currenctChatHistory = JSON.parse(localStorage.getItem('chatHistory' + chatterId.id) || null);
    }
    addMessage('System', `Debug: ${3}`, 'system');
    lastChattedWith = chatterId;
    addMessage('System', `Debug: ${4}`, 'system');
    localStorage.setItem('lastChattedWith', lastChattedWith.id);
    addMessage('System', `Debug: ${5}`, 'system');
    replaceChatHistory();
}

function replaceChatHistory()
{    addMessage('System', `Debug: ${6}`, 'system');
    messages.replaceChildren();
    currenctChatHistory.forEach(element => {
        addMessage(element.sender, element.message, element.type, element.time,true);
    });
}

// Add message to chat UI with timestamp
export function addMessage(sender, text, type = 'default', optionalTime = null, storageGeneration = false) {
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
      senderSpan.textContent = lastChattedWith.name;
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
    if (!storageGeneration)
    {
        currenctChatHistory.push({message: text, time: textTime, sender: sender, type: type});
        localStorage.setItem('chatHistory' + lastChattedWith.id, JSON.stringify(currenctChatHistory));
    }
  }

  messages.appendChild(item);
  messages.parentElement.scrollTop = messages.parentElement.scrollHeight;
}