import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Horizontal Sharding 同 Vertical Sharding 最大嘅分別係咩？',
    options: [
      { text: 'Horizontal 係按 row 分，Vertical 係按 column 分', correct: true, explanation: 'Horizontal Sharding 將同一個 table 嘅 row 分散去唔同嘅 shard（例如 user_id 1-1M 去 Shard 1，1M-2M 去 Shard 2）。Vertical Sharding 係將唔同嘅 column 分去唔同嘅 table 或者 DB（例如 user_profile 同 user_activity 分開）。' },
      { text: 'Horizontal 只適用於 NoSQL，Vertical 只適用於 SQL', correct: false, explanation: '兩種 sharding 策略都可以用喺 SQL 同 NoSQL。呢個同 database 類型冇關，係 data partitioning 嘅策略。' },
      { text: 'Vertical 比 Horizontal 永遠更快', correct: false, explanation: '冇絕對嘅快慢之分。要睇具體嘅 query pattern 同數據量。Horizontal sharding 喺大規模數據分散上更有優勢。' },
      { text: '兩者冇分別，只係叫法唔同', correct: false, explanation: '佢哋係完全唔同嘅分片策略。Horizontal 係拆 row，Vertical 係拆 column，應用場景同 trade-off 都唔一樣。' },
    ],
  },
  {
    question: '揀 Shard Key 嘅時候最重要考慮咩因素？',
    options: [
      { text: '揀最短嘅 column 做 shard key，節省空間', correct: false, explanation: 'Shard key 嘅長度唔係最重要嘅因素。分佈均勻性同 query pattern 先係最關鍵。' },
      { text: '確保 shard key 能夠均勻分佈數據，避免 hotspot', correct: true, explanation: '好嘅 shard key 要令數據均勻分佈喺所有 shard 上面。如果某啲 shard key 值特別多（例如用 country 做 shard key，但 90% 用戶都喺同一個國家），就會造成 hotspot，令某個 shard 過載。' },
      { text: '一定要用 auto-increment ID 做 shard key', correct: false, explanation: 'Auto-increment ID 做 shard key 會導致新數據全部集中喺最後一個 shard，造成 write hotspot。用 hash-based sharding 先可以分散寫入。' },
      { text: '揀一個永遠唔會改變嘅 column', correct: false, explanation: '唔變嘅 column 係加分條件但唔係最重要嘅。均勻分佈先係首要考慮，之後先考慮 immutability 同 query pattern。' },
    ],
  },
  {
    question: 'Consistent Hashing 喺 sharding 入面嘅主要優勢係咩？',
    options: [
      { text: '令所有 query 都唔使跨 shard', correct: false, explanation: 'Consistent hashing 唔能解決 cross-shard query 嘅問題。佢解決嘅係加減 shard 時數據搬遷嘅問題。' },
      { text: '加減 shard 節點時，只需要搬移少量數據，唔使全部重新分佈', correct: true, explanation: '傳統 hash（key % N）加一個 shard 會令幾乎所有 key 重新分佈。Consistent hashing 用 hash ring，加減節點只影響相鄰節點嘅 key，大大減少數據搬遷量。' },
      { text: '完全消除 shard 之間嘅數據不均勻', correct: false, explanation: 'Consistent hashing 唔能保證完美均勻。需要用 virtual nodes（虛擬節點）嚟改善均勻性，但仍然可能有一定程度嘅偏斜。' },
      { text: '令 shard 唔需要備份', correct: false, explanation: '呢個同 backup 冇關。Consistent hashing 只係決定 key 去邊個 shard，同 replication/backup 策略係獨立嘅。' },
    ],
  },
  {
    question: 'Resharding（重新分片）最大嘅挑戰係咩？',
    options: [
      { text: '需要停機先可以做', correct: false, explanation: '現代嘅 resharding 方案（例如 Vitess、ProxySQL）可以做到 online resharding，唔需要停機。但過程複雜，需要 double-write 同 data verification。' },
      { text: '需要搬移大量數據，同時保持服務可用同數據一致', correct: true, explanation: 'Resharding 要喺搬移 TB 級數據嘅同時，確保讀寫正常運作、數據唔會丟失或重複。需要 shadow traffic、double-write、data verification 等多個步驟配合。呢個係 sharding 架構入面最複雜嘅操作之一。' },
      { text: '會令所有 index 失效', correct: false, explanation: '每個 shard 嘅 local index 唔會受影響。Global secondary index 可能需要 rebuild，但 local index 喺 resharding 後仍然有效。' },
      { text: 'Resharding 完成後唔可以再 reshard', correct: false, explanation: 'Resharding 可以做多次，冇次數限制。只係每次都需要仔細規劃同執行。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'pick-database', label: '點揀 Database' },
  { slug: 'distributed-cache', label: '分佈式快取' },
  { slug: 'key-value-store', label: 'Key-Value Store 鍵值存儲' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Database 分片策略</h2>
      <div className="subtitle">Horizontal / Vertical / Shard Key 點揀</div>
      <p>
        當你嘅 Database 數據量大到一台 server 撐唔住，query 越嚟越慢，磁盤空間不足嘅時候，就要考慮 <strong style={{ color: '#3B82F6' }}>Sharding（分片）</strong>。
        簡單講就係將一個大 database 拆成多個細嘅 shard，每個 shard 只負責一部分數據。
      </p>
      <p>
        Sharding 有兩種主要策略：<strong style={{ color: '#34d399' }}>Horizontal Sharding</strong>（按 row 分）同 <strong style={{ color: '#fbbf24' }}>Vertical Sharding</strong>（按 column 分）。大部分人講 sharding 嘅時候，都係指 horizontal sharding。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gradSingle" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#f87171', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradShard1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradShard2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#34d399', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradShard3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#fbbf24', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradHash" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#a78bfa', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#a78bfa" /></marker>
          </defs>

          {/* Single DB (before sharding) */}
          <rect x="20" y="140" width="160" height="90" rx="14" fill="url(#gradSingle)" filter="url(#shadow)" />
          <text x="100" y="172" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="700">Single DB</text>
          <text x="100" y="195" textAnchor="middle" fill="#fca5a5" fontSize="11">10TB 數據</text>
          <text x="100" y="212" textAnchor="middle" fill="#fca5a5" fontSize="11">撐唔住啦！</text>

          {/* Hash Function */}
          <rect x="280" y="155" width="150" height="60" rx="30" fill="url(#gradHash)" filter="url(#shadow)" />
          <text x="355" y="180" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">Hash Function</text>
          <text x="355" y="198" textAnchor="middle" fill="#ddd6fe" fontSize="10">hash(shard_key) % N</text>

          {/* Arrow: Single DB → Hash */}
          <path d="M 182 185 Q 230 185 278 185" fill="none" stroke="#a78bfa" strokeWidth="2" markerEnd="url(#arrPurple)" />

          {/* Shard 1 */}
          <rect x="530" y="30" width="220" height="80" rx="14" fill="url(#gradShard1)" filter="url(#shadow)" />
          <text x="640" y="58" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="700">Shard 1</text>
          <text x="640" y="78" textAnchor="middle" fill="#93c5fd" fontSize="11">user_id 0 ~ 999,999</text>
          <text x="640" y="96" textAnchor="middle" fill="#9ca3af" fontSize="10">~3.3TB</text>

          {/* Shard 2 */}
          <rect x="530" y="150" width="220" height="80" rx="14" fill="url(#gradShard2)" filter="url(#shadow)" />
          <text x="640" y="178" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="700">Shard 2</text>
          <text x="640" y="198" textAnchor="middle" fill="#6ee7b7" fontSize="11">user_id 1M ~ 1,999,999</text>
          <text x="640" y="216" textAnchor="middle" fill="#9ca3af" fontSize="10">~3.3TB</text>

          {/* Shard 3 */}
          <rect x="530" y="270" width="220" height="80" rx="14" fill="url(#gradShard3)" filter="url(#shadow)" />
          <text x="640" y="298" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="700">Shard 3</text>
          <text x="640" y="318" textAnchor="middle" fill="#fde68a" fontSize="11">user_id 2M ~ 2,999,999</text>
          <text x="640" y="336" textAnchor="middle" fill="#9ca3af" fontSize="10">~3.3TB</text>

          {/* Arrows: Hash → Shards */}
          <path d="M 432 170 Q 480 100 528 70" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <path d="M 432 185 Q 480 185 528 190" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <path d="M 432 200 Q 480 270 528 310" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrAmber)" />

          {/* Bottom label */}
          <rect x="200" y="370" width="400" height="40" rx="10" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" strokeWidth="1.5" />
          <text x="400" y="395" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="600">Horizontal Sharding：每個 Shard 存一部分 Row</text>
        </svg>
      </div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong style={{ color: '#f87171' }}>點解需要 Sharding？</strong> 當一台 DB server 嘅 CPU、Memory 或 Disk 去到極限，就算 index 點優化都幫唔到。唯一出路就係將數據分散去多台機。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong style={{ color: '#3B82F6' }}>Horizontal Sharding</strong>：按 row 分。用一個 <code style={{ color: '#60a5fa' }}>shard key</code>（例如 user_id）做 hash，決定每行數據去邊個 shard。每個 shard 嘅 schema 完全一樣。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong style={{ color: '#fbbf24' }}>Vertical Sharding</strong>：按 column 分。將唔常用嘅 column（例如用戶 bio、大段文字）分去另一個 DB。適合有啲 column 特別大或者存取頻率差好遠嘅場景。</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span><strong style={{ color: '#34d399' }}>Hash Function 路由</strong>：Application 層用 <code style={{ color: '#60a5fa' }}>hash(shard_key) % N</code> 計算目標 shard。呢個計算要快、要穩定、要均勻分佈。</span>
        </li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階 Sharding 策略</h2>
      <div className="subtitle">Shard Key 選擇 / Consistent Hashing / Resharding</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Shard Key 選擇策略</h4>
          <p>
            揀 shard key 係 sharding 入面最關鍵嘅決定。好嘅 shard key 要滿足三個條件：<strong style={{ color: '#3B82F6' }}>高基數</strong>（cardinality 夠大，唔會只有幾個值）、<strong style={{ color: '#34d399' }}>均勻分佈</strong>（避免 hotspot）、同埋<strong style={{ color: '#fbbf24' }}>同 query pattern 對齊</strong>（常用嘅 query 唔使跨 shard）。例如電商用 <code style={{ color: '#60a5fa' }}>user_id</code> 做 shard key，因為用戶嘅訂單、購物車通常只需要查自己嘅數據。
          </p>
        </div>
        <div className="key-point">
          <h4>Consistent Hashing</h4>
          <p>
            普通 <code style={{ color: '#60a5fa' }}>hash % N</code> 嘅問題係：加一個 shard（N 變 N+1），幾乎所有 key 都要重新計算同搬移。Consistent hashing 用一個虛擬嘅 hash ring，每個 shard 佔一段範圍。加減 shard 只會影響相鄰嘅範圍，搬移量大大減少。再配合 <strong style={{ color: '#fbbf24' }}>virtual nodes</strong>，每個實體 shard 喺 ring 上面有多個虛擬點，數據分佈更加均勻。
          </p>
        </div>
        <div className="key-point">
          <h4>Resharding 挑戰</h4>
          <p>
            Resharding 係 sharding 架構最痛苦嘅操作。需要搬移大量數據，同時保持服務正常運作。常見做法係 <strong style={{ color: '#3B82F6' }}>double-write</strong>（新舊 shard 同時寫入）+ <strong style={{ color: '#34d399' }}>shadow read</strong>（驗證新 shard 數據正確）+ <strong style={{ color: '#fbbf24' }}>gradual cutover</strong>（逐步切換流量）。整個過程可能需要數日至數週。
          </p>
        </div>
        <div className="key-point">
          <h4>Cross-Shard Queries</h4>
          <p>
            Sharding 最大嘅 trade-off 係 cross-shard query。例如你用 <code style={{ color: '#60a5fa' }}>user_id</code> 做 shard key，但想 query「所有城市嘅訂單總額」就要 fan-out 去每個 shard 再 aggregate。解法包括：建立 <strong style={{ color: '#fbbf24' }}>global secondary index</strong>、用 <strong style={{ color: '#34d399' }}>denormalization</strong> 冗餘存儲、或者用 CQRS pattern 分開讀寫模型。
          </p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰 Sharding 技巧</h2>
      <div className="subtitle">常見 Shard Key Patterns / Hotspot 防護 / 遷移策略</div>

      <div className="key-points">
        <div className="key-point">
          <h4>常見 Shard Key Patterns</h4>
          <p>
            <strong style={{ color: '#3B82F6' }}>Range-based</strong>：按時間或 ID 範圍分（簡單但容易 hotspot）。
            <strong style={{ color: '#34d399' }}>Hash-based</strong>：用 hash function 均勻分佈（最常用）。
            <strong style={{ color: '#fbbf24' }}>Compound key</strong>：用多個 column 組合做 shard key（例如 tenant_id + user_id），適合 multi-tenant 系統。
            <strong style={{ color: '#f87171' }}>Geography-based</strong>：按地理位置分（適合有 data residency 要求嘅場景）。
          </p>
        </div>
        <div className="key-point">
          <h4>Hotspot 防護</h4>
          <p>
            Hotspot 係 sharding 最常見嘅問題。預防方法：1) 避免用低基數嘅 column 做 shard key。2) 對於 celebrity problem（某啲 key 寫入量特別大），可以加 random suffix 分散到多個 shard。3) 定期監控每個 shard 嘅 QPS 同 data size，發現傾斜就要及早處理。
          </p>
        </div>
        <div className="key-point">
          <h4>遷移策略</h4>
          <p>
            從 single DB 遷移到 sharded 架構嘅步驟：1) 加一個 <code style={{ color: '#60a5fa' }}>routing layer</code>（proxy）喺 app 同 DB 之間。2) 先做 read replica，確認 replication 穩定。3) 開始 double-write 到新 shard。4) 用 shadow traffic 驗證數據一致性。5) 逐步切換讀取流量。6) 最後切換寫入流量，完成遷移。
          </p>
        </div>
        <div className="key-point">
          <h4>工具同框架</h4>
          <p>
            唔好自己從零實現 sharding。<strong style={{ color: '#3B82F6' }}>Vitess</strong>（YouTube 開發，用於 MySQL sharding）、<strong style={{ color: '#34d399' }}>Citus</strong>（PostgreSQL 嘅 sharding extension）、<strong style={{ color: '#fbbf24' }}>MongoDB</strong> 原生支援 auto-sharding。揀啱工具可以減少好多痛苦。
          </p>
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
        <h4>Prompt 1 — 設計 Database Sharding 架構</h4>
        <div className="prompt-text">
          {'幫我設計一個 Database Sharding 架構，場景係 [電商平台 / 社交媒體 / SaaS multi-tenant]，預計數據量 [X] TB，日均 QPS [Y]。\n\n要求包括：\n- 建議用 Horizontal 定 Vertical Sharding，附上理由\n- 揀出最適合嘅 Shard Key，分析 cardinality、分佈均勻性同 query pattern\n- 設計 Consistent Hashing 方案，包括 virtual nodes 數量建議\n- 處理 Cross-Shard Query 嘅策略（fan-out / denormalization / global index）\n- 列出 Resharding 計劃嘅步驟同 rollback 方案\n- 監控指標：每個 shard 嘅 QPS、data size、replication lag\n- 提供 routing layer 嘅 code 示範，語言用 [Node.js / Python / Go]'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Shard Key 選擇分析同 Hotspot 防護</h4>
        <div className="prompt-text">
          {'分析以下場景嘅最佳 Shard Key 選擇：\n\n系統描述：[例如：即時通訊系統，10 億條訊息/日，用戶遍佈全球]\nTable 結構：[列出主要 table 同 column]\n常用 Query Pattern：[列出 top 5 最頻繁嘅 query]\n\n請分析：\n- 比較至少 3 個候選 Shard Key 嘅優劣\n- 每個 key 嘅 cardinality 同分佈預測\n- Hotspot 風險評估同防護措施\n- Cross-shard query 嘅頻率同成本估算\n- 如果有 celebrity problem（例如某啲用戶訊息量極大），點樣處理\n- 最終建議邊個 Shard Key，附上完整嘅理由\n- 提供 sharding middleware 嘅配置範例'}
        </div>
      </div>
    </div>
  );
}

export default function DatabaseSharding() {
  return (
    <>
      <TopicTabs
        title="Database 分片策略"
        subtitle="搞清楚 Horizontal / Vertical Sharding 同 Shard Key 嘅揀法"
        tabs={[
          { id: 'overview', label: '① 點解要 Sharding', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階策略', content: <AdvancedTab /> },
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
