import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '你嘅 API 一個請求要 10 秒，其中 8 秒係 Database 查詢。你應該喺邊度加 Cache？',
    options: [
      { text: '喺 Browser 加 Cache', correct: false, explanation: 'Browser Cache 適合靜態資源（圖片、CSS、JS），但呢個問題嘅瓶頸喺 Database 查詢，Browser Cache 幫唔到。' },
      { text: '喺 Server 同 Database 之間加 Cache（例如 Redis）', correct: true, explanation: '8 秒嘅瓶頸喺 Database 查詢。喺 Server 同 DB 之間加一層 Cache（例如 Redis），將常用嘅查詢結果 cache 起嚟，可以將 8 秒降到幾毫秒。永遠先解決最大嘅瓶頸。' },
      { text: '喺 Client 同 Server 之間加 CDN', correct: false, explanation: 'CDN 主要 cache 靜態內容。如果瓶頸喺 Database 查詢，CDN 幫唔到（除非 API response 可以 cache）。' },
      { text: '全部都 cache，三層都加', correct: false, explanation: '唔係每一層都需要 cache。應該先搵出瓶頸喺邊，針對性咁加 cache。亂加 cache 反而會增加複雜度同 cache invalidation 嘅問題。' },
    ],
  },
  {
    question: 'Mr. Beast 出咗新片，幾百萬人同時要睇。點解唔好每個請求都去 Database 攞？',
    options: [
      { text: '因為 Database 會被大量讀取壓爆，Service 直接掛', correct: true, explanation: '幾百萬個請求同時打去 Database，DB 嘅 CPU 同連接數會瞬間爆滿。正確做法係將呢種熱門內容 cache 喺 Redis 或 CDN，DB 只需要被讀一次，之後所有請求都從 cache 攞，快幾百倍。' },
      { text: '因為 Database 要付錢', correct: false, explanation: '雖然 DB 用量多的確成本高，但主要原因係效能——DB 頂唔住咁大嘅並發量，唔係錢嘅問題。' },
      { text: '因為 Database 嘅數據唔準確', correct: false, explanation: 'Database 嘅數據係最準確嘅 source of truth。Caching 嘅目的係減少 DB 壓力同加速回應，唔係因為 DB 數據唔準。' },
      { text: '因為用戶唔鍾意等', correct: false, explanation: '用戶體驗係 caching 嘅好處之一，但最核心嘅原因係 DB 頂唔住咁多並發請求。就算用戶唔介意等，DB 爆咗全部人都用唔到。' },
    ],
  },
  {
    question: '以下邊個場景最唔適合用 Cache？',
    options: [
      { text: '電商網站嘅商品列表頁（每日被瀏覽百萬次）', correct: false, explanation: '讀多寫少嘅場景最適合 cache。商品列表被大量讀取但唔常改，cache 效果極好。' },
      { text: '每個用戶都唔同嘅個人化推薦結果（每次都唔同）', correct: true, explanation: '如果每次結果都唔同，cache hit rate 會極低。Cache 嘅核心價值係「同一份數據被多次重用」。如果每個請求嘅結果都 unique，cache 幾乎冇意義，反而浪費記憶體。' },
      { text: '社交媒體嘅熱門帖子', correct: false, explanation: '熱門帖子被大量用戶同時請求，cache 可以大幅減少 DB 壓力。呢個係 cache 最典型嘅 use case。' },
      { text: '全球用戶都會訪問嘅首頁 banner 圖片', correct: false, explanation: '靜態圖片放 CDN cache 係最基本嘅 cache 應用，效果極好。全球用戶就近攞 cache，唔使每次都去 origin server。' },
    ],
  },
  {
    question: 'Browser Cache、Server Cache（Redis）、CDN 呢三層 Cache，邊層最接近用戶？',
    options: [
      { text: 'CDN Edge Server', correct: false, explanation: 'CDN 比 Server Cache 更近用戶，但仲要經網絡請求。Browser Cache 直接喺用戶裝置上面，完全唔使發網絡請求。' },
      { text: 'Server Cache（Redis）', correct: false, explanation: 'Redis 喺 Server 旁邊，係三層之中離用戶最遠嘅一層。請求要經過 Client → CDN → Server 先到 Redis。' },
      { text: 'Browser Cache', correct: true, explanation: 'Browser Cache 存喺用戶嘅裝置（手機 / 電腦），完全唔使發任何網絡請求。例如第二次訪問同一個網頁，Browser 直接用本地 cache 嘅 CSS、JS、圖片，最快嘅 cache 層。' },
      { text: '三層一樣近', correct: false, explanation: '完全唔同。Browser Cache 喺用戶裝置 → CDN 喺全球邊緣節點 → Redis 喺 Server 旁邊。距離用戶嘅遠近決定咗回應速度。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'redis', label: 'Redis 快取' },
  { slug: 'cache-invalidation', label: 'Cache 失效策略' },
  { slug: 'distributed-cache', label: '分散式快取' },
  { slug: 'cdn', label: 'CDN 內容分發' },
  { slug: 'scale-reads', label: '讀取擴展' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Caching 係咩</h2>
      <div className="subtitle">將常用嘅數據存喺更近嘅地方，用戶攞得更快</div>
      <p>
        你嘅網站 load 好慢？十居其九係因為冇做 Caching。Caching 嘅概念好簡單——將資訊儲存喺更接近用戶嘅地方，等佢哋可以更快咁攞到。你嘅 Browser 其實一直都做緊呢件事：第一次開一個網站會慢，但第二次開就快好多，因為 Browser 已經將圖片、CSS、JS 存咗喺本地。
      </p>
      <p>
        但 Browser Cache 只係其中一層。一個完整嘅系統入面，Cache 可以出現喺好多地方：Browser → CDN → Server（Redis）→ Database。你要做嘅係搵出邊度最慢，然後喺嗰度加 Cache。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradUser" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradBrowser" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradCDN" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradServer" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRedis" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d1515" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDB" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e4a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>

          <text x="390" y="25" textAnchor="middle" fill="#9ca3af" fontSize="13" fontWeight="600">Cache 可以出現喺邊度？</text>

          {/* User */}
          <g transform="translate(30,60)">
            <rect width="100" height="65" rx="14" fill="url(#gradUser)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">User</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">用戶請求</text>
          </g>

          {/* Browser Cache */}
          <g transform="translate(175,50)" filter="url(#glowGreen)">
            <rect width="120" height="85" rx="14" fill="url(#gradBrowser)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="25" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Browser</text>
            <text x="60" y="42" textAnchor="middle" fill="#34d399" fontSize="11">Cache</text>
            <text x="60" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">圖片 / CSS / JS</text>
            <text x="60" y="76" textAnchor="middle" fill="#34d399" fontSize="9">~0ms</text>
          </g>

          {/* CDN */}
          <g transform="translate(340,50)">
            <rect width="120" height="85" rx="14" fill="url(#gradCDN)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">CDN</text>
            <text x="60" y="42" textAnchor="middle" fill="#a78bfa" fontSize="11">Edge Cache</text>
            <text x="60" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">靜態資源</text>
            <text x="60" y="76" textAnchor="middle" fill="#a78bfa" fontSize="9">~5-20ms</text>
          </g>

          {/* Server */}
          <g transform="translate(505,50)">
            <rect width="110" height="85" rx="14" fill="url(#gradServer)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">Server</text>
            <text x="55" y="42" textAnchor="middle" fill="#fbbf24" fontSize="11">App Logic</text>
            <text x="55" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">處理請求</text>
            <text x="55" y="76" textAnchor="middle" fill="#fbbf24" fontSize="9">~50-200ms</text>
          </g>

          {/* Redis Cache */}
          <g transform="translate(505,200)" filter="url(#glowGreen)">
            <rect width="110" height="75" rx="14" fill="url(#gradRedis)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="25" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700">Redis</text>
            <text x="55" y="42" textAnchor="middle" fill="#f87171" fontSize="11">Cache</text>
            <text x="55" y="62" textAnchor="middle" fill="#34d399" fontSize="9">~1-5ms</text>
          </g>

          {/* Database */}
          <g transform="translate(505,310)">
            <rect width="110" height="55" rx="14" fill="url(#gradDB)" stroke="#60a5fa" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="22" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="700">Database</text>
            <text x="55" y="42" textAnchor="middle" fill="#f87171" fontSize="9">~100-5000ms</text>
          </g>

          {/* Arrows: User → Browser */}
          <path d="M132,92 C148,92 158,92 173,92" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrBlue)" />

          {/* Browser → CDN */}
          <path d="M297,92 C313,92 323,92 338,92" fill="none" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="318" y="82" textAnchor="middle" fill="#9ca3af" fontSize="8">Cache Miss</text>

          {/* CDN → Server */}
          <path d="M462,92 C478,92 488,92 503,92" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrYellow)" />
          <text x="483" y="82" textAnchor="middle" fill="#9ca3af" fontSize="8">Cache Miss</text>

          {/* Server → Redis */}
          <path d="M560,137 C560,160 560,180 560,198" fill="none" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrRed)" />
          <text x="585" y="170" fill="#34d399" fontSize="9">先查 Cache</text>

          {/* Redis → DB (cache miss) */}
          <path d="M560,277 C560,290 560,295 560,308" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrBlue)" />
          <text x="585" y="295" fill="#f87171" fontSize="9">Cache Miss</text>

          {/* Speed comparison box */}
          <g transform="translate(30,180)">
            <rect width="250" height="170" rx="14" fill="rgba(16,185,129,0.06)" stroke="#10B981" strokeWidth="1.5" />
            <text x="125" y="25" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">速度對比</text>
            <text x="20" y="50" fill="#34d399" fontSize="11">Browser Cache</text><text x="200" y="50" fill="#34d399" fontSize="11" textAnchor="end">~0ms</text>
            <text x="20" y="72" fill="#a78bfa" fontSize="11">CDN Edge</text><text x="200" y="72" fill="#a78bfa" fontSize="11" textAnchor="end">~5-20ms</text>
            <text x="20" y="94" fill="#f87171" fontSize="11">Redis Cache</text><text x="200" y="94" fill="#f87171" fontSize="11" textAnchor="end">~1-5ms</text>
            <text x="20" y="116" fill="#fbbf24" fontSize="11">Server 處理</text><text x="200" y="116" fill="#fbbf24" fontSize="11" textAnchor="end">~50-200ms</text>
            <text x="20" y="138" fill="#60a5fa" fontSize="11">Database 查詢</text><text x="200" y="138" fill="#f87171" fontSize="11" textAnchor="end">~100-5000ms</text>
            <line x1="20" y1="150" x2="230" y2="150" stroke="#334155" strokeWidth="1" />
            <text x="125" y="165" textAnchor="middle" fill="#9ca3af" fontSize="9">越近用戶 = 越快</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>Cache 嘅核心原理</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>用戶第一次訪問網站，Browser 會去 Server 攞所有資源（HTML、CSS、JS、圖片）。呢次一定慢，因為咩都冇 cache。</span></li>
        <li><span className="step-num">2</span><span>Browser 會將靜態資源存喺本地。第二次訪問同一個網站時，直接用本地嘅 cache，唔使再發網絡請求。呢個就係點解「第二次 load 快好多」。</span></li>
        <li><span className="step-num">3</span><span>但 Browser Cache 只係一層。如果你嘅瓶頸喺 Database（例如一個請求 10 秒，8 秒係 DB 查詢），就要喺 Server 同 DB 之間加 Redis Cache——將常用嘅查詢結果 cache 起嚟，下次直接從 Redis 攞，唔使再等 DB。</span></li>
      </ol>
    </div>
  );
}

function WhereTab() {
  return (
    <div className="card">
      <h2>喺邊度加 Cache？</h2>
      <div className="subtitle">搵出瓶頸，針對性加 Cache</div>
      <p>
        唔係所有地方都需要 Cache。關鍵係搵出你嘅請求鏈入面邊個環節最慢，然後喺嗰度加 Cache。盲目加 Cache 只會增加複雜度，仲要處理 cache invalidation 嘅問題。
      </p>

      <div className="key-points">
        <div className="key-point">
          <h4>Browser Cache（Client-side）</h4>
          <p>
            最接近用戶嘅一層。Browser 會根據 <code style={{ background: '#13151c', padding: '2px 6px', borderRadius: '4px' }}>Cache-Control</code> header 將靜態資源（圖片、CSS、JS）存喺本地。第二次訪問時直接用 cache，完全唔使發網絡請求。速度：~0ms。適合唔常更新嘅靜態資源。
          </p>
        </div>
        <div className="key-point">
          <h4>CDN Cache（Edge Server）</h4>
          <p>
            喺全球各地嘅 Edge Server cache 靜態資源。用戶就近攞 cache，唔使跨半個地球去 origin server。適合圖片、影片、HTML、CSS 等靜態內容。工具：CloudFront、Cloudflare。速度：~5-20ms。
          </p>
        </div>
        <div className="key-point">
          <h4>Server Cache（Redis / Memcached）</h4>
          <p>
            喺 Server 同 Database 之間加一層。將常用嘅 DB 查詢結果存喺 Redis（in-memory），下次直接攞 cache 唔使再查 DB。呢層係最常見嘅 application-level cache。速度：~1-5ms（vs DB 嘅 100-5000ms）。
          </p>
        </div>
      </div>

      <div className="use-case">
        <h4>點樣決定喺邊度加？</h4>
        <p>
          用一個簡單方法：量度你嘅請求鏈每個環節嘅耗時。如果總共 10 秒，8 秒係 DB → 喺 Server 同 DB 之間加 Redis。如果 3 秒係 Server 處理、7 秒係用戶遠距離傳輸 → 加 CDN。如果用戶重覆訪問同一頁面 → Browser Cache 就夠。永遠先解決最大嘅瓶頸。
        </p>
      </div>
    </div>
  );
}

function WhatToCacheTab() {
  return (
    <div className="card">
      <h2>Cache 咩數據？</h2>
      <div className="subtitle">唔係咩都適合 Cache — 揀最常被讀取嘅數據</div>
      <p>
        你只需要 cache <strong style={{ color: '#34d399' }}>最常被讀取</strong>嘅數據。想像 Mr. Beast 出咗新片，幾百萬人同時要睇——你唔會想每個請求都去 Database 攞同一份影片數據。你只需要去 DB 攞一次，放入 Cache，之後所有請求都直接從 Cache 攞。快幾百倍，DB 壓力歸零。
      </p>

      <div className="key-points">
        <div className="key-point">
          <h4>適合 Cache 嘅數據</h4>
          <p>讀多寫少嘅數據：商品列表、用戶 profile、熱門文章、配置設定。呢啲數據被大量讀取但唔常改，cache hit rate 高。</p>
        </div>
        <div className="key-point">
          <h4>唔適合 Cache 嘅數據</h4>
          <p>每次結果都唔同嘅數據：個人化推薦（每人唔同）、即時股價（每秒都變）、一次性嘅查詢。Cache hit rate 極低，cache 咗都冇意義。</p>
        </div>
        <div className="key-point">
          <h4>Cache 嘅黃金法則</h4>
          <p>同一份數據被讀取越多次，Cache 嘅效益越大。如果一個 cache entry 只被讀一次就過期，咁根本唔值得 cache。目標係高 hit rate（&gt;90%）。</p>
        </div>
      </div>

      <div className="key-points">
        <div className="key-point" style={{ borderLeftColor: '#f87171' }}>
          <h4>Cache 嘅代價</h4>
          <p>
            Cache 唔係免費午餐。加咗 Cache 就要處理 <strong style={{ color: '#f87171' }}>Cache Invalidation</strong>——數據更新咗，Cache 入面嘅舊版本點算？呢個係電腦科學最難嘅問題之一。所以唔好亂加 Cache，要有策略咁加。
          </p>
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
        <h4>Prompt 1 — 為 API 加入 Redis Caching</h4>
        <div className="prompt-text">
          {'幫手為我嘅 API 加入 Redis Caching 層，用 [框架，例如 Express + Node.js / FastAPI + Python / Spring Boot]。\n\n項目背景：\n- API 類型：[例如：商品列表 / 用戶 Profile / 搜索結果]\n- 目前 Database 查詢耗時：[例如：500ms-2s]\n- 預計 QPS：[例如：1000 req/s]\n- Database：[例如：PostgreSQL / MongoDB / MySQL]\n\n要求：\n1. 設定 Redis 連接（connection pool + retry 策略）\n2. 實作 Cache-Aside Pattern：先查 Redis，miss 先去 DB，再寫入 Redis\n3. 設定合理嘅 TTL（根據數據更新頻率）\n4. 加入 cache key 命名規範（例如 product:{id}、user:{id}:profile）\n5. 寫入或更新數據時自動 invalidate 對應嘅 cache\n6. 加入 cache hit/miss 嘅 metrics logging\n7. 處理 Redis 掛咗嘅 fallback（直接讀 DB，唔好令整個 API 掛）'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計多層 Caching 架構</h4>
        <div className="prompt-text">
          {'幫手設計一個多層 Caching 架構，適用於 [例如：電商網站 / 內容平台 / SaaS Dashboard]。\n\n需要設計嘅 Cache 層：\n1. Browser Cache：設定 Cache-Control headers（靜態資源用長 TTL + content hash 檔名）\n2. CDN Cache：設定 [CloudFront / Cloudflare] 嚟 cache 靜態資源同 API response\n3. Application Cache：用 Redis cache 常用嘅 DB 查詢結果\n\n每層需要提供：\n- 適合 cache 嘅數據類型\n- TTL 設定同理由\n- Cache Invalidation 策略\n- 預期嘅 cache hit rate\n\n額外需求：\n- 畫出完整嘅請求流程圖（Request → Browser Cache → CDN → Server → Redis → DB）\n- 計算加入 caching 後嘅預期效能提升\n- 成本估算（Redis instance size + CDN 費用）'}
        </div>
      </div>
    </div>
  );
}

export default function CachingBasics() {
  return (
    <>
      <TopicTabs
        title="Caching 快取基礎"
        subtitle="將數據存近啲，用戶攞得快啲"
        tabs={[
          { id: 'overview', label: '① 點解要 Cache', content: <OverviewTab /> },
          { id: 'where', label: '② 喺邊度 Cache', content: <WhereTab /> },
          { id: 'what', label: '③ Cache 咩數據', premium: true, content: <WhatToCacheTab /> },
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
