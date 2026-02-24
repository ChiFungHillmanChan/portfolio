import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'WebSocket 同 Server-Sent Events (SSE) 最大嘅分別係咩？',
    options: [
      { text: 'WebSocket 係全雙工（雙向通訊），SSE 係單向（Server 推送到 Client）', correct: true, explanation: 'WebSocket 建立連接後，Client 同 Server 可以隨時互相傳送數據。SSE 就只係 Server 單向推送數據到 Client，Client 想傳數據要用普通 HTTP request。' },
      { text: 'SSE 比 WebSocket 更快', correct: false, explanation: '速度上兩者差唔多，主要分別係通訊模式（雙向 vs 單向），唔係速度。' },
      { text: 'WebSocket 唔支持 HTTPS', correct: false, explanation: 'WebSocket 有 WSS（WebSocket Secure），同 HTTPS 一樣用 TLS 加密。' },
      { text: 'SSE 需要特殊嘅 Server 軟件', correct: false, explanation: 'SSE 係建立喺普通 HTTP 之上，任何支援 HTTP 嘅 server 都可以用。' },
    ],
  },
  {
    question: 'HTTP Long Polling 嘅最大缺點係咩？',
    options: [
      { text: '唔支持 JSON 格式', correct: false, explanation: 'Long Polling 係普通 HTTP request，完全支持 JSON。' },
      { text: '每次收到 response 後都要重新建立連接，浪費資源', correct: true, explanation: 'Long Polling 嘅流程係：Client 發 request → Server 等有數據先回覆 → Client 收到後即刻再發新 request。每次都要重新建 TCP 連接，HTTP header 重複傳送，非常浪費資源。' },
      { text: '只能用喺 localhost', correct: false, explanation: 'Long Polling 可以喺任何環境使用。' },
      { text: '唔支持 binary 數據', correct: false, explanation: 'HTTP response 可以傳送任何格式嘅數據。' },
    ],
  },
  {
    question: '以下邊個場景最適合用 SSE 而唔係 WebSocket？',
    options: [
      { text: '即時聊天（Chat App）', correct: false, explanation: '聊天需要雙向通訊（用戶發送同接收訊息），WebSocket 更適合。' },
      { text: '股票價格即時推送', correct: true, explanation: '股票價格只需要 Server 單向推送到 Client 就夠（Client 唔使向 Server 傳股票數據）。SSE 簡單又高效，仲支持自動 reconnect。' },
      { text: '多人線上遊戲', correct: false, explanation: '遊戲需要極低 latency 嘅雙向通訊，WebSocket 係必須嘅。' },
      { text: '文件同步編輯（類似 Google Docs）', correct: false, explanation: '協同編輯需要頻繁嘅雙向數據交換，WebSocket 更適合。' },
    ],
  },
  {
    question: 'SSE 嘅 EventSource API 有咩內建優勢？',
    options: [
      { text: '自動加密所有數據', correct: false, explanation: '加密要靠 HTTPS，唔係 EventSource 自帶嘅功能。' },
      { text: '自動 reconnect 同 last-event-id 恢復', correct: true, explanation: 'EventSource 內建自動重連機制，斷線後會自動嘗試重新連接。仲可以透過 last-event-id header 話俾 Server 知上次收到邊個 event，Server 就可以從斷點繼續推送，唔使重頭嚟。' },
      { text: '自動壓縮數據到最小', correct: false, explanation: '壓縮靠 HTTP gzip/brotli，唔係 EventSource 嘅功能。' },
      { text: '可以同時連接多個 Server', correct: false, explanation: '一個 EventSource 實例只連接一個 URL，但你可以創建多個實例。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'chat-system', label: '聊天系統設計' },
  { slug: 'notification-system', label: '通知系統設計' },
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>三種即時通訊模式比較</h2>
      <div className="subtitle">HTTP Polling vs SSE vs WebSocket——揀錯嘅話系統會好痛苦</div>
      <p>
        做即時功能（real-time feature）嘅時候，你一定會遇到一個問題：Client 點樣即時收到 Server 嘅更新？答案有三個主流方案，每個嘅複雜度同適用場景都唔同。揀錯方案會令你嘅系統又慢又複雜，所以一定要搞清楚。
      </p>
      <p>
        最簡單嘅係 <strong style={{ color: '#3B82F6' }}>HTTP Polling</strong>（Client 不停問 Server），進階啲有 <strong style={{ color: '#34d399' }}>Server-Sent Events</strong>（Server 單向推送），最強嘅係 <strong style={{ color: '#fbbf24' }}>WebSocket</strong>（全雙工雙向通訊）。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowYellow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradPoll" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSSE" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradWS" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrGray" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#9ca3af" /></marker>
          </defs>

          {/* Section Labels */}
          <text x="390" y="28" textAnchor="middle" fill="#9ca3af" fontSize="11" fontWeight="600">Client</text>
          <text x="640" y="28" textAnchor="middle" fill="#9ca3af" fontSize="11" fontWeight="600">Server</text>

          {/* HTTP Polling Section */}
          <g transform="translate(20,40)">
            <rect width="160" height="90" rx="14" fill="url(#gradPoll)" stroke="#3B82F6" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="80" y="30" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">HTTP Polling</text>
            <text x="80" y="52" textAnchor="middle" fill="#60a5fa" fontSize="10">Client 不停問 Server</text>
            <text x="80" y="70" textAnchor="middle" fill="#f87171" fontSize="9">浪費資源、延遲高</text>
            <text x="80" y="84" textAnchor="middle" fill="#9ca3af" fontSize="9">最簡單但最差</text>
          </g>
          {/* Polling arrows */}
          <path d="M340,65 L580,65" fill="none" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#arrBlue)" />
          <path d="M580,80 L340,80" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrGray)" />
          <path d="M340,95 L580,95" fill="none" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#arrBlue)" />
          <path d="M580,110 L340,110" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrGray)" />
          <text x="460" y="58" textAnchor="middle" fill="#60a5fa" fontSize="9">有冇新數據？</text>
          <text x="460" y="106" textAnchor="middle" fill="#9ca3af" fontSize="9">冇... 再問！</text>

          {/* SSE Section */}
          <g transform="translate(20,170)">
            <rect width="160" height="90" rx="14" fill="url(#gradSSE)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="80" y="28" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">SSE</text>
            <text x="80" y="48" textAnchor="middle" fill="#34d399" fontSize="10">Server → Client 推送</text>
            <text x="80" y="66" textAnchor="middle" fill="#34d399" fontSize="9">單向、自動 reconnect</text>
            <text x="80" y="82" textAnchor="middle" fill="#9ca3af" fontSize="9">簡單又高效</text>
          </g>
          {/* SSE arrows */}
          <path d="M340,195 L580,195" fill="none" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#arrBlue)" />
          <text x="460" y="190" textAnchor="middle" fill="#60a5fa" fontSize="9">建立 HTTP 長連接</text>
          <path d="M580,215 L340,215" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <path d="M580,232 L340,232" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <path d="M580,249 L340,249" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <text x="460" y="228" textAnchor="middle" fill="#34d399" fontSize="9">Event stream（持續推送）</text>

          {/* WebSocket Section */}
          <g transform="translate(20,300)">
            <rect width="160" height="90" rx="14" fill="url(#gradWS)" stroke="#F59E0B" strokeWidth="2" filter="url(#glowYellow)" />
            <text x="80" y="28" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">WebSocket</text>
            <text x="80" y="48" textAnchor="middle" fill="#fbbf24" fontSize="10">全雙工雙向通訊</text>
            <text x="80" y="66" textAnchor="middle" fill="#fbbf24" fontSize="9">低 latency、binary 支持</text>
            <text x="80" y="82" textAnchor="middle" fill="#9ca3af" fontSize="9">最強但最複雜</text>
          </g>
          {/* WebSocket arrows */}
          <path d="M340,325 L580,325" fill="none" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#arrBlue)" />
          <text x="460" y="320" textAnchor="middle" fill="#60a5fa" fontSize="9">HTTP Upgrade → WS</text>
          <path d="M340,345 L580,345" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <path d="M580,360 L340,360" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <path d="M340,375 L580,375" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <text x="460" y="358" textAnchor="middle" fill="#fbbf24" fontSize="9">雙向自由傳送</text>

          {/* Server boxes */}
          <g transform="translate(590,55)">
            <rect width="100" height="65" rx="12" fill="url(#gradPoll)" stroke="#3B82F6" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="600">HTTP</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="9">短連接</text>
          </g>
          <g transform="translate(590,185)">
            <rect width="100" height="65" rx="12" fill="url(#gradSSE)" stroke="#10B981" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600">HTTP</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="9">長連接</text>
          </g>
          <g transform="translate(590,315)">
            <rect width="100" height="65" rx="12" fill="url(#gradWS)" stroke="#F59E0B" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600">WS</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="9">持久連接</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>三種模式一句講晒</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#3B82F6' }}>HTTP Polling</strong>：Client 每隔幾秒問一次「有冇新數據？」——好似你每 5 秒打電話問外賣到咗未。簡單但浪費。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#34d399' }}>SSE（Server-Sent Events）</strong>：Client 開一條長連接，Server 有新數據就即刻推送——好似外賣到咗 app 自動通知你。高效但單向。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#fbbf24' }}>WebSocket</strong>：建立一條永久嘅雙向通道，Client 同 Server 隨時可以互傳數據——好似打電話，兩邊都可以隨時講嘢。最強但最複雜。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>Connection Lifecycle 同 Scalability</h2>
      <div className="subtitle">深入理解連接管理、重連策略、同擴展考量</div>
      <div className="key-points">
        <div className="key-point">
          <h4>WebSocket Connection Lifecycle</h4>
          <p>WebSocket 嘅生命週期：<strong style={{ color: '#fbbf24' }}>HTTP Upgrade Handshake</strong> → <strong style={{ color: '#34d399' }}>Open</strong>（可以傳數據）→ <strong style={{ color: '#f87171' }}>Close</strong>（任何一方可以關閉）。Upgrade 之後就唔再係 HTTP，而係 WS 協議。要留意：WebSocket 連接係有狀態嘅（stateful），每條連接都佔用 Server 嘅記憶體同 file descriptor。</p>
        </div>
        <div className="key-point">
          <h4>SSE Reconnection</h4>
          <p>SSE 嘅 EventSource API 有內建嘅自動重連機制。斷線後會自動嘗試重新連接，並帶上 <code style={{ color: '#60a5fa' }}>Last-Event-ID</code> header。Server 可以根據呢個 ID 從斷點繼續推送。呢個係 SSE 比 WebSocket 簡單嘅原因之一——你唔使自己寫重連邏輯。</p>
        </div>
        <div className="key-point">
          <h4>WebSocket Reconnection</h4>
          <p>WebSocket <strong style={{ color: '#f87171' }}>冇</strong>內建重連機制，你要自己寫。建議用 exponential backoff（1s → 2s → 4s → 8s...）嚟重連，避免 Server 重啟嘅時候所有 Client 同時重連（thundering herd）。常用嘅 library 如 <code style={{ color: '#60a5fa' }}>reconnecting-websocket</code> 可以幫你處理。</p>
        </div>
        <div className="key-point">
          <h4>Scalability 考量</h4>
          <p>WebSocket 同 SSE 都需要長連接，每條連接都佔用 Server 資源。1 萬條連接聽落唔多，但 10 萬條就好食記憶體。解決方案：用 <strong style={{ color: '#8B5CF6' }}>Redis Pub/Sub</strong> 做 Server 之間嘅 message broker，或者用 <strong style={{ color: '#fbbf24' }}>sticky session</strong> + <strong style={{ color: '#34d399' }}>horizontal scaling</strong>。</p>
        </div>
        <div className="key-point">
          <h4>HTTP/2 對 SSE 嘅影響</h4>
          <p>HTTP/1.1 有個限制：每個域名最多開 6 條連接。如果你有多個 SSE 連接，就會佔用呢個 quota。HTTP/2 支持 multiplexing，一條 TCP 連接可以跑多條 SSE stream，大幅提升效率。所以用 SSE 嘅話建議確保 Server 支持 HTTP/2。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>點樣揀 — 實戰決策指南</h2>
      <div className="subtitle">唔同場景用唔同嘅方案</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Chat App → WebSocket</h4>
          <p>聊天需要雙向通訊（用戶發送同接收訊息），低 latency 係必須。WebSocket 係唯一合理嘅選擇。配合 Redis Pub/Sub 做多 Server 同步。</p>
        </div>
        <div className="key-point">
          <h4>通知推送 → SSE</h4>
          <p>通知只需要 Server 推送到 Client（單向），唔使 Client 回傳數據。SSE 簡單、輕量、自帶 reconnect，唔使引入 WebSocket 嘅複雜度。</p>
        </div>
        <div className="key-point">
          <h4>Dashboard 即時更新 → SSE</h4>
          <p>Dashboard 嘅數據（股票價格、系統監控、訂單狀態）通常係 Server 單向推送。SSE 配合 HTTP/2 multiplexing 係最佳方案。</p>
        </div>
        <div className="key-point">
          <h4>多人遊戲 → WebSocket</h4>
          <p>遊戲需要極低 latency 嘅雙向通訊，仲需要 binary 數據（位置、動作）。WebSocket 支持 binary frame，配合 Protocol Buffers 可以大幅減少數據量。</p>
        </div>
        <div className="key-point">
          <h4>簡單狀態查詢 → Long Polling</h4>
          <p>如果你嘅場景好簡單（例如等一個 async 任務完成），Long Polling 都夠用。唔使引入 WebSocket/SSE 嘅複雜度。但要注意設 timeout 同 retry 邏輯。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>決策 Checklist</h4>
        <p>需要雙向通訊？→ WebSocket。只需要 Server 推送？→ SSE。更新頻率好低？→ Long Polling。需要 binary 數據？→ WebSocket。要支持舊瀏覽器？→ Long Polling（SSE 同 WebSocket 都需要現代瀏覽器）。</p>
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
        <h4>Prompt 1 — 實現即時通知系統</h4>
        <div className="prompt-text">
          用 <span className="placeholder">[Node.js / Python / Go]</span> 實現一個即時通知系統，支持 SSE 同 WebSocket 兩種模式。{'\n\n'}場景：<span className="placeholder">[例如：電商訂單狀態推送 / SaaS Dashboard 即時更新 / 社交平台通知]</span>{'\n\n'}要求：{'\n'}- SSE 實現：{'\n'}  - Server 端用 <span className="placeholder">[Express / FastAPI / Gin]</span> 嘅 streaming response{'\n'}  - Client 端用 EventSource API{'\n'}  - 支持 Last-Event-ID 斷點恢復{'\n'}  - 支持多種 event type（order_update, notification, alert）{'\n'}- WebSocket 實現：{'\n'}  - Server 端用 <span className="placeholder">[ws / socket.io / gorilla/websocket]</span>{'\n'}  - 實現 heartbeat / ping-pong 機制{'\n'}  - 自動重連（exponential backoff）{'\n'}  - 房間 / 頻道系統（唔同用戶收唔同通知）{'\n'}- 兩種方案嘅 benchmark 比較（連接數、記憶體用量、latency）{'\n\n'}請提供完整嘅 Server + Client code 同 Docker Compose 配置。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計可擴展嘅 Real-Time 架構</h4>
        <div className="prompt-text">
          設計一個支持 <span className="placeholder">[10 萬 / 100 萬]</span> 條長連接嘅 real-time 系統架構。{'\n\n'}需求：{'\n'}- 技術棧：<span className="placeholder">[Node.js / Go / Rust]</span>{'\n'}- 連接類型：<span className="placeholder">[WebSocket / SSE / 兩者都要]</span>{'\n'}- 場景：<span className="placeholder">[即時聊天 / 即時推送 / 協同編輯]</span>{'\n\n'}需要設計嘅部分：{'\n'}1. Load Balancer 配置（sticky session vs consistent hashing）{'\n'}2. 多 Server 同步方案（Redis Pub/Sub vs Kafka vs NATS）{'\n'}3. Connection Manager 設計（連接池、heartbeat、清理策略）{'\n'}4. Horizontal Scaling 策略（加 Server 唔會丟連接）{'\n'}5. Failover 方案（Server 掛咗，Client 自動重連到其他 Server）{'\n'}6. 監控指標（連接數、message throughput、latency P99）{'\n\n'}請提供架構圖、核心 code 同 Kubernetes deployment YAML。
        </div>
      </div>
    </div>
  );
}

export default function WebsocketVsSse() {
  return (
    <>
      <TopicTabs
        title="WebSocket vs SSE"
        subtitle="雙向 vs 單向 / EventSource / 點樣揀"
        tabs={[
          { id: 'overview', label: '① 三種模式', content: <OverviewTab /> },
          { id: 'advanced', label: '② 深入比較', content: <AdvancedTab /> },
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
