import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'CQRS 模式嘅核心概念係咩？',
    options: [
      { text: '將前端同後端完全分離', correct: false, explanation: 'CQRS 唔係前後端分離。係關於將讀取同寫入嘅數據模型分開' },
      { text: '將讀取（Query）同寫入（Command）嘅數據模型完全分開，各自優化', correct: true, explanation: '寫入端用針對寫入優化嘅模型，讀取端用針對查詢優化嘅模型。兩者之間保持 Eventual Consistency。特別適合讀寫比例差異極大嘅系統' },
      { text: '所有操作都用同一個 API 處理', correct: false, explanation: '呢個係 CQRS 嘅反面。CQRS 嘅重點就係將讀寫分開處理' },
      { text: '將數據庫分成多個 region', correct: false, explanation: '跨 region 部署係另一個話題。CQRS 關注嘅係讀寫模型嘅分離' },
    ],
  },
  {
    question: 'Retry with Exponential Backoff 點解要加 Jitter（隨機偏移）？',
    options: [
      { text: '令代碼更加複雜，顯示技術水平', correct: false, explanation: 'Jitter 有好實際嘅工程原因，唔係為咗顯示技術' },
      { text: '防止大量客戶端同時 retry 造成「重試風暴」壓垮服務', correct: true, explanation: '如果 1000 個客戶端都喺完全相同嘅時間 retry，效果同 DDoS 冇分別。加 Jitter 令每個客戶端嘅 retry 時間有少少偏差，分散負載' },
      { text: '令每次 retry 嘅結果更加隨機', correct: false, explanation: 'Jitter 影響嘅係 retry 嘅時機，唔係結果' },
      { text: '減少 retry 嘅總次數', correct: false, explanation: 'Jitter 唔會改變 retry 次數，只係改變每次 retry 之間嘅等待時間' },
    ],
  },
  {
    question: '以下邊個場景最適合用 WebSocket？',
    options: [
      { text: '每日發一次嘅報表數據', correct: false, explanation: '低頻率嘅數據推送用 SSE 或者 HTTP polling 就夠，唔需要 WebSocket 嘅複雜性' },
      { text: '多人協作編輯文件（例如 Google Docs）', correct: true, explanation: 'WebSocket 提供全雙工連接，客戶端同服務端可以隨時互相發送數據。多人協作需要實時雙向通訊，WebSocket 係最佳選擇' },
      { text: '靜態網站嘅內容載入', correct: false, explanation: '靜態內容用普通 HTTP 請求就得，完全唔需要持久連接' },
      { text: '用戶登入驗證', correct: false, explanation: '登入驗證係一次性嘅請求-回應操作，用普通 HTTP API 就夠' },
    ],
  },
  {
    question: 'Circuit Breaker（熔斷器）嘅 Half-Open 狀態係做咩用？',
    options: [
      { text: '允許一半嘅請求通過', correct: false, explanation: 'Half-Open 唔係字面上嘅「一半開」。係指嘗試恢復嘅狀態' },
      { text: '經過冷卻期後，嘗試發送少量請求測試下游服務有冇恢復', correct: true, explanation: 'Circuit Breaker 斷路後會等一段冷卻期，然後進入 Half-Open 狀態。呢個時候會放少量請求去測試。如果成功就恢復 Closed 狀態；如果仍然失敗就返回 Open 狀態繼續等' },
      { text: '永久斷開同下游服務嘅連接', correct: false, explanation: '永久斷開唔係 Circuit Breaker 嘅設計目的。佢嘅目標係自動恢復' },
      { text: '將錯誤信息返回畀用戶', correct: false, explanation: '返回錯誤信息可能係 Open 狀態嘅行為之一，但 Half-Open 嘅重點係嘗試恢復' },
    ],
  },
  {
    question: '擴展讀取嘅三大核心策略中，Cache Invalidation 係屬於邊個策略？',
    options: [
      { text: 'Sharding', correct: false, explanation: 'Sharding 係擴展寫入嘅策略，將數據分佈到多個分片上' },
      { text: 'Caching', correct: true, explanation: 'Cache Invalidation 係 Caching 策略嘅核心難題——點樣確保 cache 入面嘅數據同數據庫保持一致。常見策略有 TTL、Write-through、Cache-aside 等' },
      { text: 'Read Replicas', correct: false, explanation: 'Read Replicas 係建立只讀副本分擔讀取壓力，同 Cache Invalidation 冇直接關係' },
      { text: 'Batching', correct: false, explanation: 'Batching 係擴展寫入嘅策略，將多個小寫入合併成批量操作' },
    ],
  },
];

const relatedTopics = [
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
];

function ScaleTab() {
  return (
    <>
      <div className="card">
        <h2>Scale Reads — 擴展讀取</h2>
        <div className="subtitle">Caching / Read Replicas / Database Indexing</div>
        <p>當系統嘅讀取流量遠大於寫入流量時，擴展讀取能力係首要任務。核心策略有三個：</p>
        <ul className="steps">
          <li><span className="step-num">1</span><span><strong>Caching</strong> — 將頻繁讀取嘅數據暫存喺高速存儲層（如 Redis / Memcached），避免每次都查詢數據庫。重點係設計合理嘅 Cache Invalidation 策略。</span></li>
          <li><span className="step-num">2</span><span><strong>Read Replicas</strong> — 建立數據庫嘅只讀副本，將讀取請求分散到多個副本上。主庫負責寫入，副本負責讀取，有效分擔讀取壓力。</span></li>
          <li><span className="step-num">3</span><span><strong>Database Indexing</strong> — 為常用查詢字段建立索引，大幅減少數據庫掃描嘅數據量。關鍵在於揀選正確嘅字段同避免過度索引。</span></li>
        </ul>
      </div>

      <div className="card">
        <h2>Scale Writes — 擴展寫入</h2>
        <div className="subtitle">Sharding / Batching / Asynchronous Writes</div>
        <p>當寫入流量成為瓶頸時，需要透過分散同延遲寫入嚟提升吞吐量：</p>
        <ul className="steps">
          <li><span className="step-num">1</span><span><strong>Sharding</strong> — 將數據按照特定規則（如 User ID）分佈到多個數據庫分片上，每個分片只處理一部分數據，從而水平擴展寫入能力。</span></li>
          <li><span className="step-num">2</span><span><strong>Batching</strong> — 將多個小寫入合併成一個大批量寫入操作，減少數據庫交互次數，顯著提升寫入效率。</span></li>
          <li><span className="step-num">3</span><span><strong>Asynchronous Writes</strong> — 寫入請求先放入隊列，由後台 Worker 異步處理。前端即時回應用戶，實際寫入延遲完成。</span></li>
        </ul>
      </div>

      <div className="card">
        <h2>CQRS — 讀寫分離</h2>
        <div className="subtitle">Command Query Responsibility Segregation</div>
        <p>CQRS 嘅核心概念係將讀取（Query）同寫入（Command）嘅數據模型完全分開。寫入端用針對寫入優化嘅模型，讀取端用針對查詢優化嘅模型，各司其職。</p>
        <p>呢個模式特別適用於讀寫比例差異極大、或者讀寫有唔同性能需求嘅系統。重點係保持兩個模型之間嘅數據最終一致性（Eventual Consistency）。</p>

        <div className="diagram-container">
          <svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="readGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity="0.25" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
              <linearGradient id="writeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
              <linearGradient id="cqrsGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
              <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.3" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
              <filter id="glowCqrs"><feGaussianBlur stdDeviation="6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
              <marker id="arrowGreen" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#34d399" /></marker>
              <marker id="arrowAmber" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" /></marker>
              <marker id="arrowIndigo" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" /></marker>
            </defs>

            <rect x="320" y="20" width="160" height="50" rx="14" fill="url(#clientGrad)" stroke="#a5b4fc" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="400" y="50" textAnchor="middle" fill="#e0e0e0" fontSize="14" fontWeight="600">Client</text>

            <rect x="325" y="120" width="150" height="55" rx="14" fill="url(#cqrsGrad)" stroke="#6366f1" strokeWidth="2" filter="url(#glowCqrs)" />
            <text x="400" y="148" textAnchor="middle" fill="#a5b4fc" fontSize="15" fontWeight="700">CQRS</text>
            <text x="400" y="165" textAnchor="middle" fill="#9ca3af" fontSize="10">Command / Query Split</text>

            <path d="M400,70 C400,85 400,105 400,118" stroke="#a5b4fc" strokeWidth="1.5" fill="none" markerEnd="url(#arrowIndigo)" />

            <rect x="50" y="230" width="160" height="50" rx="14" fill="url(#readGrad)" stroke="#34d399" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="130" y="258" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="600">Read Model</text>
            <rect x="50" y="310" width="70" height="40" rx="14" fill="url(#readGrad)" stroke="#34d399" strokeWidth="1" filter="url(#shadow)" />
            <text x="85" y="334" textAnchor="middle" fill="#c0c4cc" fontSize="10">Cache</text>
            <rect x="140" y="310" width="70" height="40" rx="14" fill="url(#readGrad)" stroke="#34d399" strokeWidth="1" filter="url(#shadow)" />
            <text x="175" y="334" textAnchor="middle" fill="#c0c4cc" fontSize="10">Replicas</text>

            <path d="M325,155 C250,160 180,200 130,228" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arrowGreen)" />
            <path d="M100,280 C95,290 90,300 87,308" stroke="#34d399" strokeWidth="1" fill="none" markerEnd="url(#arrowGreen)" />
            <path d="M160,280 C165,290 170,300 173,308" stroke="#34d399" strokeWidth="1" fill="none" markerEnd="url(#arrowGreen)" />

            <rect x="590" y="230" width="160" height="50" rx="14" fill="url(#writeGrad)" stroke="#f59e0b" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="670" y="258" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="600">Write Model</text>
            <rect x="590" y="310" width="70" height="40" rx="14" fill="url(#writeGrad)" stroke="#f59e0b" strokeWidth="1" filter="url(#shadow)" />
            <text x="625" y="334" textAnchor="middle" fill="#c0c4cc" fontSize="10">Sharding</text>
            <rect x="680" y="310" width="70" height="40" rx="14" fill="url(#writeGrad)" stroke="#f59e0b" strokeWidth="1" filter="url(#shadow)" />
            <text x="715" y="334" textAnchor="middle" fill="#c0c4cc" fontSize="10">Batching</text>

            <path d="M475,155 C550,160 620,200 670,228" stroke="#f59e0b" strokeWidth="1.5" fill="none" markerEnd="url(#arrowAmber)" />
            <path d="M640,280 C635,290 630,300 627,308" stroke="#f59e0b" strokeWidth="1" fill="none" markerEnd="url(#arrowAmber)" />
            <path d="M700,280 C705,290 710,300 713,308" stroke="#f59e0b" strokeWidth="1" fill="none" markerEnd="url(#arrowAmber)" />

            <path d="M215,255 C300,240 500,240 588,255" stroke="#6366f1" strokeWidth="1" strokeDasharray="6,4" fill="none" markerEnd="url(#arrowIndigo)" />
            <text x="400" y="237" textAnchor="middle" fill="#9ca3af" fontSize="10">Eventual Consistency</text>

            <text x="130" y="220" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="500">Query Side</text>
            <text x="670" y="220" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="500">Command Side</text>
          </svg>
        </div>

        <div className="use-case">
          <h4>適用場景</h4>
          <p>電商平台（大量商品瀏覽 vs 少量下單寫入）、社交媒體（大量 Feed 讀取 vs 少量發帖寫入）、分析報表系統（複雜查詢 vs 原始數據寫入）。</p>
        </div>
      </div>
    </>
  );
}

function RealtimeTab() {
  return (
    <>
      <div className="card">
        <h2>Real-time Data — 實時數據傳輸</h2>
        <div className="subtitle">WebSockets / Server-Sent Events / Long Polling</div>
        <p>當應用需要即時推送數據畀客戶端時，有三種主流模式可以揀選。每種模式各有優劣，關鍵在於根據具體場景做出取捨：</p>
        <div className="key-points">
          <div className="key-point">
            <h4>WebSockets</h4>
            <p>建立全雙工持久連接，客戶端同服務端可以隨時互相發送數據。適合需要雙向實時通訊嘅場景，例如聊天室、多人遊戲、協作編輯。</p>
          </div>
          <div className="key-point">
            <h4>Server-Sent Events (SSE)</h4>
            <p>服務端單向推送數據畀客戶端嘅輕量級方案。基於 HTTP，自動重連，適合通知推送、實時股價更新等只需要服務端推送嘅場景。</p>
          </div>
          <div className="key-point">
            <h4>Long Polling</h4>
            <p>客戶端發送請求後，服務端保持連接直到有新數據先回應。兼容性最好但效率最低，適合唔支持 WebSocket 嘅環境作為後備方案。</p>
          </div>
          <div className="key-point">
            <h4>點樣揀選？</h4>
            <p>雙向通訊用 WebSocket；單向推送用 SSE；兼容性優先用 Long Polling。大部分現代應用推薦 WebSocket 配合 SSE 作為降級方案。</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Long-running Processes — 長時間運行嘅流程</h2>
        <div className="subtitle">Message Queues / Worker Pools / Workflow Engines</div>
        <p>好多業務操作唔係即時完成嘅 — 可能需要幾秒、幾分鐘甚至幾個鐘。處理呢類長時間運行嘅流程，核心概念係將任務從主請求流程中分離出嚟：</p>
        <div className="key-points">
          <div className="key-point">
            <h4>Message Queues</h4>
            <p>將任務放入隊列（如 RabbitMQ、Kafka），由消費者異步處理。解耦生產者同消費者，提供緩衝能力同重試機制。</p>
          </div>
          <div className="key-point">
            <h4>Worker Pools</h4>
            <p>維護一組 Worker 線程或進程，從隊列中取出任務並行處理。重點係控制併發數量，避免資源耗盡同保證任務公平分配。</p>
          </div>
          <div className="key-point">
            <h4>Workflow Engines</h4>
            <p>管理複雜嘅多步驟流程（如 Temporal、Airflow），支持狀態追蹤、錯誤恢復、條件分支。適合跨服務嘅長流程編排。</p>
          </div>
          <div className="key-point">
            <h4>常見組合模式</h4>
            <p>Message Queue + Worker Pool 係最常見嘅組合。對於更複雜嘅場景，再加上 Workflow Engine 做流程編排，形成完整嘅異步處理架構。</p>
          </div>
        </div>
        <div className="use-case">
          <h4>典型應用</h4>
          <p>視頻轉碼（上傳後排隊處理）、電郵批量發送（Worker Pool 並行發送）、訂單處理流程（Workflow Engine 編排支付 → 庫存 → 物流）。</p>
        </div>
      </div>
    </>
  );
}

function ReliabilityTab() {
  return (
    <div className="card">
      <h2>Failures &amp; Reliability — 故障與可靠性</h2>
      <div className="subtitle">Retries / Idempotency / Circuit Breakers / Self-healing</div>
      <p>分佈式系統入面，故障係必然會發生嘅。關鍵唔係避免故障，而係設計一套機制令系統喺故障發生時能夠優雅應對並自動恢復。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 260" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.3" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="retryGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="cbGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity="0.3" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="healGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity="0.35" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <filter id="shadowR"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowSuccess"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <marker id="arwAmber" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" /></marker>
            <marker id="arwRed" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#f87171" /></marker>
            <marker id="arwIndigo2" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" /></marker>
            <marker id="arwGreen" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#34d399" /></marker>
          </defs>

          <rect x="20" y="90" width="120" height="55" rx="14" fill="url(#reqGrad)" stroke="#a5b4fc" strokeWidth="1.5" filter="url(#shadowR)" />
          <text x="80" y="122" textAnchor="middle" fill="#e0e0e0" fontSize="13" fontWeight="600">Request</text>

          <rect x="190" y="90" width="140" height="55" rx="14" fill="url(#retryGrad)" stroke="#f59e0b" strokeWidth="1.5" filter="url(#shadowR)" />
          <text x="260" y="114" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="600">Retry</text>
          <text x="260" y="132" textAnchor="middle" fill="#c0c4cc" fontSize="10">with Backoff</text>

          <rect x="380" y="90" width="140" height="55" rx="14" fill="url(#cbGrad)" stroke="#f87171" strokeWidth="1.5" filter="url(#shadowR)" />
          <text x="450" y="114" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="600">Circuit Breaker</text>
          <text x="450" y="132" textAnchor="middle" fill="#c0c4cc" fontSize="10">Open / Half / Closed</text>

          <rect x="570" y="90" width="120" height="55" rx="14" fill="url(#healGrad)" stroke="#6366f1" strokeWidth="1.5" filter="url(#shadowR)" />
          <text x="630" y="122" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="600">Self-healing</text>

          <rect x="735" y="90" width="50" height="55" rx="14" fill="url(#successGrad)" stroke="#34d399" strokeWidth="1.5" filter="url(#glowSuccess)" />
          <text x="760" y="122" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">OK</text>

          <path d="M140,117 C155,117 170,117 188,117" stroke="#f59e0b" strokeWidth="1.5" fill="none" markerEnd="url(#arwAmber)" />
          <path d="M330,117 C345,117 360,117 378,117" stroke="#f87171" strokeWidth="1.5" fill="none" markerEnd="url(#arwRed)" />
          <path d="M520,117 C535,117 550,117 568,117" stroke="#6366f1" strokeWidth="1.5" fill="none" markerEnd="url(#arwIndigo2)" />
          <path d="M690,117 C700,117 715,117 733,117" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arwGreen)" />

          <path d="M260,90 C260,55 210,40 200,60 C192,75 220,88 240,90" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" fill="none" markerEnd="url(#arwAmber)" />
          <text x="220" y="48" textAnchor="middle" fill="#9ca3af" fontSize="9">Exponential Backoff</text>

          <text x="80" y="170" textAnchor="middle" fill="#9ca3af" fontSize="10">發起請求</text>
          <text x="260" y="170" textAnchor="middle" fill="#9ca3af" fontSize="10">失敗重試</text>
          <text x="450" y="170" textAnchor="middle" fill="#9ca3af" fontSize="10">熔斷保護</text>
          <text x="630" y="170" textAnchor="middle" fill="#9ca3af" fontSize="10">自動恢復</text>
          <text x="760" y="170" textAnchor="middle" fill="#9ca3af" fontSize="10">成功</text>
        </svg>
      </div>

      <div className="key-points">
        <div className="key-point">
          <h4>Retry with Exponential Backoff</h4>
          <p>每次重試之間等待嘅時間指數遞增（例如 1s → 2s → 4s → 8s），避免對已經過載嘅服務造成更大壓力。通常加入 Jitter（隨機偏移）防止重試風暴。</p>
        </div>
        <div className="key-point">
          <h4>Idempotency（冪等性）</h4>
          <p>確保同一個操作執行多次同執行一次效果相同。常見做法係用 Idempotency Key，服務端記錄已處理嘅請求 ID，重複請求直接返回之前嘅結果。</p>
        </div>
        <div className="key-point">
          <h4>Circuit Breaker（熔斷器）</h4>
          <p>監控下游服務嘅失敗率，當失敗率超過閾值時「斷路」停止請求，避免連鎖故障。經過一段冷卻期後進入 Half-Open 狀態嘗試恢復。</p>
        </div>
        <div className="key-point">
          <h4>Self-healing（自我修復）</h4>
          <p>系統具備自動偵測異常同恢復嘅能力。常見手段包括：健康檢查（Health Check）、自動重啟失敗嘅服務實例、自動擴容應對流量突增。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>實際應用場景</h4>
        <p>支付系統（Idempotency Key 防止重複扣款）、微服務架構（Circuit Breaker 防止雪崩效應）、Kubernetes（Self-healing 自動重啟 crashed pods）、API Gateway（Retry + Backoff 處理瞬時故障）。</p>
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
        <h4>Prompt 1 — 將設計模式應用到實際項目</h4>
        <div className="prompt-text">
          {`分析 [項目名稱，例如：社交媒體平台] 嘅架構需求，推薦最適合嘅系統設計模式組合。

項目概況：
- 預計用戶量：[例如：100 萬日活用戶]
- 讀寫比例：[例如：讀取佔 90%，寫入佔 10%]
- 核心功能：[例如：Feed 流、即時通訊、通知推送、搜索]

請針對每個核心功能，推薦適用嘅設計模式並解釋原因：

1. 擴展模式（Scale Reads / Scale Writes / CQRS）：
   - 邊個功能適合用邊個模式？
   - Caching 策略點設計？Cache Invalidation 用咩方式？
   - 需唔需要做 Sharding？用咩 Sharding Key？

2. 實時與異步模式：
   - 即時功能用 WebSocket 定 SSE？
   - 長流程任務用咩 Message Queue？
   - Worker Pool 嘅併發數點樣設定？

3. 可靠性模式：
   - 邊啲 API 需要 Idempotency？
   - Circuit Breaker 加喺邊啲服務之間？
   - Self-healing 機制點設計？

最後輸出一份完整嘅架構設計文件，包含技術選型同 Trade-off 分析。`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 架構模式選擇決策指南</h4>
        <div className="prompt-text">
          {`建立一份「架構模式選擇決策指南」，幫助喺 [場景，例如：Monolith 轉 Microservices 過程中] 做出正確嘅技術決策。

請針對以下每對架構選擇，輸出詳細嘅對比分析：

1. Monolith vs Microservices
   - 團隊規模喺幾多人以下適合 Monolith？
   - 咩時候先真正需要拆分微服務？
   - 拆分嘅具體步驟同風險

2. SQL vs NoSQL
   - 根據數據模型點揀？
   - 需要 ACID Transaction 嘅場景用咩？
   - 可以混合使用嘅最佳實踐

3. Synchronous vs Asynchronous Communication
   - 邊啲 API 一定要同步？
   - 引入 Message Queue 嘅判斷標準
   - Event-Driven Architecture 嘅適用條件

4. Cache-Aside vs Write-Through vs Write-Behind
   - 每種策略嘅一致性保證
   - 根據讀寫比例點揀？

每個決策點都需要：
- 決策流程圖（用文字描述 If-Else 邏輯）
- 真實案例（邊間公司用咗邊個方案、點解）
- 常見踩坑同避免方法`}
        </div>
      </div>
    </div>
  );
}

export default function SystemDesignPatterns() {
  return (
    <>
      <TopicTabs
        title="系統設計模式總覽"
        subtitle="大多數系統都遵循相同嘅模式 — 掌握呢啲核心模式，就可以應對絕大部分嘅系統設計挑戰"
        tabs={[
          { id: 'tab-scale', label: '擴展模式', content: <ScaleTab /> },
          { id: 'tab-realtime', label: '實時與異步', content: <RealtimeTab /> },
          { id: 'tab-reliability', label: '可靠性模式', premium: true, content: <ReliabilityTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
          { id: 'quiz', label: '⑤ Quiz', premium: true, content: <QuizRenderer data={quizData} /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
