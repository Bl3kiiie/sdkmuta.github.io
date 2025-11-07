/**
 * IndexedDB Storage Handler
 * Manages all database operations for players and tournament history
 */

const DB_NAME = 'tournament_db';
const STORE_NAME = 'players';
const HISTORY_STORE_NAME = 'tournament_history';
const TOURNAMENT_STATE_KEY = 'tournament_state_v1';

let db = null;

/**
 * Initialize IndexedDB
 */
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);

        request.onerror = () => {
            console.error('[App] IndexedDB open error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('[App] IndexedDB opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                console.log('[App] Created players object store');
            }
            if (!database.objectStoreNames.contains(HISTORY_STORE_NAME)) {
                database.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'timestamp' });
                console.log('[App] Created tournament history object store');
            }
        };
    });
}

/**
 * Load all players from IndexedDB
 */
function loadPlayersFromStorage() {
    if (!db) {
        console.warn('[App] Database not initialized, using in-memory');
        app.allPlayers = [...app.defaultPlayers];
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            if (request.result.length > 0) {
                app.allPlayers = request.result;
                console.log('[App] Loaded players from IndexedDB:', app.allPlayers.length);
            } else {
                console.log('[App] No players in IndexedDB, using defaults');
                app.allPlayers = [...app.defaultPlayers];
            }
            resolve();
        };

        request.onerror = () => {
            console.warn('[App] Error loading from IndexedDB, using defaults');
            app.allPlayers = [...app.defaultPlayers];
            resolve();
        };
    });
}

/**
 * Save players to IndexedDB
 */
function savePlayersToStorage() {
    if (!db) {
        console.warn('[App] Database not initialized, cannot save');
        return Promise.reject('DB not initialized');
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // Clear existing and add new
        store.clear();

        app.allPlayers.forEach(player => {
            store.add(player);
        });

        transaction.oncomplete = () => {
            console.log('[App] Players saved to IndexedDB');
            resolve();
        };

        transaction.onerror = () => {
            console.error('[App] Error saving players:', transaction.error);
            reject(transaction.error);
        };
    });
}

/**
 * Save tournament state to localStorage
 */
function saveTournamentState() {
    const state = {
        selectedPlayers: app.selectedPlayers,
        tournamentConfig: app.tournamentConfig,
        scores: app.scores,
        lastResults: app.lastResults,
        lastScores: app.lastScores,
        lastPlayers: app.lastPlayers
    };

    try {
        localStorage.setItem(TOURNAMENT_STATE_KEY, JSON.stringify(state));
        console.log('[App] Tournament state saved to localStorage');
    } catch (e) {
        console.warn('[App] Error saving tournament state:', e);
    }
}

/**
 * Load tournament state from localStorage
 */
function loadTournamentState() {
    const stored = localStorage.getItem(TOURNAMENT_STATE_KEY);

    if (!stored) {
        console.log('[App] No saved tournament state');
        return null;
    }

    try {
        const state = JSON.parse(stored);
        console.log('[App] Tournament state loaded:', state);
        return state;
    } catch (e) {
        console.warn('[App] Error loading tournament state:', e);
        return null;
    }
}

/**
 * Clear tournament state from localStorage
 */
function clearTournamentState() {
    try {
        localStorage.removeItem(TOURNAMENT_STATE_KEY);
        console.log('[App] Tournament state cleared');
    } catch (e) {
        console.warn('[App] Error clearing tournament state:', e);
    }
}

/**
 * Load tournament history from IndexedDB
 */
function loadHistoryFromStorage() {
    if (!db) {
        console.warn('[App] Database not initialized, cannot load history');
        return Promise.reject('DB not initialized');
    }

    return new Promise((resolve) => {
        const transaction = db.transaction(HISTORY_STORE_NAME, 'readonly');
        const store = transaction.objectStore(HISTORY_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const history = request.result.sort((a, b) => b.timestamp - a.timestamp);
            console.log('[App] Loaded tournament history:', history.length);
            resolve(history);
        };

        request.onerror = () => {
            console.error('[App] Error loading history:', request.error);
            resolve([]);
        };
    });
}

/**
 * Save tournament to history (keep last 5)
 */
function saveTournamentToHistory(entry) {
    if (!db) {
        console.warn('[App] Database not initialized, cannot save to history');
        return Promise.reject('DB not initialized');
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(HISTORY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE_NAME);

        // First, get all history entries to maintain last 5
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
            const allHistory = getAllRequest.result;
            // Sort by timestamp descending and keep only last 4 (so we add the new one as 5th)
            allHistory.sort((a, b) => b.timestamp - a.timestamp);
            const toDelete = allHistory.slice(4); // Keep only last 4, will add new one

            // Delete old entries
            toDelete.forEach(entry => {
                store.delete(entry.timestamp);
            });

            // Add new entry
            const addRequest = store.add(entry);

            addRequest.onsuccess = () => {
                console.log('[App] Tournament saved to IndexedDB history');
                resolve();
            };

            addRequest.onerror = () => {
                console.error('[App] Error adding to history:', addRequest.error);
                reject(addRequest.error);
            };
        };

        getAllRequest.onerror = () => {
            console.error('[App] Error getting all history:', getAllRequest.error);
            reject(getAllRequest.error);
        };
    });
}
