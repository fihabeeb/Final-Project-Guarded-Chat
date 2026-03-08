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
import { friendRequestsListeners } from './friendRequests.js';
import { sendMessage, setupMessageListeners } from './chatManager.js';
import { initECDHKeyPair } from './encryption.js';

// Initialise ECDH key pair on startup (generates once, reuses on subsequent loads)
initECDHKeyPair().catch(e => console.error('[Encryption] Key init failed:', e));

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
friendRequestsListeners();
setupMessageListeners();

// Sending a message
form.addEventListener("submit", async function (e) {
  e.preventDefault();
  if (input.value) {
    const message = input.value;
    input.value = "";

    const sent = await sendMessage(message);
    if (!sent) {
      console.error('Failed to send message');
    }
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
