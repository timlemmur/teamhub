export const initTextSync = () => {
    const bindTextSync = (inputId, displayId, transformFn = val => val) => {
        const input = document.getElementById(inputId);
        const display = document.getElementById(displayId);
        if (input && display) {
            input.addEventListener('input', (e) => {
                display.textContent = transformFn(e.target.value);
            });
        }
    };

    // Standard Text-Syncs
    bindTextSync('input-matchday', 'display-matchday', v => v.toUpperCase());
    bindTextSync('input-hashtag', 'display-hashtag');
    bindTextSync('input-home-name', 'display-home-name', v => v.toUpperCase());
    bindTextSync('input-away-name', 'display-away-name', v => v.toUpperCase());
    bindTextSync('input-date', 'display-date');
    bindTextSync('input-time', 'display-time', v => v.toUpperCase());
    bindTextSync('input-hall', 'display-hall');

    // --- AUTOMATISCHES AKTUELLES DATUM (HEUTE) ---
    const textDateInput = document.getElementById('input-date');
    const displayDate = document.getElementById('display-date');

    if (textDateInput) {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const formattedToday = `${day}.${month}.${year}`;

        // Standardwerte in Input & Vorschau setzen
        textDateInput.value = formattedToday;
        if (displayDate) {
            displayDate.textContent = formattedToday;
        }
    }

    // Spielart Dropdown
    const selectTitle = document.getElementById('select-title');
    if (selectTitle) {
        selectTitle.addEventListener('change', (e) => {
            const displayTitle = document.getElementById('display-title');
            const val = e.target.value;
            displayTitle.textContent = val;
            displayTitle.classList.toggle('is-auswaerts', val === 'AUSWÄRTSSPIEL');
        });
    }

    // VERSTECKTER DATUM-PICKER LOGIK
    const hiddenDatePicker = document.getElementById('hidden-date-picker');

    document.getElementById('btn-date-picker')?.addEventListener('click', () => {
        if (hiddenDatePicker && typeof hiddenDatePicker.showPicker === 'function') {
            hiddenDatePicker.showPicker();
        }
    });

    hiddenDatePicker?.addEventListener('change', (e) => {
        if (!e.target.value) return;
        const [year, month, day] = e.target.value.split('-');
        const formattedDate = `${day}.${month}.${year}`;

        if (textDateInput) {
            textDateInput.value = formattedDate;
            textDateInput.dispatchEvent(new Event('input')); // Triggert Vorschau-Update
        }
    });

    // VERSTECKTER UHRZEIT-PICKER LOGIK
    const textTimeInput = document.getElementById('input-time');
    const hiddenTimePicker = document.getElementById('hidden-time-picker');

    document.getElementById('btn-time-picker')?.addEventListener('click', () => {
        if (hiddenTimePicker && typeof hiddenTimePicker.showPicker === 'function') {
            hiddenTimePicker.showPicker();
        }
    });

    hiddenTimePicker?.addEventListener('change', (e) => {
        if (!e.target.value) return;
        const formattedTime = `${e.target.value} UHR`;

        if (textTimeInput) {
            textTimeInput.value = formattedTime;
            textTimeInput.dispatchEvent(new Event('input')); // Triggert Vorschau-Update
        }
    });

    // TOGGLE LOGIK FÜR INFOBAR
    const toggleInfobar = document.getElementById('toggle-infobar');
    const blockInfo = document.getElementById('block-info');
    const matchdayCard = document.getElementById('matchday-card');

    if (toggleInfobar && matchdayCard && blockInfo) {
        const updateInfobarState = () => {
            const isChecked = toggleInfobar.checked;
            blockInfo.style.display = isChecked ? 'flex' : 'none';
            matchdayCard.classList.toggle('no-infobar', !isChecked);
        };

        updateInfobarState();
        toggleInfobar.addEventListener('change', updateInfobarState);
    }
};