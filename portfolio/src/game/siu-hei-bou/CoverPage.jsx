import React from 'react';
import { GoogleG, AngryFace } from './svgs';

export default function CoverPage({ onLogin, busy }) {
  return (
    <div className="shb-cover">
      <div className="shb-cover-band" aria-hidden="true" />
      <div className="shb-cover-plate">
        <div className="shb-cover-face"><AngryFace level={2} size={56} /></div>
        <h1 className="shb-cover-title">小氣簿</h1>
        <p className="shb-cover-sub">小器之人，專用此簿</p>
      </div>
      <button type="button" className="shb-google-btn" onClick={onLogin} disabled={busy}>
        <GoogleG size={18} />
        <span>{busy ? '登入緊⋯' : '用 Google 開簿'}</span>
      </button>
      <p className="shb-cover-note">記低朋友激嬲你嘅事，儲滿印仔就叫佢請食飯</p>
    </div>
  );
}
