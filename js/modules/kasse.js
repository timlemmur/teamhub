import { fetchStrafenFromRepo, saveStrafenToRepo, getStoredToken } from '../services/github.js';

let strafenLogbook = [];

/**
 * Initialisiert das Kassenmodul (Laden der JSON-Daten & Formular-Binding)
 */
export async function initKasseModule() {
    // 1. Daten aus der json auf GitHub laden
    strafenLogbook = await fetchStrafenFromRepo();
    
    // 2. UI und Modals rendern
    renderKasseStats();
    renderLogbuchModal();

    // 3. Formular zum Eintragen neuer Strafen binden
    const addStrafeForm = document.getElementById('add-strafe-form');
    if (addStrafeForm) {
        addStrafeForm.addEventListener('submit', handleAddStrafeSubmit);
    }
}

/**
 * Gibt das aktuelle Logbuch zurück
 */
export function getStrafenData() {
    return strafenLogbook;
}

/**
 * Berechnet und aktualisiert die Kassenstände in der UI
 */
export function renderKasseStats() {
    const totalOffenEl = document.getElementById('offene-strafen-val');
    const totalKasseEl = document.getElementById('kassenstand-val');

    const summeOffen = strafenLogbook
        .filter(s => !s.bezahlt)
        .reduce((sum, item) => sum + item.betrag, 0);

    const summeKasse = strafenLogbook
        .filter(s => s.bezahlt)
        .reduce((sum, item) => sum + item.betrag, 0);

    if (totalOffenEl) totalOffenEl.textContent = `${summeOffen.toFixed(2).replace('.', ',')} €`;
    if (totalKasseEl) totalKasseEl.textContent = `${summeKasse.toFixed(2).replace('.', ',')} €`;
}

/**
 * Rendert das komplette Logbuch-Modal inklusive Admin-Aktionen
 */
export function renderLogbuchModal() {
    const tbody = document.getElementById('logbuch-modal-body');
    if (!tbody) return;

    const isAdmin = Boolean(getStoredToken());

    tbody.innerHTML = strafenLogbook.map(item => `
        <tr>
            <td style="color: #94a3b8;">${item.datum}</td>
            <td><strong>${item.name}</strong></td>
            <td>${item.grund}</td>
            <td>
                <span class="badge-status ${item.bezahlt ? 'paid' : 'unpaid'}">
                    ${item.bezahlt ? `Bezahlt (${item.bezahltAm || ''})` : 'Offen'}
                </span>
            </td>
            <td style="color: ${item.bezahlt ? '#4ade80' : '#f87171'}; font-weight: bold; text-align: right;">
                ${item.betrag.toFixed(2).replace('.', ',')} €
            </td>
            ${isAdmin ? `
                <td style="text-align: right; white-space: nowrap;">
                    <button class="btn-today btn-toggle-pay" data-id="${item.id}" style="font-size: 0.75rem; padding: 4px 8px;">
                        ${item.bezahlt ? 'Als offen' : 'Als bezahlt'}
                    </button>
                    <button class="btn-delete-entry" data-id="${item.id}" style="background: #f87171; color: white; border: none; border-radius: 4px; padding: 4px 8px; margin-left: 4px; cursor: pointer;">
                        🗑️
                    </button>
                </td>
            ` : ''}
        </tr>
    `).join('');

    if (isAdmin) {
        attachAdminListeners();
    }
}

/**
 * Event-Listener für Admin-Aktionen im Modal (Umschalten / Löschen)
 */
function attachAdminListeners() {
    // Bezahlt-Status umschalten
    document.querySelectorAll('.btn-toggle-pay').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = Number(e.target.getAttribute('data-id'));
            const item = strafenLogbook.find(s => s.id === id);

            if (item) {
                item.bezahlt = !item.bezahlt;
                item.bezahltAm = item.bezahlt ? new Date().toLocaleDateString('de-DE') : null;

                e.target.textContent = "Speichere...";
                e.target.disabled = true;

                const success = await saveStrafenToRepo(strafenLogbook);
                if (success) {
                    renderKasseStats();
                    renderLogbuchModal();
                } else {
                    // Rollback bei Fehler
                    item.bezahlt = !item.bezahlt;
                    renderLogbuchModal();
                }
            }
        });
    });

    // Eintrag löschen
    document.querySelectorAll('.btn-delete-entry').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Möchtest du diesen Eintrag wirklich aus der Kasse löschen?')) return;

            const id = Number(e.target.getAttribute('data-id'));
            strafenLogbook = strafenLogbook.filter(s => s.id !== id);

            e.target.textContent = "⌛";
            
            const success = await saveStrafenToRepo(strafenLogbook);
            if (success) {
                renderKasseStats();
                renderLogbuchModal();
            } else {
                // Bei Fehler neu vom Repo nachladen
                strafenLogbook = await fetchStrafenFromRepo();
                renderLogbuchModal();
            }
        });
    });
}

/**
 * verarbeitet das Formular zum Hinzufügen neuer Strafen
 */
async function handleAddStrafeSubmit(e) {
    e.preventDefault();

    if (!getStoredToken()) {
        alert('Bitte logge dich zuerst als Admin mit deinem GitHub Token ein!');
        return;
    }

    const spielerSelect = document.getElementById('strafe-spieler');
    const grundSelect = document.getElementById('strafe-grund');
    const betragInput = document.getElementById('strafe-betrag');

    const spieler = spielerSelect?.value;
    const grund = grundSelect?.value;
    const betrag = parseFloat(betragInput?.value);

    if (!spieler || !grund || isNaN(betrag)) {
        alert('Bitte fülle alle Felder korrekt aus.');
        return;
    }

    const newEntry = {
        id: Date.now(),
        datum: new Date().toLocaleDateString('de-DE'),
        name: spieler,
        grund: grund,
        betrag: betrag,
        bezahlt: false,
        bezahltAm: null
    };

    strafenLogbook.unshift(newEntry);

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Eintragen';
    if (submitBtn) submitBtn.textContent = 'Speichere auf GitHub...';

    const success = await saveStrafenToRepo(strafenLogbook);

    if (success) {
        alert('Strafe erfolgreich eingetragen!');
        e.target.reset();
        renderKasseStats();
        renderLogbuchModal();
    } else {
        strafenLogbook.shift(); // Rollback bei Fehler
    }

    if (submitBtn) submitBtn.textContent = originalText;
}