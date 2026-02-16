import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '面試官問：「Database 好慢，你會點做？」以下邊個回答最能展示系統性思維？',
    options: [
      { text: '即刻加 Redis Cache，因為 Cache 可以解決大部分效能問題', correct: false, explanation: '一上嚟就講加 Cache 係新手嘅常見錯誤。正確做法係先收集數據、搵出樽頸位，再決定用咩方案。Cache 可能有效，但唔一定係第一步。' },
      { text: '先收集數據（邊啲 Query 慢、幾慢、幾時慢），再根據原因逐步排查同解決', correct: true, explanation: '呢個展示咗系統性思維：先診斷再治療。由成本最低嘅方案開始（收集數據 → 檢查 Query → 加 Index → 加 Cache → 換 DB），面試官會欣賞呢種由淺入深嘅思路。' },
      { text: '直接換用 NoSQL Database，因為 NoSQL 比 SQL 快', correct: false, explanation: '換 DB 係成本最高、改動最大嘅方案，應該係最後先考慮。而且 NoSQL 唔一定比 SQL 快，關鍵在於 workload 類型。一上嚟就講換 DB 只會令面試官覺得唔識判斷輕重。' },
      { text: '加多幾台 Database Server 做 Sharding', correct: false, explanation: 'Sharding 係最複雜嘅方案，喺排查完所有簡單方案之後先應該考慮。好多時候問題只係缺少一個 Index，根本唔使到 Sharding。' },
    ],
  },
  {
    question: '你用 EXPLAIN 分析一條 Query，發現佢做緊 Full Table Scan（Seq Scan），掃描咗 100 萬行。最可能嘅原因同解法係咩？',
    options: [
      { text: '資料庫太舊，要升級到最新版本', correct: false, explanation: '版本通常唔係 Full Table Scan 嘅原因。問題幾乎一定係 WHERE 條件用到嘅 column 冇 Index，令資料庫只能逐行掃描。' },
      { text: 'WHERE 條件用到嘅 column 冇加 Index，要加 Index 令資料庫可以快速定位', correct: true, explanation: '冇 Index 嘅 column 做 WHERE 過濾，資料庫唯一選擇就係 Full Table Scan。加咗 Index 之後，資料庫可以直接跳去符合條件嘅行，從掃描 100 萬行變成只讀幾行，速度可以快幾十倍。' },
      { text: 'Query 用咗 SELECT *，要改成 SELECT 特定 column', correct: false, explanation: 'SELECT * 確實唔好（攞多咗冇用嘅 column），但佢唔會引起 Full Table Scan。Full Table Scan 嘅原因係 WHERE 條件冇用到 Index。' },
      { text: '需要加 Cache 避免重複查詢', correct: false, explanation: 'Cache 可以減少查詢次數，但唔能解決查詢本身慢嘅問題。應該先加 Index 解決 Full Table Scan，根本上提升 Query 效能。' },
    ],
  },
  {
    question: '你嘅 ORM 代碼攞 100 個用戶，每個用戶要攞佢嘅訂單。結果產生咗 101 條 SQL Query。呢個問題叫咩？點解決？',
    options: [
      { text: '呢個叫 Cache Miss 問題，用 Redis 快取所有訂單數據', correct: false, explanation: '呢個唔係 Cache 問題，而係 Query 模式嘅問題。101 條 Query 係因為 1 條攞用戶 + 100 條逐個攞訂單，呢個叫 N+1 問題。' },
      { text: '呢個叫 N+1 Query 問題，應該用 JOIN 或者 batch query 一次攞晒', correct: true, explanation: '1 條 Query 攞 100 個用戶 + 100 條 Query 逐個攞訂單 = 101 條。正確做法係用 JOIN（一條 Query 攞晒）或者 batch query（WHERE user_id IN (...)），減到只需 1-2 條 Query。' },
      { text: '呢個叫 Full Table Scan 問題，要加 Index', correct: false, explanation: 'Full Table Scan 係一條 Query 掃描太多行嘅問題。N+1 係 Query 數量太多嘅問題——101 條 Query 就算每條都用咗 Index，總時間仍然好長。' },
      { text: '呢個係正常嘅，ORM 本來就係咁運作', correct: false, explanation: '雖然好多 ORM 預設會產生 N+1 問題，但呢個係需要被修復嘅效能問題。大部分 ORM 都有 eager loading 或者 batch loading 嘅功能嚟解決呢個問題。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'pick-database', label: '點揀 Database' },
  { slug: 'scale-reads', label: '擴展讀取能力' },
  { slug: 'metrics-logging', label: 'Metrics & Logging 監控日誌' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>面試經典：「Database 好慢，會點做？」</h2>
      <div className="subtitle">重點係系統性思維——唔係亂試，而係有步驟咁排查</div>
      <p>
        好多新手一聽到「Database 慢」就即刻話「加 Cache！加 Index！」——但呢個係錯嘅。正確做法係由淺入深，一步步排查，搵到真正嘅樽頸位先至出手。以下係一個完整嘅 Debug 流程，跟住呢個框架嚟答，面試官一定會俾高分。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <filter id="glowIndigo">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#6366f1" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowPurple">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#8B5CF6" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradS1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#252040" /></linearGradient>
            <linearGradient id="gradS2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#2a2520" /></linearGradient>
            <linearGradient id="gradS3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#1e2e25" /></linearGradient>
            <linearGradient id="gradS4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#2a1e22" /></linearGradient>
            <linearGradient id="gradS5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#251e35" /></linearGradient>
            <marker id="arrDown" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto"><path d="M0,0 L4,8 L8,0 Z" fill="#6366f1" /></marker>
            <marker id="arrRight" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          <g transform="translate(250,20)" filter="url(#glowIndigo)">
            <rect width="300" height="60" rx="14" fill="url(#gradS1)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow)" />
            <text x="150" y="24" textAnchor="middle" fill="#6366f1" fontSize="13" fontWeight="700">① 收集數據</text>
            <text x="150" y="44" textAnchor="middle" fill="#9ca3af" fontSize="11">邊啲 Query 慢？幾慢？負載高先慢定一直慢？</text>
          </g>
          <line x1="400" y1="82" x2="400" y2="108" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrDown)" />

          <g transform="translate(250,110)">
            <rect width="300" height="60" rx="14" fill="url(#gradS2)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow)" />
            <text x="150" y="24" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="700">② 檢查具體 Query</text>
            <text x="150" y="44" textAnchor="middle" fill="#9ca3af" fontSize="11">佢有冇做多餘嘅嘢？有冇更好嘅寫法？</text>
          </g>
          <line x1="400" y1="172" x2="400" y2="198" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrDown)" />

          <g transform="translate(250,200)">
            <rect width="300" height="60" rx="14" fill="url(#gradS3)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="150" y="24" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">③ 加 Index / 調整 Schema</text>
            <text x="150" y="44" textAnchor="middle" fill="#9ca3af" fontSize="11">資料庫結構有冇配合常見嘅查詢模式？</text>
          </g>
          <line x1="400" y1="262" x2="400" y2="288" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrDown)" />

          <g transform="translate(250,290)">
            <rect width="300" height="60" rx="14" fill="url(#gradS4)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="150" y="24" textAnchor="middle" fill="#EF4444" fontSize="13" fontWeight="700">④ 引入 Cache</text>
            <text x="150" y="44" textAnchor="middle" fill="#9ca3af" fontSize="11">重複又計算量大嘅 Query？Cache 返個結果</text>
          </g>
          <line x1="400" y1="352" x2="400" y2="378" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrDown)" />

          <g transform="translate(250,380)" filter="url(#glowPurple)">
            <rect width="300" height="60" rx="14" fill="url(#gradS5)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="150" y="24" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">⑤ 考慮換 Database</text>
            <text x="150" y="44" textAnchor="middle" fill="#9ca3af" fontSize="11">係咪用錯咗 DB 類型？有冇更適合嘅方案？</text>
          </g>

          <g transform="translate(570,45)">
            <rect width="140" height="36" rx="10" fill="rgba(52,211,153,0.1)" stroke="#34d399" strokeWidth="1" />
            <text x="70" y="23" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">搵到問題？修好收工！</text>
          </g>
          <path d="M 552 50 Q 560 55 568 60" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrRight)" />

          <g transform="translate(570,135)">
            <rect width="140" height="36" rx="10" fill="rgba(52,211,153,0.1)" stroke="#34d399" strokeWidth="1" />
            <text x="70" y="23" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">搵到問題？修好收工！</text>
          </g>
          <path d="M 552 140 Q 560 145 568 150" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrRight)" />

          <g transform="translate(570,225)">
            <rect width="140" height="36" rx="10" fill="rgba(52,211,153,0.1)" stroke="#34d399" strokeWidth="1" />
            <text x="70" y="23" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">搵到問題？修好收工！</text>
          </g>
          <path d="M 552 230 Q 560 235 568 240" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrRight)" />

          <text x="230" y="55" textAnchor="end" fill="#4b5563" fontSize="10">最常見</text>
          <text x="230" y="415" textAnchor="end" fill="#4b5563" fontSize="10">最極端</text>
          <line x1="235" y1="65" x2="235" y2="400" stroke="#2a2d3a" strokeWidth="1" strokeDasharray="4,4" />
        </svg>
      </div>

      <div className="use-case">
        <h4>面試核心要點</h4>
        <p>面試官想睇嘅係<strong>系統性思維</strong>——唔係一上嚟就講「加 Cache」或者「換 DB」。呢個流程由上到下，成本越嚟越高，改動越嚟越大。關鍵在於展示會由最簡單、最常見嘅原因開始排查，一步步深入到更複雜嘅解決方案。咁樣面試官就知道呢個係有經驗嘅工程師思維。</p>
      </div>
    </div>
  );
}

function DetailTab() {
  return (
    <div className="card">
      <h2>逐步拆解</h2>
      <div className="subtitle">逐步拆解每一步具體要做啲咩、點樣做</div>

      <div className="flow-step" style={{ marginTop: '20px' }}>
        <div className="flow-number">1</div>
        <h4>收集數據 — 先搞清楚問題</h4>
        <p>
          唔好一嚟就改嘢！先搞清楚：<strong style={{ color: '#fbbf24' }}>邊啲 query 慢</strong>、<strong style={{ color: '#fbbf24' }}>幾慢</strong>（500ms？5 秒？）、<strong style={{ color: '#fbbf24' }}>幾時慢</strong>（高峰期定一直都慢）。唔收集數據就去改嘢，就好似醫生唔做檢查就開藥咁危險。
        </p>
        <div style={{ marginTop: '10px' }}>
          <span className="tag">Slow Query Log</span>
          <span className="tag">Query Profiler</span>
          <span className="tag">APM 監控工具</span>
        </div>
        <div className="code-block"><span className="code-comment">-- MySQL: 開啟慢查詢日誌</span>{'\n'}SET GLOBAL slow_query_log = 'ON';{'\n'}SET GLOBAL long_query_time = 1;  <span className="code-comment">-- 超過 1 秒嘅 query 會被記錄</span>{'\n\n'}<span className="code-comment">-- PostgreSQL: 查睇最慢嘅 query</span>{'\n'}SELECT query, mean_exec_time, calls{'\n'}FROM pg_stat_statements{'\n'}ORDER BY mean_exec_time DESC{'\n'}LIMIT 10;</div>
        <p style={{ marginTop: '8px' }}>
          要留意：如果只係喺高負載時先慢，問題可能係資源不足（CPU、記憶體、連接數），而唔係 query 本身嘅問題。必須分清楚呢兩種情況。
        </p>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">2</div>
        <h4>檢查具體 Query — 佢做緊啲咩？</h4>
        <p>
          用 <strong style={{ color: '#fbbf24' }}>EXPLAIN</strong> 睇一下 query 嘅執行計劃。佢有冇做 full table scan（成個表掃一次）？有冇做啲唔必要嘅 JOIN？有冇 SELECT * 攞晒所有 column，但其實只需要兩三個？必須學識用 EXPLAIN，呢個係 debug 嘅最強武器。
        </p>
        <div className="code-block"><span className="code-comment">-- 用 EXPLAIN 分析 query 點樣跑</span>{'\n'}EXPLAIN ANALYZE{'\n'}SELECT u.name, o.total{'\n'}FROM users u{'\n'}JOIN orders o ON u.id = o.user_id{'\n'}WHERE u.created_at &gt; '2024-01-01';{'\n\n'}<span className="code-comment">-- 留意：Seq Scan = 冇用 Index，可能好慢！</span>{'\n'}<span className="code-comment">-- 留意：Nested Loop = 可能有 N+1 問題</span></div>
        <div style={{ marginTop: '10px' }}>
          <span className="tag red">SELECT *（攞太多嘢）</span>
          <span className="tag red">N+1 Query 問題</span>
          <span className="tag red">Full Table Scan</span>
        </div>
        <p style={{ marginTop: '8px' }}>
          好多時候，問題就係 query 寫得唔好。例如用 ORM 嘅時候，唔知不覺做咗 N+1 query（一條 query 攞 100 個 user，然後逐個 user 再發一條 query 攞 order——即係 101 條 query，但其實一條 JOIN 就搞掂）。要特別留意呢個陷阱。
        </p>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">3</div>
        <h4>加 Index / 調整 Schema</h4>
        <p>
          如果 query 本身寫得冇問題，但仍然慢，就要睇下 Database 嘅結構有冇配合常見嘅查詢模式。最常見嘅做法就係<strong style={{ color: '#34d399' }}>加 Index</strong>。重點係：Index 就係資料庫嘅「目錄」。
        </p>
        <div className="code-block"><span className="code-comment">-- 幫經常被 WHERE 同 JOIN 用到嘅 column 加 Index</span>{'\n'}CREATE INDEX idx_users_created_at ON users(created_at);{'\n'}CREATE INDEX idx_orders_user_id ON orders(user_id);{'\n\n'}<span className="code-comment">-- Composite Index：如果成日一齊查</span>{'\n'}CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);</div>
        <div style={{ marginTop: '10px' }}>
          <span className="tag green">加 Index</span>
          <span className="tag green">Composite Index</span>
          <span className="tag yellow">Denormalization</span>
          <span className="tag yellow">Partitioning</span>
        </div>
        <p style={{ marginTop: '8px' }}>
          再進一步：可以考慮 <strong>Denormalization</strong>（故意加冗餘欄位，減少 JOIN）或者 <strong>Table Partitioning</strong>（將一個超大嘅 table 拆成幾個細嘅）。但要留意，呢啲都係 trade-off——加速讀取嘅同時，寫入可能會慢啲。
        </p>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">4</div>
        <h4>引入 Cache</h4>
        <p>
          如果有啲 query 好重複又好耗資源（例如每個用戶都會觸發嘅 dashboard 統計 query），建議喺 Database 同 Server 之間加一層 <strong style={{ color: '#EF4444' }}>Cache（例如 Redis）</strong>。第一次查完就存落 Cache，之後直接從 Cache 返回，唔使再打 Database。
        </p>
        <p>
          但要注意：如果每次 query 都唔同（唔重複），Cache 就冇用。Cache 只適合<strong>讀多寫少、結果可以重用</strong>嘅場景。唔好乜都用 Cache 嚟解決。
        </p>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">5</div>
        <h4>考慮換 Database</h4>
        <p>
          如果以上全部都試過仲係慢，可能根本用錯咗 Database 類型。唔同嘅 Database 擅長做唔同嘅嘢，要揀啱工具：
        </p>
        <div style={{ marginTop: '10px' }}>
          <span className="tag">PostgreSQL — 複雜 query、事務</span>
          <span className="tag">Elasticsearch — 全文搜索、模糊搜索</span>
          <span className="tag">Redis — Key-Value 快速讀寫</span>
          <span className="tag">ClickHouse — 大數據分析</span>
          <span className="tag">MongoDB — 靈活嘅 document 結構</span>
        </div>
        <p style={{ marginTop: '8px' }}>
          舉個例子：用 PostgreSQL 做 fuzzy search（模糊搜索），技術上行得通，但換成 <strong style={{ color: '#34d399' }}>Elasticsearch</strong> 可以快幾十倍。核心原則就係：選啱工具比硬優化重要好多。
        </p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰技巧</h2>
      <div className="subtitle">面試同真實開發都用得著嘅 tips</div>

      <div className="key-points">
        <div className="key-point">
          <h4>EXPLAIN 係最好嘅朋友</h4>
          <p>任何時候覺得 query 慢，第一步就係 EXPLAIN。佢會告訴 Database 用咗咩 Index、做咗幾多次掃描、預計處理幾多行。呢啲資訊係 debug 嘅基礎，一定要熟練。</p>
        </div>
        <div className="key-point">
          <h4>避免 SELECT *</h4>
          <p>唔好習慣性寫 SELECT *。如果只需要 name 同 email，就寫 SELECT name, email。少攞嘅 data 少咗 I/O，自然就快啲。呢個係最簡單但最有效嘅習慣。</p>
        </div>
        <div className="key-point">
          <h4>N+1 Query 問題</h4>
          <p>用 ORM（例如 Prisma、Sequelize）嘅時候特別容易中招。一個 loop 入面每次都發一條 query——應該用 JOIN 或者 batch query 取代。呢個係最常見嘅效能殺手。</p>
        </div>
        <div className="key-point">
          <h4>慢 Query 監控</h4>
          <p>生產環境一定要開 slow query log。設定 threshold（例如 500ms），定期 review 最慢嘅 query。唔好等用戶投訴先至去查，主動監控先係專業嘅做法。</p>
        </div>
        <div className="key-point">
          <h4>Index 唔係萬能</h4>
          <p>要注意，加太多 Index 會拖慢寫入速度（每次 INSERT / UPDATE 都要更新 Index）。只喺經常被查詢嘅 column 加 Index，唔好亂加。必須有取捨嘅思維。</p>
        </div>
        <div className="key-point">
          <h4>連接池（Connection Pool）</h4>
          <p>如果問題係「好多 query 等緊連接」而唔係「query 本身慢」，就要睇下 connection pool 係咪太細。調大 pool size 或者用 PgBouncer 呢類 pooler，好多時候就搞掂。</p>
        </div>
      </div>

      <div className="use-case" style={{ marginTop: '24px' }}>
        <h4>面試答題框架</h4>
        <p>
          面試嘅時候，跟住呢個順序答就唔會錯：<br />
          <strong style={{ color: '#6366f1' }}>① 收集數據</strong> → <strong style={{ color: '#f59e0b' }}>② 檢查 Query</strong> → <strong style={{ color: '#10B981' }}>③ 加 Index / 調 Schema</strong> → <strong style={{ color: '#EF4444' }}>④ 加 Cache</strong> → <strong style={{ color: '#8B5CF6' }}>⑤ 換 Database</strong><br /><br />
          由成本最低、最常見嘅原因開始，逐步深入到成本最高、最極端嘅方案。跟住呢個框架答，展示咗系統性思維，面試官一定會欣賞。
        </p>
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
        <h4>Prompt 1 — 診斷同修復慢 Query</h4>
        <div className="prompt-text">幫手分析同優化以下慢 Query 嘅效能問題。{'\n\n'}Database：<span className="placeholder">[PostgreSQL / MySQL]</span>{'\n'}Table 結構：{'\n'}- users 表：id, name, email, created_at（<span className="placeholder">[100 萬 / 1000 萬]</span> 行）{'\n'}- orders 表：id, user_id, total, status, created_at（<span className="placeholder">[500 萬 / 5000 萬]</span> 行）{'\n\n'}慢 Query：{'\n'}<span className="placeholder">[貼上需要優化嘅 SQL Query]</span>{'\n\n'}請做以下分析：{'\n'}1. 用 EXPLAIN ANALYZE 解讀執行計劃，指出樽頸位{'\n'}2. 檢查有冇 Full Table Scan、N+1 問題、不必要嘅 JOIN{'\n'}3. 建議需要加嘅 Index（包括 Composite Index）{'\n'}4. 提供優化後嘅 Query 寫法{'\n'}5. 如果適用，建議 Denormalization 或 Partitioning 策略{'\n'}6. 估算優化前後嘅執行時間差異</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Database Indexing 策略</h4>
        <div className="prompt-text">幫手為一個 <span className="placeholder">[電商平台 / SaaS 應用 / 社交平台]</span> 設計完整嘅 Database Indexing 策略。{'\n\n'}Database：<span className="placeholder">[PostgreSQL / MySQL]</span>{'\n\n'}主要 Table 同常見 Query Pattern：{'\n'}<span className="placeholder">[描述主要嘅 table 結構同最常用嘅查詢模式]</span>{'\n\n'}要求：{'\n'}1. 分析每個常用 Query，建議最適合嘅 Index 類型（B-Tree、Hash、GIN、GiST）{'\n'}2. 設計 Composite Index，考慮 column 順序對效能嘅影響{'\n'}3. 識別唔需要嘅 Index（避免 over-indexing 拖慢寫入）{'\n'}4. 建議 Partial Index 同 Covering Index 嘅使用場景{'\n'}5. 提供 Index 維護計劃（REINDEX、VACUUM 頻率）{'\n'}6. 估算加 Index 後對讀寫效能嘅影響{'\n'}7. 寫出所有 CREATE INDEX 語句，附帶解釋</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 建立 Database 效能監控系統</h4>
        <div className="prompt-text">用 <span className="placeholder">[Node.js / Python]</span> 建立一個 Database 效能監控同自動告警系統。{'\n\n'}監控目標：<span className="placeholder">[PostgreSQL / MySQL]</span>{'\n\n'}功能需求：{'\n'}- 自動收集 Slow Query Log（threshold: <span className="placeholder">[500ms / 1s]</span>）{'\n'}- 定期分析 pg_stat_statements / performance_schema 嘅數據{'\n'}- 識別 Top 10 最慢嘅 Query 同最頻繁嘅 Query{'\n'}- 監控 Connection Pool 使用率{'\n'}- 檢測 Missing Index（分析 sequential scan 嘅頻率）{'\n'}- 當出現異常時發送告警（Slack / Email）{'\n'}- 提供一個簡單嘅 Dashboard UI 顯示監控數據{'\n'}- 包含自動建議功能（例如：「呢個 Query 建議加 Index」）</div>
      </div>
    </div>
  );
}

export default function FixSlowDatabase() {
  return (
    <>
      <TopicTabs
        title="點樣 Debug 慢嘅 Database"
        subtitle="面試必問嘅經典題：一步步排查資料庫效能問題"
        tabs={[
          { id: 'overview', label: '① 排查流程', content: <OverviewTab /> },
          { id: 'detail', label: '② 逐步拆解', content: <DetailTab /> },
          { id: 'practice', label: '③ 實戰技巧', premium: true, content: <PracticeTab /> },
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
