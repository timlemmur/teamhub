// GitHub Repository Konfiguration (OHNE SENSITIVE KEYS)
const GH_CONFIG = {
    owner: 'timlemmur',               // Dein GitHub Username
    repo: 'teamhub',       // Dein Repo Name
    path: 'data/strafen.json',         // Pfad zur JSON-Datei
    branch: 'main'
};

const API_URL = `https://api.github.com/repos/${GH_CONFIG.owner}/${GH_CONFIG.repo}/contents/${GH_CONFIG.path}`;

let cachedSHA = "";

/**
 * Holt den Token aus dem localStorage
 */
export function getStoredToken() {
    return localStorage.getItem('gh_kasse_token') || "";
}

/**
 * Speichert den Token im localStorage
 */
export function setStoredToken(token) {
    localStorage.setItem('gh_kasse_token', token);
}

/**
 * Löscht den Token beim Logout
 */
export function removeStoredToken() {
    localStorage.removeItem('gh_kasse_token');
}

/**
 * Testet, ob der Token gültig ist und Schreibrechte besitzt
 */
export async function validateToken(token) {
    try {
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Lädt die Strafendaten aus der JSON auf GitHub (öffentlich lesbar)
 */
export async function fetchStrafenFromRepo() {
    try {
        const response = await fetch(API_URL, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!response.ok) throw new Error("Fehler beim Abrufen der JSON-Daten.");

        const data = await response.json();
        cachedSHA = data.sha; // Speichere SHA für zukünftige Commits

        // UTF-8 / Base64 Entschlüsselung
        const jsonText = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
        return JSON.parse(jsonText);
    } catch (err) {
        console.error("Fetch Error:", err);
        return [];
    }
}

/**
 * Sendet aktualisierte Strafen als Commit zurück an GitHub
 */
export async function saveStrafenToRepo(strafenArray) {
    const token = getStoredToken();
    if (!token) {
        alert("Kein GitHub Token gefunden. Bitte neu einloggen.");
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
                message: 'fix(kasse): Kassenstand & Logbuch aktualisiert',
                content: encodedContent,
                sha: cachedSHA,
                branch: GH_CONFIG.branch
            })
        });

        if (response.ok) {
            const resData = await response.json();
            cachedSHA = resData.content.sha; // SHA nach Commit aktualisieren
            return true;
        } else {
            const err = await response.json();
            alert(`Fehler beim Speichern: ${err.message}`);
            return false;
        }
    } catch (err) {
        console.error("Save Error:", err);
        return false;
    }
}