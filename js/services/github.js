// Repository Konfiguration
const GH_CONFIG = {
    owner: 'timlemmur',               // Dein GitHub Name
    repo: 'teamhub',                  // Dein Repo Name
    strafenPath: 'data/strafen.json', // Pfad zur Geldstrafen-JSON
    kastenPath: 'data/kasten.json',   // Pfad zur Kasten-JSON
    branch: 'main'                    // Oder 'master'
};

const BASE_API_URL = `https://api.github.com/repos/${GH_CONFIG.owner}/${GH_CONFIG.repo}/contents`;
const STRAFEN_API_URL = `${BASE_API_URL}/${GH_CONFIG.strafenPath}`;
const KASTEN_API_URL = `${BASE_API_URL}/${GH_CONFIG.kastenPath}`;

let cachedStrafenSHA = "";
let cachedKastenSHA = "";

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
 * Saubere UTF-8 Decodierung für Base64 Strings von GitHub
 */
function decodeBase64Utf8(base64Str) {
    try {
        const cleanBase64 = base64Str.replace(/\s/g, '');
        const binaryString = atob(cleanBase64);
        const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
        return new TextDecoder('utf-8').decode(bytes);
    } catch (err) {
        console.error("Fehler beim Decodieren des Base64-Strings:", err);
        return "[]";
    }
}

/**
 * Saubere UTF-8 Encodierung für Base64 Strings nach GitHub
 */
function encodeBase64Utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
}

/**
 * Prüft den Token und liefert ein konkretes Fehler-Feedback zurück
 */
export async function validateToken(token) {
    try {
        const response = await fetch(STRAFEN_API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            cachedStrafenSHA = data.sha;
            return { ok: true };
        }

        if (response.status === 401) {
            return { ok: false, msg: 'Ungültiger oder abgelaufener Token (401 Bad credentials).' };
        } else if (response.status === 404) {
            return { ok: false, msg: `Datei '${GH_CONFIG.strafenPath}' oder Repository nicht gefunden (404).` };
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
 * Hilfsfunktion zum Laden einer JSON-Datei aus GitHub
 */
async function fetchJsonFromUrl(url) {
    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!response.ok) return { data: [], sha: "" };

        const resData = await response.json();
        const jsonText = decodeBase64Utf8(resData.content);
        return { data: JSON.parse(jsonText), sha: resData.sha };
    } catch (err) {
        console.error("Fetch Fehler:", err);
        return { data: [], sha: "" };
    }
}

/**
 * Hilfsfunktion zum Speichern einer JSON-Datei auf GitHub mit Konflikt-Handling (409)
 */
async function saveJsonToUrl(url, contentArray, currentSha, commitMsg) {
    const token = getStoredToken();
    if (!token) {
        alert("Kein GitHub Token im Speicher gefunden.");
        return { success: false, sha: currentSha };
    }

    try {
        const updatedContent = JSON.stringify(contentArray, null, 2);
        const encodedContent = encodeBase64Utf8(updatedContent);

        let shaToUse = currentSha;

        // Falls keine SHA vorhanden ist (z. B. Datei wurde noch nicht geladen), versuchen wir diese zu holen
        if (!shaToUse) {
            const checkRes = await fetch(url, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                shaToUse = checkData.sha;
            }
        }

        const bodyData = {
            message: commitMsg,
            content: encodedContent,
            branch: GH_CONFIG.branch
        };

        if (shaToUse) bodyData.sha = shaToUse;

        let response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(bodyData)
        });

        // Konfliktbehandlung (409 Conflict): Falls SHA veraltet war, aktuelle SHA holen und neu versuchen
        if (response.status === 409) {
            const fetchLatest = await fetchJsonFromUrl(url);
            if (fetchLatest.sha) {
                bodyData.sha = fetchLatest.sha;
                response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(bodyData)
                });
            }
        }

        if (response.ok) {
            const resData = await response.json();
            return { success: true, sha: resData.content.sha };
        } else {
            const err = await response.json();
            alert(`Fehler beim Speichern: ${err.message || response.statusText}`);
            return { success: false, sha: shaToUse };
        }
    } catch (err) {
        alert(`Netzwerkfehler beim Speichern: ${err.message}`);
        return { success: false, sha: currentSha };
    }
}

// === STRAFEN (strafen.json) ===
export async function fetchStrafenFromRepo() {
    const result = await fetchJsonFromUrl(STRAFEN_API_URL);
    cachedStrafenSHA = result.sha;
    return result.data;
}

export async function saveStrafenToRepo(strafenArray) {
    const result = await saveJsonToUrl(
        STRAFEN_API_URL, 
        strafenArray, 
        cachedStrafenSHA, 
        'fix(kasse): Kassenstand via Team Hub aktualisiert'
    );
    if (result.success) cachedStrafenSHA = result.sha;
    return result.success;
}

// === KÄSTEN (kasten.json) ===
export async function fetchKaestenFromRepo() {
    const result = await fetchJsonFromUrl(KASTEN_API_URL);
    cachedKastenSHA = result.sha;
    return result.data;
}

export async function saveKaestenToRepo(kaestenArray) {
    const result = await saveJsonToUrl(
        KASTEN_API_URL, 
        kaestenArray, 
        cachedKastenSHA, 
        'fix(kasten): Strafkästen via Team Hub aktualisiert'
    );
    if (result.success) cachedKastenSHA = result.sha;
    return result.success;
}