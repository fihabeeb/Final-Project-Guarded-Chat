import firebase, { initializeApp } from 'firebase/app';
import 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDv4OQTWK783SbRAPZpYWPCXz-7KTgyozE",
  authDomain: "webrtc-tutorial-d268b.firebaseapp.com",
  projectId: "webrtc-tutorial-d268b",
  storageBucket: "webrtc-tutorial-d268b.firebasestorage.app",
  messagingSenderId: "188157419481",
  appId: "1:188157419481:web:a302d6fa4fed7f64aa03c8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = app.firestore();

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

let peerConnection = new RTCPeerConnection(servers);
//my webcam
let localStream = null;
// their webcam
let remoteStream = null;


const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');


webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  remoteStream = new MediaStream();

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = event => {
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = localStream;
};


//create an offer

callButton.onclick = async () => {
  console.log("Flip")
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callInput.value = callDoc.id;

  peerConnection.onicecandidate = event => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  }

  // creating offer
  const offerDescription = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set ({offer});

  //listen for answer from other user
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();

    if (!peerConnection.currentRemoteDescription && data?.answer) {
      const data = snapshot.data();
      if (!peerConnection.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        peerConnection.setRemoteDescription(answerDescription);
      }
    }
  });

    answerCandidates.onSnapshot(snapshot => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.addIceCandidate(candidate);
        }
      });
    });
};

// answer the call with the unique id

answerButton.onclick = async () => {
  const callid = callInput.value;
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change)
      if (change.type === 'added') {
        let data = change.doc.data();
        peerConnection.addIceCandidate(new RTCIceCandidate(data));
      }
    })
  })
}