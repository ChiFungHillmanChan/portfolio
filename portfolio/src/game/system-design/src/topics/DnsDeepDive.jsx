import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'DNS 遞歸查詢（Recursive Query）同迭代查詢（Iterative Query）嘅最大分別係咩？',
    options: [
      { text: '遞歸查詢由 Resolver 幫你搞掂所有步驟，迭代查詢由 Client 自己逐個 DNS Server 問', correct: true, explanation: '遞歸查詢中，Recursive Resolver 會代替 Client 逐步去問 Root → TLD → Authoritative，最後返回最終結果。迭代查詢就係每次 DNS Server 只會話你「去問邊個」，Client 自己再去問下一個。' },
      { text: '遞歸查詢更安全，迭代查詢冇加密', correct: false, explanation: '兩種查詢模式本身都冇加密，加密靠 DNS-over-HTTPS (DoH) 或 DNS-over-TLS (DoT) 處理。' },
      { text: '遞歸查詢只用喺內部網絡', correct: false, explanation: '遞歸查詢係最常見嘅 DNS 查詢方式，用戶每日上網都係用遞歸查詢。' },
      { text: '迭代查詢速度一定快過遞歸查詢', correct: false, explanation: '唔一定，遞歸查詢因為有 caching，通常仲快過迭代查詢。' },
    ],
  },
  {
    question: 'DNS TTL（Time To Live）設得太短會有咩問題？',
    options: [
      { text: '網站會自動下線', correct: false, explanation: 'TTL 同網站是否上線冇直接關係，只影響 DNS cache 嘅時間。' },
      { text: 'DNS 查詢次數大增，增加 Authoritative DNS 嘅負載同用戶嘅 latency', correct: true, explanation: 'TTL 短代表 cache 好快過期，Resolver 要更頻繁咁去 Authoritative DNS 查詢。呢個會增加 DNS 解析時間，亦會加重 DNS Server 嘅負擔。' },
      { text: 'SSL 證書會失效', correct: false, explanation: 'SSL 證書同 DNS TTL 係完全獨立嘅機制。' },
      { text: '域名會被自動釋放', correct: false, explanation: '域名註冊同 DNS TTL 係唔同嘅概念，TTL 唔影響域名擁有權。' },
    ],
  },
  {
    question: 'CNAME record 同 A record 嘅分別係咩？',
    options: [
      { text: 'A record 指向 IP 地址，CNAME record 指向另一個域名', correct: true, explanation: 'A record 直接將域名映射到 IPv4 地址（例如 93.184.216.34）。CNAME 就係一個「別名」，指向另一個域名，最終仲係要解析到 A record 先攞到 IP。' },
      { text: 'CNAME 比 A record 更安全', correct: false, explanation: '兩者嘅安全性冇分別，安全要靠 DNSSEC 處理。' },
      { text: 'A record 只能用喺 IPv6', correct: false, explanation: 'A record 係 IPv4，AAAA record 先係 IPv6。' },
      { text: 'CNAME 可以同 A record 共存喺同一個域名', correct: false, explanation: 'RFC 規定 CNAME 唔可以同其他 record type 共存喺同一個域名，呢個係常見嘅 DNS 考點。' },
    ],
  },
  {
    question: 'GeoDNS 點樣幫助 CDN 提升用戶體驗？',
    options: [
      { text: '加密所有 DNS 查詢', correct: false, explanation: '加密 DNS 係 DoH/DoT 嘅功能，唔係 GeoDNS。' },
      { text: '根據用戶嘅地理位置返回最近嘅 CDN Edge Server IP', correct: true, explanation: 'GeoDNS 會分析用戶嘅 IP 地理位置，返回距離最近嘅 Edge Server，減少網絡延遲，令用戶更快攞到資源。' },
      { text: '自動壓縮 DNS Response', correct: false, explanation: 'DNS Response 嘅大小同 GeoDNS 無關。' },
      { text: '阻止所有 DDoS 攻擊', correct: false, explanation: 'GeoDNS 唔係 DDoS 防護工具，佢嘅職責係地理位置路由。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'cdn', label: 'CDN 內容分發網絡' },
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
  { slug: 'deployment', label: '免費部署平台' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>DNS 係咩</h2>
      <div className="subtitle">互聯網嘅「電話簿」——將域名翻譯成 IP 地址</div>
      <p>
        你每日上網打 <code style={{ color: '#60a5fa' }}>google.com</code>，但電腦之間溝通其實係用 IP 地址（例如 <code style={{ color: '#60a5fa' }}>142.250.80.46</code>）。DNS（Domain Name System）就係幫你將人類睇得明嘅域名翻譯成機器用嘅 IP 地址。可以話，冇 DNS 嘅話，你要記住每個網站嘅 IP 先上到網——想想都覺得痛苦。
      </p>
      <p>
        DNS 嘅查詢過程涉及幾個唔同層級嘅 DNS Server，由 <strong style={{ color: '#3B82F6' }}>Recursive Resolver</strong> 開始，一路問到 <strong style={{ color: '#8B5CF6' }}>Root DNS</strong>、<strong style={{ color: '#f87171' }}>TLD DNS</strong>、最後到 <strong style={{ color: '#34d399' }}>Authoritative DNS</strong> 先攞到最終嘅 IP 地址。呢個過程叫做 <strong style={{ color: '#fbbf24' }}>遞歸查詢（Recursive Query）</strong>。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradClient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradResolver" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRoot" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradTLD" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d1515" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAuth" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradIP" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8b5cf6" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          </defs>

          {/* Client */}
          <g transform="translate(20,150)">
            <rect width="100" height="65" rx="14" fill="url(#gradClient)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Client</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">瀏覽器</text>
          </g>

          {/* Recursive Resolver */}
          <g transform="translate(165,130)">
            <rect width="130" height="95" rx="14" fill="url(#gradResolver)" stroke="#3B82F6" strokeWidth="2.5" filter="url(#glowBlue)" />
            <text x="65" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Recursive</text>
            <text x="65" y="48" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Resolver</text>
            <text x="65" y="68" textAnchor="middle" fill="#9ca3af" fontSize="9">ISP / 8.8.8.8</text>
            <text x="65" y="83" textAnchor="middle" fill="#60a5fa" fontSize="9">有 Cache</text>
          </g>

          {/* Root DNS */}
          <g transform="translate(340,30)">
            <rect width="120" height="70" rx="14" fill="url(#gradRoot)" stroke="#8b5cf6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#8b5cf6" fontSize="12" fontWeight="700">Root DNS</text>
            <text x="60" y="48" textAnchor="middle" fill="#a78bfa" fontSize="10">13 組根伺服器</text>
            <text x="60" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">「.com 去邊問」</text>
          </g>

          {/* TLD DNS */}
          <g transform="translate(340,145)">
            <rect width="120" height="70" rx="14" fill="url(#gradTLD)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700">TLD DNS</text>
            <text x="60" y="48" textAnchor="middle" fill="#fca5a5" fontSize="10">.com / .org / .hk</text>
            <text x="60" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">「google 去邊問」</text>
          </g>

          {/* Authoritative DNS */}
          <g transform="translate(340,260)">
            <rect width="130" height="80" rx="14" fill="url(#gradAuth)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="65" y="28" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="700">Authoritative</text>
            <text x="65" y="48" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="700">DNS</text>
            <text x="65" y="68" textAnchor="middle" fill="#34d399" fontSize="9">最終答案在此</text>
          </g>

          {/* IP Address Result */}
          <g transform="translate(540,155)">
            <rect width="140" height="65" rx="14" fill="url(#gradIP)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="28" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">IP Address</text>
            <text x="70" y="48" textAnchor="middle" fill="#fbbf24" fontSize="10">142.250.80.46</text>
          </g>

          {/* Arrows */}
          <path d="M122,182 C140,182 150,178 163,175" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="142" y="172" textAnchor="middle" fill="#a5b4fc" fontSize="9">1. 查詢</text>

          <path d="M297,155 C310,120 320,90 338,80" fill="none" stroke="#8b5cf6" strokeWidth="1.5" markerEnd="url(#arrPurple)" />
          <text x="305" y="108" fill="#a78bfa" fontSize="9">2. 問 Root</text>

          <path d="M297,178 C310,178 320,178 338,178" fill="none" stroke="#f87171" strokeWidth="1.5" markerEnd="url(#arrRed)" />
          <text x="318" y="172" textAnchor="middle" fill="#fca5a5" fontSize="9">3. 問 TLD</text>

          <path d="M297,200 C310,230 320,265 338,285" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <text x="305" y="248" fill="#34d399" fontSize="9">4. 問 Auth</text>

          <path d="M472,300 C500,300 520,250 545,200" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrYellow)" />
          <text x="520" y="260" fill="#fbbf24" fontSize="9">5. 返回 IP</text>

          <path d="M540,187 C510,187 480,187 462,187" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,3" />
          <text x="500" y="145" fill="#fbbf24" fontSize="9">Cache 結果</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>DNS 查詢完整流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>用戶喺瀏覽器輸入 google.com，瀏覽器先檢查本地 DNS cache。冇嘅話就問 Recursive Resolver（通常係 ISP 提供，或者 Google 嘅 8.8.8.8）。</span></li>
        <li><span className="step-num">2</span><span>Resolver 先問 Root DNS Server（全球有 13 組）。Root 唔會俾你最終答案，佢只會話：「.com 嘅嘢去問 TLD DNS Server」。</span></li>
        <li><span className="step-num">3</span><span>Resolver 再問 .com TLD DNS Server。TLD 都唔會俾你 IP，佢會話：「google.com 嘅 Authoritative DNS 係呢個」。</span></li>
        <li><span className="step-num">4</span><span>Resolver 最後問 Authoritative DNS Server，呢個先係最終答案嘅擁有者。佢會返回 google.com 嘅 IP 地址（例如 142.250.80.46）。</span></li>
        <li><span className="step-num">5</span><span>Resolver 將結果 cache 落嚟（根據 TTL），然後返回俾瀏覽器。之後嘅查詢就唔使再跑成個流程，直接用 cache。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>DNS Record Types 同 TTL 策略</h2>
      <div className="subtitle">唔同嘅 Record Type 用途完全唔同——一定要識分</div>
      <div className="key-points">
        <div className="key-point">
          <h4>A Record（IPv4）</h4>
          <p>最基本嘅 record type。將域名直接映射到 IPv4 地址。例如 <code style={{ color: '#60a5fa' }}>example.com → 93.184.216.34</code>。每個需要直接指向 server IP 嘅域名都要有 A record。</p>
        </div>
        <div className="key-point">
          <h4>AAAA Record（IPv6）</h4>
          <p>同 A record 一樣，但係指向 IPv6 地址。例如 <code style={{ color: '#60a5fa' }}>example.com → 2606:2800:220:1:248:1893:25c8:1946</code>。IPv6 越嚟越重要，建議新服務都加埋 AAAA record。</p>
        </div>
        <div className="key-point">
          <h4>CNAME Record（別名）</h4>
          <p>將一個域名指向另一個域名。例如 <code style={{ color: '#60a5fa' }}>www.example.com → example.com</code>。注意：CNAME <strong style={{ color: '#f87171' }}>唔可以</strong>用喺 zone apex（即 example.com 本身），只能用喺子域名。呢個係考試同面試嘅常考點。</p>
        </div>
        <div className="key-point">
          <h4>MX Record（郵件）</h4>
          <p>指定邊個 mail server 負責接收呢個域名嘅電郵。可以設 priority（數字越細越優先）。例如 <code style={{ color: '#60a5fa' }}>MX 10 mail.example.com</code>。</p>
        </div>
        <div className="key-point">
          <h4>NS Record（域名伺服器）</h4>
          <p>指定邊個 DNS Server 對呢個域名有權威。域名註冊嘅時候就要設定 NS record，指向你嘅 DNS 供應商（例如 Cloudflare）。</p>
        </div>
        <div className="key-point">
          <h4>TXT Record（文本）</h4>
          <p>儲存文本資訊，最常見嘅用途係 SPF（防止電郵偽造）、DKIM（電郵簽名驗證）同域名驗證（例如 Google Search Console 要你加一條 TXT record 證明你擁有呢個域名）。</p>
        </div>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>TTL 策略建議</h3>
      <div className="key-points">
        <div className="key-point">
          <h4>高 TTL（3600s - 86400s）</h4>
          <p>適合穩定嘅服務。DNS cache 時間長，減少查詢次數。但缺點係改咗 DNS record 之後，要等好耐先全球生效。建議大部分穩定嘅 A record 用 3600s（1 小時）。</p>
        </div>
        <div className="key-point">
          <h4>低 TTL（60s - 300s）</h4>
          <p>適合需要快速切換嘅場景。例如做 failover 嘅時候，低 TTL 可以確保 DNS 快速指向新 server。但代價係 DNS 查詢量大增。建議只喺遷移期間或者需要高可用切換嘅場景用低 TTL。</p>
        </div>
        <div className="key-point">
          <h4>DNS Caching 層級</h4>
          <p>DNS cache 有好多層：瀏覽器 cache（通常幾分鐘）→ OS cache（/etc/hosts 或 Windows DNS cache）→ Resolver cache（ISP 或 8.8.8.8）→ CDN/Edge cache。每一層都有自己嘅 TTL，所以實際嘅 propagation 時間可能比你設嘅 TTL 更長。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">GeoDNS、DNS 傳播、DNSSEC——生產環境一定要識</div>
      <div className="key-points">
        <div className="key-point">
          <h4>GeoDNS + CDN</h4>
          <p>CDN 供應商（CloudFlare、CloudFront）用 GeoDNS 根據用戶嘅地理位置返回最近嘅 Edge Server IP。呢個係 CDN 快嘅核心原因之一。設計系統嘅時候講 CDN 一定要提到 GeoDNS。</p>
        </div>
        <div className="key-point">
          <h4>DNS Propagation Delay</h4>
          <p>改咗 DNS record 唔會即刻生效。因為全球各地嘅 DNS Resolver 都有 cache，要等舊 cache 過期先會拉新嘅 record。呢個過程可能要 1-48 小時。建議大改之前先將 TTL 調低，等舊 cache 過期後再改 record，咁 propagation 會快好多。</p>
        </div>
        <div className="key-point">
          <h4>DNSSEC（DNS 安全）</h4>
          <p>DNS 本身冇加密，容易被中間人竄改（DNS Spoofing / Cache Poisoning）。DNSSEC 用數字簽名保護 DNS response 嘅完整性，確保你收到嘅 IP 地址係真嘅。雖然部署複雜，但對安全敏感嘅服務（銀行、政府）係必須嘅。</p>
        </div>
        <div className="key-point">
          <h4>DNS Failover</h4>
          <p>用 DNS health check 配合低 TTL，當主 server 掛咗嘅時候自動將流量切換到備用 server。AWS Route 53 同 Cloudflare 都支援呢個功能。呢個係高可用架構嘅重要一環。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>常見 DNS 供應商</h4>
        <p>Cloudflare（免費、快、功能多）、AWS Route 53（整合 AWS 生態圈）、Google Cloud DNS（穩定、API 友好）、NS1（智慧 DNS 路由）。揀邊個要睇你嘅基礎設施同需求。</p>
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
        <h4>Prompt 1 — 設計 DNS 基礎設施</h4>
        <div className="prompt-text">
          幫手設計一套完整嘅 DNS 基礎設施方案，適用於 <span className="placeholder">[例如：全球化 SaaS 平台 / 電商網站 / 多區域微服務]</span>。{'\n\n'}項目背景：{'\n'}- 主域名：<span className="placeholder">[例如：example.com]</span>{'\n'}- 子域名需求：<span className="placeholder">[例如：api.example.com, cdn.example.com, mail.example.com]</span>{'\n'}- 用戶分佈：<span className="placeholder">[例如：亞太 60%、歐洲 25%、北美 15%]</span>{'\n'}- 高可用要求：<span className="placeholder">[例如：99.99% uptime]</span>{'\n\n'}需要設計嘅部分：{'\n'}1. DNS Record 配置（A, AAAA, CNAME, MX, TXT）{'\n'}2. TTL 策略（按 record type 同場景設定）{'\n'}3. GeoDNS 路由規則（按地區返回最近嘅 server）{'\n'}4. DNS Failover 方案（health check + 自動切換）{'\n'}5. DNSSEC 部署計劃{'\n'}6. DNS 供應商選擇建議{'\n\n'}請提供具體嘅 DNS zone file 配置範例同架構圖。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — DNS 遷移同 Zero-Downtime 切換</h4>
        <div className="prompt-text">
          幫手設計一套 DNS 遷移計劃，將域名從 <span className="placeholder">[例如：GoDaddy / Namecheap]</span> 遷移到 <span className="placeholder">[例如：Cloudflare / Route 53]</span>，要求 zero-downtime。{'\n\n'}現有配置：{'\n'}- 域名：<span className="placeholder">[你嘅域名]</span>{'\n'}- 現有 DNS records 數量：<span className="placeholder">[例如：15 條]</span>{'\n'}- 有冇用緊 email（MX records）：<span className="placeholder">[有 / 冇]</span>{'\n'}- 現有 TTL 設定：<span className="placeholder">[例如：3600s]</span>{'\n\n'}遷移步驟設計：{'\n'}1. 遷移前準備（降低 TTL、記錄所有現有 records）{'\n'}2. 逐步遷移策略（先遷移唔影響服務嘅 records）{'\n'}3. NS Record 切換時間窗口{'\n'}4. 驗證同回滾計劃{'\n'}5. 遷移後 TTL 恢復{'\n\n'}請提供完整嘅 step-by-step 操作指南同驗證 checklist。
        </div>
      </div>
    </div>
  );
}

export default function DnsDeepDive() {
  return (
    <>
      <TopicTabs
        title="DNS 域名解析"
        subtitle="遞歸 / 權威 / TTL / GeoDNS"
        tabs={[
          { id: 'overview', label: '① 查詢流程', content: <OverviewTab /> },
          { id: 'advanced', label: '② Record Types', content: <AdvancedTab /> },
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
