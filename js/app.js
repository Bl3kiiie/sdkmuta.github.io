/**
 * Main Application State and Initialization
 * Manages the global app object and initialization
 */

/**
 * Global Application State
 */
const app = {
    language: 'sl',
    selectedPlayers: [],
    allPlayers: [],
    defaultPlayers: [],
    tournamentConfig: {
        targets: 20,
        bulletsPerTarget: 2,
        totalShots: 40,
        type: null
    },
    scores: {},
    lastResults: null,
    lastScores: null,
    lastPlayers: null
};

/**
 * Initialize application on DOM ready
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('[App] Initializing application...');

    // Initialize IndexedDB first
    try {
        await initDB();
    } catch (e) {
        console.warn('[App] IndexedDB init failed, using in-memory storage:', e);
    }

    // Load language preference
    const savedLanguage = localStorage.getItem('app_language');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'sl')) {
        app.language = savedLanguage;
        // Update language button
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent === savedLanguage.toUpperCase()) {
                btn.classList.add('active');
            }
        });
    }

    // Load players after DB is ready
    await loadPlayersFromStorage();

    // Render the loaded players
    renderPlayersList();

    // Load and display tournament history on participants page
    displayParticipantsPageHistory();

    setupAddPlayerButton();
    updateAllTranslations();

    // Initialize help button (show on participant selection page)
    updateHelpButton('view-participants');

    console.log('[App] Initialization complete');
});

/**
 * Start a new tournament (move to player selection)
 */
function startNewTournament() {
    clearTournamentState();
    app.scores = {};
    app.lastResults = null;
    app.lastScores = null;
    app.lastPlayers = null;
    goToView('view-participants');
}

/**
 * Proceed from player selection to tournament config
 */
function proceedToConfig() {
    if (app.selectedPlayers.length === 0) {
        alert(t('league.no_players_selected'));
        return;
    }

    // Save state and move to config
    saveTournamentState();
    goToView('view-config');
}

/**
 * Proceed from config to scoring
 */
function proceedToScoring() {
    // Initialize scores object for all selected players and all targets
    app.scores = {};
    app.selectedPlayers.forEach(player => {
        app.scores[player.id] = {};
        for (let target = 1; target <= app.tournamentConfig.targets; target++) {
            app.scores[player.id][target] = {};
            for (let bullet = 1; bullet <= app.tournamentConfig.bulletsPerTarget; bullet++) {
                app.scores[player.id][target][bullet] = null;
            }
        }
    });

    saveTournamentState();
    goToView('view-scoring');
    renderScoringView();
}

/**
 * Calculate total score for a player
 */
function calculatePlayerScore(playerId) {
    if (!app.scores[playerId]) return 0;

    let total = 0;
    const playerScores = app.scores[playerId];

    for (let target in playerScores) {
        for (let bullet in playerScores[target]) {
            const score = playerScores[target][bullet];
            if (score !== null && score !== undefined) {
                total += parseInt(score) || 0;
            }
        }
    }

    return total;
}

/**
 * Count number of 10s for a player
 */
function countTens(playerId) {
    if (!app.scores[playerId]) return 0;

    let count = 0;
    const playerScores = app.scores[playerId];

    for (let target in playerScores) {
        for (let bullet in playerScores[target]) {
            const score = playerScores[target][bullet];
            if (score === 10) {
                count++;
            }
        }
    }

    return count;
}

/**
 * Calculate and display results
 */
function calculateResults() {
    // Create results array
    const results = app.selectedPlayers.map(player => ({
        id: player.id,
        name: player.name,
        totalScore: calculatePlayerScore(player.id),
        tensCount: countTens(player.id)
    }));

    // Sort by total score (descending), then by tens (descending)
    results.sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
            return b.totalScore - a.totalScore;
        }
        return b.tensCount - a.tensCount;
    });

    // Add position
    results.forEach((result, index) => {
        result.position = index + 1;
    });

    // Save for export and display
    app.lastResults = results;
    app.lastScores = deepClone(app.scores);
    app.lastPlayers = deepClone(app.selectedPlayers);

    saveTournamentState();

    return results;
}

/**
 * Finish tournament and save to history
 */
async function finishTournament() {
    try {
        const results = calculateResults();

        // Ensure tournament type is determined
        if (!app.tournamentConfig.type) {
            determineTournamentType();
        }

        // Prepare history entry
        const historyEntry = {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            config: {
                targets: app.tournamentConfig.targets,
                bulletsPerTarget: app.tournamentConfig.bulletsPerTarget,
                type: app.tournamentConfig.type
            },
            results: results,
            scores: deepClone(app.scores),
            participants: app.selectedPlayers.length
        };

        // Save to history
        await saveTournamentToHistory(historyEntry);

        // Display results
        displayResults(results);

        // Move to results view
        goToView('view-results');
    } catch (error) {
        console.error('[App] Error finishing tournament:', error);
        alert('Error saving tournament: ' + error.message);
    }
}

/**
 * Display participants page history
 */
async function displayParticipantsPageHistory() {
    try {
        const history = await loadHistoryFromStorage();
        const container = document.getElementById('participants-history-list');
        const emptyMessage = document.getElementById('participants-history-empty');
        const counter = document.getElementById('history-counter');

        if (!container) return;

        container.innerHTML = '';

        if (history.length === 0) {
            if (emptyMessage) emptyMessage.style.display = 'block';
            if (counter) counter.textContent = '(0/5)';
            return;
        }

        if (emptyMessage) emptyMessage.style.display = 'none';
        if (counter) counter.textContent = `(${history.length}/5)`;

        history.forEach((tournament, index) => {
            const date = new Date(tournament.date);
            const dateStr = date.toLocaleDateString();
            const configStr = `${tournament.config.targets}T × ${tournament.config.bulletsPerTarget}S`;
            const topThree = tournament.results.slice(0, 3);

            const card = document.createElement('div');
            card.className = 'history-card';
            card.style.cursor = 'pointer';
            card.onclick = () => viewHistoricalTournament(tournament);
            card.innerHTML = `
                <div class="history-card-header">
                    <div class="history-card-header-content">
                        <div class="history-card-config">${configStr}</div>
                        <div class="history-card-date">${dateStr}</div>
                    </div>
                    <button class="history-card-delete" title="Delete tournament" onclick="event.stopPropagation(); deleteHistoryItem(${tournament.timestamp})">✕</button>
                </div>
                <div class="history-card-podium">
                    ${topThree.map((player, idx) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        return `
                            <div class="podium-entry">
                                <span class="medal">${medals[idx]}</span>
                                <span class="name">${player.name}</span>
                                <span class="score">${player.totalScore} ${t('results.pts')}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="history-card-players">${tournament.results.length} ${t('results.players')}</div>
            `;

            container.appendChild(card);
        });
    } catch (error) {
        console.error('[App] Error displaying participants history:', error);
    }
}

/**
 * View a historical tournament
 */
function viewHistoricalTournament(tournament) {
    try {
        // Set app state for exports
        app.lastResults = tournament.results;
        app.lastScores = tournament.scores || {};
        app.tournamentConfig = tournament.config;

        // Display the tournament results
        displayResults(tournament.results);

        // Move to results view
        goToView('view-results');

        console.log('[App] Viewing historical tournament from:', tournament.date);
    } catch (error) {
        console.error('[App] Error viewing historical tournament:', error);
        alert('Error viewing tournament: ' + error.message);
    }
}
