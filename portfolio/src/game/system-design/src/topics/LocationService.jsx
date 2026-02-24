import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Geohash 嘅核心原理係咩？',
    options: [
      { text: '將 GPS 座標加密成安全嘅 hash 值', correct: false, explanation: 'Geohash 唔係加密。佢係一種地理編碼系統，將二維座標（經緯度）轉換成一維字串。' },
      { text: '將二維嘅經緯度座標編碼成一個字串，前綴相同嘅 hash 代表地理位置接近', correct: true, explanation: 'Geohash 將地球遞歸地分成越嚟越細嘅格子。例如 "wx4g0" 代表北京某個區域，"wx4g0s" 代表入面更細嘅區域。前綴越長相同，兩點越接近。呢個特性令佢非常適合做「附近搜尋」——只需要用 SQL LIKE 或者 Redis prefix scan 就搵到附近嘅點。' },
      { text: '將地圖圖片壓縮成更細嘅檔案', correct: false, explanation: 'Geohash 同圖片壓縮完全冇關。佢係一種座標編碼方式。' },
      { text: '將地址文字轉換成座標', correct: false, explanation: '地址轉座標叫 Geocoding。Geohash 係將已有嘅座標（經緯度）編碼成字串。' },
    ],
  },
  {
    question: '用 Geohash 做「附近搜尋」時，點解需要搜索相鄰嘅 8 個格子？',
    options: [
      { text: '因為一個格子放唔落咁多數據', correct: false, explanation: '每個格子可以放無限多嘅點。搜索 8 個相鄰格子嘅原因同數據容量冇關。' },
      { text: '因為目標點可能就喺格子邊界，最近嘅鄰居可能喺隔壁格子入面', correct: true, explanation: '呢個係 Geohash 嘅經典邊界問題。例如你企喺一個格子嘅右上角，最近嘅餐廳可能喺右邊、上面、或者右上角嘅格子入面。如果只搜索自己嘅格子，就會漏咗呢啲明明好近但喺隔壁格子嘅結果。所以標準做法係搜索自己 + 周圍 8 個格子（9 宮格）。' },
      { text: '因為 Geohash 嘅精確度唔夠', correct: false, explanation: 'Geohash 精確度可以透過增加長度提高。搜索 8 個格子係為咗解決邊界問題，唔係精確度問題。' },
      { text: '因為呢個係 Google Maps 嘅專利要求', correct: false, explanation: '冇呢回事。搜索相鄰格子係 Geohash 嘅通用最佳實踐，同任何專利無關。' },
    ],
  },
  {
    question: 'Uber 嘅實時司機配對系統點解唔直接用 Geohash，而要用更複雜嘅方案？',
    options: [
      { text: '因為 Uber 唔想用免費嘅技術', correct: false, explanation: '技術選擇同免唔免費冇關。Uber 需要嘅係處理實時移動物體嘅能力。' },
      { text: '因為 Geohash 適合靜態位置搜尋，但司機不斷移動需要頻繁更新 index，用專門嘅 spatial index 更高效', correct: true, explanation: 'Geohash 嘅問題係：司機每幾秒就移動到新位置，如果用 Geohash 就要頻繁 delete + re-insert index entry。Uber 嘅 H3（Hexagonal Hierarchical Spatial Index）或者 in-memory spatial index 更適合——支持高頻位置更新同實時 nearest-neighbor 查詢。靜態場景（搵餐廳）用 Geohash 完全夠，動態場景（配對司機）需要更好嘅方案。' },
      { text: '因為 Geohash 唔支持計算距離', correct: false, explanation: 'Geohash 可以配合 Haversine 公式計算距離。但問題唔係計距離，而係處理高頻位置更新。' },
      { text: '因為 Uber 嘅用戶太多，Geohash 放唔落', correct: false, explanation: 'Geohash 可以擴展到好大規模。問題係動態物體嘅頻繁位置更新效率。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'redis', label: 'Redis' },
  { slug: 'database-basics', label: 'Database Basics 數據庫基礎' },
  { slug: 'search-autocomplete', label: 'Search Autocomplete 搜索自動補全' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>位置服務係咩</h2>
      <div className="subtitle">Geohash / 附近搜尋 / Uber 配對——點樣搵到你附近嘅餐廳同司機</div>
      <p>
        打開 Google Maps 搵附近餐廳、用 Uber 叫車配對最近嘅司機、收到「你附近有優惠」嘅通知——呢啲功能背後都係位置服務（Location Service）。核心問題係：喺幾百萬個地點入面，點樣極速搵到離你最近嘅幾個？暴力計算每個點同你嘅距離？太慢啦——需要用 <strong style={{ color: '#34d399' }}>Geospatial Index</strong> 嚟加速。
      </p>
      <p>
        最常用嘅方案係 <strong style={{ color: '#fbbf24' }}>Geohash</strong>——將地球嘅經緯度編碼成字串，前綴相同嘅 hash 代表位置接近。搜索附近嘅點就變成咗「搵前綴相似嘅 hash」，可以用 Database index 或者 Redis 極快完成。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#fbbf24" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue5" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen5" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber5" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPurple5" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(20,120)">
            <rect width="120" height="80" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="25" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">User</text>
            <text x="60" y="45" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Location</text>
            <text x="60" y="65" textAnchor="middle" fill="#9ca3af" fontSize="9">lat: 22.28, lng: 114.15</text>
          </g>

          <g transform="translate(210,120)" filter="url(#glowAmber)">
            <rect width="150" height="80" rx="12" fill="url(#gradAmber)" stroke="#fbbf24" strokeWidth="2" />
            <text x="75" y="25" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">Geohash</text>
            <text x="75" y="45" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">Grid</text>
            <text x="75" y="65" textAnchor="middle" fill="#9ca3af" fontSize="9">wx4g0s → 9 宮格搜索</text>
          </g>

          {/* Grid illustration */}
          <g transform="translate(240,230)">
            {[0,1,2].map(r => [0,1,2].map(c => (
              <rect key={`${r}${c}`} x={c*30} y={r*25} width="28" height="23" rx="3"
                fill={r===1&&c===1 ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.08)'}
                stroke={r===1&&c===1 ? '#fbbf24' : '#4a4a4a'} strokeWidth="1" />
            )))}
            <circle cx="44" cy="36" r="3" fill="#f87171" />
            <text x="45" y="80" textAnchor="middle" fill="#9ca3af" fontSize="8">你嘅位置</text>
          </g>

          <g transform="translate(430,100)">
            <rect width="160" height="100" rx="12" fill="url(#gradGreen)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="80" y="25" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Nearby</text>
            <text x="80" y="45" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Search</text>
            <text x="80" y="65" textAnchor="middle" fill="#9ca3af" fontSize="10">Expanding Rings</text>
            <text x="80" y="82" textAnchor="middle" fill="#9ca3af" fontSize="9">先近後遠</text>
          </g>

          <g transform="translate(660,120)">
            <rect width="120" height="80" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Results</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">附近 10 間</text>
            <text x="60" y="65" textAnchor="middle" fill="#9ca3af" fontSize="10">餐廳 / 司機</text>
          </g>

          <path d="M142,160 C170,160 185,160 208,160" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrBlue5)" />
          <text x="175" y="152" textAnchor="middle" fill="#93c5fd" fontSize="10">座標</text>

          <path d="M362,160 C390,155 405,152 428,150" stroke="#fbbf24" strokeWidth="2" fill="none" markerEnd="url(#arrAmber5)" />
          <text x="395" y="142" fill="#fbbf24" fontSize="10">候選</text>

          <path d="M592,150 C620,152 635,155 658,160" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrGreen5)" />
          <text x="625" y="145" fill="#34d399" fontSize="10">排序</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>附近搜尋流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>用戶發出「搵附近餐廳」請求，附帶經緯度。Server 將座標轉換成 Geohash（例如 "wx4g0s"），決定搜索精度。</span></li>
        <li><span className="step-num">2</span><span>用 Geohash 前綴搜索自己格子 + 相鄰 8 個格子（9 宮格），攞到所有候選地點。呢個操作用 Database index 或 Redis sorted set 都可以極快完成。</span></li>
        <li><span className="step-num">3</span><span>如果候選唔夠多，用「Expanding Rings」策略——縮短 Geohash 前綴（擴大搜索範圍），直到搵到足夠多嘅結果。</span></li>
        <li><span className="step-num">4</span><span>對候選結果用 Haversine 公式計算準確距離，按距離排序，返回最近嘅 N 個結果。Geohash 只係粗篩，最終排序要用精確距離。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階 Geospatial 技術</h2>
      <div className="subtitle">Geohash 編碼、QuadTree、R-tree、實時配對</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Geohash 編碼原理</h4>
          <p>Geohash 用交替嘅 bit 分別表示經度同緯度，然後用 Base32 編碼成字串。每多一個字元，精度提高一級：4 字元 ≈ 39km 格子、5 字元 ≈ 5km、6 字元 ≈ 1.2km、7 字元 ≈ 150m。附近搜尋通常用 5-7 字元。Redis 原生支持 <code style={{ color: '#60a5fa' }}>GEOADD</code> 同 <code style={{ color: '#60a5fa' }}>GEORADIUS</code> 命令，底層就係用 Geohash。</p>
        </div>
        <div className="key-point">
          <h4>QuadTree</h4>
          <p>將空間遞歸分成 4 個象限。每個節點最多放 N 個點，滿咗就再分裂。好處係：密集區域（市區）自動用更細嘅格子，稀疏區域（郊區）用大格子——adaptive resolution。適合搜索密度差異大嘅場景。缺點係唔容易做 distributed storage。</p>
        </div>
        <div className="key-point">
          <h4>R-tree</h4>
          <p>一種平衡樹，每個節點儲存一個 bounding box（最小包圍矩形）。搜索時從 root 開始，只展開同查詢區域有重疊嘅 subtree。PostGIS 嘅 spatial index 就係用 R-tree。適合複雜幾何查詢（唔止係點，仲有線同面）。</p>
        </div>
        <div className="key-point">
          <h4>實時司機配對（Uber 模式）</h4>
          <p>Uber 嘅挑戰係：司機不斷移動，需要頻繁更新位置 index。佢哋嘅做法係：①用 H3（六邊形格子系統）代替 Geohash——六邊形嘅鄰居距離更均勻；②司機位置用 in-memory spatial index，每 4 秒更新一次；③配對時先搵最近嘅幾個司機，再考慮 ETA（實際路線時間，唔係直線距離）。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="key-points">
        <div className="key-point">
          <h4>Uber Ride Matching 流程</h4>
          <p>用戶叫車 → 用用戶位置搵附近 X 公里內嘅空閒司機 → 對每個司機計算 ETA（用路網距離，唔係直線距離） → 考慮司機評分同接單率 → 選最佳匹配 → 發請求俾司機 → 司機 15 秒內冇接受就轉發下一個。呢個流程要喺 &lt; 3 秒完成。</p>
        </div>
        <div className="key-point">
          <h4>Proximity Alert（接近提醒）</h4>
          <p>「你行到 Starbucks 附近，有優惠券」——呢個功能叫 Geofencing。實現方式：定義一個圓形/多邊形區域，當用戶位置進入呢個區域就觸發通知。挑戰係：唔好太頻繁 check 位置（耗電），用 Geohash 做粗篩 + 精確距離做確認。</p>
        </div>
        <div className="key-point">
          <h4>Geofencing 應用</h4>
          <p>Geofencing 唔止用喺行銷。常見應用：①外賣 App——司機進入餐廳 Geofence 時自動通知餐廳準備出餐；②共享單車——離開服務區時告警；③兒童安全——小朋友離開校區時通知家長。技術上用 point-in-polygon 算法判斷位置係咪喺區域內。</p>
        </div>
        <div className="key-point">
          <h4>位置數據隱私</h4>
          <p>位置數據係敏感個人資訊。必須做到：①用戶可以控制位置分享（開/關/只喺使用 App 時）；②後端只儲存必要嘅精度（唔需要精確到門牌號就用低精度 Geohash）；③歷史位置數據要有 retention policy（例如 30 日後自動刪除）。GDPR 對位置數據有嚴格要求。</p>
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
        <h4>Prompt 1 — 設計附近搜尋服務 + Geohash Index</h4>
        <div className="prompt-text">
          幫手設計一個位置服務，支持「搵附近嘅 <span className="placeholder">[餐廳 / 商戶 / 充電站]</span>」功能。{'\n\n'}
          核心要求：{'\n'}
          - 用 Geohash 做 spatial indexing，支持 9 宮格搜索{'\n'}
          - Expanding Rings 策略：搜索範圍從 <span className="placeholder">[1km / 5km]</span> 開始，逐步擴大直到搵到 <span className="placeholder">[10 / 20]</span> 個結果{'\n'}
          - 用 Haversine 公式計算精確距離做最終排序{'\n'}
          - 支持 filter（評分 &gt; 4.0、價格範圍、營業中）{'\n'}
          - 地點總數 <span className="placeholder">[100 萬 / 1000 萬]</span>，QPS <span className="placeholder">[1 萬 / 10 萬]</span>{'\n\n'}
          技術棧：<span className="placeholder">[例如：Node.js + Redis GEO / PostgreSQL + PostGIS]</span>{'\n'}
          請提供架構圖、DB Schema（含 Geohash index）、搜索 API 設計、同 Query 優化策略。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計實時配對系統（Uber 模式）</h4>
        <div className="prompt-text">
          幫手設計一個實時配對系統，類似 Uber 嘅司機-乘客配對。{'\n\n'}
          場景：{'\n'}
          - <span className="placeholder">[10 萬 / 100 萬]</span> 個司機同時在線，每 <span className="placeholder">[4 秒]</span> 更新一次位置{'\n'}
          - 乘客叫車到配對成功要 &lt; <span className="placeholder">[3 秒 / 5 秒]</span>{'\n\n'}
          技術要求：{'\n'}
          - 高頻位置更新嘅 spatial index 設計（Geohash vs H3 vs in-memory R-tree）{'\n'}
          - 配對算法：距離 + ETA + 司機評分 + 接單率{'\n'}
          - 司機狀態管理：空閒 / 接單中 / 載客中{'\n'}
          - Fallback：最近司機冇接受 → 自動轉發下一個{'\n'}
          - Surge Pricing 觸發條件（供需比）{'\n\n'}
          請提供系統架構、位置更新 Pipeline、配對算法 Pseudocode、同 Failure Handling 策略。
        </div>
      </div>
    </div>
  );
}

export default function LocationService() {
  return (
    <>
      <TopicTabs
        title="位置服務"
        subtitle="Geohash / 附近搜尋 / Uber 配對"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階技術', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰要點', premium: true, content: <PracticeTab /> },
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
