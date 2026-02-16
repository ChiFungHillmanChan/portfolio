import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '系統有 10 台 Server 用 Load Balancer 分流，用戶登入後 Session 存喺 Server 1 嘅 memory 入面。如果下一個 Request 被分配到 Server 2，會發生咩事？',
    options: [
      { text: 'Server 2 會自動同 Server 1 同步 Session 資料', correct: false, explanation: 'Server 之間唔會自動同步 memory 入面嘅資料。除非特別設計咗 Session Replication，但呢個方案嘅開銷好大，唔係最佳做法。' },
      { text: '用戶會被踢出登入狀態，因為 Server 2 搵唔到 Session', correct: true, explanation: '因為 Session 只存喺 Server 1 嘅 memory，Server 2 完全唔知道呢個用戶登入咗。呢個就係點解需要中央 Session Store（例如 Redis）——所有 Server 共享同一個 Store，去邊台都搵到 Session。' },
      { text: 'Load Balancer 會自動將用戶重新導向返 Server 1', correct: false, explanation: '呢個描述嘅係 Sticky Session。雖然可以做到，但如果 Server 1 掛咗，用戶 Session 就冇晒。唔夠可靠，唔係最佳實踐。' },
      { text: '用戶嘅 Cookie 會帶晒所有 Session 資料，所以唔使查 Server', correct: false, explanation: '將所有 Session 資料放喺 Cookie 係一個好差嘅做法。Cookie 有 4KB 容量限制，而且 Client 可以篡改 Cookie 內容，有安全風險。' },
    ],
  },
  {
    question: 'JWT 同 Cookie-based Session 比較，JWT 最大嘅缺點係咩？',
    options: [
      { text: 'JWT 嘅安全性比 Cookie 差', correct: false, explanation: 'JWT 嘅安全性唔一定差過 Cookie。兩者各有安全考量——JWT 要保護 secret key，Cookie 要設定 HttpOnly + Secure。安全性取決於實現方式。' },
      { text: 'JWT Token 發出去之後無法主動撤銷（revoke）', correct: true, explanation: '呢個係 JWT 最核心嘅 trade-off。因為 JWT 係 stateless 嘅，Server 驗證簽名就信任。一旦發出去，喺過期之前冇辦法主動廢除。如果用戶 logout 或者被 ban，舊嘅 JWT 仍然有效。Cookie-based Session 就可以即時刪除 Redis 入面嘅 Session 嚟踢人。' },
      { text: 'JWT 唔可以存放用戶資料', correct: false, explanation: 'JWT 嘅 payload 可以存放用戶資料（claims），例如 user_id、role、email 等。呢個正正係 JWT 嘅特點——Token 本身帶有用戶資訊。' },
      { text: 'JWT 唔支援 HTTPS 傳輸', correct: false, explanation: 'JWT 可以透過任何方式傳輸，包括 HTTPS。通常放喺 Authorization header 入面，完全支援安全傳輸。' },
    ],
  },
  {
    question: '設計 Session 系統嘅時候，點解建議 Session 要設定 TTL（過期時間）？',
    options: [
      { text: '因為 Redis 嘅記憶體有限，要定期清理', correct: false, explanation: '記憶體管理只係其中一個原因，但唔係最重要嘅原因。即使記憶體充足，TTL 仍然係必須嘅安全措施。' },
      { text: '為咗安全同資源管理——長期有效嘅 Session 增加被盜用嘅風險', correct: true, explanation: '呢個係最重要嘅原因。如果 Session 永遠唔過期，一旦 Session ID 被竊取（例如透過 XSS），攻擊者就可以永遠假扮呢個用戶。設定 TTL（例如 30 分鐘）限制咗攻擊窗口。同時亦都自動清理唔再使用嘅 Session，釋放資源。' },
      { text: '因為 Browser Cookie 有時間限制，一定要配合', correct: false, explanation: 'Cookie 嘅過期時間同 Server 端 Session 嘅 TTL 係獨立嘅。就算 Cookie 冇過期，Server 端 Session 過期咗一樣要重新登入。TTL 係 Server 端嘅安全決策。' },
      { text: '因為 Load Balancer 要求 Session 有過期時間', correct: false, explanation: 'Load Balancer 唔會管 Session 有冇 TTL。TTL 係 Session Store 同應用層面嘅設計，同 Load Balancer 冇直接關係。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'authentication', label: 'Authentication 驗證' },
  { slug: 'redis', label: 'Redis' },
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Session Manager 係咩</h2>
      <div className="subtitle">管理「邊個用戶正在登入緊」嘅系統</div>
      <p>
        想像一下：去酒店 check-in，前台俾一張房卡。之後用房卡就可以出入房間、泳池、健身房。Session Manager 就係網絡世界嘅「前台」——負責記住邊個用戶登入咗、身份係咩、幾時要踢出去。
      </p>
      <p>
        特別留意呢個問題：當有多台 Server（Load Balancer 分流）嘅時候，點樣確保用戶無論去到邊台 Server 都可以保持登入狀態？呢個就係 Session Manager 要解決嘅核心問題，以下詳細拆解。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 820 350" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#EF4444" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#172033" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#1f1a10" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#13251e" /></linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#251318" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          </defs>
          <g transform="translate(30,135)">
            <rect width="120" height="70" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="60" y="30" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">Browser</text>
            <text x="60" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">帶住 Cookie / JWT</text>
          </g>
          <g transform="translate(225,135)">
            <rect width="130" height="70" rx="12" fill="url(#gradAmber)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Load</text>
            <text x="65" y="46" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Balancer</text>
            <text x="65" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">負載均衡</text>
          </g>
          <g transform="translate(430,65)">
            <rect width="120" height="60" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="25" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Server 1</text>
            <text x="60" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Stateless 無狀態</text>
          </g>
          <g transform="translate(430,210)">
            <rect width="120" height="60" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="25" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Server 2</text>
            <text x="60" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Stateless 無狀態</text>
          </g>
          <g transform="translate(630,115)">
            <rect width="155" height="80" rx="12" fill="url(#gradRed)" stroke="#EF4444" strokeWidth="2" filter="url(#glowRed)" />
            <text x="77" y="28" textAnchor="middle" fill="#EF4444" fontSize="13" fontWeight="700">Session Store</text>
            <text x="77" y="48" textAnchor="middle" fill="#EF4444" fontSize="12">(Redis)</text>
            <text x="77" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">中央 Session 儲存</text>
          </g>
          <path d="M 150 170 Q 188 168 223 168" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="188" y="158" textAnchor="middle" fill="#a5b4fc" fontSize="10">Cookie / JWT</text>
          <path d="M 355 155 Q 393 118 428 100" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <path d="M 355 175 Q 393 210 428 232" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <path d="M 550 95 Q 590 115 628 140" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <text x="600" y="108" textAnchor="middle" fill="#34d399" fontSize="10">Read/Write</text>
          <path d="M 550 240 Q 590 210 628 180" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <text x="600" y="238" textAnchor="middle" fill="#34d399" fontSize="10">Read/Write</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>成個流程一覽</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>用戶登入之後，Browser 收到一個 Session ID（存喺 Cookie 或者 JWT 入面）。呢個 ID 就係「房卡」。</span></li>
        <li><span className="step-num">2</span><span>之後每次請求，Browser 都會自動帶住呢個 ID 送去 Server。唔使手動處理，瀏覽器自動搞掂。</span></li>
        <li><span className="step-num">3</span><span>Load Balancer 可能將請求送去 Server 1 或 Server 2——重點係，兩台 Server 都係 Stateless（無狀態）嘅，本身唔存任何 session 資料。</span></li>
        <li><span className="step-num">4</span><span>Server 拿到 Session ID，就去 Redis（Session Store）查登入資料。所有驗證邏輯都喺呢度。</span></li>
        <li><span className="step-num">5</span><span>因為所有 Server 共用同一個 Session Store，所以去邊台 Server 都一樣。呢個就係必須掌握嘅核心設計。</span></li>
      </ol>
    </div>
  );
}

function CompareTab() {
  return (
    <div className="card">
      <h2>Cookie vs JWT 分辨</h2>
      <div className="subtitle">兩種主流方法嘅利弊分析</div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '20px 0 12px' }}>Cookie-based Session</h3>
      <p>傳統做法：Server 生成一個隨機 Session ID，存喺 Cookie 入面。用戶每次發 Request，瀏覽器自動帶上 Cookie，Server 拿 ID 去 Session Store 查資料。呢個方法穩陣，大部分場景建議優先考慮。</p>
      <div className="pros-cons">
        <div className="pros">
          <h4>好處</h4>
          <ul>
            <li>Server 可以隨時踢人（刪除 session）</li>
            <li>Cookie 容量限制唔影響，因為只存 ID</li>
            <li>HttpOnly + Secure flag 安全性高</li>
          </ul>
        </div>
        <div className="cons">
          <h4>壞處</h4>
          <ul>
            <li>需要 Session Store（例如 Redis）</li>
            <li>每次 Request 都要查一次 Store</li>
            <li>跨域要額外處理 CORS</li>
          </ul>
        </div>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '28px 0 12px' }}>JWT-based Session</h3>
      <p>另一個做法：Server 將用戶資料簽名成一個 JWT Token，送返俾 Client。Client 每次發 Request 帶上 JWT，Server 直接驗證簽名就知道用戶身份，唔使查 Store。要留意，呢個做法適合微服務架構，但有啲 trade-off 需要清楚。</p>
      <div className="pros-cons">
        <div className="pros">
          <h4>好處</h4>
          <ul>
            <li>唔需要 Session Store，Server 完全無狀態</li>
            <li>適合微服務，跨服務驗證方便</li>
            <li>減少 Redis 負載</li>
          </ul>
        </div>
        <div className="cons">
          <h4>壞處</h4>
          <ul>
            <li>Token 發出去之後無法主動撤銷</li>
            <li>Token 可能好大（帶好多 claims）</li>
            <li>如果 secret key 洩漏就全部 token 冇用</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">設計 Session 系統時必須記住呢幾點</div>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>Session TTL</strong>：建議設定 Session 嘅過期時間（例如 30 分鐘），用戶太耐冇操作就自動登出。Redis 嘅 EXPIRE 天生支援呢個功能，必須善用。</span></li>
        <li><span className="step-num">2</span><span><strong>Sticky Session</strong>：Load Balancer 可以設定將同一個用戶永遠送去同一台 Server。但呢個做法唔好——因為如果嗰台 Server 掛咗，用戶 Session 就冇咗。唔夠可靠。</span></li>
        <li><span className="step-num">3</span><span><strong>Shared Session Store</strong>：最佳做法係用 Redis 做中央 Session Store，所有 Server 共享。就算某台 Server 掛咗，用戶去第二台一樣用到。呢個先係 production 級嘅設計。</span></li>
        <li><span className="step-num">4</span><span><strong>安全性</strong>：必須確保 Session ID 夠長（128 bits 以上），用 HTTPS 傳輸，Cookie 設定 HttpOnly + Secure + SameSite。常見嘅錯誤係忽略呢啲安全設定，千祈唔好。</span></li>
      </ol>

      <div className="use-case">
        <h4>面試標準答案</h4>
        <p>如果面試問：「系統有 100 台 Server，用戶 Session 點管理？」——標準答案係：用中央 Session Store（Redis），每台 Server 都係 Stateless，Session 資料全部放喺 Redis。咁樣 scale out 加幾多台 Server 都冇問題。呢個就係最佳實踐。</p>
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
        <h4>Prompt 1 — 用 Redis 設計 Session Management 系統</h4>
        <div className="prompt-text">{`幫手設計一個完整嘅 Session Management 系統，用 Redis 做中央 Session Store。

技術棧：[Node.js + Express / Python + FastAPI / Go + Gin]

要求：
- 用戶登入後生成 Session ID（128 bits 以上，cryptographically secure）
- Session 存入 Redis，設定 TTL 為 [30 分鐘 / 1 小時]
- Cookie 設定：HttpOnly、Secure、SameSite=Strict
- 支援多台 Server 共享 Session（Stateless Server 架構）
- 包含 Session 續期邏輯（用戶有操作就自動延長 TTL）
- 實現強制登出功能（刪除 Redis 入面嘅 Session）
- 寫埋 middleware 代碼同 Redis 連接配置`}</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實現 JWT + Session 混合驗證系統</h4>
        <div className="prompt-text">{`用 [Node.js / Python / Go] 實現一個 JWT + Session 混合嘅身份驗證系統。

架構設計：
- 登入時同時發出 JWT Access Token（短期，15 分鐘）同 Refresh Token（長期，7 日）
- Access Token 用嚟做 API 驗證（無狀態，唔查 Redis）
- Refresh Token 存喺 Redis，用嚟換新嘅 Access Token
- 實現 Token Rotation：每次用 Refresh Token 就發一個新嘅
- 支援 Token Revocation：可以主動撤銷某個用戶嘅所有 Token
- 包含完整嘅 Login、Logout、Refresh、Revoke API
- 寫埋錯誤處理同安全性檢查（例如偵測 Token 重用攻擊）
- 目標場景：[Web App / Mobile App / 微服務架構]`}</div>
      </div>
    </div>
  );
}

export default function SessionManager() {
  return (
    <>
      <TopicTabs
        title="Session Manager 管理器"
        subtitle="用戶登入狀態同 Session 生命週期管理全解"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'compare', label: '② Cookie vs JWT', content: <CompareTab /> },
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
