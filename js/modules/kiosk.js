import { kioskData } from '../data.js';

export function initKioskCarousel() {
    const track = document.getElementById('kiosk-carousel-track');
    const dotsContainer = document.getElementById('kiosk-dots');
    const prevBtn = document.getElementById('kiosk-prev-btn');
    const nextBtn = document.getElementById('kiosk-next-btn');

    if (!track || !Array.isArray(kioskData) || kioskData.length === 0) return;

    // Aktuelles Datum um 00:00 Uhr setzen (für exakte Vergleiche)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Hilfsfunktion: Berechnet Treffpunkt 1 Stunde vor Anpfiff
    function calculateTreffpunkt(uhrzeitStr) {
        if (!uhrzeitStr || !uhrzeitStr.includes(':')) return '–';
        const [hours, mins] = uhrzeitStr.split(':').map(Number);
        const treffHours = hours - 1 < 0 ? 23 : hours - 1;
        return `${String(treffHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    // Nächstgelegenes zukünftiges/heutiges Spiel finden
    let activeIndex = kioskData.findIndex(match => {
        if (!match.datum) return false;
        const [d, m, y] = match.datum.split('.').map(Number);
        const matchDate = new Date(y, m - 1, d);
        return matchDate >= today;
    });

    // Falls alle Spiele vergangen sind, das letzte Spiel anzeigen
    if (activeIndex === -1) {
        activeIndex = kioskData.length - 1;
    }

    // HTML-Karten generieren
    track.innerHTML = kioskData.map((match) => {
        const isIggelheim = (match.halle || '').toLowerCase() === 'iggelheim';
        const badgeClass = isIggelheim ? 'iggelheim' : 'meckenheim';
        const kioskTeam = Array.isArray(match.kiosk) ? match.kiosk.join(', ') : (match.kiosk || 'Keine Angabe');

        return `
            <div class="kiosk-card">
                <div class="kiosk-card-header">
                    <span class="kiosk-opponent">${match.gegner}</span>
                    <span class="kiosk-badge ${badgeClass}">${match.halle}</span>
                </div>
                <div class="kiosk-meta">
                    📅 ${match.datum} • ⏰ Anpfiff: ${match.uhrzeit} Uhr
                </div>
                <div class="kiosk-assignments">
                    <div class="kiosk-row">
                        <span class="kiosk-label">📍 Treffpunkt:</span>
                        <span class="kiosk-value">${calculateTreffpunkt(match.uhrzeit)} Uhr</span>
                    </div>
                    <div class="kiosk-row">
                        <span class="kiosk-label">💰 Kasse:</span>
                        <span class="kiosk-value">${match.kasse || 'Offen'}</span>
                    </div>
                    <div class="kiosk-row">
                        <span class="kiosk-label">🍿 Kiosk-Team:</span>
                        <span class="kiosk-value">${kioskTeam}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Pagination Dots befüllen
    if (dotsContainer) {
        dotsContainer.innerHTML = kioskData.map((_, i) =>
            `<span class="kiosk-dot ${i === activeIndex ? 'active' : ''}" data-index="${i}"></span>`
        ).join('');

        // Klick auf Dots ermöglichen
        dotsContainer.querySelectorAll('.kiosk-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                const targetIdx = parseInt(e.target.getAttribute('data-index'), 10);
                if (!isNaN(targetIdx)) {
                    activeIndex = targetIdx;
                    updateKiosk();
                }
            });
        });
    }

    function updateKiosk() {
        track.style.transform = `translateX(-${activeIndex * 100}%)`;
        
        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll('.kiosk-dot');
            dots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
        }

        if (prevBtn) prevBtn.disabled = activeIndex === 0;
        if (nextBtn) nextBtn.disabled = activeIndex === kioskData.length - 1;
    }

    // Button-Event-Listener
    prevBtn?.addEventListener('click', () => {
        if (activeIndex > 0) {
            activeIndex--;
            updateKiosk();
        }
    });

    nextBtn?.addEventListener('click', () => {
        if (activeIndex < kioskData.length - 1) {
            activeIndex++;
            updateKiosk();
        }
    });

    // Touch-Steuerung für mobile Geräte (Swipe)
    let startX = 0;
    let endX = 0;

    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;

        if (Math.abs(diffX) > 40) { // Mindestdistanz für Swipe
            if (diffX > 0 && activeIndex < kioskData.length - 1) {
                activeIndex++; // Swipe nach links -> nächstes Spiel
                updateKiosk();
            } else if (diffX < 0 && activeIndex > 0) {
                activeIndex--; // Swipe nach rechts -> vorheriges Spiel
                updateKiosk();
            }
        }
    }, { passive: true });

    updateKiosk();
}