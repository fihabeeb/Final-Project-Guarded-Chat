import './style/style.css'
import { socket } from './socketIO.js';
import { socketHandlers } from './socketIoHandlers.js';
import { offerPeerConnection, recievePeerConnection, rtcSockets, dataChannel } from './webrtc.js';
import { videoCallHandler } from './videoCall.js';
import { autoLogin, ifLoginApproved } from './login.js';
import { settingsListeners } from './appSettings.js';
import { sidebarListeners } from './sidebar.js';


// DOM Elements
const messages = document.getElementById("messages");
const form = document.getElementById("form");
const input = document.getElementById("input");

// Listeners and Handlers
socketHandlers(socket);
rtcSockets(socket);
videoCallHandler();
autoLogin();
ifLoginApproved();
settingsListeners();
sidebarListeners();

// Add message to chat UI with timestamp
export function addMessage(sender, text, type = 'default') {
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
    timeSpan.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    item.appendChild(timeSpan);
  }

  messages.appendChild(item);
  messages.parentElement.scrollTop = messages.parentElement.scrollHeight;
}

// Sending a message
form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (input.value) {
    const message = input.value;
    console.log('Sending message:', message);
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(message);
      addMessage('You', message, 'self');
    }
    input.value = "";
  }
});

let hasOffered = false;
socket.on("offerRTCConnection", function () {
  if (hasOffered === false) {
    offerPeerConnection(socket);
    hasOffered = true
  }
});

socket.on("recieveRTCConnection", function () {
  recievePeerConnection(socket);
});
