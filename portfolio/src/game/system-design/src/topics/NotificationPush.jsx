import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Push Notification 入面，Device Token 嘅作用係咩？',
    options: [
      { text: '用嚟加密通知內容，確保安全', correct: false, explanation: 'Device Token 唔係用嚟加密嘅。佢嘅作用係標識一部特定嘅裝置，令 Push Service 知道將通知送去邊部手機。' },
      { text: '用嚟識別目標裝置，令 FCM/APNs 知道將通知送去邊', correct: true, explanation: '每部裝置安裝 App 之後會註冊一個唯一嘅 Device Token。你嘅 Server 儲住呢個 Token，發通知嘅時候就靠佢嚟指定目標裝置。Token 會過期，所以要定期更新。' },
      { text: '用嚟做用戶身份驗證，代替 Login', correct: false, explanation: 'Device Token 同用戶身份驗證係兩回事。一個用戶可以有多個 Device Token（多部裝置），而且 Token 係裝置級別嘅，唔係用戶級別嘅。' },
      { text: '用嚟計算推送通知嘅費用', correct: false, explanation: '費用計算同 Device Token 冇關。Token 純粹係一個裝置嘅地址標識。' },
    ],
  },
  {
    question: 'Silent Push 嘅主要用途係咩？',
    options: [
      { text: '喺用戶唔知嘅情況下彈出廣告', correct: false, explanation: 'Silent Push 唔係用嚟做廣告嘅。濫用 Silent Push 會被 Apple/Google 降低優先級甚至封殺。' },
      { text: '喺背景觸發 App 更新數據，唔彈通知俾用戶睇', correct: true, explanation: 'Silent Push 唔會顯示任何通知，但會喚醒 App 喺背景做嘢——例如同步最新數據、預載內容。iOS 同 Android 都支持，但有頻率限制，唔好濫用。' },
      { text: '發送加密嘅秘密訊息', correct: false, explanation: 'Silent Push 同加密冇關。佢嘅「silent」係指唔顯示通知，唔係加密。' },
      { text: '測試 Push 系統有冇正常運作', correct: false, explanation: '雖然可以用 Silent Push 做測試，但呢個唔係佢嘅主要用途。主要用途係背景數據同步。' },
    ],
  },
  {
    question: 'Fallback 策略「Push → SMS → Email」入面，點解 Push 應該排第一？',
    options: [
      { text: '因為 Push 最便宜，SMS 最貴', correct: false, explanation: '成本係考量之一，但唔係排序嘅核心原因。核心原因係即時性同用戶體驗。' },
      { text: '因為 Push 最即時、成本最低，但送達率唔保證，所以用 SMS/Email 做後備', correct: true, explanation: 'Push 幾乎即時送達、成本接近零，但需要用戶授權同網絡連接。如果 Push 送唔到或者用戶冇打開，先至跌落 SMS（最可靠但最貴）或 Email（成本低但可能入 spam）。呢個分層策略可以平衡成本同送達率。' },
      { text: '因為法律規定一定要先發 Push', correct: false, explanation: '冇呢條法律。Fallback 順序係基於成本效益同用戶體驗嘅設計決定。' },
      { text: '因為 Push 嘅技術最簡單', correct: false, explanation: 'Push 技術唔見得最簡單——要處理 Device Token 管理、多平台（iOS/Android）、證書更新等。排第一係因為即時性同成本優勢。' },
    ],
  },
  {
    question: 'FCM Topic Messaging 同 Device Group 有咩分別？',
    options: [
      { text: '冇分別，兩個都係群發通知', correct: false, explanation: '兩者都可以群發，但機制同適用場景完全唔同。' },
      { text: 'Topic 係 pub/sub 模式，裝置自己訂閱；Device Group 係 Server 端管理一組特定裝置', correct: true, explanation: 'Topic 用 pub/sub 模式——Client 端自己訂閱有興趣嘅 topic（例如「體育新聞」），適合大規模廣播。Device Group 由 Server 端建立同管理，適合同一個用戶嘅多部裝置同步。兩者用途唔同，唔好搞混。' },
      { text: 'Topic 只支援 Android，Device Group 支援 iOS 同 Android', correct: false, explanation: 'FCM Topic 同 Device Group 都支援 iOS 同 Android。呢個唔係佢哋嘅分別。' },
      { text: 'Device Group 可以發更多通知，Topic 有數量限制', correct: false, explanation: '兩者嘅限制唔同但唔係呢樣分嘅。Topic 嘅核心係用戶自主訂閱，Device Group 嘅核心係 Server 控制。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'notification-system', label: 'Notification System 通知系統' },
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
  { slug: 'task-queue', label: 'Task Queue 任務隊列' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>推送通知架構係咩</h2>
      <div className="subtitle">FCM / APNs / Fallback 策略——確保每個通知都送到用戶手上</div>
      <p>
        你手機每日收到嘅 App 通知——WhatsApp 新訊息、外賣送到、銀行交易提醒——全部都係由 Push Notification 系統負責。呢個系統嘅核心挑戰係：點樣喺幾秒內將通知送到全球數百萬部裝置，同時確保唔漏送、唔重複？
      </p>
      <p>
        Push Notification 同一般嘅 HTTP Request 唔同——你嘅 Server 唔會直接連接用戶嘅手機。中間一定要經過 <strong style={{ color: '#3B82F6' }}>Push Service</strong>（iOS 用 APNs，Android 用 FCM）。呢啲 Push Service 由 Apple 同 Google 運營，佢哋負責最後一程嘅送達。你嘅工作係確保 Device Token 管理正確、Payload 格式啱晒。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(20,120)">
            <rect width="130" height="75" rx="12" fill="url(#gradGreen)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">App Server</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">你嘅後端</text>
            <text x="65" y="64" textAnchor="middle" fill="#9ca3af" fontSize="9">送通知指令</text>
          </g>

          <g transform="translate(220,40)">
            <rect width="150" height="65" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="25" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">FCM</text>
            <text x="75" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Google Push Service</text>
            <text x="75" y="58" textAnchor="middle" fill="#9ca3af" fontSize="9">Android</text>
          </g>

          <g transform="translate(220,190)">
            <rect width="150" height="65" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">APNs</text>
            <text x="75" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Apple Push Service</text>
            <text x="75" y="58" textAnchor="middle" fill="#9ca3af" fontSize="9">iOS</text>
          </g>

          <g transform="translate(460,40)" filter="url(#glowBlue)">
            <rect width="130" height="65" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" />
            <text x="65" y="25" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Android</text>
            <text x="65" y="45" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Devices</text>
            <text x="65" y="58" textAnchor="middle" fill="#9ca3af" fontSize="9">用戶裝置</text>
          </g>

          <g transform="translate(460,190)">
            <rect width="130" height="65" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">iOS</text>
            <text x="65" y="45" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Devices</text>
            <text x="65" y="58" textAnchor="middle" fill="#9ca3af" fontSize="9">用戶裝置</text>
          </g>

          <g transform="translate(630,110)">
            <rect width="150" height="75" rx="12" fill="url(#gradAmber)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">Fallback</text>
            <text x="75" y="45" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">SMS / Email</text>
            <text x="75" y="64" textAnchor="middle" fill="#9ca3af" fontSize="9">送唔到就 fallback</text>
          </g>

          <path d="M152,140 C175,120 195,85 218,75" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <path d="M152,175 C175,195 195,210 218,218" stroke="#8B5CF6" strokeWidth="2" fill="none" markerEnd="url(#arrPurple)" />

          <path d="M372,72 C400,72 430,72 458,72" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrGreen)" />
          <path d="M372,222 C400,222 430,222 458,222" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrGreen)" />

          <path d="M592,80 C610,100 615,120 628,130" stroke="#fbbf24" strokeWidth="1.5" fill="none" strokeDasharray="5,3" markerEnd="url(#arrAmber)" />
          <path d="M592,215 C610,200 615,180 628,170" stroke="#fbbf24" strokeWidth="1.5" fill="none" strokeDasharray="5,3" markerEnd="url(#arrAmber)" />
          <text x="618" y="100" fill="#fbbf24" fontSize="9">失敗時</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>Device Token 註冊流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>用戶安裝 App 並授權通知權限。App 向 FCM/APNs 註冊，獲得一個唯一嘅 Device Token。呢個 Token 係送通知嘅「地址」。</span></li>
        <li><span className="step-num">2</span><span>App 將 Device Token 送去你嘅 Server 儲存。一個用戶可能有幾部裝置，所以要用 user_id → [token1, token2...] 嘅映射嚟管理。</span></li>
        <li><span className="step-num">3</span><span>當需要發通知嗰陣，Server 用 Device Token 向 FCM/APNs 發送 Payload（標題、內容、Badge 數字等）。FCM/APNs 負責最後一程送達。</span></li>
        <li><span className="step-num">4</span><span>如果 Push 送唔到（Token 過期、用戶關咗通知），系統觸發 Fallback——可以轉發 SMS 或 Email 確保重要通知唔會漏。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>深入推送機制</h2>
      <div className="subtitle">Priority、Silent Push、Topic Targeting、送達保證</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Priority Levels（優先級）</h4>
          <p>FCM 同 APNs 都支援 High Priority 同 Normal Priority。<strong style={{ color: '#f87171' }}>High Priority</strong> 會即時喚醒裝置送達（適合即時訊息）；<strong style={{ color: '#34d399' }}>Normal Priority</strong> 可能會被系統 batch 延遲送達（適合非緊急通知）。濫用 High Priority 會被 FCM 降級，所以要揀啱場景使用。</p>
        </div>
        <div className="key-point">
          <h4>Silent Push（靜默推送）</h4>
          <p>唔彈通知，但會喺背景喚醒 App 做嘢——例如同步最新數據、預載內容。iOS 嘅 <code style={{ color: '#60a5fa' }}>content-available: 1</code> 同 FCM 嘅 <code style={{ color: '#60a5fa' }}>data-only message</code> 都係 Silent Push。注意：iOS 對 Silent Push 有頻率限制，唔好短時間內發太多。</p>
        </div>
        <div className="key-point">
          <h4>Topic / Condition Targeting</h4>
          <p>FCM 支援 Topic 訂閱——用戶可以訂閱「體育」、「科技」等 Topic，Server 一次過向成個 Topic 群發通知。仲可以用 Condition 做組合邏輯，例如 <code style={{ color: '#60a5fa' }}>&apos;sports&apos; in topics && !(&apos;news&apos; in topics)</code>。呢個係大規模廣播嘅利器，唔使逐個 Token 發。</p>
        </div>
        <div className="key-point">
          <h4>Delivery Guarantees（送達保證）</h4>
          <p>Push Notification 本質上係 <strong style={{ color: '#fbbf24' }}>at-most-once</strong> 嘅——FCM/APNs 唔保證一定送到。裝置離線嘅時候，FCM 會暫存訊息（最多 4 星期），但 APNs 只保留最新一條。所以重要通知一定要配合 Fallback 機制（SMS/Email），唔好淨靠 Push。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="key-points">
        <div className="key-point">
          <h4>Fallback 策略：Push → SMS → Email</h4>
          <p>對重要通知（例如銀行交易、密碼重置），唔可以淨靠 Push。建議用呢個分層策略：先發 Push，如果 X 分鐘內用戶冇打開，觸發 SMS；再過 Y 分鐘仲係冇反應就發 Email。用 Task Queue 嘅 delayed job 嚟實現定時檢查同 Fallback 觸發。</p>
        </div>
        <div className="key-point">
          <h4>Rate Limiting Notifications</h4>
          <p>防止通知轟炸係產品體驗嘅關鍵。建議設定：同一用戶同一類型通知每 X 分鐘最多 1 條；全局每用戶每日最多 N 條非交易通知。用 Redis 做計數器，key 用 <code style={{ color: '#60a5fa' }}>notify:&#123;uid&#125;:&#123;type&#125;:&#123;date&#125;</code> 格式。</p>
        </div>
        <div className="key-point">
          <h4>User Preferences（用戶偏好）</h4>
          <p>一定要俾用戶控制通知偏好：邊啲類型想收、用咩渠道收、幾時收。將偏好儲喺 DB，發通知前查一次。記住：行銷通知法律上要支持 Unsubscribe（GDPR/CAN-SPAM），但交易通知唔可以俾用戶關閉。</p>
        </div>
        <div className="key-point">
          <h4>Token 生命週期管理</h4>
          <p>Device Token 會過期或者失效（用戶卸載 App、換手機）。FCM/APNs 會回傳 invalid token 錯誤。收到呢個錯誤就要即時將 Token 從 DB 移除，唔好再發——否則會被 Push Service 降低你成個 App 嘅送達優先級。</p>
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
        <h4>Prompt 1 — 設計推送通知系統 + Fallback 策略</h4>
        <div className="prompt-text">
          幫手設計一個推送通知系統，支援 FCM（Android）同 APNs（iOS），加 SMS/Email Fallback。{'\n\n'}
          技術要求：{'\n'}
          - Device Token 註冊同管理（包含過期清理機制）{'\n'}
          - 支援 High/Normal Priority 通知{'\n'}
          - Silent Push 做背景數據同步{'\n'}
          - Fallback 策略：Push 發送後 <span className="placeholder">[X 分鐘]</span> 冇打開就發 SMS，再過 <span className="placeholder">[Y 分鐘]</span> 發 Email{'\n'}
          - Topic Messaging 做大規模廣播{'\n'}
          - Rate Limiting：每用戶每日最多 <span className="placeholder">[N 條]</span> 非交易通知{'\n\n'}
          應用場景係 <span className="placeholder">[例如：電商 / 社交 / 金融 App]</span>，日均推送量 <span className="placeholder">[例如：500 萬條]</span>。{'\n'}
          請提供架構圖、API 設計、DB Schema、同 Fallback 邏輯嘅 Pseudocode。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 建立 Push 分析同送達追蹤系統</h4>
        <div className="prompt-text">
          幫手設計一個 Push Notification 分析系統，追蹤每個通知嘅完整生命週期。{'\n\n'}
          需要追蹤嘅狀態：{'\n'}
          - Created → Queued → Sent → Delivered → Opened → Clicked{'\n'}
          - 失敗原因分類：Token Invalid / Device Offline / Rate Limited / Service Error{'\n\n'}
          分析 Dashboard 要求：{'\n'}
          - 送達率、打開率、點擊率（按通知類型/渠道分）{'\n'}
          - Fallback 觸發率（幾多 % 嘅通知跌落 SMS/Email）{'\n'}
          - 失敗原因分佈圖{'\n'}
          - 用戶 Engagement 趨勢（按日/週/月）{'\n\n'}
          技術棧：<span className="placeholder">[例如：Node.js + Kafka + ClickHouse]</span>{'\n'}
          請提供 Event Schema、Pipeline 架構、同 Dashboard 嘅 SQL Query 範例。
        </div>
      </div>
    </div>
  );
}

export default function NotificationPush() {
  return (
    <>
      <TopicTabs
        title="推送通知架構"
        subtitle="FCM / APNs / Fallback 策略"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'advanced', label: '② 深入機制', content: <AdvancedTab /> },
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
