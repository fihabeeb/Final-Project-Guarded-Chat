import { servers } from "./iceServers.js";
import { updateConnectionStatus } from "./uiScript.js";
import { addMessage } from './chatHistoryHandler.js';
import { getPeerConnectionId, setPeerConnectionId } from "./peerConnectionId.js";
import { encryptMessage, decryptMessage, hasKeyForFriend } from './encryption.js';
import { getCurrentChatPartner } from './chatManager.js';
import { setContactPeerStatus } from './sidebar.js';

let peerConnection = null;
export let dataChannel = null;
let remoteStream = null;
let videoIceHandler = null;

export const callState = {
  localStream: null,
  isInCall: false,
  isMuted: false,
  isCameraOff: false,
};


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
    const partner = getCurrentChatPartner();
    if (partner.id) setContactPeerStatus(partner.id, 'P2P connected');
    updateConnectionStatus('P2P connected');
  };

  channel.onclose = () => {
    const partner = getCurrentChatPartner();
    if (partner.id) setContactPeerStatus(partner.id, 'offline');
    updateConnectionStatus('online');
  };

  channel.onmessage = async (event) => {
    const partner = getCurrentChatPartner();
    let text = event.data;
    if (partner.id && hasKeyForFriend(partner.id)) {
      try {
        text = await decryptMessage(event.data, partner.id);
      } catch (e) {
        console.error('[Encryption] P2P decryption failed:', e);
        text = '[could not decrypt message]';
      }
    }
    addMessage(partner.name || 'Peer', text, 'peer');
  };
}

export async function offerPeerConnection(socket) {
  try {
    peerConnection = createPeerConnection();

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

    // Request the offer
    socket.emit('webrtc-get-offer', { callId: getPeerConnectionId() });

  } catch (error) {
    console.error('Error answering call:', error);
    addMessage('System', 'Error answering call: ' + error.message, 'system');
  }
}

export function rtcSockets(socket) {

  socket.on('webrtc-offer', async () => {});

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

// Send a message over the WebRTC data channel with encryption
export async function sendP2PMessage(text) {
  if (!dataChannel || dataChannel.readyState !== 'open') return false;
  const partner = getCurrentChatPartner();
  let payload = text;
  if (partner.id && hasKeyForFriend(partner.id)) {
    payload = await encryptMessage(text, partner.id);
  }
  dataChannel.send(payload);
  return true;
}

export const endCall = () => {
  if (videoIceHandler && peerConnection) {
    peerConnection.removeEventListener('icecandidate', videoIceHandler);
    videoIceHandler = null;
  }

  if (callState.localStream) {
    callState.localStream.getTracks().forEach(track => track.stop());
  }

  webcamVideo.srcObject = null;
  remoteVideo.srcObject = null;
  callState.localStream = null;
  remoteStream = null;
  callState.isInCall = false;
  callState.isMuted = false;
  callState.isCameraOff = false;

  videoModal.classList.remove('active');
  addMessage('System', 'Call ended', 'system');
};

export async function startVideoOffer(socket, targetUserId) {
  if (!peerConnection) {
    addMessage('System', 'No active connection. Open a chat first.', 'system');
    return;
  }

  callState.localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, callState.localStream);
  });

  webcamVideo.srcObject = callState.localStream;

  videoIceHandler = (event) => {
    if (event.candidate) {
      socket.emit('video-rtc-ice', { toUserId: targetUserId, candidate: event.candidate.toJSON() });
    }
  };
  peerConnection.addEventListener('icecandidate', videoIceHandler);

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('video-rtc-offer', { toUserId: targetUserId, offer: { type: offer.type, sdp: offer.sdp } });
  } catch (error) {
    console.error('Error creating video offer:', error);
    addMessage('System', 'Error starting video call', 'system');
  }
}

export async function handleIncomingVideoOffer(socket, offer, targetUserId) {
  if (!peerConnection) {
    addMessage('System', 'Video call failed: open the chat with this contact first, then try again.', 'system');
    videoModal.classList.remove('active');
    return;
  }

  callState.localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, callState.localStream);
  });

  webcamVideo.srcObject = callState.localStream;

  videoIceHandler = (event) => {
    if (event.candidate) {
      socket.emit('video-rtc-ice', { toUserId: targetUserId, candidate: event.candidate.toJSON() });
    }
  };
  peerConnection.addEventListener('icecandidate', videoIceHandler);

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('video-rtc-answer', { toUserId: targetUserId, answer: { type: answer.type, sdp: answer.sdp } });
  } catch (error) {
    console.error('Error handling video offer:', error);
    addMessage('System', 'Error answering video call', 'system');
  }
}

export async function handleIncomingVideoAnswer(answer) {
  if (!peerConnection) return;
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (error) {
    console.error('Error setting video answer:', error);
  }
}

export async function addVideoIceCandidate(candidate) {
  if (!peerConnection) return;
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error('Error adding video ICE candidate:', error);
  }
}

// Start webcam
export async function startWebcam() {
  try {
    callState.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    remoteStream = new MediaStream();

    webcamVideo.srcObject = callState.localStream;
    remoteVideo.srcObject = remoteStream;

    return true;
  } catch (error) {
    console.error('Error accessing webcam:', error);
    addMessage('System', 'Error accessing webcam: ' + error.message, 'system');
    return false;
  }
}
