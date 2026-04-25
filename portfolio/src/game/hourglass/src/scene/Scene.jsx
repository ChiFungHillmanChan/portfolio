import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';
import Table from './Table.jsx';
import Hourglass from './Hourglass.jsx';

export default function Scene({ progress = 0, running = false, flipState = 1, onFlip }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      camera={{ fov: 35, position: [0.9, 0.15, 1.4], near: 0.05, far: 40 }}
    >
      <color attach="background" args={['#0a0807']} />
      <fog attach="fog" args={['#0a0807', 6, 12]} />
      <Suspense fallback={null}>
        <Environment preset="studio" background={false} />
        <ambientLight intensity={0.05} color="#88a8ff" />
        <directionalLight
          castShadow
          position={[2.4, 3, 2]}
          intensity={2.2}
          color="#ffd9a8"
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0005}
        />
        <Table />
        <Hourglass progress={progress} running={running} flipState={flipState} onFlip={onFlip} />
      </Suspense>
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={0.6}
        maxDistance={2.5}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.55}
        enablePan={false}
        target={[0, -0.05, 0]}
      />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
