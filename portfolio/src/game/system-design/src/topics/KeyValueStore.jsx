import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'redis', label: 'Redis' },
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
  { slug: 'url-shortener', label: 'URL Shortener 短網址服務' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>分佈式 Key-Value Store 核心概念</h2>
      <div className="subtitle">用 key 搵 value，但係要分佈喺多台機器上面</div>
      <p>
        呢個係一個好核心嘅概念。好似 Redis、DynamoDB、Cassandra 咁，就係 Key-Value Store。核心問題係：當數據量好大嘅時候，要放喺多台機器，一個 key 應該去邊台機器？點樣做 replication？答案係用 <strong style={{ color: '#fbbf24' }}>Consistent Hashing（一致性哈希）</strong> 做 partition，用 <strong style={{ color: '#34d399' }}>Quorum</strong> 做 replication。呢兩個核心機制，面試同實戰都會用到。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowYellow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradYellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGray" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2a2d3a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          </defs>

          {/* Client */}
          <g transform="translate(20,150)">
            <rect width="110" height="65" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="27" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Client</text>
            <text x="55" y="47" textAnchor="middle" fill="#9ca3af" fontSize="10">讀寫請求</text>
          </g>

          {/* Coordinator */}
          <g transform="translate(180,130)">
            <rect width="140" height="85" rx="12" fill="url(#gradYellow)" stroke="#F59E0B" strokeWidth="2" filter="url(#glowYellow)" />
            <text x="70" y="28" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Coordinator</text>
            <text x="70" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">路由、協調</text>
            <text x="70" y="68" textAnchor="middle" fill="#F59E0B" fontSize="9">Consistent Hash</text>
          </g>

          {/* Node 1 Primary */}
          <g transform="translate(400,35)">
            <rect width="140" height="68" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="70" y="27" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Node 1 (Primary)</text>
            <text x="70" y="47" textAnchor="middle" fill="#34d399" fontSize="10">主節點</text>
          </g>

          {/* Node 2 Replica */}
          <g transform="translate(400,130)">
            <rect width="130" height="58" rx="12" fill="url(#gradGray)" stroke="#6B7280" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="24" textAnchor="middle" fill="#9ca3af" fontSize="11" fontWeight="700">Node 2</text>
            <text x="65" y="44" textAnchor="middle" fill="#6b7280" fontSize="9">Replica</text>
          </g>

          {/* Node 3 Replica */}
          <g transform="translate(400,215)">
            <rect width="130" height="58" rx="12" fill="url(#gradGray)" stroke="#6B7280" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="24" textAnchor="middle" fill="#9ca3af" fontSize="11" fontWeight="700">Node 3</text>
            <text x="65" y="44" textAnchor="middle" fill="#6b7280" fontSize="9">Replica</text>
          </g>

          {/* Hash Ring */}
          <ellipse cx="255" cy="340" rx="95" ry="45" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5,3" />
          <circle cx="200" cy="315" r="4" fill="#a5b4fc" />
          <circle cx="310" cy="320" r="4" fill="#a5b4fc" />
          <circle cx="250" cy="370" r="4" fill="#a5b4fc" />
          <text x="255" y="332" textAnchor="middle" fill="#a5b4fc" fontSize="10">Hash Ring</text>
          <text x="255" y="355" textAnchor="middle" fill="#6366f1" fontSize="11" fontWeight="700">key → partition</text>

          {/* Arrows */}
          <path d="M132,180 C150,178 160,170 178,168" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="148" y="162" fill="#a5b4fc" fontSize="10">Request</text>

          <path d="M322,145 C350,120 370,90 398,75" stroke="#10B981" strokeWidth="1.5" fill="none" markerEnd="url(#arrGreen)" />
          <path d="M322,165 C350,162 370,160 398,158" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arrGreen)" />
          <text x="355" y="148" fill="#34d399" fontSize="9">Replication</text>
          <path d="M322,190 C350,205 370,228 398,240" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arrGreen)" />

          <path d="M185,215 C190,260 215,290 230,310" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4,2" fill="none" markerEnd="url(#arrYellow)" />
          <text x="190" y="270" fill="#fbbf24" fontSize="9">hash(key)</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>完整流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>Client 發送讀寫請求去 Coordinator——可以理解為「交通指揮官」。</span></li>
        <li><span className="step-num">2</span><span>Coordinator 用 Consistent Hashing 搵出呢個 key 屬於邊個 partition，對應邊個 Primary Node。重點係：hash ring 上面，每個 node 負責一段範圍。</span></li>
        <li><span className="step-num">3</span><span>寫入時：Primary 接收寫入，然後同步去 Replica nodes。呢步就係 replication 嘅核心。</span></li>
        <li><span className="step-num">4</span><span>讀取時：可以讀 Primary 或者 Replica，視乎對 consistency 嘅要求有幾高。</span></li>
      </ol>
    </div>
  );
}

function QuorumTab() {
  return (
    <div className="card">
      <h2>Quorum 機制詳解</h2>
      <div className="subtitle">W + R &gt; N 保證讀到最新數據</div>
      <p>
        呢個係最關鍵嘅公式。假設有 N 個 replica。寫入時要等 W 個 node 確認先算成功；讀取時要等 R 個 node 回應。只要 <strong style={{ color: '#34d399' }}>W + R &gt; N</strong>，就一定可以保證讀到最新嘅寫入——因為讀同寫一定有 overlap。
      </p>
      <p>具體例子：N=3，W=2，R=2。寫入 2 個成功，讀取 2 個，讀到嘅 2 個入面至少有一個係寫入過嘅 node。畫個圖就會好清楚。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>Consistent Hashing</h4>
          <p>核心原理：將 key 映射到 hash ring 上面，每個 node 負責一段。加減 node 嘅時候只會影響相鄰 node，唔會 rehash 全部 key。呢個就係 Consistent Hashing 嘅威力。</p>
        </div>
        <div className="key-point">
          <h4>Quorum (W+R&gt;N)</h4>
          <p>寫 W 個、讀 R 個，W+R&gt;N 確保 read-after-write consistency。可以 trade-off：W 大啲讀快啲，R 大啲寫快啲。建議根據實際 workload 再揀。</p>
        </div>
        <div className="key-point">
          <h4>Vector Clock</h4>
          <p>處理並發更新嘅時候，需要用 vector clock 判斷邊個版本新啲，或者 detect conflict 要 merge。呢個係處理 conflict 嘅關鍵工具。</p>
        </div>
        <div className="key-point">
          <h4>Gossip Protocol</h4>
          <p>Node 之間用 gossip 傳播 membership 同 metadata。無中心 node，任何 node 都可以加入或離開集群。關鍵在於：gossip 就好似流言咁傳開，最終全部 node 都會知。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">設計 KV Store 嘅關鍵決策</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Partition 策略</h4>
          <p>Consistent Hashing 之外，必須要用 Virtual Nodes 解決 load imbalance——每個 physical node 對應多個 virtual node，咁分佈先會均勻。</p>
        </div>
        <div className="key-point">
          <h4>Consistency vs Availability</h4>
          <p>必須理解 CAP 定理：network partition 時要揀 CP 定 AP。Dynamo 系揀 AP（eventual consistency）；想要強一致就用 CP。關鍵在於先搞清楚 business 需要邊種。</p>
        </div>
        <div className="key-point">
          <h4>Hinted Handoff</h4>
          <p>Replica node 暫時 down 咗，其他 node 會幫手 hold 住數據，等 recover 再送返去。重點係，呢個機制大幅提升 availability。</p>
        </div>
        <div className="key-point">
          <h4>Compaction</h4>
          <p>LSM-tree 結構會有大量 SST 文件，需要定期做 compaction 合併，reclaim 空間、加速讀取。唔好忽略呢步，會影響性能。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>總結</h4>
        <p>Amazon DynamoDB、Cassandra、Redis Cluster 都係呢種架構。重點理解 Dynamo 嘅設計思路，因為呢套設計係始祖，影響咗好多 NoSQL 系統。掌握咗呢啲概念，設計分佈式存儲就有底氣。</p>
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
        <h4>Prompt 1 — 設計 Key-Value Store 架構</h4>
        <div className="prompt-text">{'幫手設計一個分佈式 Key-Value Store，應用場景係 '}<span className="placeholder">[具體用途，例如：Session 管理、用戶 Profile 快取、排行榜]</span>{'。\n\n數據規模：'}<span className="placeholder">[預計數據量，例如：10 億條記錄、每條 1KB]</span>{'\n讀寫比例：'}<span className="placeholder">[讀寫比，例如：讀 90% 寫 10%]</span>{'\n一致性要求：'}<span className="placeholder">[Strong Consistency / Eventual Consistency]</span>{'\n\n要求：\n1. 設計 Consistent Hashing 做 partition，包括 Virtual Node 嘅數量建議\n2. 設計 Replication 策略，確定 N / W / R 嘅數值同原因\n3. 畫出完整嘅讀寫流程圖，包括 Coordinator 嘅角色\n4. 處理 node failure 嘅 Hinted Handoff 機制\n5. 設計 conflict resolution 方案（Vector Clock / Last Write Wins）\n6. 提供具體嘅 data model 同 API 設計'}</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Redis vs DynamoDB vs Cassandra 選型</h4>
        <div className="prompt-text">{'根據以下業務需求，分析應該揀 Redis、DynamoDB 定 Cassandra 作為 KV Store：\n\n業務場景：'}<span className="placeholder">[描述業務場景，例如：即時通訊 App 嘅訊息存儲、IoT 設備數據收集]</span>{'\n數據特徵：'}<span className="placeholder">[數據大小、TTL 需求、查詢模式]</span>{'\n團隊背景：'}<span className="placeholder">[團隊技術棧同運維能力]</span>{'\n預算範圍：'}<span className="placeholder">[每月預算]</span>{'\n\n要求：\n1. 逐個分析三種方案嘅優缺點，針對呢個場景\n2. 對比 latency、throughput、consistency model、運維成本\n3. 考慮 scale-out 能力同數據持久化策略\n4. 建議最終方案，並提供 migration path\n5. 俾出選定方案嘅 schema 設計同配置建議\n6. 預估唔同規模下嘅成本對比'}</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 實作 Consistent Hashing 模組</h4>
        <div className="prompt-text">{'用 '}<span className="placeholder">[程式語言，例如：Python / Go / Java]</span>{' 實作一個 Consistent Hashing 模組：\n\n要求：\n1. 實現 hash ring 數據結構，支援 add/remove node\n2. 實現 Virtual Node 機制，每個 physical node 對應 '}<span className="placeholder">[數量，例如：150]</span>{' 個 virtual node\n3. 實現 key 到 node 嘅 mapping 邏輯\n4. 加入 replication factor，自動搵出 N 個 replica node\n5. 寫完整嘅 unit test，測試 node 加入/移除後嘅 key 重新分佈情況\n6. 輸出統計：每個 node 負責嘅 key 數量分佈，驗證負載均衡效果'}</div>
      </div>
    </div>
  );
}

const tabs = [
  { key: 'overview', label: '① 整體架構', content: <OverviewTab /> },
  { key: 'quorum', label: '② Quorum 機制', content: <QuorumTab /> },
  { key: 'practice', label: '③ 實戰要點', content: <PracticeTab />, premium: true },
  { key: 'ai-viber', label: '④ AI Viber', content: <AiViberTab />, premium: true },
];

export default function KeyValueStore() {
  return (
    <>
      <TopicTabs
        title="Key-Value Store 鍵值存儲"
        subtitle="深入了解分佈式 KV 存儲，partition 同 replication 點樣設計"
        tabs={tabs}
      />
      <QuizRenderer data={quizData} />
      <RelatedTopics topics={relatedTopics} />
    </>
  );
}
