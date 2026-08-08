import React, { useState } from 'react';
import { Magnifier } from './svgs';

// 目錄 — the first inside page(s). Search line, one ruled line per friend with a
// dotted leader, add-friend line at the bottom. Long lists flow onto further
// index pages via the same line grid.
export default function IndexPage({
  friends, filtered, search, onSearch, pageIdx, linesPerPage,
  onSelect, onAddFriend, addBusy, onLogout, interactive,
  ownerName, isAdmin, onAdmin,
}) {
  const [name, setName] = useState('');
  const slice = filtered === null ? null : filtered.slice(pageIdx * linesPerPage, (pageIdx + 1) * linesPerPage);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAddFriend(trimmed);
    setName('');
  };

  const title = ownerName ? `${ownerName}的小氣簿` : '小氣簿';

  return (
    <div className="shb-bpage">
      <header className="shb-idx-header">
        <h1 className={title.length > 8 ? 'shb-idx-title-long' : undefined}>{title}</h1>
        <p>{filtered === null ? '目錄' : `共 ${friends.length} 個罪人 ·目錄`}</p>
      </header>

      <div className="shb-idx-search">
        <Magnifier size={15} />
        <input
          value={search} onChange={(e) => onSearch(e.target.value)}
          placeholder="搵返邊個罪人？" maxLength={30}
          disabled={!interactive}
        />
      </div>

      <div className="shb-idx-lines shb-ruled">
        {filtered === null && <div className="shb-line shb-line-dim">揭緊頁⋯</div>}
        {filtered !== null && friends.length === 0 && (
          <>
            <div className="shb-line shb-line-dim">一個罪人都未有，</div>
            <div className="shb-line shb-line-dim">恭喜你，朋友都好乖。</div>
          </>
        )}
        {filtered !== null && friends.length > 0 && filtered.length === 0 && (
          <div className="shb-line shb-line-dim">搵唔到喎，試下第二個名</div>
        )}
        {(slice || []).map((f) => (
          <button
            key={f.id} type="button" className="shb-line shb-idx-line"
            onClick={() => onSelect(f.id)} disabled={!interactive}
          >
            <span className="shb-idx-swatch" style={{ background: f.colour }} aria-hidden="true" />
            <span className="shb-idx-name">{f.name}</span>
            <span className="shb-idx-leader" aria-hidden="true" />
            <span className="shb-idx-count">{f.stamps}/{f.threshold} 印</span>
            {f.stamps >= f.threshold && <span className="shb-idx-full">滿</span>}
          </button>
        ))}
      </div>

      <form className="shb-idx-add" onSubmit={submit}>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          maxLength={30} placeholder="邊個激嬲你？寫低個名⋯" disabled={!interactive}
        />
        <button type="submit" disabled={!interactive || addBusy || !name.trim()}>記入簿</button>
      </form>

      <footer className="shb-idx-foot">
        {isAdmin && (
          <button type="button" className="shb-link" onClick={onAdmin} disabled={!interactive}>
            管理
          </button>
        )}
        <button type="button" className="shb-link" onClick={onLogout} disabled={!interactive}>
          合埋本簿（登出）
        </button>
      </footer>
    </div>
  );
}
