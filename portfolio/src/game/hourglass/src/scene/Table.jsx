import { ContactShadows, MeshReflectorMaterial } from '@react-three/drei';

// Wet polished stone floor — large enough to fade into the fog at the edges,
// reflective enough to pick up the glowing sand and rim light without dominating.
export default function Table() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
        <planeGeometry args={[30, 30]} />
        <MeshReflectorMaterial
          color="#0e0a08"
          roughness={0.6}
          metalness={0.2}
          mirror={0.55}
          mixBlur={3.5}
          mixStrength={1.4}
          blur={[400, 100]}
          resolution={1024}
          depthScale={0.6}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
        />
      </mesh>
      <ContactShadows position={[0, -0.69, 0]} opacity={0.7} scale={6} blur={2.4} far={2.5} />
    </group>
  );
}
