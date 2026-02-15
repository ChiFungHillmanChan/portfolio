import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'authentication', label: 'Authentication 驗證' },
  { slug: 'notification-system', label: 'Notification System 通知系統' },
  { slug: 'monitoring', label: '應用程式監控' },
  { slug: 'database-basics', label: 'Database 基礎' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>支付系統最要注意乜嘢</h2>
      <div className="subtitle">錢唔可以重複扣、唔可以少記——呢個係鐵律</div>
      <p>
        重點係，用戶畀錢買嘢，最驚就係三件事：<strong style={{ color: '#f87171' }}>重複扣款</strong>、<strong style={{ color: '#f87171' }}>扣咗錢但訂單冇成立</strong>、<strong style={{ color: '#f87171' }}>退款處理錯</strong>。所以設計支付系統，必須做到：<strong style={{ color: '#34d399' }}>冪等性</strong>（同一請求重複發多次，只會處理一次）、<strong style={{ color: '#6366f1' }}>雙向記帳</strong>（Double-entry，每筆交易 debit = credit）、同埋用 <strong style={{ color: '#f59e0b' }}>Webhook</strong> 同步支付結果。呢三個係核心防線。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 740 350" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#172033" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#13251e" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#1f1a10" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#1c1530" /></linearGradient>
            <linearGradient id="gradPink" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#25132a" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arrPink" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#EC4899" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(20,125)">
            <rect width="100" height="70" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="30" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">User</text>
            <text x="50" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">發起付款</text>
          </g>

          <g transform="translate(170,115)">
            <rect width="155" height="90" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="77" y="30" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">Payment Service</text>
            <text x="77" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">Idempotency Key</text>
            <text x="77" y="70" textAnchor="middle" fill="#34d399" fontSize="10">Double-entry Ledger</text>
          </g>

          <g transform="translate(385,40)">
            <rect width="140" height="70" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Ledger</text>
            <text x="70" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">Double Entry</text>
            <text x="70" y="62" textAnchor="middle" fill="#a5b4fc" fontSize="9">debit = credit</text>
          </g>

          <g transform="translate(385,145)">
            <rect width="140" height="65" rx="12" fill="url(#gradAmber)" stroke="#F59E0B" strokeWidth="2" filter="url(#glowAmber)" />
            <text x="70" y="28" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Payment Gateway</text>
            <text x="70" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Stripe / PayPal</text>
          </g>

          <g transform="translate(580,105)">
            <rect width="135" height="70" rx="12" fill="url(#gradPink)" stroke="#EC4899" strokeWidth="2" filter="url(#shadow)" />
            <text x="67" y="28" textAnchor="middle" fill="#EC4899" fontSize="12" fontWeight="700">Stripe / PayPal</text>
            <text x="67" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Webhook 回調</text>
          </g>

          <path d="M 120 160 Q 145 155 168 152" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="145" y="143" fill="#a5b4fc" fontSize="10">Pay</text>

          <path d="M 325 130 Q 355 95 383 80" fill="none" stroke="#8B5CF6" strokeWidth="1.5" markerEnd="url(#arrPurple)" />
          <text x="358" y="100" fill="#a5b4fc" fontSize="9">記帳</text>

          <path d="M 325 168 Q 355 172 383 175" fill="none" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <text x="355" y="162" fill="#f59e0b" fontSize="9">Charge</text>

          <path d="M 525 170 Q 552 155 578 145" fill="none" stroke="#EC4899" strokeWidth="1.5" markerEnd="url(#arrPink)" />
          <text x="550" y="148" fill="#EC4899" fontSize="9">調用</text>

          <path d="M 647 178 Q 650 250 400 250 Q 250 250 248 208" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrGreen)" />
          <text x="450" y="268" fill="#34d399" fontSize="9">Webhook 異步回調</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>支付流程一覽</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>User 發起付款，必須帶上 Idempotency Key（建議用 order_id + 請求 hash）。呢個 key 係防止重複扣款嘅關鍵。</span></li>
        <li><span className="step-num">2</span><span>Payment Service 首先檢查呢個 Idempotency Key 有冇處理過——有嘅話，直接返回上次結果，唔會再扣錢。呢個邏輯非常重要。</span></li>
        <li><span className="step-num">3</span><span>然後調用 Payment Gateway（Stripe / PayPal）。成功後 Ledger 做雙向記帳：用戶 -100，商家 +100。核心原則係，debit 永遠等於 credit。</span></li>
        <li><span className="step-num">4</span><span>Gateway 用 Webhook 異步通知最終結果。要留意，呢個可能有延遲，所以要處理好 async 狀態同步。</span></li>
      </ol>
    </div>
  );
}

function IdempotencyTab() {
  return (
    <div className="card">
      <h2>冪等性設計詳解</h2>
      <div className="subtitle">呢個係防止重複扣款嘅核心武器</div>
      <p>
        <strong style={{ color: '#34d399' }}>Idempotency Key</strong> 嘅原理：Client 每次付款請求帶一個唯一 key（例如 UUID 或者 order_id）。Server 第一次處理時記錄 key → 結果；之後再用同一個 key 請求，直接返回 cached 結果，唔會再 call Payment Gateway。就係咁簡單，但效果強大。
      </p>
      <p>建議幫呢個 Key 設定 expiry（例如 24 小時），避免永遠佔住存儲。實現可以用 Redis 或者 DB，key 做 unique constraint。呢個 pattern 必須要識。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>Idempotency Key</h4>
          <p>每次請求帶唯一 key，Server 記錄 (key → response)。重複請求返回相同結果，唔會重複扣款。呢個係支付系統嘅第一道防線。</p>
        </div>
        <div className="key-point">
          <h4>Double-entry Bookkeeping</h4>
          <p>傳統銀行嘅做法：每筆交易兩邊記帳——用戶帳戶 -X，商家帳戶 +X。debit = credit 永遠成立，方便對帳同 audit。</p>
        </div>
        <div className="key-point">
          <h4>Saga Pattern</h4>
          <p>呢個係分佈式事務嘅利器：多個 step，每個 step 有 compensate 動作。某 step 失敗就執行補償。建議用 Saga 保證最終一致性。</p>
        </div>
        <div className="key-point">
          <h4>Webhook 處理</h4>
          <p>Payment Gateway 異步通知支付結果。需要做好三件事：驗簽（防偽造）、idempotent 處理（同一個 webhook 可能送多次）、同埋更新本地狀態。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">設計支付系統時必須特別小心呢幾點</div>
      <div className="key-points">
        <div className="key-point">
          <h4>重試機制</h4>
          <p>網路可能 fail，Client 會 retry。必須用 Idempotency Key，否則 retry = 重複扣款。特別注意：Gateway 超時嘅情況——可能已經扣咗款但冇回應，要靠 Webhook 最終確認。</p>
        </div>
        <div className="key-point">
          <h4>每日對帳</h4>
          <p>建議每日同 Payment Gateway 對帳，確保 Ledger 嘅數字同 Gateway 報表一致。唔一樣就即刻 alert。呢個係發現問題嘅最後防線。</p>
        </div>
        <div className="key-point">
          <h4>Webhook 安全</h4>
          <p>必須驗證 Webhook 簽名（例如 Stripe 用 HMAC），防止偽造。建議 store webhook 嘅 raw body 做 audit trail，出事嘅時候有得查。</p>
        </div>
        <div className="key-point">
          <h4>最終一致性</h4>
          <p>支付成功後可能要更新訂單、庫存、積分。建議用 message queue 異步處理，唔好同步 block。用 Saga Pattern 處理 partial failure，保證每個環節都有補償方案。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>總結</h4>
        <p>支付系統嘅三大支柱係：Idempotency Key 防重複、Double-entry Ledger 防差錯、Webhook 做異步同步。掌握呢三個概念，就可以設計出一個可靠嘅支付架構。記住，寧可多一重保障，都唔好少一重。</p>
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
        <h4>Prompt 1 — 設計支付處理 Pipeline</h4>
        <div className="prompt-text">
          幫手設計一個完整嘅支付處理 Pipeline，要求如下：{'\n\n'}
          核心功能：{'\n'}
          - 支援 <span className="placeholder">[例如：Stripe / PayPal / 本地支付]</span> 作為 Payment Gateway{'\n'}
          - Idempotency Key 機制：同一請求重複發多次，只會處理一次{'\n'}
          - Double-entry Bookkeeping：每筆交易 debit = credit{'\n'}
          - Webhook 處理：接收 Payment Gateway 嘅異步回調，包含簽名驗證{'\n'}
          - 支援退款流程（Full Refund 同 Partial Refund）{'\n\n'}
          安全要求：{'\n'}
          - Webhook 簽名驗證（HMAC）{'\n'}
          - PCI DSS 合規考量{'\n'}
          - 敏感數據加密存儲{'\n\n'}
          應用場景：<span className="placeholder">[例如：電商平台 / SaaS 訂閱 / Marketplace]</span>{'\n'}
          預計每日交易量：<span className="placeholder">[例如：10 萬筆]</span>{'\n\n'}
          請提供完整嘅架構圖、Database Schema（包含 Ledger 表設計）、API Endpoints、同核心流程嘅 Sequence Diagram。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 處理支付失敗、重試同冪等性</h4>
        <div className="prompt-text">
          幫手設計支付系統入面嘅失敗處理、重試同冪等性機制。{'\n\n'}
          需要處理嘅失敗場景：{'\n'}
          1. 網絡超時：Payment Gateway 冇回應（可能已經扣咗款）{'\n'}
          2. Gateway 返回錯誤（卡餘額不足、被拒絕等）{'\n'}
          3. Webhook 延遲或重複送達{'\n'}
          4. 部分成功：扣款成功但訂單更新失敗{'\n\n'}
          冪等性設計：{'\n'}
          - Idempotency Key 嘅生成策略（建議用 <span className="placeholder">[order_id + hash / UUID]</span>）{'\n'}
          - Key 嘅存儲方案（Redis / DB）同 TTL 設定{'\n'}
          - 重複請求嘅回應策略{'\n\n'}
          重試機制：{'\n'}
          - Exponential Backoff 參數（初始間隔、最大間隔、最大重試次數）{'\n'}
          - 用 Saga Pattern 處理分佈式事務失敗{'\n'}
          - 每個 step 嘅 compensate 動作設計{'\n\n'}
          每日對帳需求：{'\n'}
          - 同 Payment Gateway 報表自動對帳{'\n'}
          - 差異檢測同 Alert 機制{'\n\n'}
          技術棧：<span className="placeholder">[例如：Node.js + PostgreSQL + Redis + Message Queue]</span>{'\n'}
          請提供核心邏輯嘅 Pseudocode 同 State Machine Diagram。
        </div>
      </div>
    </div>
  );
}

export default function PaymentSystem() {
  return (
    <>
      <TopicTabs
        title="Payment System 支付系統"
        subtitle="交易一致性、冪等性同重試機制全解"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'idempotency', label: '② 冪等性設計', content: <IdempotencyTab /> },
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
