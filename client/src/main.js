import './style.css'
import { socket } from './socketIO.js';
import { socketHandlers } from './socketIoHandlers.js';
import { offerPeerConnection, recievePeerConnection, rtcSockets, endCall, startWebcam, dataChannel } from './webrtc.js';
import { getPeerConnectionId, setPeerConnectionId } from './peerConnectionId.js';
let loggedIn = false;


let localStream = null;
let isMuted = false;
let isCameraOff = false;
let isInCall = false;

// DOM Elements
const videoModal = document.getElementById('videoModal');
const callSetupModal = document.getElementById('callSetupModal');
const messages = document.getElementById("messages");
const form = document.getElementById("form");
const input = document.getElementById("input");
const videoCallButton = document.getElementById('videoCallButton');
const joinCallButton = document.getElementById('joinCallButton');
const hangupButton = document.getElementById('hangupButton');
const closeVideoButton = document.getElementById('closeVideoButton');
const toggleMicButton = document.getElementById('toggleMicButton');
const toggleCameraButton = document.getElementById('toggleCameraButton');
const callInput = document.getElementById('callInput');
const callSetupTitle = document.getElementById('callSetupTitle');
const callIdDisplay = document.getElementById('callIdDisplay');
const cancelCallSetup = document.getElementById('cancelCallSetup');
const confirmCallSetup = document.getElementById('confirmCallSetup');

socketHandlers(socket);
rtcSockets(socket);

// Initialize peer connection
// isOfferer: true if this client is creating the call, false if joining


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


// Video Call Button - Create call
videoCallButton.onclick = async () => {
  callSetupTitle.textContent = 'Start Video Call';
  callInput.value = '';
  callInput.style.display = 'none';
  callIdDisplay.style.display = 'block';
  callIdDisplay.textContent = 'Starting call...';
  callSetupModal.classList.add('active');

  // Auto-start webcam
  const webcamStarted = await startWebcam();
  if (!webcamStarted) {
    callSetupModal.classList.remove('active');
    return;
  }

  // Generate unique call ID
  //peerConnectionID = Math.random().toString(36).substring(7);
  callIdDisplay.textContent = `Call ID: ${getPeerConnectionId()}\nShare this ID with the person you want to call`;
};

// Join Call Button
joinCallButton.onclick = () => {
  callSetupTitle.textContent = 'Join Call';
  callInput.style.display = 'block';
  callInput.value = '';
  callIdDisplay.style.display = 'none';
  callSetupModal.classList.add('active');
};

// Cancel call setup
cancelCallSetup.onclick = () => {
  callSetupModal.classList.remove('active');
  if (localStream && !isInCall) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
};




// Confirm call setup
confirmCallSetup.onclick = async () => {
  const isCreatingCall = callInput.style.display === 'none';

  if (isCreatingCall) {
    offerPeerConnection(socket);
    isInCall = true;
    callSetupModal.classList.remove('active');
    videoModal.classList.add('active');
  }
  else {
    // Join call
    setPeerConnectionId(callInput.value.trim());
    if (!getPeerConnectionId()) {
      addMessage('System', 'Please enter a call ID', 'system');
      return;
    }

    const webcamStarted = await startWebcam();
    if (!webcamStarted) {
      callSetupModal.classList.remove('active');
      return;
    }
    recievePeerConnection(socket);
    isInCall = true;
    callSetupModal.classList.remove('active');
    videoModal.classList.add('active');
  }
};

// Toggle microphone
toggleMicButton.onclick = () => {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      isMuted = !audioTrack.enabled;
      toggleMicButton.style.background = isMuted ? '#f15c6d' : '#374955';
      console.log('Microphone:', isMuted ? 'muted' : 'unmuted');
    }
  }
};

// Toggle camera
toggleCameraButton.onclick = () => {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      isCameraOff = !videoTrack.enabled;
      toggleCameraButton.style.background = isCameraOff ? '#f15c6d' : '#374955';
      console.log('Camera:', isCameraOff ? 'off' : 'on');
    }
  }
};

// Hangup or close video
// Note that this kills the peer connection
// Peer cnnection isnt used for chatting yet

hangupButton.onclick = endCall;
closeVideoButton.onclick = endCall;

form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (input.value) {
    const message = input.value;
    console.log('Sending message:', message);

    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(message);
      addMessage('You', message, 'self');
    } /*else {
      //its using socket emit cuz no datachannel
      socket.emit("chat message", message);
      addMessage('You', message, 'self');
    }*/

    input.value = "";
  }
});

// Socket.io chat message handler (server-based messaging)
//the following is what happens when you recieve a messagew
/*
socket.on("chat message", function (msg) {
  console.log('Received server message:', msg);
  addMessage('Peer', msg, 'server');
});*/

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


const sidebar = document.querySelector('.sidebar-content');

const contacts = [
  { name: 'Alice', status: 'Online', key: 'alice' },
  { name: 'Bob', status: 'Away', key: 'bob' },
  { name: 'Charlie', status: 'Offline', key: 'charlie' },
];

contacts.forEach(contact => {
  const div = document.createElement('div');
  div.className = 'contact-item';
  div.dataset.contact = contact.name;
  div.innerHTML = `
    <div class="contact-avatar">${contact.name[0]}</div>
    <div class="contact-info">
      <div class="contact-name">${contact.name}</div>
      <div class="contact-status">${contact.status}</div>
    </div>
  `;
  sidebar.appendChild(div);
});

// Login page handling
const loginPage = document.getElementById('loginPage');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

function autoLogin()
{
  // Skip login if already logged in
  if (loggedIn) {
    loginPage.style.display = 'none';
    appContainer.classList.remove('hidden');
    return;
  }
  const storedUserName = localStorage.getItem('username')
  if (storedUserName == null) {
    localStorage.setItem('username', '');
    return;
  }

  const storedPassword = localStorage.getItem('password');
  if (storedPassword == null) {
    localStorage.setItem('password', '');
    return;
  }
  attemptLoginViaServer(storedUserName, storedPassword);
}

function attemptLoginViaServer(username, password)
{
  tempPassword = password;
  socket.emit('login-request', {
    userName: username,
    password: password
  });
}
let tempPassword;
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    loginError.textContent = 'Please fill in all fields';
    loginError.style.display = 'block';
    return;
  }
  attemptLoginViaServer(username, password);


});

socket.on('login-approved', (user) => {
  console.log("Logged in: " + user.name);

  // Hide login page and show the app
  loginPage.style.display = 'none';
  appContainer.classList.remove('hidden');

  // Use the username in the sidebar header and settings profile
  document.querySelector('.sidebar-header h2').textContent = `Guarded Chat`;
  document.getElementById('settingsUsername').textContent = user.name;
  document.getElementById('settingsAvatar').textContent = user.name[0].toUpperCase();
  /// TO DO: Probably put this in cache so the server is not overloaded with login requests everytime a user accidentaly refreshes the page and that
  loggedIn = true;
  addMessage('System', `Logged in as ${user.name}`, 'system');

  localStorage.setItem('username', user.name);
  localStorage.setItem('userId', user.id);
  localStorage.setItem('password', tempPassword);
  tempPassword = null;


})

// Settings modal handling
const settingsModal = document.getElementById('settingsModal');
const settingsButton = document.getElementById('settingsButton');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const logoutButton = document.getElementById('logoutButton');

settingsButton.onclick = () => {
  settingsModal.classList.add('active');
};

closeSettingsButton.onclick = () => {
  settingsModal.classList.remove('active');
};

// Close settings when clicking the backdrop
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove('active');
  }
});

logoutButton.onclick = () => {
  loggedIn = false;
  settingsModal.classList.remove('active');
  appContainer.classList.add('hidden');
  loginPage.style.display = '';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
};

sidebar.addEventListener('click', (e) => {
  const item = e.target.closest('.contact-item');
  if (!item) return;

  // Remove active from all, set on clicked
  sidebar.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
  item.classList.add('active');
  document.querySelector('.chat-info h3').textContent = item.dataset.contact;
  document.querySelector('.chat-avatar').textContent = item.dataset.contact[0]; // first letter of new name

  console.log('Selected:', item.dataset.contact);
});

autoLogin();