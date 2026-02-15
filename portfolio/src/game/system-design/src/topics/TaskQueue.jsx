import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const relatedTopics = [
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
  { slug: 'notification-system', label: 'Notification System 通知系統' },
  { slug: 'cicd-pipeline', label: 'CI/CD 自動化部署' },
  { slug: 'monitoring', label: '應用程式監控' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Task Queue 係咩</h2>
      <div className="subtitle">將耗時任務放入隊列，Worker 慢慢處理，唔阻塞 API 回應</div>
      <p>
        呢個係做後端一定會遇到嘅問題。當 API 要做一啲好慢嘅嘢——例如發郵件、生成 PDF、壓縮影片——如果等做完先回覆用戶，用戶會等到頸都長。解決方案係：用 Task Queue。API 即刻回覆「收到喇」，然後偷偷哋將任務放入隊列，由背後嘅 Worker 慢慢做。
      </p>
      <p>
        用一個比喻就明：就好似餐廳落單，收銀員即刻話「好呀收到」，然後將單傳去廚房慢慢煮。唔使企喺度等廚師煮完先至離開收銀台。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>

          <g transform="translate(20,120)">
            <rect width="120" height="70" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Producer</text>
            <text x="60" y="48" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="600">(API Server)</text>
            <text x="60" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">推入任務</text>
          </g>

          <g transform="translate(210,80)" filter="url(#glowAmber)">
            <rect width="150" height="80" rx="12" fill="url(#gradAmber)" stroke="#F59E0B" strokeWidth="2" />
            <text x="75" y="28" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="700">Task Queue</text>
            <text x="75" y="48" textAnchor="middle" fill="#9ca3af" fontSize="11">SQS / Redis / RabbitMQ</text>
            <text x="75" y="68" textAnchor="middle" fill="#fbbf24" fontSize="10">任務排隊等待</text>
          </g>

          <g transform="translate(430,30)">
            <rect width="110" height="55" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="24" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Worker 1</text>
            <text x="55" y="42" textAnchor="middle" fill="#34d399" fontSize="10">處理任務</text>
          </g>
          <g transform="translate(430,120)">
            <rect width="110" height="55" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="24" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Worker 2</text>
            <text x="55" y="42" textAnchor="middle" fill="#34d399" fontSize="10">處理任務</text>
          </g>

          <g transform="translate(420,225)">
            <rect width="150" height="55" rx="12" fill="url(#gradRed)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="24" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700">Dead Letter Queue</text>
            <text x="75" y="42" textAnchor="middle" fill="#f87171" fontSize="10">失敗多次嘅任務</text>
          </g>

          <path d="M142,155 C175,150 185,138 208,130" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="172" y="135" textAnchor="middle" fill="#a5b4fc" fontSize="10">Push 任務</text>

          <path d="M362,105 C390,95 405,80 428,68" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arrGreen)" />
          <path d="M362,130 C390,135 405,140 428,145" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arrGreen)" />
          <text x="395" y="115" textAnchor="middle" fill="#34d399" fontSize="10">Pull 任務</text>

          <path d="M320,162 C330,195 380,225 418,240" stroke="#f87171" strokeWidth="1.5" strokeDasharray="5,3" fill="none" markerEnd="url(#arrRed)" />
          <text x="355" y="210" textAnchor="middle" fill="#f87171" fontSize="9">重試失敗 → DLQ</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>運作流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>API 收到請求（例如：發送歡迎郵件），應該即時回覆 202 Accepted，然後將任務 push 入 Task Queue。重點係：千祈唔好等任務做完先回覆！</span></li>
        <li><span className="step-num">2</span><span>Worker 不斷從 Queue 度 pull 任務，逐個處理。可以加多幾個 Worker 嚟並行工作，呢個就係橫向擴展嘅美妙之處。</span></li>
        <li><span className="step-num">3</span><span>如果處理失敗，系統會重試。必須記住：重試多次都失敗嘅任務要送去 Dead Letter Queue（DLQ），等人工排查，千祈唔好無限重試。</span></li>
      </ol>
    </div>
  );
}

function RetryTab() {
  return (
    <div className="card">
      <h2>重試機制</h2>
      <div className="subtitle">點樣處理失敗任務，唔會無限重試搞死系統</div>
      <p>
        殘酷嘅現實係：網絡唔穩定、下游服務暫時掛咗、資料庫鎖表……任務失敗係家常便飯。唔可以假設任務一定會成功。正確做法係用 <strong style={{ color: '#f59e0b' }}>Exponential Backoff（指數退避）</strong>：第一次失敗等 1 秒重試，第二次等 2 秒，第三次等 4 秒……越嚟越耐，畀系統喘息嘅空間。呢個係最重要嘅重試策略。
      </p>
      <div className="key-points">
        <div className="key-point">
          <h4>Exponential Backoff</h4>
          <p>重試間隔：1s → 2s → 4s → 8s → 16s。必須記住呢個模式，可以避免失敗任務瘋狂重試拖垮下游服務。</p>
        </div>
        <div className="key-point">
          <h4>Max Retries</h4>
          <p>建議設定最大重試次數（例如 5 次），超過就送去 DLQ。千祈唔好無限重試，否則隊列會積壓到爆。</p>
        </div>
        <div className="key-point">
          <h4>Jitter（隨機抖動）</h4>
          <p>進階技巧：重試時間加少少隨機數，避免大量任務同一秒重試，造成「驚群效應」（thundering herd）。</p>
        </div>
        <div className="key-point">
          <h4>Dead Letter Queue</h4>
          <p>DLQ 儲存處理唔到嘅任務。一定要定期檢查 DLQ，可能係 bug 要修，或者資料有問題要人手處理。設定 alert 好重要。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">面試同實際開發都會用到嘅重點整理</div>
      <div className="key-points">
        <div className="key-point">
          <h4>異步處理耗時任務</h4>
          <p>經驗法則：發郵件、生成報表、轉碼影片……任何超過幾秒嘅操作都應該入隊列。最佳實踐係——API 永遠即刻回覆。</p>
        </div>
        <div className="key-point">
          <h4>Retry + Exponential Backoff</h4>
          <p>再次強調：失敗要重試，但一定要用指數退避，唔好一失敗就瘋狂 retry。加埋 jitter 就更穩陣。</p>
        </div>
        <div className="key-point">
          <h4>Dead Letter Queue</h4>
          <p>重試多次都失敗嘅任務送去 DLQ。建議設 alert 監控 DLQ，要有人定期去處理呢啲「孤兒任務」，唔好放喺度唔理。</p>
        </div>
        <div className="key-point">
          <h4>Priority Queue</h4>
          <p>實用技巧：緊急任務（例如付款通知）可以設高優先級，VIP 用戶嘅任務排前面處理。呢個對用戶體驗好重要。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>常見實現方案</h4>
        <p>AWS SQS、Redis + Bull/BullMQ、RabbitMQ、Celery（Python）都係實用嘅 Task Queue 方案。仲有 delayed jobs 必須要識：例如「30 分鐘後發送提醒郵件」，可以用 Redis sorted set 或者 SQS delay 功能實現。建議初學者由 BullMQ 開始上手。</p>
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
        <h4>Prompt 1 — 建立異步任務處理系統</h4>
        <div className="prompt-text">
          {`幫手建立一個異步任務處理系統，用 [BullMQ + Redis / AWS SQS / RabbitMQ]，應用場景係 [發送電郵通知 / 生成 PDF 報表 / 影片轉碼]。

要求包括：
- Producer 端：API 收到請求後即時返回 202 Accepted，將任務 push 入 Queue
- Consumer 端：Worker 從 Queue pull 任務並處理，支持多個 Worker 並行
- 任務狀態追蹤：pending → processing → completed / failed
- 支援 Priority Queue，緊急任務優先處理
- 支援 Delayed Jobs（例如 30 分鐘後發送提醒）
- 提供完整嘅 code，語言用 [Node.js / Python / Go]`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計重試同 Dead Letter Queue 策略</h4>
        <div className="prompt-text">
          {`設計一套完整嘅任務重試同錯誤處理機制，用 [BullMQ / AWS SQS / Celery]，場景係 [支付回調處理 / 第三方 API 調用 / 資料同步]。

要求包括：
- 實現 Exponential Backoff 重試策略（1s → 2s → 4s → 8s → 16s）
- 加入 Jitter（隨機抖動）避免 Thundering Herd
- 設定 Max Retries（建議 5 次），超過就送去 Dead Letter Queue
- DLQ 監控同 Alert 機制（例如 DLQ 有新訊息就發 Slack 通知）
- 任務冪等性設計（Idempotency Key），防止重試造成重複處理
- 提供 DLQ 訊息重新處理嘅 Admin API
- 提供完整嘅 code 同配置`}
        </div>
      </div>
    </div>
  );
}

export default function TaskQueue() {
  return (
    <>
      <TopicTabs
        title="Task Queue 任務隊列系統"
        subtitle="異步任務處理同 delayed jobs 排程"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'retry', label: '② 重試機制', content: <RetryTab /> },
          { id: 'practice', label: '③ 實戰要點', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
