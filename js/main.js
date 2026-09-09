import { initKastenCarousel } from './modules/kasten.js';
import { initKioskCarousel } from './modules/kiosk.js';
import { initKasseModule, renderLogbuchModal } from './modules/kasse.js';
import { openModule, closeModule, renderOffeneStrafenModal } from './modules/modal.js';
import { getStoredToken, setStoredToken, removeStoredToken, validateToken } from './services/github.js';

document.addEventListener('DOMContentLoaded', async () => {
    initKastenCarousel();
    initKioskCarousel();
    await initKasseModule();

    // Modals & Navigation
    document.getElementById('btn-open-strafen')?.addEventListener('click', () => openModule('strafen'));
    document.getElementById('btn-open-aemter')?.addEventListener('click', () => openModule('aemter'));
    document.getElementById('btn-open-logbuch')?.addEventListener('click', () => openModule('logbuch'));
    
    // Klick auf Kachel "Offene Strafen"
    document.getElementById('btn-open-offen')?.addEventListener('click', (e) => {
        // Falls auf das Zahnrad geklickt wurde, nicht das normale Offene-Strafen-Modal öffnen
        if (e.target.closest('#btn-admin-manage-strafen')) return;
        openModule('offeneStrafen');
    });

    // Klick auf Zahnrad -> Strafen-Eintragen-Modal öffnen
    const gearBtn = document.getElementById('btn-admin-manage-strafen');
    if (gearBtn) {
        gearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const addModal = document.getElementById('add-strafe-modal');
            if (addModal) {
                addModal.classList.remove('hidden');
                addModal.classList.add('active');
            }
        });
    }

    // Klick auf Grünes Plus (Kassenstand) -> Freie Buchung Modal öffnen
    const buchungBtn = document.getElementById('btn-admin-manage-buchung');
    if (buchungBtn) {
        buchungBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const buchungModal = document.getElementById('buchung-modal');
            if (buchungModal) {
                buchungModal.classList.remove('hidden');
                buchungModal.classList.add('active');
            }
        });
    }

    // Erst NACHDEM die Listener registriert sind, den Admin-Status prüfen & anzeigen
    checkAdminState();

    // Admin Login / Logout
    const adminBtn = document.getElementById('btn-admin-login');
    adminBtn?.addEventListener('click', () => {
        if (getStoredToken()) {
            if (confirm("Möchtest du dich abmelden? Der Token wird aus dem Browser gelöscht.")) {
                logoutAdmin();
            }
        } else {
            openModule('admin');
        }
    });

    // Modals schließen
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', (e) => {
            const closeTarget = e.target.getAttribute('data-close');
            if (closeTarget === 'addStrafe') {
                const modal = document.getElementById('add-strafe-modal');
                if (modal) {
                    modal.classList.remove('active');
                    modal.classList.add('hidden');
                }
            } else if (closeTarget === 'buchung') {
                const modal = document.getElementById('buchung-modal');
                if (modal) {
                    modal.classList.remove('active');
                    modal.classList.add('hidden');
                }
            } else {
                const target = closeTarget || (e.target.id === 'btn-close-modal' ? 'admin' : null);
                if (target) {
                    closeModule(target);
                    if (target === 'admin') resetLoginForm();
                }
            }
        });
    });

    // Login Form
    const loginForm = document.getElementById('admin-login-form');
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tokenInput = document.getElementById('admin-token-input');
        const errorMsg = document.getElementById('login-error-msg');
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        const inputToken = tokenInput.value.trim();
        if (!inputToken) return;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Prüfe Token...";
        }

        const result = await validateToken(inputToken);

        if (result.ok) {
            setStoredToken(inputToken);
            checkAdminState();
            renderLogbuchModal();
            renderOffeneStrafenModal();
            closeModule('admin');
            resetLoginForm();
            alert("Erfolgreich als Admin angemeldet!");
        } else {
            if (errorMsg) {
                errorMsg.textContent = result.msg;
                errorMsg.classList.remove('hidden');
            } else {
                alert(result.msg);
            }
        }

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Anmelden & Speichern";
        }
    });

    document.getElementById('btn-start-generator')?.addEventListener('click', () => {
        window.location.href = './matchday-generator/index.html';
    });
});

export function checkAdminState() {
    const isAdmin = Boolean(getStoredToken());
    const adminBtn = document.getElementById('btn-admin-login');
    const gearBtn = document.getElementById('btn-admin-manage-strafen');
    const buchungBtn = document.getElementById('btn-admin-manage-buchung');

    // Admin-Buttons anzeigen / ausblenden
    if (gearBtn) {
        gearBtn.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important');
    }
    if (buchungBtn) {
        buchungBtn.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important');
    }

    // Login/Logout Button steuern
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

function logoutAdmin() {
    removeStoredToken();
    checkAdminState();
    renderLogbuchModal();
    renderOffeneStrafenModal();
}

function resetLoginForm() {
    const tokenInput = document.getElementById('admin-token-input');
    const errorMsg = document.getElementById('login-error-msg');
    if (tokenInput) tokenInput.value = '';
    if (errorMsg) errorMsg.classList.add('hidden');
}