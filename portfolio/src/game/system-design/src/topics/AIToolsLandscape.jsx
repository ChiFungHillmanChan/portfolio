import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const relatedTopics = [
  { slug: 'ai-model-comparison', label: 'AI 模型深入對比' },
  { slug: 'multi-ai-workflow', label: '多 AI 協作工作流' },
  { slug: 'api-token-security', label: 'API Token 安全與成本' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>AI 工具全景圖</h2>
      <div className="subtitle">13 款主流 AI 工具，邊個做咩最強</div>
      <p>
        而家市面上有太多 AI 工具，唔同工具嘅定位完全唔同。<strong style={{ color: '#a78bfa' }}>識揀工具</strong> 同 <strong style={{ color: '#34d399' }}>識用工具</strong> 係兩回事——好多人淨係用 ChatGPT，但其實唔同場景用唔同工具，效率可以差 5-10 倍。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 456" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-tl" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
          </defs>
          {/* Category Headers */}
          <text x="375" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="15" fontWeight="700">AI 工具分類矩陣</text>

          {/* Text AI */}
          <rect x="20" y="50" width="220" height="178" rx="12" fill="#1a1d27" stroke="#a78bfa" strokeWidth="1.5" filter="url(#shadow-tl)" />
          <text x="130" y="75" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="700">💬 文字 AI</text>
          <text x="40" y="100" fill="#e2e8f0" fontSize="10">GPT-5.3 Codex — Agentic 編程 + 推理</text>
          <text x="40" y="118" fill="#e2e8f0" fontSize="10">Claude Opus 4.6 — 1M context + Agent Teams</text>
          <text x="40" y="136" fill="#e2e8f0" fontSize="10">Gemini 3 — 多模態 + Deep Think</text>
          <text x="40" y="154" fill="#9ca3af" fontSize="10">Grok — X 平台整合 + 即時資訊</text>
          <text x="40" y="172" fill="#9ca3af" fontSize="10">Perplexity — 搜尋引擎 + 引用來源</text>
          <text x="40" y="190" fill="#9ca3af" fontSize="10">DeepSeek — 開源 + 超低成本 API</text>

          {/* Dev AI */}
          <rect x="260" y="50" width="220" height="178" rx="12" fill="#1a1d27" stroke="#34d399" strokeWidth="1.5" filter="url(#shadow-tl)" />
          <text x="370" y="75" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">🛠 開發 AI</text>
          <text x="280" y="100" fill="#e2e8f0" fontSize="10">Cursor — IDE 整合 + 重構 + Debug</text>
          <text x="280" y="118" fill="#e2e8f0" fontSize="10">Claude Code — 長 Context + CLI</text>
          <text x="280" y="136" fill="#e2e8f0" fontSize="10">GitHub Copilot — 自動補全 + 測試</text>
          <text x="280" y="154" fill="#9ca3af" fontSize="10">Lovable — 快速 Prototype + UI</text>
          <text x="280" y="172" fill="#9ca3af" fontSize="10">OpenClaw — 開源 AI Agent + 183K ⭐</text>

          {/* Design/Media AI */}
          <rect x="500" y="50" width="230" height="160" rx="12" fill="#1a1d27" stroke="#F59E0B" strokeWidth="1.5" filter="url(#shadow-tl)" />
          <text x="615" y="75" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">🎨 設計 / 自動化</text>
          <text x="520" y="100" fill="#e2e8f0" fontSize="10">Canva — 海報 + 社交媒體設計</text>
          <text x="520" y="118" fill="#e2e8f0" fontSize="10">Figma AI — Wireframe + UI 設計</text>
          <text x="520" y="136" fill="#e2e8f0" fontSize="10">Notion AI — 知識管理 + 文件</text>
          <text x="520" y="154" fill="#9ca3af" fontSize="10">Zapier / Make — 自動化工作流</text>

          {/* Comparison table */}
          <rect x="20" y="248" width="710" height="193" rx="12" fill="#1a1d27" stroke="#475569" strokeWidth="1" filter="url(#shadow-tl)" />
          <text x="375" y="273" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="700">能力對比（工程師視角）</text>

          {/* Headers */}
          <text x="40" y="298" fill="#9ca3af" fontSize="9" fontWeight="600">工具</text>
          <text x="180" y="298" fill="#9ca3af" fontSize="9" fontWeight="600">Coding</text>
          <text x="280" y="298" fill="#9ca3af" fontSize="9" fontWeight="600">推理</text>
          <text x="370" y="298" fill="#9ca3af" fontSize="9" fontWeight="600">搜尋</text>
          <text x="460" y="298" fill="#9ca3af" fontSize="9" fontWeight="600">多模態</text>
          <text x="560" y="298" fill="#9ca3af" fontSize="9" fontWeight="600">Context</text>
          <text x="660" y="298" fill="#9ca3af" fontSize="9" fontWeight="600">成本</text>

          {/* Row 1: ChatGPT */}
          <text x="40" y="318" fill="#e2e8f0" fontSize="9">GPT-5.3 Codex</text>
          <text x="180" y="318" fill="#34d399" fontSize="9">⭐⭐</text>
          <text x="280" y="318" fill="#34d399" fontSize="9">⭐⭐⭐</text>
          <text x="370" y="318" fill="#34d399" fontSize="9">⭐⭐</text>
          <text x="460" y="318" fill="#34d399" fontSize="9">⭐⭐⭐</text>
          <text x="560" y="318" fill="#F59E0B" fontSize="9">400K</text>
          <text x="660" y="318" fill="#F59E0B" fontSize="9">$$$</text>

          {/* Row 2: Claude */}
          <text x="40" y="336" fill="#e2e8f0" fontSize="9">Opus 4.6</text>
          <text x="180" y="336" fill="#34d399" fontSize="9">⭐⭐⭐</text>
          <text x="280" y="336" fill="#34d399" fontSize="9">⭐⭐⭐</text>
          <text x="370" y="336" fill="#F59E0B" fontSize="9">❌</text>
          <text x="460" y="336" fill="#F59E0B" fontSize="9">⭐</text>
          <text x="560" y="336" fill="#34d399" fontSize="9">1M</text>
          <text x="660" y="336" fill="#ef4444" fontSize="9">$$$$</text>

          {/* Row 3: Cursor */}
          <text x="40" y="354" fill="#e2e8f0" fontSize="9">Cursor</text>
          <text x="180" y="354" fill="#34d399" fontSize="9">⭐⭐⭐</text>
          <text x="280" y="354" fill="#F59E0B" fontSize="9">⭐⭐</text>
          <text x="370" y="354" fill="#F59E0B" fontSize="9">❌</text>
          <text x="460" y="354" fill="#F59E0B" fontSize="9">❌</text>
          <text x="560" y="354" fill="#34d399" fontSize="9">多模型</text>
          <text x="660" y="354" fill="#34d399" fontSize="9">$$</text>

          {/* Row 4: Gemini */}
          <text x="40" y="372" fill="#e2e8f0" fontSize="9">Gemini 3</text>
          <text x="180" y="372" fill="#F59E0B" fontSize="9">⭐⭐</text>
          <text x="280" y="372" fill="#34d399" fontSize="9">⭐⭐</text>
          <text x="370" y="372" fill="#34d399" fontSize="9">⭐⭐</text>
          <text x="460" y="372" fill="#34d399" fontSize="9">⭐⭐⭐</text>
          <text x="560" y="372" fill="#34d399" fontSize="9">1M</text>
          <text x="660" y="372" fill="#34d399" fontSize="9">$</text>

          {/* Row 5: Perplexity */}
          <text x="40" y="390" fill="#e2e8f0" fontSize="9">Perplexity</text>
          <text x="180" y="390" fill="#F59E0B" fontSize="9">⭐</text>
          <text x="280" y="390" fill="#F59E0B" fontSize="9">⭐⭐</text>
          <text x="370" y="390" fill="#34d399" fontSize="9">⭐⭐⭐</text>
          <text x="460" y="390" fill="#F59E0B" fontSize="9">⭐</text>
          <text x="560" y="390" fill="#F59E0B" fontSize="9">—</text>
          <text x="660" y="390" fill="#34d399" fontSize="9">$$</text>

          {/* Row 6: Copilot */}
          <text x="40" y="408" fill="#e2e8f0" fontSize="9">Copilot</text>
          <text x="180" y="408" fill="#34d399" fontSize="9">⭐⭐</text>
          <text x="280" y="408" fill="#F59E0B" fontSize="9">⭐</text>
          <text x="370" y="408" fill="#F59E0B" fontSize="9">❌</text>
          <text x="460" y="408" fill="#F59E0B" fontSize="9">❌</text>
          <text x="560" y="408" fill="#F59E0B" fontSize="9">—</text>
          <text x="660" y="408" fill="#34d399" fontSize="9">$$</text>

          {/* Row 7: DeepSeek */}
          <text x="40" y="426" fill="#e2e8f0" fontSize="9">DeepSeek</text>
          <text x="180" y="426" fill="#34d399" fontSize="9">⭐⭐⭐</text>
          <text x="280" y="426" fill="#34d399" fontSize="9">⭐⭐</text>
          <text x="370" y="426" fill="#F59E0B" fontSize="9">❌</text>
          <text x="460" y="426" fill="#F59E0B" fontSize="9">⭐</text>
          <text x="560" y="426" fill="#F59E0B" fontSize="9">128K</text>
          <text x="660" y="426" fill="#34d399" fontSize="9">$</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>文字 AI</strong>：GPT-5.3 Codex 同 Claude 係兩大王者。GPT-5.3 Codex 推理同多模態最強（400K context），Claude 嘅 1M (beta) context window 適合處理大型 codebase。Gemini 贏在免費 API 同超長 1M context。DeepSeek 係開源界王者，API 成本極低，適合預算有限嘅開發者。</span></li>
        <li><span className="step-num">2</span><span><strong>開發 AI</strong>：Cursor 做 IDE 整合最成熟，支援多模型切換。Claude Code 係 CLI-first，適合 terminal 重度使用者。Copilot 最適合 inline 自動補全。OpenClaw 係開源 AI Agent，適合需要自建同自訂嘅團隊。</span></li>
        <li><span className="step-num">3</span><span><strong>搜尋 AI</strong>：Perplexity 係 AI 搜尋引擎，每個答案都有引用來源。做 research 或者需要最新資訊嘅時候首選。</span></li>
        <li><span className="step-num">4</span><span><strong>設計 / 自動化</strong>：Canva 同 Figma AI 處理視覺設計，Notion AI 管理知識庫，Zapier/Make 串接唔同服務做自動化。</span></li>
      </ol>
    </div>
  );
}

function FrameworkTab() {
  return (
    <div className="card">
      <h2>工具選型決策框架</h2>
      <div className="subtitle">唔同場景用唔同工具，5 個維度幫你揀</div>
      <p>揀 AI 工具唔係邊個最出名就用邊個，而係根據你嘅<strong>任務類型、預算、隱私需求、Context 大小同團隊配合</strong>嚟決定。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>① 任務類型 → 工具定位</h4>
          <p><strong style={{ color: '#a78bfa' }}>純寫 Code</strong> → Cursor / Claude Code / Copilot<br />
          <strong style={{ color: '#34d399' }}>Research + 分析</strong> → Perplexity / ChatGPT<br />
          <strong style={{ color: '#F59E0B' }}>System Design</strong> → Claude（長 context）/ ChatGPT（推理）</p>
        </div>
        <div className="key-point">
          <h4>② 預算考量</h4>
          <p><strong style={{ color: '#34d399' }}>免費 / 低成本</strong>：Gemini Flash API（$0.075/1M tokens）、DeepSeek V3.2 API（$0.28-0.42/1M tokens）、Copilot 免費版<br />
          <strong style={{ color: '#F59E0B' }}>中等</strong>：ChatGPT Plus $20/月、Cursor Pro $20/月<br />
          <strong style={{ color: '#ef4444' }}>高預算</strong>：Claude Opus API（$15-75/1M tokens）、GPT-5 API</p>
        </div>
        <div className="key-point">
          <h4>③ Context Window 需求</h4>
          <p><strong>小型任務（&lt;10K tokens）</strong>：任何工具都得<br />
          <strong>中型專案（10-100K）</strong>：ChatGPT / Claude Sonnet，GPT-5.3 Codex 400K 亦好適合<br />
          <strong>大型 Codebase（100K+）</strong>：Claude Opus 4.6（1M beta）/ Gemini Pro（1M）</p>
        </div>
        <div className="key-point">
          <h4>④ 隱私同安全</h4>
          <p><strong>敏感數據</strong>：Claude（唔會用你嘅數據訓練）、本地模型<br />
          <strong>一般開發</strong>：ChatGPT / Cursor（有 data retention policy）<br />
          <strong>公開資訊</strong>：任何工具都適合</p>
        </div>
        <div className="key-point">
          <h4>⑤ 團隊協作</h4>
          <p><strong>個人開發</strong>：Cursor + ChatGPT 已經夠用<br />
          <strong>團隊</strong>：GitHub Copilot Business + Notion AI<br />
          <strong>企業</strong>：Claude Enterprise / Azure OpenAI + 自建 Proxy，OpenClaw + self-hosted 模型適合企業隱私需求</p>
        </div>
      </div>

      <div className="use-case">
        <h4>快速決策法則</h4>
        <p>唔知揀咩？用呢個順序：<br />
        ① 先試 ChatGPT（最全能）→ ② 如果要寫 Code 就加 Cursor → ③ 大 codebase 用 Claude → ④ 要搜尋用 Perplexity → ⑤ 要平就用 Gemini Flash → ⑥ 開源自建就用 DeepSeek / OpenClaw。</p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰場景：3 個工具鏈 Walkthrough</h2>
      <div className="subtitle">真實開發場景，逐步拆解用邊啲工具</div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>
            <strong style={{ color: '#ef4444' }}>場景：Debug Production Issue</strong><br />
            <strong>工具鏈：</strong>Perplexity → ChatGPT → Cursor<br />
            <strong>流程：</strong>① Perplexity 搜尋 error message 同 stack trace，搵到相關 GitHub issues 同 StackOverflow → ② ChatGPT 分析 log pattern，推理 root cause，提出 3 個假設 → ③ Cursor 打開 codebase，用 Agent 模式搵到問題代碼，生成修復 patch → ④ Copilot 補全 unit test 驗證修復
          </span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>
            <strong style={{ color: '#34d399' }}>場景：Build Feature from Spec</strong><br />
            <strong>工具鏈：</strong>Claude → Cursor → Copilot<br />
            <strong>流程：</strong>① Claude（200K context）讀曬成個 spec + 現有 codebase，生成 implementation plan → ② Cursor 按 plan 逐步實作，用 multi-file editing → ③ Copilot 自動補全 boilerplate + 生成 test cases → ④ ChatGPT review 整個 PR，提出改善建議
          </span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>
            <strong style={{ color: '#F59E0B' }}>場景：Write Technical Documentation</strong><br />
            <strong>工具鏈：</strong>Cursor → ChatGPT → Notion AI<br />
            <strong>流程：</strong>① Cursor 讀 codebase 自動生成 API endpoint 列表同 type definitions → ② ChatGPT 將技術細節轉成清晰嘅文檔結構，加入使用例子 → ③ Notion AI 整理成團隊 wiki 格式，自動生成目錄同 cross-reference
          </span>
        </li>
      </ol>

      <div className="use-case">
        <h4>工具鏈組合原則</h4>
        <p>最有效嘅做法係 <strong>Research → Think → Code → Review</strong> 四步。每步用最適合嘅工具：Research 用搜尋型（Perplexity），Think 用推理型（ChatGPT/Claude），Code 用 IDE 型（Cursor），Review 用長 context 型（Claude）。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">工具選擇顧問 — 描述你嘅需求，AI 推薦最佳工具組合</div>

      <div className="prompt-card">
        <h4>Prompt — 工具選擇顧問</h4>
        <div className="prompt-text">
          {`你係一個 AI 工具專家顧問。你熟悉 ChatGPT 5、Cursor、Claude Code、GitHub Copilot、Gemini、Perplexity、Grok、Canva、Notion AI 等 11 款主流 AI 工具嘅強弱。

我嘅情況：
- 任務類型：[例如：debug production issue / build new feature / write docs / system design]
- 預算：[免費 / $20/月以內 / 不限]
- 隱私需求：[處理敏感數據 / 一般開發 / 公開項目]
- Context 大小：[小型任務 / 中型專案 / 100K+ tokens 大 codebase]
- 團隊規模：[個人 / 2-5人 / 10+人]

請你：
1. 推薦最佳嘅 3 款工具組合
2. 解釋每個工具喺呢個場景嘅角色同定位
3. 列出完整嘅工作流（step-by-step）
4. 比較替代方案同 trade-off
5. 預估每月使用成本`}
        </div>
      </div>
    </div>
  );
}

function QuizTab() {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const questions = [
    { id: 1, q: '如果你需要處理一個 150K tokens 嘅大型 codebase，以下邊個工具最適合？', options: ['ChatGPT 5', 'Cursor', 'Claude Opus 4.6', 'GitHub Copilot'], correct: 2 },
    { id: 2, q: 'Perplexity 相比 ChatGPT 嘅最大優勢係咩？', options: ['寫 Code 更好', '每個答案都有引用來源', 'Context window 更大', '免費使用'], correct: 1 },
    { id: 3, q: '以下邊個組合最適合「Research → Code → Test」workflow？', options: ['ChatGPT → ChatGPT → ChatGPT', 'Perplexity → Cursor → Copilot', 'Claude → Claude → Claude', 'Gemini → Gemini → Gemini'], correct: 1 },
    { id: 4, q: 'Gemini 3 Flash 嘅最大賣點係咩？', options: ['推理能力最強', '超低成本 + 1M context（DeepSeek 更平但冇 1M context）', 'IDE 整合最好', '搜尋能力最強'], correct: 1 },
    { id: 5, q: '處理敏感數據時，以下邊個 AI 服務最適合？', options: ['ChatGPT（OpenAI）', 'Claude（Anthropic）', 'Gemini（Google）', 'Copilot（GitHub）'], correct: 1 },
  ];

  const score = submitted ? questions.filter((q) => answers[q.id] === q.correct).length : 0;

  return (
    <div className="card">
      <h2>小測驗</h2>
      <div className="subtitle">測試你對 AI 工具嘅理解</div>
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
          <strong>{score}/5</strong> — {score >= 4 ? '勁！你對 AI 工具嘅理解好紮實。' : '仲有進步空間，建議重溫工具對比表。'}
        </div>
      )}
    </div>
  );
}

export default function AIToolsLandscape() {
  return (
    <>
      <TopicTabs
        title="AI 工具全景圖"
        subtitle="13 款主流 AI 工具對比 — 邊個做咩最強，工程師點揀"
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
