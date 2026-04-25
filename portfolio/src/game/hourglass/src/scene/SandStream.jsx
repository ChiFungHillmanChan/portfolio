import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NECK_RADIUS, BULB_HEIGHT } from '../lib/sandProfile.js';

const STREAM_COUNT = 2000;
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
      const phase = (phases[i] + time * 0.45) % 1;
      const y = STREAM_TOP - phase * STREAM_LENGTH;
      const widthAtY = NECK_RADIUS * (0.25 + 0.6 * (1 - (y - STREAM_BOTTOM) / STREAM_LENGTH));
      const angle = phase * 13.7 + i * 0.001;
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
        color="#f4ecd0"
        size={0.012}
        sizeAttenuation
        transparent
        opacity={0.95}
        depthWrite={false}
      />
    </points>
  );
}
