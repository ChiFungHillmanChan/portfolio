import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, AdaptiveDpr, Sparkles, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
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

// Three-point studio rig packaged as Lightformers so the IBL
// (image-based lighting) reflects realistically on the wood and glass.
// Tuned for *real* not *fantasy*: neutral key, warm fill, cool rim.
function StudioLights() {
  return (
    <>
      {/* Key light: neutral white from upper-front, broad and bright */}
      <Lightformer form="rect" intensity={4} color="#ffffff" position={[2.5, 3, 2]} scale={[3, 3, 1]} target={[0, 0, 0]} />
      {/* Warm fill from the side at table level — picks up wood grain */}
      <Lightformer form="rect" intensity={1.5} color="#ffd9a8" position={[-3, -0.2, 0.5]} scale={[2, 1.2, 1]} target={[0, 0, 0]} />
      {/* Cool rim from behind-above for glass edge separation */}
      <Lightformer form="rect" intensity={2.5} color="#a8c0ff" position={[0, 1.6, -3]} scale={[2, 2, 1]} target={[0, 0, 0]} />
    </>
  );
}

export default function Scene({ progress = 0, running = false, flipState = 1, done = false, onFlip, lowPower = false }) {
  return (
    <Canvas
      shadows
      dpr={lowPower ? [1, 1.5] : [1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      camera={{ fov: 32, position: [1.6, 0.6, 2.4], near: 0.05, far: 40 }}
    >
      <color attach="background" args={['#0d0a08']} />
      {/* Soft fog → distant floor falls off naturally */}
      <fog attach="fog" args={['#0d0a08', 6, 14]} />
      <Suspense fallback={null}>
        <Environment resolution={256} background={false}>
          <StudioLights />
        </Environment>

        <ambientLight intensity={0.15} color="#a8b8d0" />

        {/* Strong neutral key light from upper-front for clear shadow + materials */}
        <directionalLight
          castShadow
          position={[2.4, 3, 2]}
          intensity={2.0}
          color="#ffffff"
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0005}
        />

        {/* Subtle warm rim from behind-low — gives the hourglass a halo
            without bleaching the scene */}
        <spotLight
          position={[0, 0.4, -2.5]}
          angle={0.7}
          penumbra={0.7}
          intensity={2.5}
          color="#ffaa66"
          distance={6}
          target-position={[0, 0, 0]}
        />

        <Table />
        <Hourglass progress={progress} running={running} flipState={flipState} onFlip={onFlip} />

        {/* Subtle dust — restraint, not glitter */}
        {!lowPower && (
          <Sparkles
            count={30}
            scale={[2.5, 2, 2.5]}
            position={[0, 0.3, 0]}
            size={2}
            speed={0.15}
            opacity={0.35}
            color="#ddc8a0"
          />
        )}
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
        autoRotate={!lowPower}
        autoRotateSpeed={0.3}
      />
      <AdaptiveDpr pixelated={false} />
      <AttentionZoom done={done} />
      <EffectComposer multisampling={4}>
        {/* Subtle bloom only on the brightest highlights of the rim light */}
        <Bloom intensity={lowPower ? 0.1 : 0.18} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur />
        <Vignette eskil={false} offset={0.5} darkness={lowPower ? 0.3 : 0.45} />
      </EffectComposer>
    </Canvas>
  );
}
