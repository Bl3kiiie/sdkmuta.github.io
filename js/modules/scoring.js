/**
 * Scoring Module
 * Handles score entry and validation with collapsible player cards
 */

/**
 * Render the scoring view with collapsible player cards
 */
function renderScoringView() {
    const container = document.getElementById('scores-container');
    if (!container) return;

    container.innerHTML = '';

    // Add header section with tournament info and progress
    const headerSection = document.createElement('div');

    // Add tournament type styling
    const tournamentType = app.tournamentConfig.type;
    const typeEmoji = tournamentType === 'small-targets' ? '🎯' :
                     tournamentType === 'medium-targets' ? '⚡' :
                     tournamentType === 'large-targets' ? '💪' : '🏆';
    const cssClassName = tournamentType ? tournamentType.replace(/_/g, '-') : 'medium-targets';
    headerSection.className = `scoring-header-section tournament-${cssClassName}`;

    headerSection.innerHTML = `
        <div class="scoring-header-title">${typeEmoji} ${t('scoring.enter_scores')}</div>
        <div class="scoring-header-subtitle">${app.tournamentConfig.targets} ${t('results.targets')} × ${app.tournamentConfig.bulletsPerTarget} ${t('results.shots')}</div>
        <div class="scoring-progress-info">
            <div class="scoring-progress-item">
                <div class="scoring-progress-number" id="completedCount">0</div>
                <div class="scoring-progress-label">${t('scoring.completed')}</div>
            </div>
            <div class="scoring-progress-item">
                <div class="scoring-progress-number">${app.selectedPlayers.length}</div>
                <div class="scoring-progress-label">${t('tournament.participants')}</div>
            </div>
        </div>
    `;

    container.appendChild(headerSection);

    // Create participants list container
    const participantsList = document.createElement('div');
    participantsList.className = 'participants-list';

    app.selectedPlayers.forEach(player => {
        const card = document.createElement('div');
        card.className = 'participant-card';
        card.id = `card-${player.id}`;

        // Create header with player name and score info
        const header = document.createElement('div');
        header.className = 'participant-header';
        header.onclick = () => togglePlayerCard(player.id);

        header.innerHTML = `
            <div class="participant-info">
                <div class="participant-name">${player.name}</div>
            </div>
            <div class="participant-status">
                <div class="score-display">
                    <div class="score-row">
                        <div class="total-score">
                            <div class="score-number" id="total-${player.id}">0</div>
                            <div class="score-label">${t('results.total_score')}</div>
                        </div>
                        <div class="tens-count">
                            <div class="tens-number" id="tens-${player.id}">0</div>
                            <div class="tens-label">10s</div>
                        </div>
                    </div>
                </div>
                <div class="completion-badge" id="badge-${player.id}">
                    <span class="badge-not-started">${t('scoring.not_started')}</span>
                </div>
                <div class="collapse-icon">▼</div>
            </div>
        `;

        // Create collapsible content
        const content = document.createElement('div');
        content.className = 'participant-content';

        const targetsSection = document.createElement('div');
        targetsSection.className = 'targets-section';

        // Create targets grid with responsive layout
        const targetsGrid = document.createElement('div');
        targetsGrid.className = `targets-grid targets-${app.tournamentConfig.targets}`;

        for (let target = 1; target <= app.tournamentConfig.targets; target++) {
            const targetGroup = document.createElement('div');
            targetGroup.className = 'target-group';
            targetGroup.id = `target-group-${player.id}-${target}`;

            const targetNumber = document.createElement('div');
            targetNumber.className = 'target-number';
            targetNumber.textContent = target;
            targetGroup.appendChild(targetNumber);

            const shotsContainer = document.createElement('div');
            shotsContainer.className = `shots-container shots-${app.tournamentConfig.bulletsPerTarget}`;

            // Create input fields for each bullet/shot
            for (let bullet = 1; bullet <= app.tournamentConfig.bulletsPerTarget; bullet++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'shot-input';
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

                shotsContainer.appendChild(input);
            }

            targetGroup.appendChild(shotsContainer);
            targetsGrid.appendChild(targetGroup);
        }

        targetsSection.appendChild(targetsGrid);

        content.appendChild(targetsSection);

        card.appendChild(header);
        card.appendChild(content);
        participantsList.appendChild(card);
    });

    container.appendChild(participantsList);

    updateAllScoreTotals();
    updateCompletionCount();
}

/**
 * Toggle player card collapse state
 */
function togglePlayerCard(playerId) {
    const card = document.getElementById(`card-${playerId}`);
    if (card) {
        card.classList.toggle('collapsed');
    }
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
        input.classList.remove('valid', 'ten');
        if (score !== null) {
            if (score === 10) {
                input.classList.add('ten');
            } else {
                input.classList.add('valid');
            }
        }
    }

    // Update target group styling
    updateTargetGroupStyling(playerId, target);

    updatePlayerTotal(playerId);
    updatePlayerStatus(playerId);
    updateCompletionCount();
    saveTournamentState();
}

/**
 * Update target group styling based on completion
 */
function updateTargetGroupStyling(playerId, target) {
    const targetGroup = document.getElementById(`target-group-${playerId}-${target}`);
    if (!targetGroup) return;

    const targetData = app.scores[playerId]?.[target];
    if (!targetData) return;

    // Check if all shots in this target are filled
    let allFilled = true;
    for (let bullet = 1; bullet <= app.tournamentConfig.bulletsPerTarget; bullet++) {
        if (targetData[bullet] === null || targetData[bullet] === undefined) {
            allFilled = false;
            break;
        }
    }

    if (allFilled) {
        targetGroup.classList.add('completed');
    } else {
        targetGroup.classList.remove('completed');
    }
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
        inputElement.classList.remove('valid', 'ten');
        if (value === 10) {
            inputElement.classList.add('ten');
        } else {
            inputElement.classList.add('valid');
        }

        // Update target group styling
        updateTargetGroupStyling(playerId, target);

        saveTournamentState();
    }
}

/**
 * Update player status (completed/in-progress/not-started)
 */
function updatePlayerStatus(playerId) {
    const card = document.getElementById(`card-${playerId}`);
    const badge = document.getElementById(`badge-${playerId}`);
    if (!card || !badge) return;

    const playerScores = app.scores[playerId];
    let allFilled = true;
    let someFilled = false;

    for (let target = 1; target <= app.tournamentConfig.targets; target++) {
        for (let bullet = 1; bullet <= app.tournamentConfig.bulletsPerTarget; bullet++) {
            const score = playerScores[target]?.[bullet];
            if (score !== null && score !== undefined) {
                someFilled = true;
            } else {
                allFilled = false;
            }
        }
    }

    card.classList.remove('completed', 'in-progress');
    badge.innerHTML = '';

    if (allFilled) {
        card.classList.add('completed');
        const span = document.createElement('span');
        span.className = 'badge-completed';
        span.textContent = t('scoring.completed');
        badge.appendChild(span);
    } else if (someFilled) {
        card.classList.add('in-progress');
        const span = document.createElement('span');
        span.className = 'badge-in-progress';
        span.textContent = t('scoring.in_progress');
        badge.appendChild(span);
    } else {
        const span = document.createElement('span');
        span.className = 'badge-not-started';
        span.textContent = t('scoring.not_started');
        badge.appendChild(span);
    }
}

/**
 * Update player total score and tens count
 */
function updatePlayerTotal(playerId) {
    const total = calculatePlayerScore(playerId);
    const tens = countTens(playerId);

    const totalEl = document.getElementById(`total-${playerId}`);
    const tensEl = document.getElementById(`tens-${playerId}`);

    if (totalEl) {
        totalEl.textContent = total;
    }
    if (tensEl) {
        tensEl.textContent = tens;
    }
}

/**
 * Update completion count in header
 */
function updateCompletionCount() {
    let completed = 0;
    app.selectedPlayers.forEach(player => {
        const card = document.getElementById(`card-${player.id}`);
        if (card && card.classList.contains('completed')) {
            completed++;
        }
    });

    const completedEl = document.getElementById('completedCount');
    if (completedEl) {
        completedEl.textContent = completed;
    }
}

/**
 * Update all score totals
 */
function updateAllScoreTotals() {
    app.selectedPlayers.forEach(player => {
        updatePlayerTotal(player.id);
        updatePlayerStatus(player.id);
    });
    updateCompletionCount();
}

/**
 * Clear player scores with confirmation
 */
function clearPlayerScores(playerId) {
    showConfirmationModal(
        t('scoring.clear_all'),
        t('messages.confirm_delete'),
        function() {
            app.scores[playerId] = {};
            for (let target = 1; target <= app.tournamentConfig.targets; target++) {
                app.scores[playerId][target] = {};
                for (let bullet = 1; bullet <= app.tournamentConfig.bulletsPerTarget; bullet++) {
                    app.scores[playerId][target][bullet] = null;
                }
            }

            // Clear all input fields for this player
            document.querySelectorAll(`input[id*="-${playerId}-"]`).forEach(input => {
                input.value = '';
                input.classList.remove('valid', 'ten');
            });

            // Update all styling for this player
            for (let target = 1; target <= app.tournamentConfig.targets; target++) {
                updateTargetGroupStyling(playerId, target);
            }

            updatePlayerTotal(playerId);
            updatePlayerStatus(playerId);
            updateCompletionCount();
            saveTournamentState();
        }
    );
}

/**
 * Clear all scores with confirmation
 */
function clearAllScores() {
    showConfirmationModal(
        t('scoring.clear_all'),
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
            document.querySelectorAll('.shot-input').forEach(input => {
                input.value = '';
                input.classList.remove('valid', 'ten');
            });

            updateAllScoreTotals();
            saveTournamentState();
        }
    );
}
