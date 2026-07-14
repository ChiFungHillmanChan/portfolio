// platform.js — the non-inlined runtime module that turns the 3D floor into a
// REAL entry hub: it owns the floor model (from GAME_STAKES), the Firebase
// auth bridge (via the shared wallet platform — imported, never copied), the
// reception state machine, and the whole DOM layer. The inlined engine only
// renders and reports proximity; every decision lives here.
import { buildFloorModel } from './floor-model.js';
import { initialReception, receptionReduce, canPassTurnstile } from './reception-model.js';
import { formatChips } from '../js/wallet/table-config.js';
import * as UI from './ui.js';
import { openRouletteLive, closeRouletteLive, rouletteLiveActive } from './roulette-live.js';
import { openBlackjackLive, closeBlackjackLive, blackjackLiveActive } from './blackjack-live.js';

const model = buildFloorModel();

// ---------- state ----------
let state = initialReception;
let stage = null;             // engine API once the player enters
let bootstrap = null;         // wallet-bootstrap module (Firebase)
let user = null;
let authSeen = false;
let pill = null, account = null, quicknav = null, cards = null;

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
  let bal = 100000;
  const subs = new Set();
  const rounds = new Map();
  const fail = (code) => Object.assign(new Error(code), { code });
  const emit = () => subs.forEach((cb) => cb(bal));
  return {
    walletClient: {
      getBalance: () => bal,
      getResetInfo: () => ({ canReset: false, resetAvailableAt: null }),
      subscribe: (cb) => (subs.add(cb), () => subs.delete(cb)),
      openRound: (gameId) => rounds.get(gameId) || null,
      async load() { return { balance: bal }; },
      async bet(gameId, bets) {
        if (rounds.has(gameId)) throw fail('round-in-progress');
        const total = Object.values(bets).reduce((a, b) => a + b, 0);
        if (total > bal) throw fail('insufficient');
        bal -= total; rounds.set(gameId, { roundId: 'stub', bets: { ...bets } }); emit();
        return { balance: bal, roundId: 'stub' };
      },
      async topUp(gameId, bets) {
        if (!rounds.has(gameId)) throw fail('no-open-round');
        const total = Object.values(bets).reduce((a, b) => a + b, 0);
        if (total > bal) throw fail('insufficient');
        bal -= total; emit();
        return { balance: bal, roundId: 'stub' };
      },
      async payout(gameId, chips) {
        rounds.delete(gameId); bal += chips; emit();
        return { balance: bal };
      },
      async reset() { return { balance: bal }; },
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
    if (['sitdown', 'closed', 'cashier', 'practice'].includes(cards.kind())) cards.hide();
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
      balance: balance(),
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
  }
}

// ---------- engine callbacks ----------
const engineUi = {
  onNear(anchor) {
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

  stage = CASINO.boot.start({ model, ui: engineUi });
  if (!stage) return;   // WebGL failed — the engine is redirecting to 2D

  pill = UI.mountWalletPill(document.getElementById('walletHost'), {
    walletClient: {
      // thin adapter: the pill can mount before Firebase resolves
      getBalance: () => balance(),
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
