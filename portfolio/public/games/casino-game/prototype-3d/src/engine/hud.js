(() => {
  const C = (globalThis.CASINO ??= {});
  const CHIP_CLASS = { 100: 'c100', 500: 'c500', 1000: 'c1000', 5000: 'c5000' };

  function miniCard(card) {
    const el = document.createElement('div');
    if (!card) { el.className = 'mc back'; return el; }
    const red = card.s === 1 || card.s === 2;
    el.className = 'mc' + (red ? ' red' : '');
    const rank = document.createElement('span');
    rank.className = 'mc-r';
    rank.textContent = C.outcomes.RANK_LABEL[card.r];
    const suit = document.createElement('span');
    suit.className = 'mc-s';
    suit.textContent = C.outcomes.SUIT_CHAR[card.s];
    el.append(rank, suit);
    return el;
  }

  // sections: [{ id: 'dealer', label: 'DEALER' }, ...]
  function createMirror(sections) {
    const el = document.createElement('div');
    el.className = 'hand-mirror';
    el.hidden = true;
    const secEls = {};
    for (const s of sections) {
      const sec = document.createElement('div');
      sec.className = 'hm-sec';
      const label = document.createElement('div');
      label.className = 'hm-label';
      label.textContent = s.label;
      const cards = document.createElement('div');
      cards.className = 'hm-cards';
      const note = document.createElement('div');
      note.className = 'hm-note';
      sec.append(label, cards, note);
      el.appendChild(sec);
      secEls[s.id] = { sec, cards, note };
    }
    document.body.appendChild(el);
    return {
      el,
      set(id, cards, note = '') {
        const s = secEls[id];
        if (!s) return;
        s.cards.replaceChildren(...cards.map(miniCard));
        s.note.textContent = note;
      },
      clear() {
        Object.values(secEls).forEach((s) => { s.cards.replaceChildren(); s.note.textContent = ''; });
      },
      show() { el.hidden = false; },
      hide() { el.hidden = true; },
      destroy() { el.remove(); },
    };
  }

  // 2D chip stack inside a bet spot: bottom-anchored, 3px vertical offset per
  // chip, visual cap 8 (the numeric badge stays exact).
  function renderChips(spotEl, denoms) {
    let wrap = spotEl.querySelector('.chips2d');
    if (!denoms.length) { wrap?.remove(); return; }
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'chips2d';
      spotEl.appendChild(wrap);
    }
    wrap.replaceChildren(...denoms.slice(-8).map((v, i) => {
      const chip = document.createElement('div');
      chip.className = 'chip2d ' + (CHIP_CLASS[v] || 'c100');
      chip.style.bottom = i * 3 + 'px';
      chip.textContent = v >= 1000 ? v / 1000 + 'K' : String(v);
      return chip;
    }));
  }

  C.hud = { miniCard, createMirror, renderChips };
})();
