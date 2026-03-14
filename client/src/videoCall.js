import { startWebcam, startVideoOffer, handleIncomingVideoOffer, handleIncomingVideoAnswer, addVideoIceCandidate, endCall, callState } from './webrtc.js';
import { socket } from './socketIO.js';
import { getCurrentChatPartner } from './chatManager.js';
import { getCurrentUserId } from './sidebar.js';

const hangupButton = document.getElementById('hangupButton');
const closeVideoButton = document.getElementById('closeVideoButton');
const toggleMicButton = document.getElementById('toggleMicButton');
const toggleCameraButton = document.getElementById('toggleCameraButton');
const videoCallButton = document.getElementById('videoCallButton');
const videoModal = document.getElementById('videoModal');
const incomingCallModal = document.getElementById('incomingCallModal');
const incomingCallName = document.getElementById('incomingCallName');
const acceptCallButton = document.getElementById('acceptCallButton');
const declineCallButton = document.getElementById('declineCallButton');
const callingModal = document.getElementById('callingModal');
const callingName = document.getElementById('callingName');
const cancelCallingButton = document.getElementById('cancelCallingButton');

let pendingCallFromUserId = null;

export function videoCallHandler() {
    videoCallButton.onclick = async () => {
        const partner = getCurrentChatPartner();
        const myId = getCurrentUserId();
        if (!partner.id) {
            alert('Please select a contact first');
            return;
        }
        if (callState.isInCall) return;

        const started = await startWebcam();
        if (!started) return;

        callingName.textContent = `Calling ${partner.name}...`;
        callingModal.classList.add('active');
        socket.emit('video-call-request', { fromUserId: myId, toUserId: partner.id });
    };

    cancelCallingButton.onclick = () => {
        const partner = getCurrentChatPartner();
        const myId = getCurrentUserId();
        callingModal.classList.remove('active');
        socket.emit('video-call-declined', { fromUserId: myId, toUserId: partner.id });
        endCall();
    };

    acceptCallButton.onclick = async () => {
        incomingCallModal.classList.remove('active');
        const started = await startWebcam();
        if (!started) {
            socket.emit('video-call-declined', { fromUserId: getCurrentUserId(), toUserId: pendingCallFromUserId });
            pendingCallFromUserId = null;
            return;
        }
        socket.emit('video-call-accepted', { fromUserId: getCurrentUserId(), toUserId: pendingCallFromUserId });
        callState.isInCall = true;
        videoModal.classList.add('active');
    };

    declineCallButton.onclick = () => {
        incomingCallModal.classList.remove('active');
        socket.emit('video-call-declined', { fromUserId: getCurrentUserId(), toUserId: pendingCallFromUserId });
        pendingCallFromUserId = null;
    };

    toggleMicButton.onclick = () => {
        if (callState.localStream) {
            const audioTrack = callState.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                callState.isMuted = !audioTrack.enabled;
                toggleMicButton.style.background = callState.isMuted ? '#f15c6d' : '#374955';
            }
        }
    };

    toggleCameraButton.onclick = () => {
        if (callState.localStream) {
            const videoTrack = callState.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                callState.isCameraOff = !videoTrack.enabled;
                toggleCameraButton.style.background = callState.isCameraOff ? '#f15c6d' : '#374955';
            }
        }
    };

    socket.on('video-call-incoming', (data) => {
        pendingCallFromUserId = data.fromUserId;
        incomingCallName.textContent = data.fromName;
        incomingCallModal.classList.add('active');
    });

    socket.on('video-call-accepted', async () => {
        callingModal.classList.remove('active');
        const partner = getCurrentChatPartner();
        callState.isInCall = true;
        videoModal.classList.add('active');
        await startVideoOffer(socket, partner.id);
    });

    socket.on('video-call-declined', () => {
        callingModal.classList.remove('active');
        incomingCallModal.classList.remove('active');
        if (callState.localStream || callState.isInCall) endCall();
    });

    socket.on('video-rtc-offer', async (data) => {
        await handleIncomingVideoOffer(socket, data.offer, pendingCallFromUserId);
    });

    socket.on('video-rtc-answer', async (data) => {
        await handleIncomingVideoAnswer(data.answer);
    });

    socket.on('video-rtc-ice', async (data) => {
        await addVideoIceCandidate(data.candidate);
    });

    socket.on('video-call-ended', () => {
        callingModal.classList.remove('active');
        incomingCallModal.classList.remove('active');
        pendingCallFromUserId = null;
        if (callState.isInCall || callState.localStream) endCall();
    });
}

const doHangup = () => {
    const partner = getCurrentChatPartner();
    const myId = getCurrentUserId();
    if (partner.id && myId) {
        socket.emit('video-call-ended', { fromUserId: myId, toUserId: partner.id });
    }
    endCall();
};

hangupButton.onclick = doHangup;
closeVideoButton.onclick = doHangup;
