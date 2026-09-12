import { FACE_ORDER, validateCube } from './cube-engine.js';
import { defaultScheme } from './cube-view.js';

// Each face is read row by row, viewed directly from outside the cube.
// Whitespace and commas separate stickers, rows or faces without changing order.
export function parseCubeText(text, scheme = defaultScheme) {
  const letters = String(text ?? '').replace(/[\s,]/g, '').toUpperCase();
  if (/[^YRGWOBUFDL]/.test(letters)) {
    throw new Error('Use sticker letters only: colors Y R G W O B, or faces U R F D L B. Do not enter move notation.');
  }
  if (letters.length !== 54) {
    throw new Error('Enter all 54 stickers: 9 for each face in U R F D L B order.');
  }

  const usesColors = /[YGWO]/.test(letters);
  const usesFaces = /[UFDL]/.test(letters);
  if (usesColors && usesFaces) {
    throw new Error('Use either color initials or face letters for the whole cube; do not mix the two.');
  }
  if (!usesColors && !usesFaces) {
    throw new Error('Use all six colors (Y R G W O B) or all six faces (U R F D L B).');
  }

  let cube = [...letters];
  if (usesColors) {
    const palette = ['yellow', 'red', 'green', 'white', 'orange', 'blue'];
    const faceColors = FACE_ORDER.map(face => scheme?.[face]);
    if (new Set(faceColors).size !== 6 || faceColors.some(color => !palette.includes(color))) {
      throw new Error('The color scheme must use yellow, red, green, white, orange and blue exactly once.');
    }
    const colorFaces = new Map(FACE_ORDER.map((face, index) => [faceColors[index][0].toUpperCase(), face]));
    cube = cube.map(color => colorFaces.get(color));
  }

  if (FACE_ORDER.some((face, index) => cube[index * 9 + 4] !== face)) {
    throw new Error('Center stickers must match the current color scheme and U R F D L B face order.');
  }
  const validation = validateCube(cube);
  if (!validation.valid) throw new Error(validation.error);
  return cube;
}
