import { kioskData } from '../data.js';

export function initKioskCarousel() {
    const track = document.getElementById('kiosk-carousel-track');
    const dotsContainer = document.getElementById('kiosk-dots');
    const prevBtn = document.getElementById('kiosk-prev-btn');
    const nextBtn = document.getElementById('kiosk-next-btn');

    if (!track) return;

    const todayStr = new Date().toISOString().split('T')[0];

    function calculateTreffpunkt(uhrzeitStr) {
        const [hours, mins] = uhrzeitStr.split(':').map(Number);
        return `${String(hours - 1).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    let activeIndex = kioskData.findIndex(match => {
        const [d, m, y] = match.datum.split('.');
        return `${y}-${m}-${d}` >= todayStr;
    });

    if (activeIndex === -1) activeIndex = 0;

    track.innerHTML = kioskData.map((match) => {
        const isIggelheim = match.halle.toLowerCase() === 'iggelheim';
        const badgeClass = isIggelheim ? 'iggelheim' : 'meckenheim';

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
                        <span class="kiosk-value">${match.kasse}</span>
                    </div>
                    <div class="kiosk-row">
                        <span class="kiosk-label">🍕 Kiosk-Team:</span>
                        <span class="kiosk-value">${match.kiosk.join(', ')}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (dotsContainer) {
        dotsContainer.innerHTML = kioskData.map((_, i) =>
            `<span class="kiosk-dot ${i === activeIndex ? 'active' : ''}"></span>`
        ).join('');
    }

    function updateKiosk() {
        track.style.transform = `translateX(-${activeIndex * 100}%)`;
        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll('.kiosk-dot');
            dots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
        }
    }

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

    updateKiosk();
}