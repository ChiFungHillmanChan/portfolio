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

const SPINDLE_PROFILE = [
  [0.00, 0.00],
  [0.04, 0.00],
  [0.05, 0.02],
  [0.07, 0.05],
  [0.05, 0.10],
  [0.04, 0.20],
  [0.06, 0.28],
  [0.05, 0.36],
  [0.04, 0.50],
  [0.06, 0.58],
  [0.05, 0.66],
  [0.04, 0.80],
  [0.05, 0.90],
  [0.07, 0.95],
  [0.05, 0.98],
  [0.04, 1.00],
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

  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3a2418',
    roughness: 0.7,
    metalness: 0,
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
