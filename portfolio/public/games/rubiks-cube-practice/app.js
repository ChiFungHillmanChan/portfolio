import * as engine from './cube-engine.js';
import { stages as englishStages, chapters as englishChapters, twoLookIds } from './chapters.js';
import { stages as chineseStages, chapters as chineseChapters } from './chapters-zh-HK.js';
import { t, getLocale, initializeLocale, setLocale, localizeError } from './i18n.js';

import { colors, defaultScheme, faceNames, stickerLabel, cubeSvg, topSvg, cubeNet } from './cube-view.js?v=20260912-photo';
import { isLastLayerStage, inputFaces, editableIndices, prepareInputCube, applyFaceColors } from './input-model.js';
import { createCubeRenderer } from './cube-renderer.js';
import { createPlayback, SPEEDS } from './playback.js';
import { createSolveTimer, timerView, mountSolveTimer } from './solve-timer.js';
import { mobileNavTrigger, createMobileNav } from './mobile-nav.js';
import { typedCubeInput, fullSolutionPanel } from './full-solve-view.js';
import { parseCubeText } from './full-solve-input.js';
import { createFullSolver } from './full-solver-client.js';

initializeLocale();
let stages = getLocale() === 'zh-HK' ? chineseStages : englishStages;
let chapters = getLocale() === 'zh-HK' ? chineseChapters : englishChapters;

const app = document.querySelector('#app');
const escape = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const caseTitle = (c) => c?.id === 'oll-27' ? 'Sune' : c?.id === 'oll-26' ? 'Anti-Sune' : t(c?.group || '');
const pretty = (algorithm = '') => algorithm.replaceAll("'", '′');
const tokens = engine.parseAlgorithm;
const icon = (name, size = 20) => {
  const paths = {
    book: '<path d="M12 5v16m0-16C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-3-1-7-2-10 1Z"/>',
    practice: '<path d="m9 4 12 8-12 8V4Z"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    shuffle: '<path d="m3 5 4 0 10 14h4m-4-4 4 4-4 4M3 19h4L17 5h4m-4-4 4 4-4 4"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    reset: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    timer: '<circle cx="12" cy="14" r="8"/><path d="M9 2h6m-3 4V2m0 7v5l3 2m4-10 2 2"/>',
    camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/>',
    coffee: '<path d="M4 8h14v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"/><path d="M18 10h2a2 2 0 0 1 0 4h-2M7 2v3m4-3v3m4-3v3"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
};
function readSaved() {
  try { return JSON.parse(localStorage.getItem('rubiks-practice-v1')) || {}; } catch { return {}; }
}
const saved = readSaved();
const state = {
  mode: 'practice', stage: 'O', practiceStage: 'O', chapter: 'O', source: 'library', selected: null,
  cube: engine.solvedCube(), scheme: { ...defaultScheme }, paint: 'U', slot: 'FR',
  result: null, step: 0, playing: false, hide: false, speed: SPEEDS.includes(saved.speed) ? saved.speed : 0.5,
  view: 'front', caseLimit: 12,
  query: '', group: 'all', filter: 'all', error: '', notice: '', busy: false,
  photoFaces: [], referenceColors: {}, photoScope: null,
  cubeText: '', solverStatus: 'ready',
  learned: new Set(Array.isArray(saved.learned) ? saved.learned : []),
  completed: new Set(Array.isArray(saved.completed) ? saved.completed : []),
};
let cases = [], crossWorker, renderer, renderInProgress = false, sequenceCube, sequenceAlgorithm;
let sequenceEnd = state.cube;
let photoCapture = null, photoRequest = 0;
let fullSolveRequest = 0, practiceWorkspace = null, fullWorkspace = null, restoredStep = null;
const workspaceKeys = ['stage', 'practiceStage', 'source', 'selected', 'cube', 'scheme', 'paint', 'slot', 'result', 'step', 'hide', 'view', 'photoFaces', 'referenceColors', 'photoScope', 'cubeText', 'error', 'notice'];
const saveWorkspace = () => Object.fromEntries(workspaceKeys.map(key => [key, state[key]]));
function restoreWorkspace(workspace) {
  Object.assign(state, workspace);
  restoredStep = state.step;
}
const fullSolver = createFullSolver({ onStatus: status => {
  state.solverStatus = status;
  const message = document.querySelector('.solver-status');
  if (message && state.busy) message.textContent = t(status === 'initializing'
    ? 'Preparing the solver for the first solve… This can take a few seconds.' : 'Searching for a solution…');
} });
const solveTimer = createSolveTimer();
let timerMount = null, mobileNav = null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const playback = createPlayback({
  reducedMotion: reducedMotion.matches,
  onFrame: (frame) => {
    if (!renderInProgress) renderer?.draw(frame.cube, state.scheme, frame.move, frame.progress, state.view);
  },
  onChange: (snapshot) => {
    state.step = snapshot.step;
    state.playing = snapshot.playing;
    if (!renderInProgress) updatePlaybackUI(snapshot);
  },
});
playback.setSpeed(state.speed);
reducedMotion.addEventListener('change', (event) => playback.setReducedMotion(event.matches));
document.addEventListener('visibilitychange', () => { if (document.hidden) playback.pause(); });
window.addEventListener('pagehide', () => { cancelWork(); timerMount?.destroy(); timerMount = null; solveTimer.cancel(); mobileNav?.close(); });
window.addEventListener('pageshow', () => {
  if (state.mode === 'timer' && !timerMount) timerMount = mountSolveTimer(document.querySelector('.solve-timer'), solveTimer);
  if (state.mode === 'solve') render();
});
const previewObserver = new IntersectionObserver((entries) => {
  const preview = document.querySelector('#cube-practice');
  if (entries.some((entry) => entry.target === preview && !entry.isIntersecting)) playback.pause();
}, { threshold: 0 });
const caseStates = new Map();
const getCaseState = (c) => {
  if (!caseStates.has(c.algorithm)) caseStates.set(c.algorithm, engine.makeCase(c.algorithm));
  return caseStates.get(c.algorithm);
};
function persist() {
  try { localStorage.setItem('rubiks-practice-v1', JSON.stringify({ learned: [...state.learned], completed: [...state.completed], speed: state.speed })); } catch { /* Practice remains usable with storage disabled. */ }
}
function cancelWork() {
  playback.pause();
  fullSolveRequest += 1;
  fullSolver.cancel();
  crossWorker?.terminate();
  crossWorker = null;
  state.busy = false;
  photoRequest += 1;
  photoCapture?.close();
  photoCapture = null;
}
function loadCase(c) {
  cancelWork();
  state.selected = c;
  state.stage = c.stage;
  state.practiceStage = c.stage;
  state.source = 'library';
  state.cube = [...getCaseState(c)];
  state.result = { case: c, algorithm: c.algorithm, setup: '', auf: '' };
  state.step = 0;
  state.hide = false;
  state.view = 'front';
  state.error = '';
  state.notice = '';
  state.photoFaces = []; state.referenceColors = {};
}
function setStage(stage) {
  cancelWork();
  const previousStage = state.stage;
  state.stage = stage;
  state.chapter = stage;
  state.query = ''; state.group = 'all'; state.filter = 'all';
  state.caseLimit = 12;
  if (state.mode !== 'practice') { render(); return; }
  state.practiceStage = stage;
  state.photoFaces = state.photoFaces.filter((face) => inputFaces(stage).includes(face));
  if (state.source === 'library' || (isLastLayerStage(previousStage) && !isLastLayerStage(stage))) {
    state.photoFaces = []; state.referenceColors = {};
  }
  state.error = ''; state.notice = ''; state.step = 0;
  if (state.mode === 'practice' && state.source === 'library') {
    if (stage === 'C') {
      state.cube = engine.applyAlgorithm(engine.solvedCube(), "R U2 F' L D B2 R' F2 U L2");
      state.result = null; state.selected = null;
    } else loadCase(cases.find((c) => c.id === ({ F: 'f2l-1', O: 'oll-27', P: 'pll-t' }[stage])) || cases.find((c) => c.stage === stage));
  } else {
    state.result = null;
    if (state.source === 'mine') state.cube = prepareInputCube(state.cube, stage);
  }
  render();
}
function logo() {
  return '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
}
function sidebar() {
  return `<aside class="sidebar" id="site-navigation">
    <a class="brand" href="./index.html">${logo()}<span>${t('rubik’s cube')}<span>${t('practice')}</span></span></a>
    <div class="rail-label">${t('Your CFOP companion')}</div>
    <nav class="mode-nav" aria-label="${t('Learning mode')}">
      <button data-action="mode" data-value="solve" aria-label="${t('I just want to solve it')}" class="full-solve-nav ${state.mode === 'solve' ? 'active' : ''}" ${state.mode === 'solve' ? 'aria-current="page"' : ''}>${icon('check')}<span>${t('I just want to solve it')}</span></button>
      <button data-action="mode" data-value="practice" aria-label="${t('Practice mode')}" class="${state.mode === 'practice' ? 'active' : ''}" ${state.mode === 'practice' ? 'aria-current="page"' : ''}>${icon('practice')}${t('Practice mode')}</button>
      <button data-action="mode" data-value="algorithms" aria-label="${t('Algorithms')}" class="${state.mode === 'algorithms' ? 'active' : ''}" ${state.mode === 'algorithms' ? 'aria-current="page"' : ''}>${icon('search')}${t('Algorithms')}</button>
      <button data-action="mode" data-value="read" aria-label="${t('Read mode')}" class="${state.mode === 'read' ? 'active' : ''}" ${state.mode === 'read' ? 'aria-current="page"' : ''}>${icon('book')}${t('Read mode')}</button>
      <button data-action="mode" data-value="timer" aria-label="${t('Timer')}" class="${state.mode === 'timer' ? 'active' : ''}" ${state.mode === 'timer' ? 'aria-current="page"' : ''}>${icon('timer')}${t('Timer')}</button>
    </nav>
    <div class="rail-label chapters-label">${t('The learning path')}</div>
    <nav class="chapter-nav" aria-label="${t('CFOP chapters')}">${Object.entries(chapters).map(([key, chapter], i) => `<button data-action="chapter" data-value="${key}" class="${state.mode === 'read' && state.chapter === key ? 'active' : ''}"><span class="chapter-number ${state.completed.has(key) ? 'done' : ''}">${state.completed.has(key) ? icon('check', 15) : `0${i}`}</span><span>${key === 'N' ? t('Before you begin') : stages[key].short}</span>${icon('chevron', 14)}</button>`).join('')}</nav>
    <div class="progress-box"><div><strong>${t('Your progress')}</strong><span>${t('{count}/5 chapters', { count: state.completed.size })}</span></div><div class="progress-track"><i style="width:${state.completed.size * 20}%"></i></div><p>${t('{count} of 119 cases marked learned', { count: state.learned.size })}</p><small>${t('Saved on this device')}</small></div>
    <div class="sidebar-bottom"><span class="tiny-cube">3 × 3</span><p>${t('A little practice.<br>A smoother solve.')}</p><a href="https://hillmanchan.com" target="_blank" rel="noreferrer">${t('Made by Hillman Chan')} ${icon('arrow', 14)}</a></div>
  </aside>`;
}
function header() {
  return `<header class="topbar">${mobileNavTrigger()}<div class="breadcrumb">${t('Your workspace')} <span>/</span> <strong>${t({ read: 'Read', practice: 'Practice', algorithms: 'Algorithms', timer: 'Timer', solve: 'I just want to solve it' }[state.mode])}</strong></div><div class="topbar-right"><label class="language-picker" for="language-select"><span>Language / 語言</span><select id="language-select" aria-label="Language / 語言"><option value="en" lang="en" ${getLocale() === 'en' ? 'selected' : ''}>English</option><option value="zh-HK" lang="zh-Hant-HK" ${getLocale() === 'zh-HK' ? 'selected' : ''}>繁體中文</option></select></label><button class="text-button notation-link" data-action="chapter" data-value="N" aria-label="${t('Move notation')}"><span>${t('Move notation')}</span> ${icon('book', 17)}</button><a class="coffee-button" href="https://buymeacoffee.com/hillmanchan709" target="_blank" rel="noopener noreferrer" aria-label="${t('Buy me a coffee')}" title="${t('Buy me a coffee')}">${icon('coffee', 20)}<span>${t('Buy me a coffee')}</span></a></div></header>`;
}
function stageTabs() {
  return `<nav class="stage-tabs" aria-label="${t('Practice stage')}">${Object.entries(stages).map(([key, stage]) => `<button data-action="stage" data-value="${key}" class="${state.stage === key ? 'active' : ''}" style="--stage-color:${stage.color}" aria-pressed="${state.stage === key}"><span class="stage-letter">${key}</span><span>${stage.short}<small>${key === 'C' ? t('Start here') : key === 'F' ? t('Pair & insert') : key === 'O' ? t('Face the top') : t('Finish the solve')}</small></span>${state.stage === key ? '<span class="stage-active-dot"></span>' : ''}</button>`).join('')}</nav>`;
}
function currentDisplay() {
  return state.result ? playback.snapshot().cube : state.cube;
}
function holdingText(cube) {
  return t('Hold {top} on top · {front} in front · {right} on the right', { top: t(state.scheme[cube[4]]), front: t(state.scheme[cube[22]]), right: t(state.scheme[cube[13]]) });
}
function playbackControls() {
  return `<div class="playback-controls">
    <div class="live-move" role="status" aria-live="polite" aria-atomic="true">${t('Ready when you are')}</div>
    <div class="player">
      <button class="icon-button" data-action="restart" aria-label="${t('Restart algorithm')}">${icon('reset', 19)}</button>
      <button class="icon-button" data-action="step-back" aria-label="${t('Previous move')}">${icon('back', 19)}</button>
      <button class="primary play-button" data-action="play">${icon('practice', 18)}<span>${t('Play moves')}</span></button>
      <button class="icon-button" data-action="step" aria-label="${t('Next move')}">${icon('chevron', 19)}</button>
    </div>
    <div class="speed-row"><label for="speed">${t('Playback speed')}</label><select id="speed">${SPEEDS.map((speed) => `<option value="${speed}" ${state.speed === speed ? 'selected' : ''}>${speed}×${speed === 0.5 ? t(' · Learn slowly') : ''}</option>`).join('')}</select><span class="timing-hint">${t('A pause between turns')}</span></div>
    <p class="move-explainer">${t('Tap Next move to follow one turn at a time.')}</p>
  </div>`;
}
function colorEditor() {
  const lastLayer = isLastLayerStage(state.stage);
  const faces = inputFaces(state.stage);
  return `<div class="editor-intro"><h2>${t('Match your cube')}</h2>
    ${lastLayer ? `<span class="input-scope">${t('Top layer only')}</span><p>${t('For OLL and PLL, enter the top face and the top row of each side. The lower two layers must already be solved.')}</p><p class="scope-detail">${t('The darkened rows are not required and are treated as solved. No bottom face is needed.')}${state.stage === 'P' ? ` ${t('For PLL, the top face must already be one color.')}` : ''}</p>` : `<p>${t(state.mode === 'solve' ? 'Enter all six faces to solve the whole cube.' : 'Enter all six faces for Cross and F2L.')}</p>`}
    <p>${t('Select a color, then paint the stickers. Tap a center to set a different color scheme.')}</p>${lastLayer ? `<p class="scope-detail">${t('Set your centers before taking photos. A dimmed center can still be tapped to change the color scheme.')}</p>` : ''}</div>
    ${state.mode === 'solve' ? typedCubeInput(state.cubeText, state.scheme) : ''}
    <section class="photo-entry"><div><button class="primary" data-action="capture">${icon('camera', 19)}${t('Take photos')}</button><span class="photo-progress">${t('{count}/{total} faces added from photos', { count: state.photoFaces.filter((face) => faces.includes(face)).length, total: faces.length })}</span></div><p>${t(lastLayer ? 'Five faces: top, front, right, back and left. No bottom photo.' : 'Six faces: top, front, right, back, left and bottom.')}</p><p>${t('Take one photo of each face, or choose existing photos/screenshots. Review the colors before adding them.')}</p><small>${t('Photos stay on your device. Only the reviewed colors are kept for this practice session.')}</small></section>
    <div class="palette" aria-label="${t('Paint color')}">${engine.FACE_ORDER.map((face) => `<button data-action="color" data-value="${face}" style="--swatch:${colors[state.scheme[face]]}" class="${state.paint === face ? 'active' : ''}" aria-pressed="${state.paint === face}"><i></i><span>${t(state.scheme[face])}</span></button>`).join('')}</div>
    ${cubeNet(state.cube, state.scheme, true, { stage: state.stage, photoFaces: state.photoFaces })}
    <div class="editor-footer"><span>${engine.FACE_ORDER.map((face) => `<span class="color-count ${state.cube.filter((c) => c === face).length !== 9 ? 'wrong' : ''}"><i style="background:${colors[state.scheme[face]]}"></i>${state.cube.filter((c) => c === face).length}/9</span>`).join('')}</span><button class="text-button" data-action="reset-cube">${t('Reset to solved')}</button></div>`;
}
function cubePanel() {
  const c = state.result?.case || state.selected;
  const display = currentDisplay();
  const isEditor = state.source === 'mine' && !state.result;
  return `<section id="cube-practice" class="cube-panel panel ${isEditor ? 'cube-editor' : 'cube-preview'}">
    <div class="panel-heading"><span class="section-label">${state.source === 'mine' ? t('Your cube') : t('Case preview')}</span>${state.mode === 'solve' ? `<span class="full-solve-size">3 × 3</span>` : `<div class="segmented"><button data-action="source" data-value="library" class="${state.source === 'library' ? 'active' : ''}">${t('Case library')}</button><button data-action="source" data-value="mine" class="${isEditor ? 'active' : ''}">${state.result && state.source === 'mine' ? t('Edit colors') : t('Enter colors')}</button></div>`}</div>
    ${isEditor ? colorEditor() : `<div class="cube-stage"><div class="cube-stage-top"><span class="case-label">${c ? escape(c.name) : t(state.mode === 'solve' ? 'Full cube solution' : 'Cross practice')} <span>${c ? escape(caseTitle(c)) : t('Your next moves')}</span></span><button class="text-button view-toggle" data-action="view" aria-label="${t(state.view === 'front' ? 'Show back view' : 'Show front view')}">${state.view === 'front' ? t('Back view') : t('Front view')}</button></div><canvas class="turn-canvas" width="320" height="300" role="img" aria-label="${t('Animated Rubik’s cube showing top, front and right faces')}">${t('Your browser needs canvas support to show the turning cube.')}</canvas><div class="view-caption">${state.view === 'front' ? t('Viewing top, front and right') : t('Viewing top, back and left · keep your original grip')}</div></div><p class="holding-hint">${holdingText(display)}</p>${state.result ? playbackControls() : ''}`}
    <div class="cube-actions"><button class="secondary" data-action="${isEditor ? 'analyze' : state.source === 'mine' ? 'edit-cube' : 'random'}" ${state.busy ? 'disabled' : ''}>${icon(isEditor ? 'search' : state.source === 'mine' ? 'reset' : 'shuffle', 17)}${isEditor ? (state.busy ? t('Finding your solution…') : t(state.mode === 'solve' ? 'Solve my cube' : 'Find my algorithm')) : state.source === 'mine' ? t('Edit my cube') : (state.stage === 'C' ? t('New scramble') : t('Another case'))}</button>${state.source === 'library' ? `<button class="text-button" data-action="turn-u">${t('Add a U turn')}</button>` : `<span class="editor-note">${isEditor ? t(isLastLayerStage(state.stage) ? 'Top face + four side rows' : 'Six faces · 54 stickers') : t('Follow the same grip on your cube')}</span>`}</div>
    ${isEditor ? `<details class="input-guide"><summary>${t('How to hold each face while entering colors')}</summary><p>${t(isLastLayerStage(state.stage) ? 'For the top face, put the {back} side at the top of the grid. For all four side faces, keep the {top} center above the face and view it straight on. Do not mirror the back face.' : 'View every face directly from outside. For Front, Right, Back and Left, keep the {top} center above the face. For Top, the {back} side is at the top of the grid. For Bottom, the {front} side is at the top of the grid. Do not mirror the back face.', { top: t(state.scheme.U), back: t(state.scheme.B), front: t(state.scheme.F) })}</p><p>${t('For a different scheme, choose a palette color and tap a center. This swaps the two center colors throughout the diagram. Set centers before painting individual stickers.')}</p></details>` : ''}
  </section>`;
}
function algorithmPanel() {
  const result = state.result;
  const c = result?.case;
  const moves = tokens(result?.algorithm);
  return `<section class="algorithm-panel panel"><div class="panel-heading"><span class="section-label">${t('Your next moves')}</span>${c ? `<button class="icon-button ${state.learned.has(c.id) ? 'is-learned' : ''}" data-action="learned" data-id="${escape(c.id)}" aria-label="${state.learned.has(c.id) ? t('Mark as learning') : t('Mark case learned')}" title="${t('Mark learned')}">${icon('check')}</button>` : ''}</div>
    ${!result ? `<div class="result-empty"><span class="empty-symbol">${state.stage}</span><h2>${state.stage === 'C' ? t('Plan your cross') : t('Find your case')}</h2><p>${state.stage === 'C' ? t('Calculate a shortest solution for the four bottom edges of this cube.') : t(isLastLayerStage(state.stage) ? 'Enter the top layer, then find the algorithm. The darkened lower layers are assumed solved.' : 'Enter all six faces, then find the algorithm for this stage. The tool checks the earlier stages first.')}</p>${state.stage === 'C' ? `<button class="primary" data-action="analyze" ${state.busy ? 'disabled' : ''}>${state.busy ? t('Planning your cross…') : t('Calculate cross')} ${icon('arrow', 17)}</button>` : ''}</div>` : `<div class="algorithm-title"><span class="case-badge">${c ? escape(c.name) : state.stage === 'C' ? t('Cross solution') : t('Stage complete')}</span><h2>${c ? escape(caseTitle(c)) : moves.length ? t('A path to your cross') : state.stage === 'F' && !engine.isF2LSolved(state.cube) ? t('This pair is solved') : t('Ready for the next step')}</h2><p>${t(moves.length === 1 ? '{count} move' : '{count} moves', { count: moves.length })}${t(c ? ' · Recommended algorithm' : ' · Follow in this order')}</p></div>
    <div class="algorithm-toolbar"><span class="algorithm-position">${state.step === 0 ? t('Ready when you are') : state.step === moves.length ? t('Sequence complete') : t('Move {step} of {total}', { step: state.step, total: moves.length })}</span><button class="text-button" data-action="hide">${icon('eye', 16)} ${state.hide ? t('Reveal') : t('Hide')}</button></div>
    <div class="move-list ${state.hide ? 'hidden-alg' : ''}" aria-label="${t('Solution moves')}">${state.hide ? `<p>${t('Recognise it first.')}<br>${t('Reveal when you’re ready.')}</p>` : moves.length ? moves.map((move, i) => `<button class="move-token ${i < state.step ? 'played' : ''} ${i === state.step - 1 ? 'current' : ''}" data-action="jump" data-index="${i + 1}" aria-label="${t('Show cube after move {step}: {move}', { step: i + 1, move: escape(move) })}">${pretty(move)}</button>`).join('') : state.stage === 'F' && !engine.isF2LSolved(state.cube) ? `<p>${t('This pair is solved. Choose another target slot.')}</p>` : `<p>${t('No moves needed for this stage.')}</p>`}</div>
    ${result.setup || result.auf || result.extraction || result.slotRotation || result.regrip ? `<div class="alignment-note">${result.setup || result.extraction || result.slotRotation ? `<p><strong>${t('Preparation')}</strong> ${escape(pretty([result.slotRotation, result.extraction, result.setup].filter(Boolean).join(' ')))}</p>` : ''}${result.regrip ? `<p><strong>${t('Regrip')}</strong> ${escape(pretty(result.regrip))}</p>` : ''}${result.slotReturn ? `<p><strong>${t('Return to your grip')}</strong> ${escape(pretty(result.slotReturn))}</p>` : ''}${result.auf ? `<p><strong>${t('Final alignment')}</strong> ${escape(pretty(result.auf))}</p>` : ''}<small>${t('Already included in the sequence above.')}</small></div>` : ''}
    <div class="algorithm-footer"><button class="text-button" data-action="copy">${icon('copy', 16)}${t('Copy algorithm')}</button><button class="text-button" data-action="apply">${t('Use result')} ${icon('arrow', 16)}</button></div>
    ${engine.isSolved(sequenceEnd) ? `<details class="setup-details"><summary>${t('Set up this case on a solved cube')}</summary><p>${t('Start with {holding}. Execute these moves in order. Centers may rotate; finish holding the colors shown in the preview.', { holding: holdingText(sequenceEnd).replace('Hold ', '') })}</p><code>${escape(pretty(engine.invertAlgorithm(result.algorithm))) || t('Already solved')}</code></details>` : ''}`}
  </section>`;
}
function explainMove(move = '') {
  const face = { U: 'upper face', D: 'bottom face', R: 'right face', L: 'left face', F: 'front face', B: 'back face', M: 'middle slice (like L)', E: 'equatorial slice (like D)', S: 'standing slice (like F)', x: 'whole cube (like R)', y: 'whole cube (like U)', z: 'whole cube (like F)' };
  const name = face[move[0]] ? t(face[move[0]]) : t('{face} and its inner layer', { face: t(face[move[0]?.toUpperCase()] || 'face') });
  return t('Turn the {face} {direction}. Judge direction looking directly at that face.', { face: name, direction: t(move.includes('2') ? '180°' : move.includes("'") ? '90° counterclockwise' : '90° clockwise') });
}
function practiceView() {
  const stage = stages[state.stage];
  return `<div class="page-title"><div><span class="eyebrow">${t('A focused practice session')}</span><h1>${stage.title}</h1><p>${state.stage === 'O' ? t('Recognise the pattern. Turn the top {color}.', { color: t(state.scheme.U) }) : stage.subtitle}</p></div><button class="secondary read-link" data-action="chapter" data-value="${state.stage}">${icon('book', 17)}${t('Read this chapter')}</button></div><nav class="workspace-actions" aria-label="${t('Learning mode')}"><button class="primary" data-action="mode" data-value="algorithms">${icon('search', 17)}${t('Browse algorithms')}</button><button class="secondary" data-action="mode" data-value="timer">${icon('timer', 17)}${t('Open timer')}</button></nav>${stageTabs()}
  <div class="practice-context"><span><strong>${state.stage === 'F' ? t('Choose your target pair') : state.stage === 'O' ? t('Focus on {color} stickers, including the sides', { color: t(state.scheme.U) }) : state.stage === 'P' ? t('Match the top-layer side colors to the centers') : t('Keep your cross color on the bottom')}</strong></span>${state.stage === 'F' && state.source === 'mine' ? `<label>${t('Target slot')} <select id="slot"><option value="FR">${t('Front-right')}</option><option value="FL">${t('Front-left')}</option><option value="BR">${t('Back-right')}</option><option value="BL">${t('Back-left')}</option></select></label>` : `<span>${stage.count}</span>`}</div>
  ${state.error ? `<div class="alert error" role="alert"><strong>${t('Check your cube')}</strong><p>${escape(localizeError(state.error))}</p></div>` : ''}${state.notice ? `<div class="alert notice" role="status">${escape(state.notice === 'cube-updated' ? t('Cube updated. Continue with {stage}.', { stage: stages[state.stage].short.toLowerCase() }) : t(state.notice))}</div>` : ''}
  <div class="practice-grid">${cubePanel()}${algorithmPanel()}</div>
  ${state.source === 'library' || state.result ? `<details class="all-faces panel"><summary>${t('Inspect all six faces')} ${icon('chevron', 16)}</summary>${cubeNet(currentDisplay(), state.scheme)}</details>` : ''}
  `;
}
function fullSolveView() {
  return `<div class="full-solve-page"><div class="page-title"><div><h1>${t('I just want to solve it')}</h1><p>${t('Enter your cube. Get the moves. Follow the animation.')}</p></div></div>
    ${state.error ? `<div class="alert error" role="alert"><strong>${t('Check your cube')}</strong><p>${escape(localizeError(state.error))}</p></div>` : ''}
    ${state.notice ? `<div class="alert notice" role="status">${escape(t(state.notice))}</div>` : ''}
    <div class="practice-grid">${cubePanel()}${fullSolutionPanel({ result: state.result, busy: state.busy, status: state.solverStatus })}</div>
    ${state.result ? `<details class="all-faces panel"><summary>${t('Inspect all six faces')} ${icon('chevron', 16)}</summary>${cubeNet(currentDisplay(), state.scheme)}</details>` : ''}</div>`;
}
function algorithmsView() {
  return `<div class="page-title"><div><h1>${t('Algorithms')}</h1><p>${t('Choose a case, then practise its moves.')}</p></div><button class="secondary" data-action="mode" data-value="practice">${icon('back', 17)}${t('Back to practice')}</button></div>${stageTabs()}<div class="algorithm-browser">${libraryView()}${state.stage === 'C' ? `<button class="primary" data-action="practice-chapter">${t('Calculate cross')} ${icon('arrow', 17)}</button>` : ''}</div>`;
}
function readView() {
  const chapter = chapters[state.chapter];
  return `<div class="page-title read-title"><div><span class="eyebrow">${t('Chapter {number}', { number: `0${Object.keys(chapters).indexOf(state.chapter)}` })} <span> / ${chapter.time}</span></span><h1>${chapter.title}</h1><p>${chapter.subtitle}</p></div><button class="secondary ${state.completed.has(state.chapter) ? 'is-learned' : ''}" data-action="complete">${icon('check', 17)}${state.completed.has(state.chapter) ? t('Chapter complete') : t('Mark as read')}</button></div>
    <nav class="workspace-actions" aria-label="${t('Chapter actions')}"><button class="primary" data-action="chapter-algorithms">${icon('search', 17)}${t('Browse algorithms')}</button><button class="secondary" data-action="practice-chapter">${icon('practice', 17)}${t('Start practising')}</button></nav>
    <label class="mobile-chapters">${t('Choose a chapter')} <select id="chapter-select">${Object.entries(chapters).map(([key, ch], i) => `<option value="${key}" ${key === state.chapter ? 'selected' : ''}>0${i} · ${ch.title}${state.completed.has(key) ? ' ✓' : ''}</option>`).join('')}</select></label><div class="reading-grid"><article class="chapter-content"><p class="chapter-intro">${chapter.intro}</p>${chapter.sections.map((s) => `<section><h2>${s.title}</h2><p>${s.text}</p></section>`).join('')}<div class="practice-prompt"><span>${icon('practice', 22)}</span><div><h3>${t('Take it to your cube')}</h3><p>${chapter.drill}</p><button class="primary" data-action="practice-chapter">${t('Practise {stage}', { stage: state.chapter === 'N' ? t('a case') : stages[state.chapter].short.toLowerCase() })} ${icon('arrow', 17)}</button></div></div><div class="chapter-sources"><h3>${t('Keep learning')}</h3>${chapter.links.map(([label, url]) => `<a href="${url}" target="_blank" rel="noreferrer">${label} ${icon('arrow', 15)}</a>`).join('')}</div><div class="chapter-end"><button class="secondary" data-action="complete">${icon('check', 17)}${state.completed.has(state.chapter) ? t('Marked as read') : t('Mark chapter as read')}</button><button class="text-button" data-action="next-chapter">${state.chapter === 'P' ? t('Start practising') : t('Next chapter')} ${icon('arrow', 17)}</button></div></article>
    <aside class="reading-notes"><div class="panel notation-card"><span class="section-label">${t('Keep this nearby')}</span><h3>${t('A small notation guide')}</h3><dl><div><dt>R</dt><dd>${t('Clockwise quarter-turn')}</dd></div><div><dt>R′</dt><dd>${t('Counterclockwise quarter-turn')}</dd></div><div><dt>R2</dt><dd>${t('Half-turn (180°)')}</dd></div><div><dt>r</dt><dd>${t('Right two layers together')}</dd></div><div><dt>x / y / z</dt><dd>${t('Rotate the whole cube')}</dd></div><div><dt>AUF</dt><dd>${t('Align the upper face')}</dd></div></dl><p>${t('Clockwise is judged looking straight at the face being turned.')}</p></div><div class="learning-note"><span class="note-squares"><i></i><i></i><i></i></span><h3>${t('Understand. Repeat. Remember.')}</h3><p>${t('Learn a few cases well, then add more. A clear holding angle matters as much as the moves.')}</p></div></aside></div>`;
}
function filteredCases() {
  return cases.filter((c) => c.stage === state.stage && (state.group === 'all' || c.group === state.group) && (state.filter !== 'two-look' || twoLookIds.has(c.id)) && (state.filter !== 'learning' || !state.learned.has(c.id)) && `${c.name} ${caseTitle(c)} ${c.group} ${t(c.group)} ${c.algorithm}`.toLowerCase().includes(state.query.toLowerCase()));
}
function libraryCards() {
  const list = filteredCases();
  return `<div class="library-count">${t(list.length === 1 ? '{count} case' : '{count} cases', { count: list.length })}${state.filter === 'two-look' ? t(' · Follow the chapter for the order of the two looks') : ''}</div><div class="case-grid">${list.slice(0, state.caseLimit).map((c) => `<button class="case-card ${state.selected?.id === c.id && state.mode === 'practice' ? 'selected' : ''}" data-action="case" data-id="${escape(c.id)}">${c.stage === 'F' ? cubeSvg(getCaseState(c), state.scheme, { small: true }) : topSvg(getCaseState(c), state.scheme, c.stage === 'O')}<span><strong>${escape(c.name)}${state.learned.has(c.id) ? `<i class="learned-check">${icon('check', 14)}</i>` : ''}</strong><small>${escape(t(c.group))}</small><code>${escape(pretty(c.algorithm))}</code></span>${icon('chevron', 15)}</button>`).join('')}</div>${list.length > state.caseLimit ? `<button class="secondary load-cases" data-action="load-cases">${t('Show {count} more cases', { count: Math.min(12, list.length - state.caseLimit) })} <span>${t('{shown} of {total} shown', { shown: state.caseLimit, total: list.length })}</span></button>` : ''}${!list.length ? `<div class="no-cases"><h3>${t('No cases match yet')}</h3><p>${t('Try another name or clear the filters.')}</p><button class="secondary" data-action="clear-filters">${t('Clear filters')}</button></div>` : ''}`;
}
function libraryView() {
  if (state.stage === 'C') return `<div class="cross-tip"><strong>${t('Cross is a plan, not a case to memorise.')}</strong><p>${t('Compare the calculated route with your own, then practise planning it before the first turn.')}</p></div>`;
  const groups = [...new Set(cases.filter((c) => c.stage === state.stage).map((c) => c.group))];
  const selected = state.result?.case || state.selected;
  return `<section class="library-section ${state.mode === 'algorithms' ? 'read-library' : ''}"><div class="library-title"><div><h2>${t('{stage} case library', { stage: state.stage === 'F' ? 'F2L' : state.stage === 'O' ? 'OLL' : 'PLL' })} <span>${cases.filter((c) => c.stage === state.stage).length}</span></h2><p>${state.stage === 'O' ? t('{color} is the target color. Grey stickers can be any other color.', { color: t(state.scheme.U[0].toUpperCase() + state.scheme.U.slice(1)) }) : t('Choose a case to see its exact holding angle and follow the algorithm.')}</p></div></div><div class="library-filters"><label class="search-input">${icon('search', 18)}<input id="case-search" placeholder="${t('Search cases or patterns…')}" value="${escape(state.query)}" aria-label="${t('Search algorithm cases')}"></label><label><span class="sr-only">${t('Case group')}</span><select id="group"><option value="all">${t('All patterns')}</option>${groups.map((g) => `<option value="${escape(g)}" ${g === state.group ? 'selected' : ''}>${escape(t(g))}</option>`).join('')}</select></label><label><span class="sr-only">${t('Learning filter')}</span><select id="filter"><option value="all" ${state.filter === 'all' ? 'selected' : ''}>${t('All cases')}</option><option value="learning" ${state.filter === 'learning' ? 'selected' : ''}>${t('Still learning')}</option>${state.stage !== 'F' ? `<option value="two-look" ${state.filter === 'two-look' ? 'selected' : ''}>${t('Two-look essentials')}</option>` : ''}</select></label></div><div id="library-cards">${libraryCards()}</div>${selected?.stage === state.stage && selected?.alternatives?.length ? `<details class="alternatives panel"><summary>${t('Alternative algorithms for {case}', { case: escape(selected.name) })}</summary><p>${t('Each variation loads its own correct starting orientation. Try the one that feels natural in your hands.')}</p>${selected.alternatives.map((alg, i) => `<div><code>${escape(pretty(alg))}</code><button class="text-button" data-action="alternative" data-id="${escape(selected.id)}" data-index="${i}">${t('Practise variation')} ${icon('arrow', 15)}</button></div>`).join('')}</details>` : ''}<p class="library-source">${t('Recommended sequences, not a universal speed ranking. Case data:')} <a href="https://github.com/lukejacksonn/cube" target="_blank" rel="noreferrer">Luke Jackson</a> (MIT)${t('; OLL/PLL checked against')} <a href="https://jperm.net/algs/${state.stage === 'P' ? 'pll' : 'oll'}" target="_blank" rel="noreferrer">J Perm</a>. <a href="./ATTRIBUTION.md">${t('Sources & attribution')}</a></p></section>`;
}
function updatePlaybackUI(snapshot = playback.snapshot()) {
  const { step, total, activeIndex, move, playing, animating } = snapshot;
  const active = activeIndex !== null && activeIndex !== undefined;
  const running = playing || animating;
  const status = active
    ? t(running ? 'Turning {move} · move {step} of {total}' : 'Paused during {move} · move {step} of {total}', { move: pretty(move), step: activeIndex + 1, total })
    : step === total && total ? t('Sequence complete') : step ? t('Move {step} of {total} complete', { step, total }) : t('Ready when you are');
  document.querySelectorAll('.live-move, .algorithm-position').forEach((element) => { element.textContent = status; });
  const play = document.querySelector('[data-action="play"]');
  if (play) {
    const label = running ? t('Pause') : active ? t('Resume') : step === total && total ? t('Replay moves') : t('Play moves');
    play.innerHTML = `${icon(running ? 'pause' : 'practice', 18)}<span>${label}</span>`;
    play.setAttribute('aria-label', label);
    play.disabled = total === 0;
  }
  const back = document.querySelector('[data-action="step-back"]');
  const next = document.querySelector('[data-action="step"]');
  const restart = document.querySelector('[data-action="restart"]');
  if (back) back.disabled = step === 0 && !active;
  if (next) next.disabled = step >= total && !active;
  if (restart) restart.disabled = step === 0 && !active;
  document.querySelectorAll('.move-token').forEach((element, i) => {
    element.classList.toggle('played', i < step);
    element.classList.toggle('current', i === (active ? activeIndex : step - 1));
    if (i === (active ? activeIndex : step - 1)) element.setAttribute('aria-current', 'step');
    else element.removeAttribute('aria-current');
  });
  const explanation = document.querySelector('.move-explainer');
  if (explanation) explanation.textContent = move ? explainMove(move) : step ? explainMove(snapshot.moves[step - 1]) : t('Tap Next move to follow one turn at a time.');
  const hold = document.querySelector('.holding-hint');
  if (hold) hold.textContent = holdingText(snapshot.cube);
  const canvas = document.querySelector('.turn-canvas');
  if (canvas) canvas.setAttribute('aria-label', t('Rubik’s cube. {status}. {holding}.', { status, holding: holdingText(snapshot.cube) }));
  if (document.querySelector('.all-faces')?.open) updateInspection(snapshot.cube);
}
function updateInspection(cube = playback.snapshot().cube) {
  document.querySelectorAll('.all-faces .sticker').forEach((sticker, index) => {
    const face = engine.FACE_ORDER[Math.floor(index / 9)];
    const cell = index % 9;
    sticker.style.setProperty('--sticker', colors[state.scheme[cube[index]]]);
    sticker.setAttribute('aria-label', stickerLabel(face, cell, state.scheme[cube[index]]));
  });
}
function drawPausedFrame() {
  const snapshot = playback.snapshot();
  renderer?.draw(snapshot.cube, state.scheme, snapshot.reducedMotion ? null : snapshot.move, snapshot.progress, state.view);
}
function render() {
  timerMount?.destroy(); timerMount = null;
  mobileNav?.destroy(); mobileNav = null;
  const photoScope = isLastLayerStage(state.stage) ? 'last-layer' : 'full';
  if (state.mode === 'practice' && state.photoFaces.length && state.photoScope !== photoScope) {
    state.photoFaces = []; state.referenceColors = {};
  }
  if (state.mode === 'practice' && state.source === 'mine' && !state.result && isLastLayerStage(state.stage) && !engine.isF2LSolved(state.cube)) {
    state.cube = prepareInputCube(state.cube, state.stage);
  }
  renderInProgress = true;
  playback.pause();
  renderer?.destroy();
  renderer = null;
  previewObserver.disconnect();
  const algorithm = state.result?.algorithm || '';
  if (sequenceCube !== state.cube || sequenceAlgorithm !== algorithm) {
    sequenceCube = state.cube;
    sequenceAlgorithm = algorithm;
    playback.setSequence(state.cube, algorithm);
    sequenceEnd = engine.applyAlgorithm(state.cube, algorithm);
  }
  if (restoredStep !== null) { playback.seek(restoredStep); restoredStep = null; }
  app.classList.toggle('timer-screen', state.mode === 'timer');
  app.innerHTML = state.mode === 'timer'
    ? `<main id="main-content" class="timer-main">${timerView()}</main>`
    : `${sidebar()}<div class="main-shell">${header()}<main id="main-content">${state.mode === 'solve' ? fullSolveView() : state.mode === 'practice' ? practiceView() : state.mode === 'algorithms' ? algorithmsView() : readView()}<footer class="page-footer"><span>${t('Rubik’s cube practice')}</span><span>${t('One case at a time.')}</span></footer></main></div><div id="toast" class="toast" role="status"></div>`;
  renderInProgress = false;
  mobileNav = createMobileNav(app);
  if (state.mode === 'timer') timerMount = mountSolveTimer(document.querySelector('.solve-timer'), solveTimer);
  const canvas = document.querySelector('.turn-canvas');
  if (canvas) {
    renderer = createCubeRenderer(canvas);
    drawPausedFrame();
    previewObserver.observe(document.querySelector('#cube-practice'));
  }
  const slot = document.querySelector('#slot');
  if (slot) slot.value = state.slot;
  updatePlaybackUI();
}
function focusPractice() {
  document.querySelector('#cube-practice')?.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}
function focusHeading() {
  const heading = document.querySelector('#main-content h1, #main-content h2');
  if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
}
function toast(text) {
  const element = document.querySelector('#toast');
  if (!element) return;
  element.textContent = text; element.classList.add('visible');
  setTimeout(() => element.classList.remove('visible'), 2400);
}
async function analyze() {
  if (state.mode === 'solve') { await solveWholeCube(); return; }
  cancelWork(); state.error = ''; state.notice = ''; state.result = null; state.selected = null; state.step = 0;
  if (state.source === 'mine') state.cube = prepareInputCube(state.cube, state.stage);
  const validity = engine.validateCube(state.cube);
  if (!validity.valid) { state.error = validity.error || 'These stickers cannot form a legal cube. Check the colors and face orientation.'; render(); return; }
  if (state.stage !== 'C' && !engine.isCrossSolved(state.cube)) { state.error = 'Solve the bottom cross first: all four bottom edges must match their side centers. Select C to calculate it.'; render(); return; }
  if (['O', 'P'].includes(state.stage) && !engine.isF2LSolved(state.cube)) { state.error = 'Finish all four F2L slots before this stage. Select F to practise the first two layers.'; render(); return; }
  if (state.stage === 'P' && !engine.isOLLSolved(state.cube)) { state.error = 'Orient the top face first. Select O to find the OLL algorithm.'; render(); return; }
  if (state.stage === 'C') {
    state.busy = true; render();
    crossWorker = new Worker(new URL('./cross-worker.js', import.meta.url), { type: 'module' });
    crossWorker.onmessage = ({ data }) => {
      state.busy = false;
      if (data.error) state.error = data.error;
      else state.result = typeof data.result === 'string' ? { algorithm: data.result } : data.result;
      crossWorker.terminate(); crossWorker = null; render(); if (state.result) focusPractice();
    };
    crossWorker.onerror = () => { state.busy = false; state.error = 'The cross calculation could not start. Reload the page and try again.'; crossWorker?.terminate(); crossWorker = null; render(); };
    crossWorker.postMessage(state.cube);
    return;
  }
  try {
    const alreadyDone = state.stage === 'O' ? engine.isOLLSolved(state.cube) : state.stage === 'P' ? engine.isSolved(state.cube) : engine.isF2LSolved(state.cube);
    state.result = alreadyDone ? { algorithm: '' } : state.stage === 'O' ? engine.matchOLL(state.cube, cases.filter((c) => c.stage === 'O')) : state.stage === 'P' ? engine.matchPLL(state.cube, cases.filter((c) => c.stage === 'P')) : engine.matchF2L(state.cube, cases.filter((c) => c.stage === 'F'), state.slot);
    if (!state.result) state.error = state.stage === 'F' ? 'No standard case was found for this pair. Check the selected slot and the entered colors. If the target pair is already solved, choose another slot.' : 'No matching case was found. Check that every face is entered as viewed directly, especially the back and bottom.';
    if (state.result?.case) state.selected = state.result.case;
  } catch (error) { state.error = error.message; }
  render();
}
async function solveWholeCube() {
  cancelWork();
  const request = fullSolveRequest;
  state.error = ''; state.notice = ''; state.result = null; state.selected = null; state.step = 0;
  const validity = engine.validateCube(state.cube);
  if (!validity.valid) { state.error = validity.error; render(); return; }
  if (engine.isSolved(state.cube)) {
    state.result = { algorithm: '', moves: 0, solved: true };
    render(); focusPractice(); return;
  }
  state.busy = true; state.solverStatus = 'initializing'; render();
  try {
    const result = await fullSolver.solve([...state.cube]);
    if (request !== fullSolveRequest || state.mode !== 'solve') return;
    if (!engine.isSolved(engine.applyAlgorithm(state.cube, result.algorithm))) throw new Error('The solution could not be verified. Please try again.');
    state.result = result;
  } catch (error) {
    if (request !== fullSolveRequest || error.name === 'AbortError') return;
    state.error = error.message;
  }
  if (request === fullSolveRequest) { state.busy = false; render(); if (state.result) focusPractice(); }
}
async function captureFace(face, continueSequence = false) {
  if (state.source !== 'mine' || state.result || !inputFaces(state.stage).includes(face)) return;
  const wasBusy = state.busy;
  cancelWork();
  if (wasBusy) render();
  const request = photoRequest;
  const stage = state.stage;
  toast(t('Opening photo input…'));
  try {
    const { openPhotoCapture } = await import('./photo-capture.js');
    if (request !== photoRequest || state.source !== 'mine' || stage !== state.stage) return;
    document.querySelector('#toast')?.classList.remove('visible');
    photoCapture = openPhotoCapture({
      face, scheme: { ...state.scheme }, topLayerOnly: isLastLayerStage(stage),
      referenceColors: { ...state.referenceColors },
      onClose: () => { photoCapture = null; },
      onApply: ({ colors: faceColors, sampleCenter }) => {
        if (request !== photoRequest || stage !== state.stage || state.source !== 'mine') return;
        state.cube = applyFaceColors(state.cube, face, faceColors, stage);
        if (sampleCenter?.length === 3) state.referenceColors[face] = sampleCenter;
        if (!state.photoFaces.includes(face)) state.photoFaces.push(face);
        state.photoScope = isLastLayerStage(stage) ? 'last-layer' : 'full';
        state.error = ''; state.notice = ''; state.selected = null; state.step = 0;
        render();
        const next = inputFaces(stage).find((candidate) => !state.photoFaces.includes(candidate));
        if (continueSequence && next) captureFace(next, true);
        else {
          toast(t('{face} colors added. Review the stickers before finding an algorithm.', { face: t(faceNames[face]) }));
          document.querySelector(`[data-action="capture-face"][data-face="${face}"]`)?.focus({ preventScroll: true });
        }
      },
    });
  } catch {
    if (request === photoRequest) toast(t('Photo input could not open. Please try again.'));
  }
}
app.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, value, id, index } = button.dataset;
  if (state.mode === 'solve' && ((action === 'mode' && value !== 'solve') || action === 'chapter')) {
    cancelWork(); fullWorkspace = saveWorkspace(); restoreWorkspace(practiceWorkspace);
  }
  if (action === 'capture') await captureFace(inputFaces(state.stage).find((face) => !state.photoFaces.includes(face)) || 'U', true);
  if (action === 'capture-face') await captureFace(button.dataset.face);
  if (action === 'mode') {
    const previousMode = state.mode;
    cancelWork(); state.mode = value;
    if (value === 'solve' && previousMode !== 'solve') {
      practiceWorkspace = saveWorkspace();
      restoreWorkspace(fullWorkspace || { stage: 'C', source: 'mine', selected: null, cube: engine.solvedCube(), scheme: { ...defaultScheme }, paint: 'U', slot: 'FR', result: null, step: 0, hide: false, view: 'front', photoFaces: [], referenceColors: {}, photoScope: 'full', cubeText: '', error: '', notice: '' });
      fullSolver.warmup().catch(() => { /* A solve request reports initialization failures with a retry. */ });
    }
    if (value === 'practice' && state.practiceStage !== state.stage) {
      state.stage = state.practiceStage;
      state.query = ''; state.group = 'all'; state.filter = 'all'; state.caseLimit = 12;
    }
    render();
    window.scrollTo({ top: 0 });
  }
  if (action === 'chapter-algorithms') {
    cancelWork(); state.mode = 'algorithms'; setStage(state.chapter === 'N' ? 'O' : state.chapter);
    window.scrollTo({ top: 0 });
  }
  if (action === 'chapter') { cancelWork(); state.mode = 'read'; state.chapter = value; if (value !== 'N') state.stage = value; state.query = ''; state.group = 'all'; state.filter = 'all'; render(); window.scrollTo({ top: 0 }); }
  if (action === 'stage') setStage(value);
  if (action === 'case') { loadCase(cases.find((c) => c.id === id)); state.mode = 'practice'; render(); focusPractice(); }
  if (action === 'alternative') { const c = cases.find((c) => c.id === id); loadCase({ ...c, algorithm: c.alternatives[Number(index)] }); state.mode = 'practice'; render(); focusPractice(); }
  if (action === 'source') {
    cancelWork();
    if (value === 'library') { state.mode = 'algorithms'; render(); window.scrollTo({ top: 0 }); }
    else { state.source = value; state.step = 0; state.error = ''; state.notice = ''; state.result = null; state.selected = null; state.cube = prepareInputCube(state.cube, state.stage); render(); }
  }
  if (action === 'color') { state.paint = value; render(); }
  if (action === 'paint') {
    cancelWork(); const idx = Number(index);
    if (idx % 9 === 4) { const face = engine.FACE_ORDER[Math.floor(idx / 9)]; [state.scheme[face], state.scheme[state.paint]] = [state.scheme[state.paint], state.scheme[face]]; state.paint = face; state.referenceColors = {}; state.photoFaces = []; }
    else if (editableIndices(state.stage).includes(idx)) { state.cube = [...state.cube]; state.cube[idx] = state.paint; }
    state.result = null; state.step = 0; state.error = ''; render();
  }
  if (action === 'reset-cube') { cancelWork(); state.cube = engine.solvedCube(); state.photoFaces = []; state.referenceColors = {}; state.result = null; state.selected = null; state.error = ''; state.step = 0; render(); }
  if (action === 'import-cube-text') {
    cancelWork(); state.error = ''; state.notice = '';
    try {
      const cube = parseCubeText(state.cubeText, state.scheme);
      state.cube = cube; state.result = null; state.selected = null; state.step = 0;
      state.photoFaces = []; state.referenceColors = {};
      state.notice = 'Colors imported. Check the six faces, then solve your cube.';
    } catch (error) { state.error = error.message; }
    render();
  }
  if (action === 'cancel-solve') { cancelWork(); state.notice = 'Calculation cancelled. Your colors are still here.'; render(); }
  if (action === 'random') { if (state.stage === 'C') { setStage('C'); const moves = ['U', 'D', 'R', 'L', 'F', 'B']; state.cube = engine.applyAlgorithm(engine.solvedCube(), Array.from({ length: 20 }, () => moves[Math.floor(Math.random() * 6)] + ['', "'", '2'][Math.floor(Math.random() * 3)]).join(' ')); render(); } else { const pool = filteredCases(); if (pool.length) { loadCase(pool[Math.floor(Math.random() * pool.length)]); render(); } else toast(t('Clear your filters to practise another case.')); } }
  if (action === 'analyze') { await analyze(); if (state.result) focusPractice(); }
  if (action === 'turn-u') { cancelWork(); state.cube = engine.applyAlgorithm(state.cube, 'U'); await analyze(); }
  if (action === 'hide') {
    state.hide = !state.hide;
    const list = document.querySelector('.move-list');
    list.classList.toggle('hidden-alg', state.hide);
    list.innerHTML = state.hide ? `<p>${t('Recognise it first.')}<br>${t('Reveal when you’re ready.')}</p>` : playback.snapshot().moves.map((move, i) => `<button class="move-token" data-action="jump" data-index="${i + 1}" aria-label="${t('Show cube after move {step}: {move}', { step: i + 1, move: escape(move) })}">${pretty(move)}</button>`).join('');
    button.innerHTML = `${icon('eye', 16)} ${state.hide ? t('Reveal') : t('Hide')}`;
    updatePlaybackUI();
  }
  if (action === 'view') {
    state.view = state.view === 'front' ? 'back' : 'front';
    button.textContent = state.view === 'front' ? t('Back view') : t('Front view');
    button.setAttribute('aria-label', t(state.view === 'front' ? 'Show back view' : 'Show front view'));
    document.querySelector('.view-caption').textContent = state.view === 'front' ? t('Viewing top, front and right') : t('Viewing top, back and left · keep your original grip');
    drawPausedFrame();
  }
  if (action === 'edit-cube') { cancelWork(); state.result = null; state.selected = null; render(); }
  if (action === 'load-cases') { state.caseLimit += 12; document.querySelector('#library-cards').innerHTML = libraryCards(); }
  if (action === 'restart') playback.seek(0);
  if (action === 'step-back') playback.previous();
  if (action === 'step') playback.next();
  if (action === 'jump') playback.seek(Number(index));
  if (action === 'play') { const snapshot = playback.snapshot(); if (snapshot.playing || snapshot.animating) playback.pause(); else playback.play(); }
  if (action === 'copy') { try { await navigator.clipboard.writeText(state.result.algorithm); toast(t('Algorithm copied')); } catch { toast(t('Select the move text and copy it manually.')); } }
  if (action === 'learned') {
    if (state.learned.has(id)) state.learned.delete(id); else state.learned.add(id);
    persist();
    button.classList.toggle('is-learned', state.learned.has(id));
    button.setAttribute('aria-label', state.learned.has(id) ? t('Mark as learning') : t('Mark case learned'));
    document.querySelector('.progress-box p').textContent = t('{count} of 119 cases marked learned', { count: state.learned.size });
    const library = document.querySelector('#library-cards');
    if (library) library.innerHTML = libraryCards();
  }
  if (action === 'complete') { if (state.completed.has(state.chapter)) state.completed.delete(state.chapter); else state.completed.add(state.chapter); persist(); render(); }
  if (action === 'apply') {
    cancelWork(); const next = engine.applyAlgorithm(state.cube, state.result.algorithm);
    // Relabel stickers to their current centers, keeping the real colors in the scheme.
    const remap = {}, nextScheme = {};
    engine.FACE_ORDER.forEach((face, i) => { remap[next[i * 9 + 4]] = face; nextScheme[face] = state.scheme[next[i * 9 + 4]]; });
    state.cube = next.map((c) => remap[c]); state.scheme = nextScheme; state.source = 'mine'; state.result = null; state.selected = null; state.step = 0;
    state.photoFaces = []; state.referenceColors = {};
    state.stage = !engine.isCrossSolved(state.cube) ? 'C' : !engine.isF2LSolved(state.cube) ? 'F' : !engine.isOLLSolved(state.cube) ? 'O' : 'P';
    state.practiceStage = state.stage;
    state.query = ''; state.group = 'all'; state.filter = 'all';
    state.notice = engine.isSolved(state.cube) ? 'Solved! All six faces match their centers. Choose a new case whenever you’re ready.' : 'cube-updated'; render();
  }
  if (action === 'practice-chapter') { state.mode = 'practice'; state.source = 'library'; setStage(state.chapter === 'N' ? 'O' : state.chapter); window.scrollTo({ top: 0 }); }
  if (action === 'next-chapter') { const keys = Object.keys(chapters), next = keys[keys.indexOf(state.chapter) + 1]; if (next) { state.chapter = next; state.stage = next; state.query = ''; state.group = 'all'; state.filter = 'all'; render(); } else { state.mode = 'practice'; state.source = 'library'; setStage('P'); } window.scrollTo({ top: 0 }); }
  if (action === 'clear-filters') { state.caseLimit = 12; state.query = ''; state.group = 'all'; state.filter = 'all'; render(); }
  if (['mode', 'chapter', 'chapter-algorithms', 'practice-chapter', 'next-chapter', 'case', 'alternative'].includes(action)) focusHeading();
  if (action === 'stage') document.querySelector(`[data-action="stage"][data-value="${value}"]`)?.focus({ preventScroll: true });
});
app.addEventListener('toggle', (event) => { if (event.target.matches('.all-faces') && event.target.open) updateInspection(); }, true);
app.addEventListener('input', (event) => {
  if (event.target.id === 'cube-text') state.cubeText = event.target.value;
  if (event.target.id === 'case-search') { state.query = event.target.value; state.caseLimit = 12; document.querySelector('#library-cards').innerHTML = libraryCards(); }
});
app.addEventListener('change', (event) => {
  if (event.target.id === 'language-select') {
    setLocale(event.target.value);
    stages = getLocale() === 'zh-HK' ? chineseStages : englishStages;
    chapters = getLocale() === 'zh-HK' ? chineseChapters : englishChapters;
    render();
    document.querySelector('#language-select')?.focus({ preventScroll: true });
  }
  if (event.target.id === 'chapter-select') { cancelWork(); state.chapter = event.target.value; if (state.chapter !== 'N') state.stage = state.chapter; state.query = ''; state.group = 'all'; state.filter = 'all'; render(); }
  if (event.target.id === 'speed') { state.speed = Number(event.target.value); playback.setSpeed(state.speed); persist(); }
  if (event.target.id === 'slot') { cancelWork(); state.slot = event.target.value; state.result = null; state.error = ''; render(); }
  if (['group', 'filter'].includes(event.target.id)) { state[event.target.id] = event.target.value; state.caseLimit = 12; document.querySelector('#library-cards').innerHTML = libraryCards(); }
});
try {
  const response = await fetch(new URL('./cases.json', import.meta.url));
  if (!response.ok) throw new Error('The algorithm library could not be loaded.');
  cases = await response.json();
  loadCase(cases.find((c) => c.id === 'oll-27'));
  render();
} catch (error) {
  app.innerHTML = `<div class="loading"><h1>${t('Let’s try that again')}</h1><p>${escape(localizeError(error.message))}</p><a href="./index.html">${t('Reload the practice space')}</a></div>`;
}
