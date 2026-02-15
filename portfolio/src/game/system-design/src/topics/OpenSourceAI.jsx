import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const relatedTopics = [
  { slug: 'ai-model-comparison', label: 'AI 模型深入對比' },
  { slug: 'ai-tools-landscape', label: 'AI 工具全景圖' },
  { slug: 'coding-agent-design', label: 'Coding Agent 設計' },
  { slug: 'api-token-security', label: 'API Token 安全與成本' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>開源 AI 生態圈</h2>
      <div className="subtitle">點解開源 AI 重要？邊個模型最強？點樣自建部署？</div>
      <p>
        2025-2026 年，開源 AI 經歷咗爆發式增長。DeepSeek V3.2 以 MIT license 提供接近 GPT-5 嘅能力，Llama 4 Scout 支援 10M token context，OpenClaw 成為最受歡迎嘅開源 AI agent（183K GitHub stars）。作為工程師，你需要知道<strong style={{ color: '#ef4444' }}>幾時用商業 API、幾時用開源方案</strong>。
      </p>
      <p>開源 AI 嘅四大優勢：<strong>成本低</strong>（API 定價或自建推理）、<strong>私隱保護</strong>（數據唔離開你嘅 server）、<strong>可自訂</strong>（fine-tune 到你嘅 domain）、<strong>無供應商鎖定</strong>。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-os" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
          </defs>
          <text x="375" y="28" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="700">開源 vs 閉源 AI 對比</text>

          {/* Table header */}
          <rect x="20" y="42" width="710" height="30" rx="6" fill="#1e293b" />
          <text x="80" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10" fontWeight="700">維度</text>
          <text x="270" y="62" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="700">開源 (DeepSeek / Llama / OpenClaw)</text>
          <text x="560" y="62" textAnchor="middle" fill="#3B82F6" fontSize="10" fontWeight="700">閉源 (GPT / Claude / Gemini)</text>

          {/* Row 1: Cost */}
          <rect x="20" y="76" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="80" y="95" textAnchor="middle" fill="#e2e8f0" fontSize="10">成本</text>
          <text x="270" y="95" textAnchor="middle" fill="#34d399" fontSize="10">$0.28-0.42/1M tokens 或自建免費</text>
          <text x="560" y="95" textAnchor="middle" fill="#F59E0B" fontSize="10">$0.10-75/1M tokens</text>

          {/* Row 2: Privacy */}
          <rect x="20" y="104" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="80" y="123" textAnchor="middle" fill="#e2e8f0" fontSize="10">私隱</text>
          <text x="270" y="123" textAnchor="middle" fill="#34d399" fontSize="10">數據留喺你 server，完全控制</text>
          <text x="560" y="123" textAnchor="middle" fill="#F59E0B" fontSize="10">數據經第三方，需信任供應商</text>

          {/* Row 3: Customization */}
          <rect x="20" y="132" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="80" y="151" textAnchor="middle" fill="#e2e8f0" fontSize="10">自訂</text>
          <text x="270" y="151" textAnchor="middle" fill="#34d399" fontSize="10">可 fine-tune、改 architecture</text>
          <text x="560" y="151" textAnchor="middle" fill="#ef4444" fontSize="10">只能用 prompt / RAG</text>

          {/* Row 4: Performance */}
          <rect x="20" y="160" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="80" y="179" textAnchor="middle" fill="#e2e8f0" fontSize="10">頂級性能</text>
          <text x="270" y="179" textAnchor="middle" fill="#F59E0B" fontSize="10">接近但仍有差距（~90-95%）</text>
          <text x="560" y="179" textAnchor="middle" fill="#34d399" fontSize="10">最強（Opus 4.6 / GPT-5.3）</text>

          {/* Row 5: Setup */}
          <rect x="20" y="188" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="80" y="207" textAnchor="middle" fill="#e2e8f0" fontSize="10">部署難度</text>
          <text x="270" y="207" textAnchor="middle" fill="#ef4444" fontSize="10">需要 GPU infra / DevOps 知識</text>
          <text x="560" y="207" textAnchor="middle" fill="#34d399" fontSize="10">API call 即用</text>

          {/* Row 6: Vendor Lock-in */}
          <rect x="20" y="216" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="80" y="235" textAnchor="middle" fill="#e2e8f0" fontSize="10">鎖定風險</text>
          <text x="270" y="235" textAnchor="middle" fill="#34d399" fontSize="10">無鎖定，隨時換模型</text>
          <text x="560" y="235" textAnchor="middle" fill="#ef4444" fontSize="10">API 改價 / 停服務 = 大問題</text>

          {/* Decision guide */}
          <rect x="20" y="265" width="710" height="120" rx="12" fill="#1a1d27" stroke="#475569" strokeWidth="1" />
          <text x="375" y="290" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="700">點樣揀？</text>
          <text x="40" y="315" fill="#34d399" fontSize="10">✅ 用開源：預算有限 / 處理敏感數據 / 需要 fine-tune / 高吞吐量 batch 任務</text>
          <text x="40" y="340" fill="#3B82F6" fontSize="10">✅ 用閉源：需要最強推理 / 快速 prototype / 唔想管 infra / multimodal 需求</text>
          <text x="40" y="365" fill="#F59E0B" fontSize="10">✅ 混合：閉源做 planning + 開源做 execution = 成本降 60-80%</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#ef4444' }}>DeepSeek</strong>：中國 AI 公司，V3.2 用 MoE 架構（256 experts），MIT license 完全開源。API 定價 $0.28/$0.42 per 1M tokens，係商業模型嘅 1/50。Sparse Attention 技術令佢喺長文本表現出色。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#3B82F6' }}>Meta Llama 4</strong>：Scout 版本支援 10M token context（史上最長），17B active / 109B total params。Maverick 版本 1M context，400B total params。兩個都支援 multimodal。完全開源，可自建部署。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#F59E0B' }}>Mistral / Mixtral</strong>：法國公司，MoE 架構效率極高。3B/8B 嘅小模型可以喺手機上跑，回應速度 &lt;500ms。適合 edge computing 同低延遲場景。</span></li>
        <li><span className="step-num">4</span><span><strong style={{ color: '#a78bfa' }}>Qwen（通義千問）</strong>：阿里巴巴出品，0.5B 到 72B params 都有。多語言能力最強（中英日韓），coding 能力出色。適合亞洲市場同多語言場景。</span></li>
        <li><span className="step-num">5</span><span><strong style={{ color: '#10B981' }}>OpenClaw</strong>：開源 AI agent，183K GitHub stars。前身係 Clawdbot → Moltbot（因 Anthropic 商標問題改名）。支援 100+ AgentSkills，可以連接 Claude / DeepSeek / GPT 做 backend LLM。</span></li>
      </ol>
    </div>
  );
}

function ModelComparisonTab() {
  return (
    <div className="card">
      <h2>開源模型深入對比</h2>
      <div className="subtitle">DeepSeek / Llama 4 / Mistral / Qwen — 各有咩強項？</div>
      <p>開源模型嘅發展速度驚人，以下係 2026 年初最值得關注嘅開源模型對比。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 350" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-mc" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
          </defs>

          {/* Table header */}
          <rect x="10" y="10" width="730" height="35" rx="8" fill="#1e3a5f" stroke="#3B82F6" strokeWidth="1.5" />
          <text x="75" y="32" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="700">模型</text>
          <text x="175" y="32" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="700">Context</text>
          <text x="270" y="32" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="700">Active Params</text>
          <text x="365" y="32" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="700">Total Params</text>
          <text x="455" y="32" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="700">License</text>
          <text x="545" y="32" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="700">API 成本</text>
          <text x="660" y="32" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="700">最佳用途</text>

          {/* Row 1: DeepSeek V3.2 */}
          <rect x="10" y="50" width="730" height="40" rx="6" fill="#1a2332" stroke="#334155" strokeWidth="1" />
          <text x="75" y="68" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="700">DeepSeek V3.2</text>
          <text x="175" y="68" textAnchor="middle" fill="#d1d5db" fontSize="10">128K</text>
          <text x="270" y="68" textAnchor="middle" fill="#d1d5db" fontSize="10">37B</text>
          <text x="365" y="68" textAnchor="middle" fill="#d1d5db" fontSize="10">685B (MoE)</text>
          <text x="455" y="68" textAnchor="middle" fill="#34d399" fontSize="10">MIT</text>
          <text x="545" y="68" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="700">$0.28/$0.42</text>
          <text x="660" y="68" textAnchor="middle" fill="#9ca3af" fontSize="9">通用 / Coding</text>

          {/* Row 2: Llama 4 Scout */}
          <rect x="10" y="95" width="730" height="40" rx="6" fill="#1a1f2e" stroke="#334155" strokeWidth="1" />
          <text x="75" y="113" textAnchor="middle" fill="#3B82F6" fontSize="10" fontWeight="700">Llama 4 Scout</text>
          <text x="175" y="113" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="700">10M (!)</text>
          <text x="270" y="113" textAnchor="middle" fill="#d1d5db" fontSize="10">17B</text>
          <text x="365" y="113" textAnchor="middle" fill="#d1d5db" fontSize="10">109B (16E)</text>
          <text x="455" y="113" textAnchor="middle" fill="#34d399" fontSize="10">Llama</text>
          <text x="545" y="113" textAnchor="middle" fill="#d1d5db" fontSize="10">自建</text>
          <text x="660" y="113" textAnchor="middle" fill="#9ca3af" fontSize="9">超長 Context</text>

          {/* Row 3: Llama 4 Maverick */}
          <rect x="10" y="140" width="730" height="40" rx="6" fill="#1a2332" stroke="#334155" strokeWidth="1" />
          <text x="75" y="158" textAnchor="middle" fill="#3B82F6" fontSize="10" fontWeight="700">Llama 4 Maverick</text>
          <text x="175" y="158" textAnchor="middle" fill="#d1d5db" fontSize="10">1M</text>
          <text x="270" y="158" textAnchor="middle" fill="#d1d5db" fontSize="10">17B</text>
          <text x="365" y="158" textAnchor="middle" fill="#d1d5db" fontSize="10">400B (128E)</text>
          <text x="455" y="158" textAnchor="middle" fill="#34d399" fontSize="10">Llama</text>
          <text x="545" y="158" textAnchor="middle" fill="#d1d5db" fontSize="10">自建</text>
          <text x="660" y="158" textAnchor="middle" fill="#9ca3af" fontSize="9">高質量推理</text>

          {/* Row 4: Mistral / Mixtral */}
          <rect x="10" y="185" width="730" height="40" rx="6" fill="#1a1f2e" stroke="#334155" strokeWidth="1" />
          <text x="75" y="203" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="700">Mixtral 8x22B</text>
          <text x="175" y="203" textAnchor="middle" fill="#d1d5db" fontSize="10">64K</text>
          <text x="270" y="203" textAnchor="middle" fill="#d1d5db" fontSize="10">39B</text>
          <text x="365" y="203" textAnchor="middle" fill="#d1d5db" fontSize="10">176B (MoE)</text>
          <text x="455" y="203" textAnchor="middle" fill="#34d399" fontSize="10">Apache 2.0</text>
          <text x="545" y="203" textAnchor="middle" fill="#d1d5db" fontSize="10">$0.60/$0.60</text>
          <text x="660" y="203" textAnchor="middle" fill="#9ca3af" fontSize="9">Edge / 低延遲</text>

          {/* Row 5: Qwen 2.5 */}
          <rect x="10" y="230" width="730" height="40" rx="6" fill="#1a2332" stroke="#334155" strokeWidth="1" />
          <text x="75" y="248" textAnchor="middle" fill="#a78bfa" fontSize="10" fontWeight="700">Qwen 2.5-72B</text>
          <text x="175" y="248" textAnchor="middle" fill="#d1d5db" fontSize="10">128K</text>
          <text x="270" y="248" textAnchor="middle" fill="#d1d5db" fontSize="10">72B</text>
          <text x="365" y="248" textAnchor="middle" fill="#d1d5db" fontSize="10">72B (Dense)</text>
          <text x="455" y="248" textAnchor="middle" fill="#34d399" fontSize="10">Apache 2.0</text>
          <text x="545" y="248" textAnchor="middle" fill="#d1d5db" fontSize="10">自建</text>
          <text x="660" y="248" textAnchor="middle" fill="#9ca3af" fontSize="9">多語言 / Coding</text>

          {/* Legend */}
          <text x="375" y="300" textAnchor="middle" fill="#9ca3af" fontSize="9">MoE = Mixture of Experts（只啟動部分參數，效率更高）| E = Expert 數量</text>
          <text x="375" y="318" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">綠色 = 該維度最強 / 最抵</text>
          <text x="375" y="338" textAnchor="middle" fill="#9ca3af" fontSize="9">API 成本 = USD per 1M tokens (input/output) | 自建 = 需要自己嘅 GPU infrastructure</text>
        </svg>
      </div>

      <div className="key-points">
        <div className="key-point">
          <h4>DeepSeek V3.2 — 性價比之王</h4>
          <p>MoE 架構用 256 experts，Sparse Attention 技術令長文本處理效率極高。MIT license 意味住你可以用喺任何商業場景。API 定價只需 Claude Opus 嘅 1/50，但 coding 同推理能力接近 GPT-5 水平。</p>
        </div>
        <div className="key-point">
          <h4>Llama 4 Scout — Context 怪獸</h4>
          <p>10M token context window 係所有模型中最長嘅，可以食曬成個大型 monorepo。17B active params 令佢嘅推理成本相對低。支援 multimodal（文字 + 圖片）。但需要自建 infra 嚟部署。</p>
        </div>
        <div className="key-point">
          <h4>Mixtral — Edge 部署首選</h4>
          <p>3B/8B 嘅小模型可以喺手機、Raspberry Pi 上跑。回應速度 &lt;500ms，適合 real-time 應用。Apache 2.0 license 完全開放。</p>
        </div>
        <div className="key-point">
          <h4>Qwen 2.5 — 多語言王者</h4>
          <p>中英日韓等多語言表現最好，0.5B 到 72B 都有。Coding 能力強（尤其 Python），適合亞洲市場嘅多語言應用。</p>
        </div>
      </div>
    </div>
  );
}

function OpenClawTab() {
  return (
    <div className="card">
      <h2>OpenClaw 實戰</h2>
      <div className="subtitle">開源 AI Agent 之王——183K GitHub Stars 嘅背後</div>
      <p>
        OpenClaw 係目前最受歡迎嘅開源 AI agent，前身係 Clawdbot（用 Claude API）→ Moltbot → 最終改名為 OpenClaw（因為 Anthropic 嘅商標政策）。佢嘅核心設計係一個<strong style={{ color: '#ef4444' }}>本地 agent + 外部 LLM</strong> 嘅架構。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-oc" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <marker id="arrOC" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
          </defs>
          <text x="375" y="25" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="700">OpenClaw 架構</text>

          {/* Local Agent */}
          <rect x="30" y="50" width="200" height="110" rx="14" fill="#1a1d27" stroke="#ef4444" strokeWidth="2" filter="url(#shadow-oc)" />
          <text x="130" y="75" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="700">OpenClaw Agent</text>
          <text x="130" y="95" textAnchor="middle" fill="#9ca3af" fontSize="9">本地運行</text>
          <text x="130" y="112" textAnchor="middle" fill="#9ca3af" fontSize="9">100+ AgentSkills</text>
          <text x="130" y="129" textAnchor="middle" fill="#9ca3af" fontSize="9">Shell / FS / Web / Git</text>

          {/* Arrow to LLM */}
          <path d="M232,105 L298,105" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrOC)" />
          <text x="265" y="97" textAnchor="middle" fill="#9ca3af" fontSize="8">API call</text>

          {/* External LLM */}
          <rect x="300" y="50" width="180" height="110" rx="14" fill="#1a1d27" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow-oc)" />
          <text x="390" y="75" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">External LLM</text>
          <text x="390" y="95" textAnchor="middle" fill="#9ca3af" fontSize="9">Claude / GPT / DeepSeek</text>
          <text x="390" y="112" textAnchor="middle" fill="#9ca3af" fontSize="9">提供推理能力</text>
          <text x="390" y="129" textAnchor="middle" fill="#9ca3af" fontSize="9">你揀邊個都得</text>

          {/* Arrow to Skills */}
          <path d="M130,162 L130,188" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrOC)" />

          {/* Skills grid */}
          <rect x="30" y="190" width="450" height="90" rx="12" fill="#1a1d27" stroke="#475569" strokeWidth="1" filter="url(#shadow-oc)" />
          <text x="255" y="215" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">AgentSkills（100+）</text>
          <text x="80" y="238" textAnchor="middle" fill="#34d399" fontSize="9">Shell 執行</text>
          <text x="170" y="238" textAnchor="middle" fill="#34d399" fontSize="9">檔案系統</text>
          <text x="260" y="238" textAnchor="middle" fill="#34d399" fontSize="9">Web 自動化</text>
          <text x="350" y="238" textAnchor="middle" fill="#34d399" fontSize="9">Git 操作</text>
          <text x="430" y="238" textAnchor="middle" fill="#34d399" fontSize="9">DB Query</text>
          <text x="80" y="260" textAnchor="middle" fill="#F59E0B" fontSize="9">消息發送</text>
          <text x="170" y="260" textAnchor="middle" fill="#F59E0B" fontSize="9">圖片處理</text>
          <text x="260" y="260" textAnchor="middle" fill="#F59E0B" fontSize="9">PDF 分析</text>
          <text x="350" y="260" textAnchor="middle" fill="#F59E0B" fontSize="9">API 調用</text>
          <text x="430" y="260" textAnchor="middle" fill="#F59E0B" fontSize="9">Code Review</text>

          {/* Security warning */}
          <rect x="510" y="50" width="220" height="230" rx="14" fill="#3d1a1a" stroke="#ef4444" strokeWidth="1.5" filter="url(#shadow-oc)" />
          <text x="620" y="75" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="700">⚠️ 安全考量</text>
          <text x="620" y="100" textAnchor="middle" fill="#fca5a5" fontSize="9">權限過大風險</text>
          <text x="620" y="120" textAnchor="middle" fill="#d1d5db" fontSize="9">• Shell 執行 = 完全控制</text>
          <text x="620" y="140" textAnchor="middle" fill="#d1d5db" fontSize="9">• FS 存取 = 讀寫任何檔案</text>
          <text x="620" y="160" textAnchor="middle" fill="#d1d5db" fontSize="9">• Web = 可能洩露資料</text>
          <text x="620" y="185" textAnchor="middle" fill="#fca5a5" fontSize="9">建議做法</text>
          <text x="620" y="205" textAnchor="middle" fill="#d1d5db" fontSize="9">• 用 Docker sandbox</text>
          <text x="620" y="225" textAnchor="middle" fill="#d1d5db" fontSize="9">• 設 allowlist</text>
          <text x="620" y="245" textAnchor="middle" fill="#d1d5db" fontSize="9">• 唔好用 root 權限</text>
          <text x="620" y="265" textAnchor="middle" fill="#d1d5db" fontSize="9">• 定期審計 logs</text>
        </svg>
      </div>

      <h3 style={{ color: '#e2e8f0', marginTop: 24 }}>OpenClaw vs 商業 Coding Agent 對比</h3>
      <div className="key-points">
        <div className="key-point">
          <h4>OpenClaw vs Claude Code</h4>
          <p><strong style={{ color: '#ef4444' }}>OpenClaw</strong>：開源、可自訂 skills、支援多個 LLM backend、社群驅動。<strong style={{ color: '#a78bfa' }}>Claude Code</strong>：Anthropic 官方、深度整合 Claude、Agent Teams 協作、更穩定。選擇取決於你要自由度定穩定性。</p>
        </div>
        <div className="key-point">
          <h4>OpenClaw vs Cursor</h4>
          <p><strong style={{ color: '#ef4444' }}>OpenClaw</strong>：CLI-first、terminal 操作、broader scope（唔止 coding）。<strong style={{ color: '#F59E0B' }}>Cursor</strong>：IDE-first、GUI 友好、專注寫 code。如果你係 terminal 重度用戶揀 OpenClaw，GUI 用戶揀 Cursor。</p>
        </div>
        <div className="key-point">
          <h4>OpenClaw vs GitHub Copilot</h4>
          <p><strong style={{ color: '#ef4444' }}>OpenClaw</strong>：full agent（可以執行任務、管理 files、run tests）。<strong style={{ color: '#10B981' }}>Copilot</strong>：inline 補全為主，agent 功能較弱。OpenClaw 更像助手，Copilot 更像自動補全。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>推薦配置</h4>
        <p>
          <strong>個人開發者</strong>：OpenClaw + DeepSeek V3.2 API = 幾乎零成本嘅 AI coding agent。<br />
          <strong>團隊</strong>：OpenClaw + Claude API = 開源靈活性 + 商業級推理能力。<br />
          <strong>企業</strong>：OpenClaw + self-hosted Llama 4 = 完全私有化，數據唔離開內網。
        </p>
      </div>
    </div>
  );
}

function QuizTab() {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const questions = [
    { id: 1, q: '以下邊個係開源 AI 嘅最大優勢？', options: ['推理能力最強', '部署最簡單', '數據私隱 + 無供應商鎖定', 'Multimodal 最好'], correct: 2 },
    { id: 2, q: 'DeepSeek V3.2 嘅 API 定價大約係 Claude Opus 嘅幾分之一？', options: ['1/5', '1/10', '1/50', '1/100'], correct: 2 },
    { id: 3, q: '邊個開源模型擁有最長嘅 context window？', options: ['DeepSeek V3.2 (128K)', 'Llama 4 Scout (10M)', 'Qwen 2.5-72B (128K)', 'Mixtral 8x22B (64K)'], correct: 1 },
    { id: 4, q: 'OpenClaw 嘅前身叫咩名？', options: ['ClaudeBot', 'Clawdbot → Moltbot', 'CopilotX', 'AutoCoder'], correct: 1 },
    { id: 5, q: '以下邊個係使用 OpenClaw 嘅最大安全風險？', options: ['API 成本太高', 'Agent 擁有過大嘅系統權限', '模型推理能力不足', '缺乏社群支持'], correct: 1 },
  ];

  const score = submitted ? questions.filter((q) => answers[q.id] === q.correct).length : 0;

  return (
    <div className="card">
      <h2>小測驗</h2>
      <div className="subtitle">測試你對開源 AI 生態圈嘅理解</div>
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
          <strong>{score}/5</strong> — {score >= 4 ? '勁！你對開源 AI 嘅理解好紮實。' : '建議重溫開源 vs 閉源對比同模型對比表。'}
        </div>
      )}
    </div>
  );
}

export default function OpenSourceAI() {
  return (
    <>
      <TopicTabs
        title="開源 AI 生態圈"
        subtitle="DeepSeek / Llama 4 / OpenClaw — 開源 AI 嘅崛起同實戰應用"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'models', label: '② 模型對比', content: <ModelComparisonTab /> },
          { id: 'openclaw', label: '③ OpenClaw 實戰', premium: true, content: <OpenClawTab /> },
          { id: 'quiz', label: '④ Quiz', premium: true, content: <QuizTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
