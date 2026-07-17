(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};
  C.floor.tables = C.floor.tables || {};

  // Static roulette table: rail box + printed felt layout (racetrack, grid,
  // dozens/columns) + recessed wheel bowl + tote board (ported from the v1
  // room, spin logic removed — the 3D hub never plays). Group origin = rail
  // center at floor level; +Z faces the players' long side.
  const RAIL_H = 0.82, FELT_Y = 0.84, STEP = (Math.PI * 2) / 37;
  const EU_WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
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

  // Wheel number ring — the canvas-arc angle convention lands at the same
  // group-local angle as the separators after RingGeometry UV + rotation.x=-π/2
  // (verified empirically in v1).
  function makeNumberRingTexture() {
    const W = 1024, cx = 512, cy = 512;
    return C.assets.canvasTexture(W, W, (ctx) => {
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, W);
      for (let i = 0; i < 37; i++) {
        const n = EU_WHEEL[i];
        const a0 = i * STEP - STEP / 2, a1 = i * STEP + STEP / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 500, a0, a1);
        ctx.closePath();
        ctx.fillStyle = numFill(n);
        ctx.fill();
        ctx.strokeStyle = 'rgba(240,216,120,.5)'; ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * STEP);
        ctx.translate(410, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 44px Georgia, serif';
        ctx.fillText(String(n), 0, 0);
        ctx.restore();
      }
    });
  }

  // Wheel assembly. `mount` is the non-rotating group at the bowl's location;
  // `rotor` is its spinning child. During flight the ball is a direct child
  // of the mount so its cos/sin path stays fixed while the rotor turns
  // underneath (same rig as the v1 room). Returns { spinTo }.
  function buildWheel(mount) {
    const gold = C.assets.goldMaterial();
    const darkWood = new THREE.MeshStandardMaterial({ color: '#241408', roughness: 0.55, metalness: 0.1 });
    const rotor = new THREE.Group();

    const base = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.16, 64), darkWood);
    base.rotation.x = Math.PI;   // wide flat face up
    base.position.y = 0.08;
    base.castShadow = true; base.receiveShadow = true;
    rotor.add(base);

    const RING_Y = 0.161;
    const hubCone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.06, 24), gold);
    hubCone.position.y = RING_Y + 0.03;
    hubCone.castShadow = true;
    rotor.add(hubCone);
    const hubFinial = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), gold);
    hubFinial.position.y = RING_Y + 0.09;
    hubFinial.castShadow = true;
    rotor.add(hubFinial);

    const ringMat = new THREE.MeshStandardMaterial({ map: makeNumberRingTexture(), roughness: 0.4, metalness: 0.1 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.30, 0.52, 148), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = RING_Y;
    ring.receiveShadow = true;
    rotor.add(ring);

    const SEP_RADIUS = 0.44, SEP_H = 0.014;
    const sepGeo = new THREE.BoxGeometry(0.10, SEP_H, 0.008);
    for (let i = 0; i < 37; i++) {
      // pivot.rotation.y = -angle keeps position + radial orientation in sync
      const angle = (i + 0.5) * STEP;
      const pivot = new THREE.Group();
      pivot.rotation.y = -angle;
      const box = new THREE.Mesh(sepGeo, gold);
      box.position.set(SEP_RADIUS, RING_Y + SEP_H / 2, 0);
      box.castShadow = true;
      pivot.add(box);
      rotor.add(pivot);
    }

    // Bowl surround (static — does NOT spin): raised outer rim rolling over
    // into an inward-sloping ball apron, so the wheel sits recessed inside
    // and the running ball stays contained. Profile points are
    // (radius, height) bottom → over the lip → down to the number ring.
    const rimProfile = [
      [0.70, -0.02], [0.72, 0.05], [0.72, 0.185], [0.685, 0.235],
      [0.615, 0.225], [0.55, 0.175],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const rimMat = C.assets.woodMaterial('#241408');
    rimMat.side = THREE.DoubleSide;
    const rim = new THREE.Mesh(new THREE.LatheGeometry(rimProfile, 64), rimMat);
    rim.castShadow = true; rim.receiveShadow = true;
    mount.add(rim);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.70, 0.014, 10, 64), gold);
    lip.rotation.x = -Math.PI / 2;
    lip.position.y = 0.238;
    mount.add(lip);

    // ball parked in a pocket (on TOP of the ring plane — it used to sit
    // inside the base cone, i.e. invisible) + drop marker on the static rim
    // at world angle 0, where spinTo lands the ball
    const R_REST = 0.36, R_FLIGHT = 0.56;
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#fdfdf5', roughness: 0.25, metalness: 0.05 }),
    );
    ball.castShadow = true;
    ball.position.set(R_REST, RING_Y + 0.016, 0);
    rotor.add(ball);
    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 8), gold);
    marker.rotation.x = Math.PI;
    marker.position.set(0.655, 0.285, 0);
    mount.add(marker);

    mount.add(rotor);

    // Land the ball on `pocket` (0-36). Wheel spins forward 4-7 turns while
    // the ball counter-rotates 6-10 turns around the apron, easing inward
    // over the last 28% and parking at world angle 0 — so the rotor must
    // stop at rotation.y ≡ +idx*STEP (three.js puts local angle a at world
    // angle a - rotation.y; sign verified empirically in the v1 room).
    // Sign care: rotor.rotation.y INCREASING makes every pocket's world
    // angle DECREASE (a - θ above), so the ball's own world angle must
    // INCREASE (+b1) to actually run against the wheel on screen — a
    // negative b1 sent both spinning the same way (user-reported).
    function spinTo(pocket) {
      return new Promise((resolve) => {
        const idx = EU_WHEEL.indexOf(pocket);
        if (idx < 0) return resolve();
        const wheelTurns = 4 + (crypto.getRandomValues(new Uint32Array(1))[0] % 4);   // 4–7
        const ballTurns = 6 + (crypto.getRandomValues(new Uint32Array(1))[0] % 5);    // 6–10
        const ms = C.app.REDUCED ? 2200 : 4200 + Math.random() * 1600;
        const w0 = rotor.rotation.y % (Math.PI * 2);
        const w1 = w0 + wheelTurns * Math.PI * 2 + ((idx * STEP - w0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const b1 = ballTurns * Math.PI * 2;   // counter-rotation (see sign note above), ends at world angle 0
        const t0 = performance.now();
        const ease = C.tween.easings.outQuart;
        rotor.remove(ball);
        mount.add(ball);
        const hook = () => {
          const t = Math.min(1, (performance.now() - t0) / ms);
          const e = ease(t);
          rotor.rotation.y = w0 + (w1 - w0) * e;
          const ba = b1 * e;
          const drop = Math.max(0, (t - 0.72) / 0.28);              // radius eases in over last 28%
          const r = R_FLIGHT + (R_REST - R_FLIGHT) * drop * drop;
          ball.position.set(Math.cos(ba) * r, 0.21 - 0.033 * drop, Math.sin(ba) * r);
          if (t === 1) {
            C.app.offFrame(hook);
            // lock the ball into the winning pocket: reparent into the rotor
            // at the pocket's LOCAL angle so it rides the wheel afterwards
            mount.remove(ball);
            rotor.add(ball);
            ball.position.set(Math.cos(idx * STEP) * R_REST, RING_Y + 0.016, Math.sin(idx * STEP) * R_REST);
            resolve();
          }
        };
        hook.cancel = () => { C.app.offFrame(hook); resolve(); };
        C.app.onFrame(hook);
      });
    }

    return { spinTo };
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
    g.add(betLayer);
    const c1 = C.chips.makeChipStack(500, 6);
    c1.position.set(0.35, 0.86, 0.05);
    betLayer.add(c1);
    const c2 = C.chips.makeChipStack(100, 4);
    c2.position.set(0.05, 0.86, 0.52);
    betLayer.add(c2);

    const DENOMS = [5000, 1000, 500, 100, 50, 25, 10, 5, 1];
    const chipsFor = (amount) => {
      const denom = DENOMS.find((d) => d <= amount) || 1;
      return { denom, count: Math.max(1, Math.min(10, Math.round(amount / denom))) };
    };

    // dealer chip bank on the plain apron between the wheel and the layout
    // (NOT on the printed betting grid) — rack turned to run across the table
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.7),
      new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.5, metalness: 0.3 }));
    rack.position.set(-1.44, FELT_Y + 0.03, 0);
    g.add(rack);
    [100, 500, 1000, 5000].forEach((v, i) => {
      const stk = C.chips.makeChipStack(v, 8);
      stk.position.set(-1.44, FELT_Y + 0.055, -0.24 + i * 0.16);
      g.add(stk);
    });

    let dealerRig = null;
    if (opts.withDealer) {
      const dealer = A.makeDealer({ seed: opts.dealerSeed, walkIn: true });
      dealer.position.set(0.2, 0, -1.15);
      g.add(dealer);
      dealer.userData.idle(C.app);
      dealerRig = dealer.userData.rig;
    }
    g.userData.dealerRig = dealerRig;

    // History/stats tote board beside the wheel on the dealer side, screen
    // angled toward the aisle + players — in frame behind the felt while
    // betting, and beside the bowl (not blocking it) during the spin shot.
    const board = makeToteBoard(opts);
    board.position.set(-1.75, 0, -1.25);
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
      betLayer.children.slice().forEach((stack) => {
        stack.traverse((o) => { if (o.isMesh) C.chips.disposeChip(o); });
        betLayer.remove(stack);
      });
      (spots || []).forEach(({ x, z, amount }) => {
        const { denom, count } = chipsFor(amount);
        const stk = C.chips.makeChipStack(denom, count);
        stk.position.set(x, 0.86, z);
        betLayer.add(stk);
      });
    };

    // ---- dealer choreography rig (visual only; roulette-live.js drives it) ----
    const RACK_LOCAL = [-1.44, FELT_Y + 0.12, 0];
    const RIM_LOCAL = [-1.72, 1.02, 0];
    const toW = (p) => g.localToWorld(new THREE.Vector3(p[0], p[1], p[2])).toArray();
    // Third arg is an options bag (ms / on) forwarded straight through to
    // dealerRig.play — Task 9 needs `on: { release/contact }` threaded here
    // for the wheel-kick and chip-contact sync; previously this only ever
    // forwarded `ms`, silently dropping any `on` a caller passed.
    const rigPlay = (name, refs, opts = {}) =>
      dealerRig ? dealerRig.play(C.app, name, { refs, ...opts }) : Promise.resolve();

    // dolly: gold cylinder marker, parked (hidden) at the rack
    const dolly = new THREE.Group();
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
      const [x, z] = C.layouts.rouletteSpotPos('n' + n);
      dolly.visible = true;
      // NOTE: `dealer` (the const from the `if (opts.withDealer)` block
      // above) is block-scoped and NOT visible here — `dealerRig` (the
      // facade itself, hoisted to this function's scope) is the equivalent
      // handle and is what every other call site in this file already uses.
      if (dealerRig && C.character.ready === 'ready') {
        let released = false;
        await dealerRig.play(C.app, 'placeDolly', {
          refs: { rack: toW(RACK_LOCAL), target: toW([x, FELT_Y, z]) },
          on: {
            // Object3D.attach() preserves world transform on its own — no
            // need to snapshot the dolly's world position first.
            grab: () => { dealerRig.handBone?.('R')?.attach(dolly); },
            release: () => { released = true; g.attach(dolly); dolly.position.set(x, FELT_Y + 0.02, z); },
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

    // Fly a chip-stack group along a small arc, then run onDone. Landing
    // ends with a brief settle wobble (scale pulse 1 -> 1.06 -> 1, 120ms
    // total) so a stack reads as settling under its own weight rather than
    // just stopping dead — skipped in REDUCED along with the rest of the arc.
    const flyStack = (stack, to, ms, onDone) => {
      if (C.app.REDUCED) { stack.position.set(to[0], to[1], to[2]); onDone && onDone(); return; }
      C.tween.to(stack.position, { y: stack.position.y + 0.16 }, ms * 0.3, 'outCubic', () => {
        C.tween.to(stack.position, { x: to[0], z: to[2] }, ms * 0.45, 'inOutCubic', () => {
          C.tween.to(stack.position, { y: to[1] }, ms * 0.25, 'outCubic', () => {
            C.tween.to(stack.scale, { x: 1.06, y: 1.06, z: 1.06 }, 60, 'outCubic', () => {
              C.tween.to(stack.scale, { x: 1, y: 1, z: 1 }, 60, 'inOutCubic', onDone);
            });
          });
        });
      });
    };
    const disposeStack = (stack) => {
      stack.traverse((o) => { if (o.isMesh) C.chips.disposeChip(o); });
      stack.parent && stack.parent.remove(stack);
    };
    const stackNear = (x, z) => betLayer.children.find(
      (s) => Math.hypot(s.position.x - x, s.position.z - z) < 0.02);

    g.userData.settleBets = async ({ losingSpots = [], winningSpots = [] }) => {
      // sweep losing stacks into the rack, dealer raking alongside — each
      // sweep is a deferred thunk so the setTimeout stagger only starts once
      // the rake actually touches the felt (the `contact` waypoint), not at
      // call time. Fallback: playPath's promise always resolves even when
      // superseded/cancelled, but a cancelled path never fires `contact` —
      // if that happens (or the procedural rig, which ignores `on`
      // entirely), start the sweep immediately so losing chips are never
      // stranded on the felt.
      if (losingSpots.length) {
        const first = losingSpots[0];
        const sweeps = losingSpots.map(({ x, z }, i) => () => new Promise((res) => {
          const stack = stackNear(x, z);
          if (!stack) return res();
          setTimeout(() => flyStack(stack, RACK_LOCAL, 420, () => { disposeStack(stack); res(); }),
            C.app.REDUCED ? 0 : i * 90);
        }));
        let sweepsDone = null;
        const startSweeps = () => { sweepsDone = Promise.all(sweeps.map((fn) => fn())); };
        if (C.character.ready === 'ready') {
          let fired = false;
          await rigPlay('sweepChips', { target: toW([first.x, FELT_Y, first.z]), rack: toW(RACK_LOCAL) },
            { on: { contact: () => { fired = true; startSweeps(); } } });
          if (!fired) startSweeps();
        } else {
          rigPlay('sweepChips', { target: toW([first.x, FELT_Y, first.z]), rack: toW(RACK_LOCAL) });
          startSweeps();
        }
        await sweepsDone;
      }
      // pay each winning spot from the rack
      for (let i = 0; i < winningSpots.length; i++) {
        const { x, z, amount, factor } = winningSpots[i];
        rigPlay('payChips', { rack: toW(RACK_LOCAL), target: toW([x, FELT_Y, z]) });
        const chips = C.layouts.chipBreakdown(amount * factor);
        const pay = new THREE.Group();
        chips.forEach((v, k) => {
          const chip = C.chips.makeChip(v);
          chip.position.y = k * C.chips.CHIP_H;
          pay.add(chip);
        });
        pay.position.set(...RACK_LOCAL);
        betLayer.add(pay);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => flyStack(pay, [x + 0.09, 0.86, z], 460, res));
      }
    };

    g.userData.buyIn = async () => {
      rigPlay('tapRack', { rack: toW(RACK_LOCAL) });
      const stk = C.chips.makeChipStack(100, 6);
      stk.position.set(...RACK_LOCAL);
      g.add(stk);
      await new Promise((res) => flyStack(stk, [0.35, FELT_Y + 0.02, 1.05], 600, res));
      await new Promise((res) => setTimeout(res, C.app.REDUCED ? 100 : 900));
      if (!C.app.REDUCED) {
        await new Promise((res) => C.tween.to(stk.scale, { x: 0.01, y: 0.01, z: 0.01 }, 200, 'outCubic', res));
      }
      stk.traverse((o) => { if (o.isMesh) C.chips.disposeChip(o); });
      g.remove(stk);
    };

    // wrap spinTo: the dealer reaches to the rim, flicks, wheel spins — the
    // wheel now starts exactly on the flick's `release` waypoint instead of
    // the instant spinFollow is fired. Fallback: a 400ms race against the
    // release event covers both the procedural rig (ignores `on` entirely)
    // and a spinFollow cancelled mid-flight (e.g. a room switch), so the
    // wheel can never hang waiting for an event that will never fire.
    const rawSpinTo = wheel.spinTo;
    g.userData.spinTo = async (pocket) => {
      await rigPlay('spinReach', { rim: toW(RIM_LOCAL) });
      if (C.character.ready === 'ready') {
        let kicked = null;
        const kick = new Promise((res) => { kicked = res; });
        rigPlay('spinFollow', { rim: toW(RIM_LOCAL) }, { on: { release: () => kicked() } });
        await Promise.race([kick, new Promise((r) => setTimeout(r, 400))]);
      } else {
        rigPlay('spinFollow', {});
      }
      return rawSpinTo(pocket);
    };

    return g;
  };
})();
