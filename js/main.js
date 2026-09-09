import { initKastenCarousel } from './modules/kasten.js';
import { initKioskCarousel } from './modules/kiosk.js';
import { initKasseModule } from './modules/kasse.js';
import { openModule, closeModule } from './modules/modal.js';

// Konfiguration
const ADMIN_PASSWORD = "luchse2026"; // Das gewünschte Admin-Passwort hier anpassen

document.addEventListener('DOMContentLoaded', () => {
    // Initialisierungen
    initKastenCarousel();
    initKioskCarousel();
    initKasseModule();
    checkAdminState();

    // Event Listener für Modal-Öffner
    document.getElementById('btn-open-strafen')?.addEventListener('click', () => openModule('strafen'));
    document.getElementById('btn-open-aemter')?.addEventListener('click', () => openModule('aemter'));
    document.getElementById('btn-open-logbuch')?.addEventListener('click', () => openModule('logbuch'));
    document.getElementById('btn-open-offen')?.addEventListener('click', () => openModule('offeneStrafen'));

    // Admin Login / Logout Button in Header
    const adminBtn = document.getElementById('btn-admin-login');
    adminBtn?.addEventListener('click', () => {
        if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
            logoutAdmin();
        } else {
            openModule('admin');
        }
    });

    // Close Button im Admin Modal
    document.getElementById('btn-close-modal')?.addEventListener('click', () => {
        closeModule('admin');
        resetLoginForm();
    });

    // Formular Absenden
    const loginForm = document.getElementById('admin-login-form');
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const passwordInput = document.getElementById('admin-password');
        const errorMsg = document.getElementById('login-error-msg');

        if (passwordInput.value === ADMIN_PASSWORD) {
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            checkAdminState();
            closeModule('admin');
            resetLoginForm();
        } else {
            errorMsg?.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
        }
    });

    // Event Listener für Schließen-Buttons aller Modals
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-close');
            if (target) closeModule(target);
        });
    });

    // Matchday Generator Start-Button
    document.getElementById('btn-start-generator')?.addEventListener('click', () => {
        window.location.href = './matchday-generator/index.html';
    });
});

// Admin-Status prüfen und UI anpassen
function checkAdminState() {
    const isAdmin = sessionStorage.getItem('isAdminLoggedIn') === 'true';
    const adminBtn = document.getElementById('btn-admin-login');

    if (adminBtn) {
        if (isAdmin) {
            adminBtn.textContent = '🔓 Admin Logout';
            adminBtn.classList.add('is-logged-in');
        } else {
            adminBtn.textContent = '🔒 Admin Login';
            adminBtn.classList.remove('is-logged-in');
        }
    }
}

// Logout durchführen
function logoutAdmin() {
    sessionStorage.removeItem('isAdminLoggedIn');
    checkAdminState();
}

// Login-Formular zurücksetzen
function resetLoginForm() {
    const passwordInput = document.getElementById('admin-password');
    const errorMsg = document.getElementById('login-error-msg');
    if (passwordInput) passwordInput.value = '';
    if (errorMsg) errorMsg.classList.add('hidden');
}