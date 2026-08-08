import React from 'react';
import { GoogleG, AngryFace } from './svgs';

// 封面正面 — the front of the closed book. Same box as the inside pages;
// Book.jsx hinges it on the spine and swings it open on login. The back face is
// plain paper (styled in CSS) — any text there reads as a glitchy flash while
// the cover sweeps past on desktop.
export function CoverFront({ onLogin, busy, loading, connected = true, onLegal }) {
  return (
    <div className="shb-cover-front">
      <div className="shb-cover-band" aria-hidden="true" />
      <div className="shb-cover-plate">
        <div className="shb-cover-face"><AngryFace level={2} size={56} /></div>
        <h1 className="shb-cover-title">小氣簿</h1>
        <p className="shb-cover-sub">唔係小氣，係記性好</p>
      </div>
      {loading && <p className="shb-cover-loading">開緊本簿⋯</p>}
      {/* 登入一定要打得通 Google，冇網撳極都係彈錯誤訊息。登入過一次之後
          Firebase 自己記住你，本簿冇網都揭得開 —— 所以呢句只會喺未開過簿嗰陣見到。*/}
      {!loading && !connected && (
        <p className="shb-cover-loading">冇網住 ·要開簿一次先</p>
      )}
      {!loading && connected && (
        <button type="button" className="shb-google-btn" onClick={onLogin} disabled={busy}>
          <GoogleG size={18} />
          <span>{busy ? '登入緊⋯' : '用 Google 開簿'}</span>
        </button>
      )}
      <p className="shb-cover-note">朋友激嬲你嘅事，記低先，儲夠印就搵佢請返餐。</p>
      <p className="shb-cover-legal">
        開簿即表示你同意
        <button type="button" onClick={() => onLegal('terms')}>條款</button>
        同
        <button type="button" onClick={() => onLegal('privacy')}>私隱條款</button>
      </p>
    </div>
  );
}
