import { bierData } from '../data.js';

export function initKastenCarousel() {
    const track = document.getElementById('kasten-carousel-track');
    const prevBtn = document.getElementById('kasten-prev-btn');
    const nextBtn = document.getElementById('kasten-next-btn');
    const todayBtn = document.getElementById('kasten-today-btn');
    const personFilter = document.getElementById('kasten-person-filter');

    if (!track) return;

    const daysMap = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
    const todayStr = new Date().toISOString().split('T')[0];

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
        // Lokales Datum im Format YYYY-MM-DD erzeugen
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const idx = filteredData.findIndex(e => e.date >= todayStr);

        if (idx !== -1) {
            currentIndex = idx;
        } else {
            // Falls die Saison vorbei ist, zeige das letzte Element
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
        const viewportHeight = 200; // Neue Höhe des Viewports

        // Zentriert das aktive Element exakt in der Mitte der 300px
        const translateY = (viewportHeight / 2) - (itemHeight / 2) - (currentIndex * itemHeight);

        track.style.transform = `translateY(${translateY}px)`;

        const items = track.querySelectorAll('.carousel-item');
        items.forEach((item, i) => {
            item.classList.toggle('active', i === currentIndex);
        });
    }

    function renderTrack() {
        track.innerHTML = filteredData.map((item, i) => `
            <div class="carousel-item" data-index="${i}">
                <span class="item-date">${item.displayDate}</span>
                <span class="item-name">${item.name}</span>
            </div>
        `).join('');
        updateCarousel();
    }

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

    renderTrack();
    resetToToday();
}