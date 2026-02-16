import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'MCP (Model Context Protocol) 嘅核心定位係咩？',
    options: [
      { text: '一個新嘅 AI 模型', correct: false, explanation: 'MCP 唔係模型，而係模型同外部工具之間嘅通訊協議。' },
      { text: '一個統一嘅 tool 連接協議——AI 世界嘅 USB', correct: true, explanation: 'MCP 提供標準化嘅 JSON-RPC 協議，令任何 AI model 都可以透過統一接口連接任何外部工具，就好似 USB 令任何裝置都可以連接電腦。' },
      { text: '一個 database 管理系統', correct: false, explanation: 'MCP 可以連接 database，但佢本身係通訊協議唔係 database。' },
      { text: '一個 frontend framework', correct: false, explanation: 'MCP 係 backend 通訊協議，同 frontend framework 完全唔同。' },
    ],
  },
  {
    question: 'MCP、Sub-agent、Plugin 三者嘅關係係咩？',
    options: [
      { text: '三者互斥，只可以揀一個用', correct: false, explanation: '三者係互補而唔係互斥，最強大嘅 AI 系統三者兼用。' },
      { text: 'MCP 管連接標準、Sub-agent 管分工協作、Plugin 管即時數據——互補關係', correct: true, explanation: 'MCP 定義點樣 connect，Sub-agent 定義點樣 delegate 任務，Plugin 定義點樣 access 外部數據。三者解決唔同層面嘅問題。' },
      { text: 'Plugin 係 MCP 嘅舊版本', correct: false, explanation: 'Plugin 係 OpenAI 嘅生態，MCP 係 Anthropic 主導嘅跨平台協議，兩者唔係新舊版本關係。' },
      { text: 'Sub-agent 係 MCP 嘅一部分', correct: false, explanation: 'Sub-agent 係獨立嘅任務分解架構，唔係 MCP 嘅一部分。' },
    ],
  },
  {
    question: '咩場景最適合用 MCP 而唔係傳統 REST API？',
    options: [
      { text: '一個固定嘅 CRUD API', correct: false, explanation: '固定 CRUD 用 REST 就夠簡單直接。' },
      { text: 'AI model 需要動態發現同使用多個工具', correct: true, explanation: 'MCP 嘅獨特優勢係 tool discovery 同 capability negotiation——AI model 可以動態發現有咩 tool 可以用。傳統 REST 要 hardcode 每個 endpoint。' },
      { text: '簡單嘅 webhook 通知', correct: false, explanation: 'Webhook 係固定嘅 event-driven 通訊，唔需要 MCP 嘅 discovery 能力。' },
      { text: '靜態文件下載', correct: false, explanation: '靜態文件用 CDN 或者簡單 HTTP 就夠。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'coding-agent-design', label: 'Coding Agent 設計' },
  { slug: 'multi-ai-workflow', label: '多 AI 協作工作流' },
  { slug: 'api-token-security', label: 'API Token 安全與成本' },
  { slug: 'skill-vs-agent', label: 'Skill vs Agent' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>MCP Protocol 係咩</h2>
      <div className="subtitle">AI 連接外部世界嘅三大模式：MCP、Sub-agent、Plugin</div>
      <p>
        AI model 本身係「閉門造車」——佢淨係識 text in, text out。但真實世界嘅任務需要 query DB、send email、check calendar。
        <strong style={{ color: '#34d399' }}> MCP (Model Context Protocol)</strong> 就係 AI 世界嘅 USB——一個統一標準接口，令任何 AI model 都可以連接任何外部工具。
        配合 <strong style={{ color: '#F59E0B' }}>Sub-agent</strong> 做任務分解，同 <strong style={{ color: '#a5b4fc' }}>OpenAI Plugin</strong> 做實時外部訪問，三者組成完整嘅 AI 工具生態。
      </p>
      <p>簡單講：MCP 管連接標準，Sub-agent 管分工協作，Plugin 管即時數據。三者唔係互斥，而係互補。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradMCP" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradModel" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradTool" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f4e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAgent" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" /></marker>
            <marker id="arrGreenRev" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8 Z" fill="#34d399" /></marker>
          </defs>

          {/* MCP Server */}
          <g transform="translate(20,140)">
            <rect width="140" height="80" rx="14" fill="url(#gradMCP)" stroke="#10B981" strokeWidth="2.5" filter="url(#glowGreen)" />
            <text x="70" y="30" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">MCP Server</text>
            <text x="70" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">統一協議層</text>
            <text x="70" y="65" textAnchor="middle" fill="#9ca3af" fontSize="9">AI 嘅 USB 接口</text>
          </g>

          {/* AI Model (center) */}
          <g transform="translate(270,130)">
            <rect width="160" height="100" rx="16" fill="url(#gradModel)" stroke="#3B82F6" strokeWidth="2.5" filter="url(#glowBlue)" />
            <text x="80" y="32" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">AI Model</text>
            <text x="80" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">Claude / GPT / Gemini</text>
            <text x="80" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">核心推理引擎</text>
            <text x="80" y="84" textAnchor="middle" fill="#9ca3af" fontSize="9">MCP + Sub-agent + Plugin</text>
          </g>

          {/* External Tools (right side) */}
          <g transform="translate(560,30)">
            <rect width="150" height="48" rx="10" fill="url(#gradTool)" stroke="#a78bfa" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="75" y="22" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">Database</text>
            <text x="75" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">PostgreSQL / MongoDB</text>
          </g>
          <g transform="translate(560,95)">
            <rect width="150" height="48" rx="10" fill="url(#gradTool)" stroke="#a78bfa" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="75" y="22" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">Calendar</text>
            <text x="75" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">Google Calendar API</text>
          </g>
          <g transform="translate(560,160)">
            <rect width="150" height="48" rx="10" fill="url(#gradTool)" stroke="#a78bfa" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="75" y="22" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">Email</text>
            <text x="75" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">SendGrid / Gmail</text>
          </g>
          <g transform="translate(560,225)">
            <rect width="150" height="48" rx="10" fill="url(#gradTool)" stroke="#a78bfa" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="75" y="22" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">GitHub</text>
            <text x="75" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">PR / Issues / Actions</text>
          </g>

          {/* MCP ↔ AI Model arrows */}
          <path d="M162,175 L268,175" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <path d="M268,185 L162,185" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreenRev)" />
          <text x="215" y="168" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">MCP 協議</text>

          {/* AI Model → Tools arrows */}
          <path d="M432,155 C480,155 520,54 558,54" fill="none" stroke="#a78bfa" strokeWidth="1.5" markerEnd="url(#arrBlue)" />
          <path d="M432,165 C480,165 520,119 558,119" fill="none" stroke="#a78bfa" strokeWidth="1.5" markerEnd="url(#arrBlue)" />
          <path d="M432,185 L558,185" fill="none" stroke="#a78bfa" strokeWidth="1.5" markerEnd="url(#arrBlue)" />
          <path d="M432,195 C480,195 520,249 558,249" fill="none" stroke="#a78bfa" strokeWidth="1.5" markerEnd="url(#arrBlue)" />

          {/* Sub-agents (bottom) */}
          <g transform="translate(120,320)">
            <rect width="130" height="55" rx="10" fill="url(#gradAgent)" stroke="#F59E0B" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="65" y="22" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="600">Flight Finder</text>
            <text x="65" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">搜尋航班 Agent</text>
          </g>
          <g transform="translate(290,320)">
            <rect width="130" height="55" rx="10" fill="url(#gradAgent)" stroke="#F59E0B" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="65" y="22" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="600">Itinerary Planner</text>
            <text x="65" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">行程規劃 Agent</text>
          </g>
          <g transform="translate(460,320)">
            <rect width="130" height="55" rx="10" fill="url(#gradAgent)" stroke="#F59E0B" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="65" y="22" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="600">Budget Calculator</text>
            <text x="65" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">預算計算 Agent</text>
          </g>

          {/* AI Model → Sub-agent arrows */}
          <text x="350" y="268" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="600">Sub-agent 委派</text>
          <path d="M320,232 C280,270 220,300 185,318" fill="none" stroke="#F59E0B" strokeWidth="1.5" markerEnd="url(#arrAmber)" />
          <path d="M350,232 L355,318" fill="none" stroke="#F59E0B" strokeWidth="1.5" markerEnd="url(#arrAmber)" />
          <path d="M380,232 C420,270 480,300 525,318" fill="none" stroke="#F59E0B" strokeWidth="1.5" markerEnd="url(#arrAmber)" />
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#34d399' }}>MCP (Model Context Protocol)</strong> = AI 世界嘅 USB — 一個標準接口連接所有工具。無論係 DB、Calendar、Email 定 GitHub，MCP 提供統一嘅 JSON-RPC 協議，令 AI model 唔使為每個工具寫 custom integration。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#F59E0B' }}>Sub-agent</strong> = 任務分解 — 主模型委派專門 agent 做特定任務。例如：Security Review Agent、Code Refactor Agent、UI Design Agent。每個 sub-agent 有自己嘅 context 同 tools，互不干擾。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#a5b4fc' }}>OpenAI Plugin</strong> = 實時外部訪問 — ChatGPT 直接 call 外部 API 攞最新數據。航班價格、天氣預報、DB query，唔使 pre-load，即時 fetch。Plugin manifest 定義 API schema，ChatGPT 自動 match 用邊個 plugin。</span></li>
        <li><span className="step-num">4</span><span><strong>三者唔係互斥</strong> — MCP 做連接標準（點樣 connect），Sub-agent 做分工協作（點樣 delegate），Plugin 做即時訪問（點樣 access）。最強大嘅 AI 系統三者兼用。</span></li>
      </ol>

      <div className="use-case">
        <h4>比較表</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #334155' }}>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>方法</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>定位</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>Use Case</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>好處</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#34d399', fontWeight: 600 }}>MCP</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>通訊標準</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>連接 model &harr; tools</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>統一協議，跨平台</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#F59E0B', fontWeight: 600 }}>Sub-agent</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>任務分解</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>委派專門工作</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>精準高效</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', color: '#a5b4fc', fontWeight: 600 }}>Plugin</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>實時訪問</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>Call 外部服務</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>最新數據</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FrameworkTab() {
  return (
    <div className="card">
      <h2>Decision Matrix：MCP vs Plugin vs Sub-agent</h2>
      <div className="subtitle">五個維度幫你揀最適合嘅 AI 工具整合方式</div>
      <p>唔係話 MCP 一定好過 Plugin，而係唔同場景有唔同嘅最佳選擇。記住呢個 decision matrix，下次設計 AI 系統就唔使靠估。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>Integration Complexity（整合複雜度）</h4>
          <p>
            <strong style={{ color: '#34d399' }}>MCP → 中等</strong>：要實現 MCP server，但一次搞掂就支援所有 model。<br />
            <strong style={{ color: '#a5b4fc' }}>Plugin → 低</strong>：寫個 OpenAPI manifest 就搞掂，最簡單。<br />
            <strong style={{ color: '#F59E0B' }}>Sub-agent → 高</strong>：要設計 agent 嘅 prompt、tools、scope，仲要管 orchestration。
          </p>
        </div>
        <div className="key-point">
          <h4>Runtime Overhead（運行開銷）</h4>
          <p>
            <strong style={{ color: '#34d399' }}>MCP → 低</strong>：JSON-RPC 直接通訊，overhead 最小。<br />
            <strong style={{ color: '#a5b4fc' }}>Plugin → 中等</strong>：每次 call 都要過 HTTP，有 network latency。<br />
            <strong style={{ color: '#F59E0B' }}>Sub-agent → 高</strong>：每個 sub-agent 都係一個新嘅 LLM call，token 成本疊加。
          </p>
        </div>
        <div className="key-point">
          <h4>Security Model（安全模型）</h4>
          <p>
            <strong style={{ color: '#34d399' }}>MCP → 嚴格，有 scope</strong>：每個 tool 有 capability 聲明，model 只能 call 授權咗嘅 action。<br />
            <strong style={{ color: '#a5b4fc' }}>Plugin → 中等</strong>：依賴 OAuth 同 API key，但 scope 控制唔夠 fine-grained。<br />
            <strong style={{ color: '#F59E0B' }}>Sub-agent → 依賴 sandbox</strong>：安全性取決於你點設計 sandbox 同 permission boundary。
          </p>
        </div>
        <div className="key-point">
          <h4>Tool Ecosystem（工具生態）</h4>
          <p>
            <strong style={{ color: '#34d399' }}>MCP → 增長中</strong>：Anthropic 主導，社區快速發展，已有 DB、Git、Slack 等 server。<br />
            <strong style={{ color: '#a5b4fc' }}>Plugin → OpenAI only</strong>：只限 ChatGPT 生態，跨平台唔得。<br />
            <strong style={{ color: '#F59E0B' }}>Sub-agent → 自定義</strong>：完全由你自己建，彈性最大但要自己維護。
          </p>
        </div>
        <div className="key-point">
          <h4>點揀？</h4>
          <p>
            <strong style={{ color: '#34d399' }}>需要跨平台 → MCP</strong>：你嘅工具要支援 Claude + GPT + 其他 model，MCP 係唯一選擇。<br />
            <strong style={{ color: '#a5b4fc' }}>需要即時數據 → Plugin</strong>：快速接入外部 API，唔使搞太多 infra。<br />
            <strong style={{ color: '#F59E0B' }}>需要複雜推理 → Sub-agent</strong>：任務要分步驟、多角度分析，sub-agent 最適合。
          </p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰練習：3 個設計題</h2>
      <div className="subtitle">動手設計 MCP、Sub-agent、API 架構</div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>
            <strong style={{ color: '#34d399' }}>設計 MCP Server for DB Connection</strong><br />
            情境：你要建一個 MCP server 讓 AI model 可以 query PostgreSQL。<br />
            要考慮嘅嘢：<br />
            - Tool definition：list_tables、query（read-only）、describe_schema<br />
            - Security：只允許 SELECT，禁止 DROP/DELETE/UPDATE<br />
            - Connection pooling：點樣管理 DB connection？<br />
            - Schema：MCP JSON-RPC request/response 格式<br />
            練習：畫出完整嘅 architecture diagram，包括 AI Model → MCP Server → Connection Pool → PostgreSQL 嘅 flow，標明每一步嘅 protocol 同 data format。
          </span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>
            <strong style={{ color: '#F59E0B' }}>Sub-agent Delegation for Code Review</strong><br />
            情境：Main Agent 收到一個 PR，需要做全面 code review。<br />
            設計 sub-agent 分工：<br />
            - <strong>Security Agent</strong>：掃描 SQL injection、XSS、hardcoded secrets<br />
            - <strong>Style Agent</strong>：檢查 naming convention、code formatting、lint rules<br />
            - <strong>Perf Agent</strong>：分析 N+1 queries、memory leaks、unnecessary re-renders<br />
            練習：設計 orchestration flow——Main Agent 點樣 dispatch 任務？Sub-agent 點樣 report back？如果有 conflict（例如 style agent 話要改，但 perf agent 話改咗會慢），點處理？
          </span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>
            <strong style={{ color: '#a5b4fc' }}>MCP vs REST API Comparison</strong><br />
            情境：你嘅公司有一堆 internal tools（Jira、Confluence、Slack、GitHub），要俾 AI 用。<br />
            比較兩個方案：<br />
            - 方案 A：每個 tool 寫一個 REST API wrapper，AI 直接 HTTP call<br />
            - 方案 B：每個 tool 寫一個 MCP server，AI 透過 MCP 協議存取<br />
            練習：列出兩個方案嘅 pros/cons，特別係 discovery（AI 點知有咩 tool 可以用）、auth（點樣管理 credentials）、versioning（tool 更新點處理）。最後俾出你嘅建議：咩時候用 MCP，咩時候傳統 REST 就夠。
          </span>
        </li>
      </ol>

      <div className="use-case">
        <h4>關鍵 takeaway</h4>
        <p>MCP 嘅核心價值係 <strong>tool discovery + capability negotiation</strong>——AI model 可以動態發現有咩 tool 可以用，同埋每個 tool 有咩 capability。呢個係傳統 REST API 做唔到嘅。但如果你嘅場景好簡單（例如只有一個 tool），REST 可能更直接。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻設計你嘅 MCP 整合架構</div>

      <div className="prompt-card">
        <h4>Prompt — MCP Architecture Design</h4>
        <div className="prompt-text">
          {`我需要你幫我設計一個 MCP (Model Context Protocol) 整合架構。

我嘅系統有以下工具/服務：
[列出你嘅工具，例如：
1. PostgreSQL 數據庫（用戶數據、訂單數據）
2. Google Calendar（排程同會議管理）
3. Slack（團隊通知同訊息）
4. GitHub（代碼倉庫同 PR 管理）
5. SendGrid（Email 發送）]

請幫我設計：

1. MCP Server 架構
   - 每個工具需要幾個 MCP server？定係一個 server 包晒？
   - 每個 server expose 咩 tools（列出 tool name + description + parameters）
   - Security scope：每個 tool 嘅 read/write 權限

2. Sub-agent 分工（如果有複雜任務）
   - 邊啲任務需要 sub-agent？
   - Sub-agent 嘅 prompt template 同可用 tools
   - Orchestration flow：main agent 點樣 coordinate sub-agents

3. 安全設計
   - Credential 管理（API keys、DB passwords）
   - Rate limiting 同 token budget
   - Audit logging（記錄 AI 做過咩操作）

4. Error Handling
   - Tool timeout 點處理？
   - Sub-agent 失敗點 fallback？
   - 用戶可見嘅 error message vs internal error

俾出完整嘅 architecture diagram 同實施 roadmap。`}
        </div>
      </div>
    </div>
  );
}

function QuizTab() {
  const [selected, setSelected] = useState({});
  const [showResult, setShowResult] = useState({});

  const quizzes = [
    {
      id: 1,
      question: 'MCP 嘅核心定位係咩？',
      options: [
        'A. 一個 AI model',
        'B. 一個統一嘅 tool 連接協議（AI 嘅 USB）',
        'C. 一個 database',
        'D. 一個 frontend framework',
      ],
      answer: 1,
      explanation: 'MCP (Model Context Protocol) 係 AI 世界嘅 USB——一個標準化嘅 JSON-RPC 協議，令任何 AI model 都可以透過統一接口連接外部工具。佢唔係 model 本身，而係 model 同 tools 之間嘅溝通橋樑。',
    },
    {
      id: 2,
      question: 'Sub-agent 架構嘅最大好處係咩？',
      options: [
        'A. 減少 token 成本',
        'B. 任務分解，每個 agent 專注自己嘅領域',
        'C. 唔使寫任何代碼',
        'D. 自動修復 bug',
      ],
      answer: 1,
      explanation: 'Sub-agent 嘅核心價值係任務分解（task decomposition）。每個 sub-agent 有自己嘅 context、tools 同 expertise，可以精準處理特定類型嘅任務。雖然 token 成本會增加，但質量同準確度大幅提升。',
    },
    {
      id: 3,
      question: '以下邊個場景最適合用 MCP 而唔係傳統 REST API？',
      options: [
        'A. 一個固定嘅 CRUD API',
        'B. AI model 需要動態發現同使用多個工具',
        'C. 簡單嘅 webhook 通知',
        'D. 靜態文件下載',
      ],
      answer: 1,
      explanation: 'MCP 嘅獨特優勢係 tool discovery 同 capability negotiation——AI model 可以動態發現有咩 tool 可以用。傳統 REST API 要 hardcode 每個 endpoint，但 MCP 令 AI 可以自己搵到合適嘅工具。',
    },
    {
      id: 4,
      question: '設計 Sub-agent Code Review 系統時，如果 Security Agent 同 Perf Agent 意見衝突，最佳做法係？',
      options: [
        'A. 永遠聽 Security Agent',
        'B. 永遠聽 Perf Agent',
        'C. 由 Main Agent 綜合判斷，加上 priority weighting',
        'D. 忽略衝突，兩個都唔理',
      ],
      answer: 2,
      explanation: 'Main Agent 負責 orchestration，包括處理 sub-agent 之間嘅衝突。最佳做法係設定 priority weighting（通常 security > performance > style），Main Agent 綜合所有 sub-agent 嘅意見後做最終決策。',
    },
  ];

  const handleSelect = (quizId, optionIndex) => {
    if (showResult[quizId]) return;
    setSelected((prev) => ({ ...prev, [quizId]: optionIndex }));
  };

  const handleCheck = (quizId) => {
    setShowResult((prev) => ({ ...prev, [quizId]: true }));
  };

  return (
    <div className="card">
      <h2>Quiz：MCP / Sub-agent / Plugin</h2>
      <div className="subtitle">測試你對 AI 工具整合架構嘅理解</div>

      {quizzes.map((quiz) => (
        <div key={quiz.id} className="prompt-card" style={{ marginBottom: '1.5rem' }}>
          <h4>Q{quiz.id}. {quiz.question}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.75rem 0' }}>
            {quiz.options.map((opt, idx) => {
              const isSelected = selected[quiz.id] === idx;
              const isCorrect = idx === quiz.answer;
              const revealed = showResult[quiz.id];
              let bg = 'transparent';
              let border = '#334155';
              if (revealed && isCorrect) { bg = 'rgba(16,185,129,0.12)'; border = '#10B981'; }
              else if (revealed && isSelected && !isCorrect) { bg = 'rgba(239,68,68,0.12)'; border = '#EF4444'; }
              else if (isSelected) { bg = 'rgba(99,102,241,0.12)'; border = '#6366f1'; }

              return (
                <div
                  key={idx}
                  onClick={() => handleSelect(quiz.id, idx)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${border}`,
                    background: bg,
                    color: '#e2e8f0',
                    cursor: revealed ? 'default' : 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt}
                </div>
              );
            })}
          </div>
          {selected[quiz.id] !== undefined && !showResult[quiz.id] && (
            <button
              onClick={() => handleCheck(quiz.id)}
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Check Answer
            </button>
          )}
          {showResult[quiz.id] && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: selected[quiz.id] === quiz.answer ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${selected[quiz.id] === quiz.answer ? '#10B981' : '#EF4444'}`,
              color: '#d1d5db',
              fontSize: '0.85rem',
              lineHeight: 1.6,
            }}>
              <strong style={{ color: selected[quiz.id] === quiz.answer ? '#34d399' : '#f87171' }}>
                {selected[quiz.id] === quiz.answer ? 'Correct!' : 'Incorrect.'}
              </strong>{' '}
              {quiz.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function MCPProtocol() {
  return (
    <>
      <TopicTabs
        title="MCP Protocol"
        subtitle="Model Context Protocol：AI 連接外部工具嘅標準協議，配合 Sub-agent 同 Plugin 建構完整生態"
        tabs={[
          { id: 'overview', label: '① 基本概念', content: <OverviewTab /> },
          { id: 'framework', label: '② Decision Matrix', content: <FrameworkTab /> },
          { id: 'practice', label: '③ 實戰練習', premium: true, content: <PracticeTab /> },
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
