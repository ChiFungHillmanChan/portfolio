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
      <div className="subtitle">一套包裝好嘅指令，教 Claude 自動處理特定任務同工作流程</div>
      <p>
        每次同 Claude 傾計都要重新解釋你嘅偏好、流程、專業知識？
        <strong style={{ color: '#a78bfa' }}> Skill</strong> 就係解決呢個問題——教一次，之後每次都受益。
        Skill 本質上係一個 folder，入面有 Markdown 格式嘅指令，令 Claude 識得自動觸發同執行你定義嘅工作流。
      </p>
      <p>
        配合 <strong style={{ color: '#34d399' }}>MCP (Model Context Protocol)</strong> 使用就更強大——MCP 提供工具連接能力，Skill 提供工作流知識。
        兩者合作就好似一個專業廚房（MCP）配上食譜（Skill），令用戶唔使自己搵出每一步。
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
        <li><span className="step-num">1</span><span><strong style={{ color: '#a78bfa' }}>Skill = 一個 Folder</strong>，入面最少有一個 <code>SKILL.md</code> 檔案。YAML frontmatter 定義「幾時觸發」，Markdown body 定義「點樣執行」。仲可以有 <code>scripts/</code>、<code>references/</code>、<code>assets/</code> 子目錄。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#34d399' }}>Progressive Disclosure</strong> 三層系統：Level 1（YAML frontmatter）永遠喺 system prompt 入面，佔最少 token。Level 2（SKILL.md body）只有 Claude 覺得相關時先載入。Level 3（references/ 檔案）按需導航。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#F59E0B' }}>MCP + Skill = 廚房 + 食譜</strong>。MCP 提供工具連接（What Claude can do），Skill 提供工作流知識（How Claude should do it）。冇 Skill 嘅 MCP 就好似有廚房但冇食譜——用戶唔知做乜。</span></li>
        <li><span className="step-num">4</span><span><strong>三個使用場景</strong>：① Document/Asset Creation（例如 frontend-design skill）② Workflow Automation（例如 skill-creator skill）③ MCP Enhancement（例如 Sentry code-review skill）。</span></li>
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
      <div className="subtitle">寫好 YAML frontmatter 係成功嘅一半</div>

      <p>
        YAML frontmatter 係 Claude 決定要唔要載入你個 Skill 嘅<strong>唯一依據</strong>。
        佢永遠喺 system prompt 入面，所以 description 寫得好唔好直接決定 Skill 會唔會被觸發。
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
          <h4>安全限制</h4>
          <p>
            <strong style={{ color: '#ef4444' }}>禁止</strong>：YAML frontmatter 入面唔可以有 XML angle brackets（&lt; &gt;），因為 frontmatter 會出現喺 system prompt，有注入風險。<br />
            <strong style={{ color: '#ef4444' }}>禁止</strong>：Skill 名唔可以含 &quot;claude&quot; 或 &quot;anthropic&quot;（保留詞）。<br />
            <strong style={{ color: '#ef4444' }}>禁止</strong>：唔好喺 Skill folder 入面放 README.md（所有文件放 SKILL.md 或 references/）。
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
      <div className="subtitle">廚房比喻：MCP = 專業廚房，Skill = 食譜</div>

      <p>
        如果你已經有一個 working MCP server，你已經做咗最難嘅部分。
        Skill 係上面嘅知識層——capture 你已經知嘅工作流同最佳實踐，令 Claude 可以一致咁應用。
      </p>

      <div className="key-points">
        <div className="key-point">
          <h4>冇 Skill 嘅 MCP</h4>
          <p>
            用戶接咗 MCP 但唔知下一步做咩<br />
            每次對話從零開始<br />
            結果唔一致（唔同人 prompt 唔同）<br />
            用戶怪你嘅 connector 唔好用（其實係缺工作流指引）
          </p>
        </div>
        <div className="key-point">
          <h4>有 Skill 嘅 MCP</h4>
          <p>
            <strong style={{ color: '#34d399' }}>預建工作流自動觸發</strong><br />
            <strong style={{ color: '#34d399' }}>一致可靠嘅 tool 使用方式</strong><br />
            <strong style={{ color: '#34d399' }}>最佳實踐內建每次互動</strong><br />
            <strong style={{ color: '#34d399' }}>學習曲線大幅降低</strong>
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
        <h4>三大使用場景</h4>
        <ol className="steps">
          <li>
            <span className="step-num">1</span>
            <span>
              <strong style={{ color: '#a78bfa' }}>Document &amp; Asset Creation</strong>：生成一致嘅高品質輸出。用 embedded style guide + quality checklist。唔需要外部工具，用 Claude 內建能力就得。<br />
              <em style={{ color: '#6b7280' }}>例：frontend-design skill、docx/pptx skill</em>
            </span>
          </li>
          <li>
            <span className="step-num">2</span>
            <span>
              <strong style={{ color: '#F59E0B' }}>Workflow Automation</strong>：多步驟流程 + validation gates + iterative refinement loops。可以跨多個 MCP server 協調。<br />
              <em style={{ color: '#6b7280' }}>例：skill-creator skill</em>
            </span>
          </li>
          <li>
            <span className="step-num">3</span>
            <span>
              <strong style={{ color: '#34d399' }}>MCP Enhancement</strong>：為 MCP tool access 加上工作流指引。協調多個 MCP 呼叫、嵌入領域專業知識、提供用戶本來要自己指定嘅 context。<br />
              <em style={{ color: '#6b7280' }}>例：Sentry code-review skill</em>
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
            <strong>適用場景</strong>：多步驟流程，必須按特定順序執行。<br />
            <strong>關鍵技術</strong>：明確步驟排序、步驟間依賴關係、每步驗證、失敗回滾指令。<br />
            <strong style={{ color: '#a78bfa' }}>例子</strong>：客戶 Onboarding — ① Create Account → ② Setup Payment → ③ Create Subscription → ④ Send Welcome Email。每步有 MCP tool call 同 validation。
          </p>
        </div>

        <div className="key-point">
          <h4>Pattern 2：Multi-MCP Coordination</h4>
          <p>
            <strong>適用場景</strong>：工作流跨越多個服務。<br />
            <strong>關鍵技術</strong>：清晰嘅 phase 分離、MCP 之間嘅數據傳遞、每 phase 前驗證、集中錯誤處理。<br />
            <strong style={{ color: '#34d399' }}>例子</strong>：Design-to-Dev Handoff — Phase 1 Figma MCP（export assets）→ Phase 2 Drive MCP（upload）→ Phase 3 Linear MCP（create tasks）→ Phase 4 Slack MCP（notify team）。
          </p>
        </div>

        <div className="key-point">
          <h4>Pattern 3：Iterative Refinement</h4>
          <p>
            <strong>適用場景</strong>：輸出質量可以透過迭代提升。<br />
            <strong>關鍵技術</strong>：明確質量標準、迭代改進循環、validation scripts、知道幾時停止迭代。<br />
            <strong style={{ color: '#F59E0B' }}>例子</strong>：Report Generation — Initial Draft → Quality Check（run validation script）→ Refinement Loop → Finalization。
          </p>
        </div>

        <div className="key-point">
          <h4>Pattern 4：Context-Aware Tool Selection</h4>
          <p>
            <strong>適用場景</strong>：相同目標，根據情境用唔同工具。<br />
            <strong>關鍵技術</strong>：清晰 decision criteria、fallback 選項、透明解釋選擇原因。<br />
            <strong style={{ color: '#3B82F6' }}>例子</strong>：Smart File Storage — 大檔案用 Cloud Storage MCP、協作文件用 Notion MCP、代碼用 GitHub MCP、臨時文件用 local storage。
          </p>
        </div>

        <div className="key-point">
          <h4>Pattern 5：Domain-Specific Intelligence</h4>
          <p>
            <strong>適用場景</strong>：Skill 需要嵌入專業知識（超越工具使用）。<br />
            <strong>關鍵技術</strong>：領域專業邏輯嵌入、合規先於行動、全面文件記錄、清晰治理。<br />
            <strong style={{ color: '#ef4444' }}>例子</strong>：Payment Compliance — 先做 compliance check（制裁名單、管轄區、風險評估）→ 通過先處理支付 → Audit trail 記錄所有決策。
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
      <div className="subtitle">Triggering / Functional / Performance 三層測試</div>

      <p>
        Anthropic 建議嘅最佳策略：<strong>先專注一個困難任務反覆迭代，直到 Claude 成功</strong>，然後先提取成 Skill。
        利用 Claude 嘅 in-context learning，比廣泛測試更快見到效果。
      </p>

      <div className="key-points">
        <div className="key-point">
          <h4>1. Triggering Tests（觸發測試）</h4>
          <p>
            <strong>目標</strong>：確保 Skill 喺正確時機載入。<br />
            <strong style={{ color: '#34d399' }}>Should trigger</strong>：「Help me set up a new ProjectHub workspace」「I need to create a project」<br />
            <strong style={{ color: '#ef4444' }}>Should NOT trigger</strong>：「What's the weather?」「Help me write Python code」<br />
            <strong>Debug 方法</strong>：問 Claude「When would you use the [skill name] skill?」——佢會引用 description 返嚟。
          </p>
        </div>

        <div className="key-point">
          <h4>2. Functional Tests（功能測試）</h4>
          <p>
            <strong>目標</strong>：驗證 Skill 產出正確結果。<br />
            測試案例要覆蓋：valid outputs、API calls 成功、error handling、edge cases。<br />
            <strong>例子</strong>：Given: project name + 5 tasks → Then: project created + 5 tasks linked + no API errors。
          </p>
        </div>

        <div className="key-point">
          <h4>3. Performance Comparison（效能比較）</h4>
          <p>
            <strong>目標</strong>：證明 Skill 比 baseline 好。<br />
            <strong style={{ color: '#ef4444' }}>冇 Skill</strong>：15 次來回、3 次 API 失敗重試、12,000 tokens<br />
            <strong style={{ color: '#34d399' }}>有 Skill</strong>：2 條澄清問題、0 次 API 失敗、6,000 tokens
          </p>
        </div>

        <div className="key-point">
          <h4>迭代信號</h4>
          <p>
            <strong style={{ color: '#F59E0B' }}>Under-triggering</strong>：Skill 應該載入但冇 → 加更多 trigger phrases 同 keywords 到 description<br />
            <strong style={{ color: '#F59E0B' }}>Over-triggering</strong>：Skill 唔應該載入但載入咗 → 加 negative triggers（「Do NOT use for...」）、收窄 scope<br />
            <strong style={{ color: '#F59E0B' }}>Execution issues</strong>：結果唔一致 → 改善 instructions、加 error handling、用更具體嘅指令
          </p>
        </div>
      </div>

      <div className="use-case">
        <h4>Success Criteria 框架</h4>
        <p>定義 Skill 成功嘅指標（可以 vibes-based，但盡量量化）：</p>
        <ol className="steps">
          <li><span className="step-num">1</span><span><strong>Triggering rate</strong>：90%+ 嘅相關查詢觸發 Skill（跑 10-20 個測試 query）</span></li>
          <li><span className="step-num">2</span><span><strong>Tool call efficiency</strong>：有 Skill vs 冇 Skill 嘅 tool call 數量同 token 消耗比較</span></li>
          <li><span className="step-num">3</span><span><strong>Zero failed API calls</strong>：監控 MCP server logs，追蹤 retry rates 同 error codes</span></li>
          <li><span className="step-num">4</span><span><strong>User autonomy</strong>：用戶唔使 redirect 或 clarify（觀察測試過程）</span></li>
          <li><span className="step-num">5</span><span><strong>Consistency</strong>：同一個 request 跑 3-5 次，結果結構一致</span></li>
        </ol>
      </div>
    </div>
  );
}

function DistributionTab() {
  return (
    <div className="card">
      <h2>分發同部署策略</h2>
      <div className="subtitle">GitHub → Claude.ai / Code / API → 組織級部署</div>

      <p>
        有 Skill 嘅 MCP 整合比淨 MCP 更完整。當用戶比較唔同嘅 connector 時，
        有 Skill 嘅嗰個提供更快嘅價值路徑——呢個就係你嘅競爭優勢。
      </p>

      <div className="key-points">
        <div className="key-point">
          <h4>個人安裝</h4>
          <p>
            <strong>Claude.ai</strong>：Settings → Capabilities → Skills → Upload skill（zip 個 folder）<br />
            <strong>Claude Code</strong>：放入 skills directory<br />
            <strong>API</strong>：<code>/v1/skills</code> endpoint 管理，<code>container.skills</code> parameter 加入 Messages API request
          </p>
        </div>

        <div className="key-point">
          <h4>組織級部署</h4>
          <p>
            Admin 可以 workspace-wide 部署 Skill（2025年12月 shipped）。自動更新 + 集中管理。
          </p>
        </div>

        <div className="key-point">
          <h4>GitHub 托管最佳實踐</h4>
          <p>
            ① Public repo，清晰 README（README 係比人睇，唔好放入 Skill folder 入面）<br />
            ② Example usage + screenshots<br />
            ③ 從 MCP 文件 link 去 Skill repo<br />
            ④ 解釋兩者合作嘅價值<br />
            ⑤ Quick-start guide
          </p>
        </div>

        <div className="key-point">
          <h4>定位策略</h4>
          <p>
            <strong style={{ color: '#34d399' }}>Focus on outcomes</strong>：「teams set up complete project workspaces in seconds instead of 30 minutes」<br />
            <strong style={{ color: '#ef4444' }}>唔好講</strong>：「a folder containing YAML frontmatter and Markdown instructions」<br /><br />
            <strong>MCP + Skills story</strong>：「Our MCP server gives Claude access to your Linear projects. Our skills teach Claude your team&apos;s sprint planning workflow. Together, they enable AI-powered project management.」
          </p>
        </div>
      </div>

      <div className="use-case">
        <h4>Open Standard</h4>
        <p>
          Anthropic 已經將 Agent Skills 發佈為 <strong>open standard</strong>。
          好似 MCP 一樣，Skills 設計為跨平台可移植——同一個 Skill 理論上可以喺 Claude 或其他 AI 平台使用。
          不過某啲 Skill 可能專為特定平台優化，作者可以喺 <code>compatibility</code> 欄位標明。
        </p>
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
      explanation: 'Description 必須包含三樣嘢：做乜（what it does）、幾時觸發（trigger conditions，例如「Use when user says...」）、同關鍵能力。呢個係 Progressive Disclosure Level 1，永遠喺 system prompt 入面，Claude 靠佢決定要唔要載入 Skill。',
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
      explanation: 'Multi-MCP Coordination 適用於工作流跨越多個服務。Design-to-dev handoff 需要 Figma MCP → Drive MCP → Linear MCP → Slack MCP 逐步協調，每個 phase 有清晰嘅數據傳遞。Report 改進用 Iterative Refinement，檔案 storage 用 Context-Aware Selection，合規用 Domain-Specific Intelligence。',
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
      explanation: 'Over-triggering 嘅解決方法係喺 description 加 negative triggers（例如「Do NOT use for simple data exploration」）同收窄 scope（例如將「Processes documents」改成「Processes PDF legal documents for contract review」）。加更多 trigger phrases 會令 over-triggering 更嚴重。',
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
      explanation: 'YAML frontmatter 係 Level 1，永遠載入喺 Claude 嘅 system prompt 入面。佢提供剛剛好嘅資訊令 Claude 知道幾時應該用呢個 Skill，而唔使載入整個 SKILL.md 嘅內容。呢個設計慳 token 同時保持 Skill 嘅可發現性。',
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
      <div className="subtitle">測試你對 Skill 架構同 Pattern 嘅理解</div>

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
        subtitle="學識設計、測試、分發 Claude Skills — 由 SKILL.md 結構到五大 Pattern 到 MCP 協作"
        tabs={[
          { id: 'overview', label: '① 基本概念', content: <OverviewTab /> },
          { id: 'structure', label: '② SKILL.md 結構', content: <StructureTab /> },
          { id: 'mcp-skills', label: '③ MCP + Skills', premium: true, content: <MCPSkillsTab /> },
          { id: 'patterns', label: '④ 五大 Pattern', premium: true, content: <PatternsTab /> },
          { id: 'testing', label: '⑤ 測試同迭代', premium: true, content: <TestingTab /> },
          { id: 'distribution', label: '⑥ 分發策略', premium: true, content: <DistributionTab /> },
          { id: 'ai-viber', label: '⑦ AI Viber', premium: true, content: <AIViberTab /> },
          { id: 'quiz', label: '⑧ Quiz', premium: true, content: <QuizTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
