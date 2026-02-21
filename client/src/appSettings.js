// Settings modal handling
const settingsModal = document.getElementById('settingsModal');
const settingsButton = document.getElementById('settingsButton');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const logoutButton = document.getElementById('logoutButton');

export function settingsListeners() {
    settingsButton.onclick = () => {
        settingsModal.classList.add('active');
    };

    closeSettingsButton.onclick = () => {
        settingsModal.classList.remove('active');
    };

    // Close settings when clicking the backdrop
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('active');
        }
    });

    logoutButton.onclick = () => {
        loggedIn = false;
        settingsModal.classList.remove('active');
        appContainer.classList.add('hidden');
        loginPage.style.display = '';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
    };
}