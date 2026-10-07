import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { applyLayout } from './layout.js';
import { addStorage } from './storage.js';
import { ROOM_CONFIG, ROOM_FEATURES } from './room-config.js';
import { tidyRoom } from './tidy-room.js';
import { refineDesk } from './desk-refinement.js';
import { addChair } from './chair.js';
import { addBed } from './bed.js';
import { refineWardrobe } from './wardrobe-detail.js';
import { refineWindow } from './window-detail.js';
import { refineComputers } from './computer-detail.js';
import { closeEntranceDoor } from './door-detail.js';
import { calculateRenderSize, fitCameraDistance } from './viewer-sizing.mjs';
import { createFrameScheduler } from './frame-scheduler.mjs';
import { batchStaticSiblings } from './scene-optimization.js';
import { createFurnitureInteractions } from './furniture-interactions.js';
import { createPropInteractions } from './prop-interactions.js';
import { constrainInteriorPosition, constrainObjectPose, constrainScreenPose } from './camera-interior.js';
import { screenFrameFromMesh, fitScreenCamera, projectScreenRect, interpolateCameraPose, fitObjectCamera } from './camera-focus.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const basePresets = {
  overview: { position: [.40, 1.60, -.57], target: [1.79, 1.33, -2.18], fov: 74 },
  inside: { position: [1.05, 1.52, -.35], target: [1.40, 1.1, -2.6], fov: 74 },
  entrance: { position: [1.79, 1.20, -.475], target: [0, 1.10, -.475], fov: 86 },
  desk: { position: [.58, 1.44, -1.22], target: [2.4, 1.02, -2.02], fov: 68 },
  bed: { position: [1.325, 1.80, -1.33], target: [1.325, .87, -3.07], fov: 86 },
  shelf: { position: [1.56, 1.49, -1.98], target: [2.28, 1.07, -2.42], fov: 54 },
};
const presets = structuredClone(basePresets);
const roomLayout = { width: 2.65, depth: 3.70, height: 2.65, widthConfirmed: false };
let renderer, scene, camera, controls, model, environment;
let hemisphere, sun, warmLight, daylight, ground, fill;
let view = 'overview', cutaway = false, evening = true;
let yaw = 0, pitch = 0, pointerStart = null, gestureMoved = false, lastPinch = 0;
let selectionOutline, loadFinished = false, toastTimer, previousFit = 0;
let renderLimits, viewport, renderSize, resizeFrame, life;
let scheduler, furniture, props, resizeObserver, savedCamera, inputPaused = false, hostPaused = false;
let warmOn = true, blindOpen = false, disposed = false;
let cameraTransition = null, focusedAction = null, activeScreen = null, roomCamera = null, afterFocusRender = null;
const entries = new Map(), actionObjects = new Map();
const metrics = { frames: 0, frameTimes: [], loadedAt: 0, startedAt: performance.now() };
const CONTENT_ACTIONS = new Set(['experience', 'projects', 'contact', 'door', 'rubiks', 'connect4', 'cards', 'siuheibou', 'dasiuyan', 'wall-guide', 'guide', 'drawer-rubiks', 'drawer-connect4', 'drawer-siuheibou', 'drawer-dasiuyan']);
const embedded = window.parent !== window;
const mobileDevice = matchMedia('(pointer: coarse)').matches || innerWidth < 800;
const invalidate = () => scheduler?.invalidate();
function send(type, detail = {}) { if (embedded) parent.postMessage({ source: 'hillman-room', type, ...detail }, location.origin); }
function reportProgress(stage, progress) { $('loading-detail').textContent = stage; send('progress', { stage, ...(Number.isFinite(progress) ? { progress } : {}) }); }
const pointers = new Map();
const shells = [], originalLights = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchInput = matchMedia('(pointer: coarse)');

function toast(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4200);
}

function showError(message) {
  $('loading').hidden = true; $('error').hidden = false; $('error-detail').textContent = message; send('error', { stage: message });
}

function init() {
  document.body.classList.toggle('has-character-routine', ROOM_FEATURES.characterRoutine);
  document.body.classList.toggle('embedded', embedded);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
  const gl = renderer.getContext();
  const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  const maxBuffer = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), renderer.capabilities.maxTextureSize);
  renderLimits = { maxWidth: Math.min(maxBuffer, maxViewport[0]), maxHeight: Math.min(maxBuffer, maxViewport[1]) };
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#e8dcc1');
  scene.fog = new THREE.Fog('#e8dcc1', 17, 40);
  camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .025, 100);
  camera.position.fromArray(presets.overview.position);
  controls = new OrbitControls(camera, canvas);
  controls.target.fromArray(presets.overview.target);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = .10;
  controls.minDistance = .55;
  controls.maxDistance = 3.5;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * .48;
  controls.minPolarAngle = .08;
  controls.panSpeed = .7;
  controls.rotateSpeed = .65;
  controls.zoomSpeed = .8;
  controls.update();
  controls.addEventListener('change', () => { if (view === 'overview' && !cameraTransition) constrainOverviewCamera(); updateWalls(); invalidate(); });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  environment = pmrem.fromScene(roomEnv, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .3;
  roomEnv.dispose(); pmrem.dispose();

  hemisphere = new THREE.HemisphereLight(0xf7f5e7, 0x847564, 1.15); scene.add(hemisphere);
  sun = new THREE.DirectionalLight(0xfaf4e3, 1.6);
  sun.position.set(-1, 6, -5); sun.target.position.set(1.4, .2, -1.8);
  sun.castShadow = true; sun.shadow.mapSize.set(mobileDevice ? 1024 : 1536, mobileDevice ? 1024 : 1536);
  sun.shadow.camera.left=-5; sun.shadow.camera.right=5; sun.shadow.camera.top=5; sun.shadow.camera.bottom=-5;
  sun.shadow.camera.near=.5; sun.shadow.camera.far=20; sun.shadow.normalBias=.024;
  scene.add(sun, sun.target);
  fill = new THREE.DirectionalLight(0xf9ede0, .45); fill.position.set(-3,3,5); scene.add(fill);
  warmLight = new THREE.PointLight(0xffd398, 5, 9, 2); warmLight.position.set(1.26,2.26,-1.9); scene.add(warmLight);
  daylight = new THREE.PointLight(0xdce8ff, 1.2, 8, 2); daylight.position.set(.94,1.58,-3.2); scene.add(daylight);
  setLighting();
  ground = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0xc8baa0,roughness:1}));
  ground.rotation.x=-Math.PI/2; ground.position.y=-.085; ground.receiveShadow=true; scene.add(ground);

  resize(); window.addEventListener('resize', scheduleResize);
  window.visualViewport?.addEventListener('resize', scheduleResize);
  resizeObserver = new ResizeObserver(scheduleResize);
  resizeObserver.observe($('viewer'));
  watchPixelRatio();
  bindUI(); updateHint(); resetView();
  scheduler = createFrameScheduler({ frame: (dt) => {
    const started = performance.now();
    let moving = updateCameraTransition(dt);
    if (!inputPaused && !cameraTransition && view === 'overview') {
      moving = controls.update() || moving;
      // OrbitControls suppresses sub-pixel change events near rest. Constrain
      // after every update as well, before even that final frame can render.
      constrainOverviewCamera();
    }
    moving = furniture?.update(dt) || moving;
    moving = props?.update(dt) || moving;
    moving = life?.update(dt) || moving;
    if (moving) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    if (afterFocusRender) { const complete = afterFocusRender; afterFocusRender = null; complete(); }
    metrics.frames++;
    metrics.frameTimes.push(performance.now() - started);
    if (metrics.frameTimes.length > 240) metrics.frameTimes.shift();
    return moving;
  } });
  document.addEventListener('visibilitychange', () => {
    scheduler.setPaused(document.hidden || hostPaused);
    if (document.hidden) props?.suspendAudio?.();
  });
  window.addEventListener('message', receiveCommand);
  window.addEventListener('pagehide', dispose, { once: true });
  invalidate();
  canvas.addEventListener('webglcontextlost', (event) => {event.preventDefault(); showError('The browser lost its graphics connection. Close other graphics-heavy tabs and choose Try again.');});
  loadModel();
}

async function loadModel() {
  try {
    reportProgress('Downloading the room and its textures');
    const gltf = await new GLTFLoader().loadAsync('./room.glb', (progress) => {
      if (progress.total) reportProgress(`Downloading room · ${Math.round(progress.loaded / progress.total * 100)}%`, progress.loaded / progress.total);
    });
    if (disposed) return;
    reportProgress('Preparing furniture, lighting and interactions');
    await new Promise(resolve => requestAnimationFrame(resolve));
    model = gltf.scene;
    applyLayout(model, ROOM_CONFIG);
    tidyRoom(model);
    closeEntranceDoor(model);
    refineWindow(model, ROOM_CONFIG);
    refineDesk(model, ROOM_CONFIG);
    refineComputers(model, ROOM_CONFIG);
    await new Promise(resolve => requestAnimationFrame(resolve));
    addStorage(model, ROOM_CONFIG);
    addChair(model, ROOM_CONFIG);
    reportProgress('Making the bed and arranging the room');
    await new Promise(resolve => requestAnimationFrame(resolve));
    addBed(model, ROOM_CONFIG);
    await new Promise(resolve => requestAnimationFrame(resolve));
    refineWardrobe(model, ROOM_CONFIG);
    furniture = createFurnitureInteractions(model, { invalidate, onAction: openAction, reducedMotion });
    props = createPropInteractions(model, { invalidate, onAction: openAction, toast, reducedMotion, onModalChange: setInputPaused, onLightingChange: state => { warmOn = state.warmOn; blindOpen = state.blindOpen; setLighting(); } });
    props.setLighting?.({ warmOn, blindOpen });
    for (const entry of [...furniture.entries, ...props.entries]) {
      entries.set(entry.id, entry);
      for (const object of entry.objects) actionObjects.set(object, entry);
    }
    buildActionMenu();
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (ROOM_FEATURES.characterRoutine) {
      const { createRoomLife } = await import('./room-life.js');
      life = createRoomLife(model, { reducedMotion, onPoseChange: () => { renderer.shadowMap.needsUpdate = true; }, onChange: ({ phase, paused }) => {
        $('life-phase').textContent = phase;
        $('life-toggle').textContent = paused ? '▶' : 'Ⅱ';
        $('life-toggle').setAttribute('aria-label', paused ? 'Play Hillman’s routine' : 'Pause Hillman’s routine');
        $('life-toggle').setAttribute('aria-pressed', String(paused));
      } });
      $('life-toggle').disabled = false;
      $('life-controls').hidden = false;
      $('life-info').hidden = false;
    }
    model.traverse((object) => {
      const side = object.userData.wall_side || object.name.match(/^Shell_(Left|Right|Front|Back|Ceiling)/i)?.[1]?.toLowerCase();
      if (side) shells.push({object,side});
      if (object.isMesh) {
        object.castShadow = true; object.receiveShadow = true;
        if (side === 'ceiling') {
          object.material = object.material.clone();
          object.material.color.set(0xffffff);
          object.material.roughness = .95;
          // A little neutral room bounce keeps white paint from reading grey.
          object.material.emissive.set(0xffffff);
          object.material.emissiveIntensity = .15;
        }
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => { if(material.map) material.map.anisotropy = Math.min(mobileDevice ? 2 : 4,renderer.capabilities.getMaxAnisotropy()); });
      }
      if (object.isLight) {originalLights.push(object); object.visible=false;}
    });
    metrics.batching = batchStaticSiblings(model, new Set(actionObjects.keys()));
    scene.add(model); renderer.shadowMap.needsUpdate = true; setLayout(ROOM_CONFIG); updateWalls();
    reportProgress('Preparing textures and soft room lighting');
    const textures = new Set();
    model.traverse(object => {
      if (!object.visible || object.userData.layoutHidden || !object.material) return;
      for (const material of (Array.isArray(object.material) ? object.material : [object.material]))
        for (const value of Object.values(material)) if (value?.isTexture && !value.isRenderTargetTexture) textures.add(value);
    });
    let textureCount = 0;
    for (const texture of textures) {
      renderer.initTexture(texture);
      if (++textureCount % 4 === 0) await new Promise(resolve => requestAnimationFrame(resolve));
    }
    reportProgress('Compiling materials and preparing the first view');
    await renderer.compileAsync(scene, camera);
    renderer.render(scene, camera);
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (disposed) return;
    loadFinished = true; metrics.loadedAt = performance.now(); $('loading').hidden = true; updateFocusControl(); invalidate();
    send('ready');
    // Small inspection API for local verification; no data leaves this page.
    window.roomViewer = { entries, activate: activateEntry, focus: focusAction, returnToRoom, get focus(){return {action:focusedAction,screen:activeScreen?.action || null,transitioning:Boolean(cameraTransition)};}, get screenRect(){return activeScreen ? projectScreenRect(activeScreen.frame, camera) : null;}, metrics, get scheduler(){return scheduler;}, get furniture(){return furniture;}, get props(){return props;}, get inputPaused(){return inputPaused;}, get life(){return life;}, get view(){return view;}, get model(){return model;}, get camera(){return camera;}, get renderer(){return renderer;}, get shells(){return shells;}, get cutaway(){return cutaway;}, get evening(){return evening;}, get layout(){return {...roomLayout};}, get viewport(){return {...viewport};}, get renderSize(){return {...renderSize};}, setLayout, setView, resetView };
  } catch(error) {
    console.error('Room model load failed:',error);
    showError('The room could not finish loading. Check your connection and try again, or use the standard portfolio.');
  }
}


// The geometry adapter calls this after applying a confirmed room layout.
export function setLayout(config = {}) {
  for (const key of ['width', 'depth', 'height']) {
    if (Number.isFinite(config[key]) && config[key] > 0) roomLayout[key] = config[key];
  }
  if (typeof config.widthConfirmed === 'boolean') roomLayout.widthConfirmed = config.widthConfirmed;
  const sx = roomLayout.width / 2.65, sz = roomLayout.depth / 3.70;
  for (const [name, preset] of Object.entries(basePresets)) {
    presets[name] = { ...preset, position: [preset.position[0] * sx, preset.position[1], preset.position[2] * sz], target: [preset.target[0] * sx, preset.target[1], preset.target[2] * sz] };
  }
  if ($('room-length')) $('room-length').textContent = `≈ ${roomLayout.depth.toFixed(1)} m`;
  if ($('room-width')) $('room-width').textContent = `≈ ${roomLayout.width.toFixed(1)} m`;
  if ($('room-size-note')) $('room-size-note').textContent = `≈ ${roomLayout.depth.toFixed(1)} m window to front`;
  if (warmLight) warmLight.position.set(roomLayout.width * .475, 2.26, -roomLayout.depth * .514);
  if (daylight) daylight.position.set(roomLayout.width * .355, 1.58, -roomLayout.depth + .5);
  if (sun) sun.target.position.set(roomLayout.width / 2, .2, -roomLayout.depth / 2);
  if (renderer) renderer.shadowMap.needsUpdate = true;
  if (camera) resetView();
}

function updateWalls() {
  // Every view is inside the shell. Walls and ceiling remain visible while
  // moving too, so orbiting never exposes the external backdrop.
  for (const { object } of shells) {
    const visible = !object.userData.layoutHidden;
    if (object.visible !== visible) renderer.shadowMap.needsUpdate = true;
    object.visible = visible;
  }
}

function constrainOverviewCamera() {
  if (!camera || !controls) return;
  constrainInteriorPosition(camera.position, roomLayout, true);
  constrainInteriorPosition(controls.target, roomLayout);
  camera.lookAt(controls.target);
}

function overviewFov() {
  return Math.min(108, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(presets.overview.fov) / 2) / Math.min(1, camera.aspect))));
}

function resetView() {
  closeSelection();
  const preset = presets[view];
  controls.enabled = false;
  // Flush residual orbit motion before moving to a fixed camera.
  controls.enableDamping = false; controls.update();
  camera.up.set(0, 1, 0);
  camera.position.fromArray(preset.position); camera.fov = preset.fov;
  if(view === 'overview') {
    controls.target.fromArray(preset.target);
    camera.fov = overviewFov();
    previousFit = overviewDistance();
    controls.enabled = !inputPaused;
    controls.minDistance = .55; controls.maxDistance = 3.5; controls.enablePan = false;
    controls.update(); constrainOverviewCamera(); controls.enableDamping = !reducedMotion;
  } else {
    const direction = new THREE.Vector3().fromArray(preset.target).sub(camera.position).normalize();
    yaw = Math.atan2(direction.x,-direction.z); pitch = Math.asin(direction.y); updateLook();
  }
  constrainInteriorPosition(camera.position, roomLayout);
  camera.updateProjectionMatrix(); updateWalls(); invalidate();
}

function setView(next) {
  if(!loadFinished || !presets[next]) return;
  cameraTransition = null; afterFocusRender = null; activeScreen = null;
  focusedAction = null; view = next; document.body.dataset.view = view;
  ground.visible = view === 'overview'; updateFocusControl(); updateHint(); resetView();
}

function updateLook() {
  pitch = THREE.MathUtils.clamp(pitch,-Math.PI*.47,Math.PI*.47);
  camera.lookAt(camera.position.x+Math.sin(yaw)*Math.cos(pitch), camera.position.y+Math.sin(pitch), camera.position.z-Math.cos(yaw)*Math.cos(pitch)); invalidate();
}

function changeZoom(delta) {
  camera.fov=THREE.MathUtils.clamp(camera.fov+delta,35,100); camera.updateProjectionMatrix(); invalidate();
}

function updateHint() {
  canvas.setAttribute('aria-label', 'Hillman’s room. Drag to orbit, pinch or scroll to zoom. Click an object to move closer. Tab to Explore objects for keyboard navigation. Escape returns to the room.');
}

function setLighting() {
  hemisphere.intensity=evening ? .48 : 1.15;
  sun.intensity=(evening ? .15 : 1.6) * (blindOpen ? 1.8 : 1);
  fill.intensity=evening ? .2 : .45;
  warmLight.intensity=warmOn ? (evening ? 16 : 5) : 0;
  daylight.intensity=(evening ? .12 : 1.2) * (blindOpen ? 2 : 1);
  scene.environmentIntensity=evening ? .12 : .3;
  renderer.toneMappingExposure=evening ? 1.06 : .95;

  renderer.shadowMap.needsUpdate = true; invalidate();
}

function closeSelection() {
  if ($('selection')) $('selection').hidden = true;
  if(selectionOutline) {scene.remove(selectionOutline);selectionOutline.geometry.dispose();selectionOutline.material.dispose();selectionOutline=null;}
}

function isVisible(object) {
  for (let node = object; node; node = node.parent) if (!node.visible || node.userData.layoutHidden) return false;
  return true;
}
function entryFor(object) {
  for (let node = object; node; node = node.parent) if (actionObjects.has(node)) return actionObjects.get(node);
}
function selectObject(event) {
  if (!model || inputPaused) return;
  const rect = canvas.getBoundingClientRect();
  const cast = (x, y) => {
    pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // Only the first visible surface can own a click. Walls and closed drawers occlude props.
    const hit = raycaster.intersectObject(model, true).find(({object}) => isVisible(object));
    return hit && entryFor(hit.object);
  };
  let entry = cast(event.clientX, event.clientY);
  // A small halo around a tap makes thin handles touchable without ignoring occlusion.
  if (!entry) for (const [dx, dy] of [[12,0],[-12,0],[0,12],[0,-12]]) {
    entry = cast(event.clientX + dx, event.clientY + dy);
    if (entry) break;
  }
  if (entry) activateEntry(entry.id);
}
function activateEntry(id) {
  const entry = entries.get(id);
  if (!entry || inputPaused || (entry.available && !entry.available())) return false;
  metrics.lastAction = id;
  // Native watch/sound dialogs may lock input immediately; their camera still
  // finishes on the shared scheduler underneath the dialog.
  if (!CONTENT_ACTIONS.has(id)) focusAction(id);
  entry.activate(); if (entry.note) toast(entry.note); invalidate(); return true;
}
function captureCamera() {
  return { view, action: focusedAction, aspect: camera.aspect, position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone(), target: controls.target.clone(), fov: camera.fov, yaw, pitch, min: controls.minDistance, max: controls.maxDistance, previousFit };
}
function updateFocusControl() {
  if ($('back-to-room')) $('back-to-room').hidden = hostPaused || view === 'overview';
}
function objectCenter(action) {
  const box = new THREE.Box3();
  for (const object of entries.get(action)?.objects || []) box.union(new THREE.Box3().setFromObject(object));
  return box.isEmpty() ? new THREE.Vector3(1, 1, -1.9) : box.getCenter(new THREE.Vector3());
}
function physicalPose(action) {
  const center = objectCenter(action);
  let position = [.46, 1.48, -1.06], target = center.toArray(), fov = 60;
  if (/^fabric-|^cards$/.test(action)) {
    const y = action === 'cards' ? .88 : .131 + (Number(action.split('-')[1]) - 1) * .185;
    position = [.66, Math.max(.90, y + .80), -2.12]; target = [1.37, y, -2.55]; fov = 57;
  } else if (/^bed-drawer-|^connect4$/.test(action)) {
    position = [.30, 1.10, -1.95]; target = [action === 'bed-drawer-3' || action === 'bed-drawer-4' ? 1.37 : .62, .35, -2.58]; fov = 66;
  } else if (/^wardrobe-/.test(action)) {
    position = [.40, 1.75, -1.20]; target = [1.48, 1.32, -.60]; fov = 82;
  } else if (/^plush-|^pillow$/.test(action)) {
    position = [THREE.MathUtils.clamp(center.x, .3, 1.65), 1.44, -2.37]; target = [center.x, Math.max(.79, center.y), center.z]; fov = action === 'plush-ripple' ? 78 : 52;
  } else if (['hugo', 'airpods', 'watch', 'rubiks'].includes(action)) {
    position = [.96, 1.47, -2.21]; target = [1.69, 1.065, -2.55]; fov = 47;
  } else if (action === 'webcam') {
    position = [center.x - .34, center.y + .055, center.z]; fov = 47;
  } else if (action === 'chair') {
    position = [.28, 1.41, -.83]; target = [1, .66, -1.86]; fov = 66;
  } else if (action === 'blind') {
    position = [.82, 1.70, -2.23]; target = [.95, 1.67, -3.82]; fov = 68;
  } else if (action === 'pendant') {
    position = [.50, 1.58, -.96]; target = center.toArray(); fov = 64;
  } else if (action === 'door') {
    position = [1.15, 1.20, -.50]; target = [.055, 1.12, -.50]; fov = 88;
  } else if (action === 'dasiuyan') {
    position = [.50, .97, -.86]; target = [1.14, .04, -.51]; fov = 57;
  } else if (action === 'speakers') {
    position = [.60, .87, -1.2]; target = [1.65, .31, -1.72]; fov = 70;
  } else if (action === 'wall-guide') {
    position = [.85, 1.93, center.z]; target = [1.98, 1.93, center.z]; fov = 64;
  } else if (['contact', 'siuheibou', 'desk'].includes(action)) {
    position = [.72, 1.42, -1.10]; target = action === 'desk' ? [1.74, 1.03, -1.86] : center.toArray(); fov = 58;
  }
  const eye = new THREE.Vector3(...position), look = new THREE.Vector3(...target), up = new THREE.Vector3(0, 1, 0);
  const bounds = new THREE.Box3();
  for (const object of entries.get(action)?.objects || []) bounds.union(new THREE.Box3().setFromObject(object));
  // Focus starts before the reaction. Reserve the space a drawer will occupy
  // when fully open, so its revealed contents remain in the portrait frame.
  if (/^fabric-/.test(action) && !bounds.isEmpty()) bounds.min.x -= .30;
  if (/^bed-drawer-/.test(action) && !bounds.isEmpty()) bounds.max.z += .37;
  if (/^wardrobe-/.test(action)) {
    // Both complete door sweeps must remain reachable after opening. Measure
    // their real hinged geometry in closed/open poses, then restore it before
    // the next render; furniture state and its animation are unchanged.
    for (const [id, angle] of [['wardrobe-left', -1.12], ['wardrobe-right', 1.12]]) {
      const door = entries.get(id)?.objects[0]; if (!door) continue;
      const previous = door.rotation.y;
      for (const rotation of [0, angle]) {
        door.rotation.y = rotation; door.updateWorldMatrix(true, true); bounds.union(new THREE.Box3().setFromObject(door));
      }
      door.rotation.y = previous; door.updateWorldMatrix(true, true);
    }
  }
  const preferred = { position: eye, target: look, up, quaternion: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, look, up)), fov };
  // Keep both tall storage views in the clear aisle. Moving backward to fit
  // the wardrobe can put the camera inside the slightly opened entrance door.
  const fitted = action === 'door' || /^wardrobe-/.test(action) ? preferred : fitObjectCamera(preferred, bounds, { aspect: camera.aspect });
  return constrainObjectPose(fitted, bounds, roomLayout, camera.aspect);
}
function screenFor(action) {
  const expression = action === 'experience' ? /^Laptop__illuminated_document/ : /^Monitor__illuminated_display/;
  let screen; model?.traverse(object => { if (object.isMesh && expression.test(object.name)) screen = object; });
  return screen;
}
function emitScreen() {
  if (!activeScreen || cameraTransition) return;
  const rect = projectScreenRect(activeScreen.frame, camera);
  send('screen', { action: activeScreen.action, rect, webcam: projectedWebcam() });
}
function projectedWebcam() {
  const body = model?.getObjectByName('Computers / Logitech Brio / graphite rounded horizontal body');
  if (!body || !props?.webcam) return null;
  const box = new THREE.Box3().setFromObject(body);
  const lens = model.getObjectByName('Computers / Logitech Brio / protruding round lens barrel');
  if (lens) box.union(new THREE.Box3().setFromObject(lens));
  const points = [];
  camera.updateMatrixWorld(true);
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) points.push(new THREE.Vector3(x, y, z).project(camera));
  if (points.some(point => point.z < -1 || point.z > 1)) return null;
  const left = Math.min(...points.map(point => (point.x + 1) / 2)), right = Math.max(...points.map(point => (point.x + 1) / 2));
  const top = Math.min(...points.map(point => (1 - point.y) / 2)), bottom = Math.max(...points.map(point => (1 - point.y) / 2));
  // Only bridge a visible cover. The laptop close-up can put the Dell outside
  // the viewport; it must never create an invisible overlay over page content.
  if (left < 0 || right > 1 || top < 0 || bottom > 1) return null;
  const center = box.getCenter(new THREE.Vector3()).project(camera);
  raycaster.setFromCamera(new THREE.Vector2(center.x, center.y), camera);
  const hit = raycaster.intersectObject(model, true).find(({ object }) => isVisible(object));
  if (!hit || entryFor(hit.object)?.id !== 'webcam') return null;
  return { rect: { x: left, y: top, width: right - left, height: bottom - top }, open: props.webcam.open };
}
function computerPose(frame, action) {
  const safeTop = parseFloat(getComputedStyle($('viewer')).getPropertyValue('--safe-top')) || 0;
  const topInset = action === 'projects' ? Math.max(74, Math.min(190, viewport.height * .22)) : 74;
  return constrainScreenPose(fitScreenCamera(frame, { aspect: camera.aspect, viewportHeight: viewport.height, topInset: topInset + safeTop }), frame.normal, roomLayout);
}
function poseFor(action) {
  if (action === 'experience' || action === 'projects') {
    const screen = screenFor(action);
    if (screen) {
      const frame = screenFrameFromMesh(screen);
      return { ...computerPose(frame, action), screen: { action, mesh: screen, frame } };
    }
  }
  return physicalPose(entries.get(action)?.focusAction || action);
}
function beginCameraTransition(to, complete) {
  const from = captureCamera();
  constrainInteriorPosition(to.position, roomLayout);
  controls.enabled = false;
  // Flush retained orbit/pan deltas, then restore exactly the pose the visitor
  // was seeing. Otherwise a quick click after a drag drifts on the return trip.
  controls.enableDamping = false;
  controls.update();
  camera.position.copy(from.position); camera.quaternion.copy(from.quaternion); camera.up.copy(from.up);
  controls.target.copy(from.target);
  const distance = from.position.distanceTo(to.position);
  cameraTransition = { from, to, elapsed: 0, duration: reducedMotion ? 0 : Math.min(1.35, .65 + distance * .095), lift: distance > 2 ? .30 : 0, complete };
  afterFocusRender = null; invalidate();
}
function updateCameraTransition(dt) {
  if (!cameraTransition) return false;
  const transition = cameraTransition;
  transition.elapsed += dt;
  const progress = transition.duration ? Math.min(1, transition.elapsed / transition.duration) : 1;
  const pose = interpolateCameraPose(transition.from, transition.to, progress, transition.lift);
  camera.position.copy(pose.position); constrainInteriorPosition(camera.position, roomLayout); camera.quaternion.copy(pose.quaternion); camera.up.copy(pose.up); camera.fov = pose.fov;
  camera.updateProjectionMatrix(); updateWalls();
  if (progress === 1) {
    cameraTransition = null;
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    yaw = Math.atan2(direction.x, -direction.z); pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
    afterFocusRender = transition.complete || null; updateWalls();
  }
  return true;
}
function focusAction(action, complete, content = false) {
  if (!loadFinished || (!entries.has(action) && action !== 'desk')) return;
  if (!roomCamera) roomCamera = captureCamera();
  if (content && !savedCamera) savedCamera = captureCamera();
  const to = poseFor(action);
  focusedAction = action; activeScreen = to.screen || null;
  view = 'focused'; document.body.dataset.view = view; ground.visible = false; updateFocusControl();
  beginCameraTransition(to, () => { emitScreen(); complete?.(); });
}
function restoreSnapshot(state) {
  if (!state) return;
  // If the device rotated while reading a physical screen, restore the same
  // relative overview zoom in the new aspect ratio instead of a cropped room.
  state = { ...state, position: state.position.clone() };
  refitOverviewSnapshot(state);
  if (state.view !== 'overview' && state.action && state.aspect !== camera.aspect) Object.assign(state, poseFor(state.action), { aspect: camera.aspect });
  activeScreen = null; focusedAction = state.action || null;
  view = 'focused'; updateFocusControl();
  beginCameraTransition(state, () => {
    view = state.view; document.body.dataset.view = view;
    controls.target.copy(state.target); controls.minDistance = state.min; controls.maxDistance = state.max;
    controls.enableDamping = !reducedMotion; controls.enabled = !inputPaused && view === 'overview';
    yaw = state.yaw; pitch = state.pitch; previousFit = state.previousFit;
    ground.visible = view === 'overview'; updateWalls(); updateFocusControl();
  });
}
function refitOverviewSnapshot(state) {
  if (state?.view !== 'overview') return;
  // Aspect changes alter field of view, never move the camera through a wall.
  state.fov = overviewFov(); state.aspect = camera.aspect;
  state.previousFit = overviewDistance();
  constrainInteriorPosition(state.position, roomLayout, true);
}

function restoreCamera() {
  const state = savedCamera; savedCamera = null;
  if (state) restoreSnapshot(state); else returnToRoom();
}
function returnToRoom() {
  const state = roomCamera; roomCamera = null; savedCamera = null; activeScreen = null;
  if (state) { state.action = null; restoreSnapshot(state); }
  else { focusedAction = null; setView('overview'); }
}
function setInputPaused(paused) {
  inputPaused = hostPaused || Boolean(paused); controls.enabled = !inputPaused && !cameraTransition && view === 'overview';
  pointers.clear(); pointerStart = null; gestureMoved = true;
  canvas.classList.remove('dragging'); updateFocusControl(); invalidate();
}
function openAction(action) {
  if (!CONTENT_ACTIONS.has(action)) return;
  focusAction(action === 'guide' ? 'wall-guide' : action, () => {
    if (embedded) send('action', { action });
    else if (action === 'door') toast('You’re working from home. You cannot get out!!! Go back to work.');
    else toast(`${entries.get(action)?.label || action} · Open the portfolio at /room to explore this content.`);
  }, true);
}
function receiveCommand(event) {
  if (event.origin !== location.origin || event.source !== parent || !embedded) return;
  const data = event.data;
  if (!data || data.source !== 'hillman-portfolio' || data.type !== 'command') return;
  if (data.command === 'pause') {hostPaused = true;setInputPaused(true);scheduler?.setPaused(true);props?.suspendAudio?.();}
  if (data.command === 'resume') {hostPaused = false;setInputPaused(Boolean(document.querySelector('dialog[open]')));scheduler?.setPaused(document.hidden);}
  if (data.command === 'webcam' && hostPaused && activeScreen && !cameraTransition && !document.hidden && projectedWebcam()) {
    // Keep the host page and its focus trap in charge. Only the finite shutter
    // animation runs; this never unlocks orbiting, drawer picking, or sound.
    entries.get('webcam')?.activate();
    scheduler?.setPaused(false); invalidate(); emitScreen();
  }
  if (data.command === 'restore') restoreCamera();
  if (data.command === 'overview') returnToRoom();
  if (data.command === 'desk') {savedCamera = null;focusAction('desk');}
  if (data.command === 'focus' && (CONTENT_ACTIONS.has(data.action) || entries.has(data.action) || data.action === 'desk')) {
    if (CONTENT_ACTIONS.has(data.action)) openAction(data.action); else focusAction(data.action);
  }
}

function buildActionMenu() {
  const list = $('action-list');
  for (const entry of entries.values()) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = entry.label;
    button.dataset.action = entry.id;
    button.addEventListener('click', () => {
      $('actions-dialog').close(); setInputPaused(false);
      // This inventory is the keyboard alternative to exploring; props inside storage stay locked.
      if (entry.available && !entry.available()) {toast('Open this drawer first to discover what is inside.');return;}
      activateEntry(entry.id);
    });
    list.append(button);
  }
}
function dispose() {
  if (disposed) return; disposed = true;
  scheduler?.dispose(); cancelAnimationFrame(resizeFrame); clearTimeout(toastTimer);
  resizeObserver?.disconnect(); controls?.dispose();
  window.removeEventListener('message', receiveCommand); window.removeEventListener('resize', scheduleResize);
  window.visualViewport?.removeEventListener('resize', scheduleResize);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const collect = () => scene?.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) if (material) materials.add(material);
  });
  // Capture batches before articulated groups detach, then any restored originals.
  collect(); furniture?.dispose(); props?.dispose(); collect();
  for (const material of materials) { for (const value of Object.values(material)) if (value?.isTexture) textures.add(value); material.dispose(); }
  geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose());
  sun?.shadow.dispose(); environment?.dispose(); renderer?.dispose();
}

function bindUI() {
  $('back-to-room').addEventListener('click', returnToRoom);
  $('actions-button').addEventListener('click', () => {$('actions-dialog').showModal();setInputPaused(true);});
  $('actions-close').addEventListener('click', () => $('actions-dialog').close());
  $('actions-dialog').addEventListener('close', () => setInputPaused(Boolean(document.querySelector('dialog[open]'))));
  $('retry-button').addEventListener('click',()=>location.reload());
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  canvas.addEventListener('pointerdown',(event)=>{
    if (inputPaused || cameraTransition) return;
    canvas.focus({preventScroll:true});
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===1){pointerStart={x:event.clientX,y:event.clientY,id:event.pointerId,button:event.button};gestureMoved=false;}
    else {gestureMoved=true;pointerStart=null;}
    if(view!=='overview') canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');lastPinch=0;
  });
  canvas.addEventListener('pointermove',(event)=>{
    if (inputPaused || cameraTransition) return;
    const previous=pointers.get(event.pointerId);if(!previous)return;
    const dx=event.clientX-previous.x,dy=event.clientY-previous.y;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointerStart && Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>5)gestureMoved=true;
    if(view!=='overview'){
      if(pointers.size>1){const points=[...pointers.values()];const distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);if(lastPinch)changeZoom((lastPinch-distance)*.12);lastPinch=distance;}
      else {yaw-=dx*.0035;pitch+=dy*.0035;updateLook();}
    }
  });
  const endPointer=(event)=>{
    if(event.type==='pointerup' && !gestureMoved && pointerStart?.id===event.pointerId && pointerStart.button===0)selectObject(event);
    pointers.delete(event.pointerId);pointerStart=null;lastPinch=0;
    if(!pointers.size)canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);
  canvas.addEventListener('lostpointercapture',endPointer);
  canvas.addEventListener('wheel',(event)=>{if(!inputPaused && !cameraTransition && view!=='overview'){event.preventDefault();changeZoom(event.deltaY*.035);}},{passive:false});
  window.addEventListener('keydown',(event)=>{
    if(inputPaused || event.ctrlKey || event.metaKey || event.altKey)return;
    if(document.querySelector('dialog[open]') || event.target.matches('input, textarea, select, [contenteditable="true"]'))return;
    if(event.key.toLowerCase()==='r' || event.key==='Escape'){event.preventDefault();returnToRoom();return;}
    if(cameraTransition)return;
    if(event.target!==canvas)return;
    if(['+', '=', '-', '_'].includes(event.key)) {
      event.preventDefault();
      const delta = ['+', '='].includes(event.key) ? -5 : 5;
      if(view==='overview') {
        const offset = camera.position.clone().sub(controls.target);
        const distance = THREE.MathUtils.clamp(offset.length() * Math.exp(delta * .025), controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).add(offset.setLength(distance)); controls.update();
      } else changeZoom(delta);
      return;
    }
    if(event.key==='Enter' || event.key===' ') {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      selectObject({ clientX: rect.left + viewport.centerX, clientY: rect.top + viewport.centerY });
      return;
    }
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();
    if(view==='overview'){
      const offset=camera.position.clone().sub(controls.target);
      const spherical=new THREE.Spherical().setFromVector3(offset);
      if(event.key==='ArrowLeft')spherical.theta-=.08;if(event.key==='ArrowRight')spherical.theta+=.08;
      if(event.key==='ArrowUp')spherical.phi-=.06;if(event.key==='ArrowDown')spherical.phi+=.06;
      spherical.phi=THREE.MathUtils.clamp(spherical.phi,.08,Math.PI*.48);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();
    }else{
      if(event.key==='ArrowLeft')yaw-=.08;if(event.key==='ArrowRight')yaw+=.08;
      if(event.key==='ArrowUp')pitch+=.06;if(event.key==='ArrowDown')pitch-=.06;updateLook();
    }
  });
}

function scheduleResize() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(resize);
}

function watchPixelRatio() {
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => {
    scheduleResize(); watchPixelRatio();
  }, { once: true });
}

function overviewDistance() {
  return new THREE.Vector3().fromArray(presets.overview.position).distanceTo(new THREE.Vector3().fromArray(presets.overview.target));
}

function resize() {
  if(!renderer)return;
  const rect = $('viewer').getBoundingClientRect();
  const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
  const style = getComputedStyle($('viewer'));
  const inset = name => parseFloat(style.getPropertyValue?.(name)) || 0;
  const left = Math.max(18, inset('--safe-left')), right = Math.max(18, inset('--safe-right'));
  const top = Math.max(18, inset('--safe-top')), bottom = Math.max(18, inset('--safe-bottom'));
  viewport = { width, height, safeTop: top, safeWidth: Math.max(1, width - left - right), safeHeight: Math.max(1, height - top - bottom), centerX: width / 2, centerY: height / 2 };
  camera.clearViewOffset(); camera.aspect = width / height; camera.updateProjectionMatrix();
  refitOverviewSnapshot(savedCamera); refitOverviewSnapshot(roomCamera);
  if (cameraTransition?.to.view === 'overview') refitOverviewSnapshot(cameraTransition.to);
  if(view==='overview' && controls && previousFit) {
    camera.fov = overviewFov(); camera.updateProjectionMatrix();
    previousFit = overviewDistance(); constrainOverviewCamera();
  }
  const nextSize = calculateRenderSize({ width, height, dpr: window.devicePixelRatio, mobile: mobileDevice, ...renderLimits });
  if(!renderSize || nextSize.width !== renderSize.width || nextSize.height !== renderSize.height || nextSize.pixelRatio !== renderSize.pixelRatio) {
    renderer.setDrawingBufferSize(width, height, nextSize.pixelRatio);
    renderSize = nextSize;
  }
  if (activeScreen) {
    const pose = computerPose(activeScreen.frame, activeScreen.action);
    if (cameraTransition) cameraTransition.to = { ...pose, screen: activeScreen };
    else {
      camera.position.copy(pose.position); camera.quaternion.copy(pose.quaternion); camera.up.copy(pose.up); camera.fov = pose.fov; camera.updateProjectionMatrix();
      renderer.render(scene, camera); emitScreen();
    }
  } else if (focusedAction && view === 'focused' && cameraTransition?.to.view !== 'overview') {
    const pose = physicalPose(entries.get(focusedAction)?.focusAction || focusedAction);
    if (cameraTransition) Object.assign(cameraTransition.to, pose);
    else {
      camera.position.copy(pose.position); camera.quaternion.copy(pose.quaternion); camera.up.copy(pose.up); camera.fov = pose.fov;
      camera.updateProjectionMatrix(); updateWalls();
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      yaw = Math.atan2(direction.x, -direction.z); pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
      if (hostPaused && loadFinished) renderer.render(scene, camera);
    }
  }
  invalidate();
}
try{if(location.protocol!=='file:')init();}catch(error){console.error(error);showError('This browser could not start 3D graphics. Open the launcher in a recent Safari, Chrome, Edge or Firefox browser with hardware acceleration enabled.');}
