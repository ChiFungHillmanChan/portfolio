import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

useGLTF.preload('/models/hourglass.glb');

// The downloaded model is Z-up Blender, bbox z = 9.37 → 41.92 (height 32.55,
// pivot off-centre). We:
//   1. Rotate -90° on X so model Z → world Y (stands up in three.js Y-up).
//   2. Scale 0.046 → world height ≈ 1.5 (matches our sand math that
//      was sized around ~1.5 units).
//   3. Y_OFFSET shifts the model so its centre is at world y=0 (so our
//      sand sub-group, which is also centred at y=0, sits inside the bulbs).
// After scale: model centre y ≈ (9.37 + 41.92) / 2 × 0.046 ≈ 1.18
// So Y_OFFSET = -1.18 puts the centre at origin, bottom at y ≈ -0.74
// (very close to our table at y = -0.7).
const SCALE = 0.046;
const Y_OFFSET = -1.18;

export default function HourglassModel() {
  const { scene } = useGLTF('/models/hourglass.glb');
  const ref = useRef();

  // Walk the scene once and ensure all materials cast/receive shadows
  // and apply some material polish (the artist's defaults can be flat).
  useEffect(() => {
    if (!scene) return;
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      // Bump roughness/metalness toward "aged metal/wood" if the artist
      // shipped a generic standard material.
      const m = obj.material;
      if (m && 'roughness' in m && m.roughness == null) m.roughness = 0.6;
      if (m && 'metalness' in m && m.metalness == null) m.metalness = 0.3;
    });
  }, [scene]);

  return (
    <primitive
      ref={ref}
      object={scene}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={SCALE}
      position={[0, Y_OFFSET, 0]}
    />
  );
}
