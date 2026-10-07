import * as THREE from 'three';

// Room coordinates: x across, d towards the window, h upwards. The bed keeps
// its photographed frame and dolls, with charcoal and warm white striped bedding.
export const bedManifest = {};
export const OLD_BED_PATTERN = /^(daybed |bed end rail|storage dark reveal|recessed drawer pull)|duvet|pillow|plush|tiny teddy|^teddy |^peach patchwork fitted sheet/i;
const normalize = (s) => String(s).replace(/[\/_]+/g, ' ').replace(/\s+/g, ' ').trim();
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const gauss = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
const spow = (x, p) => Math.sign(x) * Math.abs(x) ** p;
const softmax = (a, b, k = .009) => Math.max(a, b) + k * Math.log1p(Math.exp(-Math.abs(a - b) / k));

function fabricTexture(kind = 'plain', size = 512) {
  let state = 7481 + kind.length * 73;
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
  const pixels = new Uint8Array(size * size * 4);
  const streak = Array.from({ length: size }, () => (random() - .5) * 12);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    let rgb = [206, 204, 197];
    if (kind === 'stripe') {
      // Uneven yarn-dyed lanes run along the bed; fine broken threads soften
      // the boundaries without changing the existing cloth geometry or UVs.
      const drift = .035 * Math.sin(v * Math.PI * 8 + u * Math.PI * 10) + .014 * Math.sin(v * Math.PI * 22 + u * Math.PI * 6);
      const phase = ((u * 13 + drift) % 1 + 1) % 1;
      const yarn = .017 * Math.sin(x * 1.7) + .012 * Math.sin(x * 3.1 + Math.sin(y * .023));
      const pale = smooth((phase - .50 - yarn) / .070) * (1 - smooth((phase - .80 - yarn) / .075));
      const faded = .24 * smooth((phase - .29) / .12) * (1 - smooth((phase - .89) / .08));
      const blend = Math.max(pale, faded);
      rgb = [68 + blend * 145, 72 + blend * 136, 71 + blend * 126];
    } else if (kind === 'pink') {
      const patch = (Math.floor(u * 5) + Math.floor(v * 5)) % 2;
      rgb = patch ? [224, 157, 147] : [237, 213, 187];
    } else if (kind === 'red') {
      const motif = (Math.floor((u + v) * 8) % 4 === 0) || (Math.floor(u * 15) % 7 === 0 && Math.floor(v * 15) % 4 < 2);
      rgb = motif ? [178, 175, 143] : [138, 33, 36];
    } else if (kind === 'reverse') {
      const shade = 1.3 * Math.sin(u * 19 + v * 8) + .8 * Math.sin(v * 27);
      rgb = [51 + shade, 64 + shade, 56 + shade];
    } else if (kind === 'weave') {
      const warp = Math.sin(x * Math.PI / 2), weft = Math.sin(y * Math.PI / 2);
      const shade = 128 + 22 * warp + 19 * weft + 8 * warp * weft;
      rgb = [shade, shade, shade];
    } else if (kind === 'quilt') {
      const sign = Math.floor(u * 7) % 2 ? 1 : -1;
      const phase = ((x + sign * y * .66) % 18 + 18) % 18;
      const shade = 135 + 90 * Math.exp(-(((phase - 9) / 3.5) ** 2));
      rgb = [shade, shade, shade];
    }
    const grain = (random() - .5) * (kind === 'stripe' ? 31 : 14) + (x % 3 === 0 ? 4 : -1) + (y % 4 === 0 ? -4 : 1);
    const variation = grain + (kind === 'stripe' ? streak[x] * 2 + 5 * Math.sin(y * .47 + x * .031) : 0);
    const i = (y * size + x) * 4;
    for (let k = 0; k < 3; k++) pixels[i + k] = clamp(rgb[k] + variation, 0, 255);
    pixels[i + 3] = 255;
  }
  let texture;
  if (kind === 'pink' && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const c = canvas.getContext('2d'); const data = c.createImageData(size, size); data.data.set(pixels); c.putImageData(data, 0, 0);
    c.strokeStyle = '#ad354e'; c.lineWidth = size / 240; c.lineCap = 'round';
    // Small red outlined cat motifs scattered over peach patchwork fabric.
    for (const [ux, vy, a] of [[.18, .17, -.25], [.75, .3, .35], [.35, .76, .2], [.88, .89, -.35]]) {
      c.save(); c.translate(ux * size, vy * size); c.rotate(a); const r = size * .070;
      c.beginPath(); c.moveTo(-r, -r * .3); c.lineTo(-r, -r * .83); c.lineTo(-r * .45, -r * .68);
      c.quadraticCurveTo(0, -r * .92, r * .45, -r * .68); c.lineTo(r, -r * .86); c.lineTo(r, -r * .25);
      c.bezierCurveTo(r * 1.20, r * .90, -r * 1.20, r * .90, -r, -r * .3); c.stroke();
      c.fillStyle = '#af344a'; for (const ex of [-.36, .36]) { c.beginPath(); c.ellipse(ex * r, r * .06, r * .035, r * .09, 0, 0, Math.PI * 2); c.fill(); }
      for (const side of [-1, 1]) for (let j = 0; j < 3; j++) { c.beginPath(); c.moveTo(side * r * .72, (j - 1) * r * .18 + r * .22); c.lineTo(side * r * 1.03, (j - 1) * r * .26 + r * .22); c.stroke(); }
      c.restore();
    }
    texture = new THREE.CanvasTexture(canvas);
  } else {
    texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat); texture.needsUpdate = true;
  }
  texture.colorSpace = ['quilt', 'weave'].includes(kind) ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 6;
  texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export function addBed(model, { width = 2, depth = 3.9 } = {}) {
  const previous = model.getObjectByName('Bed • photographed bedding and plush row');
  if (previous) {
    previous.removeFromParent(); const disposed = new Set();
    previous.traverse((o) => { if (o.geometry) o.geometry.dispose(); for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m && !disposed.has(m)) { disposed.add(m); m.dispose(); } });
  }
  const hidden = [];
  model.traverse((o) => {
    if (o.isMesh && !o.userData.proceduralBed && (o.userData.layoutCategory === 'bed' || OLD_BED_PATTERN.test(normalize(o.name)))) {
      o.visible = false; o.userData.layoutHidden = true; o.userData.replacedByBed = true; hidden.push(o.name);
    }
  });
  const group = new THREE.Group(); group.name = 'Bed • photographed bedding and plush row';
  group.userData.proceduralBed = true;
  const ratio = Math.min(1, depth / 3.9), bedLength = 1.20 * ratio, front = depth - bedLength;
  const fabricMap = fabricTexture('plain', 256), redMap = fabricTexture('red', 256);
  const stripeMap = fabricTexture('stripe', 1024), pinkMap = fabricTexture('pink', 512), reverseMap = fabricTexture('reverse', 512), cottonWeave = fabricTexture('weave', 256);
  const pillowStripeMap = stripeMap.clone(); pillowStripeMap.repeat.set(.24, .58); pillowStripeMap.offset.set(.08, .17); pillowStripeMap.needsUpdate = true;
  cottonWeave.repeat.set(8, 5);
  const grain = fabricMap.clone(); grain.colorSpace = THREE.NoColorSpace; grain.needsUpdate = true;
  const cloth = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .96, sheen: .18, sheenRoughness: 1, sheenColor: new THREE.Color(0x9b968c), bumpMap: grain, bumpScale: .00048, ...extra });
  const M = {
    striped: cloth(0xffffff, { map: stripeMap, bumpMap: cottonWeave, bumpScale: .00065, sheenColor: new THREE.Color(0xb5b4aa), sheen: .12 }),
    pillowStripe: cloth(0xffffff, { map: pillowStripeMap, bumpMap: cottonWeave, bumpScale: .0005, sheenColor: new THREE.Color(0xb5b4aa), sheen: .12 }),
    fittedSheet: cloth(0xffffff, { map: pinkMap, bumpMap: cottonWeave, bumpScale: .0005 }),
    reverse: cloth(0xffffff, { map: reverseMap, bumpMap: cottonWeave, bumpScale: .0005, sheenColor: new THREE.Color(0x768075), sheen: .10 }),
    charcoalPiping: cloth(0x525a54, { bumpMap: cottonWeave, bumpScale: .0004 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe5e3d9, roughness: .46 }),
    shadow: new THREE.MeshStandardMaterial({ color: 0x282a26, roughness: .96 }),
    stitch: cloth(0x666e69), black: cloth(0x1b1b18), grey: cloth(0x9a9587),
    orange: cloth(0xd67518), orangeLight: cloth(0xe89535), tan: cloth(0x997034),
    creamToy: cloth(0xe6dbb9), mint: cloth(0xacbf98), brown: cloth(0x936628),
    blue: cloth(0x247289), peach: cloth(0xe6b58e), peachShade: cloth(0xd6a077),
    green: cloth(0x669633), darkGreen: cloth(0x4a7425), red: cloth(0xb33630),
    redPattern: cloth(0xffffff, { map: redMap }), blonde: cloth(0xc9c2a7), hairLight: cloth(0xdbd2b7),
    skin: cloth(0xe0c9a4), animeDark: cloth(0x252f30), iris: cloth(0x843e30), mouth: cloth(0x71564b),
    furBrown: cloth(0xb37b42), earBrown: cloth(0x724526), antler: cloth(0x49301e), burgundy: cloth(0x782239),
    yellow: cloth(0xeac224), bootYellow: cloth(0xd79820), hairTeal: cloth(0x47756d), navy: cloth(0x293438), teaLid: cloth(0xdcc398),
  };
  const room = (x, d, h) => new THREE.Vector3(x, h, -d);
  const place = (name, geometry, material, x = 0, d = 0, h = 0) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.name = `Bed / ${name}`; mesh.position.copy(room(x, d, h));
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.proceduralBed = true; mesh.userData.bedPart = true;
    group.add(mesh); return mesh;
  };
  const roundBox = (name, x, d, h, sx, sd, sh, mat, radius = .003) => {
    const r = Math.min(radius, sx / 5, sd / 3, sh / 5), a = sx / 2 - r, b = sh / 2 - r;
    const shape = new THREE.Shape(); shape.moveTo(-a, -b); shape.lineTo(a, -b); shape.lineTo(a, b); shape.lineTo(-a, b); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: sd - r * 2, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, steps: 1, curveSegments: 4 });
    geometry.translate(0, 0, -sd / 2 + r); return place(name, geometry, mat, x, d, h);
  };
  const ball = (name, x, d, h, sx, sd, sh, mat, tilt = 0) => {
    const g = new THREE.SphereGeometry(1, 24, 14), a = g.getAttribute('position');
    for (let i = 0; i < a.count; i++) {
      const vx = a.getX(i), vy = a.getY(i), vz = a.getZ(i);
      const stuffed = 1 + .007 * Math.sin(vx * 14 + vz * 7) * Math.sin(vy * 11 - vx * 3);
      a.setXYZ(i, vx * stuffed, vy * stuffed, vz * stuffed);
    }
    g.computeVertexNormals(); const o = place(name, g, mat, x, d, h); o.scale.set(sx, sh, sd); o.rotation.z = tilt; return o;
  };
  const line = (name, points, radius, mat) => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => room(...p)));
    return place(name, new THREE.TubeGeometry(curve, Math.max(16, points.length * 5), radius, 6, false), mat);
  };
  const surface = (name, fn, mat, nx = 100, ny = 70, thickness = .010) => {
    const positions = [], uvs = [], indices = [], row = nx + 1, layer = row * (ny + 1);
    for (let side = 0; side < (thickness ? 2 : 1); side++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const p = fn(i / nx, j / ny), loft = typeof thickness === 'function' ? thickness(i / nx, j / ny) : thickness;
      positions.push(p[0], p[2] - side * loft, -p[1]); uvs.push(i / nx, j / ny);
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = j * row + i, b = a + 1, c = a + row + 1, d = a + row;
      indices.push(a, b, d, b, c, d); if (thickness) indices.push(a + layer, d + layer, b + layer, b + layer, d + layer, c + layer);
    }
    if (thickness) {
      const perimeter = [];
      for (let i = 0; i <= nx; i++) perimeter.push(i);
      for (let j = 1; j <= ny; j++) perimeter.push(j * row + nx);
      for (let i = nx - 1; i >= 0; i--) perimeter.push(ny * row + i);
      for (let j = ny - 1; j > 0; j--) perimeter.push(j * row);
      for (let i = 0; i < perimeter.length; i++) { const a = perimeter[i], b = perimeter[(i + 1) % perimeter.length]; indices.push(a, a + layer, b, b, a + layer, b + layer); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals();
    return place(name, g, mat);
  };
  const cushion = (name, x, d, h, sx, sd, sh, mat, tilt = 0, power = .38) => {
    const positions = [], uvs = [], indices = [], nu = 64, nv = 28;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const p = (j / nv - .5) * Math.PI, t = i / nu * Math.PI * 2;
      const edge = Math.exp(-((Math.sin(p) / .37) ** 2));
      const ripple = .0023 * (Math.sin(t * 17 + p) + .3 * Math.sin(t * 27)) * edge;
      let xx = sx * spow(Math.cos(p), power) * spow(Math.cos(t), power) + ripple * Math.cos(t);
      let dd = sd * spow(Math.cos(p), power) * spow(Math.sin(t), power) + ripple * Math.sin(t);
      const hh = sh * spow(Math.sin(p), .80) + .0015 * Math.sin(t * 13) * Math.cos(p);
      positions.push(x + xx * Math.cos(tilt) - dd * Math.sin(tilt), h + hh, -(d + xx * Math.sin(tilt) + dd * Math.cos(tilt))); uvs.push(i / nu, j / nv);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i; indices.push(a, a + 1, a + nu + 1, a + 1, a + nu + 2, a + nu + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals(); return place(name, g, mat);
  };

  // White storage daybed: two columns and two rows, shallow recessed top pulls.
  roundBox('storage bed carcass', width / 2, front + bedLength / 2 + .035, .338, width - .086, bedLength - .095, .556, M.white, .004);
  roundBox('dark gaps behind four drawers', width / 2, front + .062, .30, width - .13, .012, .49, M.shadow, .001);
  const drawerWidth = (width - .17) / 2;
  for (let column = 0; column < 2; column++) for (let row = 0; row < 2; row++) {
    const x = .069 + drawerWidth / 2 + column * (drawerWidth + .032), h = .183 + row * .235;
    // Every closed drawer shares one front plane, clear of the shelf boundary.
    const d = front + .034;
    roundBox(`white storage drawer ${column + 1}-${row + 1}`, x, d, h, drawerWidth, .032, .212, M.white, .004);
    roundBox(`recessed dark drawer pull ${column + 1}-${row + 1}`, x, d - .018, h + .091, .126, .002, .023, M.shadow, .001);
    roundBox(`rounded drawer pull lower lip ${column + 1}-${row + 1}`, x, d - .020, h + .081, .110, .004, .007, M.white, .001);
  }
  // Fixed white face-frame pieces leave only 4–5 mm reveals around closed fronts.
  roundBox('fixed white top filler rail', width / 2, front + .036, .574, width - .086, .036, .090, M.white, .002);
  roundBox('fixed white center stile', width / 2, front + .034, .3005, .024, .032, .447, M.white, .0015);
  roundBox('fixed white horizontal divider rail', width / 2, front + .037, .3005, width - .138, .026, .015, M.white, .0015);
  for (const x of [.048, width - .048]) roundBox('low side rail', x, front + bedLength / 2, .685, .035, bedLength, .138, M.white, .005);
  // A closed mattress with gently rounded edges replaces the old lens-shaped
  // superellipsoid. Its pink and cream fitted cover stays behind the hanging quilt.
  const mattress = roundBox('pink cream fitted mattress with enclosed rounded profile', width / 2,
    front + bedLength / 2 + .020, .681, width - .148, bedLength - .110, .128, M.fittedSheet, .018);
  mattress.userData.inspectionTarget = true;
  mattress.userData.display_name = 'Pink and cream fitted mattress';
  mattress.userData.description = 'A fully enclosed mattress in a pink and cream patchwork cotton fitted sheet with small red outlined motifs.';

  // The main cloth turns continuously from its short vertical front drape to a
  // softly lofted top. The rounded turn stays outside the mattress, and behind
  // the neighbouring shelf; it does not expose a flat strip or a bulging lens.
  const quiltBack = depth - .345;
  const turnEnd = front + .096;
  const topHeight = (u, v) => {
    const edgeFade = Math.sin(Math.PI * clamp(u)) ** .6;
    let h = .797;
    h += .007 * Math.sin(7.5 * u + 1.8 * v) * Math.sin(Math.PI * v);
    h += .012 * Math.exp(-Math.pow((v - .39 - .16 * u) / .060, 2)) * edgeFade;
    h -= .0045 * Math.exp(-Math.pow((v - .47 - .16 * u) / .046, 2)) * edgeFade;
    h += .006 * gauss(u, v, .72, .73, .23, .20);
    h += .004 * Math.sin(u * 24 + v * 13) * Math.exp(-v * 7) * edgeFade;
    h += .0017 * Math.sin(37 * u - 11 * v) * Math.sin(19 * v + 4 * u) * edgeFade;
    // Three localized compression creases have gently raised shoulders and a
    // narrower trough. They taper before the edges rather than repeating as waves.
    const creaseFade = smooth(v / .12) * smooth((1 - v) / .13) * smooth(u / .10) * smooth((1 - u) / .10);
    const crease = (path, span, center, reach, lift) => {
      const along = Math.exp(-Math.pow((u - center) / reach, 4));
      return along * (lift * Math.exp(-Math.pow((v - path) / span, 2)) - .008 * Math.exp(-Math.pow((v - path - span * 1.7) / (span * .80), 2)));
    };
    h += creaseFade * crease(.30 + .35 * (u - .42) + .025 * Math.sin(u * 8), .026, .55, .31, .032);
    h += creaseFade * crease(.73 - .43 * (u - .64), .028, .73, .20, .038);
    h += creaseFade * crease(.155 + .19 * (u - .59), .023, .80, .17, .026);
    // Softer side edges; the center keeps the shallow loft of a cotton duvet.
    h -= .028 * Math.exp(-u / .020) + .028 * Math.exp(-(1 - u) / .020);
    return h;
  };
  const duvetShape = (u, v) => {
    const x = .058 + (width - .116) * u + .0013 * Math.sin(v * 16) * Math.sin(Math.PI * u);
    const frontVariation = .0015 * Math.sin(u * 14 + .8);
    if (v <= .17) {
      const t = v / .17, angle = t * Math.PI / 2;
      const d = front + .028 + .068 * (1 - Math.cos(angle)) + frontVariation * (1 - t);
      const hem = .647 + .004 * Math.sin(u * 11 + .4) + .002 * Math.sin(u * 25);
      let h = hem + (topHeight(u, 0) - hem) * Math.sin(angle);
      // A few irregular vertical creases relax as the cloth turns onto the bed.
      h += .0025 * Math.sin(u * 34 + 2 * t) * Math.sin(Math.PI * t);
      return [x, d, h];
    }
    const t = (v - .17) / .83;
    return [x, turnEnd + (quiltBack - turnEnd) * t, topHeight(u, t)];
  };
  const duvet = surface('charcoal warm white striped duvet with natural drape and creases', duvetShape, M.striped, 152, 118, (u, v) => v <= .17 ? .013 : .013 + .017 * Math.sin(Math.PI * u) * smooth((v - .17) / .10) * smooth((1 - v) / .065));
  duvet.userData.inspectionTarget = true;
  duvet.userData.display_name = 'Charcoal and warm white striped duvet';
  duvet.userData.description = 'A softly filled quilt with irregular lengthwise charcoal and warm off-white woven stripes, naturally creased over a pink and cream fitted sheet.';
  const hem = [];
  for (let i = 0; i <= 100; i++) { const p = duvetShape(i / 100, 0); p[2] -= .003; hem.push(p); }
  line('charcoal duvet softly sewn front hem', hem, .0019, M.charcoalPiping);

  // The dark grey-green reverse folds back as fabric, with a slightly irregular rounded
  // lip. It lies directly on the duvet and finishes before the windowsill.
  const cuffShape = (u, v) => {
    const leading = quiltBack - .143 + .009 * Math.sin(u * 8 + .6) + .003 * Math.sin(u * 23);
    const d = leading + (quiltBack - .007 - leading) * v;
    const t = (d - turnEnd) / (quiltBack - turnEnd);
    let h = topHeight(u, t) + .007 + .028 * Math.exp(-Math.pow((v - .10) / .15, 2));
    h += .0018 * Math.sin(u * 29 + v * 7) * Math.sin(Math.PI * v);
    return [.064 + (width - .128) * u, d, h];
  };
  surface('dark grey green cotton reverse turned over at quilt head', cuffShape, M.reverse, 116, 36, (u, v) => .005 + .020 * Math.exp(-Math.pow((v - .10) / .17, 2)));
  const cuffHem = [];
  for (let i = 0; i <= 85; i++) { const p = cuffShape(i / 85, 0); p[2] -= .001; cuffHem.push(p); }
  line('dark turn-down soft rolled seam', cuffHem, .0019, M.reverse);

  // One complete rectangular pillow, with softly stuffed corners and pinched
  // cotton seams. Its low contact surface rests on the quilt without a cutout.
  const pillowcase = (name, x, d, h, sx, sd, sh, angle = 0) => {
    const pillow = cushion(name, x, d, h, sx, sd, sh, M.pillowStripe, angle, .30);
    const positions = pillow.geometry.getAttribute('position'), uv = pillow.geometry.getAttribute('uv');
    for (let i = 0; i < positions.count; i++) {
      const dx = positions.getX(i) - x, dd = -positions.getZ(i) - d;
      const localX = dx * Math.cos(angle) + dd * Math.sin(angle);
      const localD = -dx * Math.sin(angle) + dd * Math.cos(angle);
      const top = smooth((positions.getY(i) - h) / sh);
      const sideCrease = .0038 * Math.exp(-Math.pow((Math.abs(localX) - sx * .80) / .031, 2)) * Math.sin(localD * 35 + .8);
      const endCrease = .0030 * Math.exp(-Math.pow((Math.abs(localD) - sd * .83) / .038, 2)) * Math.sin(localX * 43 + .4);
      const crown = .024 * Math.pow(Math.max(0, 1 - (localX / sx) ** 2), .85) * Math.pow(Math.max(0, 1 - (localD / sd) ** 2), .85);
      const cornerPinch = .006 * Math.exp(-Math.pow((Math.abs(localX) / sx + Math.abs(localD) / sd - 1.65) / .15, 2));
      positions.setY(i, positions.getY(i) + top * (crown - cornerPinch - 1.55 * (sideCrease + endCrease)));
      uv.setXY(i, (localX + sx) / (2 * sx), (localD + sd) / (2 * sd));
    }
    positions.needsUpdate = true; uv.needsUpdate = true; pillow.geometry.computeVertexNormals();
    const seam = [];
    for (let i = 0; i <= 64; i++) {
      const t = i / 64 * Math.PI * 2, a = sx * spow(Math.cos(t), .30), b = sd * spow(Math.sin(t), .30);
      seam.push([x + a * Math.cos(angle) - b * Math.sin(angle), d + a * Math.sin(angle) + b * Math.cos(angle), h]);
    }
    line(`${name} charcoal sewn piping`, seam, .00165, M.charcoalPiping);
    pillow.userData.inspectionTarget = true;
    pillow.userData.display_name = 'Charcoal and warm white striped pillow';
    pillow.userData.description = 'A full rectangular cotton pillow with soft corners, small seam creases, woven charcoal and warm off-white stripes, and dark piping.';
    return pillow;
  };
  pillowcase('full charcoal warm white striped cotton pillow', .308 * width / 2, front + .395, .853, .233 * width / 2, .282, .070, -.045);
  // The former striped bolster is deliberately absent. The dolls sit on the
  // separate window ledge built by the viewer, at mattress height.
  const toys = new THREE.Group(); toys.name = 'Bed / photographed dolls on windowsill'; group.add(toys);
  let currentToy = null;
  const startToy = (name, description) => {
    currentToy = new THREE.Group(); currentToy.name = `Bed / ${name}`;
    Object.assign(currentToy.userData, { proceduralBed: true, inspectionTarget: true, display_name: name, description });
    toys.add(currentToy); return currentToy;
  };
  const B = (...args) => { const o = ball(...args); currentToy.add(o); return o; };
  const L = (...args) => { const o = line(...args); currentToy.add(o); return o; };
  const X = (x) => x * width / 2, D = depth - .16, BASE = .780;
  const eye = (name, x, d, h, rx = .005, rz = .006, mat = M.black) => B(name, x, d, h, rx, .0024, rz, mat);
  const patch = (name, x, d, h, points, mat, thick = .005, bevel = .002) => {
    const shape = new THREE.Shape(); points.forEach(([px, py], i) => i ? shape.lineTo(px, py) : shape.moveTo(px, py)); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, steps: 1, curveSegments: 4 });
    g.translate(0, 0, -thick / 2); const o = place(name, g, mat, x, d, h); currentToy.add(o); return o;
  };
  const leaf = (name, x, d, h, sx, sd, sh, mat, tilt = 0) => {
    const o = B(name, x, d, h, sx, sd, sh, mat, tilt), p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i); p.setX(i, p.getX(i) * (1 - .48 * Math.max(0, yy))); }
    p.needsUpdate = true; o.geometry.computeVertexNormals(); return o;
  };
  // Fine embroidered expressions are painted on curved, alpha-cut fabric patches,
  // so eyes follow the stuffed face rather than floating as large bead spheres.
  const face = (name, x, d, h, rx, rd, rh, draw) => {
    let texture;
    if (typeof document !== 'undefined') {
      const cv = document.createElement('canvas'); cv.width = cv.height = 512;
      const c = cv.getContext('2d'); c.scale(512, 512); c.lineCap = 'round'; c.lineJoin = 'round'; draw(c);
      texture = new THREE.CanvasTexture(cv);
    } else { texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); texture.needsUpdate = true; }
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: .03, depthWrite: false, roughness: 1, bumpMap: grain, bumpScale: .00022, polygonOffset: true, polygonOffsetFactor: -1 });
    const p = [], uv = [], idx = [], nx = 24, ny = 22;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const u = (i / nx * 2 - 1) * .92, v = (j / ny * 2 - 1) * .88;
      const frontD = d - rd * Math.sqrt(Math.max(.014, 1 - u * u - v * v)) - .0009;
      p.push(x + u * rx, h + v * rh, -frontD); uv.push(i / nx, j / ny);
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i; idx.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const o = place(name, geo, mat); currentToy.add(o); return o;
  };
  const ellipse = (c, x, y, rx, ry, color) => { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  const stroke = (c, points, color = '#20221c', thickness = .016) => { c.strokeStyle = color; c.lineWidth = thickness; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); };
  const polygon = (c, points, fill, outline = null, weight = .016) => { c.fillStyle = fill; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); if (outline) { c.lineWidth = weight; c.strokeStyle = outline; c.stroke(); } };

  startToy('Tiny grey plush', 'The small grey plush at the far left of the photographed windowsill row.');
  B('grey plush bean body', X(.09), D + .025, .826, .035, .035, .046, M.grey);
  B('grey plush soft head', X(.09), D + .009, .888, .043, .035, .043, M.grey);
  for (const q of [-1, 1]) { B('grey plush folded ear', X(.09 + q * .030), D + .010, .919, .016, .014, .017, M.grey, q * .3); B('grey plush tiny foot', X(.09 + q * .019), D - .020, .790, .015, .021, .011, M.grey); }
  B('grey plush cream muzzle', X(.09), D - .024, .877, .022, .008, .017, M.creamToy);
  for (const q of [-1, 1]) eye('grey stitched eye', X(.09 + q * .016), D - .025, .894, .0028, .0038);
  eye('grey stitched nose', X(.09), D - .034, .881, .0033, .0025);

  startToy('Orange reindeer plush', 'Bright orange reindeer with dark forked antlers, black hooves, cream belly and embroidered cheeks.');
  B('reindeer pear body', X(.225), D + .005, .856, .055, .045, .067, M.orangeLight);
  B('reindeer cream belly', X(.225), D - .038, .845, .039, .012, .039, M.creamToy);
  B('reindeer round orange head', X(.225), D - .003, .957, .068, .054, .063, M.orangeLight);
  for (const q of [-1, 1]) {
    B('reindeer sideways soft ear', X(.225 + q * .064), D - .006, .989, .019, .016, .020, M.orange);
    B('reindeer short arm', X(.225 + q * .052), D - .025, .873, .022, .025, .040, M.orangeLight, q * -.5);
    B('reindeer black hand hoof', X(.225 + q * .063), D - .041, .857, .020, .020, .022, M.black);
    B('reindeer orange foot', X(.225 + q * .031), D - .026, .804, .025, .031, .025, M.orange);
    B('reindeer black boot hoof', X(.225 + q * .031), D - .049, .801, .025, .020, .021, M.black);
    L('reindeer antler stem', [[X(.225 + q * .042), D + .006, 1.002], [X(.225 + q * .046), D + .009, 1.044], [X(.225 + q * .044), D + .015, 1.062]], .009, M.antler);
    L('reindeer antler branch', [[X(.225 + q * .045), D + .01, 1.032], [X(.225 + q * .065), D + .01, 1.042]], .007, M.antler);
  }
  B('reindeer cream neck knot', X(.225), D - .049, .898, .014, .010, .018, M.creamToy);
  face('reindeer stitched expression', X(.225), D - .003, .957, .069, .055, .064, (c) => {
    for (const q of [.29, .71]) { ellipse(c, q, .55, .050, .043, '#171810'); for (let i = 0; i < 4; i++) stroke(c, [[q - .044 + i * .026, .535], [q - .048 + i * .026, .507]], '#171810', .011); }
    ellipse(c, .5, .65, .045, .026, '#181914'); ellipse(c, .235, .685, .065, .036, '#923628'); ellipse(c, .765, .685, .065, .036, '#923628');
    stroke(c, [[.35, .70], [.405, .744], [.46, .748], [.50, .710], [.54, .748], [.595, .744], [.65, .70]], '#202018', .012);
    ellipse(c, .45, .30, .029, .025, '#ede4c8'); ellipse(c, .55, .30, .029, .025, '#ede4c8');
  });

  startToy('Bakugo plush', 'Ash-blond pointed fabric hair, red embroidered eyes and a black costume with red crossed straps, matched to the close-up.');
  B('Bakugo black torso', X(.415), D + .009, .864, .068, .047, .074, M.animeDark);
  for (const q of [-1, 1]) {
    B('Bakugo boot', X(.415 + q * .033), D - .029, .801, .027, .031, .022, M.animeDark);
    B('Bakugo padded sleeve', X(.415 + q * .069), D - .004, .880, .024, .029, .036, M.skin, q * -.36);
    B('Bakugo dark wrist cuff', X(.415 + q * .079), D - .018, .860, .025, .026, .022, M.darkGreen);
    for (let k = 0; k < 3; k++) L('Bakugo glove seam', [[X(.415 + q * (.070 + k * .007)), D - .044, .849], [X(.415 + q * (.070 + k * .007)), D - .044, .874]], .0012, M.creamToy);
  }
  B('Bakugo fabric head', X(.415), D - .002, 1.037, .094, .073, .103, M.skin);
  B('Bakugo ash blond cap', X(.415), D + .014, 1.073, .100, .076, .094, M.blonde);
  const spikes = [[-.096,-.024],[-.115,.020],[-.095,.038],[-.117,.064],[-.080,.069],[-.096,.097],[-.055,.09],[-.05,.121],[-.024,.103],[.005,.137],[.016,.100],[.058,.117],[.052,.083],[.091,.091],[.078,.057],[.109,.04],[.080,.011],[.093,-.023],[.053,-.055],[.020,-.008],[-.002,-.073],[-.022,-.018],[-.060,-.060],[-.073,-.005]].map(([x,y])=>[x*.80,y*.80]);
  patch('Bakugo broad pointed felt fringe', X(.415), D - .077, 1.075, spikes, M.hairLight, .006, .0023);
  face('Bakugo red embroidered eyes and scowl', X(.415), D - .004, 1.035, .093, .075, .102, (c) => {
    polygon(c, [[.15,.45],[.42,.54],[.40,.69],[.29,.715],[.18,.652]], '#e5dec9', '#202018', .012);
    polygon(c, [[.58,.54],[.86,.46],[.84,.65],[.72,.715],[.60,.69]], '#e5dec9', '#202018', .012);
    ellipse(c,.32,.583,.049,.061,'#983528'); ellipse(c,.68,.583,.049,.061,'#983528'); ellipse(c,.32,.565,.025,.044,'#131910'); ellipse(c,.68,.565,.025,.044,'#131910');
    stroke(c,[[.15,.444],[.425,.535]],'#141710',.023); stroke(c,[[.576,.536],[.867,.459]],'#141710',.023);
    stroke(c,[[.18,.39],[.424,.47]],'#8f8150',.025); stroke(c,[[.58,.47],[.83,.40]],'#8f8150',.025);
    stroke(c,[[.46,.815],[.50,.802],[.565,.823]],'#9a543a',.011);
  });
  L('Bakugo red crossed strap one', [[X(.369),D-.042,.918],[X(.459),D-.046,.825]], .007, M.red);
  L('Bakugo red crossed strap two', [[X(.461),D-.042,.918],[X(.373),D-.046,.825]], .007, M.red);
  for (const q of [-1,1]) patch('Bakugo shoulder strap',X(.415+q*.052),D-.041,.903,[[-.010,-.026],[.010,-.026],[.014,.027],[-.008,.030]],M.creamToy,.003,.001);

  startToy('Snorlax plush', 'Large teal Snorlax with a continuous cream face and belly, sleepy stitched eyes, little fangs and padded clawed feet.');
  B('Snorlax broad pear body',X(.655),D+.012,.941,.123,.084,.158,M.blue);
  B('Snorlax cream belly bib',X(.655),D-.064,.938,.093,.020,.135,M.creamToy);
  B('Snorlax rounded square head',X(.655),D+.009,1.147,.102,.075,.104,M.blue);
  for(const q of [-1,1]){
    leaf('Snorlax pointed blue ear',X(.655+q*.075),D+.025,1.247,.030,.028,.051,M.blue,q*-.15);
    B('Snorlax stuffed long arm',X(.655+q*.125),D-.007,.996,.036,.041,.101,M.blue,q*-.30);
    B('Snorlax cream paw foot',X(.655+q*.074),D-.076,.817,.046,.055,.037,M.creamToy,q*-.10);
    B('Snorlax brown paw pad',X(.655+q*.074),D-.128,.817,.027,.004,.024,M.earBrown);
    for(let k=-1;k<=1;k++)patch('Snorlax little fabric claw',X(.655+q*.074+k*.014),D-.118,.847,[[-.005,-.009],[.006,-.009],[0,.006]],M.creamToy,.003,.001);
  }
  face('Snorlax cream mask and sleeping embroidery',X(.655),D+.008,1.147,.103,.077,.104,(c)=>{
    polygon(c,[[.15,.87],[.10,.55],[.17,.25],[.34,.08],[.52,.23],[.68,.08],[.85,.24],[.91,.57],[.84,.89],[.50,.99]],'#e6dbb9');
    stroke(c,[[.24,.44],[.43,.43]],'#21221a',.013);stroke(c,[[.64,.445],[.79,.47]],'#21221a',.013);
    stroke(c,[[.42,.64],[.46,.67],[.56,.68],[.64,.665],[.67,.64]],'#21221a',.012);
    polygon(c,[[.42,.64],[.44,.615],[.455,.654]],'#f0e7d2');polygon(c,[[.64,.658],[.667,.63],[.674,.65]],'#f0e7d2');
  });

  startToy('Eevee plush with burgundy bow','Eevee with long pointed brown ears, large embroidered eyes, a thick cream neck ruff and a burgundy ribbon bow.');
  B('Eevee seated pear torso',X(.900),D+.024,.875,.070,.056,.096,M.furBrown);
  for(const q of [-1,1]){
    B('Eevee long front paw',X(.900+q*.038),D-.020,.842,.024,.030,.065,M.furBrown,q*-.09);
    B('Eevee rounded hind foot',X(.900+q*.060),D-.017,.800,.030,.031,.021,M.furBrown);
  }
  B('Eevee broad rounded head',X(.900),D+.013,1.027,.090,.068,.092,M.furBrown);
  for(const q of [-1,1]){
    const tilt=q<0?.40:-.18;
    leaf('Eevee pointed outer ear',X(.900+q*.055),D+.028,1.148,.033,.024,.101,M.furBrown,tilt);
    leaf('Eevee dark inner ear',X(.900+q*.055),D+.005,1.151,.023,.004,.079,M.earBrown,tilt);
  }
  for(let i=0;i<7;i++){
    const angle=Math.PI+(i/6)*Math.PI;
    B('Eevee fluffy cream ruff tuft',X(.900)+Math.cos(angle)*.075,D-.016+Math.sin(angle)*.033,.940+Math.sin(angle)*.028,.028,.026,.032,M.creamToy,(i-3)*.12);
  }
  B('Eevee central cream mane',X(.900),D-.044,.925,.056,.019,.045,M.creamToy);
  face('Eevee embroidered large eyes',X(.900),D+.011,1.027,.090,.070,.092,(c)=>{
    ellipse(c,.275,.44,.085,.136,'#252017');ellipse(c,.735,.43,.086,.137,'#252017');
    ellipse(c,.26,.38,.027,.040,'#eee3c9');ellipse(c,.72,.37,.029,.042,'#eee3c9');
    polygon(c,[[.465,.565],[.505,.58],[.542,.561]],'#2d2518');
    stroke(c,[[.355,.67],[.43,.70],[.505,.687],[.58,.705],[.65,.66]],'#342616',.012);
  });
  const bowX=X(.956),bowD=D-.063,bowH=.946;
  patch('Eevee burgundy ribbon left loop',bowX-.023,bowD,bowH,[[-.040,.025],[-.005,.019],[.017,0],[-.005,-.018],[-.040,-.025]],M.burgundy,.009,.003);
  patch('Eevee burgundy ribbon right loop',bowX+.017,bowD+.001,bowH,[[-.015,0],[.013,.024],[.039,.033],[.041,-.020],[.010,-.019]],M.burgundy,.009,.003);
  B('Eevee burgundy ribbon knot',bowX,bowD-.008,bowH,.013,.010,.014,M.burgundy);
  patch('Eevee hanging ribbon tail',bowX-.014,bowD+.002,bowH-.049,[[-.012,.044],[.014,.043],[.020,-.025],[-.001,-.014],[-.015,-.034]],M.burgundy,.003,.001);

  startToy('Mint bubble-tea plush','Mint bubble-tea character with a soft cream lid, dark straw, sad embroidered face, pink blush and black tapioca pearls.');
  const tea=cushion('mint tea soft rounded cup',X(1.105),D+.013,.884,.075,.052,.102,M.mint,0,.67);currentToy.add(tea);
  const lid=cushion('bubble-tea rounded cream lid',X(1.105),D+.009,.995,.080,.054,.028,M.teaLid,0,.62);currentToy.add(lid);
  L('bubble-tea short dark straw',[[X(1.074),D+.026,1.014],[X(1.069),D+.027,1.049]],.009,M.antler);
  face('bubble tea sad face and tapioca pearls',X(1.105),D+.007,.883,.077,.056,.107,(c)=>{
    stroke(c,[[.21,.24],[.38,.27]],'#252419',.014);stroke(c,[[.62,.265],[.79,.235]],'#252419',.014);
    ellipse(c,.30,.365,.044,.049,'#161911');ellipse(c,.70,.365,.044,.049,'#161911');
    stroke(c,[[.43,.515],[.475,.473],[.51,.470],[.56,.51]],'#1b2016',.014);
    for(const cx of [.24,.73])for(let i=0;i<3;i++)stroke(c,[[cx+i*.038,.49],[cx-.022+i*.038,.515]],'#bb6a70',.017);
    for(const [x,y,r]of[[.22,.78,.075],[.64,.755,.074],[.44,.92,.075],[.82,.94,.065],[.085,.96,.05]])ellipse(c,x,y,r,r,'#121810');
  });

  startToy('Brown orange dinosaur plush','A large-headed orange-brown dinosaur with sleepy lidded eyes, two cream teeth and a segmented cream belly.');
  B('dinosaur upright body',X(1.295),D+.025,.881,.061,.051,.100,M.furBrown);
  B('dinosaur cream belly',X(1.295),D-.020,.881,.039,.014,.073,M.creamToy);
  for(let i=0;i<3;i++)L('dinosaur stitched belly segment',[[X(1.258),D-.032,.844+i*.031],[X(1.295),D-.036,.839+i*.031],[X(1.332),D-.032,.844+i*.031]],.0015,M.tan);
  B('dinosaur large rounded head',X(1.295),D+.013,1.050,.102,.073,.099,M.furBrown);
  for(const q of [-1,1]){
    B('dinosaur short side arm',X(1.295+q*.063),D-.009,.923,.025,.027,.047,M.furBrown,q*-.4);
    B('dinosaur broad foot',X(1.295+q*.038),D-.011,.800,.034,.035,.021,M.furBrown);
    B('dinosaur head crest',X(1.295+q*.057),D+.035,1.126,.027,.026,.032,M.furBrown);
  }
  face('dinosaur sleepy eyes and toothy side smile',X(1.295),D+.010,1.050,.103,.076,.100,(c)=>{
    ellipse(c,.30,.30,.12,.125,'#eee3c9');ellipse(c,.70,.30,.12,.125,'#eee3c9');
    ellipse(c,.325,.275,.035,.075,'#1b1c13');ellipse(c,.71,.275,.035,.075,'#1b1c13');
    polygon(c,[[.14,.17],[.47,.21],[.48,.275],[.12,.225]],'#a97538');polygon(c,[[.53,.20],[.88,.16],[.90,.225],[.52,.28]],'#a97538');
    ellipse(c,.42,.49,.019,.024,'#252017');ellipse(c,.64,.49,.019,.024,'#252017');
    stroke(c,[[.22,.67],[.31,.72],[.58,.755],[.78,.70]],'#312619',.011);
    polygon(c,[[.25,.675],[.30,.77],[.35,.695]],'#efe0be');polygon(c,[[.42,.722],[.45,.64],[.50,.735]],'#efe0be');
  });
  L('dinosaur plush heavy eyebrow ridge',[[X(1.214),D-.040,1.119],[X(1.255),D-.063,1.122],[X(1.282),D-.056,1.108]],.009,M.furBrown);

  startToy('Red patterned cushion','The red and cream patterned cushion behind the larger peach plush in the reference photographs.');
  const rp=cushion('red cream patterned cushion',X(1.435),depth-.076,.955,.102,.040,.175,M.redPattern,-.05,.44);currentToy.add(rp);

  startToy('Large peach round plush','The giant peach plush with tiny black dot eyes and a softly split, lobed lower face. It has no beak.');
  B('peach plush pear shaped body',X(1.555),D+.014,.946,.143,.110,.166,M.peach);
  const peachHead=B('peach plush continuous lobed head',X(1.555),D+.019,1.147,.165,.111,.169,M.peach);
  const hp=peachHead.geometry.getAttribute('position');
  for(let i=0;i<hp.count;i++){
    const xx=hp.getX(i),yy=hp.getY(i),zz=hp.getZ(i);
    const lower=smooth((-yy+.05)/.92),center=Math.exp(-Math.pow(xx/.31,2));
    hp.setY(i,yy+.36*lower*center);hp.setZ(i,zz-.15*lower*center*Math.max(0,zz));
  }
  hp.needsUpdate=true;peachHead.geometry.computeVertexNormals();
  for(const q of[-1,1]){
    eye('peach plush black dot eye',X(1.555+q*.069),D-.076,1.189,.0065,.0075);
    B('peach plush tiny side paw',X(1.555+q*.128),D-.040,.817,.029,.034,.037,M.peach);
  }
  L('peach lower face center seam',[[X(1.555),D-.094,1.113],[X(1.555),D-.086,1.076],[X(1.555),D-.066,1.039]],.0009,M.peachShade);

  startToy('Yoshi plush','Green Yoshi with a large rounded snout, tall white eyes, orange back ridges and yellow-orange boots.');
  B('Yoshi compact green body',X(1.765),D+.009,.877,.060,.055,.082,M.green);
  B('Yoshi ivory chest',X(1.765),D-.037,.870,.042,.021,.060,M.creamToy);
  B('Yoshi back of head',X(1.765),D+.013,1.052,.072,.058,.080,M.green);
  B('Yoshi broad long snout',X(1.765),D-.063,1.026,.077,.065,.076,M.green);
  B('Yoshi cream jaw',X(1.765),D-.057,.977,.065,.050,.026,M.creamToy);
  for(const q of[-1,1]){
    B('Yoshi tall green eye surround',X(1.765+q*.030),D-.008,1.137,.032,.035,.057,M.green);
    B('Yoshi white eye',X(1.765+q*.030),D-.036,1.131,.027,.018,.047,M.creamToy);
    eye('Yoshi tall black eye pupil',X(1.765+q*.026),D-.054,1.128,.009,.017);
    eye('Yoshi white eye highlight',X(1.765+q*.026)-.002,D-.057,1.136,.0025,.0035,M.creamToy);
    B('Yoshi yellow orange boot',X(1.765+q*.040),D-.036,.809,.029,.039,.030,M.bootYellow);
    B('Yoshi small hanging arm',X(1.765+q*.063),D-.012,.896,.021,.025,.050,M.green,q*.2);
    const nostril=eye('Yoshi black sewn nostril',X(1.765+q*.014),D-.128,1.013,.003,.007);nostril.rotation.z=q*-.26;
  }
  for(let i=0;i<3;i++)B('Yoshi orange back ridge',X(1.765),D+.057,1.040-i*.043,.020,.022,.023,M.orangeLight);

  startToy('Tiny yellow graduation plush','Small smiling yellow character in a black graduation cap with a gold tassel, seated in front of the rightmost doll.');
  B('graduation plush dark gown',X(1.815),D-.065,.821,.034,.031,.042,M.navy);
  B('graduation plush round yellow head',X(1.815),D-.074,.883,.045,.036,.044,M.yellow);
  for(const q of[-1,1]){B('graduation plush yellow hand',X(1.815+q*.041),D-.080,.826,.016,.015,.014,M.yellow);B('graduation plush tiny foot',X(1.815+q*.020),D-.092,.789,.015,.019,.009,M.yellow);}
  const cap=roundBox('tiny black mortarboard',X(1.815),D-.073,.928,.083,.067,.008,M.black,.002);cap.rotation.y=.28;currentToy.add(cap);
  B('graduation cap soft band',X(1.815),D-.073,.919,.033,.027,.016,M.black);
  L('graduation gold tassel cord',[[X(1.815),D-.075,.937],[X(1.788),D-.094,.935],[X(1.783),D-.109,.903]],.0025,M.bootYellow);
  for(let i=0;i<5;i++)L('graduation tassel thread',[[X(1.783)+(i-2)*.0018,D-.109,.904],[X(1.780)+(i-2)*.002,D-.111,.880]],.00065,M.bootYellow);
  face('graduation character big stitched grin',X(1.815),D-.074,.883,.046,.038,.045,(c)=>{
    ellipse(c,.28,.40,.028,.037,'#191c12');ellipse(c,.73,.40,.028,.037,'#191c12');
    polygon(c,[[.13,.55],[.36,.67],[.63,.67],[.89,.53],[.78,.78],[.54,.86],[.29,.80]],'#f2e6c6','#30251a',.017);
    for(let i=0;i<7;i++){const x=.23+i*.085;stroke(c,[[x,.63+Math.sin(i/6*Math.PI)*.042],[x+.02,.79+Math.sin(i/6*Math.PI)*.042]],'#796447',.011);}
  });

  startToy('Black-haired teal-eyed anime plush','Dark-uniform anime plush with black shaped fringe, large teal embroidered eyes, teal-tipped side hair, white collar and gold buttons.');
  B('teal eyed doll dark uniform body',X(1.895),D+.018,.869,.057,.045,.072,M.navy);
  for(const q of[-1,1]){
    B('teal eyed doll long dark sleeve',X(1.895+q*.054),D+.011,.862,.024,.028,.055,M.navy,q*.12);
    B('teal eyed doll small fabric hand',X(1.895+q*.058),D-.003,.812,.020,.021,.024,M.skin);
    B('teal eyed doll seated boot',X(1.895+q*.029),D-.020,.797,.025,.029,.017,M.navy);
  }
  B('teal eyed doll cream face',X(1.895),D-.001,1.005,.070,.058,.082,M.skin);
  B('teal eyed doll rounded black hair cap',X(1.895),D+.010,1.037,.075,.062,.079,M.black);
  patch('teal eyed doll shaped black bangs',X(1.895),D-.058,1.047,[[-.073,-.020],[-.075,.022],[-.048,.068],[.006,.077],[.053,.057],[.073,.013],[.053,-.034],[.043,-.005],[.014,-.030],[.017,.002],[-.021,-.019],[-.037,.018],[-.050,-.023]],M.black,.005,.002);
  for(const q of[-1,1]){
    leaf('anime long black side lock',X(1.895+q*.065),D-.006,.978,.016,.024,.070,M.black,q*-.10);
    patch('anime muted teal hair tip',X(1.895+q*.063),D-.031,.947,[[-.010,.026],[.008,.029],[.010,-.025],[.001,-.014],[-.008,-.032]],M.hairTeal,.002,.001);
  }
  face('anime half-lidded teal eyes',X(1.895),D-.001,1.005,.071,.060,.083,(c)=>{
    polygon(c,[[.13,.39],[.39,.43],[.40,.66],[.28,.705],[.15,.65]],'#bfd5c5','#293432',.011);
    polygon(c,[[.60,.435],[.85,.43],[.84,.67],[.73,.708],[.60,.65]],'#bfd5c5','#293432',.011);
    polygon(c,[[.16,.43],[.37,.465],[.37,.635],[.28,.675],[.175,.625]],'#538985');
    polygon(c,[[.63,.465],[.825,.46],[.81,.64],[.73,.675],[.63,.63]],'#538985');
    stroke(c,[[.13,.386],[.395,.427]],'#243234',.040);stroke(c,[[.60,.43],[.853,.429]],'#243234',.039);
    stroke(c,[[.46,.795],[.51,.801]],'#34332a',.010);
    stroke(c,[[.19,.315],[.34,.337]],'#373e35',.014);stroke(c,[[.65,.337],[.80,.32]],'#373e35',.014);
  });
  patch('anime white uniform collar',X(1.895),D-.041,.921,[[-.041,.010],[.041,.010],[.025,-.008],[-.025,-.008]],M.creamToy,.003,.001);
  for(const h of[.879,.850])B('anime uniform gold button',X(1.895),D-.046,h,.005,.002,.005,M.bootYellow);
  patch('anime uniform chest badge',X(1.921),D-.045,.868,[[-.012,-.004],[.012,-.004],[.012,.004],[-.012,.004]],M.creamToy,.002,.0005);

  // Seat each photographed item on the real ledge, and prevent wall clipping.
  // The groups remain inspectable as whole dolls after their parts are aligned.
  const toyBounds=[];
  for(const toy of toys.children){
    toy.updateWorldMatrix(true,true);let b=new THREE.Box3().setFromObject(toy);
    const depthSpan=b.max.z-b.min.z;
    if(depthSpan>.300){const centerZ=(b.min.z+b.max.z)/2,scale=.300/depthSpan;toy.scale.z=scale;toy.position.z=centerZ*(1-scale);}
    toy.updateWorldMatrix(true,true);b.setFromObject(toy);
    toy.position.y+=BASE-b.min.y;
    if(b.min.x<.03)toy.position.x+=.03-b.min.x;
    if(b.max.x>width-.03)toy.position.x-=b.max.x-(width-.03);
    const nearest=-b.max.z,farthest=-b.min.z;
    if(nearest<depth-.315)toy.position.z-=depth-.315-nearest;
    if(farthest>depth-.015)toy.position.z+=farthest-(depth-.015);
    toy.updateWorldMatrix(true,true);b.setFromObject(toy);
    toyBounds.push({name:toy.userData.display_name,min:[b.min.x,-b.max.z,b.min.y],max:[b.max.x,-b.min.z,b.max.y]});
  }

  model.add(group); group.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(group);
  let meshes = 0, triangles = 0, finite = true;
  group.traverse((o) => { if (!o.isMesh) return; meshes++; const p = o.geometry.getAttribute('position'); triangles += o.geometry.index ? o.geometry.index.count / 3 : p.count / 3; for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) finite = false; });
  const manifest = { width, depth, front, bedLength, hiddenOriginals: hidden, hiddenOriginalCount: hidden.length, meshes, triangles, finite, bounds: { min: [bounds.min.x, -bounds.max.z, bounds.min.y], max: [bounds.max.x, -bounds.min.z, bounds.max.y] }, plushCount: toys.children.length, toyBounds, ledgeTop: BASE, quiltBackDepth: quiltBack, notes: 'Charcoal and warm off-white woven striped duvet and rectangular pillow; dark grey-green turned-down reverse; enclosed pink and cream patchwork fitted mattress; twelve unchanged photographed ledge items; unchanged white frame and four closed drawers on one plane.' };
  group.userData.manifest = manifest;
  Object.keys(bedManifest).forEach((key) => delete bedManifest[key]); Object.assign(bedManifest, manifest);
  return group;
}
