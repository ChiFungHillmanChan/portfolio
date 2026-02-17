import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'robots.txt 作為防禦 AI scraper 嘅第一道防線，最大嘅局限係咩？',
    options: [
      { text: '佢嘅檔案大小有限制', correct: false, explanation: '檔案大小唔係問題，robots.txt 通常好細' },
      { text: '佢只係一個「禮貌嘅請求」，冇強制力，惡意 scraper 可以完全無視', correct: true, explanation: '啱！robots.txt 只係一個約定，正規 crawler（如 Googlebot）會遵守，但惡意 AI scraper 可以直接忽略佢' },
      { text: '只有 Google 嘅 crawler 會讀', correct: false, explanation: '大部分正規 crawler 都會讀 robots.txt，唔止 Google' },
      { text: '需要付費先至可以用', correct: false, explanation: 'robots.txt 係免費嘅純文字檔案，任何人都可以建立' },
    ],
  },
  {
    question: '防禦 AI scraper 最有效嘅多層策略係咩？',
    options: [
      { text: '只靠 robots.txt 就夠', correct: false, explanation: 'robots.txt 冇強制力，必須配合其他技術手段' },
      { text: 'robots.txt + Rate Limiting + User Agent 偵測 + 行為分析 + CAPTCHA 嘅多層防禦', correct: true, explanation: '啱！有效嘅防禦需要多層：robots.txt 做第一層、Rate Limiting 限制頻率、UA 偵測已知 bot、行為分析搵出異常模式、CAPTCHA 做最後防線' },
      { text: '將整個網站關閉', correct: false, explanation: '關閉網站雖然有效但係最極端嘅做法，正常用戶都冇得用' },
      { text: '只允許登入用戶 access', correct: false, explanation: '對於需要 SEO 嘅公開內容，強制登入會影響搜尋引擎收錄' },
    ],
  },
  {
    question: '點樣分辨正常用戶同 AI scraper 嘅行為？',
    options: [
      { text: '睇佢哋用咩瀏覽器', correct: false, explanation: '瀏覽器可以偽造，User Agent 唔係可靠嘅唯一指標' },
      { text: '分析請求模式 — scraper 通常請求頻率極高、時間間隔固定、唔載入 CSS/JS/圖片', correct: true, explanation: '啱！正常用戶嘅瀏覽行為有隨機性，會載入完整頁面。Scraper 通常高頻率、時間規律、只攞 HTML 唔載入其他資源' },
      { text: '問佢係唔係 bot', correct: false, explanation: '任何 bot 都可以假裝自己係人類' },
      { text: '睇 IP 地址係邊個國家', correct: false, explanation: 'IP 地址位置唔能夠準確判斷係咪 scraper，因為 scraper 可以用任何地方嘅 proxy' },
    ],
  },
];

const relatedTopics = [
  { slug: 'scraping-vs-crawling', label: 'Web Scraping vs Crawling' },
  { slug: 'rate-limiter', label: 'Rate Limiter 限流器' },
  { slug: 'secure-ai-agents', label: '保護 AI Agent' },
  { slug: 'web-crawler', label: 'Web Crawler 網頁爬蟲' },
];

function RobotsTab() {
  return (
    <div className="card">
      <h2>robots.txt — 第一道防線</h2>
      <div className="subtitle">最基本嘅爬蟲管理機制，但有明顯局限</div>
      <p>
        robots.txt 係一個放喺網站根目錄嘅純文字檔案，用嚟告訴 Crawler 邊啲路徑可以爬、邊啲唔可以。常見嘅做法係將已知嘅 AI Scraper User Agent 加入 Disallow 清單，例如 GPTBot、CCBot、Google-Extended 等等。
      </p>
      <p>
        不過，關鍵在於 robots.txt 只係一個「禮貌嘅請求」——冇任何強制力。正規嘅 Crawler 會遵守，但惡意嘅 AI Scraper 可以完全無視。所以 robots.txt 只能作為第一道防線，絕對唔可以當做唯一嘅防護措施。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="sh1" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <linearGradient id="gradInd1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#252840" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradGrn1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2e28" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradRed1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a1a1a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradAmb1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a2518" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <marker id="arr1i" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
            <marker id="arr1g" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#34d399" />
            </marker>
            <marker id="arr1r" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#f87171" />
            </marker>
            <marker id="arr1a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
            </marker>
          </defs>

          <text x="400" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">Crawler 請求 robots.txt 檢查流程</text>

          <g transform="translate(40,60)">
            <rect width="150" height="70" rx="14" fill="url(#gradInd1)" stroke="#6366f1" strokeWidth="2" filter="url(#sh1)" />
            <text x="75" y="25" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="700">AI Crawler</text>
            <text x="75" y="43" textAnchor="middle" fill="#9ca3af" fontSize="10">GPTBot / CCBot</text>
            <text x="75" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">等 AI Scraper</text>
          </g>

          <path d="M192,95 C230,95 260,95 290,95" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arr1i)" />
          <text x="240" y="85" textAnchor="middle" fill="#9ca3af" fontSize="9">請求網站內容</text>

          <g transform="translate(295,55)">
            <rect width="170" height="80" rx="14" fill="url(#gradAmb1)" stroke="#f59e0b" strokeWidth="2" filter="url(#sh1)" />
            <text x="85" y="22" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">robots.txt</text>
            <text x="85" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">User-agent: GPTBot</text>
            <text x="85" y="55" textAnchor="middle" fill="#9ca3af" fontSize="10">Disallow: /</text>
            <text x="85" y="70" textAnchor="middle" fill="#fbbf24" fontSize="9">檢查 User Agent...</text>
          </g>

          <path d="M467,75 C510,60 550,55 590,55" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arr1g)" />
          <text x="530" y="48" textAnchor="middle" fill="#34d399" fontSize="9">允許嘅 Crawler</text>

          <g transform="translate(595,30)">
            <rect width="170" height="55" rx="14" fill="url(#gradGrn1)" stroke="#34d399" strokeWidth="2" filter="url(#sh1)" />
            <text x="85" y="22" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">正常存取網站</text>
            <text x="85" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">Googlebot 等搜尋引擎</text>
          </g>

          <path d="M467,105 C510,120 550,130 590,130" stroke="#f87171" strokeWidth="2" fill="none" markerEnd="url(#arr1r)" />
          <text x="530" y="145" textAnchor="middle" fill="#f87171" fontSize="9">被封鎖嘅 AI Crawler</text>

          <g transform="translate(595,105)">
            <rect width="170" height="55" rx="14" fill="url(#gradRed1)" stroke="#f87171" strokeWidth="2" filter="url(#sh1)" />
            <text x="85" y="22" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="700">遵守規則，離開</text>
            <text x="85" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">正規 Bot 會尊重</text>
          </g>

          <g transform="translate(120,200)">
            <rect width="560" height="130" rx="14" fill="rgba(248,113,113,0.06)" stroke="#f87171" strokeWidth="1.5" />
            <text x="280" y="28" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">局限：惡意 Crawler 直接無視 robots.txt</text>

            <g transform="translate(30,48)">
              <rect width="230" height="60" rx="10" fill="url(#gradRed1)" stroke="#f87171" strokeWidth="1.5" filter="url(#sh1)" />
              <text x="115" y="22" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">惡意 AI Scraper</text>
              <text x="115" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">偽裝 User Agent</text>
              <text x="115" y="54" textAnchor="middle" fill="#9ca3af" fontSize="10">完全無視 Disallow 規則</text>
            </g>

            <path d="M262,78 C290,78 310,78 330,78" stroke="#f87171" strokeWidth="2" strokeDasharray="6,3" fill="none" markerEnd="url(#arr1r)" />
            <text x="296" y="70" textAnchor="middle" fill="#f87171" fontSize="9">直接爬</text>

            <g transform="translate(335,48)">
              <rect width="195" height="60" rx="10" fill="rgba(248,113,113,0.1)" stroke="#f87171" strokeWidth="1.5" />
              <text x="97" y="22" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">網站內容被偷走</text>
              <text x="97" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">robots.txt 完全冇用</text>
              <text x="97" y="54" textAnchor="middle" fill="#f87171" fontSize="9">需要更強嘅防禦</text>
            </g>
          </g>
        </svg>
      </div>

      <h3>robots.txt 使用步驟</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>建立 robots.txt 檔案</strong>——放喺網站根目錄（例如 example.com/robots.txt），列出所有已知嘅 AI Scraper User Agent。</span></li>
        <li><span className="step-num">2</span><span><strong>設定 Disallow 規則</strong>——對每個 AI Bot 嘅 User Agent 設定 <code>Disallow: /</code>，禁止存取所有路徑。</span></li>
        <li><span className="step-num">3</span><span><strong>持續更新清單</strong>——新嘅 AI Scraper 不斷出現，要定期更新 robots.txt 入面嘅 User Agent 清單。</span></li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>優點</h4>
          <p>設定簡單、零成本、所有正規 Crawler 都會遵守。係最基本嘅防禦起點。</p>
        </div>
        <div className="key-point">
          <h4>局限</h4>
          <p>冇強制力，惡意 Bot 可以偽裝 User Agent 或者直接無視規則。唔可以單靠呢個。</p>
        </div>
        <div className="key-point">
          <h4>適用場景</h4>
          <p>阻擋已知嘅、有名嘅 AI Crawler（例如 GPTBot、CCBot），減少正規渠道嘅爬取。</p>
        </div>
        <div className="key-point">
          <h4>要留意</h4>
          <p>robots.txt 係公開嘅，任何人都可以睇到封鎖咗邊啲路徑——等於告訴對方邊度有值得爬嘅內容。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>實際應用</h4>
        <p>robots.txt 只係防禦嘅第一步。重點係要配合後面嘅 Bot 偵測同 Honeypot 陷阱，形成多層防禦體系。單靠 robots.txt 就好似鎖門但唔關窗——有心嘅人一樣入到嚟。</p>
      </div>
    </div>
  );
}

function DetectionTab() {
  return (
    <div className="card">
      <h2>Bot 偵測 — 識別可疑訪客</h2>
      <div className="subtitle">透過多維度分析，分辨真人同 Bot</div>
      <p>
        當 robots.txt 攔唔住惡意 Crawler 嘅時候，就需要主動偵測。Bot 偵測嘅核心概念係透過分析 User Agent、IP 地址、同流量模式嚟判斷訪客係真人定係 Bot。一開始可能唔太準確，但隨住數據累積，偵測能力會越嚟越強。
      </p>
      <p>
        常見嘅偵測信號包括：異常高嘅請求頻率、已知嘅 Bot IP 範圍、缺少正常瀏覽器行為（例如唔會載入 CSS / JavaScript）、以及重複嘅存取模式。將呢啲信號綜合分析，就可以建立一個 Bot Profiler。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="sh2" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <linearGradient id="gradInd2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradAmb2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a2518" /><stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradGrn2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradRed2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a1a1a" /><stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <marker id="arr2i" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arr2a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arr2g" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arr2r" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>

          <text x="400" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">Bot 偵測 Pipeline — 多維度分析流程</text>

          <g transform="translate(30,55)">
            <rect width="130" height="65" rx="14" fill="url(#gradInd2)" stroke="#6366f1" strokeWidth="2" filter="url(#sh2)" />
            <text x="65" y="24" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="700">訪客請求</text>
            <text x="65" y="42" textAnchor="middle" fill="#9ca3af" fontSize="9">HTTP Request</text>
            <text x="65" y="55" textAnchor="middle" fill="#9ca3af" fontSize="9">進入偵測系統</text>
          </g>

          <path d="M162,87 C185,87 200,87 218,87" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arr2i)" />

          <g transform="translate(222,50)">
            <rect width="140" height="75" rx="14" fill="url(#gradAmb2)" stroke="#f59e0b" strokeWidth="2" filter="url(#sh2)" />
            <text x="70" y="20" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="700">Stage 1</text>
            <text x="70" y="36" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">User Agent</text>
            <text x="70" y="52" textAnchor="middle" fill="#9ca3af" fontSize="9">檢查 UA 字串</text>
            <text x="70" y="65" textAnchor="middle" fill="#9ca3af" fontSize="9">已知 Bot 名單</text>
          </g>

          <path d="M364,87 C385,87 400,87 418,87" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arr2a)" />

          <g transform="translate(422,50)">
            <rect width="140" height="75" rx="14" fill="url(#gradAmb2)" stroke="#f59e0b" strokeWidth="2" filter="url(#sh2)" />
            <text x="70" y="20" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="700">Stage 2</text>
            <text x="70" y="36" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">IP 分析</text>
            <text x="70" y="52" textAnchor="middle" fill="#9ca3af" fontSize="9">資料中心 IP？</text>
            <text x="70" y="65" textAnchor="middle" fill="#9ca3af" fontSize="9">VPN / Proxy？</text>
          </g>

          <path d="M564,87 C585,87 600,87 618,87" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arr2a)" />

          <g transform="translate(622,50)">
            <rect width="140" height="75" rx="14" fill="url(#gradAmb2)" stroke="#f59e0b" strokeWidth="2" filter="url(#sh2)" />
            <text x="70" y="20" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="700">Stage 3</text>
            <text x="70" y="36" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">流量模式</text>
            <text x="70" y="52" textAnchor="middle" fill="#9ca3af" fontSize="9">請求頻率 / 間隔</text>
            <text x="70" y="65" textAnchor="middle" fill="#9ca3af" fontSize="9">行為模式分析</text>
          </g>

          <g transform="translate(310,170)">
            <rect width="200" height="60" rx="14" fill="url(#gradInd2)" stroke="#818cf8" strokeWidth="2" filter="url(#sh2)" />
            <text x="100" y="22" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="700">Bot Profiler</text>
            <text x="100" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">綜合評分 → 判斷結果</text>
            <text x="100" y="54" textAnchor="middle" fill="#9ca3af" fontSize="9">Score Threshold 決定</text>
          </g>

          <path d="M292,127 C292,140 340,155 370,168" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
          <path d="M492,127 C492,140 450,155 430,168" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
          <path d="M692,127 C692,150 580,160 512,175" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />

          <path d="M360,232 C320,260 270,280 220,290" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arr2g)" />
          <text x="270" y="268" textAnchor="middle" fill="#34d399" fontSize="9">低風險</text>

          <g transform="translate(70,280)">
            <rect width="155" height="60" rx="14" fill="url(#gradGrn2)" stroke="#34d399" strokeWidth="2" filter="url(#sh2)" />
            <text x="77" y="22" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">真人</text>
            <text x="77" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">正常瀏覽行為</text>
            <text x="77" y="54" textAnchor="middle" fill="#34d399" fontSize="9">允許存取</text>
          </g>

          <path d="M460,232 C500,260 540,280 570,290" stroke="#f87171" strokeWidth="2" fill="none" markerEnd="url(#arr2r)" />
          <text x="530" y="268" textAnchor="middle" fill="#f87171" fontSize="9">高風險</text>

          <g transform="translate(565,280)">
            <rect width="155" height="60" rx="14" fill="url(#gradRed2)" stroke="#f87171" strokeWidth="2" filter="url(#sh2)" />
            <text x="77" y="22" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700">Bot</text>
            <text x="77" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">可疑嘅自動化行為</text>
            <text x="77" y="54" textAnchor="middle" fill="#f87171" fontSize="9">觸發防禦措施</text>
          </g>

          <g transform="translate(200,370)">
            <rect width="400" height="35" rx="10" fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="1" />
            <text x="200" y="22" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="600">每次判斷結果都會回饋到 Profiler，令偵測越嚟越準</text>
          </g>
          <path d="M642,342 C650,360 600,387 602,387" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4,3" fill="none" />
          <path d="M147,342 C140,360 200,387 198,387" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4,3" fill="none" />
        </svg>
      </div>

      <h3>偵測維度</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>User Agent 分析</strong>——檢查請求嘅 User Agent 字串，同已知嘅 Bot 名單比對。惡意 Bot 可能偽裝成正常瀏覽器，所以唔可以淨靠呢個。</span></li>
        <li><span className="step-num">2</span><span><strong>IP 地址分析</strong>——檢查 IP 係咪來自資料中心、VPN、或者已知嘅 Bot 網絡。真人通常用住宅 IP，Bot 通常用雲端 IP。</span></li>
        <li><span className="step-num">3</span><span><strong>流量模式分析</strong>——分析請求頻率、時間間隔、瀏覽路徑。Bot 通常會有規律性嘅存取模式，真人嘅行為會比較隨機。</span></li>
        <li><span className="step-num">4</span><span><strong>綜合評分</strong>——Bot Profiler 將以上所有信號綜合分析，計算出風險分數。超過 Threshold 就判定為 Bot。</span></li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>初期挑戰</h4>
          <p>一開始數據唔夠多，偵測準確率會比較低。關鍵在於持續收集數據，逐步改善 Profiler。</p>
        </div>
        <div className="key-point">
          <h4>越做越準</h4>
          <p>隨住時間推移，Bot Profiler 會累積越嚟越多嘅行為數據，偵測能力會顯著提升。</p>
        </div>
        <div className="key-point">
          <h4>多維度結合</h4>
          <p>單一維度容易被繞過。將 User Agent、IP、流量模式結合分析，先至可以提高準確率。</p>
        </div>
        <div className="key-point">
          <h4>誤判處理</h4>
          <p>要留意 False Positive（將真人誤判為 Bot）。建議設定合理嘅 Threshold，避免影響正常用戶。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>偵測之後點做？</h4>
        <p>識別到可疑訪客之後，唔一定要即刻封鎖。更聰明嘅做法係將佢導向 Honeypot 陷阱——呢個就係下一個 Tab 嘅內容。</p>
      </div>
    </div>
  );
}

function HoneypotTab() {
  return (
    <div className="card">
      <h2>Honeypot 陷阱 — Dungeon 迷宮</h2>
      <div className="subtitle">用假內容消耗 Bot 嘅時間、金錢同算力</div>
      <p>
        呢個係最精彩嘅防禦策略。核心概念係建造一個「Dungeon」（地牢）——由幾百甚至幾千頁睇起嚟好真實、但實際上毫無價值嘅靜態 HTML 頁面組成。當系統偵測到可疑嘅訪客，就會喺返回嘅頁面中注入隱形 Anchor Link。
      </p>
      <p>
        呢啲隱形連結正常人係唔會睇到、更加唔會點擊。但 Crawler 會自動跟隨頁面上所有連結——所以一旦 Bot 點擊咗呢啲隱形連結，就會被引入 Dungeon 入面，喺幾千頁假內容之間不斷爬取，浪費大量時間同計算資源。
      </p>
      <p>
        更重要嘅係：任何進入 Dungeon 嘅訪客幾乎可以確定係 Bot。呢啲數據可以回饋到 Bot Profiler，令將來嘅偵測更加精準。形成一個正向循環。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="sh3" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowHoney" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="7" result="blur" /><feFlood floodColor="#f59e0b" floodOpacity="0.35" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowDungeon" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="8" result="blur" /><feFlood floodColor="#ef4444" floodOpacity="0.4" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowFeedback" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradInd3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmb3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a2518" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGrn3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arr3i" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arr3a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arr3r" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
            <marker id="arr3g" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          <text x="400" y="28" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="700">Honeypot Dungeon 陷阱系統</text>

          <g transform="translate(30,55)">
            <rect width="155" height="70" rx="14" fill="url(#gradRed3)" stroke="#f87171" strokeWidth="2" filter="url(#sh3)" />
            <text x="77" y="22" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="700">可疑請求</text>
            <text x="77" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">Bot Profiler 標記</text>
            <text x="77" y="55" textAnchor="middle" fill="#9ca3af" fontSize="9">高風險訪客</text>
          </g>

          <path d="M187,90 C220,90 255,90 288,90" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arr3a)" />
          <text x="238" y="80" textAnchor="middle" fill="#f59e0b" fontSize="9">請求頁面</text>

          <g transform="translate(293,48)">
            <rect width="210" height="85" rx="14" fill="url(#gradAmb3)" stroke="#f59e0b" strokeWidth="2.5" filter="url(#glowHoney)" />
            <text x="105" y="22" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">返回頁面</text>
            <text x="105" y="40" textAnchor="middle" fill="#fbbf24" fontSize="10">（注入隱形連結）</text>
            <line x1="20" y1="50" x2="190" y2="50" stroke="#f59e0b" strokeWidth="0.5" opacity="0.4" />
            <text x="105" y="65" textAnchor="middle" fill="#9ca3af" fontSize="9">正常內容 + 隱藏嘅</text>
            <text x="105" y="78" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="600">Invisible Anchor Links</text>
          </g>

          <path d="M398,135 C398,160 330,180 260,190" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5,3" fill="none" markerEnd="url(#arr3g)" />
          <g transform="translate(160,185)">
            <rect width="105" height="35" rx="8" fill="rgba(52,211,153,0.1)" stroke="#34d399" strokeWidth="1" />
            <text x="52" y="14" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">真人睇唔到</text>
            <text x="52" y="27" textAnchor="middle" fill="#34d399" fontSize="8">唔會點擊</text>
          </g>

          <path d="M505,90 C540,90 570,90 598,90" stroke="#f87171" strokeWidth="2.5" fill="none" markerEnd="url(#arr3r)" />
          <text x="555" y="78" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">Bot 跟隨連結</text>

          <g transform="translate(603,42)">
            <rect width="170" height="95" rx="14" fill="url(#gradRed3)" stroke="#ef4444" strokeWidth="3" filter="url(#glowDungeon)" />
            <text x="85" y="22" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">Dungeon</text>
            <text x="85" y="40" textAnchor="middle" fill="#f87171" fontSize="10">（地牢迷宮）</text>
            <line x1="20" y1="50" x2="150" y2="50" stroke="#ef4444" strokeWidth="0.5" opacity="0.4" />
            <text x="85" y="65" textAnchor="middle" fill="#9ca3af" fontSize="9">幾百至幾千頁</text>
            <text x="85" y="80" textAnchor="middle" fill="#9ca3af" fontSize="9">真實但無用嘅內容</text>
          </g>

          <g transform="translate(555,170)">
            <rect width="220" height="100" rx="12" fill="rgba(239,68,68,0.06)" stroke="#ef4444" strokeWidth="1.5" />
            <text x="110" y="22" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">Dungeon 內部結構</text>
            <g transform="translate(15,35)">
              <rect width="55" height="30" rx="6" fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="0.8" />
              <text x="27" y="19" textAnchor="middle" fill="#9ca3af" fontSize="7">假頁面 A</text>
            </g>
            <g transform="translate(82,35)">
              <rect width="55" height="30" rx="6" fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="0.8" />
              <text x="27" y="19" textAnchor="middle" fill="#9ca3af" fontSize="7">假頁面 B</text>
            </g>
            <g transform="translate(149,35)">
              <rect width="55" height="30" rx="6" fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="0.8" />
              <text x="27" y="19" textAnchor="middle" fill="#9ca3af" fontSize="7">假頁面 C</text>
            </g>
            <path d="M42,68 C55,78 75,78 90,68" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,2" fill="none" />
            <path d="M110,68 C125,78 145,78 162,68" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,2" fill="none" />
            <path d="M42,68 C75,85 145,85 176,68" stroke="#ef4444" strokeWidth="0.6" strokeDasharray="3,2" fill="none" opacity="0.5" />
            <text x="110" y="95" textAnchor="middle" fill="#f87171" fontSize="8">頁面互相連結，Bot 走唔出嚟</text>
          </g>

          <g transform="translate(150,310)">
            <rect width="260" height="80" rx="14" fill="url(#gradInd3)" stroke="#6366f1" strokeWidth="2.5" filter="url(#glowFeedback)" />
            <text x="130" y="22" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="700">Bot Profiler</text>
            <text x="130" y="40" textAnchor="middle" fill="#a5b4fc" fontSize="10">（行為分析引擎）</text>
            <line x1="20" y1="50" x2="240" y2="50" stroke="#6366f1" strokeWidth="0.5" opacity="0.4" />
            <text x="130" y="65" textAnchor="middle" fill="#9ca3af" fontSize="9">收集 Dungeon 數據</text>
            <text x="130" y="78" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">訓練更準確嘅偵測模型</text>
          </g>

          <path d="M665,272 C660,290 580,320 412,340" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arr3i)" />
          <text x="560" y="310" textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="600">行為數據回饋</text>

          <path d="M280,308 C280,260 200,180 130,130" stroke="#34d399" strokeWidth="2" strokeDasharray="6,3" fill="none" markerEnd="url(#arr3g)" />
          <text x="170" y="260" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">強化偵測</text>

          <g transform="translate(150,430)">
            <rect width="500" height="65" rx="14" fill="rgba(239,68,68,0.08)" stroke="#ef4444" strokeWidth="1.5" />
            <text x="250" y="22" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700">對 Bot 嘅代價</text>
            <g transform="translate(25,35)">
              <rect width="140" height="22" rx="6" fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth="0.8" />
              <text x="70" y="15" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="600">浪費時間</text>
            </g>
            <g transform="translate(180,35)">
              <rect width="140" height="22" rx="6" fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth="0.8" />
              <text x="70" y="15" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="600">浪費金錢</text>
            </g>
            <g transform="translate(335,35)">
              <rect width="140" height="22" rx="6" fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth="0.8" />
              <text x="70" y="15" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="600">浪費算力 (Compute)</text>
            </g>
          </g>
        </svg>
      </div>

      <h3>Honeypot 運作步驟</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>偵測可疑訪客</strong>——當 Bot Profiler 將某個請求標記為高風險，就啟動 Honeypot 機制。</span></li>
        <li><span className="step-num">2</span><span><strong>注入隱形連結</strong>——喺返回嘅頁面中加入 Invisible Anchor Link（例如用 CSS 隱藏、或者放喺可視範圍之外）。真人睇唔到、唔會點擊；但 Crawler 會自動跟隨所有連結。</span></li>
        <li><span className="step-num">3</span><span><strong>引入 Dungeon</strong>——隱形連結指向 Dungeon 入口。Dungeon 入面有幾百至幾千頁睇起嚟真實但完全無用嘅靜態 HTML 內容，頁面之間互相連結，形成一個迷宮。</span></li>
        <li><span className="step-num">4</span><span><strong>消耗 Bot 資源</strong>——Bot 會不斷喺 Dungeon 入面爬取假頁面，浪費大量時間、金錢同 Compute 資源。</span></li>
        <li><span className="step-num">5</span><span><strong>數據回饋</strong>——任何進入 Dungeon 嘅訪客幾乎可以確定係 Bot。呢啲高質量嘅行為數據會回饋到 Bot Profiler，訓練更準確嘅偵測模型，形成正向循環。</span></li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>隱形連結設計</h4>
          <p>用 CSS 將 Anchor Link 設為不可見（例如 display:none 或者放喺螢幕之外）。真人完全睇唔到，但 Crawler 會解析 HTML 跟隨所有連結。</p>
        </div>
        <div className="key-point">
          <h4>Dungeon 內容</h4>
          <p>要用真實格式嘅假內容——睇起嚟似真嘅文章、產品頁面等。唔好用明顯嘅亂碼，否則 Bot 可能識別到係陷阱。</p>
        </div>
        <div className="key-point">
          <h4>迷宮結構</h4>
          <p>Dungeon 頁面之間互相連結，形成一個網狀結構。Bot 一旦進入就好難走出嚟，持續消耗資源。</p>
        </div>
        <div className="key-point">
          <h4>訓練數據</h4>
          <p>進入 Dungeon 嘅訪客 = 確認嘅 Bot。呢啲數據非常有價值，可以大幅提升 Bot Profiler 嘅準確率。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>完整防禦體系</h4>
        <p>robots.txt 作為禮貌嘅第一道防線 → Bot 偵測識別可疑訪客 → Honeypot Dungeon 消耗 Bot 資源同收集訓練數據 → 數據回饋強化偵測能力。呢四層組合起嚟，就形成一個越嚟越強嘅防禦系統。關鍵在於令 AI Scraper 嘅爬取成本遠高於收益，自然就會放棄。</p>
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
        <h4>Prompt 1 — 建立 Anti-Scraping 防禦系統</h4>
        <div className="prompt-text">幫手設計一個完整嘅 Anti-Scraping 防禦系統，用 <span className="placeholder">[Node.js / Python / Go]</span> 實現。{'\n\n'}需要包含以下功能：{'\n'}1. robots.txt 自動生成器，可以動態更新已知 AI Crawler 嘅 User Agent 清單{'\n'}2. Request 分析 Middleware，檢查 User Agent、IP 地址、請求頻率{'\n'}3. Bot Profiler 評分系統，綜合多個維度計算風險分數{'\n'}4. Rate Limiter，對高風險請求進行限速{'\n'}5. 可疑請求嘅 logging 同 alert 機制{'\n\n'}技術棧：<span className="placeholder">[Express / FastAPI / Gin]</span> + Redis（儲存 IP 同評分數據）{'\n'}部署環境：<span className="placeholder">[AWS / GCP / 自建伺服器]</span>{'\n\n'}請提供完整嘅 project 結構、核心 code、同部署建議。</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實現 Honeypot Dungeon 陷阱系統</h4>
        <div className="prompt-text">幫手建立一個 Honeypot Dungeon 陷阱系統，用嚟捕捉同消耗 AI Scraper 嘅資源。{'\n\n'}核心需求：{'\n'}1. Dungeon Page Generator：自動生成 <span className="placeholder">[500 / 1000 / 5000]</span> 頁睇起嚟真實但無用嘅靜態 HTML 頁面{'\n'}2. 頁面之間要互相連結，形成網狀迷宮結構{'\n'}3. Invisible Link Injector Middleware：對可疑請求嘅 response 注入隱藏 Anchor Link{'\n'}4. 隱藏連結要用 CSS 技巧令真人睇唔到（display:none、off-screen positioning 等）{'\n'}5. Dungeon 訪客追蹤系統：記錄邊啲 IP 進入咗 Dungeon，自動標記為確認 Bot{'\n'}6. 數據回饋到 Bot Profiler，強化偵測準確率{'\n\n'}Dungeon 頁面主題：<span className="placeholder">[電商產品頁 / 新聞文章 / 技術文檔]</span>{'\n'}技術棧：<span className="placeholder">[語言 + 框架]</span>{'\n\n'}請提供 Generator script、Middleware code、同追蹤系統嘅完整實現。</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — Bot Detection + CAPTCHA 整合方案</h4>
        <div className="prompt-text">幫手設計一個 Bot Detection 同 CAPTCHA 整合方案，用 <span className="placeholder">[語言 + 框架]</span> 實現。{'\n\n'}需要包含：{'\n'}1. 多維度 Bot 偵測 Pipeline：User Agent 分析 → IP 信譽查詢 → 流量模式分析 → 瀏覽器指紋檢測{'\n'}2. 風險評分引擎：根據以上維度計算綜合分數（0-100）{'\n'}3. 分級應對策略：{'\n'}   - 低風險（0-30）：正常放行{'\n'}   - 中風險（30-70）：觸發 CAPTCHA 驗證{'\n'}   - 高風險（70-100）：導向 Honeypot 或直接封鎖{'\n'}4. 整合 <span className="placeholder">[reCAPTCHA v3 / hCaptcha / Turnstile]</span>{'\n'}5. Dashboard 顯示即時偵測統計{'\n\n'}請提供完整嘅架構設計、核心 code、同 CAPTCHA 整合步驟。</div>
      </div>
    </div>
  );
}

export default function AIScraperDefense() {
  return (
    <>
      <TopicTabs
        title="防禦 AI 爬蟲"
        subtitle="點樣保護網站內容唔俾 AI Scraper 同 Crawler 偷走——由基本到進階嘅防禦策略"
        tabs={[
          { id: 'tab-robots', label: '① robots.txt', content: <RobotsTab /> },
          { id: 'tab-detection', label: '② Bot 偵測', content: <DetectionTab /> },
          { id: 'tab-honeypot', label: '③ Honeypot 陷阱', premium: true, content: <HoneypotTab /> },
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
