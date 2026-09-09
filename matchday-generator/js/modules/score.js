export const initScore = () => {
    const updateScoreDisplay = () => {
        const homeScore = document.getElementById('input-home-score').value.trim();
        const awayScore = document.getElementById('input-away-score').value.trim();
        const displayScore = document.getElementById('display-score');

        if (homeScore !== '' && awayScore !== '') {
            displayScore.textContent = `${homeScore} : ${awayScore}`;
            displayScore.style.display = 'block';
        } else {
            displayScore.textContent = '';
            displayScore.style.display = 'none';
        }
    };

    document.getElementById('input-home-score')?.addEventListener('input', updateScoreDisplay);
    document.getElementById('input-away-score')?.addEventListener('input', updateScoreDisplay);
};