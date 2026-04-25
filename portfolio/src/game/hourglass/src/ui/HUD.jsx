import { useEffect, useRef, useState } from 'react';
import './HUD.css';

const PRESETS = [
  { label: '1m', seconds: 60 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '25m', seconds: 1500 },
  { label: '60m', seconds: 3600 },
];

function formatTime(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function HUD({
  duration, remainingMs, running, muted,
  onSetDuration, onPlayPause, onReset, onToggleMute,
}) {
  const [idle, setIdle] = useState(false);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    const wake = () => {
      setIdle(false);
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setIdle(true), 4000);
    };
    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    window.addEventListener('keydown', wake);
    return () => {
      clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('touchstart', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  return (
    <div className={`hud ${idle ? 'idle' : ''}`}>
      <div className="chips">
        {PRESETS.map(({ label, seconds }) => (
          <button
            key={label}
            className="chip"
            aria-pressed={duration === seconds}
            onClick={() => onSetDuration(seconds)}
          >{label}</button>
        ))}
      </div>
      <div className={`time ${!running && remainingMs < duration * 1000 ? 'paused' : ''}`}>
        {formatTime(remainingMs)}
      </div>
      <button className="icon-btn" aria-label={running ? 'Pause' : 'Play'} onClick={onPlayPause}>
        {running ? '⏸' : '▶'}
      </button>
      <button className="icon-btn" aria-label="Reset" onClick={onReset}>↻</button>
      <button className="icon-btn" aria-label={muted ? 'Unmute sound' : 'Mute sound'} onClick={onToggleMute}>
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}
