(() => {
  const C = (globalThis.CASINO ??= {});
  // The engine ↔ platform handshake. platform.js (a real ES module, NOT
  // inlined — it imports the shared wallet/auth modules) builds the floor
  // model and calls C.boot.start once the player hits ENTER.
  C.boot = {
    start({ model, ui }) {
      C.app.init({ ui });
      if (!C.app.renderer) return null; // WebGL failed → app is redirecting to the 2D lobby
      C.floor.buildAll(model);
      C.app.spawn();
      // Debug camera: ?cam=x,z,yaw[,pitch] — screenshot poses for visual QA.
      const cam = new URLSearchParams(location.search).get('cam');
      if (cam) {
        const [x, z, yaw, pitch = 0] = cam.split(',').map(Number);
        Object.assign(C.app.player, { x, z, yaw, pitch });
      }
      return C.stage;
    },
  };
  C.floor = C.floor || {};
  C.stage = C.stage || {};
  // Glide the camera to a named pose (quick-nav, reception flows) or to a
  // registered anchor's approach (tables, cashier, practice).
  C.stage.goTo = (id) => {
    const pose = C.floorplan.ANCHOR_POSES[id];
    if (pose) return C.app.glideTo(pose.pos, pose.look, 1200);
    const a = C.world.anchorById(id);
    return a ? C.app.goToAnchor(a) : Promise.resolve();
  };
})();
