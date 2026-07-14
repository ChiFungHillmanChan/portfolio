// roulette-live.js — in-place roulette play at a 3D floor table.
//
// Flow: the sit-down card's "Play at this table" opens a bottom-sheet iframe
// running the REAL 2D roulette game in embed mode (?embed=3d — see
// roulette/js/embed-3d.js). The game keeps full authority over bets, RNG and
// the shared server wallet; this module only mirrors it into the 3D scene:
//   bets message  → chip stacks on the printed felt (roulette-map.js)
//   spin message  → camera turns to the wheel, the real 3D wheel spins and
//                   the ball lands on the game's pre-decided result
//   ball landed   → result appended to the table's tote board, then the game
//                   is told to reveal/settle and betting reopens.
import { betSpots } from './roulette-map.js';
import { bannerSub, resultSpeech } from './roulette-call.js';

let active = null;

export const rouletteLiveActive = () => !!active;
export const rouletteSpinning = () => !!(active && active.spinning());

export function closeRouletteLive() {
  active?.close();
}

export function openRouletteLive({ table }) {
  if (active) return active;
  const C = globalThis.CASINO;
  const rig = C.floor.rouletteRigs && C.floor.rouletteRigs.get(table.id);
  const G = C.floor.ROULETTE_FELT;
  if (!rig || !G) {
    // no 3D rig for this table — fall back to the full game page
    window.location.href = table.href;
    return null;
  }

  const toWorld = (x, y, z) => rig.localToWorld(new THREE.Vector3(x, y, z)).toArray();
  // The westmost table's player side runs close to the wall — keep camera
  // poses inside the walkable floor rect.
  const floorRect = C.floorplan.WALK_RECTS.find((r) => r.id === 'floor');
  const clampWest = (p) => { p[0] = Math.max(p[0], floorRect.x0 + 0.3); return p; };
  const poses = {
    // player side of the printed layout, looking across the whole felt
    betting: { pos: clampWest(toWorld(0.45, 0, 2.05)), look: toWorld(-0.1, 0.86, -0.3) },
    // on the recessed bowl with the tote board framed beside it, so the
    // ball drop and the result display read in one view
    wheel: { pos: clampWest(toWorld(-0.5, 0, 2.05)), look: toWorld(-2.3, 0.88, 0.15) },
  };

  const wrap = document.createElement('div');
  wrap.id = 'rouletteLive';
  wrap.innerHTML = `
    <div class="rl-bar">
      <span class="rl-title">${(table.tierName || '').toUpperCase()} ROULETTE · ${table.limitsText || ''}</span>
      <span class="rl-status" aria-live="polite"></span>
      <button type="button" class="rl-leave">Leave table</button>
    </div>
    <iframe class="rl-frame" title="Roulette betting table"
      src="../roulette/index.html?stake=${encodeURIComponent(table.key)}&embed=3d"></iframe>`;
  document.body.appendChild(wrap);
  const iframe = wrap.querySelector('iframe');
  const status = wrap.querySelector('.rl-status');
  const postToGame = (msg) => {
    iframe.contentWindow && iframe.contentWindow.postMessage({ source: 'cg-lobby', ...msg }, window.location.origin);
  };

  let lastBets = null;
  let spinning = false;
  let closed = false;

  async function runSpin(result) {
    if (spinning || closed) return;
    spinning = true;
    status.textContent = 'No more bets — spinning…';
    C.sound?.sayNoMoreBets();
    wrap.classList.add('rl-hidden');
    await C.app.glideTo(poses.wheel.pos, poses.wheel.look, 1000);
    if (closed) return;
    const spinSound = C.sound?.ballSpin(5000);   // spinTo runs ~4.2–5.8s; stop() syncs the end
    await rig.userData.spinTo(result);
    spinSound?.stop();
    if (closed) return;
    rig.userData.pushResult(result);
    C.app.banner(String(result), bannerSub(result), 2000);   // zero is neither even nor odd
    C.sound?.say(resultSpeech(result));

    // dealer marks the number, sweeps losers, pays winners — camera on the felt
    await C.app.glideTo(poses.betting.pos, poses.betting.look, 900);
    if (closed) return;
    await rig.userData.placeDolly(result);
    if (closed) return;
    if (lastBets) {
      const RC = globalThis.CASINO.rouletteCover;
      const { losing, wins } = RC.splitByOutcome(lastBets, result);
      const losingSpots = betSpots(losing, G);
      // one spot per winning bet entry so each carries its own payout factor
      const winningSpots = wins.map((w) => {
        const single = w.key === null
          ? { [w.type]: w.amount }
          : { [w.type]: { [w.key]: w.amount } };
        const [spot] = betSpots(single, G);
        return spot ? { ...spot, factor: w.factor } : null;
      }).filter(Boolean);
      await rig.userData.settleBets({ losingSpots, winningSpots });
      if (closed) return;
    }
    await rig.userData.liftDolly();
    if (closed) return;
    postToGame({ type: 'reveal' });
    await new Promise((r) => setTimeout(r, 800));
    if (closed) return;
    wrap.classList.remove('rl-hidden');
    status.textContent = '';
    spinning = false;
  }

  let lastBetTotal = 0;
  const onMsg = (ev) => {
    if (ev.origin !== window.location.origin) return;
    const d = ev.data;
    if (!d || d.source !== 'cg-roulette') return;
    if (d.type === 'bets') {
      lastBets = d.bets;
      rig.userData.setBets(betSpots(d.bets, G));
      if (typeof d.total === 'number') {
        if (d.total > lastBetTotal) C.sound?.play('chip');
        else if (d.total === 0 && lastBetTotal > 0) C.sound?.play('chipSweep');
        lastBetTotal = d.total;
      }
    } else if (d.type === 'spin') runSpin(d.result);
  };
  window.addEventListener('message', onMsg);

  function close() {
    if (closed) return;
    closed = true;
    window.removeEventListener('message', onMsg);
    wrap.remove();
    rig.userData.setBets([]);
    C.app.inputLocked = false;
    active = null;
    const a = C.world.anchorById(table.id);
    if (a) C.app.goToAnchor(a);
  }
  wrap.querySelector('.rl-leave').addEventListener('click', close);

  C.app.inputLocked = true;
  C.app.glideTo(poses.betting.pos, poses.betting.look, 1100)
    .then(() => { if (!closed) rig.userData.buyIn(); });

  active = { close, tableId: table.id, spinning: () => spinning };
  return active;
}
