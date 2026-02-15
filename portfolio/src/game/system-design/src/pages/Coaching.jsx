import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import AuthGate from '../components/AuthGate';
import topicData from '../data/topics.json';
import coachingPrompts from '../data/coachingPrompts';
import { API_BASE } from '../config/constants';
const TRIAL_KEY = 'sd_coaching_trial_topic';

function coachingHistoryKey(slug) {
  return `sd_coaching_${slug}`;
}

function getTrialTopic() {
  return localStorage.getItem(TRIAL_KEY) || null;
}

export default function Coaching() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { isPremium } = usePremium();
  const [selectedSlug, setSelectedSlug] = useState(slug || '');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState('select'); // select | coaching
  const [showAuthGate, setShowAuthGate] = useState(false);
  const messagesRef = useRef(null);

  const topic = topicData.topics.find((t) => t.slug === selectedSlug);
  const trialTopic = getTrialTopic();

  // Load coaching history
  useEffect(() => {
    if (selectedSlug) {
      try {
        const saved = JSON.parse(localStorage.getItem(coachingHistoryKey(selectedSlug)) || '[]');
        setMessages(saved);
        setPhase('coaching');
      } catch {
        setMessages([]);
        setPhase('coaching');
      }
    }
  }, [selectedSlug]);

  // Save history
  useEffect(() => {
    if (selectedSlug && messages.length > 0) {
      try {
        localStorage.setItem(coachingHistoryKey(selectedSlug), JSON.stringify(messages));
      } catch {}
    }
  }, [messages, selectedSlug]);

  // Scroll to bottom
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const canAccessTopic = (topicSlug) => {
    if (isPremium) return true;
    // First topic is free trial
    if (!trialTopic) return true; // no trial used yet
    return trialTopic === topicSlug;
  };

  const startCoaching = (topicSlug) => {
    // Check login
    if (!user) {
      setShowAuthGate(true);
      return;
    }

    // Check free trial / premium
    if (!canAccessTopic(topicSlug)) {
      setShowAuthGate(true);
      return;
    }

    // If this is first topic usage, store as trial
    if (!trialTopic && !isPremium) {
      localStorage.setItem(TRIAL_KEY, topicSlug);
    }

    setSelectedSlug(topicSlug);
    navigate(`/coaching/${topicSlug}`, { replace: true });

    const t = topicData.topics.find((tp) => tp.slug === topicSlug);
    if (t) {
      const intro = {
        role: 'coach',
        content: `歡迎來到「${t.title}」嘅教練模式！🎓\n\n我會用呢個流程幫你深入理解：\n1. 先解釋核心概念\n2. 問你幾個問題測試理解\n3. 深入探討進階內容\n4. 實踐練習\n\n準備好就話我知，或者直接問你想了解嘅部分！`,
        ts: Date.now(),
      };
      setMessages([intro]);
    }
  };

  const handleSend = async () => {
    if (!token) {
      setMessages((prev) => [...prev, {
        role: 'coach',
        content: '請先登入 Google 帳號先可以使用教練模式。',
        ts: Date.now(),
      }]);
      return;
    }

    const value = input.trim();
    if (!value) return;

    setInput('');
    setSending(true);

    const userMsg = { role: 'user', content: value, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    const defaultPrompt = `你係一個系統設計教練，專門教「${topic?.title}」。用廣東話教學。
教學流程：先解釋 → 測試理解 → 深入探討 → 實踐練習。
保持互動，每次回應後問一個跟進問題。
回應要簡潔但有深度，用實際例子說明。`;
    const systemPrompt = coachingPrompts[selectedSlug] || defaultPrompt;

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'search',
          query: `${systemPrompt}\n\n學生問題：${value}`,
          topicContext: `topics/${selectedSlug}.html`,
          topicTitle: topic?.title,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, {
          role: 'coach',
          content: data.error || '出現錯誤，請稍後再試。',
          ts: Date.now(),
        }]);
        return;
      }

      const data = await res.json();
      const response = data.results?.[0]?.description || data.answer || '未能回應，請重試。';
      setMessages((prev) => [...prev, {
        role: 'coach',
        content: response,
        ts: Date.now(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'coach',
        content: '網絡錯誤，請稍後再試。',
        ts: Date.now(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(coachingHistoryKey(selectedSlug));
    setMessages([]);
    startCoaching(selectedSlug);
  };

  // Topic selection view
  if (phase === 'select' || !selectedSlug) {
    const categories = topicData.categories.filter((c) => c.id !== 'resource');
    return (
      <div className="h-full overflow-auto">
        {showAuthGate && (
          <AuthGate
            onDismiss={() => setShowAuthGate(false)}
            requirePremium={!!user && !isPremium}
            featureName="AI 教練模式"
          />
        )}
        <div className="topic-container">
          <header className="topic-header">
            <h1>🎓 AI 教練模式</h1>
            <p>揀一個課題，開始深入嘅 1 對 1 教學</p>
          </header>

          {categories.map((cat) => {
            const catTopics = topicData.topics.filter(
              (t) => t.category === cat.id && !t.disabled
            );
            if (catTopics.length === 0) return null;
            return (
              <div key={cat.id} className="mb-6">
                <h3
                  className="text-sm font-semibold mb-3 uppercase tracking-wider"
                  style={{ color: cat.color || '#6b7280' }}
                >
                  {cat.label}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {catTopics.map((t) => {
                    const isTrial = trialTopic === t.slug;
                    return (
                      <button
                        key={t.slug}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-dim hover:text-text-primary hover:border-accent-indigo/50 transition-all text-sm relative"
                        onClick={() => startCoaching(t.slug)}
                      >
                        <span>{t.icon}</span>
                        <span>{t.title}</span>
                        {isTrial && (
                          <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-accent-green/15 text-accent-green-light">
                            免費試用
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Coaching session view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-primary">
        <button
          onClick={() => { setPhase('select'); setSelectedSlug(''); navigate('/coaching'); }}
          className="text-text-dim hover:text-text-primary transition-colors"
        >
          ← 返回
        </button>
        <div className="flex-1">
          <span className="text-sm font-medium text-text-primary">
            🎓 {topic?.title}
          </span>
          <span className="text-xs text-text-dimmer ml-2">教練模式</span>
          {trialTopic === selectedSlug && !isPremium && (
            <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-accent-green/15 text-accent-green-light ml-2">
              免費試用
            </span>
          )}
        </div>
        <button
          onClick={clearHistory}
          className="text-xs text-text-dimmer hover:text-text-primary transition-colors"
        >
          🗑 清除
        </button>
        <button
          onClick={() => navigate(`/topic/${selectedSlug}`)}
          className="text-xs text-accent-indigo-light hover:text-accent-indigo transition-colors"
        >
          📖 課題頁
        </button>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[85%] px-4 py-3 rounded-xl text-[0.88rem] leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'self-end bg-accent-indigo text-white'
                : 'self-start bg-bg-secondary border border-border text-text-muted'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {sending && (
          <div className="self-start text-text-dimmer text-sm animate-pulse">思考中...</div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 px-4 py-3 border-t border-border bg-bg-primary">
        <textarea
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-secondary text-[0.88rem] outline-none resize-none min-h-[40px] max-h-[100px] leading-relaxed focus:border-accent-indigo placeholder:text-text-darkest"
          rows={1}
          placeholder="問教練任何關於呢個課題嘅問題..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          className="w-10 h-10 rounded-lg border-none bg-accent-indigo text-white text-base cursor-pointer flex-shrink-0 flex items-center justify-center hover:bg-accent-indigo-hover transition-colors disabled:opacity-40"
          onClick={handleSend}
          disabled={sending}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
