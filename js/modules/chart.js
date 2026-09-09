let kasseChartInstance = null;

/**
 * Erstellt oder aktualisiert das Kassenstand-Diagramm.
 * Der Startwert wird komplett aus den Buchungen im Logbuch berechnet.
 */
export function renderKasseChart(logbook = []) {
    const canvas = document.getElementById('kasseChart');
    if (!canvas) return;

    // 1. Nur bezahlte Einträge/Buchungen chronologisch sortieren
    const paidEntries = logbook
        .filter(item => item.bezahlt)
        .sort((a, b) => a.id - b.id);

    let runningTotal = 0;
    const dailyTotals = {};

    // 2. Buchungen fortlaufend berechnen
    paidEntries.forEach(entry => {
        runningTotal += entry.betrag;
        const dateKey = entry.datum || entry.bezahltAm || 'Unbekannt';
        dailyTotals[dateKey] = runningTotal;
    });

    const labels = Object.keys(dailyTotals);
    const dataPoints = Object.values(dailyTotals);

    // 3. Alte Chart-Instanz zerstören
    if (kasseChartInstance) {
        kasseChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');

    // 4. Chart.js Konfiguration
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
                tension: 0.3,
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
                        label: (context) => ` Kassenstand: ${context.parsed.y.toFixed(2).replace('.', ',')} €`
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