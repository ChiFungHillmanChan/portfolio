const DEFAULT_PITCH = Math.asin(0.56);
const HALF_PI = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
const PRESETS = {
  front: { yaw: Math.PI / 4, pitch: DEFAULT_PITCH },
  back: { yaw: -3 * Math.PI / 4, pitch: DEFAULT_PITCH },
  left: { yaw: -Math.PI / 4, pitch: DEFAULT_PITCH },
  right: { yaw: 3 * Math.PI / 4, pitch: DEFAULT_PITCH },
  top: { yaw: Math.PI / 4, pitch: HALF_PI },
  bottom: { yaw: Math.PI / 4, pitch: -HALF_PI },
};

export function resolveCubeView(view = 'front') {
  const camera = typeof view === 'string' ? PRESETS[view] : view;
  const yaw = Number.isFinite(camera?.yaw) ? camera.yaw : PRESETS.front.yaw;
  const pitch = Number.isFinite(camera?.pitch) ? camera.pitch : DEFAULT_PITCH;
  return { yaw: ((yaw + Math.PI) % FULL_TURN + FULL_TURN) % FULL_TURN - Math.PI,
    pitch: Math.max(-HALF_PI, Math.min(HALF_PI, pitch)) };
}

export function orbitCubeView(view, deltaYaw, deltaPitch) {
  const camera = resolveCubeView(view);
  return resolveCubeView({ yaw: camera.yaw + deltaYaw, pitch: camera.pitch + deltaPitch });
}

// This controller changes the camera only. The app retains ownership of the
// cube, playback position, accessible canvas label, and tab order.
export function createCubeOrbit(canvas, { getView, onChange }) {
  const previousStyle = { touchAction: canvas.style.touchAction, cursor: canvas.style.cursor };
  let pointer = null;
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';

  function start(event) {
    if (pointer || event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault();
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
    canvas.style.cursor = 'grabbing';
  }

  function move(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    event.preventDefault();
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (dx || dy) onChange(orbitCubeView(getView(), -dx * 0.01, dy * 0.01));
  }

  function stop(event) {
    if (!pointer || (event && event.pointerId !== pointer.id)) return;
    const id = pointer.id;
    pointer = null;
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    canvas.style.cursor = 'grab';
  }

  function keydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const step = Math.PI / 12;
    const offsets = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (event.key !== 'Home' && !offsets[event.key]) return;
    event.preventDefault();
    event.stopPropagation();
    onChange(event.key === 'Home' ? 'front' : orbitCubeView(getView(), ...offsets[event.key]));
  }

  const listeners = { pointerdown: start, pointermove: move, pointerup: stop,
    pointercancel: stop, lostpointercapture: stop, keydown };
  for (const [name, listener] of Object.entries(listeners)) canvas.addEventListener(name, listener);
  return {
    destroy() {
      stop();
      for (const [name, listener] of Object.entries(listeners)) canvas.removeEventListener(name, listener);
      Object.assign(canvas.style, previousStyle);
    },
  };
}
