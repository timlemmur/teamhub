export const initUploader = () => {
    const uploads = [
        { inputId: 'input-player-img', labelId: 'label-player-img', displayId: 'display-player-img' },
        { inputId: 'input-home-logo', labelId: 'label-home-logo', displayId: 'display-home-logo' },
        { inputId: 'input-away-logo', labelId: 'label-away-logo', displayId: 'display-away-logo' }
    ];

    uploads.forEach(({ inputId, labelId, displayId }) => {
        const fileInput = document.getElementById(inputId);
        const fileLabel = document.getElementById(labelId);
        const displayImg = document.getElementById(displayId);

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (fileLabel) fileLabel.textContent = file.name;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        if (displayImg) displayImg.src = evt.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    });

    const selectPlayer = document.getElementById('select-player');
    if (selectPlayer) {
        selectPlayer.addEventListener('change', (e) => {
            if (e.target.value) {
                document.getElementById('display-player-img').src = e.target.value;
            }
        });
    }
};