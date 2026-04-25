import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { BULB_RADIUS, BULB_HEIGHT, NECK_RADIUS } from '../lib/sandProfile.js';

const SEGMENTS = 64;
function buildBulbProfile() {
  const pts = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const y = -BULB_HEIGHT + t * BULB_HEIGHT;
    const bulb = Math.sin((1 - t) * Math.PI * 0.5);
    const r = NECK_RADIUS + (BULB_RADIUS - NECK_RADIUS) * bulb;
    pts.push(new THREE.Vector2(r, y));
  }
  for (let i = 1; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const y = t * BULB_HEIGHT;
    const bulb = Math.sin(t * Math.PI * 0.5);
    const r = NECK_RADIUS + (BULB_RADIUS - NECK_RADIUS) * bulb;
    pts.push(new THREE.Vector2(r, y));
  }
  return pts;
}

export default function GlassBulbs() {
  const geom = useMemo(() => new THREE.LatheGeometry(buildBulbProfile(), 64), []);
  return (
    <mesh geometry={geom} castShadow={false} receiveShadow={false}>
      <MeshTransmissionMaterial
        transmission={1}
        thickness={0.3}
        roughness={0.05}
        ior={1.5}
        chromaticAberration={0.02}
        anisotropy={0.1}
        distortion={0.1}
        distortionScale={0.3}
        temporalDistortion={0.1}
        backside
        backsideThickness={0.2}
        attenuationDistance={1.5}
        attenuationColor="#f7f0e1"
      />
    </mesh>
  );
}
