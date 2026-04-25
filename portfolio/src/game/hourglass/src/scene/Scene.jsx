import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, AdaptiveDpr, Sparkles, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing';
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

// Cathedral-style ambient: a few warm Lightformer rectangles around the
// hourglass simulating distant torches/candles, plus a strong cool fill from
// behind to silhouette the glass against the gloom.
function CathedralLights() {
  return (
    <>
      {/* Warm rim from behind-left (the "cathedral arch with torch" vibe) */}
      <Lightformer form="rect" intensity={6} color="#ffb060" position={[-2.5, 1.5, -3]} scale={[3, 4, 1]} target={[0, 0, 0]} />
      {/* Warm rim from behind-right */}
      <Lightformer form="rect" intensity={5} color="#ff8a30" position={[2.8, 1.2, -3]} scale={[2.5, 4, 1]} target={[0, 0, 0]} />
      {/* Cool fill from front-far to keep glass edges visible */}
      <Lightformer form="rect" intensity={1.2} color="#5870a0" position={[0, 1.8, 5]} scale={[5, 3, 1]} target={[0, 0, 0]} />
      {/* Distant warm glow from the floor (puddle reflection source) */}
      <Lightformer form="rect" intensity={3} color="#c97030" position={[-4, -0.4, -2]} scale={[2, 0.4, 1]} target={[0, 0, 0]} />
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
      <color attach="background" args={['#06040a']} />
      {/* Heavy fog → distant geometry fades to near-black, gives depth */}
      <fog attach="fog" args={['#06040a', 4, 11]} />
      <Suspense fallback={null}>
        {/* Custom HDR built from Lightformers — replaces the studio preset
            so the lighting actually matches the cathedral reference. */}
        <Environment resolution={256} background={false}>
          <CathedralLights />
        </Environment>

        {/* Very low ambient — let the rim lights do the work */}
        <ambientLight intensity={0.03} color="#3050a0" />

        {/* Warm key light from upper-front-left (one strong warm source) */}
        <directionalLight
          castShadow
          position={[2.4, 3, 2]}
          intensity={0.8}
          color="#ffd0a0"
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0005}
        />

        {/* Strong warm rim from behind, low — creates the silhouette halo */}
        <spotLight
          position={[0, 0.2, -3]}
          angle={0.6}
          penumbra={0.7}
          intensity={6}
          color="#ff7a20"
          distance={8}
          target-position={[0, 0, 0]}
        />

        <Table />
        <Hourglass progress={progress} running={running} flipState={flipState} onFlip={onFlip} />

        {/* Floating dust particles — pure atmosphere */}
        {!lowPower && (
          <Sparkles
            count={70}
            scale={[3, 2.5, 3]}
            position={[0, 0.4, 0]}
            size={3}
            speed={0.2}
            opacity={0.6}
            color="#ffaa55"
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
        {/* Bloom on the emissive sand and the rim lights — gives the glow */}
        <Bloom intensity={lowPower ? 0.4 : 0.7} luminanceThreshold={0.6} luminanceSmoothing={0.3} mipmapBlur />
        {!lowPower && (
          <DepthOfField focusDistance={0.012} focalLength={0.05} bokehScale={2.5} />
        )}
        <Vignette eskil={false} offset={0.4} darkness={lowPower ? 0.5 : 0.7} />
      </EffectComposer>
    </Canvas>
  );
}
