// =====================================================
// INITIALIZATION
// =====================================================

function init() {
    renderCardGrid();
    renderBeadRoad();
    renderBigRoad();
    renderEgaliteGrid();
    updateHandDisplay();
    updateAllDisplays();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
