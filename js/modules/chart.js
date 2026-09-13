let kasseChartInstance = null;

/**
 * Hilfsfunktion: Wandelt 'DD.MM.YYYY' in ein vergleichbares Date-Objekt um
 */
function parseGermanDate(dateStr) {
    if (!dateStr || dateStr === 'Unbekannt') return new Date(0);
    const parts = dateStr.split('.');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(dateStr);
}

/**
 * Hilfsfunktion: Formatiert Differenzen mit +/- Vorzeichen
 */
function formatDiff(amount) {
    const prefix = amount > 0 ? '+' : '';
    return `${prefix}${amount.toFixed(2).replace('.', ',')} €`;
}

/**
 * Erstellt oder aktualisiert das Kassenstand-Diagramm.
 */
export function renderKasseChart(logbook = []) {
    const canvas = document.getElementById('kasseChart');
    if (!canvas) return;

    // 1. Nur bezahlte Einträge/Buchungen erfassen und chronologisch sortieren
    const paidEntries = logbook
        .filter(item => item.bezahlt)
        .sort((a, b) => {
            const dateA = parseGermanDate(a.bezahltAm || a.datum);
            const dateB = parseGermanDate(b.bezahltAm || b.datum);
            return dateA - dateB;
        });

    let runningTotal = 0;
    const dailyTotals = {};

    // 2. Buchungen fortlaufend am Tag der Bezahlung aufsummieren
    paidEntries.forEach(entry => {
        runningTotal += Number(entry.betrag) || 0;
        const dateKey = entry.bezahltAm || entry.datum || 'Unbekannt';
        dailyTotals[dateKey] = runningTotal;
    });

    // 3. Keys nach echtem Datum sortieren
    const labels = Object.keys(dailyTotals).sort((a, b) => {
        return parseGermanDate(a) - parseGermanDate(b);
    });

    const dataPoints = labels.map(label => dailyTotals[label]);

    // 4. Alte Chart-Instanz zerstören
    if (kasseChartInstance) {
        kasseChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');

    // 5. Chart.js Konfiguration
    kasseChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kassenstand (€)',
                data: dataPoints,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                borderWidth: 2,
                fill: true,
                tension: 0, // Keine Schein-Ausschläge bei flachen Linien
                pointBackgroundColor: '#38bdf8',
                pointRadius: labels.length > 20 ? 2 : 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Kassenstand: ${context.parsed.y.toFixed(2).replace('.', ',')} €`,
                        afterBody: (tooltipItems) => {
                            if (!tooltipItems.length) return [];

                            const index = tooltipItems[0].dataIndex;
                            const currentVal = dataPoints[index];
                            const currentDate = parseGermanDate(labels[index]);

                            // --- 1. Differenz zum letzten Daten-Tag ---
                            let prevDiffText = 'letzter Eintrag: 0,00 €';
                            if (index > 0) {
                                const prevVal = dataPoints[index - 1];
                                const diffPrev = currentVal - prevVal;
                                prevDiffText = `letzter Eintrag: ${formatDiff(diffPrev)}`;
                            }

                            // --- 2. Differenz zur letzten Woche (7 Tage vor/an dem aktuellen Datum) ---
                            // Sucht den neuesten Datenpunkt, der mindestens 7 Tage vor dem aktuellen Datum liegt
                            let weekVal = dataPoints[0]; // Fallback auf den Startwert
                            let foundWeekBase = false;

                            for (let i = index - 1; i >= 0; i--) {
                                const checkDate = parseGermanDate(labels[i]);
                                const diffDays = (currentDate - checkDate) / (1000 * 60 * 60 * 24);

                                if (diffDays >= 7) {
                                    weekVal = dataPoints[i];
                                    foundWeekBase = true;
                                    break;
                                }
                            }

                            // Wenn der Zeitraum noch nicht 7 Tage zurückreicht, nutzen wir den ältesten verfügbaren Wert als Basis
                            const diffWeek = currentVal - weekVal;
                            const weekDiffText = `7 Tage: ${formatDiff(diffWeek)}`;

                            return ['', prevDiffText, weekDiffText];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => value + ' €'
                    }
                }
            }
        }
    });
}
