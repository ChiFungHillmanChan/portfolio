import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { easeInOutCubic } from '../lib/easing.js';
import HourglassFrame from './HourglassFrame.jsx';
import GlassBulbs from './GlassBulbs.jsx';
import SandBulk from './SandBulk.jsx';
import SandStream from './SandStream.jsx';

const FLIP_DURATION_MS = 800;

export default function Hourglass({ progress, running, flipState, onFlip }) {
  const groupRef = useRef();
  const flipStartRef = useRef(null);
  const fromRef = useRef(0);
  const toRef = useRef(0);

  useEffect(() => {
    const target = flipState === 1 ? 0 : Math.PI;
    fromRef.current = groupRef.current ? groupRef.current.rotation.z : 0;
    toRef.current = target;
    flipStartRef.current = performance.now();
  }, [flipState]);

  useFrame(() => {
    if (!groupRef.current || flipStartRef.current === null) return;
    const t = (performance.now() - flipStartRef.current) / FLIP_DURATION_MS;
    if (t >= 1) {
      groupRef.current.rotation.z = toRef.current;
      flipStartRef.current = null;
      return;
    }
    groupRef.current.rotation.z =
      fromRef.current + (toRef.current - fromRef.current) * easeInOutCubic(t);
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onFlip?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <HourglassFrame />
      <GlassBulbs />
      {/* Sand sub-group is counter-rotated so the sand ALWAYS visually drains
          downward. The wood + glass rotate with the parent (visually
          symmetric, reads as a real flip), but gravity stays gravity. */}
      <group rotation-z={flipState === 1 ? 0 : -Math.PI}>
        <SandBulk progress={progress} />
        <SandStream progress={progress} running={running} />
      </group>
    </group>
  );
}
