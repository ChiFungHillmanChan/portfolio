import * as THREE from 'three';

const GROUP_NAME = 'Desk • paired speakers and padded footrest';
const normalize = (name) => String(name || '').toLowerCase()
  .replace(/[\\/_-]+/g, ' ').replace(/\s+/g, ' ').trim();

// Names were inspected in the existing room GLB. Match normalized names because
// GLTFLoader replaces spaces and punctuation while retaining Blender suffixes.
const clutter = /^(accessory tray |tray |white monitor accessory tray |right desk |puzzle |portable drive\b|desk charger brick|desk side (black file case|case handle|slim binder)|binder |speaker |footrest |wiring |under desk wire cable basket|under desk power strip|power strip black plug|keyboard usb cable|laptop charging lead|mouse braided lead|webcam usb cable)/;

/** Clean the existing workstation and add the photographed pair and footrest. */
export function refineDesk(model, { width = 2, depth = 3.9 } = {}) {
  const previous = model.getObjectByName(GROUP_NAME);
  if (previous) model.remove(previous);
  const hiddenNames = [];
  model.traverse((object) => {
    if (object.isMesh && clutter.test(normalize(object.name))) {
      object.visible = false;
      object.userData.deskRefinementHidden = true;
      object.userData.layoutHidden = true;
      hiddenNames.push(object.name);
    }
  });

  const group = new THREE.Group(); group.name = GROUP_NAME;
  const ratio = Math.min(1, depth / 3.9), frontGap = Math.max(0, depth - 3.9);
  const roomZ = (nominalDepth) => -(frontGap + nominalDepth * ratio);
  const material = (color, roughness, metalness = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const cabinet = material(0x171918, .62);
  const rubber = material(0x0b0e0d, .83);
  const driverMetal = material(0x90918b, .31, .82);
  const surround = material(0x222522, .55, .08);
  const screwMetal = material(0x515650, .33, .70);
  const detailMetal = material(0x969b90, .46, .62);

  const place = (name, geometry, mat, x, y, z) => {
    const object = new THREE.Mesh(geometry, mat);
    object.name = name; object.position.set(x, y, z);
    object.castShadow = true; object.receiveShadow = true;
    object.userData.deskRefinementPart = true;
    group.add(object); return object;
  };
  const roundedShape = (w, h, r) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  const cylinderX = (name, x, y, z, radius, length, mat, segments = 40) => {
    const object = place(name, new THREE.CylinderGeometry(radius, radius, length, segments), mat, x, y, z);
    object.rotation.z = Math.PI / 2; return object;
  };
  const ringX = (name, x, y, z, radius, thickness, mat) => {
    const object = place(name, new THREE.TorusGeometry(radius, thickness, 10, 56), mat, x, y, z);
    object.rotation.y = Math.PI / 2; return object;
  };
  const wire = (name, points, radius, mat = rubber) =>
    place(name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
      40, radius, 6, false), mat, 0, 0, 0);

  // Dark cloth has a fine local weave; no downloaded image or runtime asset.
  const clothCanvas = document.createElement('canvas');
  clothCanvas.width = clothCanvas.height = 256;
  const ctx = clothCanvas.getContext('2d'), image = ctx.createImageData(256, 256);
  let seed = 1963;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const value = 185 + (seed / 4294967296 - .5) * 23 + ((x + y) % 3 === 0 ? 7 : -3);
      const offset = (y * 256 + x) * 4;
      image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const clothMap = new THREE.CanvasTexture(clothCanvas); clothMap.colorSpace = THREE.SRGBColorSpace;
  clothMap.wrapS = clothMap.wrapT = THREE.RepeatWrapping; clothMap.repeat.set(12, 12);
  clothMap.anisotropy = 4;
  const clothBump = clothMap.clone(); clothBump.colorSpace = THREE.NoColorSpace; clothBump.needsUpdate = true;
  const cloth = material(0x262927, .98, 0, { map: clothMap, bumpMap: clothBump, bumpScale: .00028 });
  const seamMat = material(0x32352f, .98);

  // A pair of compact box speakers, facing the chair along -X. The rounded
  // cabinet has an actual circular opening, so the recessed metal cone remains
  // visible rather than being covered by a solid front face.
  const speakerX = width - .375;
  const speakerHeight = .342, speakerDepth = .285, speakerWidth = .232;
  const speakerY = .184, driverY = .151;
  const frontX = speakerX - speakerDepth / 2;
  for (const [index, nominalDepth] of [1.38, 2.20].entries()) {
    const z = roomZ(nominalDepth);
    const shape = roundedShape(speakerWidth - .006, speakerHeight - .006, .007);
    const hole = new THREE.Path();
    hole.absarc(0, driverY - speakerY, .0755, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const bodyGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: speakerDepth - .006, bevelEnabled: true, bevelSegments: 3,
      bevelThickness: .003, bevelSize: .003, curveSegments: 18, steps: 1,
    });
    bodyGeometry.translate(0, 0, -speakerDepth / 2 + .003);
    const body = place(`Speaker ${index + 1} / rounded black cabinet`, bodyGeometry, cabinet, speakerX, speakerY, z);
    body.rotation.y = Math.PI / 2;
    place(`Speaker ${index + 1} / back panel`, new THREE.BoxGeometry(.009, .327, .221), cabinet,
      speakerX + speakerDepth / 2 - .009, speakerY, z);
    for (const dx of [-.10, .10]) {
      for (const dz of [-.075, .075]) {
        place(`Speaker ${index + 1} / rubber foot`, new THREE.CylinderGeometry(.012, .012, .018, 12),
          rubber, speakerX + dx, .009, z + dz);
      }
    }
    cylinderX(`Speaker ${index + 1} / driver shadow recess`, frontX + .034, driverY, z, .074, .005, rubber);
    ringX(`Speaker ${index + 1} / dark cast driver rim`, frontX - .002, driverY, z, .072, .0045, surround);
    ringX(`Speaker ${index + 1} / flexible cone surround`, frontX - .005, driverY, z, .065, .0052, rubber);

    const vertices = [], uvs = [], indices = [], steps = 64;
    const profile = [[.061, -.006], [.053, .003], [.039, .013], [.023, .023]];
    for (let row = 0; row < profile.length; row++) {
      const [radius, inward] = profile[row];
      for (let i = 0; i <= steps; i++) {
        const theta = i / steps * Math.PI * 2;
        vertices.push(frontX + inward, driverY + radius * Math.cos(theta), z + radius * Math.sin(theta));
        uvs.push(i / steps, row / (profile.length - 1));
        if (row < profile.length - 1 && i < steps) {
          const a = row * (steps + 1) + i, b = a + steps + 1;
          indices.push(a, b, b + 1, a, b + 1, a + 1);
        }
      }
    }
    const coneGeometry = new THREE.BufferGeometry();
    coneGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    coneGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    coneGeometry.setIndex(indices); coneGeometry.computeVertexNormals();
    place(`Speaker ${index + 1} / recessed brushed silver cone`, coneGeometry, driverMetal, 0, 0, 0);
    const cap = place(`Speaker ${index + 1} / domed silver dust cap`, new THREE.SphereGeometry(1, 28, 16),
      driverMetal, frontX + .016, driverY, z);
    cap.scale.set(.015, .025, .025);
    for (let screw = 0; screw < 4; screw++) {
      const theta = Math.PI / 4 + screw * Math.PI / 2;
      cylinderX(`Speaker ${index + 1} / recessed fixing screw`, frontX - .002, driverY + .083 * Math.cos(theta),
        z + .083 * Math.sin(theta), .0020, .002, screwMetal, 10);
    }
    place(`Speaker ${index + 1} / small understated badge`, new THREE.BoxGeometry(.001, .0035, .021),
      detailMetal, frontX - .0007, .292, z);
  }

  // Broad black foam footrest has a flat nonslip base and a rising padded top.
  const footX = width - .425, footZ = roomZ(1.79);
  const profile = new THREE.Shape();
  profile.moveTo(-.177, .034); profile.lineTo(.175, .034);
  profile.quadraticCurveTo(.192, .034, .192, .053);
  profile.lineTo(.192, .181);
  profile.quadraticCurveTo(.191, .220, .160, .220);
  profile.lineTo(-.150, .159);
  profile.quadraticCurveTo(-.191, .153, -.191, .113);
  profile.lineTo(-.191, .054);
  profile.quadraticCurveTo(-.191, .034, -.177, .034);
  const cushionGeometry = new THREE.ExtrudeGeometry(profile, {
    depth: .410, bevelEnabled: true, bevelSegments: 5,
    bevelThickness: .012, bevelSize: .006, curveSegments: 16, steps: 1,
  });
  cushionGeometry.translate(0, 0, -.205);
  place('Footrest / thick sloping black fabric cushion', cushionGeometry, cloth, footX, 0, footZ);
  const soleShape = roundedShape(.384, .425, .020);
  const soleGeometry = new THREE.ExtrudeGeometry(soleShape, {
    depth: .020, bevelEnabled: true, bevelSegments: 3,
    bevelThickness: .003, bevelSize: .003, curveSegments: 12,
  });
  soleGeometry.rotateX(Math.PI / 2); soleGeometry.translate(0, .027, 0);
  place('Footrest / flat nonslip base', soleGeometry, rubber, footX, 0, footZ);
  const topSeam = [
    [-.167,.158,-.181],[-.178,.165,-.205],[.159,.224,-.205],[.190,.212,-.181],
    [.190,.212,.181],[.159,.224,.205],[-.178,.165,.205],[-.167,.158,.181],[-.167,.158,-.181],
  ].map(([x,y,z]) => [footX+x,y,footZ+z]);
  wire('Footrest / stitched upholstered edge', topSeam, .0012, seamMat);

  // The only floor-area cables follow the wall behind the speakers, held clear
  // of the walking space. Original dangling loops and coils were hidden above.
  const cableX = width - .045;
  for (const d of [1.38, 2.20]) {
    const z = roomZ(d);
    wire('Speakers / cable routed behind cabinet', [
      [speakerX + .143,.093,z], [width - .083,.075,z],
      [cableX,.092,z], [cableX,.34,z], [cableX,.697,z],
    ], .0018);
    for (const y of [.20, .54]) {
      place('Speakers / discreet wall cable clip', new THREE.BoxGeometry(.008,.008,.009),
        rubber, cableX+.003,y,z);
    }
  }
  wire('Desk / tidy rear cable run', [
    [cableX,.697,roomZ(1.38)],[cableX,.699,roomZ(1.66)],
    [cableX,.699,roomZ(1.99)],[cableX,.697,roomZ(2.20)],
  ], .0022);
  group.userData.hiddenOriginalNames = hiddenNames;
  group.userData.description = 'Tidy desk with a matched pair of black speakers and a padded footrest between them';
  group.userData.speakerDepths = [1.38, 2.20].map((d) => frontGap + d * ratio);
  model.add(group);
  return group;
}
