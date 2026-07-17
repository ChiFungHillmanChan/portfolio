// platform.js — the non-inlined runtime module that turns the 3D floor into a
// REAL entry hub: it owns the floor model (from GAME_STAKES), the Firebase
// auth bridge (via the shared wallet platform — imported, never copied), the
// reception state machine, and the whole DOM layer. The inlined engine only
// renders and reports proximity; every decision lives here.
import { buildFloorModel } from './floor-model.js';
import { initialReception, receptionReduce, canPassTurnstile } from './reception-model.js';
import { formatChips } from '../js/wallet/table-config.js';
import * as UI from './ui.js';
import { openRouletteLive, closeRouletteLive, rouletteLiveActive, rouletteSpinning } from './roulette-live.js';
import { openBlackjackLive, closeBlackjackLive, blackjackLiveActive, blackjackRoundInFlight } from './blackjack-live.js';

const model = buildFloorModel();

// ---------- state ----------
let state = initialReception;
let stage = null;             // engine API once the player enters
let bootstrap = null;         // wallet-bootstrap module (Firebase)
let user = null;
let authSeen = false;
let pill = null, account = null, quicknav = null, cards = null;
let lastNear = null;          // latest proximity anchor (for post-auth re-checks)

const walletClient = () => (bootstrap ? bootstrap.walletClient : null);
const balance = () => (walletClient() ? walletClient().getBalance() : null);
const firstName = () => {
  const n = (user && (user.displayName || user.email)) || 'player';
  return String(n).split(/[ @]/)[0];
};

// ---------- auth bridge (starts immediately, in parallel with the splash) ----------
// Local dev: Firebase blocks localhost referers, so ?stubwallet swaps in an
// in-memory signed-in wallet. Localhost-only — production ignores the param.
const STUB_WALLET =
  ['localhost', '127.0.0.1'].includes(location.hostname) &&
  new URLSearchParams(location.search).has('stubwallet');

function makeStubBootstrap() {
  let chips = 100000;
  let cash = 50000;
  const subs = new Set();
  const rounds = new Map();
  const fail = (code) => Object.assign(new Error(code), { code });
  const emit = () => subs.forEach((cb) => cb(chips));
  return {
    walletClient: {
      getBalance: () => chips,
      getCash: () => cash,
      getResetChips: () => 5000,
      getResetInfo: () => ({ canReset: false, resetAvailableAt: null }),
      subscribe: (cb) => (subs.add(cb), () => subs.delete(cb)),
      openRound: (gameId) => rounds.get(gameId) || null,
      async load() { return { balance: chips, cash }; },
      async bet(gameId, bets) {
        if (rounds.has(gameId)) throw fail('round-in-progress');
        const total = Object.values(bets).reduce((a, b) => a + b, 0);
        if (total > chips) throw fail('insufficient');
        chips -= total; rounds.set(gameId, { roundId: 'stub', bets: { ...bets } }); emit();
        return { balance: chips, roundId: 'stub', bets: { ...bets } };
      },
      async topUp(gameId, bets) {
        if (!rounds.has(gameId)) throw fail('no-open-round');
        const total = Object.values(bets).reduce((a, b) => a + b, 0);
        if (total > chips) throw fail('insufficient');
        chips -= total; emit();
        return { balance: chips, roundId: 'stub' };
      },
      async payout(gameId, won) {
        rounds.delete(gameId); chips += won; emit();
        return { balance: chips };
      },
      async buyIn(amount) {
        if (!Number.isInteger(amount) || amount <= 0) throw fail('bad-amount');
        if (amount > cash) throw fail('insufficient-cash');
        cash -= amount; chips += amount; emit();
        return { balance: chips, cash };
      },
      async cashOut(amount) {
        const amt = amount === 'all' ? chips : amount;
        if (!Number.isInteger(amt) || amt <= 0) throw fail('bad-amount');
        if (amt > chips) throw fail('insufficient-chips');
        chips -= amt; cash += amt; emit();
        return { balance: chips, cash };
      },
      async reset() { return { balance: chips }; },
      clear() {},
    },
    onAuth(cb) { setTimeout(() => cb({ signedIn: true, user: { displayName: 'Stub Player', email: 'stub@localhost' } }), 50); },
    signIn: async () => {},
    signOut: async () => {},
  };
}

(STUB_WALLET
  ? Promise.resolve({ default: makeStubBootstrap() })
  : import('../js/wallet/wallet-bootstrap.js'))
  .then((m) => {
    bootstrap = m.default;
    bootstrap.onAuth(({ signedIn, user: u }) => {
      user = u;
      if (!authSeen) {
        authSeen = true;
        dispatch({ type: 'AUTH_READY', signedIn });
      } else {
        dispatch({ type: signedIn ? 'SIGNED_IN' : 'SIGNED_OUT' });
      }
      account?.setUser(signedIn ? firstName() : null);
    });
  })
  .catch((err) => {
    console.warn('[lobby-3d] wallet/auth modules unreachable:', err);
    dispatch({ type: 'AUTH_UNAVAILABLE' });
  });

// ---------- reducer wiring ----------
function dispatch(ev) {
  const prev = state;
  state = receptionReduce(state, ev);
  if (state === prev) return;
  render(prev);
}

function signedInView() {
  return canPassTurnstile(state);
}

// Phase → side effects. Only touches the stage once the player entered.
function render(prev) {
  quicknav?.refresh();
  if (!stage) return;
  if (state.phase === prev.phase && state.error === prev.error) return;

  switch (state.phase) {
    case 'out': {
      closeRouletteLive();   // signed out mid-session — leave the table
      closeBlackjackLive();  // signed out mid-session — leave the table
      stage.setAccess(false);
      stage.setHighlight(null);
      pill.setMode('signin');
      account.setUser(null);
      cards.hide();
      if (['floor', 'wave', 'welcome'].includes(prev.phase)) {
        stage.resetWelcome?.();
        stage.goTo('spawn');
      }
      // Auth resolved to signed-out while the player already stood at the
      // desk — onNear deduped and won't re-fire, so open the card now.
      if (prev.phase === 'boot' && lastNear && lastNear.kind === 'reception') {
        dispatch({ type: 'OPEN_CHECKIN' });
      }
      break;
    }
    case 'checkin': {
      if (prev.phase === 'out') stage.walkToDesk();
      openCheckin(false);
      if (prev.phase === 'authing' && state.error) stage.playHeadShake();
      break;
    }
    case 'authing': {
      openCheckin(true);
      break;
    }
    case 'welcome': {
      cards.hide();
      CASINO.sound?.play('sting');
      stage.setAccess(true);
      pill.setMode('balance');
      account.setUser(firstName());
      stage.playWelcome({ name: firstName() })
        .then(() => {
          const bal = balance();
          CASINO.app.banner(
            `Welcome, ${firstName()}`,
            typeof bal === 'number' ? `Your chips are ready: ${formatChips(bal)}` : 'Your chips are ready.',
            2600,
          );
          return stage.goTo('floor');
        })
        .then(() => dispatch({ type: 'WELCOME_DONE' }));
      break;
    }
    case 'wave': {
      stage.setAccess(true);
      pill.setMode('balance');
      account.setUser(firstName());
      stage.playWaveThrough().then(() => dispatch({ type: 'WAVE_DONE' }));
      break;
    }
    case 'floor': {
      pill.setMode('balance');
      break;
    }
    case 'unavailable': {
      cards.show('unavailable', UI.unavailableCard(), { dismissable: false });
      break;
    }
  }
}

// ---------- cards ----------
function openCheckin(busy) {
  cards.show('checkin', UI.checkinCard({
    error: state.error,
    busy,
    authUnavailable: state.phase === 'unavailable',
    onSignIn: () => {
      dispatch({ type: 'SIGNIN_START' });
      bootstrap.signIn().catch((err) => {
        console.warn('[lobby-3d] sign-in failed:', err && err.code);
        dispatch({ type: 'SIGNIN_ERROR', code: (err && err.code) || 'signin-failed' });
      });
    },
    onNotNow: () => dispatch({ type: 'CLOSE_CHECKIN' }),
    onPractice: () => { dispatch({ type: 'CLOSE_CHECKIN' }); stage.goTo('practice'); },
  }), { onClose: () => { if (state.phase === 'checkin') dispatch({ type: 'CLOSE_CHECKIN' }); } });
}

function resetWallet(rerender) {
  walletClient().reset()
    .then(() => rerender && rerender())
    .catch((err) => {
      const when = err && err.retryAt ? ` — try again after ${new Date(err.retryAt).toLocaleTimeString()}` : '';
      CASINO.app.banner('Reset unavailable', `${when}`.trim() || 'Please try again later.', 2600);
      rerender && rerender();
    });
}

function showProximityCard(anchor) {
  // The check-in card never gets replaced by proximity cards, and a live
  // roulette session owns the screen — the camera glides it past anchors.
  if (rouletteLiveActive() || blackjackLiveActive()) return;
  if (cards.kind() === 'checkin' || cards.kind() === 'unavailable') return;
  if (!anchor) {
    if (['sitdown', 'closed', 'cashier', 'practice', 'bar'].includes(cards.kind())) cards.hide();
    return;
  }
  if (anchor.kind === 'table') {
    const section = model.sections.find((s) => s.tables.some((t) => t.id === anchor.table.id));
    if (anchor.table.closed) {
      cards.show('closed', UI.closedTableCard({
        gameName: section ? section.gameName : '',
        notice: anchor.table.closedNotice,
        onOk: () => cards.hide('closed'),
      }));
      return;
    }
    const liveOpen =
      section && section.id === 'roulette'
        ? () => openRouletteLive({ table: anchor.table })
        : section && section.id === 'blackjack'
          ? () => openBlackjackLive({
              table: anchor.table,
              walletClient: walletClient(),
              onClosed: () => quicknav?.refresh(),
            })
          : null;
    cards.show('sitdown', UI.sitdownCard({
      table: anchor.table,
      gameName: section ? section.gameName : '',
      walletClient: walletClient(),
      onNotNow: () => cards.hide('sitdown'),
      onPlay: liveOpen ? () => { cards.hide(); liveOpen(); } : null,
    }));
  } else if (anchor.kind === 'cashier') {
    cards.show('cashier', UI.cashierCard({
      walletClient: walletClient(),
      onReset: (rerender) => resetWallet(rerender),
    }));
  } else if (anchor.kind === 'practice') {
    cards.show('practice', UI.practiceCard());
  } else if (anchor.kind === 'bar') {
    const tip = UI.nextBarTip();
    cards.show('bar', UI.barCard({
      tip,
      onPractice: () => { cards.hide('bar'); stage.goTo('practice'); },
      onDismiss: () => cards.hide('bar'),
    }));
    // bartender speaks the same tip the card shows
    if (stage && stage.barSay) stage.barSay(`${tip.game ? tip.game + ' tip — ' : ''}${tip.tip}`);
  }
}

// ---------- engine callbacks ----------
const engineUi = {
  onNear(anchor) {
    lastNear = anchor;
    if (!stage) return;
    if (!signedInView()) {
      if (anchor && anchor.kind === 'reception' && state.phase === 'out') {
        dispatch({ type: 'OPEN_CHECKIN' });
      } else if (anchor && anchor.kind === 'practice') {
        showProximityCard(anchor);
      } else {
        showProximityCard(null);
      }
      return;
    }
    stage.setHighlight(anchor && anchor.kind === 'table' ? anchor.id : null);
    showProximityCard(anchor);
  },
  onSectionChange(zone) {
    const label = {
      vestibule: 'Vestibule', roulette: 'Roulette', blackjack: 'Blackjack',
      baccarat: 'Baccarat', uth: "Ultimate Hold'em — Dealer Training", aisle: '',
    }[zone] || '';
    document.getElementById('sectionLabel').textContent = label;
  },
  onTurnstileBlocked() {
    CASINO.sound?.play('buzz');
    if (state.phase === 'out') dispatch({ type: 'OPEN_CHECKIN' });
  },
};

// ---------- sign out (stub-aware; production uses the Firebase CDN) ----------
async function signOut() {
  try {
    if (bootstrap && typeof bootstrap.signOut === 'function') {
      await bootstrap.signOut();
      return;
    }
    const [{ signOut: fbSignOut }, { auth }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js'),
      import('../js/auth/firebase-init.js'),
    ]);
    await fbSignOut(auth);
  } catch (err) {
    console.error('[lobby-3d] sign-out failed:', err);
  }
}

// ---------- boot ----------
function start() {
  document.getElementById('splash').remove();
  document.getElementById('hud').hidden = false;
  document.getElementById('quicknav').hidden = false;

  // ENTER is the guaranteed first user gesture — unlock audio here
  // (autoplay policy) and start the floor ambience unless muted.
  CASINO.sound?.unlock();
  CASINO.sound?.ambience(true);
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn && CASINO.sound) {
    const SPEAKER_ON = '<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    const SPEAKER_OFF = '<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"/><line x1="15" y1="9" x2="21" y2="15"/><line x1="21" y1="9" x2="15" y2="15"/></svg>';
    const paint = () => { muteBtn.innerHTML = CASINO.sound.muted ? SPEAKER_OFF : SPEAKER_ON; };
    muteBtn.addEventListener('click', () => { CASINO.sound.setMuted(!CASINO.sound.muted); paint(); });
    paint();
  }

  stage = CASINO.boot.start({ model, ui: engineUi });
  if (!stage) return;   // WebGL failed — the engine is redirecting to 2D

  pill = UI.mountWalletPill(document.getElementById('walletHost'), {
    walletClient: {
      // thin adapter: the pill can mount before Firebase resolves
      getBalance: () => balance(),
      getCash: () => (walletClient() && walletClient().getCash ? walletClient().getCash() : null),
      getResetChips: () => (walletClient() && walletClient().getResetChips ? walletClient().getResetChips() : null),
      getResetInfo: () => (walletClient() ? walletClient().getResetInfo() : { canReset: false, resetAvailableAt: null }),
      subscribe: (cb) => (walletClient() ? walletClient().subscribe(cb) : () => {}),
    },
    onSignInClick: () => {
      if (state.phase === 'out') dispatch({ type: 'OPEN_CHECKIN' });
    },
    onReset: () => resetWallet(null),
  });
  account = UI.mountAccount(document.getElementById('accountHost'), { onSignOut: signOut });
  cards = UI.createCardRoot(document.getElementById('card-root'));
  quicknav = UI.mountQuicknav(document.getElementById('quicknav'), {
    sections: model.sections,
    isLocked: () => !signedInView(),
    onGo: (id, gated) => {
      if (gated && !signedInView()) {
        if (state.phase === 'out') dispatch({ type: 'OPEN_CHECKIN' });
        return;
      }
      // A debited hand/spin is in flight — closing now would forfeit it, so
      // hold navigation (same rule the Leave button already enforces).
      if (blackjackRoundInFlight() || rouletteSpinning()) {
        CASINO.app.banner('Finish the hand first', 'You can move on once this round settles.', 2000);
        return;
      }
      closeRouletteLive();   // navigating away ends any live table session
      closeBlackjackLive();  // navigating away ends any live table session
      cards.hide();
      stage.goTo(id);
    },
  });

  // apply whatever phase auth already resolved to; if auth is still pending
  // (phase 'boot'), the next dispatch renders it.
  render({ phase: 'boot', error: null });
}

document.getElementById('enterBtn').addEventListener('click', start);
