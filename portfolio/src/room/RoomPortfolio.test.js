import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoomPortfolio from './RoomPortfolio';
import { readRoomMessage } from './roomBridge';

test('rejects malformed webcam rectangles and states', () => {
  const source = {};
  const data = { source: 'hillman-room', type: 'screen', action: 'projects', rect: { x: .1, y: .2, width: .8, height: .7 } };
  for (const webcam of [{ rect: { x: -1, y: 0, width: 1, height: 1 }, open: false }, { rect: data.rect, open: 'yes' }]) {
    expect(readRoomMessage({ source, origin: 'https://example.com', data: { ...data, webcam } }, source, 'https://example.com')).toBeNull();
  }
});

test('computer webcam hotspot toggles the cover while keeping scene input locked', () => {
  const { message, iframe, enter } = setup();
  enter();
  const rect = { x: .15, y: .18, width: .7, height: .65 };
  const webcam = { rect: { x: .46, y: .09, width: .08, height: .06 }, open: false };
  message({ type: 'screen', action: 'projects', rect, webcam });
  message({ type: 'action', action: 'projects' });
  iframe.contentWindow.postMessage.mockClear();
  fireEvent.click(screen.getByRole('button', { name: 'Open webcam privacy cover' }));
  expect(iframe.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'webcam' }), window.location.origin);
  expect(iframe.contentWindow.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'resume' }), window.location.origin);
  expect(document.querySelector('.room-background')).toHaveAttribute('inert');
  message({ type: 'screen', action: 'projects', rect, webcam: { ...webcam, open: true } });
  expect(screen.getByRole('button', { name: 'Close webcam privacy cover' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Enlarge page' }));
  expect(screen.queryByRole('button', { name: /webcam privacy cover/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Fit to computer' }));
  expect(screen.getByRole('button', { name: 'Close webcam privacy cover' })).toBeInTheDocument();
});

test('guide introduces both computers and routes its buttons through the viewer focus', () => {
  const { message, iframe, enter } = setup();
  enter();
  message({ type: 'action', action: 'guide' });
  expect(screen.getByRole('heading', { name: 'Make your own house' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Explore Projects on the Dell monitor' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(iframe.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'focus', action: 'projects' }), window.location.origin);
});

test.each(['drawer-rubiks', 'drawer-connect4', 'drawer-siuheibou', 'drawer-dasiuyan', 'cards'])('drawer discovery %s has a project introduction', (action) => {
  const { message, enter } = setup();
  enter(); message({ type: 'action', action });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText('About this project')).toBeInTheDocument();
});

test('welcome does not expose the private CV', () => {
  setup(); expect(document.querySelector('a[href$=".pdf"]')).toBeNull();
});

test('room exploration has a standard-portfolio exit that gives way to focused content', () => {
  const { enter, openComputer } = setup();
  enter();
  expect(screen.getByRole('link', { name: 'Back to portfolio' })).toHaveAttribute('href', '/');
  openComputer('projects');
  expect(screen.queryByRole('link', { name: 'Back to portfolio' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back to room', exact: true }));
  expect(screen.getByRole('link', { name: 'Back to portfolio' })).toBeInTheDocument();
});

function setup() {
  const view = render(<MemoryRouter initialEntries={['/room']}><RoomPortfolio /></MemoryRouter>);
  const iframe = screen.getByTitle('Explore Hillman’s interactive room');
  iframe.contentWindow.postMessage = jest.fn();
  const message = (data, overrides = {}) => act(() => {
    window.dispatchEvent(new MessageEvent('message', { data: { source: 'hillman-room', ...data }, source: iframe.contentWindow, origin: window.location.origin, ...overrides }));
  });
  const enter = () => { message({ type: 'ready' }); fireEvent.click(screen.getByRole('button', { name: /Enter my room/i })); };
  const openComputer = (action = 'experience', rect = { x: 0.15, y: 0.1, width: 0.7, height: 0.65 }) => {
    message({ type: 'screen', action, rect });
    message({ type: 'action', action });
  };
  return { ...view, iframe, message, enter, openComputer };
}

test('requires ready after measurable download progress and rejects forged senders', () => {
  const { message } = setup();
  expect(screen.getByRole('button', { name: /Getting the room ready/i })).toBeDisabled();
  message({ type: 'progress', progress: 1, stage: 'Preparing textures' });
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
  expect(screen.getByRole('button', { name: /Getting the room ready/i })).toBeDisabled();
  message({ type: 'ready' }, { origin: 'https://untrusted.example' });
  message({ type: 'ready' }, { source: window });
  expect(screen.queryByRole('button', { name: /Enter my room/i })).not.toBeInTheDocument();
  message({ type: 'ready' });
  expect(screen.getByRole('button', { name: /Enter my room/i })).toBeEnabled();
});

test('keeps the room alive, pauses content interaction, and restores on Escape', () => {
  const { iframe, enter, openComputer } = setup();
  enter();
  openComputer();
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('AI Software Engineer')).toBeInTheDocument();
  expect(within(dialog).queryByRole('link', { name: /CV/i })).not.toBeInTheDocument();
  expect(within(dialog).getByRole('heading', { name: 'CEO and Founder' })).toBeInTheDocument();
  expect(within(dialog).getByText(/funding of up to HK\$100,000/)).toBeInTheDocument();
  expect(within(dialog).getByText(/additional US\$25,000 in cloud credits/)).toBeInTheDocument();
  expect(iframe.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'pause' }), window.location.origin);
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByTitle('Explore Hillman’s interactive room')).toBe(iframe);
  expect(iframe.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'restore' }), window.location.origin);
});

test('entered room has no parent navigation and puts content inside the physical computer', () => {
  const { enter, openComputer } = setup();
  enter();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Projects', exact: true })).not.toBeInTheDocument();
  openComputer('projects');
  const dialog = screen.getByRole('dialog', { name: 'Projects' });
  const computer = dialog.querySelector('.room-computer-screen');
  expect(dialog).toHaveClass('room-computer-dialog');
  expect(computer).toHaveAttribute('data-device', 'monitor');
  expect(computer).toHaveStyle({ left: '15%', top: '10%', width: '70%', height: '65%' });
  expect(document.querySelector('dialog')).toBeNull();
  expect(screen.getByRole('region', { name: 'Projects page' })).toBeInTheDocument();
});

test('welcome portfolio content still uses the ordinary accessible dialog', () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'View projects' }));
  expect(screen.getByRole('dialog')).toHaveClass('room-dialog');
  expect(document.querySelector('.room-computer-screen')).toBeNull();
});

test.each(['action-first', 'screen-first'])('coordinates computer messages in either order: %s', (order) => {
  const { enter, message, iframe } = setup();
  enter();
  iframe.contentWindow.postMessage.mockClear();
  const action = { type: 'action', action: 'experience' };
  const projection = { type: 'screen', action: 'experience', rect: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 } };
  message(order === 'action-first' ? action : projection);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(iframe.contentWindow.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'pause' }), window.location.origin);
  expect(document.querySelector('.room-background')).not.toHaveAttribute('inert');
  expect(iframe).toHaveAttribute('aria-hidden', 'false');
  message(order === 'action-first' ? projection : action);
  expect(screen.getByRole('dialog', { name: 'Experience' })).toHaveClass('room-computer-dialog');
  expect(iframe.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'pause' }), window.location.origin);
});

test.each([['experience', 'Experience'], ['projects', 'Projects']])('%s screen keeps visible return text, preserves scroll when enlarged, and fits the latest projection', (action, title) => {
  const { enter, openComputer, message, iframe } = setup();
  enter();
  openComputer(action);
  const dialog = screen.getByRole('dialog', { name: title });
  const computer = dialog.querySelector('.room-computer-screen');
  const page = screen.getByRole('region', { name: `${title} page` });
  const back = within(dialog).getByRole('button', { name: 'Back to room' });
  expect(back).toHaveTextContent('Back to room');
  expect(computer).not.toContainElement(back);
  expect(within(computer).getByRole('button', { name: 'Close computer page' })).toHaveTextContent('×');
  page.scrollTop = 320;
  fireEvent.scroll(page);
  fireEvent.click(screen.getByRole('button', { name: 'Enlarge page' }));
  expect(computer).toHaveAttribute('data-enlarged', 'true');
  expect(screen.getByRole('button', { name: 'Back to room' })).toBe(back);
  expect(page.scrollTop).toBe(320);
  message({ type: 'screen', action, rect: { x: 0.05, y: 0.25, width: 0.9, height: 0.5 } });
  fireEvent.click(screen.getByRole('button', { name: 'Fit to computer' }));
  expect(computer).toHaveAttribute('data-enlarged', 'false');
  expect(computer).toHaveStyle({ left: '5%', top: '25%', width: '90%', height: '50%' });
  expect(screen.getByRole('region', { name: `${title} page` })).toBe(page);
  expect(page.scrollTop).toBe(320);
  expect(screen.getByTitle('Explore Hillman’s interactive room')).toBe(iframe);
});

test('computer focus scope includes the viewport Back button and restores focus on close', async () => {
  const { enter, openComputer, iframe } = setup();
  enter();
  openComputer();
  const heading = screen.getByRole('heading', { name: 'Experience', exact: true });
  expect(heading).toHaveFocus();
  fireEvent.keyDown(heading, { key: 'Tab', shiftKey: true });
  expect(screen.getByRole('button', { name: 'Back to room' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true });
  expect(screen.getByRole('link', { name: /More about me and my interests/ })).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Back to room' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true });
  expect(screen.getByRole('link', { name: /More about me and my interests/ })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Close computer page' }));
  await act(async () => {});
  expect(iframe).toHaveFocus();
  expect(document.querySelector('.room-background')).not.toHaveAttribute('inert');
});

test.each([
  ['experience', 'Back to room', 'overview'],
  ['projects', 'Back to room', 'overview'],
  ['experience', 'Close computer page', 'restore'],
  ['projects', 'Close computer page', 'restore'],
])('%s %s sends %s and resumes the persistent room', (action, button, destination) => {
  const { enter, openComputer, iframe } = setup();
  enter();
  openComputer(action);
  iframe.contentWindow.postMessage.mockClear();
  fireEvent.click(screen.getByRole('button', { name: button }));
  const commands = iframe.contentWindow.postMessage.mock.calls.map(([message]) => message.command);
  expect(commands[0]).toBe(destination);
  expect(commands.slice(1).every((command) => command === 'resume')).toBe(true);
  expect(commands).toContain('resume');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByTitle('Explore Hillman’s interactive room')).toBe(iframe);
  expect(document.querySelector('.room-background')).not.toHaveAttribute('inert');
});

test('a game launched from the monitor is isolated and returns to the original room', () => {
  const { enter, openComputer, iframe } = setup();
  enter();
  openComputer('projects');
  fireEvent.click(screen.getByRole('button', { name: 'About Connect 4 — You vs Machine' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play', exact: true }));
  expect(document.querySelector('.room-computer-screen')).toBeNull();
  expect(screen.getByRole('dialog')).toHaveClass('room-dialog-game');
  expect(screen.getByTitle('Connect 4')).toHaveFocus();
  expect(document.querySelectorAll('iframe')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Back to room' }));
  expect(document.querySelectorAll('iframe')).toHaveLength(1);
  expect(screen.getByTitle('Explore Hillman’s interactive room')).toBe(iframe);
  expect(iframe.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'restore' }), window.location.origin);
});

test('loads one game only after Play and removes it on return', () => {
  const { iframe, message, enter } = setup();
  enter();
  message({ type: 'action', action: 'connect4' });
  expect(screen.queryByTitle('Connect 4')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play Connect 4' }));
  expect(screen.getByTitle('Connect 4')).toHaveAttribute('src', '/games/connect4/index.html');
  expect(document.querySelectorAll('iframe')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Back to room' }));
  expect(document.querySelectorAll('iframe')).toHaveLength(1);
  expect(screen.getByTitle('Explore Hillman’s interactive room')).toBe(iframe);
});

test('preserves Da Siu Yan’s separate deployment instead of embedding its redirect', () => {
  const { message, enter } = setup();
  enter();
  message({ type: 'action', action: 'dasiuyan' });
  const play = screen.getByRole('link', { name: /Play 打小人 Da Siu Yan/ });
  expect(play).toHaveAttribute('href', 'https://da-siu-yan.hillmanchan.com/');
  expect(play).toHaveAttribute('target', '_blank');
  expect(document.querySelectorAll('iframe')).toHaveLength(1);
});

test('shows a failure fallback with ordinary portfolio and retries with a new scene', () => {
  const { message, iframe } = setup();
  message({ type: 'error', stage: 'WebGL is unavailable on this device.' });
  expect(screen.getByText('WebGL is unavailable on this device.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Standard portfolio/i })).toHaveAttribute('href', '/');
  fireEvent.click(screen.getByRole('button', { name: 'Retry room' }));
  expect(screen.getByTitle('Explore Hillman’s interactive room')).not.toBe(iframe);
  expect(screen.getByRole('button', { name: /Getting the room ready/i })).toBeDisabled();
});

test('projects exclude Coming Soon and preserve request-access demos', () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'View projects' }));
  expect(screen.queryByText('Coming Soon')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'About Hong Kong Teacher System' }));
  expect(screen.getByRole('link', { name: /Request demo access/i }).getAttribute('href')).toMatch(/^\/contact\?project=Hong\+Kong\+Teacher\+System/);
});

test('project detail and back navigation preserve a meaningful keyboard focus', () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'View projects' }));
  fireEvent.click(screen.getByRole('button', { name: 'About Connect 4 — You vs Machine' }));
  expect(screen.getByRole('heading', { name: 'Connect 4 — You vs Machine' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: /All projects/ }));
  expect(screen.getByRole('button', { name: 'About Connect 4 — You vs Machine' })).toHaveFocus();
});

test('Play moves focus into the newly mounted game frame', () => {
  const { message, enter } = setup();
  enter();
  message({ type: 'action', action: 'connect4' });
  fireEvent.click(screen.getByRole('button', { name: 'Play Connect 4' }));
  expect(screen.getByTitle('Connect 4')).toHaveFocus();
});

test('door dismissal restores; Fine focuses the desk', () => {
  const { iframe, message, enter } = setup();
  enter();
  message({ type: 'action', action: 'door' });
  expect(screen.getByText(/You’re working from home. You cannot get out!!! Go back to work./)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Fine, back to work' }));
  expect(iframe.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'desk' }), window.location.origin);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test.each([
  { source: 'hillman-room', type: 'action', action: 'https://unsafe.example' },
  { source: 'hillman-room', type: 'navigate', action: 'projects' },
  { source: 'hillman-room', type: 'progress', progress: NaN },
  { source: 'hillman-room', type: 'progress', progress: 2 },
  { source: 'hillman-room', type: 'error', stage: {} },
  { source: 'hillman-room', type: 'screen', action: 'contact', rect: { x: 0, y: 0, width: 1, height: 1 } },
  { source: 'hillman-room', type: 'screen', action: 'projects' },
  { source: 'hillman-room', type: 'screen', action: 'projects', rect: { x: 0, y: 0, width: 0, height: 1 } },
  { source: 'hillman-room', type: 'screen', action: 'projects', rect: { x: 0, y: 0, width: Infinity, height: 1 } },
  { source: 'hillman-room', type: 'screen', action: 'experience', rect: { x: -0.1, y: 0, width: 0.9, height: 1 } },
  { source: 'hillman-room', type: 'screen', action: 'experience', rect: { x: 0.9, y: 0, width: 0.2, height: 1 } },
  { source: 'hillman-room', type: 'screen', action: 'experience', rect: { x: 0, y: 0, width: 1, height: '1' } },
])('rejects malformed bridge messages: %p', (data) => {
  const source = {};
  expect(readRoomMessage({ source, origin: 'https://example.com', data }, source, 'https://example.com')).toBeNull();
});


test('inactive retained room pauses, ignores actions and resumes without recreating its iframe', () => {
  const { iframe, enter, message, rerender } = setup();
  enter();
  iframe.contentWindow.postMessage.mockClear();
  rerender(<MemoryRouter initialEntries={['/room']}><RoomPortfolio active={false} /></MemoryRouter>);
  expect(document.querySelector('.room-portfolio')).toHaveAttribute('hidden');
  expect(iframe.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'pause' }), window.location.origin);
  message({ type: 'action', action: 'guide' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  rerender(<MemoryRouter initialEntries={['/room']}><RoomPortfolio active /></MemoryRouter>);
  expect(screen.getByTitle('Explore Hillman’s interactive room')).toBe(iframe);
  expect(screen.queryByRole('heading', { name: /Welcome to my house/ })).not.toBeInTheDocument();
  expect(iframe.contentWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'resume' }), window.location.origin);
});

test('parking an unfinished room does not turn its paused preparation into a timeout', () => {
  jest.useFakeTimers();
  const { message, rerender } = setup();
  message({ type: 'progress', stage: 'Preparing textures' });
  rerender(<MemoryRouter initialEntries={['/room']}><RoomPortfolio active={false} /></MemoryRouter>);
  act(() => jest.advanceTimersByTime(120000));
  rerender(<MemoryRouter initialEntries={['/room']}><RoomPortfolio active /></MemoryRouter>);
  expect(screen.queryByRole('button', { name: 'Retry room' })).not.toBeInTheDocument();
  expect(screen.getByText('Preparing textures')).toBeInTheDocument();
  message({ type: 'ready' });
  expect(screen.getByRole('button', { name: /Enter my room/ })).toBeEnabled();
  jest.useRealTimers();
});
