// =====================================================
// HAMBURGER MENU - Shared Navigation Script
// =====================================================

/**
 * Initialize hamburger menu functionality
 * Call this after DOM is loaded
 */
function initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (!hamburgerBtn || !dropdownMenu) return;

    // Toggle menu on hamburger click
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdownMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            closeDropdownMenu();
        }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdownMenu();
        }
    });
}

/**
 * Toggle dropdown menu open/closed
 */
function toggleDropdownMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (!hamburgerBtn || !dropdownMenu) return;

    const isOpen = dropdownMenu.classList.contains('open');

    if (isOpen) {
        closeDropdownMenu();
    } else {
        openDropdownMenu();
    }
}

/**
 * Open dropdown menu
 */
function openDropdownMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (!hamburgerBtn || !dropdownMenu) return;

    hamburgerBtn.setAttribute('aria-expanded', 'true');
    dropdownMenu.classList.add('open');
    dropdownMenu.setAttribute('aria-hidden', 'false');
}

/**
 * Close dropdown menu
 */
function closeDropdownMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (!hamburgerBtn || !dropdownMenu) return;

    hamburgerBtn.setAttribute('aria-expanded', 'false');
    dropdownMenu.classList.remove('open');
    dropdownMenu.setAttribute('aria-hidden', 'true');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHamburgerMenu);
} else {
    initHamburgerMenu();
}
