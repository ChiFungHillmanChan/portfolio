(() => {
  const C = (globalThis.CASINO ??= {});
  // World axes: +X east (deeper into the floor), +Z south. The vestibule sits
  // WEST of the main floor; the turnstile passage joins them. Walk rects
  // OVERLAP at every seam by more than 2× the player radius so the collision
  // circle always fits fully inside at least one rect while crossing.
  C.floorplan = {
    EYE: 1.6,
    WALK_RECTS: [
      { id: 'vestibule', x0: -27.4, x1: -16.0, z0: -5.4, z1: 5.4 },
      { id: 'gate',      x0: -16.9, x1: -13.5, z0: -0.8, z1: 0.8 },   // turnstile passage (closed until ID check)
      { id: 'floor',     x0: -14.6, x1: 17.4,  z0: -10.4, z1: 10.4 },
    ],
    GATE_X: -16.2,          // turnstile line (visual + blocked-push detection)
    ZONES: [
      { id: 'vestibule', x0: -28,   x1: -14.6, z0: -6,    z1: 6 },
      { id: 'roulette',  x0: -14.6, x1: 1.8,   z0: -10.5, z1: -3.4 },
      { id: 'blackjack', x0: 1.8,   x1: 18,    z0: -10.5, z1: -3.4 },
      { id: 'baccarat',  x0: -14.6, x1: 1.8,   z0: 3.4,   z1: 10.5 },
      { id: 'uth',       x0: 1.8,   x1: 18,    z0: 3.4,   z1: 10.5 },
      { id: 'aisle',     x0: -14.6, x1: 18,    z0: -3.4,  z1: 3.4 },
    ],
    SPAWN: { pos: [-25.5, 1.6, 0], look: [-16, 1.5, 0] },
    ANCHOR_POSES: {
      spawn:     { pos: [-25.5, 1.6, 0],    look: [-16, 1.5, 0] },
      reception: { pos: [-21.1, 1.6, -0.1], look: [-19.0, 1.2, -1.45] },
      floor:     { pos: [-11.5, 1.6, 0],    look: [4, 1.3, 0] },
      practice:  { pos: [-24.2, 1.6, -3.0], look: [-25.8, 1.3, -4.9] },
      cashier:   { pos: [2.6, 1.6, 6.6],    look: [2.6, 1.5, 10] },
      roulette:  { pos: [-6.5, 1.6, -2.8],  look: [-6.5, 1.0, -6.5] },
      blackjack: { pos: [10, 1.6, -2.8],    look: [10, 1.0, -6.5] },
      baccarat:  { pos: [-6.5, 1.6, 2.8],   look: [-6.5, 1.0, 6.5] },
      uth:       { pos: [7, 1.6, 2.8],      look: [7, 1.0, 6.5] },
    },
  };

  const anchors = [], obstacles = [];
  C.world = {
    anchors, obstacles,
    gateOpen: false,
    addAnchor: (a) => anchors.push(a),
    addObstacle: (o) => obstacles.push(o),
    anchorById: (id) => anchors.find((a) => a.id === id),
  };
})();
