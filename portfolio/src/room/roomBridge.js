export const ROOM_ACTIONS = new Set([
  'experience', 'projects', 'contact', 'door', 'sound', 'watch',
  'rubiks', 'connect4', 'cards', 'siuheibou', 'dasiuyan', 'guide',
  'drawer-rubiks', 'drawer-connect4', 'drawer-siuheibou', 'drawer-dasiuyan',
]);

export const COMPUTER_ACTIONS = new Set(['experience', 'projects']);

function isScreenRect(rect) {
  if (!rect || typeof rect !== 'object' || Array.isArray(rect)) return false;
  const { x, y, width, height } = rect;
  if (![x, y, width, height].every(Number.isFinite)) return false;
  // Permit only subpixel projection rounding at the viewport edge.
  return x >= -0.002 && y >= -0.002 && width > 0 && height > 0
    && width <= 1.002 && height <= 1.002 && x + width <= 1.002 && y + height <= 1.002;
}

export function readRoomMessage(event, roomWindow, origin) {
  if (!roomWindow || event.source !== roomWindow || event.origin !== origin) return null;
  const data = event.data;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.source !== 'hillman-room') return null;
  if (!['ready', 'progress', 'error', 'action', 'screen'].includes(data.type)) return null;
  if (data.type === 'action' && !ROOM_ACTIONS.has(data.action)) return null;
  if (data.type === 'screen' && (!COMPUTER_ACTIONS.has(data.action) || !isScreenRect(data.rect))) return null;
  if (data.type === 'screen' && data.webcam != null && (!isScreenRect(data.webcam.rect) || typeof data.webcam.open !== 'boolean')) return null;
  if (data.stage !== undefined && (typeof data.stage !== 'string' || data.stage.length > 240)) return null;
  if (data.progress !== undefined && (!Number.isFinite(data.progress) || data.progress < 0 || data.progress > 1)) return null;
  return data;
}

export function sendRoomCommand(roomWindow, command, action) {
  if (!roomWindow || !['focus', 'restore', 'overview', 'desk', 'pause', 'resume', 'webcam'].includes(command)) return;
  if (action !== undefined && !ROOM_ACTIONS.has(action)) return;
  roomWindow.postMessage({ source: 'hillman-portfolio', type: 'command', command, ...(action ? { action } : {}) }, window.location.origin);
}
