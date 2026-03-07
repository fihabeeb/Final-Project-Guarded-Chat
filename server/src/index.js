
import app from "./app.js";
import { PeerChatting } from "./RTCHandler.js";
import { io } from "./io.js";
import { server } from "./server.js";
import { initializeDefaultFriends } from "./friendsList.js";

// Initialize default friends list for testing
initializeDefaultFriends();

io.on("connection", (socket) => {
  PeerChatting(socket);
});

const startServer = async () => {
  try {
    app.on("error", (error) => {
      console.log("Error: ", error);
      throw error;
    });

    server.listen(1111, () => {
      console.log("Listening on: 1111");
    });
  } catch (error) {
    console.log("Som tin wong: ", error);
  }
};

startServer();
