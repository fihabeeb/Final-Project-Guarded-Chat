import './style.css'
import { io } from 'socket.io-client'

// Connect to the Express server running on port 1111
const socket = io('http://localhost:1111');

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
let currentCallId = null;
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
    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
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
  currentCallId = Math.random().toString(36).substring(7);
  callIdDisplay.textContent = `Call ID: ${currentCallId}\nShare this ID with the person you want to call`;
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
  currentCallId = null;
};

// Confirm call setup
confirmCallSetup.onclick = async () => {
  const isCreatingCall = callInput.style.display === 'none';

  if (isCreatingCall) {
    // Create call
    try {
      createPeerConnection();

      // Add local tracks
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      // Create offer
      const offerDescription = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offerDescription);

      // Send offer via Socket.io
      socket.emit('webrtc-offer', {
        callId: currentCallId,
        offer: {
          sdp: offerDescription.sdp,
          type: offerDescription.type,
        }
      });

      addMessage('System', `Call created. ID: ${currentCallId}`, 'system');

      // Handle ICE candidates
      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            callId: currentCallId,
            candidate: event.candidate.toJSON(),
            type: 'offer'
          });
        }
      };

      isInCall = true;
      callSetupModal.classList.remove('active');
      videoModal.classList.add('active');
    } catch (error) {
      console.error('Error creating call:', error);
      addMessage('System', 'Error creating call: ' + error.message, 'system');
    }
  } else {
    // Join call
    currentCallId = callInput.value.trim();
    if (!currentCallId) {
      addMessage('System', 'Please enter a call ID', 'system');
      return;
    }

    const webcamStarted = await startWebcam();
    if (!webcamStarted) {
      callSetupModal.classList.remove('active');
      return;
    }

    try {
      createPeerConnection();

      // Add local tracks
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      // Request the offer
      socket.emit('webrtc-get-offer', { callId: currentCallId });

      isInCall = true;
      callSetupModal.classList.remove('active');
      videoModal.classList.add('active');
    } catch (error) {
      console.error('Error answering call:', error);
      addMessage('System', 'Error answering call: ' + error.message, 'system');
    }
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
const endCall = () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  webcamVideo.srcObject = null;
  remoteVideo.srcObject = null;
  localStream = null;
  remoteStream = null;
  currentCallId = null;
  isInCall = false;
  isMuted = false;
  isCameraOff = false;

  videoModal.classList.remove('active');
  updateConnectionStatus('online');
  addMessage('System', 'Call ended', 'system');
};

hangupButton.onclick = endCall;
closeVideoButton.onclick = endCall;

// Socket.io WebRTC signaling handlers
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
      callId: currentCallId,
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      }
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', {
          callId: currentCallId,
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

// Text messaging form handler
form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (input.value) {
    const message = input.value;
    console.log('Sending message:', message);

    // Try to send via data channel first (P2P), fallback to Socket.io
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(message);
      addMessage('You', message, 'self');
    } else {
      socket.emit("chat message", message);
      addMessage('You', message, 'self');
    }

    input.value = "";
  }
});

// Socket.io chat message handler (server-based messaging)
socket.on("chat message", function (msg) {
  console.log('Received server message:', msg);
  addMessage('Server', msg, 'server');
});