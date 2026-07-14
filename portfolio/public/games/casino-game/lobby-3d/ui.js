// ui.js — the DOM layer of the 3D hub: wallet pill, account menu, quick-nav,
// and the floor cards (check-in / sit-down / cashier / practice). This layer
// is the ACCESSIBLE path — everything is real buttons/links, keyboard
// operable; the WebGL canvas is decorative. No fake numbers ever render here:
// the only balance shown comes from walletClient.getBalance().
import { formatChips } from '../js/wallet/table-config.js';
import { formatHud } from '../js/wallet/wallet-hud.js';

const CHIP_DOT = '<span class="chip-dot" aria-hidden="true"></span>';

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ---------- wallet pill (signed-out: Sign in · signed-in: live balance) ----------
export function mountWalletPill(host, { walletClient, onSignInClick, onReset }) {
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
      { balance: walletClient.getBalance(), ...walletClient.getResetInfo() },
      Date.now(),
    );
    const pill = el(`
      <div class="wallet-pill" data-state="${h.state}">
        ${CHIP_DOT}<span class="pill-balance">${h.balanceText}</span>
        ${h.showReset ? '<button type="button" class="pill-reset">Reset +5,000</button>' : ''}
        ${h.cooldownText ? `<span class="pill-cooldown">Reset in ${h.cooldownText}</span>` : ''}
      </div>`);
    const btn = pill.querySelector('.pill-reset');
    if (btn) btn.addEventListener('click', onReset);
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

  function show(kind, node, { onClose, focus = false, dismissable = true } = {}) {
    root.innerHTML = '';
    root.appendChild(node);
    current = {
      kind,
      dismissable,
      close: () => {
        if (current && current.kind === kind) {
          root.innerHTML = '';
          current = null;
          onClose && onClose();
        }
      },
    };
    if (focus) node.querySelector('button, a')?.focus();
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

export function sitdownCard({ table, gameName, balance, onNotNow }) {
  const title = table.key ? `${gameName} — ${table.tierName}` : gameName;
  const balText = typeof balance === 'number' ? formatChips(balance) : '—';
  const insufficient = typeof balance === 'number' && balance < table.minBet;
  const card = el(`
    <div class="floor-card" role="dialog" aria-label="Sit down at ${title}">
      <h3>${title}</h3>
      <p class="sub">${table.blurb || ''}</p>
      <p class="row">Limits: <strong>${table.limitsText}</strong></p>
      <p class="row">Your chips: <strong>${balText}</strong></p>
      ${insufficient ? `<p class="hint">You need at least ${formatChips(table.minBet)} chips for this table. Try a lower-limit game.</p>` : ''}
      <div class="actions">
        <a class="btn-primary" href="${table.href}">Sit down</a>
        <button type="button" class="btn-dim">Not now</button>
      </div>
    </div>`);
  card.querySelector('.btn-dim').addEventListener('click', onNotNow);
  return card;
}

export function cashierCard({ walletClient, onReset }) {
  const card = el(`
    <div class="floor-card" role="dialog" aria-label="Cashier">
      <h3>CASHIER</h3>
      <p class="row">Your chips: <strong class="cash-balance">—</strong></p>
      <p class="hint cash-bust" hidden>You're out of chips. Claim a free reset to keep playing.</p>
      <div class="actions">
        <button type="button" class="btn-primary cash-reset" hidden>Reset +5,000 chips</button>
        <span class="sub cash-cooldown" hidden></span>
      </div>
      <p class="muted">Buy chips — coming soon.</p>
    </div>`);
  const render = () => {
    const h = formatHud(
      { balance: walletClient.getBalance(), ...walletClient.getResetInfo() },
      Date.now(),
    );
    card.querySelector('.cash-balance').textContent = h.balanceText;
    card.querySelector('.cash-bust').hidden = h.state !== 'bust';
    const resetBtn = card.querySelector('.cash-reset');
    resetBtn.hidden = !h.showReset;
    const cd = card.querySelector('.cash-cooldown');
    cd.hidden = !h.cooldownText;
    if (h.cooldownText) cd.textContent = `Reset in ${h.cooldownText}`;
  };
  card.querySelector('.cash-reset').addEventListener('click', () => onReset(render));
  render();
  const unsub = walletClient.subscribe(render);
  const timer = setInterval(render, 30000);
  card.addEventListener('card:teardown', () => { unsub(); clearInterval(timer); });
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
