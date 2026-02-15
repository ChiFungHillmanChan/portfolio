import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
  { slug: 'authentication', label: 'Authentication 驗證' },
  { slug: 'rate-limiter', label: 'Rate Limiter 限流器' },
  { slug: 'monitoring', label: '應用程式監控' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>API Gateway 係咩</h2>
      <div className="subtitle">所有 Client 請求嘅「大門」——統一入口</div>
      <p>
        想像一個超大嘅商場，入口只有一個大門。保安企喺度檢查訪客有冇會員卡、限制入場人數、然後指引去邊個店鋪喺幾樓。API Gateway 就係呢個「大門保安」——企喺所有後端服務嘅前面，統一處理所有請求。
      </p>
      <p>
        關鍵在於：冇 API Gateway 嘅話，Client 要知道每個微服務嘅地址（User Service 喺 port 3001、Order Service 喺 port 3002......）。有咗 Gateway，Client 只需要知道一個地址，其餘嘅由 Gateway 路由。呢個就係所謂嘅「關注點分離」。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradClient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGateway" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAuth" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d1515" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradUser" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradOrder" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          {/* Mobile */}
          <g transform="translate(30,80)">
            <rect width="105" height="65" rx="14" fill="url(#gradClient)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="52" y="27" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Mobile</text>
            <text x="52" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">手機 App</text>
          </g>

          {/* Web */}
          <g transform="translate(30,210)">
            <rect width="105" height="65" rx="14" fill="url(#gradClient)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="52" y="27" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Web</text>
            <text x="52" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">網頁前端</text>
          </g>

          {/* API Gateway */}
          <g transform="translate(230,105)">
            <rect width="170" height="140" rx="16" fill="url(#gradGateway)" stroke="#F59E0B" strokeWidth="2.5" filter="url(#glowAmber)" />
            <text x="85" y="30" textAnchor="middle" fill="#F59E0B" fontSize="15" fontWeight="700">API Gateway</text>
            <text x="85" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">統一入口</text>
            <line x1="20" y1="66" x2="150" y2="66" stroke="#2a2d3a" strokeWidth="1" />
            <text x="85" y="84" textAnchor="middle" fill="#fbbf24" fontSize="9.5">Auth 驗證</text>
            <text x="85" y="100" textAnchor="middle" fill="#fbbf24" fontSize="9.5">Rate Limiting</text>
            <text x="85" y="116" textAnchor="middle" fill="#fbbf24" fontSize="9.5">Routing 路由</text>
            <text x="85" y="132" textAnchor="middle" fill="#fbbf24" fontSize="9.5">Logging 日誌</text>
          </g>

          {/* Auth Service */}
          <g transform="translate(500,35)">
            <rect width="150" height="62" rx="14" fill="url(#gradAuth)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="26" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">Auth Service</text>
            <text x="75" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">認證服務</text>
          </g>

          {/* User Service */}
          <g transform="translate(500,140)">
            <rect width="150" height="62" rx="14" fill="url(#gradUser)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="26" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">User Service</text>
            <text x="75" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">用戶服務</text>
          </g>

          {/* Order Service */}
          <g transform="translate(500,245)">
            <rect width="150" height="62" rx="14" fill="url(#gradOrder)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="26" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Order Service</text>
            <text x="75" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">訂單服務</text>
          </g>

          {/* Arrows: Clients to Gateway */}
          <path d="M137,112 C175,112 190,150 228,155" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <path d="M137,242 C175,242 190,205 228,198" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />

          {/* Arrows: Gateway to Services */}
          <path d="M402,145 C440,135 460,85 498,70" fill="none" stroke="#f87171" strokeWidth="1.5" markerEnd="url(#arrRed)" />
          <text x="458" y="100" fill="#f87171" fontSize="10">Verify token</text>

          <path d="M402,175 C440,175 470,172 498,172" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <text x="450" y="165" textAnchor="middle" fill="#34d399" fontSize="10">Route</text>

          <path d="M402,210 C440,225 460,260 498,272" fill="none" stroke="#8B5CF6" strokeWidth="1.5" markerEnd="url(#arrPurple)" />
          <text x="458" y="255" fill="#a5b4fc" fontSize="10">Route</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>運作流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>Mobile App 或 Web 前端發請求到 API Gateway——呢個係系統嘅唯一入口地址。</span></li>
        <li><span className="step-num">2</span><span>Gateway 首先驗證用戶身份（叫 Auth Service 檢查 JWT token）。重點係：驗證永遠係第一步。</span></li>
        <li><span className="step-num">3</span><span>然後檢查 Rate Limiting——呢個用戶有冇超額？超咗就直接返回 429。</span></li>
        <li><span className="step-num">4</span><span>最後根據 URL path 將請求路由到對應嘅後端服務（/users 去 User Service，/orders 去 Order Service）。</span></li>
      </ol>
    </div>
  );
}

function FeaturesTab() {
  return (
    <div className="card">
      <h2>API Gateway 嘅核心功能</h2>
      <div className="subtitle">API Gateway 做嘅嘢遠唔止路由咁簡單，全部都要識</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Authentication / Authorization</h4>
          <p>最佳做法係將身份驗證統一放喺 Gateway。每個後端服務唔使自己做 JWT 驗證，Gateway 做一次就夠。驗證通過先放行，唔通過直接返回 401。</p>
        </div>
        <div className="key-point">
          <h4>Rate Limiting / Throttling</h4>
          <p>限流係必須嘅。可以按 user、IP、API endpoint 分別限流。超額就返回 429 Too Many Requests。唔加嘅話，API 俾人濫用後果好嚴重。</p>
        </div>
        <div className="key-point">
          <h4>Request Routing</h4>
          <p>根據 URL path、HTTP method、header 等條件，將請求送去唔同嘅後端服務。例如 /api/v1/users 去 User Service，/api/v1/orders 去 Order Service。</p>
        </div>
        <div className="key-point">
          <h4>Request / Response 轉換</h4>
          <p>Gateway 可以修改 request（加 header、改 body）同 response（過濾敏感欄位、合併多個服務嘅結果）。實用技巧：Mobile 同 Web 可以收到唔同格式嘅 response，各取所需。</p>
        </div>
        <div className="key-point">
          <h4>Logging / Monitoring</h4>
          <p>所有請求都經過 Gateway，可以統一記錄 access log、latency、error rate。一個地方就睇到成個系統嘅健康狀況，呢個超方便。</p>
        </div>
        <div className="key-point">
          <h4>SSL Termination</h4>
          <p>HTTPS 嘅加解密交俾 Gateway 處理，後端服務之間用 HTTP 通訊就得。建議一定咁做——減少後端 Server 嘅 CPU 負擔。</p>
        </div>
        <div className="key-point">
          <h4>Caching</h4>
          <p>對於唔常改嘅資料（例如商品列表），Gateway 可以直接 cache response，唔使每次都打後端服務。要諗清楚邊啲資料適合 cache。</p>
        </div>
        <div className="key-point">
          <h4>Circuit Breaker</h4>
          <p>如果某個後端服務掛咗，Gateway 可以快速返回錯誤（而唔係等 timeout），防止故障擴散到成個系統。呢個概念必須要識，面試好常考。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>幾個實戰要點</h2>
      <div className="subtitle">面試同實際開發都要知嘅重點</div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '16px 0 12px' }}>Single Point of Failure？</h3>
      <p>
        要特別留意呢一點：API Gateway 成為所有請求嘅唯一入口，如果 Gateway 掛咗，成個系統就冇嘢用。所以生產環境一定要部署多個 Gateway instance，前面再加一個 Load Balancer 做故障轉移。呢個係必須嘅。
      </p>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '20px 0 12px' }}>BFF 模式（Backend for Frontend）</h3>
      <p>
        呢個模式好值得了解。唔同嘅 Client（Mobile、Web、IoT）可能需要唔同格式嘅資料。BFF 模式就係為每種 Client 做一個專屬嘅 Gateway，各自 aggregate 同 transform 資料。例如 Mobile BFF 返少啲欄位（慳 bandwidth），Web BFF 返多啲（螢幕大可以顯示更多）。
      </p>

      <div className="key-points" style={{ marginTop: 20 }}>
        <div className="key-point">
          <h4>常見方案</h4>
          <p>AWS API Gateway、Kong、Nginx、Envoy、Traefik。選擇時主要考慮三樣嘢：功能需求、性能、同雲平台嘅整合程度。</p>
        </div>
        <div className="key-point">
          <h4>Latency 考量</h4>
          <p>Gateway 多做一層處理，自然會增加延遲。所以要注意：Gateway 嘅 code 要盡量輕量，重邏輯應該放喺後端服務做，唔好塞太多嘢入 Gateway。</p>
        </div>
        <div className="key-point">
          <h4>API Versioning</h4>
          <p>Gateway 可以處理 API 版本管理：/api/v1/ 同 /api/v2/ 路由去唔同嘅服務版本，做到平滑升級。呢個好實用，做多版本 API 嘅時候會好感激有呢個功能。</p>
        </div>
        <div className="key-point">
          <h4>CORS 處理</h4>
          <p>跨域問題統一喺 Gateway 處理，後端服務唔使理。Gateway 加上 Access-Control-Allow-Origin 等 header 就搞掂。唔好喺每個服務重複做呢啲設定。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>大規模系統嘅實踐</h4>
        <p>好多大型公司嘅 API Gateway 每日處理超過數百億個 API 請求。大規模 Gateway 做晒 auth、routing、rate limiting、A/B testing、canary deployment。呢個就係 API Gateway 喺大規模系統嘅真實價值——將所有橫切關注點集中喺一處管理。</p>
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
        <h4>Prompt 1 — 設計 API Gateway 架構</h4>
        <div className="prompt-text">
          幫手設計一個 API Gateway，後端有 <span className="placeholder">[3-5 個微服務，例如 User / Order / Payment / Notification]</span>，技術棧用 <span className="placeholder">[Kong / Express.js + http-proxy / Nginx / AWS API Gateway]</span>。{'\n\n'}要求包括：{'\n'}- 統一入口路由：根據 URL path 將請求轉發去對應嘅微服務{'\n'}- JWT Authentication middleware，Gateway 統一驗證 token{'\n'}- Request / Response 轉換：為 Mobile 同 Web 返回唔同格式嘅 response（BFF 模式）{'\n'}- SSL Termination 配置{'\n'}- Logging middleware 記錄所有請求嘅 latency、status code、user info{'\n'}- Circuit Breaker 機制：後端服務掛咗就快速返回錯誤{'\n'}- 提供完整嘅 code 同配置文件，語言用 <span className="placeholder">[Node.js / Go / Python]</span>
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實現 Rate Limiting 同 Auth 中間件</h4>
        <div className="prompt-text">
          喺 API Gateway 層面實現 Rate Limiting 同 Authentication 機制，場景係 <span className="placeholder">[SaaS 平台 / 開放 API / 電商系統]</span>，預期 QPS 係 <span className="placeholder">[1000 / 5000 / 10000]</span>。{'\n\n'}要求包括：{'\n'}- Rate Limiting 策略：支持按 user、IP、API endpoint 分別限流{'\n'}- 實現 Token Bucket 或 Sliding Window 算法{'\n'}- 超額時返回 429 Too Many Requests，附帶 Retry-After header{'\n'}- API Key / JWT 雙重驗證機制{'\n'}- CORS 跨域處理，統一喺 Gateway 設定{'\n'}- API Versioning 支持（/api/v1/ 同 /api/v2/ 路由去唔同版本）{'\n'}- 用 Redis 做分佈式限流計數器{'\n'}- 提供完整嘅 middleware code 同測試
        </div>
      </div>
    </div>
  );
}

export default function APIGateway() {
  return (
    <>
      <TopicTabs
        title="API Gateway 網關"
        subtitle="點樣用統一入口處理 auth、rate limiting 同 routing"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'features', label: '② 核心功能', content: <FeaturesTab /> },
          { id: 'practice', label: '③ 實戰要點', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
        ]}
      />
      <div className="topic-container">
        <QuizRenderer data={quizData} />
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
