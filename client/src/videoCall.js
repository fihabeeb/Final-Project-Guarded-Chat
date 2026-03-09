import { getPeerConnectionId, setPeerConnectionId } from './peerConnectionId.js';
import { offerPeerConnection, recievePeerConnection, endCall, startWebcam, callState } from './webrtc.js';
import { addMessage } from './chatHistoryHandler.js';
import { socket } from './socketIO.js';

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
const videoCallButton = document.getElementById('videoCallButton');
const videoModal = document.getElementById('videoModal');
const callSetupModal = document.getElementById('callSetupModal');

export function videoCallHandler() {
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
        const callId = Math.random().toString(36).substring(2, 8).toUpperCase();
        setPeerConnectionId(callId);
        callIdDisplay.textContent = `Call ID: ${callId}`;
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
        if (callState.localStream && !callState.isInCall) {
            callState.localStream.getTracks().forEach(track => track.stop());
            callState.localStream = null;
        }
    };


    // Confirm call setup
    confirmCallSetup.onclick = async () => {
        const isCreatingCall = callInput.style.display === 'none';

        if (isCreatingCall) {
            offerPeerConnection(socket);
            callState.isInCall = true;
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
            callState.isInCall = true;
            callSetupModal.classList.remove('active');
            videoModal.classList.add('active');
        }
    };

    // Toggle microphone
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

    // Toggle camera
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
}

hangupButton.onclick = endCall;
closeVideoButton.onclick = endCall;
