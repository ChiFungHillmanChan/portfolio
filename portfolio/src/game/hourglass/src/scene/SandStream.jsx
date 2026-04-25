import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NECK_RADIUS, BULB_HEIGHT } from '../lib/sandProfile.js';

// More particles + bigger size + brighter color so the falling stream is
// unambiguously visible against the dark scene. Previously you couldn't tell
// the timer had started.
const STREAM_COUNT = 4000;
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
    for (let i = 0; i < STREAM_COUNT; i++) {
      // Gravity-like accel: phase grows non-linearly so particles speed up as
      // they fall — looks like real granular flow rather than uniform drift.
      const linear = (phases[i] + time * 0.55) % 1;
      const phase = linear * linear;
      const y = STREAM_TOP - phase * STREAM_LENGTH;
      // Tighter at the neck, slightly fanning out at the bottom on impact
      const widthAtY = NECK_RADIUS * (0.18 + 0.55 * (1 - (y - STREAM_BOTTOM) / STREAM_LENGTH));
      const angle = phases[i] * 137.5 + i * 0.001;
      arr[i * 3] = Math.cos(angle * 6) * widthAtY * 0.5;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = Math.sin(angle * 6) * widthAtY * 0.5;
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
        color="#fff4d6"
        size={0.022}
        sizeAttenuation
        transparent
        opacity={1}
        depthWrite={false}
      />
    </points>
  );
}
