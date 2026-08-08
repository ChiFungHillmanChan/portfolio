import React, { useEffect, useRef, useState } from 'react';
import { AngryFace } from './svgs';

const LABELS = { 1: '小嬲', 2: '中嬲', 3: '勁嬲' };
const today = () => new Date().toISOString().slice(0, 10);

// 記一筆。呢度唔會叫 server —— 寫低咗就係寫低咗，有冇網都好，Book 會排隊寄。
export default function AddGrudgeSheet({ friend, onClose, onSaved }) {
  const [content, setContent] = useState('');
  const [severity, setSeverity] = useState(1);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef(null);
  const textRef = useRef(null);

  // 張 sheet 封咗頂之後就係一個捲軸，而 autoFocus 一彈鍵盤，iOS 就會自己捲個
  // 捲軸去就住個 caret —— 結果開個 sheet 見到嘅係下半橛，「記一筆」同頭幾行間線
  // 喺畫面之外。preventScroll 就係叫佢唔好捲；跟手自己撥返去頂，因為鍵盤係 focus
  // 之後先彈出嚟，個 layout 郁多次。舊機唔識 preventScroll 就照 focus，
  // 個 sticky 標題（CSS 嗰邊）仍然頂得住。
  useEffect(() => {
    const t = textRef.current;
    if (!t) return;
    try { t.focus({ preventScroll: true }); } catch { t.focus(); }
    if (sheetRef.current) sheetRef.current.scrollTop = 0;
  }, []);

  const save = async () => {
    if (!content.trim()) return;
    setBusy(true);
    await onSaved({ content: content.trim(), severity, occurred_at: date });
  };

  return (
    <div className="shb-sheet-mask" onClick={onClose}>
      <div className="shb-sheet" ref={sheetRef} onClick={(e) => e.stopPropagation()}>
        <h3>記一筆：{friend.name}</h3>
        <textarea
          ref={textRef}
          value={content} onChange={(e) => setContent(e.target.value)}
          maxLength={500} rows={4} placeholder="佢今次做咗啲乜⋯"
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
