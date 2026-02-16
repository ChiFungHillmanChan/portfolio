import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Coding Agent 嘅核心 loop 係咩？',
    options: [
      { text: 'Input → Output → Done', correct: false, explanation: '一次過 Input → Output 太簡單，Coding Agent 需要反覆驗證' },
      { text: 'Plan → Execute → Verify，如果驗證唔通過就再 loop', correct: true, explanation: '啱！Agent 先 Plan（準備 context、搵相關 code），再 Execute（寫 code），最後 Verify（跑 test/lint），唔 pass 就再循環' },
      { text: 'Download → Install → Run', correct: false, explanation: '呢個係安裝軟件嘅流程，唔係 Coding Agent 嘅設計' },
      { text: 'Ask User → Wait → Reply', correct: false, explanation: 'Agent 嘅重點係自主執行，唔係每步都問用戶' },
    ],
  },
  {
    question: 'Plan 階段嘅 Context Compacting 係做咩？',
    options: [
      { text: '刪除 project 入面冇用嘅檔案', correct: false, explanation: 'Compacting 唔係刪除檔案，而係壓縮 context 資訊' },
      { text: '用另一個 LLM 將之前嘅對話同 context 壓縮成更短嘅摘要，避免 context window 溢出', correct: true, explanation: '啱！隨住對話越嚟越長，context 會超出 LLM 嘅 window。用另一個快速 LLM 將之前嘅內容壓縮成精簡摘要，保留重要資訊' },
      { text: '將所有 code 壓縮成 zip 檔', correct: false, explanation: 'Compacting 係壓縮 context 文字，唔係壓縮檔案' },
      { text: '減少 API call 嘅次數', correct: false, explanation: 'Compacting 嘅目的係管理 context window，唔係減少 API call' },
    ],
  },
  {
    question: 'Verify 階段通常用咩方法確認 Agent 寫嘅 code 正確？',
    options: [
      { text: '問用戶「啱唔啱」', correct: false, explanation: '雖然用戶確認係最後一步，但 Verify 階段應該有自動化檢查' },
      { text: '跑 automated test、lint check 同 type check 嚟自動驗證', correct: true, explanation: '啱！Verify 階段會跑 unit test、lint、type check 等自動化工具，如果 fail 就將錯誤資訊回饋到下一輪 Plan' },
      { text: '直接 deploy 到 production 睇有冇 error', correct: false, explanation: '直接 deploy 到 production 係非常危險嘅做法，應該先本地驗證' },
      { text: '讀一次 code 就知啱唔啱', correct: false, explanation: 'LLM 讀 code 唔一定準確，需要靠自動化工具驗證' },
    ],
  },
];

const relatedTopics = [
  { slug: 'secure-ai-agents', label: '保護 AI Agent' },
  { slug: 'ai-vs-software-engineer', label: 'AI 時代做 Software Engineer' },
  { slug: 'system-design-patterns', label: '系統設計模式總覽' },
  { slug: 'task-queue', label: 'Task Queue 任務隊列' },
  { slug: 'open-source-ai', label: '開源 AI 生態圈' },
];

function PlanTab() {
  return (
    <div className="card">
      <h2>Plan 階段 — 準備工作</h2>
      <div className="subtitle">點樣壓縮 context、搵返相關 code，先至開始真正寫 code</div>
      <p>
        以下介紹 Coding Agent 嘅核心設計。成個流程係一個 loop：Plan（計劃）→ Execute（執行）→ Verify（驗證）。如果驗證通過，就返俾用戶；如果唔 pass，就再 loop 一次。Plan 階段係第一步，目的係準備好所有背景資料，令 Agent 有足夠 context 去理解應該寫啲乜嘢 code。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="sh1" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowPlan" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradInd1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmb1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a2518" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGrn1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrB1" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
          </defs>
          <text x="400" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="14" fontWeight="700">Plan 階段：準備 Context</text>
          <g transform="translate(310,50)">
            <rect width="180" height="60" rx="14" fill="url(#gradAmb1)" stroke="#f59e0b" strokeWidth="2" filter="url(#sh1)" />
            <text x="90" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">用戶請求</text>
            <text x="90" y="43" textAnchor="middle" fill="#9ca3af" fontSize="10">「幫我加個新 API」</text>
          </g>
          <path d="M400,112 C400,125 400,135 400,148" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arrB1)" />
          <g transform="translate(250,150)">
            <rect width="300" height="80" rx="14" fill="url(#gradInd1)" stroke="#6366f1" strokeWidth="2.5" filter="url(#glowPlan)" />
            <text x="150" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">Plan 階段</text>
            <text x="150" y="48" textAnchor="middle" fill="#9ca3af" fontSize="11">準備相關 context</text>
            <text x="150" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">壓縮、搜尋、找返需要嘅 code</text>
          </g>
          <g transform="translate(60,280)">
            <rect width="160" height="85" rx="12" fill="url(#gradInd1)" stroke="#818cf8" strokeWidth="2" filter="url(#sh1)" />
            <text x="80" y="22" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="700">① Compacting</text>
            <text x="80" y="42" textAnchor="middle" fill="#c0c4cc" fontSize="9">用另一個 LLM</text>
            <text x="80" y="57" textAnchor="middle" fill="#c0c4cc" fontSize="9">縮短 context</text>
            <text x="80" y="73" textAnchor="middle" fill="#c0c4cc" fontSize="9">節省 token</text>
          </g>
          <path d="M320,232 C270,255 240,265 180,278" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
          <g transform="translate(250,280)">
            <rect width="160" height="85" rx="12" fill="url(#gradAmb1)" stroke="#f59e0b" strokeWidth="2" filter="url(#sh1)" />
            <text x="80" y="22" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">② Shell Search</text>
            <text x="80" y="42" textAnchor="middle" fill="#c0c4cc" fontSize="9">用 terminal 指令</text>
            <text x="80" y="57" textAnchor="middle" fill="#c0c4cc" fontSize="9">ls / grep 搵檔案</text>
            <text x="80" y="73" textAnchor="middle" fill="#c0c4cc" fontSize="9">基礎文字搜尋</text>
          </g>
          <path d="M380,232 C350,250 340,260 330,278" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
          <g transform="translate(440,280)">
            <rect width="160" height="85" rx="12" fill="url(#gradGrn1)" stroke="#22c55e" strokeWidth="2" filter="url(#sh1)" />
            <text x="80" y="22" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="700">③ Semantic Search</text>
            <text x="80" y="42" textAnchor="middle" fill="#c0c4cc" fontSize="9">Vector database</text>
            <text x="80" y="57" textAnchor="middle" fill="#c0c4cc" fontSize="9">語義相似度搜尋</text>
            <text x="80" y="73" textAnchor="middle" fill="#c0c4cc" fontSize="9">更聰明嘅搜尋</text>
          </g>
          <path d="M440,232 C460,250 480,260 500,278" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
          <g transform="translate(630,280)">
            <rect width="160" height="85" rx="12" fill="url(#gradInd1)" stroke="#a5b4fc" strokeWidth="2" filter="url(#sh1)" />
            <text x="80" y="22" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="700">④ Sub-Agents</text>
            <text x="80" y="42" textAnchor="middle" fill="#c0c4cc" fontSize="9">專門處理某個任務</text>
            <text x="80" y="57" textAnchor="middle" fill="#c0c4cc" fontSize="9">有自己 context</text>
            <text x="80" y="73" textAnchor="middle" fill="#c0c4cc" fontSize="9">唔會影響主 Agent</text>
          </g>
          <path d="M480,232 C530,255 580,265 650,278" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
          <g transform="translate(310,400)">
            <rect width="180" height="50" rx="10" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="1.5" />
            <text x="90" y="22" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="700">Context 準備好</text>
            <text x="90" y="38" textAnchor="middle" fill="#a5b4fc" fontSize="10">進入 Execute 階段 →</text>
          </g>
        </svg>
      </div>

      <h3>Plan 階段嘅四個技巧</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>Compacting（壓縮）</strong>——用另一個 LLM 將長篇嘅 context 縮短成摘要，節省 token。常見做法係用平啲嘅 model 做呢步，專門做 summarization。呢個係最基本嘅優化手法。</span></li>
        <li><span className="step-num">2</span><span><strong>Shell Search（Terminal 搜尋）</strong>——直接用 terminal 指令（例如 ls、grep）搵檔案同搜尋內容。呢個方法快、簡單，適合做基礎嘅文字搜尋。建議一定要配合埋。</span></li>
        <li><span className="step-num">3</span><span><strong>Semantic Search（語義搜尋）</strong>——用 vector database 做語義相似度搜尋，搵返真正相關嘅 code，而唔係淨係靠關鍵字。呢個係比較進階嘅做法，但效果好好。</span></li>
        <li><span className="step-num">4</span><span><strong>Sub-Agents（子 Agent）</strong>——將某啲專門任務交俾另一個 Agent 處理，佢有自己嘅 context window，唔會影響主 Agent。關鍵在於呢個係最靈活嘅方法，適合複雜任務。Claude Code 嘅 Agent Teams 功能就係呢個概念嘅實現——多個 Agent 各自有獨立 context，互相協作完成複雜任務。</span></li>
      </ol>

      <div className="highlight-box">
        <h4>核心目標</h4>
        <p>Plan 階段嘅目標係：準備好足夠嘅 context，令 Agent 有能力寫出正確嘅 code。唔係盲目開始寫，而係先了解背景、搵返相關檔案、壓縮唔重要嘅內容。呢個就係 Plan 嘅精髓。</p>
      </div>
    </div>
  );
}

function ExecuteTab() {
  return (
    <div className="card">
      <h2>Execute 階段 — 真正寫 Code</h2>
      <div className="subtitle">有咗 context 之後，點樣實際執行、調用工具、生成代碼</div>
      <p>
        準備好 context 之後，就到 Execute 階段。呢個階段係真正寫 code、調用工具、執行任務嘅地方。以下講解三個主要嘅執行方式：MCP（外部工具）、Scripts（本地腳本）、Codegen（Agent 自己生成代碼）。呢三個方法各有用途，要視乎情況選擇。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="sh2" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowExec" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#22c55e" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradGrn2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradInd2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmb2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a2518" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrG2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#22c55e" /></marker>
          </defs>
          <text x="400" y="28" textAnchor="middle" fill="#4ade80" fontSize="14" fontWeight="700">Execute 階段：實際執行</text>
          <g transform="translate(325,60)">
            <rect width="150" height="70" rx="14" fill="url(#gradGrn2)" stroke="#22c55e" strokeWidth="2.5" filter="url(#glowExec)" />
            <text x="75" y="28" textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="700">Agent</text>
            <text x="75" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">準備好 context</text>
            <text x="75" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">開始執行任務</text>
          </g>
          <g transform="translate(80,200)">
            <rect width="200" height="120" rx="12" fill="url(#gradInd2)" stroke="#6366f1" strokeWidth="2" filter="url(#sh2)" />
            <text x="100" y="25" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="700">① MCP 工具</text>
            <text x="100" y="43" textAnchor="middle" fill="#a5b4fc" fontSize="10">Model Context Protocol</text>
            <line x1="20" y1="53" x2="180" y2="53" stroke="#2a2d3a" strokeWidth="1" />
            <text x="100" y="70" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">外部工具連接</text>
            <text x="100" y="86" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">例如：Database query</text>
            <text x="100" y="102" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">API 調用等</text>
          </g>
          <path d="M350,132 C280,160 220,180 190,198" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrG2)" />
          <g transform="translate(300,200)">
            <rect width="200" height="120" rx="12" fill="url(#gradAmb2)" stroke="#f59e0b" strokeWidth="2" filter="url(#sh2)" />
            <text x="100" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">② Scripts</text>
            <text x="100" y="43" textAnchor="middle" fill="#fbbf24" fontSize="10">本地測試腳本</text>
            <line x1="20" y1="53" x2="180" y2="53" stroke="#2a2d3a" strokeWidth="1" />
            <text x="100" y="70" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">直接執行 local script</text>
            <text x="100" y="86" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">例如：run unit tests</text>
            <text x="100" y="102" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">快速驗證</text>
          </g>
          <path d="M400,132 C400,155 400,175 400,198" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrG2)" />
          <g transform="translate(520,200)">
            <rect width="200" height="120" rx="12" fill="url(#gradGrn2)" stroke="#22c55e" strokeWidth="2" filter="url(#sh2)" />
            <text x="100" y="25" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="700">③ Codegen</text>
            <text x="100" y="43" textAnchor="middle" fill="#4ade80" fontSize="10">Agent 寫 Code</text>
            <line x1="20" y1="53" x2="180" y2="53" stroke="#2a2d3a" strokeWidth="1" />
            <text x="100" y="70" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">Agent 自己生成代碼</text>
            <text x="100" y="86" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">可能用 sub-agent</text>
            <text x="100" y="102" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">保留 context</text>
          </g>
          <path d="M450,132 C500,160 560,180 590,198" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrG2)" />
          <g transform="translate(270,360)">
            <rect width="260" height="110" rx="14" fill="rgba(34,197,94,0.08)" stroke="#22c55e" strokeWidth="1.5" />
            <text x="130" y="25" textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="700">執行結果</text>
            <line x1="30" y1="35" x2="230" y2="35" stroke="#2a2d3a" strokeWidth="1" />
            <g transform="translate(20,45)">
              <circle cx="0" cy="6" r="4" fill="#22c55e" />
              <text x="12" y="11" fill="#c0c4cc" fontSize="10">工具調用完成 / 腳本執行完畢</text>
            </g>
            <g transform="translate(20,65)">
              <circle cx="0" cy="6" r="4" fill="#22c55e" />
              <text x="12" y="11" fill="#c0c4cc" fontSize="10">Agent 生成咗新代碼</text>
            </g>
            <g transform="translate(20,85)">
              <circle cx="0" cy="6" r="4" fill="#6366f1" />
              <text x="12" y="11" fill="#c0c4cc" fontSize="10">準備進入 Verify 階段 →</text>
            </g>
          </g>
          <path d="M180,322 C220,340 300,352 268,358" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
          <path d="M400,322 C400,335 400,345 400,358" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
          <path d="M620,322 C580,340 500,352 532,358" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
        </svg>
      </div>

      <h3>Execute 階段嘅三個執行方式</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>MCP（Model Context Protocol）</strong>——用 MCP 連接外部工具，例如 database query、API 調用、檔案系統操作。呢個係標準化嘅工具接口，好適合連接各種外部服務。OpenClaw 就係一個開源嘅 coding agent 實現，擁有 100+ AgentSkills，支援 shell、filesystem、web automation 等工具。</span></li>
        <li><span className="step-num">2</span><span><strong>Scripts（腳本）</strong>——直接執行本地嘅測試腳本。例如 run unit tests、linter、formatter 等。呢個方法快速、直接，適合本地開發環境。建議用嚟做快速驗證。</span></li>
        <li><span className="step-num">3</span><span><strong>Codegen（代碼生成）</strong>——Agent 自己寫 code，可能會用 sub-agent 嚟處理呢個任務，保留主 Agent 嘅 context window。呢個係最靈活嘅方法，適合複雜嘅代碼生成需求。</span></li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>MCP 嘅優勢</h4>
          <p>標準化接口，容易整合各種外部工具。一次設定，反覆使用。好適合需要連接多個外部服務嘅情況。</p>
        </div>
        <div className="key-point">
          <h4>Scripts 嘅優勢</h4>
          <p>快速、直接，唔使額外設定。適合本地測試同驗證。可以直接調用現有嘅開發工具，例如 pytest、eslint 等。</p>
        </div>
        <div className="key-point">
          <h4>Codegen 嘅優勢</h4>
          <p>最靈活，可以生成任何類型嘅代碼。用 sub-agent 處理可以保留主 Agent 嘅 context，避免污染。適合複雜任務。</p>
        </div>
      </div>

      <div className="highlight-box green">
        <h4>Execute 階段嘅核心</h4>
        <p>Execute 階段係實際執行任務嘅地方。三個方法各有優勢：MCP 適合外部工具、Scripts 適合本地快速驗證、Codegen 最靈活。建議視乎任務需求選擇合適嘅方式，甚至可以組合使用。</p>
      </div>
    </div>
  );
}

function VerifyTab() {
  return (
    <div className="card">
      <h2>Verify 階段 — 驗證成果</h2>
      <div className="subtitle">執行完之後，點樣驗證代碼係咪真係啱？</div>
      <p>
        執行完任務之後，就到 Verify 階段。呢個階段係驗證 Agent 寫出嚟嘅 code 係咪正確、有冇 bug、符唔符合要求。以下講解三個主要嘅驗證方法：Unit Tests（單元測試）、LLM-as-Judge（用 LLM 做評審）、Visual Testing（視覺測試）。如果驗證唔通過，就 loop 返去 Plan 階段再嚟過。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="sh3" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowVerify" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#f59e0b" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradAmb3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a2518" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradInd3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGrn3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrA3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arrG3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#22c55e" /></marker>
            <marker id="arrR3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#ef4444" /></marker>
          </defs>
          <text x="400" y="28" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="700">Verify 階段：驗證成果</text>
          <g transform="translate(310,50)">
            <rect width="180" height="60" rx="14" fill="url(#gradGrn3)" stroke="#22c55e" strokeWidth="2" filter="url(#sh3)" />
            <text x="90" y="25" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="700">執行完成</text>
            <text x="90" y="43" textAnchor="middle" fill="#9ca3af" fontSize="10">Agent 寫好咗 code</text>
          </g>
          <path d="M400,112 C400,125 400,135 400,148" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrA3)" />
          <g transform="translate(250,150)">
            <rect width="300" height="80" rx="14" fill="url(#gradAmb3)" stroke="#f59e0b" strokeWidth="2.5" filter="url(#glowVerify)" />
            <text x="150" y="28" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">Verify 階段</text>
            <text x="150" y="48" textAnchor="middle" fill="#9ca3af" fontSize="11">驗證 code 正確性</text>
            <text x="150" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">測試、評審、檢查輸出</text>
          </g>
          <g transform="translate(80,280)">
            <rect width="200" height="100" rx="12" fill="url(#gradInd3)" stroke="#6366f1" strokeWidth="2" filter="url(#sh3)" />
            <text x="100" y="22" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="700">① Unit Tests</text>
            <text x="100" y="40" textAnchor="middle" fill="#a5b4fc" fontSize="10">單元測試</text>
            <line x1="20" y1="50" x2="180" y2="50" stroke="#2a2d3a" strokeWidth="1" />
            <text x="100" y="67" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">跑測試，睇 pass / fail</text>
            <text x="100" y="83" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">最客觀嘅驗證方法</text>
          </g>
          <path d="M340,232 C280,250 230,260 210,278" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
          <g transform="translate(300,280)">
            <rect width="200" height="100" rx="12" fill="url(#gradAmb3)" stroke="#f59e0b" strokeWidth="2" filter="url(#sh3)" />
            <text x="100" y="22" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">② LLM-as-Judge</text>
            <text x="100" y="40" textAnchor="middle" fill="#fbbf24" fontSize="10">用 LLM 評審</text>
            <line x1="20" y1="50" x2="180" y2="50" stroke="#2a2d3a" strokeWidth="1" />
            <text x="100" y="67" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">處理灰色地帶</text>
            <text x="100" y="83" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">例如：code style、可讀性</text>
          </g>
          <path d="M400,232 C400,250 400,260 400,278" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
          <g transform="translate(520,280)">
            <rect width="200" height="100" rx="12" fill="url(#gradGrn3)" stroke="#22c55e" strokeWidth="2" filter="url(#sh3)" />
            <text x="100" y="22" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="700">③ Visual Testing</text>
            <text x="100" y="40" textAnchor="middle" fill="#4ade80" fontSize="10">視覺測試</text>
            <line x1="20" y1="50" x2="180" y2="50" stroke="#2a2d3a" strokeWidth="1" />
            <text x="100" y="67" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">用 Playwright 等工具</text>
            <text x="100" y="83" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">檢查 UI 輸出</text>
          </g>
          <path d="M460,232 C510,250 570,260 590,278" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
          <g transform="translate(300,420)">
            <rect width="200" height="70" rx="14" fill="rgba(245,158,11,0.1)" stroke="#f59e0b" strokeWidth="2" />
            <text x="100" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">驗證結果</text>
            <text x="100" y="45" textAnchor="middle" fill="#c0c4cc" fontSize="10">測試通過？</text>
            <text x="100" y="60" textAnchor="middle" fill="#c0c4cc" fontSize="9">符合要求？</text>
          </g>
          <g transform="translate(550,430)">
            <rect width="140" height="50" rx="10" fill="rgba(34,197,94,0.12)" stroke="#22c55e" strokeWidth="2" />
            <text x="70" y="22" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="700">通過！</text>
            <text x="70" y="38" textAnchor="middle" fill="#4ade80" fontSize="10">返俾用戶 →</text>
          </g>
          <path d="M502,455 C520,455 535,455 548,455" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrG3)" />
          <g transform="translate(110,430)">
            <rect width="140" height="50" rx="10" fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth="2" />
            <text x="70" y="22" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="700">唔 pass</text>
            <text x="70" y="38" textAnchor="middle" fill="#f87171" fontSize="10">Loop 返去 Plan</text>
          </g>
          <path d="M298,455 C280,455 265,455 252,455" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#arrR3)" />
        </svg>
      </div>

      <h3>Verify 階段嘅三個驗證方法</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>Unit Tests（單元測試）</strong>——跑測試，睇 pass 定 fail。呢個係最客觀、最可靠嘅驗證方法。建議一定要有 unit tests，唔好淨係靠人手檢查。</span></li>
        <li><span className="step-num amber">2</span><span><strong>LLM-as-Judge（用 LLM 評審）</strong>——有啲嘢唔係黑白分明，例如 code style、可讀性、註釋質量。呢啲灰色地帶可以用另一個 LLM 評審。呢個方法好適合處理主觀判斷。</span></li>
        <li><span className="step-num green">3</span><span><strong>Visual Testing（視覺測試）</strong>——用 Playwright 等工具，透過 MCP server 連接，檢查 UI 輸出係咪正確。呢個係驗證前端 code 嘅必備方法。</span></li>
      </ol>

      <div className="use-case">
        <h4>完整流程循環</h4>
        <p>
          如果 Verify 階段發現問題（測試 fail、LLM 評審唔通過、視覺輸出錯誤），就會 loop 返去 Plan 階段。Agent 會重新準備 context，可能會加入錯誤訊息作為新嘅背景資料，然後再執行、再驗證。呢個 loop 會不斷重複，直到驗證通過為止。常見情況係有啲系統會設上限，例如最多 loop 3 次，避免無限循環。
        </p>
      </div>

      <div className="key-points">
        <div className="key-point">
          <h4>Unit Tests 最可靠</h4>
          <p>有測試就跑測試，pass / fail 好清晰，冇灰色地帶。建議投資時間寫好 test suite，咁 Agent 先可以自動驗證。</p>
        </div>
        <div className="key-point">
          <h4>LLM-as-Judge 處理灰色地帶</h4>
          <p>有啲判斷好主觀，例如「code 易唔易讀」、「註釋寫得好唔好」。呢啲可以用 LLM 評審，但要記住：呢個唔係 100% 準確。</p>
        </div>
        <div className="key-point">
          <h4>Visual Testing 檢查 UI</h4>
          <p>前端 code 一定要有視覺測試。用 Playwright 等工具，透過 MCP 連接，自動檢查 UI 輸出。呢個係驗證前端必備。</p>
        </div>
      </div>

      <div className="highlight-box amber">
        <h4>Verify 階段嘅取捨</h4>
        <p>驗證越嚴格，Agent 產出嘅質量就越高，但同時會慢好多（因為要 loop 多次）。建議根據項目性質調整：對於關鍵系統，嚴格驗證；對於快速 prototype，寬鬆啲都可以接受。</p>
      </div>

      <div className="highlight-box">
        <h4>完整 Loop 總結</h4>
        <p>Plan（準備 context）→ Execute（實際執行）→ Verify（驗證成果）。如果驗證 pass，返俾用戶；如果唔 pass，loop 返去 Plan 階段再嚟過。呢個就係 Coding Agent 嘅核心設計。三個階段缺一不可，組合埋就係一個完整嘅 AI 寫 code 系統。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber 提示模板</h2>
      <div className="subtitle">複製以下 Prompt 直接問 ChatGPT / Claude</div>
      <div className="prompt-card">
        <h4>Prompt 1 — 設計 AI Coding Agent 架構</h4>
        <div className="prompt-text">
          {'幫我設計一個 AI coding agent 嘅完整架構，基於 Plan → Execute → Verify loop。\n\n用途：[例如：自動修 bug / 自動寫 unit test / 自動做 code review / 自動生成 API endpoint]\n技術棧：[例如：Python + OpenAI API / TypeScript + Anthropic Claude API]\n\n要求：\n- Plan 階段：設計 context 收集策略（Shell Search + Semantic Search）\n- Execute 階段：定義 Agent 可以用嘅 tools（file read/write、shell command、API call）\n- Verify 階段：設計驗證機制（run tests、LLM-as-Judge）\n- 實作 loop 控制（最多重試 3 次，避免無限循環）\n- 設計 system prompt，令 Agent 知道自己嘅角色同限制\n- 加入 token 使用量追蹤同 cost estimation\n- 寫出完整嘅 code skeleton，包括主要嘅 class 同 function'}
        </div>
      </div>
      <div className="prompt-card">
        <h4>Prompt 2 — 實作 Tool-Using AI Agent</h4>
        <div className="prompt-text">
          {'幫我用 [OpenAI Function Calling / Anthropic Tool Use / LangChain] 實作一個 tool-using AI agent。\n\nAgent 需要以下工具：\n- 讀取檔案內容（read_file）\n- 寫入 / 修改檔案（write_file）\n- 執行 shell 指令（run_command）\n- 搜尋 codebase（search_code）\n- [其他自訂工具，例如：query database / call API / send notification]\n\n要求：\n- 定義每個 tool 嘅 JSON schema（name、description、parameters）\n- 實作 tool execution layer（接收 LLM 嘅 tool call，執行對應操作，返回結果）\n- 加入安全限制（例如：唔可以刪除 production 檔案、shell 指令白名單）\n- 實作 conversation loop（LLM 可以連續調用多個 tools）\n- 加入 error handling（tool 執行失敗嘅時候，將 error 返俾 LLM 處理）\n- 寫出完整嘅可運行 code'}
        </div>
      </div>
      <div className="prompt-card">
        <h4>Prompt 3 — Sub-Agent 架構設計</h4>
        <div className="prompt-text">
          {'幫我設計一個 multi-agent 系統，有一個 main agent 協調多個 sub-agents。\n\n場景：[例如：全端開發團隊 — 有 frontend agent、backend agent、testing agent / Code review 系統 — 有 security agent、performance agent、style agent / 開源 AI Agent — 用 OpenClaw + DeepSeek 做 self-hosted coding agent]\n\n要求：\n- Main Agent：負責理解需求、拆分任務、分配俾 sub-agents\n- Sub-Agent 設計：每個 sub-agent 有獨立嘅 system prompt 同 tools\n- 通訊機制：定義 agents 之間嘅 message format\n- Context 管理：每個 sub-agent 有自己嘅 context window，唔會互相污染\n- 結果合併：Main Agent 收集所有 sub-agent 嘅輸出，整合成最終結果\n- 用 [Python / TypeScript] 寫出完整嘅 framework code'}
        </div>
      </div>
    </div>
  );
}

export default function CodingAgentDesign() {
  return (
    <>
      <TopicTabs
        title="Coding Agent 設計"
        subtitle="拆解 AI 寫 code 嘅核心流程——Plan、Execute、Verify 無限循環"
        tabs={[
          { id: 'plan', label: '① Plan 階段', content: <PlanTab /> },
          { id: 'execute', label: '② Execute 階段', content: <ExecuteTab /> },
          { id: 'verify', label: '③ Verify 階段', premium: true, content: <VerifyTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
        
          { id: 'quiz', label: '小測', content: <QuizRenderer data={quizData} /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
