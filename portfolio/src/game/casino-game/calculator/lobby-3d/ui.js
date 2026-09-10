// ui.js — the DOM layer of the 3D hub: wallet pill, account menu, quick-nav,
// and the floor cards (check-in / sit-down / cashier / practice). This layer
// is the ACCESSIBLE path — everything is real buttons/links, keyboard
// operable; the WebGL canvas is decorative. No fake numbers ever render here:
// the only balance shown comes from walletClient.getBalance().
import { formatChips } from '../js/wallet/table-config.js';
import { formatHud, CASH_SVG } from '../js/wallet/wallet-hud.js';

const CHIP_DOT = '<span class="chip-dot" aria-hidden="true"></span>';

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ---------- wallet pill (signed-out: Sign in · signed-in: live balance) ----------
export function mountWalletPill(host, { walletClient, onSignInClick, onReset, onBuyChips }) {
  let mode = 'signin';
  let unsub = null, timer = null;

  const render = () => {
    host.innerHTML = '';
    if (mode === 'signin') {
      const btn = el(`<button type="button" class="wallet-pill">${CHIP_DOT}<span>Sign in</span></button>`);
      btn.addEventListener('click', onSignInClick);
      host.appendChild(btn);
      return;
    }
    const h = formatHud(
      {
        balance: walletClient.getBalance(),
        cash: walletClient.getCash ? walletClient.getCash() : null,
        resetChips: walletClient.getResetChips ? walletClient.getResetChips() : null,
        ...walletClient.getResetInfo(),
      },
      Date.now(),
    );
    const pill = el(`
      <div class="wallet-pill" data-state="${h.state}">
        ${CHIP_DOT}<span class="pill-balance">${h.balanceText}</span>
        ${h.cashText !== null ? `<span class="pill-cash">${CASH_SVG} ${h.cashText}</span>` : ''}
        ${onBuyChips ? '<button type="button" class="pill-buy">Buy chips</button>' : ''}
        ${h.showReset ? `<button type="button" class="pill-reset">${h.resetLabel}</button>` : ''}
        ${h.cooldownText ? `<span class="pill-cooldown">Reset in ${h.cooldownText}</span>` : ''}
      </div>`);
    const btn = pill.querySelector('.pill-reset');
    if (btn) btn.addEventListener('click', onReset);
    pill.querySelector('.pill-buy')?.addEventListener('click', onBuyChips);
    host.appendChild(pill);
  };

  render();
  return {
    setMode(m) {
      mode = m;
      if (m === 'balance' && !unsub) {
        unsub = walletClient.subscribe(render);
        timer = setInterval(render, 30000);
      }
      if (m === 'signin' && unsub) { unsub(); unsub = null; clearInterval(timer); }
      render();
    },
  };
}

// ---------- account chip + sign-out menu ----------
export function mountAccount(host, { onSignOut }) {
  let open = false;
  const render = (name) => {
    host.innerHTML = '';
    if (!name) return;
    const wrap = el(`
      <div class="account-menu">
        <button type="button" class="hud-btn" aria-haspopup="true" aria-expanded="false">${name}</button>
      </div>`);
    const btn = wrap.querySelector('button');
    btn.addEventListener('click', () => {
      open = !open;
      btn.setAttribute('aria-expanded', String(open));
      let pop = wrap.querySelector('.menu-pop');
      if (open && !pop) {
        pop = el('<div class="menu-pop"><button type="button">Sign out</button></div>');
        pop.querySelector('button').addEventListener('click', () => { open = false; onSignOut(); });
        wrap.appendChild(pop);
      } else if (!open && pop) pop.remove();
    });
    host.appendChild(wrap);
  };
  render(null);
  return { setUser: render };
}

// ---------- quick-nav bar ----------
export function mountQuicknav(nav, { sections, onGo, isLocked }) {
  nav.innerHTML = '';
  const items = [
    ...sections.map((s) => ({ id: s.id, label: s.gameName, gated: true })),
    { id: 'cashier', label: 'Cashier', gated: true },
    { id: 'bar', label: 'Bar', gated: true },
    { id: 'practice', label: 'Practice', gated: false },
  ];
  for (const item of items) {
    const btn = el(`<button type="button">${item.label}</button>`);
    btn.addEventListener('click', () => onGo(item.id, item.gated));
    nav.appendChild(btn);
  }
  nav.appendChild(el('<a href="../index.html">2D Lobby</a>'));
  const refresh = () => {
    const locked = isLocked();
    nav.querySelectorAll('button').forEach((btn, i) => {
      const gated = items[i]?.gated;
      btn.setAttribute('aria-disabled', String(!!gated && locked));
    });
  };
  refresh();
  return { refresh };
}

// ---------- card root (one card at a time; Esc closes) ----------
export function createCardRoot(root) {
  let current = null;   // { kind, close }

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && current && current.dismissable) current.close();
  });

  // Cards with live subscriptions clean up on this event — dispatch it before
  // any removal or the cashier/sit-down subscribe+interval pairs leak.
  const teardown = () => root.firstElementChild?.dispatchEvent(new Event('card:teardown'));

  function show(kind, node, { onClose, focus = false, dismissable = true } = {}) {
    teardown();
    root.innerHTML = '';
    root.appendChild(node);
    root.dataset.kind = kind;
    current = {
      kind,
      dismissable,
      close: () => {
        if (current && current.kind === kind) {
          teardown();
          root.innerHTML = '';
          delete root.dataset.kind;
          current = null;
          onClose && onClose();
        }
      },
    };
    if (focus) node.querySelector('input, select, button, a')?.focus();
    return current.close;
  }

  return {
    show,
    kind: () => current && current.kind,
    hide(kind) {
      if (!current) return;
      if (kind && current.kind !== kind) return;
      current.close();
    },
  };
}

// ---------- the four cards ----------
export function checkinCard({ error, busy, authUnavailable, onSignIn, onNotNow, onPractice }) {
  const card = el(`
    <div class="floor-card" role="dialog" aria-label="Reception ID check">
      <h3>RECEPTION — ID CHECK</h3>
      <p class="sub">Please verify your identity — sign in to enter the floor.</p>
      ${error ? '<p class="err">Sign-in failed — please try again.</p>' : ''}
      ${authUnavailable ? '<p class="err">Casino services are unreachable right now.</p>' : ''}
      <div class="actions">
        <button type="button" class="btn-primary" data-act="signin" ${busy || authUnavailable ? 'disabled' : ''}>
          ${busy ? 'Opening Google…' : 'Sign in with Google'}
        </button>
        <button type="button" class="btn-dim" data-act="later">Not now</button>
      </div>
      <p class="linkline"><a href="#" data-act="practice">Practice instead</a> · <a href="../index.html">Back to 2D lobby</a></p>
    </div>`);
  card.querySelector('[data-act="signin"]').addEventListener('click', onSignIn);
  card.querySelector('[data-act="later"]').addEventListener('click', onNotNow);
  card.querySelector('[data-act="practice"]').addEventListener('click', (e) => { e.preventDefault(); onPractice(); });
  return card;
}

export function sitdownCard({ table, gameName, walletClient, onNotNow, onPlay }) {
  const title = table.key ? `${gameName} — ${table.tierName}` : gameName;
  const card = el(`
    <div class="floor-card" role="dialog" aria-label="Sit down at ${title}">
      <h3>${title}</h3>
      <p class="sub">${table.blurb || ''}</p>
      <p class="row">Limits: <strong>${table.limitsText}</strong></p>
      <p class="row">Chips: <strong class="sit-chips">—</strong> · Wallet: <strong class="sit-cash">—</strong></p>
      <p class="hint sit-hint" hidden></p>
      <div class="exchange-row sit-buyin-row" hidden>
        <input class="exchange-amt sit-buyin-amt" type="number" inputmode="numeric" min="0" step="50" aria-label="Buy-in amount">
        <button type="button" class="btn-primary sit-buyin">Buy in</button>
      </div>
      <div class="actions">
        ${onPlay
          ? '<button type="button" class="btn-primary" data-act="play">Play at this table</button>'
          : (table.href ? `<a class="btn-primary" href="${table.href}">Sit down</a>` : '')}
        <button type="button" class="btn-dim">Not now</button>
      </div>
      ${onPlay && table.href ? `<p class="linkline"><a href="${table.href}">Prefer the full page? Open the 2D game</a></p>` : ''}
    </div>`);
  const hintEl = card.querySelector('.sit-hint');
  const buyinRow = card.querySelector('.sit-buyin-row');
  const amtEl = card.querySelector('.sit-buyin-amt');
  const playBtn = card.querySelector('[data-act="play"]');

  const render = () => {
    const chips = walletClient && walletClient.getBalance ? walletClient.getBalance() : null;
    const cash = walletClient && walletClient.getCash ? walletClient.getCash() : null;
    card.querySelector('.sit-chips').textContent = typeof chips === 'number' ? formatChips(chips) : '—';
    card.querySelector('.sit-cash').textContent = typeof cash === 'number' ? formatChips(cash) : '—';
    const insufficient = typeof chips === 'number' && chips < table.minBet;
    const canBuy = typeof cash === 'number' && cash > 0;
    if (playBtn) playBtn.disabled = insufficient;
    if (insufficient && canBuy) {
      hintEl.hidden = false;
      hintEl.textContent = `You need at least ${formatChips(table.minBet)} chips — buy in from your wallet.`;
      buyinRow.hidden = false;
      if (!amtEl.value) amtEl.value = Math.min(cash, table.minBet * 10);
      amtEl.max = cash;
    } else if (insufficient) {
      hintEl.hidden = false;
      hintEl.textContent = `You need at least ${formatChips(table.minBet)} chips for this table. Try a lower-limit game.`;
      buyinRow.hidden = true;
    } else {
      hintEl.hidden = true;
      buyinRow.hidden = true;
    }
  };

  card.querySelector('.sit-buyin').addEventListener('click', () => {
    const amount = Math.floor(Number(amtEl.value));
    if (!Number.isFinite(amount) || amount <= 0 || !walletClient || !walletClient.buyIn) return;
    const btn = card.querySelector('.sit-buyin');
    btn.disabled = true;
    walletClient.buyIn(amount)
      .then(() => { btn.disabled = false; render(); })
      .catch((err) => {
        btn.disabled = false;
        hintEl.hidden = false;
        hintEl.textContent = err && err.code === 'insufficient-cash'
          ? 'Not enough in your wallet for that buy-in.'
          : 'Buy-in failed — please try again.';
      });
  });
  card.querySelector('.btn-dim').addEventListener('click', onNotNow);
  if (onPlay) playBtn.addEventListener('click', onPlay);

  render();
  if (walletClient && walletClient.subscribe) {
    const unsub = walletClient.subscribe(render);
    card.addEventListener('card:teardown', () => unsub());
  }
  return card;
}

// Closed-for-maintenance table (dealer training): informational only — there
// is deliberately NO play link on this card, and the table model carries no
// href either, so no code path can offer a way in.
export function closedTableCard({ gameName, notice, onOk }) {
  const card = el(`
    <div class="floor-card" role="dialog" aria-label="${gameName} closed for dealer training">
      <h3>${gameName.toUpperCase()} — CLOSED</h3>
      <p class="sub">Dealer training in progress · 荷官培訓中</p>
      <p class="row">${notice || 'This table is temporarily closed.'}</p>
      <div class="actions">
        <button type="button" class="btn-dim">OK</button>
      </div>
    </div>`);
  card.querySelector('.btn-dim').addEventListener('click', onOk);
  return card;
}

export function buyInCard({ walletClient, onClose, onPurchased }) {
  const card = el(`
    <div class="floor-card service-card" role="dialog" aria-label="Buy chips">
      <h3>BUY CHIPS</h3>
      <p class="sub">Add chips here and keep your place at the table.</p>
      <p class="row">Chips: <strong class="buyin-chips"></strong> · Wallet: <strong class="buyin-cash"></strong></p>
      <div class="exchange-row">
        <input class="exchange-amt buyin-amount" type="number" inputmode="numeric" min="1" step="1" value="1000" aria-label="Chips to buy">
        <button type="button" class="btn-primary buyin-confirm">Add chips</button>
      </div>
      <p class="service-status" role="status">Exchange wallet money for chips at 1:1.</p>
      <div class="actions"><button type="button" class="btn-dim buyin-close">Done</button></div>
      <p class="muted">Visit the cashier to exchange chips back into money.</p>
    </div>`);
  const input = card.querySelector('.buyin-amount'), confirm = card.querySelector('.buyin-confirm');
  const status = card.querySelector('[role="status"]');
  let active = true, busy = false;
  const render = () => {
    card.querySelector('.buyin-chips').textContent = formatChips(walletClient.getBalance());
    card.querySelector('.buyin-cash').textContent = formatChips(walletClient.getCash());
  };
  confirm.addEventListener('click', async () => {
    if (!active || busy) return;
    const amount = Number(input.value);
    if (!Number.isInteger(amount) || amount <= 0) {
      status.textContent = 'Enter a positive whole number of chips.';
      return;
    }
    busy = true; confirm.disabled = input.disabled = true;
    status.textContent = 'Adding your chips…';
    try {
      await walletClient.buyIn(amount);
      // Embedded tables may keep their own wallet view. Refresh it even
      // if this card closed, without turning a committed purchase into an error.
      try { await onPurchased?.(); } catch { /* wallet purchase already committed */ }
      if (active) { render(); status.textContent = `${formatChips(amount)} chips added. You’re ready to play.`; }
    } catch (error) {
      if (active) status.textContent = error?.code === 'insufficient-cash' ? 'Not enough in your wallet.'
        : error?.code === 'bad-amount' ? 'Enter a valid amount.' : 'Could not add chips. Please try again.';
    } finally {
      busy = false;
      if (active) confirm.disabled = input.disabled = false;
    }
  });
  card.querySelector('.buyin-close').addEventListener('click', onClose);
  render();
  const unsub = walletClient.subscribe(() => { if (active) render(); });
  card.addEventListener('card:teardown', () => { active = false; unsub(); });
  return card;
}

export function cashierCard({ walletClient, onReset, onExchange }) {
  const card = el(`
    <div class="floor-card service-card" role="dialog" aria-label="Cashier">
      <h3>CASHIER</h3>
      <p class="row">Chips: <strong class="cash-balance">—</strong> · Wallet: <strong class="cash-wallet">—</strong></p>
      <p class="hint cash-bust" hidden>You're out of money. Claim a free reset to keep playing.</p>
      <div class="exchange-row">
        <input class="exchange-amt cash-amt" type="number" inputmode="numeric" min="1" step="50" value="1000" aria-label="Amount">
        <button type="button" class="btn-primary cash-buy">Buy chips</button>
        <button type="button" class="btn-dim cash-out">Cash out</button>
        <button type="button" class="btn-dim cash-out-all">Cash out all</button>
      </div>
      <p class="hint cash-err" hidden></p>
      <p class="service-status cash-status" role="status">Your teller is ready.</p>
      <div class="actions">
        <button type="button" class="btn-primary cash-reset" hidden></button>
        <span class="sub cash-cooldown" hidden></span>
      </div>
      <p class="muted">Chips play at the tables — your wallet stays safe in the cage.</p>
    </div>`);
  const errEl = card.querySelector('.cash-err');
  const status = card.querySelector('.cash-status');
  let exchanging = false, active = true;
  const render = () => {
    const h = formatHud(
      {
        balance: walletClient.getBalance(),
        cash: walletClient.getCash ? walletClient.getCash() : null,
        resetChips: walletClient.getResetChips ? walletClient.getResetChips() : null,
        ...walletClient.getResetInfo(),
      },
      Date.now(),
    );
    card.querySelector('.cash-balance').textContent = h.balanceText;
    card.querySelector('.cash-wallet').textContent = h.cashText !== null ? h.cashText : '—';
    card.querySelector('.cash-bust').hidden = h.state !== 'bust';
    const resetBtn = card.querySelector('.cash-reset');
    resetBtn.hidden = !h.showReset;
    resetBtn.textContent = `${h.resetLabel} chips`;
    const cd = card.querySelector('.cash-cooldown');
    cd.hidden = !h.cooldownText;
    if (h.cooldownText) cd.textContent = `Reset in ${h.cooldownText}`;
  };
  const ERR_COPY = {
    'insufficient-cash': 'Not enough in your wallet.',
    'insufficient-chips': 'Not enough chips to cash out.',
    'bad-amount': 'Enter a valid amount.',
    'network-error': 'Connection problem — try again.',
  };
  const exchange = (btnSel, kind, all = false) => {
    const btn = card.querySelector(btnSel);
    btn.addEventListener('click', async () => {
      if (exchanging || !active) return;
      exchanging = true; errEl.hidden = true;
      card.querySelectorAll('.exchange-row button').forEach(button => { button.disabled = true; });
      try {
        const value = all ? walletClient.getBalance() : amount();
        status.textContent = 'Processing your exchange…';
        if (kind === 'buyIn') await walletClient.buyIn(value);
        else await walletClient.cashOut(all ? 'all' : value);
        if (!active) return;
        render(); card.classList.add('is-serving');
        status.textContent = kind === 'buyIn' ? 'Counting notes and preparing your chips…' : 'Counting chips and preparing your cash…';
        // A visual error cannot turn a committed wallet transaction into a
        // failed exchange or encourage a duplicate financial operation.
        let presented = false;
        try { presented = !!onExchange && await onExchange(kind, value) !== false; } catch { /* wallet already committed */ }
        if (active) status.textContent = presented ? 'Exchange complete. Your payout is at the window.' : 'Exchange complete. Your wallet balance is updated.';
      } catch (err) {
        if (active) {
          errEl.hidden = false;
          errEl.textContent = ERR_COPY[err && err.code] || 'Something went wrong — try again.';
          status.textContent = 'Your teller is ready.';
        }
      } finally {
        exchanging = false;
        if (active) {
          card.classList.remove('is-serving');
          card.querySelectorAll('.exchange-row button').forEach(button => { button.disabled = false; });
        }
      }
    });
  };
  const amount = () => {
    const v = Math.floor(Number(card.querySelector('.cash-amt').value));
    if (!Number.isFinite(v) || v <= 0) {
      const e = new Error('bad-amount'); e.code = 'bad-amount'; throw e;
    }
    return v;
  };
  exchange('.cash-buy', 'buyIn');
  exchange('.cash-out', 'cashOut');
  exchange('.cash-out-all', 'cashOut', true);
  card.querySelector('.cash-reset').addEventListener('click', () => onReset(render));
  render();
  const unsub = walletClient.subscribe(render);
  const timer = setInterval(render, 30000);
  card.addEventListener('card:teardown', () => { active = false; unsub(); clearInterval(timer); });
  return card;
}

export function practiceCard() {
  return el(`
    <div class="floor-card" role="dialog" aria-label="Practice zone">
      <h3>PRACTICE ZONE</h3>
      <p class="sub">Trainers, counting and theory — free, no sign-in.</p>
      <div class="actions">
        <a class="btn-primary" href="../index.html#practiceZone">Open Practice</a>
      </div>
    </div>`);
}

// ---------- the bar: bartender's rotating strategy tip ----------
export const BAR_TIPS = [
  { game: 'Blackjack', tip: 'Always split aces and eights — but never split tens or fives.' },
  { game: 'Blackjack', tip: 'Stand on a hard 17 or higher. The house edge only grows when you push your luck.' },
  { game: 'Baccarat', tip: 'Banker is the smartest bet — the lowest house edge, even after the 5% commission.' },
  { game: 'Baccarat', tip: 'Skip the Tie bet. It pays 8:1, but the house edge is a brutal ~14%.' },
  { game: 'Roulette', tip: 'Single-zero (European) roulette halves the house edge versus double-zero. Always pick single-zero.' },
  { game: 'Roulette', tip: 'There are no hot or cold numbers — every spin is independent. Bet for fun, not patterns.' },
  { game: null, tip: 'Set a loss limit before you sit down, and cash out when you hit it. The cage is right there.' },
  { game: null, tip: 'Chips play at the tables; your wallet stays safe in the cage. Only buy in what you can lose.' },
];

const BAR_TIP_KEY = 'cg_bar_tip_i';
// Rotate through the tips, one further each visit, persisted across sessions.
export function nextBarTip() {
  let i = -1;
  try { const v = Number(localStorage.getItem(BAR_TIP_KEY)); if (Number.isFinite(v)) i = v; } catch { /* no storage */ }
  i = (i + 1) % BAR_TIPS.length;
  try { localStorage.setItem(BAR_TIP_KEY, String(i)); } catch { /* ignore */ }
  return BAR_TIPS[i];
}

export function barCard({ tip, onPractice, onDismiss, onOrder }) {
  const t = tip || BAR_TIPS[0];
  const card = el(`
    <div class="floor-card service-card" role="dialog" aria-label="Casino bar">
      <h3>THE BAR</h3>
      <p class="sub">Choose a drink and watch the bartender make it.</p>
      <div class="exchange-row">
        <select class="exchange-amt bar-drink" aria-label="Drink"><option value="old-fashioned">Old Fashioned</option><option value="martini">Martini</option><option value="highball">Whisky Highball</option></select>
        <button type="button" class="btn-primary" data-act="order">Make my drink</button>
      </div>
      <p class="service-status bar-status" role="status">Complimentary · no chips charged.</p>
      <p class="muted bar-tip service-extra">${t.game ? `<strong>${t.game}:</strong> ` : ''}${t.tip}</p>
      <div class="actions">
        <button type="button" class="btn-primary" data-act="practice">Try it in Practice</button>
        <button type="button" class="btn-dim" data-act="cheers">Cheers</button>
      </div>
    </div>`);
  let busy = false, active = true;
  const order = card.querySelector('[data-act="order"]');
  const drink = card.querySelector('.bar-drink');
  const status = card.querySelector('.bar-status');
  order.addEventListener('click', async () => {
    if (busy || !active) return;
    busy = true; order.disabled = drink.disabled = true; card.classList.add('is-serving');
    status.textContent = 'Your bartender is preparing ' + drink.selectedOptions[0].textContent + '…';
    try {
      const served = await onOrder?.(drink.value);
      if (active) status.textContent = served === false ? 'The bartender is finishing another drink. Please try again.' : 'Your drink is served. Cheers!';
    } catch {
      if (active) status.textContent = 'The bartender could not finish that drink. Please try again.';
    } finally {
      busy = false;
      if (active) { order.disabled = drink.disabled = false; card.classList.remove('is-serving'); }
    }
  });
  card.addEventListener('card:teardown', () => { active = false; });
  card.querySelector('[data-act="practice"]').addEventListener('click', onPractice);
  card.querySelector('[data-act="cheers"]').addEventListener('click', onDismiss);
  return card;
}

export function unavailableCard() {
  return el(`
    <div class="floor-card" role="dialog" aria-label="Service unavailable">
      <h3>CASINO SERVICES UNREACHABLE</h3>
      <p class="sub">Sign-in is unavailable right now. Practice is still open, or return to the 2D lobby.</p>
      <div class="actions">
        <a class="btn-primary" href="../index.html">Back to 2D lobby</a>
        <a class="btn-dim" href="../index.html#practiceZone">Open Practice</a>
      </div>
    </div>`);
}
