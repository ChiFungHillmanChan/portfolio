import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'L7 DDoS 攻擊同 L3/L4 攻擊最大嘅分別係咩？',
    options: [
      { text: 'L7 攻擊流量大好多', correct: false, explanation: '其實 L7 攻擊流量未必好大，佢嘅威脅在於請求睇落好似正常用戶，好難分辨。' },
      { text: 'L7 攻擊針對應用層，請求睇落似正常 HTTP 請求，好難用 IP 過濾', correct: true, explanation: 'L7 攻擊模仿正常用戶行為（例如不停 login、搜尋），傳統嘅 IP blacklist 唔太有效，需要 WAF 同 bot detection 先搞得掂。' },
      { text: 'L7 攻擊只影響 DNS', correct: false, explanation: 'DNS 攻擊係 L3/L4 層嘅嘢，L7 係 HTTP/HTTPS 應用層。' },
      { text: 'L7 攻擊可以用防火牆完全阻擋', correct: false, explanation: '傳統防火牆主要處理 L3/L4，L7 需要 WAF（Web Application Firewall）先可以有效過濾。' },
    ],
  },
  {
    question: 'Anycast routing 點樣幫助防禦 DDoS？',
    options: [
      { text: '加密所有流量', correct: false, explanation: 'Anycast 係路由技術，唔係加密技術。加密係 TLS 嘅工作。' },
      { text: '將攻擊流量分散到全球多個 PoP 節點，避免單點被打爆', correct: true, explanation: 'Anycast 令同一個 IP 有好多個節點回應，攻擊流量會被自然分散到各個節點，每個節點只需要處理一部分流量，大幅降低單點壓力。' },
      { text: '直接 block 所有外國流量', correct: false, explanation: '咁做會影響正常海外用戶，而且攻擊者可以用目標國家嘅 botnet。' },
      { text: '將流量全部導去 Origin Server', correct: false, explanation: '咁做反而會令 Origin Server 直接受攻擊，完全冇保護作用。' },
    ],
  },
  {
    question: 'DNS Amplification 攻擊嘅原理係咩？',
    options: [
      { text: '攻擊者直接攻擊目標嘅 DNS Server', correct: false, explanation: '唔係直接攻擊目標 DNS，而係利用第三方 DNS Resolver 做放大器。' },
      { text: '攻擊者偽造源 IP，向開放嘅 DNS Resolver 發小請求，Resolver 回覆大 response 到目標', correct: true, explanation: '攻擊者 spoof 源 IP 為目標 IP，然後向開放 DNS Resolver 發 ANY 類型查詢（幾十 bytes），Resolver 回覆幾百到幾千 bytes 到目標 IP，放大倍數可以去到 50-70 倍。' },
      { text: '攻擊者修改 DNS 記錄指向惡意 Server', correct: false, explanation: '呢個係 DNS hijacking / DNS poisoning，唔係 amplification 攻擊。' },
      { text: '攻擊者令 DNS TTL 過期', correct: false, explanation: 'TTL 過期只會導致 DNS 重新查詢，唔會產生放大效果。' },
    ],
  },
  {
    question: 'WAF（Web Application Firewall）主要保護邊一層嘅攻擊？',
    options: [
      { text: 'L3 Network 層', correct: false, explanation: 'L3 係 IP 層，用傳統防火牆或 ACL 就夠。WAF 係處理更高層嘅。' },
      { text: 'L4 Transport 層', correct: false, explanation: 'L4 係 TCP/UDP 層，SYN flood 用 SYN cookies 或 rate limiting 處理。WAF 唔係專門處理呢層。' },
      { text: 'L7 Application 層', correct: true, explanation: 'WAF 分析 HTTP 請求嘅內容（URL、headers、body），可以偵測同阻擋 SQL injection、XSS、HTTP flood 等 L7 攻擊。呢個就係 WAF 最大嘅價值。' },
      { text: '所有層都一樣有效', correct: false, explanation: 'WAF 專門處理 L7，L3/L4 嘅攻擊需要用唔同嘅防禦手段。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'rate-limiter', label: 'Rate Limiter 限流器' },
  { slug: 'cdn', label: 'CDN 內容分發網絡' },
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>DDoS 防護係咩</h2>
      <div className="subtitle">L3/L4/L7 攻擊類型 / WAF / Cloudflare / Anycast</div>
      <p>
        DDoS（Distributed Denial of Service）即係「分佈式拒絕服務攻擊」——攻擊者控制大量機器（botnet），同時向目標 Server 發送海量請求，令 Server 忙到冇能力回覆正常用戶。簡單講就係：用人海戰術癱瘓你嘅服務。
      </p>
      <p>
        DDoS 攻擊分三個層級：<strong style={{ color: '#3B82F6' }}>L3（網絡層）</strong> 用大量 UDP 封包塞爆頻寬、<strong style={{ color: '#34d399' }}>L4（傳輸層）</strong> 利用 TCP 協議漏洞（例如 SYN flood）消耗連接資源、<strong style={{ color: '#f87171' }}>L7（應用層）</strong> 模仿正常用戶發 HTTP 請求令應用程式過載。每一層嘅防禦方法都唔同，一定要分清楚。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradAttack" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#5c1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradScrub" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a5c" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradWAF" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradClean" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradOrigin" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          </defs>

          {/* Attack Traffic */}
          <g transform="translate(20,60)">
            <rect width="120" height="90" rx="14" fill="url(#gradAttack)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">Attack</text>
            <text x="60" y="48" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">Traffic</text>
            <text x="60" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">Botnet 大量請求</text>
            <text x="60" y="82" textAnchor="middle" fill="#f87171" fontSize="9">100 Gbps+</text>
          </g>

          {/* Normal Users */}
          <g transform="translate(20,210)">
            <rect width="120" height="75" rx="14" fill="url(#gradClean)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Normal</text>
            <text x="60" y="48" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Users</text>
            <text x="60" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">正常用戶流量</text>
          </g>

          {/* Scrubbing Center */}
          <g transform="translate(210,50)">
            <rect width="150" height="110" rx="14" fill="url(#gradScrub)" stroke="#3B82F6" strokeWidth="2.5" filter="url(#shadow)" />
            <text x="75" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Scrubbing</text>
            <text x="75" y="48" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Center</text>
            <text x="75" y="70" textAnchor="middle" fill="#9ca3af" fontSize="10">過濾 L3/L4 攻擊</text>
            <text x="75" y="85" textAnchor="middle" fill="#60a5fa" fontSize="9">UDP flood / SYN flood</text>
            <text x="75" y="100" textAnchor="middle" fill="#60a5fa" fontSize="9">Anycast 分散流量</text>
          </g>

          {/* WAF */}
          <g transform="translate(210,200)">
            <rect width="150" height="100" rx="14" fill="url(#gradWAF)" stroke="#8B5CF6" strokeWidth="2.5" filter="url(#shadow)" />
            <text x="75" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">WAF</text>
            <text x="75" y="48" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="600">Web App Firewall</text>
            <text x="75" y="70" textAnchor="middle" fill="#9ca3af" fontSize="10">過濾 L7 攻擊</text>
            <text x="75" y="85" textAnchor="middle" fill="#a78bfa" fontSize="9">HTTP flood / Bot</text>
          </g>

          {/* Clean Traffic */}
          <g transform="translate(440,120)">
            <rect width="140" height="90" rx="14" fill="url(#gradClean)" stroke="#34d399" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="70" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Clean</text>
            <text x="70" y="48" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Traffic</text>
            <text x="70" y="70" textAnchor="middle" fill="#9ca3af" fontSize="10">只剩正常請求</text>
            <text x="70" y="85" textAnchor="middle" fill="#34d399" fontSize="9">99%+ 攻擊已過濾</text>
          </g>

          {/* Origin Server */}
          <g transform="translate(640,120)">
            <rect width="120" height="90" rx="14" fill="url(#gradOrigin)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">Origin</text>
            <text x="60" y="48" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">Server</text>
            <text x="60" y="70" textAnchor="middle" fill="#9ca3af" fontSize="10">你嘅主機</text>
            <text x="60" y="85" textAnchor="middle" fill="#fbbf24" fontSize="9">安全運行</text>
          </g>

          {/* Dropped traffic */}
          <g transform="translate(230,330)">
            <rect width="110" height="40" rx="10" fill="rgba(239,68,68,0.1)" stroke="#f87171" strokeWidth="1.5" />
            <text x="55" y="17" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">Dropped</text>
            <text x="55" y="33" textAnchor="middle" fill="#f87171" fontSize="10">攻擊流量丟棄</text>
          </g>

          {/* Arrows */}
          <path d="M142,105 C170,105 185,95 208,90" fill="none" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrRed)" />
          <text x="176" y="88" textAnchor="middle" fill="#f87171" fontSize="9">1. 攻擊流量</text>

          <path d="M142,248 C170,248 185,250 208,250" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="176" y="240" textAnchor="middle" fill="#34d399" fontSize="9">正常流量</text>

          <path d="M362,115 C390,120 415,135 438,145" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="405" y="115" textAnchor="middle" fill="#60a5fa" fontSize="9">2. 過濾後</text>

          <path d="M362,250 C390,245 415,200 438,185" fill="none" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrPurple)" />
          <text x="405" y="235" textAnchor="middle" fill="#a78bfa" fontSize="9">過濾後</text>

          <path d="M582,165 C600,165 615,165 638,165" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="610" y="155" textAnchor="middle" fill="#34d399" fontSize="9">3. Clean</text>

          <path d="M285,162 C285,280 285,310 285,328" fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrRed)" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>完整流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>攻擊者用 Botnet 向你嘅 Server 發送大量惡意流量（UDP flood、SYN flood、HTTP flood）。正常用戶嘅請求都混喺入面。關鍵在於：攻擊流量同正常流量混埋一齊。</span></li>
        <li><span className="step-num">2</span><span>流量首先經過 Scrubbing Center（清洗中心），過濾掉 L3/L4 嘅攻擊流量。之後再經過 WAF，過濾 L7 嘅應用層攻擊。兩層防禦缺一不可。</span></li>
        <li><span className="step-num">3</span><span>過濾完之後，只剩下正常用戶嘅 Clean Traffic 先會去到你嘅 Origin Server。攻擊流量全部被丟棄。你嘅 Server 完全唔會感受到攻擊。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>攻擊類型深入分析</h2>
      <div className="subtitle">L3 Volumetric / L4 Protocol / L7 Application / Amplification</div>
      <p>
        唔同層嘅 DDoS 攻擊原理完全唔同，防禦方法亦都唔同。面試嘅時候一定要分得清楚邊層用咩防禦。以下逐個講解。
      </p>
      <div className="key-points">
        <div className="key-point">
          <h4>L3 Volumetric 攻擊（洪水攻擊）</h4>
          <p>
            原理好簡單粗暴：用 <code style={{ color: '#60a5fa' }}>UDP flood</code> 或者 <code style={{ color: '#60a5fa' }}>ICMP flood</code> 塞爆你嘅頻寬。攻擊流量可以去到幾百 Gbps 甚至 Tbps。防禦方法：Anycast routing 分散流量到全球多個 PoP、上游 ISP 黑洞路由（blackhole routing）、Cloudflare/AWS Shield 等 DDoS 防護服務。
          </p>
        </div>
        <div className="key-point">
          <h4>L4 Protocol 攻擊</h4>
          <p>
            利用 TCP 協議嘅漏洞。最經典嘅係 <code style={{ color: '#60a5fa' }}>SYN flood</code>：攻擊者發大量 SYN 封包但唔完成 three-way handshake，消耗 Server 嘅連接表（connection table）。防禦方法：SYN cookies（唔使保存半開連接狀態）、connection rate limiting、增加 backlog queue size。
          </p>
        </div>
        <div className="key-point">
          <h4>L7 Application 攻擊</h4>
          <p>
            最難防禦嘅一種。攻擊者模仿正常用戶行為，例如不停對搜尋功能發 <code style={{ color: '#60a5fa' }}>HTTP flood</code>，或者不停 call 消耗大量 CPU 嘅 API endpoint。每個請求都睇落好正常，但量大到 Server 處理唔到。防禦方法：WAF 規則、bot detection（CAPTCHA、JS challenge）、rate limiting per user/IP、behavioral analysis。
          </p>
        </div>
        <div className="key-point">
          <h4>Amplification 放大攻擊</h4>
          <p>
            攻擊者偽造源 IP（spoofing）為目標 IP，向開放嘅 <code style={{ color: '#60a5fa' }}>DNS Resolver</code> 或 <code style={{ color: '#60a5fa' }}>NTP Server</code> 發小請求，佢哋嘅 response 比 request 大好多倍（DNS 可以放大 50-70x、NTP 可以放大 500x），大量 response 全部湧向目標 Server。防禦方法：BCP38 過濾偽造 IP、關閉不必要嘅開放 resolver、上游過濾。
          </p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰防護策略</h2>
      <div className="subtitle">Cloudflare / AWS Shield / Rate Limiting / Anycast / Bot Detection</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Cloudflare 防護設定</h4>
          <p>Cloudflare 免費版已經有基本 L3/L4 DDoS 防護。Pro 版加埋 WAF 規則。建議設定：開啟 "Under Attack Mode"（攻擊緊嘅時候用）、設定 rate limiting rules（例如同一 IP 每秒超過 50 次就 block）、開啟 bot fight mode。重點係：Cloudflare 用 Anycast 將你嘅流量分散到全球 300+ 個 PoP，自然分散攻擊壓力。</p>
        </div>
        <div className="key-point">
          <h4>AWS Shield + WAF</h4>
          <p>AWS Shield Standard 免費，保護 L3/L4。Shield Advanced 要錢（$3000/月），但有 DDoS response team（DRT）同費用保護。搭配 AWS WAF 設定 rate-based rules 同 geo-blocking。如果用 CloudFront，流量會先經過 AWS 全球 edge network 過濾。</p>
        </div>
        <div className="key-point">
          <h4>Edge Rate Limiting</h4>
          <p>喺 CDN/Edge 層做 rate limiting，比喺 Origin Server 做有效好多。因為攻擊流量根本唔使去到你嘅 Server 就已經被 block。建議設定多維度：per-IP、per-path、per-region。例如登入 endpoint 每 IP 每分鐘最多 10 次。</p>
        </div>
        <div className="key-point">
          <h4>Anycast Routing</h4>
          <p>Anycast 令同一個 IP 有多個地理位置嘅節點回應。攻擊流量會被 BGP routing 自然分散到最近嘅節點。即使某個節點被打到飽和，其他節點仲可以正常服務。呢個係大型 CDN 同 DNS 服務商（Cloudflare、Google DNS）嘅核心防禦策略。</p>
        </div>
        <div className="key-point">
          <h4>Bot Detection</h4>
          <p>L7 攻擊最難搞嘅就係分辨 bot 同真人。常見方法：JavaScript Challenge（真瀏覽器先行到 JS）、CAPTCHA（攻擊緊先開）、TLS fingerprinting（分辨 bot 嘅 TLS handshake pattern）、behavioral analysis（分析鼠標移動、click pattern）。建議平時用 JS challenge，攻擊緊先升級到 CAPTCHA。</p>
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
        <h4>Prompt 1 — 設計 DDoS 防護架構</h4>
        <div className="prompt-text">
          幫手設計一套完整嘅 DDoS 防護架構，保護 <span className="placeholder">[例如：電商網站 / SaaS 平台 / 遊戲伺服器]</span>。{'\n\n'}項目背景：{'\n'}- 預計正常流量：<span className="placeholder">[例如：10K RPS]</span>{'\n'}- 過去遭受嘅攻擊類型：<span className="placeholder">[例如：L7 HTTP flood / UDP amplification]</span>{'\n'}- 雲平台：<span className="placeholder">[例如：AWS / GCP / multi-cloud]</span>{'\n'}- 預算範圍：<span className="placeholder">[例如：$500/月 / $5000/月]</span>{'\n\n'}需要設計嘅部分：{'\n'}1. L3/L4 防護層：Anycast routing + Scrubbing Center 配置{'\n'}2. L7 防護層：WAF rules + rate limiting + bot detection{'\n'}3. DNS 防護：防止 DNS amplification 同 DNS flood{'\n'}4. 架構圖：流量從 Internet 到 Origin 嘅完整路徑{'\n'}5. 攻擊應急 SOP：偵測到攻擊後嘅逐步處理流程{'\n'}6. 監控 dashboard：需要監控嘅 metrics（RPS、error rate、p99 latency、bandwidth）{'\n\n'}請提供具體嘅 Cloudflare / AWS Shield 配置、WAF rule 範例、同 Terraform/CDK IaC 代碼。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實現 L7 Rate Limiting + Bot Detection</h4>
        <div className="prompt-text">
          用 <span className="placeholder">[Node.js + Express / Go / Python + FastAPI]</span> 實現一套 L7 DDoS 防護 middleware。{'\n\n'}要求：{'\n'}1. 多層 Rate Limiting：{'\n'}   - Global：全站 <span className="placeholder">[10K / 50K]</span> RPS 上限{'\n'}   - Per-IP：每個 IP <span className="placeholder">[100 / 500]</span> req/min{'\n'}   - Per-endpoint：敏感 endpoint（login、search）更嚴格限制{'\n'}   - 用 Redis 做分佈式計數{'\n'}2. Bot Detection：{'\n'}   - TLS fingerprint 檢查（JA3 hash）{'\n'}   - Request header 分析（缺少常見 browser header = 可疑）{'\n'}   - 行為分析（同一 IP 短時間內請求太多唔同 path = 爬蟲）{'\n'}3. 自動升級防護：{'\n'}   - 正常：只做 rate limiting{'\n'}   - 攻擊中：自動開啟 JavaScript Challenge{'\n'}   - 嚴重攻擊：開啟 CAPTCHA{'\n'}4. 回覆 <span className="placeholder">[429 / 503]</span> 時包含 Retry-After header{'\n\n'}請提供完整代碼、Redis schema、同監控 alert 配置。
        </div>
      </div>
    </div>
  );
}

export default function DdosProtection() {
  return (
    <>
      <TopicTabs
        title="DDoS 防護"
        subtitle="L3/L4/L7 攻擊 / WAF / Cloudflare"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'advanced', label: '② 攻擊類型', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰防護', premium: true, content: <PracticeTab /> },
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
