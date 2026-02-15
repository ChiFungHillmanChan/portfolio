import { useState, useRef, useEffect, useCallback } from 'react';
import topicData from '../data/topics.json';

const API_BASE = 'https://api.system-design.hillmanchan.com';
const TOKEN_KEY = 'sa-chat-token';
const STRIPE_URL = 'https://buy.stripe.com/6oU7sF6V20nA5Nhcip3Nm05';

function decodePayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const body = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(body));
  } catch {
    return null;
  }
}

function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const p = decodePayload(token);
  if (!p) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  if (p.exp && p.exp < Date.now() / 1000) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

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

export default function ChatWidget({ currentTopicSlug, currentTopicTitle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());
  const [mode, setMode] = useState('search');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

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

  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setIsLoggedIn(false);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !code.trim()) {
      setLoginError('請填寫電郵同存取碼');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || '登入失敗');
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      setIsLoggedIn(true);
    } catch {
      setLoginError('網絡錯誤，請稍後再試');
    } finally {
      setLoginLoading(false);
    }
  };

  const addMsg = (content, type) => {
    setMessages((prev) => [...prev, { content, type, ts: Date.now() }]);
  };

  const handleSend = async () => {
    const token = getToken();
    if (!token) {
      clearToken();
      return;
    }
    const value = input.trim();
    if (!value) return;

    if (mode === 'viber' && !selectedTopic) {
      addMsg('請先揀一個課題作為 Prompt 模板。', 'error');
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reqBody),
      });

      if (res.status === 401) {
        clearToken();
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

      {/* Panel */}
      <div
        className={`fixed bottom-6 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[380px] max-h-[80vh] sm:max-h-[540px] bg-bg-secondary rounded-2xl border border-border shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-200 ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-5 pointer-events-none'
        } max-[768px]:bottom-0 max-[768px]:right-0 max-[768px]:left-0 max-[768px]:w-full max-[768px]:max-h-[80vh] max-[768px]:rounded-b-none`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-primary">
          <span className="text-sm font-medium text-text-primary">🤖 AI 助手</span>
          <div className="flex gap-1">
            <button
              className="w-7 h-7 rounded-md border-none bg-transparent text-text-dimmer hover:text-text-primary hover:bg-white/5 cursor-pointer text-xs"
              onClick={handleClearHistory}
              title="清除對話"
            >
              🗑
            </button>
            <button
              className="w-7 h-7 rounded-md border-none bg-transparent text-text-dimmer hover:text-text-primary hover:bg-white/5 cursor-pointer text-sm"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>

        {!isLoggedIn ? (
          /* Welcome / Login */
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-text-primary mb-1">AI 助手功能</h3>
              <p className="text-xs text-text-dim leading-relaxed">
                專為系統架構教室設計嘅 AI 工具，幫手更有效率咁學習同實踐。
              </p>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-bg-tertiary">
                <span className="text-base">🔍</span>
                <div>
                  <div className="text-xs font-medium text-text-secondary">智能搜尋</div>
                  <div className="text-[0.68rem] text-text-dimmer">關鍵字搵課題，直接跳轉</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-bg-tertiary">
                <span className="text-base">✍️</span>
                <div>
                  <div className="text-xs font-medium text-text-secondary">Prompt 生成器</div>
                  <div className="text-[0.68rem] text-text-dimmer">AI Viber 模板，一鍵生成</div>
                </div>
              </div>
            </div>

            <a
              href={STRIPE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-accent-indigo/10 border border-accent-indigo/30 text-text-primary no-underline mb-4 hover:bg-accent-indigo/20 transition-colors"
            >
              <span>🔓</span>
              <div className="flex-1">
                <div className="text-xs font-bold">HK$150 一次性解鎖 AI 功能</div>
                <div className="text-[0.68rem] text-text-dim">付款後即時收到電郵同永久存取碼</div>
              </div>
              <span className="text-text-dim">→</span>
            </a>

            <div className="text-center text-[0.7rem] text-text-dimmer mb-3">
              已有存取碼？登入
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="電郵地址"
                className="px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-secondary text-xs outline-none focus:border-accent-indigo placeholder:text-text-darkest"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="text"
                placeholder="存取碼（例如 SA2026-XXXX）"
                className="px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-secondary text-xs outline-none focus:border-accent-indigo placeholder:text-text-darkest"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              {loginError && (
                <div className="text-accent-red text-[0.7rem]">{loginError}</div>
              )}
              <button
                className="px-4 py-2 rounded-lg bg-accent-indigo text-white text-xs font-medium border-none cursor-pointer hover:bg-accent-indigo-hover transition-colors disabled:opacity-50"
                onClick={handleLogin}
                disabled={loginLoading}
              >
                {loginLoading ? '登入中...' : '登入'}
              </button>
            </div>
          </div>
        ) : (
          /* Main chat view */
          <>
            {/* Mode buttons */}
            <div className="flex gap-1 px-3 pt-3">
              {[
                { id: 'search', icon: '🔍', label: '搜尋課題', desc: '搵相關課題' },
                { id: 'viber', icon: '✍️', label: 'Prompt 生成器', desc: 'AI Viber Prompt' },
                { id: 'suggest', icon: '💡', label: '建議課題', desc: '想學咩話我知' },
              ].map((m) => (
                <button
                  key={m.id}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-center cursor-pointer transition-all ${
                    mode === m.id
                      ? 'bg-accent-indigo/15 border-accent-indigo text-accent-indigo-light'
                      : 'bg-transparent border-border text-text-dimmer hover:border-border-hover'
                  }`}
                  onClick={() => setMode(m.id)}
                >
                  <span className="text-sm">{m.icon}</span>
                  <span className="text-[0.68rem] font-medium">{m.label}</span>
                </button>
              ))}
            </div>

            {/* Topic picker for viber mode */}
            {mode === 'viber' && (
              <div className="px-3 py-2 border-b border-border">
                <label className="block text-[0.72rem] text-text-dimmer mb-1">
                  揀一個課題作為 Prompt 模板：
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-secondary text-[0.82rem] outline-none focus:border-accent-indigo cursor-pointer"
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
            <div ref={messagesRef} className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
              {messages.map((msg, i) => {
                if (msg.type === 'user') {
                  return (
                    <div key={i} className="self-end max-w-[80%] px-3 py-2 rounded-xl bg-accent-indigo text-white text-[0.84rem] leading-relaxed">
                      {msg.content}
                    </div>
                  );
                }
                if (msg.type === 'error') {
                  return (
                    <div key={i} className="self-start max-w-[85%] px-3 py-2 rounded-xl bg-bg-tertiary text-accent-red text-[0.84rem] leading-relaxed border border-accent-red/20">
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
                        <div key={i} className="self-start max-w-[85%] px-3 py-2 rounded-xl bg-bg-tertiary text-text-muted text-[0.84rem]">
                          搵唔到相關課題，試下用其他關鍵字。
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="self-start w-full flex flex-col gap-1">
                        {results.map((r, ri) => (
                          <a
                            key={ri}
                            href={`#/topic/${(r.url || '').replace('topics/', '').replace('.html', '')}`}
                            className="block px-3 py-2 rounded-lg bg-bg-tertiary border border-border hover:border-accent-indigo/50 transition-colors no-underline"
                          >
                            <div className="text-xs font-medium text-text-primary">{r.h1 || r.title}</div>
                            {r.description && <div className="text-[0.7rem] text-text-dim mt-0.5">{r.description}</div>}
                            <div className="text-[0.65rem] text-text-dimmer mt-1">{r.category}{r.prompts?.length > 0 ? ' · AI Viber' : ''}</div>
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
                        <div className="px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-[0.82rem] text-text-muted leading-relaxed whitespace-pre-wrap max-h-[280px] overflow-y-auto">
                          {data.generated}
                        </div>
                        <button
                          className="mt-1 px-3 py-1 rounded-md bg-accent-indigo text-white text-[0.76rem] border-none cursor-pointer hover:bg-accent-indigo-hover transition-colors"
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
                    className="self-start max-w-[85%] px-3 py-2 rounded-xl bg-bg-tertiary text-text-muted text-[0.84rem] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: linkify(msg.content) }}
                  />
                );
              })}
              {sending && (
                <div className="text-[0.78rem] text-text-dimmer">
                  <span className="animate-pulse">...</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2 px-3 py-3 border-t border-border bg-bg-secondary">
              <textarea
                ref={textareaRef}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-secondary text-[0.84rem] outline-none resize-none min-h-[38px] max-h-[100px] leading-relaxed focus:border-accent-indigo placeholder:text-text-darkest"
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
                className="w-[38px] h-[38px] rounded-lg border-none bg-accent-indigo text-white text-base cursor-pointer flex-shrink-0 flex items-center justify-center hover:bg-accent-indigo-hover transition-colors disabled:opacity-40"
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
