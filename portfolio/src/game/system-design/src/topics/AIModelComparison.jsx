import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const relatedTopics = [
  { slug: 'ai-tools-landscape', label: 'AI 工具全景圖' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering' },
  { slug: 'api-token-security', label: 'API Token 安全與成本' },
  { slug: 'skill-vs-agent', label: 'Skill vs Agent' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>AI Model 大比拼：GPT-5.3 Codex vs Opus 4.6 vs Gemini 3 vs DeepSeek vs Cursor</h2>
      <div className="subtitle">工程師視角嘅深度比較——唔係 hype，係實戰數據</div>
      <p>
        2025-2026 年 AI model 進化到咩程度？作為工程師，你唔需要知道每個 model 嘅 paper，但你一定要知道邊個 model 喺咩場景最強。呢度用<strong style={{ color: '#34d399' }}>實戰角度</strong>比較主流 model，幫你揀啱工具做嘢。
      </p>
      <p>記住：冇「最好」嘅 model，只有「最啱」嘅 model。每個 model 都有佢嘅甜區（sweet spot），揀錯會浪費錢同時間。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 470" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#0f172a" /></linearGradient>
          </defs>

          {/* Table header */}
          <rect x="10" y="10" width="730" height="40" rx="8" fill="#1e3a5f" stroke="#3B82F6" strokeWidth="1.5" />
          <text x="95" y="35" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="700">Model</text>
          <text x="230" y="35" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="700">Context</text>
          <text x="340" y="35" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="700">Multimodal</text>
          <text x="450" y="35" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="700">Reasoning</text>
          <text x="555" y="35" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="700">Coding</text>
          <text x="672" y="35" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="700">Cost/1M tok</text>

          {/* Row 1 - GPT-5.3 Codex */}
          <rect x="10" y="55" width="730" height="48" rx="6" fill="#1a2332" stroke="#334155" strokeWidth="1" />
          <text x="95" y="78" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="700">GPT-5.3 Codex</text>
          <text x="95" y="93" textAnchor="middle" fill="#6b7280" fontSize="9">(OpenAI)</text>
          <text x="230" y="83" textAnchor="middle" fill="#d1d5db" fontSize="11">400K</text>
          <text x="340" y="83" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐⭐</text>
          <text x="450" y="83" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐⭐</text>
          <text x="555" y="83" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐⭐</text>
          <text x="672" y="83" textAnchor="middle" fill="#d1d5db" fontSize="10">$2-10</text>

          {/* Row 2 - Claude Opus 4.6 */}
          <rect x="10" y="108" width="730" height="48" rx="6" fill="#1a1f2e" stroke="#334155" strokeWidth="1" />
          <text x="95" y="131" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="700">Opus 4.6</text>
          <text x="95" y="146" textAnchor="middle" fill="#6b7280" fontSize="9">(Anthropic)</text>
          <text x="230" y="136" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">1M (beta)</text>
          <text x="340" y="136" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐</text>
          <text x="450" y="136" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐⭐</text>
          <text x="555" y="136" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐⭐</text>
          <text x="672" y="136" textAnchor="middle" fill="#d1d5db" fontSize="10">$15-75</text>

          {/* Row 3 - Gemini 3 Pro */}
          <rect x="10" y="161" width="730" height="48" rx="6" fill="#1a2332" stroke="#334155" strokeWidth="1" />
          <text x="95" y="184" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="700">Gemini 3 Pro</text>
          <text x="95" y="199" textAnchor="middle" fill="#6b7280" fontSize="9">(Google)</text>
          <text x="230" y="189" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">1M</text>
          <text x="340" y="189" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐⭐</text>
          <text x="450" y="189" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐</text>
          <text x="555" y="189" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐</text>
          <text x="672" y="189" textAnchor="middle" fill="#d1d5db" fontSize="10">$2-18</text>

          {/* Row 4 - Gemini 3 Flash */}
          <rect x="10" y="214" width="730" height="48" rx="6" fill="#1a1f2e" stroke="#334155" strokeWidth="1" />
          <text x="95" y="237" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="700">Gemini 3 Flash</text>
          <text x="95" y="252" textAnchor="middle" fill="#6b7280" fontSize="9">(Google)</text>
          <text x="230" y="242" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">1M</text>
          <text x="340" y="242" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐</text>
          <text x="450" y="242" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐</text>
          <text x="555" y="242" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐</text>
          <text x="672" y="242" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="700">$0.10-0.40</text>

          {/* Row 5 - DeepSeek V3.2 */}
          <rect x="10" y="267" width="730" height="48" rx="6" fill="#1a2332" stroke="#334155" strokeWidth="1" />
          <text x="95" y="290" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="700">DeepSeek V3.2</text>
          <text x="95" y="305" textAnchor="middle" fill="#6b7280" fontSize="9">(DeepSeek, Open Source)</text>
          <text x="230" y="295" textAnchor="middle" fill="#d1d5db" fontSize="11">128K</text>
          <text x="340" y="295" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐</text>
          <text x="450" y="295" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐</text>
          <text x="555" y="295" textAnchor="middle" fill="#fbbf24" fontSize="12">⭐⭐⭐</text>
          <text x="672" y="295" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="700">$0.28-0.42</text>

          {/* Row 6 - Cursor */}
          <rect x="10" y="320" width="730" height="48" rx="6" fill="#1a1f2e" stroke="#334155" strokeWidth="1" />
          <text x="95" y="343" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="700">Cursor</text>
          <text x="95" y="358" textAnchor="middle" fill="#6b7280" fontSize="9">(Multi-Model)</text>
          <text x="230" y="348" textAnchor="middle" fill="#d1d5db" fontSize="10">IDE 整合</text>
          <text x="400" y="343" textAnchor="middle" fill="#9ca3af" fontSize="10">支援 Claude / GPT / Grok</text>
          <text x="400" y="358" textAnchor="middle" fill="#9ca3af" fontSize="9">自動揀 model，按任務優化</text>
          <text x="672" y="348" textAnchor="middle" fill="#d1d5db" fontSize="10">$20/月</text>

          {/* Legend */}
          <text x="375" y="398" textAnchor="middle" fill="#6b7280" fontSize="10">⭐ = 基本能力 | ⭐⭐ = 強 | ⭐⭐⭐ = 頂級</text>
          <text x="375" y="418" textAnchor="middle" fill="#4b5563" fontSize="9">Cost = USD per 1M tokens (input-output range)</text>
          <text x="375" y="438" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">綠色 = 該類別最強 / 最抵</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#10B981' }}>GPT-5.3 Codex</strong>：Agentic coding 新標杆。400K context，multimodal 最強（圖片、語音、影片都得），reasoning 能力一流，Spark 變體仲有 1000+ tok/s 嘅超快速度。API 生態最成熟，適合需要 multimodal 同 agentic 代碼生成嘅場景。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#a78bfa' }}>Claude Opus 4.6</strong>：Coding 之王。1M context（beta）配合頂級推理能力，寫代碼同分析複雜問題無人能及。Agent Teams 功能支援多 agent 協作。缺點係貴（$75/1M output）。適合專業開發同深度分析。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#3B82F6' }}>Gemini 3 Pro</strong>：Context 怪獸。1M token context 可以食成個 codebase，multimodal 亦好強。Tiered pricing（$2-18/1M）按用量分級收費，適合處理大量文件同長文分析。缺點係 coding 同 reasoning 稍遜 Claude/GPT。</span></li>
        <li><span className="step-num">4</span><span><strong style={{ color: '#38bdf8' }}>Gemini 3 Flash</strong>：性價比之王。$0.10/1M input token，平到離譜。速度快，1M context，適合 batch processing 同唔需要頂級推理嘅任務。「夠用就好」嘅最佳選擇。</span></li>
        <li><span className="step-num">5</span><span><strong style={{ color: '#F59E0B' }}>Cursor</strong>：IDE 整合玩家。唔係一個 model，而係一個平台——背後可以用 Claude、GPT、Grok。優勢係直接喺 IDE 入面用，唔使自己接 API。適合想快速用 AI 輔助寫 code 嘅工程師。</span></li>
        <li><span className="step-num">6</span><span><strong style={{ color: '#ef4444' }}>DeepSeek V3.2</strong>：開源界王者。MIT license，MoE（Mixture of Experts）架構，$0.28/$0.42 per 1M tokens（input/output），平到令人震驚。Coding 能力直逼閉源模型，128K context 足夠大部分場景。適合 budget-conscious 團隊同想 self-host 嘅公司。</span></li>
      </ol>
    </div>
  );
}

function FrameworkTab() {
  return (
    <div className="card">
      <h2>Model 選型決策樹</h2>
      <div className="subtitle">五個維度幫你快速揀啱 Model</div>
      <p>唔好盲目跟 hype，用呢五個維度逐個問自己，就知道應該用邊個 model。</p>
      <div className="key-points">
        <div className="key-point">
          <h4>1. Context 需求 (Context Window)</h4>
          <p>
            <strong style={{ color: '#34d399' }}>&lt;10K tokens</strong>：任何 model 都得，揀最平嗰個。<br />
            <strong style={{ color: '#F59E0B' }}>10K-100K tokens</strong>：GPT-5.3 Codex (400K) 或 Opus 4.6 (1M beta)，兩個都穩。<br />
            <strong style={{ color: '#ef4444' }}>100K+ tokens</strong>：Opus 4.6 (1M beta) 或 Gemini (1M)。如果成個 codebase 要餵入去，Gemini 嘅 1M context 或 Claude 嘅 1M beta 都得。
          </p>
        </div>
        <div className="key-point">
          <h4>2. Multimodal 需求 (Image/Audio/Video)</h4>
          <p>
            <strong style={{ color: '#10B981' }}>圖片 + 代碼分析</strong> → GPT-5.3 Codex：screenshot 加 error message 一齊餵入去，分析最準。<br />
            <strong style={{ color: '#3B82F6' }}>PDF / 長文件分析</strong> → Gemini：1M context 食成份 PDF 無壓力。<br />
            <strong style={{ color: '#a78bfa' }}>純文字任務</strong> → Claude：唔需要 multimodal 嘅話，Claude 嘅文字推理最強。
          </p>
        </div>
        <div className="key-point">
          <h4>3. 成本敏感度 (Cost Sensitivity)</h4>
          <p>
            <strong style={{ color: '#34d399' }}>Budget 極有限</strong> → DeepSeek V3.2：$0.28/1M input，開源仲可以 self-host，終極慳錢方案。<br />
            <strong style={{ color: '#38bdf8' }}>Budget 有限</strong> → Gemini 3 Flash：$0.10/1M input，平到唔使計數。<br />
            <strong style={{ color: '#F59E0B' }}>中等預算</strong> → GPT-5.3 Codex / Claude Sonnet：性能同成本嘅最佳平衡。<br />
            <strong style={{ color: '#ef4444' }}>Unlimited</strong> → Claude Opus：最強 coding + reasoning，但 $75/1M output 唔係人人承受得起。
          </p>
        </div>
        <div className="key-point">
          <h4>4. 延遲需求 (Latency Requirements)</h4>
          <p>
            <strong style={{ color: '#34d399' }}>Real-time 互動</strong> → Gemini 3 Flash / GPT instant：回應快，user 唔使等。<br />
            <strong style={{ color: '#F59E0B' }}>Batch 處理</strong> → Claude Opus / Gemini Pro：可以慢慢做，質量行先。Batch API 仲可以再平 50%。
          </p>
        </div>
        <div className="key-point">
          <h4>5. 私隱需求 (Privacy & Data Sensitivity)</h4>
          <p>
            <strong style={{ color: '#a78bfa' }}>敏感數據</strong> → Claude：Anthropic 承諾唔用你嘅數據做訓練，privacy policy 最嚴格。<br />
            <strong style={{ color: '#ef4444' }}>想完全控制</strong> → DeepSeek V3.2：開源 MIT license，可以 self-host，數據完全唔離開你嘅伺服器。<br />
            <strong style={{ color: '#9ca3af' }}>一般數據</strong> → 任何 model 都可以，揀性能最啱嗰個。
          </p>
        </div>
      </div>

      <div className="use-case">
        <h4>快速判斷法則</h4>
        <p>如果你只記得一條規則：<strong>「超平用 DeepSeek，平嘢用 Flash，寫 code 用 Claude，睇圖用 GPT，食大 context 用 Gemini Pro / Claude」</strong>。呢幾句已經涵蓋 90% 嘅場景。</p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰場景：3 個真實 Case Study</h2>
      <div className="subtitle">唔係紙上談兵，係真正工程師會遇到嘅場景</div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>
            <strong style={{ color: '#a78bfa' }}>100K-token Codebase Review → Claude Opus 4.6</strong><br />
            場景：你要 review 一個大型 monorepo 嘅 security audit，涉及 100K+ token 嘅代碼。<br />
            點解揀 Claude：1M context（beta）食得落成個 codebase，coding 能力最強可以發現深層 bug，推理能力幫你搵到跨文件嘅安全漏洞。而且 Anthropic 嘅 privacy policy 適合處理敏感代碼。<br />
            <strong>成本預估</strong>：~$1.5 input + ~$7.5 output = ~$9/次。貴但值得。
          </span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>
            <strong style={{ color: '#10B981' }}>Image + Code Debugging → GPT-5.3 Codex</strong><br />
            場景：用戶報告 UI bug，附咗 screenshot 同 console error。你需要 AI 同時分析圖片同 error log。<br />
            點解揀 GPT-5.3 Codex：Multimodal 能力最強，可以同時理解 screenshot 入面嘅 UI 狀態同 error message 嘅 stack trace，cross-reference 兩者搵出 root cause。<br />
            <strong>成本預估</strong>：~$0.05 input (image + text) + ~$0.30 output = ~$0.35/次。抵到爛。
          </span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>
            <strong style={{ color: '#38bdf8' }}>Budget Batch Processing → Gemini 3 Flash / DeepSeek V3.2</strong><br />
            場景：你要處理 10,000 個 user feedback，分類情緒同提取 feature request。<br />
            點解揀 Flash：$0.10/1M input token，10K 條 feedback 大約 5M tokens，成本只需 ~$0.50。速度快，1M context 可以一次過餵好多條。質量對於分類任務嚟講綽綽有餘。<br />
            更平替代：DeepSeek V3.2 只要 $0.28/1M input，開源仲可以 self-host 零 API 費用。如果你有自己嘅 GPU，呢個係終極慳錢方案。<br />
            <strong>成本預估</strong>：Flash ~$0.50 input + ~$1.20 output = ~$1.70/10K 條。DeepSeek 仲平。如果用 Claude Opus 做同樣嘅嘢要 ~$450。
          </span>
        </li>
      </ol>

      <div className="use-case">
        <h4>實戰心得</h4>
        <p>大部分工程團隊嘅最佳策略係<strong>「多 model 混合使用」</strong>：日常任務用 Gemini 3 Flash 或 DeepSeek V3.2 省錢，複雜 coding 用 Claude Opus 4.6 保質量，multimodal 場景用 GPT-5.3 Codex。唔好鎖死一個 model——用 abstraction layer 包住 API call，隨時可以切換。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻幫你揀啱 Model</div>

      <div className="prompt-card">
        <h4>Prompt — AI Model 推薦器</h4>
        <div className="prompt-text">
          {`我需要你幫我揀一個最適合嘅 AI model。以下係我嘅需求：

任務描述：[描述你嘅任務，例如：review 50K token 嘅 codebase / 分析 screenshot 入面嘅 UI bug / batch 處理 10K 條用戶反饋]

請用以下五個維度評估我嘅需求：
1. Context 需求（估算 token 數量）
2. Multimodal 需求（需要處理圖片/音頻/影片？）
3. 成本敏感度（1=唔在意，5=非常敏感）
4. 延遲需求（real-time / 可以等幾分鐘 / batch 處理）
5. 私隱需求（數據是否敏感？）

然後俾出建議：
- 首選 Model 同原因
- 備選 Model 同適用場景
- 預估成本（per request 同 monthly）
- 如果用 multi-model 策略，建議點樣分配

可選嘅 Model：
- GPT-5.3 Codex (400K context, agentic coding, $2-10/1M)
- Claude Opus 4.6 (1M context beta, coding 最強, $15-75/1M)
- Gemini 3 Pro (1M context, multimodal 強, $2-18/1M)
- Gemini 3 Flash (1M context, 快速, $0.10-0.40/1M)
- DeepSeek V3.2 (128K context, 開源最平, $0.28-0.42/1M)
- Cursor (IDE 整合, 月費 $20)`}
        </div>
      </div>
    </div>
  );
}

function QuizTab() {
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const questions = [
    {
      id: 1,
      question: '你需要分析一個 500K token 嘅 codebase，以下邊個 model 最唔適合？',
      options: ['Claude Opus 4.6 (1M)', 'Gemini 3 Pro (1M)', 'GPT-5.3 Codex (400K)', 'Gemini 3 Flash (1M)'],
      correct: 2,
      explanation: 'GPT-5.3 Codex 嘅 context window 得 400K，裝唔落 500K token 嘅 codebase。Claude Opus 4.6 (1M beta) 同 Gemini (1M) 都冇問題。',
    },
    {
      id: 2,
      question: '你要 batch 處理 50,000 條用戶反饋做情緒分類，揀邊個 model 最合理？',
      options: ['Claude Opus', 'GPT-5.3 Codex', 'Gemini 3 Flash', 'Cursor'],
      correct: 2,
      explanation: 'Gemini 3 Flash $0.10/1M input token，做大量分類任務最平最快。用 Claude Opus 做同樣嘅嘢成本可以貴 100 倍以上。',
    },
    {
      id: 3,
      question: '用戶報咗一個 UI bug，附咗 screenshot 同 error log，你應該用邊個 model 分析？',
      options: ['Claude Opus 4.6', 'Gemini 3 Flash', 'GPT-5.3 Codex', 'Gemini 3 Pro'],
      correct: 2,
      explanation: 'GPT-5.3 Codex 嘅 multimodal 能力最強，可以同時分析 screenshot 入面嘅 UI 狀態同 error log 嘅 stack trace，cross-reference 搵出 root cause。',
    },
    {
      id: 4,
      question: '以下邊個講法係錯嘅？',
      options: [
        'Claude 承諾唔用你嘅數據做訓練',
        'Gemini 3 Flash 係最平嘅閉源選擇',
        'Cursor 係一個獨立嘅 AI model',
        'GPT-5.3 Codex 嘅 multimodal 能力好強',
      ],
      correct: 2,
      explanation: 'Cursor 唔係一個獨立嘅 AI model，而係一個 IDE 平台，背後支援 Claude、GPT、Grok 等多個 model。',
    },
    {
      id: 5,
      question: '最佳嘅 AI model 使用策略係咩？',
      options: [
        '全部用最貴嘅 Claude Opus',
        '全部用最平嘅 Gemini Flash',
        'Multi-model 混合策略，按場景揀 model',
        '只用一個 model 避免複雜性',
      ],
      correct: 2,
      explanation: '冇一個 model 係萬能嘅。最佳策略係 multi-model 混合使用：日常用 Flash 或 DeepSeek V3.2（開源最平）省錢，複雜 coding 用 Claude，multimodal 用 GPT-5.3 Codex。用 abstraction layer 包住 API，隨時切換。',
    },
  ];

  const handleAnswer = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const score = questions.reduce((acc, q) => (answers[q.id] === q.correct ? acc + 1 : acc), 0);

  return (
    <div className="card">
      <h2>Quiz Time</h2>
      <div className="subtitle">測試下你對 AI Model 選型嘅理解</div>

      {questions.map((q) => (
        <div key={q.id} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#1a1d27', borderRadius: '12px' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
            {q.id}. {q.question}
          </p>
          {q.options.map((opt, i) => {
            const isSelected = answers[q.id] === i;
            const isCorrect = i === q.correct;
            const showFeedback = showResults && isSelected;
            return (
              <button
                key={i}
                onClick={() => handleAnswer(q.id, i)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  marginBottom: '0.4rem',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #6366f1' : '1px solid #334155',
                  background: showFeedback ? (isCorrect ? '#064e3b' : '#7f1d1d') : isSelected ? '#1e293b' : 'transparent',
                  color: '#d1d5db',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {opt}
              </button>
            );
          })}
          {showResults && answers[q.id] !== undefined && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: answers[q.id] === q.correct ? '#34d399' : '#f87171' }}>
              {answers[q.id] === q.correct ? '✓ ' : '✗ '}
              {q.explanation}
            </p>
          )}
        </div>
      ))}

      <button
        onClick={() => setShowResults(true)}
        style={{
          padding: '0.75rem 2rem',
          borderRadius: '10px',
          border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: 'pointer',
          marginTop: '1rem',
        }}
      >
        睇成績
      </button>

      {showResults && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#1e293b', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: score >= 4 ? '#34d399' : score >= 2 ? '#fbbf24' : '#f87171' }}>
            {score} / {questions.length}
          </p>
          <p style={{ color: '#9ca3af' }}>
            {score === 5 && '完美！你已經係 AI Model 選型專家。'}
            {score >= 3 && score < 5 && '唔錯！再溫習下 FrameworkTab 會更好。'}
            {score < 3 && '加油！建議重新睇晒 OverviewTab 同 FrameworkTab。'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AIModelComparison() {
  return (
    <>
      <TopicTabs
        title="AI Model Comparison"
        subtitle="GPT-5.3 Codex vs Opus 4.6 vs Gemini 3 vs DeepSeek 深度比較——工程師點樣揀最啱嘅 AI Model"
        tabs={[
          { id: 'overview', label: '① 模型總覽', content: <OverviewTab /> },
          { id: 'framework', label: '② 選型框架', content: <FrameworkTab /> },
          { id: 'practice', label: '③ 實戰場景', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
          { id: 'quiz', label: '⑤ Quiz', premium: true, content: <QuizTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
