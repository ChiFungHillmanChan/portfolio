import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'port-forwarding', label: 'Port Forwarding 端口轉發' },
  { slug: 'deployment', label: '免費部署平台' },
  { slug: 'docker', label: 'Docker 容器化' },
];

function NgrokTab() {
  return (
    <div className="card">
      <h2>最簡單嘅分享方式：ngrok</h2>
      <div className="subtitle">三步搞掂，即刻將 localhost 變成公開網址</div>
      <p>
        有時啱啱寫好一個功能，想即刻 demo 畀同事或者朋友睇，但唔想花時間 deploy 上去 production server。以下介紹一個超快嘅方法——用 <strong style={{ color: '#6366f1' }}>ngrok</strong>。
      </p>
      <p>
        ngrok 係一個工具，可以將本地跑緊嘅 server（例如 <code>localhost:3000</code>）透過一個公開嘅網址（例如 <code>https://abc123.ngrok.io</code>）暴露出去，任何人都可以 access。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#a5b4fc', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#34d399', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#6366f1">
              <polygon points="0 0, 10 3, 0 6" />
            </marker>
          </defs>

          {/* Title */}
          <text x="400" y="30" textAnchor="middle" fill="#9ca3af" fontSize="13" fontWeight="500">ngrok 運作流程</text>

          {/* Local Server */}
          <g transform="translate(50,80)">
            <rect width="180" height="140" rx="14" fill="#1e293b" stroke="#6366f1" strokeWidth="2" filter="url(#shadow)" />
            <text x="90" y="30" textAnchor="middle" fill="#6366f1" fontSize="13" fontWeight="700">本地電腦</text>

            {/* Node Server Box */}
            <rect x="20" y="50" width="140" height="70" rx="8" fill="#0a0b10" stroke="#34d399" strokeWidth="1.5" />
            <text x="90" y="72" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">Node Server</text>
            <text x="90" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">localhost:3000</text>
            <text x="90" y="106" textAnchor="middle" fill="#c0c4cc" fontSize="9">npm run dev</text>
          </g>

          {/* Arrow 1: Local to ngrok */}
          <path d="M 240 150 Q 320 150 320 150 L 370 150" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" filter="url(#glow)" />
          <text x="305" y="140" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="500">ngrok http 3000</text>

          {/* ngrok Process */}
          <g transform="translate(370,80)">
            <rect width="160" height="140" rx="14" fill="#1e293b" stroke="#6366f1" strokeWidth="2" filter="url(#shadow)" />
            <text x="80" y="30" textAnchor="middle" fill="#6366f1" fontSize="13" fontWeight="700">ngrok 隧道</text>

            {/* Tunnel Box */}
            <rect x="15" y="50" width="130" height="70" rx="8" fill="#0a0b10" stroke="url(#grad1)" strokeWidth="1.5" />
            <text x="80" y="72" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="600">Secure Tunnel</text>
            <text x="80" y="88" textAnchor="middle" fill="#9ca3af" fontSize="9">建立加密連線</text>
            <text x="80" y="104" textAnchor="middle" fill="#c0c4cc" fontSize="9">穿透防火牆</text>
          </g>

          {/* Arrow 2: ngrok to Public URL */}
          <path d="M 540 150 Q 600 150 600 150 L 620 150" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" filter="url(#glow)" />
          <text x="580" y="140" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="500">暴露</text>

          {/* Public URL */}
          <g transform="translate(620,80)">
            <rect width="160" height="140" rx="14" fill="#1e293b" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="80" y="30" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">公開網址</text>

            {/* URL Box */}
            <rect x="15" y="50" width="130" height="70" rx="8" fill="#0a0b10" stroke="url(#grad2)" strokeWidth="1.5" />
            <text x="80" y="70" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">https://abc123</text>
            <text x="80" y="86" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">.ngrok.io</text>
            <text x="80" y="106" textAnchor="middle" fill="#9ca3af" fontSize="9">任何人都可以 access</text>
          </g>

          {/* Bottom info */}
          <g transform="translate(50,240)">
            <rect width="700" height="60" rx="10" fill="rgba(99, 102, 241, 0.1)" stroke="#6366f1" strokeWidth="1" />
            <text x="350" y="25" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="600">運作原理</text>
            <text x="350" y="45" textAnchor="middle" fill="#c0c4cc" fontSize="10">ngrok 喺本地同 cloud server 之間建立一條加密隧道，所有外部 request 會經呢條隧道轉發返去 localhost</text>
          </g>
        </svg>
      </div>

      <h3>三步開始用 ngrok</h3>
      <ul className="steps">
        <li>
          <span className="step-num">1</span>
          <span>啟動本地 server。例如跑一個 Node app：<code style={{ color: '#34d399' }}>npm run dev</code>，通常會喺 <code>localhost:3000</code> 度聽緊。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>開另一個 terminal，執行 <code style={{ color: '#6366f1' }}>ngrok http 3000</code>。ngrok 就會建立一條隧道，產生一個公開網址（例如 <code>https://abc123.ngrok.io</code>）。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>將呢個網址 share 畀任何人，對方就可以 access 本地 server。完全唔使 deploy，唔使買 domain，唔使設定 DNS。</span>
        </li>
      </ul>

      <div className="code-block">
        <code>{`# 假設你嘅 Node server 跑緊喺 port 3000
$ npm run dev
> Server running on http://localhost:3000

# 開另一個 terminal，用 ngrok 暴露 port 3000
$ ngrok http 3000

ngrok by @inconshreveable

Session Status                online
Account                       your-email@example.com
Forwarding                    https://abc123.ngrok.io -> localhost:3000`}</code>
      </div>

      <div className="key-points">
        <div className="key-point">
          <h4>適合 Demo</h4>
          <p>最適合即興 demo 畀同事、朋友或者客戶睇。唔使等 deploy，即刻分享。</p>
        </div>
        <div className="key-point">
          <h4>免費版限制</h4>
          <p>每次開 ngrok 都會產生一個隨機網址。免費版唔支援固定網址，網址會變。</p>
        </div>
        <div className="key-point">
          <h4>臨時性質</h4>
          <p>唔係長期方案。一停 ngrok process，個網址就失效。重開會得到新網址。</p>
        </div>
        <div className="key-point">
          <h4>安全考慮</h4>
          <p>ngrok 會將 localhost 暴露畀全世界。唔好 share 敏感資料，用完記得停。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>實際應用場景</h4>
        <p>可以用 ngrok 嚟測試 webhook（例如 Stripe payment、GitHub webhook）。因為 webhook 需要一個公開網址，用 ngrok 就可以即刻測試，唔使 deploy 上去 staging server。</p>
      </div>
    </div>
  );
}

function DebugTab() {
  return (
    <div className="card">
      <h2>ngrok 內置 Debug Dashboard</h2>
      <div className="subtitle">localhost:4040 — 睇晒所有 request 同 response</div>
      <p>
        好多人唔知，ngrok 其實內置咗一個超正嘅 debug dashboard。當跑緊 ngrok 嘅時候，佢會喺 <code style={{ color: '#6366f1' }}>localhost:4040</code> 開一個 web interface，可以即時睇到所有經過 ngrok 嘅 HTTP request 同 response。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#4f46e5', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="shadow2">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <marker id="arrowhead2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#34d399">
              <polygon points="0 0, 10 3, 0 6" />
            </marker>
          </defs>

          {/* Title */}
          <text x="400" y="30" textAnchor="middle" fill="#9ca3af" fontSize="13" fontWeight="500">ngrok Debug Dashboard 架構</text>

          {/* External Request */}
          <g transform="translate(50,80)">
            <rect width="140" height="80" rx="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow2)" />
            <text x="70" y="30" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="700">外部 Request</text>
            <text x="70" y="50" textAnchor="middle" fill="#c0c4cc" fontSize="10">GET /api/users</text>
            <text x="70" y="66" textAnchor="middle" fill="#9ca3af" fontSize="9">來自 abc123.ngrok.io</text>
          </g>

          {/* Arrow to ngrok */}
          <path d="M 200 120 L 280 120" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrowhead2)" />

          {/* ngrok Central Box */}
          <g transform="translate(280,60)">
            <rect width="240" height="180" rx="14" fill="url(#grad3)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow2)" />
            <text x="120" y="30" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">ngrok Process</text>

            {/* Request Inspector */}
            <rect x="20" y="50" width="200" height="50" rx="8" fill="#0a0b10" stroke="#a5b4fc" strokeWidth="1.5" />
            <text x="120" y="70" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="600">Request Inspector</text>
            <text x="120" y="88" textAnchor="middle" fill="#9ca3af" fontSize="9">記錄所有 HTTP traffic</text>

            {/* Tunnel */}
            <rect x="20" y="115" width="200" height="50" rx="8" fill="#0a0b10" stroke="#34d399" strokeWidth="1.5" />
            <text x="120" y="135" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">Secure Tunnel</text>
            <text x="120" y="153" textAnchor="middle" fill="#9ca3af" fontSize="9">轉發去 localhost:3000</text>
          </g>

          {/* Arrow to localhost */}
          <path d="M 530 150 L 610 150" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrowhead2)" />

          {/* Localhost Server */}
          <g transform="translate(610,80)">
            <rect width="140" height="80" rx="14" fill="#1e293b" stroke="#34d399" strokeWidth="2" filter="url(#shadow2)" />
            <text x="70" y="30" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Localhost</text>
            <text x="70" y="50" textAnchor="middle" fill="#c0c4cc" fontSize="10">localhost:3000</text>
            <text x="70" y="66" textAnchor="middle" fill="#9ca3af" fontSize="9">本地 Node server</text>
          </g>

          {/* Dashboard Access */}
          <g transform="translate(280,260)">
            <rect width="240" height="70" rx="14" fill="#1e293b" stroke="#a5b4fc" strokeWidth="2" filter="url(#shadow2)" />
            <text x="120" y="25" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="700">Web Dashboard</text>
            <text x="120" y="45" textAnchor="middle" fill="#c0c4cc" fontSize="11">http://localhost:4040</text>
            <text x="120" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">睇晒所有 request 詳情</text>
          </g>

          {/* Arrow from ngrok to dashboard */}
          <path d="M 400 240 L 400 255" stroke="#a5b4fc" strokeWidth="2" fill="none" markerEnd="url(#arrowhead2)" strokeDasharray="4,4" />
          <text x="420" y="250" fill="#a5b4fc" fontSize="9">即時更新</text>

          {/* Browser */}
          <g transform="translate(50,270)">
            <rect width="140" height="60" rx="10" fill="#0a0b10" stroke="#6366f1" strokeWidth="1.5" />
            <text x="70" y="25" textAnchor="middle" fill="#6366f1" fontSize="11" fontWeight="600">本地瀏覽器</text>
            <text x="70" y="43" textAnchor="middle" fill="#9ca3af" fontSize="9">開住 localhost:4040</text>
          </g>

          {/* Arrow browser to dashboard */}
          <path d="M 200 300 L 270 300" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowhead2)" strokeDasharray="4,4" />
        </svg>
      </div>

      <h3>Dashboard 功能</h3>
      <div className="key-points">
        <div className="key-point">
          <h4>Request List</h4>
          <p>睇晒所有經過 ngrok 嘅 request，包括 timestamp、method、path、status code。</p>
        </div>
        <div className="key-point">
          <h4>Request Details</h4>
          <p>Click 入去任何一個 request，睇晒 headers、query params、request body、response body。</p>
        </div>
        <div className="key-point">
          <h4>Replay Request</h4>
          <p>可以 replay 任何一個 request，方便測試同 debug。唔使手動再 send 一次。</p>
        </div>
        <div className="key-point">
          <h4>Filter &amp; Search</h4>
          <p>可以 filter by status code、path、或者搜尋特定 keyword。處理大量 request 時超有用。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>Debug Webhook 嘅神器</h4>
        <p>ngrok dashboard 最適合用嚟 debug webhook。當 Stripe 或者 GitHub send webhook 嘅時候，可以即刻喺 localhost:4040 睇到完整嘅 request body、headers、甚至 raw JSON。唔使加 console.log，一切都清清楚楚。</p>
      </div>

      <div className="warning-box">
        <h4>記得開住 Dashboard</h4>
        <p>每次跑 ngrok 之後，記得喺瀏覽器開住 <code>http://localhost:4040</code>。呢個 dashboard 只有喺本地先睇到，外部人係 access 唔到嘅。</p>
      </div>
    </div>
  );
}

function PermanentTab() {
  return (
    <div className="card">
      <h2>永久自架方案：Cloudflare Tunnel</h2>
      <div className="subtitle">更高安全性、更穩定、可以用自己嘅 domain</div>
      <p>
        ngrok 好用，但有幾個限制：免費版每次都產生一個隨機網址、停咗 process 就冇咗、唔可以用自己嘅 domain。如果需要一個<strong>長期穩定</strong>嘅方案，建議用 <span style={{ color: '#f59e0b', fontWeight: 600 }}>Cloudflare Tunnel</span>。
      </p>
      <p>
        Cloudflare Tunnel（以前叫 Argo Tunnel）係 Cloudflare 提供嘅服務，可以將本地或者自架嘅 server 安全咁暴露到互聯網，而且<strong>完全免費</strong>。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="shadow3">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <marker id="arrowhead3" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#f59e0b">
              <polygon points="0 0, 10 3, 0 6" />
            </marker>
          </defs>

          {/* Title */}
          <text x="400" y="30" textAnchor="middle" fill="#9ca3af" fontSize="13" fontWeight="500">Cloudflare Tunnel 架構</text>

          {/* User */}
          <g transform="translate(50,80)">
            <rect width="140" height="90" rx="14" fill="#1e293b" stroke="#6366f1" strokeWidth="2" filter="url(#shadow3)" />
            <text x="70" y="30" textAnchor="middle" fill="#6366f1" fontSize="12" fontWeight="700">用戶請求</text>
            <text x="70" y="52" textAnchor="middle" fill="#c0c4cc" fontSize="10">訪問指定 domain</text>
            <text x="70" y="70" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">yourdomain.com</text>
          </g>

          {/* Arrow to Cloudflare */}
          <path d="M 200 125 L 260 125" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arrowhead3)" />

          {/* Cloudflare Edge */}
          <g transform="translate(260,60)">
            <rect width="200" height="180" rx="14" fill="url(#grad4)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow3)" />
            <text x="100" y="30" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">Cloudflare Edge</text>

            {/* DNS */}
            <rect x="20" y="45" width="160" height="40" rx="8" fill="#0a0b10" stroke="#fbbf24" strokeWidth="1.5" />
            <text x="100" y="65" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600">DNS 解析</text>
            <text x="100" y="80" textAnchor="middle" fill="#9ca3af" fontSize="8">{'yourdomain.com → Tunnel'}</text>

            {/* Security */}
            <rect x="20" y="95" width="160" height="40" rx="8" fill="#0a0b10" stroke="#34d399" strokeWidth="1.5" />
            <text x="100" y="115" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">安全防護</text>
            <text x="100" y="130" textAnchor="middle" fill="#9ca3af" fontSize="8">DDoS protection / WAF</text>

            {/* Tunnel */}
            <rect x="20" y="145" width="160" height="25" rx="6" fill="#0a0b10" stroke="#6366f1" strokeWidth="1.5" />
            <text x="100" y="161" textAnchor="middle" fill="#6366f1" fontSize="9" fontWeight="600">Encrypted Tunnel</text>
          </g>

          {/* Arrow to Your Server */}
          <path d="M 470 150 L 540 150" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arrowhead3)" />
          <text x="505" y="140" textAnchor="middle" fill="#fbbf24" fontSize="10">安全轉發</text>

          {/* Your Server */}
          <g transform="translate(540,70)">
            <rect width="210" height="160" rx="14" fill="#1e293b" stroke="#34d399" strokeWidth="2" filter="url(#shadow3)" />
            <text x="105" y="30" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">本地 Server</text>

            {/* cloudflared daemon */}
            <rect x="20" y="45" width="170" height="45" rx="8" fill="#0a0b10" stroke="#6366f1" strokeWidth="1.5" />
            <text x="105" y="65" textAnchor="middle" fill="#6366f1" fontSize="10" fontWeight="600">cloudflared daemon</text>
            <text x="105" y="82" textAnchor="middle" fill="#9ca3af" fontSize="8">主動連接 Cloudflare</text>

            {/* Your App */}
            <rect x="20" y="100" width="170" height="45" rx="8" fill="#0a0b10" stroke="#34d399" strokeWidth="1.5" />
            <text x="105" y="120" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">本地應用</text>
            <text x="105" y="137" textAnchor="middle" fill="#c0c4cc" fontSize="9">localhost:3000</text>
          </g>

          {/* Benefits box */}
          <g transform="translate(50,260)">
            <rect width="700" height="100" rx="12" fill="rgba(245, 158, 11, 0.1)" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="350" y="25" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="700">Cloudflare Tunnel 優勢</text>

            <g transform="translate(20,40)">
              <text x="0" y="15" fill="#c0c4cc" fontSize="10">{'• 用自己嘅 domain（例如 app.yourdomain.com）'}</text>
              <text x="0" y="32" fill="#c0c4cc" fontSize="10">{'• 唔需要開放任何 inbound port（唔使改 firewall）'}</text>
              <text x="0" y="49" fill="#c0c4cc" fontSize="10">{'• 免費 DDoS protection + WAF + SSL certificate'}</text>
              <text x="0" y="66" fill="#c0c4cc" fontSize="10">{'• 比 ngrok 更安全，適合長期 production 使用'}</text>
            </g>
          </g>
        </svg>
      </div>

      <h3>設定步驟</h3>
      <ul className="steps">
        <li>
          <span className="step-num">1</span>
          <span>安裝 <code style={{ color: '#f59e0b' }}>cloudflared</code>（Cloudflare 嘅 tunnel client）。Mac 用戶可以用 <code>brew install cloudflared</code>。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>登入 Cloudflare account：<code style={{ color: '#f59e0b' }}>cloudflared tunnel login</code>。佢會開瀏覽器進行 authorize。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>建立一個 tunnel：<code style={{ color: '#f59e0b' }}>cloudflared tunnel create my-tunnel</code>。Cloudflare 會產生一個 tunnel ID。</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span>配置 DNS：用 <code>cloudflared tunnel route dns my-tunnel app.yourdomain.com</code> 將 domain 指向呢個 tunnel。</span>
        </li>
        <li>
          <span className="step-num">5</span>
          <span>啟動 tunnel：<code style={{ color: '#f59e0b' }}>cloudflared tunnel run my-tunnel</code>。之後任何人訪問 <code>app.yourdomain.com</code> 都會轉發到 localhost。</span>
        </li>
      </ul>

      <div className="code-block">
        <code>{`# 安裝 cloudflared
$ brew install cloudflared

# 登入 Cloudflare
$ cloudflared tunnel login

# 建立 tunnel
$ cloudflared tunnel create my-app-tunnel
Created tunnel my-app-tunnel with id abc123-def456

# 配置 DNS（將 app.yourdomain.com 指向 tunnel）
$ cloudflared tunnel route dns my-app-tunnel app.yourdomain.com

# 啟動 tunnel（將 localhost:3000 暴露到 app.yourdomain.com）
$ cloudflared tunnel --url localhost:3000 run my-app-tunnel`}</code>
      </div>

      <div className="key-points">
        <div className="key-point">
          <h4>更高安全性</h4>
          <p>唔需要開放任何 inbound port。cloudflared 主動連去 Cloudflare，所有 traffic 都係加密嘅。</p>
        </div>
        <div className="key-point">
          <h4>用自己 Domain</h4>
          <p>可以用自己嘅 domain（例如 app.yourdomain.com）。比起 ngrok 嘅隨機網址專業好多。</p>
        </div>
        <div className="key-point">
          <h4>完全免費</h4>
          <p>Cloudflare Tunnel 係免費嘅，仲包埋 DDoS protection、WAF、SSL certificate。</p>
        </div>
        <div className="key-point">
          <h4>適合 Production</h4>
          <p>相比 ngrok 只適合臨時 demo，Cloudflare Tunnel 可以長期跑、更穩定、更安全。</p>
        </div>
      </div>

      <h3 style={{ marginTop: '28px' }}>ngrok vs Cloudflare Tunnel 比較</h3>
      <div className="diagram-container">
        <svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow4">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Headers */}
          <g transform="translate(50,30)">
            <rect width="320" height="40" rx="10" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" strokeWidth="1.5" />
            <text x="160" y="27" textAnchor="middle" fill="#6366f1" fontSize="13" fontWeight="700">{'ngrok — 快速臨時'}</text>
          </g>
          <g transform="translate(430,30)">
            <rect width="320" height="40" rx="10" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="160" y="27" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="700">{'Cloudflare Tunnel — 長期穩定'}</text>
          </g>

          {/* Setup */}
          <text x="25" y="110" fill="#9ca3af" fontSize="11" fontWeight="600">設定難度</text>
          <g transform="translate(50,90)">
            <rect width="320" height="50" rx="10" fill="#1e293b" stroke="#2a2d3a" strokeWidth="1" filter="url(#shadow4)" />
            <text x="160" y="18" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">超簡單</text>
            <text x="160" y="36" textAnchor="middle" fill="#c0c4cc" fontSize="9">一個指令搞掂：ngrok http 3000</text>
          </g>
          <g transform="translate(430,90)">
            <rect width="320" height="50" rx="10" fill="#1e293b" stroke="#2a2d3a" strokeWidth="1" filter="url(#shadow4)" />
            <text x="160" y="18" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="600">需要設定</text>
            <text x="160" y="36" textAnchor="middle" fill="#c0c4cc" fontSize="9">要 login、create tunnel、設定 DNS</text>
          </g>

          {/* URL */}
          <text x="25" y="175" fill="#9ca3af" fontSize="11" fontWeight="600">網址</text>
          <g transform="translate(50,155)">
            <rect width="320" height="50" rx="10" fill="#1e293b" stroke="#2a2d3a" strokeWidth="1" filter="url(#shadow4)" />
            <text x="160" y="18" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">隨機網址</text>
            <text x="160" y="36" textAnchor="middle" fill="#c0c4cc" fontSize="9">每次都唔同，例如 abc123.ngrok.io</text>
          </g>
          <g transform="translate(430,155)">
            <rect width="320" height="50" rx="10" fill="#1e293b" stroke="#2a2d3a" strokeWidth="1" filter="url(#shadow4)" />
            <text x="160" y="18" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">自訂 Domain</text>
            <text x="160" y="36" textAnchor="middle" fill="#c0c4cc" fontSize="9">用自己嘅 domain，例如 app.yourdomain.com</text>
          </g>

          {/* Use Case */}
          <text x="25" y="240" fill="#9ca3af" fontSize="11" fontWeight="600">適合場景</text>
          <g transform="translate(50,220)">
            <rect width="320" height="50" rx="10" fill="#1e293b" stroke="#2a2d3a" strokeWidth="1" filter="url(#shadow4)" />
            <text x="160" y="18" textAnchor="middle" fill="#6366f1" fontSize="10">即興 demo、測試 webhook</text>
            <text x="160" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">畀朋友睇、唔需要長期跑</text>
          </g>
          <g transform="translate(430,220)">
            <rect width="320" height="50" rx="10" fill="#1e293b" stroke="#2a2d3a" strokeWidth="1" filter="url(#shadow4)" />
            <text x="160" y="18" textAnchor="middle" fill="#f59e0b" fontSize="10">長期 self-host、專業部署</text>
            <text x="160" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">自架 server、需要穩定網址</text>
          </g>
        </svg>
      </div>

      <div className="use-case">
        <h4>常見做法</h4>
        <p>兩個都可以用。快速 demo 或者測試 webhook 就用 ngrok，幾秒搞掂。如果係要長期跑嘅 side project 或者自架服務，建議用 Cloudflare Tunnel，配合自己嘅 domain，更專業更穩定。</p>
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
        <h4>Prompt 1 — 設定本地開發環境</h4>
        <div className="prompt-text">{'幫我設定一個完整嘅本地開發環境，用 Docker Compose 一鍵啟動所有服務。\n\n項目類型：'}<span className="placeholder">[例如：Full-stack web app / API backend + database / Microservices 架構]</span>{'\n技術棧：'}<span className="placeholder">[例如：Next.js + Node.js + PostgreSQL + Redis / Python FastAPI + MongoDB]</span>{'\n\n要求：\n- 寫一個 docker-compose.yml，包含所有需要嘅服務\n- 每個服務有 health check\n- 設定 hot reload（改 code 唔使重啟 container）\n- Database 有 volume persistence（唔好每次 restart 就清空數據）\n- 加入 seed data script（初始化測試數據）\n- 設定 .env.example 檔案，列出所有環境變數\n- 寫一個 Makefile 或者 shell script，簡化常用指令（start、stop、logs、reset）\n- 加入 README 說明點樣 setup'}</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 用 Cloudflare Tunnel 暴露本地服務</h4>
        <div className="prompt-text">{'幫我設定 Cloudflare Tunnel，將本地跑緊嘅 '}<span className="placeholder">[服務類型，例如：Next.js app / API server / self-hosted n8n / Minecraft server]</span>{' 暴露到互聯網。\n\n環境：'}<span className="placeholder">[例如：macOS / Ubuntu Server / Raspberry Pi]</span>{'\nDomain：'}<span className="placeholder">[例如：app.mydomain.com]</span>{'\n\n要求：\n- 完整嘅 step-by-step 安裝同設定指南\n- cloudflared 嘅 config.yml 設定檔內容\n- DNS 設定步驟\n- 設定 cloudflared 做 systemd service（開機自動啟動）\n- 加入 Cloudflare Access 做認證（只有指定 email 可以 access）\n- 如果有多個本地服務，設定 subdomain routing（例如 api.mydomain.com → localhost:8080，app.mydomain.com → localhost:3000）\n- 排除常見問題嘅 troubleshooting 指南'}</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — Webhook 測試環境搭建</h4>
        <div className="prompt-text">{'幫我搭建一個本地 webhook 測試環境，用嚟開發同 debug '}<span className="placeholder">[webhook 來源，例如：Stripe payment webhook / GitHub webhook / Telegram Bot]</span>{'。\n\n要求：\n- 用 ngrok 將本地 server 暴露出去\n- 寫一個簡單嘅 '}<span className="placeholder">[Node.js Express / Python Flask]</span>{' server 接收 webhook\n- 加入 webhook signature 驗證（確保 request 係真嘅）\n- 將每個收到嘅 webhook 記錄到 log 檔案（包括 headers、body、timestamp）\n- 設定 ngrok inspect dashboard（localhost:4040）做 debug\n- 加入 webhook retry 測試功能\n- 寫出完整嘅可運行 code，包括 package.json / requirements.txt'}</div>
      </div>
    </div>
  );
}

const tabs = [
  { key: 'ngrok', label: '① ngrok 快速分享', content: <NgrokTab /> },
  { key: 'debug', label: '② Debug Dashboard', content: <DebugTab /> },
  { key: 'permanent', label: '③ 永久自架方案', content: <PermanentTab />, premium: true },
  { key: 'ai-viber', label: '④ AI Viber', content: <AiViberTab />, premium: true },
];

export default function LocalhostHosting() {
  return (
    <>
      <TopicTabs
        title="Localhost 分享到互聯網"
        subtitle="用 ngrok 將本地開發環境即時分享畀全世界"
        tabs={tabs}
      />
      <QuizRenderer data={quizData} />
      <RelatedTopics topics={relatedTopics} />
    </>
  );
}
