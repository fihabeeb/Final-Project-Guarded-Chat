import { socket } from "./socketIO.js";
import { addMessage } from './chatHistoryHandler.js';
// Login page handling
const loginPage = document.getElementById('loginPage');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

let loggedIn = false;
export function autoLogin() {
    // Skip login if already logged in
    if (loggedIn) {
        loginPage.style.display = 'none';
        appContainer.classList.remove('hidden');
        return;
    }
    const storedUserName = localStorage.getItem('username')
    if (storedUserName == null) {
        localStorage.setItem('username', '');
        return;
    }

    const storedPassword = localStorage.getItem('password');
    if (storedPassword == null) {
        localStorage.setItem('password', '');
        return;
    }
    attemptLoginViaServer(storedUserName, storedPassword);
}

function attemptLoginViaServer(username, password) {
    tempPassword = password;
    socket.emit('login-request', {
        userName: username,
        password: password
    });
}

let tempPassword;
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        loginError.textContent = 'Please fill in all fields';
        loginError.style.display = 'block';
        return;
    }
    attemptLoginViaServer(username, password);


});

export function ifLoginApproved() {
    socket.on('login-approved', (user) => {
        console.log("Logged in: " + user.name);

        // Hide login page and show the app
        loginPage.style.display = 'none';
        appContainer.classList.remove('hidden');

        // Use the username in the sidebar header and settings profile
        document.querySelector('.sidebar-header h2').textContent = `Guarded Chat`;
        document.getElementById('settingsUsername').textContent = user.name;
        document.getElementById('settingsAvatar').textContent = user.name[0].toUpperCase();
        /// TO DO: Probably put this in cache so the server is not overloaded with login requests everytime a user accidentaly refreshes the page and that
        loggedIn = true;
        addMessage('System', `Logged in as ${user.name}`, 'system');

        localStorage.setItem('username', user.name);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('password', tempPassword);
        tempPassword = null;
    })
}