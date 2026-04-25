import { useEffect, useState } from 'react';
import Scene from './scene/Scene.jsx';
import HUD from './ui/HUD.jsx';
import { useTimer } from './hooks/useTimer.js';

export default function App() {
  const timer = useTimer({ defaultDuration: 300 });
  const [muted, setMuted] = useState(() => localStorage.getItem('hourglass.muted') !== '0');

  useEffect(() => {
    localStorage.setItem('hourglass.muted', muted ? '1' : '0');
  }, [muted]);

  const handleFlip = () => {
    timer.flip();
    setTimeout(() => timer.start(), 850);
  };

  const handlePlayPause = () => (timer.running ? timer.pause() : timer.start());

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Scene
        progress={timer.progress}
        running={timer.running}
        flipState={timer.flipState}
        onFlip={handleFlip}
      />
      <HUD
        duration={timer.duration}
        remainingMs={timer.remainingMs}
        running={timer.running}
        muted={muted}
        onSetDuration={timer.setDuration}
        onPlayPause={handlePlayPause}
        onReset={timer.reset}
        onToggleMute={() => setMuted((m) => !m)}
      />
    </div>
  );
}
