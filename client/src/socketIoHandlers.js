export function socketHandlers(socket) {
    // Socket.io connection handlers
    socket.on('connect', () => {
        console.log('Connected to server!');
        updateConnectionStatus('online');
        addMessage('System', 'Connected to server', 'system');
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateConnectionStatus('offline');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus('offline');
        addMessage('System', 'Disconnected from server', 'system');
    });
}