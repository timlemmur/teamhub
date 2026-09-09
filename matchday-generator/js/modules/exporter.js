export const initExporter = () => {
    document.getElementById('btn-download')?.addEventListener('click', () => {
        const card = document.getElementById('matchday-card');
        html2canvas(card, {
            useCORS: true,
            scale: 2
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'matchday-graphic.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });
};