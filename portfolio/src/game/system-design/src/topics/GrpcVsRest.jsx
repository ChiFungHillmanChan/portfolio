import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'gRPC 用 Protocol Buffers（Protobuf）而唔係 JSON 嘅最大好處係咩？',
    options: [
      { text: 'Protobuf 比 JSON 容易閱讀', correct: false, explanation: '啱啱相反，Protobuf 係 binary 格式，人類睇唔明。JSON 先係人類可讀嘅格式。' },
      { text: 'Protobuf 係 binary 格式，序列化 / 反序列化更快，數據量更小', correct: true, explanation: 'Protobuf 嘅 binary 編碼通常比 JSON 細 3-10 倍，序列化速度快 2-10 倍。喺高吞吐量嘅微服務之間通訊，呢個差異好明顯。' },
      { text: 'Protobuf 唔需要定義 schema', correct: false, explanation: 'Protobuf 需要預先定義 .proto 檔案（schema），呢個反而係佢嘅特點之一——強類型 + contract-first。' },
      { text: 'Protobuf 支持更多程式語言', correct: false, explanation: 'JSON 幾乎所有語言都原生支持，Protobuf 反而需要額外嘅 codegen 工具。' },
    ],
  },
  {
    question: '點解 gRPC 建立喺 HTTP/2 之上而唔係 HTTP/1.1？',
    options: [
      { text: 'HTTP/2 更安全', correct: false, explanation: '安全性主要靠 TLS，HTTP/1.1 一樣可以用 HTTPS。' },
      { text: 'HTTP/2 支持 multiplexing 同 streaming，可以喺一條連接上跑多個 RPC call', correct: true, explanation: 'HTTP/2 嘅 multiplexing 令 gRPC 可以喺一條 TCP 連接上同時發送多個 request，唔使等前一個完成先發下一個。仲支持 bidirectional streaming，係 gRPC 四種通訊模式嘅基礎。' },
      { text: 'HTTP/1.1 唔支持 POST 請求', correct: false, explanation: 'HTTP/1.1 完全支持 POST，REST API 就係建立喺 HTTP/1.1 嘅 POST/GET/PUT/DELETE 之上。' },
      { text: 'HTTP/2 唔使 TCP', correct: false, explanation: 'HTTP/2 仲係建立喺 TCP 之上（HTTP/3 先係用 QUIC/UDP）。' },
    ],
  },
  {
    question: '以下邊個場景最適合用 gRPC 而唔係 REST？',
    options: [
      { text: '公開嘅第三方 API（俾外部開發者用）', correct: false, explanation: '公開 API 用 REST + JSON 更好，因為幾乎所有開發者都熟悉，瀏覽器原生支持，文檔工具（Swagger）成熟。' },
      { text: '內部微服務之間嘅高頻通訊', correct: true, explanation: '微服務之間嘅通訊要求低 latency、高吞吐量、強類型 contract。gRPC 嘅 Protobuf binary 格式、HTTP/2 multiplexing、同 codegen 都完美符合呢啲需求。' },
      { text: '簡單嘅 CRUD 網頁應用', correct: false, explanation: '簡單 CRUD 用 REST 就夠，gRPC 嘅複雜度（Protobuf 定義、codegen）唔值得。' },
      { text: '靜態網站嘅 API', correct: false, explanation: '靜態網站通常用簡單嘅 REST API 就夠，gRPC 過於複雜。' },
    ],
  },
  {
    question: 'gRPC 嘅 Bidirectional Streaming 係咩意思？',
    options: [
      { text: 'Client 同 Server 輪流發送一條訊息', correct: false, explanation: 'Bidirectional streaming 唔係輪流，而係兩邊可以獨立地隨時發送。' },
      { text: 'Client 同 Server 可以同時、獨立咁持續傳送多條訊息', correct: true, explanation: 'Bidirectional streaming 中，Client 同 Server 各自有獨立嘅 message stream，可以同時發送同接收，唔使等對方。呢個模式適合即時聊天、協同編輯等場景。' },
      { text: '一次 RPC call 傳送兩種唔同格式嘅數據', correct: false, explanation: 'Bidirectional 指嘅係通訊方向（雙向），唔係數據格式。' },
      { text: '自動將 REST request 轉換成 gRPC', correct: false, explanation: '呢個係 gRPC-Gateway 嘅功能，唔係 Bidirectional Streaming。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'api-gateway', label: 'API Gateway 網關' },
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
  { slug: 'large-api-response', label: 'Large API Response 處理' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>REST vs gRPC</h2>
      <div className="subtitle">JSON + HTTP/1.1 vs Protobuf + HTTP/2 ——兩個世界嘅通訊方式</div>
      <p>
        <strong style={{ color: '#3B82F6' }}>REST</strong> 係最常見嘅 API 風格：用 JSON 做數據格式、HTTP 動詞（GET / POST / PUT / DELETE）做操作、URL 做資源定位。簡單易用，幾乎所有 Web 開發者都識。
      </p>
      <p>
        <strong style={{ color: '#34d399' }}>gRPC</strong> 係 Google 開源嘅 RPC 框架：用 <strong style={{ color: '#fbbf24' }}>Protocol Buffers（Protobuf）</strong>做 binary 序列化、HTTP/2 做傳輸、預先定義嘅 <code style={{ color: '#60a5fa' }}>.proto</code> 檔案做 service contract。快好多，但學習曲線較高。
      </p>
      <p>
        簡單講：<strong style={{ color: '#f87171' }}>公開 API 用 REST，內部微服務用 gRPC</strong>。呢個係業界嘅共識，面試講到呢點已經好加分。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradRest" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGrpc" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradClient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradServer" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          </defs>

          {/* REST Section - Top */}
          <text x="390" y="25" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">REST（JSON / HTTP/1.1）</text>

          <g transform="translate(30,40)">
            <rect width="120" height="70" rx="14" fill="url(#gradClient)" stroke="#8b5cf6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="30" textAnchor="middle" fill="#8b5cf6" fontSize="12" fontWeight="700">Client</text>
            <text x="60" y="50" textAnchor="middle" fill="#9ca3af" fontSize="9">瀏覽器 / App</text>
          </g>

          <g transform="translate(230,40)">
            <rect width="280" height="70" rx="14" fill="url(#gradRest)" stroke="#3B82F6" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="140" y="25" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="700">GET /api/users/123</text>
            <text x="140" y="45" textAnchor="middle" fill="#60a5fa" fontSize="10">Content-Type: application/json</text>
            <text x="140" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">{"{"}"name":"Hillman","age":25{"}"}</text>
          </g>

          <g transform="translate(590,40)">
            <rect width="120" height="70" rx="14" fill="url(#gradServer)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="30" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Server</text>
            <text x="60" y="50" textAnchor="middle" fill="#9ca3af" fontSize="9">REST API</text>
          </g>

          <path d="M152,70 L228,70" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <path d="M512,80 L588,80" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />

          {/* REST characteristics */}
          <g transform="translate(30,130)">
            <rect width="220" height="45" rx="10" fill="rgba(59,130,246,0.08)" stroke="#3B82F6" strokeWidth="1" />
            <text x="110" y="20" textAnchor="middle" fill="#60a5fa" fontSize="10">JSON 文本格式（人類可讀）</text>
            <text x="110" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">~100-500 bytes per response</text>
          </g>
          <g transform="translate(270,130)">
            <rect width="220" height="45" rx="10" fill="rgba(59,130,246,0.08)" stroke="#3B82F6" strokeWidth="1" />
            <text x="110" y="20" textAnchor="middle" fill="#60a5fa" fontSize="10">HTTP/1.1 一問一答</text>
            <text x="110" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">每個 request 獨立</text>
          </g>
          <g transform="translate(510,130)">
            <rect width="220" height="45" rx="10" fill="rgba(59,130,246,0.08)" stroke="#3B82F6" strokeWidth="1" />
            <text x="110" y="20" textAnchor="middle" fill="#60a5fa" fontSize="10">簡單、通用、瀏覽器友好</text>
            <text x="110" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">Swagger / OpenAPI 文檔</text>
          </g>

          {/* Divider */}
          <line x1="30" y1="195" x2="750" y2="195" stroke="#334155" strokeWidth="1" strokeDasharray="6,4" />

          {/* gRPC Section - Bottom */}
          <text x="390" y="220" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">gRPC（Protobuf / HTTP/2）</text>

          <g transform="translate(30,235)">
            <rect width="120" height="70" rx="14" fill="url(#gradClient)" stroke="#8b5cf6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="30" textAnchor="middle" fill="#8b5cf6" fontSize="12" fontWeight="700">Service A</text>
            <text x="60" y="50" textAnchor="middle" fill="#9ca3af" fontSize="9">gRPC Client</text>
          </g>

          <g transform="translate(230,235)">
            <rect width="280" height="70" rx="14" fill="url(#gradGrpc)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="140" y="25" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="700">UserService.GetUser(id: 123)</text>
            <text x="140" y="45" textAnchor="middle" fill="#34d399" fontSize="10">Protobuf Binary Encoding</text>
            <text x="140" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">0x0A 0x07 0x48 0x69 0x6C... (binary)</text>
          </g>

          <g transform="translate(590,235)">
            <rect width="120" height="70" rx="14" fill="url(#gradServer)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="30" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Service B</text>
            <text x="60" y="50" textAnchor="middle" fill="#9ca3af" fontSize="9">gRPC Server</text>
          </g>

          <path d="M152,265 L228,265" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <path d="M512,275 L588,275" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />

          {/* gRPC characteristics */}
          <g transform="translate(30,325)">
            <rect width="220" height="45" rx="10" fill="rgba(16,185,129,0.08)" stroke="#10B981" strokeWidth="1" />
            <text x="110" y="20" textAnchor="middle" fill="#34d399" fontSize="10">Binary 格式（細 3-10x）</text>
            <text x="110" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">~10-50 bytes per response</text>
          </g>
          <g transform="translate(270,325)">
            <rect width="220" height="45" rx="10" fill="rgba(16,185,129,0.08)" stroke="#10B981" strokeWidth="1" />
            <text x="110" y="20" textAnchor="middle" fill="#34d399" fontSize="10">HTTP/2 Multiplexing + Streaming</text>
            <text x="110" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">一條連接跑多個 RPC</text>
          </g>
          <g transform="translate(510,325)">
            <rect width="220" height="45" rx="10" fill="rgba(16,185,129,0.08)" stroke="#10B981" strokeWidth="1" />
            <text x="110" y="20" textAnchor="middle" fill="#34d399" fontSize="10">強類型、自動 codegen</text>
            <text x="110" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">.proto → 多語言 SDK</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>核心分別</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#3B82F6' }}>數據格式</strong>：REST 用 JSON（文本，人類可讀），gRPC 用 Protobuf（binary，機器高效）。Protobuf 嘅數據量通常只有 JSON 嘅 1/3 到 1/10。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#34d399' }}>傳輸協議</strong>：REST 通常用 HTTP/1.1（一問一答），gRPC 用 HTTP/2（multiplexing + streaming）。HTTP/2 可以喺一條 TCP 連接上同時跑多個 RPC，效率高好多。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#fbbf24' }}>Contract</strong>：REST 靠文檔（OpenAPI/Swagger），gRPC 靠 .proto 檔案（強類型 + 自動生成 code）。.proto 係 single source of truth，唔會出現文檔同 code 唔同步嘅問題。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>Protobuf Schema 同 gRPC Streaming</h2>
      <div className="subtitle">深入理解 .proto 定義同四種通訊模式</div>
      <div className="key-points">
        <div className="key-point">
          <h4>.proto Service Definition</h4>
          <p>gRPC 嘅核心係 <code style={{ color: '#60a5fa' }}>.proto</code> 檔案。你定義 message（數據結構）同 service（方法），然後用 <code style={{ color: '#60a5fa' }}>protoc</code> 編譯器自動生成 Client 同 Server 嘅 code。支持 Go、Java、Python、Node.js 等十幾種語言。呢個就係「contract-first」開發嘅精髓。</p>
        </div>
        <div className="key-point">
          <h4>Unary RPC（最基本）</h4>
          <p>Client 發一個 request，Server 回一個 response。同 REST 一樣嘅一問一答模式。適合大部分 CRUD 操作。語法：<code style={{ color: '#60a5fa' }}>rpc GetUser(GetUserRequest) returns (User)</code>。</p>
        </div>
        <div className="key-point">
          <h4>Server Streaming</h4>
          <p>Client 發一個 request，Server 返回一連串嘅 response。適合場景：拉取大量數據（分頁替代方案）、即時訂閱更新。語法：<code style={{ color: '#60a5fa' }}>rpc ListUsers(ListRequest) returns (stream User)</code>。</p>
        </div>
        <div className="key-point">
          <h4>Client Streaming</h4>
          <p>Client 發一連串嘅 request，Server 最後回一個 response。適合場景：上傳大檔案（分段傳送）、批量操作。語法：<code style={{ color: '#60a5fa' }}>rpc UploadFile(stream Chunk) returns (UploadResponse)</code>。</p>
        </div>
        <div className="key-point">
          <h4>Bidirectional Streaming</h4>
          <p>Client 同 Server 可以同時、獨立咁持續傳送訊息。最強但最複雜。適合場景：即時聊天、協同編輯。語法：<code style={{ color: '#60a5fa' }}>rpc Chat(stream Message) returns (stream Message)</code>。兩邊嘅 stream 完全獨立，唔使等對方。</p>
        </div>
        <div className="key-point">
          <h4>Protobuf 向後兼容</h4>
          <p>Protobuf 嘅 field number 機制令 schema 可以向後兼容。新增 field 唔會 break 舊 client，刪除 field 只要唔 reuse field number 就冇問題。呢個喺微服務獨立部署嘅場景非常重要。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>點樣揀 — 實戰決策</h2>
      <div className="subtitle">REST 同 gRPC 各有用武之地</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Public API → REST</h4>
          <p>面向外部開發者嘅 API 用 REST + JSON。原因：幾乎所有開發者都識 REST、瀏覽器原生支持 JSON、Swagger/OpenAPI 文檔工具成熟、可以用 <code style={{ color: '#60a5fa' }}>curl</code> 直接測試。Stripe、GitHub、Twitter 嘅 API 都係 REST。</p>
        </div>
        <div className="key-point">
          <h4>Internal Microservices → gRPC</h4>
          <p>微服務之間嘅通訊用 gRPC。原因：Protobuf binary 格式細好多（減少 network bandwidth）、HTTP/2 multiplexing 提升吞吐量、.proto 做 contract 避免唔同 team 嘅 API 理解唔一致、codegen 減少手動寫 client code 嘅錯誤。</p>
        </div>
        <div className="key-point">
          <h4>gRPC-Web for Browsers</h4>
          <p>瀏覽器原生唔支持 gRPC（因為瀏覽器嘅 HTTP/2 實現有限制）。解決方案係用 <strong style={{ color: '#8B5CF6' }}>gRPC-Web</strong>：喺 gRPC Server 前面放一個 Envoy Proxy，將 gRPC 轉換成瀏覽器可以用嘅格式。或者用 <strong style={{ color: '#fbbf24' }}>gRPC-Gateway</strong> 將 gRPC 自動轉成 REST API。</p>
        </div>
        <div className="key-point">
          <h4>混合架構（最常見）</h4>
          <p>實際項目通常係 REST + gRPC 混合。External API 用 REST（面向前端同第三方），Internal Communication 用 gRPC（微服務之間）。API Gateway 負責將外部 REST 請求路由到內部 gRPC 服務。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>面試重點</h4>
        <p>面試講微服務通訊嘅時候，講出「external REST + internal gRPC」已經好加分。再加上 Protobuf 嘅好處（strong typing、backward compatibility、小 payload）同 HTTP/2 嘅 multiplexing，基本上穩過打靶。</p>
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
        <h4>Prompt 1 — 實現 gRPC 微服務</h4>
        <div className="prompt-text">
          用 <span className="placeholder">[Go / Node.js / Python / Java]</span> 實現一個完整嘅 gRPC 微服務。{'\n\n'}場景：<span className="placeholder">[例如：用戶管理服務 / 訂單服務 / 商品目錄服務]</span>{'\n\n'}要求：{'\n'}- 定義 .proto 檔案：{'\n'}  - Message types（Request / Response / 嵌套 message）{'\n'}  - Service definition（至少 4 個 RPC methods）{'\n'}  - 包含所有四種 RPC 模式（Unary / Server Streaming / Client Streaming / Bidirectional）{'\n'}- Server 實現：{'\n'}  - 連接 <span className="placeholder">[PostgreSQL / MongoDB]</span> 做數據持久化{'\n'}  - gRPC interceptor（類似 middleware）做 logging 同 auth{'\n'}  - 錯誤處理（用 gRPC status codes）{'\n'}- Client 實現：{'\n'}  - 自動生成嘅 client SDK{'\n'}  - Retry 同 deadline 配置{'\n'}  - Connection pooling{'\n'}- 測試：{'\n'}  - 用 grpcurl 做 CLI 測試{'\n'}  - 單元測試（mock gRPC server）{'\n\n'}請提供完整嘅 project 結構、.proto 檔案、Server/Client code 同 Makefile。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — REST + gRPC 混合架構</h4>
        <div className="prompt-text">
          設計一個 REST + gRPC 混合架構嘅微服務系統。{'\n\n'}系統架構：{'\n'}- API Gateway（REST）：面向前端同外部{'\n'}- 內部微服務（gRPC）：<span className="placeholder">[例如：User Service / Order Service / Payment Service / Notification Service]</span>{'\n'}- 技術棧：<span className="placeholder">[Go / Node.js]</span>{'\n\n'}需要實現嘅部分：{'\n'}1. API Gateway 層：{'\n'}   - REST → gRPC 轉換（用 gRPC-Gateway 或 Envoy）{'\n'}   - Request routing 規則{'\n'}   - Rate limiting 同 Auth{'\n'}2. 微服務通訊：{'\n'}   - .proto 定義（共享 proto 倉庫策略）{'\n'}   - Service Discovery（Consul / etcd）{'\n'}   - gRPC Load Balancing（client-side vs proxy-side）{'\n'}3. 觀測性：{'\n'}   - gRPC interceptor 做 distributed tracing（OpenTelemetry）{'\n'}   - Metrics 收集（Prometheus + gRPC metrics）{'\n\n'}請提供架構圖、核心 code、Docker Compose 配置同 Kubernetes manifests。
        </div>
      </div>
    </div>
  );
}

export default function GrpcVsRest() {
  return (
    <>
      <TopicTabs
        title="gRPC vs REST"
        subtitle="Protobuf / HTTP2 / 微服務通訊"
        tabs={[
          { id: 'overview', label: '① 核心比較', content: <OverviewTab /> },
          { id: 'advanced', label: '② Protobuf 同 Streaming', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 點樣揀', premium: true, content: <PracticeTab /> },
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
