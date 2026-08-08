import React from 'react';

// 未寄出 —— 書末最後嗰頁，只有仲有嘢未寄到雲端先會出現。
//
// 排喺書末最尾係故意嘅：一頁忽然出現或者消失，唔可以推走你正喺度睇緊嗰頁。
// 呢頁唔會講「sync」呢兩個字，本簿只識講「寄咗未」。

const OP_LABEL = {
  createFriend: '加罪人',
  updateFriend: '改設定',
  deleteFriend: '刪走罪人',
  createGrudge: '記一筆',
  updateGrudge: '改嬲爆事',
  deleteGrudge: '刪走嬲爆事',
};

const trim = (text, max) => {
  const s = String(text || '').trim();
  return s.length > max ? `${s.slice(0, max)}⋯` : s;
};

// 「你當初寫咗啲乜」。冇得靠 id — 呢啲嘢一係未有 server id，一係個 row 喺
// server 度已經冇咗，所以字都要喺 payload 度攞。
export function itemTitle(item) {
  const p = (item && item.payload) || {};
  const label = OP_LABEL[item && item.op] || '一筆嘢';
  if (item.op === 'createGrudge' && p.content) return `${label}：${trim(p.content, 16)}`;
  if ((item.op === 'createFriend' || item.op === 'updateFriend') && p.name) {
    return `${label}：${trim(p.name, 10)}`;
  }
  return label;
}

// 死咗嘅嘢要講返點解，而且要用人話。status/code 由 sync.js 原封不動抄低。
export function itemReason(item) {
  const err = (item && item.lastError) || {};
  if (err.code === 'card-claimed') return '呢單嬲爆已經入咗《找數卡》，改唔到';
  if (err.code === 'parent-gone' || err.status === 404) return '呢個罪人喺另一部機刪咗';
  if (err.status === 400) return '寫壞咗，寄唔出';
  if (err.status === 403) return '你冇權改呢樣嘢';
  return '寄唔出，本簿都唔知點解';
}

export default function PendingPage({ items, onDiscard, interactive, onIndex }) {
  const list = items || [];

  return (
    <div className="shb-bpage">
      <header className="shb-back-header">書末 ·未寄出</header>

      <div className="shb-pend">
        <p className="shb-pend-lead">
          呢啲嘢寫咗喺你部機，未寄到本簿嘅雲端。有網就會自己寄。
        </p>

        {list.length === 0 && <p className="shb-pend-empty">冇嘢卡住，全部寄晒喇。</p>}

        <ul className="shb-pend-list">
          {list.map((it) => {
            // 'permanent' = 點寄都寄唔出。'pending' = 等緊網絡，佢自己會再試，
            // 所以唔會俾粒「重試」掣 —— 撳極都冇用嘅掣就係呃人。
            const dead = it.state === 'permanent';
            return (
              <li key={it.seq} className={dead ? 'shb-pend-item shb-pend-dead' : 'shb-pend-item'}>
                <p className="shb-pend-what">{itemTitle(it)}</p>
                <p className="shb-pend-why">{dead ? itemReason(it) : '等緊網絡'}</p>
                {dead && (
                  <button
                    type="button" className="shb-pend-drop"
                    onClick={() => onDiscard(it.seq)} disabled={!interactive}
                  >
                    唔要
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {interactive && <button type="button" className="shb-idxtab" onClick={onIndex}>目錄</button>}
    </div>
  );
}
