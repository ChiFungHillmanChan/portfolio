(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};
  C.floor.tables = C.floor.tables || {};

  // Six-position baccarat table with an open dealer bay.
  // Group origin = table center at floor level; +Z = seats/aisle side.
  const FELT_Y = 0.82;
  const RAIL_RX = 1.8, RAIL_RZ = 0.85, FELT_FRAC = 0.94;
  const FELT_RX = RAIL_RX * FELT_FRAC, FELT_RZ = RAIL_RZ * FELT_FRAC;
  const SEAT_RX = 2.15, SEAT_RZ = 1.3;
  const DEALER_EDGE_Z = -0.57, APRON_EDGE_Z = -0.50, NOTCH_HALF = 0.38, NOTCH_JOIN = 0.48;

  // The dealer bay is cut through every tabletop layer. Shape coordinates
  // are (x, -z), ready for rotation onto the horizontal table plane.
  function tableContour(rx, rz, dealerEdgeZ = DEALER_EDGE_Z) {
    const start = -Math.acos(NOTCH_JOIN / rx), end = Math.PI - start;
    const points = [];
    for (let i = 0; i <= 96; i++) {
      const angle = start + (end - start) * i / 96;
      points.push(new THREE.Vector2(rx * Math.cos(angle), -rz * Math.sin(angle)));
    }
    const rear = -rz * Math.sqrt(1 - (NOTCH_JOIN / rx) ** 2);
    const corner = (a, b, c, d) => {
      for (let i = 1; i <= 8; i++) {
        const t = i / 8, u = 1 - t;
        points.push(new THREE.Vector2(
          u ** 3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t ** 3 * d[0],
          -(u ** 3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t ** 3 * d[1]),
        ));
      }
    };
    corner([-NOTCH_JOIN, rear], [-0.45, rear + 0.02], [-0.46, dealerEdgeZ], [-NOTCH_HALF, dealerEdgeZ]);
    points.push(new THREE.Vector2(NOTCH_HALF, -dealerEdgeZ));
    corner([NOTCH_HALF, dealerEdgeZ], [0.46, dealerEdgeZ], [0.45, rear + 0.02], [NOTCH_JOIN, rear]);
    return points;
  }

  function surfaceShape(points) {
    const shape = new THREE.Shape(points);
    shape.closePath();
    return shape;
  }

  function contourPath(points, y) {
    const path = new THREE.CurvePath();
    points.forEach((point, i) => {
      const next = points[(i + 1) % points.length];
      path.add(new THREE.LineCurve3(new THREE.Vector3(point.x, y, -point.y), new THREE.Vector3(next.x, y, -next.y)));
    });
    return path;
  }

  // An upholstered ring, rather than a scaled ellipse laid over the felt.
  // Its width and crown taper to zero where both contours meet the dealer
  // bay, preserving the measured hip clearance across the entire cutout.
  function paddedRailGeometry(inner, outer) {
    const vertices = [], indices = [], divisions = 8;
    for (let i = 0; i < inner.length; i++) {
      const width = inner[i].distanceTo(outer[i]);
      for (let j = 0; j <= divisions; j++) {
        const t = j / divisions;
        vertices.push(
          THREE.MathUtils.lerp(inner[i].x, outer[i].x, t),
          FELT_Y + 0.002 + Math.sin(t * Math.PI) * 0.024 * Math.min(1, width / 0.045),
          -THREE.MathUtils.lerp(inner[i].y, outer[i].y, t),
        );
      }
    }
    for (let i = 0; i < inner.length; i++) {
      for (let j = 0; j < divisions; j++) {
        const a = i * (divisions + 1) + j;
        const b = ((i + 1) % inner.length) * (divisions + 1) + j;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

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
      const PLAYER = '#eee1b8', BANKER = '#e99c91', TIE = '#b0ceb9';
      ctx.fillStyle = '#074532';
      ctx.fillRect(0, 0, W, H);
      // A low-contrast woven nap remains quiet under chips and card faces.
      ctx.fillStyle = 'rgba(225,240,220,.025)';
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
      ctx.fillStyle = 'rgba(0,15,8,.025)';
      for (let x = 0; x < W; x += 4) ctx.fillRect(x, 0, 1, H);

      // One restrained perimeter rule replaces the heavy double border.
      ctx.strokeStyle = 'rgba(230,214,171,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, W / 2 - 22, H / 2 - 22, 0, 0, Math.PI * 2); ctx.stroke();

      // Card receiving areas are the same world-space rectangles used by
      // the deal layout. No individual dashed card guides compete with a hand.
      const cardBox = ({ x0, x1, z0, z1, titleZ }, color, label) => {
        ctx.fillStyle = 'rgba(235,230,205,.025)';
        R(ctx, px(x0), py(z0), px(x1) - px(x0), py(z1) - py(z0), 12); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `600 31px ${CJK}`;
        ctx.fillText(label, (px(x0) + px(x1)) / 2, py(titleZ));
      };
      cardBox(L.cardAreas.player, PLAYER, '閒 PLAYER');
      cardBox(L.cardAreas.banker, BANKER, '莊 BANKER');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#c7bc94'; ctx.font = '30px Georgia, serif';
      ctx.fillText('BACCARAT', cx, py(0.10));
      ctx.fillStyle = 'rgba(220,220,194,.8)'; ctx.font = '17px Georgia, serif';
      ctx.fillText('BANKER WINS PAY 19 TO 20', cx, py(0.18));

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

      // Short dividers separate each seat without carving up the entire felt.
      ctx.strokeStyle = 'rgba(225,215,177,.26)'; ctx.lineWidth = 2;
      for (let i = 1; i < L.seatAngles.length; i++) {
        const deg = 15 + i * 25;
        const [x0, y0] = pt(0.58, deg), [x1, y1] = pt(0.91, deg);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }

      // Only the three supported wagers are printed. Their centres stay
      // registered to seatSpot(), so bets land inside the corresponding band.
      L.seatAngles.forEach((deg, i) => {
        ctx.strokeStyle = TIE; ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(180,207,184,.04)';
        bandPath(0.405, 0.525, deg - 8.5, deg + 8.5); ctx.fill(); ctx.stroke();
        arcText('和 TIE', 0.453, deg, `600 23px ${CJK}`, TIE);
        arcText('8 TO 1', 0.498, deg, '15px Georgia, serif', TIE);

        ctx.strokeStyle = BANKER; ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(175,66,63,.08)';
        bandPath(0.575, 0.735, deg - 11, deg + 11); ctx.fill(); ctx.stroke();
        arcText('莊 BANKER', 0.635, deg, `600 28px ${CJK}`, BANKER);
        arcText('19 TO 20', 0.699, deg, '15px Georgia, serif', BANKER);

        ctx.strokeStyle = PLAYER; ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(235,222,177,.045)';
        bandPath(0.765, 0.9, deg - 11, deg + 11); ctx.fill(); ctx.stroke();
        arcText('閒 PLAYER', 0.81, deg, `600 28px ${CJK}`, PLAYER);
        arcText('1 TO 1', 0.869, deg, '15px Georgia, serif', PLAYER);
        arcText(String(i + 1), 0.943, deg, '27px Georgia, serif', 'rgba(231,223,198,.8)');
      });
    });
    return feltTexture;
  }

  // dealer chip rack: dark tray, gold dividers, 8 chip stacks
  function makeChipRack() {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.045, 0.16),
      new THREE.MeshStandardMaterial({ color: '#1a120b', roughness: 0.45, metalness: 0.25 }),
    );
    tray.position.y = 0.0225;
    tray.castShadow = true; tray.receiveShadow = true;
    g.add(tray);
    for (let i = 0; i <= 8; i++) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.052, 0.16), C.assets.goldMaterial());
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

    // A shallow wooden apron on two pedestals leaves knee/toe space below
    // the dealer cutout instead of filling the ellipse down to the floor.
    const outerContour = tableContour(RAIL_RX, RAIL_RZ);
    const apronContour = tableContour(RAIL_RX, RAIL_RZ, APRON_EDGE_Z);
    const apron = new THREE.Mesh(new THREE.ExtrudeGeometry(surfaceShape(apronContour), {
      depth: 0.166, bevelEnabled: false, steps: 1,
    }), A.woodMaterial('#2c201a'));
    apron.name = 'baccarat-apron';
    apron.rotation.x = -Math.PI / 2; apron.position.y = 0.64;
    apron.castShadow = true; apron.receiveShadow = true; g.add(apron);
    // The deeper knee recess leaves a short supported overhang at the
    // dealer edge. Its top plate clears the largest dealer's hip envelope.
    const topPlate = new THREE.Mesh(new THREE.ExtrudeGeometry(surfaceShape(outerContour), {
      depth: 0.014, bevelEnabled: false, steps: 1,
    }), A.woodMaterial('#2c201a'));
    topPlate.name = 'baccarat-top-plate';
    topPlate.rotation.x = -Math.PI / 2; topPlate.position.y = 0.806;
    topPlate.castShadow = true; topPlate.receiveShadow = true; g.add(topPlate);
    const brass = new THREE.MeshStandardMaterial({ color: '#9d8254', roughness: 0.46, metalness: 0.72 });
    const apronTrim = new THREE.Mesh(new THREE.TubeGeometry(contourPath(apronContour, 0.675), 192, 0.003, 6, true), brass);
    apronTrim.name = 'baccarat-apron-trim'; g.add(apronTrim);
    [-0.75, 0.75].forEach((x) => {
      const support = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.60, 32), A.woodMaterial('#2a180f'));
      support.position.set(x, 0.34, 0.12);
      support.castShadow = true; support.receiveShadow = true; g.add(support);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.32, 0.045, 32), A.woodMaterial('#24160e'));
      foot.position.set(x, 0.0225, 0.12);
      foot.castShadow = true; foot.receiveShadow = true; g.add(foot);
    });

    // Explicit ellipse-based UVs preserve every printed bet/card position.
    // ShapeGeometry's default bounding-box UVs would shift the whole layout
    // when the dealer notch changes the polygon's rear extent.
    const innerContour = tableContour(FELT_RX, FELT_RZ);
    const feltGeometry = new THREE.ShapeGeometry(surfaceShape(innerContour));
    const positions = feltGeometry.attributes.position, uv = feltGeometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      uv.setXY(i, 0.5 + positions.getX(i) / (2 * FELT_RX), 0.5 + positions.getY(i) / (2 * FELT_RZ));
    }
    const felt = new THREE.Mesh(
      feltGeometry,
      new THREE.MeshStandardMaterial({ map: makeFeltTexture(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    );
    felt.name = 'baccarat-felt';
    felt.rotation.x = -Math.PI / 2;
    felt.position.y = FELT_Y;
    felt.receiveShadow = true;
    g.add(felt);

    const leather = new THREE.MeshStandardMaterial({ color: '#241b19', roughness: 0.82 });
    const armRail = new THREE.Mesh(paddedRailGeometry(innerContour, outerContour), leather);
    armRail.name = 'baccarat-arm-rail'; armRail.castShadow = true; armRail.receiveShadow = true; g.add(armRail);

    // Piping finishes the outer seam and the dealer cutout. At the bay its
    // 15 mm radius stays behind the dealer's measured torso envelope.
    const edge = new THREE.Mesh(new THREE.TubeGeometry(contourPath(outerContour, FELT_Y + 0.004), 192, 0.015, 8, true), leather);
    edge.name = 'baccarat-edge'; edge.castShadow = true; edge.receiveShadow = true; g.add(edge);
    const seamContour = innerContour.map((point, i) => point.clone().lerp(outerContour[i], 0.18));
    const seam = new THREE.Mesh(new THREE.TubeGeometry(contourPath(seamContour, FELT_Y + 0.016), 192, 0.0008, 4, true),
      new THREE.MeshStandardMaterial({ color: '#8a7761', roughness: 1 }));
    seam.name = 'baccarat-rail-seam'; g.add(seam);

    // fresh shoe: the board starts empty (新靴 NEW SHOE) and only fills with
    // rounds the ambient show actually deals in front of the player
    const rounds = [];

    const shoeGroup = C.cards.makeShoe();
    shoeGroup.position.set(...L.shoePos);
    shoeGroup.rotation.y = L.shoeYaw;
    g.add(shoeGroup);

    // dealer strip props
    const rack = makeChipRack();
    rack.name = 'baccarat-chip-rack';
    rack.position.set(L.rackPos[0], FELT_Y, L.rackPos[2]);
    g.add(rack);
    const discard = C.cards.makeDiscardTray();
    discard.position.set(L.discardPos[0], FELT_Y, L.discardPos[2]);
    g.add(discard);

    // six seats matching the felt sectors; bets only appear once the show
    // deals (a fresh shoe has no chips on the arcs)
    L.seatAngles.forEach((deg) => {
      const a = (deg * Math.PI) / 180;
      const stool = A.makeStool();
      stool.position.set(Math.cos(a) * SEAT_RX, 0, Math.sin(a) * SEAT_RZ);
      g.add(stool);
    });

    let dealerRig = null;
    if (opts.withDealer) {
      // Baccarat rounds begin while the player is still approaching. Keep
      // the dealer at the post so a proximity-triggered entrance cannot
      // relocate the body in the middle of a shoe pickup or card release.
      const dealer = A.makeDealer({ seed: opts.dealerSeed });
      dealer.position.set(0, 0, -0.74);
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
      L, feltY: FELT_Y, rounds,
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
