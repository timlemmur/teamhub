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
    if (badgeEl) {
        // Gesamtzahl aller offenen Kästen aufsummieren
        const total = kaestenData.reduce((sum, item) => sum + (Number(item.anzahl) || 0), 0);
        badgeEl.textContent = total;
    }
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

    // Falls 0 oder weniger Kästen übrig bleiben -> Eintrag löschen
    if (kaestenData[index].anzahl <= 0) {
        kaestenData.splice(index, 1);
    }

    const success = await saveKaestenToRepo(kaestenData);
    if (success) {
        updateKastenBadge();
    } else {
        // Rollback bei Speicherfehler
        kaestenData = previousState;
        updateKastenBadge();
    }
    return success;
}

/**
 * Fügt einen neuen Kasten-Eintrag hinzu oder aggregiert, falls Grund & Spieler identisch sind
 */
export async function addStrafkastenEntry(spieler, grund, anzahl) {
    const count = Number(anzahl) || 1;
    const existingIndex = kaestenData.findIndex(
        k => (k.name || '').toLowerCase() === (spieler || '').toLowerCase() &&
             (k.grund || '').toLowerCase() === (grund || '').toLowerCase()
    );

    const previousState = JSON.parse(JSON.stringify(kaestenData));

    if (existingIndex !== -1) {
        // Bereits vorhandenen Eintrag aufsummieren
        kaestenData[existingIndex].anzahl = (Number(kaestenData[existingIndex].anzahl) || 0) + count;
    } else {
        // Neuen Eintrag anlegen
        const newEntry = {
            id: Date.now(),
            datum: new Date().toLocaleDateString('de-DE'),
            name: spieler,
            grund: grund,
            anzahl: count
        };
        kaestenData.push(newEntry);
    }

    const success = await saveKaestenToRepo(kaestenData);
    if (success) {
        updateKastenBadge();
    } else {
        kaestenData = previousState;
        updateKastenBadge();
    }
    return success;
}

// Toggle-Logik für Strafkasten / Kabinenfest
function setupStrafkastenToggle() {
    const labelKasten = document.getElementById('label-strafkasten-kasten');
    const labelFest = document.getElementById('label-strafkasten-fest');
    const radios = document.querySelectorAll('input[name="strafkastenArt"]');

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'KASTEN') {
                labelKasten?.classList.add('active-einnahme');
                labelKasten.style.color = '#0f172a';

                labelFest?.classList.remove('active-einnahme');
                labelFest.style.color = '#94a3b8';
            } else {
                labelFest?.classList.add('active-einnahme');
                labelFest.style.color = '#0f172a';

                labelKasten?.classList.remove('active-einnahme');
                labelKasten.style.color = '#94a3b8';
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    setupStrafkastenToggle();
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

        // Klick auf ein Element zentriert dieses
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

    // Einmalig Event-Listener registrieren (Schutz vor doppelten Listenern)
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

        // Mausrad-Unterstützung
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