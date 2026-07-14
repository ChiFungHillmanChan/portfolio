// blackjack-live.js — in-place blackjack play at a 3D floor table.
//
// Native 3D round (unlike roulette-live's iframe mirror): this module owns the
// betting board (DOM), the round state machine and the wallet round, and uses
// the engine (globalThis.CASINO) for cards, chips and camera. European deal:
// player, dealer up-card, player — no hole card; dealer draws after actions.
import {
  makeShoe, handValue, isBlackjack, dealerPlay, canSplit,
  settleMain, perfectPairReturn, twentyOnePlus3Return, validateBets, chipRack,
} from './blackjack-rules.js';
import { getTable, formatChips } from '../js/wallet/table-config.js';

// ---------- pure layout planners (node-tested) ----------
// Player cards stack TOWARD the dealer (radius shrinks per card) with the
// newest physically on top; split hands sit at ±splitDx along the tangent.
export function planPlayerCard(seat, { hand = 0, hands = 1, card = 0, sideways = false } = {}) {
  const tangent = hands === 1 ? 0 : (hand === 0 ? seat.splitDx : -seat.splitDx);
  const radius = seat.cardsR - card * seat.stackDr;
  const a = seat.angle;
  const x = Math.cos(a) * radius - Math.sin(a) * tangent;
  const z = Math.sin(a) * radius + Math.cos(a) * tangent;
  const spin = Math.PI / 2 - a + (card % 2 ? -0.06 : 0.05) + (sideways ? Math.PI / 2 : 0);
  return { pos: [x, seat.feltY + 0.012 + card * 0.003, z], spin };
}

// Dealer cards run HORIZONTALLY: the two painted boxes, then fanDx per card.
export function planDealerCard(L, i) {
  const s = L.dealerSlots;
  const base = i < s.length
    ? s[i]
    : [s[s.length - 1][0] + (i - s.length + 1) * L.fanDx, s[1][1], s[1][2]];
  return { pos: [base[0], base[1] + i * 0.0012, base[2]], spin: 0 };
}

const STYLE_ID = 'bj3-style';
const CSS = `
#bjLive{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;flex-direction:column;align-items:center;pointer-events:none;font-family:Rajdhani,system-ui,sans-serif}
#bjLive .bj3-bar{pointer-events:auto;display:flex;gap:14px;align-items:center;background:rgba(12,10,8,.92);border:1px solid #6b5325;border-bottom:0;border-radius:10px 10px 0 0;padding:6px 14px;color:#e8d9a8;font-size:14px;letter-spacing:.4px}
#bjLive .bj3-bar .bj3-balance{color:#ffd76a;font-weight:600}
#bjLive .bj3-bar button{background:none;border:1px solid #6b5325;border-radius:6px;color:#e8d9a8;padding:3px 10px;cursor:pointer}
#bjLive .bj3-panel{pointer-events:auto;width:min(560px,96vw);background:rgba(12,10,8,.92);border:1px solid #6b5325;border-radius:12px 12px 0 0;padding:10px 16px 12px;transition:transform .35s ease;color:#e8d9a8}
#bjLive.bj3-away .bj3-panel{transform:translateY(115%)}
.bj3-circles{display:flex;justify-content:center;gap:18px;margin:6px 0 10px}
.bj3-spot{position:relative;width:86px;height:86px;border:2px solid rgba(240,216,120,.7);border-radius:50%;background:rgba(11,93,59,.55);color:#f0d878;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;cursor:pointer;user-select:none}
.bj3-spot.bj3-main{width:104px;height:104px;font-size:15px}
.bj3-spot .bj3-badge{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:#1d1608;border:1px solid #6b5325;border-radius:9px;padding:0 8px;font-size:12px;color:#ffd76a;white-space:nowrap}
.bj3-rack{display:flex;justify-content:center;gap:8px;margin-bottom:10px}
.bj3-chipbtn{width:44px;height:44px;border-radius:50%;border:3px dashed rgba(255,255,255,.75);color:#fff;font-weight:700;cursor:pointer;font-size:12px}
.bj3-chipbtn.bj3-sel{outline:3px solid #ffd76a;outline-offset:2px}
.bj3-actionsrow{display:flex;justify-content:center;gap:10px;align-items:center}
.bj3-actionsrow button{border-radius:8px;padding:8px 18px;font-weight:700;letter-spacing:.6px;cursor:pointer;border:0}
.bj3-gold{background:linear-gradient(180deg,#f4cf67,#c9982b);color:#241a05}
.bj3-dim{background:#2a241a;color:#cdbd90;border:1px solid #55431f}
.bj3-gold:disabled,.bj3-dim:disabled{opacity:.4;cursor:default}
.bj3-status{text-align:center;min-height:18px;font-size:13px;margin-top:6px}
.bj3-status .bj3-err{color:#ff9d7a}
#bjActions{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:31;display:flex;gap:10px;align-items:center;background:rgba(12,10,8,.9);border:1px solid #6b5325;border-radius:12px;padding:10px 16px;color:#e8d9a8;font-family:Rajdhani,system-ui,sans-serif}
#bjActions .bj3-total{font-size:15px;font-weight:600;min-width:130px}
@media (max-width:640px){#bjLive .bj3-panel{padding:8px}.bj3-spot{width:72px;height:72px}.bj3-spot.bj3-main{width:88px;height:88px}}
`;

const CHIP_COLORS_2D = { 50: '#c26a1f', 100: '#2e6db4', 500: '#8e44ad', 1000: '#c0392b', 5000: '#b8860b' };

let active = null;
export const blackjackLiveActive = () => !!active;
export function closeBlackjackLive() { active?.close(); }

export function openBlackjackLive({ table, walletClient, onClosed }) {
  if (active) return active;
  const C = globalThis.CASINO;
  const rig = C.floor.blackjackRigs && C.floor.blackjackRigs.get(table.id);
  const bj = rig && rig.userData.bj;
  if (!rig || !bj || !walletClient) {           // no rig — fall back to the 2D page
    window.location.href = table.href;
    return null;
  }
  const cfg = getTable(table.gameId);
  const rack = chipRack(cfg.betTypes);
  const toWorld = (p) => rig.localToWorld(new THREE.Vector3(p[0], p[1], p[2])).toArray();

  // ---- seat: the free seat nearest to where the player stands ----
  const px = C.app.player.x - rig.position.x, pz = C.app.player.z - rig.position.z;
  const seatIdx = bj.freeSeats
    .map((i) => {
      const [x, z] = bj.seatPoint(bj.seatAngle(i), bj.seat.stoolR);
      return { i, d: Math.hypot(px - x, pz - z) };
    })
    .sort((a, b) => a.d - b.d)[0].i;
  const angle = bj.seatAngle(seatIdx);
  const seat = { angle, cardsR: bj.seat.cardsR, stackDr: bj.seat.stackDr, splitDx: bj.seat.splitDx, feltY: bj.feltY };
  const seatLocal = (radius, tangent = 0, y = bj.feltY) => {
    const [x, z] = bj.seatPoint(angle, radius, tangent);
    return [x, y, z];
  };
  const poses = {
    seated: { pos: toWorld(seatLocal(2.15)), look: toWorld(seatLocal(0.55, 0, 0.88)) },
    dealer: { pos: toWorld(seatLocal(2.15)), look: toWorld([0, 0.95, 0.16]) },
  };

  // ---- 3D chip stacks mirrored 1:1 from the board ----
  const stacks = C.chips.createBetStacks(C.app, {
    getSpotPos: (id) => toWorld(bj.spotLocal(seatIdx, id)),
    source: toWorld(seatLocal(1.72, 0, bj.feltY + 0.06)),
    dealerPos: toWorld(bj.trayLocal),
  });

  // ---- betting board DOM ----
  if (!document.getElementById(STYLE_ID)) {
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const bets = { main: 0, perfectPair: 0, twentyOnePlus3: 0 };
  const placed = { main: [], perfectPair: [], twentyOnePlus3: [] };
  const history = [];
  let selectedDenom = rack[Math.min(1, rack.length - 1)];
  let roundInFlight = false;

  const wrap = document.createElement('div');
  wrap.id = 'bjLive';
  wrap.innerHTML = `
    <div class="bj3-bar">
      <span>${(table.tierName || '').toUpperCase()} BLACKJACK · ${table.limitsText || ''}</span>
      <span class="bj3-balance"></span>
      <button type="button" class="bj3-leave">Leave table</button>
    </div>
    <div class="bj3-panel">
      <div class="bj3-circles">
        <div class="bj3-spot" data-spot="perfectPair">P&nbsp;PAIR</div>
        <div class="bj3-spot bj3-main" data-spot="main">MAIN</div>
        <div class="bj3-spot" data-spot="twentyOnePlus3">21+3</div>
      </div>
      <div class="bj3-rack"></div>
      <div class="bj3-actionsrow">
        <button type="button" class="bj3-dim bj3-undo">UNDO</button>
        <button type="button" class="bj3-dim bj3-clear">CLEAR</button>
        <button type="button" class="bj3-gold bj3-deal" disabled>DEAL</button>
      </div>
      <div class="bj3-status" aria-live="polite"></div>
    </div>`;
  document.body.appendChild(wrap);
  const statusEl = wrap.querySelector('.bj3-status');
  const dealBtn = wrap.querySelector('.bj3-deal');
  const balanceEl = wrap.querySelector('.bj3-balance');

  const REASON_COPY = {
    'main-range': `Main bet ${cfg.betTypes.main.min.toLocaleString()} – ${cfg.betTypes.main.max.toLocaleString()}`,
    'side-range': `Side bets ${cfg.betTypes.perfectPair.min.toLocaleString()} – ${cfg.betTypes.perfectPair.max.toLocaleString()}`,
    'table-max': `Table max ${cfg.maxTotalBet.toLocaleString()} total`,
    balance: 'Not enough chips',
    insufficient: 'Not enough chips',
    'too-fast': 'One moment — dealing too fast',
    'network-error': 'Connection problem — try again',
  };

  const renderBalance = () => { balanceEl.textContent = formatChips(walletClient.getBalance() ?? 0); };
  const unsubBalance = walletClient.subscribe(renderBalance);
  renderBalance();

  const rackEl = wrap.querySelector('.bj3-rack');
  rack.forEach((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bj3-chipbtn' + (v === selectedDenom ? ' bj3-sel' : '');
    b.style.background = CHIP_COLORS_2D[v] || '#555';
    b.textContent = v >= 1000 ? v / 1000 + 'K' : String(v);
    b.addEventListener('click', () => {
      selectedDenom = v;
      rackEl.querySelectorAll('.bj3-chipbtn').forEach((x) => x.classList.toggle('bj3-sel', x === b));
    });
    rackEl.appendChild(b);
  });

  function refreshBoard() {
    wrap.querySelectorAll('.bj3-spot').forEach((el) => {
      const amt = bets[el.dataset.spot] || 0;
      let badge = el.querySelector('.bj3-badge');
      if (amt > 0) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'bj3-badge'; el.appendChild(badge); }
        badge.textContent = amt.toLocaleString();
      } else badge?.remove();
    });
    const allZero = !bets.main && !bets.perfectPair && !bets.twentyOnePlus3;
    const v = validateBets(bets, cfg.betTypes, walletClient.getBalance() ?? 0, cfg.maxTotalBet);
    if (allZero) { dealBtn.disabled = true; statusEl.textContent = 'Place your bets'; }
    else if (v.ok) { dealBtn.disabled = false; statusEl.textContent = 'Total: ' + v.total.toLocaleString(); }
    else { dealBtn.disabled = true; statusEl.innerHTML = `<span class="bj3-err">${REASON_COPY[v.reason] || ''}</span>`; }
  }

  wrap.querySelectorAll('.bj3-spot').forEach((el) => {
    el.addEventListener('click', () => {
      if (roundInFlight) return;
      const id = el.dataset.spot;
      bets[id] += selectedDenom;
      placed[id].push(selectedDenom);
      history.push(id);
      stacks.add(id, selectedDenom);
      refreshBoard();
    });
  });
  wrap.querySelector('.bj3-undo').addEventListener('click', () => {
    if (roundInFlight) return;
    const id = history.pop();
    if (!id) return;
    bets[id] -= placed[id].pop();
    stacks.removeTop(id);
    refreshBoard();
  });
  wrap.querySelector('.bj3-clear').addEventListener('click', () => {
    if (roundInFlight) return;
    for (const id of Object.keys(bets)) { bets[id] = 0; placed[id].length = 0; }
    history.length = 0;
    stacks.clear();
    refreshBoard();
  });
  const resetBetsAfterRound = () => {   // 3D stacks were consumed by settle()
    for (const id of Object.keys(bets)) { bets[id] = 0; placed[id].length = 0; }
    history.length = 0;
    refreshBoard();
  };
  refreshBoard();

  // ---- session lifecycle ----
  let closed = false;
  const dealt = [];        // card meshes on the felt this round
  const markers = [];      // split-hand highlight decals

  function disposeMesh(m) {
    m.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((mm) => { if (!mm) return; mm.map?.dispose(); mm.dispose(); });
    });
  }
  function clearTableMeshes() {
    [...dealt, ...markers].forEach((m) => { C.app.scene.remove(m); disposeMesh(m); });
    dealt.length = 0;
    markers.length = 0;
  }

  function close() {
    if (closed) return;
    closed = true;
    unsubBalance();
    wrap.remove();
    document.getElementById('bjActions')?.remove();
    stacks.disposeAll();
    clearTableMeshes();
    C.app.inputLocked = false;
    active = null;
    onClosed && onClosed();
    const a = C.world.anchorById(table.id);
    if (a) C.app.goToAnchor(a);
  }
  wrap.querySelector('.bj3-leave').addEventListener('click', () => {
    if (roundInFlight) { statusEl.innerHTML = '<span class="bj3-err">Finish the hand first</span>'; return; }
    close();
  });

  dealBtn.addEventListener('click', () => {
    if (dealBtn.disabled || roundInFlight) return;
    dealBtn.disabled = true;
    startRound().catch((err) => {
      console.error('[bj-live] round crashed:', err);
      roundInFlight = false;
      wrap.classList.remove('bj3-away');
      refreshBoard();
    });
  });

  // ---- round flow (Task 5 fills these in) ----
  async function startRound() { throw new Error('not-implemented'); }

  C.app.inputLocked = true;
  C.app.glideTo(poses.seated.pos, poses.seated.look, 1100);

  // Stale open round from a crashed session: forfeit it so bet() can open a
  // fresh one (same debit-at-bet posture as the 2D game).
  if (walletClient.openRound && walletClient.openRound(table.gameId)) {
    walletClient.payout(table.gameId, 0)
      .then(() => C.app.banner('Previous hand forfeited', 'An unfinished round was closed.', 2200))
      .catch(() => {});
  }

  active = { close, tableId: table.id };
  return active;
}
