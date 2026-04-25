import { useTimer } from '../hooks/useTimer.js';
import './FallbackTimer.css';

const PRESETS = [60, 180, 300, 600, 1500, 3600];
const fmt = (ms) => {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
};

export default function FallbackTimer() {
  const t = useTimer({ defaultDuration: 300 });
  return (
    <div className="fallback">
      <noscript>This timer requires JavaScript.</noscript>
      <div className="panel">
        <select value={t.duration} onChange={(e) => t.setDuration(Number(e.target.value))}>
          {PRESETS.map((sec) => <option key={sec} value={sec}>{fmt(sec * 1000)}</option>)}
        </select>
        <span className="time">{fmt(t.remainingMs)}</span>
        <button onClick={() => (t.running ? t.pause() : t.start())}>{t.running ? 'Pause' : 'Start'}</button>
        <button onClick={t.reset}>Reset</button>
      </div>
    </div>
  );
}
