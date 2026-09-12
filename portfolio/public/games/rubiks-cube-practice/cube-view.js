import { FACE_ORDER } from './cube-engine.js';
import { t } from './i18n.js';
import { editableIndices, inputFaces, isLastLayerStage } from './input-model.js';

export const colors = { yellow: '#ffd643', red: '#ee5c5b', green: '#35b78a', white: '#ffffff', orange: '#ff9c45', blue: '#5388ee' };
export const defaultScheme = { U: 'yellow', R: 'red', F: 'green', D: 'white', L: 'orange', B: 'blue' };
export const faceNames = { U: 'Top', R: 'Right', F: 'Front', D: 'Bottom', L: 'Left', B: 'Back' };

export function stickerLabel(face, index, color) {
  const values = { face: t(faceNames[face]), row: Math.floor(index / 3) + 1, column: index % 3 + 1, color: t(color) };
  return t(index === 4 ? '{face} center: {color}' : '{face} row {row} column {column}: {color}', values);
}

export function cubeSvg(cube, scheme = defaultScheme, { small = false, orientationOnly = false } = {}) {
  const planes = { U: [[160, 24], [286, 87], [34, 87]], F: [[34, 87], [160, 150], [34, 229]], R: [[160, 150], [286, 87], [160, 292]] };
  const point = (p, u, v) => [p[0][0] + (p[1][0] - p[0][0]) * u + (p[2][0] - p[0][0]) * v, p[0][1] + (p[1][1] - p[0][1]) * u + (p[2][1] - p[0][1]) * v].join(',');
  let paths = '';
  for (const [face, p] of Object.entries(planes)) {
    const offset = FACE_ORDER.indexOf(face) * 9;
    for (let i = 0; i < 9; i++) {
      const r = Math.floor(i / 3), c = i % 3, pad = 0.011;
      const fill = orientationOnly && cube[offset + i] !== 'U' ? '#b9c3d2' : colors[scheme[cube[offset + i]]] || '#b9c3d2';
      const points = [point(p, c / 3 + pad, r / 3 + pad), point(p, (c + 1) / 3 - pad, r / 3 + pad), point(p, (c + 1) / 3 - pad, (r + 1) / 3 - pad), point(p, c / 3 + pad, (r + 1) / 3 - pad)];
      paths += `<polygon points="${points.join(' ')}" fill="${fill}" stroke="#23314b" stroke-width="3" stroke-linejoin="round"/>`;
    }
  }
  return `<svg class="cube-svg ${small ? 'small' : ''}" viewBox="0 0 320 330" role="img" aria-label="${t('Cube diagram showing top, front and right faces')}"><ellipse cx="160" cy="313" rx="88" ry="10" fill="#23314b" opacity=".065"/>${paths}</svg>`;
}

export function topSvg(cube, scheme = defaultScheme, orientationOnly = false) {
  const cell = (x, y, idx, size = 19) => {
    const fill = orientationOnly && cube[idx] !== 'U' ? '#d4dce7' : colors[scheme[cube[idx]]] || '#d4dce7';
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="2" fill="${fill}" stroke="#26364d" stroke-width="1.2"/>`;
  };
  let out = '';
  for (let i = 0; i < 9; i++) out += cell(24 + (i % 3) * 21, 24 + Math.floor(i / 3) * 21, i);
  for (let i = 0; i < 3; i++) {
    out += cell(24 + i * 21, 5, 45 + 2 - i, 16);
    out += cell(24 + i * 21, 89, 18 + i, 16);
    out += cell(5, 24 + i * 21, 36 + i, 16);
    out += cell(89, 24 + i * 21, 9 + 2 - i, 16);
  }
  return `<svg viewBox="0 0 110 110" class="top-svg" role="img" aria-label="${t('Top face with back, left, right and front side stickers')}">${out}</svg>`;
}

export function cubeNet(cube, scheme = defaultScheme, editable = false, { stage = null, photoFaces = [] } = {}) {
  const stageEditor = editable && stage !== null;
  const lastLayer = stageEditor && isLastLayerStage(stage);
  const faces = stageEditor ? inputFaces(stage) : FACE_ORDER;
  const required = new Set(editableIndices(stage));
  return `<div class="cube-net ${editable ? 'editable' : ''} ${lastLayer ? 'last-layer' : ''}">${faces.map(face => {
    const offset = FACE_ORDER.indexOf(face) * 9;
    const capture = stageEditor ? `<button type="button" class="capture-face ${photoFaces.includes(face) ? 'photo-captured' : ''}" data-action="capture-face" data-face="${face}">${t(photoFaces.includes(face) ? 'Retake {face} photo' : 'Photograph {face}', { face: t(faceNames[face]) })}</button>` : '';
    const stickers = cube.slice(offset, offset + 9).map((value, index) => {
      const reference = lastLayer && face !== 'U' && index === 4;
      const ignored = lastLayer && !required.has(offset + index) && !reference;
      const label = reference ? t('{face} color reference: {color}', { face: t(faceNames[face]), color: t(scheme[value]) }) : stickerLabel(face, index, scheme[value]);
      return `<button type="button" class="sticker ${index === 4 ? 'center' : ''} ${ignored ? 'ignored-sticker' : ''} ${reference ? 'color-reference' : ''}" style="--sticker:${colors[scheme[value]]}" ${editable && !ignored ? `data-action="paint" data-index="${offset + index}"` : 'disabled'} aria-label="${label}">${index === 4 ? face : ''}</button>`;
    }).join('');
    return `<div class="net-face face-${face}"><span>${t(faceNames[face])} <b>${face}</b></span>${capture}<div class="face-grid">${stickers}</div></div>`;
  }).join('')}</div>`;
}
