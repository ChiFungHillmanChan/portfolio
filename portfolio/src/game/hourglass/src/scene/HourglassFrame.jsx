import { useMemo } from 'react';
import * as THREE from 'three';

const PLATE_PROFILE = [
  [0.0,  0.0],
  [0.65, 0.0],
  [0.66, 0.005],
  [0.66, 0.05],
  [0.65, 0.06],
  [0.0,  0.06],
];

// More elaborate baroque-style spindle: alternating beads, rings, and bulges
// to read as ornate carved metal/wood instead of a simple turned dowel.
const SPINDLE_PROFILE = [
  [0.00, 0.00],
  [0.06, 0.00],
  [0.07, 0.01],
  [0.08, 0.025],
  [0.07, 0.035],
  [0.05, 0.05],
  [0.045, 0.08],
  [0.05, 0.11],   // small bead
  [0.06, 0.13],
  [0.05, 0.15],
  [0.04, 0.20],
  [0.05, 0.24],
  [0.07, 0.28],   // bulge 1
  [0.05, 0.32],
  [0.04, 0.40],
  [0.05, 0.46],
  [0.045, 0.50],
  [0.06, 0.54],   // mid bead
  [0.045, 0.58],
  [0.05, 0.62],
  [0.04, 0.70],
  [0.05, 0.74],
  [0.07, 0.78],   // bulge 2
  [0.05, 0.82],
  [0.04, 0.88],
  [0.05, 0.92],
  [0.06, 0.95],
  [0.07, 0.965],
  [0.08, 0.975],
  [0.07, 0.99],
  [0.06, 1.00],
  [0.00, 1.00],
];

function profileToVec2(arr) {
  return arr.map(([r, y]) => new THREE.Vector2(r, y));
}

export default function HourglassFrame() {
  const plateGeom = useMemo(() => new THREE.LatheGeometry(profileToVec2(PLATE_PROFILE), 64), []);
  const spindleGeom = useMemo(() => {
    const g = new THREE.LatheGeometry(profileToVec2(SPINDLE_PROFILE), 32);
    g.scale(1, 1.3, 1);
    return g;
  }, []);

  // Aged dark bronze — slightly metallic so the warm rim light catches the
  // edges of the carved profile and reads as ornate metal in the cathedral light.
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a1a0e',
    roughness: 0.45,
    metalness: 0.55,
  }), []);

  const spindleAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  const SPINDLE_OFFSET = 0.62;
  const SPINDLE_BOTTOM_Y = -0.65;

  return (
    <group>
      <mesh castShadow receiveShadow geometry={plateGeom} material={woodMat} position={[0, -0.7, 0]} />
      <mesh castShadow receiveShadow geometry={plateGeom} material={woodMat} position={[0, 0.65, 0]} rotation={[Math.PI, 0, 0]} />
      {spindleAngles.map((a, i) => (
        <mesh
          key={i}
          castShadow
          geometry={spindleGeom}
          material={woodMat}
          position={[Math.cos(a) * SPINDLE_OFFSET, SPINDLE_BOTTOM_Y, Math.sin(a) * SPINDLE_OFFSET]}
        />
      ))}
    </group>
  );
}
