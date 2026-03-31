import { authenticateUser, registerUser, searchUsers, getUsersByIds, getUserById, updateUserName, updatePassword } from "./auth.js";
import { io } from "./io.js";
import { getFriendsList, addFriend, removeFriend, areFriends } from "./friendsList.js";
import {
    sendFriendRequest,
    getFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    addPendingFriendAddition,
    getPendingFriendAdditions
} from "./friendRequests.js";
import {
    setUserOnline,
    setUserOffline,
    isUserOnline,
    getUserSocketId,
    getUserIdFromSocket
} from "./onlineUsers.js";
import {
    queueMessage,
    getPendingMessages,
    clearPendingMessages,
    getPendingMessageCount
} from "./messageQueue.js";
import {
    queueKeyExchange,
    getPendingKeyExchanges
} from "./pendingKeyExchanges.js";

// Storage for WebRTC calls - now supports multiple concurrent connections
// Key format: "userId1:userId2" (sorted alphabetically to ensure consistency)
const calls = new Map();

export function PeerChatting(socket) {
    console.log("a user connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("user disconnected:", socket.id);

        // Mark user as offline
        setUserOffline(socket.id);
    });

    // Chat message handler - supports multiple concurrent chats
    socket.on("chat message", async (data) => {
        const { fromUserId, toUserId, message } = data;

        // Check if recipient is online
        if (isUserOnline(toUserId)) {
            const recipientSocketId = getUserSocketId(toUserId);
            const fromUser = getUserById(fromUserId);

            io.to(recipientSocketId).emit("chat message", {
                from: fromUserId,
                fromName: fromUser ? fromUser.name : "Unknown",
                message: message,
                timestamp: new Date().toISOString()
            });
        } else {
            const fromUser = getUserById(fromUserId);
            await queueMessage(toUserId, fromUserId, fromUser ? fromUser.name : "Unknown", message);

            socket.emit("message queued", { toUserId });
        }
    });

    socket.on('register-request', async (data) => {
        const { username, name, password } = data;
        console.log(`Register request for username: ${username}`);
        const result = await registerUser(username, name, password);
        if (result.success) {
            socket.emit('register-approved', {
                id: result.user.id,
                username: result.user.username,
                name: result.user.name
            });
        } else {
            socket.emit('register-error', { message: result.message });
        }
    });

    socket.on('login-request', async (credentialsInput) => {
        console.log("Login Request Recieved");
        const isUserLoggedIn = await authenticateUser(credentialsInput.userName, credentialsInput.password);
        if (isUserLoggedIn != null) {
            console.log("User Authenticated Successfuly");

            // Mark user as online
            setUserOnline(isUserLoggedIn.id, socket.id);

            socket.emit('login-approved', {
                name: isUserLoggedIn.name,
                username: isUserLoggedIn.username,
                id: isUserLoggedIn.id
            });

            // Process any pending friend additions
            const pendingFriends = await getPendingFriendAdditions(isUserLoggedIn.id);
            if (pendingFriends.length > 0) {
                pendingFriends.forEach(friendId => addFriend(isUserLoggedIn.id, friendId));
                const friendIds = getFriendsList(isUserLoggedIn.id);
                const friends = getUsersByIds(friendIds);
                socket.emit('friendsList', friends);
            }

            // Send pending friend requests
            const requests = await getFriendRequests(isUserLoggedIn.id);
            if (requests.length > 0) {
                const requestsWithDetails = requests.map(req => ({
                    ...req,
                    fromUser: getUserById(req.from)
                }));
                socket.emit('friendRequests', requestsWithDetails);
            }

            // Deliver any pending key exchanges
            const pendingExchanges = await getPendingKeyExchanges(isUserLoggedIn.id);
            pendingExchanges.forEach(({ friendId, publicKey }) => {
                socket.emit('keyExchange', { friendId, publicKey });
            });

            // Send pending messages
            const pendingMessages = await getPendingMessages(isUserLoggedIn.id);
            if (pendingMessages.length > 0) {
                socket.emit('pending messages', pendingMessages);
                await clearPendingMessages(isUserLoggedIn.id);
            }
        } else {
            socket.emit('login-rejected');
        }
    })

    // User search handler
    socket.on('searchUsers', async (query) => {
        console.log("User search request:", query);
        const results = await searchUsers(query);
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

    socket.on('restoreFriendsList', (data) => {
        const { userId, friendIds } = data;
        friendIds.forEach(friendId => addFriend(userId, friendId));
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

    // Friend request handlers
    socket.on('sendFriendRequest', async (data) => {
        const { fromUserId, toUserId, senderPublicKey } = data;

        if (areFriends(fromUserId, toUserId)) {
            socket.emit('friendRequestSent', { success: false, message: 'Already friends' });
            return;
        }

        const result = await sendFriendRequest(fromUserId, toUserId, senderPublicKey);
        socket.emit('friendRequestSent', result);

        if (result.success && isUserOnline(toUserId)) {
            const recipientSocketId = getUserSocketId(toUserId);
            io.to(recipientSocketId).emit('newFriendRequest', {
                from: fromUserId,
                fromUser: getUserById(fromUserId),
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on('getFriendRequests', async (userId) => {
        const requests = await getFriendRequests(userId);
        const requestsWithDetails = requests.map(req => ({
            ...req,
            fromUser: getUserById(req.from)
        }));
        socket.emit('friendRequests', requestsWithDetails);
    });

    socket.on('acceptFriendRequest', async (data) => {
        const { userId, fromUserId, accepterPublicKey } = data;

        const result = await acceptFriendRequest(userId, fromUserId);

        if (result.success) {
            addFriend(userId, fromUserId);

            const friends = getUsersByIds(getFriendsList(userId));
            socket.emit('friendsList', friends);
            socket.emit('friendRequestAccepted', { success: true, friendId: fromUserId });

            if (result.senderPublicKey) {
                socket.emit('keyExchange', { friendId: fromUserId, publicKey: result.senderPublicKey });
            }

            if (isUserOnline(fromUserId)) {
                addFriend(fromUserId, userId);
                const requesterSocketId = getUserSocketId(fromUserId);
                io.to(requesterSocketId).emit('friendsList', getUsersByIds(getFriendsList(fromUserId)));
                io.to(requesterSocketId).emit('friendRequestAcceptedByOther', {
                    userId,
                    user: getUserById(userId)
                });
                if (accepterPublicKey) {
                    io.to(requesterSocketId).emit('keyExchange', { friendId: userId, publicKey: accepterPublicKey });
                }
            } else {
                await addPendingFriendAddition(fromUserId, userId);
                if (accepterPublicKey) {
                    await queueKeyExchange(fromUserId, userId, accepterPublicKey);
                }
            }

            const requests = await getFriendRequests(userId);
            socket.emit('friendRequests', requests.map(req => ({
                ...req,
                fromUser: getUserById(req.from)
            })));
        } else {
            socket.emit('friendRequestAccepted', result);
        }
    });

    socket.on('rejectFriendRequest', async (data) => {
        const { userId, fromUserId } = data;

        const result = await rejectFriendRequest(userId, fromUserId);
        socket.emit('friendRequestRejected', result);

        if (result.success) {
            const requests = await getFriendRequests(userId);
            socket.emit('friendRequests', requests.map(req => ({
                ...req,
                fromUser: getUserById(req.from)
            })));
        }
    });

    // Typing indicators
    socket.on('typing', (data) => {
        const { fromUserId, toUserId } = data;
        if (isUserOnline(toUserId)) {
            io.to(getUserSocketId(toUserId)).emit('typing', { fromUserId });
        }
    });

    socket.on('stop typing', (data) => {
        const { fromUserId, toUserId } = data;
        if (isUserOnline(toUserId)) {
            io.to(getUserSocketId(toUserId)).emit('stop typing', { fromUserId });
        }
    });

    // Read receipts
    socket.on('read receipt', (data) => {
        const { fromUserId, toUserId } = data;
        if (isUserOnline(toUserId)) {
            io.to(getUserSocketId(toUserId)).emit('message read', { byUserId: fromUserId });
        }
    });

    // Start chat with specific user (for WebRTC setup)
    socket.on("start chat", (data) => {
        const { fromUserId, toUserId } = data;
        console.log(`Start chat request: ${fromUserId} wants to chat with ${toUserId}`);

        if (isUserOnline(toUserId)) {
            const recipientSocketId = getUserSocketId(toUserId);
            const fromUser = getUserById(fromUserId);

            // Deterministic call ID so both peers agree on the same key
            const callId = [fromUserId, toUserId].sort().join(':');

            // Notify recipient that someone wants to chat
            io.to(recipientSocketId).emit("incoming chat", {
                from: fromUserId,
                fromName: fromUser ? fromUser.name : "Unknown"
            });

            // Confirm to sender and trigger P2P setup
            socket.emit("chat started", { with: toUserId });
            socket.emit("offerRTCConnection", { callId });
            io.to(recipientSocketId).emit("recieveRTCConnection", { callId });
        } else {
            socket.emit("user offline", { userId: toUserId });
        }
    });

    // WebRTC signaling handlers
    socket.on("webrtc-offer", (data) => {
        const { callId, offer, toUserId } = data;
        console.log("Received WebRTC offer for call:", callId, "to user:", toUserId);

        // Store the offer
        calls.set(callId, {
            offer: offer,
            offererId: socket.id,
            answererUserId: toUserId,
            iceCandidates: {
                offer: [],
                answer: [],
            },
        });

        // Send offer to specific user if online
        if (toUserId && isUserOnline(toUserId)) {
            const recipientSocketId = getUserSocketId(toUserId);
            io.to(recipientSocketId).emit("webrtc-offer", data);
        } else {
            // Broadcast to other users that a call is available (fallback)
            socket.broadcast.emit("webrtc-offer", data);
        }
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

    // Video call signaling - routed directly by userId
    socket.on("video-call-request", (data) => {
        const { fromUserId, toUserId } = data;
        if (isUserOnline(toUserId)) {
            const fromUser = getUserById(fromUserId);
            io.to(getUserSocketId(toUserId)).emit("video-call-incoming", {
                fromUserId,
                fromName: fromUser ? fromUser.name : "Unknown",
            });
        } else {
            socket.emit("video-call-error", { message: "User is offline" });
        }
    });

    socket.on("video-call-accepted", (data) => {
        const { fromUserId, toUserId } = data;
        if (isUserOnline(toUserId)) {
            io.to(getUserSocketId(toUserId)).emit("video-call-accepted", { fromUserId });
        }
    });

    socket.on("video-call-declined", (data) => {
        const { fromUserId, toUserId } = data;
        if (isUserOnline(toUserId)) {
            io.to(getUserSocketId(toUserId)).emit("video-call-declined", { fromUserId });
        }
    });

    socket.on("video-call-ended", (data) => {
        const { fromUserId, toUserId } = data;
        if (isUserOnline(toUserId)) {
            io.to(getUserSocketId(toUserId)).emit("video-call-ended", { fromUserId });
        }
    });

    socket.on("video-rtc-offer", (data) => {
        const { toUserId, offer } = data;
        if (isUserOnline(toUserId)) {
            io.to(getUserSocketId(toUserId)).emit("video-rtc-offer", { offer });
        }
    });

    socket.on("video-rtc-answer", (data) => {
        const { toUserId, answer } = data;
        if (isUserOnline(toUserId)) {
            io.to(getUserSocketId(toUserId)).emit("video-rtc-answer", { answer });
        }
    });

    socket.on("video-rtc-ice", (data) => {
        const { toUserId, candidate } = data;
        if (isUserOnline(toUserId)) {
            io.to(getUserSocketId(toUserId)).emit("video-rtc-ice", { candidate });
        }
    });

    socket.on('change-name', async (data) => {
        const { userId, newName } = data;
        const result = await updateUserName(userId, newName);
        socket.emit('name-changed', result);
    });

    socket.on('change-password', async (data) => {
        const { userId, currentPassword, newPassword } = data;
        const result = await updatePassword(userId, currentPassword, newPassword);
        socket.emit('password-changed', result);
    });

}