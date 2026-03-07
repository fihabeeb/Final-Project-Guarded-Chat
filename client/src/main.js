import './style/style.css'
import { socket } from './socketIO.js';
import { socketHandlers } from './socketIoHandlers.js';
import { offerPeerConnection, recievePeerConnection, rtcSockets, dataChannel } from './webrtc.js';
import { videoCallHandler } from './videoCall.js';
import { autoLogin, ifLoginApproved } from './login.js';
import { settingsListeners } from './appSettings.js';
import { sidebarListeners } from './sidebar.js';
import { addMessage } from './chatHistoryHandler.js';
import { userDiscoveryListeners } from './userDiscovery.js';

// DOM Elements
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
userDiscoveryListeners();

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
