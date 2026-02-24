import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Forward Proxy 同 Reverse Proxy 最大嘅分別係咩？',
    options: [
      { text: 'Forward Proxy 代表 Client，Reverse Proxy 代表 Server', correct: true, explanation: 'Forward Proxy 企喺 Client 前面，幫 Client 去訪問外部資源（Client 知道自己用緊 proxy）。Reverse Proxy 企喺 Server 前面，幫 Server 接收請求（Client 唔知道後面有幾多台 Server）。' },
      { text: 'Forward Proxy 更快', correct: false, explanation: '速度唔係兩者嘅分別，兩者嘅角色同用途先係重點。' },
      { text: 'Reverse Proxy 唔支持 HTTPS', correct: false, explanation: 'Reverse Proxy 通常負責 SSL Termination，係 HTTPS 嘅核心部分。' },
      { text: 'Forward Proxy 只用喺企業網絡', correct: false, explanation: 'Forward Proxy 喺好多場景都有用（VPN、翻牆、隱私保護），唔止係企業網絡。' },
    ],
  },
  {
    question: 'SSL Termination 放喺 Reverse Proxy 嘅好處係咩？',
    options: [
      { text: '令加密更安全', correct: false, explanation: 'SSL Termination 嘅重點唔係安全（加密強度一樣），而係效能優化。' },
      { text: '後端 Server 唔使處理 SSL 加解密，減少 CPU 負擔，集中管理證書', correct: true, explanation: 'SSL/TLS 嘅加解密好食 CPU。將呢個工作交俾 Reverse Proxy（例如 Nginx），後面嘅 backend Server 只需要處理 HTTP（唔使 HTTPS），CPU 可以專注處理業務邏輯。仲有，SSL 證書只需要喺 Reverse Proxy 管理一次，唔使每台 Server 都裝。' },
      { text: '唔使買 SSL 證書', correct: false, explanation: '無論放喺邊度都需要 SSL 證書（可以用 Let\'s Encrypt 免費攞）。' },
      { text: '令 Client 可以直接連接 Backend', correct: false, explanation: 'SSL Termination 嘅目的係減少 Backend 嘅工作，唔係令 Client 繞過 Proxy。' },
    ],
  },
  {
    question: 'Nginx 做 Reverse Proxy 嘅時候，以下邊個 header 一定要加？',
    options: [
      { text: 'X-Powered-By', correct: false, explanation: 'X-Powered-By 反而建議移除，因為會暴露 server 技術棧，有安全風險。' },
      { text: 'X-Forwarded-For 同 X-Real-IP', correct: true, explanation: '因為 Reverse Proxy 會改變 request 嘅 source IP（Backend 睇到嘅係 Proxy 嘅 IP，唔係 Client 嘅真實 IP）。加 X-Forwarded-For 同 X-Real-IP header 令 Backend 可以知道 Client 嘅真實 IP，對 logging、rate limiting、地理位置定位都好重要。' },
      { text: 'Content-Length', correct: false, explanation: 'Content-Length 係 HTTP 標準 header，Nginx 會自動處理，唔使手動加。' },
      { text: 'Cache-Control', correct: false, explanation: 'Cache-Control 由 Backend 設定更合理，唔係 Reverse Proxy 一定要加嘅 header。' },
    ],
  },
  {
    question: 'Reverse Proxy 嘅 Connection Pooling 解決咩問題？',
    options: [
      { text: '減少 Client 同 Proxy 之間嘅連接數', correct: false, explanation: 'Connection Pooling 主要優化嘅係 Proxy 同 Backend 之間嘅連接，唔係 Client 同 Proxy 之間。' },
      { text: '重複使用 Proxy 同 Backend 之間嘅 TCP 連接，避免頻繁嘅三次握手開銷', correct: true, explanation: '每次建立 TCP 連接都要經過三次握手（SYN → SYN-ACK → ACK），好食時間。Connection Pooling 令 Proxy 保持一組同 Backend 嘅長連接，新 request 可以直接用現有連接，大幅減少延遲。' },
      { text: '加密所有連接', correct: false, explanation: '加密靠 SSL/TLS，唔係 Connection Pooling 嘅功能。' },
      { text: '自動修復損壞嘅連接', correct: false, explanation: '修復損壞連接靠 health check，唔係 Connection Pooling。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
  { slug: 'cdn', label: 'CDN 內容分發網絡' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Reverse Proxy 係咩</h2>
      <div className="subtitle">企喺 Server 前面嘅「守門員」——Client 永遠唔知道後面有幾多台 Server</div>
      <p>
        首先要分清楚兩種 Proxy：<strong style={{ color: '#3B82F6' }}>Forward Proxy</strong> 企喺 Client 前面（幫 Client 出去），<strong style={{ color: '#34d399' }}>Reverse Proxy</strong> 企喺 Server 前面（幫 Server 接客）。日常講嘅 Proxy Server 通常係 Forward Proxy（例如 VPN），而做後端架構嘅 Proxy 就係 Reverse Proxy。
      </p>
      <p>
        <strong style={{ color: '#fbbf24' }}>Nginx</strong> 係最常見嘅 Reverse Proxy。佢接收所有 Client 嘅請求，然後決定轉發去邊台 Backend Server。Client 永遠只同 Nginx 溝通，唔知道後面有幾多台 Server、用咩技術棧。呢個就係 Reverse Proxy 嘅核心概念。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradClient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradProxy" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradBackend" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradStatic" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8b5cf6" /></marker>
          </defs>

          {/* Internet Cloud */}
          <g transform="translate(20,100)">
            <rect width="120" height="70" rx="14" fill="url(#gradClient)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Clients</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">HTTPS 請求</text>
          </g>

          {/* SSL Badge */}
          <g transform="translate(155,70)">
            <rect width="80" height="30" rx="8" fill="rgba(239,68,68,0.1)" stroke="#f87171" strokeWidth="1.5" />
            <text x="40" y="20" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">SSL/TLS</text>
          </g>

          {/* Reverse Proxy (Nginx) */}
          <g transform="translate(260,60)">
            <rect width="170" height="150" rx="14" fill="url(#gradProxy)" stroke="#F59E0B" strokeWidth="2.5" filter="url(#glowAmber)" />
            <text x="85" y="30" textAnchor="middle" fill="#F59E0B" fontSize="15" fontWeight="700">Nginx</text>
            <text x="85" y="50" textAnchor="middle" fill="#fbbf24" fontSize="11">Reverse Proxy</text>
            <text x="85" y="75" textAnchor="middle" fill="#9ca3af" fontSize="9">SSL Termination</text>
            <text x="85" y="90" textAnchor="middle" fill="#9ca3af" fontSize="9">靜態資源服務</text>
            <text x="85" y="105" textAnchor="middle" fill="#9ca3af" fontSize="9">Gzip 壓縮</text>
            <text x="85" y="120" textAnchor="middle" fill="#9ca3af" fontSize="9">Connection Pooling</text>
            <text x="85" y="140" textAnchor="middle" fill="#9ca3af" fontSize="9">Rate Limiting</text>
          </g>

          {/* Backend Server 1 */}
          <g transform="translate(520,20)">
            <rect width="140" height="60" rx="14" fill="url(#gradBackend)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="24" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">API Server 1</text>
            <text x="70" y="44" textAnchor="middle" fill="#34d399" fontSize="10">Node.js :3001</text>
          </g>

          {/* Backend Server 2 */}
          <g transform="translate(520,110)">
            <rect width="140" height="60" rx="14" fill="url(#gradBackend)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="24" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">API Server 2</text>
            <text x="70" y="44" textAnchor="middle" fill="#34d399" fontSize="10">Node.js :3002</text>
          </g>

          {/* Backend Server 3 */}
          <g transform="translate(520,200)">
            <rect width="140" height="60" rx="14" fill="url(#gradBackend)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="24" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">API Server 3</text>
            <text x="70" y="44" textAnchor="middle" fill="#34d399" fontSize="10">Node.js :3003</text>
          </g>

          {/* Static Files */}
          <g transform="translate(520,290)">
            <rect width="140" height="60" rx="14" fill="url(#gradStatic)" stroke="#8b5cf6" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="24" textAnchor="middle" fill="#8b5cf6" fontSize="12" fontWeight="700">Static Files</text>
            <text x="70" y="44" textAnchor="middle" fill="#a78bfa" fontSize="10">直接由 Nginx 返回</text>
          </g>

          {/* Arrows */}
          <path d="M142,135 C180,135 210,130 258,130" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="200" y="128" textAnchor="middle" fill="#a5b4fc" fontSize="9">HTTPS</text>

          <path d="M432,110 C460,95 490,70 518,55" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <path d="M432,135 C460,135 490,138 518,140" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <path d="M432,160 C460,175 490,210 518,225" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <text x="475" y="90" fill="#34d399" fontSize="9">HTTP（內部）</text>

          <path d="M432,185 C460,230 490,290 518,310" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrPurple)" />
          <text x="460" y="270" fill="#a78bfa" fontSize="9">/static/*</text>

          {/* HTTP only badge */}
          <g transform="translate(455,120)">
            <rect width="50" height="22" rx="6" fill="rgba(16,185,129,0.1)" stroke="#10B981" strokeWidth="1" />
            <text x="25" y="15" textAnchor="middle" fill="#34d399" fontSize="9">HTTP</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>Reverse Proxy 做咗啲咩</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#f87171' }}>SSL Termination</strong>：Nginx 處理 HTTPS 加解密，後面嘅 Backend Server 只需要處理 HTTP。大幅減少 Backend 嘅 CPU 負擔，SSL 證書亦只需要喺 Nginx 管理一次。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#34d399' }}>請求轉發</strong>：根據 URL path 將請求轉發去唔同嘅 Backend Server。例如 /api/* 去 API Server，/static/* 直接由 Nginx 返回靜態檔案。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#fbbf24' }}>負載均衡</strong>：如果有多台 Backend Server，Nginx 可以用 Round Robin、Least Connections 等策略分配請求。（所以 Reverse Proxy 同 Load Balancer 有好多重疊。）</span></li>
        <li><span className="step-num">4</span><span><strong style={{ color: '#8B5CF6' }}>靜態資源服務</strong>：Nginx 直接返回靜態檔案（HTML、CSS、JS、圖片），唔使打 Backend Server，效率極高。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階功能</h2>
      <div className="subtitle">SSL Termination / 壓縮 / Connection Pooling / Caching</div>
      <div className="key-points">
        <div className="key-point">
          <h4>SSL Termination 詳解</h4>
          <p>Client 同 Nginx 之間用 HTTPS（加密），Nginx 同 Backend 之間用 HTTP（唔加密）。呢個架構叫 <strong style={{ color: '#fbbf24' }}>SSL Termination</strong>（亦叫 TLS Offloading）。如果 Backend 同 Nginx 喺同一個內部網絡，HTTP 係安全嘅。如果要喺內部網絡都加密，就要用 <strong style={{ color: '#f87171' }}>SSL Re-encryption</strong>（Nginx → Backend 都用 HTTPS）。</p>
        </div>
        <div className="key-point">
          <h4>Gzip / Brotli 壓縮</h4>
          <p>Nginx 可以壓縮 response body 先傳返俾 Client，大幅減少傳輸數據量。JSON response 壓縮率通常有 70-80%。建議 Nginx 開 <code style={{ color: '#60a5fa' }}>gzip on</code>，對文本類型（HTML、CSS、JS、JSON）啟用壓縮。Brotli 壓縮率比 Gzip 高 15-20%，但需要裝額外 module。</p>
        </div>
        <div className="key-point">
          <h4>Connection Pooling（keepalive）</h4>
          <p>Nginx 同 Backend 之間保持一組長連接（TCP keepalive），新 request 可以重複使用現有連接。避免每次 request 都要做 TCP 三次握手。設定 <code style={{ color: '#60a5fa' }}>upstream</code> block 入面嘅 <code style={{ color: '#60a5fa' }}>keepalive 64</code> 就可以保持 64 條長連接。</p>
        </div>
        <div className="key-point">
          <h4>Response Caching</h4>
          <p>Nginx 可以 cache Backend 嘅 response。如果同一個 URL 嘅 response 冇變，Nginx 直接返回 cached 版本，唔使打 Backend。設定 <code style={{ color: '#60a5fa' }}>proxy_cache_path</code> 同 <code style={{ color: '#60a5fa' }}>proxy_cache</code> 指令就搞掂。對讀多寫少嘅 API 非常有效。</p>
        </div>
        <div className="key-point">
          <h4>Request Buffering</h4>
          <p>Nginx 可以先完整接收 Client 嘅 request body，然後先轉發去 Backend。呢個保護 Backend 免受 slow client 嘅影響（例如 Client 網絡差，慢慢傳數據）。Nginx 用佢嘅高效 event loop 處理呢啲 slow connection，Backend 只需要處理已經完整嘅 request。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">Nginx 配置模式、Rate Limiting、同常見陷阱</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Nginx 基本配置模式</h4>
          <p>最常見嘅 Nginx Reverse Proxy 配置：<code style={{ color: '#60a5fa' }}>upstream</code> 定義 backend server 列表，<code style={{ color: '#60a5fa' }}>server</code> block 定義 listening port 同 SSL 證書，<code style={{ color: '#60a5fa' }}>location</code> block 定義 URL 路由規則。記住 <code style={{ color: '#60a5fa' }}>proxy_pass</code> 係核心指令——告訴 Nginx 將請求轉發去邊度。</p>
        </div>
        <div className="key-point">
          <h4>Rate Limiting at Proxy Level</h4>
          <p>Nginx 內建 <code style={{ color: '#60a5fa' }}>limit_req</code> module，可以做 IP-based rate limiting。好處係喺最前端就擋住惡意流量，唔使打 Backend。設定 <code style={{ color: '#60a5fa' }}>limit_req_zone</code> 定義 rate，<code style={{ color: '#60a5fa' }}>limit_req</code> 應用到特定 location。配合 <code style={{ color: '#60a5fa' }}>burst</code> 參數容許短暫嘅突發流量。</p>
        </div>
        <div className="key-point">
          <h4>X-Forwarded-For 同 X-Real-IP</h4>
          <p>Nginx 做 Reverse Proxy 嘅時候，Backend 睇到嘅 source IP 係 Nginx 嘅 IP，唔係 Client 嘅真實 IP。一定要加 <code style={{ color: '#60a5fa' }}>proxy_set_header X-Real-IP $remote_addr</code> 同 <code style={{ color: '#60a5fa' }}>proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for</code>。唔加嘅話，Backend 嘅 logging 同 rate limiting 全部會出問題。</p>
        </div>
        <div className="key-point">
          <h4>Health Check 同 Failover</h4>
          <p>Nginx Plus（商業版）有主動 health check。開源版可以用 <code style={{ color: '#60a5fa' }}>max_fails</code> 同 <code style={{ color: '#60a5fa' }}>fail_timeout</code> 做被動 health check——如果一台 Backend 連續失敗幾次，Nginx 會暫時唔再送請求過去。</p>
        </div>
        <div className="key-point">
          <h4>Nginx vs Traefik vs Caddy</h4>
          <p><strong style={{ color: '#fbbf24' }}>Nginx</strong>：最成熟、性能最好、配置語法要學。<strong style={{ color: '#34d399' }}>Traefik</strong>：自動 service discovery（Docker/K8s 友好）、自動 Let's Encrypt。<strong style={{ color: '#8B5CF6' }}>Caddy</strong>：自動 HTTPS、配置最簡單。新手建議 Caddy 入門，生產環境 Nginx 最穩。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>面試重點</h4>
        <p>講 Reverse Proxy 嘅時候，一定要提到 SSL Termination、靜態資源服務、同負載均衡。再加上 Connection Pooling 同 Gzip 壓縮就更加完整。最後講一下 Nginx vs Load Balancer 嘅分別（Nginx 更多功能但通常做 L7，Load Balancer 可以做 L4）。</p>
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
        <h4>Prompt 1 — Nginx Reverse Proxy 完整配置</h4>
        <div className="prompt-text">
          幫手寫一份 production-ready 嘅 Nginx Reverse Proxy 配置。{'\n\n'}場景：<span className="placeholder">[例如：Node.js API + React SPA / 多個微服務 / WordPress + API]</span>{'\n\n'}要求：{'\n'}- SSL/TLS 配置：{'\n'}  - Let's Encrypt 證書（用 certbot 自動續期）{'\n'}  - SSL 安全設定（TLS 1.2+、強 cipher suites、HSTS）{'\n'}  - HTTP → HTTPS 自動跳轉{'\n'}- Reverse Proxy 路由：{'\n'}  - /api/* → Backend API Server（<span className="placeholder">[localhost:3001]</span>）{'\n'}  - /ws → WebSocket Proxy（Upgrade 支持）{'\n'}  - /* → 靜態檔案目錄（React build）{'\n'}- 性能優化：{'\n'}  - Gzip 壓縮（文本類型）{'\n'}  - 靜態資源 Cache-Control（max-age=1 年 + immutable）{'\n'}  - Connection Pooling（upstream keepalive）{'\n'}  - Worker 同 connection 數量建議{'\n'}- 安全設定：{'\n'}  - Rate Limiting（<span className="placeholder">[100 req/min per IP]</span>）{'\n'}  - X-Forwarded-For / X-Real-IP headers{'\n'}  - 隱藏 Server version{'\n'}  - Security headers（CSP、X-Frame-Options）{'\n\n'}請提供完整嘅 nginx.conf 同 Docker Compose 配置（Nginx + certbot + backend）。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Nginx 性能調優同監控</h4>
        <div className="prompt-text">
          幫手設計一套 Nginx 性能調優同監控方案。{'\n\n'}現有環境：{'\n'}- Nginx 做 Reverse Proxy，後面有 <span className="placeholder">[3 / 5 / 10]</span> 台 Backend Server{'\n'}- 每日 <span className="placeholder">[100 萬 / 1000 萬]</span> 個請求{'\n'}- Server 規格：<span className="placeholder">[例如：4 核 8GB RAM]</span>{'\n\n'}需要調優嘅部分：{'\n'}1. Worker Processes 同 Connections 最佳設定{'\n'}2. Buffer 大小調整（proxy_buffer_size、proxy_buffers）{'\n'}3. Timeout 設定（connect、send、read）{'\n'}4. Keepalive 策略（client-side 同 upstream-side）{'\n'}5. File Cache 同 Open File Cache{'\n'}6. Upstream Load Balancing 策略選擇{'\n\n'}監控需求：{'\n'}- Nginx stub_status + Prometheus exporter{'\n'}- 關鍵指標：active connections、request rate、response time P99、4xx/5xx rate{'\n'}- Grafana Dashboard 模板{'\n'}- Alert 規則（error rate &gt; 5%、P99 &gt; 2s）{'\n\n'}請提供完整嘅 nginx.conf 調優版本、Prometheus 配置同 Grafana JSON Dashboard。
        </div>
      </div>
    </div>
  );
}

export default function ReverseProxy() {
  return (
    <>
      <TopicTabs
        title="反向代理"
        subtitle="Nginx / 靜態資源 / SSL Termination"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階功能', content: <AdvancedTab /> },
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
