
import app from "./app.js";
import { PeerChatting } from "./RTCHandler.js";
import { io } from "./io.js";
import { server } from "./server.js";
import { initializeDB } from "./db.js";
import { loadUsersFromDB } from "./auth.js";

io.on("connection", (socket) => {
  PeerChatting(socket);
});

const startServer = async () => {
  try {
    await initializeDB();
    await loadUsersFromDB();

    app.on("error", (error) => {
      console.log("Error: ", error);
      throw error;
    });

    server.listen(1111, () => {
      console.log("Listening on: 1111");
    });
  } catch (error) {
    console.log("Failed to start server: ", error);
  }
};

startServer();
