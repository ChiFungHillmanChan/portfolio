import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '用 AI 做 Idea Generation 嘅時候，最重要嘅第一步係咩？',
    options: [
      { text: '直接問 AI 生成 5 個方案', correct: false, explanation: '冇搞清楚問題就 brainstorm，生成嘅方案可能全部偏離目標。' },
      { text: '用「5 Whys」搵到真正嘅問題', correct: true, explanation: '如果連問題都搞錯，AI 生成幾多方案都冇用。5 Whys 幫你由表面症狀追到 root cause。' },
      { text: '列出所有技術選型', correct: false, explanation: '技術選型係 solution 層面嘅決策，應該喺搞清楚問題之後先做。' },
      { text: '直接寫 prototype code', correct: false, explanation: 'Prototype 係驗證方案嘅步驟，唔係第一步。' },
    ],
  },
  {
    question: 'Idea Score Matrix 入面嘅 Solution Feasibility 維度係評估咩？',
    options: [
      { text: '技術上有幾難實現', correct: false, explanation: '技術難度係一部分，但 Feasibility 更關注嘅係「2-4 週內做唔做到 MVP」。' },
      { text: 'MVP 可唔可以喺 2-4 週內做出嚟驗證', correct: true, explanation: 'Solution Feasibility 直接決定你可唔可以快速驗證。如果要 6 個月先出 MVP，風險太高。核心功能 ≤3 個、技術風險可控先值得做。' },
      { text: '市場上有冇類似產品', correct: false, explanation: '市場競爭分析屬於 Differentiation 維度。' },
      { text: '團隊有冇相關經驗', correct: false, explanation: '團隊能力係 Constraints 嘅一部分，唔係 Feasibility 嘅核心指標。' },
    ],
  },
  {
    question: '用 AI brainstorm 嘅時候，點解要強調「唔同方向」而唔係「唔同版本」？',
    options: [
      { text: '因為 AI 生成多版本太浪費 token', correct: false, explanation: 'Token 成本唔係重點，重點係方案嘅多樣性。' },
      { text: '因為唔同方向嘅架構 trade-off 完全唔同，可以發現更多可能性', correct: true, explanation: 'Push vs Pull vs Event-driven 係唔同方向，每種架構嘅 trade-off 完全唔同。「用 Redis」vs「用 Memcached」只係同一方向嘅版本差異，唔會擴闊設計視野。' },
      { text: '因為老闆想睇多啲選擇', correct: false, explanation: '重點唔係數量多，而係方向多樣性帶來真正嘅架構洞察。' },
      { text: '因為 AI 淨係識生成相似嘅方案', correct: false, explanation: 'AI 可以生成好唔同嘅方案，但你要明確要求「唔同方向」先會得到。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'prompt-engineering', label: 'Prompt Engineering 系統設計' },
  { slug: 'multi-ai-workflow', label: '多 AI 協作工作流' },
  { slug: 'ai-tools-landscape', label: 'AI 工具全景圖' },
  { slug: 'sdd-spec-driven-development', label: 'SDD 規格驅動開發' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>AI 輔助 Idea Generation 係咩</h2>
      <div className="subtitle">用 AI 幫你探索系統設計嘅可能性，唔再靠自己諗到頭爆</div>
      <p>
        做系統設計嘅時候，最難唔係寫 code，而係「諗到個好方案」。好多 engineer 一開始就鑽入自己熟悉嘅 pattern，忽略咗其他可能性。<strong style={{ color: '#34d399' }}>AI Idea Generation</strong> 就係用 AI 嘅發散能力，幫你系統化咁探索唔同嘅設計方向——唔係取代你嘅判斷，而係擴闊你嘅視野。
      </p>
      <p>以下五條創新路徑，每條都可以用 AI 幫你快速生成方案，再由你揀最適合嘅。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowCenter" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowA" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowB" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowC" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowD" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#EC4899" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowE" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#a78bfa" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradCenter" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1b69" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradA" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradB" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradC" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradD" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#4a1942" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradE" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2e1a5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
          </defs>

          {/* Center node */}
          <g transform="translate(270,165)">
            <rect width="160" height="70" rx="16" fill="url(#gradCenter)" stroke="#6366f1" strokeWidth="2.5" filter="url(#glowCenter)" />
            <text x="80" y="30" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">System Design</text>
            <text x="80" y="50" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">Problem</text>
          </g>

          {/* Path A - top left */}
          <g transform="translate(20,20)">
            <rect width="180" height="65" rx="12" fill="url(#gradA)" stroke="#34d399" strokeWidth="2" filter="url(#glowA)" />
            <text x="90" y="24" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">A) Audience Swap</text>
            <text x="90" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">B2C ↔ B2B ↔ Education</text>
            <text x="90" y="56" textAnchor="middle" fill="#6b7280" fontSize="9">換角度睇你嘅系統設計</text>
          </g>
          <line x1="200" y1="75" x2="285" y2="165" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4,3" />

          {/* Path B - top right */}
          <g transform="translate(500,20)">
            <rect width="180" height="65" rx="12" fill="url(#gradB)" stroke="#F59E0B" strokeWidth="2" filter="url(#glowB)" />
            <text x="90" y="24" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">B) Delivery Swap</text>
            <text x="90" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">Service ↔ Course ↔ SaaS</text>
            <text x="90" y="56" textAnchor="middle" fill="#6b7280" fontSize="9">換交付方式</text>
          </g>
          <line x1="510" y1="75" x2="425" y2="165" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4,3" />

          {/* Path C - right */}
          <g transform="translate(500,175)">
            <rect width="180" height="65" rx="12" fill="url(#gradC)" stroke="#3B82F6" strokeWidth="2" filter="url(#glowC)" />
            <text x="90" y="24" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">C) Process Decomp</text>
            <text x="90" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">Find the bottleneck</text>
            <text x="90" y="56" textAnchor="middle" fill="#6b7280" fontSize="9">拆解流程搵瓶頸</text>
          </g>
          <line x1="500" y1="207" x2="430" y2="200" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4,3" />

          {/* Path D - bottom right */}
          <g transform="translate(500,320)">
            <rect width="180" height="65" rx="12" fill="url(#gradD)" stroke="#EC4899" strokeWidth="2" filter="url(#glowD)" />
            <text x="90" y="24" textAnchor="middle" fill="#EC4899" fontSize="12" fontWeight="700">D) AI Automation</text>
            <text x="90" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">Which steps can AI do?</text>
            <text x="90" y="56" textAnchor="middle" fill="#6b7280" fontSize="9">邊啲步驟可以用 AI 自動化</text>
          </g>
          <line x1="510" y1="330" x2="425" y2="235" stroke="#EC4899" strokeWidth="1.5" strokeDasharray="4,3" />

          {/* Path E - bottom left */}
          <g transform="translate(20,320)">
            <rect width="180" height="65" rx="12" fill="url(#gradE)" stroke="#a78bfa" strokeWidth="2" filter="url(#glowE)" />
            <text x="90" y="24" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="700">E) Ecological Niche</text>
            <text x="90" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">Edge case of incumbent</text>
            <text x="90" y="56" textAnchor="middle" fill="#6b7280" fontSize="9">大公司做唔到嘅 niche</text>
          </g>
          <line x1="200" y1="340" x2="285" y2="235" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4,3" />
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">A</span><span><strong style={{ color: '#34d399' }}>Audience Swap — 換角度睇你嘅系統設計</strong>：你設計緊一個 B2C notification system？試下問 AI：「如果呢個系統變成 B2B enterprise 版本，架構要點改？教育場景呢？」同一個 core system，唔同嘅 audience 會逼你發現唔同嘅 scalability 同 compliance 需求。</span></li>
        <li><span className="step-num">B</span><span><strong style={{ color: '#F59E0B' }}>Delivery Swap — 換交付方式</strong>：你嘅 monitoring service 可以變成一個 course（教人點做 monitoring）、一個 template（開箱即用嘅 Grafana dashboard）、或者一個 SaaS 產品。每種交付方式嘅系統設計完全唔同——API design、auth model、billing system 全部要重新諗。</span></li>
        <li><span className="step-num">C</span><span><strong style={{ color: '#3B82F6' }}>Process Decomposition — 拆解流程搵瓶頸</strong>：將整個 system flow 拆成 10-15 個步驟，然後問 AI：「邊個步驟最慢？邊個最容易 fail？」瓶頸往往唔係你以為嘅地方。例如，好多人以為 DB query 最慢，但其實係 network serialization。</span></li>
        <li><span className="step-num">D</span><span><strong style={{ color: '#EC4899' }}>AI Automation — 邊啲步驟可以用 AI 自動化</strong>：對住你拆好嘅流程，逐步問：「呢個步驟可以用 AI 做嗎？」好多 validation、classification、routing 嘅步驟其實可以用 LLM 取代 rule-based logic，但要考慮 latency 同 cost trade-off。</span></li>
        <li><span className="step-num">E</span><span><strong style={{ color: '#a78bfa' }}>Ecological Niche — 大公司做唔到嘅 niche</strong>：AWS、Google 嘅系統設計係為大眾市場而做。但 niche 場景（例如：香港中小企嘅 HR 系統、東南亞嘅外賣 delivery routing）有獨特需求，大公司嘅 generic solution 搞唔掂。問 AI 幫你搵出呢啲 edge case。</span></li>
      </ol>
    </div>
  );
}

function FrameworkTab() {
  return (
    <div className="card">
      <h2>AI Idea Generation Pipeline</h2>
      <div className="subtitle">Problem → Constraints → AI Brainstorm → Evaluation → Prototype</div>
      <p>有系統咁用 AI 生成方案，唔係亂咁問 ChatGPT。跟住呢五步走，每次都出到高質素嘅 idea。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>1. Problem Definition — 用「5 Whys」搵到真正嘅問題</h4>
          <p>唔好一開始就諗 solution。先問五次「點解」。例如：「點解 API 慢？」→「點解 DB query 慢？」→「點解冇 index？」→「點解 schema 設計成咁？」→「點解冇做 data modeling review？」——原來真正嘅問題係 process 問題，唔係 technology 問題。</p>
        </div>
        <div className="key-point">
          <h4>2. Constraints Mapping — 列出技術、預算、時間、團隊限制</h4>
          <p>冇 constraint 嘅 idea 係空中樓閣。列出：技術限制（legacy system、language）、預算（infra cost、人力）、時間（deadline）、團隊（幾多人、咩 skill set）。AI 生成方案嘅時候要知道呢啲邊界。</p>
        </div>
        <div className="key-point">
          <h4>3. AI Brainstorm — 用 ChatGPT/Claude 生成 5+ 方案</h4>
          <p>將 problem 同 constraints 餵俾 AI，要求佢生成至少 5 個完全唔同方向嘅方案。重點：要求「唔同方向」，唔係「唔同版本」。例如 notification system：push-based、pull-based、hybrid、event-driven、P2P——每個方向嘅架構完全唔同。</p>
        </div>
        <div className="key-point">
          <h4>4. Evaluation Matrix — 用 1-5 分評估每個方案</h4>
          <p>唔好靠 gut feeling 揀方案。用評估矩陣，每個維度 1-5 分，加權計算。冇 data 嘅決策只係猜測。</p>
        </div>
        <div className="key-point">
          <h4>5. Rapid Prototype — 用 AI 工具快速驗證最佳方案</h4>
          <p>揀完方案唔好直接 full implementation。用 AI 生成 prototype code、mock data、sequence diagram，快速驗證可行性。2 日內可以驗證嘅嘢唔好用 2 個月去做。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>Idea Score Matrix — 點樣量化評估一個 idea</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #374151' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#a5b4fc' }}>維度</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#a5b4fc' }}>1-5 分</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#a5b4fc' }}>例子</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                <td style={{ padding: '8px 12px', color: '#34d399', fontWeight: 600 }}>Pain Intensity</td>
                <td style={{ padding: '8px 12px', color: '#d1d5db' }}>幾頻繁幾嚴重？</td>
                <td style={{ padding: '8px 12px', color: '#9ca3af' }}>用戶而家點解決？workaround 有幾痛苦？</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                <td style={{ padding: '8px 12px', color: '#F59E0B', fontWeight: 600 }}>Solution Feasibility</td>
                <td style={{ padding: '8px 12px', color: '#d1d5db' }}>MVP 2-4 週做唔做到？</td>
                <td style={{ padding: '8px 12px', color: '#9ca3af' }}>核心功能 ≤3 個？技術風險可控？</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                <td style={{ padding: '8px 12px', color: '#3B82F6', fontWeight: 600 }}>Differentiation</td>
                <td style={{ padding: '8px 12px', color: '#d1d5db' }}>明確感知到嘅優勢？</td>
                <td style={{ padding: '8px 12px', color: '#9ca3af' }}>快啲？平啲？好啲？用戶一用就知道分別？</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                <td style={{ padding: '8px 12px', color: '#EC4899', fontWeight: 600 }}>Acquisition</td>
                <td style={{ padding: '8px 12px', color: '#d1d5db' }}>低成本獲客？</td>
                <td style={{ padding: '8px 12px', color: '#9ca3af' }}>社區？學校？行業 channel？SEO？</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', color: '#a78bfa', fontWeight: 600 }}>Sustainability</td>
                <td style={{ padding: '8px 12px', color: '#d1d5db' }}>重複價值 + 收入？</td>
                <td style={{ padding: '8px 12px', color: '#9ca3af' }}>一次性 payment 定經常性 subscription？</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: '12px' }}>總分 20+ 嘅 idea 值得認真投入。15-19 分嘅可以做 side project 驗證。15 分以下嘅先放低，等 constraint 改變再睇。</p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰練習：3 個 AI-Assisted Design Thinking 場景</h2>
      <div className="subtitle">唔係紙上談兵，每個練習都有具體操作步驟</div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>
            <strong style={{ color: '#34d399' }}>Generate 3 Alternative Architectures for Notification System</strong>
            <br />
            用 AI brainstorm push vs pull vs hybrid 三種完全唔同嘅架構方案。
            <br /><br />
            <strong>操作步驟：</strong>
            <br />① 描述你嘅 notification 需求（幾多 user？幾頻密？real-time 定 batch？）
            <br />② 問 AI 分別設計 push-based（WebSocket + message queue）、pull-based（polling + caching）、hybrid（push for urgent, pull for digest）三種架構
            <br />③ 要求 AI 對比三種方案嘅 latency、throughput、cost、complexity
            <br />④ 揀最適合你 constraint 嘅方案，再深入設計
            <br /><br />
            <strong>學到咩：</strong>唔同架構模式嘅 trade-off，同埋點樣用 AI 快速生成對比方案。
          </span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>
            <strong style={{ color: '#F59E0B' }}>Find Bottlenecks in Existing Design</strong>
            <br />
            將你嘅系統描述貼俾 AI，等佢幫你搵 scaling issues。
            <br /><br />
            <strong>操作步驟：</strong>
            <br />① 寫出你嘅系統 flow（用文字或者 sequence diagram）
            <br />② 列出每個步驟嘅 expected latency 同 throughput
            <br />③ 問 AI：「如果 traffic 增加 10x，邊個步驟會最先 break？」
            <br />④ AI 會指出 single points of failure、N+1 queries、unbounded queues 等問題
            <br />⑤ 對住每個問題，問 AI 生成修復方案
            <br /><br />
            <strong>學到咩：</strong>系統思維——唔係 fix 一個 bug，而係搵到 systemic 問題同 structural 解法。
          </span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>
            <strong style={{ color: '#3B82F6' }}>AI-Assisted「5 Whys」for Scaling Problems</strong>
            <br />
            用 AI 做 iterative questioning，搵到 scaling 問題嘅 root cause。
            <br /><br />
            <strong>操作步驟：</strong>
            <br />① 描述症狀：「API response time 從 200ms 升到 2s」
            <br />② 問 AI：「Why #1 — 點解會慢咗？」→ AI 分析可能原因
            <br />③ 針對 AI 嘅回答再問：「Why #2 — 點解呢個 component 會成為瓶頸？」
            <br />④ 繼續追問到第 5 個 why，通常會發現 root cause 係架構決策或者 data model 問題
            <br />⑤ 最後問 AI 基於 root cause 設計 long-term fix
            <br /><br />
            <strong>學到咩：</strong>Root cause analysis 唔係靠經驗猜，而係可以用結構化方法搵到。AI 幫你問啱問題。
          </span>
        </li>
      </ol>

      <div className="use-case">
        <h4>練習嘅核心原則</h4>
        <p>唔好將 AI 當 oracle，佢俾嘅答案唔一定啱。重點係用 AI 擴闊你嘅思路，然後用你自己嘅 engineering judgment 去篩選同驗證。AI 生成 10 個 idea，你揀 1 個深入——呢個就係最高效嘅用法。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻開始 brainstorm 你嘅系統設計</div>

      <div className="prompt-card">
        <h4>Prompt — System Design Brainstorm Generator</h4>
        <div className="prompt-text">
          {`我需要你做一個系統設計嘅 brainstorm partner。以下係我嘅問題同限制：

## 問題描述
[描述你要解決嘅系統設計問題，例如：設計一個支援 100K concurrent users 嘅 real-time chat system]

## Constraints
- 技術限制：[例如：要用 existing Kubernetes cluster，團隊熟悉 Go 同 PostgreSQL]
- 預算限制：[例如：infra cost < $500/month]
- 時間限制：[例如：MVP 要 4 週內上線]
- 團隊限制：[例如：2 backend engineers + 1 frontend]

## 要求
請用以下 5 個角度各生成至少 1 個方案：

A) Audience Swap：如果目標用戶從 [B2C/B2B/Education] 換成另一個，架構要點改？
B) Delivery Swap：如果交付方式從 [Service/Course/SaaS/Template] 換成另一個，設計有咩唔同？
C) Process Decomposition：將整個 flow 拆成步驟，搵出瓶頸
D) AI Automation：邊啲步驟可以用 AI 取代 rule-based logic？
E) Ecological Niche：大公司嘅 generic solution 搞唔掂嘅 edge case 係咩？

對每個方案，列出：
1. 架構圖（文字描述）
2. 核心技術選型
3. Trade-offs（pros/cons）
4. 預估 complexity（低/中/高）
5. 最大風險同 mitigation

最後，用 Idea Score Matrix 評估每個方案（Pain Intensity、Solution Feasibility、Differentiation、Acquisition、Sustainability 各 1-5 分）。`}
        </div>
      </div>
    </div>
  );
}

function QuizTab() {
  const [selected, setSelected] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const questions = [
    {
      id: 1,
      question: '用 AI 做 Idea Generation 嘅時候，最重要嘅第一步係咩？',
      options: [
        'A) 直接問 AI 生成方案',
        'B) 用「5 Whys」搵到真正嘅問題',
        'C) 列出所有技術選型',
        'D) 寫好 prototype code',
      ],
      answer: 1,
      explanation: '如果你連問題都搞錯，AI 生成幾多方案都冇用。用「5 Whys」先搵到 root problem，再開始 brainstorm，先至有效率。',
    },
    {
      id: 2,
      question: '「Audience Swap」呢個創新路徑嘅核心思路係咩？',
      options: [
        'A) 將產品賣俾更多人',
        'B) 換一批用戶角度去重新審視系統設計需求',
        'C) 做更多 A/B testing',
        'D) 將 B2C 產品直接改名賣 B2B',
      ],
      answer: 1,
      explanation: '唔同嘅 audience 有唔同嘅 scalability、compliance、UX 需求。換角度唔係換 label，而係重新分析需求，往往會發現你本來冇考慮到嘅架構問題。',
    },
    {
      id: 3,
      question: 'Idea Score Matrix 入面，邊個維度幫你判斷「呢個 idea 值唔值得做 MVP」？',
      options: [
        'A) Pain Intensity — 問題幾嚴重',
        'B) Sustainability — 長期有冇價值',
        'C) Solution Feasibility — 2-4 週做唔做到 MVP',
        'D) Differentiation — 同競爭者有冇分別',
      ],
      answer: 2,
      explanation: 'Solution Feasibility 直接決定你可唔可以快速驗證。如果一個 idea 要 6 個月先出到 MVP，你要花嘅資源太大，風險太高。2-4 週出到嘅 MVP 先至係可以 validate 嘅。',
    },
    {
      id: 4,
      question: '用 AI brainstorm 系統設計方案嘅時候，點解要強調「唔同方向」而唔係「唔同版本」？',
      options: [
        'A) 因為 AI 成本比較平',
        'B) 因為版本太多會混亂',
        'C) 因為唔同方向嘅架構 trade-off 完全唔同，可以發現更多可能性',
        'D) 因為老闆鍾意睇多啲方案',
      ],
      answer: 2,
      explanation: 'Push vs Pull vs Event-driven 係唔同方向，每種架構嘅 trade-off 完全唔同。但「用 Redis」vs「用 Memcached」只係同一方向嘅唔同版本。唔同方向先可以真正擴闊你嘅設計視野。',
    },
  ];

  return (
    <div className="card">
      <h2>自我測試</h2>
      <div className="subtitle">4 條題目，睇下你對 AI-Assisted Idea Generation 理解幾深</div>

      {questions.map((q) => (
        <div key={q.id} style={{ marginBottom: '24px', padding: '16px', background: '#1a1d27', borderRadius: '12px' }}>
          <p style={{ fontWeight: 600, marginBottom: '12px', color: '#e2e8f0' }}>{q.id}. {q.question}</p>
          {q.options.map((opt, idx) => {
            const isSelected = selected[q.id] === idx;
            const isCorrect = idx === q.answer;
            let bg = 'transparent';
            let border = '1px solid #374151';
            if (submitted) {
              if (isCorrect) { bg = 'rgba(52,211,153,0.1)'; border = '1px solid #34d399'; }
              else if (isSelected && !isCorrect) { bg = 'rgba(239,68,68,0.1)'; border = '1px solid #ef4444'; }
            } else if (isSelected) {
              bg = 'rgba(99,102,241,0.15)'; border = '1px solid #6366f1';
            }
            return (
              <div
                key={idx}
                onClick={() => !submitted && setSelected({ ...selected, [q.id]: idx })}
                style={{ padding: '10px 14px', marginBottom: '6px', borderRadius: '8px', cursor: submitted ? 'default' : 'pointer', background: bg, border, color: '#d1d5db', fontSize: '14px', transition: 'all 0.2s' }}
              >
                {opt}
              </div>
            );
          })}
          {submitted && (
            <div style={{ marginTop: '8px', padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', fontSize: '13px', color: '#a5b4fc' }}>
              {q.explanation}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={() => setSubmitted(true)}
        disabled={Object.keys(selected).length < questions.length}
        style={{ padding: '12px 32px', borderRadius: '10px', border: 'none', background: Object.keys(selected).length < questions.length ? '#374151' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: '15px', cursor: Object.keys(selected).length < questions.length ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
      >
        交卷
      </button>

      {submitted && (
        <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(52,211,153,0.08)', borderRadius: '10px', fontSize: '15px', color: '#34d399', fontWeight: 600 }}>
          你答啱 {questions.filter(q => selected[q.id] === q.answer).length} / {questions.length} 題
          {questions.filter(q => selected[q.id] === q.answer).length === questions.length && ' — 全對！你已經掌握 AI Idea Generation 嘅核心思路。'}
        </div>
      )}
    </div>
  );
}

export default function AIIdeaGeneration() {
  return (
    <>
      <TopicTabs
        title="AI Idea Generation"
        subtitle="用 AI 系統化探索設計方案：5 條創新路徑 + 評估框架，唔再靠自己諗到頭爆"
        tabs={[
          { id: 'overview', label: '① 5 條創新路徑', content: <OverviewTab /> },
          { id: 'framework', label: '② 評估框架', content: <FrameworkTab /> },
          { id: 'practice', label: '③ 實戰練習', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
          { id: 'quiz', label: '⑤ 自我測試', premium: true, content: <QuizTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
