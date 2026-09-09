import { strafenData, strafenLogbook } from '../data.js';

export function openModule(moduleName) {
    if (moduleName === 'strafen') {
        renderStrafenTable();
        document.getElementById('strafen-modal')?.classList.add('active');
    } else if (moduleName === 'aemter') {
        renderAemterTable();
        document.getElementById('aemter-modal')?.classList.add('active');
    } else if (moduleName === 'offeneStrafen') {
        renderOffeneStrafenModal();
        document.getElementById('offene-strafen-modal')?.classList.add('active');
    } else if (moduleName === 'logbuch') {
        renderLogbuchModal();
        document.getElementById('logbuch-modal')?.classList.add('active');
    } else if (moduleName === 'admin') {
        const adminModal = document.getElementById('admin-modal');
        if (adminModal) {
            adminModal.classList.remove('hidden');
            adminModal.classList.add('active');
        }
    }
}

export function closeModule(moduleName) {
    const modalMap = {
        strafen: 'strafen-modal',
        aemter: 'aemter-modal',
        offeneStrafen: 'offene-strafen-modal',
        logbuch: 'logbuch-modal',
        admin: 'admin-modal'
    };
    if (modalMap[moduleName]) {
        const modalEl = document.getElementById(modalMap[moduleName]);
        if (modalEl) {
            modalEl.classList.remove('active');
            if (moduleName === 'admin') {
                modalEl.classList.add('hidden');
            }
        }
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

function renderLogbuchModal() {
    const tbody = document.getElementById('logbuch-modal-body');
    if (!tbody) return;

    tbody.innerHTML = strafenLogbook.map(item => `
        <tr>
            <td style="color: #94a3b8;">${item.datum}</td>
            <td><strong>${item.name}</strong></td>
            <td>${item.grund}</td>
            <td>
                <span class="badge-status ${item.bezahlt ? 'paid' : 'unpaid'}">
                    ${item.bezahlt ? `Bezahlt (${item.bezahltAm})` : 'Offen'}
                </span>
            </td>
            <td style="color: ${item.bezahlt ? '#4ade80' : '#f87171'}; font-weight: bold; text-align: right;">
                ${item.betrag.toFixed(2).replace('.', ',')} €
            </td>
        </tr>
    `).join('');
}

function renderOffeneStrafenModal() {
    const tbody = document.getElementById('offene-strafen-modal-body');
    if (!tbody) return;

    const offene = strafenLogbook.filter(s => !s.bezahlt);

    if (offene.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #4ade80; padding: 20px;">🎉 Keine offenen Strafen vorhanden!</td></tr>`;
        return;
    }

    tbody.innerHTML = offene.map(item => `
        <tr>
            <td style="color: #94a3b8;">${item.datum}</td>
            <td><strong>${item.name}</strong></td>
            <td>${item.grund}</td>
            <td style="color: #f59e0b; font-weight: bold; text-align: right;">${item.betrag.toFixed(2).replace('.', ',')} €</td>
        </tr>
    `).join('');
}