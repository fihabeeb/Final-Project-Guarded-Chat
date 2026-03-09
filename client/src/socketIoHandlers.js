import { addMessage } from './chatHistoryHandler.js';
import { updateConnectionStatus } from './uiScript.js';

export function socketHandlers(socket) {
    // Socket.io connection handlers
    socket.on('connect', () => {
        updateConnectionStatus('online');
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateConnectionStatus('offline');
    });

    socket.on('disconnect', () => {
        updateConnectionStatus('offline');
    });
}