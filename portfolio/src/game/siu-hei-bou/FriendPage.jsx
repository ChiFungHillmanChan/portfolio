import React, { useCallback, useEffect, useState } from 'react';
import { api, SHARE_BASE } from './api';
import { AngryFace, StampSeal } from './svgs';
import AddGrudgeSheet from './AddGrudgeSheet';

function BackChevron() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M20 5 L10 16 L20 27" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FriendPage({ friend, openCards, onBack, refresh, toast }) {
  const [grudges, setGrudges] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyCard, setBusyCard] = useState(false);

  const load = useCallback(async () => {
    try { setGrudges(await api.grudges(friend.id)); }
    catch { toast('load 唔到，遲啲再試'); }
  }, [friend.id, toast]);

  useEffect(() => { load(); }, [load]);

  const card = (openCards || []).find((c) => c.friend_id === friend.id);
  const full = friend.stamps >= friend.threshold;
  const nearly = !full && friend.stamps >= friend.threshold * 0.8;

  const share = useCallback(async (c) => {
    const url = `${SHARE_BASE}/card/${c.share_token}`;
    const text = `【小氣簿】你喺我本簿度已經儲滿 ${c.stamp_total} 個嬲爆印！睇下你做過啲乜 → ${url} 依家${c.reward}，一筆勾銷。`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* user cancelled the share sheet */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast('已經 copy 咗，貼去 WhatsApp send 俾佢啦');
    }
  }, [toast]);

  const openCardNow = async () => {
    setBusyCard(true);
    try {
      const c = await api.openCard(friend.id);
      await refresh();
      await load();
      await share(c);
    } catch (e) {
      toast(e.code === 'threshold-not-met' ? '未儲夠印住' : '開唔到卡，遲啲再試');
    } finally {
      setBusyCard(false);
    }
  };

  const settle = async (c) => {
    try {
      await api.settleCard(c.id);
      await refresh();
      await load();
      toast('一筆勾銷！');
    } catch { toast('搞唔掂，遲啲再試'); }
  };

  const removeGrudge = async (g) => {
    try { await api.removeGrudge(g.id); await refresh(); await load(); }
    catch { toast('刪唔到，遲啲再試'); }
  };

  const slots = Array.from({ length: friend.threshold }, (_, i) => i < friend.stamps);

  return (
    <div className="shb-page">
      <header className="shb-friend-header" style={{ '--tab': friend.colour }}>
        <button type="button" className="shb-back" onClick={onBack} aria-label="返去名單"><BackChevron /></button>
        <h2>{friend.name}</h2>
        <span className="shb-friend-count">{friend.stamps}/{friend.threshold} 印</span>
      </header>

      {nearly && <div className="shb-banner">就快滿喇，{friend.name} 小心啲⋯</div>}

      <section className="shb-stampcard" aria-label="儲印卡">
        {slots.map((filled, i) => <StampSeal key={i} filled={filled} />)}
        {friend.stamps > friend.threshold && <span className="shb-over">+{friend.stamps - friend.threshold}</span>}
      </section>

      {full && !card && (
        <button type="button" className="shb-big-btn" onClick={openCardNow} disabled={busyCard}>
          {busyCard ? '開緊⋯' : `開找數卡（${friend.reward}）`}
        </button>
      )}

      {card && (
        <div className="shb-open-card">
          <p>
            {card.status === 'acknowledged'
              ? `佢認咗數喇！記住要佢${card.reward}`
              : `張找數卡開咗喇（${card.stamp_total} 印）`}
          </p>
          <div className="shb-open-card-actions">
            <button type="button" onClick={() => share(card)}>send 俾佢</button>
            <button type="button" onClick={() => settle(card)}>找咗數，一筆勾銷</button>
          </div>
        </div>
      )}

      <section className="shb-entries">
        <h3>罪行紀錄</h3>
        {grudges === null && <div className="shb-loading">揭緊頁⋯</div>}
        {grudges && grudges.length === 0 && <p className="shb-empty">未有紀錄，快啲記低第一筆</p>}
        <ul>
          {(grudges || []).map((g) => (
            <li key={g.id} className={g.card_id ? 'shb-entry shb-entry-claimed' : 'shb-entry'}>
              <span className="shb-entry-date">{g.occurred_at}</span>
              <AngryFace level={g.severity} size={26} />
              <p className="shb-entry-text">{g.content}</p>
              {!g.card_id && (
                <button type="button" className="shb-entry-del" aria-label="刪走佢" onClick={() => removeGrudge(g)}>×</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="shb-fab" onClick={() => setShowAdd(true)}>記一筆</button>

      {showAdd && (
        <AddGrudgeSheet
          friend={friend}
          onClose={() => setShowAdd(false)}
          onSaved={async () => { setShowAdd(false); await refresh(); await load(); }}
          toast={toast}
        />
      )}
    </div>
  );
}
