import { fetchVideosFromRepo, saveVideosToRepo } from '../services/github.js'; // [source: 7]

let videosData = [];

export async function initVideosModule() { // [source: 7]
    try {
        const remoteVideos = await fetchVideosFromRepo(); // [source: 7]
        if (Array.isArray(remoteVideos)) { // [source: 7]
            videosData = remoteVideos; // [source: 7]
        }
    } catch (err) {
        console.warn("Ladefehler bei videos.json:", err); // [source: 7]
    }
}

export function getVideosData() { // [source: 7]
    return videosData; // [source: 7]
}

export function extractYouTubeID(url) { // [source: 7]
    if (!url) return null; // [source: 7]
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/; // [source: 7]
    const match = url.match(regExp); // [source: 7]
    return (match && match[2].length === 11) ? match[2] : null; // [source: 7]
}

export async function addVideoEntry(title, subtitle, url, season = "2026/2027") {
    const newEntry = {
        id: Date.now().toString(),
        title: title,
        subtitle: subtitle,
        url: url,
        season: season,
        category: "recent" // [source: 7]
    };

    const previousState = [...videosData]; // [source: 7]
    videosData.unshift(newEntry); // [source: 7]

    const success = await saveVideosToRepo(videosData); // [source: 7]
    if (!success) {
        videosData = previousState; // [source: 7]
    }
    return success;
}

/**
 * Rendert die Hauptansicht im Videoarchiv-Modal (Maximal 5 neueste Videos)
 */
export function renderVideosModal() {
    const container = document.getElementById('recent-videos-grid');
    if (!container) return;

    if (videosData.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">Keine Videos vorhanden.</div>`;
        return;
    }

    const searchVal = (document.getElementById('video-search-input')?.value || '').toLowerCase();

    const filtered = videosData.filter(v => 
        (v.title || '').toLowerCase().includes(searchVal) || 
        (v.subtitle || '').toLowerCase().includes(searchVal)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">Keine Videos für "${searchVal}" gefunden.</div>`;
        return;
    }

    // WICHTIG: Nur die neusten 5 Videos in der Hauptübersicht anzeigen
    const top5Videos = filtered.slice(0, 5);

    container.innerHTML = top5Videos.map(v => createVideoCardHtml(v)).join('');
}

/**
 * Rendert das Sub-Modal für die gesamte Saison (Alle Spiele / bis zu 22 Kacheln)
 */
export function renderSeasonArchiveModal(seasonName = "2026/2027") {
    const container = document.getElementById('season-archive-grid');
    const titleEl = document.getElementById('season-archive-title');
    if (!container) return;

    if (titleEl) titleEl.textContent = `📁 Saison ${seasonName}`;

    // Filtere Videos der gewählten Saison (Standardmäßig alle, falls noch keine Saison hinterlegt ist)
    const seasonVideos = videosData.filter(v => !v.season || v.season === seasonName);

    if (seasonVideos.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">Noch keine Spiele für Saison ${seasonName} aufgezeichnet.</div>`;
        return;
    }

    const searchVal = (document.getElementById('season-search-input')?.value || '').toLowerCase();

    const filtered = seasonVideos.filter(v => 
        (v.title || '').toLowerCase().includes(searchVal) || 
        (v.subtitle || '').toLowerCase().includes(searchVal)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">Kein Spiel gefunden.</div>`;
        return;
    }

    // Rendert ALLE gefilterten Spiele der Saison
    container.innerHTML = filtered.map(v => createVideoCardHtml(v)).join('');
}

/**
 * Hilfsfunktion zum Erstellen des Kachel-HTMLs
 */
function createVideoCardHtml(v) {
    const ytId = extractYouTubeID(v.url); // [source: 7]
    const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : 'assets/matchday-graphic.png'; // [source: 7]

    return `
        <a href="${v.url}" target="_blank" rel="noopener" class="video-card" data-title="${v.title} ${v.subtitle}">
            <div class="thumbnail-wrapper">
                <img src="${thumbUrl}" alt="${v.title}">
                <div class="play-overlay">▶</div>
            </div>
            <div class="card-info">
                <span class="card-title">${v.title}</span>
                <span class="card-subtitle">${v.subtitle}</span>
            </div>
        </a>
    `; // [source: 7]
}