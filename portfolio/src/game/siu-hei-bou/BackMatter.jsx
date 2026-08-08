import React, { useState } from 'react';
import { LegalBody } from './LegalDoc';
import { PRIVACY, TERMS } from './legal';

// 書末 —— 本簿最後嗰三頁，排喺所有罪人章節後面。
// 0：個人檔案（你係邊個、儲咗幾多、登出、撕爛本簿）
// 1：私隱條款   2：條款及細則
export const BACK_PAGES = 3;
const DOCS = [null, PRIVACY, TERMS];

const dash = (v) => (v === null || v === undefined ? '⋯' : v);

export default function BackMatter({
  pageIdx, user, me, interactive, connected = true,
  onLogout, onDeleteAll, deleting, onGoPage, onIndex,
}) {
  const [confirm, setConfirm] = useState(false);
  const idx = Math.min(Math.max(0, pageIdx || 0), BACK_PAGES - 1);
  const doc = DOCS[idx];

  if (doc) {
    return (
      <div className="shb-bpage">
        <header className="shb-back-header">書末 ·{doc.title}</header>
        <div className="shb-legal-page"><LegalBody doc={doc} /></div>
        {interactive && <button type="button" className="shb-idxtab" onClick={onIndex}>目錄</button>}
      </div>
    );
  }

  const counts = me && me.counts ? me.counts : null;
  const name = (me && me.name) || (user && user.displayName) || '（未有名）';
  const email = (me && me.email) || (user && user.email) || '';
  const since = me && me.created_at ? me.created_at.slice(0, 10) : null;
  const photo = user && user.photoURL;

  // 撕之前講清楚撕緊乜。攞唔到數字就退返做一句籠統嘅講法，唔會亂report 0。
  const what = counts
    ? `${counts.friends} 個罪人、${counts.grudges} 單嬲爆事、${counts.cards} 張找數卡`
    : '你本簿入面所有嘢';

  return (
    <div className="shb-bpage">
      <header className="shb-back-header">書末 ·個人檔案</header>

      <div className="shb-me">
        <div className="shb-me-id">
          {photo
            ? <img className="shb-me-avatar" src={photo} alt="" referrerPolicy="no-referrer" />
            : <div className="shb-me-avatar shb-me-avatar-fallback">{(name[0] || '？')}</div>}
          <div className="shb-me-who">
            <p className="shb-me-name">{name}</p>
            <p className="shb-me-email">{email}</p>
            <p className="shb-me-since">開簿日：{since || '⋯'}</p>
          </div>
        </div>

        <div className="shb-me-stats">
          <div className="shb-me-stat"><b>{dash(counts && counts.friends)}</b><span>個罪人</span></div>
          <div className="shb-me-stat"><b>{dash(counts && counts.grudges)}</b><span>單嬲爆事</span></div>
          <div className="shb-me-stat"><b>{dash(counts && counts.cards)}</b><span>張找數卡</span></div>
        </div>

        <p className="shb-me-legal-links">
          <button type="button" className="shb-link" onClick={() => onGoPage(1)} disabled={!interactive}>
            私隱條款
          </button>
          <span aria-hidden="true"> · </span>
          <button type="button" className="shb-link" onClick={() => onGoPage(2)} disabled={!interactive}>
            條款及細則
          </button>
        </p>

        <div className="shb-me-actions">
          {!confirm && (
            <>
              <button type="button" className="shb-outline-btn" onClick={onLogout} disabled={!interactive}>
                合埋本簿（登出）
              </button>
              {/* 撕書要 server 真係刪到嗰啲 row 先算數，所以冇網連撳都唔俾撳。 */}
              <button
                type="button" className="shb-danger-btn"
                onClick={() => setConfirm(true)} disabled={!interactive || !connected}
              >
                {connected ? '撕爛本簿，刪清所有嘢' : '撕書要有網絡'}
              </button>
            </>
          )}

          {confirm && (
            <div className="shb-danger-box">
              <p>一撕就冇得返轉頭：{what}，連你喺小氣簿嘅登入資料，會即刻永久刪清。冇備份，還原唔到。</p>
              <p className="shb-danger-note">
                （你個 Google 帳戶係成個 hillmanchan.com 共用嘅，唔會喺呢度刪。）
              </p>
              <div className="shb-danger-row">
                <button
                  type="button" className="shb-danger-no"
                  onClick={() => setConfirm(false)} disabled={deleting}
                >
                  唔撕住
                </button>
                <button type="button" className="shb-danger-yes" onClick={onDeleteAll} disabled={deleting}>
                  {deleting ? '撕緊⋯' : '真係撕爛佢'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {interactive && <button type="button" className="shb-idxtab" onClick={onIndex}>目錄</button>}
    </div>
  );
}
