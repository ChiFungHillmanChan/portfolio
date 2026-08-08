import React, { useState } from 'react';
import { api } from './api';

const COLOURS = ['#e8a0a0', '#a0c8e8', '#a8d8b0', '#e8d3a0', '#c9aee5', '#f0b8d0'];

export default function HomePage({ state, onSelect, refresh, toast, onLogout }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const friends = state ? state.friends : null;

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await api.createFriend({ name: trimmed, colour: COLOURS[(friends?.length || 0) % COLOURS.length] });
      setName('');
      await refresh();
    } catch {
      toast('加唔到，遲啲再試');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shb-page">
      <header className="shb-header">
        <h1>小氣簿</h1>
        <p>罪人名單</p>
      </header>

      {friends === null && <div className="shb-loading">揭緊頁⋯</div>}
      {friends && friends.length === 0 && (
        <p className="shb-empty">一個罪人都未有，<br />恭喜你，朋友都好乖。</p>
      )}

      <ul className="shb-tabs">
        {(friends || []).map((f) => (
          <li key={f.id}>
            <button type="button" className="shb-tab" style={{ '--tab': f.colour }} onClick={() => onSelect(f.id)}>
              <span className="shb-tab-name">{f.name}</span>
              <span className="shb-tab-progress">
                <span className="shb-tab-bar" style={{ width: `${Math.min(100, (f.stamps / f.threshold) * 100)}%` }} />
              </span>
              <span className="shb-tab-count">{f.stamps}/{f.threshold} 印</span>
              {f.stamps >= f.threshold && <span className="shb-tab-full">滿喇！</span>}
            </button>
          </li>
        ))}
      </ul>

      <form className="shb-add-friend" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="邊個激嬲你？" />
        <button type="submit" disabled={busy || !name.trim()}>加個罪人</button>
      </form>

      <footer className="shb-footer">
        <button type="button" className="shb-link" onClick={onLogout}>合埋本簿（登出）</button>
      </footer>
    </div>
  );
}
