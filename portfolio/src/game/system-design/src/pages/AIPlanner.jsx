import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://api.system-design.hillmanchan.com';
const PLAN_KEY = 'sd_learning_plan';
const TOKEN_KEY = 'sa-chat-token';

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

export default function AIPlanner() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completedItems, setCompletedItems] = useState([]);

  // Load saved plan
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PLAN_KEY));
      if (saved?.plan) {
        setPlan(saved.plan);
        setCompletedItems(saved.completed || []);
        setStep(-1); // show plan view
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
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setError('請先喺 AI 助手登入。');
      return;
    }

    setLoading(true);
    setError('');

    const prompt = `你係一個系統設計學習顧問。根據以下學生資料，用廣東話制定一個個人化學習計劃：
目標：${answers[0]}
經驗：${answers[1]}
每週時間：${answers[2]} 小時
重點領域：${(answers[3] || []).join(', ')}

請返回一個 4-8 週嘅學習計劃，每週列出：
1. 主題名稱（用呢度有嘅課題）
2. 學習重點
3. 預計時間

格式要清楚，每週用「第X週」開頭。`;

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'search', query: prompt }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '生成失敗，請稍後再試。');
        return;
      }

      const data = await res.json();
      const planText = data.results?.[0]?.description || data.answer || '未能生成計劃，請重試。';
      setPlan(planText);
      setStep(-1);

      localStorage.setItem(PLAN_KEY, JSON.stringify({ plan: planText, completed: [], answers }));
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
    localStorage.removeItem(PLAN_KEY);
    setPlan(null);
    setCompletedItems([]);
    setAnswers({});
    setStep(0);
  };

  // Show saved plan
  if (step === -1 && plan) {
    const lines = plan.split('\n').filter((l) => l.trim());
    return (
      <div className="h-full overflow-auto">
        <div className="topic-container">
          <header className="topic-header">
            <h1>📋 你嘅學習計劃</h1>
            <p>按照計劃逐步學習，完成後打勾</p>
          </header>

          <div className="card">
            {lines.map((line, i) => {
              const isWeekHeader = /第\d+週|Week \d+/i.test(line);
              const done = completedItems.includes(i);
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 py-2 ${
                    isWeekHeader ? 'mt-4 first:mt-0' : ''
                  }`}
                >
                  {!isWeekHeader && (
                    <button
                      className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-xs transition-colors ${
                        done
                          ? 'bg-accent-green border-accent-green text-white'
                          : 'border-border hover:border-accent-indigo'
                      }`}
                      onClick={() => toggleComplete(i)}
                    >
                      {done ? '✓' : ''}
                    </button>
                  )}
                  <span
                    className={`text-[0.9rem] leading-relaxed ${
                      isWeekHeader
                        ? 'text-accent-indigo-light font-bold text-base'
                        : done
                          ? 'text-text-dimmer line-through'
                          : 'text-text-muted'
                    }`}
                  >
                    {line}
                  </span>
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

          {error && (
            <p className="mt-4 text-accent-red text-sm">{error}</p>
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
                disabled={!canProceed || loading}
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
