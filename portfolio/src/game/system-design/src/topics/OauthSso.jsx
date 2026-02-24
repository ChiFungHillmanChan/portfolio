import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'OAuth 2.0 入面，Authorization Code Flow 點解要先返回 Code，再用 Code 換 Token？點解唔直接返回 Token？',
    options: [
      { text: '因為 Code 比 Token 短，傳輸更快', correct: false, explanation: '長度唔係原因。Code 同 Token 嘅長度差唔多。安全性先係真正嘅原因。' },
      { text: '因為 Code 經瀏覽器 redirect 傳送（可能被截取），但換 Token 嘅請求係 Server-to-Server（安全），Token 唔會暴露喺瀏覽器', correct: true, explanation: '啱！Authorization Code 經 URL redirect 傳送，有可能被瀏覽器 history 或 log 記錄。但用 Code 換 Token 嘅請求係由 Backend Server 直接發送到 Auth Server 嘅（Server-to-Server），Token 永遠唔會出現喺瀏覽器端。而且 Code 係一次性嘅，用過即失效。' },
      { text: '因為 Code 可以用多次，Token 只能用一次', correct: false, explanation: '倒轉。Code 係一次性嘅（用完即失效），Token 可以重複使用直到過期。' },
      { text: '因為 OAuth 規範要求必須有兩步', correct: false, explanation: 'OAuth 有唔同嘅 Flow（例如 Implicit Flow 就冇呢步）。Authorization Code Flow 嘅兩步設計係為咗安全性，唔係規範硬性要求所有 Flow 都要兩步。' },
    ],
  },
  {
    question: 'PKCE（Proof Key for Code Exchange）解決咩問題？',
    options: [
      { text: '加快 Token 嘅簽發速度', correct: false, explanation: 'PKCE 唔係為咗加速。佢係為咗安全性，甚至會增加少少延遲（多咗 hash 計算）。' },
      { text: '防止 Authorization Code 被截取後冒用——因為 SPA 同 Mobile App 冇安全嘅 Client Secret', correct: true, explanation: '啱！傳統 Authorization Code Flow 用 Client Secret 驗證身份，但 SPA 同 Mobile App 嘅 code 暴露喺 Client 端，唔能安全保存 Secret。PKCE 嘅做法：Client 產生一個隨機嘅 code_verifier，發送 code_challenge（hash 過嘅）去 Auth Server。換 Token 嘅時候帶 code_verifier，Auth Server 驗證 hash match。攻擊者截取咗 Code 但冇 code_verifier，就換唔到 Token。' },
      { text: '令 Token 永遠唔過期', correct: false, explanation: 'PKCE 同 Token 過期無關。Token 嘅 TTL 係另外設定嘅。' },
      { text: '代替 HTTPS 做加密', correct: false, explanation: 'PKCE 唔係代替 HTTPS。OAuth 要求必須用 HTTPS。PKCE 係額外嘅安全層，防止 Code 截取攻擊。' },
    ],
  },
  {
    question: 'Refresh Token 嘅作用係咩？點解唔直接將 Access Token 設到好長嘅過期時間？',
    options: [
      { text: 'Refresh Token 同 Access Token 完全一樣，只係名稱唔同', correct: false, explanation: '唔同！Access Token 用嚟存取資源（短期有效），Refresh Token 用嚟攞新嘅 Access Token（長期有效但只能同 Auth Server 互動）。' },
      { text: 'Access Token 短期有效（減少被盜風險），Refresh Token 長期有效用嚟靜默攞新嘅 Access Token，唔使用戶重新登入', correct: true, explanation: '啱！如果 Access Token 有效期好長，一旦被盜用，攻擊者可以長期存取資源。短期嘅 Access Token（例如 15 分鐘）限制咗被盜後嘅影響範圍。Refresh Token 存喺安全嘅地方（例如 httpOnly Cookie），用嚟靜默攞新嘅 Access Token，用戶唔使每 15 分鐘重新登入。' },
      { text: 'Refresh Token 係俾 Server 用嘅，Access Token 係俾 Client 用嘅', correct: false, explanation: '兩者都係 Client 持有嘅。Access Token 用嚟 call API（Bearer Token），Refresh Token 用嚟同 Auth Server 換新嘅 Access Token。' },
      { text: '只係 Google 嘅做法，其他 OAuth Provider 唔用 Refresh Token', correct: false, explanation: 'Refresh Token 係 OAuth 2.0 標準嘅一部分，幾乎所有 OAuth Provider 都支持（Google、GitHub、Auth0 等）。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'authentication', label: 'Authentication 驗證' },
  { slug: 'session-manager', label: 'Session Manager' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>OAuth 2.0 係咩？</h2>
      <div className="subtitle">授權框架 — 點解唔直接分享密碼</div>
      <p>
        想像你用一個第三方 App（例如 Notion），佢想讀取你嘅 Google Calendar 嘅資料。
        你唔會直接將 Google 密碼俾 Notion——因為咁做 Notion 就可以存取你<strong style={{ color: '#f87171' }}>所有嘅 Google 資料</strong>，
        而且你一改密碼 Notion 就斷線。
        <strong style={{ color: '#3B82F6' }}> OAuth 2.0</strong> 就係解決呢個問題嘅授權框架——
        用戶可以<strong style={{ color: '#34d399' }}>授權第三方 App 存取特定嘅資源</strong>，唔使分享密碼。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowBlue"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradUser" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradApp" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAuth" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAPI" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          {/* User */}
          <g transform="translate(30,130)">
            <rect width="120" height="70" rx="14" fill="url(#gradUser)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="30" textAnchor="middle" fill="#8B5CF6" fontSize="14" fontWeight="700">User</text>
            <text x="60" y="50" textAnchor="middle" fill="#c4b5fd" fontSize="10">用戶 / 資源擁有者</text>
          </g>

          {/* App (Client) */}
          <g transform="translate(30,260)" filter="url(#glowBlue)">
            <rect width="120" height="70" rx="14" fill="url(#gradApp)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="30" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">App</text>
            <text x="60" y="50" textAnchor="middle" fill="#93c5fd" fontSize="10">第三方應用</text>
          </g>

          {/* Auth Server */}
          <g transform="translate(300,30)">
            <rect width="170" height="80" rx="14" fill="url(#gradAuth)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="85" y="30" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">Auth Server</text>
            <text x="85" y="50" textAnchor="middle" fill="#fcd34d" fontSize="10">授權伺服器</text>
            <text x="85" y="66" textAnchor="middle" fill="#9ca3af" fontSize="9">Google / GitHub</text>
          </g>

          {/* Resource Server (API) */}
          <g transform="translate(550,260)" filter="url(#glowGreen)">
            <rect width="140" height="70" rx="14" fill="url(#gradAPI)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="30" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Resource API</text>
            <text x="70" y="50" textAnchor="middle" fill="#6ee7b7" fontSize="10">受保護嘅資源</text>
          </g>

          {/* Step 1: User → App (click login) */}
          <path d="M90,202 L90,258" fill="none" stroke="#8B5CF6" strokeWidth="1.5" markerEnd="url(#arrPurple)" />
          <text x="105" y="235" fill="#8B5CF6" fontSize="9">① Click「用 Google 登入」</text>

          {/* Step 2: App → Auth Server (redirect) */}
          <path d="M152,280 Q240,180 298,70" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="195" y="160" fill="#3B82F6" fontSize="9">② Redirect 到 Auth Server</text>

          {/* Step 3: User → Auth Server (consent) */}
          <path d="M152,150 Q230,100 298,70" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrAmber)" />
          <text x="230" y="90" fill="#fbbf24" fontSize="9">③ 用戶授權（Consent）</text>

          {/* Step 4: Auth Server → App (code) */}
          <path d="M385,112 Q300,200 152,290" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrAmber)" />
          <text x="280" y="220" fill="#fbbf24" fontSize="9">④ 返回 Auth Code</text>

          {/* Step 5: App → Auth Server (code → token, server-to-server) */}
          <g transform="translate(200,155)">
            <rect width="180" height="35" rx="8" fill="rgba(59,130,246,0.12)" stroke="#3B82F6" strokeWidth="1" />
            <text x="90" y="14" textAnchor="middle" fill="#3B82F6" fontSize="9" fontWeight="600">⑤ Server-to-Server</text>
            <text x="90" y="28" textAnchor="middle" fill="#93c5fd" fontSize="8">Code + Client Secret → Token</text>
          </g>

          {/* Step 6: App → Resource API (with token) */}
          <path d="M152,295 Q350,295 548,295" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="350" y="285" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">⑥ 用 Access Token 讀取資源</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>Authorization Code Flow</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>用戶喺 App 入面 Click「用 Google 登入」。</span></li>
        <li><span className="step-num">2</span><span>App 將用戶 <strong style={{ color: '#3B82F6' }}>Redirect</strong> 到 Google 嘅授權頁面（Auth Server）。</span></li>
        <li><span className="step-num">3</span><span>用戶喺 Google 頁面<strong style={{ color: '#fbbf24' }}>授權</strong>（「允許 Notion 讀取你嘅 Calendar」）。</span></li>
        <li><span className="step-num">4</span><span>Google 將用戶 Redirect 回 App，URL 帶住一個一次性嘅 <strong style={{ color: '#fbbf24' }}>Authorization Code</strong>。</span></li>
        <li><span className="step-num">5</span><span>App 嘅 Backend 用呢個 Code + Client Secret 向 Google <strong style={{ color: '#3B82F6' }}>Server-to-Server</strong> 換取 Access Token。Token 唔經瀏覽器。</span></li>
        <li><span className="step-num">6</span><span>App 用 Access Token 呼叫 Google Calendar API，讀取用戶嘅資料。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>PKCE、OIDC 同 SAML</h2>
      <div className="subtitle">SPA 安全、身份認證、企業 SSO</div>
      <div className="key-points">
        <div className="key-point">
          <h4>PKCE（SPA / Mobile 必用）</h4>
          <p>SPA 同 Mobile App 嘅 code 暴露喺 Client 端，唔能安全保存 Client Secret。<strong style={{ color: '#3B82F6' }}>PKCE</strong> 嘅做法：Client 產生隨機嘅 <code style={{ color: '#60a5fa' }}>code_verifier</code>，計算 <code style={{ color: '#60a5fa' }}>code_challenge = SHA256(code_verifier)</code>。授權時發 challenge，換 Token 時發 verifier。Auth Server 驗證 hash match。攻擊者截取 Code 但冇 verifier 就換唔到 Token。</p>
        </div>
        <div className="key-point">
          <h4>OpenID Connect（OIDC）</h4>
          <p>OAuth 2.0 係<strong style={{ color: '#fbbf24' }}>授權</strong>框架（「你可以讀我嘅 Calendar」），唔係<strong style={{ color: '#34d399' }}>認證</strong>框架（「你係邊個」）。OIDC 喺 OAuth 2.0 上面加一層 Identity Layer：除咗 Access Token，仲返回一個 <strong style={{ color: '#34d399' }}>ID Token</strong>（JWT），包含用戶嘅身份資訊（email、name、picture）。「用 Google 登入」實際上用嘅就係 OIDC。</p>
        </div>
        <div className="key-point">
          <h4>SAML vs OAuth</h4>
          <p><strong style={{ color: '#8B5CF6' }}>SAML（Security Assertion Markup Language）</strong>係企業 SSO 嘅老牌標準，用 XML。<strong style={{ color: '#3B82F6' }}>OAuth 2.0 + OIDC</strong> 係現代嘅做法，用 JSON / JWT。SAML 主要用喺企業內部系統（Okta → Salesforce），OAuth/OIDC 主要用喺 Consumer App（「用 Google 登入」）。新項目建議用 OAuth/OIDC。</p>
        </div>
        <div className="key-point">
          <h4>Refresh Token 策略</h4>
          <p>Access Token 短期有效（<strong style={{ color: '#34d399' }}>15 分鐘 - 1 小時</strong>），Refresh Token 長期有效（<strong style={{ color: '#fbbf24' }}>7-30 日</strong>）。Refresh Token 要存喺安全嘅地方（httpOnly Cookie），而且用一次就應該 rotate（發新嘅 Refresh Token，舊嘅失效）。呢個叫 Refresh Token Rotation，防止被盜後長期使用。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰同面試技巧</h2>
      <div className="subtitle">Google/GitHub OAuth 整合同 Token 存儲</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Google / GitHub OAuth 整合</h4>
          <p>整合步驟：1）去 Google / GitHub Developer Console 建立 OAuth App，攞到 Client ID + Secret。2）前端 Redirect 到授權 URL（帶 Client ID + redirect_uri + scope）。3）用戶授權後 Redirect 回來帶 Code。4）Backend 用 Code + Secret 換 Token。5）用 Token 呼叫 API 攞用戶資料。工具推薦：<strong style={{ color: '#3B82F6' }}>Passport.js</strong>（Node.js）、<strong style={{ color: '#34d399' }}>NextAuth.js</strong>（Next.js）。</p>
        </div>
        <div className="key-point">
          <h4>Token 存儲安全</h4>
          <p><strong style={{ color: '#f87171' }}>唔好</strong>存喺 localStorage（容易被 XSS 攻擊讀取）。<strong style={{ color: '#34d399' }}>建議</strong>：Access Token 存喺記憶體（JavaScript 變數），Refresh Token 存喺 <code style={{ color: '#60a5fa' }}>httpOnly + Secure + SameSite=Strict</code> Cookie。呢個配置令 XSS 攻擊偷唔到 Token。</p>
        </div>
        <div className="key-point">
          <h4>SSO 實現</h4>
          <p>SSO（Single Sign-On）令用戶喺一個地方登入，可以存取多個 App。實現方式：所有 App 用同一個 <strong style={{ color: '#fbbf24' }}>Identity Provider</strong>（例如 Okta、Auth0、Keycloak）。用戶登入一次後，IdP 發 Session Cookie，之後去其他 App 嘅時候，IdP 直接返回 Token（唔使再登入）。</p>
        </div>
        <div className="key-point">
          <h4>面試重點</h4>
          <p>面試講 OAuth 嘅時候：1）區分 Authentication（你係邊個）同 Authorization（你可以做咩）。2）解釋 Authorization Code Flow 嘅每一步。3）講 PKCE 點解對 SPA 重要。4）講 Token 存儲嘅安全考量（唔好用 localStorage）。5）知道 OAuth vs OIDC vs SAML 嘅分別。</p>
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
        <h4>Prompt 1 — 實現 OAuth 2.0 + PKCE 登入</h4>
        <div className="prompt-text">
          {'用 '}
          <span className="placeholder">[Next.js / React + Express / Go]</span>
          {' 實現一套完整嘅 OAuth 2.0 登入系統。\n\n要求：\n- 支持 '}
          <span className="placeholder">[Google / GitHub / 兩個都支持]</span>
          {' OAuth Provider\n- 使用 Authorization Code Flow + PKCE\n- 前端：登入按鈕 → Redirect 到 OAuth Provider → 回調處理\n- 後端：用 Code 換 Access Token + ID Token（OIDC）\n- Token 存儲：Access Token 存記憶體，Refresh Token 存 httpOnly Cookie\n- 實現靜默 Token Refresh（Access Token 過期自動用 Refresh Token 換新嘅）\n- Refresh Token Rotation（每次 refresh 都發新嘅 Refresh Token）\n- CSRF Protection（State parameter）\n- 完整嘅 Error Handling（Token 過期、授權拒絕、Invalid State）\n- 提供 Docker Compose 同環境配置'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計企業 SSO 方案</h4>
        <div className="prompt-text">
          {'設計一個企業 SSO 方案，用 '}
          <span className="placeholder">[Keycloak / Auth0 / Okta]</span>
          {' 做 Identity Provider。\n\n場景：\n- 企業有 '}
          <span className="placeholder">[3 / 5 / 10]</span>
          {' 個內部 Web App\n- 員工登入一次即可存取所有 App\n\n要求：\n- Identity Provider 配置（Realm、Clients、Users、Roles）\n- OIDC Authorization Code Flow 整合\n- Role-Based Access Control（RBAC）：唔同角色存取唔同 App\n- Session Management（統一登出所有 App）\n- 用戶自助（密碼重設、MFA 設定）\n- Docker Compose 完整環境\n- 每個 App 嘅 Client Library 整合代碼\n- 安全 Checklist（HTTPS、Token 存儲、CORS、CSP）'}
        </div>
      </div>
    </div>
  );
}

export default function OauthSso() {
  return (
    <>
      <TopicTabs
        title="OAuth 2.0 與 SSO"
        subtitle="授權框架同單一登入——安全存取第三方資源嘅標準方法"
        tabs={[
          { id: 'overview', label: '① 整體流程', content: <OverviewTab /> },
          { id: 'advanced', label: '② PKCE / OIDC', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰整合', premium: true, content: <PracticeTab /> },
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
