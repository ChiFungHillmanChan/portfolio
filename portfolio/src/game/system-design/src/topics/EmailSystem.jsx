import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Email 從發送到接收，經過邊啲核心組件？',
    options: [
      { text: 'Client → Server → Client，同 HTTP 請求一樣', correct: false, explanation: 'Email 嘅路徑比 HTTP 請求複雜好多。涉及 SMTP、MTA、MDA 等多個組件，唔係直接 Server 到 Server。' },
      { text: 'MUA（寫信）→ SMTP → 發送方 MTA → 接收方 MTA → MDA → 收件人 Mailbox', correct: true, explanation: 'Email 嘅完整路徑：MUA（Mail User Agent，例如 Gmail App）寫好 email → 用 SMTP 協議送去發送方嘅 MTA（Mail Transfer Agent）→ MTA 查 DNS MX record 搵到接收方嘅 MTA → 接收方 MTA 交俾 MDA（Mail Delivery Agent）→ MDA 將 email 放入收件人 Mailbox。收件人用 IMAP/POP3 攞信。' },
      { text: 'API Gateway → Lambda → Database', correct: false, explanation: '呢個係 serverless 架構，唔係 email 系統。Email 有自己嘅協議同組件。' },
      { text: 'Client → DNS → Server', correct: false, explanation: 'DNS 只係其中一步（查 MX record），唔係 email 嘅核心路徑。' },
    ],
  },
  {
    question: 'SPF、DKIM、DMARC 呢三個技術嘅共同目的係咩？',
    options: [
      { text: '加密 email 內容，防止被截聽', correct: false, explanation: '呢三個技術唔係用嚟加密 email 內容嘅。Email 加密用嘅係 TLS（傳輸層）同 PGP/S/MIME（內容層）。' },
      { text: '防止 email spoofing（偽造寄件人），提高送達率', correct: true, explanation: 'SPF 話俾接收方知「邊啲 Server 有權代我發 email」；DKIM 用數碼簽名證明「呢封 email 真係我發嘅，冇被改過」；DMARC 話俾接收方知「如果 SPF 或 DKIM 驗證失敗，應該點處理（拒絕/隔離/通過）」。三者配合可以大幅減少釣魚 email 同提高合法 email 嘅送達率。' },
      { text: '壓縮 email 附件大小', correct: false, explanation: '呢三個技術同附件壓縮完全冇關。佢哋係驗證寄件人身份嘅安全機制。' },
      { text: '加速 email 嘅傳輸速度', correct: false, explanation: '佢哋唔會加速傳輸，反而會增加少少處理時間（因為要做驗證）。但對送達率嘅提升遠超呢個微小嘅延遲。' },
    ],
  },
  {
    question: '設計 email 系統時，點解一定要用 Message Queue？',
    options: [
      { text: '因為 email 發送係即時嘅，Queue 可以加速', correct: false, explanation: 'Email 發送本身唔係即時嘅（可能要幾秒到幾分鐘）。Queue 嘅作用唔係加速，而係確保可靠性同削峰。' },
      { text: '因為 SMTP 連接可能失敗或超時，Queue 確保 email 唔會因為暫時故障而丟失', correct: true, explanation: '接收方 MTA 可能暫時不可用、網絡可能斷線、SMTP 連接可能超時。如果冇 Queue，呢啲情況下 email 就會丟失。Queue 可以做到：①失敗自動重試（exponential backoff）；②削峰——短時間大量 email 唔會打爆 SMTP Server；③監控同追蹤每封 email 嘅狀態。' },
      { text: '因為法律規定 email 要排隊發送', correct: false, explanation: '冇呢條法律。Queue 係架構設計嘅選擇，唔係法律要求。' },
      { text: '因為 Queue 可以減少 email 嘅大小', correct: false, explanation: 'Queue 唔會改變 email 嘅大小。佢嘅作用係緩衝同確保可靠投遞。' },
    ],
  },
  {
    question: 'Bounce Handling 入面，Hard Bounce 同 Soft Bounce 嘅分別同處理方式係咩？',
    options: [
      { text: 'Hard Bounce 係 email 太大，Soft Bounce 係 email 太細', correct: false, explanation: 'Bounce 同 email 大小冇關（雖然太大嘅附件可能導致 bounce）。呢兩種 bounce 嘅分別係永久性 vs 暫時性。' },
      { text: 'Hard Bounce 係永久失敗（地址唔存在），要即刻移除；Soft Bounce 係暫時失敗（郵箱滿），可以稍後重試', correct: true, explanation: 'Hard Bounce（例如 550 User unknown）代表呢個地址永遠送唔到——可能係地址打錯或者帳戶已刪除。一定要即刻從發送列表移除，否則會被 ISP 標記為 spammer。Soft Bounce（例如 452 Mailbox full）係暫時嘅，可以隔幾個小時重試。但連續 Soft Bounce 3-5 次就要當 Hard Bounce 處理。' },
      { text: '冇分別，兩個都係發送失敗', correct: false, explanation: '處理方式完全唔同。Hard Bounce 要即刻移除地址，Soft Bounce 可以重試。搞混咗會嚴重影響你嘅 sender reputation。' },
      { text: 'Hard Bounce 係 Server 端錯誤，Soft Bounce 係 Client 端錯誤', correct: false, explanation: '唔係 Server/Client 嘅分別。係永久性 vs 暫時性嘅分別。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'notification-system', label: 'Notification System 通知系統' },
  { slug: 'task-queue', label: 'Task Queue 任務隊列' },
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>電郵系統設計係咩</h2>
      <div className="subtitle">SMTP / 佇列 / 垃圾郵件過濾——Email 點樣從發送到接收</div>
      <p>
        Email 係互聯網最古老嘅通訊方式之一，但設計一個可靠嘅 email 系統一啲都唔簡單。每日全球有超過 3000 億封 email 被發送，其中一半以上係 spam。系統設計嘅核心挑戰係：點樣確保 email 可靠送達、唔被標記為 spam、同時處理大量並發？
      </p>
      <p>
        Email 系統嘅關鍵組件：<strong style={{ color: '#3B82F6' }}>MUA</strong>（Mail User Agent，例如 Gmail App）負責寫同讀 email；<strong style={{ color: '#34d399' }}>MTA</strong>（Mail Transfer Agent，例如 Postfix）負責傳遞 email；<strong style={{ color: '#fbbf24' }}>MDA</strong>（Mail Delivery Agent）負責將 email 放入 mailbox。佢哋之間用 SMTP 協議溝通。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 830 300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPink" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue6" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen6" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber6" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPurple6" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
            <marker id="arrPink6" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#EC4899" /></marker>
          </defs>

          <g transform="translate(10,100)">
            <rect width="100" height="70" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Sender</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">MUA</text>
            <text x="50" y="62" textAnchor="middle" fill="#9ca3af" fontSize="8">寫 email</text>
          </g>

          <g transform="translate(160,100)">
            <rect width="100" height="70" rx="12" fill="url(#gradGreen)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">SMTP</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">提交協議</text>
          </g>

          <g transform="translate(310,90)" filter="url(#glowGreen2)">
            <rect width="110" height="85" rx="12" fill="url(#gradAmber)" stroke="#fbbf24" strokeWidth="2" />
            <text x="55" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">Queue</text>
            <text x="55" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">重試 + 排隊</text>
            <text x="55" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">Exponential</text>
            <text x="55" y="75" textAnchor="middle" fill="#9ca3af" fontSize="9">Backoff</text>
          </g>

          <g transform="translate(470,100)">
            <rect width="100" height="70" rx="12" fill="url(#gradGreen)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">MTA</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">傳遞 email</text>
          </g>

          <g transform="translate(620,100)">
            <rect width="100" height="70" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">MDA</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">投遞 email</text>
          </g>

          <g transform="translate(720,100)">
            <rect width="100" height="70" rx="12" fill="url(#gradPink)" stroke="#EC4899" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="25" textAnchor="middle" fill="#EC4899" fontSize="12" fontWeight="700">Mailbox</text>
            <text x="50" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">收件人</text>
            <text x="50" y="60" textAnchor="middle" fill="#9ca3af" fontSize="8">IMAP / POP3</text>
          </g>

          <path d="M112,135 C125,135 140,135 158,135" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrBlue6)" />
          <path d="M262,135 C275,135 290,132 308,130" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrGreen6)" />
          <path d="M422,130 C435,132 450,135 468,135" stroke="#fbbf24" strokeWidth="2" fill="none" markerEnd="url(#arrAmber6)" />
          <path d="M572,135 C585,135 600,135 618,135" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrGreen6)" />
          <path d="M722,135 C730,135 708,135 718,135" stroke="#8B5CF6" strokeWidth="2" fill="none" markerEnd="url(#arrPurple6)" />

          <g transform="translate(470,210)">
            <rect width="100" height="55" rx="10" fill="url(#gradRed)" stroke="#f87171" strokeWidth="1.5" />
            <text x="50" y="20" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">Spam Filter</text>
            <text x="50" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">SPF / DKIM</text>
            <text x="50" y="50" textAnchor="middle" fill="#9ca3af" fontSize="9">DMARC</text>
          </g>
          <path d="M520,172 C520,185 520,195 520,208" stroke="#f87171" strokeWidth="1.5" fill="none" strokeDasharray="5,3" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>Email 傳遞流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>Sender 用 MUA（Gmail App / Outlook）寫好 email，按「發送」。MUA 透過 SMTP 協議將 email 提交去你嘅 SMTP Server。</span></li>
        <li><span className="step-num">2</span><span>Email 進入 Message Queue 排隊。Queue 確保即使接收方暫時不可用，email 唔會丟失——失敗會用 Exponential Backoff 重試（1 分鐘、5 分鐘、30 分鐘...）。</span></li>
        <li><span className="step-num">3</span><span>MTA 查 DNS 嘅 MX record 搵到接收方嘅 mail server，然後用 SMTP 將 email 傳遞過去。中間會經過 Spam Filter 驗證 SPF/DKIM/DMARC。</span></li>
        <li><span className="step-num">4</span><span>接收方嘅 MDA 將 email 放入收件人嘅 Mailbox。收件人用 IMAP（同步）或 POP3（下載）攞信。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>Email 安全同送達率</h2>
      <div className="subtitle">SPF / DKIM / DMARC、Deliverability、Bounce Handling</div>

      <div className="key-points">
        <div className="key-point">
          <h4>SPF（Sender Policy Framework）</h4>
          <p>喺你嘅 DNS 加一條 TXT record，列出「邊啲 IP/Server 有權代你發 email」。接收方收到 email 時會查 SPF record，如果發送 Server 唔喺名單入面，呢封 email 就可能被標記為 spam。設定例子：<code style={{ color: '#60a5fa' }}>v=spf1 include:_spf.google.com include:amazonses.com ~all</code>。</p>
        </div>
        <div className="key-point">
          <h4>DKIM（DomainKeys Identified Mail）</h4>
          <p>發送時用私鑰對 email header 同 body 做數碼簽名。接收方用你 DNS 上面嘅公鑰驗證簽名——如果吻合，代表 email 真係你發嘅，而且內容冇被中間人篡改。呢個係防止 email spoofing 嘅關鍵技術。</p>
        </div>
        <div className="key-point">
          <h4>DMARC（Domain-based Message Authentication）</h4>
          <p>DMARC 建立喺 SPF 同 DKIM 之上，指定「如果驗證失敗要點處理」。三個 policy：<strong style={{ color: '#34d399' }}>none</strong>（只報告，唔做嘢）、<strong style={{ color: '#fbbf24' }}>quarantine</strong>（放入 spam）、<strong style={{ color: '#f87171' }}>reject</strong>（直接拒絕）。建議從 none 開始，觀察報告確保合法 email 都通過之後，再改為 reject。</p>
        </div>
        <div className="key-point">
          <h4>Bounce Handling</h4>
          <p><strong style={{ color: '#f87171' }}>Hard Bounce</strong>（永久失敗）：地址唔存在、域名唔存在。收到即刻從列表移除，繼續發會被 ISP 標記為 spammer。<br /><strong style={{ color: '#fbbf24' }}>Soft Bounce</strong>（暫時失敗）：郵箱滿、Server 暫時不可用。可以隔幾個小時重試，但連續 3-5 次 Soft Bounce 就要當 Hard Bounce 處理。Bounce rate 要控制喺 &lt; 2%。</p>
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
          <h4>Transactional vs Marketing Email</h4>
          <p><strong style={{ color: '#34d399' }}>Transactional</strong>（交易型）：密碼重置、訂單確認、驗證碼——用戶主動觸發，必須即時送達。用獨立嘅 IP 同 domain 發送，確保唔被 marketing 嘅壞 reputation 拖累。<br /><strong style={{ color: '#fbbf24' }}>Marketing</strong>（行銷型）：優惠通知、newsletter——可以批量發，但要遵守 Unsubscribe 法規。兩種 email 一定要用唔同嘅 sending infrastructure。</p>
        </div>
        <div className="key-point">
          <h4>Template System</h4>
          <p>同 Notification 嘅 Template 類似——用變數系統（<code style={{ color: '#60a5fa' }}>{'{{'}user_name{'}}'}</code>、<code style={{ color: '#60a5fa' }}>{'{{'}order_id{'}}'}</code>）將內容同邏輯分開。Email template 要特別注意：HTML email 嘅 CSS 支持好有限（要用 inline style）、唔同 email client 嘅渲染差異極大（Outlook 尤其難搞）。建議用 MJML 或者 React Email 呢類工具。</p>
        </div>
        <div className="key-point">
          <h4>Rate Limiting Sends</h4>
          <p>ISP（例如 Gmail）會限制你每小時可以發幾多 email。超過限制就會被暫時封鎖。建議：新 IP/domain 要做 warm-up（第一日發 100 封，逐日加倍）；穩定後控制喺每 IP 每小時 &lt; 5000 封。用 Queue 嘅 rate limiting 功能控制發送速度。</p>
        </div>
        <div className="key-point">
          <h4>Deliverability 最佳實踐</h4>
          <p>送達率係 email 系統嘅命脈。關鍵指標：①Bounce rate &lt; 2%；②Spam complaint rate &lt; 0.1%；③Open rate &gt; 15%。提升方法：SPF/DKIM/DMARC 全部設好、List Hygiene（定期清理無效地址）、Engagement-based sending（唔再打開嘅用戶就唔發）、Dedicated IP warm-up。</p>
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
        <h4>Prompt 1 — 設計高送達率 Email 發送系統</h4>
        <div className="prompt-text">
          幫手設計一個 email 發送系統，要求高送達率同可靠投遞。{'\n\n'}
          核心功能：{'\n'}
          - SMTP Server + Message Queue（重試 + exponential backoff）{'\n'}
          - SPF / DKIM / DMARC 完整設定{'\n'}
          - 分開 Transactional 同 Marketing 嘅 sending infrastructure{'\n'}
          - Bounce Handling：自動偵測 Hard/Soft Bounce，清理無效地址{'\n'}
          - Rate Limiting：控制每 IP 每小時發送量，支持 IP warm-up{'\n'}
          - Template System：支持變數插入、多語言、HTML email{'\n'}
          - 追蹤：Open rate、Click rate、Bounce rate、Unsubscribe rate{'\n\n'}
          預計日發送量 <span className="placeholder">[例如：50 萬 / 500 萬]</span> 封。{'\n'}
          技術棧：<span className="placeholder">[例如：Node.js + AWS SES + Redis + PostgreSQL]</span>{'\n'}
          請提供架構圖、Queue 設計、DNS 設定（SPF/DKIM/DMARC record）、同 Bounce Processing Pipeline。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 建立 Spam 過濾 + 送達率監控系統</h4>
        <div className="prompt-text">
          幫手設計一個 email spam 過濾同送達率監控系統。{'\n\n'}
          Spam 過濾（接收方）：{'\n'}
          - SPF / DKIM / DMARC 驗證{'\n'}
          - Content Analysis：關鍵詞過濾 + ML 分類器{'\n'}
          - Reputation Check：發送 IP/domain 嘅 reputation scoring{'\n'}
          - 用戶行為：基於用戶嘅 spam 標記學習{'\n\n'}
          送達率監控（發送方）：{'\n'}
          - Dashboard：Open rate、Click rate、Bounce rate、Spam complaint rate{'\n'}
          - 告警規則：Bounce rate &gt; <span className="placeholder">[2% / 5%]</span> 就觸發告警{'\n'}
          - IP/Domain Reputation 追蹤{'\n'}
          - A/B Testing：Subject line、Send time 優化{'\n'}
          - List Hygiene 自動化：偵測同清理不活躍用戶{'\n\n'}
          請提供 Spam Scoring 模型設計、Dashboard Schema、同告警 Pipeline 架構。
        </div>
      </div>
    </div>
  );
}

export default function EmailSystem() {
  return (
    <>
      <TopicTabs
        title="電郵系統設計"
        subtitle="SMTP / 佇列 / 垃圾郵件過濾"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'advanced', label: '② 安全同送達率', content: <AdvancedTab /> },
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
