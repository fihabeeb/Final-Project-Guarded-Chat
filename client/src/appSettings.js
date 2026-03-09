import { logout } from './login.js';

const settingsModal = document.getElementById('settingsModal');
const settingsButton = document.getElementById('settingsButton');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const logoutButton = document.getElementById('logoutButton');

const DEFAULT_SETTINGS = {
    theme: 'dark',
    fontSize: 'medium',
    notifications: true,
    sound: true,
    enterToSend: true,
    readReceipts: true,
};

const FONT_SIZES = { small: '12.5px', medium: '14.5px', large: '17px' };

export function loadSettings() {
    const stored = localStorage.getItem('appSettings');
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
    localStorage.setItem('appSettings', JSON.stringify(settings));
}

export function applySettings(settings) {
    // Theme
    document.body.classList.remove('theme-light');
    if (settings.theme === 'light') {
        document.body.classList.add('theme-light');
    } else if (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.body.classList.add('theme-light');
    }

    // Font size
    document.documentElement.style.setProperty('--msg-font-size', FONT_SIZES[settings.fontSize] || FONT_SIZES.medium);
}

export function getEnterToSend() {
    return loadSettings().enterToSend;
}

export function playMessageSound() {
    if (!loadSettings().sound) return;
    try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.12);
    } catch (e) {}
}

export function showNotification(title, body) {
    if (!loadSettings().notifications) return;
    if (document.hasFocus()) return;
    if (Notification.permission === 'granted') {
        new Notification(title, { body });
    }
}

export function settingsListeners() {
    const settings = loadSettings();
    applySettings(settings);

    // Sync UI with saved settings
    settingsModal.querySelector('[data-setting="theme"]').value = settings.theme;
    settingsModal.querySelector('[data-setting="fontSize"]').value = settings.fontSize;
    settingsModal.querySelector('[data-setting="notifications"]').checked = settings.notifications;
    settingsModal.querySelector('[data-setting="sound"]').checked = settings.sound;
    settingsModal.querySelector('[data-setting="enterToSend"]').checked = settings.enterToSend;
    const receiptEl = settingsModal.querySelector('[data-setting="readReceipts"]');
    if (receiptEl) receiptEl.checked = settings.readReceipts;

    settingsButton.onclick = () => settingsModal.classList.add('active');
    closeSettingsButton.onclick = () => settingsModal.classList.remove('active');

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.remove('active');
    });

    logoutButton.onclick = () => {
        settingsModal.classList.remove('active');
        logout();
    };

    // Handle any setting change
    settingsModal.addEventListener('change', (e) => {
        const key = e.target.dataset.setting;
        if (!key) return;

        const current = loadSettings();
        current[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

        if (key === 'notifications' && current.notifications) {
            Notification.requestPermission();
        }

        saveSettings(current);
        applySettings(current);
    });
}
