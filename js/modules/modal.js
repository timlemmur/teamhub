import { strafenData } from '../data.js';
import { getStrafenData, renderLogbuchModal, renderKasseStats } from './kasse.js';
import { getStoredToken, saveStrafenToRepo } from '../services/github.js';

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
        admin: 'admin-modal',
        buchung: 'buchung-modal'
    };
    if (modalMap[moduleName]) {
        const modalEl = document.getElementById(modalMap[moduleName]);
        if (modalEl) {
            modalEl.classList.remove('active');
            if (moduleName === 'admin' || moduleName === 'buchung') {
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

export function renderOffeneStrafenModal() {
    const tbody = document.getElementById('offene-strafen-modal-body');
    const adminContainer = document.getElementById('admin-strafe-add-container');
    const addBtn = document.getElementById('btn-open-add-strafe-modal');
    if (!tbody) return;

    const logbook = getStrafenData();
    const offene = logbook.filter(s => !s.bezahlt);
    const isAdmin = Boolean(getStoredToken());

    // Admin-Container ein-/ausblenden
    if (adminContainer) {
        adminContainer.style.display = isAdmin ? 'block' : 'none';
    }

    // Event-Listener sichern
    if (addBtn && !addBtn.dataset.bound) {
        addBtn.dataset.bound = "true";
        addBtn.addEventListener('click', () => {
            const addModal = document.getElementById('add-strafe-modal');
            if (addModal) {
                addModal.classList.remove('hidden');
                addModal.classList.add('active');
            }
        });
    }

    if (offene.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 5 : 4}" style="text-align: center; color: #4ade80; padding: 20px;">🎉 Keine offenen Strafen vorhanden!</td></tr>`;
        return;
    }

    tbody.innerHTML = offene.map(item => `
        <tr>
            <td style="color: #94a3b8;">${item.datum}</td>
            <td><strong>${item.name}</strong></td>
            <td>${item.grund}</td>
            <td style="color: #f59e0b; font-weight: bold; text-align: right;">${item.betrag.toFixed(2).replace('.', ',')} €</td>
            ${isAdmin ? `
                <td style="text-align: right;">
                    <button class="btn-today btn-pay-offen" data-id="${item.id}" style="font-size: 0.75rem; padding: 4px 8px;">
                        Als bezahlt
                    </button>
                </td>
            ` : ''}
        </tr>
    `).join('');

    if (isAdmin) {
        document.querySelectorAll('.btn-pay-offen').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = Number(e.target.getAttribute('data-id'));
                const item = logbook.find(s => s.id === id);

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