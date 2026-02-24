import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '測試金字塔（Testing Pyramid）建議邊種 Test 應該最多？',
    options: [
      { text: 'E2E Test 最多，因為佢最接近用戶體驗', correct: false, explanation: 'E2E Test 雖然最接近用戶體驗，但佢慢、fragile、維護成本高。應該係最少嘅。' },
      { text: 'Unit Test 最多——快、穩定、成本低，佔金字塔最底層', correct: true, explanation: '啱！Unit Test 係金字塔嘅底層，應該最多。佢快（毫秒級）、穩定（唔依賴外部）、成本低（容易寫同維護）。通常 Unit : Integration : E2E 嘅比例係 70% : 20% : 10%。' },
      { text: 'Integration Test 最多，因為佢測到最多嘢', correct: false, explanation: 'Integration Test 介於中間。佢比 Unit Test 慢但比 E2E 快。應該係中等數量，唔係最多。' },
      { text: '三種應該一樣多', correct: false, explanation: '如果三種一樣多，代表有太多慢嘅 E2E Test 同太少快嘅 Unit Test。會拖慢 CI/CD Pipeline。' },
    ],
  },
  {
    question: 'Mock 同 Stub 嘅分別係咩？',
    options: [
      { text: '完全一樣，只係名稱唔同', correct: false, explanation: 'Mock 同 Stub 嘅用途唔同。混淆呢兩個會影響 Test 嘅質量。' },
      { text: 'Stub 提供預設嘅返回值；Mock 除咗返回值，仲可以驗證佢被呼叫嘅次數同參數', correct: true, explanation: '啱！Stub 係「你問我就答」——你設定「如果 call getUser(1)，返回 { name: "Alice" }」。Mock 除咗返回值，仲會記錄自己被 call 咗幾多次、用咩參數，然後你可以 assert「getUser 被 call 咗 1 次，參數係 1」。Mock 做 behavior verification，Stub 做 state verification。' },
      { text: 'Mock 只能用喺 Unit Test，Stub 只能用喺 Integration Test', correct: false, explanation: '兩者都可以用喺任何類型嘅 Test。用邊個取決於你要驗證嘅係 state 定 behavior。' },
      { text: 'Stub 係真實嘅服務，Mock 係假嘅', correct: false, explanation: 'Stub 同 Mock 都係假嘅（Test Double）。真實嘅服務唔叫 Stub。' },
    ],
  },
  {
    question: '以下邊個做法會導致 Flaky Test（時而成功時而失敗嘅測試）？',
    options: [
      { text: '用 Mock 隔離外部依賴', correct: false, explanation: 'Mock 隔離外部依賴反而係避免 Flaky Test 嘅好方法。因為唔依賴真實嘅外部服務，唔會因為服務掛咗而失敗。' },
      { text: 'Test 依賴固定嘅時間（例如 setTimeout）、共享嘅全局狀態、或者外部服務嘅可用性', correct: true, explanation: '啱！呢三個係 Flaky Test 嘅最常見原因。1）依賴時間：setTimeout 可能因為 CI 環境慢而 timeout。2）共享狀態：Test A 改咗 DB，Test B 依賴呢個 DB 但 Test A 未完成。3）外部服務：Third-party API 偶爾掛。解法：用 event-based 代替 timer、每個 Test 獨立 setup/teardown、Mock 外部服務。' },
      { text: '寫太多 Unit Test', correct: false, explanation: 'Unit Test 係最穩定嘅 Test，寫多唔會導致 Flaky。Unit Test 唔依賴外部，幾乎唔會 flake。' },
      { text: '用 TypeScript 寫 Test', correct: false, explanation: '語言選擇同 Flaky Test 無關。用任何語言都可能寫出 Flaky Test。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'cicd-pipeline', label: 'CI/CD Pipeline' },
  { slug: 'docker', label: 'Docker 容器化' },
  { slug: 'dependency-injection', label: 'Dependency Injection' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>測試策略係咩？</h2>
      <div className="subtitle">Testing Pyramid：Unit / Integration / E2E</div>
      <p>
        好嘅測試策略唔係「寫越多 Test 越好」，而係<strong style={{ color: '#3B82F6' }}>寫啱類型嘅 Test、喺啱嘅層面</strong>。
        <strong style={{ color: '#34d399' }}> Testing Pyramid</strong> 就係最經典嘅指引：
        底層（Unit）最多、中層（Integration）適量、頂層（E2E）最少。
        因為越底層嘅 Test 越<strong style={{ color: '#fbbf24' }}>快</strong>同<strong style={{ color: '#fbbf24' }}>穩定</strong>，
        越頂層嘅越<strong style={{ color: '#f87171' }}>慢</strong>同<strong style={{ color: '#f87171' }}>fragile</strong>。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowGreen"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradUnit" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradInteg" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradE2E" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
          </defs>

          {/* Pyramid - E2E (top, small) */}
          <g>
            <polygon points="360,30 290,120 430,120" fill="url(#gradE2E)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="360" y="70" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">E2E</text>
            <text x="360" y="90" textAnchor="middle" fill="#fca5a5" fontSize="9">~10%</text>
            <text x="360" y="110" textAnchor="middle" fill="#9ca3af" fontSize="8">慢 · 唔穩定</text>
          </g>

          {/* Pyramid - Integration (middle) */}
          <g>
            <polygon points="290,125 200,230 520,230 430,125" fill="url(#gradInteg)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="360" y="165" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">Integration</text>
            <text x="360" y="185" textAnchor="middle" fill="#93c5fd" fontSize="10">~20%</text>
            <text x="360" y="205" textAnchor="middle" fill="#9ca3af" fontSize="9">中速 · 測真實互動</text>
          </g>

          {/* Pyramid - Unit (base, widest) */}
          <g filter="url(#glowGreen)">
            <polygon points="200,235 100,320 620,320 520,235" fill="url(#gradUnit)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="360" y="268" textAnchor="middle" fill="#34d399" fontSize="16" fontWeight="700">Unit Tests</text>
            <text x="360" y="290" textAnchor="middle" fill="#6ee7b7" fontSize="11">~70%</text>
            <text x="360" y="310" textAnchor="middle" fill="#9ca3af" fontSize="9">超快 · 超穩定 · 成本低</text>
          </g>

          {/* Speed indicator */}
          <g transform="translate(30,50)">
            <text x="0" y="0" fill="#f87171" fontSize="10">速度：慢</text>
            <text x="0" y="140" fill="#3B82F6" fontSize="10">速度：中</text>
            <text x="0" y="250" fill="#34d399" fontSize="10">速度：快</text>
            <line x1="50" y1="10" x2="50" y2="260" stroke="#475569" strokeWidth="1" />
            <polygon points="50,5 45,15 55,15" fill="#f87171" />
            <polygon points="50,265 45,255 55,255" fill="#34d399" />
          </g>

          {/* Count */}
          <g transform="translate(640,50)">
            <text x="0" y="0" fill="#f87171" fontSize="10">數量：少</text>
            <text x="0" y="140" fill="#3B82F6" fontSize="10">數量：中</text>
            <text x="0" y="250" fill="#34d399" fontSize="10">數量：多</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>三層 Test 點分</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#34d399' }}>Unit Test</strong>：測單一 function / class，用 Mock 隔離外部依賴。毫秒級完成，一跑就有幾百個。確保每個小組件嘅邏輯正確。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#3B82F6' }}>Integration Test</strong>：測多個組件嘅真實互動——例如 API → Service → Database。通常需要真實嘅 DB（Docker container）。秒級完成，確保組件之間配合正確。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#f87171' }}>E2E Test</strong>：模擬用戶操作（打開瀏覽器、填表單、Click 按鈕）。用 Cypress / Playwright。最慢（分鐘級），最容易 Flake。只測最關鍵嘅 User Journey。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階測試概念</h2>
      <div className="subtitle">Mocking 策略、Contract Testing、Property-based Testing</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Test Doubles 分類</h4>
          <p><strong style={{ color: '#3B82F6' }}>Stub</strong>：提供預設返回值。<strong style={{ color: '#34d399' }}>Mock</strong>：記錄呼叫行為並可驗證。<strong style={{ color: '#fbbf24' }}>Spy</strong>：包裹真實 object，記錄呼叫但仍執行真實邏輯。<strong style={{ color: '#8B5CF6' }}>Fake</strong>：簡化版嘅真實實現（例如 in-memory DB 代替真 DB）。知道呢四種嘅分別，揀啱嘅用喺啱嘅場景。</p>
        </div>
        <div className="key-point">
          <h4>Contract Testing</h4>
          <p>微服務之間嘅 API 用 <strong style={{ color: '#34d399' }}>Contract Test</strong> 保證兼容。Consumer 寫一份 Contract（「我期望你嘅 API 返回呢啲 field」），Provider 用呢份 Contract 驗證自己嘅 API。工具：<strong style={{ color: '#3B82F6' }}>Pact</strong>。好處係 Provider 改 API 嘅時候，如果 break 咗 Consumer 嘅 Contract，CI 就會失敗。</p>
        </div>
        <div className="key-point">
          <h4>Property-based Testing</h4>
          <p>唔係寫具體嘅 test case，而係描述「性質」，由框架自動產生大量隨機 input 嚟測試。例如「sort 函數嘅 output 長度 = input 長度」。工具：<strong style={{ color: '#fbbf24' }}>fast-check</strong>（JS）、<strong style={{ color: '#fbbf24' }}>Hypothesis</strong>（Python）。可以搵到你諗唔到嘅 edge case。</p>
        </div>
        <div className="key-point">
          <h4>Snapshot Testing</h4>
          <p>將 component 嘅 render output 存成 snapshot，下次 run test 時比較有冇變化。適合 UI component。好處係唔使手動 assert 每個 element。壞處係 snapshot 大咗之後好難 review，而且容易 auto-approve 唔 check。建議只用喺穩定嘅 component。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰同 CI 整合</h2>
      <div className="subtitle">TDD、Coverage、Flaky Test 處理</div>
      <div className="key-points">
        <div className="key-point">
          <h4>TDD Workflow</h4>
          <p><strong style={{ color: '#f87171' }}>Red</strong> → <strong style={{ color: '#34d399' }}>Green</strong> → <strong style={{ color: '#3B82F6' }}>Refactor</strong>。1）先寫一個失敗嘅 test（Red）。2）寫最少嘅 code 令 test 通過（Green）。3）重構 code 同時保持 test 通過（Refactor）。TDD 令你先思考 API 設計同 edge case，再寫實現。唔係所有嘢都適合 TDD，但核心邏輯好適合。</p>
        </div>
        <div className="key-point">
          <h4>Coverage 目標</h4>
          <p>合理嘅 Coverage 目標：<strong style={{ color: '#34d399' }}>80% Line Coverage</strong>（唔好追求 100%）。100% coverage 唔代表冇 bug，追求 100% 會寫好多冇意義嘅 test。重點係 <strong style={{ color: '#fbbf24' }}>Critical Path Coverage</strong>——支付邏輯、權限檢查、數據驗證呢啲一定要 100%，工具函數 80% 就夠。</p>
        </div>
        <div className="key-point">
          <h4>CI 整合</h4>
          <p>CI Pipeline：1）<strong style={{ color: '#34d399' }}>Lint</strong>（秒級）。2）<strong style={{ color: '#3B82F6' }}>Unit Test</strong>（秒級）。3）<strong style={{ color: '#fbbf24' }}>Integration Test</strong>（分鐘級，用 Docker）。4）<strong style={{ color: '#f87171' }}>E2E Test</strong>（分鐘級，可以放 nightly build）。Unit Test 同 Lint 放喺 pre-commit hook 或 PR check 入面，確保每次 push 都通過。</p>
        </div>
        <div className="key-point">
          <h4>Flaky Test 處理</h4>
          <p>Flaky Test 係 CI 嘅最大敵人。處理方法：1）<strong style={{ color: '#f87171' }}>隔離</strong>——將 flaky test 標記為 quarantine，唔影響 CI。2）<strong style={{ color: '#f87171' }}>修復</strong>——搵出 flaky 嘅原因（time-dependent? shared state? external service?）。3）<strong style={{ color: '#f87171' }}>預防</strong>——用 Mock 隔離外部、每個 test 獨立 setup/teardown、避免 sleep/setTimeout。</p>
        </div>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻開始 Build</div>

      <div className="prompt-card">
        <h4>Prompt 1 — 設計完整嘅測試策略</h4>
        <div className="prompt-text">
          {'幫我設計一個 '}
          <span className="placeholder">[Node.js Express / React / Go]</span>
          {' 項目嘅完整測試策略。\n\n項目類型：'}
          <span className="placeholder">[REST API / Web App / Microservices]</span>
          {'\n\n要求：\n- Testing Pyramid 比例：Unit 70% / Integration 20% / E2E 10%\n- Unit Test：用 '}
          <span className="placeholder">[Jest / Vitest / Go testing]</span>
          {' + Mock / Stub\n- Integration Test：用 Docker（Testcontainers）啟動真實 DB\n- E2E Test：用 '}
          <span className="placeholder">[Cypress / Playwright]</span>
          {'\n- Contract Test：用 Pact 做 Provider / Consumer 驗證\n- CI Pipeline 配置（GitHub Actions / GitLab CI）\n- Coverage 報告 + 最低覆蓋率門檻（80%）\n- Flaky Test Detection + Quarantine 機制\n- 提供每種 Test 嘅 5 個 Sample Test Case'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — TDD 實戰練習</h4>
        <div className="prompt-text">
          {'用 TDD（Red-Green-Refactor）方法開發一個 '}
          <span className="placeholder">[購物車 / 用戶認證 / 訂單管理]</span>
          {' 模組。\n\n語言：'}
          <span className="placeholder">[TypeScript / Python / Go]</span>
          {'\n\n要求：\n- 每個功能先寫失敗嘅 Test（Red），再寫最少嘅實現（Green），最後重構（Refactor）\n- 展示完整嘅 TDD 步驟（每一步嘅 Test + Code 變化）\n- 包含 Edge Case 測試（empty input、invalid data、boundary values）\n- Mock 外部依賴（Database、Payment API）\n- Property-based Test 搵 Edge Case\n- Coverage 報告 >= 90%\n- 用 '}
          <span className="placeholder">[Jest / pytest / Go testing]</span>
          {' 框架'}
        </div>
      </div>
    </div>
  );
}

export default function TestingStrategy() {
  return (
    <>
      <TopicTabs
        title="測試策略"
        subtitle="Testing Pyramid——寫啱類型嘅 Test，喺啱嘅層面"
        tabs={[
          { id: 'overview', label: '① 測試金字塔', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階概念', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰整合', premium: true, content: <PracticeTab /> },
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
