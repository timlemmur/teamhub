import { initKastenModule, addStrafkastenEntry } from './modules/kasten.js';
import { initKioskCarousel } from './modules/kiosk.js';
import { initKasseModule, renderLogbuchModal } from './modules/kasse.js';
import { openModule, closeModule, renderOffeneStrafenModal, renderOffeneKaestenModal } from './modules/modal.js';
import { getStoredToken, setStoredToken, removeStoredToken, validateToken } from './services/github.js';
import { strafenData } from './data.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Unabhängige Karussells & Module initialisieren
    initKioskCarousel();

    // 2. Daten async aus GitHub laden (Fehler fangen, damit das Dashboard nicht blockiert)
    try {
        await initKastenModule();
    } catch (err) {
        console.error("Fehler beim Initialisieren des Kasten-Moduls:", err);
    }

    try {
        await initKasseModule();
    } catch (err) {
        console.error("Fehler beim Initialisieren des Kasse-Moduls:", err);
    }

    // --- EVENT LISTENER ---

    // Navigation & Modals öffnen
    document.getElementById('btn-open-strafen')?.addEventListener('click', () => openModule('strafen'));
    document.getElementById('btn-open-aemter')?.addEventListener('click', () => openModule('aemter'));
    document.getElementById('btn-open-logbuch')?.addEventListener('click', () => openModule('logbuch'));

    // Klick auf Kachel "Offene Strafen"
    document.getElementById('btn-open-offen')?.addEventListener('click', (e) => {
        if (e.target.closest('#btn-admin-manage-strafen')) return;
        openModule('offeneStrafen');
    });

    // Klick auf Kachel "Offene Strafkästen"
    document.getElementById('btn-open-offene-kaesten')?.addEventListener('click', (e) => {
        if (e.target.closest('#btn-admin-manage-kaesten')) return;
        openModule('offeneKaesten');
    });

    // Admin Plus-Button auf der Kasten-Kachel
    document.getElementById('btn-admin-manage-kaesten')?.addEventListener('click', (e) => {
        e.stopPropagation();
        populateStrafkastenSpielerSelect();
        openModule('addStrafkasten');
    });

    // Admin Plus-Button (Strafen-Eintragen)
    document.getElementById('btn-admin-manage-strafen')?.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openModule('addStrafe');
    });

    // Admin Zahnrad-Button (Freie Buchung)
    document.getElementById('btn-admin-manage-buchung')?.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openModule('buchung');
    });

    // Admin Login / Logout Toggle
    document.getElementById('btn-admin-login')?.addEventListener('click', () => {
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
            const closeTarget = e.target.getAttribute('data-close') || (e.target.id === 'btn-close-modal' ? 'admin' : null);
            if (closeTarget) {
                closeModule(closeTarget);
                if (closeTarget === 'admin') resetLoginForm();
            }
        });
    });

    // Login Formular Submit
    const loginForm = document.getElementById('admin-login-form');
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tokenInput = document.getElementById('admin-token-input');
        const errorMsg = document.getElementById('login-error-msg');
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        const inputToken = tokenInput?.value.trim();
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
            renderOffeneKaestenModal();
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

// Formular-Submit: Neuen Kasten / Kabinenfest speichern
    document.getElementById('form-add-strafkasten')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Wert des ausgewählten Radio-Buttons ("KASTEN" oder "KABINENFEST") holen
        const typ = document.querySelector('input[name="strafkastenArt"]:checked')?.value || 'KASTEN';
        const spieler = document.getElementById('strafkasten-spieler')?.value;
        const grund = document.getElementById('strafkasten-grund')?.value;
        const anzahl = parseInt(document.getElementById('strafkasten-anzahl')?.value, 10) || 1;

        if (!spieler || !grund) return;

        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Speichere...';
            submitBtn.disabled = true;
        }

        const success = await addStrafkastenEntry(spieler, grund, anzahl, typ);
        if (success) {
            closeModule('addStrafkasten');
            e.target.reset();

            // Toggle wieder auf Standard "Kasten" zurücksetzen
            const defaultRadio = document.querySelector('input[name="strafkastenArt"][value="KASTEN"]');
            if (defaultRadio) {
                defaultRadio.checked = true;
                defaultRadio.dispatchEvent(new Event('change'));
            }

            renderOffeneKaestenModal();
        }

        if (submitBtn) {
            submitBtn.textContent = 'Eintragen & Speichern';
            submitBtn.disabled = false;
        }
    });

    document.getElementById('btn-start-generator')?.addEventListener('click', () => {
        window.location.href = './matchday-generator/index.html';
    });

    // Admin UI-Status prüfen
    checkAdminState();
});

// Befüllt die Spieler-Auswahl im Kasten-Modal
function populateStrafkastenSpielerSelect() {
    const playerSelect = document.getElementById('strafkasten-spieler');
    if (playerSelect && strafenData?.spieler) {
        playerSelect.innerHTML = '<option value="">-- Spieler auswählen --</option>' +
            strafenData.spieler.map(p => `<option value="${p}">${p}</option>`).join('');
    }
}

// Steuert Sichtbarkeit der Admin-Buttons
export function checkAdminState() {
    const isAdmin = Boolean(getStoredToken());
    const adminBtn = document.getElementById('btn-admin-login');
    const gearBtn = document.getElementById('btn-admin-manage-strafen');
    const buchungBtn = document.getElementById('btn-admin-manage-buchung');
    const kaestenBtn = document.getElementById('btn-admin-manage-kaesten');

    if (gearBtn) gearBtn.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important');
    if (buchungBtn) buchungBtn.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important');
    if (kaestenBtn) kaestenBtn.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important');

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
    renderOffeneKaestenModal();
}

function resetLoginForm() {
    const tokenInput = document.getElementById('admin-token-input');
    const errorMsg = document.getElementById('login-error-msg');
    if (tokenInput) tokenInput.value = '';
    if (errorMsg) errorMsg.classList.add('hidden');
}