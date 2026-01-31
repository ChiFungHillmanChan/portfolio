// Baccarat UI Helper Functions

// Collapsible section state
const sectionStates = {
    roadsSection: false,
    egaliteSection: false,
    historySection: false
};

function toggleSection(sectionId) {
    sectionStates[sectionId] = !sectionStates[sectionId];
    const content = document.getElementById(sectionId);
    const toggle = document.getElementById(sectionId + 'Toggle');

    if (sectionStates[sectionId]) {
        content.classList.add('open');
        toggle.textContent = '▲';
    } else {
        content.classList.remove('open');
        toggle.textContent = '▼';
    }
}

// Load HTML components
async function loadComponents() {
    const topPanel = await fetch('html/top-panel.html').then(response => response.text());
    const middlePanel = await fetch('html/middle-panel.html').then(response => response.text());
    const bottomPanel = await fetch('html/bottom-panel.html').then(response => response.text());

    document.getElementById('top-panel').innerHTML = topPanel;
    document.getElementById('middle-panel').innerHTML = middlePanel;
    document.getElementById('bottom-panel').innerHTML = bottomPanel;
}

// Load components before initialization
loadComponents().then(() => init());
