import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';
import QuizRenderer from '../components/QuizRenderer';

const quizData = [
  {
    question: 'SDD 嘅第一步係做咩？',
    options: [
      { text: '直接叫 AI 寫 code', correct: false, explanation: '冇 Spec 就叫 AI 寫 code，AI 會自己假設需求，結果往往偏離你嘅期望。' },
      { text: '寫清楚 Spec（需求、限制、驗收標準）', correct: true, explanation: 'SDD 嘅核心就係「先寫 Spec 再實作」，Spec 包括 Requirements、Constraints、Tradeoffs、Acceptance Criteria。' },
      { text: '先寫 unit test', correct: false, explanation: 'TDD 先寫 test，但 SDD 係先寫 Spec。Spec 比 test 更高層次，涵蓋需求同限制。' },
      { text: '搵 reference project 抄', correct: false, explanation: 'Reference 可以幫助寫 Spec，但唔係 SDD 嘅第一步。' },
    ],
  },
  {
    question: 'Spec 入面嘅 Acceptance Criteria 有咩作用？',
    options: [
      { text: '俾老闆睇嘅文件', correct: false, explanation: 'Acceptance Criteria 唔係行政文件，而係技術上判斷 pass/fail 嘅依據。' },
      { text: '可量化嘅驗收條件，用嚟判斷 AI 輸出 pass 定 fail', correct: true, explanation: '例如「所有 unit test 通過」「P95 延遲 < 5 秒」，呢啲具體條件令你可以客觀評估 AI 嘅 output。' },
      { text: '描述用戶故事嘅地方', correct: false, explanation: '用戶故事屬於 Functional Requirements，唔係 Acceptance Criteria。' },
      { text: '記錄技術棧嘅限制', correct: false, explanation: '技術棧限制屬於 Constraints 部分。' },
    ],
  },
  {
    question: 'Review 階段發現 AI 輸出未通過驗收，SDD 建議點做？',
    options: [
      { text: '直接改 AI 生成嘅 code', correct: false, explanation: 'SDD 唔鼓勵直接改 code，因為根本問題可能係 Spec 唔夠清楚。' },
      { text: '換一個更強嘅 AI 模型重試', correct: false, explanation: '模型唔係問題所在，Spec 先係。換模型唔會解決 Spec 不足嘅問題。' },
      { text: '回去修正 Spec，再重新俾 AI 實作', correct: true, explanation: 'SDD 嘅 feedback loop 係修正 Spec 而唔係直接改 code。Spec 改好後 AI 自然會生成更準確嘅結果。' },
      { text: '放棄呢個功能', correct: false, explanation: '未通過驗收唔代表要放棄，只係需要改善 Spec。' },
    ],
  },
  {
    question: '點解 SDD 要明確寫 Tradeoffs？',
    options: [
      { text: '因為老闆要求', correct: false, explanation: 'Tradeoffs 唔係行政要求，而係技術設計嘅核心部分。' },
      { text: '因為 AI 需要知道你嘅優先級先可以做出啱嘅設計決策', correct: true, explanation: '例如「優先 latency 而唔係 throughput」，AI 就知道要揀 low-latency 方案而唔係 high-throughput 方案。冇 tradeoff 嘅話 AI 會自己猜。' },
      { text: '因為面試需要講', correct: false, explanation: '面試的確會問 tradeoff，但 SDD 入面寫 tradeoff 嘅目的係俾 AI 清晰嘅設計方向。' },
      { text: '因為要對比唔同方案', correct: false, explanation: '對比方案係 evaluation 嘅步驟，Tradeoffs 係 Spec 入面明確你嘅優先級。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'skill-vs-agent', label: 'Skill vs Agent' },
  { slug: 'context-rot-solution', label: 'Context Rot 解法' },
  { slug: 'ai-evaluation-loop', label: 'AI 評估迴圈' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>SDD 係咩</h2>
      <div className="subtitle">Spec-Driven Development：寫清楚先做</div>
      <p>
        SDD 嘅核心理念好簡單：<strong style={{ color: '#34d399' }}>先寫規格（Spec），再叫 AI 實作</strong>。唔係直接同 AI 講「幫我寫個 notification service」，而係先花時間寫清楚你要咩——需求、限制、tradeoff、驗收標準——然後先俾 AI 去 implement。
      </p>
      <p>點解要咁做？因為 AI 最大嘅問題唔係寫唔到 code，而係<strong style={{ color: '#f87171' }}>唔知道你要咩</strong>。冇 spec 嘅情況下，AI 會自己假設需求，然後 hallucinate 出一堆你冇要求嘅功能，或者忽略你真正在意嘅限制。SDD 將呢個問題喺源頭解決。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradSpec" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2e1a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAI" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradCode" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradReview" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrBlue2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
          </defs>

          <g transform="translate(30,90)">
            <rect width="130" height="90" rx="14" fill="url(#gradSpec)" stroke="#6366f1" strokeWidth="2.5" filter="url(#glowPurple)" />
            <text x="65" y="30" textAnchor="middle" fill="#6366f1" fontSize="12" fontWeight="700">Step 1</text>
            <text x="65" y="50" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">寫 Spec</text>
            <text x="65" y="70" textAnchor="middle" fill="#9ca3af" fontSize="9">需求 + 限制</text>
            <text x="65" y="82" textAnchor="middle" fill="#9ca3af" fontSize="9">+ 驗收標準</text>
          </g>

          <g transform="translate(210,90)">
            <rect width="130" height="90" rx="14" fill="url(#gradAI)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="30" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Step 2</text>
            <text x="65" y="50" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">AI 實作</text>
            <text x="65" y="70" textAnchor="middle" fill="#9ca3af" fontSize="9">根據 Spec</text>
            <text x="65" y="82" textAnchor="middle" fill="#9ca3af" fontSize="9">生成代碼</text>
          </g>

          <g transform="translate(390,90)">
            <rect width="130" height="90" rx="14" fill="url(#gradCode)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="30" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Step 3</text>
            <text x="65" y="50" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Review</text>
            <text x="65" y="70" textAnchor="middle" fill="#9ca3af" fontSize="9">對照 Spec</text>
            <text x="65" y="82" textAnchor="middle" fill="#9ca3af" fontSize="9">驗收代碼</text>
          </g>

          <g transform="translate(560,90)">
            <rect width="110" height="90" rx="14" fill="url(#gradReview)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="30" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Step 4</text>
            <text x="55" y="50" textAnchor="middle" fill="#60a5fa" fontSize="13" fontWeight="700">Ship</text>
            <text x="55" y="70" textAnchor="middle" fill="#9ca3af" fontSize="9">通過驗收</text>
            <text x="55" y="82" textAnchor="middle" fill="#9ca3af" fontSize="9">上線部署</text>
          </g>

          <path d="M162,135 L208,135" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrPurple)" />
          <path d="M342,135 L388,135" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen2)" />
          <path d="M522,135 L558,135" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrBlue2)" />

          <path d="M455,182 C455,230 275,240 275,182" fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrPurple)" />
          <text x="365" y="245" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">未通過 → 修正 Spec 再試</text>

          <text x="350" y="55" textAnchor="middle" fill="#9ca3af" fontSize="12" fontWeight="600">SDD 開發流程</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>先寫 Spec</strong>：花 30 分鐘寫清楚需求。呢個係最重要嘅步驟——Spec 寫得好，AI 實作嘅成功率會大幅提高。Spec 包括：功能需求、非功能需求、限制條件、驗收標準。</span></li>
        <li><span className="step-num">2</span><span><strong>俾 AI 實作</strong>：將 Spec 餵俾 AI，叫佢根據 Spec 生成代碼。因為 Spec 夠清晰，AI 唔會亂加功能或者偏離方向。</span></li>
        <li><span className="step-num">3</span><span><strong>對照 Spec Review</strong>：用 Spec 入面嘅驗收標準逐條檢查。通過就 ship，唔通過就回去修正——但係修正嘅係 Spec，唔係直接改 code。</span></li>
      </ol>
    </div>
  );
}

function TemplateTab() {
  return (
    <div className="card">
      <h2>Spec 模板</h2>
      <div className="subtitle">一個即用嘅 Spec 結構，覆蓋所有重要面向</div>
      <p>好嘅 Spec 唔需要好長，但要覆蓋四個核心部分：需求、限制、Tradeoffs、驗收標準。以下係一個 template，可以直接用。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>1. Requirements 需求</h4>
          <p><strong>Functional</strong>：系統要做到咩（用戶故事）。例如：「用戶可以訂閱通知」「系統每分鐘最多發 1000 條通知」。<br /><strong>Non-Functional</strong>：性能、可用性、安全性要求。例如：「P99 latency &lt; 200ms」「99.9% uptime」。</p>
        </div>
        <div className="key-point">
          <h4>2. Constraints 限制</h4>
          <p>明確列出唔可以做嘅嘢同必須遵守嘅條件。例如：「只能用 PostgreSQL」「唔可以引入新嘅 dependency」「要兼容現有 API v2」。呢啲限制可以防止 AI hallucinate 出唔適合嘅方案。</p>
        </div>
        <div className="key-point">
          <h4>3. Tradeoffs 取捨</h4>
          <p>明確講你願意犧牲咩嚟換取咩。例如：「優先考慮 latency 而唔係 throughput」「可以接受 eventual consistency」。AI 需要知道你嘅優先級先可以做出啱嘅決策。</p>
        </div>
        <div className="key-point">
          <h4>4. Acceptance Criteria 驗收標準</h4>
          <p>可以量化嘅、具體嘅驗收條件。例如：「所有 unit test 通過」「load test 通過 1000 RPS」「API response 格式符合 OpenAPI spec」。呢啲係你判斷 AI 輸出 pass 定 fail 嘅依據。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>Spec 範例片段</h4>
        <p><strong>功能</strong>：Notification Service<br /><strong>需求</strong>：支援 email + push notification，用戶可以設定通知偏好<br /><strong>限制</strong>：用 Node.js + TypeScript，部署到 AWS Lambda<br /><strong>Tradeoff</strong>：優先可靠性（每條通知必送達），可接受最多 30 秒延遲<br /><strong>驗收</strong>：100% 送達率測試通過，P95 延遲 &lt; 5 秒</p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰案例：從零寫一個 Notification Service Spec</h2>
      <div className="subtitle">完整示範 SDD 流程</div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>定義背景</strong>：我哋嘅 e-commerce 平台需要一個通知服務。用戶要喺訂單狀態改變時收到通知。目前有 50K DAU，預計半年後到 200K。</span></li>
        <li><span className="step-num">2</span><span><strong>列出 Functional Requirements</strong>：支援 Email、Push、SMS 三種渠道。用戶可以設定每種渠道嘅開關。支援模板化通知（order_confirmed、order_shipped 等）。支援批量發送（例如促銷通知）。</span></li>
        <li><span className="step-num">3</span><span><strong>列出 Non-Functional Requirements</strong>：P99 延遲 &lt; 10 秒。送達率 &gt; 99.5%。支援每秒 500 條通知。水平擴展能力——峰值時自動 scale。</span></li>
        <li><span className="step-num">4</span><span><strong>定義 Constraints</strong>：技術棧：Node.js + TypeScript。Message Queue 用 SQS。資料庫用 DynamoDB。部署到 AWS。預算：每月 &lt; $200 infra 成本。</span></li>
        <li><span className="step-num">5</span><span><strong>明確 Tradeoffs</strong>：送達率 &gt; 延遲（寧願慢啲但一定要送到）。簡單性 &gt; 靈活性（MVP 先做核心功能）。成本 &gt; 性能（喺預算內盡量優化）。</span></li>
        <li><span className="step-num">6</span><span><strong>寫 Acceptance Criteria</strong>：所有 unit test 通過（coverage &gt; 80%）。Integration test 驗證三種渠道送達。Load test 通過 500 RPS 持續 5 分鐘。Failure recovery test——queue consumer 重啟後唔會漏訊息。</span></li>
      </ol>

      <div className="use-case">
        <h4>將 Spec 餵俾 AI 之後</h4>
        <p>有咗呢個 Spec，AI 就會根據你嘅限制去選技術方案（唔會自己揀 Kafka 因為你已經指定 SQS），根據你嘅 tradeoff 做設計決策（retry 而唔係丟棄），根據你嘅驗收標準寫測試。成功率同之前隨便講需求比，差天共地。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻開始寫 Spec</div>

      <div className="prompt-card">
        <h4>Prompt 1 — SDD Spec 生成器</h4>
        <div className="prompt-text">
          {'幫我用 SDD（Spec-Driven Development）方法寫一個完整嘅技術 Spec。\n\n'}
          {'項目名稱：'}<span className="placeholder">[項目名]</span>{'\n'}
          {'簡短描述：'}<span className="placeholder">[一句話描述要 build 咩]</span>{'\n'}
          {'技術棧：'}<span className="placeholder">[列出技術棧限制]</span>{'\n'}
          {'目標用戶量：'}<span className="placeholder">[DAU / MAU]</span>{'\n\n'}
          {'請用以下結構輸出：\n\n'}
          {'## 1. Functional Requirements\n'}
          {'- FR-1: ...\n'}
          {'- FR-2: ...\n\n'}
          {'## 2. Non-Functional Requirements\n'}
          {'- NFR-1: Performance: ...\n'}
          {'- NFR-2: Availability: ...\n'}
          {'- NFR-3: Security: ...\n\n'}
          {'## 3. Constraints\n'}
          {'- C-1: ...\n'}
          {'- C-2: ...\n\n'}
          {'## 4. Tradeoffs（用 A > B 格式）\n'}
          {'- ...\n\n'}
          {'## 5. Acceptance Criteria\n'}
          {'- AC-1: ...\n'}
          {'- AC-2: ...\n\n'}
          {'## 6. Out of Scope（明確唔做嘅嘢）\n'}
          {'- ...\n\n'}
          {'每個 requirement 要具體、可量化、可測試。唔好寫模糊嘅描述。'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Spec Review Checklist</h4>
        <div className="prompt-text">
          {'請 review 以下 Spec，用呢個 checklist 逐項檢查：\n\n'}
          {'Spec 內容：\n'}<span className="placeholder">[貼入你嘅 Spec]</span>{'\n\n'}
          {'Review Checklist：\n'}
          {'1. 每個 requirement 係咪具體可量化？（唔好出現「快」「好多」呢啲模糊詞）\n'}
          {'2. Constraints 有冇遺漏？（技術棧、預算、時間、兼容性）\n'}
          {'3. Tradeoffs 有冇明確列出？AI 知唔知道優先級？\n'}
          {'4. Acceptance Criteria 可唔可以寫成自動化測試？\n'}
          {'5. 有冇 Out of Scope？（防止 AI 加嘢）\n'}
          {'6. 有冇矛盾嘅 requirements？\n'}
          {'7. 預估嘅工作量合唔合理？\n\n'}
          {'對每個問題俾出「通過 / 需修改」嘅評估，同埋具體建議。'}
        </div>
      </div>
    </div>
  );
}

export default function SDDSpecDrivenDevelopment() {
  return (
    <>
      <TopicTabs
        title="SDD 規格驅動開發"
        subtitle="先寫 Spec，再叫 AI 實作——最可控嘅 AI 開發方法論"
        tabs={[
          { id: 'overview', label: '① SDD 概念', content: <OverviewTab /> },
          { id: 'template', label: '② Spec 模板', content: <TemplateTab /> },
          { id: 'practice', label: '③ 實戰案例', premium: true, content: <PracticeTab /> },
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
