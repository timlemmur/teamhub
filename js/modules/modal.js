import { strafenData } from '../data.js';
import { getStrafenData, renderLogbuchModal, renderKasseStats } from './kasse.js';
import { getKaestenData, reduceKastenAnzahl, updateKastenBadge } from './kasten.js';
import { getStoredToken, saveStrafenToRepo } from '../services/github.js';

// 1. HILFSFUNKTIONEN ZUERST DEFINIEREN
function populateStrafkastenSpielerSelect() {
    const playerSelect = document.getElementById('strafkasten-spieler');
    if (playerSelect && strafenData?.spieler) {
        playerSelect.innerHTML = '<option value="">-- Spieler auswählen --</option>' +
            strafenData.spieler.map(p => `<option value="${p}">${p}</option>`).join('');
    }
}

// 2. ZENTRALE MODAL-MAPPING-KONFIGURATION
const modalConfig = {
    strafen: { id: 'strafen-modal', render: renderStrafenTable },
    aemter: { id: 'aemter-modal', render: renderAemterTable },
    offeneStrafen: { id: 'offene-strafen-modal', render: renderOffeneStrafenModal },
    offeneKaesten: { id: 'offene-kaesten-modal', render: renderOffeneKaestenModal },
    logbuch: { id: 'logbuch-modal', render: renderLogbuchModal },
    admin: { id: 'admin-modal' },
    buchung: { id: 'buchung-modal' },
    addStrafe: { id: 'add-strafe-modal' },
    addStrafkasten: { id: 'add-strafkasten-modal', render: populateStrafkastenSpielerSelect }
};

// ELEGANTE OPEN-FUNCTION
export function openModule(moduleName) {
    const config = modalConfig[moduleName];
    if (!config) return;

    if (typeof config.render === 'function') {
        config.render();
    }

    const modal = document.getElementById(config.id);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
    }
}

// ELEGANTE CLOSE-FUNCTION
export function closeModule(moduleName) {
    const config = modalConfig[moduleName];
    if (!config) return;

    const modal = document.getElementById(config.id);
    if (modal) {
        modal.classList.remove('active');
        modal.classList.add('hidden');
    }
}

function renderStrafenTable() {
    const tbody = document.getElementById('strafen-table-body');
    if (!tbody || !strafenData) return;

    const categories = ['Allgemein', 'Training', 'Spiel'];
    let html = '';

    categories.forEach(cat => {
        const catStrafen = strafenData.strafen.filter(s => s.kat === cat);
        if (catStrafen.length > 0) {
            html += `<tr class="category-header-row"><td colspan="2">📌 ${cat}</td></tr>`;
            catStrafen.forEach(s => {
                html += `
                    <tr>
                        <td>${s.text}</td>
                        <td style="color: #38bdf8; font-weight: bold; text-align: right; white-space: nowrap;">${s.strafe}</td>
                    </tr>
                `;
            });
        }
    });

    tbody.innerHTML = html;
}

function renderAemterTable() {
    const tbody = document.getElementById('aemter-table-body');
    if (!tbody || !strafenData) return;

    tbody.innerHTML = strafenData.aemter.map(a => `
        <tr>
            <td><strong>${a.amt}</strong></td>
            <td style="color: #38bdf8; font-weight: 600;">${a.name}</td>
        </tr>
    `).join('');
}

export function renderOffeneStrafenModal() {
    const tbody = document.getElementById('offene-strafen-modal-body');
    const playerSelect = document.getElementById('offene-strafen-player-filter');
    if (!tbody) return;

    const logbook = getStrafenData();
    const offene = logbook.filter(s => !s.bezahlt);
    const isAdmin = Boolean(getStoredToken());

    if (playerSelect) {
        const selectedValue = playerSelect.value || 'ALL';
        const uniquePlayers = [...new Set(offene.map(item => item.name || 'Unbekannt'))].sort();

        playerSelect.innerHTML = `<option value="ALL">Alle Spieler anzeigen (${offene.length})</option>` +
            uniquePlayers.map(p => `<option value="${p}">${p}</option>`).join('');

        playerSelect.value = selectedValue;

        if (!playerSelect.dataset.bound) {
            playerSelect.dataset.bound = "true";
            playerSelect.addEventListener('change', () => renderOffeneStrafenModal());
        }
    }

    const selectedPlayer = playerSelect ? playerSelect.value : 'ALL';
    const filteredOffene = selectedPlayer === 'ALL' 
        ? offene 
        : offene.filter(item => (item.name || 'Unbekannt') === selectedPlayer);

    if (filteredOffene.length === 0) {
        const msg = selectedPlayer === 'ALL' 
            ? '🎉 Keine unbezahlten Strafen vorhanden!' 
            : `Keine unbezahlten Strafen für ${selectedPlayer}.`;
            
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #4ade80; padding: 20px;">${msg}</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredOffene.map(item => {
        const betragVal = Number(item.betrag) || 0;
        return `
            <tr>
                <td style="color: #94a3b8;">${item.datum || ''}</td>
                <td><strong>${item.name || 'Unbekannt'}</strong></td>
                <td>${item.grund || ''}</td>
                <td style="color: #f59e0b; font-weight: bold; text-align: right;">${betragVal.toFixed(2).replace('.', ',')} €</td>
                <td style="text-align: right;">
                    ${isAdmin ? `
                        <button class="btn-today btn-pay-offen" data-id="${item.id}" style="font-size: 0.75rem; padding: 4px 8px;">
                            Als bezahlt
                        </button>
                    ` : '<span style="color: #64748b; font-size: 0.8rem;">—</span>'}
                </td>
            </tr>
        `;
    }).join('');

    if (isAdmin) {
        document.querySelectorAll('.btn-pay-offen').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const rawId = e.target.getAttribute('data-id');
                const item = logbook.find(s => String(s.id) === String(rawId));

                if (item) {
                    item.bezahlt = true;
                    item.bezahltAm = new Date().toLocaleDateString('de-DE');

                    e.target.textContent = "Speichere...";
                    e.target.disabled = true;

                    const success = await saveStrafenToRepo(logbook);
                    if (success) {
                        renderKasseStats();
                        renderOffeneStrafenModal();
                    }
                }
            });
        });
    }
}

export function renderOffeneKaestenModal() {
    const tbody = document.getElementById('offene-kaesten-modal-body');
    const playerSelect = document.getElementById('offene-kaesten-player-filter');
    if (!tbody) return;

    const kaestenList = getKaestenData();
    const isAdmin = Boolean(getStoredToken());

    updateKastenBadge();

    if (playerSelect) {
        const selectedValue = playerSelect.value || 'ALL';
        const uniquePlayers = [...new Set(kaestenList.map(item => item.name || 'Unbekannt'))].sort();

        playerSelect.innerHTML = `<option value="ALL">Alle Spieler anzeigen (${kaestenList.length})</option>` +
            uniquePlayers.map(p => `<option value="${p}">${p}</option>`).join('');

        playerSelect.value = selectedValue;

        if (!playerSelect.dataset.bound) {
            playerSelect.dataset.bound = "true";
            playerSelect.addEventListener('change', () => renderOffeneKaestenModal());
        }
    }

    const selectedPlayer = playerSelect ? playerSelect.value : 'ALL';
    const filteredKaesten = selectedPlayer === 'ALL' 
        ? kaestenList 
        : kaestenList.filter(item => (item.name || 'Unbekannt') === selectedPlayer);

    if (filteredKaesten.length === 0) {
        const msg = selectedPlayer === 'ALL' 
            ? '🎉 Keine offenen Strafkästen vorhanden!' 
            : `Keine offenen Strafkästen für ${selectedPlayer}.`;
            
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #4ade80; padding: 20px;">${msg}</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredKaesten.map(item => {
        const anzahl = item.anzahl || 1;
        return `
            <tr>
                <td style="color: #94a3b8;">${item.datum || ''}</td>
                <td><strong>${item.name || 'Unbekannt'}</strong></td>
                <td>${item.grund || 'Strafkasten'}</td>
                <td style="color: #f59e0b; font-weight: bold; text-align: right;">${anzahl}x 🍺</td>
                <td style="text-align: right;">
                    ${isAdmin ? `
                        <button class="btn-today btn-reduce-kasten" data-id="${item.id}" title="1 Kasten als mitgebracht markieren" style="font-size: 0.75rem; padding: 4px 8px;">
                            -1 🍺 Mitgebracht
                        </button>
                    ` : '<span style="color: #64748b; font-size: 0.8rem;">—</span>'}
                </td>
            </tr>
        `;
    }).join('');

    if (isAdmin) {
        document.querySelectorAll('.btn-reduce-kasten').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const rawId = e.target.getAttribute('data-id');
                e.target.textContent = "Speichere...";
                e.target.disabled = true;

                const success = await reduceKastenAnzahl(rawId, 1);
                if (success) {
                    renderOffeneKaestenModal();
                }
            });
        });
    }
}