import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Snowflake ID 用 64-bit 結構，其中 41 bits 係 timestamp。呢個設計最大嘅好處係咩？',
    options: [
      { text: 'ID 嘅長度比 UUID 短好多，慳存儲空間', correct: false, explanation: '雖然 64-bit 確實比 UUID 嘅 128-bit 短，但呢個唔係 timestamp 放喺高位嘅主要好處。核心優勢係 time-sortable。' },
      { text: 'ID 自然按時間遞增，唔使查 Database 就可以排序，而且對 B-tree Index 好友好', correct: true, explanation: '因為 timestamp 喺最高位，生成嘅 ID 自然按時間遞增。呢個對 B-tree Index 極之友好——新 ID 永遠 append 喺最後，唔會觸發 page split，insert 性能好高。UUID 嘅 random 特性反而會令 B-tree 效率低。' },
      { text: '可以令每台機器每秒生成無限個 ID', correct: false, explanation: '唔係無限。12 bits sequence = 4096，即係每毫秒每台機最多生成 4096 個 ID。超過就要等下一毫秒。不過對 99% 嘅場景已經足夠。' },
      { text: '可以防止 ID 被猜到', correct: false, explanation: '恰恰相反，Snowflake ID 因為包含 timestamp，理論上可以被推測出大概嘅生成時間。如果需要 ID 唔可預測，UUID v4 嘅 random 特性更適合。' },
    ],
  },
  {
    question: '點解分佈式系統唔建議用 Database 自增 ID（AUTO_INCREMENT）作為全局唯一 ID？',
    options: [
      { text: '因為自增 ID 太短，容易用完', correct: false, explanation: '64-bit 自增 ID 可以去到 9.2 x 10^18，用完嘅可能性極低。問題唔係容量，而係架構上嘅樽頸。' },
      { text: '因為每次生成 ID 都要問 Database，Database 會變成 bottleneck，而且唔支持多個 node 同時生成', correct: true, explanation: '自增 ID 需要 Database 保證唯一性，所有 node 都要去同一個 DB 攞 ID，呢個 DB 就變成單點樽頸（single point of failure）。而 Snowflake 每台機本地生成，唔使 coordination，可以水平擴展。' },
      { text: '因為自增 ID 唔係數字，唔方便排序', correct: false, explanation: '自增 ID 就係數字，而且天然遞增。問題唔係排序，而係生成 ID 需要中心化嘅 Database，限制咗系統嘅 scalability。' },
      { text: '因為自增 ID 容易被攻擊者猜到', correct: false, explanation: '安全性確實係一個考量，但唔係主要原因。核心問題係 Database 變成 bottleneck，限制咗分佈式系統嘅 throughput 同 availability。' },
    ],
  },
  {
    question: 'Snowflake ID Generator 遇到時鐘回撥（Clock Drift，NTP 同步令時間倒退）會點？如果唔處理會有咩後果？',
    options: [
      { text: '冇影響，因為 Sequence Number 可以補償時間差', correct: false, explanation: 'Sequence Number 係喺同一毫秒內遞增用嘅。如果時鐘回撥，timestamp 變細，可能同之前生成嘅 ID 嘅 timestamp 重疊，導致生成重複 ID。' },
      { text: '可能生成重複 ID，因為回撥後嘅 timestamp 同之前嘅重疊。必須 detect 同處理（拒絕生成或者等時鐘追返）', correct: true, explanation: '時鐘回撥會令 timestamp 回到之前嘅值，如果 sequence 又從 0 開始，就會同之前同一毫秒生成嘅 ID 撞。正確做法係 detect 回撥後拒絕生成（throw error），或者等時鐘追返先繼續。呢個係 Snowflake 設計嘅一個經典坑。' },
      { text: '系統會自動 shutdown，需要手動重啟', correct: false, explanation: '唔應該自動 shutdown 整個系統。正確做法係喺 ID Generator 層面處理——暫時拒絕生成新 ID 或者等時鐘追返，但系統其他部分應該繼續運作。' },
      { text: '生成嘅 ID 會變成負數', correct: false, explanation: '64-bit 嘅第一個 bit 係 sign bit（通常固定為 0）。時鐘回撥唔會令 ID 變負數，但會令 timestamp 部分重複，導致生成重複嘅 ID。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'url-shortener', label: 'URL Shortener 短網址服務' },
  { slug: 'scale-reads', label: '擴展讀取能力' },
  { slug: 'system-design-patterns', label: '系統設計模式總覽' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>全局唯一 ID 點解咁重要</h2>
      <div className="subtitle">多台 Server 各自 generate，點樣唔會撞？</div>
      <p>
        呢個係一個好實際嘅問題。當有幾百台 App Server，每台都要 generate 唯一 ID（例如 order_id、tweet_id），點搞？用 database 自增？會 bottleneck。用 UUID？又長又唔 time-sortable。最佳做法係用 <strong style={{ color: '#34d399' }}>Snowflake</strong> 嘅 64-bit 方案：無需 coordination，高性能，而且 ID 按時間遞增。呢個係目前最 balanced 嘅設計。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 740 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowIndigo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2a1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a1d27" /><stop offset="100%" stopColor="#13151c" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          </defs>

          <g transform="translate(30,130)">
            <rect width="130" height="75" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="30" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">App Service</text>
            <text x="65" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">需要唯一 ID</text>
          </g>

          <g transform="translate(230,120)">
            <rect width="170" height="95" rx="12" fill="url(#gradIndigo)" stroke="#6366f1" strokeWidth="2" filter="url(#glowIndigo)" />
            <text x="85" y="30" textAnchor="middle" fill="#a5b4fc" fontSize="14" fontWeight="700">ID Generator</text>
            <text x="85" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">Snowflake / 自建</text>
            <text x="85" y="74" textAnchor="middle" fill="#6366f1" fontSize="10">64-bit 無需協調</text>
          </g>

          <g transform="translate(470,25)">
            <rect width="255" height="135" rx="12" fill="url(#gradDark)" stroke="#2a2d3a" strokeWidth="1.5" />
            <text x="127" y="24" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">64-bit ID 結構</text>
            <rect x="15" y="38" width="100" height="26" rx="6" fill="rgba(34,197,94,0.15)" stroke="#34d399" strokeWidth="1.2" />
            <text x="65" y="56" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">41 bits</text>
            <text x="122" y="56" fill="#9ca3af" fontSize="9">Timestamp</text>
            <rect x="15" y="72" width="50" height="26" rx="6" fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1.2" />
            <text x="40" y="90" textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="600">5</text>
            <text x="72" y="90" fill="#9ca3af" fontSize="9">Datacenter</text>
            <rect x="130" y="72" width="50" height="26" rx="6" fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1.2" />
            <text x="155" y="90" textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="600">5</text>
            <text x="187" y="90" fill="#9ca3af" fontSize="9">Machine</text>
            <rect x="15" y="106" width="85" height="26" rx="6" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.2" />
            <text x="57" y="124" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="600">12 bits</text>
            <text x="108" y="124" fill="#9ca3af" fontSize="9">Sequence (4096/ms)</text>
          </g>

          <g transform="translate(490,200)">
            <rect width="220" height="55" rx="10" fill="url(#gradGreen)" stroke="#34d399" strokeWidth="1.5" filter="url(#glowGreen)" />
            <text x="110" y="24" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="700">Output: 1234567890123456789</text>
            <text x="110" y="42" textAnchor="middle" fill="#9ca3af" fontSize="9">Time-sortable, unique</text>
          </g>

          <g transform="translate(280,260)">
            <rect width="120" height="50" rx="10" fill="url(#gradDark)" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4,2" />
            <text x="60" y="22" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="600">System Clock</text>
            <text x="60" y="38" textAnchor="middle" fill="#9ca3af" fontSize="8">毫秒級 timestamp</text>
          </g>

          <path d="M162,165 C185,163 210,160 228,158" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="190" y="150" fill="#a5b4fc" fontSize="10">nextId()</text>
          <path d="M402,170 C430,178 460,195 488,205" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arrGreen)" />
          <text x="435" y="178" fill="#34d399" fontSize="10">Return ID</text>
          <path d="M315,217 C315,235 320,248 325,258" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4,2" fill="none" markerEnd="url(#arrYellow)" />
          <text x="330" y="242" fill="#fbbf24" fontSize="8">read time</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>完整流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>App Service 叫 ID Generator 要一個新 ID。重點係，呢個 call 係本地嘅，唔使 network round trip。</span></li>
        <li><span className="step-num">2</span><span>Generator 用 timestamp (41 bits) + datacenter ID (5) + machine ID (5) + sequence (12) 組成 64-bit ID。呢四段嘅分配必須要記住。</span></li>
        <li><span className="step-num">3</span><span>同一毫秒內有多個請求就用 sequence 遞增，最多 4096 個/ms。呢個 throughput 對絕大部分場景都夠用。</span></li>
        <li><span className="step-num">4</span><span>無需問 database、無需同其他 node 協調，本地 generate 就搞掂。呢個就係 Snowflake 嘅核心優勢。</span></li>
      </ol>
    </div>
  );
}

function StructureTab() {
  return (
    <div className="card">
      <h2>ID 結構拆解</h2>
      <div className="subtitle">64-bit 點樣分配</div>
      <p>
        Snowflake 嘅 64-bit 點樣分：<strong style={{ color: '#34d399' }}>1 bit sign</strong>（通常 0）+ <strong style={{ color: '#fbbf24' }}>41 bits timestamp</strong>（毫秒級，可用 69 年）+ <strong style={{ color: '#6366f1' }}>10 bits</strong>（5 bit datacenter + 5 bit machine）+ <strong style={{ color: '#f59e0b' }}>12 bits sequence</strong>。呢個分配必須記住，面試一定會問。
      </p>
      <p>計算一下：12 bits sequence = 4096，即係同一毫秒同一部機最多 generate 4096 個 ID。超過就等下一毫秒。呢個限制對 99% 嘅場景都唔係問題。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>Snowflake 64-bit</h4>
          <p>每部機有唯一 datacenter+machine ID，無需中心化協調，高性能。呢個係分佈式 ID 生成嘅最佳實踐之一。</p>
        </div>
        <div className="key-point">
          <h4>Time-sortable</h4>
          <p>ID 按時間遞增，唔使查 database 就可以按創建時間排序。關鍵在於：呢個特性對 index 同 B-tree 好友好，insert 性能好。</p>
        </div>
        <div className="key-point">
          <h4>4096 IDs/ms</h4>
          <p>每毫秒每部機 4096 個。如果場景唔夠，可以調整 bit 分配——例如多啲 sequence bits、少啲 machine bits。建議根據實際需求靈活調整。</p>
        </div>
        <div className="key-point">
          <h4>Coordination-free</h4>
          <p>唔使問 Zookeeper、Redis。每部機嘅 (datacenter, machine) 唔同就得，部署時配置好。重點係：呢個特性令 Snowflake 可以水平擴展。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">設計 ID 生成器嘅注意事項</div>
      <div className="key-points">
        <div className="key-point">
          <h4>時鐘回撥</h4>
          <p>NTP 同步可能令時鐘回撥，會 generate 重複 ID。處理方法：拒絕 generate，等時鐘追返；或者記錄上次 timestamp，回撥時用 sequence 頂住。呢個坑一定要知。</p>
        </div>
        <div className="key-point">
          <h4>Machine ID 分配</h4>
          <p>5+5=10 bits = 1024 部機。可以用 Zookeeper 或者 DB 分配，又或者用 IP/MAC hash。注意：一定要確保唔重複，否則會出大問題。</p>
        </div>
        <div className="key-point">
          <h4>其他方案對比</h4>
          <p>UUID v4：random，唔 time-sortable。DB 自增：bottleneck。Redis INCR：要額外 service。結論係 Snowflake 係 balance 得最好嘅一類方案。</p>
        </div>
        <div className="key-point">
          <h4>開源實現</h4>
          <p>業界有唔少成熟嘅開源 Snowflake 實現，可以參考相關代碼學習。建議動手 implement 一次，理解會更深刻。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>總結</h4>
        <p>大量社交平台嘅 post ID、訂單系統嘅 order_id 都用呢類設計。簡單、高效、易擴展。Snowflake 嘅設計思路值得徹底掌握，因為呢個係分佈式系統面試嘅高頻題目。</p>
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
        <h4>Prompt 1 — 設計分佈式 ID 生成服務</h4>
        <div className="prompt-text">
          {`幫手設計一個分佈式唯一 ID 生成服務，基於 Snowflake 架構。

技術要求：
- 64-bit ID 結構：1 bit sign + 41 bits timestamp + 5 bits datacenter + 5 bits machine + 12 bits sequence
- 每毫秒每部機最多生成 4096 個 ID
- 無需中心化協調（Coordination-free），每個 node 本地生成
- 處理時鐘回撥問題（NTP sync 導致嘅 clock drift）
- ID 必須 time-sortable，方便 B-tree index 插入

部署環境：[例如：3 個 Datacenter，每個 Datacenter 最多 32 部機]
預計 QPS：[例如：每秒 10 萬個 ID]
技術棧：[例如：Go / Java / Rust]

請提供完整嘅 code 實現、unit test、同 benchmark 測試。`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 揀選 ID 策略分析</h4>
        <div className="prompt-text">
          {`幫手分析以下三種 ID 生成策略，揀出最適合嘅方案：

三個候選方案：
1. Snowflake 64-bit（timestamp + datacenter + machine + sequence）
2. UUID v4（128-bit random）
3. ULID（128-bit，timestamp prefix + random suffix）

項目背景：
- 應用類型：[例如：電商訂單系統 / 社交平台 / IoT 設備管理]
- 預計每日生成 ID 數量：[例如：5000 萬個]
- 資料庫類型：[例如：PostgreSQL / MySQL / DynamoDB]
- 需要 time-sortable：[是 / 否]
- 需要 URL-safe：[是 / 否]

請從以下維度做對比分析：
- 碰撞機率
- 存儲空間
- Index 性能（B-tree 友好度）
- 可讀性同 Debug 難度
- 實現複雜度

最後畀出明確嘅建議同理由。`}
        </div>
      </div>
    </div>
  );
}

export default function UniqueIDGenerator() {
  return (
    <>
      <TopicTabs
        title="Unique ID Generator 全局唯一 ID 生成器"
        subtitle="深入了解分佈式環境下生成全局唯一 ID，掌握 Snowflake 設計"
        tabs={[
          { id: 'overview', label: '① Snowflake 架構', content: <OverviewTab /> },
          { id: 'structure', label: '② ID 結構解析', content: <StructureTab /> },
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
