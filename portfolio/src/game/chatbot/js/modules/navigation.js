import { Helpers } from '../utils/helpers';

class NavigationManager {
    constructor() {
        this.sidebar = null;
        this.navToggle = null;
        this.sidebarOverlay = null;
        this.sidebarClose = null;
        this.mainThemeBtn = null;
        this.discoveredThemes = null;
        this.sidebarOpen = false;
        this.discoveredThemesList = [];
        this.isNavigationLocked = false;
    }

    init() {
        this.sidebar = document.getElementById('sidebar');
        this.navToggle = document.getElementById('navToggle');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.sidebarClose = document.getElementById('sidebarClose');
        this.mainThemeBtn = document.getElementById('mainThemeBtn');
        this.discoveredThemes = document.getElementById('discoveredThemes');
        
        this.bindEvents();
    }

    bindEvents() {
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => {
                if (!this.isNavigationLocked) {
                    this.toggleSidebar();
                }
            });
        }

        if (this.sidebarClose) {
            this.sidebarClose.addEventListener('click', () => this.closeSidebar());
        }

        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());
        }

        if (this.mainThemeBtn) {
            this.mainThemeBtn.addEventListener('click', () => {
                window.themeManager.switchToMainTheme();
                this.closeSidebar();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebarOpen) {
                this.closeSidebar();
            }
        });
    }

    toggleSidebar() {
        if (this.sidebarOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        if (this.isNavigationLocked) return;
        
        this.sidebarOpen = true;
        this.sidebar.classList.add('show');
        this.sidebarOverlay.classList.add('active');
        this.navToggle.classList.add('active');
        Helpers.addGlobalClass('sidebar-open');
        document.body.style.overflow = 'hidden';
    }

    closeSidebar() {
        this.sidebarOpen = false;
        this.sidebar.classList.remove('show');
        this.sidebarOverlay.classList.remove('active');
        this.navToggle.classList.remove('active');
        Helpers.removeGlobalClass('sidebar-open');
        document.body.style.overflow = '';
    }

    lockNavigation() {
        this.isNavigationLocked = true;
        if (this.navToggle) {
            this.navToggle.style.opacity = '0.5';
            this.navToggle.style.pointerEvents = 'none';
        }
    }

    unlockNavigation() {
        this.isNavigationLocked = false;
        if (this.navToggle) {
            this.navToggle.style.opacity = '1';
            this.navToggle.style.pointerEvents = 'auto';
        }
    }

    addDiscoveredTheme(themeName, themeData) {
        if (!this.discoveredThemesList.includes(themeName)) {
            this.discoveredThemesList.push(themeName);
            this.updateSidebar(themeData);
        }
    }

    updateSidebar(allThemeData) {
        if (!this.discoveredThemes) return;
        
        this.discoveredThemes.innerHTML = '';
        
        this.discoveredThemesList.forEach(themeName => {
            const themeData = allThemeData[themeName];
            if (themeData) {
                const themeButton = Helpers.createElement('div', 'sidebar-theme-btn', themeData.theme.name);
                themeButton.addEventListener('click', () => {
                    window.themeManager.switchToTheme(themeName);
                    this.closeSidebar();
                });
                this.discoveredThemes.appendChild(themeButton);
            }
        });
    }

    getDiscoveredThemes() {
        return [...this.discoveredThemesList];
    }

    resetDiscoveredThemes() {
        this.discoveredThemesList = [];
        this.updateSidebar({});
    }

    getIsNavigationLocked() {
        return this.isNavigationLocked;
    }
}

export { NavigationManager };
export default NavigationManager;
