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

// Round banner headline (node-tested). BUST only when EVERY hand busted — a
// split with one busted hand can still be a net win or push, and the title
// must agree with the money the settle pays.
export function settleTitle(hands, rets, dealerCards) {
  const stakeSum = hands.reduce((a, h) => a + h.stake, 0);
  const retSum = rets.reduce((a, b) => a + b, 0);
  if (hands.some((h) => isBlackjack(h.cards) && !h.isSplit) && rets[0] > hands[0].stake) return 'BLACKJACK!';
  if (hands.every((h) => handValue(h.cards).total > 21)) return 'BUST';
  if (retSum > stakeSum) return 'YOU WIN';
  if (retSum === stakeSum && retSum > 0) return 'PUSH';
  return `DEALER ${handValue(dealerCards).total > 21 ? 'BUSTS' : 'WINS'}`;
}

const STYLE_ID = 'bj3-style';
const CSS = `
#bjLive{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;flex-direction:column;align-items:center;pointer-events:none;font-family:Rajdhani,system-ui,sans-serif}
#bjLive .bj3-bar{pointer-events:auto;display:flex;gap:14px;align-items:center;background:rgba(12,10,8,.92);border:1px solid #6b5325;border-bottom:0;border-radius:10px 10px 0 0;padding:6px 14px;color:#e8d9a8;font-size:14px;letter-spacing:.4px}
#bjLive .bj3-bar .bj3-balance{color:#ffd76a;font-weight:600}
#bjLive .bj3-bar button{background:none;border:1px solid #6b5325;border-radius:6px;color:#e8d9a8;padding:3px 10px;cursor:pointer}
#bjLive .bj3-panel{pointer-events:auto;width:min(560px,96vw);background:rgba(12,10,8,.92);border:1px solid #6b5325;border-radius:12px 12px 0 0;padding:10px 16px 12px;transition:transform .35s ease;color:#e8d9a8}
#bjLive.bj3-away .bj3-panel{transform:translateY(115%)}
#bjLive.bj3-away .bj3-bar{display:none}
#quicknav[hidden]{display:none!important}
.bj3-circles{display:flex;justify-content:center;gap:18px;margin:6px 0 10px}
.bj3-spot{position:relative;width:86px;height:86px;border:2px solid rgba(240,216,120,.7);border-radius:50%;background:rgba(11,93,59,.55);color:#f0d878;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;cursor:pointer;user-select:none}
.bj3-spot.bj3-main{width:104px;height:104px;font-size:15px}
.bj3-spot .bj3-badge{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:#1d1608;border:1px solid #6b5325;border-radius:9px;padding:0 8px;font-size:12px;color:#ffd76a;white-space:nowrap;z-index:1}
.bj3-spot .bj3-chips2d{position:absolute;left:50%;top:50%;width:36px;height:36px;margin:-18px 0 0 -18px;pointer-events:none}
.bj3-chip2d{position:absolute;left:0;width:36px;height:36px;border-radius:50%;border:2px dashed rgba(255,255,255,.85);color:#fff;font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.5)}
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
export const blackjackRoundInFlight = () => !!(active && active.roundInFlight());
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
  C.music?.duck(true);   // live session: music sits back behind the dealer

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
  let selectedDenom = rack[0];   // smallest rack chip = the table's main min
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
    'insufficient-chips': 'Not enough chips — buy in at the cashier',
    'too-fast': 'One moment — dealing too fast',
    'network-error': 'Connection problem — try again',
    'round-in-progress': 'Previous hand still closing — one moment',
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
      // 2D chip stack inside the circle, mirroring the placed denominations
      // (base chip centred, stack grows up 4px per chip, last 8 visible —
      // badge stays exact)
      const denoms = placed[el.dataset.spot] || [];
      let chipsEl = el.querySelector('.bj3-chips2d');
      if (!denoms.length) { chipsEl?.remove(); }
      else {
        if (!chipsEl) { chipsEl = document.createElement('div'); chipsEl.className = 'bj3-chips2d'; el.appendChild(chipsEl); }
        chipsEl.replaceChildren(...denoms.slice(-8).map((v, i) => {
          const chip = document.createElement('div');
          chip.className = 'bj3-chip2d';
          chip.style.background = CHIP_COLORS_2D[v] || '#555';
          chip.style.bottom = i * 4 + 'px';
          chip.textContent = v >= 1000 ? v / 1000 + 'K' : String(v);
          return chip;
        }));
      }
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
  let pendingHandResolve = null;   // resolves the in-flight playOneHand promise, if any
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

  // ---- payout recovery: a payout that failed twice is OWED, not forfeit ----
  const pendingKey = `cg3d:pendingPayout:${table.gameId}`;
  let payoutRetryTimer = null;
  function rememberPendingPayout(gross) {
    try {
      const round = walletClient.openRound && walletClient.openRound(table.gameId);
      if (round) localStorage.setItem(pendingKey, JSON.stringify({ roundId: round.roundId, gross }));
    } catch { /* private mode — in-session retry still runs */ }
  }
  function clearPendingPayout() {
    try { localStorage.removeItem(pendingKey); } catch { /* private mode */ }
  }
  function schedulePayoutRetry(gross, delay = 4000) {
    clearTimeout(payoutRetryTimer);
    payoutRetryTimer = setTimeout(() => {
      if (closed) return;
      walletClient.payout(table.gameId, gross)   // idempotent per roundId — safe to re-send
        .then(() => {
          clearPendingPayout();
          C.app.banner('Payout received', `${gross.toLocaleString()} chips credited.`, 2200);
        })
        .catch(() => schedulePayoutRetry(gross, Math.min(delay * 2, 30000)));
    }, delay);
  }

  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(payoutRetryTimer);
    pendingHandResolve?.();
    unsubBalance();
    wrap.remove();
    const quicknav = document.getElementById('quicknav');
    if (quicknav) quicknav.hidden = false;
    document.getElementById('bjActions')?.remove();
    stacks.disposeAll();
    clearTableMeshes();
    C.app.inputLocked = false;
    C.music?.duck(false);
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

  // ---- round flow ----
  const errCode = (err) => (err && (err.code || err.message)) || 'error';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function makeFlatCard(card, plan) {
    const mesh = C.cards.makeCard(card);
    mesh.rotation.set(-Math.PI / 2, 0, plan.spin);
    dealt.push(mesh);
    return mesh;
  }
  const dealTo = (mesh, plan, opts = {}) => {
    // fire-and-forget: the arm mimes the deal while the card flies
    bj.dealerRig?.play(C.app, 'dealCard', {
      refs: { shoe: toWorld(bj.shoeLocal), target: toWorld(plan.pos) },
    });
    return C.cards.dealCardTo(C.app, mesh, toWorld(bj.shoeLocal), toWorld(plan.pos), { ms: 420, sound: true, ...opts });
  };

  function actionBar() {
    let el = document.getElementById('bjActions');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bjActions';
      document.body.appendChild(el);
    }
    return el;
  }

  async function startRound() {
    const v = validateBets(bets, cfg.betTypes, walletClient.getBalance() ?? 0, cfg.maxTotalBet);
    if (!v.ok) { refreshBoard(); return; }
    // Freeze the stake and lock the board BEFORE the network round-trip —
    // spot/UNDO/CLEAR clicks during the await would make the played stake
    // differ from the debited one (free-chips race / lost-stake CLEAR).
    roundInFlight = true;
    wrap.classList.add('bj3-away');
    const roundBets = { ...bets };
    let betRes = null;
    try {
      betRes = await walletClient.bet(table.gameId, {
        main: roundBets.main,
        ...(roundBets.perfectPair ? { perfectPair: roundBets.perfectPair } : {}),
        ...(roundBets.twentyOnePlus3 ? { twentyOnePlus3: roundBets.twentyOnePlus3 } : {}),
      });
    } catch (err) {
      roundInFlight = false;
      wrap.classList.remove('bj3-away');
      statusEl.innerHTML = `<span class="bj3-err">${REASON_COPY[errCode(err)] || 'Bet failed — try again'}</span>`;
      dealBtn.disabled = false;
      return;
    }
    if (closed) return;
    if (betRes && betRes.forfeited) {
      C.app.banner('Previous wager forfeited',
        `${betRes.forfeited.toLocaleString()} chips from an abandoned round went to the house.`, 2400);
    }
    // A replayed retry may carry the round's ORIGINAL bets — the hand must
    // play the stake the server actually debited, not what's on the board.
    if (betRes && betRes.bets) {
      roundBets.main = betRes.bets.main || 0;
      roundBets.perfectPair = betRes.bets.perfectPair || 0;
      roundBets.twentyOnePlus3 = betRes.bets.twentyOnePlus3 || 0;
    }

    const shoe = makeShoe(6);
    // hands: [{cards, stake, isSplit, doubled, meshes}]
    const hands = [{ cards: [], stake: roundBets.main, isSplit: false, doubled: false, meshes: [] }];
    const dealerCards = [];
    const dealerMeshes = [];

    const dealPlayer = async (hand, handIdx, handCount, { sideways = false } = {}) => {
      const card = shoe.pop();
      hand.cards.push(card);
      const plan = planPlayerCard(seat, { hand: handIdx, hands: handCount, card: hand.cards.length - 1, sideways });
      const mesh = makeFlatCard(card, plan);
      hand.meshes.push(mesh);
      await dealTo(mesh, plan);
      return card;
    };
    const dealDealer = async () => {
      const card = shoe.pop();
      dealerCards.push(card);
      const plan = planDealerCard({ dealerSlots: bj.dealerSlots, fanDx: bj.fanDx }, dealerCards.length - 1);
      const mesh = makeFlatCard(card, plan);
      dealerMeshes.push(mesh);
      await dealTo(mesh, plan);
      return card;
    };

    // European deal: player, dealer up-card, player.
    await dealPlayer(hands[0], 0, 1);
    if (closed) return;
    await dealDealer();
    if (closed) return;
    await dealPlayer(hands[0], 0, 1);
    if (closed) return;

    // Side bets resolve off the initial deal, paid/taken immediately.
    let sideRet = 0;
    const sideJobs = [];
    if (roundBets.perfectPair) {
      const r = perfectPairReturn(roundBets.perfectPair, hands[0].cards);
      sideRet += r;
      sideJobs.push(stacks.settle('perfectPair',
        r === 0 ? 'lose' : 'win', Math.max(0, r - roundBets.perfectPair)));
    }
    if (roundBets.twentyOnePlus3) {
      const r = twentyOnePlus3Return(roundBets.twentyOnePlus3, hands[0].cards[0], hands[0].cards[1], dealerCards[0]);
      sideRet += r;
      sideJobs.push(stacks.settle('twentyOnePlus3',
        r === 0 ? 'lose' : 'win', Math.max(0, r - roundBets.twentyOnePlus3)));
    }
    Promise.all(sideJobs).catch(() => {});

    if (isBlackjack(hands[0].cards)) {
      await runDealerAndSettle(hands, dealerCards, dealDealer, roundBets, sideRet);
      return;
    }
    await playHands(hands, dealPlayer, roundBets, sideRet, dealerCards, dealDealer);
  }

  async function playHands(hands, dealPlayer, roundBets, sideRet, dealerCards, dealDealer) {
    for (let hi = 0; hi < hands.length; hi++) {
      // eslint-disable-next-line no-await-in-loop
      await playOneHand(hands, hi, dealPlayer, roundBets, dealerCards);
      if (closed) return;
    }
    document.getElementById('bjActions')?.remove();
    const anyLive = hands.some((h) => handValue(h.cards).total <= 21);
    if (anyLive) await runDealerAndSettle(hands, dealerCards, dealDealer, roundBets, sideRet);
    else await settleRound(hands, dealerCards, roundBets, sideRet);
  }

  function playOneHand(hands, hi, dealPlayer, roundBets, dealerCards) {
    return new Promise((resolve) => {
      const done = () => { pendingHandResolve = null; resolve(); };
      pendingHandResolve = done;
      const hand = hands[hi];
      const el = actionBar();
      const spotId = hi === 0 ? 'main' : 'main2';
      let acting = false;

      const finish = () => { done(); };
      const render = () => {
        const hv = handValue(hand.cards);
        bj.dealerRig?.lookAt(C.app, toWorld(bj.spotLocal(seatIdx, hi === 0 ? 'main' : 'main2')));
        const label = hands.length > 1 ? `HAND ${hi + 1}/${hands.length}` : 'YOU';
        const dv = handValue(dealerCards).total;
        el.innerHTML = `<span class="bj3-total">${label}: ${hv.total}${hv.soft ? ' (soft)' : ''} · DEALER: ${dv}</span>`;
        const mk = (txt, cls, fn, disabled = false) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = cls; b.textContent = txt; b.disabled = disabled;
          b.addEventListener('click', () => { if (!acting) fn(); });
          el.appendChild(b);
          return b;
        };
        mk('HIT', 'bj3-gold', onHit);
        mk('STAND', 'bj3-dim', finish);
        const bal = walletClient.getBalance() ?? 0;
        if (hand.cards.length === 2 && !hand.isSplit && !hand.doubled)
          mk('DOUBLE', 'bj3-dim', onDouble, bal < roundBets.main);
        if (hand.cards.length === 2 && !hand.isSplit && hands.length === 1 && canSplit(hand.cards))
          mk('SPLIT', 'bj3-dim', onSplit, bal < roundBets.main);
      };

      const onHit = async () => {
        acting = true;
        await dealPlayer(hand, hi, hands.length);
        acting = false;
        if (closed) return done();
        if (handValue(hand.cards).total > 21) return finish();
        render();
      };

      const onDouble = async () => {
        acting = true;
        try {
          await walletClient.topUp(table.gameId, { main: roundBets.main });
        } catch (err) {
          acting = false;
          C.app.banner('Double unavailable', REASON_COPY[errCode(err)] || 'Try hit or stand.', 2000);
          render();
          return;
        }
        if (closed) return done();
        hand.doubled = true;
        hand.stake += roundBets.main;
        // double is only offered on the unsplit hand, so the spot is 'main';
        // board bet totals intentionally stay as-placed (wallet + 3D change)
        placed.main.forEach((v) => stacks.add('main', v));
        await dealPlayer(hand, hi, hands.length, { sideways: true });
        acting = false;
        if (closed) return done();
        finish();                                               // double = exactly one card
      };

      const onSplit = async () => {
        acting = true;
        try {
          await walletClient.topUp(table.gameId, { main: roundBets.main });
        } catch (err) {
          acting = false;
          C.app.banner('Split unavailable', REASON_COPY[errCode(err)] || 'Try hit or stand.', 2000);
          render();
          return;
        }
        if (closed) return done();
        // second hand takes the second card; re-home both card meshes
        const moved = hand.cards.pop();
        const movedMesh = hand.meshes.pop();
        hands.push({ cards: [moved], stake: roundBets.main, isSplit: true, doubled: false, meshes: [movedMesh] });
        hand.isSplit = true;
        const p0 = planPlayerCard(seat, { hand: 0, hands: 2, card: 0 });
        const p1 = planPlayerCard(seat, { hand: 1, hands: 2, card: 0 });
        C.tween.to(hand.meshes[0].position, { x: toWorld(p0.pos)[0], z: toWorld(p0.pos)[2] }, 320, 'outCubic');
        C.tween.to(movedMesh.position, { x: toWorld(p1.pos)[0], z: toWorld(p1.pos)[2] }, 320, 'outCubic');
        placed.main.forEach((v) => stacks.add('main2', v));     // second hand's equal bet
        await wait(380);
        if (closed) return done();
        // each split hand draws its second card before play continues
        await dealPlayer(hand, 0, 2);
        if (closed) return done();
        await dealPlayer(hands[1], 1, 2);
        acting = false;
        if (closed) return done();
        render();
      };

      render();
    });
  }

  async function runDealerAndSettle(hands, dealerCards, dealDealer, roundBets, sideRet) {
    await C.app.glideTo(poses.dealer.pos, poses.dealer.look, 700);
    if (closed) return;
    bj.dealerRig?.lookAt(C.app, toWorld([0, 0.95, 0.16]));
    // live points readout while the dealer draws (no buttons)
    const bestYou = Math.max(...hands.map((h) => handValue(h.cards).total));
    const showTotals = () => {
      actionBar().innerHTML = `<span class="bj3-total">YOU: ${bestYou} · DEALER: ${handValue(dealerCards).total}</span>`;
    };
    showTotals();
    // European: dealer completes the hand now (draws to 17, stands on all 17s)
    while (handValue(dealerCards).total < 17) {
      // eslint-disable-next-line no-await-in-loop
      await dealDealer();
      if (closed) return;
      showTotals();
      // eslint-disable-next-line no-await-in-loop
      await wait(260);
      if (closed) return;   // sign-out during the pause — don't deal onto a cleared felt
    }
    await settleRound(hands, dealerCards, roundBets, sideRet);
  }

  async function settleRound(hands, dealerCards, roundBets, sideRet) {
    const rets = hands.map((h) => settleMain(h, dealerCards));
    const gross = rets.reduce((a, b) => a + b, 0) + sideRet;

    let payoutFailed = false;
    try {
      await walletClient.payout(table.gameId, gross);
    } catch (err1) {
      try {
        await walletClient.payout(table.gameId, gross);
      } catch (err2) {
        payoutFailed = true;
        rememberPendingPayout(gross);   // owed chips survive leave/reload/re-sit
        schedulePayoutRetry(gross);
        console.error('[bj-live] payout failed twice:', err2);
      }
    }
    if (closed) return;

    // Chip choreography: dealer pays from the tray / collects into it,
    // with a matching arm gesture (visual only — never awaited before pay).
    const jobs = hands.map((h, i) => {
      const spotId = i === 0 ? 'main' : 'main2';
      const ret = rets[i];
      const outcome = ret === 0 ? 'lose' : ret === h.stake ? 'push' : 'win';
      const spotW = toWorld(bj.spotLocal(seatIdx, spotId));
      if (outcome === 'lose') bj.dealerRig?.play(C.app, 'sweepChips', { refs: { target: spotW, rack: toWorld(bj.trayLocal) } });
      else if (outcome === 'win') bj.dealerRig?.play(C.app, 'payChips', { refs: { rack: toWorld(bj.trayLocal), target: spotW } });
      return stacks.settle(spotId, outcome, Math.max(0, ret - h.stake));
    });

    const title = settleTitle(hands, rets, dealerCards);
    const sub = payoutFailed
      ? 'Payout retry pending — it will be re-sent automatically.'
      : gross > 0 ? `Returned ${gross.toLocaleString()} chips` : 'No return';
    C.sound?.play(title === 'BLACKJACK!' || title === 'YOU WIN' ? 'win' : title === 'PUSH' ? 'push' : 'lose');
    await C.app.banner(title, sub, 2600);
    await Promise.all(jobs).catch(() => {});
    if (closed) return;

    await wait(300);
    document.getElementById('bjActions')?.remove();
    clearTableMeshes();
    await C.app.glideTo(poses.seated.pos, poses.seated.look, 800);
    if (closed) return;
    roundInFlight = false;
    resetBetsAfterRound();
    wrap.classList.remove('bj3-away');
  }

  C.app.inputLocked = true;
  // the quicknav overlays the felt from a seated camera — hide it while at
  // the table (Leave table on the board is the way out; close() restores it)
  const quicknavEl = document.getElementById('quicknav');
  if (quicknavEl) quicknavEl.hidden = true;
  C.app.glideTo(poses.seated.pos, poses.seated.look, 1100);

  // Stale open round from a crashed session: if a payout is recorded as OWED
  // for it, re-send the real amount (idempotent per roundId); only rounds
  // with nothing owed are forfeited (debit-at-bet posture, same as 2D).
  if (walletClient.openRound && walletClient.openRound(table.gameId)) {
    const round = walletClient.openRound(table.gameId);
    let pending = null;
    try { pending = JSON.parse(localStorage.getItem(pendingKey) || 'null'); } catch { pending = null; }
    if (pending && pending.roundId === round.roundId && Number.isFinite(pending.gross)) {
      walletClient.payout(table.gameId, pending.gross)
        .then(() => {
          clearPendingPayout();
          C.app.banner('Winnings recovered', `${pending.gross.toLocaleString()} chips from your last hand were paid.`, 2600);
        })
        .catch(() => { /* still offline — recovery retries on the next sit-down */ });
    } else {
      walletClient.payout(table.gameId, 0)
        .then(() => C.app.banner('Previous hand forfeited', 'An unfinished round was closed.', 2200))
        .catch(() => {});
    }
  }

  active = { close, tableId: table.id, roundInFlight: () => roundInFlight };
  return active;
}
