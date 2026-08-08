import React from 'react';
import { GoogleG, AngryFace } from './svgs';

// 封面正面 — the front of the closed book. Same box as the inside pages;
// Book.jsx hinges it on the spine and swings it open on login.
export function CoverFront({ onLogin, busy, loading }) {
  return (
    <div className="shb-cover-front">
      <div className="shb-cover-band" aria-hidden="true" />
      <div className="shb-cover-plate">
        <div className="shb-cover-face"><AngryFace level={2} size={56} /></div>
        <h1 className="shb-cover-title">小氣簿</h1>
        <p className="shb-cover-sub">唔係小氣，係記性好</p>
      </div>
      {loading ? (
        <p className="shb-cover-loading">開緊本簿⋯</p>
      ) : (
        <button type="button" className="shb-google-btn" onClick={onLogin} disabled={busy}>
          <GoogleG size={18} />
          <span>{busy ? '登入緊⋯' : '用 Google 開簿'}</span>
        </button>
      )}
      <p className="shb-cover-note">朋友激嬲你嘅事，記低先，儲夠印就搵佢請返餐。</p>
    </div>
  );
}

// 封面內頁 — glimpsed while the cover swings open.
export function CoverInside({ name }) {
  return (
    <div className="shb-cover-inside">
      <p className="shb-cover-owner-label">呢本簿屬於</p>
      <p className="shb-cover-owner">{name || '　'}</p>
    </div>
  );
}
