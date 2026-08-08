import React, { useState } from 'react';
import { api } from './api';
import { AngryFace } from './svgs';

const LABELS = { 1: '小嬲', 2: '中嬲', 3: '勁嬲' };
const today = () => new Date().toISOString().slice(0, 10);

export default function AddGrudgeSheet({ friend, onClose, onSaved, toast }) {
  const [content, setContent] = useState('');
  const [severity, setSeverity] = useState(1);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!content.trim()) return;
    setBusy(true);
    try {
      await api.addGrudge({ friend_id: friend.id, content: content.trim(), severity, occurred_at: date });
      await onSaved();
    } catch {
      toast('save 唔到，遲啲再試');
      setBusy(false);
    }
  };

  return (
    <div className="shb-sheet-mask" onClick={onClose}>
      <div className="shb-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>記一筆：{friend.name}</h3>
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)}
          maxLength={500} rows={4} autoFocus placeholder="佢今次做咗啲乜⋯"
        />
        <div className="shb-severity">
          {[1, 2, 3].map((lv) => (
            <button
              key={lv} type="button"
              className={severity === lv ? 'shb-sev shb-sev-on' : 'shb-sev'}
              onClick={() => setSeverity(lv)}
            >
              <AngryFace level={lv} size={34} />
              <span>{LABELS[lv]}（{lv} 印）</span>
            </button>
          ))}
        </div>
        <div className="shb-sheet-row">
          <label>幾時發生：
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <span className="shb-count">{content.length}/500</span>
        </div>
        <div className="shb-sheet-actions">
          <button type="button" className="shb-link" onClick={onClose}>算數</button>
          <button type="button" className="shb-big-btn" onClick={save} disabled={busy || !content.trim()}>
            {busy ? '記緊⋯' : '記低佢'}
          </button>
        </div>
      </div>
    </div>
  );
}
