export const initModal = () => {
    let currentSelectingTarget = null;
    
    // --- TEAM MODAL LOGIK ---
    const teamModal = document.getElementById('team-modal');
    const teamSearchInput = document.getElementById('team-search-input');

    const filterTeams = (query) => {
        const q = query.toLowerCase().trim();
        const pinnedSection = document.getElementById('section-pinned');
        
        if (pinnedSection) {
            pinnedSection.style.display = q.length > 0 ? 'none' : 'block';
        }

        document.querySelectorAll('#team-modal .team-card').forEach(card => {
            const name = card.querySelector('span').textContent.toLowerCase();
            card.style.display = name.includes(q) ? 'flex' : 'none';
        });
    };

    const openTeamModal = (targetType) => {
        currentSelectingTarget = targetType;
        if (teamSearchInput) {
            teamSearchInput.value = '';
            filterTeams('');
        }
        teamModal?.classList.add('active');
        setTimeout(() => teamSearchInput?.focus(), 100);
    };

    const closeTeamModal = () => {
        teamModal?.classList.remove('active');
    };

    document.getElementById('btn-open-modal-home')?.addEventListener('click', () => openTeamModal('home'));
    document.getElementById('btn-open-modal-away')?.addEventListener('click', () => openTeamModal('away'));
    document.getElementById('modal-close-btn')?.addEventListener('click', closeTeamModal);

    teamModal?.addEventListener('click', (e) => {
        if (e.target === teamModal) closeTeamModal();
    });

    document.querySelectorAll('#team-modal .team-card').forEach(card => {
        card.addEventListener('click', () => {
            if (!currentSelectingTarget) return;

            const teamName = card.dataset.team;
            const logoFileName = card.dataset.logo;
            const type = currentSelectingTarget;

            document.getElementById(`input-${type}-name`).value = teamName.toUpperCase();
            document.getElementById(`display-${type}-name`).textContent = teamName.toUpperCase();
            document.getElementById(`display-${type}-logo`).src = `logos/${logoFileName}`;

            closeTeamModal();
        });
    });

    teamSearchInput?.addEventListener('input', (e) => filterTeams(e.target.value));

    // --- SPIELER / TEMPLATE MODAL LOGIK ---
    const playerModal = document.getElementById('player-modal');
    const playerSearchInput = document.getElementById('player-search-input');

    const filterPlayers = (query) => {
        const q = query.toLowerCase().trim();
        const baseSection = document.getElementById('section-base-templates');
        
        if (baseSection) {
            baseSection.style.display = q.length > 0 ? 'none' : 'block';
        }

        document.querySelectorAll('#player-modal .player-card').forEach(card => {
            const name = card.querySelector('span').textContent.toLowerCase();
            card.style.display = name.includes(q) ? 'flex' : 'none';
        });
    };

    const openPlayerModal = () => {
        if (playerSearchInput) {
            playerSearchInput.value = '';
            filterPlayers('');
        }
        playerModal?.classList.add('active');
        setTimeout(() => playerSearchInput?.focus(), 100);
    };

    const closePlayerModal = () => {
        playerModal?.classList.remove('active');
    };

    document.getElementById('btn-open-modal-player')?.addEventListener('click', openPlayerModal);
    document.getElementById('modal-player-close-btn')?.addEventListener('click', closePlayerModal);

    playerModal?.addEventListener('click', (e) => {
        if (e.target === playerModal) closePlayerModal();
    });

    document.querySelectorAll('#player-modal .player-card').forEach(card => {
        card.addEventListener('click', () => {
            const name = card.dataset.name;
            const imageSrc = card.dataset.src;

            const nameInput = document.getElementById('input-player-name');
            const playerImg = document.getElementById('display-player-img');

            if (nameInput) nameInput.value = name;
            if (playerImg) playerImg.src = imageSrc;

            closePlayerModal();
        });
    });

    playerSearchInput?.addEventListener('input', (e) => filterPlayers(e.target.value));
};