import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { topProfile, bottomProfile, volumeOfRevolution } from '../lib/sandProfile.js';

const VOLUME_EPSILON = 1e-4;  // skip rendering when volume is essentially zero

function profilePointsToVec2(pts) {
  return pts.map(([r, y]) => new THREE.Vector2(r, y));
}

export default function SandBulk({ progress = 0 }) {
  const topRef = useRef();
  const botRef = useRef();
  const lastProgressRef = useRef(-1);

  // Glowing amber sand — emissive so it self-illuminates through the glass
  // and triggers bloom even at high luminance threshold. Matches the
  // cathedral-fantasy reference (lit-from-within hourglass).
  const sandMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#c97f2a',
    emissive: '#ff8a1a',
    emissiveIntensity: 1.4,
    roughness: 0.55,
    metalness: 0.1,
  }), []);

  // Initial geometries — replaced each frame.
  const topGeom = useMemo(() => new THREE.LatheGeometry(profilePointsToVec2(topProfile(0)), 32), []);
  const botGeom = useMemo(() => new THREE.LatheGeometry(profilePointsToVec2(bottomProfile(0)), 32), []);

  useFrame(() => {
    if (Math.abs(progress - lastProgressRef.current) < 0.001) return;
    lastProgressRef.current = progress;

    const topPts = topProfile(progress);
    const botPts = bottomProfile(progress);

    // Per sandProfile boundary contract: degenerate near-zero-volume profiles
    // produce zero-thickness lathes. Hide them rather than rendering.
    const topVol = volumeOfRevolution(topPts);
    const botVol = volumeOfRevolution(botPts);

    if (topRef.current) {
      topRef.current.visible = topVol > VOLUME_EPSILON;
      if (topRef.current.visible) {
        topRef.current.geometry.dispose();
        topRef.current.geometry = new THREE.LatheGeometry(profilePointsToVec2(topPts), 32);
      }
    }
    if (botRef.current) {
      botRef.current.visible = botVol > VOLUME_EPSILON;
      if (botRef.current.visible) {
        botRef.current.geometry.dispose();
        botRef.current.geometry = new THREE.LatheGeometry(profilePointsToVec2(botPts), 32);
      }
    }
  });

  return (
    <group>
      <mesh ref={topRef} geometry={topGeom} material={sandMat} castShadow={false} />
      <mesh ref={botRef} geometry={botGeom} material={sandMat} castShadow={false} />
    </group>
  );
}
