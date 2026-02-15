import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const relatedTopics = [
  { slug: 'prompt-engineering', label: 'Prompt Engineering 系統設計' },
  { slug: 'ai-tools-landscape', label: 'AI 工具全景圖' },
  { slug: 'multi-ai-workflow', label: '多 AI 協作工作流' },
  { slug: 'skill-vs-agent', label: 'Skill vs Agent' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Prompt as Interface</h2>
      <div className="subtitle">Prompt 係你同 AI 之間嘅 API Contract</div>
      <p>
        好多人以為寫 prompt 就係「同 AI 傾偈」——錯。Prompt 係你同 AI 嘅 <strong style={{ color: '#34d399' }}>interface</strong>，同你寫 function signature 一樣重要。你嘅 prompt 質素直接決定 AI output 質素，冇得賴 AI 蠢，只能怪自己 prompt 寫得差。
      </p>
      <p>
        工程師應該將 prompt 當 code 咁管理——<strong style={{ color: '#F59E0B' }}>version control</strong>、<strong style={{ color: '#a5b4fc' }}>test</strong>、<strong style={{ color: '#38bdf8' }}>iterate</strong>。一個好嘅 prompt library 就好似你嘅 code snippets 庫，用得好可以令你生產力翻幾倍。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowCenter" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#38bdf8" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowPink" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#ec4899" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#a78bfa" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {/* Center hub */}
          <circle cx="350" cy="200" r="55" fill="#1a1d27" stroke="#6366f1" strokeWidth="2.5" filter="url(#glowCenter)" />
          <text x="350" y="193" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">Prompt</text>
          <text x="350" y="210" textAnchor="middle" fill="#9ca3af" fontSize="10">Interface</text>

          {/* Code - top */}
          <rect x="295" y="30" width="110" height="60" rx="12" fill="#0f3d2e" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
          <text x="350" y="55" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Code</text>
          <text x="350" y="72" textAnchor="middle" fill="#9ca3af" fontSize="9">生成、重構、補全</text>
          <line x1="350" y1="90" x2="350" y2="145" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" />

          {/* Architecture - top right */}
          <rect x="510" y="80" width="120" height="60" rx="12" fill="#3d2e0a" stroke="#F59E0B" strokeWidth="2" filter="url(#glowAmber)" />
          <text x="570" y="105" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Architecture</text>
          <text x="570" y="122" textAnchor="middle" fill="#9ca3af" fontSize="9">設計、分析、tradeoff</text>
          <line x1="510" y1="115" x2="405" y2="185" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 3" />

          {/* Debugging - bottom right */}
          <rect x="510" y="260" width="120" height="60" rx="12" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" filter="url(#glowBlue)" />
          <text x="570" y="285" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="700">Debugging</text>
          <text x="570" y="302" textAnchor="middle" fill="#9ca3af" fontSize="9">排錯、追蹤、修復</text>
          <line x1="510" y1="285" x2="405" y2="215" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" />

          {/* Testing - bottom left */}
          <rect x="70" y="260" width="120" height="60" rx="12" fill="#2d1a3d" stroke="#a78bfa" strokeWidth="2" filter="url(#glowPurple)" />
          <text x="130" y="285" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="700">Testing</text>
          <text x="130" y="302" textAnchor="middle" fill="#9ca3af" fontSize="9">單元、整合、邊界</text>
          <line x1="190" y1="285" x2="295" y2="215" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 3" />

          {/* Docs - top left */}
          <rect x="70" y="80" width="120" height="60" rx="12" fill="#3d0a2e" stroke="#ec4899" strokeWidth="2" filter="url(#glowPink)" />
          <text x="130" y="105" textAnchor="middle" fill="#ec4899" fontSize="12" fontWeight="700">Docs</text>
          <text x="130" y="122" textAnchor="middle" fill="#9ca3af" fontSize="9">API 文檔、README</text>
          <line x1="190" y1="115" x2="295" y2="185" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>Prompt 係 AI 嘅 interface</strong>：你嘅 prompt 質素直接決定 AI output 質素。寫 prompt 同寫 API contract 一樣——要明確、有結構、可測試。垃圾 prompt 入，垃圾結果出，GIGO 原則永遠適用。</span></li>
        <li><span className="step-num">2</span><span><strong>好嘅 prompt 有三個元素</strong>：明確角色（你係咩專家）、約束條件（唔好做咩）、輸出格式（用咩格式回覆）。缺一不可，少咗任何一個都會令 output 質素大跌。</span></li>
        <li><span className="step-num">3</span><span><strong>建立你嘅 Prompt Library</strong>：工程師應該有自己嘅 prompt 庫，就好似 code snippets 咁。常用嘅 prompt 要 version control、加 tag、定期更新。呢個係你嘅競爭優勢。</span></li>
      </ol>
    </div>
  );
}

function FrameworkTab() {
  return (
    <div className="card">
      <h2>Prompt 模板框架</h2>
      <div className="subtitle">標準化你嘅 Prompt，令每次 output 都穩定可靠</div>
      <p>亂寫 prompt 就好似冇 type 咁寫 JavaScript——有時 work 有時唔 work，完全靠運氣。用標準模板框架，可以令你嘅 prompt 穩定、可維護、可重用。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>標準模板結構</h4>
          <p>
            <strong style={{ color: '#34d399' }}>[System] Role</strong>：定義 AI 嘅角色同專長<br />
            <strong style={{ color: '#F59E0B' }}>[Developer] Constraints</strong>：設定約束同規則<br />
            <strong style={{ color: '#38bdf8' }}>[User] Input</strong>：提供具體任務同 context<br />
            <strong style={{ color: '#a78bfa' }}>[Output] Format</strong>：指定輸出格式同結構
          </p>
        </div>
        <div className="key-point">
          <h4>Prompt 版本控制</h4>
          <p>將 prompt templates 放入 Git repo。每次修改都要 commit，加 changelog 記錄改咗咩同點解改。唔同版本嘅 prompt 效果唔同，要有記錄先可以 rollback。團隊共用 prompt repo，避免每人重複發明輪子。</p>
        </div>
        <div className="key-point">
          <h4>參數化 Prompt</h4>
          <p>用 <code style={{ color: '#34d399' }}>{'{variables}'}</code> 令 prompt 可重用。例如：<code style={{ color: '#9ca3af' }}>Review this {'{language}'} code for {'{review_focus}'}</code>。一個 template 配唔同參數，可以應對十幾種場景，唔使每次重寫。</p>
        </div>
        <div className="key-point">
          <h4>Golden Sample 測試</h4>
          <p>每個 prompt template 都要有 golden samples——已知好嘅 input/output pairs。每次改 prompt 之後，用 golden samples 跑一次驗證，確保冇 regression。呢個同 unit test 嘅概念一模一樣。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>模板範例</h4>
        <p>
          <code style={{ color: '#34d399' }}>[System]</code> You are a senior {'{role}'} engineer with 10+ years experience.<br />
          <code style={{ color: '#F59E0B' }}>[Constraints]</code> Always explain trade-offs. Never give one-sided answers. Use examples.<br />
          <code style={{ color: '#38bdf8' }}>[Input]</code> {'{task_description}'}<br />
          <code style={{ color: '#a78bfa' }}>[Output]</code> Respond in structured markdown with headers, bullet points, and code blocks.
        </p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>10 個工程師必備 Prompt</h2>
      <div className="subtitle">即 copy 即用，覆蓋日常開發 90% 場景</div>

      <div className="prompt-card">
        <h4>1. 萬能助手 — Senior Engineer Mode</h4>
        <div className="prompt-text">
          {`You are a senior full-stack engineer with 15+ years of experience.
Before answering any question:
1. Clarify all ambiguous technical details
2. Consider edge cases and failure modes
3. Provide concrete code examples, not abstract theory
4. Prioritize accuracy over speed — 寧願慢啲答都唔好亂答
5. If you're unsure, say so explicitly
Respond with precision. Use structured markdown.`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>2. 任務分解器 — Task Decomposer</h4>
        <div className="prompt-text">
          {`Break down the following complex task into subtasks:
Task: {task_description}

For each subtask:
1. 名稱同描述（一句講清楚做咩）
2. Dependencies — 邊個 subtask 要先完成
3. Estimated effort (S/M/L)
4. Potential risks or blockers
5. Acceptance criteria — 點先算完成

Output 用 numbered list，按執行順序排列。
標出 critical path 同可以 parallel 做嘅 tasks。`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>3. Code Reviewer — 代碼審查員</h4>
        <div className="prompt-text">
          {`Review the following code. Check for:
1. Bugs — 邏輯錯誤、off-by-one、null pointer
2. Security — injection, XSS, auth bypass, data exposure
3. Performance — N+1 queries, unnecessary loops, memory leaks
4. Style — naming conventions, code organization, DRY violations
5. Edge cases — empty input, concurrent access, large data sets

For each issue found:
- Severity: 🔴 Critical / 🟡 Warning / 🔵 Info
- Line number and code snippet
- 點解係問題（explain the impact）
- 建議修改方案 with code example`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>4. Architecture Advisor — 架構顧問</h4>
        <div className="prompt-text">
          {`Analyze the following system design requirement:
{requirement}

Provide:
1. 2-3 architecture options（唔好淨係俾一個方案）
2. 每個方案嘅 trade-offs — scalability, cost, complexity, maintainability
3. Data flow diagram (用 text/ASCII)
4. Technology stack 建議 with justification
5. Potential bottlenecks 同 mitigation strategies
6. 最終建議 — 邊個方案最適合，點解

Context: {scale} users, {budget} budget, {timeline} timeline.`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>5. Debug 助手 — Systematic Debugger</h4>
        <div className="prompt-text">
          {`I'm debugging the following issue:
Error/Symptom: {error_description}
Environment: {env_details}

Use systematic debugging approach:
1. 分析 error message，列出所有可能嘅 root causes
2. 按可能性排序（最大機會嘅排第一）
3. 對每個 hypothesis，提供驗證方法（command / code / check）
4. 建議 fix，解釋點解呢個 fix 有效
5. 提供預防措施 — 點樣避免將來再出呢個問題

唔好假設，要用證據推理。If unsure, ask for more info.`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>6. Test Generator — 測試生成器</h4>
        <div className="prompt-text">
          {`Generate comprehensive tests for the following code:
{code}

Requirements:
1. Unit tests — cover every public method
2. Edge cases — empty input, null, boundary values, overflow
3. Error cases — invalid input, network failure, timeout
4. Integration tests — if applicable
5. Use {test_framework} (e.g. Jest, pytest, Go testing)

每個 test 要有清楚嘅名，describe WHAT it tests 同 WHY.
Follow AAA pattern: Arrange → Act → Assert.
Target: 90%+ code coverage.`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>7. 文檔撰寫 — Documentation Writer</h4>
        <div className="prompt-text">
          {`Generate documentation for the following:
{code_or_api}

Include:
1. Overview — 一段話講清楚呢個 module/API 做咩
2. API Reference — every endpoint/method with params, return types, examples
3. Usage examples — 最少 3 個真實使用場景
4. Error handling — 所有可能嘅 error codes 同處理方法
5. Configuration — environment variables, options, defaults

Format: Markdown. 用 code blocks 寫 examples.
Tone: 清晰、直接、technical but accessible.`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>8. API Designer — API 設計師</h4>
        <div className="prompt-text">
          {`Design a RESTful API for: {feature_description}

Requirements:
1. Endpoints — list all routes with HTTP methods
2. Request/Response schemas (JSON format)
3. Authentication 同 authorization strategy
4. Error handling — standard error response format, HTTP status codes
5. Pagination, filtering, sorting for list endpoints
6. Rate limiting strategy
7. Versioning approach (URL path / header)

Follow REST best practices. 考慮 backward compatibility.
如果 GraphQL 更適合，解釋點解同提供 schema。`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>9. Security Auditor — 安全審計員</h4>
        <div className="prompt-text">
          {`Perform a security audit on the following code/config:
{code}

Check for OWASP Top 10:
1. SQL Injection / NoSQL Injection
2. XSS (Stored, Reflected, DOM-based)
3. Broken Authentication
4. Sensitive Data Exposure
5. Broken Access Control
6. Security Misconfiguration
7. CSRF, SSRF, XXE

For each vulnerability found:
- Risk level: Critical / High / Medium / Low
- Attack scenario — 攻擊者可以點樣利用
- Fix recommendation with code example
- 預防 checklist for future development`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>10. Performance Optimizer — 性能優化師</h4>
        <div className="prompt-text">
          {`Analyze and optimize the following code/query for performance:
{code_or_query}

Profile and identify:
1. Time complexity — current vs optimal
2. Space complexity — memory usage patterns
3. Database queries — N+1 problems, missing indexes, slow joins
4. Network calls — unnecessary round trips, missing caching
5. Concurrency issues — race conditions, deadlocks

For each optimization:
- Expected improvement (e.g., "reduce from O(n²) to O(n log n)")
- Before/After code comparison
- Trade-offs（例如：用多啲 memory 換 speed）
- Measurement method — 點樣驗證改善咗幾多`}
        </div>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber — Meta Prompt</h2>
      <div className="subtitle">用 Prompt 生成 Prompt，自動化你嘅 Prompt Engineering</div>

      <div className="prompt-card">
        <h4>Meta-Prompt — Prompt 生成器</h4>
        <div className="prompt-text">
          {`You are a Prompt Engineering expert. Help me create a high-quality prompt for the following task:

Task description: {my_task}
Target AI model: {model, e.g. Claude / GPT-4 / Gemini}
Desired output format: {format, e.g. code / markdown / JSON}

Generate a production-ready prompt that includes:
1. [System] — Clear role definition with expertise level
2. [Constraints] — 至少 5 個具體約束（唔好做咩，要做咩）
3. [Input Template] — 用 {variables} 標記可替換部分
4. [Output Format] — 精確定義輸出結構
5. [Examples] — 至少 1 個 input/output example (few-shot)
6. [Edge Cases] — 提醒 AI 要處理嘅邊界情況

Additional requirements:
- Prompt 要可以直接 copy-paste 使用
- 加入 chain-of-thought instruction（「先分析，再回答」）
- 考慮 token efficiency — 唔好寫廢話，每句都要有用
- 用英文寫 prompt body（更穩定），但 comments 可以用中文

最後，評估呢個 prompt 嘅預期效果（1-10 分），並提出改善建議。`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt Debugger — Prompt 除錯器</h4>
        <div className="prompt-text">
          {`我有一個 prompt 但效果唔理想，幫我分析同改善：

原始 Prompt:
{paste_your_prompt_here}

問題描述:
{describe_the_issue, e.g. "output 太 generic", "成日 hallucinate", "格式唔啱"}

請：
1. 分析原始 prompt 嘅弱點（缺乏咩？太模糊？約束唔夠？）
2. 逐項改善，解釋每個修改嘅原因
3. 提供改善後嘅完整 prompt
4. 建議 3 個 golden test cases 驗證改善效果
5. 如果 prompt 太長，提供精簡版（保持效果）`}
        </div>
      </div>
    </div>
  );
}

function QuizTab() {
  const [selected, setSelected] = useState({});
  const [showResults, setShowResults] = useState(false);

  const questions = [
    {
      id: 1,
      question: '一個好嘅 prompt template 最重要嘅元素係咩？',
      options: [
        { id: 'a', text: '越長越好，寫得越詳細越好' },
        { id: 'b', text: '明確嘅角色、約束條件、同輸出格式' },
        { id: 'c', text: '用最多 emoji 同友善嘅語氣' },
        { id: 'd', text: '直接叫 AI 「盡力做」就夠' },
      ],
      correct: 'b',
      explanation: '好嘅 prompt 需要三個核心元素：Role（角色定義）、Constraints（約束條件）、Output Format（輸出格式）。長度唔係重點，精準先係。',
    },
    {
      id: 2,
      question: '點解要將 prompt 放入 Git 做 version control？',
      options: [
        { id: 'a', text: '因為老闆要求' },
        { id: 'b', text: '可以追蹤改動歷史，rollback 到之前有效嘅版本，團隊共享' },
        { id: 'c', text: 'Git 會自動優化 prompt' },
        { id: 'd', text: '其實唔需要，bookmark 就夠' },
      ],
      correct: 'b',
      explanation: 'Prompt 同 code 一樣需要 version control。你可以追蹤邊個版本效果最好、rollback 失敗嘅修改、同團隊共享最佳實踐。Git 唔會幫你優化，但會幫你管理。',
    },
    {
      id: 3,
      question: '以下邊個做法可以最有效提升 prompt 嘅 output 質素？',
      options: [
        { id: 'a', text: '加 "please" 同 "thank you"' },
        { id: 'b', text: '用大寫鎖定寫成個 prompt' },
        { id: 'c', text: '提供 few-shot examples（input/output 範例）' },
        { id: 'd', text: '每次都重新寫新 prompt，唔好重用' },
      ],
      correct: 'c',
      explanation: 'Few-shot examples 係最有效提升 output 質素嘅方法之一。俾 AI 睇到你期望嘅 input/output pattern，佢就更容易 follow。禮貌字眼唔影響效果，大寫反而可能令 AI 行為異常。',
    },
    {
      id: 4,
      question: 'Golden sample testing 喺 prompt engineering 入面嘅作用係咩？',
      options: [
        { id: 'a', text: '令 prompt 睇落更專業' },
        { id: 'b', text: '驗證 prompt 修改冇 regression，確保 output 質素穩定' },
        { id: 'c', text: '收集 training data 微調模型' },
        { id: 'd', text: '計算 prompt 嘅 token 成本' },
      ],
      correct: 'b',
      explanation: 'Golden samples 就係 prompt 嘅 unit tests。每次修改 prompt 之後，用已知好嘅 input/output pairs 驗證效果，確保冇 regression。呢個同軟件工程嘅 testing 概念完全一樣。',
    },
  ];

  const score = questions.filter((q) => selected[q.id] === q.correct).length;

  return (
    <div className="card">
      <h2>Prompt Engineering Quiz</h2>
      <div className="subtitle">測試下你對 Prompt Engineering 嘅理解</div>

      {questions.map((q) => (
        <div key={q.id} style={{ marginBottom: '1.5rem' }}>
          <p><strong>{q.id}. {q.question}</strong></p>
          {q.options.map((opt) => {
            const isSelected = selected[q.id] === opt.id;
            const isCorrect = showResults && opt.id === q.correct;
            const isWrong = showResults && isSelected && opt.id !== q.correct;
            return (
              <div
                key={opt.id}
                onClick={() => !showResults && setSelected({ ...selected, [q.id]: opt.id })}
                style={{
                  padding: '0.6rem 1rem',
                  margin: '0.4rem 0',
                  borderRadius: '8px',
                  border: `1.5px solid ${isCorrect ? '#10B981' : isWrong ? '#ef4444' : isSelected ? '#6366f1' : '#2d2f3e'}`,
                  background: isCorrect ? 'rgba(16,185,129,0.1)' : isWrong ? 'rgba(239,68,68,0.1)' : isSelected ? 'rgba(99,102,241,0.1)' : 'transparent',
                  cursor: showResults ? 'default' : 'pointer',
                  color: '#e2e8f0',
                  fontSize: '0.95rem',
                }}
              >
                {opt.id.toUpperCase()}. {opt.text}
              </div>
            );
          })}
          {showResults && (
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.4rem' }}>
              {selected[q.id] === q.correct ? '✓ ' : '✗ '}{q.explanation}
            </p>
          )}
        </div>
      ))}

      <button
        onClick={() => setShowResults(true)}
        disabled={Object.keys(selected).length < questions.length}
        style={{
          padding: '0.7rem 2rem',
          borderRadius: '8px',
          border: 'none',
          background: Object.keys(selected).length < questions.length ? '#2d2f3e' : '#6366f1',
          color: '#fff',
          fontSize: '1rem',
          cursor: Object.keys(selected).length < questions.length ? 'not-allowed' : 'pointer',
          marginTop: '0.5rem',
        }}
      >
        {showResults ? `得分：${score} / ${questions.length}` : '提交答案'}
      </button>

      {showResults && (
        <button
          onClick={() => { setSelected({}); setShowResults(false); }}
          style={{
            padding: '0.7rem 2rem',
            borderRadius: '8px',
            border: '1.5px solid #6366f1',
            background: 'transparent',
            color: '#a5b4fc',
            fontSize: '1rem',
            cursor: 'pointer',
            marginTop: '0.5rem',
            marginLeft: '0.75rem',
          }}
        >
          重做
        </button>
      )}
    </div>
  );
}

export default function PromptCheatSheet() {
  return (
    <>
      <TopicTabs
        title="Prompt Cheat Sheet"
        subtitle="工程師嘅 Prompt 秘笈：10 個即用 Prompt + 框架 + Meta-Prompt 生成器"
        tabs={[
          { id: 'overview', label: '① Prompt as Interface', content: <OverviewTab /> },
          { id: 'framework', label: '② 模板框架', content: <FrameworkTab /> },
          { id: 'practice', label: '③ 10 大 Prompt', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
          { id: 'quiz', label: '⑤ Quiz', content: <QuizTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
