import { authenticateUser, searchUsers, getUsersByIds } from "./auth.js";
import { io } from "./io.js";
import { getFriendsList, addFriend, removeFriend, areFriends } from "./friendsList.js";
// Storage for WebRTC calls
const calls = new Map();
let userCount = 0;
export function PeerChatting(socket) {
    console.log("a user connected:", socket.id);
    if (userCount === 0) {
        socket.emit("offerRTCConnection");
    }
    else {
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

    socket.on('login-request', (credentialsInput) => {
        console.log("Login Request Recieved");
        //Feel free to change to "let" in the event of any errors
        const isUserLoggedIn = authenticateUser(credentialsInput.userName, credentialsInput.password);
        if (isUserLoggedIn != null) {
            console.log("User Authenticated Successfuly");
            socket.emit('login-approved', {
                name: isUserLoggedIn.name,
                id: isUserLoggedIn.id
            });
        }
    })

    // User search handler
    socket.on('searchUsers', (query) => {
        console.log("User search request:", query);
        const results = searchUsers(query);
        console.log("Search results:", results);
        socket.emit('userSearchResults', results);
    });

    // Friends list handlers
    socket.on('getFriendsList', (userId) => {
        console.log("Get friends list request for:", userId);
        const friendIds = getFriendsList(userId);
        const friends = getUsersByIds(friendIds);
        console.log("Friends list:", friends);
        socket.emit('friendsList', friends);
    });

    socket.on('addFriend', (data) => {
        const { userId, friendId } = data;
        console.log(`Add friend request: ${userId} wants to add ${friendId}`);

        const success = addFriend(userId, friendId);

        if (success) {
            // Get updated friends list
            const friendIds = getFriendsList(userId);
            const friends = getUsersByIds(friendIds);
            socket.emit('friendsList', friends);
            socket.emit('friendAdded', { success: true, friendId });
            console.log(`Friend added successfully: ${userId} -> ${friendId}`);
        } else {
            socket.emit('friendAdded', { success: false, message: 'Friend already exists' });
            console.log(`Friend already exists: ${userId} -> ${friendId}`);
        }
    });

    socket.on('removeFriend', (data) => {
        const { userId, friendId } = data;
        console.log(`Remove friend request: ${userId} wants to remove ${friendId}`);

        const success = removeFriend(userId, friendId);

        if (success) {
            // Get updated friends list
            const friendIds = getFriendsList(userId);
            const friends = getUsersByIds(friendIds);
            socket.emit('friendsList', friends);
            socket.emit('friendRemoved', { success: true, friendId });
            console.log(`Friend removed successfully: ${userId} -> ${friendId}`);
        } else {
            socket.emit('friendRemoved', { success: false, message: 'Friend not found' });
            console.log(`Friend not found: ${userId} -> ${friendId}`);
        }
    });

    socket.on('checkFriendship', (data) => {
        const { userId, friendId } = data;
        const isFriend = areFriends(userId, friendId);
        socket.emit('friendshipStatus', { userId, friendId, isFriend });
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

}