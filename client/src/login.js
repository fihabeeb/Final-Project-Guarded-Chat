import { socket } from "./socketIO.js";
import { addMessage } from './chatHistoryHandler.js';
import { loadFriendsList } from './sidebar.js';
import { setCurrentUserId } from './friendRequests.js';
import { setChatManager } from './chatManager.js';

const loginPage = document.getElementById('loginPage');
const appContainer = document.getElementById('appContainer');

// Login elements
const loginCard = document.getElementById('loginCard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Register elements
const registerCard = document.getElementById('registerCard');
const registerForm = document.getElementById('registerForm');
const registerError = document.getElementById('registerError');

// Toggle between login and register cards
document.getElementById('showRegister').addEventListener('click', () => {
    loginCard.style.display = 'none';
    registerCard.style.display = 'block';
    registerError.style.display = 'none';
});

document.getElementById('showLogin').addEventListener('click', () => {
    registerCard.style.display = 'none';
    loginCard.style.display = 'block';
    loginError.style.display = 'none';
});

// ── Login ────────────────────────────────────────────────────────────────────

let loggedIn = false;
let tempPassword;

export function autoLogin() {
    if (loggedIn) {
        loginPage.style.display = 'none';
        appContainer.classList.remove('hidden');
        return;
    }
    const storedUserName = localStorage.getItem('username');
    const storedPassword = localStorage.getItem('password');
    if (!storedUserName || !storedPassword) return;
    attemptLoginViaServer(storedUserName, storedPassword);
}

function attemptLoginViaServer(username, password) {
    tempPassword = password;
    socket.emit('login-request', { userName: username, password });
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        loginError.textContent = 'Please fill in all fields';
        loginError.style.display = 'block';
        return;
    }
    loginError.style.display = 'none';
    attemptLoginViaServer(username, password);
});

// ── Register ─────────────────────────────────────────────────────────────────

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const name = document.getElementById('registerName').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerPasswordConfirm').value;

    if (!username || !name || !password || !confirm) {
        showRegisterError('Please fill in all fields');
        return;
    }
    if (password !== confirm) {
        showRegisterError('Passwords do not match');
        return;
    }

    registerError.style.display = 'none';
    socket.emit('register-request', { username, name, password });
});

socket.on('register-approved', (user) => {
    // Log the user straight in after successful registration
    tempPassword = document.getElementById('registerPassword').value;
    onLoginSuccess(user);
});

socket.on('register-error', (data) => {
    showRegisterError(data.message);
});

function showRegisterError(msg) {
    registerError.textContent = msg;
    registerError.style.display = 'block';
}

// ── Shared post-login logic ───────────────────────────────────────────────────

function onLoginSuccess(user) {
    loginPage.style.display = 'none';
    appContainer.classList.remove('hidden');

    document.getElementById('settingsUsername').textContent = user.name;
    document.getElementById('settingsAvatar').textContent = user.name[0].toUpperCase();

    loggedIn = true;
    addMessage('System', `Logged in as ${user.name}`, 'system');

    localStorage.setItem('username', user.username);
    localStorage.setItem('userId', user.id);
    localStorage.setItem('password', tempPassword);
    tempPassword = null;

    setCurrentUserId(user.id);
    setChatManager(user.id);
    loadFriendsList(user.id);
}

export function ifLoginApproved() {
    socket.on('login-approved', (user) => {
        console.log("Logged in: " + user.name);
        onLoginSuccess(user);
    });

    socket.on('login-rejected', () => {
        loginError.textContent = 'Invalid username or password';
        loginError.style.display = 'block';
    });
}
