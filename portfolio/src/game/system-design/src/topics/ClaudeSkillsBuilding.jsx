import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const relatedTopics = [
  { slug: 'mcp-protocol', label: 'MCP 模型上下文協議' },
  { slug: 'skill-vs-agent', label: 'Skill vs Agent' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering 系統設計' },
  { slug: 'multi-ai-workflow', label: '多 AI 協作工作流' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Claude Skills 係咩</h2>
      <div className="subtitle">教一次 Claude，之後每次都唔使重複</div>
      <p>
        你有冇試過每次開新 chat 都要重新講一次自己嘅 coding style、公司 convention、review 標準？講到口都臭。
        <strong style={{ color: '#a78bfa' }}> Skill</strong> 就係搞掂呢個問題——你寫一次指令，打包做一個 folder，之後 Claude 自動識得幾時觸發、點樣做。
      </p>
      <p>
        再配埋 <strong style={{ color: '#34d399' }}>MCP</strong> 就更癲——MCP 等於俾 Claude 一個專業廚房（DB、Calendar、Slack 咩都連到），Skill 等於俾佢食譜（點樣用啲工具做嘢）。冇食譜嘅廚房，得個擺設。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#a78bfa" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradSkill" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f4e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradMcp" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradClaude" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradFile" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a1a2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#a78bfa" /></marker>
            <marker id="arrGreenS" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          {/* Skill Folder */}
          <g transform="translate(20,30)">
            <rect width="200" height="130" rx="14" fill="url(#gradSkill)" stroke="#a78bfa" strokeWidth="2.5" filter="url(#glowPurple)" />
            <text x="100" y="28" textAnchor="middle" fill="#a78bfa" fontSize="14" fontWeight="700">Skill Folder</text>
            <text x="100" y="50" textAnchor="middle" fill="#d1d5db" fontSize="10">SKILL.md (required)</text>
            <text x="100" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">scripts/ (optional)</text>
            <text x="100" y="86" textAnchor="middle" fill="#9ca3af" fontSize="10">references/ (optional)</text>
            <text x="100" y="104" textAnchor="middle" fill="#9ca3af" fontSize="10">assets/ (optional)</text>
            <text x="100" y="122" textAnchor="middle" fill="#6b7280" fontSize="9">AI 嘅食譜</text>
          </g>

          {/* Claude AI (center) */}
          <g transform="translate(300,50)">
            <rect width="170" height="90" rx="16" fill="url(#gradClaude)" stroke="#6366f1" strokeWidth="2.5" filter="url(#glowBlue)" />
            <text x="85" y="30" textAnchor="middle" fill="#6366f1" fontSize="14" fontWeight="700">Claude AI</text>
            <text x="85" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">自動觸發 Skill</text>
            <text x="85" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">執行工作流指令</text>
            <text x="85" y="82" textAnchor="middle" fill="#6b7280" fontSize="9">Claude.ai / Code / API</text>
          </g>

          {/* MCP Server */}
          <g transform="translate(550,50)">
            <rect width="170" height="90" rx="14" fill="url(#gradMcp)" stroke="#10B981" strokeWidth="2.5" filter="url(#glowGreen)" />
            <text x="85" y="30" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">MCP Server</text>
            <text x="85" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">外部工具連接</text>
            <text x="85" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">DB / Calendar / Slack</text>
            <text x="85" y="82" textAnchor="middle" fill="#6b7280" fontSize="9">AI 嘅專業廚房</text>
          </g>

          {/* Arrows */}
          <path d="M222,95 L298,95" fill="none" stroke="#a78bfa" strokeWidth="2" markerEnd="url(#arrPurple)" />
          <text x="260" y="88" textAnchor="middle" fill="#a78bfa" fontSize="9" fontWeight="600">載入指令</text>
          <path d="M472,95 L548,95" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreenS)" />
          <text x="510" y="88" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">Call Tools</text>

          {/* Progressive Disclosure - 3 levels */}
          <g transform="translate(40,210)">
            <rect width="200" height="52" rx="10" fill="url(#gradFile)" stroke="#a78bfa" strokeWidth="2" />
            <text x="100" y="22" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">Level 1: YAML Frontmatter</text>
            <text x="100" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">永遠載入 system prompt</text>
          </g>
          <g transform="translate(270,210)">
            <rect width="200" height="52" rx="10" fill="url(#gradFile)" stroke="#818cf8" strokeWidth="1.5" />
            <text x="100" y="22" textAnchor="middle" fill="#818cf8" fontSize="11" fontWeight="600">Level 2: SKILL.md Body</text>
            <text x="100" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">相關時先載入</text>
          </g>
          <g transform="translate(500,210)">
            <rect width="200" height="52" rx="10" fill="url(#gradFile)" stroke="#64748b" strokeWidth="1.5" />
            <text x="100" y="22" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Level 3: references/</text>
            <text x="100" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">按需載入</text>
          </g>
          <path d="M242,236 L268,236" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrPurple)" />
          <path d="M472,236 L498,236" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrPurple)" />

          <text x="375" y="295" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="700">Progressive Disclosure：慳 Token，保持專業</text>

          {/* 3 Design Principles */}
          <g transform="translate(40,320)">
            <rect width="200" height="42" rx="8" fill="url(#gradFile)" stroke="#34d399" strokeWidth="1.2" />
            <text x="100" y="18" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">Progressive Disclosure</text>
            <text x="100" y="34" textAnchor="middle" fill="#9ca3af" fontSize="9">三層按需載入，慳 token</text>
          </g>
          <g transform="translate(270,320)">
            <rect width="200" height="42" rx="8" fill="url(#gradFile)" stroke="#F59E0B" strokeWidth="1.2" />
            <text x="100" y="18" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="600">Composability</text>
            <text x="100" y="34" textAnchor="middle" fill="#9ca3af" fontSize="9">多個 Skill 可以同時運作</text>
          </g>
          <g transform="translate(500,320)">
            <rect width="200" height="42" rx="8" fill="url(#gradFile)" stroke="#3B82F6" strokeWidth="1.2" />
            <text x="100" y="18" textAnchor="middle" fill="#3B82F6" fontSize="10" fontWeight="600">Portability</text>
            <text x="100" y="34" textAnchor="middle" fill="#9ca3af" fontSize="9">Claude.ai / Code / API 通用</text>
          </g>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#a78bfa' }}>Skill 就係一個 folder</strong>，入面擺一個 <code>SKILL.md</code>。頭幾行 YAML 定義「幾時觸發」，下面 Markdown 寫「點樣做」。簡單到唔使解釋。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#34d399' }}>三層慳 token 設計</strong>：第一層（YAML）永遠載入但好短，第二層（SKILL.md body）Claude 覺得相關先讀，第三層（references/ 入面嘅文件）要用先去搵。唔使一次過塞晒入 context。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#F59E0B' }}>MCP 係工具，Skill 係腦</strong>。MCP 話 Claude 「可以」做咩，Skill 話佢「應該」點做。兩樣唔係互斥，係互補。</span></li>
        <li><span className="step-num">4</span><span><strong>三種常見用法</strong>：生成一致嘅文件（frontend-design skill）、自動化多步流程（skill-creator skill）、為 MCP 加上專業知識（Sentry code-review skill）。</span></li>
      </ol>

      <div className="use-case">
        <h4>Skill vs 普通 Prompt 嘅分別</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #334155' }}>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}></th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>普通 Prompt</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>Claude Skill</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#d1d5db', fontWeight: 600 }}>持久性</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>每次對話重新輸入</td>
                <td style={{ padding: '10px', color: '#34d399' }}>教一次，永久生效</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#d1d5db', fontWeight: 600 }}>觸發方式</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>手動貼入</td>
                <td style={{ padding: '10px', color: '#34d399' }}>自動根據對話內容觸發</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#d1d5db', fontWeight: 600 }}>Token 效率</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>全部載入</td>
                <td style={{ padding: '10px', color: '#34d399' }}>Progressive Disclosure 按需載入</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#d1d5db', fontWeight: 600 }}>可分享</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>複製貼上</td>
                <td style={{ padding: '10px', color: '#34d399' }}>Folder 打包，GitHub 分發</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', color: '#d1d5db', fontWeight: 600 }}>跨平台</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>唔同平台格式唔同</td>
                <td style={{ padding: '10px', color: '#34d399' }}>Claude.ai / Code / API 通用</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StructureTab() {
  return (
    <div className="card">
      <h2>SKILL.md 結構同 Frontmatter 規則</h2>
      <div className="subtitle">寫好 description 就已經贏咗一半</div>

      <p>
        好多人以為最難嘅部分係寫 instructions，其實唔係。最關鍵嘅係頭幾行 YAML——因為 Claude 就係靠呢幾行嚟決定要唔要載入你個 Skill。description 寫得唔清楚，你個 Skill 寫得再靚都冇人用到。
      </p>

      <div className="key-points">
        <div className="key-point">
          <h4>檔案結構</h4>
          <p>
            <code style={{ color: '#a78bfa' }}>your-skill-name/</code><br />
            <code>&nbsp;&nbsp;SKILL.md</code> — 必須（case-sensitive，唔可以係 skill.md 或 SKILL.MD）<br />
            <code>&nbsp;&nbsp;scripts/</code> — 可選，放 Python/Bash 腳本<br />
            <code>&nbsp;&nbsp;references/</code> — 可選，放詳細文件<br />
            <code>&nbsp;&nbsp;assets/</code> — 可選，放模板、字體、icon
          </p>
        </div>

        <div className="key-point">
          <h4>YAML Frontmatter 必填欄位</h4>
          <p>
            <strong style={{ color: '#34d399' }}>name</strong>（必填）：kebab-case，唔可以有空格或大寫，要同 folder 名一致。<br />
            <strong style={{ color: '#34d399' }}>description</strong>（必填）：必須包含三樣嘢——① 做乜 ② 幾時觸發 ③ 關鍵能力。上限 1024 字元，唔好用 XML tags。
          </p>
        </div>

        <div className="key-point">
          <h4>Description 寫法</h4>
          <p>
            <strong style={{ color: '#34d399' }}>Good</strong>：<code>Manages Linear project workflows including sprint planning, task creation, and status tracking. Use when user mentions &quot;sprint&quot;, &quot;Linear tasks&quot;, &quot;project planning&quot;.</code><br /><br />
            <strong style={{ color: '#ef4444' }}>Bad</strong>：<code>Helps with projects.</code>（太模糊）<br />
            <strong style={{ color: '#ef4444' }}>Bad</strong>：<code>Creates sophisticated multi-page documentation systems.</code>（冇觸發條件）
          </p>
        </div>

        <div className="key-point">
          <h4>可選欄位</h4>
          <p>
            <strong>license</strong>：MIT、Apache-2.0 等<br />
            <strong>compatibility</strong>：環境要求（1-500 字元）<br />
            <strong>metadata</strong>：自定義 key-value pairs（author、version、mcp-server）
          </p>
        </div>

        <div className="key-point">
          <h4>幾個死穴要避開</h4>
          <p>
            YAML 入面唔可以擺 XML angle brackets（&lt; &gt;），因為 frontmatter 直接入 system prompt，有注入風險。Skill 名唔可以用 &quot;claude&quot; 或 &quot;anthropic&quot;，呢啲係保留詞。仲有一個好多人中伏嘅：唔好喺 Skill folder 入面放 README.md，所有文件應該放喺 SKILL.md 或者 references/ 入面。
          </p>
        </div>
      </div>

      <div className="use-case">
        <h4>SKILL.md 範例模板</h4>
        <div className="prompt-card">
          <div className="prompt-text" style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
{`---
name: project-sprint-planner
description: Plans project sprints using Linear data. Use when
  user says "plan sprint", "create sprint tasks", or
  "sprint planning". Fetches team velocity, suggests
  prioritization, creates tasks in Linear.
metadata:
  author: YourTeam
  version: 1.0.0
  mcp-server: linear
---

# Sprint Planner

## Instructions

### Step 1: Fetch Current Status
Fetch project status from Linear via MCP.
Expected: list of current tasks and velocity data.

### Step 2: Analyze Capacity
Calculate team velocity and available capacity.

### Step 3: Suggest Prioritization
Rank tasks by impact and effort.

### Step 4: Create Tasks
Create tasks in Linear with labels and estimates.

## Examples

User says: "Help me plan next sprint"
Actions:
1. Fetch existing Linear tasks
2. Analyze team velocity
3. Suggest task prioritization
4. Create tasks with estimates

## Troubleshooting

Error: "Connection refused"
Solution: Check Settings > Extensions > Linear`}
          </div>
        </div>
      </div>
    </div>
  );
}

function MCPSkillsTab() {
  return (
    <div className="card">
      <h2>MCP + Skills 協作模式</h2>
      <div className="subtitle">有廚房冇食譜，得個擺設</div>

      <p>
        如果你已經搞掂咗 MCP server，恭喜——最難嘅部分做完。但用戶接咗你個 MCP 之後呢？佢哋唔知有咩 workflow 可以做，每次都要自己 prompt 一輪，結果仲唔一致。
        加個 Skill 上去，等於將你腦入面嘅 best practice 包裝好，Claude 自動跟住做。
      </p>

      <div className="key-points">
        <div className="key-point">
          <h4>冇 Skill 嘅 MCP</h4>
          <p>
            用戶接完 MCP 之後一臉茫然，唔知下一步做咩。每次對話都由零開始。唔同人 prompt 唔同，結果當然唔一致。最慘係用戶怪你個 connector 唔好用——其實係少咗 workflow 指引。
          </p>
        </div>
        <div className="key-point">
          <h4>有 Skill 嘅 MCP</h4>
          <p>
            完全唔同世界。預建好嘅 workflow 自動觸發，唔使教。每次 tool 使用方式一致，best practice 直接內建。新用戶上手速度快好多，因為 Claude 已經知道點做。
          </p>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #334155' }}>
              <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>MCP（Connectivity）</th>
              <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>Skills（Knowledge）</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '10px', color: '#9ca3af' }}>連接 Claude 到你嘅服務</td>
              <td style={{ padding: '10px', color: '#9ca3af' }}>教 Claude 點樣有效使用服務</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '10px', color: '#9ca3af' }}>提供實時數據同 tool invocation</td>
              <td style={{ padding: '10px', color: '#9ca3af' }}>Capture 工作流同最佳實踐</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', color: '#34d399', fontWeight: 600 }}>What Claude can do</td>
              <td style={{ padding: '10px', color: '#a78bfa', fontWeight: 600 }}>How Claude should do it</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="use-case" style={{ marginTop: '1.5rem' }}>
        <h4>三種典型用法</h4>
        <ol className="steps">
          <li>
            <span className="step-num">1</span>
            <span>
              <strong style={{ color: '#a78bfa' }}>出文件 / 出 asset</strong>——你嘅 style guide 同 quality checklist 寫入 Skill，Claude 每次出嘅嘢風格都一樣。唔使 MCP，Claude 內建能力就搞掂。好似 frontend-design skill 咁。
            </span>
          </li>
          <li>
            <span className="step-num">2</span>
            <span>
              <strong style={{ color: '#F59E0B' }}>自動化流程</strong>——多步嘅嘢用 Skill 定義每步做咩、點驗收、幾時 loop 返去改善。可以跨幾個 MCP server 一齊 coordinate。好似 skill-creator skill 咁帶住你一步步寫 Skill。
            </span>
          </li>
          <li>
            <span className="step-num">3</span>
            <span>
              <strong style={{ color: '#34d399' }}>為 MCP 加上專業知識</strong>——MCP 俾咗 tool access，但 Claude 唔知你公司嘅 workflow 係點。Skill 將你嘅 domain knowledge 包埋入去，Sentry code-review skill 就係呢種。
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}

function PatternsTab() {
  return (
    <div className="card">
      <h2>五大 Skill Pattern</h2>
      <div className="subtitle">揀啱 Pattern 係設計好 Skill 嘅關鍵</div>
      <p>呢五個 Pattern 係 Anthropic 觀察早期採用者同內部團隊總結出嚟嘅。唔係死板模板，而係常見嘅有效方法。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>Pattern 1：Sequential Workflow Orchestration</h4>
          <p>
            最直覺嘅一個——固定步驟，按順序做。好似客戶 onboarding：先開 account、再 setup payment、加 subscription、最後 send welcome email。每步都有 MCP tool call 同驗證，任何一步 fail 都有回滾指令。你啲 SOP 夠清晰嘅話，呢個 pattern 最容易寫。
          </p>
        </div>

        <div className="key-point">
          <h4>Pattern 2：Multi-MCP Coordination</h4>
          <p>
            當一件事要跨幾個服務先做得完，就用呢個。例如 design handoff：先用 Figma MCP export assets，再用 Drive MCP upload，然後 Linear MCP 開 task，最後 Slack MCP 通知 team。關鍵係每個 phase 之間點傳數據、點驗證上一步做完未。
          </p>
        </div>

        <div className="key-point">
          <h4>Pattern 3：Iterative Refinement</h4>
          <p>
            出一個 draft 之後 loop 住改——寫報告、refactor 代碼、改文案都係呢類。你定義好質量標準同 validation script，Claude 自己跑 loop 直到達標或者到上限為止。重點係要明確講幾時應該停，唔係就會 loop 到天荒地老。
          </p>
        </div>

        <div className="key-point">
          <h4>Pattern 4：Context-Aware Tool Selection</h4>
          <p>
            同一個目標，但要根據情況揀唔同嘅工具。好似 smart file storage：大檔案放 Cloud Storage、協作文件放 Notion、代碼放 GitHub、臨時嘢放 local。你喺 Skill 入面寫清楚判斷條件同 fallback，Claude 自己揀。
          </p>
        </div>

        <div className="key-point">
          <h4>Pattern 5：Domain-Specific Intelligence</h4>
          <p>
            呢個最深——唔止係用工具，而係將你嘅專業知識嵌入 Skill。例如 payment compliance：Claude 唔止識得 call payment API，仲識得先 check 制裁名單、判斷管轄區、做風險評估，合格先處理，仲自動留 audit trail。專業知識變成可重複使用嘅資產。
          </p>
        </div>
      </div>

      <div className="use-case">
        <h4>Pattern 選型指南</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #334155' }}>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>你嘅需求</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>推薦 Pattern</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#9ca3af' }}>固定步驟，按順序完成</td>
                <td style={{ padding: '10px', color: '#a78bfa', fontWeight: 600 }}>Sequential Workflow</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#9ca3af' }}>跨多個服務協調</td>
                <td style={{ padding: '10px', color: '#34d399', fontWeight: 600 }}>Multi-MCP Coordination</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#9ca3af' }}>輸出要精益求精</td>
                <td style={{ padding: '10px', color: '#F59E0B', fontWeight: 600 }}>Iterative Refinement</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#9ca3af' }}>同一目標，多種實現路徑</td>
                <td style={{ padding: '10px', color: '#3B82F6', fontWeight: 600 }}>Context-Aware Selection</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', color: '#9ca3af' }}>需要專業知識判斷</td>
                <td style={{ padding: '10px', color: '#ef4444', fontWeight: 600 }}>Domain-Specific Intelligence</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TestingTab() {
  return (
    <div className="card">
      <h2>測試同迭代</h2>
      <div className="subtitle">寫完 Skill 唔係完，測過先算</div>

      <p>
        Anthropic 自己都講：唔好一開始就寫 Skill。先搵一個最難搞嘅 task，同 Claude 反覆傾，直到佢識做為止，然後先將成功嘅 pattern 提取成 Skill。呢個方法比你坐喺度空想快好多。
      </p>

      <div className="key-points">
        <div className="key-point">
          <h4>觸發測試</h4>
          <p>
            首先要確認 Skill 係咪喺啱嘅時候載入。你試幾個相關 prompt（「Help me set up a ProjectHub workspace」）佢應該觸發，試幾個無關嘅（「What's the weather」）佢唔應該觸發。如果唔對勁，直接問 Claude「你幾時會用 [skill name] 呢個 skill？」——佢會引用你嘅 description 答你，一睇就知問題喺邊。
          </p>
        </div>

        <div className="key-point">
          <h4>功能測試</h4>
          <p>
            觸發冇問題之後，就要測實際結果。你俾一堆 input，睇 output 有冇中。記得覆蓋正常 case、error case、同 edge case。例如：俾 project name + 5 個 task，Claude 應該 create 到 project、link 晒 5 個 task、冇 API error。
          </p>
        </div>

        <div className="key-point">
          <h4>效能比較</h4>
          <p>
            最後你要量化 Skill 到底幫唔幫到手。例如冇 Skill 嘅時候：15 次來回、3 次 API fail、燒 12,000 tokens。有 Skill 之後：2 條澄清問題、0 次 API fail、6,000 tokens。數據講嘢。最重要嘅指標係「用戶要唔要出手糾正」——如果 Claude 自己搞得掂，呢個 Skill 就成功。
          </p>
        </div>

        <div className="key-point">
          <h4>撞到問題點搞</h4>
          <p>
            Skill 應該觸發但冇觸發？多數係 description 寫得太模糊，加啲具體嘅 trigger 詞就搞掂。反過嚟，唔應該觸發但亂入？加 negative trigger（「唔好用喺 X 場景」）或者收窄 scope。如果觸發冇問題但結果唔一致，就要改善 instructions——越具體越好，唔好留太多空間俾 Claude 自由發揮。
          </p>
        </div>
      </div>

      <div className="use-case">
        <h4>點先算「成功」</h4>
        <p>你可以 vibes-based，但最好有啲數字撐住：</p>
        <ol className="steps">
          <li><span className="step-num">1</span><span>跑 10-20 個相關 query，觸發率要有 90% 以上</span></li>
          <li><span className="step-num">2</span><span>同冇 Skill 比，tool call 數量同 token 消耗應該有明顯改善</span></li>
          <li><span className="step-num">3</span><span>MCP server logs 入面唔應該有 failed API call</span></li>
          <li><span className="step-num">4</span><span>測試過程中用戶唔使 redirect 或者再解釋</span></li>
          <li><span className="step-num">5</span><span>同一個 request 跑 3-5 次，輸出結構一致</span></li>
        </ol>
      </div>
    </div>
  );
}

function DistributionTab() {
  return (
    <div className="card">
      <h2>分發同部署策略</h2>
      <div className="subtitle">寫完 Skill 之後，點樣俾人用</div>

      <p>
        你寫好個 Skill 之後，下一步就係諗點分發。如果你有 MCP server，加埋 Skill 等於即刻同對手拉開距離——用戶對比兩個 connector 時，有 workflow 指引嗰個一定贏。
      </p>

      <div className="key-points">
        <div className="key-point">
          <h4>個人安裝</h4>
          <p>
            Claude.ai 入面去 Settings {'>'} Capabilities {'>'} Skills，zip 個 folder upload 就得。Claude Code 就直接放入 skills directory。API 玩家就用 <code>/v1/skills</code> endpoint 管理，喺 Messages API request 加 <code>container.skills</code> parameter。
          </p>
        </div>

        <div className="key-point">
          <h4>組織級部署</h4>
          <p>
            Admin 可以一次過幫成個 workspace 裝 Skill，2025 年 12 月已經出咗。自動更新加集中管理，唔使逐個人裝。
          </p>
        </div>

        <div className="key-point">
          <h4>放 GitHub 嘅做法</h4>
          <p>
            開個 public repo，寫好 README（記住 README 係俾人睇嘅，唔好擺入 Skill folder）。放啲 example usage 同 screenshot，從你嘅 MCP 文件 link 過去 Skill repo，寫清楚兩樣合作有咩好。搞個 quick-start guide 俾人三分鐘上手。
          </p>
        </div>

        <div className="key-point">
          <h4>點樣 sell 你個 Skill</h4>
          <p>
            講 outcome，唔好講 implementation。<strong style={{ color: '#34d399' }}>講</strong>：「team 幾秒就 setup 到成個 workspace，以前要 30 分鐘」。<strong style={{ color: '#ef4444' }}>唔好講</strong>：「一個有 YAML frontmatter 同 Markdown 嘅 folder」。冇人 care 你點寫，只 care 佢哋點受惠。
          </p>
        </div>
      </div>

      <div className="use-case">
        <h4>Open Standard</h4>
        <p>
          Anthropic 已經將 Skills 發佈做 open standard，同 MCP 一樣。即係話同一個 Skill 理論上唔止 Claude 用到，其他 AI 平台都可以 adopt。如果你個 Skill 有平台限制，喺 <code>compatibility</code> 欄位標明就得。
        </p>
      </div>
    </div>
  );
}

function LatestFeaturesTab() {
  return (
    <div className="card">
      <h2>Claude 最新生態（2025 Q1）</h2>
      <div className="subtitle">識 Skill 之後，呢三樣嘢會改變你做嘢嘅方式</div>

      <p>
        Skills 係基礎，但唔止於此。2025 年初 Claude 出咗幾個新嘢，夾埋 Skills 用嘅話，你真係可以做到<strong style={{ color: '#a78bfa' }}>瞓住覺都有 AI 幫你做嘢</strong>。唔係吹水，有人已經咁做緊。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowL" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowPurpleL" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#a78bfa" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowAmberL" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreenL" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradLead" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f4e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradTeam" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a1a2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrPurpleL" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#a78bfa" /></marker>
            <marker id="arrAmberL" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" /></marker>
          </defs>

          {/* You (top) */}
          <g transform="translate(300,10)">
            <rect width="150" height="50" rx="12" fill="url(#gradLead)" stroke="#a78bfa" strokeWidth="2.5" filter="url(#glowPurpleL)" />
            <text x="75" y="22" textAnchor="middle" fill="#a78bfa" fontSize="13" fontWeight="700">You (Lead)</text>
            <text x="75" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">寫 Spec → Delegate → 瞓覺</text>
          </g>

          {/* Lead Agent */}
          <g transform="translate(300,100)">
            <rect width="150" height="55" rx="12" fill="url(#gradLead)" stroke="#F59E0B" strokeWidth="2.5" filter="url(#glowAmberL)" />
            <text x="75" y="22" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Lead Agent</text>
            <text x="75" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">Opus 4.6 Orchestrator</text>
            <text x="75" y="50" textAnchor="middle" fill="#9ca3af" fontSize="8">分配 + 協調 + Review</text>
          </g>

          {/* Arrow You -> Lead */}
          <path d="M375,62 L375,98" fill="none" stroke="#a78bfa" strokeWidth="2" markerEnd="url(#arrPurpleL)" />

          {/* 4 Team Agents */}
          <g transform="translate(20,210)">
            <rect width="155" height="55" rx="10" fill="url(#gradTeam)" stroke="#34d399" strokeWidth="1.5" filter="url(#shadowL)" />
            <text x="78" y="20" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">Backend Agent</text>
            <text x="78" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">改 API / DB migration</text>
            <text x="78" y="48" textAnchor="middle" fill="#6b7280" fontSize="8">平行運作</text>
          </g>
          <g transform="translate(200,210)">
            <rect width="155" height="55" rx="10" fill="url(#gradTeam)" stroke="#3B82F6" strokeWidth="1.5" filter="url(#shadowL)" />
            <text x="78" y="20" textAnchor="middle" fill="#3B82F6" fontSize="10" fontWeight="600">Frontend Agent</text>
            <text x="78" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">砌 React component</text>
            <text x="78" y="48" textAnchor="middle" fill="#6b7280" fontSize="8">平行運作</text>
          </g>
          <g transform="translate(380,210)">
            <rect width="155" height="55" rx="10" fill="url(#gradTeam)" stroke="#F59E0B" strokeWidth="1.5" filter="url(#shadowL)" />
            <text x="78" y="20" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="600">Test Agent</text>
            <text x="78" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">寫 unit + e2e test</text>
            <text x="78" y="48" textAnchor="middle" fill="#6b7280" fontSize="8">平行運作</text>
          </g>
          <g transform="translate(560,210)">
            <rect width="155" height="55" rx="10" fill="url(#gradTeam)" stroke="#ef4444" strokeWidth="1.5" filter="url(#shadowL)" />
            <text x="78" y="20" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="600">Review Agent</text>
            <text x="78" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">Code review / Security</text>
            <text x="78" y="48" textAnchor="middle" fill="#6b7280" fontSize="8">平行運作</text>
          </g>

          {/* Arrows Lead -> Teams */}
          <path d="M330,157 C250,180 150,195 98,208" fill="none" stroke="#F59E0B" strokeWidth="1.5" markerEnd="url(#arrAmberL)" />
          <path d="M355,157 L278,208" fill="none" stroke="#F59E0B" strokeWidth="1.5" markerEnd="url(#arrAmberL)" />
          <path d="M395,157 L458,208" fill="none" stroke="#F59E0B" strokeWidth="1.5" markerEnd="url(#arrAmberL)" />
          <path d="M420,157 C500,180 580,195 638,208" fill="none" stroke="#F59E0B" strokeWidth="1.5" markerEnd="url(#arrAmberL)" />

          {/* Loop indicator */}
          <g transform="translate(250,290)">
            <rect width="250" height="35" rx="8" fill="url(#gradTeam)" stroke="#818cf8" strokeWidth="1.2" strokeDasharray="4,4" />
            <text x="125" y="22" textAnchor="middle" fill="#818cf8" fontSize="10" fontWeight="600">Ralph Wiggum Loop: 自動迭代至完成</text>
          </g>
        </svg>
      </div>

      <div className="key-points">
        <div className="key-point">
          <h4 style={{ color: '#F59E0B' }}>1. Agent Teams（2025年2月5號 Release）</h4>
          <p>
            之前 Claude Code 係一個 agent 順序做嘢。而家用 Opus 4.6，一個 Lead Agent 可以分配工作俾幾個 Teammate Agent，佢哋平行 research、debug、build，仲互相 coordinate。即係話你可以一個 agent 改 backend API、一個砌 React component、一個寫 test、一個做 code review——全部同時跑。你坐喺度做 lead，或者 delegate 埋俾 Lead Agent 自己分配。
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
            同 Skills 嘅關係好直接：每個 Teammate 可以 load 唔同嘅 Skill。Backend Agent 用 DB migration skill，Frontend Agent 用 component-builder skill，Review Agent 用 security-review skill。Skills 變成每個 agent 嘅專業知識包。
          </p>
        </div>

        <div className="key-point">
          <h4 style={{ color: '#34d399' }}>2. 訓覺都有人做嘢（24/7 Autonomous Coding）</h4>
          <p>
            有人設定 Claude Code 24/7 run，朝早起身發現 AI 整晚修咗 bug、implement 咗新 feature、respond 咗 GitHub issues、仲 review 埋 PR。點做到？用 Telegram bot 觸發 Claude Code，加 GitHub webhook 自動偵測新 issue 同 PR。你瞓覺嗰 8 個鐘頭變成 productive time。
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
            同 Skills 嘅關係：你寫好 Skills 定義 coding standards、review criteria、testing patterns，Claude 半夜做嘢時就會自動跟你嘅 best practices。冇 Skill 嘅話，半夜嘅 Claude 隨時亂嚟。
          </p>
        </div>

        <div className="key-point">
          <h4 style={{ color: '#818cf8' }}>3. Ralph Wiggum Loop（Self-Iterating Agent）</h4>
          <p>
            呢個 Claude Code plugin 將 Claude 變成一個自我迭代嘅 agent——loop 住同一個 prompt，每次睇返上次做嘅嘢然後改善。你寫好 spec 同 completion criteria，開住 loop 就瞓覺。Claude 每次 iteration 都 review 上一輪，搵到可以改嘅就改，直到達標為止。朝早起身 review 最終結果就得。
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
            本質上就係之前講嘅 Iterative Refinement Pattern 嘅全自動版本。你嘅 Skill 定義質量標準，loop 負責執行。兩者分開就係「人手迭代」，合埋就係「自動迭代」。
          </p>
        </div>
      </div>

      <div className="use-case">
        <h4>三大功能 + Skills 整合矩陣</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #334155' }}>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>功能</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>定位</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>+ Skills 效果</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#e2e8f0' }}>適合場景</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#F59E0B', fontWeight: 600 }}>Agent Teams</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>平行分工</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>每個 agent 有專屬 Skill 知識</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>大型 feature 開發</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', color: '#34d399', fontWeight: 600 }}>24/7 Autonomous</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>時間延伸</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>Skills 保證無人監督時嘅品質</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>Bug fix / PR review / Issue triage</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', color: '#818cf8', fontWeight: 600 }}>Wiggum Loop</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>品質迭代</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>Skills 定義 completion criteria</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>報告生成 / 代碼重構 / 文件撰寫</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="use-case" style={{ marginTop: '1rem' }}>
        <h4>實戰：點樣三樣夾埋用</h4>
        <ol className="steps">
          <li><span className="step-num">1</span><span>先為每個角色各寫一個 Skill——Backend 一個、Frontend 一個、Test 一個、Review 一個。入面定義好工作流同品質標準。</span></li>
          <li><span className="step-num">2</span><span>設定 Agent Teams。Lead Agent 拆任務，每個 Teammate 載入對應 Skill，平行開工。</span></li>
          <li><span className="step-num">3</span><span>開 Ralph Wiggum Loop。每個 agent 喺自己嘅 scope 入面 loop，直到 Skill 定義嘅 completion criteria 達標。</span></li>
          <li><span className="step-num">4</span><span>瞓覺。Telegram bot 有問題先 notify 你，冇事嘅話朝早起身 review 就得。</span></li>
        </ol>
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
      question: 'Claude Skill 嘅 YAML frontmatter 入面，description 欄位必須包含咩？',
      options: [
        'A. 只需要講 Skill 做咩',
        'B. 做乜 + 幾時觸發 + 關鍵能力',
        'C. 只需要列出 MCP tools',
        'D. 作者聯絡資料',
      ],
      answer: 1,
      explanation: 'Description 要講齊三樣：做乜、幾時觸發（例如「Use when user says...」）、同關鍵能力。呢幾行 YAML 永遠喺 system prompt 入面，Claude 就係靠佢嚟決定要唔要載入你個 Skill。寫得唔清楚就冇人用到。',
    },
    {
      id: 2,
      question: '以下邊個場景最適合用 Multi-MCP Coordination Pattern？',
      options: [
        'A. 生成一份 report 然後改進佢',
        'B. Design-to-dev handoff（Figma export → Drive upload → Linear tasks → Slack notify）',
        'C. 根據檔案大小揀 storage',
        'D. 支付合規檢查',
      ],
      answer: 1,
      explanation: 'Design handoff 要跨 Figma、Drive、Linear、Slack 四個服務逐步協調，每步之間有數據要傳。呢個就係 Multi-MCP Coordination 嘅典型場景。Report 改進係 Iterative Refinement，揀 storage 係 Context-Aware Selection，合規檢查係 Domain-Specific Intelligence。',
    },
    {
      id: 3,
      question: '如果你嘅 Skill 經常喺唔相關嘅查詢時被載入（over-triggering），最佳解決方法係？',
      options: [
        'A. 刪除 Skill 重寫',
        'B. 加 negative triggers 同收窄 scope',
        'C. 加更多 trigger phrases',
        'D. 加長 SKILL.md body',
      ],
      answer: 1,
      explanation: '加 negative trigger 同收窄 scope 係正解。例如將「Processes documents」改做「Processes PDF legal documents for contract review」，或者加句「Do NOT use for simple data exploration」。如果你加更多 trigger phrases，只會令 over-triggering 更嚴重。',
    },
    {
      id: 4,
      question: 'Progressive Disclosure 三層系統嘅第一層（YAML frontmatter）有咩特別？',
      options: [
        'A. 只喺用戶要求時先載入',
        'B. 永遠喺 Claude 嘅 system prompt 入面',
        'C. 只有 admin 可以睇到',
        'D. 每次對話後自動刪除',
      ],
      answer: 1,
      explanation: 'YAML frontmatter 永遠喺 system prompt 入面，所以 Claude 每次都睇到。佢提供啱啱好嘅資訊令 Claude 知幾時該用呢個 Skill，但又唔使載入成個 SKILL.md。呢個就係 Progressive Disclosure 嘅精髓：慳 token 但唔犧牲可發現性。',
    },
    {
      id: 5,
      question: 'Agent Teams 同之前嘅 Claude Code 最大分別係咩？',
      options: [
        'A. 用咗更新嘅 model',
        'B. Lead Agent 可以分配工作俾多個 Teammate Agent 平行做',
        'C. 只支援 Python',
        'D. 唔需要 MCP 連接',
      ],
      answer: 1,
      explanation: '核心分別係「平行分工」。以前一個 agent 順序做，而家 Lead Agent 可以將 task 拆開俾幾個 Teammate 同時做——research、debug、build、review 一齊跑。配合 Skills，每個 agent 仲可以有自己嘅專業知識包。',
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
      <h2>Quiz：Claude Skills 建構</h2>
      <div className="subtitle">睇吓你記唔記得</div>

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

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻設計你嘅 Claude Skill</div>

      <div className="prompt-card">
        <h4>Prompt — Skill Architecture Design</h4>
        <div className="prompt-text">
          {`幫手設計一個 Claude Skill 嘅完整架構。

我嘅使用場景：
[描述你想自動化嘅工作流，例如：
1. 每週 sprint planning，從 Linear 攞數據，自動排優先順序
2. 設計稿 handoff，從 Figma export 到 GitHub repo
3. 客戶 onboarding，跨 CRM + payment + email 三個服務]

請幫我設計：

1. SKILL.md 結構
   - YAML frontmatter（name、description 包含 trigger phrases）
   - 主體 instructions（步驟式工作流）
   - references/ 入面放咩文件

2. Pattern 選型
   - 分析我嘅場景適合邊個 Pattern（Sequential / Multi-MCP / Iterative / Context-Aware / Domain-Specific）
   - 解釋點解揀呢個 Pattern
   - 如果需要混合多個 Pattern，點樣組合

3. MCP 整合（如果適用）
   - 需要邊啲 MCP server
   - 每個 MCP tool 嘅呼叫順序
   - 數據點樣喺 MCP 之間傳遞

4. 測試計劃
   - 5 個 should trigger 嘅 test query
   - 3 個 should NOT trigger 嘅 test query
   - Functional test 嘅 given/when/then

5. 分發策略
   - GitHub repo 結構
   - README 要點
   - 同 MCP 文件嘅 cross-reference

俾出完整嘅 SKILL.md 內容同實施步驟。`}
        </div>
      </div>

      <div className="prompt-card" style={{ marginTop: '1.5rem' }}>
        <h4>Prompt — Skill Troubleshooting</h4>
        <div className="prompt-text">
          {`我嘅 Claude Skill 有以下問題，幫手診斷同修正：

Skill 名稱：[你嘅 skill name]
問題描述：[例如：Skill 唔會自動觸發 / 觸發太頻繁 / 指令冇被跟從]

我嘅 YAML frontmatter：
---
name: [your-skill-name]
description: [your description]
---

我嘅 test queries：
- Should trigger: [列出]
- Should NOT trigger: [列出]

請分析：
1. Frontmatter description 有咩問題
2. 建議點樣改善 trigger phrases
3. 如果係 over-triggering，建議加咩 negative triggers
4. 如果係 instructions not followed，檢查指令有冇太長 / 太含糊 / 互相矛盾`}
        </div>
      </div>
    </div>
  );
}

export default function ClaudeSkillsBuilding() {
  return (
    <>
      <TopicTabs
        title="Claude Skills 建構"
        subtitle="由零開始寫一個 Claude Skill，識得揀 Pattern、測試、分發"
        tabs={[
          { id: 'overview', label: '① 基本概念', content: <OverviewTab /> },
          { id: 'structure', label: '② SKILL.md 結構', content: <StructureTab /> },
          { id: 'mcp-skills', label: '③ MCP + Skills', premium: true, content: <MCPSkillsTab /> },
          { id: 'patterns', label: '④ 五大 Pattern', premium: true, content: <PatternsTab /> },
          { id: 'testing', label: '⑤ 測試同迭代', premium: true, content: <TestingTab /> },
          { id: 'distribution', label: '⑥ 分發策略', premium: true, content: <DistributionTab /> },
          { id: 'latest', label: '⑦ 最新生態', premium: true, content: <LatestFeaturesTab /> },
          { id: 'ai-viber', label: '⑧ AI Viber', premium: true, content: <AIViberTab /> },
          { id: 'quiz', label: '⑨ Quiz', premium: true, content: <QuizTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
