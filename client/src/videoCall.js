import { getPeerConnectionId, setPeerConnectionId } from './peerConnectionId.js';
import { offerPeerConnection, recievePeerConnection, endCall, startWebcam } from './webrtc.js';

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

let localStream = null;
let isMuted = false;
let isCameraOff = false;
let isInCall = false;

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
        //peerConnectionID = Math.random().toString(36).substring(7);
        //callIdDisplay.textContent = `Call ID: ${getPeerConnectionId()}\nShare this ID with the person you want to call`;
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
}

hangupButton.onclick = endCall;
closeVideoButton.onclick = endCall;