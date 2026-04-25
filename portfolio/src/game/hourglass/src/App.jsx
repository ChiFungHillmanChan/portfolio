import { useEffect, useState } from 'react';
import Scene from './scene/Scene.jsx';
import HUD from './ui/HUD.jsx';
import { useTimer } from './hooks/useTimer.js';
import { useAudio } from './hooks/useAudio.js';

export default function App() {
  const timer = useTimer({ defaultDuration: 300 });
  const [muted, setMuted] = useState(() => localStorage.getItem('hourglass.muted') !== '0');

  useEffect(() => {
    localStorage.setItem('hourglass.muted', muted ? '1' : '0');
  }, [muted]);

  useAudio({ muted, running: timer.running, done: timer.done });

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (timer.running) timer.pause(); else timer.start();
          break;
        case 'r': timer.reset(); break;
        case 'f':
          timer.flip();
          setTimeout(() => timer.start(), 850);
          break;
        case 'm': setMuted((m) => !m); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [timer]);

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
