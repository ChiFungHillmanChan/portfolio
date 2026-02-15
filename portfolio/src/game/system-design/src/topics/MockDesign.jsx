import { useState, useRef, useEffect, useCallback } from 'react';
import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'url-shortener', label: 'URL Shortener 短網址' },
  { slug: 'chat-system', label: 'Chat System 即時通訊' },
  { slug: 'payment-system', label: 'Payment System 支付' },
  { slug: 'news-feed', label: 'News Feed 動態消息' },
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡' },
];

const mockDesigns = {
  'url-shortener': {
    title: 'URL Shortener 短網址服務',
    prompt: '設計一個 URL 短網址服務，支援每日 1 億個短網址生成。',
    hints: [
      { at: 25, text: '記得考慮 ID 生成策略：自增 ID vs Hash vs Base62' },
      { at: 15, text: '讀寫比例？Cache 策略？Analytics tracking？' },
      { at: 5, text: '301 vs 302 redirect？過期清理？Rate limiting？' },
    ],
    checklist: [
      'API 設計 (POST /shorten, GET /:id)',
      'ID 生成 (Base62 / Snowflake)',
      '存儲 (KV Store / SQL)',
      'Cache 層 (Redis + LRU)',
      '301 vs 302 trade-off',
      'Analytics / 統計',
      '過期同清理策略',
      'Rate Limiting',
    ],
  },
  'chat-system': {
    title: 'Chat System 即時通訊',
    prompt: '設計一個支援 1 對 1 同群組聊天嘅即時通訊系統，支援 1000 萬日活用戶。',
    hints: [
      { at: 25, text: '考慮 WebSocket vs Long Polling vs SSE' },
      { at: 15, text: '離線消息存儲？已讀回執？群組消息扇出？' },
      { at: 5, text: 'Message ordering？Media 上傳？Push notification？' },
    ],
    checklist: [
      '連接方案 (WebSocket + fallback)',
      '消息存儲 (Cassandra / HBase)',
      '消息 ID 同排序',
      '群組消息扇出策略',
      '離線消息同 Push Notification',
      '已讀回執',
      '媒體文件上傳 (Object Storage)',
      'Rate Limiting 同 Spam 防護',
    ],
  },
  'payment-system': {
    title: 'Payment System 支付系統',
    prompt: '設計一個電商平台嘅支付系統，支援多種支付方式，每日處理 100 萬筆交易。',
    hints: [
      { at: 25, text: '考慮 idempotency key 確保唔會重複扣款' },
      { at: 15, text: '支付狀態機？Webhook callback？Reconciliation？' },
      { at: 5, text: '退款流程？Ledger 設計？PCI compliance？' },
    ],
    checklist: [
      'Payment 狀態機設計',
      'Idempotency Key',
      '第三方支付 Gateway 整合',
      'Webhook 同 callback 處理',
      'Ledger / 賬本設計',
      '退款流程',
      'Reconciliation 對賬',
      'PCI DSS compliance',
    ],
  },
  'news-feed': {
    title: 'News Feed 動態消息',
    prompt: '設計一個類似 Facebook / Instagram 嘅 News Feed 系統，支援 5 億用戶。',
    hints: [
      { at: 25, text: 'Fan-out on write vs Fan-out on read？' },
      { at: 15, text: 'Ranking algorithm？Cache 策略？Pagination？' },
      { at: 5, text: 'Celebrity problem？Real-time updates？' },
    ],
    checklist: [
      'Feed 生成方案 (Fan-out)',
      'Feed 存儲 (Redis list / Cassandra)',
      'Ranking / 排序演算法',
      'Cache 策略 (多層)',
      'Celebrity / 大 V 問題',
      'Pagination (Cursor-based)',
      'Real-time 更新 (Long polling)',
      'Media 處理同 CDN',
    ],
  },
};

function MockDesignInteractive() {
  const TOTAL_SECONDS = 35 * 60;
  const [selectedTopic, setSelectedTopic] = useState('');
  const [currentTopic, setCurrentTopic] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(TOTAL_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [hintsShown, setHintsShown] = useState([false, false, false]);
  const [showReference, setShowReference] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [notepad, setNotepad] = useState('');
  const intervalRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const endSession = useCallback(() => {
    stopTimer();
    setIsRunning(false);
    setIsEnded(true);
    setIsPaused(false);
    setShowReference(true);
  }, [stopTimer]);

  useEffect(() => {
    if (isRunning && !isPaused && !isEnded) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            endSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => stopTimer();
  }, [isRunning, isPaused, isEnded, endSession, stopTimer]);

  useEffect(() => {
    if (!currentTopic) return;
    const minutesLeft = remainingSeconds / 60;
    setHintsShown(prev => {
      const next = [...prev];
      currentTopic.hints.forEach((h, i) => {
        if (!next[i] && minutesLeft <= h.at) next[i] = true;
      });
      return next;
    });
  }, [remainingSeconds, currentTopic]);

  const handleStart = () => {
    if (!selectedTopic || !mockDesigns[selectedTopic]) return;
    const topic = mockDesigns[selectedTopic];
    setCurrentTopic(topic);
    setRemainingSeconds(TOTAL_SECONDS);
    setIsPaused(false);
    setIsRunning(true);
    setIsEnded(false);
    setHintsShown([false, false, false]);
    setShowReference(false);
    setCheckedItems({});
    setNotepad('');
  };

  const handlePauseResume = () => setIsPaused(p => !p);

  const handleShowAnswer = () => {
    if (!currentTopic) return;
    if (!window.confirm('確定要提前睇參考答案？計時會停止。')) return;
    setHintsShown([true, true, true]);
    endSession();
  };

  const handleReset = () => {
    stopTimer();
    setCurrentTopic(null);
    setSelectedTopic('');
    setRemainingSeconds(TOTAL_SECONDS);
    setIsPaused(false);
    setIsRunning(false);
    setIsEnded(false);
    setHintsShown([false, false, false]);
    setShowReference(false);
    setCheckedItems({});
    setNotepad('');
  };

  const toggleCheck = (i) => {
    setCheckedItems(prev => ({ ...prev, [i]: !prev[i] }));
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  };

  const timerClass = remainingSeconds <= 300 ? 'timer-display danger' : remainingSeconds <= 600 ? 'timer-display warning' : 'timer-display';
  const statusText = isEnded ? '時間到' : isPaused ? '已暫停' : '進行中';
  const statusClass = isEnded ? 'status-badge ended' : isPaused ? 'status-badge paused' : 'status-badge running';

  const checkedCount = currentTopic ? Object.values(checkedItems).filter(Boolean).length : 0;
  const totalCount = currentTopic ? currentTopic.checklist.length : 0;
  const scorePct = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  return (
    <>
      {/* Setup Card */}
      <div className="card">
        <h2>選擇設計題目</h2>
        <div className="subtitle">揀一個題目，開始計時挑戰</div>
        <div className="controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <select
            className="select-topic"
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            disabled={isRunning}
            style={{ background: '#13151c', color: '#e0e0e0', border: '1px solid #2a2d3a', borderRadius: '10px', padding: '12px 16px', fontSize: '0.95rem', fontFamily: 'inherit', cursor: 'pointer', minWidth: '260px' }}
          >
            <option value="" disabled>-- 揀一個設計題目 --</option>
            <option value="url-shortener">URL Shortener 短網址服務</option>
            <option value="chat-system">Chat System 即時通訊</option>
            <option value="payment-system">Payment System 支付系統</option>
            <option value="news-feed">News Feed 動態消息</option>
          </select>
          <button className="btn btn-primary" onClick={handleStart} disabled={!selectedTopic || isRunning} style={{ padding: '12px 24px', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', background: '#6366f1', color: '#fff' }}>
            開始計時
          </button>
        </div>
      </div>

      {/* Timer */}
      {isRunning && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className={timerClass} style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace", fontSize: '3.5rem', fontWeight: '700', color: remainingSeconds <= 300 ? '#f87171' : remainingSeconds <= 600 ? '#fbbf24' : '#6366f1', letterSpacing: '4px' }}>
            {formatTime(remainingSeconds)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center', marginTop: '4px' }}>
            剩餘時間<span className={statusClass} style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', marginLeft: '12px' }}>{statusText}</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
            <button onClick={handlePauseResume} disabled={isEnded} style={{ padding: '12px 24px', border: '1px solid #2a2d3a', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', background: '#13151c', color: '#c0c4cc' }}>
              {isPaused ? '繼續' : '暫停'}
            </button>
            <button onClick={handleShowAnswer} disabled={isEnded} style={{ padding: '12px 24px', border: '1px solid #2a2d3a', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', background: '#13151c', color: '#c0c4cc' }}>
              提前睇答案
            </button>
            <button onClick={handleReset} style={{ padding: '12px 24px', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
              重新開始
            </button>
          </div>
        </div>
      )}

      {/* Prompt */}
      {currentTopic && (
        <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))', borderLeft: '4px solid #6366f1', borderRadius: '0 12px 12px 0', padding: '24px 28px', marginBottom: '24px' }}>
          <h3 style={{ color: '#a5b4fc', fontSize: '1.1rem', marginBottom: '10px' }}>{currentTopic.title}</h3>
          <div style={{ fontSize: '1.05rem', color: '#e0e0e0', lineHeight: '1.8', fontWeight: '500' }}>{currentTopic.prompt}</div>
        </div>
      )}

      {/* Hints */}
      {currentTopic && currentTopic.hints.map((h, i) => (
        hintsShown[i] && (
          <div key={i} style={{ background: '#13151c', borderRadius: '12px', padding: '18px 22px', marginBottom: '12px', border: '1px solid #2a2d3a', borderLeft: '3px solid #fbbf24' }}>
            <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: '600', marginBottom: '6px', fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>提示 — 剩餘 {h.at} 分鐘</div>
            <div style={{ fontSize: '0.92rem', color: '#c0c4cc', lineHeight: '1.7' }}>{h.text}</div>
          </div>
        )
      ))}

      {/* Notepad */}
      {currentTopic && (
        <div className="card">
          <h2>設計筆記</h2>
          <div className="subtitle">寫低你嘅設計思路、架構、trade-off</div>
          <textarea
            value={notepad}
            onChange={e => setNotepad(e.target.value)}
            placeholder={`喺度寫低你嘅設計方案...\n\n建議結構：\n1. 需求分析 (Functional / Non-functional)\n2. 容量估算 (QPS / Storage / Bandwidth)\n3. API 設計\n4. 數據模型\n5. 高層架構圖\n6. 深入設計重點組件\n7. 擴展性 / 監控 / 告警`}
            style={{ width: '100%', minHeight: '320px', background: '#13151c', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '20px', fontSize: '0.92rem', fontFamily: "'JetBrains Mono', 'Courier New', monospace", color: '#e0e0e0', lineHeight: '1.8', resize: 'vertical' }}
          />
        </div>
      )}

      {/* Reference */}
      {showReference && currentTopic && (
        <div className="card">
          <h2>參考答案 Checklist</h2>
          <div className="subtitle">睇下你涵蓋咗幾多重點</div>
          <ul className="checklist" style={{ listStyle: 'none', padding: 0 }}>
            {currentTopic.checklist.map((item, i) => (
              <li key={i} onClick={() => toggleCheck(i)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #2a2d3a', fontSize: '0.95rem', color: checkedItems[i] ? '#6366f1' : '#c0c4cc', lineHeight: '1.6', cursor: 'pointer', textDecoration: checkedItems[i] ? 'line-through' : 'none' }}>
                <input type="checkbox" checked={!!checkedItems[i]} onChange={() => toggleCheck(i)} style={{ width: '22px', height: '22px', flexShrink: 0, cursor: 'pointer', accentColor: '#6366f1' }} />
                <label style={{ cursor: 'pointer' }}>{item}</label>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '8px', background: '#13151c', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #a5b4fc)', borderRadius: '4px', transition: 'width 0.4s ease', width: `${scorePct}%` }} />
            </div>
            <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontFamily: "'JetBrains Mono', 'Courier New', monospace", minWidth: '48px', textAlign: 'right' }}>
              {checkedCount} / {totalCount}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OverviewTab() {
  return <MockDesignInteractive />;
}

export default function MockDesign() {
  return (
    <>
      <TopicTabs
        title="Mock Design Interview 模擬設計面試"
        subtitle="限時 35 分鐘，挑戰真實系統設計面試場景"
        tabs={[
          { id: 'mock', label: '① 模擬面試', content: <OverviewTab /> },
        ]}
      />
      <div className="topic-container">
        <QuizRenderer data={quizData} />
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
