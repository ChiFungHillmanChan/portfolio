import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Web Scraping 同 Web Crawling 嘅核心分別係咩？',
    options: [
      { text: 'Scraping 用 Python，Crawling 用 Java', correct: false, explanation: '兩者都可以用任何語言實現，程式語言唔係核心分別' },
      { text: 'Scraping 係針對已知 URL 提取特定資料；Crawling 係探索未知頁面建立地圖', correct: true, explanation: 'Scraping 目標明確——已經知道去邊度攞咩資料。Crawling 係探索性質——從種子 URL 開始四圍搵連結，建立網站地圖或索引' },
      { text: 'Scraping 係合法嘅，Crawling 係違法嘅', correct: false, explanation: '兩者都可以合法使用。Crawling 甚至係被歡迎嘅（有助 SEO）。關鍵係遵守 robots.txt 同控制請求速率' },
      { text: 'Scraping 只可以攞文字，Crawling 可以攞圖片', correct: false, explanation: '兩者都可以提取任何類型嘅內容，唔限於文字或圖片' },
    ],
  },
  {
    question: '以下邊個場景最適合用 Web Scraping？',
    options: [
      { text: '建立一個搜尋引擎嘅索引', correct: false, explanation: '搜尋引擎索引需要探索成個互聯網嘅未知頁面，呢個係 Crawling 嘅典型應用' },
      { text: '每日追蹤 Amazon 上面某幾個產品嘅價錢變化', correct: true, explanation: '已經有明確嘅產品 URL，目標係提取特定嘅價錢資料——呢個完全係 Scraping 嘅經典用例' },
      { text: '發現一個網站入面所有嘅頁面', correct: false, explanation: '發現未知頁面係 Crawling 嘅核心功能，唔係 Scraping' },
      { text: '建立網站嘅 sitemap', correct: false, explanation: '建立 sitemap 需要遍歷整個網站嘅連結結構，呢個係 Crawling 做嘅嘢' },
    ],
  },
  {
    question: '點解網站擁有者通常歡迎 Web Crawling？',
    options: [
      { text: '因為 Crawler 會幫佢哋修復網站 bug', correct: false, explanation: 'Crawler 只係爬取同記錄網頁內容，唔會修改任何嘢' },
      { text: '因為畀 Google 等搜尋引擎爬到就代表有機會出現喺搜尋結果，帶來流量', correct: true, explanation: '網站需要被搜尋引擎 Crawler 爬到先可以被索引。被索引 = 出現喺搜尋結果 = 帶來免費流量。所以好多網站主動提供 sitemap.xml 方便 Crawler' },
      { text: '因為 Crawler 會付費使用佢哋嘅 API', correct: false, explanation: 'Crawler 通常直接爬取公開嘅 HTML 頁面，唔需要付費' },
      { text: '因為法律規定必須允許 Crawling', correct: false, explanation: '網站可以透過 robots.txt 限制 Crawling。歡迎 Crawling 主要係出於商業考量（SEO）' },
    ],
  },
  {
    question: '實際項目中，Scraping 同 Crawling 最強嘅用法係咩？',
    options: [
      { text: '永遠只用其中一種就夠', correct: false, explanation: '好多實際項目需要兩者結合先可以達到最佳效果' },
      { text: '先用 Crawling 發現頁面 URL，再用 Scraping 針對性提取每個頁面嘅資料', correct: true, explanation: '例如：先 Crawl 一個電商網站發現所有產品頁面嘅 URL，然後 Scrape 每個產品頁面提取價錢同評論。兩者結合先係最強嘅策略' },
      { text: '同時用兩種會被網站 ban 得更快', correct: false, explanation: '被 ban 嘅原因係請求速率太高，同用一種定兩種技術冇直接關係。控制好速率就唔會有問題' },
      { text: '兩種技術已經過時，應該用 AI 取代', correct: false, explanation: 'Scraping 同 Crawling 仍然係數據收集嘅核心技術。AI 可以增強佢哋（例如智能解析），但唔會取代' },
    ],
  },
  {
    question: '無論做 Scraping 定 Crawling，最重要嘅禮儀規則係咩？',
    options: [
      { text: '只喺禮拜日爬取', correct: false, explanation: '冇呢個約定俗成。控制請求速率同遵守 robots.txt 先係重點' },
      { text: '遵守 robots.txt 規則同控制請求速率，唔好打爆人哋 Server', correct: true, explanation: 'robots.txt 指明邊啲頁面可以爬、邊啲唔可以。控制速率（例如每個 domain 每秒 1-2 次）防止被當成 DDoS 攻擊。呢兩個係最基本嘅禮儀' },
      { text: '每次爬取前要發 email 通知網站管理員', correct: false, explanation: '唔需要逐次通知。只要遵守 robots.txt 同控制速率就已經足夠' },
      { text: '用 VPN 隱藏自己嘅 IP 地址', correct: false, explanation: '用 VPN 隱藏身份唔係禮儀，反而可能被視為可疑行為。正當嘅爬蟲通常會設定清晰嘅 User-Agent 表明身份' },
    ],
  },
];

const relatedTopics = [
  { slug: 'web-crawler', label: 'Web Crawler 網頁爬蟲' },
  { slug: 'ai-scraper-defense', label: '防禦 AI 爬蟲' },
  { slug: 'rate-limiter', label: 'Rate Limiter 限流器' },
];

function ScrapingTab() {
  return (
    <div className="card">
      <h2>Web Scraping 網頁抓取</h2>
      <div className="subtitle">已經知道網址，只想提取特定資料</div>
      <p>
        以下介紹 Web Scraping 呢個技術。簡單講，Scraping 就係當<strong>已經知道網址</strong>嘅時候，去嗰個網頁度<strong>提取想要嘅特定資料</strong>。
      </p>
      <p>
        舉個例——假設需要每日追蹤 Amazon 上面廁紙嘅價錢。已經有個 product URL，唔需要喺成個 Amazon 度搵，只係想攞嗰個價錢。呢個就係 Scraping 嘅典型應用。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 850 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1f1a10" />
            </linearGradient>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#172033" />
            </linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1c1530" />
            </linearGradient>
            <linearGradient id="gradPink" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#25132a" />
            </linearGradient>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
            </marker>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" />
            </marker>
          </defs>

          <text x="425" y="25" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="700">Web Scraping 流程</text>

          <g transform="translate(40,80)">
            <rect width="140" height="70" rx="14" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Known URL</text>
            <text x="70" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">已知網址</text>
            <text x="70" y="62" textAnchor="middle" fill="#6366f1" fontSize="9">amazon.com/toilet-paper</text>
          </g>

          <g transform="translate(240,80)">
            <rect width="150" height="70" rx="14" fill="url(#gradAmber)" stroke="#f59e0b" strokeWidth="2" filter="url(#glowAmber)" />
            <text x="75" y="28" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="700">Scraper</text>
            <text x="75" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">解析網頁</text>
            <text x="75" y="62" textAnchor="middle" fill="#fbbf24" fontSize="9">BeautifulSoup / Scrapy</text>
          </g>

          <g transform="translate(450,80)">
            <rect width="150" height="70" rx="14" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Extract Data</text>
            <text x="75" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">提取目標資料</text>
            <text x="75" y="62" textAnchor="middle" fill="#a78bfa" fontSize="9">價格 / 評論 / 庫存</text>
          </g>

          <g transform="translate(660,80)">
            <rect width="140" height="70" rx="14" fill="url(#gradPink)" stroke="#EC4899" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="28" textAnchor="middle" fill="#EC4899" fontSize="12" fontWeight="700">Storage</text>
            <text x="70" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">儲存數據</text>
            <text x="70" y="62" textAnchor="middle" fill="#f9a8d4" fontSize="9">Database / CSV</text>
          </g>

          <path d="M 180 115 Q 210 115 238 115" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="210" y="105" textAnchor="middle" fill="#a5b4fc" fontSize="9">Visit</text>

          <path d="M 390 115 Q 420 115 448 115" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrAmber)" />
          <text x="420" y="105" textAnchor="middle" fill="#fbbf24" fontSize="9">Parse</text>

          <path d="M 600 115 Q 630 115 658 115" fill="none" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrPurple)" />
          <text x="630" y="105" textAnchor="middle" fill="#a78bfa" fontSize="9">Save</text>

          <path d="M 730 150 Q 730 230 110 230 Q 110 180 110 152" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrBlue)" />
          <text x="425" y="252" textAnchor="middle" fill="#34d399" fontSize="10">每日定時執行（例：每朝 8 點）</text>

          <g transform="translate(180,190)">
            <rect width="490" height="32" rx="8" fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth="1" />
            <text x="245" y="21" textAnchor="middle" fill="#c0c4cc" fontSize="10">
              用例：追蹤競爭對手價格、監控庫存、收集產品評論
            </text>
          </g>
        </svg>
      </div>

      <h3>Scraping 嘅步驟</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>已經有目標 URL——例如某個產品頁、某個新聞網站嘅文章頁。</span></li>
        <li><span className="step-num">2</span><span>用 Scraper 工具（例如 Python 嘅 BeautifulSoup、Scrapy）去攞呢個網頁嘅 HTML。</span></li>
        <li><span className="step-num">3</span><span>解析 HTML，提取需要嘅特定資料——可能係價錢、標題、日期、評論等等。</span></li>
        <li><span className="step-num">4</span><span>將數據儲存落 Database、CSV 或者其他格式，方便之後分析。</span></li>
        <li><span className="step-num">5</span><span>設定定時執行（例如每日跑一次），持續收集數據。</span></li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>目標明確</h4>
          <p>Scraping 嘅重點係已經知道去邊度攞資料，目標非常清晰——唔係亂爬，係針對性提取。</p>
        </div>
        <div className="key-point">
          <h4>常見用例</h4>
          <p>價格監控、競爭對手分析、新聞聚合、房地產資料收集、股票資訊追蹤等等。</p>
        </div>
        <div className="key-point">
          <h4>工具選擇</h4>
          <p>Python 生態系統最豐富：BeautifulSoup（簡單）、Scrapy（專業）、Selenium（處理 JavaScript）。</p>
        </div>
        <div className="key-point">
          <h4>法律風險</h4>
          <p>Scraping 通常係合法嘅，但要小心：唔好賣人哋嘅數據、唔好打爆人哋 Server、留意 Terms of Service。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>真實案例：價格追蹤</h4>
        <p>好多電商比價網站（例如 CamelCamelCamel 追蹤 Amazon 價格）就係用 Scraping 技術。佢哋每日去指定嘅產品頁面，提取價錢，然後記錄低嚟畫圖。用戶就可以睇到價格變化歷史，知道幾時買最抵。</p>
      </div>
    </div>
  );
}

function CrawlingTab() {
  return (
    <div className="card">
      <h2>Web Crawling 網頁爬行</h2>
      <div className="subtitle">唔知有咩網址，要探索同建立網站地圖</div>
      <p>
        Web Crawling 就完全唔同。Crawling 係關於<strong>可發現性（Discoverability）</strong>——去到一個網站，唔知入面有咩，於是四圍戳、搵連結、跟住連結去新頁面、再搵更多連結。最後就可以建立出<strong>成個網站嘅地圖</strong>。
      </p>
      <p>
        Google 做嘅就係呢樣嘢。Google 嘅 Crawler（叫 Googlebot）會從一組種子 URL 開始，不斷爬、不斷發現新網頁，建立一個包含幾千億個頁面嘅索引。呢個索引就係用 Google Search 嘅時候搵到結果嘅基礎。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 850 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowCrawl" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#34d399" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#13251e" />
            </linearGradient>
            <linearGradient id="gradBlueCrawl" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#172033" />
            </linearGradient>
            <linearGradient id="gradRedCrawl" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#251318" />
            </linearGradient>
            <linearGradient id="gradYellow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1f1e10" />
            </linearGradient>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#34d399" />
            </marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" />
            </marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#ef4444" />
            </marker>
          </defs>

          <text x="425" y="25" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">Web Crawling 流程 — 探索同建立地圖</text>

          <g transform="translate(350,70)">
            <rect width="150" height="70" rx="14" fill="url(#gradBlueCrawl)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowCrawl)" />
            <text x="75" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Seed URL</text>
            <text x="75" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">起始點</text>
            <text x="75" y="62" textAnchor="middle" fill="#6366f1" fontSize="9">example.com</text>
          </g>

          <g transform="translate(350,180)">
            <rect width="150" height="70" rx="14" fill="url(#gradGreen)" stroke="#34d399" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="75" y="28" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Crawler</text>
            <text x="75" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">探索網頁</text>
            <text x="75" y="62" textAnchor="middle" fill="#6ee7b7" fontSize="9">Follow Links</text>
          </g>

          <g transform="translate(60,280)">
            <rect width="120" height="60" rx="14" fill="url(#gradYellow)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadowCrawl)" />
            <text x="60" y="25" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">URL A</text>
            <text x="60" y="44" textAnchor="middle" fill="#9ca3af" fontSize="9">/about</text>
          </g>

          <g transform="translate(220,280)">
            <rect width="120" height="60" rx="14" fill="url(#gradYellow)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadowCrawl)" />
            <text x="60" y="25" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">URL B</text>
            <text x="60" y="44" textAnchor="middle" fill="#9ca3af" fontSize="9">/products</text>
          </g>

          <g transform="translate(380,280)">
            <rect width="120" height="60" rx="14" fill="url(#gradYellow)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadowCrawl)" />
            <text x="60" y="25" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">URL C</text>
            <text x="60" y="44" textAnchor="middle" fill="#9ca3af" fontSize="9">/blog</text>
          </g>

          <g transform="translate(540,280)">
            <rect width="120" height="60" rx="14" fill="url(#gradYellow)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadowCrawl)" />
            <text x="60" y="25" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">URL D</text>
            <text x="60" y="44" textAnchor="middle" fill="#9ca3af" fontSize="9">/contact</text>
          </g>

          <g transform="translate(670,180)">
            <rect width="130" height="70" rx="14" fill="url(#gradRedCrawl)" stroke="#ef4444" strokeWidth="2" filter="url(#shadowCrawl)" />
            <text x="65" y="28" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="700">Search Index</text>
            <text x="65" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">建立索引</text>
            <text x="65" y="62" textAnchor="middle" fill="#fca5a5" fontSize="9">Google Search</text>
          </g>

          <path d="M 425 140 Q 425 160 425 178" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="445" y="162" textAnchor="start" fill="#a5b4fc" fontSize="9">Start</text>

          <path d="M 425 250 Q 200 270 120 288" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <path d="M 410 250 Q 280 268 280 278" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <path d="M 440 250 Q 440 268 440 278" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <path d="M 450 250 Q 600 270 600 278" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <text x="425" y="267" textAnchor="middle" fill="#6ee7b7" fontSize="9">Discover Links</text>

          <path d="M 500 215 Q 600 215 668 215" fill="none" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrRed)" />
          <text x="585" y="207" textAnchor="middle" fill="#fca5a5" fontSize="9">Build Index</text>

          <path d="M 180 308 Q 180 210 348 210" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrGreen)" />
          <path d="M 600 308 Q 600 210 502 210" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrGreen)" />
          <text x="120" y="248" textAnchor="middle" fill="#6ee7b7" fontSize="9">繼續爬</text>
          <text x="660" y="248" textAnchor="middle" fill="#6ee7b7" fontSize="9">繼續爬</text>
        </svg>
      </div>

      <h3>Crawling 嘅步驟</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>由一組 Seed URLs 開始——通常係高質量嘅起點，例如熱門網站首頁。</span></li>
        <li><span className="step-num">2</span><span>Crawler 打開第一個網頁，下載 HTML 內容。</span></li>
        <li><span className="step-num">3</span><span>{'解析 HTML，提取入面所有嘅連結（<a href="...">）。'}</span></li>
        <li><span className="step-num">4</span><span>將新發現嘅 URL 加入待爬隊列（通常用 BFS 策略——廣度優先搜索）。</span></li>
        <li><span className="step-num">5</span><span>重複步驟 2-4，不斷發現新頁面，建立網站地圖同索引。</span></li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>探索性質</h4>
          <p>Crawling 唔係針對特定資料，而係關於<strong>發現</strong>——去探索一個網站或者成個互聯網有咩內容。</p>
        </div>
        <div className="key-point">
          <h4>SEO 友好</h4>
          <p>網站擁有者通常會主動方便 Crawler——因為畀 Google 爬到就代表有機會出現喺搜尋結果度，帶來流量。所以會提供 sitemap.xml、優化 robots.txt。</p>
        </div>
        <div className="key-point">
          <h4>規模龐大</h4>
          <p>Google 嘅 Crawler 每日爬幾十億個網頁。呢種規模需要分佈式系統、去重機制（Bloom Filter）、禮貌策略（Politeness Policy）防止打爆人哋 Server。</p>
        </div>
        <div className="key-point">
          <h4>應用場景</h4>
          <p>搜尋引擎索引（Google、Bing）、檔案管理器（發現網站結構）、SEO 分析工具、監測網站變化等等。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>真實案例：Google Search</h4>
        <p>當喺 Google Search 打「廣東話教學」，Google 點知有邊啲網頁包含呢個關鍵字？就係因為 Googlebot 爬過成個互聯網，建立咗一個包含幾千億個頁面嘅索引。每次搜尋其實係喺呢個索引度搵，唔係即時去爬網站——咁樣先可以做到毫秒級嘅回應速度。</p>
      </div>
    </div>
  );
}

function ComparisonTab() {
  return (
    <div className="card">
      <h2>分別同應用場景</h2>
      <div className="subtitle">兩者目的完全唔同，但都好有用</div>

      <div className="diagram-container">
        <svg viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowComp" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
          </defs>

          <text x="400" y="30" textAnchor="middle" fill="#9ca3af" fontSize="13" fontWeight="500">核心分別</text>

          <g transform="translate(50,60)">
            <rect width="320" height="40" rx="8" fill="rgba(245,158,11,0.12)" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="160" y="26" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="700">Web Scraping</text>
          </g>

          <g transform="translate(430,60)">
            <rect width="320" height="40" rx="8" fill="rgba(52,211,153,0.12)" stroke="#34d399" strokeWidth="1.5" />
            <text x="160" y="26" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">Web Crawling</text>
          </g>

          <g transform="translate(50,120)">
            <rect width="320" height="70" rx="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" filter="url(#shadowComp)" />
            <text x="160" y="22" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="600">目標</text>
            <text x="160" y="42" textAnchor="middle" fill="#c0c4cc" fontSize="11">提取特定資料</text>
            <text x="160" y="60" textAnchor="middle" fill="#9ca3af" fontSize="10">已經知道去邊度攞咩</text>
          </g>
          <g transform="translate(430,120)">
            <rect width="320" height="70" rx="10" fill="#1e293b" stroke="#34d399" strokeWidth="1" filter="url(#shadowComp)" />
            <text x="160" y="22" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="600">目標</text>
            <text x="160" y="42" textAnchor="middle" fill="#c0c4cc" fontSize="11">探索同建立地圖</text>
            <text x="160" y="60" textAnchor="middle" fill="#9ca3af" fontSize="10">唔知有咩，要去發現</text>
          </g>

          <text x="400" y="160" textAnchor="middle" fill="#4b5563" fontSize="11">vs</text>

          <g transform="translate(50,210)">
            <rect width="320" height="70" rx="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" filter="url(#shadowComp)" />
            <text x="160" y="22" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="600">範圍</text>
            <text x="160" y="42" textAnchor="middle" fill="#c0c4cc" fontSize="11">單一或少量已知 URL</text>
            <text x="160" y="60" textAnchor="middle" fill="#9ca3af" fontSize="10">精準打擊，針對性強</text>
          </g>
          <g transform="translate(430,210)">
            <rect width="320" height="70" rx="10" fill="#1e293b" stroke="#34d399" strokeWidth="1" filter="url(#shadowComp)" />
            <text x="160" y="22" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="600">範圍</text>
            <text x="160" y="42" textAnchor="middle" fill="#c0c4cc" fontSize="11">整個網站或互聯網</text>
            <text x="160" y="60" textAnchor="middle" fill="#9ca3af" fontSize="10">廣泛探索，建立索引</text>
          </g>

          <text x="400" y="250" textAnchor="middle" fill="#4b5563" fontSize="11">vs</text>

          <g transform="translate(50,300)">
            <rect width="320" height="70" rx="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" filter="url(#shadowComp)" />
            <text x="160" y="22" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="600">用例</text>
            <text x="160" y="42" textAnchor="middle" fill="#c0c4cc" fontSize="11">價格監控 / 數據分析</text>
            <text x="160" y="60" textAnchor="middle" fill="#9ca3af" fontSize="10">競爭對手研究、新聞聚合</text>
          </g>
          <g transform="translate(430,300)">
            <rect width="320" height="70" rx="10" fill="#1e293b" stroke="#34d399" strokeWidth="1" filter="url(#shadowComp)" />
            <text x="160" y="22" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="600">用例</text>
            <text x="160" y="42" textAnchor="middle" fill="#c0c4cc" fontSize="11">搜尋引擎索引 / SEO</text>
            <text x="160" y="60" textAnchor="middle" fill="#9ca3af" fontSize="10">網站地圖、內容發現</text>
          </g>

          <text x="400" y="340" textAnchor="middle" fill="#4b5563" fontSize="11">vs</text>

          <text x="210" y="400" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="500">針對性提取</text>
          <text x="590" y="400" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="500">探索性建圖</text>
        </svg>
      </div>

      <table className="compare-table">
        <thead>
          <tr>
            <th></th>
            <th>Web Scraping</th>
            <th>Web Crawling</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="label">目標</td>
            <td>提取特定資料（價錢、標題、評論等）</td>
            <td>發現同建立網站地圖</td>
          </tr>
          <tr>
            <td className="label">URL 來源</td>
            <td>已知 URL</td>
            <td>從 Seed URL 開始探索</td>
          </tr>
          <tr>
            <td className="label">資料範圍</td>
            <td>精準提取指定欄位</td>
            <td>收集所有可發現頁面</td>
          </tr>
          <tr>
            <td className="label">執行頻率</td>
            <td>定期執行（例：每日一次）</td>
            <td>持續運行、不斷探索</td>
          </tr>
          <tr>
            <td className="label">技術複雜度</td>
            <td>相對簡單（HTML 解析）</td>
            <td>複雜（分佈式系統、去重、禮貌策略）</td>
          </tr>
          <tr>
            <td className="label">法律考量</td>
            <td>通常合法，但唔好賣數據</td>
            <td>網站擁有者通常歡迎（有助 SEO）</td>
          </tr>
          <tr>
            <td className="label">常用工具</td>
            <td>BeautifulSoup, Scrapy, Selenium</td>
            <td>Scrapy（爬蟲模式）、自訂 Crawler</td>
          </tr>
          <tr>
            <td className="label">典型應用</td>
            <td>比價網站、數據分析、監控系統</td>
            <td>Google Search、SEO 工具、檔案管理器</td>
          </tr>
        </tbody>
      </table>

      <h3>法律同道德考量</h3>
      <div className="key-points">
        <div className="key-point">
          <h4>Scraping 嘅灰色地帶</h4>
          <p>提取公開資料通常冇問題，但賣人哋嘅數據可能會有法律風險。要留意 Terms of Service（服務條款）——有啲網站明確禁止 Scraping。</p>
        </div>
        <div className="key-point">
          <h4>Crawling 同 SEO</h4>
          <p>網站擁有者通常<strong>歡迎</strong> Crawling——因為畀 Google 爬到就代表可以出現喺搜尋結果度。所以會提供 sitemap.xml、優化網站結構、遵守 robots.txt 標準。</p>
        </div>
        <div className="key-point">
          <h4>禮貌爬取</h4>
          <p>無論 Scraping 定 Crawling，都要<strong>控制請求速率</strong>——唔好每秒打幾十次人哋 Server，咁會被當成 DDoS 攻擊。建議每個 domain 每秒最多 1-2 次請求。</p>
        </div>
        <div className="key-point">
          <h4>遵守 robots.txt</h4>
          <p>每個網站嘅 /robots.txt 檔案會指明邊啲路徑可以爬、邊啲唔可以。呢個係行業標準，一定要遵守——唔係會被 ban IP。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>實戰建議</h4>
        <p>好多時候，一個項目會<strong>同時用到</strong>兩種技術。例如：先用 Crawling 去發現一個電商網站有邊啲產品頁面（建立 URL 列表），然後用 Scraping 去針對性提取每個產品嘅價錢同評論。兩者結合先係最強。</p>
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
        <h4>Prompt 1 — 建立 Web Scraper 提取特定數據</h4>
        <div className="prompt-text">
          {'幫我用 Python 寫一個 web scraper，從 '}<span className="placeholder">[目標網站，例如：某個電商網站 / 新聞網站 / 房地產平台]</span>{' 提取以下數據：\n\n'}
          {'目標數據：'}<span className="placeholder">[例如：產品名稱、價格、評論數、評分 / 文章標題、日期、內容摘要]</span>{'\n\n'}
          {'要求：\n'}
          {'- 用 requests + BeautifulSoup 做基本 scraping\n'}
          {'- 如果網頁有 JavaScript rendering，用 Playwright 處理\n'}
          {'- 加入 rate limiting（每次請求之間等 2-3 秒）\n'}
          {'- 處理 pagination（自動翻頁抓取所有結果）\n'}
          {'- 加入 error handling 同 retry 機制\n'}
          {'- 將結果儲存到 CSV 同 SQLite database\n'}
          {'- 加入 User-Agent rotation 避免被 block\n'}
          {'- 遵守 robots.txt 規則'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計合規嘅 Web Crawling 系統</h4>
        <div className="prompt-text">
          {'幫我設計一個合規嘅 web crawling 系統，用嚟探索 '}<span className="placeholder">[目標範圍，例如：某個特定 domain 嘅所有頁面 / 某個行業嘅相關網站]</span>{'。\n\n'}
          {'要求：\n'}
          {'- 用 Python + Scrapy framework\n'}
          {'- 實作 BFS（廣度優先搜索）爬取策略\n'}
          {'- 自動解析頁面中嘅所有連結，加入待爬隊列\n'}
          {'- 用 Bloom Filter 或 Set 做 URL 去重\n'}
          {'- 實作 Politeness Policy：遵守 robots.txt、每個 domain 每秒最多 1 次請求\n'}
          {'- 設定最大爬取深度同頁面數量上限\n'}
          {'- 儲存爬取結果（URL、標題、meta description）到 database\n'}
          {'- 加入 logging 同進度追蹤\n'}
          {'- 輸出 sitemap（XML 格式）'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 定時價格監控 Scraper</h4>
        <div className="prompt-text">
          {'幫我建立一個定時執行嘅價格監控 scraper。\n\n'}
          {'監控目標：'}<span className="placeholder">[例如：Amazon 上面某幾個產品 / 機票價格 / 加密貨幣交易所價格]</span>{'\n\n'}
          {'要求：\n'}
          {'- 用 Python 寫 scraper，提取產品名同價格\n'}
          {'- 設定 cron job 每日定時執行（例如每朝 9 點）\n'}
          {'- 將每次抓取嘅價格記錄到 SQLite database（包括 timestamp）\n'}
          {'- 當價格跌破指定閾值，發送通知（用 '}<span className="placeholder">[Email / Telegram Bot / Discord Webhook]</span>{'）\n'}
          {'- 用 matplotlib 生成價格走勢圖\n'}
          {'- 加入 Docker 部署方案，方便喺 server 上面長期跑'}
        </div>
      </div>
    </div>
  );
}

export default function ScrapingVsCrawling() {
  return (
    <>
      <TopicTabs
        title="Web Scraping vs Crawling"
        subtitle="提取數據定探索地圖？兩種技術嘅目的、做法同法律考量"
        tabs={[
          { id: 'scraping', label: '① Web Scraping', content: <ScrapingTab /> },
          { id: 'crawling', label: '② Web Crawling', content: <CrawlingTab /> },
          { id: 'comparison', label: '③ 分別同應用', premium: true, content: <ComparisonTab /> },
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
