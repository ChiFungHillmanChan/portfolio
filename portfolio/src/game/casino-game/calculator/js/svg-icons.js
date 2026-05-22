/**
 * Shared inline-SVG icon library for casino-game pages.
 *
 * Every icon is a self-contained SVG string sized to 1em that inherits text
 * color via `currentColor`. Drop the string directly into HTML / template
 * literals where an emoji used to live, e.g.:
 *
 *   button.innerHTML = `${SVG_ICONS.check} Saved!`;
 *
 * Card-suit glyphs (♠♥♦♣) are intentionally NOT in here — they are part of
 * game card rendering, not UI chrome.
 */
(function (root) {
  const I = (paths, opts = {}) => {
    const fill = opts.fill || 'currentColor';
    const stroke = opts.stroke || 'none';
    const sw = opts.sw || '0';
    const ext = opts.attrs || '';
    return (
      '<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" ' +
      `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ` +
      'stroke-linecap="round" stroke-linejoin="round" ' +
      `aria-hidden="true" focusable="false" ${ext}>${paths}</svg>`
    );
  };

  const STROKE = { fill: 'none', stroke: 'currentColor', sw: '2' };

  const SVG_ICONS = {
    casino: I(
      '<rect x="3" y="5" width="18" height="14" rx="2"/>' +
        '<line x1="9" y1="5" x2="9" y2="19"/>' +
        '<line x1="15" y1="5" x2="15" y2="19"/>' +
        '<circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none"/>' +
        '<circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>' +
        '<circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
      STROKE
    ),
    roulette: I(
      '<circle cx="12" cy="12" r="9"/>' +
        '<circle cx="12" cy="12" r="3"/>' +
        '<line x1="12" y1="3" x2="12" y2="9"/>' +
        '<line x1="12" y1="15" x2="12" y2="21"/>' +
        '<line x1="3" y1="12" x2="9" y2="12"/>' +
        '<line x1="15" y1="12" x2="21" y2="12"/>',
      STROKE
    ),
    baccarat: I(
      '<rect x="3" y="6" width="11" height="15" rx="1.5"/>' +
        '<rect x="10" y="3" width="11" height="15" rx="1.5"/>',
      STROKE
    ),
    blackjack: I(
      '<rect x="5" y="3" width="14" height="18" rx="2"/>' +
        '<path d="M12 8c-1.4 2-3 3-3 5a3 3 0 0 0 6 0c0-2-1.6-3-3-5z" fill="currentColor" stroke="none"/>' +
        '<rect x="11.3" y="15.5" width="1.4" height="1.8" rx="0.2" fill="currentColor" stroke="none"/>',
      STROKE
    ),
    spade: I(
      '<path d="M12 2c-1 3-7 7-7 11.5C5 16 7 18 9 18c1 0 2-.4 2.6-1.1L11 21h2l-.6-4.1C13 17.6 14 18 15 18c2 0 4-2 4-4.5 0-4.5-6-8.5-7-11.5z"/>'
    ),
    home: I(
      '<path d="M3 12l9-9 9 9"/>' +
        '<path d="M5 10v10h14V10"/>' +
        '<path d="M10 20v-6h4v6"/>',
      STROKE
    ),
    coffee: I(
      '<path d="M4 8h14v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/>' +
        '<path d="M18 10h2a2 2 0 0 1 0 4h-2"/>' +
        '<path d="M7 2v3M11 2v3M15 2v3"/>',
      STROKE
    ),
    target: I(
      '<circle cx="12" cy="12" r="9"/>' +
        '<circle cx="12" cy="12" r="5"/>' +
        '<circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
      STROKE
    ),
    stats: I(
      '<line x1="6" y1="20" x2="6" y2="11"/>' +
        '<line x1="12" y1="20" x2="12" y2="4"/>' +
        '<line x1="18" y1="20" x2="18" y2="14"/>',
      STROKE
    ),
    chartUp: I(
      '<polyline points="3 17 9 11 13 15 21 7"/>' +
        '<polyline points="14 7 21 7 21 14"/>',
      STROKE
    ),
    replay: I(
      '<rect x="3" y="7" width="18" height="13" rx="1.5"/>' +
        '<path d="M3 11h18"/>' +
        '<circle cx="7" cy="5" r="2"/>' +
        '<circle cx="13" cy="5" r="2"/>',
      STROKE
    ),
    dice: I(
      '<rect x="4" y="4" width="16" height="16" rx="2"/>' +
        '<circle cx="8" cy="8" r="1" fill="currentColor"/>' +
        '<circle cx="16" cy="8" r="1" fill="currentColor"/>' +
        '<circle cx="12" cy="12" r="1" fill="currentColor"/>' +
        '<circle cx="8" cy="16" r="1" fill="currentColor"/>' +
        '<circle cx="16" cy="16" r="1" fill="currentColor"/>',
      STROKE
    ),
    refresh: I(
      '<polyline points="21 4 21 10 15 10"/>' +
        '<polyline points="3 20 3 14 9 14"/>' +
        '<path d="M20.49 9A9 9 0 0 0 5.64 6.36L3 9m18 6l-2.64 2.64A9 9 0 0 1 3.51 15"/>',
      STROKE
    ),
    gift: I(
      '<rect x="3" y="8" width="18" height="13" rx="1"/>' +
        '<line x1="12" y1="8" x2="12" y2="21"/>' +
        '<line x1="3" y1="14" x2="21" y2="14"/>' +
        '<path d="M12 8C9 8 6 6 6 4s3-2 6 4c3-6 6-4 6-2s-3 2-6 2z"/>',
      STROKE
    ),
    folder: I(
      '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
      STROKE
    ),
    close: I(
      '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '<line x1="18" y1="6" x2="6" y2="18"/>',
      { fill: 'none', stroke: 'currentColor', sw: '2.5' }
    ),
    check: I(
      '<polyline points="5 12 10 17 19 7"/>',
      { fill: 'none', stroke: 'currentColor', sw: '3' }
    ),
    cross: I(
      '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '<line x1="18" y1="6" x2="6" y2="18"/>',
      { fill: 'none', stroke: 'currentColor', sw: '3' }
    ),
    timer: I(
      '<circle cx="12" cy="13" r="8"/>' +
        '<polyline points="12 9 12 13 15 15"/>' +
        '<line x1="9" y1="2" x2="15" y2="2"/>',
      STROKE
    ),
    lightning: I(
      '<polygon points="13 2 4 14 11 14 9 22 20 10 13 10"/>'
    ),
    pointer: I(
      '<path d="M9 11V5a2 2 0 1 1 4 0v6"/>' +
        '<path d="M13 11V8a2 2 0 1 1 4 0v3"/>' +
        '<path d="M17 11v-1a2 2 0 1 1 4 0v6a6 6 0 0 1-6 6h-3.5a4 4 0 0 1-3.45-2L4 13a2 2 0 0 1 3-2.5l2 1.5"/>',
      STROKE
    ),
    fire: I(
      '<path d="M12 2c-.7 4-5 5-5 10a5 5 0 0 0 10 0c0-2-1-3-2-4 1 5-3 6-3 3 0-3 2-4 0-9z"/>'
    ),
    snowflake: I(
      '<line x1="12" y1="2" x2="12" y2="22"/>' +
        '<line x1="2" y1="12" x2="22" y2="12"/>' +
        '<line x1="5" y1="5" x2="19" y2="19"/>' +
        '<line x1="19" y1="5" x2="5" y2="19"/>',
      STROKE
    ),
    bulb: I(
      '<path d="M9 18h6"/>' +
        '<path d="M10 22h4"/>' +
        '<path d="M12 2a7 7 0 0 0-4 13c1 .7 1.5 2 1.5 3h5c0-1 .5-2.3 1.5-3a7 7 0 0 0-4-13z"/>',
      STROKE
    ),
    money: I(
      '<rect x="2" y="6" width="20" height="12" rx="2"/>' +
        '<circle cx="12" cy="12" r="3"/>',
      STROKE
    ),
    star: I(
      '<polygon points="12 2 14.85 8.5 22 9.27 16.5 14 18 21 12 17.5 6 21 7.5 14 2 9.27 9.15 8.5"/>'
    ),
    trophy: I(
      '<path d="M7 4h10v6a5 5 0 0 1-10 0z"/>' +
        '<path d="M7 6H4v3a3 3 0 0 0 3 3"/>' +
        '<path d="M17 6h3v3a3 3 0 0 1-3 3"/>' +
        '<line x1="12" y1="15" x2="12" y2="19"/>' +
        '<path d="M8 19h8v2H8z"/>',
      STROKE
    ),
    gear: I(
      '<circle cx="12" cy="12" r="3"/>' +
        '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      STROKE
    ),
    cloud: I(
      '<path d="M18 19H6a4 4 0 0 1 0-8 6 6 0 0 1 11.66-2A4 4 0 0 1 18 19z"/>',
      STROKE
    ),
    play: I('<polygon points="7 4 20 12 7 20"/>'),
    pause: I(
      '<rect x="6" y="4" width="4" height="16"/>' +
        '<rect x="14" y="4" width="4" height="16"/>'
    ),
    scroll: I(
      '<path d="M4 6a2 2 0 0 1 2-2h12v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/>' +
        '<line x1="8" y1="9" x2="14" y2="9"/>' +
        '<line x1="8" y1="13" x2="14" y2="13"/>',
      STROKE
    ),
    dotGreen:
      '<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="4.5" fill="#22c55e"/></svg>',
    dotBlue:
      '<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="4.5" fill="#3b82f6"/></svg>',
    dotRed:
      '<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="4.5" fill="#ef4444"/></svg>'
  };

  root.SVG_ICONS = SVG_ICONS;
  if (typeof module !== 'undefined' && module.exports) module.exports = SVG_ICONS;
})(typeof window !== 'undefined' ? window : this);
