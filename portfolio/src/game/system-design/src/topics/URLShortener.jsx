import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const relatedTopics = [
  { slug: 'key-value-store', label: 'Key-Value Store 鍵值存儲' },
  { slug: 'unique-id-generator', label: 'Unique ID Generator' },
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'scale-reads', label: '擴展讀取能力' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>短網址服務係咩</h2>
      <div className="subtitle">將超長嘅 URL 變成幾個字元嘅短連結</div>
      <p>
        喺 WhatsApp 分享一條超長嘅網址，成個畫面都係 URL，點樣解決呢個問題？短網址服務就係將好似 <code style={{ color: '#fbbf24' }}>https://example.com/very/long/path?param=abc&amp;id=12345</code> 咁嘅長 URL，變成好似 <code style={{ color: '#34d399' }}>https://tiny.url/abc123</code> 咁嘅短 URL。
      </p>
      <p>背後嘅核心邏輯係：生成一個唯一嘅短碼，同長 URL 做對應關係存入資料庫。當用戶訪問短 URL 嘅時候，系統查返長 URL，然後 redirect 過去。以下用圖解睇晒成個流程。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a3a2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradYellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a351a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPink" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a1a2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPink" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#EC4899" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(30,130)">
            <rect width="110" height="70" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="55" y="30" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">Client</text>
            <text x="55" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">用戶</text>
          </g>

          <g transform="translate(210,130)">
            <rect width="140" height="70" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="70" y="28" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">API Service</text>
            <text x="70" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">短網址服務</text>
          </g>

          <g transform="translate(220,30)">
            <rect width="130" height="60" rx="12" fill="url(#gradYellow)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="25" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">ID Generator</text>
            <text x="65" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Base62 編碼</text>
          </g>

          <g transform="translate(430,30)">
            <rect width="120" height="60" rx="12" fill="url(#gradRed)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="25" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">Cache</text>
            <text x="60" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Redis 熱門 URL</text>
          </g>

          <g transform="translate(430,130)">
            <rect width="120" height="70" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Database</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">URL 對應表</text>
          </g>

          <g transform="translate(430,250)">
            <rect width="120" height="60" rx="12" fill="url(#gradPink)" stroke="#EC4899" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="25" textAnchor="middle" fill="#EC4899" fontSize="12" fontWeight="700">Analytics</text>
            <text x="60" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">點擊追蹤</text>
          </g>

          <path d="M142,165 C175,165 175,165 208,165" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="175" y="155" textAnchor="middle" fill="#a5b4fc" fontSize="10">Long URL</text>
          <path d="M280,128 C280,110 280,105 280,92" stroke="#fbbf24" strokeWidth="1.5" fill="none" markerEnd="url(#arrYellow)" />
          <text x="310" y="115" fill="#fbbf24" fontSize="10">Generate ID</text>
          <path d="M352,155 C380,155 400,155 428,155" stroke="#8B5CF6" strokeWidth="1.5" fill="none" markerEnd="url(#arrPurple)" />
          <text x="390" y="145" textAnchor="middle" fill="#a5b4fc" fontSize="10">Store</text>
          <path d="M352,140 C380,120 400,90 428,68" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arrGreen)" />
          <text x="405" y="98" textAnchor="middle" fill="#34d399" fontSize="10">Cache hot</text>
          <path d="M352,190 C380,220 400,245 428,265" stroke="#EC4899" strokeWidth="1.5" fill="none" markerEnd="url(#arrPink)" />
          <text x="405" y="240" textAnchor="middle" fill="#EC4899" fontSize="10">Track clicks</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>成個流程一覽</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>首先，用戶提交一條長 URL 俾 API Service。呢個就係成個流程嘅起點。</span></li>
        <li><span className="step-num">2</span><span>跟住 API Service 會用 ID Generator（Base62 編碼）生成一個唯一嘅短碼，例如 "abc123"。Base62 嘅運作原理會喺下一節詳細解說。</span></li>
        <li><span className="step-num">3</span><span>然後系統將「短碼 → 長 URL」嘅對應關係存入 Database。呢個 mapping 就係成個服務嘅核心。</span></li>
        <li><span className="step-num">4</span><span>留意 Cache 呢層——熱門 URL 會被放入 Redis Cache，大幅加速 redirect 速度。</span></li>
        <li><span className="step-num">5</span><span>最後，Analytics 模組會記錄每次點擊（時間、地區、裝置等），呢啲數據對業務超有價值。</span></li>
      </ol>
    </div>
  );
}

function EncodingTab() {
  return (
    <div className="card">
      <h2>Base62 編碼詳解</h2>
      <div className="subtitle">用 62 個字元（a-z, A-Z, 0-9）表示短碼</div>
      <p>Base62 用 62 個字元：26 個小楷 + 26 個大楷 + 10 個數字 = 62。計一計，一個 7 位嘅 Base62 短碼可以表示 62^7 ≈ <strong style={{ color: '#34d399' }}>3.5 萬億</strong>個唯一 URL——絕對夠用。</p>
      <p>具體做法係咁：將一個自增 ID（或者 Snowflake ID）轉換成 Base62 字串。例如 ID = 12345 → Base62 = "dnh"。呢個轉換邏輯必須要識，面試一定會問。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>301 vs 302 Redirect</h4>
          <p>呢個好重要，必須講清楚。301（永久重定向）：瀏覽器會 cache，下次直接去長 URL，唔經 Server。302（暫時重定向）：每次都經 Server，可以追蹤點擊數。重點係：如果要做 analytics，一定要用 302！</p>
        </div>
        <div className="key-point">
          <h4>Hash Collision 處理</h4>
          <p>注意呢個陷阱：如果兩條唔同嘅長 URL 生成咗同一個短碼，就出大問題。解決方法好簡單——先查 DB，如果短碼已存在就重試或者加 salt 再 hash。面試嘅時候記得主動提呢一點。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">面試高頻考點整理</div>
      <div className="key-points">
        <div className="key-point">
          <h4>讀多寫少嘅特性</h4>
          <p>重點係，短網址服務嘅讀取（redirect）遠多過寫入（create），所以 Cache 超重要。必須要識講：用 Redis 放熱門 URL 可以大幅減少 DB 壓力。</p>
        </div>
        <div className="key-point">
          <h4>自定義短碼</h4>
          <p>面試官好可能會問：「如果用戶想用自己揀嘅短碼（例如 tiny.url/my-brand）點算？」答案係——加一個 uniqueness check，確保自定義短碼唔會同現有嘅撞。</p>
        </div>
        <div className="key-point">
          <h4>URL 過期機制</h4>
          <p>設計嘅時候建議加入 TTL（Time To Live）。可以設定短網址嘅有效期限，過期嘅 URL 自動刪除或者返回 404。呢個對安全同儲存管理都好重要。</p>
        </div>
        <div className="key-point">
          <h4>安全性考量</h4>
          <p>安全性係重要考量。要防止惡意 URL（phishing），建議加入 URL 安全檢查（例如用 Google Safe Browsing API）。面試講到呢點會好加分。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>真實規模參考</h4>
        <p>bit.ly 每月處理超過 10 億次 redirect。Twitter 嘅 t.co 短網址服務每日處理數以億計嘅點擊。設計嘅時候要以呢個規模作為參考，思考系統能唔能承受咁大嘅流量。</p>
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
        <h4>Prompt 1 — Build 一個完整嘅 URL Shortener 服務</h4>
        <div className="prompt-text">
          {`幫手 build 一個完整嘅 URL Shortener 服務：

技術棧：[技術棧，例如：Node.js + Express + PostgreSQL / Go + Gin + Redis]
部署方式：[Docker / Kubernetes / Serverless]
預計規模：[每日短網址生成量同 redirect 量]

要求：
1. 實作兩個核心 API：POST /shorten（建立短網址）同 GET /:code（redirect）
2. 用 Base62 編碼將自增 ID 轉換成短碼，寫出轉換函數
3. Database schema 設計，包括 URL mapping table 同 analytics table
4. 加入 Redis Cache 層，cache 熱門嘅短網址 mapping
5. 實現 302 redirect 並記錄點擊數據（時間、IP、User-Agent）
6. 加入 URL 安全檢查，防止惡意網址
7. 提供完整嘅 API 文檔同 Docker Compose 配置`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計短碼生成同 Hash 衝突處理策略</h4>
        <div className="prompt-text">
          {`深入設計 URL Shortener 嘅短碼生成策略，要處理高併發同 hash collision：

預計規模：[例如：每日 100 萬條新短網址、需要支撐 5 年]
短碼長度要求：[例如：6-8 個字元]

要求：
1. 對比三種短碼生成方案：自增 ID + Base62、MD5/SHA256 截取、Snowflake ID
2. 分析每種方案嘅碰撞概率、性能、可預測性
3. 設計分佈式 ID Generator（多台 Server 點樣唔撞 ID）
4. Hash Collision 嘅檢測同處理流程
5. 支持自定義短碼（custom alias）嘅設計
6. 計算所需嘅短碼長度（根據預計 URL 數量用 Base62 計算）
7. 提供完整嘅代碼實現，包括 unit test`}
        </div>
      </div>
    </div>
  );
}

export default function URLShortener() {
  return (
    <>
      <TopicTabs
        title="URL Shortener 短網址服務"
        subtitle="點樣將長 URL 轉換成短 URL，涉及 hashing 同 DB 設計"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'encoding', label: '② Base62 編碼', content: <EncodingTab /> },
          { id: 'practice', label: '③ 實戰要點', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
