import React, { useEffect, useState } from 'react';
import { api } from './api';
import { AngryFace, StampSeal } from './svgs';

export default function PublicCardPage({ token }) {
  const [data, setData] = useState(undefined); // undefined=loading, null=not found
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.publicCard(token).then(setData).catch(() => setData(null));
  }, [token]);

  const ack = async () => {
    setBusy(true);
    try {
      const card = await api.ackCard(token);
      setData((d) => ({ ...d, card }));
    } catch { /* stays open; user can retry */ }
    finally { setBusy(false); }
  };

  if (data === undefined) return <div className="shb-loading">開緊張卡⋯</div>;
  if (data === null) {
    return (
      <div className="shb-coupon shb-coupon-missing">
        <AngryFace level={1} size={64} />
        <h2>搵唔到呢張卡喎</h2>
        <p>可能條 link 唔啱，或者張卡已經唔存在。</p>
      </div>
    );
  }

  const { card, friendName, grudges } = data;
  return (
    <div className="shb-coupon">
      <p className="shb-coupon-tag">小氣簿・找數卡</p>
      <h2 className="shb-coupon-name">{friendName}</h2>
      <p className="shb-coupon-lede">你已經儲滿 {card.stamp_total} 個嬲爆印</p>

      <div className="shb-stampcard">
        {Array.from({ length: card.stamp_total }, (_, i) => <StampSeal key={i} filled size={30} />)}
      </div>

      <h3 className="shb-coupon-listtitle">罪行清單</h3>
      <ul className="shb-coupon-list">
        {grudges.map((g, i) => (
          <li key={i}>
            <span className="shb-entry-date">{g.occurred_at}</span>
            <AngryFace level={g.severity} size={22} />
            <p>{g.content}</p>
          </li>
        ))}
      </ul>

      <p className="shb-coupon-demand">{card.reward}啦！</p>

      {card.status === 'open' && (
        <button type="button" className="shb-big-btn" onClick={ack} disabled={busy}>
          {busy ? '認緊⋯' : '好啦好啦，我認數'}
        </button>
      )}
      {card.status === 'acknowledged' && <p className="shb-coupon-status">已認數 — 記住{card.reward}呀</p>}
      {card.status === 'settled' && <p className="shb-coupon-status">已找數，一筆勾銷</p>}

      <a className="shb-coupon-footer" href="https://siu-hei-bou.hillmanchan.com">由小氣簿發出 — 你都想記朋友仇？</a>
    </div>
  );
}
