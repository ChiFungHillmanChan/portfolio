import { FACE_ORDER } from './cube-engine.js';

const LAST_LAYER_FACES = ['U', 'F', 'R', 'B', 'L'];
const ALL_INPUT_FACES = [...LAST_LAYER_FACES, 'D'];

export function isLastLayerStage(stage) {
  return stage === 'O' || stage === 'P';
}

export function inputFaces(stage) {
  return [...(isLastLayerStage(stage) ? LAST_LAYER_FACES : ALL_INPUT_FACES)];
}

export function editableIndices(stage) {
  return inputFaces(stage).flatMap(face => {
    const offset = FACE_ORDER.indexOf(face) * 9;
    const count = isLastLayerStage(stage) && face !== 'U' ? 3 : 9;
    return Array.from({ length: count }, (_, index) => offset + index);
  });
}

// OLL/PLL assume both lower layers are already solved. Reconstruct those fixed
// stickers without altering the entered last layer or bypassing cube validation.
export function prepareInputCube(cube, stage) {
  if (!Array.isArray(cube) || cube.length !== 54) throw new Error('A cube needs 54 stickers.');
  if (!isLastLayerStage(stage)) return [...cube];
  const required = new Set(editableIndices(stage));
  return cube.map((value, index) => required.has(index) && index % 9 !== 4
    ? value : FACE_ORDER[Math.floor(index / 9)]);
}

export function applyFaceColors(cube, face, faceColors, stage) {
  if (!FACE_ORDER.includes(face)) throw new Error('Choose a valid cube face.');
  if (!Array.isArray(faceColors) || faceColors.length !== 9) throw new Error('A face needs nine sticker colors.');
  if (faceColors.some(value => !FACE_ORDER.includes(value))) throw new Error('Choose a valid color for every sticker.');
  const result = prepareInputCube(cube, stage);
  const required = new Set(editableIndices(stage));
  const offset = FACE_ORDER.indexOf(face) * 9;
  faceColors.forEach((value, index) => {
    if (index !== 4 && required.has(offset + index)) result[offset + index] = value;
  });
  return result;
}
