import React, { useEffect, useState } from 'react';
import { api } from './api';

// 管理 — superadmin-only bottom sheet: how many people use the app, and who.
// The Worker enforces the gate; this sheet just renders what it returns.
export default function AdminSheet({ onClose }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.adminUsers().then(setData).catch(() => setFailed(true));
  }, []);

  return (
    <div className="shb-sheet-mask" onClick={onClose}>
      <div className="shb-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>管理 ·用戶一覽</h3>

        {failed && <p className="shb-empty-small">睇唔到喎，你唔係管理員？</p>}
        {!failed && data === null && <div className="shb-loading">數緊⋯</div>}

        {data && (
          <>
            <p className="shb-admin-total">總用戶：{data.total} 人</p>
            <ul className="shb-history shb-admin-list">
              {data.users.map((u) => (
                <li key={u.email}>
                  <span>{u.name || u.email}</span>
                  <span className="shb-admin-date">{(u.created_at || '').slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="shb-sheet-actions">
          <button type="button" className="shb-big-btn" onClick={onClose}>收埋</button>
        </div>
      </div>
    </div>
  );
}
