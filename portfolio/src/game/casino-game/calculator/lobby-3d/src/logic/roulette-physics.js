(() => {
  const C = (globalThis.CASINO ??= {});
  const TAU = Math.PI * 2;
  const STEP = TAU / 37;
  const EU_WHEEL = Object.freeze([0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]);
  // Metres above the wheel mount. Geometry and contact share these values.
  const GEOMETRY = Object.freeze({
    ballRadius: 0.0125,
    trackRadius: 0.663,
    trackFloor: 0.231,
    apronInner: 0.535,
    apronOuter: 0.648,
    numberOuter: 0.535,
    numberInner: 0.445,
    numberFloor: 0.154,
    pocketInner: 0.337,
    pocketOuter: 0.445,
    pocketRadius: 0.399,
    pocketFloor: 0.126,
    separatorHeight: 0.026,
    deflectorRadius: 0.589,
    deflectorCount: 8,
  });
  const G = GEOMETRY;
  const DT = 1 / 240;
  const GRAVITY = 9.81;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const smooth = (n) => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
  const angularDistance = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  function surfaceHeight(radius) {
    if (radius >= G.apronOuter) return G.trackFloor;
    if (radius >= G.apronInner) {
      return G.numberFloor + (radius - G.apronInner)
        * (G.trackFloor - G.numberFloor) / (G.apronOuter - G.apronInner);
    }
    return radius >= G.pocketOuter ? G.numberFloor : G.pocketFloor;
  }

  function interpolate(samples, time) {
    const i = Math.min(samples.length - 2, Math.floor(Math.max(0, time) / DT));
    const a = samples[i], b = samples[i + 1];
    const mix = clamp((time - a.time) / (b.time - a.time), 0, 1);
    const out = {};
    for (const key of ['radius', 'angle', 'velocity', 'radialVelocity', 'y', 'verticalVelocity']) {
      out[key] = a[key] + (b[key] - a[key]) * mix;
    }
    return out;
  }

  // This is an outcome-conditioned PRESENTATION model, never an RNG or
  // settlement engine. The authoritative game supplies `pocket`. We solve
  // the rotor's initial impulse before launch, then use independent drag,
  // gravity on the apron and a damped pocket capture. No last-frame retarget
  // or reparent is needed. Absolute-time sampling is frame-rate independent.
  function createSpin({ pocket, wheelAngle = 0, launchAngle = 0, seed = 1 } = {}) {
    const index = EU_WHEEL.indexOf(pocket);
    if (index < 0) throw new RangeError('Roulette pocket must be an integer from 0 to 36');
    const variation = ((seed >>> 0) % 997) / 997;
    const initialBallSpeed = 17.8 + variation * 1.2;
    const ballDrag = 0.39 + variation * 0.025;
    const releaseSpeed = 2.65;
    const dropAt = Math.log(initialBallSpeed / releaseSpeed) / ballDrag;
    const trackAngle = (time) => launchAngle + initialBallSpeed * -Math.expm1(-ballDrag * time) / ballDrag;
    const wheelDrag = 0.16;
    const wheelIntegral = (time) => -Math.expm1(-wheelDrag * time) / wheelDrag;
    const incline = Math.atan((G.trackFloor - G.numberFloor) / (G.apronOuter - G.apronInner));

    let flight = {
      time: 0, radius: G.trackRadius, angle: trackAngle(dropAt), velocity: releaseSpeed,
      radialVelocity: -0.008, y: G.trackFloor + G.ballRadius, verticalVelocity: 0,
    };
    const descent = [{ ...flight }];
    const impacts = [];
    // Only the short free descent needs integration; the fast track motion
    // uses its exact drag solution. Fixed substeps prevent slow frames from
    // tunnelling through the apron or missing a deflector.
    for (let step = 1; step < 600 && flight.radius > G.pocketRadius; step++) {
      const previous = flight;
      flight = { ...previous, time: step * DT };
      flight.velocity *= Math.exp(-0.7 * DT);
      const acceleration = flight.radius > G.apronInner
        ? flight.radius * flight.velocity ** 2 - GRAVITY * Math.sin(incline)
        : -flight.radialVelocity * 1.5;
      flight.radialVelocity += acceleration * DT;
      flight.radius = Math.min(G.trackRadius, flight.radius + flight.radialVelocity * DT);
      flight.angle += flight.velocity * DT;
      if (previous.radius > G.deflectorRadius && flight.radius <= G.deflectorRadius) {
        const spacing = TAU / G.deflectorCount;
        const nearest = Math.round(flight.angle / spacing) * spacing;
        if (Math.abs(angularDistance(flight.angle, nearest)) < 0.065) {
          flight.velocity *= 0.56;
          flight.radialVelocity *= 0.76;
          flight.verticalVelocity = 0.38;
          impacts.push({ time: dropAt + flight.time, type: 'deflector', angle: nearest });
        }
      }
      // The outer pocket lip gives a visible small hop as the ball passes
      // from the number band into the recessed pocket assembly.
      if (previous.radius >= G.pocketOuter && flight.radius < G.pocketOuter) {
        flight.verticalVelocity = Math.max(flight.verticalVelocity, 1.45);
        impacts.push({ time: dropAt + flight.time, type: 'pocket-rim' });
      }
      flight.verticalVelocity -= GRAVITY * DT;
      flight.y += flight.verticalVelocity * DT;
      const floor = surfaceHeight(flight.radius) + G.ballRadius;
      if (flight.y < floor) {
        flight.y = floor;
        flight.verticalVelocity = Math.abs(flight.verticalVelocity) > 0.22
          ? -flight.verticalVelocity * 0.24 : 0;
      }
      if (flight.radius < G.pocketRadius) {
        const f = (previous.radius - G.pocketRadius) / (previous.radius - flight.radius);
        for (const key of ['time', 'angle', 'y', 'velocity', 'verticalVelocity', 'radialVelocity']) {
          flight[key] = previous[key] + (flight[key] - previous[key]) * f;
        }
        flight.radius = G.pocketRadius;
      }
      descent.push({ ...flight });
    }
    const captureAt = dropAt + flight.time;
    const localEntry = -2 * STEP;
    const targetRotation = index * STEP + localEntry - flight.angle;
    const nominalSpeed = 2.45 + variation * 0.15;
    const turns = Math.round((wheelAngle + nominalSpeed * wheelIntegral(captureAt) - targetRotation) / TAU);
    const initialWheelSpeed = (targetRotation + turns * TAU - wheelAngle) / wheelIntegral(captureAt);
    const wheelAt = (time) => wheelAngle + initialWheelSpeed * wheelIntegral(time);
    const wheelSpeedAt = (time) => initialWheelSpeed * Math.exp(-wheelDrag * time);
    const captureVelocity = flight.velocity + wheelSpeedAt(captureAt);
    const captureDuration = 1.6;
    const duration = captureAt + captureDuration;
    const bounces = [{ ...flight, time: 0 }];
    let height = flight.y, vertical = flight.verticalVelocity;
    for (let step = 1; step <= Math.ceil(captureDuration / DT) + 1; step++) {
      vertical -= GRAVITY * DT;
      height += vertical * DT;
      const floor = G.pocketFloor + G.ballRadius;
      if (height < floor) {
        height = floor;
        if (Math.abs(vertical) > 0.11) {
          impacts.push({ time: captureAt + step * DT, type: 'pocket' });
          vertical = -vertical * 0.38;
        } else vertical = 0;
      }
      bounces.push({ ...flight, time: step * DT, y: height, verticalVelocity: vertical });
    }

    const oscillate = (position, velocity, time, damping, frequency) => Math.exp(-damping * time)
      * (position * Math.cos(frequency * time) + (velocity + damping * position) / frequency * Math.sin(frequency * time));

    function sample(seconds) {
      const time = Math.max(0, seconds);
      const rotation = wheelAt(time);
      let radius, angle, y, velocity, phase;
      if (time < dropAt) {
        radius = G.trackRadius;
        angle = trackAngle(time);
        y = G.trackFloor + G.ballRadius;
        velocity = initialBallSpeed * Math.exp(-ballDrag * time);
        phase = 'track';
      } else if (time < captureAt) {
        const state = interpolate(descent, time - dropAt);
        ({ radius, angle, y, velocity } = state);
        y = Math.max(y, surfaceHeight(radius) + G.ballRadius);
        phase = 'descent';
      } else if (time < duration) {
        const elapsed = time - captureAt;
        const taper = 1 - smooth((elapsed - 1) / 0.6);
        // Critical damping arrests the fast relative motion after the last
        // divider instead of swinging back through a solid neighbouring wall.
        const arrest = 14;
        const arrestSlope = captureVelocity + arrest * localEntry;
        const decay = Math.exp(-arrest * elapsed);
        const offset = (localEntry + arrestSlope * elapsed) * decay;
        const localOffset = offset * taper;
        // Preserve the unwrapped angle through capture, including on spins
        // whose chosen pocket crosses the zero/36 angle seam.
        angle = flight.angle - (rotation - wheelAt(captureAt)) + localOffset - localEntry;
        radius = G.pocketRadius + oscillate(0, flight.radialVelocity, elapsed, 8, 17) * taper;
        y = G.pocketFloor + G.ballRadius + (interpolate(bounces, elapsed).y - G.pocketFloor - G.ballRadius) * taper;
        const taperTime = clamp((elapsed - 1) / 0.6, 0, 1);
        const taperVelocity = -6 * taperTime * (1 - taperTime) / 0.6;
        velocity = (arrestSlope - arrest * (localEntry + arrestSlope * elapsed)) * decay * taper
          + offset * taperVelocity - wheelSpeedAt(time);
        phase = 'capture';
      } else {
        radius = G.pocketRadius;
        angle = flight.angle - (rotation - wheelAt(captureAt)) - localEntry;
        y = G.pocketFloor + G.ballRadius;
        velocity = -wheelSpeedAt(time);
        phase = 'settled';
      }
      return {
        phase, wheelAngle: rotation, wheelVelocity: wheelSpeedAt(time),
        ballAngle: angle, ballVelocity: velocity, radius, y,
        x: Math.cos(angle) * radius, z: Math.sin(angle) * radius,
      };
    }
    return { sample, duration, dropAt, captureAt, impacts, pocket, initialWheelSpeed };
  }

  C.roulettePhysics = { EU_WHEEL, STEP, GEOMETRY, surfaceHeight, createSpin };
})();
