import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'RESTful API 入面，PUT 同 PATCH 嘅分別係咩？',
    options: [
      { text: '完全一樣，只係名稱唔同', correct: false, explanation: '唔一樣！PUT 同 PATCH 嘅語意完全唔同。混淆呢兩個會導致 API 設計問題。' },
      { text: 'PUT 係完整替換資源（要送成個 object），PATCH 係部分更新（只送要改嘅 field）', correct: true, explanation: '啱！PUT /users/1 要送成個 User object 做替換。PATCH /users/1 只送要改嘅 field（例如 { name: "新名" }）。PUT 係冪等嘅（發多次結果一樣），PATCH 唔一定冪等（例如 { age: "+1" }）。' },
      { text: 'PUT 用嚟建立資源，PATCH 用嚟刪除資源', correct: false, explanation: 'PUT 可以建立或替換資源，但 PATCH 係部分更新唔係刪除。DELETE 先係刪除。' },
      { text: 'PUT 只能更新一個 field，PATCH 可以更新多個', correct: false, explanation: '倒轉。PUT 要送成個完整 object（所有 field），PATCH 只送要改嘅 field（可以一個或多個）。' },
    ],
  },
  {
    question: 'API 版本控制（Versioning）最常用嘅方法係咩？',
    options: [
      { text: 'URL Path Versioning：/api/v1/users、/api/v2/users', correct: true, explanation: '啱！URL Path Versioning 係最常見同最直觀嘅方法。GitHub、Stripe、Twitter 都係咁做。好處係 URL 一睇就知道用緊邊個版本，Debug 方便。壞處係 URL 會變。其他方法有 Header Versioning 同 Query Parameter Versioning，但 URL Path 最受歡迎。' },
      { text: '每次更新都建立一個新嘅 Domain', correct: false, explanation: '建立新 Domain（例如 api-v2.example.com）成本太高，而且管理好多個 Domain 好麻煩。通常唔建議咁做。' },
      { text: '唔做版本控制，直接改', correct: false, explanation: '唔做版本控制會 break 現有嘅 Client！API 一旦發布就有 Client 依賴佢，直接改會導致 Client 壞掉。' },
      { text: '用 Database 嘅 Schema Version', correct: false, explanation: 'Database Schema Version 同 API Versioning 係唔同嘅概念。API Versioning 係面向 Client 嘅，DB Schema 係內部嘅。' },
    ],
  },
  {
    question: '好嘅 API Error Response 應該包含啲咩？',
    options: [
      { text: '只需要 HTTP Status Code（例如 400）就夠', correct: false, explanation: '只有 Status Code 對 Client 嘅幫助好有限。Client 唔知道具體出咗咩問題，唔知點修正。' },
      { text: 'HTTP Status Code + Error Code + Message + Detail（optional: documentation link）', correct: true, explanation: '啱！好嘅 Error Response 例子：{ "error": { "code": "INVALID_EMAIL", "message": "Email 格式唔正確", "details": [{ "field": "email", "issue": "缺少 @ 符號" }], "doc_url": "https://docs.example.com/errors/INVALID_EMAIL" } }。Client 可以用 error code 做 programmatic 處理，用 message 做 display。' },
      { text: '返回完整嘅 Stack Trace', correct: false, explanation: '千祈唔好！Stack Trace 包含內部實現細節，暴露出去係安全風險。Stack Trace 應該只出現喺 Server log，唔應該返回俾 Client。' },
      { text: '返回 SQL Query 令 Client 知道問題', correct: false, explanation: '返回 SQL Query 係嚴重嘅安全漏洞！暴露 DB 結構可能被攻擊者利用做 SQL Injection 或其他攻擊。' },
    ],
  },
  {
    question: 'Pagination（分頁）用 Cursor-based 比 Offset-based 好喺邊？',
    options: [
      { text: 'Cursor-based 實現更簡單', correct: false, explanation: 'Offset-based 實現更簡單（SQL 直接用 LIMIT + OFFSET）。Cursor-based 需要維護 cursor state，實現稍為複雜。' },
      { text: 'Cursor-based 唔會因為數據變動而跳過或重複項目，而且大數據量時性能更好', correct: true, explanation: '啱！Offset-based 嘅問題：如果用戶喺睇第 2 頁嘅時候有新數據插入，第 3 頁可能重複顯示第 2 頁嘅項目。而且 OFFSET 大嘅時候 DB 要 scan 大量行，性能差。Cursor-based 用最後一項嘅 ID 做起點，唔受數據變動影響，性能穩定。' },
      { text: 'Cursor-based 可以直接跳去第 N 頁', correct: false, explanation: '反而 Offset-based 先可以跳頁。Cursor-based 只能向前翻（next cursor），唔能直接跳去第 5 頁。呢個係佢嘅缺點。' },
      { text: '兩者完全一樣', correct: false, explanation: '唔一樣。Offset-based 用頁碼 / offset 做分頁，Cursor-based 用最後一項嘅 marker 做分頁。各有優缺。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'api-gateway', label: 'API Gateway 網關' },
  { slug: 'large-api-response', label: '大型 API Response 處理' },
  { slug: 'rate-limiter', label: 'Rate Limiter 限流器' },
  { slug: 'authentication', label: 'Authentication 驗證' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>API 設計最佳實踐</h2>
      <div className="subtitle">RESTful 規範 / HTTP Methods / 資源命名</div>
      <p>
        API 係前端同後端（或者服務同服務）之間嘅<strong style={{ color: '#3B82F6' }}>合約</strong>。
        好嘅 API 設計令開發者一用就明，壞嘅 API 令人想掟 Keyboard。
        <strong style={{ color: '#34d399' }}> REST（Representational State Transfer）</strong>係最常用嘅 API 風格，
        核心概念係將所有嘢當成<strong style={{ color: '#fbbf24' }}>資源（Resource）</strong>，用 URL 代表資源，用 HTTP Method 代表操作。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 310" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <linearGradient id="gradGet" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPost" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPut" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDel" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          {/* Header */}
          <text x="360" y="25" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">CRUD → HTTP Methods 映射</text>

          {/* GET */}
          <g transform="translate(30,45)">
            <rect width="155" height="110" rx="14" fill="url(#gradGet)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="78" y="28" textAnchor="middle" fill="#34d399" fontSize="16" fontWeight="700">GET</text>
            <text x="78" y="48" textAnchor="middle" fill="#6ee7b7" fontSize="10">讀取 Read</text>
            <line x1="15" y1="58" x2="140" y2="58" stroke="#34d399" strokeWidth="0.5" opacity="0.3" />
            <text x="78" y="75" textAnchor="middle" fill="#d1d5db" fontSize="9">GET /users</text>
            <text x="78" y="90" textAnchor="middle" fill="#d1d5db" fontSize="9">GET /users/123</text>
            <text x="78" y="105" textAnchor="middle" fill="#9ca3af" fontSize="8">冪等 · 安全</text>
          </g>

          {/* POST */}
          <g transform="translate(205,45)">
            <rect width="155" height="110" rx="14" fill="url(#gradPost)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="78" y="28" textAnchor="middle" fill="#3B82F6" fontSize="16" fontWeight="700">POST</text>
            <text x="78" y="48" textAnchor="middle" fill="#93c5fd" fontSize="10">建立 Create</text>
            <line x1="15" y1="58" x2="140" y2="58" stroke="#3B82F6" strokeWidth="0.5" opacity="0.3" />
            <text x="78" y="75" textAnchor="middle" fill="#d1d5db" fontSize="9">POST /users</text>
            <text x="78" y="90" textAnchor="middle" fill="#d1d5db" fontSize="9">Body: {'{ name, email }'}</text>
            <text x="78" y="105" textAnchor="middle" fill="#f87171" fontSize="8">唔冪等 · 唔安全</text>
          </g>

          {/* PUT */}
          <g transform="translate(380,45)">
            <rect width="155" height="110" rx="14" fill="url(#gradPut)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="78" y="28" textAnchor="middle" fill="#fbbf24" fontSize="16" fontWeight="700">PUT</text>
            <text x="78" y="48" textAnchor="middle" fill="#fcd34d" fontSize="10">替換 Update</text>
            <line x1="15" y1="58" x2="140" y2="58" stroke="#fbbf24" strokeWidth="0.5" opacity="0.3" />
            <text x="78" y="75" textAnchor="middle" fill="#d1d5db" fontSize="9">PUT /users/123</text>
            <text x="78" y="90" textAnchor="middle" fill="#d1d5db" fontSize="9">Body: 完整 object</text>
            <text x="78" y="105" textAnchor="middle" fill="#9ca3af" fontSize="8">冪等 · 唔安全</text>
          </g>

          {/* DELETE */}
          <g transform="translate(555,45)">
            <rect width="155" height="110" rx="14" fill="url(#gradDel)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="78" y="28" textAnchor="middle" fill="#f87171" fontSize="16" fontWeight="700">DELETE</text>
            <text x="78" y="48" textAnchor="middle" fill="#fca5a5" fontSize="10">刪除 Delete</text>
            <line x1="15" y1="58" x2="140" y2="58" stroke="#f87171" strokeWidth="0.5" opacity="0.3" />
            <text x="78" y="75" textAnchor="middle" fill="#d1d5db" fontSize="9">DELETE /users/123</text>
            <text x="78" y="90" textAnchor="middle" fill="#d1d5db" fontSize="9">（無 Body）</text>
            <text x="78" y="105" textAnchor="middle" fill="#9ca3af" fontSize="8">冪等 · 唔安全</text>
          </g>

          {/* URL Pattern */}
          <g transform="translate(30,185)">
            <rect width="660" height="105" rx="14" fill="rgba(139,92,246,0.08)" stroke="#8B5CF6" strokeWidth="1" />
            <text x="330" y="22" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">URL 命名規範</text>
            <text x="20" y="45" fill="#34d399" fontSize="10">Good:</text>
            <text x="70" y="45" fill="#d1d5db" fontSize="10">/users/123/orders — 用戶 123 嘅訂單（名詞複數，嵌套關係）</text>
            <text x="20" y="62" fill="#34d399" fontSize="10">Good:</text>
            <text x="70" y="62" fill="#d1d5db" fontSize="10">/products?category=electronics&sort=price — Query 參數做過濾同排序</text>
            <text x="20" y="82" fill="#f87171" fontSize="10">Bad:</text>
            <text x="70" y="82" fill="#d1d5db" fontSize="10">/getUser、/createOrder、/deleteProduct — 唔好用動詞！HTTP Method 已經代表操作</text>
            <text x="20" y="98" fill="#f87171" fontSize="10">Bad:</text>
            <text x="70" y="98" fill="#d1d5db" fontSize="10">/user/123（單數）、/Users/123（大寫）— 用小寫複數名詞</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>核心設計原則</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>URL 代表<strong style={{ color: '#fbbf24' }}>資源</strong>（名詞複數），HTTP Method 代表<strong style={{ color: '#3B82F6' }}>操作</strong>（動詞）。唔好喺 URL 入面放動詞。</span></li>
        <li><span className="step-num">2</span><span>用正確嘅 <strong style={{ color: '#34d399' }}>HTTP Status Code</strong>：200（成功）、201（已建立）、400（Client 錯誤）、401（未認證）、403（無權限）、404（搵唔到）、429（太多請求）、500（Server 錯誤）。</span></li>
        <li><span className="step-num">3</span><span>返回有用嘅 <strong style={{ color: '#f87171' }}>Error Response</strong>：包含 error code、message、detail。唔好只返回 Status Code。</span></li>
        <li><span className="step-num">4</span><span>大量數據要做 <strong style={{ color: '#8B5CF6' }}>Pagination</strong>。支持 filtering、sorting、field selection 等 Query 參數。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階 API 設計</h2>
      <div className="subtitle">版本控制、Pagination、HATEOAS</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Versioning 策略</h4>
          <p><strong style={{ color: '#3B82F6' }}>URL Path</strong>：<code style={{ color: '#60a5fa' }}>/api/v1/users</code>（最常用，Stripe / GitHub 用法）。<strong style={{ color: '#34d399' }}>Header</strong>：<code style={{ color: '#60a5fa' }}>Accept: application/vnd.api+json; version=1</code>（URL 唔變）。<strong style={{ color: '#fbbf24' }}>Query</strong>：<code style={{ color: '#60a5fa' }}>/api/users?version=1</code>（唔建議，容易漏）。建議用 URL Path，最直觀。</p>
        </div>
        <div className="key-point">
          <h4>Cursor-based Pagination</h4>
          <p>Request：<code style={{ color: '#60a5fa' }}>GET /posts?after=abc123&limit=20</code>。Response 包含 <code style={{ color: '#60a5fa' }}>next_cursor</code>。好處：大數據量性能穩定（唔使 OFFSET scan），數據變動唔會跳過或重複。壞處：唔能直接跳頁。適合 <strong style={{ color: '#34d399' }}>Feed / Timeline / 無限滾動</strong>嘅場景。</p>
        </div>
        <div className="key-point">
          <h4>HATEOAS</h4>
          <p>Response 入面包含相關操作嘅 Link。例如返回一個 Order 嘅時候，包含 <code style={{ color: '#60a5fa' }}>{'{ "cancel": "/orders/123/cancel", "payment": "/orders/123/pay" }'}</code>。Client 唔使硬編碼 URL，按 Link 操作就得。REST 嘅最高級別，但實際上好少人完整實現。面試知道就得。</p>
        </div>
        <div className="key-point">
          <h4>OpenAPI / Swagger</h4>
          <p>用 <strong style={{ color: '#8B5CF6' }}>OpenAPI Spec</strong>（YAML / JSON）描述你嘅 API：Endpoint、Request/Response Schema、認證方式、Error Code。好處：自動生成文檔（Swagger UI）、自動生成 Client SDK、可以用嚟做 Contract Testing。現代 API 開發嘅標配。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰同面試技巧</h2>
      <div className="subtitle">Error Handling、Rate Limit Headers、認證</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Error Response 設計</h4>
          <p>統一嘅 Error Format：<code style={{ color: '#60a5fa' }}>{'{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }'}</code>。每個 error 有唯一嘅 error code（唔好只用 HTTP Status Code）。考慮加 <code style={{ color: '#60a5fa' }}>doc_url</code> 指向文檔。Stripe 嘅 Error Response 係業界標準，值得參考。</p>
        </div>
        <div className="key-point">
          <h4>Rate Limit Headers</h4>
          <p>Response 加 <code style={{ color: '#60a5fa' }}>X-RateLimit-Limit</code>（上限）、<code style={{ color: '#60a5fa' }}>X-RateLimit-Remaining</code>（剩餘）、<code style={{ color: '#60a5fa' }}>X-RateLimit-Reset</code>（重置時間）。超限返回 429 + <code style={{ color: '#60a5fa' }}>Retry-After</code> header。呢啲 header 令 Client 可以智能管理自己嘅請求頻率。</p>
        </div>
        <div className="key-point">
          <h4>認證模式</h4>
          <p><strong style={{ color: '#3B82F6' }}>API Key</strong>：簡單，適合 Server-to-Server。<strong style={{ color: '#34d399' }}>Bearer Token（JWT）</strong>：適合前端 App。<strong style={{ color: '#fbbf24' }}>OAuth 2.0</strong>：第三方存取。所有認證都用 <code style={{ color: '#60a5fa' }}>Authorization</code> header，唔好放喺 URL Query。</p>
        </div>
        <div className="key-point">
          <h4>面試點講 API 設計</h4>
          <p>面試畫 System Design 嘅時候，API 設計要主動列出嚟。格式：「<code style={{ color: '#60a5fa' }}>POST /api/v1/orders</code> — Body: {'{ product_id, quantity }'} — Response: 201 + Order object」。講清楚 Method、URL、Body、Response，加分。</p>
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
        <h4>Prompt 1 — 設計完整嘅 RESTful API</h4>
        <div className="prompt-text">
          {'幫我設計一個 '}
          <span className="placeholder">[電商 / 社交平台 / 訂餐系統]</span>
          {' 嘅 RESTful API。\n\n要求：\n- 列出所有 Endpoints（URL + Method + Request Body + Response）\n- 用 URL Path Versioning（/api/v1/...）\n- 統一嘅 Error Response Format（code + message + details）\n- Cursor-based Pagination（帶 next_cursor + prev_cursor）\n- Rate Limit Headers（X-RateLimit-Limit / Remaining / Reset）\n- 認證用 Bearer Token（JWT）\n- 完整嘅 OpenAPI 3.0 Spec（YAML 格式）\n- 用 '}
          <span className="placeholder">[Node.js Express / Python FastAPI / Go Gin]</span>
          {' 實現\n- 包含 Swagger UI 配置\n- 寫齊 Request / Response 嘅 JSON Schema'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — API Gateway + 版本遷移方案</h4>
        <div className="prompt-text">
          {'設計一個 API 版本遷移方案，從 v1 升級到 v2。\n\n場景：\n- 現有 v1 API 有 '}
          <span className="placeholder">[100 / 1000]</span>
          {' 個 Active Client\n- v2 有 Breaking Changes（Response 結構改變、移除 deprecated fields）\n\n要求：\n- API Gateway 配置（同時支持 v1 同 v2）\n- v1 → v2 嘅 Adapter Layer（自動轉換 Request/Response）\n- Deprecation 通知策略（Response Header: Sunset / Deprecation）\n- Client Migration Guide\n- Monitoring：追蹤 v1 vs v2 嘅使用量\n- Sunset Timeline（v1 何時完全下線）\n- 用 '}
          <span className="placeholder">[Kong / AWS API Gateway / Nginx]</span>
          {' 配置\n- 提供完整嘅配置 + Adapter Code'}
        </div>
      </div>
    </div>
  );
}

export default function ApiDesign() {
  return (
    <>
      <TopicTabs
        title="API 設計最佳實踐"
        subtitle="設計令開發者鍾意用嘅 API——RESTful 規範、版本控制、錯誤處理"
        tabs={[
          { id: 'overview', label: '① 核心規範', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階設計', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰技巧', premium: true, content: <PracticeTab /> },
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
