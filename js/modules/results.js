/**
 * Results Module
 * Handles results display and export functionality
 */

/**
 * Display results in the table
 */
function displayResults(results) {
    const table = document.getElementById('results-table');
    const header = document.getElementById('results-header');

    // Determine tournament type, inferring from config if not explicitly set
    let tournamentType = app.tournamentConfig.type;
    if (!tournamentType) {
        const targets = app.tournamentConfig.targets;
        if (targets >= 1 && targets <= 4) {
            tournamentType = 'small-targets';
        } else if (targets >= 5 && targets <= 20) {
            tournamentType = 'medium-targets';
        } else if (targets > 20) {
            tournamentType = 'large-targets';
        } else {
            tournamentType = 'medium-targets'; // default fallback
        }
    }
    // Convert underscores to hyphens for CSS class names
    const cssClassName = tournamentType.replace(/_/g, '-');
    header.className = `results-header tournament-${cssClassName}`;

    // Update the title emoji based on tournament type
    const titleEmoji = tournamentType === 'small-targets' ? '🎯' :
                       tournamentType === 'medium-targets' ? '⚡' :
                       tournamentType === 'large-targets' ? '💪' : '🏆';
    const resultsTitle = header.querySelector('.results-title');
    if (resultsTitle) {
        // Only update the emoji, let the data-i18n span handle the text
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = titleEmoji + ' ';
        const textSpan = resultsTitle.querySelector('[data-i18n="results.final_results"]');
        if (textSpan) {
            resultsTitle.innerHTML = '';
            resultsTitle.appendChild(emojiSpan);
            resultsTitle.appendChild(textSpan);
        }
    }

    const highestScore = results.length > 0 ? results[0].totalScore : 0;
    const mostTens = results.length > 0 ? Math.max(...results.map(r => r.tensCount)) : 0;

    document.getElementById('header-participants').textContent = results.length;
    document.getElementById('header-targets').textContent = app.tournamentConfig.targets || 0;
    document.getElementById('header-shots').textContent = app.tournamentConfig.bulletsPerTarget || 0;
    document.getElementById('header-highest-score').textContent = highestScore;
    document.getElementById('header-most-tens').textContent = mostTens;

    let html = `
        <thead>
            <tr>
                <th class="rank-col">${t('results.position')}</th>
                <th class="player-col">${t('players.player')}</th>
                <th class="score-col">${t('results.total_score')}</th>
                <th class="tens-col">${t('results.tens')}</th>
            </tr>
        </thead>
        <tbody>
    `;

    results.forEach(result => {
        const rankClass = result.position <= 3 ? `rank-${result.position}` : 'rank-other';
        const medal = result.position === 1 ? '🥇' :
                     result.position === 2 ? '🥈' :
                     result.position === 3 ? '🥉' : '';

        html += `
            <tr>
                <td class="rank-cell ${rankClass}">${result.position} ${medal}</td>
                <td class="player-cell"><div class="player-name">${result.name}</div></td>
                <td class="score-cell">${result.totalScore}</td>
                <td class="tens-cell">🎯 ${result.tensCount}</td>
            </tr>
        `;
    });

    html += '</tbody>';
    table.innerHTML = html;

    app.lastResults = results;
}

/**
 * Display tournament history
 */
async function displayTournamentHistory() {
    try {
        const history = await loadHistoryFromStorage();
        const container = document.getElementById('results-history-list');

        if (!container) return;

        container.innerHTML = '';

        if (history.length === 0) {
            return;
        }

        history.forEach((tournament, index) => {
            const date = new Date(tournament.date);
            const dateStr = date.toLocaleDateString();
            const configStr = `${tournament.config.targets}T × ${tournament.config.bulletsPerTarget}S`;
            const topThree = tournament.results.slice(0, 3);

            const card = document.createElement('div');
            card.className = 'history-card';
            card.style.cursor = 'pointer';
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
        console.error('[App] Error displaying tournament history:', error);
    }
}

/**
 * Delete history item with confirmation
 */
function deleteHistoryItem(timestamp) {
    showConfirmationModal(
        t('confirmation.delete_tournament_title'),
        t('confirmation.delete_tournament_message'),
        function() {
            if (!db) {
                console.warn('[App] Database not initialized, cannot delete history');
                return;
            }

            const transaction = db.transaction(HISTORY_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(HISTORY_STORE_NAME);
            const deleteRequest = store.delete(timestamp);

            deleteRequest.onsuccess = () => {
                console.log('[App] Tournament deleted from history:', timestamp);
                // Refresh the history display
                displayParticipantsPageHistory();
                displayTournamentHistory();
            };

            deleteRequest.onerror = () => {
                console.error('[App] Error deleting from history:', deleteRequest.error);
                alert('Error deleting tournament from history');
            };
        }
    );
}

/**
 * Export results to Excel
 */
function downloadExcel() {
    try {
        if (!window.XLSX) {
            alert(t('excel.library_not_loaded'));
            console.warn('[App] XLSX library not loaded');
            return;
        }

        if (!app.lastResults || app.lastResults.length === 0) {
            alert(t('excel.no_results'));
            return;
        }

        const wb = XLSX.utils.book_new();
        const wsData = [];
        const scoresData = app.lastScores || {};
        const targets = app.tournamentConfig?.targets || 0;
        const bulletsPerTarget = app.tournamentConfig?.bulletsPerTarget || 0;


        // Tournament Information Header
        wsData.push([t('excel.tournament_info')]);
        wsData.push([t('excel.date'), new Date().toLocaleDateString()]);
        wsData.push([t('excel.targets'), targets]);
        wsData.push([t('excel.bullets_per_target'), bulletsPerTarget]);
        wsData.push([t('excel.total_players'), app.lastResults.length]);
        wsData.push([]);

        // Build header with targets as main columns and shots as sub-columns
        const headerRow1 = [
            t('results.position'),
            t('players.player')
        ];

        const headerRow2 = [
            '',
            ''
        ];

        // Add target columns with shot sub-columns
        for (let target = 1; target <= targets; target++) {
            headerRow1.push(`${t('excel.target')} ${target}`);
            // Add empty cells for shot sub-headers
            for (let bullet = 1; bullet < bulletsPerTarget; bullet++) {
                headerRow1.push('');
            }
        }

        headerRow1.push(t('results.total_score'));
        headerRow1.push(t('results.tens'));

        // Add shot numbers in second header row
        for (let target = 1; target <= targets; target++) {
            for (let bullet = 1; bullet <= bulletsPerTarget; bullet++) {
                headerRow2.push(`${t('excel.shot')}${bullet}`);
            }
        }

        headerRow2.push('');
        headerRow2.push('');

        wsData.push(headerRow1);
        wsData.push(headerRow2);

        // Add results data with detailed scores
        app.lastResults.forEach(result => {
            const row = [
                result.position,
                result.name
            ];

            const playerScores = scoresData[result.id] || {};

            // Add target scores with individual bullets
            for (let target = 1; target <= targets; target++) {
                // Check both numeric and string keys due to JSON serialization
                const targetScores = playerScores[target] !== undefined ? playerScores[target] : (playerScores[String(target)] !== undefined ? playerScores[String(target)] : {});
                for (let bullet = 1; bullet <= bulletsPerTarget; bullet++) {
                    // Check both numeric and string keys due to JSON serialization
                    const score = targetScores[bullet] !== undefined ? targetScores[bullet] : (targetScores[String(bullet)] !== undefined ? targetScores[String(bullet)] : null);
                    row.push(score !== null && score !== undefined ? score : 0);
                }
            }

            row.push(result.totalScore);
            row.push(result.tensCount);

            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Results');

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Tournament_Results_${dateStr}.xlsx`);

        console.log('[App] Excel export completed successfully');
    } catch (error) {
        console.error('[App] Excel export error:', error);
        alert(t('excel.export_error') + ' ' + error.message);
    }
}

/**
 * Export results to JSON
 */
function downloadJSON() {
    try {
        if (!app.tournamentConfig || !app.lastResults || app.lastResults.length === 0) {
            alert(t('excel.no_results'));
            console.warn('[App] Missing required data for JSON export');
            return;
        }

        const scoresData = app.lastScores || app.scores;
        const playerCount = app.lastResults.length;
        const now = new Date().toISOString();


        // Validate tournament type (any valid range-based type)
        const isValidTournament =
            (app.tournamentConfig.type === 'small-targets' && app.tournamentConfig.targets >= 1 && app.tournamentConfig.targets <= 4) ||
            (app.tournamentConfig.type === 'medium-targets' && app.tournamentConfig.targets >= 5 && app.tournamentConfig.targets <= 20) ||
            (app.tournamentConfig.type === 'large-targets' && app.tournamentConfig.targets > 20);

        const tournamentType = isValidTournament ? app.tournamentConfig.type : null;
        const tournamentId = now;

        const tournamentData = {
            tournament: {
                id: tournamentId,
                tournament_type: tournamentType,
                created_at: now,
                total_players: playerCount,
                total_targets: app.tournamentConfig.targets || 0,
                bullets_per_target: app.tournamentConfig.bulletsPerTarget || 0
            },
            results: {
                tournament_id: tournamentId,
                tournament_type: tournamentType,
                participants: {},
                tournament_finished: true,
                created_at: now,
                finished_at: now
            },
            archived_at: now
        };

        if (app.lastResults && app.lastResults.length > 0) {
            app.lastResults.forEach(result => {
                const playerId = result.id;
                const targets = {};

                for (let targetId = 1; targetId <= (app.tournamentConfig.targets || 0); targetId++) {
                    targets[targetId] = {};
                    // Get target data, checking both numeric and string keys
                    const playerData = scoresData[playerId] || {};
                    const targetData = playerData[targetId] !== undefined ? playerData[targetId] : (playerData[String(targetId)] !== undefined ? playerData[String(targetId)] : {});

                    for (let bulletId = 1; bulletId <= (app.tournamentConfig.bulletsPerTarget || 0); bulletId++) {
                        // Check both numeric and string keys
                        const score = targetData[bulletId] !== undefined ? targetData[bulletId] : (targetData[String(bulletId)] !== undefined ? targetData[String(bulletId)] : null);
                        targets[targetId][`shot${bulletId}`] = score !== null && score !== undefined ? parseInt(score) : 0;
                    }
                }

                tournamentData.results.participants[playerId] = {
                    id: playerId,
                    name: result.name,
                    position: result.position,
                    targets: targets,
                    total_score: result.totalScore || 0,
                    tens_count: result.tensCount || 0,
                    completed: true
                };
            });
        }

        const jsonString = JSON.stringify(tournamentData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.href = url;
        link.download = `tournament_${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('[App] JSON export completed successfully');
    } catch (error) {
        console.error('[App] JSON export error:', error);
        alert(t('excel.export_error') + ' ' + error.message);
    }
}

/**
 * Export results to PDF via print
 */
function downloadPDF() {
    try {
        const dateStr = new Date().toISOString().split('T')[0];
        const targets = app.tournamentConfig.targets || 0;
        const shots = app.tournamentConfig.bulletsPerTarget || 0;
        const filename = `Tournament_${dateStr}_${targets}targets_${shots}shots`;

        const originalTitle = document.title;
        document.title = filename;

        window.print();

        setTimeout(() => {
            document.title = originalTitle;
        }, 100);

        console.log('[App] PDF export initiated with filename:', filename);
    } catch (error) {
        console.error('[App] PDF export error:', error);
        alert('Error exporting PDF: ' + error.message);
    }
}
