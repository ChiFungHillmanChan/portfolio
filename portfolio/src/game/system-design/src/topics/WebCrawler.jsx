import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const relatedTopics = [
  { slug: 'scraping-vs-crawling', label: 'Web Scraping vs Crawling' },
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
  { slug: 'task-queue', label: 'Task Queue 任務隊列' },
  { slug: 'url-shortener', label: 'URL Shortener 短網址服務' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>爬蟲系統到底係咩</h2>
      <div className="subtitle">Google 點樣搵到全世界嘅網頁？就係靠 Web Crawler</div>
      <p>
        Web Crawler 就好似一隻蜘蛛，從一組「種子 URL」開始，打開網頁、下載內容、搵出入面嘅所有連結，然後再去爬嗰啲連結。不斷重複，就可以爬遍全個互聯網。呢個循環嘅威力非常強大。
      </p>
      <p>舉個例——Google 嘅爬蟲叫 Googlebot，每日爬幾十億個網頁。設計呢個系統嘅時候，最大嘅挑戰就係：點樣做到快、唔重複、同時唔被網站 ban。以下逐個拆解。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 850 310" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#172033" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#1f1a10" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#13251e" /></linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#251318" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#1c1530" /></linearGradient>
            <linearGradient id="gradPink" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#25132a" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
            <marker id="arrPink" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#EC4899" /></marker>
          </defs>

          <g transform="translate(20,115)">
            <rect width="110" height="60" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Seed URLs</text>
            <text x="55" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">起始網址</text>
          </g>

          <g transform="translate(180,100)">
            <rect width="120" height="75" rx="12" fill="url(#gradAmber)" stroke="#F59E0B" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="60" y="25" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">URL Frontier</text>
            <text x="60" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">待爬隊列</text>
            <text x="60" y="62" textAnchor="middle" fill="#fbbf24" fontSize="9">優先級排序</text>
          </g>

          <g transform="translate(360,100)">
            <rect width="120" height="75" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="60" y="28" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Fetcher</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">多 Worker 下載</text>
            <text x="60" y="64" textAnchor="middle" fill="#34d399" fontSize="9">Politeness 控速</text>
          </g>

          <g transform="translate(540,50)">
            <rect width="120" height="60" rx="12" fill="url(#gradRed)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="25" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">HTML Parser</text>
            <text x="60" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">解析提取連結</text>
          </g>

          <g transform="translate(540,175)">
            <rect width="130" height="60" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Dedup</text>
            <text x="65" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Bloom Filter 去重</text>
          </g>

          <g transform="translate(720,105)">
            <rect width="105" height="70" rx="12" fill="url(#gradPink)" stroke="#EC4899" strokeWidth="2" filter="url(#shadow)" />
            <text x="52" y="28" textAnchor="middle" fill="#EC4899" fontSize="12" fontWeight="700">Storage</text>
            <text x="52" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">儲存內容</text>
          </g>

          <path d="M 130 145 Q 155 138 178 137" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="155" y="128" textAnchor="middle" fill="#a5b4fc" fontSize="9">Init</text>
          <path d="M 300 137 Q 330 135 358 137" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrYellow)" />
          <text x="330" y="127" textAnchor="middle" fill="#fbbf24" fontSize="9">Next URL</text>
          <path d="M 480 120 Q 510 95 538 82" fill="none" stroke="#EF4444" strokeWidth="1.5" markerEnd="url(#arrPurple)" />
          <text x="518" y="93" fill="#ef4444" fontSize="9">HTML</text>
          <path d="M 600 112 Q 602 145 602 173" fill="none" stroke="#8B5CF6" strokeWidth="1.5" markerEnd="url(#arrPurple)" />
          <text x="622" y="148" fill="#a5b4fc" fontSize="9">New URLs</text>
          <path d="M 540 205 Q 380 260 250 178" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrGreen)" />
          <text x="380" y="248" fill="#34d399" fontSize="9">Unique URLs 返回隊列</text>
          <path d="M 480 148 Q 600 155 718 142" fill="none" stroke="#EC4899" strokeWidth="1.5" markerEnd="url(#arrPink)" />
          <text x="600" y="165" fill="#EC4899" fontSize="9">Save</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>成個流程一覽</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>首先，準備一組 Seed URLs（初始網址列表），建議揀高質量嘅起點，放入 URL Frontier（待爬隊列）。</span></li>
        <li><span className="step-num">2</span><span>然後 Fetcher（多個 Worker）從 Frontier 攞 URL，下載網頁內容。重點係，Worker 數量直接影響爬取速度。</span></li>
        <li><span className="step-num">3</span><span>HTML Parser 負責解析網頁，提取出入面嘅所有連結。呢度要處理好各種 edge case，例如 relative URL、redirect 等。</span></li>
        <li><span className="step-num">4</span><span>新連結經過 Dedup 模組（Bloom Filter 去重）過濾。原理係：Bloom Filter 用好少記憶體就可以判斷 URL 有冇見過，非常高效。</span></li>
        <li><span className="step-num">5</span><span>唯一嘅新連結放返 URL Frontier，形成循環。同時，下載嘅內容存入 Storage，之後做 indexing。</span></li>
      </ol>

      <div className="key-points" style={{ marginTop: 24 }}>
        <div className="key-point">
          <h4>BFS 策略</h4>
          <p>建議用 Breadth-First Search（廣度優先搜索）遍歷網頁，一層一層咁爬。咁樣可以確保先爬到重要嘅頁面，唔會一頭扎得太深。</p>
        </div>
        <div className="key-point">
          <h4>Bloom Filter 去重</h4>
          <p>呢個係一個超省記憶體嘅數據結構，實戰中非常好用。可以快速判斷一個 URL 有冇爬過。要留意，可能有極小概率嘅 false positive，但唔會有 false negative——呢個 trade-off 係值得嘅。</p>
        </div>
        <div className="key-point">
          <h4>robots.txt 禮貌規則</h4>
          <p>每個網站嘅 robots.txt 指定咗邊啲頁面可以爬、邊啲唔可以。設計爬蟲一定要遵守呢啲規則，同埋控制爬取速率——唔好打爆人哋 Server，呢個係基本禮儀。</p>
        </div>
        <div className="key-point">
          <h4>並行爬取</h4>
          <p>用多個 Worker 同時爬取唔同嘅 URL。但要注意，同一個 domain 嘅請求要限速（例如每秒最多 1 次），呢個就係 Politeness Policy。違反嘅話會被 ban IP。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>核心重點</h4>
        <p>Google 嘅爬蟲每日爬超過 100 億個網頁，建立嘅索引包含超過 5000 億個頁面。呢個規模嘅系統需要數千台 Server 同時運作。設計嘅時候，要從小規模開始諗，但架構要可以 scale up。</p>
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
        <h4>Prompt 1 — Build 一個 Web Crawler 系統</h4>
        <div className="prompt-text">
          {`幫手設計同實作一個 Web Crawler 系統，目標係爬取 [目標網站類型，例如：新聞網站、電商產品頁、技術文檔] 嘅內容。

技術棧：[技術棧，例如：Python + Scrapy / Node.js + Puppeteer / Go + Colly]
爬取規模：[預計爬取量，例如：每日 10 萬個頁面]
存儲方式：[MongoDB / Elasticsearch / S3]

要求：
1. 設計完整嘅爬蟲架構：URL Frontier、Fetcher、Parser、Dedup、Storage
2. 實現 BFS 遍歷策略，支持 URL 優先級排序
3. 用 Bloom Filter 做 URL 去重，避免重複爬取
4. 遵守 robots.txt 規則，實現 Politeness Policy（同域名限速）
5. 處理 JavaScript 渲染嘅頁面（SSR vs Headless Browser）
6. 加入錯誤處理同 retry 機制
7. 提供完整嘅代碼同 Docker Compose 部署配置`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Crawler Politeness 同 Rate Limiting</h4>
        <div className="prompt-text">
          {`設計一個 Web Crawler 嘅 Politeness 同 Rate Limiting 模組：

爬取目標：[目標網站數量同類型，例如：1000 個唔同 domain 嘅網站]
爬取頻率要求：[例如：同一 domain 每秒最多 1 個請求]

要求：
1. 設計 per-domain rate limiter，用 Token Bucket 或 Sliding Window 算法
2. 實現 robots.txt parser，自動讀取同遵守每個網站嘅規則
3. 設計 crawl delay 機制，根據 robots.txt 嘅 Crawl-delay 指令
4. 處理 HTTP 429 (Too Many Requests) 同 503 嘅 backoff 策略
5. 實現 User-Agent rotation 同 IP rotation（如果需要）
6. 設計 priority queue，對重要嘅 URL 優先爬取
7. 加入 monitoring dashboard，顯示每個 domain 嘅爬取狀態同速率`}
        </div>
      </div>
    </div>
  );
}

export default function WebCrawler() {
  return (
    <>
      <TopicTabs
        title="Web Crawler 網頁爬蟲系統"
        subtitle="大規模爬蟲設計全解：BFS、Politeness 同去重策略"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'ai-viber', label: '② AI Viber', content: <AIViberTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
