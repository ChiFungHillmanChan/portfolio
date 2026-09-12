import { t } from './i18n.js';
import { colors as colorHex, faceNames, stickerLabel } from './cube-view.js?v=20260912-photo';
import { sampleFace, validateCorners, projection } from './photo-colors.js?v=20260912-photo';

const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
const CORNERS = ['Top left corner', 'Top right corner', 'Bottom right corner', 'Bottom left corner'];
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_SIZE = 1200;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(label, className, action) {
  const element = node('button', className, t(label));
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}

// A still image is decoded only after the user chooses it. There is no camera stream.
export function openPhotoCapture({ face, scheme, topLayerOnly = false, referenceColors = {}, onApply, onClose }) {
  const opener = document.activeElement;
  const sideRowOnly = topLayerOnly && face !== 'U';
  const dialog = node('dialog', 'photo-dialog');
  dialog.setAttribute('aria-labelledby', 'photo-capture-title');
  const content = node('div', 'photo-dialog-content');
  const heading = node('div', 'photo-heading');
  const title = node('h2', '', t('Add a photo of the {face} face', { face: t(faceNames[face]) }));
  title.id = 'photo-capture-title';
  const closeButton = button('Close photo input', 'photo-close', close);
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', t('Close photo input'));
  heading.append(title, closeButton);
  const description = node('p', 'photo-copy', t('Take one clear photo, or choose an existing photo or screenshot. Photos stay on this device.'));
  const orientation = node('p', 'photo-orientation', t(face === 'U'
    ? 'Photograph the top face with the back edge at the top of the photo.'
    : face === 'D' ? 'Photograph the bottom face with the front edge at the top of the photo.'
      : 'Keep the top face above this side. The center should be {color}.', { color: t(scheme[face]) }));
  const status = node('p', 'photo-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const pickers = node('div', 'photo-picker-actions');
  const cameraInput = node('input');
  const galleryInput = node('input');
  for (const input of [cameraInput, galleryInput]) {
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.addEventListener('change', () => loadFile(input.files?.[0]));
  }
  cameraInput.setAttribute('capture', 'environment');
  pickers.append(button('Take a photo', 'primary', () => { cameraInput.value = ''; cameraInput.click(); }),
    button('Choose a photo or screenshot', 'secondary', () => { galleryInput.value = ''; galleryInput.click(); }));

  const alignment = node('section', 'photo-alignment');
  alignment.hidden = true;
  const alignHeading = node('h3', '', t('Align the four corners'));
  const instructions = node('p', 'photo-copy', t('Drag the four numbered handles to the outer corners of one cube face. Avoid glare and keep the full face in view.'));
  const frame = node('div', 'photo-frame');
  const preview = node('canvas', 'photo-preview');
  preview.setAttribute('role', 'img');
  preview.setAttribute('aria-label', t('Photo of the {face} face with an adjustable sampling grid', { face: t(faceNames[face]) }));
  frame.append(preview);
  const handles = CORNERS.map((name, index) => {
    const handle = node('button', 'photo-corner', String(index + 1));
    handle.type = 'button';
    handle.setAttribute('aria-label', t(name));
    handle.setAttribute('aria-describedby', 'photo-corner-keys');
    handle.addEventListener('pointerdown', event => {
      if (!source || event.button > 0) return;
      event.preventDefault();
      handle.focus({ preventScroll: true });
      handle.setPointerCapture(event.pointerId);
      drag = { index, pointerId: event.pointerId };
    });
    handle.addEventListener('pointermove', event => {
      if (drag?.index !== index || drag.pointerId !== event.pointerId) return;
      const rect = frame.getBoundingClientRect();
      moveCorner(index, (event.clientX - rect.left) * source.width / rect.width, (event.clientY - rect.top) * source.height / rect.height);
    });
    const finishDrag = () => { drag = null; };
    handle.addEventListener('pointerup', finishDrag);
    handle.addEventListener('pointercancel', finishDrag);
    handle.addEventListener('lostpointercapture', finishDrag);
    handle.addEventListener('keydown', event => {
      const offsets = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!source || !offsets[event.key]) return;
      event.preventDefault();
      const step = (event.shiftKey ? 10 : 2) * source.width / Math.max(frame.clientWidth, 1);
      moveCorner(index, corners[index].x + offsets[event.key][0] * step, corners[index].y + offsets[event.key][1] * step);
    });
    frame.append(handle);
    return handle;
  });
  const keys = node('p', 'photo-key-hint', t('Use arrow keys to adjust the selected corner. Hold Shift for a larger step.'));
  keys.id = 'photo-corner-keys';
  const alignmentActions = node('div', 'photo-alignment-actions');
  const rotateButton = button('Rotate photo 90°', 'secondary', rotatePhoto);
  const readButton = button('Read colors', 'primary', readColors);
  alignmentActions.append(rotateButton, readButton);
  alignment.append(alignHeading, instructions);
  if (sideRowOnly) alignment.append(node('p', 'photo-focus-hint', t('Include the whole face and its center. Only the top row will be added; the lower two rows are darkened.')));
  alignment.append(frame, keys, alignmentActions);

  const review = node('section', 'photo-review');
  review.hidden = true;
  const footer = node('div', 'photo-footer');
  footer.append(button('Cancel photo input', 'text-button', close));
  content.append(heading, description, orientation, pickers, cameraInput, galleryInput, status, alignment, review, footer);
  dialog.append(content);
  document.body.append(dialog);
  const oldOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  let closed = false;
  let source = null;
  let corners = [];
  let result = null;
  let selected = 0;
  let drag = null;
  let objectUrl = null;
  let loadingImage = null;
  let loadVersion = 0;
  const backgroundStates = [];

  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  try {
    if (typeof dialog.showModal !== 'function') throw new Error('Native dialog is unavailable');
    dialog.showModal();
  } catch {
    dialog.setAttribute('open', '');
    dialog.dataset.fallback = 'true';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    for (const sibling of document.body.children) {
      if (sibling === dialog) continue;
      backgroundStates.push([sibling, sibling.inert]);
      sibling.inert = true;
    }
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll('button, input, select, [tabindex="0"]')).filter(element => !element.disabled && !element.closest('[hidden]'));
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
  }
  pickers.querySelector('button')?.focus();

  function setStatus(message, error = false) {
    status.textContent = t(message);
    status.classList.toggle('photo-error', error);
  }

  function releaseImage() {
    if (loadingImage) { loadingImage.onload = null; loadingImage.onerror = null; loadingImage.src = ''; loadingImage = null; }
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
  }

  function close() {
    if (closed) return;
    closed = true;
    drag = null;
    loadVersion++;
    releaseImage();
    if (source) { source.width = 0; source.height = 0; source = null; }
    preview.width = 0;
    preview.height = 0;
    cameraInput.value = '';
    galleryInput.value = '';
    result = null;
    if (typeof dialog.close === 'function') dialog.close();
    dialog.remove();
    backgroundStates.forEach(([element, inert]) => { element.inert = inert; });
    document.body.style.overflow = oldOverflow;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    onClose?.();
  }

  function invalidateReview() {
    result = null;
    review.hidden = true;
    review.replaceChildren();
  }

  function loadFile(file) {
    if (closed || !file) return;
    if (file.size > MAX_FILE_BYTES) { setStatus('Choose an image smaller than 20 MB.', true); return; }
    if (file.type && !file.type.startsWith('image/')) { setStatus('Choose a photo or image file.', true); return; }
    releaseImage();
    const version = ++loadVersion;
    invalidateReview();
    alignment.hidden = true;
    setStatus('Loading photo…');
    objectUrl = URL.createObjectURL(file);
    loadingImage = new Image();
    loadingImage.onload = () => {
      if (closed || version !== loadVersion) return;
      try {
        const image = loadingImage;
        const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
        if (!image.naturalWidth || !image.naturalHeight) { releaseImage(); setStatus('This image could not be opened. Try a JPEG, PNG or another photo.', true); return; }
        if (source) { source.width = 0; source.height = 0; }
        source = document.createElement('canvas');
        source.width = Math.max(1, Math.round(image.naturalWidth * scale));
        source.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = source.getContext('2d', { willReadFrequently: true });
        if (!context) { releaseImage(); setStatus('Photo editing is unavailable in this browser. Enter the colors manually instead.', true); return; }
        context.drawImage(image, 0, 0, source.width, source.height);
        releaseImage();
        resetCorners();
        alignment.hidden = false;
        draw();
        setStatus('The photo is ready. Align the four corners, then read the colors.');
        alignHeading.tabIndex = -1;
        alignHeading.focus({ preventScroll: true });
        alignment.scrollIntoView({ block: 'nearest' });
      } catch {
        releaseImage();
        alignment.hidden = true;
        setStatus('This image could not be opened. Try a JPEG, PNG or another photo.', true);
      }
    };
    loadingImage.onerror = () => {
      if (closed || version !== loadVersion) return;
      releaseImage();
      setStatus('This image could not be opened. Try a JPEG, PNG or another photo.', true);
    };
    loadingImage.src = objectUrl;
  }

  function resetCorners() {
    const size = Math.min(source.width, source.height) * .72;
    const left = (source.width - size) / 2, top = (source.height - size) / 2;
    corners = [{ x: left, y: top }, { x: left + size, y: top }, { x: left + size, y: top + size }, { x: left, y: top + size }];
  }

  function moveCorner(index, x, y) {
    corners[index] = { x: Math.max(0, Math.min(source.width - 1, x)), y: Math.max(0, Math.min(source.height - 1, y)) };
    if (result) invalidateReview();
    draw();
  }

  function point(u, v) {
    if (validateCorners(corners, source.width, source.height)) return projection(corners)(u, v);
    // Keep invalid corner positions visible so they can be corrected.
    const [a, b, c, d] = corners;
    return { x: a.x * (1-u) * (1-v) + b.x * u * (1-v) + c.x * u * v + d.x * (1-u) * v,
      y: a.y * (1-u) * (1-v) + b.y * u * (1-v) + c.y * u * v + d.y * (1-u) * v };
  }

  function draw() {
    if (closed || !source) return;
    if (preview.width !== source.width || preview.height !== source.height) { preview.width = source.width; preview.height = source.height; }
    frame.style.setProperty('--photo-ratio', `${source.width} / ${source.height}`);
    frame.style.setProperty('--photo-width', `${Math.min(520, source.width / source.height * 420)}px`);
    const ctx = preview.getContext('2d');
    if (!ctx) { setStatus('Photo editing is unavailable in this browser. Enter the colors manually instead.', true); return; }
    ctx.drawImage(source, 0, 0);
    ctx.fillStyle = 'rgba(9, 17, 32, .48)';
    ctx.beginPath();
    ctx.rect(0, 0, source.width, source.height);
    ctx.moveTo(corners[0].x, corners[0].y);
    for (const corner of [...corners.slice(1), corners[0]]) ctx.lineTo(corner.x, corner.y);
    ctx.fill('evenodd');
    if (sideRowOnly) {
      const lower = [point(0, 1/3), point(1, 1/3), point(1, 1), point(0, 1)];
      ctx.beginPath();
      lower.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = 'rgba(9, 17, 32, .7)';
      ctx.fill();
    }
    const valid = validateCorners(corners, source.width, source.height);
    readButton.disabled = !valid;
    ctx.strokeStyle = valid ? '#ffffff' : '#ff665e';
    ctx.lineWidth = Math.max(2, source.width / Math.max(frame.clientWidth, 240) * 1.5);
    for (let i = 0; i <= 3; i++) {
      for (const endpoints of [[point(i/3, 0), point(i/3, 1)], [point(0, i/3), point(1, i/3)]]) {
        ctx.beginPath();
        ctx.moveTo(endpoints[0].x, endpoints[0].y);
        ctx.lineTo(endpoints[1].x, endpoints[1].y);
        ctx.stroke();
      }
    }
    handles.forEach((handle, i) => {
      handle.style.left = `${corners[i].x / source.width * 100}%`;
      handle.style.top = `${corners[i].y / source.height * 100}%`;
    });
  }

  function rotatePhoto() {
    if (!source || closed) return;
    invalidateReview();
    const rotated = document.createElement('canvas');
    rotated.width = source.height;
    rotated.height = source.width;
    const context = rotated.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.translate(rotated.width, 0);
    context.rotate(Math.PI / 2);
    context.drawImage(source, 0, 0);
    source.width = 0;
    source.height = 0;
    source = rotated;
    resetCorners();
    draw();
  }

  function readColors() {
    if (!source || closed) return;
    if (!validateCorners(corners, source.width, source.height)) { setStatus('Keep the four corners in order around one face, with enough space between them.', true); return; }
    try {
      const imageData = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, source.width, source.height);
      result = sampleFace(imageData, corners, { scheme, referenceColors, face });
      result.colors[4] = face;
      if (sideRowOnly) for (let i = 3; i < 9; i++) result.colors[i] = face;
      selected = result.confidence.findIndex((value, i) => editable(i) && value < .7);
      if (selected < 0) selected = 0;
      renderReview();
      setStatus('Colors are ready to review. Correct any mismatches before adding them.');
      review.querySelector('h3').focus({ preventScroll: true });
      review.scrollIntoView({ block: 'nearest' });
    } catch {
      invalidateReview();
      setStatus('Colors could not be read. Adjust the corners or choose a clearer photo.', true);
    }
  }

  function editable(index) { return index !== 4 && (!sideRowOnly || index < 3); }

  function renderReview() {
    review.replaceChildren();
    review.hidden = false;
    const reviewHeading = node('h3', '', t('Review colors before adding'));
    reviewHeading.tabIndex = -1;
    review.append(reviewHeading, node('p', 'photo-copy', t('Tap a sticker, then choose its correct color below. The center is fixed.')));
    if (result.confidence.some((value, i) => editable(i) && value < .7)) review.append(node('p', 'photo-uncertain-note', t('Outlined stickers need a closer check. Lighting can change the detected colors.')));
    if (result.confidence[4] < .7) review.append(node('p', 'photo-uncertain-note', t('Check that the photographed center is {color}. Retake this face if it is different.', { color: t(scheme[face]) })));
    const grid = node('div', 'photo-review-grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', t(faceNames[face]));
    result.colors.forEach((color, index) => {
      const swatch = button('', `photo-swatch${index === selected ? ' selected' : ''}${!editable(index) ? ' inactive' : ''}${result.confidence[index] < .7 && editable(index) ? ' uncertain' : ''}`, () => { selected = index; updateSelection(); });
      swatch.style.setProperty('--photo-sticker', colorHex[scheme[color]]);
      swatch.textContent = index === 4 ? face : (!editable(index) ? '—' : '');
      swatch.disabled = !editable(index);
      const label = stickerLabel(face, index, scheme[color]);
      swatch.setAttribute('aria-label', `${label}${index === 4 ? `. ${t('Fixed center')}` : !editable(index) ? `. ${t('Not needed for this step')}` : ''}`);
      swatch.setAttribute('aria-pressed', String(index === selected));
      grid.append(swatch);
    });
    if (sideRowOnly) grid.classList.add('top-row-only');
    const selectedLabel = node('p', 'photo-selected-label');
    const palette = node('div', 'photo-palette');
    FACES.forEach(color => {
      const swatch = button('', 'photo-color-choice', () => {
        result.colors[selected] = color;
        result.confidence[selected] = 1;
        const selectedSwatch = grid.children[selected];
        selectedSwatch.style.setProperty('--photo-sticker', colorHex[scheme[color]]);
        selectedSwatch.classList.remove('uncertain');
        selectedSwatch.setAttribute('aria-label', stickerLabel(face, selected, scheme[color]));
        updateSelection();
      });
      swatch.setAttribute('aria-label', t('Set selected sticker to {color}', { color: t(scheme[color]) }));
      const chip = node('i');
      chip.style.background = colorHex[scheme[color]];
      swatch.append(chip, node('span', '', t(scheme[color])));
      swatch.dataset.color = color;
      palette.append(swatch);
    });
    const useButton = button('Use these colors', 'primary photo-use', () => {
      if (!result || closed) return;
      const applied = { face, colors: [...result.colors], sampleCenter: result.confidence[4] >= .7 ? [...result.samples[4]] : null };
      close();
      onApply?.(applied);
    });
    review.append(grid);
    if (sideRowOnly) review.append(node('p', 'photo-copy', t('Only the top row is used. The center is shown as a color reference.')));
    review.append(selectedLabel, palette, useButton, button('Choose another photo', 'text-button', () => { galleryInput.value = ''; galleryInput.click(); }));
    updateSelection();

    function updateSelection() {
      Array.from(grid.children).forEach((swatch, index) => {
        swatch.classList.toggle('selected', index === selected);
        swatch.setAttribute('aria-pressed', String(index === selected));
      });
      selectedLabel.textContent = t('Selected sticker: row {row}, column {column}', { row: Math.floor(selected / 3) + 1, column: selected % 3 + 1 });
      Array.from(palette.children).forEach(swatch => swatch.setAttribute('aria-pressed', String(swatch.dataset.color === result.colors[selected])));
    }
  }

  return { close };
}
