import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Multi-AI Pipeline 入面，邊個階段最容易出問題？',
    options: [
      { text: '每個 AI 工具本身嘅推理能力', correct: false, explanation: '個別工具通常都夠強，問題唔係工具本身。' },
      { text: 'Handoff——工具之間嘅資料傳遞同格式對接', correct: true, explanation: 'Pipeline 最易出事嘅地方係 handoff：上一步嘅 output 要配合下一步嘅 input format。例如 Perplexity 嘅 research output 要 structured 到 Claude 可以直接用。' },
      { text: 'AI 模型嘅訓練數據唔夠新', correct: false, explanation: '數據新舊唔係 pipeline 設計嘅主要問題。' },
      { text: '訂閱費用太貴', correct: false, explanation: '成本係考量因素但唔係最易出事嘅地方。' },
    ],
  },
  {
    question: '點解唔建議用一個 AI 工具做晒所有嘢？',
    options: [
      { text: '因為每個工具都有佢最擅長嘅領域，專門工具嘅質量遠高過通用工具', correct: true, explanation: 'Perplexity 嘅搜尋能力、Cursor 嘅 IDE 整合、Copilot 嘅 inline 補全——每個工具都有獨特強項。用一個工具做曬只會得到 mediocre 結果。' },
      { text: '因為用多個工具比較平', correct: false, explanation: '多工具唔一定平啲，重點係質量而唔係價錢。' },
      { text: '因為一個工具處理唔到大量 tokens', correct: false, explanation: 'Context window 限制可以透過 chunking 解決，唔係用多工具嘅主要原因。' },
      { text: '因為公司政策要求用多個供應商', correct: false, explanation: '呢個係 vendor diversification，唔係 Multi-AI Pipeline 嘅核心理念。' },
    ],
  },
  {
    question: '以下邊個組合最適合「Research → Spec → Code → Test」嘅 pipeline？',
    options: [
      { text: 'ChatGPT → ChatGPT → ChatGPT → ChatGPT', correct: false, explanation: '全部用 ChatGPT 就係「用一個工具做曬所有嘢」，冇利用各工具嘅專長。' },
      { text: 'Perplexity → Claude → Cursor → Copilot', correct: true, explanation: 'Perplexity 嘅搜尋引用最強，Claude 嘅長 context 適合寫 spec，Cursor 嘅 IDE 整合最好寫 code，Copilot 擅長生成 test cases。' },
      { text: 'Figma AI → Canva → Zapier → Make', correct: false, explanation: '呢啲係設計同自動化工具，唔適合 code-focused 嘅 pipeline。' },
      { text: 'Claude → Perplexity → Canva → Figma', correct: false, explanation: '順序同工具定位都唔啱，Canva/Figma 係設計工具唔係 coding 工具。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'ai-tools-landscape', label: 'AI 工具全景圖' },
  { slug: 'ai-model-comparison', label: 'AI 模型深入對比' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering 系統設計' },
  { slug: 'mcp-protocol', label: 'MCP 模型上下文協議' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Multi-AI Workflow 係咩</h2>
      <div className="subtitle">將多個 AI 工具串成 Pipeline，每個階段用最強嘅工具</div>
      <p>
        好多人用 AI 嘅方式係：乜都丟俾 ChatGPT。但真正嘅工程思維係將工作流拆成階段，每個階段揀最適合嘅 AI 工具。就好似 microservices 咁——每個 service 做佢最擅長嘅嘢，串埋一齊先係最強嘅系統。
      </p>
      <p>Multi-AI Pipeline 嘅核心概念：<strong>Research → Architecture → Code → Design → QA</strong>，每個階段有唔同嘅工具負責，上一步嘅 output 係下一步嘅 input。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#8B5CF6" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#EF4444" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <marker id="arrPipe" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
          </defs>

          {/* Stage 1: Research */}
          <g transform="translate(10,60)">
            <rect width="130" height="95" rx="14" fill="#1a1d27" stroke="#3B82F6" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="65" y="25" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Research</text>
            <text x="65" y="48" textAnchor="middle" fill="#93c5fd" fontSize="10">Perplexity</text>
            <text x="65" y="64" textAnchor="middle" fill="#9ca3af" fontSize="9">搜尋 + 來源引用</text>
            <text x="65" y="80" textAnchor="middle" fill="#9ca3af" fontSize="9">找 best practices</text>
          </g>

          {/* Arrow 1→2 */}
          <path d="M145,108 L163,108" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrPipe)" />

          {/* Stage 2: Architecture */}
          <g transform="translate(170,60)">
            <rect width="130" height="95" rx="14" fill="#1a1d27" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="65" y="25" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Architecture</text>
            <text x="65" y="48" textAnchor="middle" fill="#6ee7b7" fontSize="10">GPT-5.2 / Claude</text>
            <text x="65" y="64" textAnchor="middle" fill="#9ca3af" fontSize="9">推理 + 長 context</text>
            <text x="65" y="80" textAnchor="middle" fill="#9ca3af" fontSize="9">設計 spec + 架構</text>
          </g>

          {/* Arrow 2→3 */}
          <path d="M305,108 L323,108" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrPipe)" />

          {/* Stage 3: Code */}
          <g transform="translate(330,60)">
            <rect width="130" height="95" rx="14" fill="#1a1d27" stroke="#F59E0B" strokeWidth="2" filter="url(#glowAmber)" />
            <text x="65" y="25" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Code</text>
            <text x="65" y="48" textAnchor="middle" fill="#fcd34d" fontSize="10">Cursor / Copilot</text>
            <text x="65" y="64" textAnchor="middle" fill="#9ca3af" fontSize="9">IDE 整合開發</text>
            <text x="65" y="80" textAnchor="middle" fill="#9ca3af" fontSize="9">按 spec 逐步實作</text>
          </g>

          {/* Arrow 3→4 */}
          <path d="M465,108 L483,108" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrPipe)" />

          {/* Stage 4: Design */}
          <g transform="translate(490,60)">
            <rect width="130" height="95" rx="14" fill="#1a1d27" stroke="#8B5CF6" strokeWidth="2" filter="url(#glowPurple)" />
            <text x="65" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Design</text>
            <text x="65" y="48" textAnchor="middle" fill="#c4b5fd" fontSize="10">Figma AI / Canva</text>
            <text x="65" y="64" textAnchor="middle" fill="#9ca3af" fontSize="9">視覺設計</text>
            <text x="65" y="80" textAnchor="middle" fill="#9ca3af" fontSize="9">UI + 文檔排版</text>
          </g>

          {/* Arrow 4→5 */}
          <path d="M625,108 L643,108" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrPipe)" />

          {/* Stage 5: QA */}
          <g transform="translate(650,60)">
            <rect width="120" height="95" rx="14" fill="#1a1d27" stroke="#EF4444" strokeWidth="2" filter="url(#glowRed)" />
            <text x="60" y="25" textAnchor="middle" fill="#EF4444" fontSize="13" fontWeight="700">QA</text>
            <text x="60" y="48" textAnchor="middle" fill="#fca5a5" fontSize="10">ChatGPT + Copilot</text>
            <text x="60" y="64" textAnchor="middle" fill="#9ca3af" fontSize="9">Code review</text>
            <text x="60" y="80" textAnchor="middle" fill="#9ca3af" fontSize="9">Test generation</text>
          </g>

          {/* Pipeline label */}
          <text x="390" y="200" textAnchor="middle" fill="#6366f1" fontSize="12" fontWeight="600">Multi-AI Pipeline: 每個階段用最強嘅工具</text>

          {/* Data flow labels */}
          <text x="155" y="135" textAnchor="middle" fill="#9ca3af" fontSize="8">findings</text>
          <text x="315" y="135" textAnchor="middle" fill="#9ca3af" fontSize="8">spec</text>
          <text x="475" y="135" textAnchor="middle" fill="#9ca3af" fontSize="8">code</text>
          <text x="635" y="135" textAnchor="middle" fill="#9ca3af" fontSize="8">assets</text>
        </svg>
      </div>

      <h3 style={{ color: '#e2e8f0', marginTop: 24 }}>工具定位矩陣</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#3B82F6' }}>文字 AI</strong>：GPT-5.2 Codex（框架設計、brainstorm）、Claude Opus 4.6（長文件分析、1M context API only）、DeepSeek V3.2（預算友好嘅開源替代）、Gemini（多模態、圖片+文字混合輸入）</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#10B981' }}>搜尋 AI</strong>：Perplexity（即時搜尋 + 引用來源）、Notion AI（團隊知識庫搜尋同整理）</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#F59E0B' }}>開發 AI</strong>：Cursor（IDE 內 AI 編碼、整個 codebase context）、Copilot（行內補全 + 測試生成）、OpenClaw（開源 AI agent、適合自建部署）</span></li>
        <li><span className="step-num">4</span><span><strong style={{ color: '#8B5CF6' }}>設計 AI</strong>：Figma AI（wireframe 同 UI 設計）、Canva（海報、社交媒體、文檔排版）</span></li>
        <li><span className="step-num">5</span><span><strong style={{ color: '#EF4444' }}>自動化</strong>：Zapier / Make（服務串接、workflow 自動化）、LangChain（多模型 orchestration）、MCP（統一 context 協議）。開源方案可以用 Llama 4 做 self-hosted inference</span></li>
      </ol>
    </div>
  );
}

function FrameworkTab() {
  return (
    <div className="card">
      <h2>工具選型決策框架</h2>
      <div className="subtitle">唔好用一個工具做曬所有嘢 — 每個工具都有佢嘅最佳位置</div>
      <p>揀 AI 工具同揀 tech stack 一樣——你唔會用 Redis 做 primary database，咁點解你要用 ChatGPT 做所有嘢？關鍵係理解每個工具嘅定位，然後設計一個 pipeline 將佢哋串埋一齊。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>每個 AI 工具都有明確定位</h4>
          <p>Perplexity 嘅搜尋能力係 ChatGPT 無法取代嘅，Cursor 嘅 IDE 整合唔係 Claude 可以模擬嘅。唔好用一個工具做曬所有嘢，咁只會得到 mediocre 嘅結果。揀啱工具，事半功倍。</p>
        </div>
        <div className="key-point">
          <h4>Pipeline 思維</h4>
          <p>將工作流拆成階段，每個階段用最適合嘅工具。好似 CI/CD pipeline 咁——build、test、deploy 每步用唔同嘅工具。AI workflow 都係一樣：research、design、code、test 每步有最佳工具。</p>
        </div>
        <div className="key-point">
          <h4>Handoff 設計</h4>
          <p>Pipeline 最容易出事嘅地方唔係每個工具本身，而係 handoff——上一步嘅 output 要配合下一步嘅 input format。例如 Perplexity 嘅 research output 要 structured 到 Claude 可以直接用，Claude 嘅 spec 要 detailed 到 Cursor 可以直接 implement。</p>
        </div>
        <div className="key-point">
          <h4>錯誤處理同 Fallback</h4>
          <p>如果某個工具出錯或者結果唔好，需要有 fallback 方案。例如 Cursor 生成嘅 code 唔 pass test → fallback 到 ChatGPT review 再修正。Pipeline 嘅 robustness 取決於你嘅 error handling 有幾好。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>黃金法則</h4>
        <p>如果你發現自己不停咁 copy-paste 結果從一個 AI 到另一個 AI，咁你嘅 workflow 就需要優化。好嘅 pipeline 應該每個 handoff 都有明確嘅 format 同 expectation，減少人手干預。</p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰：AI 輔助 REST API 開發全流程</h2>
      <div className="subtitle">從零到上線，每一步用最啱嘅 AI 工具</div>

      <h3 style={{ color: '#e2e8f0', marginTop: 8 }}>場景一：建一個新嘅 REST API</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#3B82F6' }}>Perplexity Research</strong>：搵 3-5 個類似 API 嘅設計模式同 best practices。例如要做 payment API，Perplexity 會搵到 Stripe、PayPal 嘅 API 設計文檔，附帶引用來源。Output：一份 structured research summary。如果預算有限，DeepSeek V3.2 API 亦可以做 research summarization，成本只需 Perplexity 嘅 1/10。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#10B981' }}>Claude Spec 設計</strong>：用 Claude API 1M context 路徑讀曬 existing codebase + research summary，生成完整嘅 API spec。包括 endpoints、request/response schema、error codes、rate limiting 策略。Claude 嘅長 context 能力喺呢度至關重要。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#F59E0B' }}>Cursor Code 實作</strong>：喺 IDE 入面用 Cursor，按 spec 逐步實作 endpoints。Cursor 可以 reference 成個 codebase，所以佢生成嘅 code 會 follow 你 existing 嘅 patterns 同 conventions。</span></li>
        <li><span className="step-num">4</span><span><strong style={{ color: '#8B5CF6' }}>Copilot Tests</strong>：自動生成 unit tests + integration tests。Copilot 擅長從 implementation 推斷 test cases，包括 happy path、edge cases 同 error scenarios。</span></li>
        <li><span className="step-num">5</span><span><strong style={{ color: '#EF4444' }}>ChatGPT Docs</strong>：生成 OpenAPI spec + README + usage examples。ChatGPT 嘅文字生成能力喺寫文檔方面好強，可以產出 developer-friendly 嘅文檔。</span></li>
      </ol>

      <h3 style={{ color: '#e2e8f0', marginTop: 32 }}>場景二：大型項目 2 週 Sprint</h3>
      <ol className="steps">
        <li><span className="step-num">D1-2</span><span><strong style={{ color: '#3B82F6' }}>Research + Planning</strong>：用 Perplexity 做技術調研，Claude 分析 existing system 同生成 migration plan。Output 係一份 detailed sprint plan + tech spec。</span></li>
        <li><span className="step-num">D3-4</span><span><strong style={{ color: '#10B981' }}>Architecture + Design</strong>：Claude 設計 system architecture，Figma AI 出 wireframes。Team review spec 同 design。</span></li>
        <li><span className="step-num">D5-8</span><span><strong style={{ color: '#F59E0B' }}>Implementation</strong>：Cursor 做 core implementation，Copilot 做補全同 boilerplate。每日用 ChatGPT 做 code review，及早發現問題。</span></li>
        <li><span className="step-num">D9-10</span><span><strong style={{ color: '#8B5CF6' }}>Testing + QA</strong>：Copilot 生成 test suite，ChatGPT review test coverage 同 edge cases。手動 + AI 嘅 hybrid testing 策略。</span></li>
        <li><span className="step-num">D11-14</span><span><strong style={{ color: '#EF4444' }}>Docs + Deploy</strong>：ChatGPT 寫 release notes + migration guide，Zapier/Make 設定自動化 deployment pipeline。</span></li>
      </ol>

      <div className="use-case">
        <h4>真實效果</h4>
        <p>用 Multi-AI Pipeline 嘅團隊，開發速度普遍提升 40-60%。但關鍵唔係速度，係質量——每個環節都有專門嘅工具把關，出錯率大幅降低。最大嘅陷阱係 over-engineering 個 pipeline，記住 KISS 原則。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻生成你嘅 Multi-AI Workflow Plan</div>

      <div className="prompt-card">
        <h4>Prompt — Pipeline Builder</h4>
        <div className="prompt-text">
          {`我需要你幫我設計一個 Multi-AI Workflow Pipeline。

項目描述：[描述你嘅項目，例如：建一個 SaaS 平台嘅 subscription billing system]

技術棧：[例如：React + Node.js + PostgreSQL + Stripe]

團隊規模：[例如：3 個 full-stack developers]

時間限制：[例如：3 週]

請幫我設計一個完整嘅 Multi-AI Pipeline，包括：

1. **Research 階段**
   - 用邊個工具做 research（Perplexity / Google Scholar / etc）
   - 具體要搜尋咩 keywords
   - 期望 output format

2. **Architecture 階段**
   - 用邊個 AI 做系統設計（GPT-5.2 Codex / Claude Opus 4.6 / DeepSeek V3.2 (budget)）
   - 需要 feed 咩 context 入去
   - 期望產出：API spec / system diagram / data model

3. **Code 階段**
   - 用邊個 IDE AI（Cursor / Copilot / etc）
   - 每個 developer 嘅分工
   - 每日嘅 AI-assisted code review 流程

4. **Design 階段**
   - 需唔需要 UI 設計（Figma AI / Canva）
   - 文檔設計（README / API docs）

5. **QA 階段**
   - 測試生成策略（Copilot tests / ChatGPT review）
   - CI/CD 入面嘅 AI 檢查點

6. **Handoff 設計**
   - 每個階段之間嘅 output → input 格式
   - Error handling 同 fallback 方案

7. **Sprint 時間表**
   - 每日 breakdown
   - Milestone 同 checkpoint

最後，俾一個 cost estimate（每月 AI 工具訂閱費用）。`}
        </div>
      </div>
    </div>
  );
}

function QuizTab() {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const questions = [
    { id: 1, q: '喺 Multi-AI Pipeline 入面，Research 階段最適合用邊個工具？', options: ['ChatGPT', 'Perplexity', 'Cursor', 'Figma AI'], correct: 1 },
    { id: 2, q: '如果要分析一個 150K tokens 嘅 codebase 並生成 API spec，應該用邊個工具？', options: ['Copilot', 'Perplexity', 'Claude', 'Canva'], correct: 2 },
    { id: 3, q: 'Pipeline 最容易出事嘅地方係？', options: ['每個工具本身嘅能力', 'Handoff — 工具之間嘅資料傳遞', 'AI 模型嘅訓練數據', '訂閱費用太貴'], correct: 1 },
    { id: 4, q: '以下邊個組合最適合「Search → Spec → Code → Test」workflow？', options: ['ChatGPT → ChatGPT → ChatGPT → ChatGPT', 'Perplexity → Claude → Cursor → Copilot', 'Gemini → Gemini → Gemini → Gemini', 'Claude → Perplexity → Canva → Figma'], correct: 1 },
    { id: 5, q: 'MCP（Model Context Protocol）喺 Multi-AI Pipeline 入面嘅角色係？', options: ['取代所有 AI 工具', '統一唔同工具之間嘅 context 傳遞', '只用嚟做 code generation', '只用嚟做搜尋'], correct: 1 },
  ];

  const score = submitted ? questions.filter((q) => answers[q.id] === q.correct).length : 0;

  return (
    <div className="card">
      <h2>小測驗</h2>
      <div className="subtitle">測試你對 Multi-AI Workflow 嘅理解</div>
      {questions.map((q) => (
        <div key={q.id} style={{ marginBottom: 20 }}>
          <p><strong>{q.id}. {q.q}</strong></p>
          {q.options.map((opt, i) => (
            <label key={i} style={{ display: 'block', padding: '4px 0', cursor: 'pointer', color: submitted ? (i === q.correct ? '#34d399' : answers[q.id] === i ? '#ef4444' : '#9ca3af') : '#e2e8f0' }}>
              <input type="radio" name={`q${q.id}`} disabled={submitted} checked={answers[q.id] === i} onChange={() => setAnswers({ ...answers, [q.id]: i })} style={{ marginRight: 8 }} />
              {opt}
            </label>
          ))}
        </div>
      ))}
      {!submitted ? (
        <button onClick={() => setSubmitted(true)} className="quiz-submit-btn" style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 14 }}>提交</button>
      ) : (
        <div style={{ padding: 16, borderRadius: 12, background: score >= 4 ? '#0f3d2e' : '#3d2e0a', border: `1px solid ${score >= 4 ? '#34d399' : '#F59E0B'}` }}>
          <strong>{score}/5</strong> — {score >= 4 ? '勁！你對 Multi-AI Workflow 嘅理解好紮實。' : '建議重溫工具定位矩陣同 pipeline 設計原則。'}
        </div>
      )}
    </div>
  );
}

export default function MultiAIWorkflow() {
  return (
    <>
      <TopicTabs
        title="Multi-AI Workflow"
        subtitle="多 AI 工具協作 Pipeline — 每個階段用最強嘅工具，串成最高效嘅工作流"
        tabs={[
          { id: 'overview', label: '① 概念', content: <OverviewTab /> },
          { id: 'framework', label: '② 框架', content: <FrameworkTab /> },
          { id: 'practice', label: '③ 實戰', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
          { id: 'quiz', label: '⑤ 小測', premium: true, content: <QuizTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
