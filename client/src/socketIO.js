import { io } from 'socket.io-client'

// Connect to the Express server running on port 1111
//const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:5000';
export const socket = io(SOCKET_URL);