
// Update connection status indicator

const connectionStatus = document.getElementById('connectionStatus');
export function updateConnectionStatus(status) {
  connectionStatus.textContent = status;
  connectionStatus.style.color = status === 'online' ? '#00a884' : '#8696a0';
}
