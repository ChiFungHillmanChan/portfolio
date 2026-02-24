import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '搶票系統入面，點解用 Redis SETNX 做分佈式鎖比直接 UPDATE Database 好？',
    options: [
      { text: '因為 Redis 免費，Database 要收錢', correct: false, explanation: '成本唔係主要原因。Redis 做鎖嘅核心優勢係速度同原子性。' },
      { text: '因為 Redis 操作係 O(1) 極快，而且 SETNX 天然原子性，適合高並發搶鎖', correct: true, explanation: 'SETNX（SET if Not eXists）係原子操作——check 同 set 喺同一個操作完成，唔會有 race condition。加上 Redis 全部操作都喺記憶體完成，比 Database 快幾百倍。10 萬人同時搶票嘅場景下，Database 會被打爆，但 Redis 可以輕鬆應付。' },
      { text: '因為 Redis 永遠唔會掛', correct: false, explanation: 'Redis 一樣會掛。所以做分佈式鎖要設 TTL（過期時間），防止拎到鎖嘅 Server 死咗之後鎖永遠唔釋放。' },
      { text: '因為 Database 唔支持並發操作', correct: false, explanation: 'Database 支持並發操作，但喺極高並發（例如秒殺）場景下，Database 嘅鎖機制（行鎖/表鎖）效能唔夠好。' },
    ],
  },
  {
    question: 'Optimistic Locking 同 Pessimistic Locking，搶票場景應該用邊個？',
    options: [
      { text: 'Optimistic Locking，因為佢唔鎖定資源，並發度更高', correct: false, explanation: 'Optimistic Locking 喺衝突率低嘅場景先至有優勢。搶票場景衝突率極高（好多人搶同一張票），Optimistic Locking 會導致大量 retry，反而更慢。' },
      { text: 'Pessimistic Locking，因為搶票衝突率極高，先鎖先處理可以避免大量 retry', correct: true, explanation: '搶票係典型嘅高衝突場景——100 個人搶 1 張票。如果用 Optimistic Locking，99 個人都會 retry，造成「驚群效應」。用 Pessimistic Locking（例如 Redis SETNX），只有拎到鎖嘅人先至可以繼續，其他人直接等或者失敗，效率更高。' },
      { text: '兩個都唔用，直接 UPDATE inventory SET count = count - 1', correct: false, explanation: '冇任何鎖機制嘅 UPDATE 喺高並發下會超賣。例如庫存剩 1 張，兩個人同時讀到 count=1，都執行 count-1，結果變成 -1——超賣咗。' },
      { text: '用 Optimistic + Pessimistic 混合', correct: false, explanation: '混合使用會令架構過度複雜。搶票場景直接用 Pessimistic Locking 就夠。' },
    ],
  },
  {
    question: '搶票系統點樣防止超賣（Overselling）？',
    options: [
      { text: '喺前端做數量檢查就夠', correct: false, explanation: '前端檢查可以被繞過（直接打 API），而且多個用戶同時請求時前端嘅數量已經唔準確。防超賣一定要喺後端做。' },
      { text: '用 Redis 原子操作 DECR，返回值 < 0 就代表超賣，拒絕訂單', correct: true, explanation: 'Redis DECR 係原子操作——讀取同減少喺同一步完成。如果 DECR 之後返回值 < 0，代表庫存已經唔夠，直接 INCR 回去並拒絕訂單。呢個係最簡單同最可靠嘅防超賣方案，比 Database 鎖快好多倍。' },
      { text: '限制同一時間只有一個人可以買', correct: false, explanation: '呢個太慢啦！搶票要喺幾秒內處理幾萬個請求，排隊逐個處理嘅話體驗極差。正確做法係用原子操作並行處理。' },
      { text: '多準備 10% 嘅庫存做緩衝', correct: false, explanation: '呢個係商業決策，唔係技術解決方案。超賣防護一定要靠技術手段（原子操作/鎖），唔係靠多準備庫存。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'rate-limiter', label: 'Rate Limiter 限流器' },
  { slug: 'redis', label: 'Redis' },
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>搶票系統係咩</h2>
      <div className="subtitle">秒殺 / 超賣防護 / 分佈式鎖——10 萬人搶 100 張票點樣設計</div>
      <p>
        演唱會門票、雙十一搶購、限量波鞋發售——呢啲場景嘅共同挑戰係：短時間內有大量用戶搶有限嘅庫存。10 萬人同時搶 100 張票，你嘅系統點頂得住？最核心嘅問題只有兩個：<strong style={{ color: '#f87171' }}>唔好超賣</strong>（賣多過實際庫存）同 <strong style={{ color: '#34d399' }}>唔好掛掉</strong>（系統要頂住流量洪峰）。
      </p>
      <p>
        解決思路係用「漏斗」模式：前端限流 → 後端排隊 → Redis 原子扣庫存 → 異步建立訂單。每一層都過濾掉大部分請求，確保最終打到 Database 嘅只有真正有效嘅訂單。呢個就係「削峰填谷」嘅精髓。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 830 300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#f87171" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrRed3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
            <marker id="arrAmber3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrGreen3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrPurple3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(10,100)">
            <rect width="100" height="75" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Users</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">10 萬人</text>
            <text x="50" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">同時搶票</text>
          </g>

          <g transform="translate(160,100)" filter="url(#glowRed)">
            <rect width="120" height="75" rx="12" fill="url(#gradRed)" stroke="#f87171" strokeWidth="2" />
            <text x="60" y="28" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700">Rate</text>
            <text x="60" y="46" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700">Limiter</text>
            <text x="60" y="63" textAnchor="middle" fill="#9ca3af" fontSize="9">過濾 90%</text>
          </g>

          <g transform="translate(330,100)">
            <rect width="120" height="75" rx="12" fill="url(#gradAmber)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">Message</text>
            <text x="60" y="46" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">Queue</text>
            <text x="60" y="63" textAnchor="middle" fill="#9ca3af" fontSize="9">排隊緩衝</text>
          </g>

          <g transform="translate(500,80)">
            <rect width="145" height="95" rx="12" fill="url(#gradGreen)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="72" y="25" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Inventory</text>
            <text x="72" y="43" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Service</text>
            <text x="72" y="63" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">Redis Lock</text>
            <text x="72" y="80" textAnchor="middle" fill="#9ca3af" fontSize="9">DECR 扣庫存</text>
          </g>

          <g transform="translate(700,100)">
            <rect width="110" height="75" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Order</text>
            <text x="55" y="46" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">DB</text>
            <text x="55" y="63" textAnchor="middle" fill="#9ca3af" fontSize="9">寫入訂單</text>
          </g>

          <path d="M112,137 C130,137 140,137 158,137" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrBlue3)" />
          <path d="M282,137 C300,137 310,137 328,137" stroke="#f87171" strokeWidth="2" fill="none" markerEnd="url(#arrRed3)" />
          <path d="M452,137 C465,137 475,135 498,130" stroke="#fbbf24" strokeWidth="2" fill="none" markerEnd="url(#arrAmber3)" />
          <path d="M647,130 C660,133 675,135 698,137" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrGreen3)" />

          <g transform="translate(160,220)">
            <rect width="120" height="40" rx="8" fill="rgba(239,68,68,0.1)" stroke="#f87171" strokeWidth="1.5" />
            <text x="60" y="16" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">429 Too Many</text>
            <text x="60" y="32" textAnchor="middle" fill="#f87171" fontSize="9">90% 請求被擋</text>
          </g>
          <path d="M220,177 C220,190 220,200 220,218" stroke="#f87171" strokeWidth="1.5" fill="none" strokeDasharray="5,3" markerEnd="url(#arrRed3)" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>搶票流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>10 萬用戶同時點「搶票」按鈕。Rate Limiter 即時過濾掉 90% 嘅請求（同一用戶短時間內只接受一次請求），將流量從 10 萬降到 1 萬。</span></li>
        <li><span className="step-num">2</span><span>通過 Rate Limiter 嘅請求進入 Message Queue 排隊。Queue 嘅作用係「削峰」——將瞬間嘅流量高峰攤平成穩定嘅處理速度，保護後端唔被打爆。</span></li>
        <li><span className="step-num">3</span><span>Inventory Service 從 Queue 逐個攞請求，用 Redis DECR 原子操作扣庫存。返回值 ≥ 0 代表搶到，&lt; 0 代表已售罄（INCR 回去恢復）。</span></li>
        <li><span className="step-num">4</span><span>搶到嘅訂單異步寫入 Database，發確認通知。冇搶到嘅用戶收到「已售罄」回覆。全程唔直接鎖 Database，所以唔會 timeout。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>深入鎖同防超賣機制</h2>
      <div className="subtitle">分佈式鎖、樂觀鎖 vs 悲觀鎖、超賣防護</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Distributed Lock（分佈式鎖）—— Redis SETNX</h4>
          <p><code style={{ color: '#60a5fa' }}>SET lock_key unique_value NX EX 10</code>——呢行 Redis 命令做三件事：1) NX 確保只有一個 Client 可以拎到鎖；2) EX 10 設 10 秒過期（防止死鎖）；3) unique_value 用 UUID 確保只有鎖擁有者先至可以釋放。呢個係 Redlock 演算法嘅基礎。</p>
        </div>
        <div className="key-point">
          <h4>Optimistic vs Pessimistic Locking</h4>
          <p><strong style={{ color: '#34d399' }}>Optimistic</strong>：唔鎖定資源，提交時先 check 版本號有冇變。適合衝突率低嘅場景（例如普通商品下單）。<br /><strong style={{ color: '#f87171' }}>Pessimistic</strong>：操作前先鎖定資源，確保只有一個人可以操作。適合衝突率極高嘅場景（例如搶票秒殺）。搶票一定用 Pessimistic，因為衝突率接近 100%。</p>
        </div>
        <div className="key-point">
          <h4>防超賣嘅三道防線</h4>
          <p>
            <strong style={{ color: '#fbbf24' }}>第一道：Redis DECR 原子操作</strong>——最快嘅防線，在記憶體中原子扣庫存。<br />
            <strong style={{ color: '#fbbf24' }}>第二道：Database CHECK constraint</strong>——<code style={{ color: '#60a5fa' }}>CHECK (stock &gt;= 0)</code> 確保庫存唔會變負數。<br />
            <strong style={{ color: '#fbbf24' }}>第三道：訂單狀態機</strong>——訂單經歷 pending → confirmed → paid 嘅狀態流轉，任何異常都可以回滾。
          </p>
        </div>
        <div className="key-point">
          <h4>庫存預熱（Pre-warming）</h4>
          <p>搶購開始前，將 Database 嘅庫存數量提前載入 Redis。咁搶購開始時所有庫存操作都喺 Redis 完成，完全唔掂 Database。記住：Redis 嘅庫存同 Database 嘅庫存要定期對賬，確保一致。</p>
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
          <h4>Pre-warming Cache（預熱快取）</h4>
          <p>搶購前 5 分鐘，將商品資訊、庫存數量、活動規則全部載入 Redis。搶購頁面用 CDN 靜態化，減少動態請求。前端用 countdown timer，精確到秒，同時喺後端控制真正嘅開始時間（唔信任前端時間）。</p>
        </div>
        <div className="key-point">
          <h4>Async Order Processing（異步訂單處理）</h4>
          <p>搶到票之後，唔好同步寫 DB 同發通知——呢啲太慢。將訂單資訊放入 Message Queue，異步處理：寫 DB、發確認 Email、更新統計。用戶即時收到「搶票成功，訂單處理中」嘅回覆，幾秒後收到確認通知。呢個將回應時間從幾秒壓到 &lt; 100ms。</p>
        </div>
        <div className="key-point">
          <h4>排隊體驗設計</h4>
          <p>好嘅搶票系統會俾用戶睇到自己排第幾。實現方式：用 Redis INCR 做排隊號，前端 Polling 或 WebSocket 更新進度。如果預計等待超過 5 分鐘，建議顯示預計時間同允許用戶留低 Email 等通知。呢個係用戶體驗嘅關鍵。</p>
        </div>
        <div className="key-point">
          <h4>訂單超時釋放</h4>
          <p>搶到票但 15 分鐘內冇付款？庫存要自動釋放。用 Redis 嘅 key 過期機制或者 delayed job 實現：訂單建立時設 15 分鐘 TTL，到期未付款就自動取消訂單、Redis INCR 回庫存。呢個防止「佔位唔買」嘅問題。</p>
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
        <h4>Prompt 1 — 設計搶票秒殺系統</h4>
        <div className="prompt-text">
          幫手設計一個搶票/秒殺系統，處理 <span className="placeholder">[10 萬 / 100 萬]</span> 人同時搶 <span className="placeholder">[100 / 1000]</span> 張票嘅場景。{'\n\n'}
          核心要求：{'\n'}
          - 多層限流：前端驗證碼 + Rate Limiter + Message Queue 削峰{'\n'}
          - Redis 分佈式鎖（SETNX）+ 原子扣庫存（DECR）{'\n'}
          - 防超賣三道防線：Redis DECR → DB CHECK constraint → 訂單狀態機{'\n'}
          - 異步訂單處理：搶到即回覆，異步寫 DB + 發通知{'\n'}
          - 訂單超時釋放：<span className="placeholder">[15 分鐘]</span> 未付款自動取消{'\n'}
          - 排隊機制：用戶可以睇到自己排第幾{'\n\n'}
          技術棧：<span className="placeholder">[例如：Node.js / Go + Redis + Kafka + PostgreSQL]</span>{'\n'}
          請提供完整架構圖、API 設計、Redis 命令、同 Message Queue 嘅 Consumer 邏輯。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實現分佈式庫存扣減 + 對賬系統</h4>
        <div className="prompt-text">
          幫手設計一個分佈式庫存管理系統，確保 Redis 快取庫存同 Database 實際庫存一致。{'\n\n'}
          場景：{'\n'}
          - Redis 做實時庫存扣減（DECR），Database 做持久化記錄{'\n'}
          - 需要處理：Redis 同 DB 不一致、Redis 宕機恢復、雙寫失敗{'\n\n'}
          技術要求：{'\n'}
          - 庫存預熱：活動前將 DB 庫存 sync 到 Redis{'\n'}
          - 扣減流程：Redis DECR → Message Queue → DB UPDATE（異步）{'\n'}
          - 對賬機制：每 <span className="placeholder">[5 分鐘 / 1 小時]</span> 對比 Redis 同 DB 嘅庫存數量{'\n'}
          - 異常處理：Redis 扣成功但 DB 寫入失敗嘅補償策略{'\n'}
          - 監控告警：Redis-DB 差異超過 <span className="placeholder">[N 個]</span> 就觸發告警{'\n\n'}
          請提供系統架構、對賬 Job 嘅實現、同異常補償嘅 Pseudocode。
        </div>
      </div>
    </div>
  );
}

export default function TicketBooking() {
  return (
    <>
      <TopicTabs
        title="搶票系統"
        subtitle="秒殺 / 超賣防護 / 分佈式鎖"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'advanced', label: '② 鎖同防超賣', content: <AdvancedTab /> },
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
