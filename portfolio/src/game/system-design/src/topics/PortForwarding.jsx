import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Port Forwarding 嘅主要作用係咩？',
    options: [
      { text: '加密所有網絡 traffic', correct: false, explanation: 'Port Forwarding 只係轉發 request，唔負責加密' },
      { text: '將外部 request 從 Router 嘅 Public IP 轉發到內網指定設備嘅指定 port', correct: true, explanation: '啱！Port Forwarding 就係喺 Router 設定規則，將打上 Public IP 某個 port 嘅 request 轉發去內網設備' },
      { text: '將所有內網設備嘅 IP 改做 Public IP', correct: false, explanation: '呢個係 NAT 做嘅嘢，唔係 Port Forwarding' },
      { text: '自動偵測網絡攻擊並阻擋', correct: false, explanation: 'Port Forwarding 唔係防火牆，佢只負責轉發 traffic' },
    ],
  },
  {
    question: 'NAT（Network Address Translation）解決咗咩問題？',
    options: [
      { text: '令內網設備可以直接被外界 access', correct: false, explanation: '正好相反，NAT 會阻止外界直接 access 內網設備，需要 Port Forwarding 先至得' },
      { text: '令多部內網設備可以共用一個 Public IP 上網', correct: true, explanation: '啱！NAT 將內網設備嘅 Private IP 翻譯成 Router 嘅 Public IP，令多部設備可以透過同一個 Public IP 上網' },
      { text: '加快網絡速度', correct: false, explanation: 'NAT 唔會加快速度，佢嘅作用係地址轉換' },
      { text: '自動分配 domain name 畀每部設備', correct: false, explanation: '分配 domain name 係 DNS 嘅工作，唔係 NAT' },
    ],
  },
  {
    question: '點樣知道自己嘅網絡有冇 CGNAT（Carrier-Grade NAT）？',
    options: [
      { text: '睇 Router 嘅 brand 同 model', correct: false, explanation: 'CGNAT 係 ISP 層面嘅設定，同 Router 型號無關' },
      { text: '對比 Router WAN IP 同 whatismyip.com 顯示嘅 Public IP，如果唔同就係 CGNAT', correct: true, explanation: '啱！如果 Router 嘅 WAN IP 係 100.64.x.x 或其他 Private IP range，但 whatismyip.com 顯示另一個 IP，就代表 ISP 用緊 CGNAT' },
      { text: '試下 ping Google，如果 latency 高就係 CGNAT', correct: false, explanation: 'Latency 高唔代表 CGNAT，可能係其他網絡問題' },
      { text: '打電話問 ISP 就一定知', correct: false, explanation: '雖然可以問 ISP，但自己對比 WAN IP 同 Public IP 係最快最準嘅方法' },
    ],
  },
];

const relatedTopics = [
  { slug: 'localhost-hosting', label: 'Localhost 分享到互聯網' },
  { slug: 'docker', label: 'Docker 容器化' },
  { slug: 'deployment', label: '免費部署平台' },
  { slug: 'self-host-vs-cloud', label: 'Self-host vs Cloud' },
];

function BasicsTab() {
  return (
    <div className="card">
      <h2>Port Forwarding 係咩</h2>
      <div className="subtitle">Router 裡面嘅一條規則</div>
      <p>
        重點係一個好常見嘅情景：想喺屋企部電腦整個 Minecraft Server，然後俾朋友喺外面 connect 入嚟。但係問題嚟喇——對方應該 connect 去邊度？本地電腦得個內網 IP（例如 192.168.1.100），Internet 上面根本睇唔到呢個地址。
      </p>
      <p>
        呢個時候就需要 Port Forwarding。簡單嚟講，就係喺 Router 裡面設定一條規則：「如果有請求打上嚟 public IP 嘅 port 80，就將佢轉發去內網 192.168.1.100 嘅 port 3000」。呢樣嘢就叫做 Port Forwarding（端口轉發）。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradFriend" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRouter" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradLaptop" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPhone" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          <g transform="translate(30,150)">
            <rect width="110" height="75" rx="14" fill="url(#gradFriend)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="30" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">朋友</text>
            <text x="55" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">Internet 外面</text>
          </g>

          <g transform="translate(280,110)">
            <rect width="180" height="160" rx="16" fill="url(#gradRouter)" stroke="#34d399" strokeWidth="2.5" filter="url(#glowGreen)" />
            <text x="90" y="30" textAnchor="middle" fill="#34d399" fontSize="15" fontWeight="700">Router</text>
            <text x="90" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">路由器</text>
            <line x1="20" y1="66" x2="160" y2="66" stroke="#2a2d3a" strokeWidth="1" />
            <text x="90" y="84" textAnchor="middle" fill="#34d399" fontSize="10">Public IP:</text>
            <text x="90" y="100" textAnchor="middle" fill="#fbbf24" fontSize="10.5" fontWeight="600">203.0.113.5</text>
            <line x1="20" y1="112" x2="160" y2="112" stroke="#2a2d3a" strokeWidth="1" />
            <text x="90" y="130" textAnchor="middle" fill="#a5b4fc" fontSize="9.5">Port Forwarding 規則:</text>
            <text x="90" y="146" textAnchor="middle" fill="#fbbf24" fontSize="9.5">:80 → 192.168.1.100:3000</text>
          </g>

          <g transform="translate(555,85)">
            <rect width="140" height="85" rx="14" fill="url(#gradLaptop)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="26" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Laptop</text>
            <text x="70" y="44" textAnchor="middle" fill="#9ca3af" fontSize="9.5">192.168.1.100</text>
            <text x="70" y="60" textAnchor="middle" fill="#fbbf24" fontSize="9.5">Minecraft Server</text>
            <text x="70" y="75" textAnchor="middle" fill="#34d399" fontSize="9.5">Port 3000</text>
          </g>

          <g transform="translate(555,210)">
            <rect width="140" height="75" rx="14" fill="url(#gradPhone)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="26" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Phone</text>
            <text x="70" y="44" textAnchor="middle" fill="#9ca3af" fontSize="9.5">192.168.1.50</text>
            <text x="70" y="60" textAnchor="middle" fill="#9ca3af" fontSize="9.5">內網其他設備</text>
          </g>

          <path d="M142,187 C200,187 220,180 278,180" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="180" y="175" textAnchor="middle" fill="#6366f1" fontSize="10">203.0.113.5:80</text>

          <path d="M462,165 C500,155 520,130 553,127" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="500" y="145" textAnchor="middle" fill="#34d399" fontSize="10">轉發到</text>
          <text x="500" y="160" textAnchor="middle" fill="#fbbf24" fontSize="9.5">192.168.1.100:3000</text>

          <text x="85" y="320" textAnchor="middle" fill="#9ca3af" fontSize="11">Internet</text>
          <text x="360" y="330" textAnchor="middle" fill="#9ca3af" fontSize="11">屋企內網</text>
          <line x1="240" y1="310" x2="240" y2="360" stroke="#2a2d3a" strokeWidth="2" strokeDasharray="4" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>運作流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>對方喺 Internet 上面發請求到 Public IP（203.0.113.5）嘅 port 80。</span></li>
        <li><span className="step-num">2</span><span>Router 收到呢個請求，檢查 Port Forwarding 規則表：「喔，port 80 嘅請求要轉發去 192.168.1.100 嘅 port 3000」。</span></li>
        <li><span className="step-num">3</span><span>Router 將請求轉發到 Laptop 嘅 port 3000（Minecraft Server 喺度聽緊）。</span></li>
        <li><span className="step-num">4</span><span>Minecraft Server 處理完請求，將 response 返俾 Router，Router 再返俾對方。全程對方只知道 Public IP，唔知道內網結構。</span></li>
      </ol>

      <div className="use-case">
        <h4>實際用途</h4>
        <p>Port Forwarding 最常見嘅用途：架設遊戲 Server（Minecraft、CS:GO）、自建網站放喺屋企 Server、遠程桌面（RDP）、家用 NAS 外部存取、安全監控系統遠程查看。只要想俾外界 access 內網嘅某個 service，就需要 Port Forwarding。</p>
      </div>
    </div>
  );
}

function NATTab() {
  return (
    <div className="card">
      <h2>NAT 網絡轉換</h2>
      <div className="subtitle">點解屋企只有一個 Public IP，但係成十部裝置都上到網？</div>

      <p>
        以下探討一個好核心嘅問題：點解屋企咁多部 Phone、Laptop、電視、Switch 都可以同時上網，但係 ISP（網絡供應商）只俾咗一個 Public IP？答案就係 NAT（Network Address Translation，網絡地址轉換）。
      </p>
      <p>
        NAT 係 Router 做嘅一個超重要功能。簡單講，Router 將所有內網設備嘅 Private IP（例如 192.168.x.x）「翻譯」成佢自己嘅 Public IP，然後發出去 Internet。當 response 返嚟嗰陣，Router 再根據 port number 將 response 送返俾啱嘅內網設備。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowNat" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <linearGradient id="gradDevice1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDevice2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDevice3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRouterNAT" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradInternet" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d1515" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrGreenNat" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrOrange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" /></marker>
            <marker id="arrPurpleNat" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(30,60)">
            <rect width="130" height="65" rx="14" fill="url(#gradDevice1)" stroke="#10B981" strokeWidth="2" filter="url(#shadowNat)" />
            <text x="65" y="28" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Phone</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">192.168.1.50</text>
          </g>

          <g transform="translate(30,165)">
            <rect width="130" height="65" rx="14" fill="url(#gradDevice2)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadowNat)" />
            <text x="65" y="28" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Laptop</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">192.168.1.100</text>
          </g>

          <g transform="translate(30,270)">
            <rect width="130" height="65" rx="14" fill="url(#gradDevice3)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadowNat)" />
            <text x="65" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Smart TV</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">192.168.1.70</text>
          </g>

          <g transform="translate(270,125)">
            <rect width="180" height="160" rx="16" fill="url(#gradRouterNAT)" stroke="#3B82F6" strokeWidth="2.5" filter="url(#shadowNat)" />
            <text x="90" y="30" textAnchor="middle" fill="#3B82F6" fontSize="15" fontWeight="700">Router (NAT)</text>
            <line x1="20" y1="45" x2="160" y2="45" stroke="#2a2d3a" strokeWidth="1" />
            <text x="90" y="64" textAnchor="middle" fill="#34d399" fontSize="10">Public IP:</text>
            <text x="90" y="80" textAnchor="middle" fill="#fbbf24" fontSize="10.5" fontWeight="600">203.0.113.5</text>
            <line x1="20" y1="92" x2="160" y2="92" stroke="#2a2d3a" strokeWidth="1" />
            <text x="90" y="110" textAnchor="middle" fill="#a5b4fc" fontSize="9.5">NAT 轉換表:</text>
            <text x="90" y="126" textAnchor="middle" fill="#34d399" fontSize="8.5">192.168.1.50 → :5001</text>
            <text x="90" y="140" textAnchor="middle" fill="#F59E0B" fontSize="8.5">192.168.1.100 → :5002</text>
            <text x="90" y="154" textAnchor="middle" fill="#8B5CF6" fontSize="8.5">192.168.1.70 → :5003</text>
          </g>

          <g transform="translate(560,140)">
            <rect width="130" height="100" rx="14" fill="url(#gradInternet)" stroke="#EF4444" strokeWidth="2" filter="url(#shadowNat)" />
            <text x="65" y="30" textAnchor="middle" fill="#EF4444" fontSize="13" fontWeight="700">Internet</text>
            <text x="65" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">Google Server</text>
            <text x="65" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">Facebook Server</text>
            <text x="65" y="84" textAnchor="middle" fill="#9ca3af" fontSize="10">...</text>
          </g>

          <path d="M162,92 C200,92 220,150 268,165" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreenNat)" />
          <path d="M162,197 C200,197 230,200 268,200" fill="none" stroke="#F59E0B" strokeWidth="1.5" markerEnd="url(#arrOrange)" />
          <path d="M162,302 C200,302 220,240 268,225" fill="none" stroke="#8B5CF6" strokeWidth="1.5" markerEnd="url(#arrPurpleNat)" />

          <path d="M452,205 C490,205 520,195 558,195" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrGreenNat)" />
          <text x="505" y="195" textAnchor="middle" fill="#3B82F6" fontSize="10">統一用</text>
          <text x="505" y="210" textAnchor="middle" fill="#fbbf24" fontSize="9.5">203.0.113.5</text>

          <text x="95" y="380" textAnchor="middle" fill="#9ca3af" fontSize="11">Private IP (內網)</text>
          <text x="360" y="380" textAnchor="middle" fill="#9ca3af" fontSize="11">NAT 轉換</text>
          <text x="625" y="380" textAnchor="middle" fill="#9ca3af" fontSize="11">Public IP (外網)</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>NAT 運作原理</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>Phone（192.168.1.50）發請求去 Google。請求去到 Router，Router 記低：「呢個請求係由 192.168.1.50 發出，分配 port 5001 俾佢」。</span></li>
        <li><span className="step-num">2</span><span>Router 將 source IP 改成自己嘅 Public IP（203.0.113.5），source port 改成 5001，然後發出去 Internet。</span></li>
        <li><span className="step-num">3</span><span>Google 收到請求，睇到 source 係 203.0.113.5:5001。Google 返 response 返去呢個地址。</span></li>
        <li><span className="step-num">4</span><span>Router 收到 response，睇返 NAT 表：「port 5001 對應 192.168.1.50」，將 response 轉發俾 Phone。Phone 就收到 Google 嘅 response 喇。</span></li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>Private IP 地址範圍</h4>
          <p>192.168.0.0 – 192.168.255.255、10.0.0.0 – 10.255.255.255、172.16.0.0 – 172.31.255.255。呢啲地址只喺內網用，Internet 路由器唔會轉發呢啲地址。</p>
        </div>
        <div className="key-point">
          <h4>Public IP 短缺問題</h4>
          <p>IPv4 得 43 億個地址，全世界人口加埋都唔夠分。NAT 解決咗呢個問題——一個 Public IP 可以俾成千部內網設備共用。但係呢個方案有個代價，就係唔能夠直接 host service 俾外界 access（需要 Port Forwarding）。</p>
        </div>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '24px 0 12px' }}>Carrier-Grade NAT（CGNAT）問題</h3>
      <p>
        重點係一個好多人會遇到嘅問題：有時喺 Router 設定好晒 Port Forwarding，但係外面嘅人仍然 connect 唔到 Server。點解？答案可能係 ISP 用緊 Carrier-Grade NAT（電信級 NAT，簡稱 CGNAT）。
      </p>
      <p>
        CGNAT 即係話，ISP 將成百上千間屋企嘅網絡共用同一個 Public IP。表面上 Router 好似有個 Public IP，其實唔係——Router 得到嘅都係一個 Private IP（例如 100.64.x.x），ISP 嘅大 Router 先至有真正嘅 Public IP。呢個情況下，根本冇辦法做 Port Forwarding，因為控制唔到 ISP 嗰個大 Router 嘅設定。
      </p>

      <div className="use-case">
        <h4>點樣知道自己係咪 CGNAT？</h4>
        <p>去 Router 管理頁面睇 WAN IP。如果個 IP 係 100.64.x.x、10.x.x.x、172.16.x.x，但係用網站（例如 whatismyip.com）查到嘅 Public IP 唔同，咁就係 CGNAT 嘞。解決方法：要求 ISP 俾一個真正嘅 Public IP（可能要加錢），或者用 Tunneling 方案。</p>
      </div>
    </div>
  );
}

function TunnelingTab() {
  return (
    <div className="card">
      <h2>Tunneling 穿透技術</h2>
      <div className="subtitle">點樣喺 CGNAT 環境下都 host 到 service</div>

      <p>
        如果遇到 CGNAT 問題，或者根本冇權限去 Router 設定 Port Forwarding（例如喺公司、學校網絡），咁 Tunneling 就係最佳方案。Tunneling 嘅原理好簡單：唔係直接 listen 喺本地 port，而係將 local server「隧道」出去一個有 Public IP 嘅中介服務器，外界訪問嗰個中介服務器，中介服務器再轉發到本地。
      </p>
      <p>
        最出名嘅 Tunneling 方案係 ngrok 同 Cloudflare Tunnel。呢啲服務提供一個 Public URL（例如 https://abc123.ngrok.io），外界訪問呢個 URL，請求就會經過中介服務器隧道到本地 machine。全程唔需要改 Router 設定，亦唔需要有 Public IP。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowTun" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#8B5CF6" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradUser" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradTunnel" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradLocal" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlueTun" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrPurpleTun" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
            <marker id="arrOrangeTun" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" /></marker>
          </defs>

          <g transform="translate(30,160)">
            <rect width="120" height="75" rx="14" fill="url(#gradUser)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowTun)" />
            <text x="60" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">外部用戶</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Internet</text>
          </g>

          <g transform="translate(260,100)">
            <rect width="200" height="190" rx="16" fill="url(#gradTunnel)" stroke="#8B5CF6" strokeWidth="2.5" filter="url(#glowPurple)" />
            <text x="100" y="30" textAnchor="middle" fill="#8B5CF6" fontSize="15" fontWeight="700">Tunnel Service</text>
            <text x="100" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">ngrok / Cloudflare Tunnel</text>
            <line x1="20" y1="66" x2="180" y2="66" stroke="#2a2d3a" strokeWidth="1" />
            <text x="100" y="84" textAnchor="middle" fill="#34d399" fontSize="10">Public URL:</text>
            <text x="100" y="100" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600">abc123.ngrok.io</text>
            <line x1="20" y1="112" x2="180" y2="112" stroke="#2a2d3a" strokeWidth="1" />
            <text x="100" y="130" textAnchor="middle" fill="#a5b4fc" fontSize="9.5">中介服務器</text>
            <text x="100" y="146" textAnchor="middle" fill="#9ca3af" fontSize="9.5">有 Public IP</text>
            <text x="100" y="162" textAnchor="middle" fill="#9ca3af" fontSize="9.5">建立隧道到</text>
            <text x="100" y="178" textAnchor="middle" fill="#9ca3af" fontSize="9.5">Local Server</text>
          </g>

          <g transform="translate(555,125)">
            <rect width="140" height="145" rx="14" fill="url(#gradLocal)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadowTun)" />
            <text x="70" y="28" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Local Server</text>
            <text x="70" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">本地電腦</text>
            <line x1="15" y1="60" x2="125" y2="60" stroke="#2a2d3a" strokeWidth="1" />
            <text x="70" y="78" textAnchor="middle" fill="#9ca3af" fontSize="9.5">localhost:3000</text>
            <text x="70" y="94" textAnchor="middle" fill="#9ca3af" fontSize="9.5">冇 Public IP</text>
            <text x="70" y="110" textAnchor="middle" fill="#9ca3af" fontSize="9.5">可能係 CGNAT</text>
            <line x1="15" y1="122" x2="125" y2="122" stroke="#2a2d3a" strokeWidth="1" />
            <text x="70" y="137" textAnchor="middle" fill="#34d399" fontSize="9.5">主動連接到 Tunnel</text>
          </g>

          <path d="M152,197 C190,197 220,195 258,195" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlueTun)" />
          <text x="205" y="188" textAnchor="middle" fill="#6366f1" fontSize="10">訪問</text>
          <text x="205" y="215" textAnchor="middle" fill="#fbbf24" fontSize="9.5">abc123.ngrok.io</text>

          <path d="M462,180 C500,170 520,160 553,165" fill="none" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrPurpleTun)" />
          <text x="507" y="160" textAnchor="middle" fill="#8B5CF6" fontSize="10">隧道轉發</text>

          <path d="M553,215 C520,220 500,230 462,220" fill="none" stroke="#F59E0B" strokeWidth="2" markerEnd="url(#arrOrangeTun)" />
          <text x="507" y="240" textAnchor="middle" fill="#F59E0B" fontSize="10">Response</text>

          <text x="90" y="360" textAnchor="middle" fill="#6366f1" fontSize="11" fontWeight="600">1. 訪問 Public URL</text>
          <text x="360" y="360" textAnchor="middle" fill="#8B5CF6" fontSize="11" fontWeight="600">2. 中介轉發</text>
          <text x="625" y="360" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600">3. Local 處理</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>Tunneling 運作流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>喺 local machine 運行 ngrok 或 Cloudflare Tunnel client，佢會主動連接到中介服務器，建立一條加密嘅隧道（Tunnel）。</span></li>
        <li><span className="step-num">2</span><span>中介服務器分配一個 Public URL（例如 https://abc123.ngrok.io），外界可以訪問呢個 URL。</span></li>
        <li><span className="step-num">3</span><span>當有用戶訪問 abc123.ngrok.io，中介服務器將請求經過隧道轉發俾 local server（例如 localhost:3000）。</span></li>
        <li><span className="step-num">4</span><span>Local server 處理請求，將 response 返俾中介服務器，中介服務器再返俾外部用戶。全程 local server 冇暴露任何 Public IP。</span></li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>ngrok</h4>
          <p>最出名嘅 Tunneling 服務。免費版會產生一個隨機 URL，付費版可以用 custom domain。超方便做 webhook testing、demo 俾 client 睇、暫時 share local dev server。</p>
        </div>
        <div className="key-point">
          <h4>Cloudflare Tunnel</h4>
          <p>Cloudflare 提供嘅 Tunnel 服務，免費版已經好夠用。可以用自己嘅 domain，仲有 DDoS protection。適合長期用嚟 host home server。</p>
        </div>
        <div className="key-point">
          <h4>安全考量</h4>
          <p>Tunneling 雖然方便，但係請求會經過第三方服務器，要注意：唔好傳敏感資料、記得加 authentication、定期 rotate tunnel URL。如果係公司項目，check 清楚公司政策准唔准用第三方 tunnel。</p>
        </div>
        <div className="key-point">
          <h4>效能影響</h4>
          <p>因為多咗一層中介服務器，latency 會比直接 Port Forwarding 高少少（通常多 20-50ms）。但係呢個代價對於大部分應用嚟講係可以接受嘅，特別係冇其他選擇嘅時候。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>結論</h4>
        <p>如果控制到 Router，又有真正嘅 Public IP，用 Port Forwarding 係最直接嘅方法。但係如果遇到 CGNAT、公司網絡限制、或者想快速 share local dev server，Tunneling 絕對係最佳方案。兩種方法都要識，睇情況揀啱嘅工具。最重要係明白背後嘅原理——NAT 點解會阻止外界連入嚟，以及點樣用技術手段穿過呢個障礙。</p>
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
        <h4>Prompt 1 — 設定 Local Dev Server Port Forwarding</h4>
        <div className="prompt-text">
          幫手寫一份完整嘅 Port Forwarding 設定教學，目標係將本地 <span className="placeholder">[開發框架，例如 Next.js / Express / Flask]</span> 跑緊嘅 dev server（port <span className="placeholder">[本地 port，例如 3000]</span>）透過 Router Port Forwarding 俾外部裝置 access。{'\n\n'}
          包含以下內容：{'\n'}
          1. 點樣搵到本機內網 IP（macOS + Windows 指令）{'\n'}
          2. Router 管理頁面入面 Port Forwarding 規則應該點填（External Port、Internal IP、Internal Port）{'\n'}
          3. 用 whatismyip.com 驗證 Public IP，再用外部裝置測試連線{'\n'}
          4. 檢查係咪 CGNAT 嘅方法（對比 Router WAN IP 同 Public IP）{'\n'}
          5. 如果係 CGNAT，建議用 ngrok 或 Cloudflare Tunnel 作為替代方案{'\n\n'}
          輸出格式：Step-by-step 教學，每步附帶實際指令或截圖提示。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 用 Nginx Reverse Proxy 做 Port Mapping</h4>
        <div className="prompt-text">
          幫手寫一份 Nginx reverse proxy 配置，實現以下 port mapping：{'\n\n'}
          目標環境：<span className="placeholder">[部署環境，例如 Ubuntu VPS / Docker]</span>{'\n'}
          Domain：<span className="placeholder">[domain 名，例如 myapp.example.com]</span>{'\n\n'}
          需要 mapping 嘅 service：{'\n'}
          - 主應用跑喺 localhost:<span className="placeholder">[port，例如 3000]</span> → 對外 port 80/443{'\n'}
          - API service 跑喺 localhost:<span className="placeholder">[port，例如 8080]</span> → 對外路徑 /api{'\n\n'}
          包含以下內容：{'\n'}
          1. 完整嘅 nginx.conf 或 sites-available 配置檔{'\n'}
          2. SSL 設定（用 Let's Encrypt / Certbot）{'\n'}
          3. WebSocket proxy 支持（如果適用）{'\n'}
          4. 常見錯誤排查（502 Bad Gateway、connection refused）{'\n'}
          5. 用 curl 測試每個 route 嘅指令{'\n\n'}
          輸出格式：可以直接複製貼上嘅配置檔 + 部署步驟。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — Cloudflare Tunnel 快速部署 Local Service</h4>
        <div className="prompt-text">
          幫手寫一份 Cloudflare Tunnel（cloudflared）嘅完整設定指南，將本地 <span className="placeholder">[service 類型，例如 Web App / Minecraft Server / NAS]</span> 安全咁暴露到 Internet。{'\n\n'}
          本地 service 跑緊嘅 port：<span className="placeholder">[port，例如 3000]</span>{'\n'}
          想用嘅 domain：<span className="placeholder">[domain，例如 app.mydomain.com]</span>{'\n\n'}
          包含以下內容：{'\n'}
          1. 安裝 cloudflared（macOS / Linux / Windows）{'\n'}
          2. 登入 Cloudflare 帳戶同埋授權{'\n'}
          3. 建立 Tunnel 同埋配置 config.yml{'\n'}
          4. DNS record 自動設定{'\n'}
          5. 設定為 system service（開機自動啟動）{'\n'}
          6. 加 Access Policy 做認證保護（可選）{'\n'}
          7. 同 ngrok 嘅比較（免費版功能、速度、穩定性）{'\n\n'}
          輸出格式：從零開始嘅 Step-by-step 指南，每步附帶終端指令。
        </div>
      </div>
    </div>
  );
}

export default function PortForwarding() {
  return (
    <>
      <TopicTabs
        title="Port Forwarding 端口轉發"
        subtitle="點樣穿過 NAT 網絡將外部請求導向內網設備"
        tabs={[
          { id: 'basics', label: '① Port Forwarding 基礎', content: <BasicsTab /> },
          { id: 'nat', label: '② NAT 網絡轉換', content: <NATTab /> },
          { id: 'tunneling', label: '③ Tunneling 穿透', premium: true, content: <TunnelingTab /> },
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
