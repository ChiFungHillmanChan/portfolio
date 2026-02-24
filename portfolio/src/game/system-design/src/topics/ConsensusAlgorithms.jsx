import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Raft 共識演算法入面，Leader Election 嘅觸發條件係咩？',
    options: [
      { text: '系統管理員手動觸發', correct: false, explanation: 'Raft 嘅 Leader Election 係自動嘅，唔需要人手介入。呢個係分佈式共識嘅核心優勢。' },
      { text: 'Follower 喺 Election Timeout 內冇收到 Leader 嘅 Heartbeat，就會發起選舉', correct: true, explanation: '啱！每個 Follower 都有一個隨機嘅 Election Timeout（例如 150-300ms）。如果喺呢個時間內冇收到 Leader 嘅 Heartbeat，就認為 Leader 掛咗，自己升級做 Candidate 發起選舉。隨機 Timeout 避免多個 Follower 同時發起選舉。' },
      { text: '當有新嘅 Node 加入集群時', correct: false, explanation: '新 Node 加入唔會觸發 Leader Election。新 Node 會以 Follower 身份加入，接受現有 Leader 嘅指揮。' },
      { text: '每隔固定時間自動選舉', correct: false, explanation: 'Raft 唔係定期選舉嘅。只有喺 Leader 失聯（Follower 收唔到 Heartbeat）嘅時候先會觸發選舉。' },
    ],
  },
  {
    question: 'Split-Brain 問題係指咩？點解好危險？',
    options: [
      { text: 'Server 嘅 CPU 負載太高', correct: false, explanation: 'CPU 負載同 Split-Brain 無關。Split-Brain 係分佈式系統嘅網絡分區問題。' },
      { text: '網絡分區令集群分裂成兩組，每組都選出自己嘅 Leader，導致數據不一致', correct: true, explanation: '啱！呢個係分佈式系統最危險嘅情況之一。兩個 Leader 同時接受寫入，之後網絡恢復嘅時候，兩邊嘅數據就會衝突。Raft 用 Majority Quorum 解決呢個問題——只有攞到過半數 Vote 先可以做 Leader。' },
      { text: '數據庫嘅主從複製延遲', correct: false, explanation: '複製延遲同 Split-Brain 唔同。Split-Brain 係兩個 Leader 同時存在嘅問題。' },
      { text: '程式嘅記憶體洩漏', correct: false, explanation: '記憶體洩漏係應用層問題，同 Split-Brain 完全無關。' },
    ],
  },
  {
    question: 'Raft 同 Paxos 嘅主要分別係咩？',
    options: [
      { text: 'Raft 只能用 3 個 Node，Paxos 可以用任意數量', correct: false, explanation: '兩者都可以用任意奇數個 Node。Raft 常見用 3 或 5 個 Node，但唔限於 3 個。' },
      { text: 'Raft 設計目標係易理解、易實現；Paxos 理論上等價但出名難理解', correct: true, explanation: '啱！Raft 嘅論文開頭就講明設計目標係 Understandability。Paxos 雖然數學上完美，但出名難理解同難實現。Raft 將共識分解為 Leader Election + Log Replication + Safety 三個子問題，每個都相對簡單。所以實際工程入面 Raft 更受歡迎。' },
      { text: 'Paxos 比 Raft 快 10 倍', correct: false, explanation: '兩者嘅性能差唔多。Raft 可能因為有 Leader 而喺某啲場景更快（唔使每次都做 multi-round agreement），但唔會差 10 倍。' },
      { text: 'Raft 唔支持 Log Replication', correct: false, explanation: 'Log Replication 係 Raft 嘅核心功能之一。Leader 將 Log Entry 複製到所有 Follower，確保數據一致性。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'key-value-store', label: 'Key-Value Store' },
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>共識演算法係咩？</h2>
      <div className="subtitle">分佈式系統點樣達成一致嘅決定</div>
      <p>
        喺分佈式系統入面，多個 Node 需要就某件事達成一致——例如「邊個係 Leader」、「呢筆交易應唔應該 commit」。
        問題係 Node 之間嘅網絡可能<strong style={{ color: '#f87171' }}>延遲、丟包、甚至斷開</strong>。
        <strong style={{ color: '#3B82F6' }}> 共識演算法</strong>就係令呢班 Node 喺呢種唔穩定嘅環境下，
        仍然可以<strong style={{ color: '#34d399' }}>安全同一致咁做出決定</strong>嘅方法。
      </p>
      <p>
        最出名嘅兩個共識演算法係 <strong style={{ color: '#fbbf24' }}>Raft</strong> 同 <strong style={{ color: '#8B5CF6' }}>Paxos</strong>。
        Raft 因為易理解而成為而家最常用嘅。etcd、Consul、CockroachDB 都用 Raft。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 350" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowBlue"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowAmber"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#fbbf24" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradFollower" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradCandidate" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradLeader" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>

          {/* Follower */}
          <g transform="translate(40,130)" filter="url(#glowBlue)">
            <rect width="150" height="80" rx="14" fill="url(#gradFollower)" stroke="#3B82F6" strokeWidth="2.5" filter="url(#shadow)" />
            <text x="75" y="30" textAnchor="middle" fill="#3B82F6" fontSize="15" fontWeight="700">Follower</text>
            <text x="75" y="50" textAnchor="middle" fill="#93c5fd" fontSize="10">追隨者</text>
            <text x="75" y="66" textAnchor="middle" fill="#9ca3af" fontSize="9">等待 Heartbeat</text>
          </g>

          {/* Candidate */}
          <g transform="translate(280,130)" filter="url(#glowAmber)">
            <rect width="150" height="80" rx="14" fill="url(#gradCandidate)" stroke="#fbbf24" strokeWidth="2.5" filter="url(#shadow)" />
            <text x="75" y="30" textAnchor="middle" fill="#fbbf24" fontSize="15" fontWeight="700">Candidate</text>
            <text x="75" y="50" textAnchor="middle" fill="#fcd34d" fontSize="10">候選人</text>
            <text x="75" y="66" textAnchor="middle" fill="#9ca3af" fontSize="9">發起投票</text>
          </g>

          {/* Leader */}
          <g transform="translate(520,130)" filter="url(#glowGreen)">
            <rect width="150" height="80" rx="14" fill="url(#gradLeader)" stroke="#34d399" strokeWidth="2.5" filter="url(#shadow)" />
            <text x="75" y="30" textAnchor="middle" fill="#34d399" fontSize="15" fontWeight="700">Leader</text>
            <text x="75" y="50" textAnchor="middle" fill="#6ee7b7" fontSize="10">領導者</text>
            <text x="75" y="66" textAnchor="middle" fill="#9ca3af" fontSize="9">發送 Heartbeat</text>
          </g>

          {/* Follower → Candidate */}
          <path d="M192,160 Q235,150 278,160" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrAmber)" />
          <text x="235" y="140" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600">Election Timeout</text>
          <text x="235" y="155" textAnchor="middle" fill="#9ca3af" fontSize="9">冇收到 Heartbeat</text>

          {/* Candidate → Leader */}
          <path d="M432,160 Q475,150 518,160" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="475" y="140" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">攞到 Majority Vote</text>

          {/* Leader → Follower (heartbeat) */}
          <path d="M595,212 Q595,280 115,280 Q115,230 115,212" fill="none" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#arrBlue)" />
          <text x="355" y="295" textAnchor="middle" fill="#3B82F6" fontSize="10">定期發 Heartbeat（維持 Leader 身份）</text>

          {/* Candidate → Follower (lost election) */}
          <path d="M355,212 Q355,260 200,260 Q140,260 125,212" fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrRed)" />
          <text x="240" y="258" textAnchor="middle" fill="#f87171" fontSize="9">選舉失敗 / 發現新 Leader</text>

          {/* Vote arrows */}
          <g transform="translate(250,40)">
            <rect width="220" height="40" rx="10" fill="rgba(139,92,246,0.1)" stroke="#8B5CF6" strokeWidth="1" />
            <text x="110" y="16" textAnchor="middle" fill="#8B5CF6" fontSize="11" fontWeight="600">RequestVote RPC</text>
            <text x="110" y="32" textAnchor="middle" fill="#9ca3af" fontSize="9">Candidate 向所有 Node 要求投票</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>Raft Leader Election 流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>所有 Node 啟動時都係 <strong style={{ color: '#3B82F6' }}>Follower</strong>。每個 Follower 有一個隨機嘅 Election Timeout（例如 150-300ms）。</span></li>
        <li><span className="step-num">2</span><span>如果 Follower 喺 Timeout 內冇收到 Leader 嘅 Heartbeat，佢就變成 <strong style={{ color: '#fbbf24' }}>Candidate</strong>，向其他 Node 發 RequestVote RPC。</span></li>
        <li><span className="step-num">3</span><span>如果 Candidate 攞到<strong style={{ color: '#34d399' }}>過半數</strong>嘅 Vote（Majority Quorum），佢就成為新嘅 <strong style={{ color: '#34d399' }}>Leader</strong>。</span></li>
        <li><span className="step-num">4</span><span>Leader 定期向所有 Follower 發 Heartbeat，維持自己嘅 Leader 身份。如果 Leader 掛咗，Follower 又會觸發新嘅選舉。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>Log Replication 同 Byzantine Fault</h2>
      <div className="subtitle">Raft 嘅數據複製同更進階嘅容錯</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Raft Log Replication</h4>
          <p>Leader 收到 Client 嘅寫入請求後：1）將 Entry 加到自己嘅 Log。2）發 AppendEntries RPC 到所有 Follower。3）當<strong style={{ color: '#34d399' }}>過半數 Follower 確認收到</strong>，Leader 就 commit 呢個 Entry 並回應 Client。4）之後嘅 Heartbeat 會通知 Follower commit。呢個保證咗即使少數 Node 掛咗，數據都唔會丟失。</p>
        </div>
        <div className="key-point">
          <h4>Paxos Prepare / Accept</h4>
          <p>Paxos 分兩個階段：<strong style={{ color: '#fbbf24' }}>Prepare 階段</strong>——Proposer 發 Prepare(n) 到所有 Acceptor，如果 n 比佢哋見過嘅都大，Acceptor 就 Promise 唔再接受更細嘅。<strong style={{ color: '#3B82F6' }}>Accept 階段</strong>——Proposer 發 Accept(n, value)，Acceptor 如果冇 Promise 更大嘅就接受。攞到 Majority Accept 就達成共識。</p>
        </div>
        <div className="key-point">
          <h4>Byzantine Fault Tolerance（BFT）</h4>
          <p>Raft 同 Paxos 假設 Node 唔會「講大話」（crash fault），但 <strong style={{ color: '#f87171' }}>Byzantine Fault</strong> 係 Node 可能發送錯誤嘅資訊（惡意或 bug）。BFT 演算法（例如 PBFT）可以容忍 f 個 Byzantine Node（需要 3f+1 個 Node）。區塊鏈就係用 BFT 嘅變體。大部分企業系統唔需要 BFT，因為 Node 都係自己控制嘅。</p>
        </div>
        <div className="key-point">
          <h4>Raft 嘅安全保證</h4>
          <p>Raft 保證：1）<strong style={{ color: '#34d399' }}>Election Safety</strong>——每個 Term 最多只有一個 Leader。2）<strong style={{ color: '#3B82F6' }}>Leader Append-Only</strong>——Leader 唔會覆蓋自己嘅 Log。3）<strong style={{ color: '#8B5CF6' }}>State Machine Safety</strong>——如果某個 Entry 被 commit 咗，之後嘅所有 Leader 嘅 Log 都會包含呢個 Entry。呢三個保證令 Raft 喺任何情況都唔會丟數據。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>真實系統點用共識</h2>
      <div className="subtitle">etcd、ZooKeeper、同面試要點</div>
      <div className="key-points">
        <div className="key-point">
          <h4>etcd 用 Raft</h4>
          <p>Kubernetes 嘅底層存儲 <strong style={{ color: '#3B82F6' }}>etcd</strong> 就係用 Raft。所有 K8s 嘅 state（Pod、Service、ConfigMap⋯）都存喺 etcd 入面。etcd 通常部署 3 或 5 個 Node，保證即使 1-2 個 Node 掛咗，集群仍然可以正常運作。呢個就係共識演算法喺生產環境嘅直接應用。</p>
        </div>
        <div className="key-point">
          <h4>ZooKeeper 用 ZAB</h4>
          <p>ZooKeeper 用 <strong style={{ color: '#34d399' }}>ZAB（ZooKeeper Atomic Broadcast）</strong>，同 Raft 好似但有微妙分別。ZAB 係先 broadcast 再 commit；Raft 係先 commit（majority）再 broadcast commit notification。Kafka 傳統上用 ZooKeeper 做 metadata 管理，但新版 Kafka 已經用自己嘅 KRaft 取代。</p>
        </div>
        <div className="key-point">
          <h4>幾時需要共識？</h4>
          <p>唔係所有分佈式系統都需要共識演算法。需要嘅場景：<strong style={{ color: '#fbbf24' }}>Leader Election</strong>（邊個做主）、<strong style={{ color: '#fbbf24' }}>Configuration Management</strong>（全局配置要一致）、<strong style={{ color: '#fbbf24' }}>Distributed Lock</strong>（互斥鎖）、<strong style={{ color: '#fbbf24' }}>Atomic Broadcast</strong>（訊息順序一致）。唔需要嘅場景：讀多寫少嘅 Cache、Eventual Consistency 可以接受嘅系統。</p>
        </div>
        <div className="key-point">
          <h4>面試答題重點</h4>
          <p>1）解釋 Raft 嘅三個子問題（Leader Election、Log Replication、Safety）。2）講 Majority Quorum 點解可以防止 Split-Brain（兩組唔可能同時有 Majority）。3）知道 etcd 用 Raft、ZooKeeper 用 ZAB。4）解釋 Raft 同 Paxos 嘅主要分別（易理解性）。講到呢幾點就好足夠。</p>
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
        <h4>Prompt 1 — 實現簡化版 Raft 共識</h4>
        <div className="prompt-text">
          {'用 '}
          <span className="placeholder">[Go / Rust / Node.js]</span>
          {' 實現一個簡化版嘅 Raft 共識演算法。\n\n要求：\n- 3 個 Node 嘅集群\n- 實現 Leader Election（隨機 Election Timeout、RequestVote RPC）\n- 實現 Log Replication（AppendEntries RPC、Majority Commit）\n- 實現 Heartbeat 機制（Leader 定期發送）\n- Node 之間用 '}
          <span className="placeholder">[gRPC / HTTP / TCP]</span>
          {' 通訊\n- 模擬 Leader 掛咗嘅場景，觀察自動 Re-election\n- 提供 CLI 可以發送寫入請求同讀取 committed log\n- 用彩色 terminal output 顯示每個 Node 嘅狀態變化\n- 寫齊 test 覆蓋：正常選舉、Leader 掛咗、網絡分區'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 用 etcd 實現分佈式系統核心功能</h4>
        <div className="prompt-text">
          {'用 etcd 實現一套分佈式系統嘅核心功能。\n\n場景：'}
          <span className="placeholder">[微服務架構 / 分佈式任務調度]</span>
          {'\n\n要求：\n- Docker Compose 搭建 3 節點 etcd 集群\n- 實現 Distributed Lock（用 etcd Lease + Lock API）\n- 實現 Leader Election（用 etcd Election API）\n- 實現 Service Discovery（用 etcd Watch API 監聽服務註冊 / 反註冊）\n- 實現 Configuration Center（用 etcd KV + Watch 做動態配置）\n- 用 '}
          <span className="placeholder">[Go / Python / Node.js]</span>
          {' 寫 client code\n- 模擬 Node 故障場景，觀察 failover 行為\n- 提供完整嘅 code 同 Docker Compose 配置'}
        </div>
      </div>
    </div>
  );
}

export default function ConsensusAlgorithms() {
  return (
    <>
      <TopicTabs
        title="共識演算法"
        subtitle="Raft、Paxos 同 Leader Election——分佈式系統嘅大腦"
        tabs={[
          { id: 'overview', label: '① 整體概念', content: <OverviewTab /> },
          { id: 'advanced', label: '② 深入機制', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 真實應用', premium: true, content: <PracticeTab /> },
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
