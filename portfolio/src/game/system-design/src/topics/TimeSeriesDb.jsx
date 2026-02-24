import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '時序數據（Time-Series Data）嘅最大特性係咩？',
    options: [
      { text: '數據量好少，唔需要特殊優化', correct: false, explanation: '時序數據通常量好大（每秒都有新數據點），需要特殊嘅寫入同壓縮優化先處理得到。' },
      { text: '以時間排序、append-only 為主，好少更新舊數據', correct: true, explanation: '時序數據嘅核心特性：1) 以時間為主要維度。2) 幾乎全部係 append（寫入新數據），好少 update 舊數據。3) 數據量隨時間線性增長。4) 查詢通常係 range-based（例如「過去 1 小時」「過去 7 天」）。呢啲特性令普通 DB 效率好低，時序 DB 就係專門為呢種 workload 優化。' },
      { text: '只可以存數字，唔可以存文字', correct: false, explanation: '時序數據唔限於數字。Tag（metadata）通常係 string，例如 server_name="web-01"。只係 value 通常係 numeric（CPU%、temperature）。' },
      { text: '必須用 NoSQL 先儲存得到', correct: false, explanation: 'SQL database（例如 TimescaleDB 基於 PostgreSQL）都可以有效處理時序數據。關鍵係 storage engine 同 index 嘅優化，唔係 SQL vs NoSQL 嘅問題。' },
    ],
  },
  {
    question: '點解普通嘅 RDBMS（例如 PostgreSQL）處理大量時序數據效率唔高？',
    options: [
      { text: '因為 PostgreSQL 唔支援 timestamp 類型', correct: false, explanation: 'PostgreSQL 完全支援 timestamp，呢個唔係問題。問題係 storage engine 同 index 嘅設計唔係為時序 workload 優化。' },
      { text: 'B-tree index 對時序寫入效率低，而且缺少自動壓縮同 retention 機制', correct: true, explanation: '普通 RDBMS 嘅問題：1) B-tree index 每次插入都要 rebalance，高速寫入時成為瓶頸。2) 冇內建嘅數據 retention policy（要自己寫 cron job 刪舊數據）。3) 冇針對時序數據嘅壓縮算法（delta-of-delta、Gorilla encoding）。4) 冇內建 downsampling。時序 DB 專門解決呢啲問題。' },
      { text: '因為 SQL 語法唔適合查詢時序數據', correct: false, explanation: 'SQL 完全可以查詢時序數據。TimescaleDB 就係用標準 SQL 嚟查詢。問題唔係語法，係 storage engine 嘅效率。' },
      { text: '因為 RDBMS 唔支援 distributed 部署', correct: false, explanation: '好多 RDBMS 都支援 distributed 部署（例如 PostgreSQL + Citus）。呢個唔係時序 DB 特有嘅優勢。' },
    ],
  },
  {
    question: 'Downsampling 喺時序數據庫入面嘅作用係咩？',
    options: [
      { text: '將數據從一台 server 搬到另一台', correct: false, explanation: '呢個係 data migration 唔係 downsampling。Downsampling 係減少數據精度嚟節省空間。' },
      { text: '將高精度舊數據聚合成低精度摘要，減少儲存空間', correct: true, explanation: '例如最近 7 天保留每秒嘅數據，7-30 天前保留每分鐘嘅平均值，30 天前只保留每小時嘅平均值。呢樣可以大幅減少儲存空間，同時保留長期趨勢。呢個係時序 DB 嘅核心功能之一。' },
      { text: '加快寫入速度', correct: false, explanation: 'Downsampling 係處理已經寫入嘅舊數據，唔會直接影響新數據嘅寫入速度。' },
      { text: '提高 query 嘅精確度', correct: false, explanation: 'Downsampling 係降低精確度（例如秒級 → 分鐘級），用精確度換空間。Query 長期趨勢嘅時候速度會更快，但精確度係降低嘅。' },
    ],
  },
  {
    question: '以下邊個唔係常見嘅時序數據庫？',
    options: [
      { text: 'InfluxDB', correct: false, explanation: 'InfluxDB 係最流行嘅時序數據庫之一，專門為 metrics 同 monitoring 設計。' },
      { text: 'TimescaleDB', correct: false, explanation: 'TimescaleDB 係基於 PostgreSQL 嘅時序數據庫擴展，用標準 SQL 查詢時序數據。' },
      { text: 'MongoDB', correct: true, explanation: 'MongoDB 係通用嘅 document database，唔係專門嘅時序 DB。雖然 MongoDB 5.0+ 加咗 time-series collection，但佢嘅核心唔係為時序 workload 優化。InfluxDB、TimescaleDB、Prometheus 先係專門嘅時序 DB。' },
      { text: 'Prometheus', correct: false, explanation: 'Prometheus 係專門為監控數據設計嘅時序數據庫，配合 Grafana 使用非常普遍。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'monitoring', label: '應用程式監控' },
  { slug: 'metrics-logging', label: '監控與日誌' },
  { slug: 'redis', label: 'Redis' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>時序數據庫</h2>
      <div className="subtitle">InfluxDB / 監控數據 / 寫入優化</div>
      <p>
        時序數據庫（Time-Series Database，簡稱 TSDB）係專門處理<strong style={{ color: '#3B82F6' }}>按時間排序、以追加寫入為主</strong>嘅數據。例如 server 嘅 CPU 使用率、溫度感應器嘅讀數、股票價格等等，全部都係時序數據。
      </p>
      <p>
        點解唔用普通嘅 PostgreSQL？因為時序數據有獨特嘅特性：<strong style={{ color: '#fbbf24' }}>寫入量極大</strong>（每秒數千到數百萬條）、<strong style={{ color: '#34d399' }}>幾乎唔更新舊數據</strong>、<strong style={{ color: '#f87171' }}>查詢以時間範圍為主</strong>。普通 DB 嘅 B-tree index 同 storage engine 對呢種 workload 效率好低。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gradSensor" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#fbbf24', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradBuffer" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#34d399', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradTSDB" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradDash" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#a78bfa', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#a78bfa" /></marker>
          </defs>

          {/* Data Sources */}
          <rect x="20" y="30" width="130" height="55" rx="12" fill="url(#gradSensor)" filter="url(#shadow)" />
          <text x="85" y="55" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">Server Metrics</text>
          <text x="85" y="72" textAnchor="middle" fill="#fde68a" fontSize="9">CPU / Memory / Disk</text>

          <rect x="20" y="110" width="130" height="55" rx="12" fill="url(#gradSensor)" filter="url(#shadow)" />
          <text x="85" y="135" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">IoT Sensors</text>
          <text x="85" y="152" textAnchor="middle" fill="#fde68a" fontSize="9">溫度 / 濕度 / 壓力</text>

          <rect x="20" y="190" width="130" height="55" rx="12" fill="url(#gradSensor)" filter="url(#shadow)" />
          <text x="85" y="215" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">App Metrics</text>
          <text x="85" y="232" textAnchor="middle" fill="#fde68a" fontSize="9">Latency / Error Rate</text>

          {/* Write Buffer */}
          <rect x="230" y="90" width="140" height="100" rx="14" fill="url(#gradBuffer)" filter="url(#shadow)" />
          <text x="300" y="120" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">Write Buffer</text>
          <text x="300" y="140" textAnchor="middle" fill="#6ee7b7" fontSize="10">批量寫入</text>
          <text x="300" y="158" textAnchor="middle" fill="#6ee7b7" fontSize="10">WAL 保護</text>
          <text x="300" y="176" textAnchor="middle" fill="#9ca3af" fontSize="9">In-memory batch</text>

          {/* TSDB */}
          <rect x="440" y="70" width="170" height="140" rx="14" fill="url(#gradTSDB)" filter="url(#shadow)" />
          <text x="525" y="100" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="700">TSDB</text>
          <text x="525" y="122" textAnchor="middle" fill="#93c5fd" fontSize="10">Time-Series Database</text>
          <line x1="455" y1="135" x2="595" y2="135" stroke="#2a3a4a" strokeWidth="1" />
          <text x="525" y="155" textAnchor="middle" fill="#e0e0e0" fontSize="10">Delta-of-Delta 壓縮</text>
          <text x="525" y="172" textAnchor="middle" fill="#e0e0e0" fontSize="10">Time-based 分區</text>
          <text x="525" y="189" textAnchor="middle" fill="#e0e0e0" fontSize="10">自動 Retention Policy</text>

          {/* Dashboard */}
          <rect x="680" y="50" width="100" height="55" rx="12" fill="url(#gradDash)" filter="url(#shadow)" />
          <text x="730" y="72" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">Grafana</text>
          <text x="730" y="90" textAnchor="middle" fill="#ddd6fe" fontSize="9">視覺化</text>

          <rect x="680" y="130" width="100" height="55" rx="12" fill="url(#gradDash)" filter="url(#shadow)" />
          <text x="730" y="152" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">Alerting</text>
          <text x="730" y="170" textAnchor="middle" fill="#ddd6fe" fontSize="9">告警系統</text>

          <rect x="680" y="210" width="100" height="55" rx="12" fill="url(#gradDash)" filter="url(#shadow)" />
          <text x="730" y="232" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">API</text>
          <text x="730" y="250" textAnchor="middle" fill="#ddd6fe" fontSize="9">數據查詢</text>

          {/* Arrows: Sources → Buffer */}
          <path d="M 152 57 Q 190 80 228 120" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrAmber)" />
          <path d="M 152 137 Q 190 137 228 137" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrAmber)" />
          <path d="M 152 217 Q 190 190 228 160" fill="none" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arrAmber)" />

          {/* Arrow: Buffer → TSDB */}
          <path d="M 372 140 Q 405 140 438 140" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="405" y="130" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">Batch Write</text>

          {/* Arrows: TSDB → Outputs */}
          <path d="M 612 110 Q 645 90 678 78" fill="none" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#arrBlue)" />
          <path d="M 612 140 Q 645 148 678 155" fill="none" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#arrBlue)" />
          <path d="M 612 175 Q 645 210 678 235" fill="none" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#arrBlue)" />

          {/* Bottom info */}
          <rect x="150" y="300" width="500" height="55" rx="12" fill="rgba(59,130,246,0.12)" stroke="#3B82F6" strokeWidth="1.5" />
          <text x="400" y="322" textAnchor="middle" fill="#93c5fd" fontSize="12" fontWeight="600">典型寫入量：每秒數萬到數百萬個 data point</text>
          <text x="400" y="342" textAnchor="middle" fill="#9ca3af" fontSize="11">Append-only + Time-ordered = 專門嘅 Storage Engine</text>
        </svg>
      </div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong style={{ color: '#fbbf24' }}>數據來源</strong>：Server metrics（CPU、Memory）、IoT sensors、Application metrics（latency、error rate）等。每個來源每秒都產生新數據。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong style={{ color: '#34d399' }}>Write Buffer 批量寫入</strong>：TSDB 用 in-memory buffer 收集數據，攢夠一批先一次寫入磁盤（batch write）。配合 WAL（Write-Ahead Log）確保唔會丟數據。比逐條寫入快好多倍。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong style={{ color: '#3B82F6' }}>TSDB 內部優化</strong>：用 delta-of-delta 壓縮 timestamp（因為時間間隔通常固定），用 Gorilla encoding 壓縮 float value。數據按時間分區（time-based partitioning），令 range query 超快。</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span><strong style={{ color: '#a78bfa' }}>查詢同視覺化</strong>：用 Grafana 建 dashboard 顯示趨勢圖，設定 alerting rule（例如 CPU &gt; 90% 就發 alert），或者通過 API 讓其他系統查詢。</span>
        </li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階時序數據庫概念</h2>
      <div className="subtitle">Retention Policy / Downsampling / 壓縮算法</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Data Retention Policy</h4>
          <p>
            時序數據量會隨時間不斷增長，唔可能全部保留。<strong style={{ color: '#3B82F6' }}>Retention Policy</strong> 定義數據保留幾耐：例如原始精度保留 7 天，之後自動刪除或者 downsample。InfluxDB 原生支援設定 retention period，過期數據自動清除。呢個係控制儲存成本嘅關鍵。
          </p>
        </div>
        <div className="key-point">
          <h4>Downsampling 降採樣</h4>
          <p>
            將高精度數據聚合成低精度摘要。例如：<strong style={{ color: '#34d399' }}>最近 24 小時</strong> → 每秒一個點。<strong style={{ color: '#fbbf24' }}>過去 7 天</strong> → 每分鐘平均值。<strong style={{ color: '#f87171' }}>過去 30 天</strong> → 每小時平均值。呢樣可以減少 90%+ 嘅儲存空間，同時保留長期趨勢。InfluxDB 用 Continuous Queries，Prometheus 用 Recording Rules 實現。
          </p>
        </div>
        <div className="key-point">
          <h4>壓縮算法</h4>
          <p>
            時序 DB 用特殊壓縮達到 10:1 甚至 20:1 嘅壓縮比。<strong style={{ color: '#3B82F6' }}>Delta-of-Delta</strong>：timestamp 嘅間隔通常固定（例如每 10 秒一次），只需要存差值嘅差值，幾個 bit 就夠。<strong style={{ color: '#34d399' }}>Gorilla Encoding</strong>（Facebook 發明）：相鄰嘅 float value 通常好接近，用 XOR 壓縮可以大幅減少空間。呢啲算法令 TSDB 可以喺有限硬件上處理海量數據。
          </p>
        </div>
        <div className="key-point">
          <h4>Cardinality 問題</h4>
          <p>
            時序 DB 嘅 tag 組合數量叫 <strong style={{ color: '#f87171' }}>cardinality</strong>。如果 tag 值太多（例如用 user_id 做 tag，而你有 1 億用戶），會造成「high cardinality」問題，令 index 爆大、query 變慢。解法：避免將 unbounded value（如 user_id、request_id）做 tag。只用有限集合嘅值（如 region、service_name）做 tag。
          </p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰時序 DB 選型同部署</h2>
      <div className="subtitle">InfluxDB vs TimescaleDB vs Prometheus / Grafana 整合</div>

      <div className="key-points">
        <div className="key-point">
          <h4>InfluxDB</h4>
          <p>
            最流行嘅專用 TSDB。<strong style={{ color: '#3B82F6' }}>優點</strong>：專為時序數據設計、內建 retention policy 同 downsampling、InfluxQL 或 Flux 查詢語言、部署簡單。<strong style={{ color: '#f87171' }}>缺點</strong>：唔支援 SQL、clustering 功能喺 OSS 版受限（企業版先有）、cardinality 問題需要小心處理。適合中小規模嘅 metrics 同 IoT 場景。
          </p>
        </div>
        <div className="key-point">
          <h4>TimescaleDB</h4>
          <p>
            基於 PostgreSQL 嘅 TSDB 擴展。<strong style={{ color: '#34d399' }}>優點</strong>：完整 SQL 支援、可以同 relational data 一齊用、PostgreSQL 生態系統（所有工具同 library 都兼容）、自動 time-based partitioning。<strong style={{ color: '#f87171' }}>缺點</strong>：比 InfluxDB 佔更多資源、壓縮比唔及專用 TSDB。適合已經用 PostgreSQL 而且想加時序功能嘅團隊。
          </p>
        </div>
        <div className="key-point">
          <h4>Prometheus</h4>
          <p>
            專為 Kubernetes 同雲原生監控設計。<strong style={{ color: '#fbbf24' }}>Pull-based model</strong>：Prometheus 主動去 scrape target 嘅 metrics endpoint。內建 alerting 同 recording rules。用 PromQL 查詢（功能強大但學習曲線陡）。<strong style={{ color: '#f87171' }}>缺點</strong>：唔適合長期存儲（通常只保留 15-30 天），長期存儲要配合 Thanos 或 Cortex。
          </p>
        </div>
        <div className="key-point">
          <h4>Grafana 整合</h4>
          <p>
            無論用邊個 TSDB，Grafana 都係最常用嘅視覺化工具。設定步驟：1) 加 data source（InfluxDB / Prometheus / TimescaleDB）。2) 建 dashboard，選 time range 同 aggregation function。3) 設定 alert rule（例如 <code style={{ color: '#60a5fa' }}>avg(cpu_usage) &gt; 90%</code> 持續 5 分鐘就 fire）。4) 配置 notification channel（Slack、PagerDuty、Email）。呢個 stack 係業界標準嘅監控方案。
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
        <h4>Prompt 1 — 設計 Monitoring Stack 架構</h4>
        <div className="prompt-text">
          {'幫我設計一個完整嘅 monitoring stack，場景係 [Kubernetes 集群監控 / IoT 設備監控 / 微服務 APM]，預計 [X] 個 data source，每秒 [Y] 個 data point。\n\n要求包括：\n- 選用邊個 TSDB（InfluxDB / Prometheus / TimescaleDB），附上理由\n- 數據收集方式：push vs pull model，用咩 agent（Telegraf / Node Exporter / OpenTelemetry）\n- Data retention policy：幾個 tier 嘅保留策略同 downsampling 規則\n- Grafana Dashboard 設計：列出需要嘅 panel 同 query\n- Alerting 規則：定義 warning 同 critical 閾值\n- 估算儲存空間需求同硬件配置\n- 提供 Docker Compose 配置嚟一鍵部署成個 stack'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — TSDB 選型同性能優化</h4>
        <div className="prompt-text">
          {'比較以下三個 Time-Series Database 嘅適用場景同 trade-off：\n\n- InfluxDB\n- TimescaleDB\n- Prometheus + Thanos\n\n分析維度：\n- 寫入吞吐量（每秒幾多個 data point）\n- 查詢延遲（P50 / P99）\n- 壓縮比同儲存效率\n- 水平擴展能力\n- 學習曲線同社區活躍度\n- High Cardinality 處理能力\n- 長期存儲方案\n\n場景係：[描述你嘅具體 workload，例如 1000 台 server 嘅 infra monitoring]\n最後建議用邊個，附上完整嘅部署同優化配置'}
        </div>
      </div>
    </div>
  );
}

export default function TimeSeriesDb() {
  return (
    <>
      <TopicTabs
        title="時序數據庫"
        subtitle="搞清楚 TSDB 嘅特性、壓縮算法同監控架構"
        tabs={[
          { id: 'overview', label: '① 時序數據特性', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階概念', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 選型同部署', premium: true, content: <PracticeTab /> },
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
