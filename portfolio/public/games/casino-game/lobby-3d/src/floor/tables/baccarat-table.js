(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};
  C.floor.tables = C.floor.tables || {};

  // Baccarat ellipse table (ported from the v1 room, demo round stripped).
  // Group origin = table center at floor level; +Z = seats/aisle side.
  const RAIL_H = 0.8, FELT_Y = 0.82;
  const RAIL_RX = 1.8, RAIL_RZ = 0.85, FELT_FRAC = 0.94;
  const FELT_RX = RAIL_RX * FELT_FRAC, FELT_RZ = RAIL_RZ * FELT_FRAC;
  const SEAT_RX = 2.15, SEAT_RZ = 1.3;

  const CJK = "'PingFang TC','Microsoft JhengHei','Noto Sans TC',sans-serif";

  // Macau-style felt, module-cached — the four floor tables share one
  // 2048x1024 texture. Canvas top = dealer edge (-z); pt(f, deg) uses the
  // same parametrisation as layouts.baccarat.seatSpot (90° = player edge).
  let feltTexture = null;
  function makeFeltTexture() {
    if (feltTexture) return feltTexture;
    const L = C.layouts.baccarat;
    const W = 2048, H = 1024, cx = W / 2, cy = H / 2;
    const px = (x) => cx + (x / L.feltRx) * (W / 2);
    const py = (z) => cy + (z / L.feltRz) * (H / 2);
    const pt = (f, deg) => {
      const a = (deg * Math.PI) / 180;
      return [cx + Math.cos(a) * f * (W / 2), cy + Math.sin(a) * f * (H / 2)];
    };

    feltTexture = C.assets.canvasTexture(W, H, (ctx) => {
      const R = C.assets.roundRect;
      ctx.fillStyle = '#0b5d3b';
      ctx.fillRect(0, 0, W, H);

      // gold border ring
      ctx.strokeStyle = 'rgba(240,216,120,.7)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.ellipse(cx, cy, W / 2 - 14, H / 2 - 14, 0, 0, Math.PI * 2); ctx.stroke();

      // dealer strip: outline where the physical chip rack sits
      ctx.strokeStyle = 'rgba(240,216,120,.5)'; ctx.lineWidth = 4;
      R(ctx, px(-0.42), py(-0.66), px(0.42) - px(-0.42), py(-0.38) - py(-0.66), 14); ctx.stroke();

      // card-dealing area: 閒 PLAYER (left, yellow) | 庄 BANKER (right, red)
      const cardBox = (x0, x1, color, label) => {
        ctx.strokeStyle = color; ctx.lineWidth = 5;
        R(ctx, px(x0), py(-0.30), px(x1) - px(x0), py(0.02) - py(-0.30), 16); ctx.stroke();
        ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold 34px ${CJK}`;
        ctx.fillText(label, (px(x0) + px(x1)) / 2, py(-0.25));
      };
      cardBox(-0.78, -0.16, '#f0d878', '閒 PLAYER');
      cardBox(0.16, 0.78, '#e05555', '庄 BANKER');
      ctx.strokeStyle = 'rgba(240,216,120,.8)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, py(-0.30)); ctx.lineTo(cx, py(0.02)); ctx.stroke();

      // rotated text helper: upright for a viewer at that seat
      const arcText = (text, f, deg, font, fill) => {
        const [x, y] = pt(f, deg);
        ctx.save(); ctx.translate(x, y); ctx.rotate(((deg - 90) * Math.PI) / 180);
        ctx.font = font; ctx.fillStyle = fill;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };
      // closed band between fractions f0..f1, angles a0..a1
      const bandPath = (f0, f1, a0, a1) => {
        ctx.beginPath();
        for (let a = a0; a <= a1; a += 2) { const [x, y] = pt(f1, a); a === a0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        for (let a = a1; a >= a0; a -= 2) { const [x, y] = pt(f0, a); ctx.lineTo(x, y); }
        ctx.closePath();
      };

      // commission boxes 1..6 (dealer tracks 5% commission per seat)
      L.seatAngles.forEach((deg, i) => {
        const [bx, by] = pt(0.30, deg);
        ctx.save(); ctx.translate(bx, by); ctx.rotate(((deg - 90) * Math.PI) / 180);
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
        R(ctx, -30, -24, 60, 48, 8); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.font = 'bold 30px Georgia, serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), 0, 0);
        ctx.restore();
      });

      // radial sector dividers
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
      for (let i = 0; i <= 6; i++) {
        const deg = 15 + i * 25;
        const [x0, y0] = pt(0.40, deg), [x1, y1] = pt(0.90, deg);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }

      // per-seat betting arcs: TIE(+pairs) inner, BANKER middle, PLAYER outer
      L.seatAngles.forEach((deg, i) => {
        // TIE box (wide, with the odds stacked inside it)
        ctx.strokeStyle = '#59d98e'; ctx.lineWidth = 4;
        bandPath(0.41, 0.505, deg - 8, deg + 8); ctx.stroke();
        arcText('和 TIE', 0.478, deg, `bold 20px ${CJK}`, '#59d98e');
        arcText('8:1', 0.432, deg, 'bold 15px Georgia, serif', 'rgba(89,217,142,.9)');
        // pair circles side by side BELOW the tie box, well inside the
        // sector — flanking the box angularly made neighbouring sectors'
        // circles overlap each other and the dividers on the ellipse sides.
        [['庄對', '#e05555', -4.5], ['閒對', '#f0d878', 4.5]].forEach(([t, col, da]) => {
          const [ox, oy] = pt(0.55, deg + da);
          ctx.strokeStyle = col; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(ox, oy, 17, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = col;
          ctx.font = `bold 13px ${CJK}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(t, ox, oy);
        });
        // BANKER arc
        ctx.strokeStyle = '#e05555'; ctx.lineWidth = 4;
        bandPath(0.60, 0.72, deg - 11, deg + 11); ctx.stroke();
        arcText('庄 BANKER', 0.66, deg, `bold 30px ${CJK}`, '#e05555');
        // PLAYER arc
        ctx.strokeStyle = '#f0d878'; ctx.lineWidth = 4;
        bandPath(0.75, 0.87, deg - 11, deg + 11); ctx.stroke();
        arcText('閒 PLAYER', 0.81, deg, `bold 30px ${CJK}`, '#f0d878');
        // seat number at the rim
        arcText(String(i + 1), 0.93, deg, 'bold 44px Georgia, serif', 'rgba(255,255,255,.9)');
      });
    });
    return feltTexture;
  }

  // dealer chip rack: dark tray, gold dividers, 8 chip stacks
  function makeChipRack() {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.045, 0.26),
      new THREE.MeshStandardMaterial({ color: '#1a120b', roughness: 0.45, metalness: 0.25 }),
    );
    tray.position.y = 0.0225;
    tray.castShadow = true; tray.receiveShadow = true;
    g.add(tray);
    for (let i = 0; i <= 8; i++) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.052, 0.26), C.assets.goldMaterial());
      div.position.set(-0.36 + i * 0.09, 0.028, 0);
      g.add(div);
    }
    [5000, 1000, 1000, 500, 500, 100, 100, 25].forEach((v, i) => {
      const stack = C.chips.makeChipStack(v, 5 + (i % 3));
      stack.position.set(-0.315 + i * 0.09, 0.048, 0);
      g.add(stack);
    });
    return g;
  }

  // discard holder: shallow tray with a few face-down cards
  function makeDiscardTray() {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.03, 0.3),
      new THREE.MeshStandardMaterial({ color: '#14100c', roughness: 0.5, metalness: 0.2 }),
    );
    tray.position.y = 0.015;
    tray.castShadow = true;
    g.add(tray);
    for (let i = 0; i < 3; i++) {
      const card = C.cards.makeCard(null);
      card.rotation.x = -Math.PI / 2;
      card.rotation.z = (Math.random() - 0.5) * 0.3;
      card.position.set(0, 0.033 + i * 0.002, 0);
      g.add(card);
    }
    return g;
  }

  // ---------- roadmap scoreboard (bilingual Macau LED board) ----------
  function drawBoardCanvas(rounds, opts) {
    const R2 = C.baccaratRoads;
    const big = R2.buildBigRoad(rounds);
    const st = R2.stats(rounds);
    const pred = R2.predictNext(big);
    const RED = '#e0453a', BLUE = '#3d7de0', GREEN = '#2fae62', GOLD = '#e8b54a';
    const RANK = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
    for (let r = 2; r <= 10; r++) RANK[r] = String(r);
    const SUITS = ['♠', '♥', '♦', '♣'];
    const derivedCells = (k) =>
      R2.layoutRoad(R2.deriveRoad(big, k).map((color) => ({ key: color, color })));
    const lastCols = (cells, n) => {
      const max = cells.reduce((m, c) => Math.max(m, c.col), 0);
      const shift = Math.max(0, max + 1 - n);
      return cells.filter((c) => c.col >= shift).map((c) => ({ ...c, col: c.col - shift }));
    };

    return C.assets.canvasTexture(1024, 800, (ctx) => {
      const RR = C.assets.roundRect;
      const bg = ctx.createLinearGradient(0, 0, 0, 800);
      bg.addColorStop(0, '#241014'); bg.addColorStop(1, '#0c0d12');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 800);
      ctx.strokeStyle = '#4a3b22'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 1016, 792);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      const grid = (x0, y0, cell, cols, rows) => {
        ctx.strokeStyle = 'rgba(120,130,150,0.4)'; ctx.lineWidth = 1;
        for (let i = 0; i <= cols; i++) {
          ctx.beginPath(); ctx.moveTo(x0 + i * cell, y0); ctx.lineTo(x0 + i * cell, y0 + rows * cell); ctx.stroke();
        }
        for (let j = 0; j <= rows; j++) {
          ctx.beginPath(); ctx.moveTo(x0, y0 + j * cell); ctx.lineTo(x0 + cols * cell, y0 + j * cell); ctx.stroke();
        }
      };
      const roadPanel = (x0, y0, cell, cols, rows) => {
        ctx.fillStyle = '#f5efdf';
        RR(ctx, x0 - 3, y0 - 3, cols * cell + 6, rows * cell + 6, 6); ctx.fill();
        grid(x0, y0, cell, cols, rows);
      };
      const bandLabel = (t, x, y) => {
        ctx.fillStyle = '#c8b78e'; ctx.font = `bold 13px ${CJK}`;
        ctx.textAlign = 'left'; ctx.fillText(t, x, y); ctx.textAlign = 'center';
      };

      // title
      ctx.fillStyle = GOLD;
      ctx.font = `bold 52px ${CJK}`;
      ctx.fillText('百家樂', 150, 46);
      ctx.font = 'bold 38px Georgia, serif';
      ctx.fillText('BACCARAT', 150, 96);
      ctx.fillStyle = '#c8b78e'; ctx.font = `16px ${CJK}`;
      ctx.fillText((opts.tierName || '').toUpperCase(), 150, 132);

      // stats table
      [
        ['庄 BANKER', st.banker, RED],
        ['閒 PLAYER', st.player, BLUE],
        ['和 TIE', st.tie, GREEN],
        ['庄對 BANKER PAIR', st.bPair, RED],
        ['閒對 PLAYER PAIR', st.pPair, BLUE],
        ['例牌 NATURAL', st.natural, GOLD],
        ['局數 GAME NUMBER', st.games, '#dcd6c8'],
      ].forEach(([label, n, col], i) => {
        const y = 24 + i * 19;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(324, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#efe9dc'; ctx.textAlign = 'left';
        ctx.font = `bold 15px ${CJK}`;
        ctx.fillText(label, 340, y);
        ctx.fillStyle = GOLD; ctx.textAlign = 'right';
        ctx.font = 'bold 17px Georgia, serif';
        ctx.fillText(String(n), 700, y);
        ctx.textAlign = 'center';
      });

      // 下局預告 (next-round preview) — genuinely computed one step ahead
      ctx.strokeStyle = '#6b5a33'; ctx.lineWidth = 2;
      RR(ctx, 720, 12, 292, 140, 8); ctx.stroke();
      ctx.fillStyle = '#efe9dc'; ctx.font = `bold 18px ${CJK}`;
      ctx.fillText('下局預告', 866, 32);
      const predSymbol = (x, y, road, color) => {
        if (!color) {
          ctx.fillStyle = '#666';
          ctx.fillRect(x - 6, y - 1.5, 12, 3);
          return;
        }
        const col = color === 'r' ? RED : BLUE;
        if (road === 0) {           // big eye boy: ring
          ctx.strokeStyle = col; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
        } else if (road === 1) {    // small road: dot
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
        } else {                    // cockroach: slash
          ctx.strokeStyle = col; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(x - 7, y + 7); ctx.lineTo(x + 7, y - 7); ctx.stroke();
        }
      };
      [['B', 810, RED, '庄'], ['P', 922, BLUE, '閒']].forEach(([oc, x, col, ch]) => {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, 66, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold 16px ${CJK}`;
        ctx.fillText(ch, x, 66);
        pred[oc].forEach((color, k) => predSymbol(x - 34 + k * 34, 108, k, color));
      });

      // 珠盤路 bead plate (12 cols)
      bandLabel('珠盤路', 14, 160);
      const BX = 12, BY = 170, BC = 26;
      roadPanel(BX, BY, BC, 12, 6);
      R2.beadPlate(rounds, 12).forEach((cell) => {
        const x = BX + cell.col * BC + BC / 2, y = BY + cell.row * BC + BC / 2;
        ctx.fillStyle = cell.outcome === 'B' ? RED : cell.outcome === 'P' ? BLUE : GREEN;
        ctx.beginPath(); ctx.arc(x, y, BC * 0.44, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold 14px ${CJK}`;
        ctx.fillText(cell.outcome === 'B' ? '庄' : cell.outcome === 'P' ? '閒' : '和', x, y);
        if (cell.bankerPair) {
          ctx.fillStyle = RED;
          ctx.beginPath(); ctx.arc(x - BC * 0.34, y - BC * 0.34, 3.5, 0, Math.PI * 2); ctx.fill();
        }
        if (cell.playerPair) {
          ctx.fillStyle = BLUE;
          ctx.beginPath(); ctx.arc(x + BC * 0.34, y + BC * 0.34, 3.5, 0, Math.PI * 2); ctx.fill();
        }
      });

      // current round card panel (gold) — freshly shuffled shoe has no rounds
      const last = rounds[rounds.length - 1];
      const gp = ctx.createLinearGradient(0, 170, 0, 326);
      gp.addColorStop(0, '#caa64f'); gp.addColorStop(1, '#9a7a2e');
      ctx.fillStyle = gp; RR(ctx, 340, 170, 672, 156, 8); ctx.fill();
      if (last) {
        ctx.strokeStyle = '#6b5a1f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(676, 178); ctx.lineTo(676, 318); ctx.stroke();
        ctx.fillStyle = '#3a2c08'; ctx.font = `bold 22px ${CJK}`;
        ctx.fillText(`閒 PLAYER ${last.playerTotal}`, 508, 306);
        ctx.fillText(`庄 BANKER ${last.bankerTotal}`, 844, 306);
        const mini = (card, x, y, sideways) => {
          ctx.save(); ctx.translate(x, y);
          if (sideways) ctx.rotate(Math.PI / 2);
          ctx.fillStyle = '#fdfbf2'; RR(ctx, -24, -34, 48, 68, 6); ctx.fill();
          ctx.strokeStyle = '#8a8578'; ctx.lineWidth = 1.5; RR(ctx, -24, -34, 48, 68, 6); ctx.stroke();
          ctx.fillStyle = card.s === 1 || card.s === 2 ? '#c0392b' : '#16161c';
          ctx.font = 'bold 26px Georgia, serif';
          ctx.fillText(RANK[card.r], 0, -12);
          ctx.font = '24px Georgia, serif';
          ctx.fillText(SUITS[card.s], 0, 16);
          ctx.restore();
        };
        last.playerCards.forEach((cd, i) => mini(cd, 448 + i * 64, 232, i === 2));
        last.bankerCards.forEach((cd, i) => mini(cd, 784 + i * 64, 232, i === 2));
      } else {
        ctx.fillStyle = '#3a2c08'; ctx.font = `bold 44px ${CJK}`;
        ctx.fillText('新靴 NEW SHOE', 676, 236);
        ctx.font = `22px ${CJK}`;
        ctx.fillText('祝君好運 GOOD LUCK', 676, 286);
      }

      // 大路 big road
      bandLabel('大路', 14, 340);
      roadPanel(12, 348, 32, 31, 6);
      lastCols(R2.bigRoadCells(big), 31).forEach((c) => {
        const x = 12 + c.col * 32 + 16, y = 348 + c.row * 32 + 16;
        ctx.strokeStyle = c.outcome === 'B' ? RED : BLUE; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.stroke();
        if (c.ties > 0) {
          ctx.strokeStyle = GREEN; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(x - 11, y + 11); ctx.lineTo(x + 11, y - 11); ctx.stroke();
          if (c.ties > 1) {
            ctx.fillStyle = GREEN; ctx.font = 'bold 13px Georgia, serif';
            ctx.fillText(String(c.ties), x + 10, y + 10);
          }
        }
      });

      // 大眼仔 big eye boy
      bandLabel('大眼仔', 14, 556);
      roadPanel(12, 564, 17, 59, 6);
      lastCols(derivedCells(1), 59).forEach((c) => {
        const x = 12 + c.col * 17 + 8.5, y = 564 + c.row * 17 + 8.5;
        ctx.strokeStyle = c.color === 'r' ? RED : BLUE; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.stroke();
      });

      // 小路 + 曱甴路
      bandLabel('小路', 14, 680);
      roadPanel(12, 688, 16, 30, 6);
      lastCols(derivedCells(2), 30).forEach((c) => {
        const x = 12 + c.col * 16 + 8, y = 688 + c.row * 16 + 8;
        ctx.fillStyle = c.color === 'r' ? RED : BLUE;
        ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill();
      });
      bandLabel('曱甴路', 522, 680);
      roadPanel(520, 688, 16, 30, 6);
      lastCols(derivedCells(3), 30).forEach((c) => {
        const x = 520 + c.col * 16 + 8, y = 688 + c.row * 16 + 8;
        ctx.strokeStyle = c.color === 'r' ? RED : BLUE; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - 5, y + 5); ctx.lineTo(x + 5, y - 5); ctx.stroke();
      });

      // bilingual disclaimer footer
      ctx.fillStyle = '#9b8f78'; ctx.font = `12px ${CJK}`;
      ctx.fillText('路盤所顯示之資料，只供參考，如有錯漏，本公司概不負責。 Results displayed are provided as a service only.', 512, 792);
    });
  }

  // Full-screen splash shown while the dealer performs the shuffle ritual.
  function drawShufflingCanvas(opts) {
    return C.assets.canvasTexture(1024, 800, (ctx) => {
      const RR = C.assets.roundRect;
      const bg = ctx.createLinearGradient(0, 0, 0, 800);
      bg.addColorStop(0, '#241014'); bg.addColorStop(1, '#0c0d12');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 800);
      ctx.strokeStyle = '#4a3b22'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 1016, 792);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e8b54a';
      ctx.font = `bold 44px ${CJK}`;
      ctx.fillText('百家樂 BACCARAT', 512, 120);
      ctx.fillStyle = '#c8b78e'; ctx.font = `18px ${CJK}`;
      ctx.fillText((opts.tierName || '').toUpperCase(), 512, 170);
      ctx.strokeStyle = '#e8b54a'; ctx.lineWidth = 3;
      RR(ctx, 192, 280, 640, 280, 16); ctx.stroke();
      ctx.fillStyle = '#f0d878';
      ctx.font = `bold 130px ${CJK}`;
      ctx.fillText('洗牌中', 512, 390);
      ctx.font = 'bold 58px Georgia, serif';
      ctx.fillText('SHUFFLING', 512, 500);
      ctx.fillStyle = '#9b8f78'; ctx.font = `26px ${CJK}`;
      ctx.fillText('請稍候 · 新靴準備中  Please wait — preparing a new shoe', 512, 640);
    });
  }

  function makeScoreBoard(rounds, opts) {
    const g = new THREE.Group();
    const casing = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 1.0, 0.07),
      new THREE.MeshStandardMaterial({ color: '#14161c', roughness: 0.5, metalness: 0.3 }),
    );
    casing.position.y = 1.5;
    casing.castShadow = true;
    g.add(casing);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.06, 0.05), C.assets.goldMaterial());
    frame.position.set(0, 1.5, -0.014);
    g.add(frame);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 0.92),
      new THREE.MeshBasicMaterial({ map: drawBoardCanvas(rounds, opts), fog: false }),
    );
    screen.position.set(0, 1.5, 0.037);
    g.add(screen);
    const setMap = (tx) => {
      const old = screen.material.map;
      screen.material.map = tx;
      screen.material.needsUpdate = true;
      old && old.dispose();
    };
    const redraw = () => setMap(drawBoardCanvas(rounds, opts));
    g.userData.pushRound = (round) => {
      rounds.push(round);
      if (rounds.length > 80) rounds.shift();
      redraw();
    };
    // new shoe: wipe the whole history like a real Macau board
    g.userData.resetRounds = () => { rounds.length = 0; redraw(); };
    g.userData.setShuffling = (on) => (on ? setMap(drawShufflingCanvas(opts)) : redraw());
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 1.0, 12),
      new THREE.MeshStandardMaterial({ color: '#0e0f13', roughness: 0.4, metalness: 0.5 }),
    );
    pole.position.y = 0.5;
    g.add(pole);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 0.05, 20),
      new THREE.MeshStandardMaterial({ color: '#0e0f13', roughness: 0.5, metalness: 0.4 }),
    );
    base.position.y = 0.025;
    g.add(base);
    return g;
  }

  // opts: { tierName, limitsText, minChipLabel, accent, withDealer }
  C.floor.tables.baccarat = (opts = {}) => {
    const A = C.assets;
    const L = C.layouts.baccarat;
    const g = new THREE.Group();

    // elliptical rail: unit cylinder scaled (v1 technique)
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, RAIL_H, 56), A.woodMaterial('#3a2214'));
    rail.scale.set(RAIL_RX, 1, RAIL_RZ);
    rail.position.y = RAIL_H / 2;
    rail.castShadow = true; rail.receiveShadow = true;
    g.add(rail);

    // felt ellipse (unit circle scaled; UVs stay the unit-circle mapping)
    const felt = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshStandardMaterial({ map: makeFeltTexture(), roughness: 0.9 }),
    );
    felt.rotation.x = -Math.PI / 2;
    felt.scale.set(FELT_RX, FELT_RZ, 1);
    felt.position.y = FELT_Y;
    felt.receiveShadow = true;
    g.add(felt);

    // one simulated shoe per table: the same history drives the felt cards
    // and the scoreboard, so everything on this table is self-consistent
    const rounds = C.baccaratRoads.simulateShoe();
    const lastRound = rounds[rounds.length - 1];

    // card-dealing area: printed boxes + the final round's actual cards
    const staticCards = [];
    [[L.playerSlots, lastRound.playerCards], [L.bankerSlots, lastRound.bankerCards]]
      .forEach(([slots, cards]) => {
        slots.forEach((slot, idx) => {
          const box = C.cards.makeCardBoxDecal({ sideways: idx === 2 });
          box.position.set(slot[0], FELT_Y + 0.004, slot[2]);
          g.add(box);
        });
        cards.forEach((cardDef, idx) => {
          const card = C.cards.makeCard(cardDef);
          card.rotation.x = -Math.PI / 2;
          if (idx === 2) card.rotation.z = Math.PI / 2;
          card.position.set(slots[idx][0], FELT_Y + 0.006 + idx * 0.0005, slots[idx][2]);
          g.add(card);
          staticCards.push(card);
        });
      });

    // shoe
    const shoeGroup = new THREE.Group();
    const shoeBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.16, 0.22),
      new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4, metalness: 0.3 }),
    );
    shoeBody.rotation.x = -0.35;
    shoeBody.castShadow = true;
    shoeGroup.add(shoeBody);
    const shoeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), A.goldMaterial());
    shoeTrim.rotation.x = -0.35;
    shoeTrim.position.y = 0.09;
    shoeGroup.add(shoeTrim);
    shoeGroup.position.set(L.shoePos[0], FELT_Y, L.shoePos[2]);
    g.add(shoeGroup);

    // dealer strip props
    const rack = makeChipRack();
    rack.position.set(L.rackPos[0], FELT_Y, L.rackPos[2]);
    g.add(rack);
    const discard = makeDiscardTray();
    discard.position.set(L.discardPos[0], FELT_Y, L.discardPos[2]);
    g.add(discard);

    // six seats matching the felt sectors; some "occupied" with ghost bets
    const kinds = ['player', 'banker', 'banker', 'player', 'tie'];
    const occupied = new Set();
    while (occupied.size < 3 + Math.floor(Math.random() * 2))
      occupied.add(Math.floor(Math.random() * 6));
    L.seatAngles.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const stool = A.makeStool();
      stool.position.set(Math.cos(a) * SEAT_RX, 0, Math.sin(a) * SEAT_RZ);
      g.add(stool);
      if (!occupied.has(i)) return;
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const [bx, bz] = L.seatSpot(i, kind);
      const chips = C.chips.makeChipStack([100, 500, 1000][i % 3], 3 + (i % 4));
      chips.position.set(bx, FELT_Y + 0.005, bz);
      g.add(chips);
    });

    let dealerRig = null;
    if (opts.withDealer) {
      const dealer = A.makeDealer({ seed: opts.dealerSeed });
      dealer.position.set(0, 0, -1.25);
      g.add(dealer);
      dealer.userData.idle(C.app);
      dealerRig = dealer.userData.rig;
    }
    g.userData.dealerRig = dealerRig;

    // roadmap scoreboard at the end opposite the plaque, facing the aisle
    const board = makeScoreBoard(rounds, opts);
    board.position.set(-2.35, 0, 0.35);
    board.rotation.y = 0.35;
    g.add(board);

    // ambient-show rig (src/floor/baccarat-show.js drives it when the player is near)
    g.userData.bac = {
      L, feltY: FELT_Y, rounds, staticCards,
      pushRound: (round) => board.userData.pushRound(round),
      resetBoard: () => board.userData.resetRounds(),
      setShuffling: (on) => board.userData.setShuffling(on),
      get dealerRig() { return g.userData.dealerRig; },
    };

    if (opts.tierName) {
      const plaque = A.makePlaque([opts.tierName.toUpperCase(), opts.limitsText, 'MIN CHIP ' + opts.minChipLabel]);
      plaque.position.set(2.25, 0, 0.6);
      plaque.rotation.y = -0.25;
      g.add(plaque);
    }

    const pad = A.makeGlowPad(4.8, 3.0, opts.accent || '#ffb040');
    g.add(pad);
    g.userData.highlight = (on) => pad.userData.setBright(on);
    g.userData.radius = 2.4;

    return g;
  };
})();
