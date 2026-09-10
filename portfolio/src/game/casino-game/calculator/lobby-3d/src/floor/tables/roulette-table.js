(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};
  C.floor.tables = C.floor.tables || {};

  // European roulette table. Group origin is the rail centre at floor
  // level; +Z faces the players. The embedded game owns all outcomes.
  const RAIL_H = 0.82, FELT_Y = 0.84, STEP = (Math.PI * 2) / 37;
  const EU_WHEEL = C.roulettePhysics.EU_WHEEL;
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const GOLD = 'rgba(240,216,120,.6)', GOLD_SOFT = 'rgba(240,216,120,.4)';

  const numFill = (n) => (n === 0 ? '#0e6b45' : RED.has(n) ? '#a31621' : '#111');

  // ---------- felt layout (racetrack + grid + dozens + columns) ----------
  // Racetrack number arrangement ported from the 2D game's render-racetrack.js:
  // EU wheel sequence rotated 3 positions so the ORPHELINS dividers center.
  const TRACK_TOP = [10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12];
  const TRACK_BOTTOM = [36, 13, 27, 6, 34, 17, 25, 2, 21, 4, 19, 15, 32];
  const TRACK_LEFT = [11, 30, 8, 23];   // bottom → top
  const TRACK_RIGHT = [35, 3, 26, 0];   // top → bottom

  function trackWedge(ctx, cx, cy, r0, r1, a0, a1, fill) {
    ctx.beginPath();
    ctx.arc(cx, cy, r0, a0, a1);
    ctx.arc(cx, cy, r1, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = GOLD_SOFT; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function stadiumPath(ctx, lcx, rcx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(lcx, cy - r);
    ctx.lineTo(rcx, cy - r);
    ctx.arc(rcx, cy, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(lcx, cy + r);
    ctx.arc(lcx, cy, r, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
  }

  function drawRacetrack(ctx, x0, x1, y0, h) {
    const r = h / 2, cy = y0 + r;
    const lcx = x0 + r, rcx = x1 - r;
    const CELL_H = 34, edge = 5, gap = 2;

    stadiumPath(ctx, lcx, rcx, cy, r);
    ctx.fillStyle = '#0a0a0a'; ctx.fill();
    ctx.strokeStyle = '#d4b07a'; ctx.lineWidth = 3; ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px Georgia, serif';

    // curved end wedges
    const outerR = r - edge, innerR = outerR - CELL_H;
    const wedgeA = Math.PI / TRACK_LEFT.length;
    TRACK_LEFT.forEach((n, i) => {
      const a0 = Math.PI / 2 + i * wedgeA, a1 = a0 + wedgeA;
      trackWedge(ctx, lcx, cy, innerR, outerR, a0, a1, numFill(n));
      const mid = (a0 + a1) / 2, tr = (innerR + outerR) / 2;
      ctx.fillStyle = '#fff';
      ctx.fillText(String(n), lcx + tr * Math.cos(mid), cy + tr * Math.sin(mid));
    });
    TRACK_RIGHT.forEach((n, i) => {
      const a0 = -Math.PI / 2 + i * wedgeA, a1 = a0 + wedgeA;
      trackWedge(ctx, rcx, cy, innerR, outerR, a0, a1, numFill(n));
      const mid = (a0 + a1) / 2, tr = (innerR + outerR) / 2;
      ctx.fillStyle = '#fff';
      ctx.fillText(String(n), rcx + tr * Math.cos(mid), cy + tr * Math.sin(mid));
    });

    // straight rows
    const topRowY = y0 + edge, botRowY = y0 + h - edge - CELL_H;
    const rowW = rcx - lcx;
    const tw = (rowW - (TRACK_TOP.length - 1) * gap) / TRACK_TOP.length;
    const bw = (rowW - (TRACK_BOTTOM.length - 1) * gap) / TRACK_BOTTOM.length;
    TRACK_TOP.forEach((n, i) => {
      const x = lcx + i * (tw + gap);
      ctx.fillStyle = numFill(n); ctx.fillRect(x, topRowY, tw, CELL_H);
      ctx.strokeStyle = GOLD_SOFT; ctx.lineWidth = 1; ctx.strokeRect(x, topRowY, tw, CELL_H);
      ctx.fillStyle = '#fff'; ctx.fillText(String(n), x + tw / 2, topRowY + CELL_H / 2);
    });
    TRACK_BOTTOM.forEach((n, i) => {
      const x = lcx + i * (bw + gap);
      ctx.fillStyle = numFill(n); ctx.fillRect(x, botRowY, bw, CELL_H);
      ctx.strokeStyle = GOLD_SOFT; ctx.lineWidth = 1; ctx.strokeRect(x, botRowY, bw, CELL_H);
      ctx.fillStyle = '#fff'; ctx.fillText(String(n), x + bw / 2, botRowY + CELL_H / 2);
    });

    // center call-bet sections (TIER | ORPHELINS | VOISINS DU ZERO)
    const cTop = topRowY + CELL_H, cBot = botRowY;
    stadiumPath(ctx, lcx, rcx, cy, innerR);
    ctx.fillStyle = '#0a3a24'; ctx.fill();
    ctx.strokeStyle = GOLD_SOFT; ctx.lineWidth = 1; ctx.stroke();

    // divider boundaries mirror the 2D racetrack: top after 5 / 10 cells,
    // bottom after 3 / 6 cells (TIERS | ORPHELINS | VOISINS)
    const div1T = lcx + 5 * (tw + gap) - gap / 2, div1B = lcx + 3 * (bw + gap) - gap / 2;
    const div2T = lcx + 10 * (tw + gap) - gap / 2, div2B = lcx + 6 * (bw + gap) - gap / 2;
    ctx.strokeStyle = '#d4b07a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(div1T, cTop); ctx.lineTo(div1B, cBot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(div2T, cTop); ctx.lineTo(div2B, cBot); ctx.stroke();

    ctx.fillStyle = '#f0e6c8';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText('TIER', (lcx + div1T) / 2, cy);
    ctx.fillText('ORPHELINS', (div1T + div2T) / 2, cy);
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText('VOISINS DU ZERO', (div2T + rcx - 10) / 2, cy);
  }

  // Felt print geometry (canvas px + felt metres). Exposed as
  // C.floor.ROULETTE_FELT so the live-play bet mapping (roulette-map.js)
  // lands 3D chips on the exact printed cells.
  const FELT = {
    W: 1280, H: 640,            // canvas size
    FW: 3.28, FD: 1.48,         // felt top dimensions in metres
    LX: 150, RX: 1270,          // printed layout span (left strip = chip apron)
    ZERO_W: 80, COL_W: 120,     // zero column / "2 TO 1" boxes width
    GY: 194, ROW_H: 92,         // grid origin + row height (3 rows)
    ROW_GAP: 8, DOZEN_H: 52, EVEN_H: 52,
    TRACK_Y: 16, TRACK_H: 160,  // racetrack band
  };
  FELT.numberCenter = (n) => {
    const cellW = (FELT.RX - FELT.COL_W - FELT.LX - FELT.ZERO_W) / 12;
    const px = n === 0 ? FELT.LX + FELT.ZERO_W / 2
      : FELT.LX + FELT.ZERO_W + (Math.floor((n - 1) / 3) + 0.5) * cellW;
    const py = FELT.GY + (n === 0 ? 1.5 : 2.5 - ((n - 1) % 3)) * FELT.ROW_H;
    return [(px / FELT.W - 0.5) * FELT.FW, (py / FELT.H - 0.5) * FELT.FD];
  };
  C.floor.ROULETTE_FELT = FELT;

  // Built once and shared — all four floor tables print the same layout.
  let feltTexture = null;
  function makeFeltLayoutTexture() {
    if (feltTexture) return feltTexture;
    feltTexture = C.assets.canvasTexture(FELT.W, FELT.H, (ctx) => {
      ctx.fillStyle = '#0b5d3b';
      ctx.fillRect(0, 0, FELT.W, FELT.H);

      // Left strip (canvas x 0..LX) stays plain felt: the apron between the
      // wheel and the printed layout where the chip bank sits.
      const { LX, RX } = FELT;

      // racetrack band along the dealer side (canvas top)
      drawRacetrack(ctx, LX, RX, FELT.TRACK_Y, FELT.TRACK_H);

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      // main grid
      const GY = FELT.GY, ROW_H = FELT.ROW_H, GH = ROW_H * 3;
      const ZERO_W = FELT.ZERO_W, COL_W = FELT.COL_W;
      const gx = LX + ZERO_W, grx = RX - COL_W;
      const cellW = (grx - gx) / 12;

      ctx.fillStyle = '#0e6b45';
      ctx.fillRect(LX, GY, ZERO_W, GH);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
      ctx.strokeRect(LX, GY, ZERO_W, GH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px Georgia, serif';
      ctx.fillText('0', LX + ZERO_W / 2, GY + GH / 2);

      const ROWS = [
        [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
        [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
      ];
      ROWS.forEach((row, r) => {
        row.forEach((n, c) => {
          const x = gx + c * cellW, y = GY + r * ROW_H;
          ctx.fillStyle = numFill(n);
          ctx.fillRect(x, y, cellW, ROW_H);
          ctx.strokeStyle = GOLD_SOFT; ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, cellW, ROW_H);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 30px Georgia, serif';
          ctx.fillText(String(n), x + cellW / 2, y + ROW_H / 2);
        });
      });

      // 2 TO 1 column boxes at the grid's far end
      for (let r = 0; r < 3; r++) {
        const y = GY + r * ROW_H;
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        ctx.fillRect(grx, y, COL_W, ROW_H);
        ctx.strokeStyle = GOLD_SOFT; ctx.lineWidth = 1.5;
        ctx.strokeRect(grx, y, COL_W, ROW_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Georgia, serif';
        ctx.fillText('2 TO 1', grx + COL_W / 2, y + ROW_H / 2);
      }

      // dozens row
      const DY = GY + GH + FELT.ROW_GAP, DH = FELT.DOZEN_H;
      ['1st 12', '2nd 12', '3rd 12'].forEach((label, i) => {
        const w = (grx - gx) / 3, x = gx + i * w;
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        ctx.fillRect(x, DY, w, DH);
        ctx.strokeStyle = GOLD_SOFT; ctx.lineWidth = 1.5;
        ctx.strokeRect(x, DY, w, DH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 26px Georgia, serif';
        ctx.fillText(label, x + w / 2, DY + DH / 2);
      });

      // even-money row nearest the players
      const OY = DY + DH + FELT.ROW_GAP, OH = FELT.EVEN_H;
      const labels = ['1-18', 'EVEN', 'RED', 'BLACK', 'ODD', '19-36'];
      const ow = (grx - gx) / labels.length;
      labels.forEach((label, i) => {
        const x = gx + i * ow;
        ctx.fillStyle = label === 'RED' ? '#a31621' : label === 'BLACK' ? '#111' : 'rgba(0,0,0,.28)';
        ctx.fillRect(x, OY, ow, OH);
        ctx.strokeStyle = GOLD_SOFT; ctx.lineWidth = 1.5;
        ctx.strokeRect(x, OY, ow, OH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Georgia, serif';
        ctx.fillText(label, x + ow / 2, OY + OH / 2);
      });
    });
    return feltTexture;
  }

  // Labels share the physical pocket angle; the narrow band sits outside
  // the recessed pockets, so the resting ball never covers the numeral.
  let numberTexture = null;
  function makeNumberRingTexture() {
    if (numberTexture) return numberTexture;
    numberTexture = C.assets.canvasTexture(1024, 1024, (ctx) => {
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 37; i++) {
        ctx.beginPath();
        ctx.moveTo(512, 512);
        ctx.arc(512, 512, 512, i * STEP - STEP / 2, i * STEP + STEP / 2);
        ctx.closePath();
        ctx.fillStyle = numFill(EU_WHEEL[i]); ctx.fill();
        ctx.strokeStyle = 'rgba(240,216,120,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.save();
        ctx.translate(512, 512); ctx.rotate(i * STEP); ctx.translate(472, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 34px Georgia, serif'; ctx.fillText(String(EU_WHEEL[i]), 0, 0);
        ctx.restore();
      }
    });
    return numberTexture;
  }

  function buildWheel(mount) {
    const P = C.roulettePhysics;
    const W = P.GEOMETRY;
    const gold = C.assets.goldMaterial();
    const wood = C.assets.woodMaterial('#341b0e');
    const dark = new THREE.MeshStandardMaterial({ color: '#171a16', roughness: 0.48, metalness: 0.2 });
    const rotor = new THREE.Group();
    rotor.name = 'roulette-rotor';
    mount.add(rotor);
    const lathe = (points, material, parent) => {
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 96), material);
      mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
      return mesh;
    };
    const rimRing = (radius, tube, y, material, parent) => {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 96), material);
      mesh.rotation.x = -Math.PI / 2; mesh.position.y = y;
      mesh.castShadow = true; parent.add(mesh);
      return mesh;
    };
    // A stationary bowl, inward-sloping apron and raised outer ball track.
    lathe([[0.735, -0.025], [0.745, 0.055], [0.743, 0.207], [0.729, 0.253],
      [0.708, 0.263], [0.691, 0.251], [0.680, W.trackFloor],
      [W.apronOuter, W.trackFloor], [W.apronInner, W.numberFloor]], wood, mount);
    rimRing(0.721, 0.008, 0.260, gold, mount);
    rimRing(0.682, 0.004, W.trackFloor + 0.004, gold, mount);
    rimRing(W.apronInner + 0.003, 0.003, W.numberFloor + 0.003, gold, mount);
    const track = new THREE.Mesh(new THREE.RingGeometry(W.apronOuter, 0.680, 96),
      new THREE.MeshStandardMaterial({ color: '#252720', roughness: 0.4, metalness: 0.12 }));
    track.rotation.x = -Math.PI / 2; track.position.y = W.trackFloor + 0.0003;
    track.receiveShadow = true; mount.add(track);
    for (let i = 0; i < W.deflectorCount; i++) {
      const angle = i * Math.PI * 2 / W.deflectorCount;
      const pivot = new THREE.Group(); pivot.rotation.y = -angle;
      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), gold);
      diamond.scale.set(i % 2 ? 0.66 : 1.15, 0.34, i % 2 ? 1.15 : 0.66);
      diamond.position.set(W.deflectorRadius, P.surfaceHeight(W.deflectorRadius) + 0.005, 0);
      diamond.castShadow = true; pivot.add(diamond); mount.add(pivot);
    }
    // The rotor has a raised central cone, 37 recessed pocket floors and
    // actual brass walls. The top of each wall meets the number band.
    lathe([[W.numberOuter, W.pocketFloor], [W.pocketInner, W.pocketFloor],
      [W.pocketInner, 0.151], [0.28, 0.160], [0.10, 0.230], [0.02, 0.237]], wood, rotor);
    const ringMat = new THREE.MeshStandardMaterial({ map: makeNumberRingTexture(), roughness: 0.52, metalness: 0.08 });
    const numbers = new THREE.Mesh(new THREE.RingGeometry(W.numberInner, W.numberOuter, 148), ringMat);
    numbers.rotation.x = -Math.PI / 2; numbers.position.y = W.numberFloor;
    numbers.receiveShadow = true; rotor.add(numbers);
    const floorMats = {
      green: new THREE.MeshStandardMaterial({ color: '#0b6138', roughness: 0.58 }),
      red: new THREE.MeshStandardMaterial({ color: '#961b25', roughness: 0.58 }),
      black: dark,
    };
    const sepGeo = new THREE.BoxGeometry(W.pocketOuter - W.pocketInner, W.separatorHeight, 0.004);
    for (let i = 0; i < 37; i++) {
      const n = EU_WHEEL[i];
      const floor = new THREE.Mesh(new THREE.RingGeometry(W.pocketInner, W.pocketOuter, 4, 1,
        -(i + 0.5) * STEP, STEP), floorMats[n === 0 ? 'green' : RED.has(n) ? 'red' : 'black']);
      floor.userData.roulettePocket = n;
      floor.rotation.x = -Math.PI / 2; floor.position.y = W.pocketFloor + 0.0003;
      floor.receiveShadow = true; rotor.add(floor);
      const pivot = new THREE.Group(); pivot.rotation.y = -(i + 0.5) * STEP;
      const wall = new THREE.Mesh(sepGeo, gold);
      wall.userData.rouletteDivider = i;
      wall.position.set((W.pocketInner + W.pocketOuter) / 2, W.pocketFloor + W.separatorHeight / 2, 0);
      wall.castShadow = true; wall.receiveShadow = true; pivot.add(wall); rotor.add(pivot);
    }
    rimRing(W.pocketInner, 0.003, W.pocketFloor + W.separatorHeight, gold, rotor);
    rimRing(W.pocketOuter, 0.002, W.numberFloor, gold, rotor);
    lathe([[0.075, 0.227], [0.075, 0.248], [0.040, 0.267], [0.026, 0.305], [0.017, 0.313]], gold, rotor);
    const spindle = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), gold);
    spindle.position.y = 0.314; spindle.castShadow = true; rotor.add(spindle);
    for (let i = 0; i < 4; i++) {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.130, 10), gold);
      handle.rotation.z = Math.PI / 2;
      const pivot = new THREE.Group(); pivot.rotation.y = i * Math.PI / 2;
      handle.position.set(0.079, 0.282, 0); pivot.add(handle); rotor.add(pivot);
    }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(W.ballRadius, 20, 14),
      new THREE.MeshStandardMaterial({ color: '#fffbed', roughness: 0.21, metalness: 0.02 }));
    ball.name = 'roulette-ball'; ball.castShadow = true;
    ball.position.set(W.pocketRadius, W.pocketFloor + W.ballRadius, 0);
    mount.add(ball);
    const LAUNCH_ANGLE = -Math.PI / 3;
    const launch = new THREE.Vector3(Math.cos(LAUNCH_ANGLE) * W.trackRadius,
      W.trackFloor + W.ballRadius, Math.sin(LAUNCH_ANGLE) * W.trackRadius);
    let activeHook = null;
    const cancel = () => { activeHook?.cancel(); activeHook = null; };
    const prepareLaunch = () => new Promise((resolve) => {
      cancel();
      const from = ball.position.clone();
      const start = performance.now();
      const duration = C.app.REDUCED ? 280 : 680;
      const hook = () => {
        const t = Math.min(1, (performance.now() - start) / duration);
        const ease = t * t * (3 - 2 * t);
        ball.position.lerpVectors(from, launch, ease);
        ball.position.y += Math.sin(t * Math.PI) * 0.11;
        if (t === 1) { C.app.offFrame(hook); activeHook = null; resolve(); }
      };
      hook.cancel = () => { C.app.offFrame(hook); resolve(); };
      activeHook = hook; C.app.onFrame(hook);
    });
    function spinTo(pocket) {
      cancel();
      const spin = P.createSpin({ pocket, wheelAngle: rotor.rotation.y,
        launchAngle: LAUNCH_ANGLE, seed: crypto.getRandomValues(new Uint32Array(1))[0] });
      return new Promise((resolve) => {
        const start = performance.now();
        let resolved = false;
        const finish = () => { if (!resolved) { resolved = true; resolve(); } };
        const hook = () => {
          const time = (performance.now() - start) / 1000;
          const state = spin.sample(time);
          rotor.rotation.y = state.wheelAngle;
          ball.position.set(state.x, state.y, state.z);
          ball.rotation.z = -state.ballAngle * state.radius / W.ballRadius;
          if (time >= spin.duration) finish();
          // Keep the seated ball on the moving rotor after the result call.
          if (state.wheelVelocity < 0.015) { C.app.offFrame(hook); activeHook = null; }
        };
        hook.cancel = () => { C.app.offFrame(hook); finish(); };
        activeHook = hook; C.app.onFrame(hook);
      });
    }
    return { spinTo, prepareLaunch, cancel, launch, durationMs: 7600 };
  }

  // ---------- tote board (history / statistics display) ----------
  // Portrait LED panel on a pole beside the wheel, modeled on real casino
  // roulette displays: recent numbers, limits, HIGH/LOW/ODD/EVEN split,
  // hot/cold numbers. All stats derive from one simulated spin history so
  // every figure on a board is self-consistent (and each table differs).
  function makeToteBoard(opts) {
    const limits = String(opts.limitsText || '').split(/[–-]/).map((s) => s.trim());
    const minTxt = limits[0] || opts.minChipLabel || '100';
    const maxTxt = limits[1] || '20,000';

    // REAL records only. The board starts empty (fresh session) and is fed
    // by roulette-live.js via userData.setStats — live spins at this table
    // plus the embedded game's Skip-100 simulations, computed with the 2D
    // game's own stats semantics (roulette-map.js#boardStats).
    let S = { total: 0, last: [], hot: [], cold: [], high: null, low: null, odd: null, even: null };

    const R = C.assets.roundRect;
    const drawBoard = (ctx) => {
      const stats = [
        { label: 'HIGH', v: S.high, hue0: '#8a5cf0', hue1: '#5b2fb8' },
        { label: 'LOW', v: S.low, hue0: '#ffc14d', hue1: '#d98a1a' },
        { label: 'ODD', v: S.odd, hue0: '#8a5cf0', hue1: '#5b2fb8' },
        { label: 'EVEN', v: S.even, hue0: '#ffc14d', hue1: '#d98a1a' },
      ];

      ctx.fillStyle = '#0b0e14'; ctx.fillRect(0, 0, 512, 896);
      ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, 500, 884);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      // left column: winning-number history, latest at top (larger cell);
      // 13 slots are always drawn — unfilled ones stay as dim empty frames
      const colX = 14, colW = 112;
      for (let i = 0; i < 13; i++) {
        const big = i === 0;
        const y = big ? 14 : 108 + (i - 1) * 59;
        const h = big ? 90 : 55;
        const n = S.last[i];
        const filled = n !== undefined;
        ctx.fillStyle = !filled ? '#12151c'
          : n === 0 ? '#12813f' : RED.has(n) ? '#b01218' : '#1c1f24';
        R(ctx, colX, y, colW, h, 6); ctx.fill();
        ctx.strokeStyle = filled ? '#454b57' : '#252a34'; ctx.lineWidth = 1.5;
        R(ctx, colX, y, colW, h, 6); ctx.stroke();
        ctx.fillStyle = filled ? '#fff' : '#3a4150';
        ctx.font = `bold ${big ? 56 : 32}px 'Segoe UI', system-ui, sans-serif`;
        ctx.fillText(filled ? String(n) : '–', colX + colW / 2, y + h / 2 + 2);
      }

      const rx = 140, rw = 358, rcx = rx + rw / 2;

      // header
      ctx.fillStyle = '#e8b54a';
      ctx.font = "bold 20px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText((opts.tierName || '').toUpperCase(), rcx, 28);
      ctx.fillStyle = '#d42026';
      ctx.font = "bold 42px Georgia, serif";
      ctx.fillText('ROULETTE', rcx, 66);

      // min bet panel + maximum bar
      ctx.fillStyle = '#e9e9e4';
      R(ctx, rx + 20, 92, rw - 40, 86, 8); ctx.fill();
      ctx.fillStyle = '#8a8a85';
      ctx.font = "bold 15px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText('MINIMUM BET', rcx, 112);
      ctx.fillStyle = '#c01218';
      ctx.font = "bold 52px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(minTxt, rcx, 148);
      ctx.fillStyle = '#a01218';
      R(ctx, rx + 20, 188, rw - 40, 36, 6); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = "bold 21px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(`MAXIMUM ${maxTxt}`, rcx, 207);

      // HIGH / LOW / ODD / EVEN pennants
      ctx.fillStyle = '#101725';
      R(ctx, rx + 8, 238, rw - 16, 216, 8); ctx.fill();
      ctx.strokeStyle = '#2c3242'; ctx.lineWidth = 1.5;
      R(ctx, rx + 8, 238, rw - 16, 216, 8); ctx.stroke();
      const segW = (rw - 16) / 4;
      stats.forEach((s, i) => {
        const cx = rx + 8 + segW * (i + 0.5);
        ctx.fillStyle = '#e6e9ef';
        ctx.font = "bold 17px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(s.label, cx, 258);
        const g = ctx.createLinearGradient(0, 274, 0, 398);
        g.addColorStop(0, s.hue0); g.addColorStop(1, s.hue1);
        ctx.fillStyle = g;
        ctx.globalAlpha = s.v === null ? 0.25 : 1;   // dim pennant until data exists
        ctx.beginPath();
        ctx.moveTo(cx - 16, 274); ctx.lineTo(cx + 16, 274);
        ctx.lineTo(cx + 16, 374); ctx.lineTo(cx, 398); ctx.lineTo(cx - 16, 374);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = s.v === null ? '#5a6274' : '#fff';
        ctx.font = "bold 19px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(s.v === null ? '–' : `${s.v}%`, cx, 432);
      });

      // hot / cold numbers — 4 slots each, dim frames until enough spins
      ctx.font = "bold 24px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = '#ff7a1a'; ctx.fillText('HOT', rx + segW, 484);
      ctx.fillStyle = '#5ec8f0'; ctx.fillText('COLD', rx + rw - segW, 484);
      const badge = (n, x, y, c0, c1) => {
        const filled = n !== undefined;
        if (filled) {
          const g = ctx.createLinearGradient(0, y, 0, y + 52);
          g.addColorStop(0, c0); g.addColorStop(1, c1);
          ctx.fillStyle = g;
        } else ctx.fillStyle = '#12151c';
        R(ctx, x, y, 64, 52, 8); ctx.fill();
        ctx.strokeStyle = filled ? 'rgba(255,255,255,.35)' : '#252a34'; ctx.lineWidth = 1.5;
        R(ctx, x, y, 64, 52, 8); ctx.stroke();
        ctx.fillStyle = filled ? '#fff' : '#3a4150';
        ctx.font = "bold 27px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(filled ? String(n) : '–', x + 32, y + 28);
      };
      for (let i = 0; i < 4; i++) {
        badge(S.hot[i], rx + 22 + (i % 2) * 76, 504 + Math.floor(i / 2) * 64, '#ff8c1a', '#c81616');
        badge(S.cold[i], rx + rw / 2 + 22 + (i % 2) * 76, 504 + Math.floor(i / 2) * 64, '#4fb6e8', '#1a5fa8');
      }

      // session spin counter (real records only — resets on every session)
      ctx.fillStyle = '#7c8496';
      ctx.font = "600 15px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(S.total === 0 ? 'NEW SESSION' : `SESSION SPINS ${S.total}`, rcx, 646);

      // mini wheel graphic
      const wcx = rcx, wcy = 738, wr = 84;
      for (let i = 0; i < 37; i++) {
        const a0 = i * STEP, a1 = a0 + STEP;
        ctx.beginPath();
        ctx.moveTo(wcx, wcy);
        ctx.arc(wcx, wcy, wr, a0, a1);
        ctx.closePath();
        ctx.fillStyle = numFill(EU_WHEEL[i]);
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(wcx, wcy, wr * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = '#23262c'; ctx.fill();
      ctx.beginPath(); ctx.arc(wcx, wcy, wr * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = '#c9a227'; ctx.fill();

      // footer
      ctx.fillStyle = '#1c8a2e';
      R(ctx, 14, 842, 484, 42, 6); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = "bold 26px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText('PLACE YOUR BETS', 256, 864);
    };
    const tx = C.assets.canvasTexture(512, 896, drawBoard);

    const group = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: '#0d0f13', roughness: 0.55, metalness: 0.35 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.04, 20), dark);
    base.position.y = 0.02;
    base.castShadow = true; base.receiveShadow = true;
    group.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.86, 12), dark);
    pole.position.y = 0.45;
    pole.castShadow = true;
    group.add(pole);
    const casing = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.14, 0.07), dark);
    casing.position.y = 1.42;
    casing.castShadow = true; casing.receiveShadow = true;
    group.add(casing);
    // unlit screen so it reads as an LED panel under any room light
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.60, 1.05),
      new THREE.MeshBasicMaterial({ map: tx, fog: false }));
    screen.position.set(0, 1.42, 0.037);
    group.add(screen);

    // Live update: replace the whole stats snapshot and redraw. Redraws are
    // coalesced so a Skip-100 burst (100 results in ~1s) paints a handful of
    // frames instead of a hundred.
    let redrawTimer = null;
    group.userData.setStats = (stats) => {
      S = stats || { total: 0, last: [], hot: [], cold: [], high: null, low: null, odd: null, even: null };
      if (redrawTimer) return;
      redrawTimer = setTimeout(() => {
        redrawTimer = null;
        drawBoard(tx.image.getContext('2d'));
        tx.needsUpdate = true;
      }, 100);
    };
    return group;
  }

  // opts: { tierName, limitsText, minChipLabel, accent, withDealer }
  C.floor.tables.roulette = (opts = {}) => {
    const A = C.assets;
    const g = new THREE.Group();

    // rail + felt top (printed layout on the +Y face, material index 2)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, RAIL_H, 1.6), A.woodMaterial('#3a2214'));
    rail.position.y = RAIL_H / 2;
    rail.castShadow = true; rail.receiveShadow = true;
    g.add(rail);

    const wood = A.woodMaterial('#3a2214');
    const feltMat = new THREE.MeshStandardMaterial({ map: makeFeltLayoutTexture(), roughness: 0.9, metalness: 0 });
    const feltTop = new THREE.Mesh(new THREE.BoxGeometry(3.28, 0.04, 1.48),
      [wood, wood, feltMat, wood, wood, wood]);
    feltTop.position.y = FELT_Y;
    feltTop.receiveShadow = true;
    g.add(feltTop);

    // wheel bowl on a pedestal at the west end of the table
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.71, 0.76, 0.34, 48),
      A.woodMaterial('#241408'));
    bowl.position.set(-2.35, 0.61, 0);
    bowl.castShadow = true; bowl.receiveShadow = true;
    g.add(bowl);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.46, 24),
      A.woodMaterial('#241408'));
    pedestal.position.set(-2.35, 0.22, 0);
    pedestal.castShadow = true; pedestal.receiveShadow = true;
    g.add(pedestal);
    const wheelMount = new THREE.Group();
    wheelMount.position.set(-2.35, 0.78, 0);
    const wheel = buildWheel(wheelMount);
    g.add(wheelMount);

    // Bet-chip layer: ghost bets live here so the first live setBets()
    // replaces them, and every live bet lands/clears through this group.
    const betLayer = new THREE.Group();
    betLayer.name = 'roulette-bets';
    let actionGeneration = 0;
    g.add(betLayer);
    const c1 = C.chips.makeChipStack(500, 6);
    c1.position.set(0.35, FELT_Y + 0.02 + C.chips.CHIP_H / 2, 0.05);
    betLayer.add(c1);
    const c2 = C.chips.makeChipStack(100, 4);
    c2.position.set(0.05, FELT_Y + 0.02 + C.chips.CHIP_H / 2, 0.52);
    betLayer.add(c2);

    const chipBundle = (amount) => {
      const bundle = new THREE.Group();
      C.layouts.chipBreakdown(amount).forEach((value, i) => {
        const chip = C.chips.makeChip(value);
        chip.position.set(Math.floor(i / 12) * 0.058, (i % 12) * C.chips.CHIP_H, 0);
        bundle.add(chip);
      });
      bundle.userData.amount = amount;
      return bundle;
    };

    // dealer chip bank on the plain apron between the wheel and the layout
    // (NOT on the printed betting grid) — rack turned to run across the table
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.7),
      new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.5, metalness: 0.3 }));
    rack.position.set(-1.44, FELT_Y + 0.03, 0);
    g.add(rack);
    [100, 500, 1000, 5000].forEach((v, i) => {
      const stk = C.chips.makeChipStack(v, 8);
      stk.position.set(-1.44, FELT_Y + 0.055 + C.chips.CHIP_H / 2, -0.24 + i * 0.16);
      g.add(stk);
    });

    let dealerRig = null, dealer = null;
    if (opts.withDealer) {
      // walk-in enters from the aisle end of the dealer's own corridor
      // (world +Z = south): the table sits perpendicular to the aisle, so a
      // pit-lane (±X) entry would cross the neighbouring table, and the old
      // local -x path spawned him at the wheel end INSIDE the tote board.
      dealer = A.makeDealer({ seed: opts.dealerSeed, walkIn: [0, 2.2] });
      dealer.position.set(-1.88, 0, -0.94);
      g.add(dealer);
      dealer.userData.idle(C.app);
      dealerRig = dealer.userData.rig;
    }
    g.userData.dealerRig = dealerRig;

    // History/stats tote board beside the wheel on the dealer side, screen
    // angled toward the aisle + players — in frame behind the felt while
    // betting, and beside the bowl (not blocking it) during the spin shot.
    const board = makeToteBoard(opts);
    board.position.set(-2.72, 0, -1.13);
    board.rotation.y = Math.PI / 2 - 0.15;
    g.add(board);

    // tier sign at the aisle-side corner (plaqueYaw lets a rotated table
    // keep its sign facing the aisle)
    if (opts.tierName) {
      const plaque = A.makePlaque([opts.tierName.toUpperCase(), opts.limitsText, 'MIN CHIP ' + opts.minChipLabel]);
      plaque.position.set(2.45, 0, 1.0);
      plaque.rotation.y = opts.plaqueYaw ?? 0.25;
      g.add(plaque);
    }

    // LED base glow — doubles as the proximity-highlight rig
    const pad = A.makeGlowPad(5.6, 3.0, opts.accent || '#ffb040');
    pad.position.x = -0.35;
    g.add(pad);
    g.userData.highlight = (on) => pad.userData.setBright(on);
    g.userData.radius = 2.5;

    // Live-play rig for the lobby's in-place roulette session (roulette-live.js):
    // spin the real wheel, append results to the tote board, mirror the 2D
    // game's bets as chip stacks on the printed felt.
    g.userData.setBoardStats = (stats) => board.userData.setStats(stats);
    g.userData.setBets = (spots) => {
      actionGeneration++;
      betLayer.children.slice().forEach((stack) => {
        stack.userData.chipSlide?.cancel();
        stack.traverse((o) => { if (o.isMesh) C.chips.disposeChip(o); });
        betLayer.remove(stack);
      });
      (spots || []).forEach(({ x, z, amount }) => {
        const stk = chipBundle(amount);
        stk.position.set(x, FELT_Y + 0.02 + C.chips.CHIP_H / 2, z);
        betLayer.add(stk);
      });
    };

    // ---- dealer choreography rig (visual only; roulette-live.js drives it) ----
    const CHIP_Y = FELT_Y + 0.02 + C.chips.CHIP_H / 2;
    const RACK_LOCAL = [-1.44, CHIP_Y, -0.47];
    const RIM_LOCAL = [wheelMount.position.x + wheel.launch.x, wheelMount.position.y + wheel.launch.y, wheel.launch.z];
    const toW = (p) => g.localToWorld(new THREE.Vector3(p[0], p[1], p[2])).toArray();
    // Third arg is an options bag (ms / on) forwarded straight through to
    // dealerRig.play — Task 9 needs `on: { release/contact }` threaded here
    // for the wheel-kick and chip-contact sync; previously this only ever
    // forwarded `ms`, silently dropping any `on` a caller passed.
    const rigPlay = (name, refs, opts = {}) =>
      dealerRig ? dealerRig.play(C.app, name, { refs, ...opts }) : Promise.resolve();
    const DEALER_HOME = [-1.88, 0, -0.94];
    let dealerFoot = DEALER_HOME.slice();
    const walkDealer = async (destination, ms) => {
      if (!dealerRig?.walkTo || C.character.ready !== 'ready') return false;
      const distance = Math.hypot(destination[0] - dealerFoot[0], destination[2] - dealerFoot[2]);
      await dealerRig.walkTo(C.app, toW(destination), { ms: ms || Math.max(350, distance / 0.9 * 1000) });
      dealerFoot = destination.slice();
      return true;
    };

    // dolly: gold cylinder marker, parked (hidden) at the rack
    const dolly = new THREE.Group();
    dolly.name = 'roulette-dolly';
    const dBase = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.05, 12), A.goldMaterial());
    dBase.position.y = 0.025;
    const dStem = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 8), A.goldMaterial());
    dStem.position.y = 0.075;
    const dTop = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), A.goldMaterial());
    dTop.position.y = 0.105;
    dolly.add(dBase, dStem, dTop);
    dolly.visible = false;
    dolly.position.set(...RACK_LOCAL);
    g.add(dolly);

    const glideLocal = (obj, to, ms) => new Promise((res) => {
      if (C.app.REDUCED) { obj.position.set(to[0], to[1], to[2]); return res(); }
      C.tween.to(obj.position, { y: to[1] + 0.18 }, ms * 0.25, 'outCubic', () => {
        C.tween.to(obj.position, { x: to[0], z: to[2] }, ms * 0.5, 'inOutCubic', () => {
          C.tween.to(obj.position, { y: to[1] }, ms * 0.25, 'outCubic', res);
        });
      });
    });

    g.userData.placeDolly = async (n) => {
      const [x, z] = FELT.numberCenter(n);
      dolly.visible = true;
      if (dealerRig && C.character.ready === 'ready') {
        await dealerRig.play(C.app, 'placeDolly', {
          refs: { rack: toW(RACK_LOCAL), target: toW([x, FELT_Y, z]) },
          on: {
            // Object3D.attach() preserves world transform on its own — no
            // need to snapshot the dolly's world position first.
            grab: () => { dealerRig.handBone?.('R')?.attach(dolly); },
            release: () => { g.attach(dolly); dolly.position.set(x, FELT_Y + 0.02, z); },
          },
        });
        // Safety net: playPath's promise always resolves (supersession
        // included), but a path cancelled mid-flight NEVER fires its
        // remaining waypoint events — if `release` never fired, the dolly
        // is still parented to the hand bone. Reattach to the table so
        // liftDolly (which always assumes the dolly hangs off `g`) keeps
        // working and the prop is never left orphaned on a detached hand.
        if (dolly.parent !== g) { g.attach(dolly); dolly.position.set(x, FELT_Y + 0.02, z); }
      } else {
        rigPlay('placeDolly', { rack: toW(RACK_LOCAL), target: toW([x, FELT_Y, z]) });
        await glideLocal(dolly, [x, FELT_Y + 0.02, z], 750);
      }
    };
    g.userData.liftDolly = async () => {
      await glideLocal(dolly, RACK_LOCAL, 500);
      dolly.visible = false;
    };

    const disposeStack = (stack) => {
      stack.userData.chipSlide?.cancel();
      stack.traverse((o) => { if (o.isMesh) C.chips.disposeChip(o); });
      stack.parent?.remove(stack);
    };
    const stackNear = (x, z) => betLayer.children.find(
      (s) => Math.hypot(s.position.x - x, s.position.z - z) < 0.02);
    const moveStack = (stack, to, ms) => C.chips.slideStack(C.app, stack, to, { ms });
    const performAt = async (gesture, refs, event, action, ms = 780) => {
      let operation = null;
      const begin = () => { if (!operation) operation = action(); };
      const motion = rigPlay(gesture, refs, { ms, on: { [event]: begin } });
      if (!dealerRig) begin();
      await motion;
      // Superseded paths resolve without their remaining contact events.
      begin();
      await operation;
    };

    // A real croupier rake keeps losing chips visibly connected to the
    // dealer's action, including spots beyond fingertip reach. The shaft
    // is rigid; its rear passes through the grip as the head draws back.
    const rake = new THREE.Group();
    rake.name = 'roulette-rake';
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 1.45, 10), A.woodMaterial('#51331e'));
    shaft.rotation.x = Math.PI / 2; shaft.position.z = -0.725;
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.024, 0.025), A.goldMaterial());
    crossbar.position.y = 0.01;
    rake.add(shaft, crossbar);
    [-0.075, 0.075].forEach((x) => {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.021, 0.055), A.goldMaterial());
      tooth.position.set(x, 0.012, -0.017); rake.add(tooth);
    });
    rake.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    rake.visible = false; g.add(rake);
    let activeRakeStop = null;
    const trackRake = (stack) => {
      activeRakeStop?.();
      const hook = () => {
        const hand = dealerRig?.handContactWorld?.('R');
        const grip = hand ? g.worldToLocal(hand.clone ? hand.clone() : new THREE.Vector3(...hand))
          : new THREE.Vector3(dealer?.position.x ?? -1.88, 1.08, -0.57);
        const tip = stack.position.clone();
        const away = tip.clone().sub(grip); away.y = 0; away.normalize();
        rake.position.copy(tip).addScaledVector(away, 0.04);
        rake.position.y = FELT_Y + 0.022;
        const direction = rake.position.clone().sub(grip).normalize();
        rake.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
      };
      rake.visible = true; hook(); C.app.onFrame(hook);
      const stop = () => { C.app.offFrame(hook); rake.visible = false; if (activeRakeStop === stop) activeRakeStop = null; };
      activeRakeStop = stop;
      return stop;
    };

    g.userData.settleBets = async ({ losingSpots = [], winningSpots = [] }) => {
      const roomGen = C.app.roomGen;
      const generation = actionGeneration;
      const active = () => C.app.roomGen === roomGen && actionGeneration === generation;
      // Clear losers first, one controlled rake stroke at a time. Winning
      // stakes and the winning-number marker remain untouched during this.
      for (const { x, z } of losingSpots) {
        if (!active()) return;
        const stack = stackNear(x, z);
        if (!stack) continue;
        // Approach along the dealer corridor, keeping feet off the table.
        // The shorter rake reaches across its width without a stretched arm.
        const approachX = Math.max(-1.4, Math.min(1.2, x - 0.1));
        const approached = await walkDealer([approachX, 0, -0.99]);
        if (!active()) return;
        const collection = approached ? [approachX + 0.12, CHIP_Y, -0.55] : RACK_LOCAL;
        const stopRake = trackRake(stack);
        try {
          await performAt('sweepChips', { target: toW([x, CHIP_Y, z]), rack: toW(collection) }, 'contact',
            () => active() ? moveStack(stack, collection, 560) : Promise.resolve(false), 1020);
          if (active() && approached) {
            const ms = Math.max(650, Math.abs(approachX - DEALER_HOME[0]) / 0.9 * 1000);
            await Promise.all([walkDealer(DEALER_HOME, ms), moveStack(stack, RACK_LOCAL, ms)]);
          }
        } finally { stopRake(); }
        if (!active()) return;
        disposeStack(stack);
      }
      // Pay net winnings beside the original stake; the embedded game still
      // performs the actual settlement and wallet update after this display.
      for (const { x, z, amount, factor } of winningSpots) {
        if (!active()) return;
        const pay = chipBundle(amount * factor);
        pay.position.set(...RACK_LOCAL); betLayer.add(pay);
        await performAt('payChips', { rack: toW(RACK_LOCAL), target: toW([x, CHIP_Y, z]) }, 'grab',
          () => active() ? moveStack(pay, [x + 0.065, CHIP_Y, z], 610) : Promise.resolve(false), 1040);
      }
    };

    g.userData.buyIn = async () => {
      const generation = actionGeneration;
      const stack = C.chips.makeChipStack(100, 6);
      stack.position.set(...RACK_LOCAL); betLayer.add(stack);
      await performAt('payChips', { rack: toW(RACK_LOCAL), target: toW([0.35, CHIP_Y, 0.66]) }, 'grab',
        () => actionGeneration === generation ? moveStack(stack, [0.35, CHIP_Y, 0.66], 720) : Promise.resolve(false), 1180);
      // Leave the buy-in on the player's rail apron until real bets replace
      // it, instead of shrinking physical chips away after a short timeout.
      stack.userData.buyIn = true;
    };

    // wrap spinTo: the dealer reaches to the rim, flicks, wheel spins — the
    // wheel now starts exactly on the flick's `release` waypoint instead of
    // the instant spinFollow is fired. Fallback: a 400ms race against the
    // release event covers both the procedural rig (ignores `on` entirely)
    // and a spinFollow cancelled mid-flight (e.g. a room switch), so the
    // wheel can never hang waiting for an event that will never fire.
    const rawSpinTo = wheel.spinTo;
    let spinGeneration = 0;
    g.userData.spinDurationMs = wheel.durationMs;
    g.userData.cancelSpin = () => {
      spinGeneration++; actionGeneration++; wheel.cancel(); activeRakeStop?.();
      dealerRig?.stop?.('body'); dealerRig?.stop?.('arms');
      if (dolly.parent !== g) g.attach(dolly);
      dolly.visible = false;
    };
    g.userData.spinTo = async (pocket) => {
      const generation = ++spinGeneration, roomGen = C.app.roomGen;
      const active = () => generation === spinGeneration && roomGen === C.app.roomGen;
      await walkDealer(DEALER_HOME);
      if (!active()) return;
      await Promise.all([rigPlay('spinReach', { rim: toW(RIM_LOCAL) }, { ms: 680 }), wheel.prepareLaunch()]);
      if (!active()) return;
      if (C.character.ready === 'ready') {
        let kicked = null;
        const kick = new Promise((res) => { kicked = res; });
        rigPlay('spinFollow', { rim: toW(RIM_LOCAL) }, { on: { release: () => kicked() } });
        await Promise.race([kick, new Promise((r) => setTimeout(r, 400))]);
      } else {
        rigPlay('spinFollow', { rim: toW(RIM_LOCAL) });
      }
      if (!active()) return;
      return rawSpinTo(pocket);
    };

    return g;
  };
})();
