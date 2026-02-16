import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'task-queue', label: 'Task Queue 任務隊列' },
  { slug: 'notification-system', label: 'Notification System 通知系統' },
  { slug: 'chat-system', label: 'Chat System 即時通訊' },
  { slug: 'system-design-patterns', label: '系統設計模式總覽' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Message Queue 係咩</h2>
      <div className="subtitle">Producer 發消息，Consumer 訂閱消費，解耦系統組件</div>
      <p>
        呢個係一個好重要嘅概念。當系統有好多服務要互相溝通——Order Service 下單之後，要通知 Inventory Service 扣庫存、Payment Service 收錢、Notification Service 發通知——如果每個都直接 call 對方嘅 API，結果會點？會變成蜘蛛網，改一個牽動全身。呢個係初學者最常犯嘅錯誤。
      </p>
      <p>
        建議用 Message Queue（例如 Kafka）嚟解決呢個問題。做法好簡單：Order Service 發一條「訂單已建立」嘅消息去 Kafka，其他服務訂閱呢個 topic，自己 pull 消息嚟處理。呢個就係<strong style={{ color: '#34d399' }}>解耦</strong>！重點係：加新服務只係加多個 consumer，完全唔使改 Order Service。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8b5cf6" /></marker>
          </defs>

          {/* Producer 1 */}
          <g transform="translate(20,50)">
            <rect width="110" height="50" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="22" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Producer 1</text>
            <text x="55" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">發消息</text>
          </g>
          {/* Producer 2 */}
          <g transform="translate(20,130)">
            <rect width="110" height="50" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="22" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Producer 2</text>
            <text x="55" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">發消息</text>
          </g>

          {/* Kafka Broker (with glow) */}
          <g transform="translate(190,55)" filter="url(#glowGreen)">
            <rect width="210" height="130" rx="14" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" />
            <text x="105" y="28" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">Kafka Broker</text>
            <rect x="20" y="45" width="52" height="38" rx="8" fill="#13151c" stroke="#34d399" strokeWidth="1" />
            <text x="46" y="66" textAnchor="middle" fill="#34d399" fontSize="10">Partition</text>
            <text x="46" y="80" textAnchor="middle" fill="#9ca3af" fontSize="9">0</text>
            <rect x="80" y="45" width="52" height="38" rx="8" fill="#13151c" stroke="#34d399" strokeWidth="1" />
            <text x="106" y="66" textAnchor="middle" fill="#34d399" fontSize="10">Partition</text>
            <text x="106" y="80" textAnchor="middle" fill="#9ca3af" fontSize="9">1</text>
            <rect x="140" y="45" width="52" height="38" rx="8" fill="#13151c" stroke="#34d399" strokeWidth="1" />
            <text x="166" y="66" textAnchor="middle" fill="#34d399" fontSize="10">Partition</text>
            <text x="166" y="80" textAnchor="middle" fill="#9ca3af" fontSize="9">2</text>
            <text x="105" y="110" textAnchor="middle" fill="#9ca3af" fontSize="10">Partitions 水平擴展</text>
          </g>

          {/* ZooKeeper */}
          <g transform="translate(220,225)">
            <rect width="110" height="48" rx="12" fill="url(#gradPurple)" stroke="#8b5cf6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="22" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="700">ZooKeeper</text>
            <text x="55" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">協調 / 元數據</text>
          </g>

          {/* Consumer Group A */}
          <g transform="translate(470,30)">
            <rect width="130" height="60" rx="12" fill="url(#gradAmber)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="24" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Consumer Group A</text>
            <text x="65" y="44" textAnchor="middle" fill="#9ca3af" fontSize="10">訂閱 Topic</text>
          </g>

          {/* Consumer Group B */}
          <g transform="translate(470,120)">
            <rect width="130" height="60" rx="12" fill="url(#gradAmber)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="24" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Consumer Group B</text>
            <text x="65" y="44" textAnchor="middle" fill="#9ca3af" fontSize="10">訂閱 Topic</text>
          </g>

          {/* Arrows: Producers to Kafka (curved) */}
          <path d="M132,75 C158,75 165,100 188,100" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <path d="M132,155 C158,155 165,140 188,135" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="158" y="115" textAnchor="middle" fill="#a5b4fc" fontSize="10">Publish</text>

          {/* Arrows: Kafka to Consumers (curved) */}
          <path d="M402,90 C430,80 445,70 468,65" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arrGreen)" />
          <path d="M402,140 C430,145 445,148 468,150" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arrGreen)" />
          <text x="435" y="105" textAnchor="middle" fill="#34d399" fontSize="10">Consume</text>

          {/* Arrow: Kafka to ZooKeeper (dashed curved) */}
          <path d="M295,188 C295,200 285,215 280,223" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4,3" fill="none" markerEnd="url(#arrPurple)" />
          <text x="310" y="210" textAnchor="middle" fill="#8b5cf6" fontSize="9">元數據</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>運作流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>Producer 發消息去 Kafka 嘅 Topic。重點係，每個 Topic 會分拆成多個 Partition，呢個就係水平擴展嘅關鍵。</span></li>
        <li><span className="step-num">2</span><span>Consumer Group 訂閱 Topic，必須記住：每個 Partition 只會被 Group 入面一個 Consumer 處理。所以加多幾台 Consumer 就可以並行消費。</span></li>
        <li><span className="step-num">3</span><span>ZooKeeper（或者 Kafka 新版嘅 KRaft）負責儲存 broker、partition、consumer group 嘅元數據。建議了解埋 KRaft，因為新版 Kafka 已經開始淘汰 ZooKeeper。</span></li>
      </ol>
    </div>
  );
}

function SemanticsTab() {
  return (
    <div className="card">
      <h2>消息語義</h2>
      <div className="subtitle">At-most-once、At-least-once、Exactly-once</div>
      <p>
        有一點必須講清楚：消息可能會重複、可能會丟失。做系統設計嗰陣，一定要根據業務場景揀啱嘅語義。以下拆解三種：<strong style={{ color: '#f87171' }}>At-most-once</strong>（最多一次，可能丟）、<strong style={{ color: '#f59e0b' }}>At-least-once</strong>（最少一次，可能重複）、<strong style={{ color: '#34d399' }}>Exactly-once</strong>（恰好一次，最難實現）。
      </p>
      <p>
        舉個例子就明：收錢嘅場景，一定想要 Exactly-once，但實現起嚟好複雜。所以有一個實戰技巧——用 At-least-once 加上冪等性（idempotent）。即係話，就算重複收到同一消息，都唔會重複扣錢。呢個做法係業界最常見嘅。
      </p>
      <div className="key-points">
        <div className="key-point">
          <h4>Topic + Partition</h4>
          <p>Topic 係邏輯分類（例如 order-events）。Partition 係物理分片，重點係：加 Partition 可以增加並行度，呢個就係水平擴展嘅核心。</p>
        </div>
        <div className="key-point">
          <h4>Consumer Group</h4>
          <p>呢個概念好重要：同一 Group 嘅 Consumer 瓜分 Partition，每條消息只會被一個 Consumer 處理。但唔同 Group 可以各自消費同一 Topic，呢個就係 pub/sub 嘅精髓。</p>
        </div>
        <div className="key-point">
          <h4>At-least / Exactly-once</h4>
          <p>At-least-once：consumer commit offset 喺處理之後，所以可能重複。Exactly-once：Kafka 0.11+ 支援事務，但需要配合冪等 producer 先至做到。</p>
        </div>
        <div className="key-point">
          <h4>Event Sourcing + CQRS</h4>
          <p>呢個係進階模式：將「事件」當做 source of truth，寫入 Kafka。CQRS 就係讀寫分離——寫入 event store，讀取用 materialized view。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">設計 Message Queue 系統嘅關鍵整理</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Topic + Partition 擴展</h4>
          <p>注意：Partition 數量決定並行度。太多 partition 會增加 overhead，太少會成為瓶頸。建議按吞吐量嚟估算。</p>
        </div>
        <div className="key-point">
          <h4>Consumer Group</h4>
          <p>每個 Group 獨立消費，呢個好適合「一個事件要觸發多個下游」嘅場景。例如 Notification Service 同 Analytics Service 各自一個 Group，互不影響。</p>
        </div>
        <div className="key-point">
          <h4>消息語義</h4>
          <p>重點規則：金融場景一定要 Exactly-once 或冪等。日誌、metrics 用 At-least-once 就夠，重複唔緊要。</p>
        </div>
        <div className="key-point">
          <h4>Event Sourcing</h4>
          <p>建議用事件流做 audit trail、replay、debugging。配合 CQRS 讀寫分離，查詢可以用專用嘅讀模型，效能會好好多。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>Kafka vs RabbitMQ — 點樣揀</h4>
        <p>呢個係常見問題，直接講：Kafka 適合高吞吐、持久化、event streaming 同日誌聚合；RabbitMQ 適合傳統 MQ、routing 靈活嘅場景，例如 task queue。揀邊個要睇場景——高吞吐 event 就用 Kafka，複雜 routing 就用 RabbitMQ。</p>
      </div>
    </div>
  );
}

function AiViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻開始 Build</div>

      <div className="prompt-card">
        <h4>Prompt 1 — 設計異步消息架構</h4>
        <div className="prompt-text">{'幫手設計一個基於 Message Queue 嘅異步消息架構，場景係 '}<span className="placeholder">[業務場景，例如：電商訂單處理、即時通知系統、數據管道]</span>{'。\n\n技術棧：'}<span className="placeholder">[後端技術棧，例如：Java Spring Boot / Node.js / Go]</span>{'\n預計消息量：'}<span className="placeholder">[每秒消息數，例如：50,000 msg/s]</span>{'\n消息語義要求：'}<span className="placeholder">[At-least-once / Exactly-once]</span>{'\n\n要求：\n1. 畫出完整嘅架構圖，標明 Producer、Broker、Consumer 嘅角色\n2. 設計 Topic 同 Partition 嘅劃分策略，解釋分幾多個 Partition\n3. Consumer Group 嘅設計——邊啲服務共用一個 Group，邊啲獨立消費\n4. 處理消息失敗嘅 Dead Letter Queue（DLQ）機制\n5. 保證消息唔會重複處理嘅冪等性方案\n6. 提供 Producer 同 Consumer 嘅代碼範例'}</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Kafka vs RabbitMQ vs SQS 選型</h4>
        <div className="prompt-text">{'根據以下需求，分析應該用 Kafka、RabbitMQ 定 AWS SQS：\n\n業務場景：'}<span className="placeholder">[描述場景，例如：微服務間通訊、Event Sourcing、任務排程]</span>{'\n關鍵需求：'}<span className="placeholder">[列出關鍵需求，例如：消息順序性、持久化、replay 能力]</span>{'\n團隊規模：'}<span className="placeholder">[團隊大小同運維能力]</span>{'\n部署環境：'}<span className="placeholder">[雲端 / 自建 / 混合]</span>{'\n\n要求：\n1. 對比三者嘅架構差異（push vs pull、broker 模式、存儲機制）\n2. 分析 throughput、latency、message ordering 嘅差異\n3. 運維複雜度同成本對比\n4. 針對呢個場景嘅最佳選擇同理由\n5. 提供選定方案嘅部署架構圖同配置建議\n6. 設計 monitoring 同 alerting 策略'}</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 實作 Event-Driven 微服務</h4>
        <div className="prompt-text">{'用 '}<span className="placeholder">[技術棧，例如：Node.js + Kafka / Java + RabbitMQ]</span>{' 實作一個 Event-Driven 微服務系統：\n\n場景：'}<span className="placeholder">[具體場景，例如：用戶註冊後觸發歡迎郵件、建立預設設定、記錄 analytics]</span>{'\n\n要求：\n1. 設計 Event Schema（包括 event type、payload、metadata、timestamp）\n2. 實作 Producer Service，發佈事件到 Message Queue\n3. 實作至少 2 個 Consumer Service，各自處理同一事件\n4. 實現 retry 機制同 Dead Letter Queue 處理失敗消息\n5. 加入冪等性保障（用 event ID 做 dedup）\n6. 寫 Docker Compose 配置，一鍵啟動成個系統'}</div>
      </div>
    </div>
  );
}

const tabs = [
  { key: 'overview', label: '① 整體架構', content: <OverviewTab /> },
  { key: 'semantics', label: '② 消息語義', content: <SemanticsTab /> },
  { key: 'practice', label: '③ 實戰要點', content: <PracticeTab />, premium: true },
  { key: 'ai-viber', label: '④ AI Viber', content: <AiViberTab />, premium: true },
];

export default function MessageQueue() {
  return (
    <>
      <TopicTabs
        title="Message Queue 分佈式消息隊列"
        subtitle="事件驅動架構（Kafka），pub/sub 模式"
        tabs={tabs}
      />
      <QuizRenderer data={quizData} />
      <RelatedTopics topics={relatedTopics} />
    </>
  );
}
