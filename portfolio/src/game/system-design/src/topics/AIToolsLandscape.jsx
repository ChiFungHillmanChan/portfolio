import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const relatedTopics = [
  { slug: 'ai-model-comparison', label: 'AI 模型深入對比' },
  { slug: 'multi-ai-workflow', label: '多 AI 協作工作流' },
  { slug: 'api-token-security', label: 'API Token 安全與成本' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering' },
];

const FACT_CHECK_META = {
  asOf: '2026-02-16',
  sources: ['OpenAI pricing', 'Anthropic pricing', 'Gemini API pricing', 'DeepSeek API pricing'],
};

/* ── Category Card ── */
function CategoryCard({ color, icon, title, items }) {
  return (
    <div style={{ background: '#1a1d27', borderRadius: 12, padding: '20px', border: `1.5px solid ${color}`, flex: '1 1 280px', minWidth: 0 }}>
      <div style={{ color, fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, textAlign: 'center' }}>{icon} {title}</div>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: '0.85rem', color: item.dim ? '#9ca3af' : '#e2e8f0', lineHeight: 1.7 }}>
          {item.text}
        </div>
      ))}
    </div>
  );
}

/* ── Comparison Table ── */
function ComparisonTable() {
  const modelHeaders = ['AI 模型', 'Coding', '推理', '搜尋', '多模態', 'Context', '價格'];
  const modelRows = [
    { name: 'GPT-5.2 Codex', coding: '⭐⭐', reasoning: '⭐⭐⭐', search: '⭐⭐', multimodal: '⭐⭐⭐', context: '400K', pricing: '$20 (需 VPN)', priceColor: '#F59E0B' },
    { name: 'Claude Opus 4.6', coding: '⭐⭐⭐', reasoning: '⭐⭐⭐', search: '❌', multimodal: '⭐', context: '1M*', pricing: '$20 (需 VPN)', priceColor: '#F59E0B' },
    { name: 'Gemini 3', coding: '⭐⭐', reasoning: '⭐⭐', search: '⭐⭐', multimodal: '⭐⭐⭐', context: '1M', pricing: '免費 (需 VPN)', priceColor: '#34d399' },
    { name: 'DeepSeek', coding: '⭐⭐⭐', reasoning: '⭐⭐', search: '❌', multimodal: '⭐', context: '128K', pricing: '免費 / API 極平', priceColor: '#34d399' },
  ];

  const toolHeaders = ['工具 / IDE', 'Coding', '推理', '搜尋', '多模態', '底層模型', '月費 (個人)'];
  const toolRows = [
    { name: 'Cursor', coding: '⭐⭐⭐', reasoning: '⭐⭐', search: '❌', multimodal: '❌', engine: '多模型', pricing: '$20 (用量制)', priceColor: '#F59E0B' },
    { name: 'Antigravity', coding: '⭐⭐⭐', reasoning: '⭐⭐', search: '❌', multimodal: '⭐⭐', engine: 'Gemini 3', pricing: '免費預覽', priceColor: '#34d399' },
    { name: 'Copilot', coding: '⭐⭐', reasoning: '⭐', search: '❌', multimodal: '❌', engine: '—', pricing: '$10', priceColor: '#34d399' },
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ textAlign: 'center', color: '#e2e8f0', fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>AI 模型對比（只比較模型）</h3>
      <div className="content-table-wrapper">
        <table className="content-table">
          <thead>
            <tr>{modelHeaders.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {modelRows.map((row) => (
              <tr key={row.name}>
                <td style={{ fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{row.name}</td>
                <td>{row.coding}</td>
                <td>{row.reasoning}</td>
                <td>{row.search}</td>
                <td>{row.multimodal}</td>
                <td style={{ color: '#34d399' }}>{row.context}</td>
                <td style={{ color: row.priceColor, whiteSpace: 'nowrap' }}>{row.pricing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ textAlign: 'center', color: '#e2e8f0', fontWeight: 700, fontSize: '1rem', margin: '20px 0 16px' }}>工具 / IDE 對比（只比較產品）</h3>
      <div className="content-table-wrapper">
        <table className="content-table">
          <thead>
            <tr>{toolHeaders.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {toolRows.map((row) => (
              <tr key={row.name}>
                <td style={{ fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{row.name}</td>
                <td>{row.coding}</td>
                <td>{row.reasoning}</td>
                <td>{row.search}</td>
                <td>{row.multimodal}</td>
                <td style={{ color: '#9ca3af' }}>{row.engine}</td>
                <td style={{ color: row.priceColor, whiteSpace: 'nowrap' }}>{row.pricing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="card">
      <h2>AI 工具全景圖</h2>
      <div className="subtitle">而家最強嘅 AI 工具，工程師點揀</div>
      <p>
        而家市面上有太多 AI 工具，唔同工具嘅定位完全唔同。<strong style={{ color: '#a78bfa' }}>識揀工具</strong> 同 <strong style={{ color: '#34d399' }}>識用工具</strong> 係兩回事——好多人淨係用 ChatGPT，但其實唔同場景用唔同工具，效率可以差 5-10 倍。
      </p>

      {/* Category Cards — HTML grid, wraps on mobile */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
        <CategoryCard
          color="#a78bfa"
          icon="💬"
          title="文字 AI"
          items={[
            { text: 'GPT-5.2 Codex — Agentic 編程 + 推理' },
            { text: 'Claude Opus 4.6 — 高質量推理（1M context，API only）' },
            { text: 'Gemini 3 — 多模態 + Deep Think（免費但需 VPN）' },
            { text: 'Perplexity — 搜尋引擎 + 引用來源', dim: true },
            { text: 'DeepSeek — 開源 + 超低成本 API', dim: true },
          ]}
        />
        <CategoryCard
          color="#34d399"
          icon="🛠"
          title="開發 AI / IDE"
          items={[
            { text: 'Cursor — 多模型 IDE + Agent（$20/月用量制）' },
            { text: 'Antigravity — Google Agent-first IDE（免費預覽）' },
            { text: 'VS Code + Copilot — 自動補全 + 擴充豐富' },
            { text: 'Claude Code — 長 Context CLI Agent', dim: true },
            { text: 'OpenClaw — 開源 AI Agent + 183K ⭐', dim: true },
          ]}
        />
        <CategoryCard
          color="#F59E0B"
          icon="🎨"
          title="設計 / 自動化"
          items={[
            { text: 'Canva — 海報 + 社交媒體設計' },
            { text: 'Figma AI — Wireframe + UI 設計' },
            { text: 'Notion AI — 知識管理 + 文件' },
            { text: 'Zapier / Make — 自動化工作流', dim: true },
          ]}
        />
      </div>

      {/* Comparison Table — HTML, scrollable on mobile */}
      <ComparisonTable />

      <ol className="steps" style={{ marginTop: 24 }}>
        <li><span className="step-num">1</span><span><strong>文字 AI</strong>：GPT-5.2 Codex 同 Claude Opus 4.6 係兩大王者。Codex 推理同多模態強（400K context）；Opus 偏重深度分析（1M context 只限 API 路徑）。Gemini 3 有免費 token 額度同 1M context（部分地區要 VPN），DeepSeek 係開源界王者，API 成本極低。</span></li>
        <li><span className="step-num">2</span><span><strong>開發 IDE</strong>：Cursor 做 IDE 整合最成熟，支援多模型切換，$20/月但係用量制（用得多可能未到月尾就用曬）。Antigravity 係 Google 新出嘅 Agent-first IDE，免費預覽中，支援多個 AI agent 平行工作。VS Code 配 Copilot 最普及，加上 extension 可以用 Codex 同 Claude。</span></li>
        <li><span className="step-num">3</span><span><strong>搜尋 AI</strong>：Perplexity 係 AI 搜尋引擎，每個答案都有引用來源。做 research 嘅時候用，但唔適合寫 code。</span></li>
        <li><span className="step-num">4</span><span><strong>設計 / 自動化</strong>：Canva 同 Figma AI 處理視覺設計，Notion AI 管理知識庫，Zapier/Make 串接唔同服務做自動化。</span></li>
      </ol>
      <p className="text-xs text-text-dimmer mt-4">
        Data as of {FACT_CHECK_META.asOf}. Sources: {FACT_CHECK_META.sources.join(' / ')}. *Claude 1M 為 API 路徑能力。
      </p>
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
          <p><strong style={{ color: '#a78bfa' }}>純寫 Code</strong> → Cursor / Antigravity / Claude Code<br />
          <strong style={{ color: '#34d399' }}>Research + 分析</strong> → Perplexity / ChatGPT<br />
          <strong style={{ color: '#F59E0B' }}>System Design</strong> → Claude（長 context）/ ChatGPT（推理）</p>
        </div>
        <div className="key-point">
          <h4>② 預算考量</h4>
          <p><strong style={{ color: '#34d399' }}>免費</strong>：Gemini 3 API 有免費額度（需 VPN）、Antigravity 免費預覽中、DeepSeek API 極平、Copilot 免費版<br />
          <strong style={{ color: '#F59E0B' }}>$10-20/月</strong>：ChatGPT Plus $20/月（需 VPN）、Claude Pro $20/月（需 VPN）、Cursor Pro $20/月（用量制，用完即止）、Copilot Pro $10/月<br />
          <strong style={{ color: '#ef4444' }}>API 高用量</strong>：Claude Opus API（$5-25/1M tokens）、GPT-5.2 API（$1.75-14/1M tokens）</p>
        </div>
        <div className="key-point">
          <h4>③ Context Window 需求</h4>
          <p><strong>小型任務（&lt;10K tokens）</strong>：任何工具都得<br />
          <strong>中型專案（10-100K）</strong>：ChatGPT / Claude Sonnet，GPT-5.2 Codex 400K 亦好適合<br />
          <strong>大型 Codebase（100K+）</strong>：Gemini Pro（1M）/ Opus API 1M 路線</p>
        </div>
        <div className="key-point">
          <h4>④ 隱私同安全</h4>
          <p><strong>敏感數據</strong>：Claude（唔會用你嘅數據訓練）、本地模型<br />
          <strong>一般開發</strong>：ChatGPT / Cursor（有 data retention policy）<br />
          <strong>公開資訊</strong>：任何工具都適合</p>
        </div>
        <div className="key-point">
          <h4>⑤ 團隊協作</h4>
          <p><strong>個人開發</strong>：Cursor + Claude 已經夠用<br />
          <strong>團隊</strong>：GitHub Copilot Business + Notion AI<br />
          <strong>企業</strong>：Claude Enterprise / Azure OpenAI + 自建 Proxy</p>
        </div>
      </div>

      {/* IDE Comparison */}
      <div style={{ marginTop: 24, padding: '20px', background: '#13151c', borderRadius: 12, border: '1px solid #2a2d3a' }}>
        <h3 style={{ color: '#34d399', fontSize: '1.1rem', marginBottom: 16 }}>🖥️ AI IDE 三強對比</h3>
        <div className="content-table-wrapper">
          <table className="content-table">
            <thead>
              <tr>
                <th>IDE</th>
                <th>核心優勢</th>
                <th>弱點</th>
                <th>月費</th>
                <th>適合邊個</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600, color: '#e2e8f0' }}>VS Code + Copilot</td>
                <td>最多 extension、支援 Codex / Claude 擴充、生態最大、免費版夠用</td>
                <td>AI 功能要靠 extension 拼湊，原生 agent 能力弱過 Cursor</td>
                <td style={{ color: '#34d399', whiteSpace: 'nowrap' }}>免費 / $10</td>
                <td>鍾意自己配工具、已經用開 VS Code 嘅人</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: '#e2e8f0' }}>Cursor</td>
                <td>原生 AI Agent 最成熟、多模型切換（Claude / GPT / Gemini）、multi-file editing 最強</td>
                <td>$20/月用量制，重度使用可能未到月尾就用曬額度</td>
                <td style={{ color: '#F59E0B', whiteSpace: 'nowrap' }}>$20 (用量制)</td>
                <td>全職開發者、需要 AI 深度整合嘅人</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: '#e2e8f0' }}>Antigravity (Google)</td>
                <td>Agent-first 設計、多個 agent 平行工作、內建瀏覽器驗證、Gemini 3 原生支援</td>
                <td>新產品穩定性未知、model 選擇暫時限 Gemini 同 Claude Sonnet</td>
                <td style={{ color: '#34d399', whiteSpace: 'nowrap' }}>免費預覽</td>
                <td>想試多 agent 工作流、Google 生態嘅用家</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="use-case" style={{ marginTop: 16 }}>
        <h4>快速決策法則</h4>
        <p>唔知揀咩？用呢個順序：<br />
        ① 先試 Cursor（AI coding 最成熟）→ ② 大 codebase 用 Claude Opus → ③ 想免費試多 agent 就用 Antigravity → ④ 已有 VS Code 習慣就加 Copilot + Claude extension → ⑤ 要平嘅 API 就用 DeepSeek / Gemini Flash。</p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰場景：3 個工具鏈 Walkthrough</h2>
      <div className="subtitle">而家最強嘅 coding 工具鏈——以 GPT-5.2 + Opus 4.6 為核心</div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>
            <strong style={{ color: '#ef4444' }}>場景：Debug Production Issue</strong><br />
            <strong>工具鏈：</strong>Claude Opus → Cursor Agent<br />
            <strong>流程：</strong>① 將 error log + stack trace 貼入 Claude Opus 4.6 做 root cause 分析，提出修復方案 → ② 用 Cursor Agent 模式打開 codebase，按 Claude 嘅分析搵到問題代碼，生成修復 patch → ③ Cursor 自動生成 unit test 驗證修復 → ④ Claude review 整個 diff 確保冇 side effect
          </span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>
            <strong style={{ color: '#34d399' }}>場景：Build Feature from Spec</strong><br />
            <strong>工具鏈：</strong>Claude Opus → Cursor / Antigravity<br />
            <strong>流程：</strong>① Claude Opus 讀 spec + 現有 codebase（超長 context 場景可改用 Gemini Pro / Opus API 1M），生成 implementation plan 同 file structure → ② Cursor 按 plan 逐步實作，用 multi-file editing 同時改多個檔案 → ③ 或者用 Antigravity 開多個 agent 平行處理唔同模組 → ④ 最後用 Claude review 成個 PR
          </span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>
            <strong style={{ color: '#F59E0B' }}>場景：Greenfield 新項目</strong><br />
            <strong>工具鏈：</strong>GPT-5.2 Codex → Antigravity / Cursor<br />
            <strong>流程：</strong>① 用 GPT-5.2 Codex（Agentic 模式）做 system design——定義 architecture、API contract、database schema → ② Antigravity 用多 agent 同時 scaffold 前後端 + infra config → ③ Cursor 做細節實作同 debug → ④ Claude Opus review 整體架構同 security
          </span>
        </li>
      </ol>

      <div className="use-case">
        <h4>工具鏈組合原則</h4>
        <p>而家最有效嘅做法係 <strong>Think → Code → Review</strong> 三步。Think 用推理型（Claude Opus / GPT-5.2 Codex），Code 用 IDE 型（Cursor / Antigravity），Review 用長 context 型（Claude Opus）。Perplexity 適合做 research 搵資料，但唔適合用嚟寫 code。</p>
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
          {`你係一個 AI 工具專家顧問。你熟悉 ChatGPT 5（GPT-5.2 Codex）、Claude（Opus 4.6）、Cursor、Google Antigravity、GitHub Copilot、Gemini 3、Perplexity、DeepSeek 等主流 AI 工具嘅強弱。

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
    { id: 1, q: '如果你需要處理一個 150K tokens 嘅大型 codebase，以下邊個工具最適合？', options: ['ChatGPT 5.2', 'Cursor', 'Claude Opus 4.6', 'GitHub Copilot'], correct: 2, explanation: '150K 屬於中大型分析任務，Claude Opus/長 context 路線通常比純 IDE 補全工具更穩。' },
    { id: 2, q: 'Cursor Pro $20/月嘅計費模式係點？', options: ['無限使用', '用量制，用完即止', '按 token 計', '每日有上限'], correct: 1, explanation: 'Cursor 係 subscription + usage 型，重度使用時要注意月內額度。' },
    { id: 3, q: '以下邊個 IDE 支援多個 AI Agent 平行工作？', options: ['VS Code', 'Cursor', 'Google Antigravity', 'Sublime Text'], correct: 2, explanation: 'Antigravity 主打 multi-agent workflow。' },
    { id: 4, q: 'Gemini 3 嘅最大賣點係咩？', options: ['推理能力最強', '免費 token 額度 + 1M context（部分地區需 VPN）', 'IDE 整合最好', '搜尋能力最強'], correct: 1, explanation: 'Gemini 3 核心優勢係長 context + 多模態 + 成本表現，唔係 IDE 整合。' },
    { id: 5, q: '處理敏感數據時，以下邊個 AI 服務最適合？', options: ['ChatGPT（OpenAI）', 'Claude（Anthropic）', 'Gemini（Google）', 'Copilot（GitHub）'], correct: 1, explanation: '敏感場景通常優先選擇政策與控管較嚴格嘅企業路線，最終仍要按你團隊合規要求落實。' },
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
          {submitted && answers[q.id] !== undefined && (
            <p style={{ marginTop: 6, color: answers[q.id] === q.correct ? '#34d399' : '#f87171', fontSize: 13 }}>
              {answers[q.id] === q.correct ? '✓' : '✗'} {q.explanation}
            </p>
          )}
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
        subtitle="主流 AI 工具對比 — 邊個做咩最強，工程師點揀"
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
