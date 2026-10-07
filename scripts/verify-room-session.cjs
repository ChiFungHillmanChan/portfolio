/* Headless session lifecycle check against a local production preview. */
const { chromium } = require(process.env.ROOM_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const base = (process.env.ROOM_URL || 'http://127.0.0.1:4175').replace(/\/$/, '');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Use a local preview, not a deployment');
const output = path.join(root, 'output/playwright');
const reportPath = path.join(root, 'docs/2026-10-07-room-portfolio/session-browser.json');
const result = { baseURL: base, verifiedAt: new Date().toISOString(), conditions: 'Headless Chrome; desktop and iPhone-sized touch emulation; YouTube response stubbed, actual playback not tested', viewports: [], errors: [] };
const roomFrame = page => page.frames().find(frame => frame.url().includes('/room-viewer/'));
const viewer = page => page.getByTitle('Explore Hillman’s interactive room');
const idle = frame => frame.waitForFunction(() => window.roomViewer && !roomViewer.inputPaused && !roomViewer.scheduler.pending && !roomViewer.focus.transitioning);

async function verifyIcons(scope) {
  const icons = await scope.locator('.room-icon').evaluateAll(elements => elements.map(icon => {
    const bounds = icon.getBoundingClientRect();
    return { svg: icon.namespaceURI === 'http://www.w3.org/2000/svg', decorative: icon.getAttribute('aria-hidden') === 'true', focusable: icon.getAttribute('focusable'), width: bounds.width, height: bounds.height, stroke: getComputedStyle(icon).stroke, geometry: Boolean(icon.querySelector('path')) };
  }));
  assert(icons.length > 0, 'room controls have SVG icons');
  for (const icon of icons) {
    assert(icon.svg && icon.geometry && icon.decorative && icon.focusable === 'false', 'icons are geometric, decorative SVGs');
    assert(icon.width > 0 && icon.height > 0 && icon.stroke !== 'none', 'icons remain visible at this viewport');
  }
  const labels = await scope.locator('a,button').allTextContents();
  assert(labels.every(text => !/[↗↖↘↙←→↑↓⤢]/u.test(text)), 'room control arrows do not depend on Unicode or emoji fonts');
  return { svgCount: icons.length, noArrowGlyphs: true };
}

async function assertSameSession(page, frame, marker, glbRequests, count) {
  assert(await page.evaluate(() => document.querySelector('.room-scene-frame') === window.__sessionFrame && window.__sessionFrame.contentWindow === window.__sessionFrameWindow), 'same iframe element and window survive SPA navigation');
  assert.equal(await frame.evaluate(() => window.__sessionMarker), marker, 'viewer document was not replaced');
  assert.equal(glbRequests.length, count, 'SPA navigation does not fetch another GLB');
  assert.equal(await frame.evaluate(() => roomViewer.furniture.state['fabric-1'].open), true, 'opened drawer state survives');
}

async function assertPausedAtHome(page, frame) {
  await page.getByRole('link', { name: 'Enter my 3D room', exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, '/');
  assert.equal(await viewer(page).count(), 1, 'prepared iframe stays mounted');
  assert(await viewer(page).isHidden(), 'room iframe is hidden on the standard homepage');
  await frame.waitForFunction(() => roomViewer.inputPaused && !roomViewer.scheduler.pending);
  const before = await frame.evaluate(() => roomViewer.metrics.frames);
  await page.waitForTimeout(500);
  const after = await frame.evaluate(() => roomViewer.metrics.frames);
  assert.equal(after, before, 'the hidden room renders no frames');
  assert.equal(await frame.locator('iframe').count(), 0, 'hidden room has no active media player');
  return { framesBefore: before, framesAfter: after, hidden: true, inputPaused: true };
}

async function assertEntered(page, frame) {
  await page.getByRole('link', { name: 'Back to portfolio', exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, '/room');
  assert.equal(await page.getByRole('heading', { name: 'Welcome to my house', exact: true }).count(), 0, 'reentry skips preparation and welcome');
  assert(await viewer(page).isVisible());
  await idle(frame);
}

async function checkViewport(browser, name, width, height, touch) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const report = { name, width, height, touch };
  result.viewports.push(report);
  let releaseDownload;
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const glbRequests = [], roomRequests = [], mediaRequests = [], pageHides = [];
    page.on('pageerror', error => result.errors.push({ name, message: error.message }));
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.includes('/room-viewer/')) roomRequests.push(request.url());
      if (url.pathname.endsWith('/room.glb')) glbRequests.push(request.url());
      if (url.hostname.includes('youtube')) mediaRequests.push(request.url());
    });
    page.on('console', message => {
      if (message.text().startsWith('ROOM_SESSION_PAGEHIDE ')) pageHides.push(JSON.parse(message.text().slice('ROOM_SESSION_PAGEHIDE '.length)));
    });
    await page.addInitScript(() => {
      window.addEventListener('pageshow', event => { window.__sessionPersisted = event.persisted; });
    });
    let holdNextDownload = false;
    let notifyDownloadHeld;
    const downloadHeld = new Promise(resolve => { notifyDownloadHeld = resolve; });
    await page.route(/\/room\.glb(?:\?|$)/, async route => {
      if (holdNextDownload) {
        holdNextDownload = false;
        await new Promise(resolve => { releaseDownload = resolve; notifyDownloadHeld(); });
      }
      await route.continue();
    });
    await page.route('https://www.youtube-nocookie.com/embed/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Controlled official-player response</title><p>Player fixture</p>' }));

    await page.goto(`${base}/`);
    const entrance = page.getByRole('link', { name: 'Enter my 3D room', exact: true });
    await entrance.waitFor();
    await page.waitForTimeout(400);
    assert.equal(await viewer(page).count(), 0, 'the initial homepage does not mount a room');
    assert.equal(roomRequests.length, 0, 'the initial homepage does not download room assets');
    assert.equal(glbRequests.length, 0);
    assert.equal(mediaRequests.length, 0);
    report.initialHomepage = { roomIframes: 0, roomRequests: 0, glbRequests: 0 };

    await entrance.click();
    await page.getByRole('heading', { name: 'Welcome to my house', exact: true }).waitFor();
    report.welcomeIcons = await verifyIcons(page.locator('.room-portfolio'));
    await page.getByRole('button', { name: 'Enter my room', exact: true }).click({ timeout: 60000 });
    const frame = roomFrame(page);
    await idle(frame);
    assert.equal(glbRequests.length, 1, 'first room visit fetches one GLB');
    const marker = `${name}-prepared-room`;
    await page.evaluate(() => {
      window.__sessionFrame = document.querySelector('.room-scene-frame');
      window.__sessionFrameWindow = window.__sessionFrame.contentWindow;
    });
    await frame.evaluate(value => { window.__sessionMarker = value; }, marker);
    await frame.evaluate(() => roomViewer.activate('fabric-1'));
    await idle(frame);
    assert.equal(await frame.evaluate(() => roomViewer.furniture.state['fabric-1'].open), true);
    report.viewerIcons = await verifyIcons(frame.locator('#back-to-room'));
    await page.screenshot({ path: path.join(output, `session-drawer-${name}.png`) });
    await page.getByRole('link', { name: 'Back to portfolio', exact: true }).click();
    report.pausedHomepage = await assertPausedAtHome(page, frame);
    await assertSameSession(page, frame, marker, glbRequests, 1);
    assert.equal(mediaRequests.length, 0);
    const roomRequestCount = roomRequests.length;
    await page.screenshot({ path: path.join(output, `session-home-paused-${name}.png`) });

    if (width < 768) await page.getByRole('button', { name: 'Toggle menu' }).click();
    await page.getByRole('link', { name: '3D room', exact: true }).click();
    await assertEntered(page, frame);
    await assertSameSession(page, frame, marker, glbRequests, 1);
    assert.equal(roomRequests.length, roomRequestCount, 'reentry makes no viewer asset requests');
    await page.screenshot({ path: path.join(output, `session-reentered-${name}.png`) });
    await page.goBack();
    await assertPausedAtHome(page, frame);
    await assertSameSession(page, frame, marker, glbRequests, 1);
    await page.goForward();
    await assertEntered(page, frame);
    await assertSameSession(page, frame, marker, glbRequests, 1);
    report.sameDocumentNavigation = { sameElement: true, sameWindow: true, statePreserved: true, skippedWelcome: true, historyBackForward: true, glbRequests: 1 };

    await frame.evaluate(() => roomViewer.activate('speakers'));
    await frame.getByRole('button', { name: 'Play Sk8er Boi', exact: true }).click();
    await frame.getByTitle('Avril Lavigne — Sk8er Boi (Official Video)').waitFor();
    assert.equal(mediaRequests.length, 1, 'only the explicit Play click loads media');
    await page.getByRole('link', { name: 'Back to portfolio', exact: true }).click();
    await assertPausedAtHome(page, frame);
    await entrance.click();
    await page.getByRole('link', { name: 'Back to portfolio', exact: true }).waitFor();
    assert.equal(await frame.locator('iframe').count(), 0, 'reentry never restarts music');
    assert.equal(mediaRequests.length, 1);
    await frame.locator('dialog[open]').getByRole('button', { name: 'Back to room', exact: true }).click();
    await idle(frame);
    await assertSameSession(page, frame, marker, glbRequests, 1);
    report.music = { clickToLoad: true, removedWhileHidden: true, noAutomaticResume: true, playerResponseStubbed: true };

    await frame.evaluate(() => roomViewer.activate('projects'));
    const computer = page.getByRole('dialog', { name: 'Projects', exact: true });
    await computer.waitFor();
    report.computerIcons = await verifyIcons(computer);
    await page.screenshot({ path: path.join(output, `session-svg-controls-${name}.png`) });
    await page.getByRole('button', { name: 'Close computer page', exact: true }).click();
    await idle(frame);

    // Use a real document navigation. A gated second GLB proves that a restored
    // page cannot reuse the disposed viewer or its previous ready/entered state.
    await page.evaluate(() => window.addEventListener('pagehide', event => {
      console.info('ROOM_SESSION_PAGEHIDE ' + JSON.stringify({ persisted: event.persisted, iframeConnected: Boolean(window.__sessionFrame?.isConnected) }));
    }, { once: true }));
    holdNextDownload = true;
    const departure = await page.goto(`${base}/favicon.ico`);
    assert.match(departure.headers()['content-type'], /^image\//, 'navigate to an actual image document outside the SPA');
    assert.equal(await page.locator('.room-portfolio').count(), 0);
    // BFCache restores do not emit DOMContentLoaded. Observe the restored UI
    // instead of waiting for a network-navigation lifecycle event.
    await page.evaluate(() => history.back());
    await page.getByRole('heading', { name: 'Welcome to my house', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('.room-scene-frame')?.contentWindow?.location.pathname.includes('/room-viewer/'));
    await page.getByRole('button', { name: 'Getting the room ready…', exact: true }).waitFor();
    assert(await page.getByRole('button', { name: 'Getting the room ready…', exact: true }).isDisabled(), 'old ready state cannot leak across document departure');
    const freshFrame = roomFrame(page);
    assert.equal(await freshFrame.evaluate(() => window.__sessionMarker), undefined, 'fresh scene has no previous viewer marker');
    const restoredFromBfcache = await page.evaluate(() => window.__sessionPersisted === true);
    assert(pageHides.length >= 1, 'actual pagehide event was observed');
    assert.equal(pageHides[0].iframeConnected, false, 'pagehide tears down the old iframe before the document freezes');
    await page.screenshot({ path: path.join(output, `session-fresh-loading-${name}.png`) });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Fresh room did not request a GLB within 20 seconds')), 20000);
      downloadHeld.then(() => { clearTimeout(timeout); resolve(); });
    });
    assert.equal(typeof releaseDownload, 'function', 'a new GLB request is held during the fresh loading screen');
    releaseDownload(); releaseDownload = null;
    await page.getByRole('button', { name: 'Enter my room', exact: true }).click({ timeout: 60000 });
    await idle(freshFrame);
    assert.equal(await freshFrame.evaluate(() => roomViewer.furniture.state['fabric-1'].open), false, 'full document departure resets physical state');
    assert.equal(glbRequests.length, 2, 'a full document departure creates one fresh scene');
    report.fullDocumentDeparture = { pageHides, restoredFromBfcache, oldIframeRemoved: true, freshLoadingRequired: true, newFrame: true, drawerReset: true, glbRequests: 2 };

    const freshContext = await browser.newContext({ viewport: { width, height } });
    try {
      const freshPage = await freshContext.newPage();
      let freshRoomRequests = 0;
      freshPage.on('request', request => { if (request.url().includes('/room-viewer/')) freshRoomRequests++; });
      await freshPage.goto(`${base}/`);
      await freshPage.getByRole('link', { name: 'Enter my 3D room', exact: true }).waitFor();
      await freshPage.waitForTimeout(400);
      assert.equal(await viewer(freshPage).count(), 0);
      assert.equal(freshRoomRequests, 0);
      report.newContext = { roomIframes: 0, roomRequests: 0 };
    } finally { await freshContext.close(); }
    console.log(`Verified ${name}: one prepared room across SPA links/history, hidden pause and silent reentry, fresh scene after document departure, SVG controls`);
  } finally {
    releaseDownload?.();
    await context.close();
  }
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--disable-back-forward-cache'] });
  result.browserVersion = browser.version();
  try {
    for (const [name, width, height, touch] of [['desktop', 1440, 900, false], ['phone', 390, 844, true]]) await checkViewport(browser, name, width, height, touch);
    assert.deepEqual(result.errors, []);
    result.passed = true;
  } catch (error) {
    result.failure = error.stack || String(error);
    throw error;
  } finally {
    await browser.close();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2) + '\n');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
