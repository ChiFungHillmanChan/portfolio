import React, { useEffect, useState } from 'react';
import { api } from './api';

const COLOURS = ['#e8a0a0', '#a0c8e8', '#a8d8b0', '#e8d3a0', '#c9aee5', '#f0b8d0'];
const STATUS_LABEL = { open: '未認數', acknowledged: '已認數', settled: '已找數' };

export default function SettingsSheet({ friend, onClose, refresh, toast, onDeleted }) {
  const [name, setName] = useState(friend.name);
  const [colour, setColour] = useState(friend.colour);
  const [threshold, setThreshold] = useState(friend.threshold);
  const [reward, setReward] = useState(friend.reward);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.cards(friend.id).then(setHistory).catch(() => setHistory([]));
  }, [friend.id]);

  const save = async () => {
    const t = Number(threshold);
    if (!name.trim() || !reward.trim() || !Number.isInteger(t) || t < 1 || t > 100) {
      toast('啲設定唔啱喎，檢查下');
      return;
    }
    setBusy(true);
    try {
      await api.updateFriend(friend.id, { name: name.trim(), colour, threshold: t, reward: reward.trim() });
      await refresh();
      toast('save 咗喇');
      onClose();
    } catch {
      toast('save 唔到，遲啲再試');
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    try {
      await api.deleteFriend(friend.id);
      await refresh();
      onDeleted();
    } catch {
      toast('刪唔到，遲啲再試');
      setBusy(false);
    }
  };

  return (
    <div className="shb-sheet-mask" onClick={onClose}>
      <div className="shb-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>設定：{friend.name}</h3>

        <label className="shb-field">改名
          <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="shb-field">
          <span>書籤顏色</span>
          <div className="shb-swatches">
            {COLOURS.map((c) => (
              <button key={c} type="button" aria-label={`顏色 ${c}`}
                className={c === colour ? 'shb-swatch shb-swatch-on' : 'shb-swatch'}
                style={{ background: c }} onClick={() => setColour(c)} />
            ))}
          </div>
        </div>
        <label className="shb-field">滿卡要幾多印（1–100）
          <input type="number" min={1} max={100} value={threshold}
            onChange={(e) => setThreshold(e.target.value === '' ? '' : Number(e.target.value))} />
        </label>
        <label className="shb-field">滿咗要佢做乜
          <input value={reward} maxLength={30} placeholder="請食飯" onChange={(e) => setReward(e.target.value)} />
        </label>

        <h4 className="shb-history-title">找數紀錄</h4>
        {history === null && <div className="shb-loading">睇緊⋯</div>}
        {history && history.length === 0 && <p className="shb-empty-small">未開過找數卡</p>}
        <ul className="shb-history">
          {(history || []).map((c) => (
            <li key={c.id}>
              <span>{c.created_at.slice(0, 10)}</span>
              <span>{c.stamp_total} 印・{c.reward}</span>
              <span className="shb-history-status">{STATUS_LABEL[c.status]}</span>
            </li>
          ))}
        </ul>

        <div className="shb-sheet-actions">
          {!confirmDelete && (
            <button type="button" className="shb-link shb-danger" onClick={() => setConfirmDelete(true)}>
              刪走呢個罪人
            </button>
          )}
          {confirmDelete && (
            <button type="button" className="shb-link shb-danger" onClick={del} disabled={busy}>
              真係刪？所有紀錄一齊冇㗎（撳多次確認）
            </button>
          )}
          <button type="button" className="shb-big-btn" onClick={save} disabled={busy}>save 設定</button>
        </div>
      </div>
    </div>
  );
}
