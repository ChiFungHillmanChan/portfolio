import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '2PC（Two-Phase Commit）最大嘅問題係咩？',
    options: [
      { text: '太快，Server 跟唔上', correct: false, explanation: '2PC 唔係快嘅問題，反而係太慢。佢需要多次網絡來回，延遲唔低。' },
      { text: '如果 Coordinator 喺 Prepare 同 Commit 之間掛咗，所有 Participant 都會被 block 住', correct: true, explanation: '啱！呢個就係 2PC 嘅 Blocking Problem。Participant 已經 vote 咗 Yes，但唔知 Coordinator 嘅最終決定，只能一直等。呢個係 2PC 最致命嘅弱點。' },
      { text: '唔支持 SQL 數據庫', correct: false, explanation: '2PC 最常用喺 SQL 數據庫嘅分佈式事務入面，完全支持。' },
      { text: '只能處理兩個 Participant', correct: false, explanation: '2PC 嘅 "Two" 唔係指兩個 Participant，而係指兩個階段（Prepare 同 Commit）。可以有任意數量嘅 Participant。' },
    ],
  },
  {
    question: 'Saga Pattern 入面，Choreography 同 Orchestration 嘅分別係咩？',
    options: [
      { text: 'Choreography 用 Event 驅動，每個 Service 自己監聽同反應；Orchestration 有一個中央 Coordinator 指揮', correct: true, explanation: '啱！Choreography 係去中心化嘅，每個 Service 發 Event 通知下一步。Orchestration 有一個 Saga Orchestrator 集中管理流程。兩個各有優缺，細嘅流程用 Choreography，複雜嘅用 Orchestration。' },
      { text: '兩個完全一樣，只係名稱唔同', correct: false, explanation: '完全唔同！一個係去中心化（Event-driven），一個係中心化（有 Coordinator），架構同管理方式好唔同。' },
      { text: 'Choreography 只能用 REST，Orchestration 只能用 Message Queue', correct: false, explanation: '通訊方式唔係佢哋嘅核心分別。兩者都可以用 REST 或 Message Queue。核心分別係有冇中央 Coordinator。' },
      { text: 'Orchestration 唔支持 Compensating Transaction', correct: false, explanation: 'Orchestration 完全支持 Compensating Transaction，而且因為有中央 Coordinator，管理補償邏輯仲更加方便。' },
    ],
  },
  {
    question: '喺 Saga Pattern 入面，如果第三步失敗咗，應該點做？',
    options: [
      { text: '直接重試第三步直到成功', correct: false, explanation: '如果失敗係因為業務邏輯（例如庫存唔夠），重試幾多次都冇用。需要考慮補償。' },
      { text: '執行前兩步嘅 Compensating Transaction，撤銷已經完成嘅操作', correct: true, explanation: '啱！Saga 嘅核心就係：如果某一步失敗，用 Compensating Transaction 逐步回滾已完成嘅步驟。例如步驟 1 扣咗款，補償就係退款。步驟 2 減咗庫存，補償就係加返庫存。' },
      { text: '忽略錯誤，繼續執行第四步', correct: false, explanation: '唔可以忽略！如果第三步係關鍵步驟（例如付款），跳過會導致數據不一致。' },
      { text: '刪除整個數據庫記錄重頭來過', correct: false, explanation: '刪除記錄係好危險嘅做法。Saga 嘅設計就係用 Compensating Transaction 優雅地處理失敗，唔係暴力刪除。' },
    ],
  },
  {
    question: 'Outbox Pattern 解決咩問題？',
    options: [
      { text: '解決 Database 太慢嘅問題', correct: false, explanation: 'Outbox Pattern 唔係為咗加速，而係為咗保證數據一致性。' },
      { text: '確保 Database 更新同 Event 發送嘅原子性——要麼都做，要麼都唔做', correct: true, explanation: '啱！直接喺 DB Transaction 入面寫一條 Outbox 記錄，然後由另一個 process 讀取 Outbox 再發送 Event。咁就保證 DB 更新同 Event 發送係原子性嘅，唔會出現「DB 更新咗但 Event 冇發」嘅情況。' },
      { text: '令 Email 發送更加快速', correct: false, explanation: 'Outbox Pattern 同 Email 無直接關係，佢係解決分佈式事務中 DB 同 Message 一致性嘅問題。' },
      { text: '減少 Message Queue 嘅記憶體用量', correct: false, explanation: 'Outbox Pattern 唔係為咗省記憶體。佢額外需要一張 Outbox 表，反而會用多少少 storage。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'payment-system', label: '支付系統' },
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
  { slug: 'database-basics', label: 'Database 基礎' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>分佈式事務係咩？</h2>
      <div className="subtitle">跨多個 Service 嘅數據一致性問題</div>
      <p>
        喺單機系統，你用一個 DB Transaction 就搞掂：要麼全部成功，要麼全部回滾。但去到<strong style={{ color: '#3B82F6' }}>微服務架構</strong>，一個操作可能涉及多個 Service 同多個 Database——例如下訂單要同時<strong style={{ color: '#34d399' }}>扣款</strong>、<strong style={{ color: '#fbbf24' }}>減庫存</strong>、<strong style={{ color: '#8B5CF6' }}>建立物流單</strong>。呢三個步驟分佈喺唔同嘅 Service，點保證佢哋嘅一致性？呢個就係分佈式事務要解決嘅核心問題。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowBlue"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradCoord" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPart" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          </defs>

          {/* Coordinator */}
          <g transform="translate(270,20)" filter="url(#glowBlue)">
            <rect width="180" height="65" rx="14" fill="url(#gradCoord)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="90" y="28" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">Coordinator</text>
            <text x="90" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">事務協調者</text>
          </g>

          {/* Phase labels */}
          <text x="180" y="120" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">Phase 1: Prepare</text>
          <text x="540" y="120" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">Phase 2: Commit</text>

          {/* Participants */}
          <g transform="translate(40,180)">
            <rect width="150" height="60" rx="14" fill="url(#gradPart)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="25" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Participant 1</text>
            <text x="75" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">支付服務</text>
          </g>

          <g transform="translate(280,180)">
            <rect width="150" height="60" rx="14" fill="url(#gradPart)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="25" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Participant 2</text>
            <text x="75" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">庫存服務</text>
          </g>

          <g transform="translate(520,180)">
            <rect width="150" height="60" rx="14" fill="url(#gradPart)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="25" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Participant 3</text>
            <text x="75" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">物流服務</text>
          </g>

          {/* Prepare arrows (down) */}
          <path d="M320,87 L115,178" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrAmber)" />
          <path d="M360,87 L355,178" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrAmber)" />
          <path d="M400,87 L595,178" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrAmber)" />

          {/* Vote Yes arrows (up) */}
          <path d="M130,178 L335,87" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrGreen)" />
          <path d="M370,178 L370,87" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrGreen)" />
          <path d="M610,178 L415,87" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrGreen)" />

          {/* Labels */}
          <text x="180" y="140" fill="#fbbf24" fontSize="9">Can you commit?</text>
          <text x="430" y="140" fill="#34d399" fontSize="9">Yes, ready!</text>

          {/* Commit arrows */}
          <g transform="translate(40,275)">
            <rect width="630" height="40" rx="10" fill="rgba(52,211,153,0.08)" stroke="#34d399" strokeWidth="1" />
            <text x="315" y="16" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">全部 Vote Yes → Coordinator 發 Commit 命令</text>
            <text x="315" y="32" textAnchor="middle" fill="#f87171" fontSize="10">任何一個 Vote No → Coordinator 發 Abort 命令，全部回滾</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>2PC 運作流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#fbbf24' }}>Prepare 階段</strong>：Coordinator 問所有 Participant「你準備好 commit 未？」每個 Participant 執行本地事務但唔 commit，然後回覆 Yes 或 No。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#34d399' }}>Commit 階段</strong>：如果全部 Participant 都 Vote Yes，Coordinator 發 Commit 命令，所有 Participant 正式 commit。如果有任何一個 Vote No，就全部 Abort。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#f87171' }}>致命弱點</strong>：如果 Coordinator 喺兩個階段之間掛咗，Participant 就 block 住——佢哋唔知應該 Commit 定 Abort。呢個叫 Blocking Problem。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>3PC、Saga 同進階模式</h2>
      <div className="subtitle">真實世界嘅分佈式事務解決方案</div>
      <div className="key-points">
        <div className="key-point">
          <h4>3PC 改進</h4>
          <p>3PC 加咗一個 <strong style={{ color: '#3B82F6' }}>Pre-Commit</strong> 階段，喺 Prepare 同 Commit 之間。呢個令 Participant 知道大家都已經 Vote Yes，減少 Blocking 嘅機會。但 3PC 喺網絡分區嘅情況下仍然可能出問題，而且因為多咗一個階段，延遲更高。實際上用得比較少。</p>
        </div>
        <div className="key-point">
          <h4>Saga Choreography</h4>
          <p>每個 Service 完成自己嘅步驟後發 <strong style={{ color: '#34d399' }}>Event</strong>，下一個 Service 監聽呢個 Event 再做自己嘅步驟。好處係去中心化，冇單點故障。壞處係流程分散喺各個 Service 入面，Debug 好困難，而且服務一多就好難追蹤完整流程。</p>
        </div>
        <div className="key-point">
          <h4>Saga Orchestration</h4>
          <p>有一個中央 <strong style={{ color: '#fbbf24' }}>Saga Orchestrator</strong>，佢按順序叫每個 Service 做嘢。如果某步失敗，Orchestrator 負責觸發 Compensating Transaction。好處係流程清晰、容易 Debug。壞處係 Orchestrator 可能成為單點故障。</p>
        </div>
        <div className="key-point">
          <h4>Outbox Pattern</h4>
          <p>喺同一個 DB Transaction 入面寫業務數據同一條 Outbox 記錄。然後由 <strong style={{ color: '#8B5CF6' }}>CDC（Change Data Capture）</strong>或 Polling 讀取 Outbox 表再發送 Event。呢個保證 DB 更新同 Event 發送嘅原子性，係 Saga 嘅好搭檔。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點同面試技巧</h2>
      <div className="subtitle">分佈式事務嘅實際應用</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Compensating Transaction 設計</h4>
          <p>每個 Saga 步驟都要設計對應嘅補償操作。例如：「扣款」嘅補償係「退款」，「減庫存」嘅補償係「加返庫存」。重點係補償操作<strong style={{ color: '#f87171' }}>一定要係冪等嘅</strong>——因為補償可能被重試，唔可以退兩次款。</p>
        </div>
        <div className="key-point">
          <h4>冪等性保證</h4>
          <p>每個步驟都要帶 <strong style={{ color: '#3B82F6' }}>Idempotency Key</strong>。如果 Service 收到重複嘅 request（因為網絡重試），用 Idempotency Key 檢查係咪已經處理過。已處理就直接返回之前嘅結果，唔會重複執行。</p>
        </div>
        <div className="key-point">
          <h4>Outbox Pattern 實踐</h4>
          <p>用 <code style={{ color: '#60a5fa' }}>Debezium</code> 做 CDC 讀取 Outbox 表係最常見嘅做法。Debezium 監聽 DB 嘅 binlog / WAL，將 Outbox 記錄自動發送到 Kafka。唔使自己寫 Polling 邏輯，更加可靠。</p>
        </div>
        <div className="key-point">
          <h4>面試答題要點</h4>
          <p>面試講分佈式事務，一定要提：1）2PC 有 Blocking Problem，所以微服務通常用 Saga。2）Saga 唔保證 ACID，只保證 Eventual Consistency。3）每個步驟要冪等。4）Outbox Pattern 解決 DB + Event 嘅一致性。講到呢四點就夠晒分。</p>
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
        <h4>Prompt 1 — 實現 Saga Orchestrator</h4>
        <div className="prompt-text">
          {'用 '}
          <span className="placeholder">[Node.js / Go / Java]</span>
          {' 實現一個 Saga Orchestrator，場景係電商下單流程。\n\n步驟：\n1. 支付服務扣款\n2. 庫存服務減庫存\n3. 物流服務建立物流單\n\n要求：\n- 每個步驟有對應嘅 Compensating Transaction\n- 如果任何步驟失敗，自動觸發前面步驟嘅補償\n- 每個步驟都用 Idempotency Key 保證冪等性\n- 用 '}
          <span className="placeholder">[Redis / PostgreSQL]</span>
          {' 記錄 Saga 狀態（Pending / Completed / Compensating / Failed）\n- 實現重試邏輯（exponential backoff）\n- 包含 logging 同 error handling\n- 寫埋 unit test'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Outbox Pattern + CDC Pipeline</h4>
        <div className="prompt-text">
          {'設計一個 Outbox Pattern 嘅完整實現。\n\n場景：\n- 訂單服務用 '}
          <span className="placeholder">[PostgreSQL / MySQL]</span>
          {'\n- Event 發送到 '}
          <span className="placeholder">[Kafka / RabbitMQ]</span>
          {'\n\n要求：\n- 喺同一個 Transaction 入面寫訂單同 Outbox 記錄\n- 用 Debezium CDC 監聽 Outbox 表變更\n- 發送 Event 到 Message Queue\n- Consumer 端實現冪等消費\n- 處理 Event 順序問題\n- Docker Compose 配置（DB + Debezium + Kafka + Connect）\n- 提供完整嘅 SQL schema 同 code'}
        </div>
      </div>
    </div>
  );
}

export default function DistributedTransactions() {
  return (
    <>
      <TopicTabs
        title="分佈式事務"
        subtitle="跨服務嘅數據一致性——2PC、Saga、Outbox Pattern"
        tabs={[
          { id: 'overview', label: '① 整體概念', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階模式', content: <AdvancedTab /> },
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
