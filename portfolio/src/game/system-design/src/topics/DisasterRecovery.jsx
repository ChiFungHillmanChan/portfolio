import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'RTO 同 RPO 最核心嘅分別係咩？',
    options: [
      { text: 'RTO 係備份嘅頻率，RPO 係恢復嘅速度', correct: false, explanation: '調轉咗。RPO 關係到備份頻率（可以容忍丟幾多數據），RTO 關係到恢復速度（可以容忍停機幾耐）。' },
      { text: 'RTO 係可以容忍嘅最長停機時間，RPO 係可以容忍嘅最大數據損失量', correct: true, explanation: 'RTO = Recovery Time Objective（幾快恢復服務），RPO = Recovery Point Objective（恢復到幾耐之前嘅數據）。例如 RTO = 1 小時代表停機最多 1 小時，RPO = 15 分鐘代表最多丟 15 分鐘嘅數據。' },
      { text: '兩者完全一樣，只係叫法唔同', correct: false, explanation: '完全唔同嘅概念。RTO 關注時間（停機幾耐），RPO 關注數據（丟幾多）。' },
      { text: 'RTO 只用喺 database，RPO 只用喺 server', correct: false, explanation: '兩者都係整個系統層面嘅指標，唔限於特定組件。' },
    ],
  },
  {
    question: 'Hot Standby 同 Cold Standby 最大嘅分別係咩？',
    options: [
      { text: 'Hot Standby 要人手啟動，Cold Standby 自動啟動', correct: false, explanation: '調轉咗。Hot Standby 隨時可以接管（自動 failover），Cold Standby 需要時間啟動同配置。' },
      { text: 'Hot Standby 隨時運行中可以即時接管，Cold Standby 需要時間啟動', correct: true, explanation: 'Hot Standby 嘅備用系統一直運行緊同步數據，failover 可以喺幾秒到幾分鐘內完成。Cold Standby 嘅備用系統係關閉嘅，需要啟動 + 配置 + 恢復數據，可能要幾小時。成本同恢復速度成正比。' },
      { text: 'Hot Standby 平啲，Cold Standby 貴啲', correct: false, explanation: '相反。Hot Standby 因為要一直運行備用系統，成本高好多。Cold Standby 唔使一直運行，成本最低。' },
      { text: '兩者恢復速度一樣', correct: false, explanation: 'Hot Standby 快好多（秒到分鐘級），Cold Standby 慢好多（小時級）。呢個就係用錢換時間。' },
    ],
  },
  {
    question: 'Chaos Engineering（例如 Netflix Chaos Monkey）嘅主要目的係咩？',
    options: [
      { text: '測試系統嘅效能上限', correct: false, explanation: '效能測試（load testing）同 chaos engineering 唔同。Chaos engineering 係故意製造故障。' },
      { text: '主動模擬故障嚟驗證系統嘅容錯能力同恢復機制', correct: true, explanation: 'Chaos Monkey 會隨機殺掉 production 嘅 server，逼迫團隊建立真正可靠嘅系統。如果你嘅 DR plan 從來冇測試過，緊急時候大概率會失敗。Chaos engineering 就係「平時多流汗，戰時少流血」。' },
      { text: '破壞競爭對手嘅系統', correct: false, explanation: 'Chaos engineering 係對自己嘅系統做測試，唔係攻擊行為。' },
      { text: '節省伺服器成本', correct: false, explanation: '隨機殺 server 唔係為咗省錢，係為咗測試容錯能力。實際上 chaos engineering 可能會短暫增加成本。' },
    ],
  },
  {
    question: '以下邊個備份策略可以用最少儲存空間完成一週嘅備份？',
    options: [
      { text: '每日做 Full Backup', correct: false, explanation: '每日 full backup 會用最多儲存空間。7 天就 7 份完整備份，極之浪費。' },
      { text: '每日做 Differential Backup', correct: false, explanation: 'Differential 每次備份自上次 full backup 以來嘅所有變更，隨住時間備份會越來越大。' },
      { text: '週一 Full Backup + 之後每日 Incremental Backup', correct: true, explanation: 'Incremental 只備份自上次備份以來嘅變更（最少嘅數據量）。週一做 full，之後每日嘅 incremental 都好細。缺點係恢復時要逐個 incremental 疊返去，但儲存空間最省。' },
      { text: '唔做備份，用 RAID 就夠', correct: false, explanation: 'RAID 係硬碟冗餘，唔係備份。RAID 唔保護你免受 software bug、人為刪除、ransomware 等問題。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'database-basics', label: 'Database 資料庫基礎' },
  { slug: 'monitoring', label: 'Monitoring 監控' },
  { slug: 'self-host-vs-cloud', label: '自建 vs 雲端' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>災難恢復係咩</h2>
      <div className="subtitle">RTO / RPO / 多區部署 / 備份策略</div>
      <p>
        災難恢復（Disaster Recovery，DR）就係：當你嘅系統出事（Server 爆炸、數據中心斷電、被 ransomware 加密、人為誤刪整個 database），你點樣用最快嘅速度恢復服務。重點係——唔係「會唔會出事」，而係「幾時出事」。所以 DR Plan 一定要提前準備好。
      </p>
      <p>
        兩個最重要嘅概念：<strong style={{ color: '#3B82F6' }}>RTO（Recovery Time Objective）</strong>——你可以容忍停機幾耐？1 分鐘？1 小時？1 日？<strong style={{ color: '#f87171' }}>RPO（Recovery Point Objective）</strong>——你可以容忍丟幾多數據？0（唔可以丟）？15 分鐘？1 日？RTO 同 RPO 越小，成本越高。呢個就係 trade-off。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradPrimary" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradBackup" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDB" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradUser" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDNS" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d1515" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>

          {/* Users + DNS */}
          <g transform="translate(20,155)">
            <rect width="100" height="70" rx="14" fill="url(#gradUser)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">Users</text>
            <text x="50" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">用戶請求</text>
          </g>

          <g transform="translate(155,155)">
            <rect width="110" height="70" rx="14" fill="url(#gradDNS)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="28" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">DNS</text>
            <text x="55" y="48" textAnchor="middle" fill="#f87171" fontSize="11">Failover</text>
            <text x="55" y="63" textAnchor="middle" fill="#9ca3af" fontSize="9">健康檢查 + 切換</text>
          </g>

          {/* Primary Region */}
          <g transform="translate(320,30)">
            <rect width="190" height="155" rx="14" fill="url(#gradPrimary)" stroke="#3B82F6" strokeWidth="2.5" filter="url(#glowBlue)" />
            <text x="95" y="25" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Primary Region</text>
            <text x="95" y="42" textAnchor="middle" fill="#60a5fa" fontSize="10">AWS us-east-1</text>
            {/* App */}
            <rect x="15" y="55" width="75" height="40" rx="8" fill="rgba(59,130,246,0.15)" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="52" y="78" textAnchor="middle" fill="#3B82F6" fontSize="10" fontWeight="600">App Server</text>
            {/* DB */}
            <rect x="100" y="55" width="75" height="40" rx="8" fill="rgba(139,92,246,0.15)" stroke="#8B5CF6" strokeWidth="1.5" />
            <text x="137" y="78" textAnchor="middle" fill="#8B5CF6" fontSize="10" fontWeight="600">Database</text>
            <text x="95" y="115" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">Active</text>
            <text x="95" y="132" textAnchor="middle" fill="#9ca3af" fontSize="9">處理所有流量</text>
          </g>

          {/* Backup Region */}
          <g transform="translate(320,220)">
            <rect width="190" height="155" rx="14" fill="url(#gradBackup)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="95" y="25" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Backup Region</text>
            <text x="95" y="42" textAnchor="middle" fill="#34d399" fontSize="10">AWS eu-west-1</text>
            {/* App */}
            <rect x="15" y="55" width="75" height="40" rx="8" fill="rgba(52,211,153,0.15)" stroke="#34d399" strokeWidth="1.5" />
            <text x="52" y="78" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">App Server</text>
            {/* DB */}
            <rect x="100" y="55" width="75" height="40" rx="8" fill="rgba(139,92,246,0.15)" stroke="#8B5CF6" strokeWidth="1.5" />
            <text x="137" y="78" textAnchor="middle" fill="#8B5CF6" fontSize="10" fontWeight="600">DB Replica</text>
            <text x="95" y="115" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">Standby</text>
            <text x="95" y="132" textAnchor="middle" fill="#9ca3af" fontSize="9">隨時準備接管</text>
          </g>

          {/* Replication arrows between regions */}
          <path d="M460,185 C480,195 480,215 460,220" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="5,3" markerEnd="url(#arrPurple)" />
          <text x="505" y="206" fill="#a78bfa" fontSize="9">Data Replication</text>

          <path d="M370,185 C350,195 350,215 370,220" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="5,3" markerEnd="url(#arrPurple)" />

          {/* RTO/RPO labels */}
          <g transform="translate(570,50)">
            <rect width="180" height="70" rx="12" fill="rgba(59,130,246,0.08)" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="90" y="22" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">RTO</text>
            <text x="90" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">Recovery Time Objective</text>
            <text x="90" y="58" textAnchor="middle" fill="#60a5fa" fontSize="10">可容忍停機時間</text>
          </g>

          <g transform="translate(570,140)">
            <rect width="180" height="70" rx="12" fill="rgba(248,113,113,0.08)" stroke="#f87171" strokeWidth="1.5" />
            <text x="90" y="22" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700">RPO</text>
            <text x="90" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">Recovery Point Objective</text>
            <text x="90" y="58" textAnchor="middle" fill="#fca5a5" fontSize="10">可容忍數據損失量</text>
          </g>

          {/* Failover arrow */}
          <g transform="translate(570,240)">
            <rect width="180" height="60" rx="12" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" strokeWidth="1.5" />
            <text x="90" y="22" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">Failover</text>
            <text x="90" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">Primary 掛 → DNS 切 Backup</text>
          </g>

          {/* User to DNS */}
          <path d="M122,190 C135,190 142,190 153,190" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrYellow)" />

          {/* DNS to Primary */}
          <path d="M267,175 C290,160 305,120 318,110" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="280" y="132" fill="#60a5fa" fontSize="9">正常路由</text>

          {/* DNS to Backup (failover) */}
          <path d="M267,205 C290,230 305,270 318,280" fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrRed)" />
          <text x="278" y="262" fill="#f87171" fontSize="9">Failover</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>完整流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>正常情況下，DNS 將用戶流量導去 Primary Region。Primary 嘅 Database 會持續做 Data Replication 到 Backup Region 嘅 DB Replica（同步或異步，視乎 RPO 要求）。</span></li>
        <li><span className="step-num">2</span><span>DNS Failover 持續做健康檢查（Health Check）。一旦偵測到 Primary Region 冇回應，就會自動將 DNS 指向 Backup Region。</span></li>
        <li><span className="step-num">3</span><span>Backup Region 嘅 Standby App Server 同 DB Replica 接管服務。RTO 就係從 Primary 掛到 Backup 完全接管嘅時間。RPO 就係最後一次成功 replication 到災難發生之間嘅數據量。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>DR 策略深入分析</h2>
      <div className="subtitle">Hot / Warm / Cold Standby / Pilot Light / Active-Active / 備份策略</div>
      <p>
        唔同嘅 DR 策略有唔同嘅成本同恢復速度。由最平（Cold Standby）到最貴（Active-Active），要根據業務嘅 RTO/RPO 要求嚟揀。以下逐個分析。
      </p>
      <div className="key-points">
        <div className="key-point">
          <h4>Hot Standby（熱備）</h4>
          <p>
            Backup Region 嘅所有組件一直運行緊，Database 做 <code style={{ color: '#60a5fa' }}>synchronous replication</code>。Failover 幾秒到幾分鐘內完成。RTO 極短，RPO 接近零。缺點：成本幾乎係 Primary 嘅兩倍，因為 Backup 一直開緊。適合銀行、交易系統等零停機要求嘅場景。
          </p>
        </div>
        <div className="key-point">
          <h4>Warm Standby（暖備）</h4>
          <p>
            Backup Region 用較細嘅 instance 運行緊（例如 Primary 用 8 台，Backup 用 2 台），Database 做 <code style={{ color: '#60a5fa' }}>asynchronous replication</code>。Failover 時需要 scale up Backup 嘅 instance 數量。RTO 大概 10-30 分鐘，RPO 幾分鐘。成本比 Hot Standby 低，但恢復唔算即時。
          </p>
        </div>
        <div className="key-point">
          <h4>Cold Standby（冷備）</h4>
          <p>
            Backup Region 嘅 Server 係關閉嘅，只有定期備份嘅 Database snapshot。災難發生時需要啟動 Server + 恢復 Database。RTO 可能幾小時到一日，RPO 取決於最後一次備份嘅時間。成本最低，但恢復最慢。適合非關鍵系統。
          </p>
        </div>
        <div className="key-point">
          <h4>Pilot Light（導航燈）</h4>
          <p>
            介乎 Warm 同 Cold 之間。核心組件（例如 Database replica）一直運行，但 App Server 係關閉嘅。災難時只需要啟動 App Server 同調整 DNS。比 Cold 快（唔使恢復 Database），比 Warm 平（唔使一直開 App Server）。
          </p>
        </div>
        <div className="key-point">
          <h4>Multi-Region Active-Active</h4>
          <p>
            兩個或以上嘅 Region 同時 active 處理流量。用 <code style={{ color: '#60a5fa' }}>global load balancer</code> 按地理位置分配。任何一個 Region 掛咗，流量自動導去其他 Region。RTO 接近零，但要處理 data consistency（跨 Region 嘅 write conflict）。成本最高，架構最複雜。
          </p>
        </div>
        <div className="key-point">
          <h4>備份策略：Full / Incremental / Differential</h4>
          <p>
            <strong style={{ color: '#34d399' }}>Full Backup：</strong>完整備份所有數據，恢復最簡單但佔空間最多。
            <strong style={{ color: '#fbbf24' }}> Incremental：</strong>只備份自上次備份以來嘅變更，佔空間最少但恢復要逐個疊。
            <strong style={{ color: '#8B5CF6' }}> Differential：</strong>備份自上次 Full Backup 以來嘅所有變更，空間同恢復速度都係中間值。建議策略：週一 Full + 每日 Incremental。
          </p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰 DR 策略</h2>
      <div className="subtitle">AWS Multi-AZ / 備份排程 / Chaos Engineering</div>
      <div className="key-points">
        <div className="key-point">
          <h4>AWS Multi-AZ 部署</h4>
          <p>AWS 嘅 Availability Zone（AZ）係同一個 Region 入面嘅獨立數據中心。RDS Multi-AZ 會自動喺另一個 AZ 維護 synchronous replica，Primary 掛咗自動 failover（1-2 分鐘）。呢個係最基本嘅 DR，一定要開。ECS/EKS 部署亦應該跨 AZ 分佈 task。</p>
        </div>
        <div className="key-point">
          <h4>Database 備份排程</h4>
          <p>建議策略：RDS 開啟 automated backup（retention 7-35 日）+ 每日 snapshot。S3 cross-region replication 將 backup 複製到另一個 Region。關鍵：一定要定期測試恢復流程！好多人做咗備份但從來冇試過恢復，結果真係要用嘅時候先發現 backup 壞咗。</p>
        </div>
        <div className="key-point">
          <h4>Chaos Engineering（Netflix Chaos Monkey）</h4>
          <p>Netflix 發明咗 Chaos Monkey——喺 production 環境隨機殺掉 server instance，逼迫工程師建立可以自動恢復嘅系統。進階版 Chaos Kong 會模擬整個 Region failure。建議：先喺 staging 環境開始，熟練之後再喺 production 做。用 AWS Fault Injection Simulator（FIS）可以安全咁做 chaos experiments。</p>
        </div>
        <div className="key-point">
          <h4>DR Plan 文檔同演練</h4>
          <p>DR Plan 一定要寫成文檔：邊個負責做咩、邊啲系統優先恢復、聯絡渠道、SOP 步驟。每季度做一次 DR drill（模擬災難演練），確保所有人都知道點做。好多公司嘅 DR Plan 只係一份從來冇人睇嘅 Word 文件——呢個等於冇 DR。</p>
        </div>
        <div className="key-point">
          <h4>Infrastructure as Code</h4>
          <p>用 Terraform 或 AWS CDK 將所有基礎設施寫成代碼。災難發生時，可以用 IaC 喺另一個 Region 快速重建整個環境，而唔使靠人手一個一個設定。呢個大幅縮短 RTO。記住：如果你嘅環境係人手 click 出嚟嘅，DR 嘅時候你會好痛苦。</p>
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
        <h4>Prompt 1 — 設計多區災難恢復架構</h4>
        <div className="prompt-text">
          幫手設計一套完整嘅 Disaster Recovery 架構，適用於 <span className="placeholder">[例如：SaaS 平台 / 金融交易系統 / 電商網站]</span>。{'\n\n'}業務需求：{'\n'}- RTO 目標：<span className="placeholder">[例如：5 分鐘 / 1 小時 / 4 小時]</span>{'\n'}- RPO 目標：<span className="placeholder">[例如：0（零數據損失）/ 15 分鐘 / 1 小時]</span>{'\n'}- 雲平台：<span className="placeholder">[例如：AWS / GCP / Azure]</span>{'\n'}- 月預算：<span className="placeholder">[例如：$1000 / $5000 / $20000]</span>{'\n'}- Primary Region：<span className="placeholder">[例如：us-east-1]</span>{'\n'}- Database：<span className="placeholder">[例如：PostgreSQL RDS / DynamoDB / MongoDB Atlas]</span>{'\n\n'}需要設計嘅部分：{'\n'}1. DR 策略選擇（Hot/Warm/Cold/Active-Active）同理由{'\n'}2. Database replication 方案（sync vs async、cross-region）{'\n'}3. DNS failover 配置（Route 53 health check）{'\n'}4. 備份策略（Full + Incremental 排程、retention policy）{'\n'}5. Failover SOP（逐步操作指引，包括人手同自動步驟）{'\n'}6. Failback 流程（恢復後點樣切返 Primary）{'\n'}7. 年度 DR drill 計劃{'\n\n'}請提供 Terraform/CDK 配置、架構圖、同成本估算。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 建立 Chaos Engineering 實驗</h4>
        <div className="prompt-text">
          幫手設計一套 Chaos Engineering 實驗計劃，驗證 <span className="placeholder">[例如：微服務架構 / Kubernetes 集群 / serverless 應用]</span> 嘅容錯能力。{'\n\n'}環境：{'\n'}- 技術棧：<span className="placeholder">[例如：EKS + RDS + ElastiCache + SQS]</span>{'\n'}- 目前 DR 策略：<span className="placeholder">[例如：Multi-AZ + daily backup]</span>{'\n'}- 團隊 on-call 制度：<span className="placeholder">[例如：有 / 冇]</span>{'\n\n'}需要設計嘅實驗：{'\n'}1. Instance failure：隨機殺掉一台 app server，驗證 auto-scaling 同 load balancer 健康檢查{'\n'}2. AZ failure：模擬整個 AZ 不可用{'\n'}3. Database failover：手動觸發 RDS failover，測量實際 RTO{'\n'}4. Dependency failure：模擬 Redis / SQS / 外部 API 不可用{'\n'}5. Network partition：模擬 Region 之間嘅網絡斷裂{'\n\n'}每個實驗需要：{'\n'}- 假設（Hypothesis）：預期系統會點反應{'\n'}- 執行步驟：用 <span className="placeholder">[AWS FIS / Litmus Chaos / Gremlin]</span>{'\n'}- 監控指標：需要觀察嘅 metrics{'\n'}- Abort 條件：幾時停止實驗{'\n'}- Blast radius 控制：限制影響範圍{'\n\n'}請提供完整嘅實驗配置文件同 runbook。
        </div>
      </div>
    </div>
  );
}

export default function DisasterRecovery() {
  return (
    <>
      <TopicTabs
        title="災難恢復"
        subtitle="RTO / RPO / 多區部署 / 備份策略"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'advanced', label: '② DR 策略', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰策略', premium: true, content: <PracticeTab /> },
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
