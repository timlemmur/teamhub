import { strafenData } from '../data.js'; // [source: 8]
import { getStrafenData, renderLogbuchModal, renderKasseStats } from './kasse.js'; // [source: 8]
import { getKaestenData, reduceKastenAnzahl, updateKastenBadge } from './kasten.js'; // [source: 8]
import { getStoredToken, saveStrafenToRepo } from '../services/github.js'; // [source: 8]
import { renderVideosModal, renderSeasonArchiveModal } from './videos.js'; // <-- VOLLSTÄNDIGER IMPORT ERGÄNZT

// 1. HILFSFUNKTIONEN ZUERST DEFINIEREN
function populateStrafkastenSpielerSelect() { // [source: 8]
    const playerSelect = document.getElementById('strafkasten-spieler'); // [source: 8]
    if (playerSelect && strafenData?.spieler) { // [source: 8]
        playerSelect.innerHTML = '<option value="">-- Spieler auswählen --</option>' + // [source: 8]
            strafenData.spieler.map(p => `<option value="${p}">${p}</option>`).join(''); // [source: 8]
    }
}

// 2. ZENTRALE MODAL-MAPPING-KONFIGURATION
const modalConfig = {
    strafen: { id: 'strafen-modal', render: renderStrafenTable }, // [source: 8]
    aemter: { id: 'aemter-modal', render: renderAemterTable }, // [source: 8]
    offeneStrafen: { id: 'offene-strafen-modal', render: renderOffeneStrafenModal }, // [source: 8]
    offeneKaesten: { id: 'offene-kaesten-modal', render: renderOffeneKaestenModal }, // [source: 8]
    logbuch: { id: 'logbuch-modal', render: renderLogbuchModal }, // [source: 8]
    admin: { id: 'admin-modal' }, // [source: 8]
    buchung: { id: 'buchung-modal' }, // [source: 8]
    addStrafe: { id: 'add-strafe-modal' }, // [source: 8]
    addStrafkasten: { id: 'add-strafkasten-modal', render: populateStrafkastenSpielerSelect }, // [source: 8]
    videos: { id: 'videos-modal', render: renderVideosModal }, // [source: 8]
    seasonArchive: { id: 'season-archive-modal', render: () => renderSeasonArchiveModal('2026/2027') }, // Sub-Modal
    addVideo: { id: 'add-video-modal' } // [source: 8]
};

// ELEGANTE OPEN-FUNCTION
export function openModule(moduleName) { // [source: 8]
    const config = modalConfig[moduleName]; // [source: 8]
    if (!config) return; // [source: 8]

    if (typeof config.render === 'function') { // [source: 8]
        config.render(); // [source: 8]
    }

    const modal = document.getElementById(config.id); // [source: 8]
    if (modal) { // [source: 8]
        modal.classList.remove('hidden'); // [source: 8]
        modal.classList.add('active'); // [source: 8]
    }
}

// ELEGANTE CLOSE-FUNCTION
export function closeModule(moduleName) { // [source: 8]
    const config = modalConfig[moduleName]; // [source: 8]
    if (!config) return; // [source: 8]

    const modal = document.getElementById(config.id); // [source: 8]
    if (modal) { // [source: 8]
        modal.classList.remove('active'); // [source: 8]
        modal.classList.add('hidden'); // [source: 8]
    }
}

function renderStrafenTable() { // [source: 8]
    const tbody = document.getElementById('strafen-table-body'); // [source: 8]
    if (!tbody || !strafenData) return; // [source: 8]

    const categories = ['Allgemein', 'Training', 'Spiel']; // [source: 8]
    let html = ''; // [source: 8]

    categories.forEach(cat => { // [source: 8]
        const catStrafen = strafenData.strafen.filter(s => s.kat === cat); // [source: 8]
        if (catStrafen.length > 0) { // [source: 8]
            html += `<tr class="category-header-row"><td colspan="2">📌 ${cat}</td></tr>`; // [source: 8]
            catStrafen.forEach(s => { // [source: 8]
                html += `
                    <tr>
                        <td>${s.text}</td>
                        <td style="color: #38bdf8; font-weight: bold; text-align: right; white-space: nowrap;">${s.strafe}</td>
                    </tr>
                `; // [source: 8]
            });
        }
    });

    tbody.innerHTML = html; // [source: 8]
}

function renderAemterTable() { // [source: 8]
    const tbody = document.getElementById('aemter-table-body'); // [source: 8]
    if (!tbody || !strafenData) return; // [source: 8]

    tbody.innerHTML = strafenData.aemter.map(a => `
        <tr>
            <td><strong>${a.amt}</strong></td>
            <td style="color: #38bdf8; font-weight: 600;">${a.name}</td>
        </tr>
    `).join(''); // [source: 8]
}

export function renderOffeneStrafenModal() { // [source: 8]
    const tbody = document.getElementById('offene-strafen-modal-body'); // [source: 8]
    const playerSelect = document.getElementById('offene-strafen-player-filter'); // [source: 8]
    if (!tbody) return; // [source: 8]

    const logbook = getStrafenData(); // [source: 8]
    const offene = logbook.filter(s => !s.bezahlt); // [source: 8]
    const isAdmin = Boolean(getStoredToken()); // [source: 8]

    if (playerSelect) { // [source: 8]
        const selectedValue = playerSelect.value || 'ALL'; // [source: 8]
        const uniquePlayers = [...new Set(offene.map(item => item.name || 'Unbekannt'))].sort(); // [source: 8]

        playerSelect.innerHTML = `<option value="ALL">Alle Spieler anzeigen (${offene.length})</option>` + // [source: 8]
            uniquePlayers.map(p => `<option value="${p}">${p}</option>`).join(''); // [source: 8]

        playerSelect.value = selectedValue; // [source: 8]

        if (!playerSelect.dataset.bound) { // [source: 8]
            playerSelect.dataset.bound = "true"; // [source: 8]
            playerSelect.addEventListener('change', () => renderOffeneStrafenModal()); // [source: 8]
        }
    }

    const selectedPlayer = playerSelect ? playerSelect.value : 'ALL'; // [source: 8]
    const filteredOffene = selectedPlayer === 'ALL' // [source: 8]
        ? offene // [source: 8]
        : offene.filter(item => (item.name || 'Unbekannt') === selectedPlayer); // [source: 8]

    if (filteredOffene.length === 0) { // [source: 8]
        const msg = selectedPlayer === 'ALL' // [source: 8]
            ? '🎉 Keine unbezahlten Strafen vorhanden!' // [source: 8]
            : `Keine unbezahlten Strafen für ${selectedPlayer}.`; // [source: 8]
            
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #4ade80; padding: 20px;">${msg}</td></tr>`; // [source: 8]
        return; // [source: 8]
    }

    tbody.innerHTML = filteredOffene.map(item => { // [source: 8]
        const betragVal = Number(item.betrag) || 0; // [source: 8]
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
        `; // [source: 8]
    }).join(''); // [source: 8]

    if (isAdmin) { // [source: 8]
        document.querySelectorAll('.btn-pay-offen').forEach(btn => { // [source: 8]
            btn.addEventListener('click', async (e) => { // [source: 8]
                const rawId = e.target.getAttribute('data-id'); // [source: 8]
                const item = logbook.find(s => String(s.id) === String(rawId)); // [source: 8]

                if (item) { // [source: 8]
                    item.bezahlt = true; // [source: 8]
                    item.bezahltAm = new Date().toLocaleDateString('de-DE'); // [source: 8]

                    e.target.textContent = "Speichere..."; // [source: 8]
                    e.target.disabled = true; // [source: 8]

                    const success = await saveStrafenToRepo(logbook); // [source: 8]
                    if (success) { // [source: 8]
                        renderKasseStats(); // [source: 8]
                        renderOffeneStrafenModal(); // [source: 8]
                    }
                }
            });
        });
    }
}

export function renderOffeneKaestenModal() { // [source: 8]
    const tbody = document.getElementById('offene-kaesten-modal-body'); // [source: 8]
    const playerSelect = document.getElementById('offene-kaesten-player-filter'); // [source: 8]
    const typSelect = document.getElementById('offene-kaesten-typ-filter'); // [source: 8]
    if (!tbody) return; // [source: 8]

    const kaestenList = getKaestenData(); // [source: 8]
    const isAdmin = Boolean(getStoredToken()); // [source: 8]

    updateKastenBadge(); // [source: 8]

    // 1. Spieler-Dropdown aktualisieren & Listener binden
    if (playerSelect) { // [source: 8]
        const selectedValue = playerSelect.value || 'ALL'; // [source: 8]
        const uniquePlayers = [...new Set(kaestenList.map(item => item.name || item.spieler || 'Unbekannt'))].sort(); // [source: 8]

        playerSelect.innerHTML = `<option value="ALL">Alle Spieler anzeigen (${kaestenList.length})</option>` + // [source: 8]
            uniquePlayers.map(p => `<option value="${p}">${p}</option>`).join(''); // [source: 8]

        playerSelect.value = selectedValue; // [source: 8]

        if (!playerSelect.dataset.bound) { // [source: 8]
            playerSelect.dataset.bound = "true"; // [source: 8]
            playerSelect.addEventListener('change', () => renderOffeneKaestenModal()); // [source: 8]
        }
    }

    // 2. Typ-Dropdown Event Listener binden (einmalig)
    if (typSelect && !typSelect.dataset.bound) { // [source: 8]
        typSelect.dataset.bound = "true"; // [source: 8]
        typSelect.addEventListener('change', () => renderOffeneKaestenModal()); // [source: 8]
    }

    // 3. Filter-Werte abrufen
    const selectedPlayer = playerSelect ? playerSelect.value : 'ALL'; // [source: 8]
    const selectedTyp = typSelect ? typSelect.value : 'ALL'; // [source: 8]

    // 4. Daten filtern (nach Spieler & nach Typ)
    let filteredKaesten = kaestenList; // [source: 8]

    if (selectedPlayer !== 'ALL') { // [source: 8]
        filteredKaesten = filteredKaesten.filter(item => (item.name || item.spieler || 'Unbekannt') === selectedPlayer); // [source: 8]
    }

    if (selectedTyp !== 'ALL') { // [source: 8]
        filteredKaesten = filteredKaesten.filter(item => { // [source: 8]
            const itemTyp = String(item.typ || 'KASTEN').toUpperCase(); // [source: 8]
            return selectedTyp === 'KABINENFEST' ? itemTyp.includes('FEST') : !itemTyp.includes('FEST'); // [source: 8]
        });
    }

    // 5. Fallback bei leerer Liste
    if (filteredKaesten.length === 0) { // [source: 8]
        const msg = selectedPlayer === 'ALL' // [source: 8]
            ? '🎉 Keine offenen Einträge vorhanden!' // [source: 8]
            : `Keine offenen Einträge für ${selectedPlayer}.`; // [source: 8]
            
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #4ade80; padding: 20px;">${msg}</td></tr>`; // [source: 8]
        return; // [source: 8]
    }

    // 6. Dynamisches Rendern mit Typ-Unterscheidung (🍺 vs 🎉)
    tbody.innerHTML = filteredKaesten.map(item => { // [source: 8]
        const anzahl = item.anzahl || 1; // [source: 8]
        const itemTyp = String(item.typ || '').toUpperCase(); // [source: 8]
        const isKabinenfest = itemTyp === 'KABINENFEST' || itemTyp.includes('FEST'); // [source: 8]

        // Dynamische Icons, Farben und Button-Texte
        const icon = isKabinenfest ? '🎉' : '🍺'; // [source: 8]
        const colorStyle = isKabinenfest ? 'color: #c084fc;' : 'color: #f59e0b;'; // [source: 8]
        const btnText = isKabinenfest ? '-1 🎉 Einlösen' : '-1 🍺 Mitgebracht'; // [source: 8]

        return `
            <tr>
                <td style="color: #94a3b8;">${item.datum || ''}</td>
                <td><strong>${item.name || item.spieler || 'Unbekannt'}</strong></td>
                <td>${item.grund || 'Strafkasten'}</td>
                <td style="${colorStyle} font-weight: bold; text-align: right;">${anzahl}x ${icon}</td>
                <td style="text-align: right;">
                    ${isAdmin ? `
                        <button class="btn-today btn-reduce-kasten" data-id="${item.id}" title="${btnText}" style="font-size: 0.75rem; padding: 4px 8px;">
                            ${btnText}
                        </button>
                    ` : '<span style="color: #64748b; font-size: 0.8rem;">—</span>'}
                </td>
            </tr>
        `; // [source: 8]
    }).join(''); // [source: 8]

    // 7. Event-Listener für Admin-Aktionen
    if (isAdmin) { // [source: 8]
        tbody.querySelectorAll('.btn-reduce-kasten').forEach(btn => { // [source: 8]
            btn.addEventListener('click', async (e) => { // [source: 8]
                const targetBtn = e.currentTarget; // [source: 8]
                const rawId = targetBtn.getAttribute('data-id'); // [source: 8]
                targetBtn.textContent = "Speichere..."; // [source: 8]
                targetBtn.disabled = true; // [source: 8]

                const success = await reduceKastenAnzahl(rawId, 1); // [source: 8]
                if (success) { // [source: 8]
                    renderOffeneKaestenModal(); // [source: 8]
                }
            });
        });
    }
}