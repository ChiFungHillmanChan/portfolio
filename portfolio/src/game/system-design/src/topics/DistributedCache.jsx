import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '大量 Cache key 同時過期，所有請求一齊衝去資料庫。呢個問題叫咩？應該點防？',
    options: [
      { text: 'Cache Penetration — 用 Bloom Filter 過濾', correct: false, explanation: 'Cache Penetration 係查一個 DB 都冇嘅 key，每次都穿透到 DB。同時過期嘅問題唔係 Penetration。' },
      { text: 'Cache Avalanche（雪崩）— TTL 加隨機偏移，避免同時過期', correct: true, explanation: '大量 key 同時過期就係 Cache Avalanche。解法係設 TTL 嘅時候加一個隨機偏移（例如 TTL = 300 + random(0,60) 秒），令唔同 key 喺唔同時間過期，分散對 DB 嘅壓力。' },
      { text: 'Cache Stampede — 用分佈式鎖解決', correct: false, explanation: 'Cache Stampede 係一個熱門 key 過期後，大量請求同時去 DB 攞。同「大量 key 同時過期」唔同——Stampede 係單個 key 嘅問題，Avalanche 係大量 key 嘅問題。' },
      { text: 'Cache Invalidation — 用 Event-Driven 自動更新', correct: false, explanation: 'Cache Invalidation 係指確保 Cache 同 DB 數據一致嘅問題。同時過期嘅問題係 Avalanche，需要用 TTL 隨機偏移嚟防範。' },
    ],
  },
  {
    question: '一個熱門商品嘅 Cache key 過期咗，瞬間有 10 萬個請求同時去 DB 攞同一份資料。點樣最有效解決？',
    options: [
      { text: '將 TTL 設到好長（例如 24 小時）', correct: false, explanation: '長 TTL 可以減少過期頻率，但唔能完全避免。而且 TTL 太長會令 Cache 數據好耐先更新，用戶可能睇到過時資料。' },
      { text: '用分佈式鎖（Mutex），只有一個請求去 DB，其他等結果', correct: true, explanation: '呢個就係 Cache Stampede 嘅標準解法。用 Redis SETNX 做分佈式鎖，第一個請求攞到鎖後去 DB 攞數據並更新 Cache，其他請求等 Cache 更新後直接攞。有效避免 DB 被壓爆。' },
      { text: '直接移除呢個 Cache key，唔再快取', correct: false, explanation: '呢個會令所有請求都直接打去 DB，情況只會更差。熱門商品正正係最需要 Cache 嘅。' },
      { text: '加多幾台 DB Server 分擔壓力', correct: false, explanation: '加 DB Server 成本高、時間長，而且唔能解決根本問題。用 Mutex 鎖係更優雅、更低成本嘅解法。' },
    ],
  },
  {
    question: '分佈式 Cache 入面，App Server 用咩方法決定一個 key 應該去邊個 Cache Node？',
    options: [
      { text: '隨機分配去任何一個 Cache Node', correct: false, explanation: '隨機分配會令同一個 key 可能被存喺唔同嘅 Node，浪費空間又降低 hit rate。每次攞同一個 key 都要查所有 Node，效率好低。' },
      { text: '用 key % N（N 係 Node 數量）計算', correct: false, explanation: '簡單取模（key % N）喺加減 Node 時會令幾乎所有 key 重新分佈，引發大量 Cache Miss。呢個就係 Consistent Hashing 要解決嘅問題。' },
      { text: '用 Consistent Hashing 將 key 映射到 Hash Ring，搵到對應嘅 Node', correct: true, explanation: 'Consistent Hashing 將 key 同 Node 都映射到同一個 Hash Ring 上。key 順時針搵到嘅第一個 Node 就係佢嘅歸屬。加減 Node 只影響相鄰 Node 嘅 key，唔會影響成個集群。' },
      { text: '所有 key 都廣播去全部 Cache Node', correct: false, explanation: '廣播會浪費大量記憶體（每個 Node 都存全部數據），同時寫入成本好高。分佈式 Cache 嘅重點就係分散存儲，唔係全量複製。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'redis', label: 'Redis' },
  { slug: 'cache-invalidation', label: 'Cache 失效策略' },
  { slug: 'cdn', label: 'CDN 內容分發網絡' },
  { slug: 'scale-reads', label: '擴展讀取能力' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>分佈式快取係咩？</h2>
      <div className="subtitle">多台 Cache Server 組成嘅快取集群</div>
      <p>
        呢度有一個好重要嘅概念。當資料太多，一台 Redis 放唔晒嘅時候，就需要多台 Cache Server 組成集群。問題係：一個 key 應該放喺邊台 Server？答案就係 <strong style={{ color: '#fbbf24' }}>Consistent Hashing（一致性哈希）</strong>。以下係佢嘅運作方式。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowBlue">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#3B82F6" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowAmber">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#F59E0B" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradApp" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1e2940" />
            </linearGradient>
            <linearGradient id="gradNode" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#2a1e2a" />
            </linearGradient>
            <linearGradient id="gradDB" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#251e35" />
            </linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          </defs>

          {/* App Server */}
          <g transform="translate(30,120)" filter="url(#glowBlue)">
            <rect width="120" height="70" rx="14" fill="url(#gradApp)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">App Server</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">應用服務器</text>
          </g>

          {/* Cache Nodes */}
          <g transform="translate(250,30)">
            <rect width="130" height="55" rx="14" fill="url(#gradNode)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="22" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">Cache Node 1</text>
            <text x="65" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">Keys: A-H</text>
          </g>

          <g transform="translate(250,120)">
            <rect width="130" height="55" rx="14" fill="url(#gradNode)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="22" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">Cache Node 2</text>
            <text x="65" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">Keys: I-P</text>
          </g>

          <g transform="translate(250,210)">
            <rect width="130" height="55" rx="14" fill="url(#gradNode)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="22" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">Cache Node 3</text>
            <text x="65" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">Keys: Q-Z</text>
          </g>

          {/* Consistent Hashing */}
          <g transform="translate(80,240)" filter="url(#glowAmber)">
            <rect width="140" height="50" rx="25" fill="rgba(245,158,11,0.12)" stroke="#F59E0B" strokeWidth="1.5" />
            <text x="70" y="22" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="700">Consistent</text>
            <text x="70" y="38" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="700">Hashing</text>
          </g>

          {/* Database */}
          <g transform="translate(480,120)">
            <rect width="130" height="70" rx="14" fill="url(#gradDB)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Database</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">資料庫</text>
          </g>

          {/* Arrows */}
          <path d="M 152 140 Q 200 90 248 55" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <path d="M 152 155 Q 200 148 248 148" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="200" y="140" fill="#34d399" fontSize="10">Lookup</text>
          <path d="M 152 170 Q 200 215 248 235" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />

          <path d="M 382 148 Q 430 145 478 153" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrAmber)" />
          <text x="430" y="138" fill="#fbbf24" fontSize="10">Cache miss</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>運作原理</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>App Server 想查一個 key，用 Consistent Hashing 計算呢個 key 應該去邊個 Cache Node。重點係，呢個計算係 O(1) 嘅，超快。</span></li>
        <li><span className="step-num">2</span><span>如果 Cache Node 有呢個 key（Cache Hit），直接返回。超快！呢個就係理想情況。</span></li>
        <li><span className="step-num">3</span><span>如果 Cache Node 冇（Cache Miss），就去 Database 攞，然後存入 Cache Node。注意，呢個過程叫做「懶加載」。</span></li>
      </ol>
    </div>
  );
}

function StrategiesTab() {
  return (
    <div className="card">
      <h2>快取策略</h2>
      <div className="subtitle">四個必須要識嘅策略</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Cache-Aside（旁路快取）</h4>
          <p>建議最先學呢個。App 先查 Cache，冇就查 DB，然後寫入 Cache。呢個係最常用嘅策略，App 自己控制 Cache 邏輯，擁有最大嘅靈活性。</p>
        </div>
        <div className="key-point">
          <h4>Write-Through（同步寫入）</h4>
          <p>寫入時同時更新 Cache 同 DB。Cache 永遠最新，但寫入會慢啲。喺需要強一致性嘅場景最適合用呢個。</p>
        </div>
        <div className="key-point">
          <h4>Write-Back（延遲寫入）</h4>
          <p>先寫 Cache，背景異步寫 DB。寫入超快但有資料丟失風險。要特別小心，確保有容錯機制先好用。</p>
        </div>
        <div className="key-point">
          <h4>Consistent Hashing</h4>
          <p>呢個概念非常重要。將 key 映射到一個圓環上，每個 Cache Node 負責一段。加減節點時只需要搬移少量 key，唔會影響成個集群。呢個係分佈式系統嘅基石。</p>
        </div>
      </div>
    </div>
  );
}

function ProblemsTab() {
  return (
    <div className="card">
      <h2>常見問題同防護</h2>
      <div className="subtitle">必須要識嘅四個 Cache 陷阱，逐個拆解</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Cache Avalanche（快取雪崩）</h4>
          <p>大量 key 同時過期，所有請求衝去 DB——呢個場面絕對唔想見到。防禦方法：TTL 加隨機偏移，避免同時過期。好簡單但好有效。</p>
        </div>
        <div className="key-point">
          <h4>Cache Stampede（快取踩踏）</h4>
          <p>一個熱門 key 過期，瞬間大量請求同時查 DB。關鍵解法：用分佈式鎖（mutex），只有一個請求去 DB，其他等。面試嘅時候一定要提呢個。</p>
        </div>
        <div className="key-point">
          <h4>Cache Penetration（快取穿透）</h4>
          <p>查一個 DB 都冇嘅 key，每次都穿透到 DB。兩個常用方法：Cache 空值（null），或者用 Bloom Filter 做前置過濾。兩個方法各有長短，要按場景揀。</p>
        </div>
        <div className="key-point">
          <h4>Cache Invalidation</h4>
          <p>有句名言講：「電腦科學最難嘅兩件事：Cache Invalidation 同命名。」必須確保資料更新時 Cache 都會更新，否則用戶會睇到舊資料。呢個問題冇完美解，但有好嘅實踐方法。</p>
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
        <h4>Prompt 1 — 設計分佈式快取層架構</h4>
        <div className="prompt-text">
          {'幫手設計一個分佈式快取層，技術棧用 [Redis Cluster / Memcached]，應用場景係 [電商產品頁 / 社交媒體 Feed / API Response]。\n\n要求包括：\n- 用 Consistent Hashing 做 key 分佈，解釋點樣 hash ring 運作\n- 實現 Cache-Aside 策略，包括 cache miss 時嘅 fallback 邏輯\n- 設定合理嘅 TTL 策略，加隨機偏移防止 Cache Avalanche\n- 加入 Bloom Filter 防止 Cache Penetration\n- 用分佈式鎖（Redis SETNX）解決 Cache Stampede\n- 提供完整嘅 code 示範，語言用 [Node.js / Python / Go]'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 快取一致性同 Invalidation 策略</h4>
        <div className="prompt-text">
          {'設計一套 Cache Invalidation 機制，場景係 [用戶資料更新 / 庫存變動 / 價格調整]，資料庫用 [PostgreSQL / MySQL]，快取用 Redis。\n\n要求包括：\n- 比較 Write-Through、Write-Back、Cache-Aside 三種策略嘅適用場景\n- 處理 DB 同 Cache 之間嘅 race condition（先更新 DB 定先刪 Cache？）\n- 實現 Event-Driven Invalidation（用 CDC / Pub-Sub 監聽 DB 變更自動清 Cache）\n- 設計 Cache Warm-up 策略，避免冷啟動時大量 Cache Miss\n- 監控方案：Cache Hit Rate、Latency、Memory Usage dashboard\n- 提供完整嘅實現 code 同配置'}
        </div>
      </div>
    </div>
  );
}

export default function DistributedCache() {
  return (
    <>
      <TopicTabs
        title="Distributed Cache 分佈式快取"
        subtitle="搞清楚 Redis / Memcached 快取策略同 Cache Invalidation 嘅核心概念"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'strategies', label: '② 快取策略', content: <StrategiesTab /> },
          { id: 'problems', label: '③ 常見問題', premium: true, content: <ProblemsTab /> },
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
