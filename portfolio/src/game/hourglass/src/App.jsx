import Scene from './scene/Scene.jsx';
import { useTimer } from './hooks/useTimer.js';

export default function App() {
  const timer = useTimer({ defaultDuration: 300 });

  const handleFlip = () => {
    timer.flip();
    setTimeout(() => timer.start(), 850);
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Scene
        progress={timer.progress}
        running={timer.running}
        flipState={timer.flipState}
        onFlip={handleFlip}
      />
    </div>
  );
}
