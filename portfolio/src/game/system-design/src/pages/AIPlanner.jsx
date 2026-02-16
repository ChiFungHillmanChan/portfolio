import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/constants';
const PLAN_KEY = 'sd_learning_plan';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const STEPS = [
  {
    question: '你嘅學習目標係咩？',
    options: [
      { label: '準備系統設計面試', value: 'interview' },
      { label: '提升後端開發能力', value: 'backend' },
      { label: '了解 AI 系統設計', value: 'ai' },
      { label: '全面學習系統架構', value: 'comprehensive' },
    ],
  },
  {
    question: '你而家嘅經驗程度？',
    options: [
      { label: '初學者（0-1年）', value: 'beginner' },
      { label: '有啲經驗（1-3年）', value: 'intermediate' },
      { label: '有經驗（3-5年）', value: 'senior' },
      { label: '資深（5年以上）', value: 'expert' },
    ],
  },
  {
    question: '每星期可以投入幾多時間？',
    options: [
      { label: '2-3 小時', value: '2-3' },
      { label: '4-6 小時', value: '4-6' },
      { label: '7-10 小時', value: '7-10' },
      { label: '10+ 小時', value: '10+' },
    ],
  },
  {
    question: '最想深入嘅領域？（可揀多個）',
    options: [
      { label: '資料庫與快取', value: 'database' },
      { label: '分散式系統', value: 'distributed' },
      { label: 'API 設計與網絡', value: 'api' },
      { label: '監控與部署', value: 'ops' },
    ],
    multi: true,
  },
];

function getWeeklyLimit() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAN_KEY));
    if (saved?.lastGenerated) {
      const elapsed = Date.now() - saved.lastGenerated;
      if (elapsed < ONE_WEEK_MS) {
        return {
          limited: true,
          nextDate: new Date(saved.lastGenerated + ONE_WEEK_MS),
        };
      }
    }
  } catch {}
  return { limited: false, nextDate: null };
}

function formatDate(date) {
  return date.toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function AIPlanner() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [customText, setCustomText] = useState('');
  const [plan, setPlan] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completedItems, setCompletedItems] = useState([]);

  // Load saved plan
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PLAN_KEY));
      if (saved?.pathDetails) {
        setPlan(saved.pathDetails);
        setExplanation(saved.explanation || '');
        setCompletedItems(saved.completed || []);
        setStep(-1);
      }
    } catch {}
  }, []);

  const handleSelect = (stepIdx, value) => {
    const current = STEPS[stepIdx];
    if (current.multi) {
      const prev = answers[stepIdx] || [];
      const next = prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value];
      setAnswers({ ...answers, [stepIdx]: next });
    } else {
      setAnswers({ ...answers, [stepIdx]: value });
      // Auto advance
      if (stepIdx < STEPS.length - 1) {
        setTimeout(() => setStep(stepIdx + 1), 200);
      }
    }
  };

  const handleGenerate = async () => {
    // Check weekly limit
    const limit = getWeeklyLimit();
    if (limit.limited) {
      setError(`你已經喺呢個星期生成咗計劃，下次可以喺 ${formatDate(limit.nextDate)} 再生成`);
      return;
    }

    // If user is logged in, use their token; otherwise prompt sign-in
    if (!token) {
      setError('請先登入 Google 帳號以生成學習計劃。');
      return;
    }

    setLoading(true);
    setError('');

    const goalParts = [];
    STEPS.forEach((s, i) => {
      const val = answers[i];
      if (s.multi) {
        const labels = (val || []).map(v => s.options.find(o => o.value === v)?.label).filter(Boolean);
        if (labels.length) goalParts.push(labels.join('、'));
      } else {
        const opt = s.options.find(o => o.value === val);
        if (opt) goalParts.push(opt.label);
      }
    });
    if (customText.trim()) goalParts.push(`額外想學：${customText.trim()}`);
    const goal = goalParts.join('，');

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mode: 'guide', goal }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '生成失敗，請稍後再試。');
        return;
      }

      const data = await res.json();
      const pathDetails = data.pathDetails;

      if (!pathDetails || !pathDetails.length) {
        setError('未能生成學習路徑，請重試。');
        return;
      }

      setPlan(pathDetails);
      setExplanation(data.explanation || '');
      setStep(-1);

      localStorage.setItem(
        PLAN_KEY,
        JSON.stringify({
          pathDetails,
          explanation: data.explanation || '',
          completed: [],
          answers,
          lastGenerated: Date.now(),
        })
      );
    } catch {
      setError('網絡錯誤，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = (idx) => {
    const next = completedItems.includes(idx)
      ? completedItems.filter((i) => i !== idx)
      : [...completedItems, idx];
    setCompletedItems(next);
    const saved = JSON.parse(localStorage.getItem(PLAN_KEY) || '{}');
    saved.completed = next;
    localStorage.setItem(PLAN_KEY, JSON.stringify(saved));
  };

  const resetPlan = () => {
    // Keep lastGenerated to enforce weekly limit
    const saved = JSON.parse(localStorage.getItem(PLAN_KEY) || '{}');
    const lastGenerated = saved.lastGenerated;

    localStorage.removeItem(PLAN_KEY);
    setPlan(null);
    setExplanation('');
    setCompletedItems([]);
    setAnswers({});
    setCustomText('');
    setStep(0);

    // Restore lastGenerated if within the week
    if (lastGenerated && Date.now() - lastGenerated < ONE_WEEK_MS) {
      localStorage.setItem(
        PLAN_KEY,
        JSON.stringify({ lastGenerated })
      );
    }
  };

  // Show saved plan
  if (step === -1 && plan) {
    const difficultyLabels = { 1: '初級', 2: '中級', 3: '高級', beginner: '初級', intermediate: '中級', advanced: '高級' };
    const difficultyColors = {
      1: 'bg-[rgba(34,197,94,0.15)] text-[#22c55e]',
      2: 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]',
      3: 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]',
      beginner: 'bg-[rgba(34,197,94,0.15)] text-[#22c55e]',
      intermediate: 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]',
      advanced: 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]',
    };

    return (
      <div className="h-full overflow-auto">
        <div className="topic-container">
          <header className="topic-header">
            <h1>📋 你嘅學習計劃</h1>
            <p>{explanation || '按照計劃逐步學習，完成後打勾'}</p>
          </header>

          <div className="card">
            {plan.map((topic, i) => {
              const done = completedItems.includes(i);
              const diff = topic.difficulty;
              return (
                <div
                  key={topic.id}
                  className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <button
                    className={`w-6 h-6 rounded border flex-shrink-0 flex items-center justify-center text-xs transition-colors ${
                      done
                        ? 'bg-accent-green border-accent-green text-white'
                        : 'border-border hover:border-accent-indigo'
                    }`}
                    onClick={() => toggleComplete(i)}
                  >
                    {done ? '✓' : ''}
                  </button>
                  <span className="text-text-dimmer text-sm font-mono w-6 text-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <button
                    className={`flex-1 min-w-0 text-left ${done ? 'opacity-50' : ''}`}
                    onClick={() => navigate(`/topic/${topic.id}`)}
                  >
                    <div className={`text-[0.9rem] font-medium ${done ? 'line-through text-text-dimmer' : 'text-text-primary hover:text-accent-indigo-light'} transition-colors`}>
                      {topic.titleZh || topic.title}
                    </div>
                    {topic.titleZh && topic.title && topic.titleZh !== topic.title && (
                      <div className="text-[0.75rem] text-text-dimmer">{topic.title}</div>
                    )}
                  </button>
                  {diff && (
                    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded flex-shrink-0 ${difficultyColors[diff] || ''}`}>
                      {difficultyLabels[diff] || ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={resetPlan}
              className="px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-dim hover:text-text-primary text-sm transition-all"
            >
              重新生成計劃
            </button>
            <button
              onClick={() => navigate('/roadmap')}
              className="px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm hover:bg-accent-indigo-hover transition-colors"
            >
              睇路線圖
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Questionnaire
  const currentStep = STEPS[step];
  const canProceed = step === STEPS.length - 1
    ? (answers[step] || []).length > 0
    : answers[step] !== undefined;

  // Check weekly limit for display
  const weeklyLimit = getWeeklyLimit();

  return (
    <div className="h-full overflow-auto">
      <div className="topic-container">
        <header className="topic-header">
          <h1>📋 AI 學習計劃</h1>
          <p>回答幾個問題，AI 幫你制定個人化學習路線</p>
        </header>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent-indigo' : 'bg-border'
              }`}
            />
          ))}
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-text-primary mb-6">
            {currentStep.question}
          </h2>

          <div className="flex flex-col gap-3">
            {currentStep.options.map((opt) => {
              const selected = currentStep.multi
                ? (answers[step] || []).includes(opt.value)
                : answers[step] === opt.value;
              return (
                <button
                  key={opt.value}
                  className={`text-left px-4 py-3 rounded-lg border text-[0.95rem] transition-all ${
                    selected
                      ? 'bg-accent-indigo/15 border-accent-indigo text-accent-indigo-light'
                      : 'bg-bg-tertiary border-border text-text-muted hover:border-border-hover'
                  }`}
                  onClick={() => handleSelect(step, opt.value)}
                >
                  {currentStep.multi && (
                    <span className="mr-2">{selected ? '☑' : '☐'}</span>
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Custom text input on the last step */}
          {step === STEPS.length - 1 && (
            <div className="mt-4">
              <textarea
                className="w-full px-4 py-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-[0.9rem] outline-none resize-none leading-relaxed focus:border-accent-indigo placeholder:text-text-darkest"
                rows={3}
                placeholder="其他想學嘅範疇（選填）"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p className="mt-4 text-accent-red text-sm">{error}</p>
          )}

          {weeklyLimit.limited && step === STEPS.length - 1 && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="text-sm text-amber-400">
                你已經喺呢個星期生成咗計劃，下次可以喺 {formatDate(weeklyLimit.nextDate)} 再生成
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-lg bg-bg-tertiary border border-border text-text-dim text-sm hover:text-text-primary transition-all"
              >
                上一步
              </button>
            )}

            {step === STEPS.length - 1 ? (
              <button
                onClick={handleGenerate}
                disabled={!canProceed || loading || weeklyLimit.limited}
                className="px-6 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors disabled:opacity-50"
              >
                {loading ? '生成中...' : '生成學習計劃'}
              </button>
            ) : (
              canProceed && !currentStep.multi && null /* auto-advances */
            )}

            {currentStep.multi && step < STEPS.length - 1 && (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed}
                className="px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm hover:bg-accent-indigo-hover transition-colors disabled:opacity-50"
              >
                下一步
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
