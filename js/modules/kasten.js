import { bierData } from '../data.js';
import { fetchKaestenFromRepo, saveKaestenToRepo } from '../services/github.js';

let kaestenData = [];

/**
 * Lädt beim Start die offenen Kästen aus data/kasten.json
 */
export async function initKastenModule() {
    initKastenCarousel();
    try {
        const remoteKaesten = await fetchKaestenFromRepo();
        if (Array.isArray(remoteKaesten)) {
            kaestenData = remoteKaesten;
            updateKastenBadge();
            // Befüllt beim Datenladen direkt das Modal & den Spieler-Filter
            populateKastenPlayerFilter();
            renderOffeneKaestenModal();
        }
    } catch (err) {
        console.warn("Ladefehler bei kasten.json:", err);
    }
}

export function getKaestenData() {
    return kaestenData;
}

export function updateKastenBadge() {
    const badgeEl = document.getElementById('offene-kaesten-count-badge');
    if (!badgeEl) return;

    // Separate Summen für Strafkästen (🍺) und Kabinenfeste (🎉)
    const kaestenCount = kaestenData.reduce((sum, item) => {
        const typ = item.typ || 'KASTEN';
        return typ === 'KASTEN' ? sum + (Number(item.anzahl) || 0) : sum;
    }, 0);

    const festeCount = kaestenData.reduce((sum, item) => {
        const typ = item.typ || 'KASTEN';
        return typ === 'KABINENFEST' ? sum + (Number(item.anzahl) || 0) : sum;
    }, 0);

    // Formatierte Ausgabe: "Strafkästen / Kabinenfeste"
    badgeEl.textContent = `${kaestenCount} 🍺 ${festeCount} 🎉`;
}

/**
 * Verringert die Kastenanzahl eines Eintrags um x (Standard: 1).
 * Erreicht die Anzahl 0 oder weniger, wird der Eintrag gelöscht.
 */
export async function reduceKastenAnzahl(id, decrementBy = 1) {
    const index = kaestenData.findIndex(k => String(k.id) === String(id));
    if (index === -1) return false;

    // Kopie des alten Zustands für Rollback sichern
    const previousState = JSON.parse(JSON.stringify(kaestenData));

    kaestenData[index].anzahl -= decrementBy;

    // Falls 0 oder weniger übrig bleiben -> Eintrag löschen
    if (kaestenData[index].anzahl <= 0) {
        kaestenData.splice(index, 1);
    }

    const success = await saveKaestenToRepo(kaestenData);
    if (success) {
        updateKastenBadge();
        renderOffeneKaestenModal();
    } else {
        // Rollback bei Speicherfehler
        kaestenData = previousState;
        updateKastenBadge();
    }
    return success;
}

/**
 * Fügt einen neuen Kasten- oder Kabinenfest-Eintrag hinzu oder aggregiert
 */
export async function addStrafkastenEntry(spieler, grund, anzahl, typ = 'KASTEN') {
    const count = Number(anzahl) || 1;
    
    // Typ sauber vereinheitlichen (KASTEN vs KABINENFEST)
    const normalizedTyp = String(typ).toUpperCase().includes('FEST') ? 'KABINENFEST' : 'KASTEN';

    const existingIndex = kaestenData.findIndex(
        k => (k.name || k.spieler || '').toLowerCase() === (spieler || '').toLowerCase() &&
             (k.grund || '').toLowerCase() === (grund || '').toLowerCase() &&
             (k.typ || 'KASTEN') === normalizedTyp
    );

    const previousState = JSON.parse(JSON.stringify(kaestenData));

    if (existingIndex !== -1) {
        kaestenData[existingIndex].anzahl = (Number(kaestenData[existingIndex].anzahl) || 0) + count;
    } else {
        const newEntry = {
            id: Date.now(),
            datum: new Date().toLocaleDateString('de-DE'),
            name: spieler,
            spieler: spieler, // Für beide Feldnamen-Varianten
            grund: grund,
            anzahl: count,
            typ: normalizedTyp
        };
        kaestenData.push(newEntry);
    }

    const success = await saveKaestenToRepo(kaestenData);
    if (success) {
        updateKastenBadge();
        renderOffeneKaestenModal();
    } else {
        kaestenData = previousState;
        updateKastenBadge();
    }
    return success;
}

/**
 * Rendert das Modal mit Unterstützung für Unterscheidung & Filterung von Strafkasten / Kabinenfest
 */
/**
 * Befüllt das Spieler-Filter-Dropdown dynamisch mit den Spielern aus den Daten
 */
export function populateKastenPlayerFilter() {
    const playerSelect = document.getElementById('offene-kaesten-player-filter');
    if (!playerSelect) return;

    const currentSelection = playerSelect.value;
    
    // Alle eindeutigen Namen aus kaestenData extrahieren
    const uniquePlayers = [...new Set(kaestenData.map(item => item.name || item.spieler).filter(Boolean))].sort();

    playerSelect.innerHTML = `<option value="ALL">Alle Spieler anzeigen</option>` +
        uniquePlayers.map(p => `<option value="${p}">${p}</option>`).join('');

    // Vorherige Auswahl beibehalten, falls vorhanden
    if (uniquePlayers.includes(currentSelection)) {
        playerSelect.value = currentSelection;
    } else {
        playerSelect.value = 'ALL';
    }
}

/**
 * Rendert das Modal mit Unterstützung für Unterscheidung & Filterung von Strafkasten / Kabinenfest
 */
export function renderOffeneKaestenModal() {
    const tbody = document.getElementById('offene-kaesten-modal-body');
    if (!tbody) return;

    // Filter-Elemente abfragen
    const spielerFilter = document.getElementById('offene-kaesten-player-filter')?.value || 'ALL';
    const typFilter = document.getElementById('offene-kaesten-typ-filter')?.value || 'ALL';

    let list = [...kaestenData];

    // 1. Spieler-Filter anwenden
    if (spielerFilter !== 'ALL') {
        list = list.filter(item => (item.name || item.spieler) === spielerFilter);
    }

    // 2. Typ-Filter anwenden
    if (typFilter !== 'ALL') {
        list = list.filter(item => {
            const itemTyp = String(item.typ || 'KASTEN').toUpperCase();
            return typFilter === 'KABINENFEST' ? itemTyp.includes('FEST') : !itemTyp.includes('FEST');
        });
    }

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">
                    Keine offenen Einträge vorhanden 🎉
                </td>
            </tr>`;
        return;
    }

    // Tabelle befüllen
    tbody.innerHTML = list.map(item => {
        // Explizite Typ-Prüfung für KASTEN vs KABINENFEST
        const itemTyp = String(item.typ || '').toUpperCase();
        const isKabinenfest = itemTyp === 'KABINENFEST' || itemTyp.includes('FEST');
        
        // Dynamische Icons & Stylings
        const icon = isKabinenfest ? '🎉' : '🍺';
        const badgeStyle = isKabinenfest 
            ? 'background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);' 
            : 'background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);';

        const btnText = isKabinenfest ? `-1 🎉 Einlösen` : `-1 🍺 Mitgebracht`;

        return `
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); color: #f8fafc;">
                <td style="padding: 12px 10px; color: #94a3b8; font-size: 0.85rem;">${item.datum || '-'}</td>
                <td style="padding: 12px 10px; font-weight: 700;">${item.name || item.spieler}</td>
                <td style="padding: 12px 10px; color: #cbd5e1;">${item.grund}</td>
                <td style="padding: 12px 10px; text-align: right;">
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; ${badgeStyle}">
                        ${item.anzahl}x ${icon}
                    </span>
                </td>
                <td style="padding: 12px 10px; text-align: right;">
                    <button class="btn-today btn-reduce-kasten" data-id="${item.id}" style="padding: 4px 8px;">
                        ${btnText}
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Event-Listener für den Aktions-Button
    tbody.querySelectorAll('.btn-reduce-kasten').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (id) {
                e.currentTarget.disabled = true;
                await reduceKastenAnzahl(id, 1);
            }
        });
    });
}

// Toggle-Logik für Strafkasten / Kabinenfest im Formular
function setupStrafkastenToggle() {
    const labelKasten = document.getElementById('label-strafkasten-kasten');
    const labelFest = document.getElementById('label-strafkasten-fest');
    const radios = document.querySelectorAll('input[name="strafkastenArt"]');

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'KASTEN') {
                labelKasten?.classList.add('active-einnahme');
                if (labelKasten) labelKasten.style.color = '#0f172a';

                labelFest?.classList.remove('active-einnahme');
                if (labelFest) labelFest.style.color = '#94a3b8';
            } else {
                labelFest?.classList.add('active-einnahme');
                if (labelFest) labelFest.style.color = '#0f172a';

                labelKasten?.classList.remove('active-einnahme');
                if (labelKasten) labelKasten.style.color = '#94a3b8';
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    setupStrafkastenToggle();
    document.getElementById('offene-kaesten-player-filter')?.addEventListener('change', renderOffeneKaestenModal);
    document.getElementById('offene-kaesten-typ-filter')?.addEventListener('change', renderOffeneKaestenModal);
});

// === ROTATIONS-KARUSSELL ===
export function initKastenCarousel() {
    const track = document.getElementById('kasten-carousel-track');
    const prevBtn = document.getElementById('kasten-prev-btn');
    const nextBtn = document.getElementById('kasten-next-btn');
    const todayBtn = document.getElementById('kasten-today-btn');
    const personFilter = document.getElementById('kasten-person-filter');

    if (!track || !Array.isArray(bierData)) return;

    const daysMap = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];

    const allFormattedData = bierData.map(entry => {
        const d = new Date(entry.date);
        return {
            ...entry,
            displayDate: `${daysMap[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
        };
    });

    if (personFilter) {
        const uniquePersons = [...new Set(allFormattedData.map(e => e.name))].sort();
        personFilter.innerHTML = `<option value="ALL">👤 Alle Personen</option>` +
            uniquePersons.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    let filteredData = [...allFormattedData];
    let currentIndex = 0;

    function resetToToday() {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const idx = filteredData.findIndex(e => e.date >= todayStr);

        if (idx !== -1) {
            currentIndex = idx;
        } else {
            currentIndex = filteredData.length - 1;
        }
        updateCarousel();
    }

    function updateCarousel() {
        if (filteredData.length === 0) {
            track.innerHTML = `<div class="no-matches">Keine Termine gefunden.</div>`;
            track.style.transform = `translateY(0px)`;
            return;
        }

        const itemHeight = 35;
        const viewportHeight = 200;
        const translateY = (viewportHeight / 2) - (itemHeight / 2) - (currentIndex * itemHeight);

        track.style.transform = `translateY(${translateY}px)`;

        const items = track.querySelectorAll('.carousel-item');
        items.forEach((item, i) => {
            item.classList.toggle('active', i === currentIndex);
        });

        if (prevBtn) prevBtn.disabled = currentIndex === 0;
        if (nextBtn) nextBtn.disabled = currentIndex === filteredData.length - 1;
    }

    function renderTrack() {
        track.innerHTML = filteredData.map((item, i) => `
            <div class="carousel-item" data-index="${i}">
                <span class="item-date">${item.displayDate}</span>
                <span class="item-name">${item.name}</span>
            </div>
        `).join('');

        track.querySelectorAll('.carousel-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                if (!isNaN(idx)) {
                    currentIndex = idx;
                    updateCarousel();
                }
            });
        });

        updateCarousel();
    }

    if (!track.dataset.initialized) {
        track.dataset.initialized = "true";

        personFilter?.addEventListener('change', (e) => {
            const selected = e.target.value;
            filteredData = selected === 'ALL' ? [...allFormattedData] : allFormattedData.filter(item => item.name === selected);
            currentIndex = 0;
            renderTrack();
        });

        todayBtn?.addEventListener('click', () => {
            if (personFilter) personFilter.value = 'ALL';
            filteredData = [...allFormattedData];
            renderTrack();
            resetToToday();
        });

        prevBtn?.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });

        nextBtn?.addEventListener('click', () => {
            if (currentIndex < filteredData.length - 1) {
                currentIndex++;
                updateCarousel();
            }
        });

        track.parentElement?.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY > 0 && currentIndex < filteredData.length - 1) {
                currentIndex++;
                updateCarousel();
            } else if (e.deltaY < 0 && currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        }, { passive: false });
    }

    renderTrack();
    resetToToday();
}