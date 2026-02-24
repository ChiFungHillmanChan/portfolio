import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'CAP 定理入面，Partition Tolerance 係指咩？',
    options: [
      { text: '系統可以容忍 Server 記憶體唔夠', correct: false, explanation: '記憶體唔夠係資源問題，同 Partition Tolerance 無關。Partition Tolerance 係講網絡分區嘅容錯。' },
      { text: '即使網絡出現分區（部分 Node 之間失聯），系統仍然可以運作', correct: true, explanation: '啱！Partition Tolerance 指嘅係網絡斷開嘅時候，系統唔會完全癱瘓。分佈式系統幾乎一定要有 P，所以實際上係 CP 同 AP 之間揀。' },
      { text: '系統可以自動分割數據到唔同嘅 Server', correct: false, explanation: '你講嘅係 Sharding / Partitioning，呢個係數據分佈策略，唔係 CAP 入面嘅 Partition Tolerance。' },
      { text: '系統支持唔同嘅硬碟分區格式', correct: false, explanation: '硬碟分區同 CAP 定理完全係兩回事，CAP 講嘅係分佈式系統嘅網絡分區。' },
    ],
  },
  {
    question: '以下邊個係 AP 系統嘅例子？',
    options: [
      { text: 'MySQL 單機版（無 replication）', correct: false, explanation: 'MySQL 單機版根本唔係分佈式系統，CAP 定理唔適用。只有分佈式環境先需要考慮 CAP。' },
      { text: 'Cassandra — 即使部分 Node 失聯，仍然可以讀寫', correct: true, explanation: '啱！Cassandra 係經典嘅 AP 系統。佢選擇可用性（Availability），容許暫時嘅數據唔一致（Eventual Consistency），確保任何時候都可以讀寫。' },
      { text: 'ZooKeeper — 用 ZAB 協議保證一致性', correct: false, explanation: 'ZooKeeper 係 CP 系統，佢優先保證 Consistency。如果 Leader 掛咗，會暫時唔可用直到選出新 Leader。' },
      { text: 'Redis 單機版', correct: false, explanation: 'Redis 單機版唔係分佈式系統，CAP 定理唔適用。Redis Cluster 先會涉及 CAP 嘅取捨。' },
    ],
  },
  {
    question: 'PACELC 定理係 CAP 嘅延伸，佢額外考慮咗咩？',
    options: [
      { text: '系統嘅成本（Cost）同可擴展性（Scalability）', correct: false, explanation: 'PACELC 唔係講成本，係講喺冇 Partition 嘅正常情況下，Latency 同 Consistency 嘅取捨。' },
      { text: '喺冇網絡分區嘅時候，Latency 同 Consistency 之間嘅取捨', correct: true, explanation: '啱！PACELC 講嘅係：有 Partition 時揀 A 定 C（同 CAP 一樣），但冇 Partition 時，仲要揀 Latency 定 Consistency。呢個更貼近真實情況。' },
      { text: '系統嘅安全性（Security）同加密（Encryption）', correct: false, explanation: '安全性同 PACELC 無關。PACELC 係關於分佈式系統嘅一致性同延遲取捨。' },
      { text: '硬件故障同災難恢復嘅能力', correct: false, explanation: '硬件故障屬於 Fault Tolerance 範疇，PACELC 主要關注嘅係 Partition 同 Else（正常情況）下嘅取捨。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'pick-database', label: '揀 Database' },
  { slug: 'key-value-store', label: 'Key-Value Store' },
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>CAP 定理係咩？</h2>
      <div className="subtitle">三角取捨 / Partition Tolerance / 真實系統例子</div>
      <p>
        CAP 定理係分佈式系統最基本嘅理論。佢講嘅係：一個分佈式系統最多只能同時滿足以下三個屬性中嘅<strong style={{ color: '#fbbf24' }}>兩個</strong>：
        <strong style={{ color: '#3B82F6' }}> Consistency（一致性）</strong>、
        <strong style={{ color: '#34d399' }}> Availability（可用性）</strong>、
        <strong style={{ color: '#f87171' }}> Partition Tolerance（分區容錯性）</strong>。
      </p>
      <p>
        重點嚟喇：喺真實嘅分佈式環境下，網絡分區（Partition）係<strong style={{ color: '#f87171' }}>一定會發生</strong>嘅，所以 P 基本上係必選項。咁即係話，實際上你只係喺 <strong style={{ color: '#3B82F6' }}>CP</strong>（一致性 + 分區容錯）同 <strong style={{ color: '#34d399' }}>AP</strong>（可用性 + 分區容錯）之間揀。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowBlue"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowRed"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#f87171" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradCP" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAP" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradCA" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
          </defs>

          {/* Triangle */}
          <polygon points="350,40 100,340 600,340" fill="none" stroke="#475569" strokeWidth="2" />

          {/* C vertex */}
          <g filter="url(#glowBlue)">
            <circle cx="350" cy="40" r="36" fill="url(#gradCP)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="350" y="36" textAnchor="middle" fill="#3B82F6" fontSize="16" fontWeight="700">C</text>
            <text x="350" y="52" textAnchor="middle" fill="#93c5fd" fontSize="9">Consistency</text>
          </g>
          <text x="350" y="8" textAnchor="middle" fill="#9ca3af" fontSize="10">一致性</text>

          {/* A vertex */}
          <g filter="url(#glowGreen)">
            <circle cx="100" cy="340" r="36" fill="url(#gradAP)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="100" y="336" textAnchor="middle" fill="#34d399" fontSize="16" fontWeight="700">A</text>
            <text x="100" y="352" textAnchor="middle" fill="#6ee7b7" fontSize="9">Availability</text>
          </g>
          <text x="100" y="390" textAnchor="middle" fill="#9ca3af" fontSize="10">可用性</text>

          {/* P vertex */}
          <g filter="url(#glowRed)">
            <circle cx="600" cy="340" r="36" fill="rgba(248,113,113,0.15)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="600" y="336" textAnchor="middle" fill="#f87171" fontSize="16" fontWeight="700">P</text>
            <text x="600" y="352" textAnchor="middle" fill="#fca5a5" fontSize="9">Partition Tol.</text>
          </g>
          <text x="600" y="390" textAnchor="middle" fill="#9ca3af" fontSize="10">分區容錯</text>

          {/* CP edge label — MongoDB */}
          <g transform="translate(430,160)">
            <rect width="120" height="45" rx="10" fill="rgba(59,130,246,0.12)" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="60" y="18" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="700">CP 系統</text>
            <text x="60" y="35" textAnchor="middle" fill="#93c5fd" fontSize="10">MongoDB, HBase</text>
          </g>

          {/* AP edge label — Cassandra */}
          <g transform="translate(290,310)">
            <rect width="130" height="45" rx="10" fill="rgba(52,211,153,0.12)" stroke="#34d399" strokeWidth="1.5" />
            <text x="65" y="18" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">AP 系統</text>
            <text x="65" y="35" textAnchor="middle" fill="#6ee7b7" fontSize="10">Cassandra, DynamoDB</text>
          </g>

          {/* CA edge label — MySQL */}
          <g transform="translate(130,160)">
            <rect width="130" height="45" rx="10" fill="rgba(251,191,36,0.12)" stroke="#fbbf24" strokeWidth="1.5" />
            <text x="65" y="18" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">CA 系統</text>
            <text x="65" y="35" textAnchor="middle" fill="#fcd34d" fontSize="10">MySQL (單機/主從)</text>
          </g>

          {/* Note */}
          <text x="350" y="255" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="600">真實世界 P 必選</text>
          <text x="350" y="272" textAnchor="middle" fill="#9ca3af" fontSize="10">所以實際係 CP vs AP</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>三個屬性點理解</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#3B82F6' }}>Consistency（一致性）</strong>：所有 Node 喺任何時間讀到嘅數據都係一樣嘅。你喺 Node A 寫咗一筆數據，立刻喺 Node B 讀都會攞到最新版本。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#34d399' }}>Availability（可用性）</strong>：任何正常運作嘅 Node 收到請求，一定會返回 response（唔會 timeout 或者拒絕）。即使部分 Node 掛咗，系統仍然可以回應。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#f87171' }}>Partition Tolerance（分區容錯）</strong>：即使 Node 之間嘅網絡斷咗（出現分區），系統仍然可以繼續運作。呢個喺分佈式系統基本上係必須嘅。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>深入 CAP 同 PACELC</h2>
      <div className="subtitle">超越基礎三角形，理解真實世界嘅取捨</div>
      <div className="key-points">
        <div className="key-point">
          <h4>PACELC 延伸定理</h4>
          <p>CAP 只講有 Partition 嘅情況，但實際上大部分時間係<strong style={{ color: '#34d399' }}>冇</strong> Partition 嘅。PACELC 補充咗：冇 Partition 嘅時候（Else），你要喺 <strong style={{ color: '#3B82F6' }}>Latency</strong> 同 <strong style={{ color: '#fbbf24' }}>Consistency</strong> 之間揀。例如 DynamoDB 係 PA/EL — 有分區時選 Availability，冇分區時選低 Latency。</p>
        </div>
        <div className="key-point">
          <h4>Eventual Consistency 嘅唔同級別</h4>
          <p>Eventual Consistency 唔係全部一樣嘅。由弱到強：<strong style={{ color: '#8B5CF6' }}>Read-your-writes</strong>（你寫嘅嘢自己一定讀到）、<strong style={{ color: '#3B82F6' }}>Monotonic reads</strong>（唔會讀到比之前更舊嘅版本）、<strong style={{ color: '#34d399' }}>Causal consistency</strong>（因果相關嘅操作有序）。大多數 AP 系統都會提供某種程度嘅 consistency guarantee。</p>
        </div>
        <div className="key-point">
          <h4>真實世界嘅 CAP 取捨</h4>
          <p>面試必知：<strong style={{ color: '#3B82F6' }}>銀行轉帳</strong>揀 CP（錢唔可以出錯），<strong style={{ color: '#34d399' }}>社交媒體 Feed</strong>揀 AP（晚幾秒睇到新 Post 無所謂），<strong style={{ color: '#fbbf24' }}>電商庫存</strong>通常揀 AP + 補償機制（先接單後處理，避免超賣就得）。</p>
        </div>
        <div className="key-point">
          <h4>CAP 唔係非黑即白</h4>
          <p>真實系統唔會純粹係 CP 或 AP。例如 MongoDB 預設係 CP，但你可以設定 <code style={{ color: '#60a5fa' }}>readPreference: secondary</code> 令佢行為更似 AP。Cassandra 預設係 AP，但設定 <code style={{ color: '#60a5fa' }}>consistency level: QUORUM</code> 就會更接近 CP。關鍵係按場景調整。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>面試實戰技巧</h2>
      <div className="subtitle">CAP 題點答先唔會踩雷</div>
      <div className="key-points">
        <div className="key-point">
          <h4>面試必答框架</h4>
          <p>面試官問 CAP，唔好死記硬背「只能揀兩個」。正確答法係：「喺分佈式環境，P 係必須嘅，所以實際係 CP 同 AP 之間揀。我會根據業務需求決定——如果數據一致性係 critical（例如金融），揀 CP；如果系統可用性更重要（例如社交媒體），揀 AP。」</p>
        </div>
        <div className="key-point">
          <h4>常見系統嘅 CAP 分類</h4>
          <p><strong style={{ color: '#3B82F6' }}>CP 系統：</strong>MongoDB（預設）、HBase、ZooKeeper、etcd、Redis Cluster。<strong style={{ color: '#34d399' }}> AP 系統：</strong>Cassandra、DynamoDB、CouchDB、Riak。記住呢啲例子，面試嘅時候可以隨手舉例。</p>
        </div>
        <div className="key-point">
          <h4>進階加分：提 PACELC</h4>
          <p>面試嘅時候主動提 PACELC 會加分。你可以講：「CAP 只考慮有 Partition 嘅情況，但大部分時間網絡係正常嘅。PACELC 補充咗正常情況下 Latency 同 Consistency 嘅取捨，呢個喺實際設計中更加實用。」面試官聽到呢句會即刻覺得你有深度。</p>
        </div>
        <div className="key-point">
          <h4>唔好講「CA 系統」</h4>
          <p>呢個係常見陷阱。面試嘅時候唔好講某個分佈式系統係 CA。因為一旦做分佈式，P 係避唔開嘅。CA 只存在於單機或者完全唔考慮網絡故障嘅場景。講 CA 會顯得你唔理解 CAP 嘅本質。</p>
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
        <h4>Prompt 1 — 分析系統嘅 CAP 取捨</h4>
        <div className="prompt-text">
          {'幫我分析一個 '}
          <span className="placeholder">[電商 / 社交平台 / 金融系統]</span>
          {' 嘅 CAP 取捨。\n\n要求：\n- 列出系統入面唔同嘅 data store 同佢哋嘅 CAP 分類\n- 解釋點解每個 store 揀 CP 或 AP\n- 用 PACELC 分析正常情況下嘅 Latency vs Consistency 取捨\n- 提供具體嘅 consistency level 配置建議（例如 Cassandra 嘅 QUORUM vs ONE）\n- 畫出架構圖顯示唔同 store 之間嘅數據流同一致性保證\n- 用 '}
          <span className="placeholder">[中文 / 英文]</span>
          {' 解釋'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計一個支持 Tunable Consistency 嘅系統</h4>
        <div className="prompt-text">
          {'設計一個支持 Tunable Consistency 嘅分佈式 Key-Value Store。\n\n場景：\n- 3 個 Data Center，每個有 '}
          <span className="placeholder">[3 / 5]</span>
          {' 個 Node\n- 需要支持唔同嘅 consistency level（ONE / QUORUM / ALL）\n\n要求：\n- 解釋 Read Repair 同 Anti-Entropy 機制\n- 實現 Vector Clock 做衝突檢測\n- 設計 Hinted Handoff 處理暫時失聯嘅 Node\n- 提供 R + W > N 公式嘅解釋同配置方案\n- 用 '}
          <span className="placeholder">[Go / Java / Node.js]</span>
          {' 寫核心邏輯\n- 畫出 Read/Write Path 嘅 Sequence Diagram'}
        </div>
      </div>
    </div>
  );
}

export default function CapTheorem() {
  return (
    <>
      <TopicTabs
        title="CAP 定理深入"
        subtitle="分佈式系統最核心嘅取捨理論——三揀二嘅殘酷真相"
        tabs={[
          { id: 'overview', label: '① 整體概念', content: <OverviewTab /> },
          { id: 'advanced', label: '② 深入分析', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 面試實戰', premium: true, content: <PracticeTab /> },
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
