/**
 * Player Management Module
 * Handles all player-related operations
 */

/**
 * Render the players list
 */
function renderPlayersList() {
    const container = document.getElementById('players-list');
    if (!container) return;

    const searchTerm = document.getElementById('player-search')?.value.toLowerCase() || '';

    const filteredPlayers = app.allPlayers.filter(player =>
        player.name.toLowerCase().includes(searchTerm)
    );

    container.innerHTML = '';

    filteredPlayers.forEach(player => {
        const isSelected = app.selectedPlayers.some(p => p.id === player.id);

        const card = document.createElement('div');
        card.className = `player-card ${isSelected ? 'selected' : ''}`;
        card.onclick = () => togglePlayerSelection(player.id);

        card.innerHTML = `
            <div class="player-checkbox"></div>
            <div class="player-info">
                <div class="player-name">${player.name}</div>
            </div>
            <button class="player-delete-btn" title="Delete player" onclick="event.stopPropagation(); deleteSelectedPlayer(event, ${player.id})">✕</button>
        `;

        container.appendChild(card);
    });

    updateToggleButtonText();
}

/**
 * Filter players based on search input
 */
function filterPlayers() {
    renderPlayersList();
}

/**
 * Toggle player selection
 */
function togglePlayerSelection(playerId) {
    const playerIndex = app.selectedPlayers.findIndex(p => p.id === playerId);
    const player = app.allPlayers.find(p => p.id === playerId);

    if (playerIndex >= 0) {
        // Player is selected, deselect
        app.selectedPlayers.splice(playerIndex, 1);
    } else if (player) {
        // Player is not selected, select
        app.selectedPlayers.push(player);
    }

    saveTournamentState();
    renderPlayersList();
}

/**
 * Toggle select/deselect all visible players
 */
function toggleAllPlayersButton() {
    const searchTerm = document.getElementById('player-search').value.toLowerCase();
    const visiblePlayers = app.allPlayers.filter(player =>
        player.name.toLowerCase().includes(searchTerm)
    );

    const allSelected = visiblePlayers.length > 0 &&
        visiblePlayers.every(p => app.selectedPlayers.some(sp => sp.id === p.id));

    if (allSelected) {
        app.selectedPlayers = [];
    } else {
        app.selectedPlayers = [...visiblePlayers];
    }

    renderPlayersList();
    updateToggleButtonText();
    saveTournamentState();
}

/**
 * Update toggle button text based on selection state
 */
function updateToggleButtonText() {
    const toggleBtn = document.getElementById('toggle-all-btn');
    if (!toggleBtn) return;

    const searchTerm = document.getElementById('player-search').value.toLowerCase();
    const visiblePlayers = app.allPlayers.filter(player =>
        player.name.toLowerCase().includes(searchTerm)
    );

    const allSelected = visiblePlayers.length > 0 &&
        visiblePlayers.every(p => app.selectedPlayers.some(sp => sp.id === p.id));

    if (allSelected && visiblePlayers.length > 0) {
        toggleBtn.textContent = '✕';
        toggleBtn.title = 'Deselect all';
    } else {
        toggleBtn.textContent = '✓';
        toggleBtn.title = 'Select all';
    }
}

/**
 * Delete selected player with confirmation
 */
function deleteSelectedPlayer(event, playerId) {
    event.stopPropagation();
    const player = app.allPlayers.find(p => p.id === playerId);
    if (!player) return;

    const playerName = player.name;
    showConfirmationModal(
        t('confirmation.delete_player_title'),
        t('confirmation.delete_player_message').replace('{name}', playerName),
        async function() {
            const index = app.allPlayers.findIndex(p => p.id === playerId);
            if (index >= 0) {
                app.allPlayers.splice(index, 1);
                app.selectedPlayers = app.selectedPlayers.filter(p => p.id !== playerId);
                try {
                    await savePlayersToStorage();
                    console.log('[App] Player deleted and saved');
                } catch (e) {
                    console.error('[App] Error deleting player:', e);
                }
                renderPlayersList();
            }
        }
    );
}

/**
 * Add a new player
 */
async function addPlayer(name) {
    if (!name || name.trim().length === 0) {
        alert('Please enter a player name');
        return;
    }

    // Check if player already exists
    if (app.allPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert('Player already exists');
        return;
    }

    const newPlayer = {
        id: generateId(),
        name: name.trim()
    };

    app.allPlayers.push(newPlayer);

    try {
        await savePlayersToStorage();
        console.log('[App] Player added and saved:', newPlayer);
    } catch (e) {
        console.error('[App] Error adding player:', e);
    }

    // Clear search to show all players including the newly added one
    document.getElementById('player-search').value = '';
    renderPlayersList();
}

/**
 * Setup the add player button functionality
 */
function setupAddPlayerButton() {
    const searchInput = document.getElementById('player-search');
    const addBtn = document.getElementById('add-player-btn');

    // Enable/disable button based on input value
    searchInput.addEventListener('input', (e) => {
        const hasText = e.target.value.trim().length > 0;
        addBtn.disabled = !hasText;
    });

    addBtn.addEventListener('click', () => {
        addPlayer(searchInput.value);
        searchInput.value = '';
        addBtn.disabled = true;
        searchInput.focus();
        filterPlayers();
    });

    // Allow Enter key to add player (only if button is enabled)
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !addBtn.disabled) {
            addBtn.click();
        }
    });
}
