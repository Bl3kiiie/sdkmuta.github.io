/**
 * Utility and Helper Functions
 */

/**
 * Translation function - gets translated string
 */
function t(key) {
    if (!translations[app.language]) {
        console.warn('[App] Language not found:', app.language);
        return key;
    }
    return translations[app.language][key] || key;
}

/**
 * Update all translations in the DOM
 */
function updateAllTranslations() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);

        if (element.tagName === 'INPUT' && element.type === 'text') {
            element.placeholder = translation;
        } else if (element.tagName === 'INPUT' && element.hasAttribute('data-i18n-placeholder')) {
            element.placeholder = translation;
        } else {
            element.textContent = translation;
        }
    });

    // Update elements with data-i18n-placeholder attribute (for inputs that only have placeholder translation)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const translation = t(key);
        element.placeholder = translation;
    });
}

/**
 * Change application language
 */
function changeLanguage(lang) {
    if (lang !== 'en' && lang !== 'sl') {
        console.warn('[App] Invalid language:', lang);
        return;
    }

    app.language = lang;
    localStorage.setItem('app_language', lang);

    // Update language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update all translations
    updateAllTranslations();

    // Re-render scoring view if currently on that page (to update dynamic content)
    const activeScoringView = document.getElementById('view-scoring').classList.contains('active');
    if (activeScoringView) {
        renderScoringView();
    }

    // Re-render results view if currently on that page (to update dynamic header title)
    const activeResultsView = document.getElementById('view-results').classList.contains('active');
    if (activeResultsView && app.lastResults) {
        displayResults(app.lastResults);
    }

    console.log('[App] Language changed to:', lang);
}

/**
 * Navigate between views
 */
function goToView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
    window.scrollTo(0, 0);
    hideInstructions();
    updateHelpButton(viewId);
    updateNavbarTitle(viewId);
}

/**
 * Toggle instructions panel
 */
function toggleInstructions() {
    // Find the active view
    const activeView = document.querySelector('.view.active');
    if (!activeView) return;

    // Find instructions panel within the active view
    const panel = activeView.querySelector('.instructions-panel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

/**
 * Hide instructions panel
 */
function hideInstructions() {
    // Find the active view
    const activeView = document.querySelector('.view.active');
    if (!activeView) return;

    // Find instructions panel within the active view
    const panel = activeView.querySelector('.instructions-panel');
    if (panel) {
        panel.classList.remove('active');
    }
}

/**
 * Update navbar title based on current view
 */
function updateNavbarTitle(viewId) {
    const titles = {
        'view-participants': 'Player Management',
        'view-config': 'Tournament Setup',
        'view-scoring': 'Score Entry',
        'view-results': 'Final Results'
    };

    const navTitle = document.getElementById('navbar-title');
    if (navTitle) {
        navTitle.textContent = `SDK Muta - ${titles[viewId] || 'Calculator'}`;
    }
}

/**
 * Update help button visibility
 */
function updateHelpButton(viewId) {
    const helpBtn = document.getElementById('help-toggle-btn');
    if (helpBtn) {
        if (viewId === 'view-participants' || viewId === 'view-config' ||
            viewId === 'view-scoring' || viewId === 'view-results') {
            helpBtn.style.display = 'block';
        } else {
            helpBtn.style.display = 'none';
        }
    }
}

/**
 * Collapsible section toggle
 */
function toggleCollapsible(header) {
    const content = header.nextElementSibling;
    if (content && content.classList.contains('collapsible-content')) {
        const isCollapsed = content.classList.toggle('collapsed');
        const icon = header.querySelector('.collapsible-icon');
        if (icon) {
            icon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    }
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Deep clone object
 */
function deepClone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        console.error('[App] Error cloning object:', e);
        return obj;
    }
}

/**
 * Format date to locale string
 */
function formatDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    return date.toLocaleDateString();
}

/**
 * Confirmation Modal Functions
 */
let pendingAction = null;

function showConfirmationModal(title, message, action) {
    document.getElementById('confirmation-modal-title').textContent = title;
    document.getElementById('confirmation-modal-message').textContent = message;

    // Update button translations
    document.querySelector('.confirmation-modal-buttons .btn-cancel').textContent = t('confirmation.cancel');
    document.querySelector('.confirmation-modal-buttons .btn-delete').textContent = t('confirmation.delete');

    document.getElementById('confirmation-modal').classList.add('active');
    pendingAction = action;
}

function closeConfirmationModal() {
    document.getElementById('confirmation-modal').classList.remove('active');
    pendingAction = null;
}

function confirmAction() {
    if (pendingAction) {
        pendingAction();
    }
    closeConfirmationModal();
}

// Close modal when clicking outside the content
document.addEventListener('click', function(event) {
    const modal = document.getElementById('confirmation-modal');
    const content = document.querySelector('.confirmation-modal-content');
    if (event.target === modal && modal.classList.contains('active')) {
        closeConfirmationModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('confirmation-modal');
        if (modal.classList.contains('active')) {
            closeConfirmationModal();
        }
    }
});
