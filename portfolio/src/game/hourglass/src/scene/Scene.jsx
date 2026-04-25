import { Canvas } from '@react-three/fiber';
import { useThree, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Table from './Table.jsx';
import Hourglass from './Hourglass.jsx';
import { easeInOutCubic } from '../lib/easing.js';

function AttentionZoom({ done }) {
  const { camera } = useThree();
  const startRef = useRef(null);
  const fromRef = useRef(0);
  const toRef = useRef(0);

  useEffect(() => {
    if (!done) return;
    fromRef.current = camera.position.length();
    toRef.current = fromRef.current * 0.95;
    startRef.current = performance.now();
  }, [done, camera]);

  useFrame(() => {
    if (startRef.current === null) return;
    const t = (performance.now() - startRef.current) / 1500;
    if (t >= 1) {
      const dir = camera.position.clone().normalize();
      camera.position.copy(dir.multiplyScalar(toRef.current));
      startRef.current = null;
      return;
    }
    const targetLen = fromRef.current + (toRef.current - fromRef.current) * easeInOutCubic(t);
    const dir = camera.position.clone().normalize();
    camera.position.copy(dir.multiplyScalar(targetLen));
  });

  return null;
}

export default function Scene({ progress = 0, running = false, flipState = 1, done = false, onFlip }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      camera={{ fov: 32, position: [1.6, 0.6, 2.4], near: 0.05, far: 40 }}
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
        minDistance={1.2}
        maxDistance={4.5}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.55}
        enablePan={false}
        target={[0, 0, 0]}
      />
      <AdaptiveDpr pixelated={false} />
      <AttentionZoom done={done} />
    </Canvas>
  );
}
