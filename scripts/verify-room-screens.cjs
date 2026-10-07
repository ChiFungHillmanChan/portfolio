/* Immersive room acceptance check. Run against the local preview, never a deployment. */
const { chromium } = require(process.env.ROOM_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.ROOM_URL || 'http://127.0.0.1:4175';
const root = path.resolve(__dirname, '..');
const result = { baseURL: base, time: new Date().toISOString(), conditions: 'Headless local Chrome; phone/tablet sizes are emulated', viewports: [], errors: [] };

async function verifyPortfolioRoundTrip(page, width) {
  await page.goto(`${base}/`);
  const entrance = page.getByRole('link', { name: 'Enter my 3D room', exact: true });
  await entrance.waitFor();
  assert.equal(await entrance.getAttribute('href'), '/room');
  await entrance.click();
  await page.getByRole('heading', { name: 'Welcome to my house', exact: true }).waitFor();
  assert.equal(await page.getByRole('link', { name: /Standard portfolio/ }).getAttribute('href'), '/');
  await page.getByRole('button', { name: 'Enter my room', exact: true }).click({ timeout: 60000 });
  const frame = page.frames().find(item => item.url().includes('/room-viewer/'));
  await frame.waitForFunction(() => window.roomViewer && !roomViewer.inputPaused && !roomViewer.scheduler.pending);
  await page.evaluate(() => { window.__roomRoundTripFrame = document.querySelector('.room-scene-frame'); });
  await frame.evaluate(() => { window.__roomRoundTripMarker = 'prepared-room'; });
  const exit = page.getByRole('link', { name: 'Back to portfolio', exact: true });
  await exit.waitFor();
  assert.equal(await exit.getAttribute('href'), '/');
  await exit.click();
  await entrance.waitFor();
  assert.equal(new URL(page.url()).pathname, '/', 'return link opens the standard homepage');
  assert.equal(await page.getByTitle('Explore Hillman’s interactive room').count(), 1, 'leaving the room retains its prepared viewer');
  assert(await page.getByTitle('Explore Hillman’s interactive room').isHidden(), 'the retained room is hidden on the homepage');
  await frame.waitForFunction(() => roomViewer.inputPaused && !roomViewer.scheduler.pending);
  if (width < 768) await page.getByRole('button', { name: 'Toggle menu' }).click();
  await page.getByRole('link', { name: '3D room', exact: true }).click();
  await page.getByRole('link', { name: 'Back to portfolio', exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, '/room', 'standard navigation reopens the room route');
  assert.equal(await page.getByRole('heading', { name: 'Welcome to my house', exact: true }).count(), 0, 'a prepared room reopens without another welcome');
  assert(await page.evaluate(() => document.querySelector('.room-scene-frame') === window.__roomRoundTripFrame), 'same iframe survives the roundtrip');
  assert.equal(await frame.evaluate(() => window.__roomRoundTripMarker), 'prepared-room', 'same viewer document survives the roundtrip');
  return { standardHome: '/', room: '/room', heroEntry: true, enteredExit: true, navigationReentry: true, sameFrameReused: true };
}

async function clickProjectedObject(page, frame, action, touch) {
  const point = await frame.evaluate((id) => {
    const object = roomViewer.entries.get(id)?.objects[0];
    if (!object) throw new Error(`Missing interaction ${id}`);
    const label = object.children.find(child => /printed lid/.test(child.name)) || object;
    label.updateWorldMatrix(true, false);
    if (!label.geometry) throw new Error(`Missing clickable lid for ${id}`);
    label.geometry.computeBoundingBox();
    const p = label.geometry.boundingBox.getCenter(label.position.clone()).applyMatrix4(label.matrixWorld).project(roomViewer.camera);
    const rect = document.getElementById('scene').getBoundingClientRect();
    return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 };
  }, action);
  const bounds = await page.getByTitle('Explore Hillman’s interactive room').boundingBox();
  const x = bounds.x + point.x, y = bounds.y + point.y;
  assert(x >= 0 && y >= 0 && x < page.viewportSize().width && y < page.viewportSize().height, `${action} lies inside the viewport`);
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  return { x, y };
}

async function verifyProjectCards(page) {
  const cards = await page.locator('.room-project-card').evaluateAll(elements => elements.map(element => {
    const rect = node => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; };
    return {
      card: rect(element), title: rect(element.querySelector('.room-project-title')),
      description: rect(element.querySelector('.room-project-description')), cta: rect(element.querySelector('.room-project-open')),
      border: parseFloat(getComputedStyle(element).borderTopWidth),
    };
  }));
  assert(cards.length > 1, 'the project catalogue has bordered cards');
  const rows = new Map();
  for (const card of cards) {
    assert(card.border >= 1, 'each project card has a visible border');
    assert(card.card.x >= 0 && card.card.x + card.card.width <= page.viewportSize().width + .5, 'project card fits horizontally');
    assert(card.description.y >= card.title.y + card.title.height, 'full title fits before description');
    assert(card.cta.y >= card.description.y + card.description.height, 'full description fits before CTA');
    const key = card.card.y.toFixed(1);
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(card);
  }
  for (const row of rows.values()) for (const card of row) {
    assert(Math.abs(card.description.y - row[0].description.y) <= .5, 'paragraph starts align across each card row');
    assert(Math.abs(card.cta.y - row[0].cta.y) <= .5, 'About this project aligns across each card row');
  }
  return { count: cards.length, columns: Math.max(...[...rows.values()].map(row => row.length)), aligned: true };
}

async function verifyDrawerDiscoveries(page, frame, touch) {
  const discoveries = [];
  const games = [
    ['drawer-rubiks', 'Rubik’s Cube Practice'], ['drawer-connect4', 'Connect 4'],
    ['drawer-siuheibou', '小氣簿 Siu Hei Bou'], ['drawer-dasiuyan', '打小人 Da Siu Yan'], ['cards', 'Card Drawer'],
  ];
  for (let index = 0; index < games.length; index++) {
    const [id, title] = games[index], drawer = `fabric-${index + 1}`;
    assert.equal(await frame.evaluate(action => roomViewer.activate(action), id), false, `${id} is unavailable in the closed drawer`);
    await frame.evaluate(action => roomViewer.activate(action), drawer);
    await frame.waitForFunction(() => !roomViewer.inputPaused && !roomViewer.scheduler.pending);
    assert(await frame.evaluate(action => roomViewer.entries.get(action).available(), id), `${id} is available after reveal`);
    const point = await clickProjectedObject(page, frame, id, touch);
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    await dialog.waitFor({ timeout: 12000 });
    await frame.waitForFunction(() => roomViewer.inputPaused);
    assert.equal(await page.locator('iframe').count(), 1, 'revealing a game does not launch it');
    await dialog.getByRole('button', { name: 'About this project', exact: true }).click();
    await dialog.getByRole('link', { name: /Full project page/ }).waitFor();
    if (id === 'drawer-dasiuyan') {
      assert.equal(await dialog.getByRole('link', { name: /Play 打小人 Da Siu Yan/ }).getAttribute('href'), 'https://da-siu-yan.hillmanchan.com/');
    } else await dialog.getByRole('button', { name: `Play ${title}`, exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Back to room', exact: true }).click();
    await frame.waitForFunction(() => !roomViewer.inputPaused && !roomViewer.scheduler.pending);
    assert(await frame.evaluate(action => roomViewer.furniture.state[action].open, drawer), 'reading the game preserves its open drawer');
    await frame.evaluate(action => roomViewer.activate(action), drawer);
    await frame.waitForFunction(() => !roomViewer.scheduler.pending);
    assert.equal(await frame.evaluate(action => roomViewer.entries.get(action).available(), id), false, `${id} becomes unavailable after closing`);
    await frame.getByRole('button', { name: /Back to room/ }).click();
    await frame.waitForFunction(() => !roomViewer.scheduler.pending);
    discoveries.push({ id, title, point, physicalClick: true, hiddenAfterClose: true });
  }
  return discoveries;
}

async function clickComputer(page, frame, action, touch) {
  const point = await frame.evaluate((id) => {
    const screen = roomViewer.entries.get(id).objects.find(object => /illuminated/i.test(object.name));
    screen.updateWorldMatrix(true, false);
    screen.geometry.computeBoundingBox();
    const p = screen.geometry.boundingBox.min.clone().lerp(screen.geometry.boundingBox.max, .5).applyMatrix4(screen.matrixWorld).project(roomViewer.camera);
    const rect = document.getElementById('scene').getBoundingClientRect();
    return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 };
  }, action);
  const bounds = await page.getByTitle('Explore Hillman’s interactive room').boundingBox();
  const x = bounds.x + point.x, y = bounds.y + point.y;
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [name, width, height, touch] of [['desktop', 1440, 900, false], ['small-phone', 320, 740, true], ['phone', 390, 844, true], ['tablet', 768, 1024, true]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => result.errors.push({ name, message: error.message }));
      page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') result.errors.push({ name, message: request.failure()?.errorText, url: request.url() }); });
      const navigation = await verifyPortfolioRoundTrip(page, width);
      assert.equal(await page.locator('a[href*="ChiFungHillmanChan.pdf"]').count(), 0, 'welcome has no public CV link');
      if (!result.cvPrivacy) {
        const response = await context.request.get(`${base}/ChiFungHillmanChan.pdf`);
        const body = await response.body();
        assert(!/^application\/pdf/i.test(response.headers()['content-type'] || ''), 'CV URL is not served as a PDF');
        assert(!body.subarray(0, 5).equals(Buffer.from('%PDF-')), 'CV URL does not expose PDF bytes');
        result.cvPrivacy = { status: response.status(), contentType: response.headers()['content-type'], pdfBytesExposed: false };
      }
      const frame = page.frames().find(f => f.url().includes('/room-viewer/'));
      await frame.waitForFunction(() => window.roomViewer && !roomViewer.inputPaused && !roomViewer.scheduler.pending);
      assert.equal(await frame.getByRole('button', { name: /Back to room/ }).isVisible(), false, 'general room overview does not show a return control');
      assert.equal(await page.locator('.room-bottom-controls').count(), 0);
      assert.equal(await frame.getByRole('navigation', { name: 'Room views' }).isVisible(), false);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.room-scene-frame')).opacity === '1');
      await page.screenshot({ path: path.join(root, `output/playwright/immersive-room-${name}.png`) });
      const report = { name, width, height, touch, navigation, computers: [] };
      for (const [action, title, device] of [['projects', 'Projects', 'monitor'], ['experience', 'Experience', 'laptop']]) {
        const before = await frame.evaluate(() => ({ position: roomViewer.camera.position.toArray(), quaternion: roomViewer.camera.quaternion.toArray(), furniture: JSON.stringify(roomViewer.furniture.state) }));
        await clickComputer(page, frame, action, touch);
        const panel = page.locator(`.room-computer-screen[data-device="${device}"]`);
        await panel.waitFor({ timeout: 12000 });
        await frame.waitForFunction(() => roomViewer.inputPaused);
        assert.equal(await page.locator('.room-dialog').count(), 0, 'computer uses its physical screen');
        const box = await panel.boundingBox();
        assert(box.width > width * .65, `${action} fills most of the screen width: ${JSON.stringify({ box, width, height })}`);
        assert(box.x >= -2 && box.y >= -2 && box.x + box.width <= width + 2 && box.y + box.height <= height + 2, 'screen stays in viewport');
        const back = page.getByRole('button', { name: 'Back to room', exact: true });
        const assertBackVisible = async () => {
          assert.match(await back.innerText(), /Back to room/, 'the return action has a visible text label');
          assert(await back.isVisible());
          const bounds = await back.boundingBox();
          assert(bounds.x >= 0 && bounds.x <= 24 && bounds.y >= 0 && bounds.y <= 24, 'return control stays at the viewport top left');
          const heading = await panel.locator('.room-screen-heading').boundingBox();
          assert(bounds.x + bounds.width <= heading.x || bounds.x >= heading.x + heading.width || bounds.y + bounds.height <= heading.y || bounds.y >= heading.y + heading.height, 'the top-left button does not cover the computer heading');
          assert(await back.evaluate(element => {
            const box = element.getBoundingClientRect();
            return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
          }), 'return control remains clickable above the computer');
          assert.equal((await panel.getByRole('button', { name: 'Close computer page', exact: true }).innerText()).trim(), '×', 'the computer keeps its cross');
        };
        await assertBackVisible();
        const region = page.getByRole('region', { name: `${title} page` });
        const scrollable = await region.evaluate(element => element.scrollHeight > element.clientHeight);
        assert(scrollable, 'page scrolls inside the computer');
        await region.evaluate(element => { element.scrollTop = 200; });
        assert(await region.evaluate(element => element.scrollTop > 0));
        await assertBackVisible();
        await region.evaluate(element => { element.scrollTop = 0; });
        await page.screenshot({ path: path.join(root, `output/playwright/immersive-${action}-${name}.png`) });
        await page.getByRole('button', { name: 'Enlarge page', exact: true }).click();
        assert.equal(await panel.getAttribute('data-enlarged'), 'true');
        await assertBackVisible();
        if (name === 'desktop' && action === 'projects') await page.screenshot({ path: path.join(root, 'output/playwright/immersive-projects-enlarged-desktop.png') });
        if (action === 'projects') {
          report.projectCards = await verifyProjectCards(page);
          await page.getByRole('button', { name: 'About Connect 4 — You vs Machine' }).click();
          await page.getByRole('heading', { name: 'Connect 4 — You vs Machine' }).waitFor();
          await page.getByRole('button', { name: /All projects/ }).click();
        } else {
          await page.getByRole('heading', { name: 'CEO and Founder', exact: true }).waitFor();
          assert.equal(await page.locator('a[href$=".pdf"]').count(), 0, 'Experience has no public PDF link');
          assert.equal(await page.getByRole('link', { name: /Read my CV/ }).count(), 0);
          assert(await page.getByText(/funding of up to HK\$100,000/).count());
          assert(await page.getByText(/additional US\$25,000 in cloud credits/).count());
        }
        await page.getByRole('button', { name: 'Fit to computer', exact: true }).click();
        await page.setViewportSize({ width: height, height: width });
        await page.waitForTimeout(350);
        const resized = await panel.boundingBox();
        assert(resized.x >= -2 && resized.y >= -2 && resized.x + resized.width <= height + 2 && resized.y + resized.height <= width + 2, 'screen refits when orientation changes');
        await assertBackVisible();
        await page.setViewportSize({ width, height });
        await panel.getByRole('button', { name: 'Close computer page', exact: true }).click();
        await frame.waitForFunction(() => !roomViewer.inputPaused && !roomViewer.scheduler.pending);
        assert.equal(await panel.count(), 0);
        assert.equal(await frame.getByRole('button', { name: /Back to room/ }).isVisible(), false, 'closing a computer to the overview hides its return control');
        const after = await frame.evaluate(() => ({ position: roomViewer.camera.position.toArray(), quaternion: roomViewer.camera.quaternion.toArray(), furniture: JSON.stringify(roomViewer.furniture.state) }));
        assert.equal(after.furniture, before.furniture, 'content preserves room state');
        after.position.forEach((v, i) => assert(Math.abs(v - before.position[i]) < 1e-5, 'camera restores after reading'));
        report.computers.push({ action, box, scrollable });
      }
      // From a physical focus, the top-left action returns to the room itself;
      // the computer's cross separately retains the previous-camera behavior.
      await frame.evaluate(() => roomViewer.activate('webcam'));
      await frame.waitForFunction(() => !roomViewer.scheduler.pending);
      assert(await frame.getByRole('button', { name: /Back to room/ }).isVisible(), 'focused physical objects retain Back to room');
      await frame.evaluate(() => roomViewer.activate('projects'));
      await page.getByRole('button', { name: 'Enlarge page', exact: true }).click();
      await page.getByRole('button', { name: 'Back to room', exact: true }).click();
      await frame.waitForFunction(() => !roomViewer.inputPaused && !roomViewer.scheduler.pending);
      assert.equal(await frame.evaluate(() => roomViewer.view), 'overview');
      assert.equal(await frame.getByRole('button', { name: /Back to room/ }).isVisible(), false, 'returning to the overview hides the return control');
      if (name === 'phone' || name === 'desktop') report.drawerDiscoveries = await verifyDrawerDiscoveries(page, frame, touch);
      const beforeProp = await frame.evaluate(() => roomViewer.camera.position.toArray());
      await frame.evaluate(() => roomViewer.activate('wall-guide'));
      const guide = page.getByRole('dialog', { name: 'Make yourself at home', exact: true });
      await guide.waitFor();
      await frame.waitForFunction(() => roomViewer.inputPaused && !roomViewer.scheduler.pending);
      await guide.getByRole('heading', { name: 'Make your own house', exact: true }).waitFor();
      assert.match(await guide.innerText(), /Hi! I’m Hillman/);
      assert.equal(await guide.getByRole('link', { name: /More about me/ }).getAttribute('href'), '/about');
      const afterProp = await frame.evaluate(() => roomViewer.camera.position.toArray());
      assert.notDeepEqual(afterProp, beforeProp, 'wall click moves camera closer');
      const wallFits = await frame.evaluate(() => {
        const face = roomViewer.model.getObjectByName('Interactions / wall guide printed face');
        const positions = face.geometry.attributes.position;
        face.updateWorldMatrix(true, false);
        const point = face.position.clone();
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(face.matrixWorld).project(roomViewer.camera);
          if (Math.abs(point.x) > .98 || Math.abs(point.y) > .98) return false;
        }
        return true;
      });
      assert(wallFits, 'the entire wall guide fits, including in phone portrait');
      await page.screenshot({ path: path.join(root, `output/playwright/immersive-guide-${name}.png`) });
      await guide.getByRole('button', { name: 'Back to room', exact: true }).click();
      await frame.waitForFunction(() => !roomViewer.inputPaused && !roomViewer.scheduler.pending);
      const afterGuideClose = await frame.evaluate(() => roomViewer.camera.position.toArray());
      afterGuideClose.forEach((value, index) => assert(Math.abs(value - beforeProp[index]) < 1e-5, 'guide dismissal restores previous camera'));
      report.guide = { closeRestoresCamera: true, computerCallbacks: [] };
      for (const [action, label, device] of [['experience', 'Explore Experience on the MacBook', 'laptop'], ['projects', 'Explore Projects on the Dell monitor', 'monitor']]) {
        await frame.evaluate(() => roomViewer.activate('wall-guide'));
        await guide.getByRole('button', { name: label, exact: true }).click();
        const computer = page.locator(`.room-computer-screen[data-device="${device}"]`);
        await computer.waitFor();
        assert.equal(await page.locator('.room-dialog').count(), 0, 'guide closes before entering the physical computer');
        await computer.getByRole('button', { name: 'Close computer page', exact: true }).click();
        await frame.waitForFunction(() => !roomViewer.inputPaused && !roomViewer.scheduler.pending);
        report.guide.computerCallbacks.push(action);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      result.viewports.push(report);
      console.log(`Verified ${name}: physical screens, enlargement, scroll, resizing, return, card alignment, guide callbacks${report.drawerDiscoveries ? ', five revealed drawer games' : ''}`);
      await context.close();
    }
    assert.deepEqual(result.errors, []);
  } finally {
    await browser.close();
    fs.mkdirSync(path.join(root, 'docs/2026-10-07-room-portfolio'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/2026-10-07-room-portfolio/immersive-browser.json'), JSON.stringify(result, null, 2) + '\n');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
