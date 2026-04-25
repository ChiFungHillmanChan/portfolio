import { ContactShadows } from '@react-three/drei';

export default function Table() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial color="#5a3e22" roughness={0.55} metalness={0} />
      </mesh>
      <ContactShadows position={[0, -0.69, 0]} opacity={0.55} scale={6} blur={2.4} far={2.5} />
    </group>
  );
}
