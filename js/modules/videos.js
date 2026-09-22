import { fetchVideosFromRepo, saveVideosToRepo } from '../services/github.js';

let videosData = [];
let currentSelectedCategory = "ALL";

export async function initVideosModule() {
    try {
        const remoteVideos = await fetchVideosFromRepo();
        if (Array.isArray(remoteVideos)) {
            videosData = remoteVideos;
        }
    } catch (err) {
        console.warn("Ladefehler bei videos.json:", err);
    }
}

export function getVideosData() {
    return videosData;
}

export function extractYouTubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

export async function addVideoEntry(title, subtitle, url, category = "Full Game", season = "2026/2027") {
    const newEntry = {
        id: Date.now().toString(),
        title: title,
        subtitle: subtitle,
        url: url,
        category: category,
        season: season
    };

    const previousState = [...videosData];
    videosData.unshift(newEntry);

    const success = await saveVideosToRepo(videosData);
    if (!success) {
        videosData = previousState;
    }
    return success;
}

/**
 * Rendert die Hauptansicht im Videoarchiv-Modal
 * (Neueste 4 Videos + Dynamische Ordner-Kacheln nach Kategorie)
 */
export function renderVideosModal() {
    const container = document.getElementById('recent-videos-grid');
    const folderContainer = document.getElementById('category-folders-grid');
    if (!container) return;

    if (videosData.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">Keine Videos vorhanden.</div>`;
        if (folderContainer) folderContainer.innerHTML = '';
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

    // 1. Genau die neuesten 4 Videos in der Top-Sektion anzeigen
    const top4Videos = filtered.slice(0, 4);
    container.innerHTML = top4Videos.map(v => createVideoCardHtml(v)).join('');

    // 2. Ordner-Kacheln für die verschiedenen Kategorien rendern
    if (folderContainer) {
        const categories = [
            { id: "ALL", name: "Saison 2026/2027", sub: "Alle Spiele & Vorbereitungen" },
            { id: "Full Game", name: "Full Games", sub: "Volle Spielaufzeichnungen" },
            { id: "Spielanalysen", name: "Spielanalysen", sub: "Taktik & Analysen" },
        ];

        folderContainer.innerHTML = categories.map(cat => {
            const count = cat.id === "ALL" 
                ? videosData.length 
                : videosData.filter(v => (v.category || "Full Game") === cat.id).length;

            return `
                <div class="video-card playlist-card folder-card" data-cat="${cat.id}" style="cursor: pointer;">
                    <div class="placeholder-icon">📁</div>
                    <div class="card-info">
                        <span class="card-title">${cat.name}</span>
                        <span class="card-subtitle">${count} Video(s) • ${cat.sub}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Click-Handler für die Ordner
        folderContainer.querySelectorAll('.folder-card').forEach(folder => {
            folder.addEventListener('click', (e) => {
                const cat = e.currentTarget.getAttribute('data-cat');
                currentSelectedCategory = cat;
                
                // Schließe Hauptmodal und öffne Sub-Modal
                if (window.closeModule && window.openModule) {
                    window.closeModule('videos');
                    window.openModule('seasonArchive');
                }
            });
        });
    }
}

/**
 * Rendert das Sub-Modal für die gewählte Kategorie
 */
export function renderSeasonArchiveModal() {
    const container = document.getElementById('season-archive-grid');
    const titleEl = document.getElementById('season-archive-title');
    if (!container) return;

    const catNames = {
        "ALL": "Alle Videos 2026/2027",
        "Full Game": "Full Games 2026/2027",
        "Spielanalysen": "Spielanalysen",
    };

    if (titleEl) {
        titleEl.textContent = `📁 ${catNames[currentSelectedCategory] || currentSelectedCategory}`;
    }

    const searchVal = (document.getElementById('season-search-input')?.value || '').toLowerCase();

    // Filtere Videos nach Kategorie & Suche
    const filtered = videosData.filter(v => {
        const matchesCat = currentSelectedCategory === "ALL" || (v.category || "Full Game") === currentSelectedCategory;
        const matchesSearch = (v.title || '').toLowerCase().includes(searchVal) || 
                              (v.subtitle || '').toLowerCase().includes(searchVal);
        return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">Keine Videos in diesem Ordner vorhanden.</div>`;
        return;
    }

    container.innerHTML = filtered.map(v => createVideoCardHtml(v)).join('');
}

function createVideoCardHtml(v) {
    const ytId = extractYouTubeID(v.url);
    const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : 'assets/matchday-graphic.png';

    return `
        <a href="${v.url}" target="_blank" rel="noopener" class="video-card">
            <div class="thumbnail-wrapper">
                <img src="${thumbUrl}" alt="${v.title}">
                <div class="play-overlay">▶</div>
            </div>
            <div class="card-info">
                <span class="card-title">${v.title}</span>
                <span class="card-subtitle">${v.subtitle}</span>
            </div>
        </a>
    `;
}