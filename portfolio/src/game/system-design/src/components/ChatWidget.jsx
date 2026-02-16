import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium, TIER_LIMITS } from '../context/PremiumContext';
import GoogleSignInButton from './GoogleSignInButton';
import topicData from '../data/topics.json';
import { API_BASE, STRIPE_URL } from '../config/constants';

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s<>"')\]]+)/g;
  return escapeHtml(text).replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#818cf8;text-decoration:underline;word-break:break-all;">${url}</a>`;
  });
}

// Daily usage tracking in localStorage
const USAGE_KEY = 'sd_chat_usage';

function getDailyUsage() {
  try {
    const stored = JSON.parse(localStorage.getItem(USAGE_KEY));
    const today = new Date().toDateString();
    if (stored?.date === today) return stored;
    return { date: today, search: 0, viber: 0, suggest: 0 };
  } catch {
    return { date: new Date().toDateString(), search: 0, viber: 0, suggest: 0 };
  }
}

function incrementUsage(mode) {
  const usage = getDailyUsage();
  usage[mode] = (usage[mode] || 0) + 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  return usage;
}

export default function ChatWidget({ currentTopicSlug, currentTopicTitle }) {
  const { user, token, signOut } = useAuth();
  const { tier } = usePremium();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('search');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [usage, setUsage] = useState(getDailyUsage);
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

  const isLoggedIn = !!user;
  const dailyLimit = TIER_LIMITS[tier] || TIER_LIMITS.free;

  // History keys per mode
  const historyKey = `sa-chat-history-${mode}`;

  // Load history when mode changes
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(historyKey) || '[]');
      setMessages(stored);
    } catch {
      setMessages([]);
    }
  }, [historyKey]);

  // Save history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(historyKey, JSON.stringify(messages));
      } catch {}
    }
  }, [messages, historyKey]);

  // Scroll to bottom
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Refresh usage on open
  useEffect(() => {
    if (isOpen) setUsage(getDailyUsage());
  }, [isOpen]);

  const addMsg = (content, type) => {
    setMessages((prev) => [...prev, { content, type, ts: Date.now() }]);
  };

  const getUsed = (m) => usage[m] || 0;
  const getRemaining = (m) => Math.max(0, dailyLimit - getUsed(m));

  const handleSend = async () => {
    if (!token) {
      addMsg('請先登入 Google 帳號。', 'error');
      return;
    }
    const value = input.trim();
    if (!value) return;

    if (mode === 'viber' && !selectedTopic) {
      addMsg('請先揀一個課題作為 Prompt 模板。', 'error');
      return;
    }

    // Check client-side daily limit
    if (getRemaining(mode) <= 0) {
      addMsg(`今日 ${mode === 'search' ? '搜尋' : mode === 'viber' ? 'Prompt 生成' : '建議'} 次數已用完（${dailyLimit}/${dailyLimit}）。`, 'error');
      return;
    }

    setInput('');
    setSending(true);
    addMsg(value, 'user');

    let reqBody;
    if (mode === 'search') {
      reqBody = { mode: 'search', query: value };
    } else if (mode === 'suggest') {
      reqBody = { mode: 'suggest', suggestion: value };
    } else {
      reqBody = { mode: 'viber', text: value, topicUrl: selectedTopic };
    }

    if (currentTopicSlug) {
      reqBody.topicContext = `topics/${currentTopicSlug}.html`;
      reqBody.topicTitle = currentTopicTitle;
    }

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(reqBody),
      });

      if (res.status === 401) {
        addMsg('登入已失效，請重新登入。', 'error');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          addMsg('呢個課題暫時未有 AI Viber Prompt，可以試其他課題。', 'error');
        } else {
          addMsg(data.error || '出現錯誤', 'error');
        }
        return;
      }

      // Track usage on success
      setUsage(incrementUsage(mode));

      if (mode === 'search') {
        addMsg(JSON.stringify({ type: 'search-results', results: data.results || [] }), 'search');
      } else if (mode === 'suggest') {
        const remaining = data.monthRemaining ?? '?';
        addMsg(`多謝你嘅建議！我會盡快睇下可唔可以加入。今個月仲可以建議 ${remaining} 次。`, 'bot');
      } else {
        addMsg(JSON.stringify({ type: 'viber', generated: data.generated || '無回應' }), 'viber');
      }
    } catch {
      addMsg('網絡錯誤，請稍後再試。', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem('sa-chat-history-search');
    localStorage.removeItem('sa-chat-history-viber');
    localStorage.removeItem('sa-chat-history-suggest');
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Group topics for dropdown
  const topicGroups = topicData.categories
    .map((cat) => ({
      label: cat.label,
      items: topicData.topics.filter((t) => t.category === cat.id && !t.disabled),
    }))
    .filter((g) => g.items.length > 0);

  const placeholders = {
    search: '輸入關鍵字搜尋課題...',
    viber: '描述具體需求，例如「電商平台嘅支付系統」...',
    suggest: '你想學咩課題？例如「Kubernetes 入門」...',
  };

  const modes = [
    { id: 'search', icon: '🔍', label: '搜尋課題' },
    { id: 'viber', icon: '✍️', label: 'Prompt 生成器' },
    { id: 'suggest', icon: '💡', label: '建議課題' },
  ];

  return (
    <>
      {/* FAB */}
      <button
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent-indigo text-white text-2xl border-none cursor-pointer z-50 shadow-lg transition-all hover:bg-accent-indigo-hover ${
          isOpen ? 'scale-0 rotate-90' : 'scale-100'
        }`}
        onClick={() => setIsOpen(true)}
        aria-label="AI 助手"
      >
        🤖
      </button>

      {/* Panel — full screen on mobile, floating on desktop */}
      <div
        className={`fixed z-50 flex flex-col overflow-hidden transition-all duration-200
          bottom-0 right-0 left-0 top-0
          sm:bottom-6 sm:right-6 sm:left-auto sm:top-auto
          sm:w-[400px] sm:max-h-[560px] sm:rounded-2xl
          bg-bg-secondary sm:border sm:border-border sm:shadow-2xl
          ${isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-5 pointer-events-none sm:translate-y-5'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-primary">
          <span className="text-sm font-medium text-text-primary">🤖 AI 助手</span>
          <div className="flex items-center gap-1">
            {isLoggedIn && (
              <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-white/[0.06] text-text-dimmer mr-1">
                {tier === 'pro' ? 'Pro' : tier === 'standard' ? 'Standard' : 'Free'}
              </span>
            )}
            {isLoggedIn && (
              <button
                className="w-8 h-8 rounded-md border-none bg-transparent text-text-dimmer hover:text-text-primary hover:bg-white/5 cursor-pointer text-[0.65rem]"
                onClick={signOut}
                title="登出"
              >
                登出
              </button>
            )}
            <button
              className="w-8 h-8 rounded-md border-none bg-transparent text-text-dimmer hover:text-text-primary hover:bg-white/5 cursor-pointer text-sm"
              onClick={handleClearHistory}
              title="清除對話"
            >
              🗑
            </button>
            <button
              className="w-8 h-8 rounded-md border-none bg-transparent text-text-dimmer hover:text-text-primary hover:bg-white/5 cursor-pointer text-base"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>

        {!isLoggedIn ? (
          /* Welcome / Login */
          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-5">
              <h3 className="text-base font-bold text-text-primary mb-1">AI 助手功能</h3>
              <p className="text-sm text-text-dim leading-relaxed">
                專為系統架構教室設計嘅 AI 工具，幫手更有效率咁學習同實踐。
              </p>
            </div>

            <div className="flex flex-col gap-2.5 mb-5">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary">
                <span className="text-xl">🔍</span>
                <div>
                  <div className="text-sm font-medium text-text-secondary">智能搜尋</div>
                  <div className="text-xs text-text-dimmer">關鍵字搵課題，直接跳轉</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary">
                <span className="text-xl">✍️</span>
                <div>
                  <div className="text-sm font-medium text-text-secondary">Prompt 生成器</div>
                  <div className="text-xs text-text-dimmer">AI Viber 模板，一鍵生成</div>
                </div>
              </div>
            </div>

            {/* Tier comparison */}
            <div className="mb-5 p-3 rounded-lg bg-white/[0.03] border border-border">
              <div className="text-xs font-semibold text-text-dimmer uppercase tracking-wider mb-2">每日 AI 用量</div>
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between text-text-dim">
                  <span>🆓 Free</span><span className="text-text-muted">{TIER_LIMITS.free} 次/日</span>
                </div>
                <div className="flex justify-between text-text-dim">
                  <span>🔓 Standard (<span className="line-through text-text-dimmer">$750</span> HK$150)</span><span className="text-accent-indigo-light">{TIER_LIMITS.standard} 次/日</span>
                </div>
                <div className="flex justify-between text-text-dim">
                  <span>⚡ Pro (<span className="line-through text-text-dimmer">$1,999</span> HK$399)</span><span className="text-amber-400">{TIER_LIMITS.pro} 次/日</span>
                </div>
              </div>
            </div>

            <a
              href={STRIPE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-accent-indigo/10 border border-accent-indigo/30 text-text-primary no-underline mb-5 hover:bg-accent-indigo/20 transition-colors"
            >
              <span>🔓</span>
              <div className="flex-1">
                <div className="text-sm font-bold">早鳥價 80% OFF · 鎖定永久存取</div>
                <div className="text-xs text-text-dim"><span className="line-through">$750</span> HK$150 · <span className="line-through">$1,999</span> HK$399</div>
              </div>
              <span className="text-text-dim">&rarr;</span>
            </a>

            <GoogleSignInButton />
          </div>
        ) : (
          /* Main chat view */
          <>
            {/* User info */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
              )}
              <span className="text-sm text-text-dim truncate flex-1">{user.displayName || user.email}</span>
            </div>

            {/* Mode buttons with usage counts */}
            <div className="flex gap-1.5 px-3 pt-3 pb-1">
              {modes.map((m) => {
                const used = getUsed(m.id);
                const remaining = dailyLimit - used;
                return (
                  <button
                    key={m.id}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-lg border text-center cursor-pointer transition-all ${
                      mode === m.id
                        ? 'bg-accent-indigo/15 border-accent-indigo text-accent-indigo-light'
                        : 'bg-transparent border-border text-text-dimmer hover:border-border-hover'
                    }`}
                    onClick={() => setMode(m.id)}
                  >
                    <span className="text-base">{m.icon}</span>
                    <span className="text-xs font-medium leading-tight">{m.label}</span>
                    <span className={`text-[0.6rem] mt-0.5 ${remaining <= 0 ? 'text-accent-red' : 'text-text-darkest'}`}>
                      {remaining}/{dailyLimit}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Topic picker for viber mode */}
            {mode === 'viber' && (
              <div className="px-3 py-2 border-b border-border">
                <label className="block text-xs text-text-dimmer mb-1">
                  揀一個課題作為 Prompt 模板：
                </label>
                <select
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm outline-none focus:border-accent-indigo cursor-pointer"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                >
                  <option value="">-- 請揀課題 --</option>
                  {topicGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map((t) => (
                        <option key={t.slug} value={`topics/${t.slug}.html`}>
                          {t.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {/* Messages */}
            <div ref={messagesRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
              {messages.map((msg, i) => {
                if (msg.type === 'user') {
                  return (
                    <div key={i} className="self-end max-w-[80%] px-3 py-2.5 rounded-xl bg-accent-indigo text-white text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  );
                }
                if (msg.type === 'error') {
                  return (
                    <div key={i} className="self-start max-w-[85%] px-3 py-2.5 rounded-xl bg-bg-tertiary text-accent-red text-sm leading-relaxed border border-accent-red/20">
                      {msg.content}
                    </div>
                  );
                }
                if (msg.type === 'search') {
                  try {
                    const data = JSON.parse(msg.content);
                    const results = data.results || [];
                    if (results.length === 0) {
                      return (
                        <div key={i} className="self-start max-w-[85%] px-3 py-2.5 rounded-xl bg-bg-tertiary text-text-muted text-sm">
                          搵唔到相關課題，試下用其他關鍵字。
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="self-start w-full flex flex-col gap-1.5">
                        {results.map((r, ri) => (
                          <a
                            key={ri}
                            href={`#/topic/${(r.url || '').replace('topics/', '').replace('.html', '')}`}
                            className="block px-3 py-2.5 rounded-lg bg-bg-tertiary border border-border hover:border-accent-indigo/50 transition-colors no-underline"
                          >
                            <div className="text-sm font-medium text-text-primary">{r.h1 || r.title}</div>
                            {r.description && <div className="text-xs text-text-dim mt-0.5">{r.description}</div>}
                            <div className="text-[0.68rem] text-text-dimmer mt-1">{r.category}{r.prompts?.length > 0 ? ' · AI Viber' : ''}</div>
                          </a>
                        ))}
                      </div>
                    );
                  } catch {
                    return null;
                  }
                }
                if (msg.type === 'viber') {
                  try {
                    const data = JSON.parse(msg.content);
                    return (
                      <div key={i} className="self-start w-full">
                        <div className="px-3 py-2.5 rounded-lg bg-bg-tertiary border border-border text-sm text-text-muted leading-relaxed whitespace-pre-wrap max-h-[280px] overflow-y-auto">
                          {data.generated}
                        </div>
                        <button
                          className="mt-1.5 px-3 py-1.5 rounded-md bg-accent-indigo text-white text-xs border-none cursor-pointer hover:bg-accent-indigo-hover transition-colors"
                          onClick={() => handleCopy(data.generated)}
                        >
                          📋 複製 Prompt
                        </button>
                      </div>
                    );
                  } catch {
                    return null;
                  }
                }
                // bot
                return (
                  <div
                    key={i}
                    className="self-start max-w-[85%] px-3 py-2.5 rounded-xl bg-bg-tertiary text-text-muted text-sm leading-relaxed"
                    // Safe: escapeHtml() sanitises content before linkify() inserts <a> tags
                    dangerouslySetInnerHTML={{ __html: linkify(msg.content) }}
                  />
                );
              })}
              {sending && (
                <div className="text-sm text-text-dimmer">
                  <span className="animate-pulse">...</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2 px-3 py-3 border-t border-border bg-bg-secondary">
              <textarea
                ref={textareaRef}
                className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm outline-none resize-none min-h-[42px] max-h-[100px] leading-relaxed focus:border-accent-indigo placeholder:text-text-darkest"
                rows={1}
                placeholder={placeholders[mode]}
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
                className="w-[42px] h-[42px] rounded-lg border-none bg-accent-indigo text-white text-lg cursor-pointer flex-shrink-0 flex items-center justify-center hover:bg-accent-indigo-hover transition-colors disabled:opacity-40"
                onClick={handleSend}
                disabled={sending}
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
