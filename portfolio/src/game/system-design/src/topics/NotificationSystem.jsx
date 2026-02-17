import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '設計通知系統嘅時候，點解每個通知渠道（Push / SMS / Email）應該有獨立嘅 Worker？',
    options: [
      { text: '因為唔同渠道嘅 code 太長，放一齊會好亂', correct: false, explanation: 'Code 組織係一個原因，但唔係架構上要分開嘅核心理由。真正嘅原因係同擴展性同容錯有關。' },
      { text: '因為每個渠道可以獨立擴展同獨立容錯，一個掛唔影響其他', correct: true, explanation: '呢個就係核心原因。例如 SMS 供應商暫時故障，只有 SMS Worker 受影響，Push 同 Email 繼續正常運作。而且每個渠道嘅流量唔同，可以各自按需 scale。' },
      { text: '因為第三方 API 限制，唔可以同時調用多個渠道', correct: false, explanation: '第三方 API 冇呢種限制。分開 Worker 嘅原因係為咗系統嘅可擴展性同容錯能力，唔係外部 API 嘅限制。' },
      { text: '因為一個 Worker 只能處理一種數據格式', correct: false, explanation: 'Worker 技術上可以處理多種格式，但將每個渠道分開係更好嘅架構設計。呢個係 Single Responsibility Principle 嘅體現。' },
    ],
  },
  {
    question: '用戶 5 分鐘內收到 20 條行銷通知，咩設計可以防止呢種情況？',
    options: [
      { text: '喺前端做過濾，超過 5 條就唔顯示', correct: false, explanation: '前端過濾唔係根本解決方案。通知已經發出去，SMS 同 Email 都收到晒，用戶一樣會被轟炸。Rate Limiting 一定要喺後端做。' },
      { text: '喺 Notification Service 加入 Rate Limiting，限制每個用戶每小時嘅通知數量', correct: true, explanation: '呢個係正確做法。喺後端設定同一用戶每小時最多 X 個通知，超過就靜默丟棄或者排隊延後發送。呢個可以有效防止通知轟炸，保護用戶體驗。' },
      { text: '減少 Worker 數量，通知發慢啲就唔會太多', correct: false, explanation: '減少 Worker 會拖慢所有用戶嘅通知，包括重要嘅交易通知。問題唔係發送速度，而係同一用戶收太多通知。' },
      { text: '將所有通知合併成一封每日摘要 Email', correct: false, explanation: '每日摘要適合低優先級通知，但交易通知（例如付款確認）需要即時送達。正確做法係用 Rate Limiting 控制頻率，唔係一刀切合併。' },
    ],
  },
  {
    question: '設計一個重要通知嘅 Fallback 策略：先發 Push Notification，5 分鐘內用戶冇打開就發 SMS。呢個策略嘅關鍵技術挑戰係咩？',
    options: [
      { text: '5 分鐘嘅 delay 太長，用戶體驗唔好', correct: false, explanation: '5 分鐘係可以調整嘅參數，唔係技術挑戰。真正嘅挑戰係系統點樣知道用戶有冇打開 Push Notification。' },
      { text: '需要追蹤 Push 嘅送達同打開狀態，再設定定時觸發 SMS 嘅機制', correct: true, explanation: '呢個係核心挑戰。系統需要：1) 透過 APNs/FCM 嘅 delivery receipt 確認送達；2) 前端回報「已打開」狀態；3) 用 delayed job 喺 5 分鐘後檢查狀態，未打開就觸發 SMS。呢幾步缺一不可。' },
      { text: 'SMS 成本太高，唔應該做 Fallback', correct: false, explanation: '成本雖然係考量因素，但對於重要通知（例如銀行交易提醒）嚟講，確保送達比成本更重要。呢個係產品決策，唔係技術挑戰。' },
      { text: '只需要設定一個 5 分鐘嘅 setTimeout 就搞掂', correct: false, explanation: 'setTimeout 喺單台 Server 上面可以用，但喺分佈式系統入面 Server 可能會重啟。需要用持久化嘅 delayed job（例如 Task Queue）先至可靠。' },
    ],
  },
  {
    question: '通知系統嘅 Template 功能有咩好處？',
    options: [
      { text: '可以令通知顯示更加靚', correct: false, explanation: '外觀只係好處之一。Template 嘅核心價值唔係外觀，而係將通知內容管理同工程 code 解耦。' },
      { text: '可以減少 Server 嘅記憶體使用', correct: false, explanation: 'Template 系統唔會明顯減少記憶體使用。佢嘅價值係喺開發效率同內容管理方面。' },
      { text: 'PM 可以自己改通知文案，唔使工程師改 code 再部署', correct: true, explanation: '呢個就係 Template 系統最大嘅價值。將通知內容（文案、多語言）同發送邏輯分開，PM 透過管理後台就可以修改、A/B test 通知文案，完全唔使動 code，大幅提升迭代速度。' },
      { text: '可以自動將通知翻譯成所有語言', correct: false, explanation: 'Template 系統需要人手為每種語言寫好 Template，唔會自動翻譯。但佢提供咗一個結構化嘅方式嚟管理多語言版本。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
  { slug: 'task-queue', label: 'Task Queue 任務隊列' },
  { slug: 'chat-system', label: 'Chat System 即時通訊' },
  { slug: 'system-design-patterns', label: '系統設計模式總覽' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>通知系統係咩</h2>
      <div className="subtitle">負責喺啱嘅時間，用啱嘅渠道，送通知俾啱嘅人</div>
      <p>
        呢個係每個用戶每日都接觸到嘅系統。手機收到嘅 push notification、email、SMS，背後全部都係由通知系統處理。呢個系統嘅核心挑戰係：點樣確保每個通知都準時送到、唔重複、唔漏送？以下逐步拆解。
      </p>
      <p>核心設計理念係：用 <strong style={{ color: '#fbbf24' }}>Message Queue</strong> 做中間緩衝，確保通知可靠投遞。重點原則——就算某個渠道（例如 SMS）暫時故障，訊息唔會丟失，等回復之後繼續送。呢個就係 reliability 嘅精髓。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPink" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#EF4444" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
            <marker id="arrPink" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#EC4899" /></marker>
          </defs>

          <g transform="translate(30,120)">
            <rect width="120" height="70" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Event</text>
            <text x="60" y="46" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Trigger</text>
            <text x="60" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">觸發事件</text>
          </g>

          <g transform="translate(210,110)" filter="url(#glowGreen)">
            <rect width="150" height="80" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" />
            <text x="75" y="28" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Notification</text>
            <text x="75" y="46" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Service</text>
            <text x="75" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">通知服務</text>
          </g>

          <g transform="translate(420,120)">
            <rect width="130" height="70" rx="12" fill="url(#gradAmber)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Message</text>
            <text x="65" y="46" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Queue</text>
          </g>

          <g transform="translate(620,30)">
            <rect width="140" height="55" rx="12" fill="url(#gradRed)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="22" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">Push</text>
            <text x="70" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">APNs / FCM</text>
          </g>

          <g transform="translate(620,120)">
            <rect width="140" height="55" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="22" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">SMS</text>
            <text x="70" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">Twilio</text>
          </g>

          <g transform="translate(620,210)">
            <rect width="140" height="55" rx="12" fill="url(#gradPink)" stroke="#EC4899" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="22" textAnchor="middle" fill="#EC4899" fontSize="12" fontWeight="700">Email</text>
            <text x="70" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">SES / SendGrid</text>
          </g>

          <path d="M152,155 C178,152 188,150 208,150" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="180" y="143" textAnchor="middle" fill="#a5b4fc" fontSize="10">Event</text>

          <path d="M362,150 C385,152 400,153 418,155" stroke="#fbbf24" strokeWidth="2" fill="none" markerEnd="url(#arrYellow)" />
          <text x="390" y="143" textAnchor="middle" fill="#fbbf24" fontSize="10">Enqueue</text>

          <path d="M552,138 C575,120 595,85 618,65" stroke="#EF4444" strokeWidth="1.5" fill="none" markerEnd="url(#arrRed)" />
          <path d="M552,155 C575,152 595,150 618,148" stroke="#8B5CF6" strokeWidth="1.5" fill="none" markerEnd="url(#arrPurple)" />
          <path d="M552,172 C575,190 595,215 618,232" stroke="#EC4899" strokeWidth="1.5" fill="none" markerEnd="url(#arrPink)" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>運作流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>某個事件觸發通知（例如有人 like 某個 post、訂單發貨、驗證碼）。必須設計好 event trigger，確保每個需要通知嘅場景都有對應嘅事件。</span></li>
        <li><span className="step-num">2</span><span>Notification Service 決定用邊個渠道發送（Push / SMS / Email），然後放入 Message Queue。建議將渠道選擇邏輯同發送邏輯分開，呢個係好嘅架構設計。</span></li>
        <li><span className="step-num">3</span><span>唔同嘅 Worker 從 Queue 攞訊息，透過對應嘅渠道發送出去。重點係：每個渠道應該有獨立嘅 Worker，方便獨立擴展。</span></li>
      </ol>
    </div>
  );
}

function ChannelsTab() {
  return (
    <div className="card">
      <h2>三大通知渠道拆解</h2>
      <div className="key-points">
        <div className="key-point">
          <h4>Push Notification</h4>
          <p>透過 Apple APNs 或 Google FCM 發送。重點係：需要用戶嘅 device token。呢個渠道最即時，但需要用戶授權先至用得。建議做好 token 管理，過期嘅 token 要及時清理。</p>
        </div>
        <div className="key-point">
          <h4>SMS 短訊</h4>
          <p>透過 Twilio 等服務發送。必須清楚：SMS 最可靠（唔使網絡），但係最貴。所以建議只用喺驗證碼同緊急通知，唔好亂用。</p>
        </div>
        <div className="key-point">
          <h4>Email</h4>
          <p>透過 AWS SES 或 SendGrid 發送。成本最低，但要注意到達率受 spam filter 影響。建議做好 SPF、DKIM、DMARC 設定，確保郵件唔會入 spam。</p>
        </div>
        <div className="key-point">
          <h4>多渠道 Fallback 策略</h4>
          <p>實用技巧：同一個通知可以用多個渠道。先發 Push，如果用戶 5 分鐘冇睇，再發 SMS。呢個叫 fallback 策略，對重要通知好有用。</p>
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
          <h4>Rate Limiting</h4>
          <p>呢個係好容易忽略嘅問題：防止通知轟炸。必須設定同一個用戶每小時最多收到 X 個通知。常見嘅錯誤係因為系統 bug 狂發通知搞到用戶投訴，千祈唔好犯。</p>
        </div>
        <div className="key-point">
          <h4>用戶偏好設定</h4>
          <p>呢個功能一定要做：用戶要可以設定邊啲通知想收、用咩渠道收。例如行銷 email 可以 unsubscribe，但交易通知一定要送。呢個係合規要求。</p>
        </div>
        <div className="key-point">
          <h4>重試機制</h4>
          <p>如果發送失敗（例如 APNs 暫時不可用），應該放回 Queue 遲啲再試。重點係：用 exponential backoff 避免打爆第三方 API，呢個同 Task Queue 嘅重試邏輯一樣。</p>
        </div>
        <div className="key-point">
          <h4>送達追蹤</h4>
          <p>一定要記錄每個通知嘅狀態：已發送、已送達、已打開。呢啲數據對分析用戶行為超重要，亦都係 PM 最鍾意睇嘅 metrics。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>Template 系統設計</h4>
        <p>經驗法則：好嘅通知系統一定要有 template 功能。將通知內容同送達邏輯分開，咁 PM 可以自己改通知文案，唔使工程師改 code。呢個可以慳好多溝通成本。</p>
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
        <h4>Prompt 1 — 設計多渠道通知系統</h4>
        <div className="prompt-text">
          幫手設計一個多渠道通知系統，支援 Push Notification（APNs / FCM）、SMS（Twilio）、Email（SES / SendGrid）三個渠道。{'\n\n'}
          技術要求：{'\n'}
          - 用 Message Queue 做中間緩衝，確保通知唔會丟失{'\n'}
          - 每個渠道有獨立嘅 Worker，可以獨立擴展{'\n'}
          - 支援 Fallback 策略：先發 Push，<span className="placeholder">[X 分鐘]</span>冇睇就發 SMS{'\n'}
          - 需要 Rate Limiting，每個用戶每小時最多收到 <span className="placeholder">[N 個]</span> 通知{'\n'}
          - 包含送達追蹤（已發送、已送達、已打開）{'\n\n'}
          應用場景係 <span className="placeholder">[例如：電商平台 / 社交 App / SaaS 產品]</span>，預計日均通知量 <span className="placeholder">[例如：100 萬條]</span>。{'\n\n'}
          請提供完整嘅架構圖、API 設計、同 Database Schema。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 建立通知偏好同 Throttling 系統</h4>
        <div className="prompt-text">
          幫手設計一個通知偏好管理同 Throttling 系統，要求如下：{'\n\n'}
          功能需求：{'\n'}
          - 用戶可以設定邊啲類型嘅通知想收（交易、行銷、系統）{'\n'}
          - 用戶可以揀每種通知用咩渠道（Push / Email / SMS）{'\n'}
          - 行銷類通知必須支援 Unsubscribe，符合 GDPR 同 CAN-SPAM 合規要求{'\n'}
          - 交易類通知（例如付款確認）唔可以被關閉{'\n\n'}
          Throttling 規則：{'\n'}
          - 同一用戶同一類型通知，<span className="placeholder">[X 分鐘]</span>內只發一次{'\n'}
          - 全局 Rate Limit：每用戶每日最多 <span className="placeholder">[N 條]</span> 通知{'\n'}
          - 支援 Exponential Backoff 重試（發送失敗時）{'\n\n'}
          技術棧建議用 <span className="placeholder">[例如：Node.js + Redis + PostgreSQL]</span>。{'\n'}
          請提供 Database Schema、API Endpoints、同核心邏輯嘅 Pseudocode。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 建立 Notification Template 系統</h4>
        <div className="prompt-text">
          幫手設計一個 Notification Template 系統，令非技術人員（例如 PM）可以自己管理通知內容，唔使改 code。{'\n\n'}
          核心功能：{'\n'}
          - Template 支援變數插入（例如 {'{{'}user_name{'}}'}、{'{{'}order_id{'}}'}）{'\n'}
          - 每個 Template 支援多語言版本（至少中文同英文）{'\n'}
          - 每個渠道（Push / Email / SMS）有獨立嘅 Template 格式{'\n'}
          - Email Template 支援 HTML 排版{'\n'}
          - 版本控制：可以回滾到之前嘅版本{'\n\n'}
          管理介面需求：{'\n'}
          - Template CRUD 操作{'\n'}
          - 預覽功能（填入測試數據即時預覽效果）{'\n'}
          - 發送測試通知{'\n\n'}
          應用場景係 <span className="placeholder">[例如：電商平台 / 金融 App]</span>。{'\n'}
          請提供 Database Schema、API 設計、同前端管理介面嘅關鍵頁面設計。
        </div>
      </div>
    </div>
  );
}

export default function NotificationSystem() {
  return (
    <>
      <TopicTabs
        title="Notification System 通知系統"
        subtitle="Push、SMS、Email 多渠道通知架構"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'channels', label: '② 通知渠道', content: <ChannelsTab /> },
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
