import { servers } from "./iceServers.js";
import { updateConnectionStatus } from "./uiScript.js";
import { addMessage } from './chatHistoryHandler.js';
import { getPeerConnectionId, setPeerConnectionId } from "./peerConnectionId.js";

let peerConnection = null;
export let dataChannel = null;
let isVideo = false;
let remoteStream = null;


const webcamVideo = document.getElementById('webcamVideo');
const remoteVideo = document.getElementById('remoteVideo');
const videoModal = document.getElementById('videoModal');

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

export async function offerPeerConnection(socket) {
  try {
    peerConnection = createPeerConnection();

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
      callId: getPeerConnectionId(),
      offer: {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      }
    });

    addMessage('System', `Call created. ID: ${getPeerConnectionId()}`, 'system');

    // Handle ICE candidates
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', {
          callId: getPeerConnectionId(),
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

export async function recievePeerConnection(socket) {
  try {
    peerConnection = createPeerConnection();

    // Add local tracks
    if (isVideo) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Request the offer
    socket.emit('webrtc-get-offer', { callId: getPeerConnectionId() });

  } catch (error) {
    console.error('Error answering call:', error);
    addMessage('System', 'Error answering call: ' + error.message, 'system');
  }
}

export function rtcSockets(socket) {

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
        callId: getPeerConnectionId(),
        answer: {
          type: answerDescription.type,
          sdp: answerDescription.sdp,
        }
      });

      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            callId: getPeerConnectionId(),
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

}

export const endCall = () => {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  webcamVideo.srcObject = null;
  remoteVideo.srcObject = null;
  localStream = null;
  remoteStream = null;
  //getPeerConnectionId() = null;
  isInCall = false;
  isMuted = false;
  isCameraOff = false;

  videoModal.classList.remove('active');
  updateConnectionStatus('online');
  addMessage('System', 'Call ended', 'system');
};

// Start webcam
export async function startWebcam() {
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
