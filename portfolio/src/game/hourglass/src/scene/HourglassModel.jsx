import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

useGLTF.preload('/models/hourglass.glb');

// The downloaded model is authored in Blender's Z-up coordinate system at
// roughly 84 units tall. We rotate -90° on X to stand it up in three.js's
// Y-up convention, then uniformly scale so it occupies ~1.5 world units of
// height (matching the original lathe-frame footprint that our sand math
// was designed around).
//
// SCALE was found by trial: model bbox max y ≈ 41.9 and min y ≈ -41.9 after
// rotation, giving total height 83.8. We want height ~1.5 → scale ~0.018.
const SCALE = 0.018;
const Y_OFFSET = 0;  // tweak if model's pivot isn't at its centre

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
