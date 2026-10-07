import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRenderSize, fitCameraDistance } from './viewer-sizing.mjs';

test('phone/tablet buffers cap DPR and pixel budget without supersampling low DPR', () => {
  for (const [width, height, dpr] of [[390, 844, 3], [320, 568, 1], [844, 390, 3], [768, 1024, 2]]) {
    const size = calculateRenderSize({ width, height, dpr, mobile: true });
    assert.ok(size.pixelRatio <= 1.35);
    assert.ok(size.width * size.height <= 1.5 * 1024 * 1024);
    assert.ok(Math.abs(size.width / size.height - width / height) < .006);
  }
  assert.equal(calculateRenderSize({width:320,height:568,dpr:1,mobile:true}).pixelRatio,1);
});

test('desktop buffers honor budget and hard GPU dimensions', () => {
  const size = calculateRenderSize({width:5120,height:2880,dpr:4});
  assert.ok(size.width * size.height <= 3 * 1024 * 1024);
  const limited = calculateRenderSize({width:390,height:844,dpr:3,maxHeight:600});
  assert.equal(limited.height,600);
});

test('overview corners stay inside the unobstructed region on phone, tablet and desktop', () => {
  // An oblique room box expressed along camera right, up and backward axes.
  const corners = [[-2.2, -1.8, .8], [1.9, -1.6, -1.5], [2.2, 1.7, -.8], [-1.9, 1.9, 1.5]];
  for (const [width, height, safeWidth, safeHeight] of [
    [390, 844, 358, 480], [844, 390, 812, 206], [768, 1024, 720, 690],
    [1024, 768, 976, 460], [1440, 900, 1376, 590],
  ]) {
    const distance = fitCameraDistance({ corners, fov: 52, aspect: width / height, widthFraction: safeWidth / width, heightFraction: safeHeight / height });
    const tangent = Math.tan(52 * Math.PI / 360);
    for (const [x, y, z] of corners) {
      const projectedX = Math.abs(x / ((distance - z) * tangent * width / height));
      const projectedY = Math.abs(y / ((distance - z) * tangent));
      assert.ok(projectedX < safeWidth / width);
      assert.ok(projectedY < safeHeight / height);
    }
  }
});

test('fitting includes perspective depth so near room corners cannot be clipped', () => {
  const distance = fitCameraDistance({ corners: [[1, 1, 3], [-1, -1, -3]], fov: 90, aspect: 1, widthFraction: 1, heightFraction: 1 });
  assert.ok(distance > 4);
  assert.ok(distance < 4.2);
});
