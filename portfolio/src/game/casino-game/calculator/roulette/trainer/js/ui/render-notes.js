// =====================================================
// RENDER NOTES - Notes area for Easy/Medium modes
// =====================================================

import { setNotes, getNotes } from '../state/game-state.js';

let notesVisible = true;

/**
 * Initialize notes functionality
 */
function initNotes() {
    const toggleBtn = document.getElementById('notes-toggle');
    const textarea = document.getElementById('notes-textarea');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleNotes);
    }

    if (textarea) {
        textarea.addEventListener('input', handleNotesInput);
        textarea.value = getNotes();
    }

    updateNotesVisibility();
}

/**
 * Toggle notes visibility
 */
function toggleNotes() {
    notesVisible = !notesVisible;
    updateNotesVisibility();
}

/**
 * Update notes visibility based on state
 */
function updateNotesVisibility() {
    const content = document.getElementById('notes-content');
    const toggleBtn = document.getElementById('notes-toggle');

    if (content) {
        content.style.display = notesVisible ? 'block' : 'none';
    }

    if (toggleBtn) {
        toggleBtn.textContent = notesVisible ? 'Hide' : 'Show';
    }
}

/**
 * Handle notes input
 * @param {Event} e - Input event
 */
function handleNotesInput(e) {
    setNotes(e.target.value);
}

/**
 * Render notes section
 * @param {string} notes - Current notes content
 */
function renderNotes(notes) {
    const textarea = document.getElementById('notes-textarea');
    if (textarea && textarea !== document.activeElement) {
        textarea.value = notes || '';
    }
}

/**
 * Create notes HTML
 * @returns {string}
 */
function createNotesHTML() {
    return `
        <div class="notes-section" id="notes-section">
            <div class="notes-header">
                <h3>Scratch Pad</h3>
                <button class="notes-toggle" id="notes-toggle">Hide</button>
            </div>
            <div id="notes-content">
                <textarea
                    class="notes-textarea"
                    id="notes-textarea"
                    placeholder="Use this space for calculations...

Payout Reference:
- Straight: 35:1
- Split: 17:1
- Street: 11:1
- Corner: 8:1
- Six Line: 5:1
- Column/Dozen: 2:1
- Even Money: 1:1"
                ></textarea>
            </div>
        </div>
    `;
}

/**
 * Get default notes content with payout reference
 * @returns {string}
 */
function getDefaultNotes() {
    return `Payout Reference:
- Straight: 35:1 (1 number)
- Split: 17:1 (2 numbers)
- Street: 11:1 (3 numbers)
- Corner: 8:1 (4 numbers)
- Six Line: 5:1 (6 numbers)
- Column/Dozen: 2:1 (12 numbers)
- Even Money: 1:1 (18 numbers)

Calculation Space:
`;
}

export {
    initNotes,
    toggleNotes,
    renderNotes,
    createNotesHTML,
    getDefaultNotes
};
