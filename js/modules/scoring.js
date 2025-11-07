/**
 * Scoring Module
 * Handles score entry and validation
 */

/**
 * Render the scoring view
 */
function renderScoringView() {
    const container = document.getElementById('scores-container');
    if (!container) return;

    container.innerHTML = '';

    app.selectedPlayers.forEach(player => {
        const playerSection = document.createElement('div');
        playerSection.className = 'player-scoring-section';
        playerSection.id = `scoring-${player.id}`;

        const playerHeader = document.createElement('h3');
        playerHeader.className = 'scoring-player-header';
        playerHeader.textContent = player.name;

        playerSection.appendChild(playerHeader);

        // Create content wrapper for flex layout
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'scoring-content';

        // Create targets grid
        const targetsGrid = document.createElement('div');
        targetsGrid.className = 'targets-grid';

        for (let target = 1; target <= app.tournamentConfig.targets; target++) {
            const targetSection = document.createElement('div');
            targetSection.className = 'target';

            const targetLabel = document.createElement('div');
            targetLabel.className = 'target-label';
            targetLabel.textContent = `${t('scoring.target')} ${target}`;

            targetSection.appendChild(targetLabel);

            // Create input fields for each bullet
            for (let bullet = 1; bullet <= app.tournamentConfig.bulletsPerTarget; bullet++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'score-input';
                input.id = `score-${player.id}-${target}-${bullet}`;
                input.min = '0';
                input.max = '10';
                input.placeholder = 'S' + bullet;
                input.value = app.scores[player.id]?.[target]?.[bullet] || '';

                input.addEventListener('input', (e) => {
                    updateScore(player.id, target, bullet, e.target.value);
                });

                input.addEventListener('change', (e) => {
                    capScore(e.target);
                });

                targetSection.appendChild(input);
            }

            targetsGrid.appendChild(targetSection);
        }

        contentWrapper.appendChild(targetsGrid);
        playerSection.appendChild(contentWrapper);

        // Player total score card
        const playerTotal = document.createElement('div');
        playerTotal.className = 'player-total-score';
        playerTotal.id = `player-total-${player.id}`;
        playerTotal.innerHTML = `
            <div class="total-label">${t('results.total_score')}:</div>
            <div class="total-value">0</div>
        `;

        playerSection.appendChild(playerTotal);

        container.appendChild(playerSection);
    });

    updateAllScoreTotals();
}

/**
 * Update score in state and UI
 */
function updateScore(playerId, target, bullet, value) {
    const score = value === '' ? null : parseInt(value);

    if (score !== null && (score < 0 || score > 10)) {
        return; // Will be capped on change
    }

    app.scores[playerId][target][bullet] = score;

    // Update input highlighting
    const input = document.getElementById(`score-${playerId}-${target}-${bullet}`);
    if (input) {
        if (score === 10) {
            input.classList.add('value-ten');
        } else {
            input.classList.remove('value-ten');
        }
    }

    updateTargetTotal(playerId, target);
    updatePlayerTotal(playerId);
    saveTournamentState();
}

/**
 * Cap score to max value of 10
 */
function capScore(inputElement) {
    let value = parseInt(inputElement.value);

    if (isNaN(value)) {
        return;
    }

    if (value > 10) {
        value = 10;
        inputElement.value = value;
    } else if (value < 0) {
        value = 0;
        inputElement.value = value;
    }

    // Update the value in app.scores
    const id = inputElement.id;
    const parts = id.match(/score-(.+)-(\d+)-(\d+)/);
    if (parts) {
        const playerId = parts[1];
        const target = parseInt(parts[2]);
        const bullet = parseInt(parts[3]);
        app.scores[playerId][target][bullet] = value;

        // Update input highlighting
        if (value === 10) {
            inputElement.classList.add('value-ten');
        } else {
            inputElement.classList.remove('value-ten');
        }

        saveTournamentState();
    }
}

/**
 * Update total for a specific target
 */
function updateTargetTotal(playerId, target) {
    let total = 0;
    const playerScores = app.scores[playerId];

    if (playerScores && playerScores[target]) {
        for (let bullet in playerScores[target]) {
            const score = playerScores[target][bullet];
            if (score !== null && score !== undefined) {
                total += parseInt(score) || 0;
            }
        }
    }

    const targetTotalEl = document.getElementById(`target-total-${playerId}-${target}`);
    if (targetTotalEl) {
        targetTotalEl.textContent = total;
        // Highlight if all shots are 10s
        if (total === 10 * app.tournamentConfig.bulletsPerTarget) {
            targetTotalEl.classList.add('perfect-target');
        } else {
            targetTotalEl.classList.remove('perfect-target');
        }
    }
}

/**
 * Update player total score
 */
function updatePlayerTotal(playerId) {
    const total = calculatePlayerScore(playerId);
    const tens = countTens(playerId);

    const playerTotalEl = document.getElementById(`player-total-${playerId}`);
    if (playerTotalEl) {
        playerTotalEl.querySelector('.total-value').textContent = total;
    }
}

/**
 * Update all score totals
 */
function updateAllScoreTotals() {
    app.selectedPlayers.forEach(player => {
        updatePlayerTotal(player.id);
    });
}

/**
 * Clear all scores with confirmation
 */
function clearAllScores() {
    showConfirmationModal(
        'Clear All Scores',
        t('messages.confirm_delete'),
        function() {
            app.selectedPlayers.forEach(player => {
                app.scores[player.id] = {};
                for (let target = 1; target <= app.tournamentConfig.targets; target++) {
                    app.scores[player.id][target] = {};
                    for (let bullet = 1; bullet <= app.tournamentConfig.bulletsPerTarget; bullet++) {
                        app.scores[player.id][target][bullet] = null;
                    }
                }
            });

            // Clear all input fields
            document.querySelectorAll('.score-input').forEach(input => {
                input.value = '';
            });

            updateAllScoreTotals();
            saveTournamentState();
        }
    );
}
