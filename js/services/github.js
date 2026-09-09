// Repository Konfiguration — Bitte exakt prüfen!
const GH_CONFIG = {
    owner: 'timlemmur',             // Dein GitHub Name
    repo: 'teamhub',                // Dein Repo Name
    path: 'data/strafen.json',      // Pfad zur JSON-Datei im Repo
    branch: 'main'                  // Oder 'master'
};

const API_URL = `https://api.github.com/repos/${GH_CONFIG.owner}/${GH_CONFIG.repo}/contents/${GH_CONFIG.path}`;

let cachedSHA = "";

export function getStoredToken() {
    return localStorage.getItem('gh_kasse_token') || "";
}

export function setStoredToken(token) {
    localStorage.setItem('gh_kasse_token', token);
}

export function removeStoredToken() {
    localStorage.removeItem('gh_kasse_token');
}

/**
 * Prüft den Token und liefert ein konkretes Fehler-Feedback zurück
 */
export async function validateToken(token) {
    try {
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            cachedSHA = data.sha;
            return { ok: true };
        }

        if (response.status === 401) {
            return { ok: false, msg: 'Ungültiger oder abgelaufener Token (401 Bad credentials).' };
        } else if (response.status === 404) {
            return { ok: false, msg: `Datei '${GH_CONFIG.path}' oder Repository '${GH_CONFIG.owner}/${GH_CONFIG.repo}' nicht gefunden (404).` };
        } else if (response.status === 403) {
            return { ok: false, msg: 'Token hat keine Berechtigung für dieses Repository (403 Forbidden).' };
        } else {
            return { ok: false, msg: `GitHub API Fehler: Status ${response.status}` };
        }
    } catch (err) {
        return { ok: false, msg: `Netzwerkfehler: ${err.message}` };
    }
}

/**
 * Lädt die Daten aus GitHub (öffentlich)
 */
export async function fetchStrafenFromRepo() {
    try {
        const response = await fetch(API_URL, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!response.ok) return [];

        const data = await response.json();
        cachedSHA = data.sha;

        const jsonText = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
        return JSON.parse(jsonText);
    } catch (err) {
        console.error("Fetch Fehler:", err);
        return [];
    }
}

/**
 * Committet die Änderungen ins Repo
 */
export async function saveStrafenToRepo(strafenArray) {
    const token = getStoredToken();
    if (!token) {
        alert("Kein GitHub Token im Speicher gefunden.");
        return false;
    }

    try {
        const updatedContent = JSON.stringify(strafenArray, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(updatedContent)));

        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: 'fix(kasse): Kassenstand via Team Hub aktualisiert',
                content: encodedContent,
                sha: cachedSHA,
                branch: GH_CONFIG.branch
            })
        });

        if (response.ok) {
            const resData = await response.json();
            cachedSHA = resData.content.sha;
            return true;
        } else {
            const err = await response.json();
            alert(`Fehler beim Speichern: ${err.message}`);
            return false;
        }
    } catch (err) {
        alert(`Netzwerkfehler beim Speichern: ${err.message}`);
        return false;
    }
}