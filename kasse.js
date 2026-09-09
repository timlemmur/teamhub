import { fetchStrafenFromRepo, saveStrafenToRepo, getStoredToken } from '../services/github.js';
import { strafenData } from '../data.js';
import { renderOffeneStrafenModal } from './modal.js';
import { renderKasseChart } from './chart.js';

let strafenLogbook = [];

export async function initKasseModule() {
    renderKasseStats();
    renderLogbuchModal();

    try {
        const remoteData = await fetchStrafenFromRepo();
        if (remoteData && Array.isArray(remoteData)) {
            strafenLogbook = remoteData;
            renderKasseStats();
            renderLogbuchModal();
        }
    } catch (err) {
        console.warn("Ladefehler bei GitHub-Daten:", err);
    }

    setupAddStrafeModal();
    setupFreieBuchungModal();
}

// Handler for custom Income/Expense bookings
function setupFreieBuchungModal() {
    const form = document.getElementById('buchung-form');
    const labelEinnahme = document.getElementById('label-einnahme');
    const labelAusgabe = document.getElementById('label-ausgabe');
    const radios = document.querySelectorAll('input[name="buchungsart"]');

    // Umschalt-Logik für visuelles Feedback
    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'einnahme') {
                labelEinnahme?.classList.add('active-einnahme');
                labelEinnahme?.classList.remove('active-ausgabe');
                labelEinnahme.style.color = '#0f172a';

                labelAusgabe?.classList.remove('active-ausgabe', 'active-einnahme');
                labelAusgabe.style.color = '#94a3b8';
            } else {
                labelAusgabe?.classList.add('active-ausgabe');
                labelAusgabe?.classList.remove('active-einnahme');
                labelAusgabe.style.color = '#0f172a';

                labelEinnahme?.classList.remove('active-einnahme', 'active-ausgabe');
                labelEinnahme.style.color = '#94a3b8';
            }
        });
    });

    if (form) {
        form.removeEventListener('submit', handleFreieBuchungSubmit);
        form.addEventListener('submit', handleFreieBuchungSubmit);
    }
}

async function handleFreieBuchungSubmit(e) {
    e.preventDefault();

    if (!getStoredToken()) {
        alert('Bitte logge dich zuerst oben rechts als Admin ein!');
        return;
    }

    const art = document.querySelector('input[name="buchungsart"]:checked')?.value || 'einnahme';
    const grundText = document.getElementById('buchung-grund')?.value.trim();
    let betrag = parseFloat(document.getElementById('buchung-betrag')?.value);

    if (!grundText || isNaN(betrag) || betrag <= 0) {
        alert('Bitte gib einen gültigen Zweck und Betrag ein!');
        return;
    }

    if (art === 'ausgabe') {
        betrag = -betrag; // Negative amount for expenses
    }

    const heute = new Date().toLocaleDateString('de-DE');
    const newEntry = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        datum: heute,
        name: "Mannschaftskasse", // General category name
        grund: grundText,
        betrag: betrag,
        bezahlt: true, // Auto-settled
        bezahltAm: heute,
        type: art // "einnahme" or "ausgabe"
    };

    strafenLogbook.unshift(newEntry);

    const submitBtn = document.getElementById('btn-submit-buchung');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Speichere auf GitHub...';
    }

    const success = await saveStrafenToRepo(strafenLogbook);

    if (success) {
        alert(`Erfolgreich gebucht: ${art === 'einnahme' ? '+' : ''}${betrag.toFixed(2).replace('.', ',')} € (${grundText})`);

        e.target.reset();
        renderKasseStats();
        renderLogbuchModal();

        const buchungModal = document.getElementById('buchung-modal');
        if (buchungModal) {
            buchungModal.classList.remove('active');
            buchungModal.classList.add('hidden');
        }
    } else {
        strafenLogbook.shift();
    }

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Buchung jetzt speichern';
    }
}

export function getStrafenData() {
    return strafenLogbook;
}

function setupAddStrafeModal() {
    const spielerSelect = document.getElementById('strafe-spieler-select');
    const katalogContainer = document.getElementById('strafen-katalog-list');
    const searchInput = document.getElementById('strafe-search-input');
    const form = document.getElementById('add-strafe-form');

    if (spielerSelect && strafenData?.spieler) {
        spielerSelect.innerHTML = '<option value="">-- Bitte Spieler wählen --</option>' +
            strafenData.spieler.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    // Rendert die Strafen sortiert nach Kategorie
    function renderKatalogList(filterTerm = '') {
        if (!katalogContainer || !strafenData?.strafen) return;

        // Speicher bisherige Zählerstände
        const currentCounts = {};
        document.querySelectorAll('.counter-value').forEach(el => {
            const key = el.getAttribute('data-key');
            if (key) currentCounts[key] = parseInt(el.textContent, 10) || 0;
        });

        // 1. Nur monetäre Strafen filtern
        const monetäre = strafenData.strafen.filter(s => s.strafe.includes('€'));

        // 2. Aufsplitten bei Spezialfall "Saisonbeitrag"
        const aufgearbeiteteStrafen = [];
        monetäre.forEach(s => {
            if (s.text.toLowerCase().includes('saisonbeitrag')) {
                aufgearbeiteteStrafen.push({
                    kat: s.kat || 'Allgemein',
                    key: 'saison_100',
                    text: 'Saisonbeitrag (Standard)',
                    displayBetrag: '100,00 €',
                    betrag: 100
                });
                aufgearbeiteteStrafen.push({
                    kat: s.kat || 'Allgemein',
                    key: 'saison_70',
                    text: 'Saisonbeitrag (Ermäßigt)',
                    displayBetrag: '70,00 €',
                    betrag: 70
                });
            } else {
                const num = parseFloat(s.strafe.replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
                aufgearbeiteteStrafen.push({
                    kat: s.kat || 'Allgemein',
                    key: s.text,
                    text: s.text,
                    displayBetrag: s.strafe,
                    betrag: num
                });
            }
        });

        // 3. Suche anwenden
        const term = filterTerm.toLowerCase().trim();
        const gefiltert = aufgearbeiteteStrafen.filter(s =>
            s.text.toLowerCase().includes(term) ||
            s.displayBetrag.toLowerCase().includes(term) ||
            s.kat.toLowerCase().includes(term)
        );

        if (gefiltert.length === 0) {
            katalogContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 16px; font-size: 0.85rem;">Keine Strafen gefunden</div>`;
            return;
        }

        // 4. Nach Kategorien gruppieren
        const kategorien = ['Allgemein', 'Training', 'Spiel'];
        const katIcons = { 'Allgemein': '📌', 'Training': '🏃', 'Spiel': '🤾' };
        let html = '';

        kategorien.forEach(kat => {
            const katItems = gefiltert.filter(item => item.kat === kat);
            if (katItems.length > 0) {
                html += `
                    <div class="kategorie-header" style="font-weight: 700; font-size: 0.8rem; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; margin: 10px 0 4px 0; padding-bottom: 2px; border-bottom: 1px solid rgba(56, 189, 248, 0.2);">
                        ${katIcons[kat] || '📋'} ${kat}
                    </div>
                `;

                katItems.forEach(item => {
                    const count = currentCounts[item.key] || 0;
                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <div style="flex: 1; padding-right: 8px;">
                                <div style="font-size: 0.85rem; color: #e2e8f0; font-weight: 500;">${item.text}</div>
                                <div style="color: #94a3b8; font-size: 0.75rem;">${item.displayBetrag}</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <button type="button" class="btn-counter-sub" data-key="${item.key}" style="background: #334155; color: white; border: none; border-radius: 4px; width: 26px; height: 26px; cursor: pointer; font-weight: bold;">−</button>
                                <span id="counter-val-${item.key}" class="counter-value" data-key="${item.key}" data-text="${item.text}" data-einzelbetrag="${item.betrag}" style="min-width: 20px; text-align: center; font-weight: bold; font-size: 0.9rem; color: #f8fafc;">${count}</span>
                                <button type="button" class="btn-counter-add" data-key="${item.key}" style="background: #38bdf8; color: #0f172a; border: none; border-radius: 4px; width: 26px; height: 26px; cursor: pointer; font-weight: bold;">+</button>
                            </div>
                        </div>
                    `;
                });
            }
        });

        katalogContainer.innerHTML = html;

        // Button Listener erneut binden
        katalogContainer.querySelectorAll('.btn-counter-add').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-key');
                const valEl = document.getElementById(`counter-val-${key}`);
                if (valEl) {
                    valEl.textContent = parseInt(valEl.textContent, 10) + 1;
                    updateStrafeTotalPreview();
                }
            });
        });

        katalogContainer.querySelectorAll('.btn-counter-sub').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-key');
                const valEl = document.getElementById(`counter-val-${key}`);
                if (valEl) {
                    const current = parseInt(valEl.textContent, 10);
                    if (current > 0) {
                        valEl.textContent = current - 1;
                        updateStrafeTotalPreview();
                    }
                }
            });
        });
    }

    // Event Listener für die Suche
    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', (e) => {
            renderKatalogList(e.target.value);
        });
    }

    // Initiales Rendering
    renderKatalogList();

    // Live-Update bei Freitext-Eingabe
    document.getElementById('custom-strafe-betrag')?.addEventListener('input', updateStrafeTotalPreview);

    if (form) {
        form.removeEventListener('submit', handleAddStrafeSubmit);
        form.addEventListener('submit', handleAddStrafeSubmit);
    }

    updateStrafeTotalPreview();
}

function updateStrafeTotalPreview() {
    let total = 0;

    document.querySelectorAll('.counter-value').forEach(el => {
        const anz = parseInt(el.textContent, 10) || 0;
        const einzel = parseFloat(el.getAttribute('data-einzelbetrag')) || 0;
        total += anz * einzel;
    });

    const customBetrag = parseFloat(document.getElementById('custom-strafe-betrag')?.value);
    if (!isNaN(customBetrag) && customBetrag > 0) {
        total += customBetrag;
    }

    const previewEl = document.getElementById('add-strafe-total-preview');
    if (previewEl) {
        previewEl.textContent = `${total.toFixed(2).replace('.', ',')} €`;
    }
}

async function handleAddStrafeSubmit(e) {
    e.preventDefault();

    if (!getStoredToken()) {
        alert('Bitte logge dich zuerst oben rechts als Admin ein!');
        return;
    }

    const spieler = document.getElementById('strafe-spieler-select')?.value;
    if (!spieler) {
        alert('Bitte wähle einen Spieler aus!');
        return;
    }

    const entriesToAdd = [];
    const heute = new Date().toLocaleDateString('de-DE');

    // Katalog-Einträge verarbeiten
    document.querySelectorAll('.counter-value').forEach(el => {
        const anz = parseInt(el.textContent, 10) || 0;
        if (anz > 0) {
            const grundText = el.getAttribute('data-text');
            const einzelbetrag = parseFloat(el.getAttribute('data-einzelbetrag')) || 0;
            const gesamt = anz * einzelbetrag;

            // Beschriftung anpassen bei Mehrfachzählung (z.B. "Zu spät (5x / Min)")
            const grund = anz > 1 ? `${grundText} (${anz}x)` : grundText;

            entriesToAdd.push({
                id: Date.now() + Math.floor(Math.random() * 1000),
                datum: heute,
                name: spieler,
                grund: grund,
                betrag: gesamt,
                bezahlt: false,
                bezahltAm: null
            });
        }
    });

    // Indivduelle Strafe verarbeiten
    const customText = document.getElementById('custom-strafe-text')?.value.trim();
    const customBetrag = parseFloat(document.getElementById('custom-strafe-betrag')?.value);

    if (customText && !isNaN(customBetrag) && customBetrag > 0) {
        entriesToAdd.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            datum: heute,
            name: spieler,
            grund: customText,
            betrag: customBetrag,
            bezahlt: false,
            bezahltAm: null
        });
    }

    if (entriesToAdd.length === 0) {
        alert('Bitte wähle mindestens eine Strafe aus oder gib eine eigene Strafe ein!');
        return;
    }

    strafenLogbook.unshift(...entriesToAdd);

    const submitBtn = document.getElementById('btn-submit-strafe');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Speichere auf GitHub...';
    }

    const success = await saveStrafenToRepo(strafenLogbook);

    if (success) {
        alert(`Erfolgreich ${entriesToAdd.length} Strafe(n) für ${spieler} gebucht!`);

        e.target.reset();
        document.querySelectorAll('.counter-value').forEach(el => el.textContent = '0');
        updateStrafeTotalPreview();

        renderKasseStats();
        renderLogbuchModal();
        renderOffeneStrafenModal();

        document.getElementById('add-strafe-modal')?.classList.remove('active');
        document.getElementById('add-strafe-modal')?.classList.add('hidden');
    } else {
        strafenLogbook.splice(0, entriesToAdd.length);
    }

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Strafe(n) jetzt buchen';
    }
}

export function renderKasseStats() {
    const totalOffenEl = document.getElementById('offene-strafen-val');
    const totalKasseEl = document.getElementById('kassenstand-val');

    const summeOffen = strafenLogbook
        .filter(s => !s.bezahlt && (Number(s.betrag) || 0) > 0)
        .reduce((sum, item) => sum + (Number(item.betrag) || 0), 0);

    const summeKasse = strafenLogbook
        .filter(s => s.bezahlt)
        .reduce((sum, item) => sum + (Number(item.betrag) || 0), 0);

    if (totalOffenEl) totalOffenEl.textContent = `${summeOffen.toFixed(2).replace('.', ',')} €`;
    if (totalKasseEl) totalKasseEl.textContent = `${summeKasse.toFixed(2).replace('.', ',')} €`;

    if (typeof renderKasseChart === 'function') {
        renderKasseChart(strafenLogbook);
    }
}

export function renderLogbuchModal() {
    const tbody = document.getElementById('logbuch-modal-body');
    if (!tbody) return;

    const isAdmin = Boolean(getStoredToken());

    if (strafenLogbook.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">Keine Einträge vorhanden.</td></tr>`;
        return;
    }

    tbody.innerHTML = strafenLogbook.map(item => {
        const betragVal = Number(item.betrag) || 0;
        const isExpense = betragVal < 0;
        const color = isExpense ? '#f87171' : (item.bezahlt ? '#4ade80' : '#f59e0b');
        const formattedAmount = `${betragVal > 0 ? '+' : ''}${betragVal.toFixed(2).replace('.', ',')} €`;

        return `
            <tr>
                <td style="color: #94a3b8;">${item.datum || ''}</td>
                <td><strong>${item.name || 'Unbekannt'}</strong></td>
                <td>${item.grund || ''}</td>
                <td>
                    <span class="badge-status ${item.bezahlt ? 'paid' : 'unpaid'}">
                        ${item.bezahlt ? `Bezahlt (${item.bezahltAm || ''})` : 'Offen'}
                    </span>
                </td>
                <td style="color: ${color}; font-weight: bold; text-align: right;">
                    ${formattedAmount}
                </td>
                ${isAdmin ? `
                    <td style="text-align: right; white-space: nowrap;">
                        ${item.name !== 'Mannschaftskasse' ? `
                            <button class="btn-today btn-toggle-pay" data-id="${item.id}" style="font-size: 0.75rem; padding: 4px 8px;">
                                ${item.bezahlt ? 'Als offen' : 'Als bezahlt'}
                            </button>
                        ` : ''}
                        <button class="btn-delete-entry" data-id="${item.id !== undefined ? item.id : 'undefined'}" style="background: #f87171; color: white; border: none; border-radius: 4px; padding: 4px 8px; margin-left: 4px; cursor: pointer;">
                        🗑️
                        </button>
                    </td>
                ` : ''}
            </tr>
        `;
    }).join('');

    if (isAdmin && typeof attachAdminListeners === 'function') {
        attachAdminListeners();
    }
}

function attachAdminListeners() {
    document.querySelectorAll('.btn-toggle-pay').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const rawId = e.target.getAttribute('data-id');
            const id = Number(rawId);

            // Eintrag per ID finden, oder den ersten fehlerhaften Eintrag, falls ID undefined ist
            const item = strafenLogbook.find(s => String(s.id) === String(rawId) || (!s.id && rawId === "undefined"));

            if (item) {
                item.bezahlt = !item.bezahlt;
                item.bezahltAm = item.bezahlt ? new Date().toLocaleDateString('de-DE') : null;

                e.target.textContent = "Speichere...";
                e.target.disabled = true;

                const success = await saveStrafenToRepo(strafenLogbook);
                if (success) {
                    renderKasseStats();
                    renderLogbuchModal();
                    renderOffeneStrafenModal();
                } else {
                    item.bezahlt = !item.bezahlt;
                    renderLogbuchModal();
                }
            }
        });
    });

    document.querySelectorAll('.btn-delete-entry').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Möchtest du diesen Eintrag wirklich unwiderruflich löschen?')) return;

            const rawId = e.target.getAttribute('data-id');

            // Robustes Filtern: Löscht den Eintrag mit passender ID oder den unvollständigen "Ghost"-Eintrag
            strafenLogbook = strafenLogbook.filter(s => {
                if (!s.id || String(s.id) === "undefined" || String(s.id) === "null") {
                    return rawId !== "undefined" && rawId !== "null" && rawId !== "";
                }
                return String(s.id) !== String(rawId);
            });

            const success = await saveStrafenToRepo(strafenLogbook);
            if (success) {
                renderKasseStats();
                renderLogbuchModal();
                renderOffeneStrafenModal();
            } else {
                strafenLogbook = await fetchStrafenFromRepo();
                renderLogbuchModal();
            }
        });
    });
}