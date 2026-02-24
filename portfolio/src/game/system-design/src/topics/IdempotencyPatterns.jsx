import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '以下邊個 HTTP method 天生就係冪等嘅？',
    options: [
      { text: 'POST — 建立新資源', correct: false, explanation: 'POST 唔係冪等嘅！每次 POST 都可能建立一個新嘅資源。例如 POST /orders 發兩次就建立兩張訂單。所以 POST 需要額外嘅冪等性保護。' },
      { text: 'GET、PUT、DELETE — 讀取、完整替換、刪除', correct: true, explanation: '啱！GET 只係讀取，唔改數據。PUT 係完整替換資源，發幾多次結果都一樣。DELETE 刪除一個已經刪除嘅資源唔會有副作用。呢三個天生冪等。POST 同 PATCH 唔係天生冪等，需要額外處理。' },
      { text: '只有 GET 係冪等嘅，其他全部唔係', correct: false, explanation: 'GET 確實係冪等，但唔止 GET。PUT 同 DELETE 都係冪等嘅。PUT 完整替換資源（發多次結果一樣），DELETE 刪除一個已刪除嘅資源冇副作用。' },
      { text: '所有 HTTP method 都係冪等嘅', correct: false, explanation: 'POST 同 PATCH 唔係天生冪等嘅。POST 每次可能建立新資源，PATCH 每次可能做增量更新（例如 +1）。' },
    ],
  },
  {
    question: 'Idempotency Key 應該由邊一方產生？',
    options: [
      { text: 'Server 產生，返回俾 Client', correct: false, explanation: '如果由 Server 產生，Client 需要先發一個請求攞 Key，再發實際請求。多咗一步，而且如果攞 Key 嘅請求成功但實際請求失敗，Key 就浪費咗。' },
      { text: 'Client 產生（UUID / 業務 ID），喺 Request Header 或 Body 帶俾 Server', correct: true, explanation: '啱！Client 產生 Idempotency Key（通常用 UUID v4），放喺 Header（例如 Idempotency-Key: abc-123）。Server 用呢個 Key 做唯一標識，如果收到重複嘅 Key，直接返回之前嘅結果。Stripe 就係咁設計嘅。' },
      { text: '由 Load Balancer 自動產生', correct: false, explanation: 'Load Balancer 唔管冪等性。冪等性係應用層嘅 concern，應該由 Client 同 Server 協作處理。' },
      { text: '唔需要 Key，Server 自動偵測重複請求', correct: false, explanation: 'Server 好難自動偵測重複請求。因為兩個一模一樣嘅合法請求同一個重試請求嘅樣子可能完全一樣。需要 Key 嚟明確標識。' },
    ],
  },
  {
    question: '如果冪等性 Key 嘅存儲用 Redis，Key 應該設幾耐嘅 TTL？',
    options: [
      { text: '永久保存，唔設 TTL', correct: false, explanation: '永久保存會令 Redis 記憶體不斷增長。舊嘅 Key 應該過期清除。大部分場景下，幾小時到幾日嘅 TTL 就夠用。' },
      { text: '24-48 小時，足夠覆蓋正常嘅重試窗口', correct: true, explanation: '啱！一般嚟講，如果一個請求失敗咗，Client 唔太可能隔幾日先重試。24-48 小時嘅 TTL 足夠覆蓋正常嘅重試場景。Stripe 嘅 Idempotency Key 有效期係 24 小時。如果你嘅業務有特殊需求（例如金融），可以設長啲。' },
      { text: '1 秒，因為重試好快', correct: false, explanation: '1 秒太短！Client 可能因為網絡問題隔幾秒甚至幾分鐘先重試。TTL 太短嘅話，Key 已經過期，重試就唔會被認為係重複嘅。' },
      { text: '同 Session 一樣長', correct: false, explanation: 'Session 長度同冪等性嘅需求唔直接相關。用戶可能喺同一個 Session 入面發好多唔同嘅請求，每個請求有自己嘅 Idempotency Key。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'payment-system', label: '支付系統' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
  { slug: 'rate-limiter', label: 'Rate Limiter 限流器' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>冪等性係咩？</h2>
      <div className="subtitle">同一個操作做幾多次，結果都係一樣</div>
      <p>
        <strong style={{ color: '#3B82F6' }}>冪等性（Idempotency）</strong>嘅定義好簡單：
        同一個請求發多次，結果同只發一次係完全一樣嘅。
        呢個喺分佈式系統入面<strong style={{ color: '#f87171' }}>超級重要</strong>——因為網絡唔穩定，
        Client 唔知道請求有冇成功送到 Server，好多時會重試。
        如果你嘅 API 冇冪等性保護，重試就可能導致<strong style={{ color: '#f87171' }}>重複扣款、重複建立訂單</strong>等嚴重問題。
      </p>
      <p>
        核心解法係用 <strong style={{ color: '#fbbf24' }}>Idempotency Key</strong>：Client 每次請求帶一個唯一嘅 Key，
        Server 用呢個 Key 做唯一標識。如果 Server 收到重複嘅 Key，就直接返回之前嘅結果，唔會重複處理。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 310" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowBlue"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradClient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradServer" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRedis" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>

          {/* Client */}
          <g transform="translate(30,100)" filter="url(#glowBlue)">
            <rect width="130" height="70" rx="14" fill="url(#gradClient)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Client</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">帶 Idempotency Key</text>
          </g>

          {/* Server */}
          <g transform="translate(290,60)">
            <rect width="160" height="80" rx="14" fill="url(#gradServer)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="80" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Server</text>
            <text x="80" y="48" textAnchor="middle" fill="#6ee7b7" fontSize="10">檢查 Key 存唔存在</text>
            <text x="80" y="64" textAnchor="middle" fill="#9ca3af" fontSize="9">存在 → 返回 Cached 結果</text>
          </g>

          {/* Redis / Store */}
          <g transform="translate(290,190)">
            <rect width="160" height="60" rx="14" fill="url(#gradRedis)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="80" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">Idempotency Store</text>
            <text x="80" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">Redis / DB Table</text>
          </g>

          {/* DB */}
          <g transform="translate(550,100)">
            <rect width="130" height="70" rx="14" fill="rgba(139,92,246,0.15)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Database</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">業務數據</text>
          </g>

          {/* Request arrow */}
          <path d="M162,125 Q225,110 288,100" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="225" y="100" fill="#3B82F6" fontSize="10">Request + Key</text>

          {/* Check idempotency store */}
          <path d="M370,142 L370,188" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrAmber)" />
          <text x="400" y="168" fill="#fbbf24" fontSize="9">Check Key</text>

          {/* New request → process */}
          <path d="M452,100 Q500,100 548,120" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="500" y="92" fill="#34d399" fontSize="9">新 Key → 處理</text>

          {/* Duplicate → return cached */}
          <path d="M288,85 Q230,75 168,100" fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrRed)" />
          <text x="220" y="70" fill="#f87171" fontSize="9">重複 Key → 返回 Cached 結果</text>

          {/* First request flow */}
          <g transform="translate(50,270)">
            <rect width="620" height="35" rx="10" fill="rgba(52,211,153,0.08)" stroke="#34d399" strokeWidth="1" />
            <text x="310" y="14" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">第一次請求：Check Key（唔存在）→ 處理業務邏輯 → 存結果到 Idempotency Store → 返回結果</text>
            <text x="310" y="28" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600">重試請求：Check Key（存在）→ 直接返回 Cached 結果（唔再處理業務邏輯）</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>核心流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>Client 產生一個唯一嘅 <strong style={{ color: '#fbbf24' }}>Idempotency Key</strong>（UUID v4），放喺 Request Header。例如 <code style={{ color: '#60a5fa' }}>Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000</code>。</span></li>
        <li><span className="step-num">2</span><span>Server 收到請求後，先去 Idempotency Store（Redis / DB）Check 呢個 Key 存唔存在。</span></li>
        <li><span className="step-num">3</span><span>如果 Key <strong style={{ color: '#34d399' }}>唔存在</strong>——代表係新請求。處理業務邏輯，將結果連同 Key 存入 Idempotency Store，返回結果。</span></li>
        <li><span className="step-num">4</span><span>如果 Key <strong style={{ color: '#f87171' }}>已存在</strong>——代表係重試請求。直接返回之前 Cached 嘅結果，唔再執行業務邏輯。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階冪等性設計</h2>
      <div className="subtitle">狀態機、Database-level 同 Race Condition 處理</div>
      <div className="key-points">
        <div className="key-point">
          <h4>狀態機（State Machine）保證冪等</h4>
          <p>用狀態機控制操作：訂單只能從 <code style={{ color: '#60a5fa' }}>PENDING → PAID → SHIPPED</code>，唔能跳過或者倒退。每次操作前先檢查當前狀態，如果狀態唔啱就拒絕。呢個天然就係冪等嘅——已經 PAID 嘅訂單再收到 Pay 請求，直接返回「已付款」。</p>
        </div>
        <div className="key-point">
          <h4>Database-level 冪等</h4>
          <p>喺 DB 層面做冪等：1）<strong style={{ color: '#3B82F6' }}>Unique Constraint</strong>——用 Idempotency Key 做 unique index，插入重複嘅 Key 會被 DB 拒絕。2）<strong style={{ color: '#34d399' }}>Upsert</strong>——<code style={{ color: '#60a5fa' }}>INSERT ... ON CONFLICT DO NOTHING</code>，重複插入唔會報錯。呢啲係最底層嘅保護。</p>
        </div>
        <div className="key-point">
          <h4>Race Condition 處理</h4>
          <p>如果兩個相同嘅請求幾乎同時到達，兩個都 Check Key 唔存在，然後都嘗試處理——呢個就係 Race Condition。解法：用 <strong style={{ color: '#fbbf24' }}>Redis SETNX</strong>（SET if Not eXists）做分佈式鎖。第一個成功 SET 嘅請求攞到鎖去處理，第二個 SET 失敗就等或者返回「處理中」。</p>
        </div>
        <div className="key-point">
          <h4>重試策略設計</h4>
          <p>Client 重試要配合冪等性設計：1）<strong style={{ color: '#8B5CF6' }}>Exponential Backoff</strong>：1s → 2s → 4s → 8s。2）<strong style={{ color: '#8B5CF6' }}>Jitter</strong>：加隨機偏移避免 Thundering Herd。3）<strong style={{ color: '#8B5CF6' }}>Max Retries</strong>：設上限（例如 3 次），唔好無限重試。4）重試嘅時候帶<strong style={{ color: '#fbbf24' }}>相同嘅 Idempotency Key</strong>。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰同面試技巧</h2>
      <div className="subtitle">Stripe 嘅做法同常見陷阱</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Stripe 嘅 Idempotency Key</h4>
          <p>Stripe 係冪等性設計嘅最佳範例。Client 喺 Header 帶 <code style={{ color: '#60a5fa' }}>Idempotency-Key</code>，Stripe Server 會存呢個 Key 同對應嘅結果 24 小時。重試嘅時候帶相同嘅 Key，Stripe 直接返回之前嘅結果。如果第一次請求仲喺處理中，返回 409 Conflict。</p>
        </div>
        <div className="key-point">
          <h4>HTTP Method 冪等性</h4>
          <p>面試必知：<strong style={{ color: '#34d399' }}>GET</strong>（冪等，只讀）、<strong style={{ color: '#34d399' }}>PUT</strong>（冪等，完整替換）、<strong style={{ color: '#34d399' }}>DELETE</strong>（冪等，刪除已刪嘅冇副作用）、<strong style={{ color: '#f87171' }}>POST</strong>（唔冪等，可能建立重複資源）、<strong style={{ color: '#f87171' }}>PATCH</strong>（唔冪等，增量更新可能累加）。</p>
        </div>
        <div className="key-point">
          <h4>常見陷阱</h4>
          <p>1）<strong style={{ color: '#f87171' }}>用 timestamp 做 Key</strong>——唔同嘅請求可能有相同嘅 timestamp，或者同一個請求重試嘅 timestamp 唔同。2）<strong style={{ color: '#f87171' }}>只 check Key 唔 lock</strong>——Race Condition 會導致重複處理。3）<strong style={{ color: '#f87171' }}>TTL 太短</strong>——Key 過期後重試就會被當成新請求。</p>
        </div>
        <div className="key-point">
          <h4>面試答題框架</h4>
          <p>「冪等性喺分佈式系統好重要，因為網絡唔穩定，重試係常態。我會用 Idempotency Key（Client 產生 UUID，Server 用 Redis SETNX 做 lock + 存結果，TTL 24h）。Database 層面加 Unique Constraint 做最後防線。HTTP method 方面，GET/PUT/DELETE 天生冪等，POST 需要額外保護。」</p>
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
        <h4>Prompt 1 — 實現 Idempotency Middleware</h4>
        <div className="prompt-text">
          {'用 '}
          <span className="placeholder">[Node.js Express / Go Gin / Python FastAPI]</span>
          {' + Redis 實現一個通用嘅 Idempotency Middleware。\n\n要求：\n- Client 喺 Header 帶 Idempotency-Key\n- Server 用 Redis SETNX 做分佈式鎖（防 Race Condition）\n- 第一次請求：處理業務邏輯 → 存結果到 Redis（TTL 24h）→ 返回結果\n- 重複請求：直接返回 Cached 結果\n- 請求仲喺處理中：返回 409 Conflict + Retry-After header\n- 冇帶 Key 嘅 POST 請求：返回 400 Bad Request\n- GET / PUT / DELETE 唔需要 Key（天生冪等）\n- 寫齊 unit test 同 integration test\n- 提供 Postman / cURL 測試示例'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計冪等嘅支付 API</h4>
        <div className="prompt-text">
          {'設計一個冪等嘅支付 API，參考 Stripe 嘅模式。\n\n場景：\n- 電商平台嘅訂單支付\n- 支持 '}
          <span className="placeholder">[信用卡 / PayPal / 銀行轉帳]</span>
          {'\n\n要求：\n- POST /payments 帶 Idempotency-Key header\n- 訂單狀態機：PENDING → PROCESSING → PAID / FAILED\n- Redis 做 Idempotency Key 存儲 + 分佈式鎖\n- Database 做 Unique Constraint（最後防線）\n- 處理 Webhook 回調嘅冪等性（支付 Gateway 可能重複發送）\n- 詳細嘅 Error Response（包含 error code、message、retry_after）\n- 用 '}
          <span className="placeholder">[Node.js / Go / Java]</span>
          {' + '}
          <span className="placeholder">[PostgreSQL / MySQL]</span>
          {' + Redis\n- 完整嘅 API spec（OpenAPI / Swagger）'}
        </div>
      </div>
    </div>
  );
}

export default function IdempotencyPatterns() {
  return (
    <>
      <TopicTabs
        title="冪等性設計"
        subtitle="同一個操作做幾多次，結果都係一樣——分佈式系統嘅安全網"
        tabs={[
          { id: 'overview', label: '① 整體概念', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階設計', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰技巧', premium: true, content: <PracticeTab /> },
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
