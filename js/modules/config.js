/**
 * Tournament Configuration Module
 * Handles tournament setup and configuration
 */

/**
 * Update total shots when targets or bullets change
 */
function updateTotalShots() {
    const targetsInput = document.getElementById('targets-input');
    const bulletsInput = document.getElementById('bullets-per-target');
    const totalShotsDisplay = document.getElementById('total-shots-display');

    if (targetsInput && bulletsInput) {
        const targets = parseInt(targetsInput.value) || 0;
        const bullets = parseInt(bulletsInput.value) || 0;
        const total = targets * bullets;

        app.tournamentConfig.targets = targets;
        app.tournamentConfig.bulletsPerTarget = bullets;
        app.tournamentConfig.totalShots = total;

        if (totalShotsDisplay) {
            totalShotsDisplay.textContent = total;
        }

        // Determine tournament type based on configuration
        determineTournamentType();

        saveTournamentState();
    }
}

/**
 * Determine tournament type based on configuration
 */
function determineTournamentType() {
    const targets = app.tournamentConfig.targets;

    // Range-based tournament types
    if (targets >= 1 && targets <= 4) {
        app.tournamentConfig.type = 'small-targets';
    } else if (targets >= 5 && targets <= 20) {
        app.tournamentConfig.type = 'medium-targets';
    } else if (targets > 20) {
        app.tournamentConfig.type = 'large-targets';
    } else {
        app.tournamentConfig.type = null;
    }

    console.log('[App] Tournament type set to:', app.tournamentConfig.type);
}

/**
 * Get color gradient based on tournament type
 */
function getTournamentColorGradient() {
    const type = app.tournamentConfig.type;

    const colorMap = {
        'small-targets': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'medium-targets': 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)',
        'large-targets': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };

    return colorMap[type] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}

/**
 * Get tournament type display name
 */
function getTournamentTypeDisplay() {
    const type = app.tournamentConfig.type;
    const targets = app.tournamentConfig.targets;
    const bullets = app.tournamentConfig.bulletsPerTarget;

    return `${targets}T × ${bullets}S`;
}

/**
 * Validate configuration before proceeding
 */
function validateConfig() {
    if (app.tournamentConfig.targets < 1 || app.tournamentConfig.targets > 100) {
        alert('Please enter valid number of targets (1-100)');
        return false;
    }

    if (app.tournamentConfig.bulletsPerTarget < 1 || app.tournamentConfig.bulletsPerTarget > 20) {
        alert('Please enter valid shots per target (1-20)');
        return false;
    }

    if (app.selectedPlayers.length === 0) {
        alert(t('league.no_players_selected'));
        return false;
    }

    return true;
}

/**
 * Handle predefined tournament type selection
 */
function selectTournamentType(typeConfig) {
    document.getElementById('targets-input').value = typeConfig.targets;
    document.getElementById('bullets-per-target').value = typeConfig.bullets;

    app.tournamentConfig.targets = typeConfig.targets;
    app.tournamentConfig.bulletsPerTarget = typeConfig.bullets;
    app.tournamentConfig.totalShots = typeConfig.targets * typeConfig.bullets;

    // Update display
    const totalShotsDisplay = document.getElementById('total-shots-display');
    if (totalShotsDisplay) {
        totalShotsDisplay.textContent = app.tournamentConfig.totalShots;
    }

    determineTournamentType();
    saveTournamentState();

    console.log('[App] Tournament type selected:', app.tournamentConfig);
}
