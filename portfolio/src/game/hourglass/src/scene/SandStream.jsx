import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NECK_RADIUS, BULB_HEIGHT } from '../lib/sandProfile.js';

// Tight column of grains. Fewer than before since they don't need to fan out;
// they just need to be a visible thin vertical line.
const STREAM_COUNT = 1200;
const STREAM_TOP = NECK_RADIUS * 0.9;
const STREAM_BOTTOM = -BULB_HEIGHT * 0.7;
const STREAM_LENGTH = STREAM_TOP - STREAM_BOTTOM;

export default function SandStream({ progress = 0, running = false }) {
  const ref = useRef();
  const visible = running && progress > 0 && progress < 1;

  const { positions, phases } = useMemo(() => {
    const positions = new Float32Array(STREAM_COUNT * 3);
    const phases = new Float32Array(STREAM_COUNT);
    for (let i = 0; i < STREAM_COUNT; i++) {
      phases[i] = Math.random();
      const jitter = (Math.random() - 0.5) * NECK_RADIUS * 0.4;
      positions[i * 3] = jitter;
      positions[i * 3 + 1] = STREAM_TOP - phases[i] * STREAM_LENGTH;
      positions[i * 3 + 2] = (Math.random() - 0.5) * NECK_RADIUS * 0.4;
    }
    return { positions, phases };
  }, []);

  useFrame((state) => {
    if (!ref.current || !visible) return;
    const time = state.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array;
    // Real hourglass: sand falls in a tight thin column, almost a vertical
    // line. The stream stays a constant narrow cylinder all the way down;
    // the *pile* at the bottom is what spreads out (handled by SandBulk).
    const STREAM_WIDTH = NECK_RADIUS * 0.35;
    for (let i = 0; i < STREAM_COUNT; i++) {
      // Gravity acceleration: each grain's phase grows non-linearly so it
      // speeds up as it falls — visually reads as falling, not drifting.
      const linear = (phases[i] + time * 0.6) % 1;
      const phase = linear * linear;
      const y = STREAM_TOP - phase * STREAM_LENGTH;
      // Each grain has a stable position within the column — pseudo-random
      // by index, not by time, so individual grains stay in their lane and
      // the column reads as a coherent line, not a swirl.
      const angle = (i * 0.8132) % (Math.PI * 2);
      const radius = STREAM_WIDTH * Math.sqrt((i * 0.4567) % 1);
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} visible={visible} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={STREAM_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#f5d99a"
        size={0.014}
        sizeAttenuation
        transparent
        opacity={0.95}
        depthWrite={false}
      />
    </points>
  );
}
