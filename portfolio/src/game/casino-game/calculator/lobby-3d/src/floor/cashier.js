(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  // Local +Z is the guest side. Keeping the station, work targets, and props
  // in one coordinate system allows the same service to run in the room and
  // the inspection scene. Financial state belongs exclusively to platform.js.
  C.floor.buildCashierStation = ({ app = C.app, standalone = false } = {}) => {
    const A = C.assets;
    const root = new THREE.Group(); root.name = 'cashier-station';
    const standard = (color, roughness = 0.55, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const walnut = A.woodMaterial('#32251f');
    const dark = standard('#172528', 0.55);
    const brass = standard('#b89a5d', 0.32, 0.68);
    const stone = standard('#c9c1ae', 0.35, 0.02);
    const felt = standard('#21483e', 0.94);
    const rubber = standard('#131a1c', 0.92);
    const paperEdge = standard('#ddd8c5', 0.9);
    const steel = standard('#899396', 0.32, 0.6);
    const owned = new Set();
    const chipPrototypes = new Map();
    const storedStack = (value, count) => {
      if (!chipPrototypes.has(value)) chipPrototypes.set(value, C.chips.makeChip(value));
      const chip = chipPrototypes.get(value);
      const stack = new THREE.InstancedMesh(chip.geometry, chip.material, count);
      const transform = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        transform.position.y = i * 0.005;
        transform.rotation.y = (i % 3 - 1) * 0.08;
        transform.updateMatrix(); stack.setMatrixAt(i, transform.matrix);
      }
      stack.name = 'cashier-stored-chip-stack';
      stack.castShadow = true; stack.receiveShadow = true;
      stack.userData.value = value; stack.userData.count = count;
      return stack;
    };
    const mesh = (name, geometry, material, position, parent = root) => {
      const part = new THREE.Mesh(geometry, material);
      part.name = name; part.position.set(...position);
      part.castShadow = true; part.receiveShadow = true;
      parent.add(part); return part;
    };
    const box = (name, size, position, material = dark, parent = root) =>
      mesh(name, new THREE.BoxGeometry(...size), material, position, parent);
    const label = (name, title, subtitle, size, position, color = '#d6c59b') => {
      const texture = A.canvasTexture(1024, 256, (ctx) => {
        ctx.fillStyle = '#172528'; ctx.fillRect(0, 0, 1024, 256);
        ctx.fillStyle = color; ctx.textAlign = 'center';
        ctx.font = '500 88px Georgia'; ctx.fillText(title, 512, subtitle ? 117 : 160, 960);
        if (subtitle) {
          ctx.font = '500 34px sans-serif'; ctx.fillStyle = '#c0c8bc';
          ctx.fillText(subtitle, 512, 196, 960);
        }
      });
      return mesh(name, new THREE.PlaneGeometry(...size),
        new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }), position);
    };

    // A visible, furnished cage interior with a clear central service opening.
    // Brass frames sit beside the teller instead of cutting through the face.
    box('cashier-back-wall', [5.55, 2.94, 0.16], [0, 1.47, -1.12], walnut);
    box('cashier-soffit', [5.64, 0.18, 1.82], [0, 2.90, -0.29], dark);
    box('cashier-header', [5.48, 0.42, 0.14], [0, 2.66, 0.49], dark);
    root.userData.sign = label('cashier-sign', 'C A S H I E R', 'CHIPS  /  CASH  /  GUEST SERVICES', [2.8, 0.40], [0, 2.68, 0.568]);
    for (const x of [-2.70, 2.70]) {
      box('cashier-window-pier', [0.16, 2.54, 1.75], [x, 1.27, -0.27], walnut);
      box('cashier-window-trim', [0.035, 2.5, 0.035], [x - Math.sign(x) * 0.10, 1.25, 0.55], brass);
    }
    for (const x of [-1.06, 1.06]) {
      box('cashier-window-mullion', [0.035, 1.57, 0.042], [x, 1.74, 0.38], brass);
    }
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#b5d2cb', roughness: 0.05, metalness: 0, transparent: true,
      opacity: 0.10, depthWrite: false, side: THREE.DoubleSide,
    });
    for (const x of [-1.83, 1.83]) {
      const pane = box('cashier-window-glass', [1.48, 1.55, 0.012], [x, 1.735, 0.38], glass);
      pane.castShadow = false;
      box('cashier-window-bottom', [1.50, 0.026, 0.04], [x, 0.967, 0.38], brass);
    }
    box('cashier-counter-body', [5.33, 0.86, 0.40], [0, 0.47, 0.25], walnut);
    box('cashier-counter-plinth', [5.23, 0.09, 0.38], [0, 0.045, 0.24], dark);
    for (let i = 0; i < 35; i++) {
      box('cashier-counter-flute', [0.025, 0.69, 0.018], [-2.55 + i * 0.15, 0.48, 0.459], brass);
    }
    box('cashier-countertop', [5.42, 0.05, 0.62], [0, 0.945, 0.25], stone);
    // A short return beside the teller supports the counter close to the
    // body; its outlet is within palm reach without leaning across the desk.
    box('cashier-machine-return', [0.52, 0.05, 0.27], [-0.48, 0.945, -0.145], stone);
    box('cashier-counter-edge', [5.43, 0.014, 0.019], [0, 0.932, 0.563], brass);
    box('cashier-service-mat', [1.88, 0.007, 0.44], [0, 0.974, 0.19], felt);
    label('cashier-front-sign', 'THE CAGE', 'PERSONAL SERVICE', [0.90, 0.24], [0, 0.49, 0.473]);

    // Individually stacked clay chips in fitted bank trays, not decorative
    // oversized cylinders. The work bank is reachable by the teller's left hand.
    const chipBank = new THREE.Group(); chipBank.name = 'cashier-chip-bank'; root.add(chipBank);
    chipBank.position.set(0.44, 0.981, 0.08);
    box('cashier-chip-bank-base', [0.38, 0.018, 0.27], [0, 0, 0], dark, chipBank);
    const values = [5, 25, 100, 500, 1000];
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 3; row++) {
        const stack = storedStack(values[col], 8 + row * 2);
        stack.position.set(-0.145 + col * 0.072, 0.012, -0.082 + row * 0.08);
        chipBank.add(stack);
      }
      box('cashier-chip-divider', [0.007, 0.04, 0.26], [-0.182 + col * 0.072, 0.025, 0], rubber, chipBank);
    }
    // Rear shelf storage is organized by denomination in removable trays.
    for (const y of [0.82, 1.29, 1.76]) {
      box('cashier-vault-shelf', [1.44, 0.045, 0.31], [-1.66, y, -0.82], dark);
      box('cashier-vault-light', [1.27, 0.016, 0.02], [-1.66, y + 0.32, -0.70],
        new THREE.MeshBasicMaterial({ color: '#ffe5ab' }));
      for (let col = 0; col < 10; col++) {
        const stack = storedStack(values[col % values.length], 10);
        stack.position.set(-2.25 + col * 0.132, y + 0.035, -0.74);
        root.add(stack);
      }
    }
    label('cashier-vault-label', 'CHIP RESERVE', 'COUNTED & SEALED', [1.20, 0.25], [-1.66, 2.28, -1.029]);

    // Safe, cash drawers, monitor, receipt printer, and audit display make
    // the room read as an operating cashier rather than a decorative grille.
    const safe = box('cashier-safe', [1.00, 1.53, 0.40], [1.92, 0.78, -0.83], standard('#4a5557', 0.72));
    box('cashier-safe-door', [0.87, 1.38, 0.028], [1.92, 0.78, -0.61], dark);
    for (const x of [1.51, 2.33]) {
      for (const y of [0.23, 1.29]) box('cashier-safe-hinge', [0.032, 0.11, 0.03], [x, y, -0.58], steel);
    }
    const wheel = mesh('cashier-safe-handle', new THREE.TorusGeometry(0.09, 0.012, 8, 32), steel, [2.13, 0.81, -0.57]);
    wheel.castShadow = true;
    for (let i = 0; i < 3; i++) {
      const spoke = box('cashier-safe-spoke', [0.16, 0.013, 0.014], [2.13, 0.81, -0.57], steel);
      spoke.rotation.z = i * Math.PI / 3;
    }
    box('cashier-safe-keypad', [0.13, 0.15, 0.025], [1.81, 1.13, -0.57], rubber);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) box('cashier-keypad-key', [0.023, 0.022, 0.01],
        [1.776 + col * 0.035, 1.165 - row * 0.034, -0.550], steel);
    }
    safe.userData.locked = true;
    box('cashier-cash-drawer', [0.66, 0.11, 0.34], [-0.85, 0.91, -0.09], dark);
    box('cashier-drawer-handle', [0.18, 0.025, 0.027], [-0.85, 0.91, 0.09], brass);
    box('cashier-monitor-base', [0.22, 0.018, 0.18], [0.95, 0.984, 0.04], dark);
    box('cashier-monitor-neck', [0.045, 0.14, 0.045], [0.95, 1.06, 0.015], steel);
    const monitor = box('cashier-monitor', [0.39, 0.25, 0.025], [0.95, 1.20, 0.018], dark);
    monitor.rotation.x = -0.14;
    label('cashier-monitor-display', 'CAGE 01', 'GUEST SERVICES', [0.345, 0.205], [0.95, 1.20, 0.039], '#a3d6b9');
    box('cashier-receipt-printer', [0.18, 0.13, 0.21], [0.79, 1.04, 0.31], standard('#e0dfd5'));
    box('cashier-receipt-slot', [0.13, 0.012, 0.012], [0.79, 1.085, 0.42], rubber);
    const receipt = box('cashier-receipt', [0.09, 0.002, 0.13], [0.79, 1.067, 0.46], paperEdge);
    receipt.rotation.x = 0.45; receipt.scale.z = 0.03;
    label('cashier-ledger-sign', 'TRANSACTIONS', 'CHIPS  ·  CASH', [0.62, 0.17], [-1.20, 1.11, 0.50]);
    label('cashier-audit-sign', 'SERVICE & SECURITY', 'PLEASE COUNT YOUR CHIPS AT THE WINDOW', [1.60, 0.26], [1.63, 2.18, -1.029]);

    const noteTextures = new Map();
    const note = (value = 100) => {
      if (!noteTextures.has(value)) {
        const texture = A.canvasTexture(512, 256, (ctx) => {
          ctx.fillStyle = '#dce2c9'; ctx.fillRect(0, 0, 512, 256);
          ctx.strokeStyle = '#547469'; ctx.lineWidth = 5; ctx.strokeRect(12, 12, 488, 232);
          ctx.lineWidth = 1;
          for (let i = 0; i < 18; i++) {
            ctx.beginPath(); ctx.ellipse(256, 128, 40 + i * 7, 20 + i * 4, 0, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.fillStyle = '#264a43'; ctx.textAlign = 'center';
          ctx.font = 'bold 35px Georgia'; ctx.fillText('CASINO CREDIT', 256, 59);
          ctx.fillStyle = '#e1e7d3'; ctx.fillRect(153, 91, 206, 78);
          ctx.fillStyle = '#264a43'; ctx.font = 'bold 64px Georgia'; ctx.fillText(String(value), 256, 151, 198);
          ctx.font = '20px sans-serif'; ctx.fillText('REDEEMABLE AT THE CAGE', 256, 219);
        });
        noteTextures.set(value, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.86 }));
      }
      const face = noteTextures.get(value);
      return mesh('cashier-credit-note', new THREE.BoxGeometry(0.150, 0.0008, 0.067),
        [paperEdge, paperEdge, face, face, paperEdge, paperEdge], [0, 0, 0], new THREE.Group());
    };
    const noteValues = (amount) => {
      // Each visible note has a declared credit value. Fractional credits are
      // a redemption voucher, without pretending to reproduce a real currency.
      let remaining = Math.round(amount * 100);
      const denoms = [10000, 5000, 2000, 1000, 500, 100];
      const declared = [];
      for (const cents of denoms) {
        while (remaining >= cents && declared.length < 19) { declared.push(cents / 100); remaining -= cents; }
      }
      if (remaining > 0) declared.push(remaining / 100);
      return declared;
    };
    const packet = (amount) => {
      const g = new THREE.Group(); g.name = 'cashier-note-packet'; g.userData.amount = amount;
      const declared = noteValues(amount);
      declared.forEach((value, i) => {
        const bill = note(value); bill.position.set((i % 3) * 0.001, i * 0.0011, (i % 2) * 0.0015); g.add(bill);
      });
      g.userData.noteValues = declared; root.add(g); owned.add(g); return g;
    };
    // Counted bundles on the work shelf give the teller an actual cash reserve.
    for (let i = 0; i < 4; i++) {
      const bundle = packet(1000); bundle.name = 'cashier-reserve-bundle';
      bundle.position.set(1.52 + i * 0.19, 1.575, -0.80);
      box('cashier-bundle-band', [0.032, 0.015, 0.070], [1.52 + i * 0.19, 1.58, -0.80],
        standard('#a69060', 0.9));
    }

    const counter = new THREE.Group(); counter.name = 'cashier-note-counter'; root.add(counter);
    counter.position.set(-0.38, 0.980, -0.095);
    box('cashier-counter-base', [0.34, 0.040, 0.31], [0, 0.020, 0], dark, counter);
    for (const x of [-0.15, 0.15]) box('cashier-counter-cheek', [0.037, 0.15, 0.21], [x, 0.089, -0.038], steel, counter);
    const hopper = box('cashier-counter-feed', [0.26, 0.012, 0.15], [0, 0.13, -0.07], dark, counter);
    hopper.rotation.x = 0.57;
    const output = box('cashier-counter-output', [0.26, 0.018, 0.13], [0, 0.037, 0.096], dark, counter);
    output.rotation.x = -0.10;
    const rollers = [];
    for (let i = 0; i < 2; i++) {
      const roller = mesh('cashier-counter-roller-' + i, new THREE.CylinderGeometry(0.020, 0.020, 0.245, 20),
        rubber, [0, 0.097 + i * 0.041, -0.005], counter);
      roller.rotation.z = Math.PI / 2; rollers.push(roller);
      for (const x of [-0.076, 0.076]) {
        const grip = mesh('cashier-roller-grip', new THREE.CylinderGeometry(0.023, 0.023, 0.026, 16),
          standard('#4c575b', 1), [x, roller.position.y, -0.005], counter);
        grip.rotation.z = Math.PI / 2;
      }
    }
    box('cashier-counter-display-housing', [0.17, 0.094, 0.016], [-0.38, 1.161, -0.085], dark);
    const counterDisplay = label('cashier-counter-display', '0', 'VERIFIED CREDITS', [0.155, 0.080], [-0.38, 1.161, -0.076], '#9cdfb2');
    const counterDisplayMaterial = counterDisplay.material;
    let feedNotes = [];
    const displayAmount = (amount) => {
      const tx = A.canvasTexture(512, 192, (ctx) => {
        ctx.fillStyle = '#142b27'; ctx.fillRect(0, 0, 512, 192);
        ctx.fillStyle = '#a6e8b4'; ctx.textAlign = 'center'; ctx.font = 'bold 87px monospace';
        ctx.fillText(amount.toLocaleString('en-US', { maximumFractionDigits: 2 }), 256, 107, 490);
        ctx.font = '24px sans-serif'; ctx.fillText('VERIFIED CREDITS', 256, 158);
      });
      counterDisplayMaterial.map?.dispose(); counterDisplayMaterial.map = tx; counterDisplayMaterial.needsUpdate = true;
    };

    const tray = new THREE.Group(); tray.name = 'cashier-service-tray'; root.add(tray);
    tray.position.set(0, 0.982, 0.06);
    box('cashier-tray-base', [0.38, 0.010, 0.22], [0, 0, 0], dark, tray);
    box('cashier-tray-insert', [0.35, 0.004, 0.19], [0, 0.007, 0], felt, tray);
    for (const x of [-0.184, 0.184]) box('cashier-tray-rim', [0.010, 0.021, 0.22], [x, 0.012, 0], brass, tray);
    for (const z of [-0.105, 0.105]) box('cashier-tray-rim', [0.38, 0.021, 0.010], [0, 0.012, z], brass, tray);

    const teller = A.makeDealer({ suit: '#18302e', shirt: '#eee7d8', seed: 'cashier-host-2026' });
    teller.name = 'cashier-attendant'; teller.position.set(0, 0, -0.42); root.add(teller);
    teller.userData.idle(app);
    const rig = teller.userData.rig;
    // Broad, neutral key on the face; warm practicals stay in the cabinetry.
    const key = new THREE.PointLight(0xfff1dc, 0.65, 4.6, 2); key.position.set(-0.65, 2.10, 1.30); root.add(key);
    const fill = new THREE.PointLight(0xe1efe8, 0.36, 4.0, 2); fill.position.set(1.30, 1.95, 0.95); root.add(fill);
    const vaultLight = new THREE.PointLight(0xffd9a1, 0.35, 3, 2); vaultLight.position.set(-1.6, 2.0, -0.55); root.add(vaultLight);
    box('cashier-work-light-panel', [1.18, 0.014, 0.12], [0, 2.441, 0.23],
      new THREE.MeshBasicMaterial({ color: '#fff0d4' }));
    const workTarget = new THREE.Object3D(); workTarget.position.set(0, 1.10, -0.10); root.add(workTarget);
    const workLight = new THREE.SpotLight(0xffecd3, 1.5, 3.2, 0.83, 0.55, 1.7);
    workLight.name = 'cashier-work-light'; workLight.position.set(0, 2.40, 0.22);
    workLight.target = workTarget; workLight.castShadow = false; root.add(workLight);
    if (standalone) {
      const ground = box('cashier-review-ground', [6.5, 0.04, 3.0], [0, -0.03, 0], standard('#303938', 0.98));
      ground.receiveShadow = true;
    }

    const motion = C.serviceMotion?.create(app, rig, root);
    let disposed = false, busy = false, generation = 0, status = 'Ready to assist';
    let presented = null;
    const direct = async (fn) => { fn(); return true; };
    const animate = (ms, onFrame) => motion ? motion.animate({ ms, onFrame }) : direct(() => onFrame(1));
    const move = (prop, target, side = 'R', ms = 900) => motion
      ? motion.pick(prop, { side, grip: [0, 0.018, 0], ms }).then((ok) =>
        ok === false ? false : motion.place({ side, target, ms }))
      : direct(() => prop.position.set(...target));
    const remove = (prop) => {
      if (!prop) return;
      prop.removeFromParent(); owned.delete(prop);
      const shared = new Set([paperEdge, ...noteTextures.values()]);
      const materials = new Set();
      prop.traverse((part) => {
        part.geometry?.dispose();
        for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
          if (material && !shared.has(material)) materials.add(material);
        }
      });
      for (const material of materials) { material.map?.dispose(); material.dispose(); }
    };
    const chips = (amount) => {
      const g = new THREE.Group(); g.name = 'cashier-counted-chips';
      const breakdown = C.layouts.chipBreakdown(amount);
      breakdown.forEach((value, i) => {
        const chip = C.chips.makeChip(value);
        chip.position.set((i % 3 - 1) * 0.075, Math.floor(i / 3) * 0.005 + 0.004, 0); g.add(chip);
      });
      g.userData.chipValues = breakdown; g.userData.amount = amount; root.add(g); owned.add(g); return g;
    };
    const countNotes = async (amount) => {
      feedNotes.forEach((bill) => { bill.removeFromParent(); bill.geometry.dispose(); });
      const declared = noteValues(amount);
      feedNotes = declared.map((value, i) => {
        const bill = note(value); bill.name = 'cashier-feeding-note-' + i;
        counter.add(bill); return bill;
      });
      let lastShown = -1;
      const result = await animate(2400, (t) => {
        const count = Math.floor(t * declared.length);
        if (count !== lastShown) {
          lastShown = count;
          displayAmount(Math.round(declared.slice(0, count).reduce((sum, value) => sum + value, 0) * 100) / 100);
        }
        rollers.forEach((roller) => { roller.rotation.x = -t * Math.PI * 34; });
        feedNotes.forEach((bill, i) => {
          const p = Math.max(0, Math.min(1, t * declared.length - i));
          bill.visible = true;
          // The nip at z=-.005 takes each sheet from a tilted hopper into
          // a flat output pile; the sheet never jumps between holders.
          const input = Math.min(1, p / 0.4), exit = Math.max(0, (p - 0.4) / 0.6);
          bill.position.set(0,
            p <= 0.4 ? 0.143 + i * 0.001 * (1 - input) - input * 0.0255 : 0.1175 - exit * 0.0685 + i * 0.001 * exit,
            p <= 0.4 ? -0.072 + input * 0.067 : -0.005 + exit * 0.107);
          bill.rotation.x = 0.57 * (1 - input);
        });
      });
      feedNotes.forEach((bill) => { bill.visible = false; });
      return result;
    };
    const demo = async (kind = 'buyIn', amount = 1000) => {
      if (disposed || busy || !['buyIn', 'cashOut'].includes(kind) || !Number.isFinite(amount) || amount <= 0) return false;
      amount = Math.round(amount * 100) / 100;
      if (amount <= 0) return false;
      busy = true;
      const run = ++generation;
      const active = () => !disposed && generation === run;
      const previous = tray.position.z;
      try {
        status = 'Preparing transaction';
        if (await animate(450, (t) => {
          tray.position.z = previous + (0.06 - previous) * t;
          if (presented) presented.position.z = tray.position.z;
        }) === false || !active()) return false;
        remove(presented); presented = null; receipt.scale.z = 0.03;
        if (kind === 'cashOut') {
          status = 'Checking and banking chips';
          const incoming = chips(amount); incoming.position.set(0.08, 0.996, 0.11);
          if (await move(incoming, [0.40, 1.055, 0.08], 'L', 800) === false || !active()) { remove(incoming); return false; }
          remove(incoming);
        } else {
          status = 'Loading the cash counter';
          const incoming = packet(amount); incoming.position.set(-0.10, 0.996, 0.10);
          if (await move(incoming, [-0.38, 1.127, -0.173], 'R', 850) === false || !active()) { remove(incoming); return false; }
          remove(incoming);
        }
        status = 'Counting notes';
        if (await countNotes(amount) === false || !active()) return false;
        const outgoing = kind === 'buyIn' ? chips(amount) : packet(amount);
        outgoing.position.set(kind === 'buyIn' ? 0.38 : -0.38, kind === 'buyIn' ? 1.060 : 1.036, kind === 'buyIn' ? 0.08 : 0.007);
        presented = outgoing;
        status = kind === 'buyIn' ? 'Counting chips into the tray' : 'Presenting counted cash';
        if (await move(outgoing, [0, 0.997, 0.06], kind === 'buyIn' ? 'L' : 'R', 950) === false || !active()) return false;
        tray.userData.kind = kind === 'buyIn' ? 'chips' : 'cash';
        tray.userData.amount = amount;
        tray.userData.chipValues = kind === 'buyIn' ? outgoing.userData.chipValues : [];
        tray.userData.noteValues = kind === 'cashOut' ? outgoing.userData.noteValues : [];
        if (await animate(750, (t) => {
          const eased = 1 - (1 - t) * (1 - t);
          tray.position.z = 0.06 + 0.30 * eased;
          outgoing.position.z = tray.position.z;
          receipt.scale.z = 0.03 + 0.97 * t;
        }) === false || !active()) return false;
        if (motion && await motion.rest() === false) return false;
        if (!active()) return false;
        status = `${kind === 'buyIn' ? 'Chips' : 'Cash'} ready · ${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} credits`;
        return true;
      } finally {
        if (generation === run) busy = false;
      }
    };
    root.userData.service = {
      rig, demo,
      get busy() { return busy; },
      get status() { return status; },
      get disposed() { return disposed; },
      dispose() {
        if (disposed) return;
        disposed = true; generation++; busy = false; status = 'Closed';
        motion?.cancel(); rig.stop('arms');
        feedNotes.forEach((bill) => { bill.visible = false; });
        for (const prop of owned) remove(prop);
        for (const material of noteTextures.values()) { material.map?.dispose(); material.dispose(); }
        noteTextures.clear();
      },
    };
    return root;
  };
})();
