import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'JWT 同 Session-based auth 最大嘅分別係咩？',
    options: [
      { text: 'JWT 係 stateless，Server 唔需要儲存 session 資料', correct: true, explanation: 'JWT 將用戶資訊編碼喺 token 入面，Server 只需要驗證簽名就得，唔使查 database 或 Redis。Session-based auth 需要 Server 儲存 session 資料。' },
      { text: 'JWT 比 Session 更安全', correct: false, explanation: '兩者各有安全考量。JWT 一旦簽發就無法撤銷（除非用 blacklist），Session 可以即時撤銷。' },
      { text: 'Session 唔支持 mobile app', correct: false, explanation: 'Session 可以通過 cookie 或 header 支持 mobile app，只係實作上 JWT 更方便。' },
      { text: 'JWT 唔需要 HTTPS', correct: false, explanation: 'JWT 同 Session 都必須用 HTTPS。JWT 喺傳輸中被截取一樣危險。' },
    ],
  },
  {
    question: 'OAuth 2.0 嘅 Authorization Code Flow 中，點解需要用 code 換 token，而唔直接返回 token？',
    options: [
      { text: '為咗減少網絡請求', correct: false, explanation: '實際上用 code 換 token 反而多咗一步請求，但安全性大幅提升。' },
      { text: '因為 code 通過瀏覽器 redirect 傳輸，而 token 通過 server-to-server 安全通道傳輸', correct: true, explanation: 'Authorization code 經過瀏覽器 URL 傳輸，可能被截取。用 code 換 token 係 server-to-server 嘅請求，配合 client secret，攻擊者即使截取 code 都無法換到 token。' },
      { text: '因為 token 太長放唔入 URL', correct: false, explanation: '雖然 token 可能較長，但主要原因係安全性，唔係長度限制。' },
      { text: '因為所有 OAuth provider 都要求咁做', correct: false, explanation: '呢個係 Authorization Code Flow 嘅設計選擇，Implicit Flow 就直接返回 token（但已經唔建議用）。' },
    ],
  },
  {
    question: '點解密碼要用 bcrypt 而唔係 SHA-256 做 hashing？',
    options: [
      { text: '因為 SHA-256 唔安全', correct: false, explanation: 'SHA-256 本身係安全嘅 hash function，但佢太快，唔適合做密碼 hashing。' },
      { text: '因為 bcrypt 有內建 salt 同 cost factor，設計上專門針對密碼 hashing', correct: true, explanation: 'bcrypt 刻意設計成慢速運算（透過 cost factor 調整），令暴力破解成本極高。內建 salt 防止 rainbow table 攻擊。SHA-256 太快，GPU 每秒可以計算數十億次。' },
      { text: '因為 bcrypt 嘅輸出更短', correct: false, explanation: '輸出長度唔係選擇 hash 演算法嘅主要考量。' },
      { text: '因為 bcrypt 可以解密返原文', correct: false, explanation: 'bcrypt 係 one-way hash，同 SHA-256 一樣無法解密。呢個係 hash function 嘅基本特性。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'session-manager', label: 'Session Manager 管理器' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
  { slug: 'rate-limiter', label: 'Rate Limiter 限流器' },
  { slug: 'secure-ai-agents', label: '保護 AI Agent' },
];

function EvolutionTab() {
  return (
    <div className="card">
      <h2>Authentication 驗證方式演進</h2>
      <div className="subtitle">由最簡單到最現代嘅三種主流驗證方式</div>
      <p>Authentication（驗證）就係確認「對方係邊個」嘅過程。隨住系統架構嘅演進，驗證方式都不斷進化——由最原始嘅每次傳密碼，到 server-side session，再到現代嘅 stateless JWT。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gradBasic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3a1f1f" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradSession" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d2e0a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradJWT" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f3d2e" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowJWT" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feFlood floodColor="#10B981" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id="arrGray" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="#9ca3af" />
            </marker>
          </defs>

          {/* Basic Auth box */}
          <rect x="40" y="60" width="200" height="80" rx="14" fill="url(#gradBasic)" stroke="#EF4444" strokeWidth="1.5" filter="url(#dropShadow)" />
          <text x="140" y="105" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="600">Basic Auth</text>
          <text x="140" y="175" textAnchor="middle" fill="#9ca3af" fontSize="12">Base64</text>
          <text x="140" y="192" textAnchor="middle" fill="#9ca3af" fontSize="12">每次傳密碼</text>

          {/* Arrow 1 */}
          <path d="M250,100 C290,100 270,100 310,100" stroke="#9ca3af" strokeWidth="1.5" fill="none" markerEnd="url(#arrGray)" />
          <text x="280" y="88" textAnchor="middle" fill="#9ca3af" fontSize="11">演進</text>

          {/* Session Auth box */}
          <rect x="310" y="60" width="200" height="80" rx="14" fill="url(#gradSession)" stroke="#F59E0B" strokeWidth="1.5" filter="url(#dropShadow)" />
          <text x="410" y="105" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="600">Session Auth</text>
          <text x="410" y="175" textAnchor="middle" fill="#9ca3af" fontSize="12">Cookie + Server</text>
          <text x="410" y="192" textAnchor="middle" fill="#9ca3af" fontSize="12">記憶</text>

          {/* Arrow 2 */}
          <path d="M520,100 C560,100 540,100 580,100" stroke="#9ca3af" strokeWidth="1.5" fill="none" markerEnd="url(#arrGray)" />
          <text x="550" y="88" textAnchor="middle" fill="#9ca3af" fontSize="11">演進</text>

          {/* JWT Auth box (with glow) */}
          <rect x="580" y="60" width="200" height="80" rx="14" fill="url(#gradJWT)" stroke="#10B981" strokeWidth="1.5" filter="url(#glowJWT)" />
          <text x="680" y="105" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="600">JWT Auth</text>
          <text x="680" y="175" textAnchor="middle" fill="#9ca3af" fontSize="12">Stateless Token</text>
        </svg>
      </div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong>Basic Auth</strong>：最原始嘅方式。每次 HTTP 請求都將 username:password 用 Base64 編碼放入 header。問題係 Base64 唔係加密，只係編碼——中間人可以輕易解碼。而且每次請求都傳密碼，風險極大。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong>Session Auth</strong>：用戶登入後，server 生成一個 session ID 儲存喺 server 記憶體（或 Redis），再通過 Set-Cookie 送俾 client。之後每次請求 client 自動帶上 cookie。問題係 server 需要儲存所有 session，水平擴展困難。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong>JWT Auth</strong>：用戶登入後，server 生成一個 signed token（包含用戶資訊），client 儲存喺 localStorage 或 cookie。之後每次請求帶上 token，server 只需要驗證簽名，唔使儲存狀態。天生適合分散式系統。</span>
        </li>
      </ol>
    </div>
  );
}

function JWTTab() {
  return (
    <>
      <div className="card">
        <h2>JWT（JSON Web Token）詳解</h2>
        <div className="subtitle">現代 Web 應用最主流嘅驗證方式</div>
        <p>JWT 由三部分組成：Header（演算法資訊）、Payload（用戶數據）、Signature（防篡改簽名）。三部分用 Base64 編碼後用「.」連接。</p>

        <div className="key-points">
          <div className="key-point">
            <h4>Header</h4>
            <p>包含 token 類型（JWT）同簽名演算法（通常係 HS256 或 RS256）。HS256 用 symmetric key，RS256 用 asymmetric key pair。生產環境建議用 RS256。</p>
          </div>
          <div className="key-point">
            <h4>Payload</h4>
            <p>包含 claims（聲明），例如 sub（用戶 ID）、exp（過期時間）、iat（簽發時間）。注意：payload 只係 Base64 編碼，唔係加密——任何人都可以讀取內容。所以絕對唔好放敏感資訊。</p>
          </div>
          <div className="key-point">
            <h4>Signature</h4>
            <p>用 header 指定嘅演算法，將 header + payload + secret 做簽名。收到 token 時只需要用 secret 驗證簽名，就知道 token 有冇被篡改。呢個就係 JWT stateless 嘅關鍵。</p>
          </div>
          <div className="key-point">
            <h4>Token 過期</h4>
            <p>JWT 一旦簽發就無法撤銷（除非用 blacklist）。所以 access token 應該設短嘅過期時間（15-30 分鐘），配合 refresh token（7-30 日）做 token rotation。</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>JWT 安全注意事項</h2>

        <div className="key-points">
          <div className="key-point">
            <h4>儲存位置</h4>
            <p>httpOnly cookie 係最安全嘅儲存方式，可以防止 XSS 攻擊。localStorage 方便但容易被 XSS 讀取。如果用 cookie，記得加 SameSite 同 Secure flag。</p>
          </div>
          <div className="key-point">
            <h4>Token 大小</h4>
            <p>JWT payload 唔好放太多資訊。每次 HTTP 請求都要帶上 token，太大會影響性能。只放 user ID 同 role 等必要資訊。</p>
          </div>
          <div className="key-point">
            <h4>HTTPS 必須</h4>
            <p>JWT 喺傳輸過程中如果被截取，攻擊者可以直接使用。所以 HTTPS 係絕對必須嘅。永遠唔好喺 HTTP 環境下使用 JWT。</p>
          </div>
          <div className="key-point">
            <h4>Secret 管理</h4>
            <p>簽名用嘅 secret key 洩漏等於所有 token 都可以被偽造。Secret 應該儲存喺環境變數或 secrets manager，定期 rotate。</p>
          </div>
        </div>
      </div>
    </>
  );
}

function ComparisonTab() {
  return (
    <div className="card">
      <h2>三種驗證方式實戰比較</h2>
      <div className="subtitle">唔同場景應該揀邊種</div>

      <div className="key-points">
        <div className="key-point">
          <h4>單體應用</h4>
          <p>Session Auth 最簡單直接。一個 server 管晒所有 session，冇分散式問題。配合 Redis 做 session store 可以提升性能同支持多實例。</p>
        </div>
        <div className="key-point">
          <h4>微服務架構</h4>
          <p>JWT 係最佳選擇。每個微服務都可以獨立驗證 token，唔使共享 session store。大幅簡化服務間嘅驗證邏輯。</p>
        </div>
        <div className="key-point">
          <h4>Mobile App</h4>
          <p>JWT + Refresh Token 最適合。Mobile app 嘅 cookie 處理比較複雜，直接用 Authorization header 帶 JWT 更加方便。</p>
        </div>
        <div className="key-point">
          <h4>第三方 API</h4>
          <p>OAuth 2.0 + JWT 係標準方案。第三方應用通過 OAuth flow 取得 access token，用 JWT 格式方便 API server 驗證。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>建議方案</h4>
        <p>大部分現代 Web 應用建議用 JWT + httpOnly Cookie + Refresh Token Rotation。Access token 設 15 分鐘過期，refresh token 設 7 日。配合 HTTPS 同 CSRF protection，呢個方案兼顧安全性同用戶體驗。</p>
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
        <h4>Prompt 1 — 實作 JWT Authentication 系統</h4>
        <div className="prompt-text">
          幫手實作一個完整嘅 JWT authentication 系統，用 <span className="placeholder">[框架，例如 Express + Node.js / FastAPI + Python / Spring Boot]</span>，數據庫用 <span className="placeholder">[數據庫，例如 PostgreSQL / MongoDB / MySQL]</span>。{'\n\n'}要求：{'\n'}1. 實作 Register / Login / Logout API endpoints{'\n'}2. 用 bcrypt hash 密碼，絕對唔好明文儲存{'\n'}3. 實作 Access Token（15 分鐘過期）+ Refresh Token（7 日過期）機制{'\n'}4. Access Token 用 RS256 簽名，Refresh Token 儲存喺 httpOnly Cookie{'\n'}5. 實作 Token Rotation——每次用 Refresh Token 換新 Access Token 時，同時更新 Refresh Token{'\n'}6. 加入 middleware 驗證 JWT，保護需要登入嘅 API routes{'\n'}7. 處理 token 過期、無效 token、被 revoke 嘅 token 等 error cases
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Multi-Factor Authentication 流程</h4>
        <div className="prompt-text">
          幫手設計同實作一個 Multi-Factor Authentication (MFA) 流程，整合到現有嘅 <span className="placeholder">[框架，例如 Next.js / React + Express / Django]</span> 項目。{'\n\n'}要求：{'\n'}1. 實作 TOTP（Time-based One-Time Password）——支援 Google Authenticator / Authy{'\n'}2. 生成 QR Code 俾用戶掃描綁定 authenticator app{'\n'}3. 提供 backup recovery codes（一次性使用，共 10 組）{'\n'}4. 設計 MFA 嘅啟用 / 停用流程（需要先驗證密碼）{'\n'}5. Login 流程：密碼驗證通過後，要求輸入 6 位 TOTP code{'\n'}6. 處理 edge cases：recovery code 用完、裝置遺失、時鐘偏移{'\n'}7. 加入 rate limiting 防止暴力破解 TOTP code
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 實作 OAuth 2.0 第三方登入</h4>
        <div className="prompt-text">
          幫手實作 OAuth 2.0 第三方登入功能，支援 <span className="placeholder">[Provider，例如 Google / GitHub / Discord]</span>，用 <span className="placeholder">[框架，例如 Next.js + NextAuth / Express + Passport.js / Django + allauth]</span>。{'\n\n'}要求：{'\n'}1. 設定 OAuth 2.0 Authorization Code Flow（唔好用 Implicit Flow）{'\n'}2. 處理 callback URL、state parameter（防 CSRF）、PKCE{'\n'}3. 取得用戶 profile 資訊（name、email、avatar）後，建立或關聯本地帳號{'\n'}4. 如果用戶已經用 email 註冊過，自動關聯帳號而唔係建立新帳號{'\n'}5. 儲存 OAuth tokens 同 provider 資訊到數據庫{'\n'}6. 實作 account linking——容許一個帳號綁定多個 OAuth provider
        </div>
      </div>
    </div>
  );
}

export default function Authentication() {
  return (
    <>
      <TopicTabs
        title="Authentication 驗證"
        subtitle="由 Basic Auth 到 JWT，理解驗證機制嘅演進"
        tabs={[
          { id: 'evolution', label: '① 驗證方式演進', content: <EvolutionTab /> },
          { id: 'jwt', label: '② JWT 詳解', content: <JWTTab /> },
          { id: 'comparison', label: '③ 實戰比較', premium: true, content: <ComparisonTab /> },
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
