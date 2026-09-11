import { initKastenModule, addStrafkastenEntry } from './modules/kasten.js'; // [source: 6]
import { initKioskCarousel } from './modules/kiosk.js'; // [source: 6]
import { initKasseModule, renderLogbuchModal } from './modules/kasse.js'; // [source: 6]
import { openModule, closeModule, renderOffeneStrafenModal, renderOffeneKaestenModal } from './modules/modal.js'; // [source: 6]
import { getStoredToken, setStoredToken, removeStoredToken, validateToken } from './services/github.js'; // [source: 6]
import { strafenData } from './data.js'; // [source: 6]
import { initVideosModule, addVideoEntry, renderVideosModal } from './modules/videos.js'; // [source: 6]
import { renderSeasonArchiveModal } from './modules/videos.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Unabhängige Karussells & Module initialisieren [source: 6]
    initKioskCarousel(); // [source: 6]

    try { await initKastenModule(); } catch (err) { console.error(err); } // [source: 6]
    try { await initKasseModule(); } catch (err) { console.error(err); } // [source: 6]
    try { await initVideosModule(); } catch (err) { console.error(err); } // [source: 6]

    // --- EVENT LISTENER ---

    // Navigation & Modals öffnen [source: 6]
    document.getElementById('btn-open-strafen')?.addEventListener('click', () => openModule('strafen')); // [source: 6]
    document.getElementById('btn-open-aemter')?.addEventListener('click', () => openModule('aemter')); // [source: 6]
    document.getElementById('btn-open-logbuch')?.addEventListener('click', () => openModule('logbuch')); // [source: 6]
    document.getElementById('btn-open-videos')?.addEventListener('click', () => openModule('videos')); // [source: 6]

    // Live-Suche im Videoarchiv
    document.getElementById('video-search-input')?.addEventListener('input', () => {
        renderVideosModal();
    });

    // Klick auf Kachel "Offene Strafen" [source: 6]
    document.getElementById('btn-open-offen')?.addEventListener('click', (e) => { // [source: 6]
        if (e.target.closest('#btn-admin-manage-strafen')) return; // [source: 6]
        openModule('offeneStrafen'); // [source: 6]
    });

    // Klick auf Kachel "Offene Strafkästen" [source: 6]
    document.getElementById('btn-open-offene-kaesten')?.addEventListener('click', (e) => { // [source: 6]
        if (e.target.closest('#btn-admin-manage-kaesten')) return; // [source: 6]
        openModule('offeneKaesten'); // [source: 6]
    });

    // Admin Plus-Button auf der Kasten-Kachel [source: 6]
    document.getElementById('btn-admin-manage-kaesten')?.addEventListener('click', (e) => { // [source: 6]
        e.stopPropagation(); // [source: 6]
        populateStrafkastenSpielerSelect(); // [source: 6]
        openModule('addStrafkasten'); // [source: 6]
    });

    // Admin Plus-Button (Strafen-Eintragen) [source: 6]
    document.getElementById('btn-admin-manage-strafen')?.addEventListener('click', (e) => { // [source: 6]
        e.stopPropagation(); // [source: 6]
        e.preventDefault(); // [source: 6]
        openModule('addStrafe'); // [source: 6]
    });

    // Admin Zahnrad-Button (Freie Buchung) [source: 6]
    document.getElementById('btn-admin-manage-buchung')?.addEventListener('click', (e) => { // [source: 6]
        e.stopPropagation(); // [source: 6]
        e.preventDefault(); // [source: 6]
        openModule('buchung'); // [source: 6]
    });

    // Admin Plus-Button im Videoarchiv Header [source: 6]
    document.getElementById('btn-admin-manage-videos')?.addEventListener('click', (e) => { // [source: 6]
        e.stopPropagation(); // [source: 6]
        openModule('addVideo'); // [source: 6]
    });

    // Admin Login / Logout Toggle [source: 6]
    document.getElementById('btn-admin-login')?.addEventListener('click', () => { // [source: 6]
        if (getStoredToken()) { // [source: 6]
            if (confirm("Möchtest du dich abmelden? Der Token wird aus dem Browser gelöscht.")) { // [source: 6]
                logoutAdmin(); // [source: 6]
            }
        } else {
            openModule('admin'); // [source: 6]
        }
    });

    // Klick auf Saison-Ordner-Kachel öffnet das Sub-Modal
    document.querySelector('#videos-modal .playlist-card')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModule('videos');
        openModule('seasonArchive');
    });

    // Zurück-Button im Saison-Archiv führt zurück ins Haupt-Video-Modal
    document.getElementById('btn-back-to-videos')?.addEventListener('click', () => {
        closeModule('seasonArchive');
        openModule('videos');
    });

    // Live-Suche im Saison-Archiv
    document.getElementById('season-search-input')?.addEventListener('input', () => {
        renderSeasonArchiveModal('2026/2027');
    });

    // Formular: Neues Video durch Admin speichern [source: 6]
    document.getElementById('form-add-video')?.addEventListener('submit', async (e) => { // [source: 6]
        e.preventDefault(); // [source: 6]

        const title = document.getElementById('video-title-input')?.value; // [source: 6]
        const sub = document.getElementById('video-sub-input')?.value; // [source: 6]
        const url = document.getElementById('video-url-input')?.value; // [source: 6]

        if (!title || !url) return; // [source: 6]

        const submitBtn = e.target.querySelector('button[type="submit"]'); // [source: 6]
        if (submitBtn) { // [source: 6]
            submitBtn.textContent = 'Speichere in GitHub...'; // [source: 6]
            submitBtn.disabled = true; // [source: 6]
        }

        const success = await addVideoEntry(title, sub, url); // [source: 6]
        if (success) { // [source: 6]
            closeModule('addVideo'); // [source: 6]
            e.target.reset(); // [source: 6]
            renderVideosModal(); // [source: 6]
            alert("Video erfolgreich in GitHub gespeichert!"); // [source: 6]
        }

        if (submitBtn) { // [source: 6]
            submitBtn.textContent = 'Video auf GitHub Speichern'; // [source: 6]
            submitBtn.disabled = false; // [source: 6]
        }
    });

    // Modals schließen [source: 6]
    document.querySelectorAll('.modal-close').forEach(button => { // [source: 6]
        button.addEventListener('click', (e) => { // [source: 6]
            const closeTarget = e.target.getAttribute('data-close') || (e.target.id === 'btn-close-modal' ? 'admin' : null); // [source: 6]
            if (closeTarget) { // [source: 6]
                closeModule(closeTarget); // [source: 6]
                if (closeTarget === 'admin') resetLoginForm(); // [source: 6]
            }
        });
    });

    // Login Formular Submit [source: 6]
    const loginForm = document.getElementById('admin-login-form'); // [source: 6]
    loginForm?.addEventListener('submit', async (e) => { // [source: 6]
        e.preventDefault(); // [source: 6]
        const tokenInput = document.getElementById('admin-token-input'); // [source: 6]
        const errorMsg = document.getElementById('login-error-msg'); // [source: 6]
        const submitBtn = loginForm.querySelector('button[type="submit"]'); // [source: 6]

        const inputToken = tokenInput?.value.trim(); // [source: 6]
        if (!inputToken) return; // [source: 6]

        if (submitBtn) { // [source: 6]
            submitBtn.disabled = true; // [source: 6]
            submitBtn.textContent = "Prüfe Token..."; // [source: 6]
        }

        const result = await validateToken(inputToken); // [source: 6]

        if (result.ok) { // [source: 6]
            setStoredToken(inputToken); // [source: 6]
            checkAdminState(); // [source: 6]
            renderLogbuchModal(); // [source: 6]
            renderOffeneStrafenModal(); // [source: 6]
            renderOffeneKaestenModal(); // [source: 6]
            closeModule('admin'); // [source: 6]
            resetLoginForm(); // [source: 6]
            alert("Erfolgreich als Admin angemeldet!"); // [source: 6]
        } else {
            if (errorMsg) { // [source: 6]
                errorMsg.textContent = result.msg; // [source: 6]
                errorMsg.classList.remove('hidden'); // [source: 6]
            } else {
                alert(result.msg); // [source: 6]
            }
        }

        if (submitBtn) { // [source: 6]
            submitBtn.disabled = false; // [source: 6]
            submitBtn.textContent = "Anmelden & Speichern"; // [source: 6]
        }
    });

    // Formular-Submit: Neuen Kasten / Kabinenfest speichern [source: 6]
    document.getElementById('form-add-strafkasten')?.addEventListener('submit', async (e) => { // [source: 6]
        e.preventDefault(); // [source: 6]

        const typ = document.querySelector('input[name="strafkastenArt"]:checked')?.value || 'KASTEN'; // [source: 6]
        const spieler = document.getElementById('strafkasten-spieler')?.value; // [source: 6]
        const grund = document.getElementById('strafkasten-grund')?.value; // [source: 6]
        const anzahl = parseInt(document.getElementById('strafkasten-anzahl')?.value, 10) || 1; // [source: 6]

        if (!spieler || !grund) return; // [source: 6]

        const submitBtn = e.target.querySelector('button[type="submit"]'); // [source: 6]
        if (submitBtn) { // [source: 6]
            submitBtn.textContent = 'Speichere...'; // [source: 6]
            submitBtn.disabled = true; // [source: 6]
        }

        const success = await addStrafkastenEntry(spieler, grund, anzahl, typ); // [source: 6]
        if (success) { // [source: 6]
            closeModule('addStrafkasten'); // [source: 6]
            e.target.reset(); // [source: 6]

            const defaultRadio = document.querySelector('input[name="strafkastenArt"][value="KASTEN"]'); // [source: 6]
            if (defaultRadio) { // [source: 6]
                defaultRadio.checked = true; // [source: 6]
                defaultRadio.dispatchEvent(new Event('change')); // [source: 6]
            }

            renderOffeneKaestenModal(); // [source: 6]
        }

        if (submitBtn) { // [source: 6]
            submitBtn.textContent = 'Eintragen & Speichern'; // [source: 6]
            submitBtn.disabled = false; // [source: 6]
        }
    });

    document.getElementById('btn-start-generator')?.addEventListener('click', () => { // [source: 6]
        window.location.href = './matchday-generator/index.html'; // [source: 6]
    });

    // Admin UI-Status prüfen [source: 6]
    checkAdminState(); // [source: 6]
});

// Befüllt die Spieler-Auswahl im Kasten-Modal [source: 6]
function populateStrafkastenSpielerSelect() { // [source: 6]
    const playerSelect = document.getElementById('strafkasten-spieler'); // [source: 6]
    if (playerSelect && strafenData?.spieler) { // [source: 6]
        playerSelect.innerHTML = '<option value="">-- Spieler auswählen --</option>' + // [source: 6]
            strafenData.spieler.map(p => `<option value="${p}">${p}</option>`).join(''); // [source: 6]
    }
}

// Steuert Sichtbarkeit der Admin-Buttons [source: 6]
export function checkAdminState() { // [source: 6]
    const isAdmin = Boolean(getStoredToken()); // [source: 6]
    const adminBtn = document.getElementById('btn-admin-login'); // [source: 6]
    const gearBtn = document.getElementById('btn-admin-manage-strafen'); // [source: 6]
    const buchungBtn = document.getElementById('btn-admin-manage-buchung'); // [source: 6]
    const kaestenBtn = document.getElementById('btn-admin-manage-kaesten'); // [source: 6]
    const videosBtn = document.getElementById('btn-admin-manage-videos'); // [source: 6]

    if (gearBtn) gearBtn.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important'); // [source: 6]
    if (buchungBtn) buchungBtn.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important'); // [source: 6]
    if (kaestenBtn) kaestenBtn.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important'); // [source: 6]
    if (videosBtn) videosBtn.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important'); // [source: 6]

    if (adminBtn) { // [source: 6]
        if (isAdmin) { // [source: 6]
            adminBtn.textContent = '🔓 Admin Logout'; // [source: 6]
            adminBtn.classList.add('is-logged-in'); // [source: 6]
        } else {
            adminBtn.textContent = '🔒 Admin Login'; // [source: 6]
            adminBtn.classList.remove('is-logged-in'); // [source: 6]
        }
    }
}

function logoutAdmin() { // [source: 6]
    removeStoredToken(); // [source: 6]
    checkAdminState(); // [source: 6]
    renderLogbuchModal(); // [source: 6]
    renderOffeneStrafenModal(); // [source: 6]
    renderOffeneKaestenModal(); // [source: 6]
}

function resetLoginForm() { // [source: 6]
    const tokenInput = document.getElementById('admin-token-input'); // [source: 6]
    const errorMsg = document.getElementById('login-error-msg'); // [source: 6]
    if (tokenInput) tokenInput.value = ''; // [source: 6]
    if (errorMsg) errorMsg.classList.add('hidden'); // [source: 6]
}