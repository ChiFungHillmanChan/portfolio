import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Redis 點解可以做到微秒級（microsecond）嘅延遲？',
    options: [
      { text: '因為 Redis 用咗特別快嘅 programming language', correct: false, explanation: 'Redis 用 C 寫，但速度嘅關鍵唔係語言，而係存儲方式' },
      { text: '因為 Redis 將數據存喺 RAM（記憶體）入面，跳過咗磁碟 I/O', correct: true, explanation: '啱！傳統 DB 每次查詢都要經過磁碟 I/O，而 Redis 完全喺記憶體操作，速度快幾個數量級' },
      { text: '因為 Redis 唔支援複雜嘅數據結構', correct: false, explanation: 'Redis 支援 String、List、Set、Hash、Sorted Set 等多種結構，唔係因為簡單先快' },
      { text: '因為 Redis 只支援本地 access', correct: false, explanation: 'Redis 可以透過網絡 access，速度快係因為 in-memory 存儲' },
    ],
  },
  {
    question: 'Redis 最常見嘅 use case 係咩？',
    options: [
      { text: '取代 PostgreSQL 做主要 database', correct: false, explanation: 'Redis 通常唔適合做主要 DB，因為記憶體貴而且數據持久化唔及傳統 DB 可靠' },
      { text: 'Caching layer — 將頻繁讀取嘅數據暫存，減少對主 database 嘅查詢', correct: true, explanation: '啱！Redis 最經典嘅用途就係做 cache。將 hot data 存入 Redis，大幅減少 DB 查詢次數，降低延遲' },
      { text: '存儲大型檔案（例如影片、圖片）', correct: false, explanation: '大型檔案應該存喺 Object Storage（如 S3），Redis 係 key-value store，唔適合存大檔案' },
      { text: '做 frontend 嘅 state management', correct: false, explanation: 'Frontend state management 用 Redux 等工具，Redis 係 backend 嘅 in-memory store' },
    ],
  },
  {
    question: 'Redis 嘅 Sorted Set 數據結構適合用嚟做咩？',
    options: [
      { text: '存儲用戶密碼', correct: false, explanation: '密碼應該 hash 之後存喺 database，唔係放喺 Redis' },
      { text: 'Leaderboard（排行榜）— 每個 member 有 score，可以快速排名同查詢 top N', correct: true, explanation: '啱！Sorted Set 自動按 score 排序，O(log N) 就可以插入、查詢排名同攞 top N，非常適合即時排行榜' },
      { text: '存儲 HTML template', correct: false, explanation: 'HTML template 用 String 或者檔案系統存儲更合適' },
      { text: '做 database migration', correct: false, explanation: 'Database migration 係另一個概念，同 Redis Sorted Set 無關' },
    ],
  },
];

const relatedTopics = [
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
  { slug: 'cache-invalidation', label: 'Cache 失效策略' },
  { slug: 'key-value-store', label: 'Key-Value Store 鍵值存儲' },
  { slug: 'session-manager', label: 'Session Manager 管理器' },
];

function WhatTab() {
  return (
    <div className="card">
      <h2>Redis 係咩？</h2>
      <div className="subtitle">In-Memory Key-Value Database</div>
      <p>
        呢度有一個好重要嘅概念。傳統嘅資料庫（好似 Postgres、MySQL）將資料存喺硬碟度，所以每次查詢都要經過磁碟 I/O。而 <strong style={{ color: '#34d399' }}>Redis 將資料存喺 RAM（記憶體）入面</strong>，完全跳過咗磁碟呢一層。結果係：<strong style={{ color: '#6366f1' }}>微秒級（microsecond）嘅延遲</strong>。
      </p>
      <p>
        呢個係一個 Key-Value Store，即係用一個 key 去攞對應嘅 value。好似一個超快嘅字典咁。Redis 支援唔同嘅資料結構：String、List、Set、Hash、Sorted Set 等等。所以佢唔止係簡單嘅 key-value，仲可以做好多複雜嘅操作。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowGreen">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#34d399" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowPurple">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#8B5CF6" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradRedis" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#2a1e1e" />
            </linearGradient>
            <linearGradient id="gradDisk" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#251e35" />
            </linearGradient>
            <linearGradient id="gradApp" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1e2940" />
            </linearGradient>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(40,150)" filter="url(#glowGreen)">
            <rect width="120" height="70" rx="14" fill="url(#gradApp)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="30" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">App</text>
            <text x="60" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">應用程式</text>
          </g>

          <g transform="translate(270,60)">
            <rect width="160" height="90" rx="14" fill="url(#gradRedis)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="80" y="25" textAnchor="middle" fill="#EF4444" fontSize="13" fontWeight="700">Redis (RAM)</text>
            <text x="80" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Key-Value Store</text>
            <text x="80" y="65" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">Microsecond</text>
            <text x="80" y="80" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">Latency</text>
          </g>

          <g transform="translate(270,210)">
            <rect width="160" height="90" rx="14" fill="url(#gradDisk)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="80" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Postgres (Disk)</text>
            <text x="80" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">傳統資料庫</text>
            <text x="80" y="65" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="700">Millisecond</text>
            <text x="80" y="80" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="700">Latency</text>
          </g>

          <path d="M 162 175 Q 210 110 268 100" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="200" y="135" fill="#34d399" fontSize="11" fontWeight="600">超快查詢</text>

          <path d="M 162 195 Q 210 235 268 250" fill="none" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrPurple)" />
          <text x="200" y="225" fill="#8B5CF6" fontSize="11" fontWeight="600">慢啲</text>

          <g transform="translate(480,60)">
            <rect width="160" height="240" rx="14" fill="rgba(245,158,11,0.08)" stroke="#F59E0B" strokeWidth="1.5" />
            <text x="80" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">速度對比</text>
            <text x="20" y="55" fill="#34d399" fontSize="11" fontWeight="700">Redis (RAM):</text>
            <text x="20" y="75" fill="#9ca3af" fontSize="10">• 微秒級 (μs)</text>
            <text x="20" y="92" fill="#9ca3af" fontSize="10">• 1-100 μs</text>
            <text x="20" y="109" fill="#9ca3af" fontSize="10">• 極快讀寫</text>
            <line x1="20" y1="125" x2="140" y2="125" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="150" fill="#f87171" fontSize="11" fontWeight="700">Postgres (Disk):</text>
            <text x="20" y="170" fill="#9ca3af" fontSize="10">• 毫秒級 (ms)</text>
            <text x="20" y="187" fill="#9ca3af" fontSize="10">• 1-100 ms</text>
            <text x="20" y="204" fill="#9ca3af" fontSize="10">• 慢 1000 倍</text>
            <text x="80" y="230" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600">差距：1000x</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>點解咁快？</h3>
      <div className="key-points">
        <div className="key-point">
          <h4>RAM vs Disk</h4>
          <p>RAM 存取速度比 Disk 快成千倍。傳統資料庫需要讀寫硬碟，Redis 全部操作都喺記憶體完成，所以可以做到微秒級嘅延遲。</p>
        </div>
        <div className="key-point">
          <h4>簡單嘅資料結構</h4>
          <p>Key-Value 係最簡單嘅資料結構，唔需要複雜嘅查詢計劃或者 JOIN 操作。直接用 key 攞 value，O(1) 時間複雜度。</p>
        </div>
        <div className="key-point">
          <h4>Single-threaded</h4>
          <p>Redis 用單線程處理所有請求，避免咗多線程嘅 lock 同 context switch overhead。反而因為係 in-memory，單線程都夠快。</p>
        </div>
        <div className="key-point">
          <h4>豐富嘅資料類型</h4>
          <p>雖然係 Key-Value Store，但支援 List、Set、Hash、Sorted Set 等等。可以做 Leaderboard、Session Store、Message Queue 等等用途。</p>
        </div>
      </div>

      <div className="highlight-box">
        <p style={{ color: '#fbbf24', fontSize: '0.95rem', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>關鍵重點：Redis 犧牲咗儲存空間同持久性，換取咗極致嘅速度。呢個就係典型嘅 trade-off。</p>
      </div>
    </div>
  );
}

function TradeoffsTab() {
  return (
    <div className="card">
      <h2>Trade-offs</h2>
      <div className="subtitle">冇嘢係完美嘅 — RAM 嘅代價</div>
      <p>
        而家講下 Redis 嘅缺點。因為 Redis 將所有嘢放喺 RAM 入面，呢個決定帶嚟兩個核心問題：<strong style={{ color: '#f87171' }}>RAM 好貴而且好有限</strong>，同埋 <strong style={{ color: '#f87171' }}>資料喺 crash 嘅時候會遺失</strong>。以下逐個拆解。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 680 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow2" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <linearGradient id="gradCost" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#2a1e1e" />
            </linearGradient>
          </defs>

          <g transform="translate(40,40)">
            <rect width="280" height="140" rx="14" fill="url(#gradCost)" stroke="#f87171" strokeWidth="2" filter="url(#shadow2)" />
            <text x="140" y="25" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">儲存成本</text>
            <text x="20" y="55" fill="#fbbf24" fontSize="11" fontWeight="700">RAM (Redis):</text>
            <text x="20" y="75" fill="#9ca3af" fontSize="10">• 每 GB 約 $10-20</text>
            <text x="20" y="92" fill="#9ca3af" fontSize="10">• 容量有限 (幾十 GB)</text>
            <line x1="20" y1="105" x2="260" y2="105" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="125" fill="#34d399" fontSize="11" fontWeight="700">Disk (SSD):</text>
            <text x="160" y="125" fill="#9ca3af" fontSize="10">每 GB 約 $0.10</text>
          </g>

          <g transform="translate(360,40)">
            <rect width="280" height="140" rx="14" fill="url(#gradCost)" stroke="#f87171" strokeWidth="2" filter="url(#shadow2)" />
            <text x="140" y="25" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">持久性問題</text>
            <text x="20" y="55" fill="#fbbf24" fontSize="11" fontWeight="700">Server Crash:</text>
            <text x="20" y="75" fill="#9ca3af" fontSize="10">• RAM 資料全部遺失</text>
            <text x="20" y="92" fill="#9ca3af" fontSize="10">• 重啟後 Redis 空白</text>
            <line x1="20" y1="105" x2="260" y2="105" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="125" fill="#34d399" fontSize="11" fontWeight="700">解決方案存在但唔完美</text>
          </g>

          <g transform="translate(40,220)">
            <rect width="600" height="160" rx="14" fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="1.5" />
            <text x="300" y="25" textAnchor="middle" fill="#6366f1" fontSize="13" fontWeight="700">備份方法</text>
            <g transform="translate(20,45)">
              <rect width="260" height="95" rx="10" fill="#13151c" stroke="#2a2d3a" strokeWidth="1" />
              <text x="130" y="22" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="700">RDB (Snapshot)</text>
              <text x="15" y="42" fill="#9ca3af" fontSize="10">• 定時將整個資料集寫入 disk</text>
              <text x="15" y="59" fill="#9ca3af" fontSize="10">• 快速恢復</text>
              <text x="15" y="76" fill="#f87171" fontSize="10">• 但會遺失最後一次 snapshot</text>
              <text x="15" y="90" fill="#f87171" fontSize="10">  後嘅所有寫入</text>
            </g>
            <g transform="translate(310,45)">
              <rect width="270" height="95" rx="10" fill="#13151c" stroke="#2a2d3a" strokeWidth="1" />
              <text x="135" y="22" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="700">AOF (Append-Only File)</text>
              <text x="15" y="42" fill="#9ca3af" fontSize="10">• 每個寫入操作都記錄到 log</text>
              <text x="15" y="59" fill="#9ca3af" fontSize="10">• 更好嘅持久性</text>
              <text x="15" y="76" fill="#f87171" fontSize="10">• 但會影響寫入效能</text>
              <text x="15" y="90" fill="#f87171" fontSize="10">• 重啟恢復時間較長</text>
            </g>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>核心 Trade-offs</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>成本高昂：</strong>RAM 比 SSD 貴成 100 倍。如果要儲 1TB 嘅資料，用 Disk 可能只係 $100，但用 RAM 就要成萬蚊。所以 Redis 通常只會用嚟存最熱門嘅資料。</span></li>
        <li><span className="step-num">2</span><span><strong>容量有限：</strong>一台 Server 嘅 RAM 通常只有幾十 GB，唔似 Disk 可以去到幾 TB。所以 Redis 唔適合做主資料庫，通常係做 Cache 或者 Session Store。</span></li>
        <li><span className="step-num">3</span><span><strong>資料會遺失：</strong>Server crash 或者重啟嘅時候，RAM 入面嘅嘢會全部清空。雖然有 RDB 同 AOF 兩種備份方法，但都會遺失最近嘅寫入。呢個係無可避免嘅。</span></li>
        <li><span className="step-num">4</span><span><strong>唔適合做唯一資料來源：</strong>因為以上嘅問題，通常會將 Redis 同傳統資料庫（好似 Postgres）一齊用。Redis 做快取，Postgres 做持久化。呢個就係最常見嘅組合策略。</span></li>
      </ol>

      <div className="highlight-box">
        <p style={{ color: '#fbbf24', fontSize: '0.95rem', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>結論：Redis 唔係用嚟取代傳統資料庫，而係補充佢。用 Redis 嘅速度處理熱門資料，用 Postgres 嘅持久性保護重要資料。</p>
      </div>
    </div>
  );
}

function RealworldTab() {
  return (
    <div className="card">
      <h2>實戰應用</h2>
      <div className="subtitle">遊戲排行榜：Redis + Postgres 組合策略</div>
      <p>
        以下用一個真實場景說明：即時排行榜系統。假設係做緊一個遊戲，需要顯示全球玩家嘅即時排名。呢個場景需要：<strong style={{ color: '#34d399' }}>超低延遲</strong>（玩家打完一局即刻更新）同 <strong style={{ color: '#34d399' }}>高併發</strong>（成千上萬玩家同時玩）。呢個就係 Redis 嘅完美用途。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 440" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow3" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <linearGradient id="gradFE" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#1e2940" /></linearGradient>
            <linearGradient id="gradBE" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#2a1e2a" /></linearGradient>
            <linearGradient id="gradRedis2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#2a1e1e" /></linearGradient>
            <linearGradient id="gradPG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#251e35" /></linearGradient>
            <marker id="arrBlue2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          </defs>

          <g transform="translate(40,180)">
            <rect width="120" height="70" rx="14" fill="url(#gradFE)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow3)" />
            <text x="60" y="30" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">React</text>
            <text x="60" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">前端</text>
          </g>

          <g transform="translate(270,180)">
            <rect width="120" height="70" rx="14" fill="url(#gradBE)" stroke="#a5b4fc" strokeWidth="2" filter="url(#shadow3)" />
            <text x="60" y="30" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">Backend</text>
            <text x="60" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">Node.js / Go</text>
          </g>

          <g transform="translate(500,80)">
            <rect width="160" height="90" rx="14" fill="url(#gradRedis2)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow3)" />
            <text x="80" y="25" textAnchor="middle" fill="#EF4444" fontSize="13" fontWeight="700">Redis</text>
            <text x="80" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Sorted Set</text>
            <text x="80" y="62" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">即時排行榜</text>
            <text x="80" y="77" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">Leaderboard</text>
          </g>

          <g transform="translate(500,230)">
            <rect width="160" height="90" rx="14" fill="url(#gradPG)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow3)" />
            <text x="80" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Postgres</text>
            <text x="80" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">持久化資料</text>
            <text x="80" y="62" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="600">用戶資料</text>
            <text x="80" y="77" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="600">歷史記錄</text>
          </g>

          <path d="M 162 210 Q 210 205 268 210" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="5,3" markerEnd="url(#arrBlue2)" />
          <text x="215" y="195" textAnchor="middle" fill="#6366f1" fontSize="10" fontWeight="600">WebSocket</text>
          <text x="215" y="208" textAnchor="middle" fill="#6366f1" fontSize="9">即時連接</text>

          <path d="M 392 200 Q 440 150 498 125" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen2)" />
          <text x="445" y="155" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">讀/寫排名</text>
          <text x="445" y="168" textAnchor="middle" fill="#34d399" fontSize="9">微秒級</text>

          <path d="M 392 220 Q 440 250 498 270" fill="none" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrAmber2)" />
          <text x="445" y="260" textAnchor="middle" fill="#8B5CF6" fontSize="10" fontWeight="600">儲存用戶</text>

          <g transform="translate(40,30)">
            <rect width="620" height="35" rx="10" fill="rgba(245,158,11,0.1)" stroke="#F59E0B" strokeWidth="1.5" />
            <text x="310" y="23" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">即時排行榜流程：玩家完成遊戲 → Backend 更新 Redis Sorted Set → WebSocket 推送最新排名</text>
          </g>

          <g transform="translate(40,340)">
            <rect width="300" height="85" rx="10" fill="#13151c" stroke="#34d399" strokeWidth="1.5" />
            <text x="150" y="20" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">Redis 操作</text>
            <text x="15" y="40" fill="#9ca3af" fontSize="10">1. ZADD leaderboard 1500 user:123</text>
            <text x="15" y="57" fill="#9ca3af" fontSize="10">2. ZREVRANGE leaderboard 0 99</text>
            <text x="15" y="74" fill="#9ca3af" fontSize="10">3. ZRANK leaderboard user:123</text>
          </g>

          <g transform="translate(360,340)">
            <rect width="300" height="85" rx="10" fill="#13151c" stroke="#8B5CF6" strokeWidth="1.5" />
            <text x="150" y="20" textAnchor="middle" fill="#8B5CF6" fontSize="11" fontWeight="700">Postgres 操作</text>
            <text x="15" y="40" fill="#9ca3af" fontSize="10">1. 儲存用戶完整資料</text>
            <text x="15" y="57" fill="#9ca3af" fontSize="10">2. 記錄遊戲歷史</text>
            <text x="15" y="74" fill="#9ca3af" fontSize="10">3. 分析統計報告</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>系統架構詳解</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>React 前端：</strong>顯示即時排行榜，通過 WebSocket 連接到 Backend。每當有玩家分數更新，即刻收到推送，唔需要不停 polling。呢個係即時系統嘅標準做法。</span></li>
        <li><span className="step-num">2</span><span><strong>Backend Server：</strong>處理遊戲邏輯，玩家打完一局之後，用 ZADD 指令更新 Redis Sorted Set。然後通過 WebSocket 推送最新排名俾所有在線玩家。微秒級嘅更新速度。</span></li>
        <li><span className="step-num">3</span><span><strong>Redis Sorted Set：</strong>呢個係 Redis 最強嘅資料結構之一。每個玩家係一個 member，分數係 score。自動按分數排序，查詢 Top 100 只係 O(log N)。ZREVRANGE 攞排名，ZRANK 查個人位置，全部都係超快操作。</span></li>
        <li><span className="step-num">4</span><span><strong>Postgres 持久化：</strong>同時將用戶資料、遊戲歷史寫入 Postgres。如果 Redis crash，可以從 Postgres 重建排行榜。Postgres 負責長期儲存，Redis 負責即時查詢。完美分工。</span></li>
      </ol>

      <div className="use-case">
        <h4>組合策略嘅核心原則</h4>
        <p>Redis 做熱數據快取（排行榜、Session），Postgres 做冷數據持久化（用戶資料、歷史記錄）。呢個係最經典嘅組合。Redis 提供速度，Postgres 提供可靠性。兩個一齊用，先係完整嘅方案。</p>
      </div>

      <div className="highlight-box">
        <p style={{ color: '#fbbf24', fontSize: '0.95rem', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>記住：Redis 唔係萬能，但喺需要極低延遲嘅場景（排行榜、Session、Cache、Real-time Analytics），佢係無可取代嘅。配合傳統資料庫使用，先係正確嘅姿勢。</p>
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
        <h4>Prompt 1 — 實作 Redis Caching Layer</h4>
        <div className="prompt-text">幫我喺 <span className="placeholder">[技術棧，例如：Node.js + Express / Python + FastAPI / Go + Gin]</span> 項目入面加入 Redis caching layer。{'\n\n'}場景：<span className="placeholder">[例如：用戶 profile 頁面，每次都要 query database 好慢]</span>{'\n\n'}要求：{'\n'}- 用 Redis 做 cache-aside pattern（先查 cache，miss 先 query DB，然後寫入 cache）{'\n'}- 設定合適嘅 TTL（Time To Live）{'\n'}- 處理 cache invalidation（當數據更新時清除對應 cache）{'\n'}- 加入 cache hit/miss 嘅 logging{'\n'}- 寫出完整嘅 code，包括 Redis 連接設定{'\n'}- 加入錯誤處理（Redis 掛咗嘅時候 fallback 到直接 query DB）</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Redis Pub/Sub 即時通知系統</h4>
        <div className="prompt-text">幫我用 Redis Pub/Sub 設計一個即時通知系統。{'\n\n'}應用場景：<span className="placeholder">[例如：多人協作文件編輯器 / 即時聊天室 / 遊戲排行榜更新通知]</span>{'\n\n'}要求：{'\n'}- 用 Redis Pub/Sub 做 message broker{'\n'}- 設計 channel 命名策略（例如 notifications:user:123）{'\n'}- 前端用 WebSocket 接收即時推送{'\n'}- Backend 用 <span className="placeholder">[Node.js / Python / Go]</span> 實作{'\n'}- 處理用戶上線/離線嘅 subscribe/unsubscribe{'\n'}- 考慮 message 持久化（Redis Pub/Sub 唔會保留 message，點樣處理離線訊息）{'\n'}- 寫出完整嘅 publisher 同 subscriber code</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — Redis 任務隊列實作</h4>
        <div className="prompt-text">幫我用 Redis List 實作一個簡單嘅 task queue 系統。{'\n\n'}用途：<span className="placeholder">[例如：發送 email 隊列 / 圖片壓縮處理 / 報表生成]</span>{'\n\n'}要求：{'\n'}- 用 Redis LPUSH + BRPOP 做 producer-consumer pattern{'\n'}- 支援 task priority（高優先級 task 先處理）{'\n'}- 加入 retry 機制（task 失敗可以重試最多 3 次）{'\n'}- 實作 dead letter queue（重試 3 次仲失敗嘅 task 移去 DLQ）{'\n'}- 加入 task status tracking（pending / processing / completed / failed）{'\n'}- 用 <span className="placeholder">[Node.js / Python]</span> 寫出 producer 同 consumer 嘅完整 code</div>
      </div>
    </div>
  );
}

export default function Redis() {
  return (
    <>
      <TopicTabs
        title="Redis"
        subtitle="In-Memory Key-Value Store — 微秒級嘅延遲點樣做到"
        tabs={[
          { id: 'what', label: '① Redis 係咩', content: <WhatTab /> },
          { id: 'tradeoffs', label: '② Trade-offs', content: <TradeoffsTab /> },
          { id: 'realworld', label: '③ 實戰應用', premium: true, content: <RealworldTab /> },
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
