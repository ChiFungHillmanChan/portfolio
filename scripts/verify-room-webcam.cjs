/* Physical webcam clicks against the local preview, using the shared scene scheduler. */
const { chromium } = require(process.env.ROOM_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const base = process.env.ROOM_URL || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const reports = [], errors = [];
  try {
    for (const [name, width, height, touch] of [['desktop', 1440, 900, false], ['phone', 390, 844, true]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/room`);
      await page.getByRole('button', { name: 'Enter my room', exact: true }).click({ timeout: 60000 });
      const frame = page.frames().find(item => item.url().includes('/room-viewer/'));
      const idle = () => frame.waitForFunction(() => window.roomViewer && !roomViewer.scheduler.pending && !roomViewer.inputPaused);
      await idle();
      const coverPosition = () => frame.evaluate(() => {
        return ['upper', 'lower'].map(side => {
          const cover = roomViewer.model.getObjectByName(`Computers / Logitech Brio / privacy shutter ${side} leaf`);
          cover.updateWorldMatrix(true, false);
          return cover.matrixWorld.elements.slice();
        });
      });
      const clickWebcam = async () => {
        const point = await frame.evaluate(() => {
          const lens = roomViewer.model.getObjectByName('Computers / Logitech Brio / dark glass lens');
          lens.updateWorldMatrix(true, false);
          const p = lens.getWorldPosition(lens.position.clone()).project(roomViewer.camera);
          return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 };
        });
        const bounds = await page.getByTitle('Explore Hillman’s interactive room').boundingBox();
        if (touch) await page.touchscreen.tap(bounds.x + point.x, bounds.y + point.y);
        else await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
        await idle();
        assert.equal(await frame.evaluate(() => roomViewer.metrics.lastAction), 'webcam');
      };
      const closed = await coverPosition();
      await clickWebcam();
      const opened = await coverPosition();
      opened.forEach((leaf, side) => {
        assert((leaf[13] - closed[side][13]) * (side === 0 ? 1 : -1) > .003, 'the two leaves slide apart vertically');
        leaf.forEach((value, i) => { if (i !== 13) assert(Math.abs(value - closed[side][i]) < 1e-9, 'leaves slide without rotating or moving out of the lens plane'); });
      });
      assert.equal(await page.getByRole('dialog').count(), 0, 'webcam stays a physical room interaction');
      assert(await frame.getByRole('button', { name: /Back to room/ }).isVisible());
      await page.screenshot({ path: path.join(root, `output/playwright/webcam-open-${name}.png`) });
      await clickWebcam();
      const returned = await coverPosition();
      returned.forEach((leaf, side) => leaf.forEach((value, i) => assert(Math.abs(value - closed[side][i]) < 1e-9, 'second click closes both leaves exactly')));
      await page.screenshot({ path: path.join(root, `output/playwright/webcam-closed-${name}.png`) });
      const frames = await frame.evaluate(() => roomViewer.metrics.frames);
      await page.waitForTimeout(500);
      assert.equal(await frame.evaluate(() => roomViewer.metrics.frames), frames, 'webcam returns to idle');
      await frame.getByRole('button', { name: /Back to room/ }).click();
      await idle();
      assert(await frame.getByRole('button', { name: /Back to room/ }).isHidden(), 'return control hides in the overview');
      await frame.evaluate(() => roomViewer.activate('projects'));
      const hotspot = page.getByRole('button', { name: 'Open webcam privacy cover', exact: true });
      await hotspot.waitFor();
      const cameraBefore = await frame.evaluate(() => roomViewer.camera.matrixWorld.elements.slice());
      const scroll = page.getByRole('region', { name: 'Projects page' });
      await scroll.evaluate(element => { element.scrollTop = 180; });
      const scrollBefore = await scroll.evaluate(element => element.scrollTop);
      await hotspot.click();
      await frame.waitForFunction(() => roomViewer.props.webcam.open && !roomViewer.scheduler.pending);
      const overlayOpen = await coverPosition();
      assert(overlayOpen[0][13] > closed[0][13] + .003);
      assert(overlayOpen[1][13] < closed[1][13] - .003);
      assert.equal(await frame.evaluate(() => roomViewer.inputPaused), true, 'only the webcam bridge is active');
      assert.deepEqual(await frame.evaluate(() => roomViewer.camera.matrixWorld.elements.slice()), cameraBefore, 'cover toggles without moving the computer');
      assert.equal(await scroll.evaluate(element => element.scrollTop), scrollBefore, 'cover toggles preserve the page');
      assert(await page.getByRole('button', { name: 'Close computer page' }).isVisible());
      assert(await page.getByRole('button', { name: 'Back to room', exact: true }).isVisible());
      await page.screenshot({ path: path.join(root, `output/playwright/webcam-computer-${name}.png`) });
      await page.getByRole('button', { name: 'Close webcam privacy cover', exact: true }).click();
      await frame.waitForFunction(() => !roomViewer.props.webcam.open && !roomViewer.scheduler.pending);
      const overlayClosed = await coverPosition();
      overlayClosed.forEach((leaf, side) => leaf.forEach((value, i) => assert(Math.abs(value - closed[side][i]) < 1e-9)));
      await page.getByRole('button', { name: 'Enlarge page' }).click();
      assert.equal(await page.getByRole('button', { name: /webcam privacy cover/ }).count(), 0, 'enlarged page does not expose a hidden physical control');
      await page.getByRole('button', { name: 'Fit to computer' }).click();
      assert(await hotspot.isVisible());
      const overlayFrames = await frame.evaluate(() => roomViewer.metrics.frames);
      await page.waitForTimeout(500);
      assert.equal(await frame.evaluate(() => roomViewer.metrics.frames), overlayFrames, 'cover returns to idle under the page');
      await page.getByRole('button', { name: 'Back to room', exact: true }).click();
      await idle();
      reports.push({ name, singleClickOpen: true, singleClickClose: true, twoVerticalSlidingLeaves: true, computerOverlay: true, idle: true });
      console.log(`Verified ${name}: two webcam leaves slide open and closed with one click each`);
      await context.close();
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    fs.mkdirSync(path.join(root, 'docs/2026-10-07-room-portfolio'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/2026-10-07-room-portfolio/webcam-browser.json'), JSON.stringify({ baseURL: base, verifiedAt: new Date().toISOString(), reports, errors }, null, 2) + '\n');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
