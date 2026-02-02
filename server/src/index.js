import { Server } from "socket.io";
import app from "./app.js";
import http from "http";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Storage for WebRTC calls
const calls = new Map();
let userCount = 0;
io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);
  if (userCount === 0)
  {
    socket.emit("offerRTCConnection");
  }
  else
  {
    socket.emit("recieveRTCConnection");
  }
  userCount += 1

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
    userCount -= 1;
  });

  // Text chat message handler
  // Remove the following and replace it with rtc
  socket.on("chat message", (msg) => {
    console.log("message: " + msg);
    //io.emit("chat message", msg);
  });

  // WebRTC signaling handlers
  socket.on("webrtc-offer", (data) => {
    console.log("Received WebRTC offer for call:", data.callId);

    // Store the offer
    calls.set(data.callId, {
      offer: data.offer,
      offererId: socket.id,
      iceCandidates: {
        offer: [],
        answer: [],
      },
    });

    // Broadcast to other users that a call is available
    socket.broadcast.emit("webrtc-offer", data);
  });

  socket.on("webrtc-answer", (data) => {
    console.log("Received WebRTC answer for call:", data.callId);

    const call = calls.get(data.callId);
    if (call) {
      call.answer = data.answer;
      call.answererID = socket.id;

      // Send answer to the offerer
      io.to(call.offererId).emit("webrtc-answer", data);
    }
  });

  socket.on("webrtc-ice-candidate", (data) => {
    console.log(
      "Received ICE candidate for call:",
      data.callId,
      "type:",
      data.type,
    );

    const call = calls.get(data.callId);
    if (call) {
      // Store ICE candidate
      if (data.type === "offer") {
        call.iceCandidates.offer.push(data.candidate);
      } else {
        call.iceCandidates.answer.push(data.candidate);
      }

      // Relay ICE candidate to the other peer
      if (data.type === "offer" && call.answererID) {
        io.to(call.answererID).emit("webrtc-ice-candidate", data);
      } else if (data.type === "answer" && call.offererId) {
        io.to(call.offererId).emit("webrtc-ice-candidate", data);
      }
    }
  });

  socket.on("webrtc-get-offer", (data) => {
    console.log("Request for offer:", data.callId);

    const call = calls.get(data.callId);
    if (call && call.offer) {
      // Send the offer to the requester
      socket.emit("webrtc-offer-response", {
        callId: data.callId,
        offer: call.offer,
      });

      // Also send any accumulated ICE candidates
      call.iceCandidates.offer.forEach((candidate) => {
        socket.emit("webrtc-ice-candidate", {
          callId: data.callId,
          candidate: candidate,
          type: "offer",
        });
      });
    } else {
      socket.emit("webrtc-offer-response", {
        callId: data.callId,
        error: "Call not found",
      });
    }
  });
});

const startServer = async () => {
  try {
    app.on("error", (error) => {
      console.log("Error: ", error);
      throw error;
    });

    server.listen(1111, () => {
      console.log("Listening on *:3000");
    });
  } catch (error) {
    console.log("Som tin wong: ", error);
  }
};

startServer();
