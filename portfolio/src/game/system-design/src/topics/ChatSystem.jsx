import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
  { slug: 'notification-system', label: 'Notification System 通知系統' },
  { slug: 'video-streaming', label: 'Video Streaming 影片串流' },
  { slug: 'session-manager', label: 'Session Manager 管理器' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>即時通訊點樣做</h2>
      <div className="subtitle">WebSocket 長連接 + Message Queue 解耦</div>
      <p>
        WhatsApp、WeChat、Telegram 呢啲 App 點樣做到一發訊息，對方即刻收到？秘密就係 <strong style={{ color: '#34d399' }}>WebSocket</strong>——一條保持開住嘅連接，唔使好似傳統 HTTP 咁每次都重新建立連接。
      </p>
      <p>
        但諗深一層：當有幾百萬用戶嘅時候，唔可能一台 Server 搞掂。所以要用 <strong style={{ color: '#fbbf24' }}>Message Queue</strong> 做中間人，將「發送」同「接收」分開處理。呢個就係解耦嘅精髓。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a3a2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradYellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a351a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          {/* User A */}
          <g transform="translate(30,60)">
            <rect width="100" height="60" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="50" y="25" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">User A</text>
            <text x="50" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">發訊息</text>
          </g>

          {/* User B */}
          <g transform="translate(30,200)">
            <rect width="100" height="60" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="50" y="25" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">User B</text>
            <text x="50" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">收訊息</text>
          </g>

          {/* WebSocket Gateway */}
          <g transform="translate(200,110)">
            <rect width="140" height="80" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="70" y="28" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">WebSocket</text>
            <text x="70" y="46" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Gateway</text>
            <text x="70" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">長連接入口</text>
          </g>

          {/* Message Queue */}
          <g transform="translate(410,60)">
            <rect width="130" height="60" rx="12" fill="url(#gradYellow)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="25" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Message Queue</text>
            <text x="65" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">消息隊列</text>
          </g>

          {/* Chat Service */}
          <g transform="translate(410,190)">
            <rect width="130" height="60" rx="12" fill="url(#gradRed)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="25" textAnchor="middle" fill="#EF4444" fontSize="13" fontWeight="700">Chat Service</text>
            <text x="65" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">聊天服務</text>
          </g>

          {/* Message DB */}
          <g transform="translate(610,120)">
            <rect width="130" height="70" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Message DB</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">消息持久化</text>
          </g>

          {/* Arrows */}
          <path d="M132,90 C165,90 165,130 198,130" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="155" y="100" fill="#a5b4fc" fontSize="10">WS conn</text>

          <path d="M132,230 C165,230 165,180 198,175" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="155" y="220" fill="#a5b4fc" fontSize="10">WS conn</text>

          <path d="M342,135 C370,120 390,105 408,95" stroke="#fbbf24" strokeWidth="2" fill="none" markerEnd="url(#arrYellow)" />
          <text x="385" y="105" fill="#fbbf24" fontSize="10">Publish</text>

          <path d="M475,122 C475,145 475,165 475,188" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrGreen)" />
          <text x="495" y="160" fill="#34d399" fontSize="10">Consume</text>

          <path d="M542,220 C570,200 590,185 608,170" stroke="#8B5CF6" strokeWidth="1.5" fill="none" markerEnd="url(#arrPurple)" />
          <text x="590" y="205" fill="#a5b4fc" fontSize="10">Persist</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>成個流程一覽</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>首先，User A 同 User B 都透過 WebSocket 同 Gateway 建立長連接。重點係，呢條連接係一直開住嘅通道，唔會斷。</span></li>
        <li><span className="step-num">2</span><span>當 User A 發一條訊息，Gateway 會將訊息放入 Message Queue。呢度用 Queue 係為咗解耦同緩衝，呢點好重要。</span></li>
        <li><span className="step-num">3</span><span>Chat Service 從 Message Queue 拿到訊息，處理之後存入 Message DB 做持久化。</span></li>
        <li><span className="step-num">4</span><span>最後透過 Gateway 將訊息推送俾 User B。注意：如果 User B 唔 online，就要存住等上線再推。呢個就係離線消息嘅概念。</span></li>
      </ol>
    </div>
  );
}

function WebSocketTab() {
  return (
    <div className="card">
      <h2>WebSocket vs HTTP Polling 比較</h2>
      <div className="subtitle">點解 Chat 系統一定要用 WebSocket？</div>
      <p><strong style={{ color: '#f87171' }}>HTTP Polling</strong>：用一個比喻嚟解釋——就好似不停打電話問「到咗未？到咗未？」Client 每隔幾秒問 Server「有冇新訊息？」超浪費資源，絕對唔建議用呢個方法。</p>
      <p><strong style={{ color: '#fbbf24' }}>Long Polling</strong>：好少少。Client 發 Request，Server hold 住唔回覆，直到有新訊息先回。但實際上仍然唔夠即時，而且 Server 要 hold 住大量連接，資源消耗好大。</p>
      <p><strong style={{ color: '#34d399' }}>WebSocket</strong>：呢個先係最推薦嘅方案。建立一條雙向通道，Server 有新訊息可以即時推送俾 Client，唔使等 Client 問。呢個先係真正嘅「即時通訊」。</p>

      <div className="use-case">
        <h4>WebSocket 升級過程</h4>
        <p>WebSocket 一開始用 HTTP 做 handshake（握手），成功之後就「升級」到 WebSocket 協議。之後雙方可以自由發送資料，唔使每次都重新建立連接。面試嘅時候主動提呢個升級機制，會好加分。</p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">設計 Chat 系統嘅關鍵考量</div>
      <div className="key-points">
        <div className="key-point">
          <h4>離線消息處理</h4>
          <p>必須考慮呢個情況：用戶唔 online 嘅時候，訊息要存住。等上線之後再推送返。建議設計一個「未讀消息」表，呢個係面試必考嘅 edge case。</p>
        </div>
        <div className="key-point">
          <h4>Group Chat Fan-out</h4>
          <p>想像一下：一個 Group 有 500 人，發一條訊息，系統要將訊息推送俾 499 個人，點做？答案係用 fan-out 策略，每個 member 嘅 inbox 都寫入一份。呢個 pattern 必須要識。</p>
        </div>
        <div className="key-point">
          <h4>消息排序</h4>
          <p>可以用 Snowflake ID 或者 timestamp 做消息排序。但要注意，喺分佈式環境下時鐘同步係一個大問題，唔同 Server 嘅時間可能有偏差。</p>
        </div>
        <div className="key-point">
          <h4>已讀回執</h4>
          <p>「已讀」功能點實現？其實就係 User B 收到訊息後發一個 ACK 返去，更新訊息狀態為 "read"。要留意，呢個功能喺 Group Chat 入面會更加複雜。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>真實規模參考</h4>
        <p>WhatsApp 用 Erlang 語言寫嘅 Server，每台 Server 可以處理 200 萬條 WebSocket 連接。2 億用戶同時在線，只需要 100 台 Server。設計 Chat 系統嘅時候，要以呢個量級作為思考基準。</p>
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
        <h4>Prompt 1 — 設計即時聊天系統</h4>
        <div className="prompt-text">
          幫手設計一個即時聊天系統，支持 <span className="placeholder">[1 對 1 私聊 / Group Chat / 兩者都要]</span>，預期同時在線用戶數係 <span className="placeholder">[1 萬 / 10 萬 / 100 萬]</span>，技術棧用 <span className="placeholder">[Node.js + Socket.io / Go + Gorilla WebSocket / Java + Spring WebSocket]</span>。{'\n\n'}要求包括：{'\n'}- WebSocket Gateway 設計：管理長連接，支持 heartbeat 保活{'\n'}- Message Queue（Kafka / Redis Pub-Sub）做消息路由同解耦{'\n'}- Chat Service 處理消息邏輯：存儲、轉發、Group fan-out{'\n'}- Message DB 設計：用 <span className="placeholder">[Cassandra / MongoDB / PostgreSQL]</span> 做消息持久化{'\n'}- 消息排序方案：Snowflake ID 或 Timestamp + Sequence{'\n'}- Group Chat fan-out 策略：write fan-out vs read fan-out{'\n'}- 提供完整嘅 WebSocket server code 同資料庫 schema
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 處理離線消息同消息可靠投遞</h4>
        <div className="prompt-text">
          設計離線消息同可靠投遞機制，場景係 <span className="placeholder">[企業通訊 App / 社交聊天 App / 客服系統]</span>，需要保證消息唔會丟失。{'\n\n'}要求包括：{'\n'}- 離線消息存儲：用戶唔 online 時，消息存入「未讀消息」表，上線後 sync{'\n'}- 消息投遞保證：at-least-once delivery，用 ACK 機制確認收到{'\n'}- 已讀回執功能：單聊同群聊嘅已讀狀態追蹤{'\n'}- 消息重複處理：Idempotency Key 防止重複顯示{'\n'}- Presence Service：追蹤用戶在線狀態（online / offline / typing）{'\n'}- Push Notification 整合：離線用戶收到 FCM / APNs 推送通知{'\n'}- 消息歷史記錄 API：分頁加載、搜尋功能{'\n'}- 提供完整嘅 code 同資料庫 schema
        </div>
      </div>
    </div>
  );
}

export default function ChatSystem() {
  return (
    <>
      <TopicTabs
        title="Chat System 即時通訊系統"
        subtitle="實時通訊系統設計，涉及 WebSocket 同 Message Queue"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'websocket', label: '② WebSocket 解說', content: <WebSocketTab /> },
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
