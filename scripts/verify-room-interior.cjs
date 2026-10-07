/* Headless interior-camera acceptance against a local preview. */
const { chromium } = require(process.env.ROOM_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.ROOM_URL || 'http://127.0.0.1:4175';
const output = process.env.ROOM_SCREENSHOT_DIR || 'output/playwright';
const reportPath = process.env.ROOM_REPORT_PATH || 'docs/2026-10-07-room-portfolio/interior-browser.json';
const conditions = {
  browser: 'Chrome, headless',
  viewports: [{ name: 'desktop', width: 1440, height: 900 }, { name: 'phone', width: 390, height: 844 }],
  actions: ['Real Projects screen click and close', 'Real Experience screen click and close', 'Entrance door compact overlay and return', 'Focus wardrobe with entrance door ajar, then click its actual handle closed', 'Three orbit drags', 'Zoom out/in by 7000 wheel units'],
  assertions: ['Standing-height initial camera with near-level gaze', 'Back to room is hidden in overview and visible for object focus', 'Every rendered camera stays inside the shell safety bounds', 'All non-layout-hidden walls remain visible', 'Wardrobe approach clears the ajar entrance door and its physical handle closes it', 'No page errors'],
};
const reports = [];
const idle = frame => frame.waitForFunction(() => window.roomViewer && !roomViewer.inputPaused && !roomViewer.focus.transitioning && !roomViewer.scheduler.pending);

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const { name, width, height } of conditions.viewports) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base.replace(/\/$/, '')}/room`);
      await page.getByRole('button', { name: 'Enter my room', exact: true }).waitFor({ timeout: 60000 });
      await page.getByRole('button', { name: 'Enter my room', exact: true }).click();
      const frame = page.frames().find(candidate => candidate.url().includes('/room-viewer/'));
      await idle(frame);
      assert.equal(await frame.locator('#back-to-room').isVisible(), false);
      const initialCamera = await frame.evaluate(() => ({ position: roomViewer.camera.position.toArray(), direction: roomViewer.camera.getWorldDirection(roomViewer.camera.position.clone()).toArray(), fov: roomViewer.camera.fov }));
      assert.ok(initialCamera.position[1] >= 1.5 && initialCamera.position[1] <= 1.65);
      assert.ok(initialCamera.direction[1] < 0 && initialCamera.direction[1] > -.18);
      await frame.evaluate(() => {
        window.__interiorSweep = { frames: 0, escaped: [], hiddenWalls: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
        const render = roomViewer.renderer.render.bind(roomViewer.renderer);
        roomViewer.renderer.render = (scene, camera) => {
          const p = camera.position, coordinates = p.toArray(), sweep = window.__interiorSweep;
          sweep.frames++;
          coordinates.forEach((number, i) => { sweep.min[i] = Math.min(number, sweep.min[i]); sweep.max[i] = Math.max(number, sweep.max[i]); });
          const { width, height, depth } = roomViewer.layout;
          if (p.x < .07499 || p.x > width - .07499 || p.y < .07499 || p.y > height - .14999 || p.z > -.09999 || p.z < -depth + .07499) sweep.escaped.push(coordinates);
          sweep.hiddenWalls += roomViewer.shells.filter(shell => !shell.object.userData.layoutHidden && !shell.object.visible).length;
          return render(scene, camera);
        };
      });
      await page.screenshot({ path: path.join(output, `interior-overview-integrated-${name}.png`) });
      for (const action of ['projects', 'experience']) {
        const point = await frame.evaluate(id => {
          const object = roomViewer.entries.get(id).objects.find(candidate => /illuminated/.test(candidate.name));
          object.geometry.computeBoundingBox();
          const p = object.geometry.boundingBox.getCenter(object.position.clone()).applyMatrix4(object.matrixWorld).project(roomViewer.camera);
          return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 };
        }, action);
        await page.mouse.click(point.x, point.y);
        await page.locator('.room-computer-screen').waitFor();
        await frame.waitForFunction(() => roomViewer.inputPaused && !roomViewer.focus.transitioning);
        await page.getByRole('button', { name: 'Close computer page', exact: true }).click();
        await idle(frame);
        assert.equal(await frame.locator('#back-to-room').isVisible(), false);
      }
      await frame.evaluate(() => roomViewer.activate('door'));
      await page.getByRole('dialog', { name: 'Working from home', exact: true }).waitFor();
      await frame.waitForFunction(() => roomViewer.inputPaused && !roomViewer.focus.transitioning);
      await page.screenshot({ path: path.join(output, `interior-door-overlay-${name}.png`) });
      const door = await frame.evaluate(() => ({ position: roomViewer.camera.position.toArray(), fov: roomViewer.camera.fov }));
      await page.getByRole('button', { name: 'Back to room', exact: true }).click();
      await idle(frame);
      assert.equal(await frame.locator('#back-to-room').isVisible(), false);
      await frame.evaluate(async () => {
        const THREE = await import('./vendor/build/three.module.js');
        const ray = new THREE.Raycaster(), render = roomViewer.renderer.render.bind(roomViewer.renderer);
        window.__wardrobeClearance = [];
        roomViewer.renderer.render = (scene, camera) => {
          ray.setFromCamera(new THREE.Vector2(), camera);
          const hit = ray.intersectObject(roomViewer.model, true).find(({ object }) => {
            for (let node = object; node; node = node.parent) if (!node.visible || node.userData.layoutHidden) return false;
            return true;
          });
          if (hit && hit.distance < .035) window.__wardrobeClearance.push({ object: hit.object.name, distance: hit.distance, position: camera.position.toArray() });
          return render(scene, camera);
        };
        roomViewer.activate('wardrobe-left');
      });
      await idle(frame);
      assert.equal(await frame.locator('#back-to-room').isVisible(), true);
      await page.screenshot({ path: path.join(output, `interior-wardrobe-clearance-${name}.png`) });
      const wardrobe = await frame.evaluate(async () => {
        const THREE = await import('./vendor/build/three.module.js');
        const entry = roomViewer.entries.get('wardrobe-left'), ray = new THREE.Raycaster(), handles = [];
        entry.objects[0].traverse(object => {
          if (!/handle/.test(object.name)) return;
          const point = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).project(roomViewer.camera);
          ray.setFromCamera(new THREE.Vector2(point.x, point.y), roomViewer.camera);
          const hit = ray.intersectObject(roomViewer.model, true).find(({ object: mesh }) => {
            for (let node = mesh; node; node = node.parent) if (!node.visible || node.userData.layoutHidden) return false;
            return true;
          });
          let owned = false;
          for (let node = hit?.object; node; node = node.parent) if (entry.objects.includes(node)) owned = true;
          handles.push({ x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2, owned });
        });
        return { position: roomViewer.camera.position.toArray(), open: roomViewer.furniture.state['wardrobe-left'].open, handles, clearance: window.__wardrobeClearance };
      });
      assert.equal(wardrobe.open, true);
      assert.deepEqual(wardrobe.clearance, [], 'wardrobe transition must not enter the ajar entrance leaf');
      const handle = wardrobe.handles.find(point => point.owned && point.x > 0 && point.x < width && point.y > 60 && point.y < height);
      assert.ok(handle, 'opened wardrobe has a visible, unoccluded handle');
      await page.mouse.click(handle.x, handle.y);
      await idle(frame);
      assert.equal(await frame.evaluate(() => roomViewer.furniture.state['wardrobe-left'].open), false);
      wardrobe.closedByHandle = true;
      await frame.locator('#back-to-room').click();
      await idle(frame);
      assert.equal(await frame.locator('#back-to-room').isVisible(), false);
      for (const [x, y] of [[width * .9, height * .2], [width * .1, height * .9], [width * .8, height * .8]]) {
        await page.mouse.move(width * .5, height * .5);
        await page.mouse.down();
        await page.mouse.move(x, y, { steps: 12 });
        await page.mouse.up();
        await idle(frame);
      }
      await page.mouse.wheel(0, 7000); await idle(frame);
      await page.mouse.wheel(0, -7000); await idle(frame);
      assert.equal(await frame.locator('#back-to-room').isVisible(), false, 'general orbit and zoom do not reveal an object return button');
      const sweep = await frame.evaluate(() => window.__interiorSweep);
      assert.deepEqual(sweep.escaped, []);
      assert.equal(sweep.hiddenWalls, 0);
      assert.deepEqual(errors, []);
      reports.push({ name, initialCamera, overviewBackHidden: true, focusedBackVisible: true, door, wardrobe, sweep, errors });
      console.log(JSON.stringify(reports.at(-1)));
      await page.close();
    }
  } finally {
    await browser.close();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify({ url: `${base.replace(/\/$/, '')}/room`, capturedAt: new Date().toISOString(), conditions, results: reports }, null, 2)}\n`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
