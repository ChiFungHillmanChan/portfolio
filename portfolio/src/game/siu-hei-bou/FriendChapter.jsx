import React, { useMemo } from 'react';
import { AngryFace, StampSeal, PenNib } from './svgs';
import { takeUnits, unitLen } from './paginate';
import { entryLineMap, isPenEntry } from './geometry';

function Gear() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 26 L20 6 L26 10 L12 30 L5 31 Z M18 9 L23 13"
        fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// 未寄出嘅嘢用鉛筆寫（灰色），寄咗嘅先落墨。本簿自己講返自己嘅狀態，唔使 badge。
const lineClass = (base, entry) => {
  let cls = base;
  if (entry.card_id) cls += ' shb-line-claimed';
  if (entry.pending) cls += ' shb-pending';
  return cls;
};

// One page of a friend's chapter. Page 0 carries the header, stamp card and card
// box; continuation pages are almost all ruled lines. Entry lines are printed as
// exact substrings from the pagination engine, one 32px div per ruled line.
export default function ChapterPage({
  chapter, pageIdx, geom, pen, interactive, busyCard, connected,
  onGear, onOpenCard, onShare, onSettle, onDeleteGrudge, onIndex, onAdd,
}) {
  const { friend, card, pages, stampH, seal, showBanner, showFullBtn, loaded } = chapter;
  const actualIdx = Math.min(pageIdx, pages.length - 1);
  const page = pages[actualIdx] || [];

  const penRanges = useMemo(
    () => (pen ? entryLineMap(pages, pen.entryId) : null),
    [pen, pages],
  );

  const renderLine = (line, i) => {
    if (line.type === 'gap') return <div key={i} className="shb-line" />;
    const penning = pen && isPenEntry(line.entry, pen.entryId);
    const progress = pen ? Math.max(0, pen.progress) : 0;

    if (line.type === 'meta') {
      if (penning && pen.progress < 0) return <div key={i} className="shb-line" />;
      return (
        <div key={i} className={lineClass('shb-line shb-line-meta', line.entry)}>
          <span className="shb-line-date">{line.entry.occurred_at}</span>
          <AngryFace level={line.entry.severity} size={22} />
          <span className="shb-line-fill" />
          {!line.entry.card_id && interactive && !penning && (
            <button
              type="button" className="shb-entry-del" aria-label="刪走佢"
              onClick={() => onDeleteGrudge(line.entry)}
            >×</button>
          )}
        </div>
      );
    }

    let text = line.text;
    let penAt = null; // px offset for the nib when this is the line being written
    if (penning) {
      const range = penRanges.find((r) => r.pageIdx === actualIdx && r.lineIdx === i && r.type === 'text');
      if (range) {
        if (progress <= range.start && pen.progress < pen.total) {
          text = '';
          // 落紙嗰下：一個字都未寫，但支筆要見到 —— 停喺第一行行頭。冇呢句，
          // 支筆就會喺第一個字寫完之後先憑空出現，成個「落筆」嘅動作冇咗。
          const firstText = penRanges.find((r) => r.type === 'text');
          if (pen.progress < 0 && range === firstText) penAt = 0;
        } else if (progress < range.end) {
          text = takeUnits(line.text, progress - range.start);
          penAt = unitLen(text) * geom.charPx;
        } else if (pen.progress >= pen.total) {
          const isLast = penRanges[penRanges.length - 1].pageIdx === actualIdx
            && penRanges[penRanges.length - 1].lineIdx === i;
          if (isLast) penAt = unitLen(line.text) * geom.charPx; // parked at the full stop
        }
      }
    }

    return (
      <div key={i} className={lineClass('shb-line shb-line-text', line.entry)}>
        {text}
        {penAt !== null && (
          <span className="shb-pen" style={{ left: penAt }} aria-hidden="true">
            <PenNib size={38} />
          </span>
        )}
      </div>
    );
  };

  const slots = Array.from({ length: friend.threshold }, (_, s) => s < friend.stamps);

  return (
    <div className="shb-bpage">
      {actualIdx === 0 ? (
        <>
          <header className="shb-ch-header" style={{ '--tab': friend.colour }}>
            <h2>{friend.name}</h2>
            <span className="shb-ch-count">{friend.stamps}/{friend.threshold} 印</span>
            <button type="button" className="shb-gear" aria-label="設定" onClick={onGear} disabled={!interactive}>
              <Gear />
            </button>
          </header>

          {showBanner && <div className="shb-ch-banner">就快滿喇，{friend.name} 小心啲⋯</div>}

          <section className="shb-stampcard" style={{ height: stampH }} aria-label="儲印卡">
            {slots.map((filled, s) => <StampSeal key={s} filled={filled} size={seal} />)}
            {friend.stamps > friend.threshold && <span className="shb-over">+{friend.stamps - friend.threshold}</span>}
          </section>

          {showFullBtn && (
            <div className="shb-fullbtn-row">
              {/* 開卡要 server 派一條分享 link 同埋一次過收晒啲印，冇網真係做唔到，
                  所以直接講明，唔好扮撳得。 */}
              <button
                type="button" className="shb-big-btn" onClick={onOpenCard}
                disabled={busyCard || !interactive || !connected}
              >
                {!connected && '開卡要有網絡'}
                {connected && (busyCard ? '開緊⋯' : `開找數卡（${friend.reward}）`)}
              </button>
            </div>
          )}

          {card && (
            <div className="shb-open-card">
              <p>
                {card.status === 'acknowledged'
                  ? `佢認咗數喇！記住要佢${card.reward}`
                  : `張找數卡開咗喇（${card.stamp_total} 印）`}
              </p>
              <div className="shb-open-card-actions">
                {/* send 俾佢 = copy 條 link，冇網一樣做得到，所以照開。 */}
                <button type="button" onClick={() => onShare(card)} disabled={!interactive}>send 俾佢</button>
                <button
                  type="button" onClick={() => onSettle(card)}
                  disabled={!interactive || !connected}
                >
                  {connected ? '找咗數，一筆勾銷' : '找數要有網絡'}
                </button>
              </div>
            </div>
          )}

          <h3 className="shb-entries-head">罪行紀錄</h3>
        </>
      ) : (
        <header className="shb-slim-header" style={{ '--tab': friend.colour }}>
          {friend.name} ·續
        </header>
      )}

      <div className="shb-ch-lines shb-ruled">
        {!loaded && <div className="shb-line shb-line-dim">揭緊頁⋯</div>}
        {/* 空白嗰章：嗰句嘢本身就撳得。一本得個空行嘅簿，最順手嘅動作就係撳落
            行度開始寫 —— 唔應該逼人望到落底先搵到支筆。有咗紀錄之後就唔再需要，
            嗰陣落面支「記一筆」已經係熟路。 */}
        {loaded && pages.length === 1 && page.length === 0 && (
          interactive && onAdd ? (
            <button type="button" className="shb-line shb-line-dim shb-line-empty" onClick={onAdd}>
              未有紀錄，撳一下記低第一筆
            </button>
          ) : (
            <div className="shb-line shb-line-dim">未有紀錄，快啲記低第一筆</div>
          )
        )}
        {page.map(renderLine)}
      </div>

      {interactive && (
        <button type="button" className="shb-idxtab" onClick={onIndex}>目錄</button>
      )}
    </div>
  );
}
