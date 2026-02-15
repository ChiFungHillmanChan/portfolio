import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'cdn', label: 'CDN 內容分發網絡' },
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
  { slug: 'scale-reads', label: '擴展讀取能力' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
];

function PaginationTab() {
  return (
    <div className="card">
      <h2>Pagination 分頁處理</h2>
      <div className="subtitle">將大量數據拆成細份，每次只回傳一頁</div>
      <p>
        概念好簡單 — 就好似 Google 搜尋結果咁，唔會一次過顯示幾百萬個結果，而係每頁只顯示 10 條。
        API 都係一樣，當有大量 record 需要回傳嘅時候，最常見嘅做法係用 Pagination 將數據切開，
        每次 request 只回傳指定數量嘅資料。
      </p>
      <p>
        重點係：唔好一次過 load 晒所有嘢。每個 page 只包含固定數量嘅 item（例如 20 條），
        client 需要更多就再 request 下一頁。咁樣可以大幅減少每次 response 嘅 payload size，
        亦都降低 server 同 database 嘅壓力。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pg-client-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="pg-server-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="pg-db-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="pg-page-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="pg-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#6366f1" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="pg-shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <marker id="pg-arrow-blue" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
            <marker id="pg-arrow-green" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#34d399" />
            </marker>
          </defs>

          {/* Client */}
          <rect x="30" y="50" width="130" height="56" rx="14" fill="url(#pg-client-grad)" stroke="#6366f1" strokeWidth="1.5" filter="url(#pg-glow)" />
          <text x="95" y="83" textAnchor="middle" fill="#e0e0e0" fontSize="14" fontWeight="600">Client</text>

          {/* API Server */}
          <rect x="280" y="50" width="140" height="56" rx="14" fill="url(#pg-server-grad)" stroke="#10B981" strokeWidth="1.5" filter="url(#pg-shadow)" />
          <text x="350" y="83" textAnchor="middle" fill="#e0e0e0" fontSize="14" fontWeight="600">API Server</text>

          {/* Database */}
          <rect x="540" y="50" width="130" height="56" rx="14" fill="url(#pg-db-grad)" stroke="#f59e0b" strokeWidth="1.5" filter="url(#pg-shadow)" />
          <text x="605" y="83" textAnchor="middle" fill="#e0e0e0" fontSize="14" fontWeight="600">Database</text>

          {/* Arrow: Client -> Server */}
          <path d="M160,70 C210,70 230,70 278,70" stroke="#6366f1" strokeWidth="1.8" fill="none" markerEnd="url(#pg-arrow-blue)" />
          <text x="219" y="62" textAnchor="middle" fill="#9ca3af" fontSize="11">GET /items?page=1</text>

          {/* Arrow: Server -> DB */}
          <path d="M420,78 C470,78 490,78 538,78" stroke="#f59e0b" strokeWidth="1.8" fill="none" markerEnd="url(#pg-arrow-blue)" />
          <text x="479" y="70" textAnchor="middle" fill="#9ca3af" fontSize="11">LIMIT 20 OFFSET 0</text>

          {/* Page results */}
          <rect x="170" y="160" width="120" height="48" rx="14" fill="url(#pg-page-grad)" stroke="#a5b4fc" strokeWidth="1" filter="url(#pg-shadow)" />
          <text x="230" y="188" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="600">Page 1 (1-20)</text>

          <rect x="310" y="160" width="120" height="48" rx="14" fill="url(#pg-page-grad)" stroke="#a5b4fc" strokeWidth="1" filter="url(#pg-shadow)" />
          <text x="370" y="188" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="600">Page 2 (21-40)</text>

          <rect x="450" y="160" width="120" height="48" rx="14" fill="url(#pg-page-grad)" stroke="#a5b4fc" strokeWidth="1" filter="url(#pg-shadow)" />
          <text x="510" y="188" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="600">Page 3 (41-60)</text>

          {/* Arrow: Server down to pages */}
          <path d="M350,106 C350,128 310,140 290,158" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#pg-arrow-green)" strokeDasharray="5,3" />
          <path d="M350,106 C350,128 350,140 370,158" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#pg-arrow-green)" strokeDasharray="5,3" />
          <path d="M350,106 C350,128 430,140 450,158" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#pg-arrow-green)" strokeDasharray="5,3" />

          {/* Response arrow back */}
          <path d="M280,92 C230,92 210,100 162,100" stroke="#34d399" strokeWidth="1.8" fill="none" markerEnd="url(#pg-arrow-green)" />
          <text x="219" y="114" textAnchor="middle" fill="#9ca3af" fontSize="11">20 items + nextPage</text>

          {/* Legend */}
          <rect x="170" y="240" width="360" height="76" rx="12" fill="#13151c" stroke="#2a2d3a" strokeWidth="1" />
          <text x="350" y="262" textAnchor="middle" fill="#9ca3af" fontSize="12">Response payload:</text>
          <text x="350" y="282" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontFamily="monospace">{'{ "data": [...20 items], "page": 1, "totalPages": 50,'}</text>
          <text x="350" y="300" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontFamily="monospace">{'  "nextPage": "/items?page=2" }'}</text>
        </svg>
      </div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>Client 發送 request 並帶上 page number 同 page size 參數（例如 <code>?page=1&amp;size=20</code>）</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>API Server 收到後，將參數轉換成 SQL query 嘅 LIMIT 同 OFFSET，只從 Database 讀取指定範圍嘅 record</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>Server 回傳嗰一頁嘅數據，連同 metadata（例如總頁數、下一頁嘅 link）一齊送返畀 Client</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span>Client 需要更多數據嘅時候，再 request 下一頁 — 重複以上流程</span>
        </li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>Offset-based Pagination</h4>
          <p>用 page number + page size 做參數。實現簡單，但當數據量好大嘅時候，<code>OFFSET</code> 值越大 query 越慢，因為 database 要 skip 大量 row。</p>
        </div>
        <div className="key-point">
          <h4>Cursor-based Pagination</h4>
          <p>用上一頁最後一條 record 嘅 ID 做 cursor，query 直接從嗰個位置開始。效能穩定，適合大量數據同 real-time feed 場景。</p>
        </div>
        <div className="key-point">
          <h4>Response 結構</h4>
          <p>標準做法係喺 response 入面包含 <code>nextPage</code>、<code>totalItems</code>、<code>hasMore</code> 等 metadata，等 client 知道仲有冇數據。</p>
        </div>
        <div className="key-point">
          <h4>適用場景</h4>
          <p>搜尋結果、列表頁面、歷史紀錄 — 任何需要逐步載入大量 record 嘅 API endpoint 都適合用 Pagination。</p>
        </div>
      </div>
    </div>
  );
}

function CompressionTab() {
  return (
    <div className="card">
      <h2>Compression 數據壓縮</h2>
      <div className="subtitle">壓縮之後先傳輸，大幅減少網絡 bandwidth 消耗</div>
      <p>
        概念同壓縮檔案再 send email 一模一樣。喺 server 端將 response body 壓縮之後先傳送畀 client，
        client 收到之後再解壓。特別係 JSON response 呢類文字數據，壓縮率可以去到 70-90%，
        效果非常顯著。
      </p>
      <p>
        關鍵在於 HTTP 本身就內建咗壓縮機制 — client 喺 request header 加 <code>Accept-Encoding: gzip, br</code>，
        server 就知道 client 支援邊種壓縮格式，然後用對應嘅演算法壓縮 response，
        再喺 response header 加 <code>Content-Encoding: gzip</code> 話畀 client 知。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cp-client-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="cp-server-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="cp-big-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="cp-small-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="cp-glow-green">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#10B981" floodOpacity="0.35" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="cp-shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <marker id="cp-arrow-blue" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
            <marker id="cp-arrow-green" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#34d399" />
            </marker>
          </defs>

          {/* Client */}
          <rect x="30" y="60" width="130" height="56" rx="14" fill="url(#cp-client-grad)" stroke="#6366f1" strokeWidth="1.5" filter="url(#cp-shadow)" />
          <text x="95" y="85" textAnchor="middle" fill="#e0e0e0" fontSize="13" fontWeight="600">Client</text>
          <text x="95" y="102" textAnchor="middle" fill="#9ca3af" fontSize="10">(Browser / App)</text>

          {/* Server */}
          <rect x="490" y="60" width="160" height="56" rx="14" fill="url(#cp-server-grad)" stroke="#10B981" strokeWidth="1.5" filter="url(#cp-glow-green)" />
          <text x="570" y="85" textAnchor="middle" fill="#e0e0e0" fontSize="13" fontWeight="600">API Server</text>
          <text x="570" y="102" textAnchor="middle" fill="#9ca3af" fontSize="10">(gzip / brotli)</text>

          {/* Request arrow */}
          <path d="M160,72 C260,72 340,72 488,72" stroke="#6366f1" strokeWidth="1.8" fill="none" markerEnd="url(#cp-arrow-blue)" />
          <text x="325" y="62" textAnchor="middle" fill="#a5b4fc" fontSize="11">Accept-Encoding: gzip, br</text>

          {/* Original size box */}
          <rect x="310" y="140" width="140" height="50" rx="14" fill="url(#cp-big-grad)" stroke="#f87171" strokeWidth="1" filter="url(#cp-shadow)" />
          <text x="380" y="162" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="600">Original: 2.5 MB</text>
          <text x="380" y="179" textAnchor="middle" fill="#9ca3af" fontSize="10">Raw JSON response</text>

          {/* Compressed size box */}
          <rect x="310" y="210" width="140" height="50" rx="14" fill="url(#cp-small-grad)" stroke="#34d399" strokeWidth="1" filter="url(#cp-shadow)" />
          <text x="380" y="232" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="600">Compressed: 250 KB</text>
          <text x="380" y="249" textAnchor="middle" fill="#9ca3af" fontSize="10">gzip compressed</text>

          {/* Reduction arrow */}
          <path d="M380,190 L380,208" stroke="#fbbf24" strokeWidth="2" fill="none" markerEnd="url(#cp-arrow-green)" />
          <text x="435" y="204" fill="#fbbf24" fontSize="11" fontWeight="600">-90%</text>

          {/* Response arrow (compressed) */}
          <path d="M490,100 C380,100 270,130 162,100" stroke="#34d399" strokeWidth="2.5" fill="none" markerEnd="url(#cp-arrow-green)" />
          <text x="325" y="120" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="500">Content-Encoding: gzip (250 KB)</text>

          {/* Legend */}
          <rect x="100" y="270" width="500" height="36" rx="10" fill="#13151c" stroke="#2a2d3a" strokeWidth="1" />
          <circle cx="150" cy="288" r="6" fill="#f87171" />
          <text x="165" y="292" fill="#9ca3af" fontSize="11">未壓縮 (2.5 MB)</text>
          <circle cx="320" cy="288" r="6" fill="#34d399" />
          <text x="335" y="292" fill="#9ca3af" fontSize="11">壓縮後 (250 KB)</text>
          <text x="500" y="292" fill="#fbbf24" fontSize="11" fontWeight="600">節省 90% bandwidth</text>
        </svg>
      </div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>Client 發送 request 時，喺 header 加入 <code>Accept-Encoding: gzip, br</code>，表示支援壓縮格式</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>Server 生成 response 之後，用 gzip 或 brotli 演算法壓縮 response body</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>壓縮後嘅數據連同 <code>Content-Encoding</code> header 一齊傳返畀 Client</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span>Client（browser 或 HTTP library）自動根據 header 解壓數據，應用層面完全透明</span>
        </li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>gzip</h4>
          <p>最普及嘅 HTTP 壓縮格式，幾乎所有 browser 同 server 都支援。壓縮率高，CPU 開銷合理，適合大部分場景。</p>
        </div>
        <div className="key-point">
          <h4>Brotli (br)</h4>
          <p>Google 開發嘅較新壓縮演算法，壓縮率比 gzip 高 15-25%。壓縮速度稍慢，但解壓速度快，適合靜態資源。</p>
        </div>
        <div className="key-point">
          <h4>適用範圍</h4>
          <p>文字類數據（JSON、HTML、CSV）壓縮效果最好。圖片、影片等已經壓縮過嘅 binary 數據再壓縮收效甚微。</p>
        </div>
        <div className="key-point">
          <h4>注意事項</h4>
          <p>壓縮會消耗 server CPU，高流量場景建議用 reverse proxy（如 Nginx）負責壓縮，避免 application server 負擔過重。</p>
        </div>
      </div>
    </div>
  );
}

function OffloadTab() {
  return (
    <div className="card">
      <h2>S3 Offloading 卸載到 Object Storage</h2>
      <div className="subtitle">當壓縮都唔夠用，將數據上傳到 S3 再畀 client 自己下載</div>
      <p>
        有時候就算做咗 Compression，response 依然太大。例如要匯出幾十萬行嘅報表、大型 CSV 檔案，
        又或者 response payload 達到幾百 MB。呢種情況下，直接透過 API response 傳輸數據會好慢，
        而且容易 timeout。
      </p>
      <p>
        常見嘅做法係：server 將數據生成好之後上傳到 S3（或者其他 Object Storage），然後只回傳一個
        pre-signed download URL 畀 client。咁樣 API server 唔使自己管理大檔案嘅傳輸，
        由 S3 嘅 CDN 基礎設施去處理。重點係將「生成數據」同「傳輸數據」兩個責任分開。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="s3-client-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="s3-api-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="s3-db-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="s3-bucket-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="s3-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.35" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="s3-shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <marker id="s3-arrow-blue" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
            <marker id="s3-arrow-green" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#34d399" />
            </marker>
            <marker id="s3-arrow-amber" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
            </marker>
            <marker id="s3-arrow-red" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
            </marker>
          </defs>

          {/* Client */}
          <rect x="30" y="40" width="130" height="56" rx="14" fill="url(#s3-client-grad)" stroke="#6366f1" strokeWidth="1.5" filter="url(#s3-shadow)" />
          <text x="95" y="65" textAnchor="middle" fill="#e0e0e0" fontSize="13" fontWeight="600">Client</text>
          <text x="95" y="82" textAnchor="middle" fill="#9ca3af" fontSize="10">(Browser / App)</text>

          {/* API Server */}
          <rect x="280" y="40" width="150" height="56" rx="14" fill="url(#s3-api-grad)" stroke="#10B981" strokeWidth="1.5" filter="url(#s3-shadow)" />
          <text x="355" y="65" textAnchor="middle" fill="#e0e0e0" fontSize="13" fontWeight="600">API Server</text>
          <text x="355" y="82" textAnchor="middle" fill="#9ca3af" fontSize="10">(Generate data)</text>

          {/* Database */}
          <rect x="530" y="40" width="130" height="56" rx="14" fill="url(#s3-db-grad)" stroke="#f59e0b" strokeWidth="1.5" filter="url(#s3-shadow)" />
          <text x="595" y="65" textAnchor="middle" fill="#e0e0e0" fontSize="13" fontWeight="600">Database</text>
          <text x="595" y="82" textAnchor="middle" fill="#9ca3af" fontSize="10">(Source data)</text>

          {/* S3 Bucket */}
          <rect x="280" y="180" width="150" height="62" rx="14" fill="url(#s3-bucket-grad)" stroke="#f87171" strokeWidth="1.5" filter="url(#s3-glow)" />
          <text x="355" y="205" textAnchor="middle" fill="#e0e0e0" fontSize="13" fontWeight="600">S3 Bucket</text>
          <text x="355" y="224" textAnchor="middle" fill="#9ca3af" fontSize="10">(Object Storage)</text>

          {/* Step 1: Client -> API */}
          <path d="M160,55 C210,55 230,55 278,55" stroke="#6366f1" strokeWidth="1.8" fill="none" markerEnd="url(#s3-arrow-blue)" />
          <text x="219" y="47" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="500">1. POST /export</text>

          {/* Step 2: API -> Database */}
          <path d="M430,68 C470,68 500,68 528,68" stroke="#fbbf24" strokeWidth="1.8" fill="none" markerEnd="url(#s3-arrow-amber)" />
          <text x="479" y="60" textAnchor="middle" fill="#fbbf24" fontSize="10">2. Query data</text>

          {/* Step 3: API -> S3 upload */}
          <path d="M355,96 C355,120 355,148 355,178" stroke="#f87171" strokeWidth="1.8" fill="none" markerEnd="url(#s3-arrow-red)" />
          <text x="400" y="140" fill="#f87171" fontSize="10" fontWeight="500">3. Upload file</text>

          {/* Step 4: API returns URL to Client */}
          <path d="M280,86 C220,110 180,100 162,86" stroke="#34d399" strokeWidth="1.8" fill="none" markerEnd="url(#s3-arrow-green)" />
          <text x="200" y="116" textAnchor="middle" fill="#34d399" fontSize="10">4. Return download URL</text>

          {/* Step 5: Client downloads from S3 */}
          <path d="M95,96 C95,170 140,210 278,210" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#s3-arrow-blue)" strokeDasharray="6,3" />
          <text x="150" y="195" fill="#a5b4fc" fontSize="10" fontWeight="500">5. Download from S3</text>

          {/* Flow summary */}
          <rect x="70" y="275" width="560" height="85" rx="12" fill="#13151c" stroke="#2a2d3a" strokeWidth="1" />
          <text x="350" y="298" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="600">Flow Summary</text>
          <text x="350" y="318" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontFamily="monospace">{'Client --request--> API --query--> DB'}</text>
          <text x="350" y="336" textAnchor="middle" fill="#f87171" fontSize="11" fontFamily="monospace">{'API --upload--> S3 --url--> Client --download--> S3'}</text>
          <text x="350" y="352" textAnchor="middle" fill="#9ca3af" fontSize="10">API server 唔使處理大檔案傳輸，由 S3 CDN 負責</text>
        </svg>
      </div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>Client 發送匯出請求（例如 <code>POST /reports/export</code>）</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>API Server 從 Database 查詢所需數據，生成完整嘅檔案（CSV、Excel、JSON 等）</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>將生成好嘅檔案上傳到 S3 Bucket，取得一個 pre-signed URL（帶有過期時間同存取權限）</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span>API 只回傳 download URL 畀 Client — response payload 極細，通常只有幾百 bytes</span>
        </li>
        <li>
          <span className="step-num">5</span>
          <span>Client 用呢個 URL 直接從 S3 下載檔案，享受 S3 高速下載基礎設施嘅優勢</span>
        </li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>Pre-signed URL</h4>
          <p>帶有簽名嘅臨時下載連結，設定過期時間（例如 15 分鐘），過期後就無法再存取。安全又方便。</p>
        </div>
        <div className="key-point">
          <h4>異步處理</h4>
          <p>如果數據生成耗時較長，可以先回傳 202 Accepted，然後用 polling 或 webhook 通知 client 下載連結。</p>
        </div>
        <div className="key-point">
          <h4>成本效益</h4>
          <p>S3 儲存同傳輸費用極低，而且自帶 CDN 能力，全球各地下載速度都快，比 API server 直傳划算得多。</p>
        </div>
        <div className="key-point">
          <h4>責任分離</h4>
          <p>API server 只負責「生成數據」，S3 負責「儲存同傳輸」。各司其職，server 唔會因為大檔案傳輸而 block。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>部署建議</h4>
        <p>
          呢個 pattern 特別適合匯出報表、大型 CSV 下載、log 檔案匯出等場景。
          建議配合 Task Queue 使用 — client 發請求後立即收到 job ID，server 喺背景處理完再通知。
          S3 嘅 pre-signed URL 記得設定合理嘅過期時間，通常 15-60 分鐘已經足夠。
          同時亦建議設定 S3 lifecycle policy，自動清理過期嘅匯出檔案，避免儲存成本無限增長。
        </p>
      </div>
    </div>
  );
}

function AiViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻開始 Build</div>

      <div className="prompt-card">
        <h4>Prompt 1 — 實現 Pagination + Streaming 大數據回應</h4>
        <div className="prompt-text">{'幫手實現一個完整嘅 Large API Response 處理方案，用 '}<span className="placeholder">[Node.js / Python / Go / Java]</span>{' 建立。\n\n需求場景：一個 API endpoint 需要回傳 '}<span className="placeholder">[用戶列表 / 訂單紀錄 / 產品目錄]</span>{'，總數據量可能達到 '}<span className="placeholder">[10 萬 / 100 萬]</span>{' 條記錄。\n\n需要實現以下功能：\n1. Cursor-based Pagination：用 cursor 取代 offset，確保大數據量下效能穩定\n2. Server-Sent Events (SSE) Streaming：對需要即時更新嘅場景提供 streaming response\n3. Response 自動壓縮 Middleware（gzip + brotli，根據 Accept-Encoding 自動選擇）\n4. 分頁 metadata 標準格式（nextCursor、hasMore、totalCount）\n5. Rate Limiting 防止 client 過度請求\n\n技術棧：'}<span className="placeholder">[框架名]</span>{' + '}<span className="placeholder">[PostgreSQL / MySQL]</span>{' + Redis（快取熱門查詢）\n\n請提供完整嘅 API code、Database query 優化建議、同 client 端消費範例。'}</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 API Response 優化架構</h4>
        <div className="prompt-text">{'幫手設計一個完整嘅 API Response 優化架構，針對 '}<span className="placeholder">[電商平台 / SaaS 應用 / 數據分析平台]</span>{'。\n\n現有問題：\n- 部分 API endpoint 回應時間超過 '}<span className="placeholder">[3 秒 / 5 秒 / 10 秒]</span>{'\n- Response payload 大小經常超過 '}<span className="placeholder">[5MB / 10MB / 50MB]</span>{'\n- 大量 export 請求會拖慢整個 API server\n\n需要設計嘅方案：\n1. 多層快取策略：CDN Cache → Redis Cache → Application Cache\n2. S3 Offloading Pipeline：大檔案匯出 → 上傳 S3 → 回傳 pre-signed URL\n3. 異步 Job Queue：長時間嘅數據處理放入 background job，用 webhook 或 polling 通知完成\n4. GraphQL 或 Sparse Fieldsets：令 client 只請求需要嘅 field，減少 response size\n5. 監控同 alerting：追蹤 response time、payload size、error rate\n\n請提供架構圖描述、每個組件嘅技術選型建議、同實施優先順序。'}</div>
      </div>
    </div>
  );
}

const tabs = [
  { key: 'pagination', label: '① 分頁處理', content: <PaginationTab /> },
  { key: 'compression', label: '② 數據壓縮', content: <CompressionTab /> },
  { key: 'offload', label: '③ S3 卸載', content: <OffloadTab />, premium: true },
  { key: 'ai-viber', label: '④ AI Viber', content: <AiViberTab />, premium: true },
];

export default function LargeAPIResponse() {
  return (
    <>
      <TopicTabs
        title="Large API Response 處理策略"
        subtitle="當 API 需要回傳大量數據，點樣有效咁處理同優化回應"
        tabs={tabs}
      />
      <QuizRenderer quizData={quizData} />
      <RelatedTopics topics={relatedTopics} />
    </>
  );
}
