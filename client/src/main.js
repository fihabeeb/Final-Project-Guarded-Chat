import './style.css'
import { io } from 'socket.io-client'

// Connect to the Express server running on port 1111
//const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:5000';
const socket = io(SOCKET_URL);
let loggedIn = false;
// WebRTC Configuration
const servers = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let dataChannel = null;
let peerConnectionID = 555;
let isMuted = false;
let isCameraOff = false;
let isInCall = false;

// DOM Elements
const videoModal = document.getElementById('videoModal');
const callSetupModal = document.getElementById('callSetupModal');
const webcamVideo = document.getElementById('webcamVideo');
const remoteVideo = document.getElementById('remoteVideo');
const messages = document.getElementById("messages");
const form = document.getElementById("form");
const input = document.getElementById("input");
const connectionStatus = document.getElementById('connectionStatus');
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

console.log("Client-side script loaded");

// Socket.io connection handlers
socket.on('connect', () => {
  console.log('Connected to server!');
  updateConnectionStatus('online');
  addMessage('System', 'Connected to server', 'system');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  updateConnectionStatus('offline');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  updateConnectionStatus('offline');
  addMessage('System', 'Disconnected from server', 'system');
});

// Update connection status indicator
function updateConnectionStatus(status) {
  connectionStatus.textContent = status;
  connectionStatus.style.color = status === 'online' ? '#00a884' : '#8696a0';
}

// Initialize peer connection
// isOfferer: true if this client is creating the call, false if joining
function createPeerConnection() {
  peerConnection = new RTCPeerConnection(servers);

  // Create data channel for text messaging
  dataChannel = peerConnection.createDataChannel('chat');
  setupDataChannel(dataChannel);

  // Handle incoming data channel
  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannel(dataChannel);
  };

  // Handle incoming tracks (video/audio)
  peerConnection.ontrack = event => {
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track);
    });
  };

  return peerConnection;
}

// Setup data channel event handlers
function setupDataChannel(channel) {
  channel.onopen = () => {
    console.log('Data channel opened');
    updateConnectionStatus('P2P connected');
    addMessage('System', 'Peer-to-peer connection established', 'system');
  };

  channel.onclose = () => {
    console.log('Data channel closed');
    updateConnectionStatus('online');
  };

  channel.onmessage = (event) => {
    console.log('Received P2P message:', event.data);
    addMessage('Peer', event.data, 'peer');
  };
}

// Add message to chat UI with timestamp
function addMessage(sender, text, type = 'default') {
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

// Start webcam
async function startWebcam() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    remoteStream = new MediaStream();

    webcamVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;

    return true;
  } catch (error) {
    console.error('Error accessing webcam:', error);
    addMessage('System', 'Error accessing webcam: ' + error.message, 'system');
    return false;
  }
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
  callIdDisplay.textContent = `Call ID: ${peerConnectionID}\nShare this ID with the person you want to call`;
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
  //peerConnectionID = null;
};
let isVideo = false;
async function offerPeerConnection() {
  try {
    createPeerConnection();

    // Add local tracks
    if (isVideo) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Create offer
    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription);

    // Send offer via Socket.io
    socket.emit('webrtc-offer', {
      callId: peerConnectionID,
      offer: {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      }
    });

    addMessage('System', `Call created. ID: ${peerConnectionID}`, 'system');

    // Handle ICE candidates
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', {
          callId: peerConnectionID,
          candidate: event.candidate.toJSON(),
          type: 'offer'
        });
      }
    };
  } catch (error) {
    console.error('Error creating call:', error);
    addMessage('System', 'Error creating call: ' + error.message, 'system');
  }
}

async function recievePeerConnection() {
  try {
    createPeerConnection();

    // Add local tracks
    if (isVideo) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Request the offer
    socket.emit('webrtc-get-offer', { callId: peerConnectionID });

  } catch (error) {
    console.error('Error answering call:', error);
    addMessage('System', 'Error answering call: ' + error.message, 'system');
  }
}
// Confirm call setup
confirmCallSetup.onclick = async () => {
  const isCreatingCall = callInput.style.display === 'none';

  if (isCreatingCall) {
    offerPeerConnection();
    isInCall = true;
    callSetupModal.classList.remove('active');
    videoModal.classList.add('active');
  }
  else {
    // Join call
    peerConnectionID = callInput.value.trim();
    if (!peerConnectionID) {
      addMessage('System', 'Please enter a call ID', 'system');
      return;
    }

    const webcamStarted = await startWebcam();
    if (!webcamStarted) {
      callSetupModal.classList.remove('active');
      return;
    }
    recievePeerConnection();
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
const endCall = () => {
  /*if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }*/

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  webcamVideo.srcObject = null;
  remoteVideo.srcObject = null;
  localStream = null;
  remoteStream = null;
  //peerConnectionID = null;
  isInCall = false;
  isMuted = false;
  isCameraOff = false;

  videoModal.classList.remove('active');
  updateConnectionStatus('online');
  addMessage('System', 'Call ended', 'system');
};

hangupButton.onclick = endCall;
closeVideoButton.onclick = endCall;

socket.on('webrtc-offer', async (data) => {
  console.log('Received offer:', data);
});

socket.on('webrtc-answer', async (data) => {
  if (peerConnection && !peerConnection.currentRemoteDescription && data.answer) {
    const answerDescription = new RTCSessionDescription(data.answer);
    await peerConnection.setRemoteDescription(answerDescription);
    addMessage('System', 'Call connected', 'system');
  }
});

socket.on('webrtc-ice-candidate', async (data) => {
  if (peerConnection && data.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }
});

socket.on('webrtc-offer-response', async (data) => {
  if (data.offer) {
    const offerDescription = new RTCSessionDescription(data.offer);
    await peerConnection.setRemoteDescription(offerDescription);

    const answerDescription = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answerDescription);

    socket.emit('webrtc-answer', {
      callId: peerConnectionID,
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      }
    });

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', {
          callId: peerConnectionID,
          candidate: event.candidate.toJSON(),
          type: 'answer'
        });
      }
    };

    addMessage('System', 'Answering call...', 'system');
  } else if (data.error) {
    addMessage('System', 'Call not found: ' + data.error, 'system');
    endCall();
  }
});


form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (input.value) {
    const message = input.value;
    console.log('Sending message:', message);

    //it no work cuz no peer connection yet, so no datachannel yet
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
    offerPeerConnection();
    hasOffered = true
  }
});

socket.on("recieveRTCConnection", function () {
  recievePeerConnection();
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

// Skip login if already logged in
if (loggedIn) {
  loginPage.style.display = 'none';
  appContainer.classList.remove('hidden');
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    loginError.textContent = 'Please fill in all fields';
    loginError.style.display = 'block';
    return;
  }

  // Hide login page and show the app
  loginPage.style.display = 'none';
  appContainer.classList.remove('hidden');

  // Use the username in the sidebar header and settings profile
  document.querySelector('.sidebar-header h2').textContent = `Guarded Chat`;
  document.getElementById('settingsUsername').textContent = username;
  document.getElementById('settingsAvatar').textContent = username[0].toUpperCase();
  loggedIn = true;
  addMessage('System', `Logged in as ${username}`, 'system');
});

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