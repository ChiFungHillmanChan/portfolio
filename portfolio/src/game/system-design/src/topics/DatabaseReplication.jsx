import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Leader-Follower Replication 入面，Follower 嘅主要作用係咩？',
    options: [
      { text: '負責處理所有寫入操作', correct: false, explanation: '寫入只會去 Leader。Follower 只係接收 Leader 嘅 replication log 嚟同步數據，唔處理寫入。' },
      { text: '分擔讀取請求，提高讀取吞吐量', correct: true, explanation: 'Follower 嘅核心作用係分擔 read traffic。Application 可以將讀取請求分散去多個 Follower，減輕 Leader 嘅壓力。同時 Follower 仲可以做 backup，Leader 掛咗可以 promote Follower 做新 Leader。' },
      { text: '替代 Leader 處理所有請求', correct: false, explanation: 'Follower 正常情況下只處理 read。只有 Leader 掛咗嘅時候，先會 promote 一個 Follower 做新 Leader 嚟接管 write。' },
      { text: '壓縮同備份數據到 cold storage', correct: false, explanation: 'Follower 嘅職責係 real-time data replication，唔係做 backup 到 cold storage。雖然可以用 Follower 做 backup source，但呢個唔係佢嘅主要作用。' },
    ],
  },
  {
    question: 'Synchronous Replication 同 Asynchronous Replication 最大嘅 trade-off 係咩？',
    options: [
      { text: 'Sync 更快，Async 更慢', correct: false, explanation: '啱啱相反！Sync replication 要等 Follower 確認先返回，所以寫入 latency 更高。Async 唔等確認，寫入更快但有數據丟失風險。' },
      { text: 'Sync 保證數據一致但寫入更慢，Async 寫入快但可能丟失最近嘅寫入', correct: true, explanation: 'Synchronous replication 等 Follower 確認收到數據先返回 success，保證 Leader 同 Follower 數據一致。但代價係每次寫入都要等 network round-trip。Asynchronous replication 寫完 Leader 就返回，如果 Leader 喺 Follower 同步之前掛咗，最近嘅寫入會丟失。' },
      { text: 'Sync 只支援 SQL，Async 只支援 NoSQL', correct: false, explanation: '兩種 replication 模式同 database 類型冇關。SQL 同 NoSQL database 都可以配置 sync 或 async replication。' },
      { text: '兩者冇分別，只係名稱唔同', correct: false, explanation: '佢哋係完全唔同嘅 replication 策略，喺 consistency、latency 同 durability 上都有明顯分別。' },
    ],
  },
  {
    question: 'Multi-Leader Replication 最大嘅挑戰係咩？',
    options: [
      { text: '成本太高，需要太多 server', correct: false, explanation: 'Multi-leader 嘅 server 數量唔一定比 single-leader 多好多。主要挑戰唔係成本，而係數據一致性。' },
      { text: '寫入衝突（write conflict）嘅偵測同解決', correct: true, explanation: '兩個 Leader 可能同時收到對同一個 row 嘅修改（例如兩個用戶同時改同一個文件）。呢個就係 write conflict。需要 conflict resolution 策略：last-write-wins（LWW）、merge function、或者 CRDT。呢個係分佈式系統入面最棘手嘅問題之一。' },
      { text: '讀取速度會變慢', correct: false, explanation: 'Multi-leader 嘅讀取速度通常更快，因為可以從最近嘅 Leader 讀取，減少 latency。慢嘅係 conflict resolution，唔係 read。' },
      { text: '唔支援 transaction', correct: false, explanation: '好多 multi-leader 系統都支援 local transaction。跨 leader 嘅 distributed transaction 確實更複雜，但唔係完全唔支援。' },
    ],
  },
  {
    question: 'Replication Lag 會導致咩用戶體驗問題？',
    options: [
      { text: '用戶寫入數據後立即讀取，但睇唔到自己啱啱寫嘅數據', correct: true, explanation: '呢個叫做「read-after-write inconsistency」。用戶 POST 一條評論（寫去 Leader），然後 refresh 頁面（讀自 Follower），但 Follower 仲未同步到，所以睇唔到自己嘅評論。解法係 read-after-write consistency：自己嘅寫入後嘅讀取強制從 Leader 讀，或者等 Follower 追到先返回。' },
      { text: '所有用戶嘅 session 會同時斷線', correct: false, explanation: 'Replication lag 唔會導致 session 斷線。Session 係 application 層管理嘅，同 DB replication 冇直接關係。' },
      { text: '數據庫會自動 rollback 所有 transaction', correct: false, explanation: 'Replication lag 唔會觸發 rollback。Leader 嘅 transaction 係正常 commit 嘅，只係 Follower 嘅數據暫時落後。' },
      { text: '會令 database 自動切換到 single-node mode', correct: false, explanation: '冇呢回事。Replication lag 係正常嘅現象，database 唔會因為 lag 就自動改變架構。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'pick-database', label: '點揀 Database' },
  { slug: 'scale-reads', label: '擴展讀取能力' },
  { slug: 'key-value-store', label: 'Key-Value Store 鍵值存儲' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Database 複製</h2>
      <div className="subtitle">Leader-Follower / Multi-Leader / 一致性</div>
      <p>
        Database Replication 就係將數據複製到多台 server 上面。點解要咁做？兩個核心原因：<strong style={{ color: '#3B82F6' }}>高可用性</strong>（一台掛咗仲有其他頂住）同 <strong style={{ color: '#34d399' }}>讀取擴展</strong>（將讀取請求分散去多台 server）。
      </p>
      <p>
        最常見嘅模式係 <strong style={{ color: '#fbbf24' }}>Leader-Follower Replication</strong>：一個 Leader 負責所有寫入，寫完之後將變更複製到 Follower。Follower 只處理讀取請求。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gradLeader" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradFollower" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#34d399', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradClient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#fbbf24', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>

          {/* Client */}
          <rect x="20" y="40" width="130" height="60" rx="14" fill="url(#gradClient)" filter="url(#shadow)" />
          <text x="85" y="66" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">Client</text>
          <text x="85" y="84" textAnchor="middle" fill="#fde68a" fontSize="10">WRITE + READ</text>

          {/* Leader */}
          <rect x="300" y="30" width="200" height="80" rx="14" fill="url(#gradLeader)" filter="url(#shadow)" />
          <text x="400" y="58" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="700">Leader</text>
          <text x="400" y="78" textAnchor="middle" fill="#93c5fd" fontSize="11">處理所有 WRITE</text>
          <text x="400" y="94" textAnchor="middle" fill="#9ca3af" fontSize="10">Primary / Master</text>

          {/* Arrow: Client → Leader (Write) */}
          <path d="M 152 60 Q 225 50 298 60" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrAmber)" />
          <text x="225" y="42" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600">WRITE</text>

          {/* Follower 1 */}
          <rect x="180" y="200" width="180" height="70" rx="14" fill="url(#gradFollower)" filter="url(#shadow)" />
          <text x="270" y="228" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="700">Follower 1</text>
          <text x="270" y="248" textAnchor="middle" fill="#6ee7b7" fontSize="11">READ only</text>
          <text x="270" y="262" textAnchor="middle" fill="#9ca3af" fontSize="9">Replica / Secondary</text>

          {/* Follower 2 */}
          <rect x="420" y="200" width="180" height="70" rx="14" fill="url(#gradFollower)" filter="url(#shadow)" />
          <text x="510" y="228" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="700">Follower 2</text>
          <text x="510" y="248" textAnchor="middle" fill="#6ee7b7" fontSize="11">READ only</text>
          <text x="510" y="262" textAnchor="middle" fill="#9ca3af" fontSize="9">Replica / Secondary</text>

          {/* Replication arrows: Leader → Followers */}
          <path d="M 370 112 Q 330 160 280 198" fill="none" stroke="#3B82F6" strokeWidth="2" strokeDasharray="6,3" markerEnd="url(#arrBlue)" />
          <path d="M 430 112 Q 470 160 500 198" fill="none" stroke="#3B82F6" strokeWidth="2" strokeDasharray="6,3" markerEnd="url(#arrBlue)" />
          <text x="310" y="155" textAnchor="middle" fill="#93c5fd" fontSize="10">Replication</text>
          <text x="490" y="155" textAnchor="middle" fill="#93c5fd" fontSize="10">Replication</text>

          {/* Client READ arrows to Followers */}
          <path d="M 85 102 Q 85 235 178 235" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <text x="120" y="180" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">READ</text>

          {/* Replication Lag warning */}
          <rect x="230" y="310" width="340" height="60" rx="12" fill="rgba(248,113,113,0.15)" stroke="#f87171" strokeWidth="1.5" />
          <text x="400" y="335" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="600">Replication Lag</text>
          <text x="400" y="355" textAnchor="middle" fill="#fca5a5" fontSize="11">Follower 數據可能落後 Leader 幾毫秒到幾秒</text>
        </svg>
      </div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong style={{ color: '#fbbf24' }}>Client 發送 WRITE 請求</strong>：所有寫入都去 Leader。Leader 先寫入自己嘅 storage engine，然後產生 replication log（WAL / binlog）。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong style={{ color: '#3B82F6' }}>Leader 複製到 Follower</strong>：Leader 將 replication log 發送俾所有 Follower。Follower 依照 log 嘅順序 replay 每個寫入操作。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong style={{ color: '#34d399' }}>Client 從 Follower 讀取</strong>：READ 請求可以分散去任何一個 Follower，減輕 Leader 嘅壓力，提高整體讀取吞吐量。</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span><strong style={{ color: '#f87171' }}>注意 Replication Lag</strong>：Follower 嘅數據永遠落後 Leader。呢個時間差叫 replication lag，通常喺毫秒級，但 network 繁忙時可能升到秒級。</span>
        </li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階 Replication 模式</h2>
      <div className="subtitle">Sync vs Async / Multi-Leader / Leaderless</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Synchronous vs Asynchronous Replication</h4>
          <p>
            <strong style={{ color: '#3B82F6' }}>Sync</strong>：Leader 等 Follower 確認收到數據先返回 success。保證 consistency 但寫入 latency 高。
            <strong style={{ color: '#34d399' }}>Async</strong>：Leader 寫完即返回，唔等 Follower。寫入快但 Leader 掛咗可能丟失最近嘅數據。
            實際上好多系統用 <strong style={{ color: '#fbbf24' }}>Semi-sync</strong>：至少一個 Follower sync，其餘 async。平衡 durability 同 performance。
          </p>
        </div>
        <div className="key-point">
          <h4>Multi-Leader Replication</h4>
          <p>
            多個 Leader 都可以接收寫入，適合 <strong style={{ color: '#3B82F6' }}>多數據中心</strong> 部署。每個 data center 有一個 Leader，減少跨地域嘅 write latency。但最大嘅問題係 <strong style={{ color: '#f87171' }}>write conflict</strong>：兩個 Leader 可能同時修改同一行數據。常見 conflict resolution 策略：Last-Write-Wins（LWW）、Application-level merge、CRDT（Conflict-free Replicated Data Types）。
          </p>
        </div>
        <div className="key-point">
          <h4>Leaderless Replication（Dynamo-style）</h4>
          <p>
            冇 Leader 同 Follower 之分，所有節點都可以接收讀寫。用 <strong style={{ color: '#fbbf24' }}>Quorum</strong> 機制確保一致性：寫入要 W 個節點確認，讀取要 R 個節點回覆，只要 W + R &gt; N 就保證讀到最新數據。Amazon DynamoDB、Apache Cassandra 都係呢種模式。Trade-off 係實現複雜度高、conflict resolution 更難。
          </p>
        </div>
        <div className="key-point">
          <h4>Failover 策略</h4>
          <p>
            Leader 掛咗點算？需要 <strong style={{ color: '#34d399' }}>Failover</strong>：偵測 Leader 故障 → 選一個 Follower promote 做新 Leader → 重新配置其他 Follower 同 Application 指向新 Leader。自動 failover 快但有 split-brain 風險（兩個 node 都以為自己係 Leader）。手動 failover 安全但有 downtime。大部分生產系統用自動偵測 + 人工確認。
          </p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰 Replication 技巧</h2>
      <div className="subtitle">Read-After-Write / Failover / Lag 處理</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Read-After-Write Consistency</h4>
          <p>
            用戶寫完即 refresh，但從 Follower 讀到舊數據，體驗好差。解法：1) 自己改過嘅數據，短時間內強制從 Leader 讀（例如 profile update 後 30 秒內從 Leader 讀）。2) 記住最後寫入嘅 timestamp，只從已同步到呢個 timestamp 嘅 Follower 讀。3) 前端用 optimistic update，先顯示再後台確認。
          </p>
        </div>
        <div className="key-point">
          <h4>Failover 最佳實踐</h4>
          <p>
            1) 設定合理嘅 heartbeat timeout（太短容易誤判，太長 downtime 太久，建議 10-30 秒）。2) Promote replication lag 最小嘅 Follower。3) Failover 後檢查 data divergence。4) 舊 Leader 恢復後設為 Follower，唔好直接恢復 Leader 身份。5) 一定要有 <code style={{ color: '#60a5fa' }}>runbook</code> 同定期 drill。
          </p>
        </div>
        <div className="key-point">
          <h4>Replication Lag 監控</h4>
          <p>
            Replication lag 係 replication 架構最重要嘅健康指標。用 <code style={{ color: '#60a5fa' }}>SHOW SLAVE STATUS</code>（MySQL）或 <code style={{ color: '#60a5fa' }}>pg_stat_replication</code>（PostgreSQL）監控。設定 alert：lag &gt; 1s 就 warning，&gt; 10s 就 critical。持續高 lag 通常表示 Follower hardware 唔夠或者 write volume 太大。
          </p>
        </div>
        <div className="key-point">
          <h4>點揀 Replication 模式</h4>
          <p>
            <strong style={{ color: '#3B82F6' }}>單數據中心 + 讀擴展</strong> → Leader-Follower（最簡單、最常用）。
            <strong style={{ color: '#34d399' }}>多數據中心 + 低 latency</strong> → Multi-Leader（但要準備好處理 conflict）。
            <strong style={{ color: '#fbbf24' }}>超高可用 + 無單點故障</strong> → Leaderless（最複雜但最 resilient）。
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
        <h4>Prompt 1 — 設計 Database Replication 架構</h4>
        <div className="prompt-text">
          {'幫我設計一個 Database Replication 架構，database 用 [PostgreSQL / MySQL]，需求係 [高可用 / 讀取擴展 / 多地域部署]。\n\n要求包括：\n- 建議用 Leader-Follower / Multi-Leader / Leaderless，附上理由\n- Sync vs Async replication 嘅選擇同配置\n- Failover 策略：自動偵測 timeout、promote 邏輯、split-brain 防護\n- Read-after-write consistency 嘅實現方案\n- Replication lag 監控同 alerting 設定\n- 提供完整嘅配置範例同 failover 測試腳本\n- 語言用 [Node.js / Python / Go] 寫 application-level routing logic'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Replication Failover 演練計劃</h4>
        <div className="prompt-text">
          {'幫我設計一個 Database Replication Failover 演練計劃，場景係 [生產環境 / staging 環境]。\n\n要求包括：\n- Pre-drill checklist（backup、monitoring、通知團隊）\n- 模擬 Leader 故障嘅步驟（kill process / network partition / disk failure）\n- 驗證 automatic failover 嘅流程同時間\n- 檢查 data consistency：failover 前後嘅數據有冇 divergence\n- Rollback 計劃：如果 failover 出問題點樣恢復\n- Post-drill report template：記錄 RTO、RPO、發現嘅問題\n- 建議演練嘅頻率（每季 / 每半年）\n- 提供自動化腳本嚟執行同驗證整個 failover 過程'}
        </div>
      </div>
    </div>
  );
}

export default function DatabaseReplication() {
  return (
    <>
      <TopicTabs
        title="Database 複製"
        subtitle="搞清楚 Leader-Follower、Multi-Leader 同 Replication Lag 嘅核心概念"
        tabs={[
          { id: 'overview', label: '① Leader-Follower', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階模式', content: <AdvancedTab /> },
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
