import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

useGLTF.preload('/models/hourglass.glb');

// Target world height for the hourglass (matches the original lathe-frame
// footprint our sand math was sized around).
const TARGET_HEIGHT = 1.5;

export default function HourglassModel() {
  const { scene } = useGLTF('/models/hourglass.glb');
  const ref = useRef();

  // Auto-fit: measure the loaded scene's true bbox (after the artist's
  // internal transforms, NOT our gltf-spec values) and compute the
  // rotation + scale that puts the long axis vertical and the model
  // centred at world origin.
  const { rotationEuler, scale, position } = useMemo(() => {
    if (!scene) return { rotationEuler: [0, 0, 0], scale: 1, position: [0, 0, 0] };

    // Identify which axis is the "tall" one (the hourglass long axis).
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Pick rotation: the longest axis becomes Y.
    let rot = [0, 0, 0];
    let longAxis = 'y';
    if (size.x > size.y && size.x > size.z) longAxis = 'x';
    else if (size.z > size.y && size.z > size.x) longAxis = 'z';

    if (longAxis === 'z') rot = [-Math.PI / 2, 0, 0];      // Z-up → Y-up
    else if (longAxis === 'x') rot = [0, 0, Math.PI / 2];  // X-long → Y-long

    const tallSize = Math.max(size.x, size.y, size.z);
    const fit = TARGET_HEIGHT / tallSize;

    // After the rotation, the model centre needs to move to world (0, 0, 0).
    // The original centre will be transformed by the rotation; just compute
    // the post-rotation centre directly.
    const tempObj = new THREE.Object3D();
    tempObj.position.copy(center);
    tempObj.rotation.set(rot[0], rot[1], rot[2]);
    tempObj.parent = new THREE.Object3D(); // dummy parent
    tempObj.updateMatrixWorld(true);
    const newCenter = new THREE.Vector3().setFromMatrixPosition(tempObj.matrixWorld);

    return {
      rotationEuler: rot,
      scale: fit,
      position: [-newCenter.x * fit, -newCenter.y * fit, -newCenter.z * fit],
    };
  }, [scene]);

  // Walk the scene once and ensure all materials cast/receive shadows,
  // and apply some subtle PBR polish if the artist shipped flat materials.
  useEffect(() => {
    if (!scene) return;
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const m = obj.material;
      if (m && 'roughness' in m && (m.roughness == null || m.roughness < 0.3)) m.roughness = 0.55;
      if (m && 'metalness' in m && (m.metalness == null)) m.metalness = 0.2;
    });
  }, [scene]);

  return (
    <primitive
      ref={ref}
      object={scene}
      rotation={rotationEuler}
      scale={scale}
      position={position}
    />
  );
}
