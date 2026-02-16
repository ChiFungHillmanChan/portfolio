import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '喺 Prompt 四層架構入面，Developer Prompt 嘅主要職責係咩？',
    options: [
      { text: '定義 AI 嘅角色同行為邊界', correct: false, explanation: '呢個係 System Prompt 嘅職責，負責設定 AI 嘅「人格」同底線' },
      { text: '約束輸出格式同結構化輸出（例如 JSON schema、token 限制）', correct: true, explanation: '正確！Developer Prompt 負責指定 output format，例如要求 JSON、限制 token 數量、禁止 markdown 等。呢層令 AI 嘅輸出可以被程式直接解析' },
      { text: '提供具體嘅任務輸入', correct: false, explanation: '呢個係 User Prompt 嘅職責——每次唔同嘅任務就好似 function 嘅 argument' },
      { text: '生成最終輸出結果', correct: false, explanation: 'Output 層係 AI 嘅回覆，唔係由 Developer Prompt 直接生成' },
    ],
  },
  {
    question: 'Constraint Injection 入面加「If you don\'t know, say I don\'t know」呢句有咩作用？',
    options: [
      { text: '令 AI 嘅回應更加禮貌', correct: false, explanation: '呢句唔係為咗禮貌，而係為咗減少 AI 亂作答案嘅情況' },
      { text: '減少 hallucination——逼 AI 承認唔知而唔係亂作答案', correct: true, explanation: '完全正確！冇呢個 constraint，AI 為咗「有嘢講」會生成睇落合理但實際錯誤嘅答案。明確允許佢講「唔知」，可以大幅減少 hallucination' },
      { text: '減少 API token 用量', correct: false, explanation: 'AI 講「I don\'t know」同講一段長回應嘅 token 差異唔大，呢個 constraint 嘅目的係提升準確性' },
      { text: '加快 AI 嘅回應速度', correct: false, explanation: '回應速度取決於模型同 token 數量，唔係 constraint 內容' },
    ],
  },
  {
    question: 'Prompt Debugging 同 Code Debugging 嘅共同方法論係咩？',
    options: [
      { text: '一次過改曬所有嘢，睇下效果', correct: false, explanation: '一次改曬所有嘢係最差嘅做法——你唔知道邊個改動有效、邊個無效' },
      { text: 'Isolate → Reproduce → Fix → Verify，逐層隔離測試', correct: true, explanation: '啱！同 code debugging 一樣，prompt debugging 要逐層隔離（System / Developer / User），搵出問題出喺邊層，修改後再驗證。每次只改一個變數，記錄每次修改嘅結果' },
      { text: '不停重新生成直到出到好嘅結果', correct: false, explanation: '呢個係碰運氣，唔係 debugging。就算出到好結果你都唔知點解，下次一樣會出問題' },
      { text: '換一個更貴嘅 AI 模型', correct: false, explanation: '好多時候問題出喺 prompt 而唔係模型能力。換模型唔解決 prompt 層面嘅歧義問題' },
    ],
  },
];

const relatedTopics = [
  { slug: 'skill-vs-agent', label: 'Skill vs Agent' },
  { slug: 'prompt-cheat-sheet', label: 'Prompt 速查表' },
  { slug: 'ai-model-comparison', label: 'AI 模型深入對比' },
  { slug: 'multi-ai-workflow', label: '多 AI 協作工作流' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Prompt Engineering 係咩</h2>
      <div className="subtitle">System / Developer / User / Output 四層 Prompt 架構</div>
      <p>
        寫 Prompt 唔係亂寫一段文字咁簡單。真正嘅 Prompt Engineering 係一套<strong style={{ color: '#34d399' }}>結構化嘅架構設計</strong>——你要清楚知道每一層 prompt 嘅角色，先至可以穩定咁控制 AI 嘅輸出。好似寫 code 一樣，prompt 都有分層、有職責、有約束。
      </p>
      <p>
        四個角色示範：<strong style={{ color: '#3B82F6' }}>Coder</strong>（寫 code）、<strong style={{ color: '#F59E0B' }}>Designer</strong>（設計系統）、<strong style={{ color: '#a78bfa' }}>Mentor</strong>（教學指導）、<strong style={{ color: '#f472b6' }}>Founder</strong>（產品決策）。每個角色用唔同嘅 System Prompt 去定義 AI 嘅行為邊界。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#a78bfa" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradSystem" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDev" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradUser" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradOutput" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrDown" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto"><path d="M0,0 L4,8 L8,0 Z" fill="#6366f1" /></marker>
          </defs>

          {/* Layer 1: System Prompt */}
          <g transform="translate(50,20)">
            <rect width="600" height="75" rx="14" fill="url(#gradSystem)" stroke="#10B981" strokeWidth="2.5" filter="url(#glowGreen)" />
            <text x="300" y="28" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">Layer 1: System Prompt</text>
            <text x="300" y="48" textAnchor="middle" fill="#9ca3af" fontSize="11">角色定義 + 規則（控制 AI 嘅行為邊界）</text>
            <text x="300" y="65" textAnchor="middle" fill="#6b7280" fontSize="10">&quot;You are a senior engineer with 10+ years experience...&quot;</text>
          </g>

          {/* Arrow 1→2 */}
          <path d="M350,95 L350,120" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrDown)" />

          {/* Layer 2: Developer Prompt */}
          <g transform="translate(50,120)">
            <rect width="600" height="75" rx="14" fill="url(#gradDev)" stroke="#3B82F6" strokeWidth="2.5" filter="url(#glowBlue)" />
            <text x="300" y="28" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">Layer 2: Developer Prompt</text>
            <text x="300" y="48" textAnchor="middle" fill="#9ca3af" fontSize="11">約束 + 輸出格式（結構化輸出）</text>
            <text x="300" y="65" textAnchor="middle" fill="#6b7280" fontSize="10">&quot;Always respond in JSON. Max 500 tokens. No markdown.&quot;</text>
          </g>

          {/* Arrow 2→3 */}
          <path d="M350,195 L350,220" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrDown)" />

          {/* Layer 3: User Prompt */}
          <g transform="translate(50,220)">
            <rect width="600" height="75" rx="14" fill="url(#gradUser)" stroke="#F59E0B" strokeWidth="2.5" filter="url(#glowAmber)" />
            <text x="300" y="28" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="700">Layer 3: User Prompt</text>
            <text x="300" y="48" textAnchor="middle" fill="#9ca3af" fontSize="11">具體任務輸入</text>
            <text x="300" y="65" textAnchor="middle" fill="#6b7280" fontSize="10">&quot;Review this React component for performance issues&quot;</text>
          </g>

          {/* Arrow 3→4 */}
          <path d="M350,295 L350,320" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrDown)" />

          {/* Layer 4: Output */}
          <g transform="translate(50,320)">
            <rect width="600" height="75" rx="14" fill="url(#gradOutput)" stroke="#a78bfa" strokeWidth="2.5" filter="url(#glowPurple)" />
            <text x="300" y="28" textAnchor="middle" fill="#a78bfa" fontSize="14" fontWeight="700">Layer 4: Output</text>
            <text x="300" y="48" textAnchor="middle" fill="#9ca3af" fontSize="11">預期格式（JSON / Markdown / Code）</text>
            <text x="300" y="65" textAnchor="middle" fill="#6b7280" fontSize="10">{`{ "severity": "high", "suggestion": "Use useMemo for...", "code": "..." }`}</text>
          </g>

          {/* Role badges on the right */}
          <g transform="translate(670,30)">
            <rect width="20" height="20" rx="4" fill="#3B82F6" opacity="0.8" />
            <text x="10" y="14" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">C</text>
          </g>
          <g transform="translate(670,55)">
            <rect width="20" height="20" rx="4" fill="#F59E0B" opacity="0.8" />
            <text x="10" y="14" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">D</text>
          </g>
          <g transform="translate(670,130)">
            <rect width="20" height="20" rx="4" fill="#a78bfa" opacity="0.8" />
            <text x="10" y="14" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">M</text>
          </g>
          <g transform="translate(670,155)">
            <rect width="20" height="20" rx="4" fill="#f472b6" opacity="0.8" />
            <text x="10" y="14" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">F</text>
          </g>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>System Prompt = 角色定義 + 規則</strong>：控制 AI 嘅行為邊界。你話佢係 senior engineer，佢就唔會俾 junior 級嘅答案。你設定「唔好用 any」，佢就唔敢用。呢層係最重要嘅，決定咗 AI 嘅「人格」同「底線」。</span></li>
        <li><span className="step-num">2</span><span><strong>Developer Prompt = 約束 + 輸出格式</strong>：結構化輸出嘅關鍵。指定 JSON schema、限制 token 數量、要求特定格式。呢層令 AI 嘅輸出可以被程式解析，唔會亂嚟。</span></li>
        <li><span className="step-num">3</span><span><strong>User Prompt = 具體任務輸入</strong>：每次唔同嘅任務。好似 function 嘅 argument——System 同 Developer prompt 係 function 定義，User prompt 係每次 call 嘅參數。</span></li>
        <li><span className="step-num">4</span><span><strong>Output = 預期格式</strong>：AI 嘅回覆會跟住前面三層嘅約束。System 決定角度，Developer 決定格式，User 決定內容。三層夾埋，輸出先至穩定可靠。</span></li>
      </ol>
    </div>
  );
}

function FrameworkTab() {
  return (
    <div className="card">
      <h2>Prompt 工程框架：點樣減少幻覺、穩定輸出</h2>
      <div className="subtitle">五個核心技術，每個都直接影響 AI 輸出質素</div>
      <p>好多人以為 Prompt Engineering 就係「問得好啲」，但其實係一套工程方法論。每個技術都有明確嘅目的：約束 AI 嘅行為、減少幻覺、確保輸出格式一致。</p>
      <div className="key-points">
        <div className="key-point">
          <h4>1. Role-based Prompting（角色設定）</h4>
          <p>設定 AI 身份：<strong style={{ color: '#34d399' }}>「You are a senior engineer with 10+ years experience in distributed systems」</strong>。唔好淨係講「你係工程師」——越具體，AI 嘅回答質素越高。角色設定會影響 AI 用咩語氣、咩深度、咩角度去回答。</p>
        </div>
        <div className="key-point">
          <h4>2. Constraint Injection（約束注入）</h4>
          <p>限制回答範圍，<strong style={{ color: '#F59E0B' }}>減少幻覺</strong>。例如：「Only answer based on the provided code. If you don't know, say 'I don't know'.」約束越明確，AI 亂講嘢嘅機率越低。呢個係對抗 hallucination 嘅最有效武器。</p>
        </div>
        <div className="key-point">
          <h4>3. Output Formatting（輸出格式化）</h4>
          <p>指定 JSON / Markdown / Code 格式。例如：<strong style={{ color: '#3B82F6' }}>「Respond in JSON with keys: severity, suggestion, codeExample」</strong>。格式化輸出可以被程式直接解析，唔使再做 post-processing。呢個對 automation pipeline 極度重要。</p>
        </div>
        <div className="key-point">
          <h4>4. Chain-of-Thought（思維鏈）</h4>
          <p>要求 AI <strong style={{ color: '#a78bfa' }}>先解釋推理過程，再俾最終答案</strong>。例如：「First explain your reasoning step by step, then give the final answer.」CoT 令 AI 嘅推理更透明，你可以驗證佢嘅邏輯，而唔係盲信結果。</p>
        </div>
        <div className="key-point">
          <h4>5. Template Versioning（Prompt 版本控制）</h4>
          <p>Prompt 都應該做版本控制，好似 code 咁。<strong style={{ color: '#f472b6' }}>用 Git 管理 prompt template</strong>，記錄每次修改嘅原因同效果。當 prompt 出問題嘅時候，你可以 rollback 去上一個穩定版本。唔好將 prompt 硬寫喺 code 入面——抽出嚟做 config。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>五層疊加嘅威力</h4>
        <p>單獨用一個技術效果有限，但當你將 Role + Constraint + Format + CoT + Versioning 全部疊加，AI 嘅輸出質素會大幅提升。呢個就係 Prompt Engineering 同「隨便問 AI」嘅分別。</p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰練習：3 個 Prompt 工程場景</h2>
      <div className="subtitle">從模板設計到 debug，逐步掌握 Prompt Engineering</div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>
            <strong style={{ color: '#34d399' }}>練習一：生成系統設計圖 Prompt</strong>
            <br />用 System / Developer / User 三層結構寫一個 prompt template，目標係令 AI 輸出一個完整嘅系統設計圖描述。
            <br /><br />
            <strong>System Layer：</strong>「You are a senior system architect. You design distributed systems for high-traffic applications. Always consider scalability, reliability, and cost.」
            <br /><strong>Developer Layer：</strong>「Respond in the following format: 1) Components list with responsibilities 2) Data flow diagram description 3) Key design decisions with tradeoffs 4) Scaling strategy」
            <br /><strong>User Layer：</strong>「Design a real-time chat system that supports 10M concurrent users.」
            <br /><br />
            重點：每層嘅職責要清晰——System 管角色，Developer 管格式，User 管任務。混淆咗就會出問題。
          </span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>
            <strong style={{ color: '#F59E0B' }}>練習二：Code Review Prompt（結構化輸出）</strong>
            <br />設計一個 Code Review prompt，要求 AI 用特定格式回覆：severity（critical / warning / info）、suggestion（具體建議）、code example（修改後嘅代碼）。
            <br /><br />
            <strong>Prompt Template：</strong>
            <br />「Review the following code. For each issue found, respond in JSON format:
            {`{ "issues": [{ "line": number, "severity": "critical|warning|info", "description": "...", "suggestion": "...", "fixedCode": "..." }] }`}
            Only report real issues. Do not fabricate problems. If the code is clean, return an empty issues array.」
            <br /><br />
            重點：「Do not fabricate problems」呢句 constraint 好重要——冇呢句，AI 會為咗「有嘢講」而發明唔存在嘅問題。
          </span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>
            <strong style={{ color: '#a78bfa' }}>練習三：Iterative Prompt Debugging</strong>
            <br />當 AI 俾咗錯誤答案，唔好直接換 prompt——要有系統咁 debug。
            <br /><br />
            <strong>Step 1：</strong>確認問題出喺邊層。AI 答錯係因為角色設定唔啱（System）？格式指示唔清楚（Developer）？定係任務描述有歧義（User）？
            <br /><strong>Step 2：</strong>逐層隔離測試。將 System / Developer / User 分開試，睇邊層出問題。
            <br /><strong>Step 3：</strong>加 constraint 收窄範圍。例如 AI 離題咗，加「Only discuss X, do not mention Y」。
            <br /><strong>Step 4：</strong>用 Chain-of-Thought 睇 AI 嘅推理過程，搵出邏輯斷裂點。
            <br /><br />
            重點：Prompt debugging 同 code debugging 一樣——isolate → reproduce → fix → verify。
          </span>
        </li>
      </ol>

      <div className="use-case">
        <h4>Debug Prompt 嘅核心思維</h4>
        <p>大部分 prompt 問題嘅根源係 ambiguity（歧義）。AI 唔係唔聽話，而係你嘅指令有多種解讀方式。解決方法：每次修改只改一個變數，記錄每次修改嘅結果，逐步收窄到正確嘅 prompt。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">五個工程級 Prompt Template，複製貼上即刻用</div>

      <div className="prompt-card">
        <h4>Prompt 1 — Code Review</h4>
        <div className="prompt-text">
          {`你係一個 Senior Software Engineer，有 10 年以上嘅 production code review 經驗。

請 review 以下代碼，用呢個格式回覆：

對每個問題：
1. 嚴重程度：critical / warning / info
2. 問題描述：用一句話講清楚
3. 建議：點樣修改
4. 修改後嘅代碼範例

規則：
- 只報告真實問題，唔好發明唔存在嘅 bug
- 如果代碼冇問題，直接講「LGTM」
- 重點關注：security、performance、error handling、edge cases
- 用 JSON 格式輸出

代碼：
[貼你嘅代碼]`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Architecture Review</h4>
        <div className="prompt-text">
          {`你係一個 Principal Architect，專門做大規模分佈式系統設計 review。

請 review 以下架構設計，從呢幾個維度分析：

1. Scalability：呢個設計可以 scale 到幾大？瓶頸喺邊？
2. Reliability：有咩 single point of failure？Failover 策略夠唔夠？
3. Cost：資源使用效率點樣？有冇過度設計？
4. Complexity：維護成本高唔高？新人上手難唔難？
5. Security：有冇明顯嘅安全漏洞？

輸出格式：
- 每個維度俾 1-5 分
- 列出最關鍵嘅 3 個問題
- 每個問題附帶具體嘅改進建議
- 最後俾一個整體評分同總結

架構描述：
[貼你嘅架構設計]`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — API Design</h4>
        <div className="prompt-text">
          {`你係一個 API Design Specialist，熟悉 RESTful、GraphQL、gRPC 設計原則。

根據以下需求，設計一套完整嘅 API：

要求：
1. Endpoint 設計：URL pattern、HTTP method、status codes
2. Request/Response schema：用 TypeScript interface 定義
3. Error handling：統一錯誤格式，包括 error code、message、details
4. Pagination：cursor-based pagination 設計
5. Versioning：API 版本策略
6. Rate limiting：建議嘅限制規則

規則：
- 遵循 RESTful 命名規範
- 考慮 backward compatibility
- 每個 endpoint 附帶使用範例
- 指出潛在嘅 N+1 query 問題

需求描述：
[貼你嘅功能需求]`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 4 — Test Generation</h4>
        <div className="prompt-text">
          {`你係一個 QA Engineer，專門寫高質素嘅自動化測試。

根據以下代碼，生成完整嘅測試：

要求：
1. Unit tests：覆蓋所有 public methods
2. Edge cases：null、undefined、empty string、boundary values
3. Error scenarios：每個可能嘅 error path 都要測
4. Integration tests：如果有外部依賴，mock 咗再測
5. Test naming：用 "should [expected behavior] when [condition]" 格式

規則：
- 用 [Jest/Vitest/你嘅 test framework]
- 每個 test 只測一個 behavior
- 唔好寫重複嘅 test
- Arrange-Act-Assert 模式
- 目標 coverage：>90%

代碼：
[貼你嘅代碼]`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 5 — Documentation Writer</h4>
        <div className="prompt-text">
          {`你係一個 Technical Writer，專門寫開發者文檔。

根據以下代碼/系統，寫一份完整嘅文檔：

文檔結構：
1. Overview：一段話講清楚呢個係咩、解決咩問題
2. Quick Start：3 步內跑起嚟
3. API Reference：每個 function/method 嘅參數、返回值、使用範例
4. Architecture：用文字描述系統架構同數據流
5. Configuration：所有可配置嘅選項，附預設值
6. Troubleshooting：常見問題同解決方法

規則：
- 寫俾中級開發者睇，唔好太 basic 亦唔好太 advanced
- 每個 section 都要有代碼範例
- 用 Markdown 格式
- 唔好寫「顯而易見」嘅嘢，重點講「踩坑位」
- 文檔長度控制喺 500-1000 字

代碼/系統描述：
[貼你嘅代碼或系統描述]`}
        </div>
      </div>
    </div>
  );
}

function QuizTab() {
  const questions = [
    {
      q: '喺 Prompt 四層架構入面，邊一層負責「控制 AI 嘅行為邊界」？',
      options: ['User Prompt', 'Developer Prompt', 'System Prompt', 'Output Layer'],
      correct: 2,
      explanation: 'System Prompt 係最頂層，負責定義 AI 嘅角色、規則同行為邊界。佢決定咗 AI 嘅「人格」同底線。',
    },
    {
      q: '點解 Constraint Injection 可以減少 AI 幻覺（Hallucination）？',
      options: [
        '因為佢令 AI 跑得更快',
        '因為佢限制咗 AI 嘅回答範圍，逼 AI 只喺已知資訊入面作答',
        '因為佢增加咗 token 數量',
        '因為佢改變咗 AI 嘅 model weights',
      ],
      correct: 1,
      explanation: 'Constraint Injection 通過明確限制回答範圍（例如「Only answer based on the provided code」），令 AI 唔會超出已知資訊去「創作」答案，從而減少幻覺。',
    },
    {
      q: 'Chain-of-Thought (CoT) prompting 嘅主要好處係咩？',
      options: [
        '令 AI 回答更短',
        '減少 API 費用',
        '令 AI 嘅推理過程透明，可以驗證佢嘅邏輯',
        '加快 AI 嘅回應速度',
      ],
      correct: 2,
      explanation: 'CoT 要求 AI 先展示推理步驟再俾最終答案，令你可以睇到佢嘅思考過程，如果邏輯有錯可以及時發現，唔使盲信結果。',
    },
    {
      q: '當 AI 俾咗錯誤答案，正確嘅 Prompt Debugging 步驟係咩？',
      options: [
        '直接重寫成個 prompt',
        '換一個 AI model',
        '逐層隔離測試（System → Developer → User），搵出問題出喺邊層',
        '加多啲 emoji 令 prompt 更清楚',
      ],
      correct: 2,
      explanation: 'Prompt debugging 同 code debugging 一樣——要 isolate → reproduce → fix → verify。逐層測試先可以準確定位問題，唔好一次改晒所有嘢。',
    },
    {
      q: '點解 Prompt 應該做版本控制（Template Versioning）？',
      options: [
        '因為 Git 要求所有檔案都要 commit',
        '因為可以追蹤每次修改嘅效果，出問題時 rollback 去穩定版本',
        '因為 prompt 檔案太大需要壓縮',
        '因為版本控制可以令 AI 回答更快',
      ],
      correct: 1,
      explanation: 'Prompt 同 code 一樣會隨時間演變。版本控制令你可以記錄每次修改嘅原因同效果，出問題時快速 rollback，而唔係靠記憶力去諗「之前個 prompt 係點寫」。',
    },
  ];

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (qIndex, optIndex) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) return;
    setSubmitted(true);
  };

  const score = submitted
    ? questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0)
    : 0;

  return (
    <div className="card">
      <h2>Prompt Engineering 小測驗</h2>
      <div className="subtitle">測試你對 Prompt 架構同工程技術嘅理解</div>

      {questions.map((q, qi) => (
        <div key={qi} style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '0.5rem' }}>
            {qi + 1}. {q.q}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {q.options.map((opt, oi) => {
              const isSelected = answers[qi] === oi;
              const isCorrect = oi === q.correct;
              let borderColor = isSelected ? '#6366f1' : '#2a2d3a';
              let bgColor = isSelected ? 'rgba(99,102,241,0.1)' : 'transparent';

              if (submitted) {
                if (isCorrect) {
                  borderColor = '#10B981';
                  bgColor = 'rgba(16,185,129,0.08)';
                } else if (isSelected && !isCorrect) {
                  borderColor = '#f87171';
                  bgColor = 'rgba(248,113,113,0.08)';
                }
              }

              return (
                <button
                  key={oi}
                  onClick={() => handleSelect(qi, oi)}
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    color: '#cbd5e1',
                    cursor: submitted ? 'default' : 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                  }}
                >
                  {opt}
                  {submitted && isSelected && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: isCorrect ? '#6ee7b7' : '#fca5a5', lineHeight: 1.5 }}>
                      {q.explanation}
                    </div>
                  )}
                  {submitted && isCorrect && !isSelected && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#6ee7b7', lineHeight: 1.5 }}>
                      {q.explanation}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 2rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: Object.keys(answers).length < questions.length ? '#374151' : '#6366f1',
            color: '#fff',
            fontWeight: 600,
            cursor: Object.keys(answers).length < questions.length ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem',
          }}
        >
          提交答案
        </button>
      ) : (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '0.5rem',
          background: '#1e293b',
          border: '1px solid #2a2d3a',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e2e8f0' }}>
            得分：{score} / {questions.length}
          </span>
          {score === questions.length && (
            <p style={{ color: '#6ee7b7', marginTop: '0.5rem' }}>Full marks! 你對 Prompt Engineering 嘅理解好紮實。</p>
          )}
          {score >= 3 && score < questions.length && (
            <p style={{ color: '#fbbf24', marginTop: '0.5rem' }}>唔錯！重溫返錯嘅題目，再鞏固一下。</p>
          )}
          {score < 3 && (
            <p style={{ color: '#fca5a5', marginTop: '0.5rem' }}>建議重新睇返 Overview 同 Framework tab，打好基礎先。</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PromptEngineering() {
  return (
    <>
      <TopicTabs
        title="Prompt Engineering"
        subtitle="四層 Prompt 架構：System → Developer → User → Output，工程化管理 AI 輸出"
        tabs={[
          { id: 'overview', label: '① 基本概念', content: <OverviewTab /> },
          { id: 'framework', label: '② 工程框架', content: <FrameworkTab /> },
          { id: 'practice', label: '③ 實戰練習', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
          { id: 'quiz', label: '⑤ 小測驗', premium: true, content: <QuizTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
