import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { topProfile, bottomProfile, volumeOfRevolution } from '../lib/sandProfile.js';

// Threshold for hiding degenerate (collapsed) profiles. Set very low so the
// bottom pile becomes visible almost immediately after the timer starts —
// otherwise the user can't tell anything is happening for the first second.
const VOLUME_EPSILON = 5e-6;

function profilePointsToVec2(pts) {
  return pts.map(([r, y]) => new THREE.Vector2(r, y));
}

export default function SandBulk({ progress = 0 }) {
  const topRef = useRef();
  const botRef = useRef();
  const lastProgressRef = useRef(-1);

  // Real sand: warm tan/beige, fully matte, NO emissive. Lit by the warm
  // rim light so it picks up the cathedral atmosphere honestly instead of
  // looking like a glowing magic blob.
  const sandMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#d9b37a',
    roughness: 1,
    metalness: 0,
    flatShading: false,
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
