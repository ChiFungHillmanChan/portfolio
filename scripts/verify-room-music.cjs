/* Local, headless checks for song-player lifecycle and the wall-guide flow.
 * The default intercepts YouTube responses after recording the actual request:
 * it verifies our integration without streaming audio or claiming playback.
 * ROOM_MEDIA_NETWORK=live leaves the official player request untouched.
 */
const { chromium } = require(process.env.ROOM_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.ROOM_URL || 'http://127.0.0.1:3001';
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/playwright');
const liveMedia = process.env.ROOM_MEDIA_NETWORK === 'live';
const officialWatch = 'https://www.youtube.com/watch?v=TIy3n2b7V9k';
const isMediaURL = value => /(^|\.)(youtube(?:-nocookie)?\.com|googlevideo\.com|ytimg\.com)$/.test(new URL(value).hostname);
const report = { headless: true, mediaResponsesStubbed: !liveMedia, playbackNotVerified: true, viewports: [], errors: [] };

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [name, width, height, touch] of [['desktop', 1440, 900, false], ['phone', 390, 844, true]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
      const mediaRequests = [];
      context.on('request', request => { if (isMediaURL(request.url())) mediaRequests.push(request.url()); });
      if (!liveMedia) await context.route('**/*', async route => {
        if (!isMediaURL(route.request().url())) return route.continue();
        return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Media test response</title><p>The official player request was intercepted for lifecycle testing.</p>' });
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push({ name, message: error.message }));
      await page.goto(`${base}/room`);
      await page.getByRole('button', { name: 'Enter my room', exact: true }).click({ timeout: 60000 });
      const frame = page.frames().find(item => item.url().includes('/room-viewer/'));
      assert(frame, 'the room viewer exists');
      const idle = () => frame.waitForFunction(() => window.roomViewer && !roomViewer.scheduler.pending && !roomViewer.inputPaused);
      await idle();
      assert.deepEqual(mediaRequests, [], 'entering the room does not contact YouTube');

      const openSpeakers = async () => {
        assert(await frame.evaluate(() => roomViewer.activate('speakers')));
        const dialog = frame.getByRole('dialog', { name: 'Sk8er Boi', exact: true });
        await dialog.waitFor();
        assert(await dialog.getByRole('button', { name: 'Play Sk8er Boi', exact: true }).isVisible());
        assert.equal(await dialog.locator('iframe').count(), 0);
        assert.equal(await dialog.getByRole('link', { name: /Open the official video/ }).getAttribute('href'), officialWatch);
        return dialog;
      };
      let music = await openSpeakers();
      assert.deepEqual(mediaRequests, [], 'opening the speakers keeps media unloaded until explicit Play');

      const start = async () => {
        const request = context.waitForEvent('request', { predicate: request => request.url().startsWith('https://www.youtube-nocookie.com/embed/'), timeout: 10000 });
        await music.getByRole('button', { name: 'Play Sk8er Boi', exact: true }).click();
        const url = new URL((await request).url());
        assert.equal(url.pathname, '/embed/TIy3n2b7V9k');
        assert.equal(url.searchParams.get('autoplay'), '1', 'autoplay belongs only to the user-created player');
        assert.equal(url.searchParams.get('controls'), '1', 'the official player retains pause, mute and volume controls');
        const player = music.getByTitle('Avril Lavigne — Sk8er Boi (Official Video)', { exact: true });
        await player.waitFor();
        assert.match(await player.getAttribute('allow'), /autoplay/);
        const box = await player.boundingBox();
        assert(box.width >= 200 && box.height >= 200, 'the player meets YouTube’s minimum viewport size');
        assert(await music.getByRole('button', { name: 'Stop music', exact: true }).isVisible());
        return player;
      };
      let player = await start();
      await page.screenshot({ path: path.join(output, `music-open-${name}.png`) });
      await music.getByRole('button', { name: 'Stop music', exact: true }).click();
      await player.waitFor({ state: 'detached' });
      assert(await music.getByRole('button', { name: 'Play Sk8er Boi', exact: true }).isVisible());

      player = await start();
      // This is the same authenticated parent command used when the page hides.
      await page.evaluate(() => document.querySelector('.room-scene-frame').contentWindow.postMessage({ source: 'hillman-portfolio', type: 'command', command: 'pause' }, location.origin));
      await player.waitFor({ state: 'detached' });
      await page.evaluate(() => document.querySelector('.room-scene-frame').contentWindow.postMessage({ source: 'hillman-portfolio', type: 'command', command: 'resume' }, location.origin));
      assert.equal(await music.locator('iframe').count(), 0, 'returning to the room does not restart media');

      player = await start();
      await music.getByRole('button', { name: 'Back to room', exact: true }).click();
      await player.waitFor({ state: 'detached' });
      await music.waitFor({ state: 'detached' });
      await idle();
      music = await openSpeakers();
      player = await start();
      await music.getByRole('button', { name: 'Stop music', exact: true }).focus();
      await page.keyboard.press('Escape');
      await music.waitFor({ state: 'detached' });
      await player.waitFor({ state: 'detached' });
      await idle();

      assert(await frame.evaluate(() => roomViewer.activate('wall-guide')));
      let guide = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Make your own house', exact: true }) });
      await guide.waitFor({ timeout: 12000 });
      assert.match(await guide.innerText(), /Hi! I’m Hillman/);
      assert.equal(await frame.locator('dialog[open]').count(), 0, 'the interactive guide belongs to the portfolio shell');
      await page.screenshot({ path: path.join(output, `guide-open-${name}.png`) });
      await guide.getByRole('button', { name: 'Explore Experience on the MacBook', exact: true }).click();
      const experience = page.getByRole('dialog', { name: 'Experience', exact: true });
      await experience.waitFor({ timeout: 12000 });
      assert.equal(await guide.count(), 0, 'a guide choice replaces the guide without stacking dialogs');
      assert(await experience.getByRole('region', { name: 'Experience page', exact: true }).isVisible());
      await experience.getByRole('button', { name: 'Close computer page', exact: true }).click();
      await idle();
      assert(await frame.evaluate(() => roomViewer.activate('wall-guide')));
      guide = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Make your own house', exact: true }) });
      await guide.waitFor();
      await guide.getByRole('button', { name: 'Back to room', exact: true }).click();
      await guide.waitFor({ state: 'detached' });
      await idle();
      report.viewports.push({ name, noEarlyMediaRequest: true, clickLoadsOfficialPlayer: true, stopDestroysFrame: true, parentPauseDestroysFrame: true, closeAndEscapeDestroyFrame: true, guideToExperienceAndReturn: true, mediaRequests });
      console.log(`Verified ${name}: explicit music loading, stop/pause/close cleanup, guide → Experience → room`);
      await context.close();
    }
    assert.deepEqual(report.errors, []);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'music-guide-browser.json'), JSON.stringify(report, null, 2) + '\n');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
