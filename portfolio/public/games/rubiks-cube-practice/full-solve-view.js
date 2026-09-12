import { t } from './i18n.js';
import { FACE_ORDER, parseAlgorithm } from './cube-engine.js';
import { faceNames } from './cube-view.js';

const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pretty = value => value.replaceAll("'", '′');

export function typedCubeInput(text, scheme) {
  return `<details class="typed-cube-input" ${text ? 'open' : ''}>
    <summary>${t('Type or paste all 54 colors')}</summary>
    <p id="cube-text-guide">${t('Enter nine letters per face, reading each face left to right, top to bottom. Use this face order:')}</p>
    <ol class="typed-face-order">${FACE_ORDER.map(face => `<li><strong>${face}</strong> ${t(faceNames[face])}</li>`).join('')}</ol>
    <p>${t('Color letters: Y = yellow, R = red, G = green, W = white, O = orange, B = blue.')}</p>
    <p class="scope-detail">${t('Or use face letters U R F D L B, where each letter means that face’s center color.')}</p>
    <label for="cube-text">${t('Your cube colors')}</label>
    <textarea id="cube-text" rows="6" spellcheck="false" autocapitalize="characters" autocomplete="off" aria-describedby="cube-text-guide" placeholder="${FACE_ORDER.map(face => scheme[face][0].toUpperCase().repeat(9)).join('\n')}">${escape(text)}</textarea>
    <p class="scope-detail">${t('The placeholder shows a solved cube. Replace it with your own stickers.')}</p>
    <button class="secondary" data-action="import-cube-text">${t('Import colors')}</button>
  </details>`;
}

export function fullSolutionPanel({ result, busy, status }) {
  const moves = parseAlgorithm(result?.algorithm || '');
  return `<section class="algorithm-panel panel full-solution-panel" aria-busy="${busy}">
    <div class="panel-heading"><span class="section-label">${t('Your complete solution')}</span><span class="full-solve-size">3 × 3</span></div>
    ${!result ? `<div class="result-empty">
      <h2>${t(busy ? 'Finding your solution…' : 'Let’s solve the whole cube')}</h2>
      <p>${t('Match all six faces using the color grid, typed colors, or photos. You can start from any legal scramble.')}</p>
      <ol class="solve-instructions"><li>${t('Enter your cube and check the colors.')}</li><li>${t('Get a complete solution.')}</li><li>${t('Follow the animation at your own pace.')}</li></ol>
      <p class="solver-status" role="status" aria-live="polite">${busy ? t(status === 'initializing' ? 'Preparing the solver for the first solve… This can take a few seconds.' : 'Searching for a solution…') : t('Everything is calculated on this device.')}</p>
      ${busy ? `<button class="secondary" data-action="cancel-solve">${t('Cancel calculation')}</button>` : ''}
    </div>` : `<div class="algorithm-title"><span class="case-badge">${t('Full cube solution')}</span><h2>${t(moves.length ? 'Your cube, solved step by step' : 'Already solved')}</h2><p>${t(moves.length === 1 ? '{count} move' : '{count} moves', { count: moves.length })}${moves.length ? t(' · Follow in this order') : ''}</p></div>
      <p class="full-solve-guidance">${t(moves.length ? 'Hold your cube like the preview. Press Play moves, or Next move to follow one turn at a time.' : 'All six faces already match their centers. No moves needed.')}</p>
      <div class="algorithm-toolbar"><span class="algorithm-position" role="status"></span></div>
      <div class="move-list" aria-label="${t('Solution moves')}">${moves.map((move, i) => `<button class="move-token" data-action="jump" data-index="${i + 1}" aria-label="${t('Show cube after move {step}: {move}', { step: i + 1, move: escape(move) })}">${pretty(move)}</button>`).join('')}</div>
      ${moves.length ? `<div class="algorithm-footer"><button class="text-button" data-action="copy">${t('Copy algorithm')}</button><button class="text-button" data-action="restart">${t('Restart algorithm')}</button></div>` : ''}`}
    <details class="full-solve-about"><summary>${t('How does it find a solution?')}</summary><p>${t('A two-phase solver searches for a short sequence of legal turns. It solves the whole cube without requiring you to finish CFOP stages first. The solution is not guaranteed to be the shortest possible.')}</p><p>${t('Photos need to show all six faces, one face at a time. Hidden stickers cannot be inferred from a single photo.')}</p><a href="./ATTRIBUTION.md">${t('Sources & attribution')}</a></details>
  </section>`;
}
