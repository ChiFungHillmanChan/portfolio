// =====================================================
// EMBED-3D BRIDGE — 3D lobby integration (?embed=3d)
// =====================================================
// When the game runs inside the 3D lobby's bottom-sheet iframe
// (calculator/lobby-3d/roulette-live.js), this bridge mirrors the game into
// the 3D scene over same-origin postMessage. The game keeps FULL authority
// over bets, RNG and the shared server wallet; the lobby only visualizes:
//
//   out: { source:'cg-roulette', type:'bets', bets, total }  — after every bet change
//   out: { source:'cg-roulette', type:'spin', result }       — spin locked, result pre-decided
//   in:  { source:'cg-lobby',    type:'reveal' }             — 3D ball landed → settle round
//
// The `embed-3d` class on <html> (set by the inline head snippet before
// first paint) scopes css/embed-3d.css, which strips the page down to the
// betting surface: the 3D scene provides the wheel, stats and history.

(function () {
    if (!document.documentElement.classList.contains('embed-3d')) return;

    const ORIGIN = window.location.origin;
    const post = (msg) => window.parent.postMessage({ source: 'cg-roulette', ...msg }, ORIGIN);

    // Every bet mutation (place/remove/clear/undo/double/repeat/call bets,
    // and the post-settlement clear) funnels through renderPlacedChips.
    const origRenderPlacedChips = window.renderPlacedChips;
    window.renderPlacedChips = function (...args) {
        const out = origRenderPlacedChips.apply(this, args);
        try {
            post({ type: 'bets', bets: getAllBets(), total: getTotalWagered() });
        } catch (err) {
            console.warn('[embed-3d] bets bridge failed:', err);
        }
        return out;
    };

    // The 3D wheel replaces the 2D wheel animation: report the (pre-decided)
    // result, hold the game in SPINNING until the lobby's ball lands, then
    // run the normal settlement callback.
    window.animateWheelSpin = function (spinData, onComplete) {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            window.removeEventListener('message', onMsg);
            onComplete();
        };
        const onMsg = (ev) => {
            if (ev.origin !== ORIGIN) return;
            const d = ev.data;
            if (d && d.source === 'cg-lobby' && d.type === 'reveal') finish();
        };
        window.addEventListener('message', onMsg);
        post({ type: 'spin', result: spinData.result });
        // Safety fallback: must comfortably exceed the lobby's worst-case spin + dealer settle choreography (~12.5s)
        setTimeout(finish, 20000);
    };

    document.addEventListener('wallet:ready', () => post({ type: 'ready' }));
    post({ type: 'hello' });
})();
