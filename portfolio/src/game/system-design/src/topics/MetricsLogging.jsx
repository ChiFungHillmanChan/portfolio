import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Metrics 同 Logs 嘅分別係咩？',
    options: [
      { text: '兩者完全一樣，只係叫法唔同', correct: false, explanation: 'Metrics 同 Logs 係完全唔同嘅概念，收集方式同用途都唔同' },
      { text: 'Metrics 係數字指標（如 CPU%、QPS），Logs 係文字記錄（如邊個 API 幾時出錯）', correct: true, explanation: '啱！Metrics 係可量化嘅數字，用嚟做 dashboard 同 alerting。Logs 係事件嘅文字記錄，用嚟排查具體問題' },
      { text: 'Metrics 係 frontend 用嘅，Logs 係 backend 用嘅', correct: false, explanation: 'Frontend 同 Backend 都可以產生 Metrics 同 Logs' },
      { text: 'Metrics 唔使存儲，Logs 先至要', correct: false, explanation: '兩者都需要存儲，Metrics 通常存入 Time Series DB，Logs 存入 Elasticsearch' },
    ],
  },
  {
    question: '完整嘅 observability pipeline 流程係點？',
    options: [
      { text: '直接睇 console.log', correct: false, explanation: 'console.log 只係最基本嘅做法，唔夠 production 使用' },
      { text: 'App 產生數據 → Log Agent 收集 → Kafka buffer → Time Series DB / Elasticsearch → Grafana 視覺化', correct: true, explanation: '啱！數據由 App 產生，經 Agent（如 Filebeat）收集，Kafka 做 buffer 避免數據丟失，最後存入 DB 再用 Grafana 畫圖表' },
      { text: '手動 SSH 入去 server 睇 log file', correct: false, explanation: '手動 SSH 唔 scale，有多部 server 就冇辦法逐部去睇' },
      { text: '只要裝 Grafana 就夠', correct: false, explanation: 'Grafana 只係視覺化工具，仲需要 data source（如 Prometheus、Elasticsearch）同 data collection pipeline' },
    ],
  },
  {
    question: '點解需要 Kafka 做 buffer layer？',
    options: [
      { text: '因為 Kafka 可以加密數據', correct: false, explanation: 'Kafka 嘅主要作用唔係加密，而係做 buffer' },
      { text: '防止 log 數據量突然暴增時壓垮存儲層，做到削峰填谷', correct: true, explanation: '啱！當 traffic spike 產生大量 log 時，Kafka 可以暫存數據，下游 consumer 按自己嘅速度慢慢處理，避免 Elasticsearch 被壓垮' },
      { text: '因為冇 Kafka 就冇辦法產生 log', correct: false, explanation: 'App 自己就可以產生 log，Kafka 係中間嘅 transport layer' },
      { text: '因為 Grafana 只支援 Kafka 做 data source', correct: false, explanation: 'Grafana 支援好多 data source（Prometheus、Elasticsearch 等），唔係只支援 Kafka' },
    ],
  },
];

const relatedTopics = [
  { slug: 'monitoring', label: '應用程式監控' },
  { slug: 'cicd-pipeline', label: 'CI/CD 自動化部署' },
  { slug: 'fix-slow-database', label: 'Debug 慢嘅 Database' },
  { slug: 'system-design-patterns', label: '系統設計模式總覽' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Metrics &amp; Logging 係咩？</h2>
      <div className="subtitle">點樣收集系統運行數據，做監控、告警同排查問題</div>
      <p>
        系統出咗事，點樣知？CPU 爆咗、請求慢、錯誤率升……靠嘅就係 <strong style={{ color: '#6366f1' }}>Metrics（指標）</strong> 同 <strong style={{ color: '#6366f1' }}>Logs（日誌）</strong> 嚟掌握系統狀態。必須分清楚：Metrics 係數字（CPU%、QPS、延遲），Logs 係文字記錄（邊個 API 幾時出錯）。
      </p>
      <p>
        成條 pipeline 嘅流程：呢啲數據由 App Server 產生，經過 Log Agent 收集，再送去 Kafka 做 buffer，最後存入 Time Series DB 或 Elasticsearch，用 Grafana 畫圖表。記住呢個流程。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#3B82F6" floodOpacity="0.25" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowKafka" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#10B981" floodOpacity="0.25" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowGrafana" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#6366f1" floodOpacity="0.25" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2540" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a2518" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2e28" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#252040" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradIndigo" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#252840" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8b5cf6" /></marker>
          </defs>

          <g transform="translate(20,130)">
            <rect width="100" height="60" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="50" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">App</text>
            <text x="50" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">Servers</text>
          </g>

          <g transform="translate(160,120)">
            <rect width="120" height="70" rx="12" fill="url(#gradAmber)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="700">Log Agent</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Fluentd / Filebeat</text>
          </g>

          <g transform="translate(330,80)">
            <rect width="120" height="80" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#glowKafka)" />
            <text x="60" y="28" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">Kafka</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Buffer</text>
            <text x="60" y="68" textAnchor="middle" fill="#34d399" fontSize="10">高吞吐</text>
          </g>

          <g transform="translate(500,30)">
            <rect width="110" height="55" rx="12" fill="url(#gradPurple)" stroke="#8b5cf6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="24" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="700">Time Series DB</text>
            <text x="55" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">InfluxDB / Prometheus</text>
          </g>

          <g transform="translate(500,120)">
            <rect width="110" height="55" rx="12" fill="url(#gradPurple)" stroke="#8b5cf6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="24" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="700">Elasticsearch</text>
            <text x="55" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">全文搜尋 Log</text>
          </g>

          <g transform="translate(500,210)">
            <rect width="140" height="60" rx="12" fill="url(#gradIndigo)" stroke="#6366f1" strokeWidth="2" filter="url(#glowGrafana)" />
            <text x="70" y="28" textAnchor="middle" fill="#6366f1" fontSize="13" fontWeight="700">Grafana</text>
            <text x="70" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Dashboard / 告警</text>
          </g>

          <path d="M122,160 C138,158 148,156 158,155" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="138" y="150" textAnchor="middle" fill="#a5b4fc" fontSize="9">Logs / Metrics</text>

          <path d="M282,155 C300,145 315,138 328,130" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrGreen)" />
          <text x="300" y="138" textAnchor="middle" fill="#34d399" fontSize="9">Push</text>

          <path d="M452,100 C470,85 480,70 498,58" stroke="#8b5cf6" strokeWidth="1.5" fill="none" markerEnd="url(#arrPurple)" />
          <path d="M452,130 C470,135 480,140 498,148" stroke="#8b5cf6" strokeWidth="1.5" fill="none" markerEnd="url(#arrPurple)" />

          <path d="M555,90 C560,130 565,170 570,208" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <path d="M555,176 C558,188 562,198 570,208" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="620" y="145" textAnchor="middle" fill="#a5b4fc" fontSize="9">Query</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>成個流程點樣運作</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>App Server 產生 Log（寫入檔）同 Metrics（記憶體計數）。Log Agent（Fluentd、Filebeat）會定期讀取或接收推送。重點係：呢個係數據嘅源頭。</span></li>
        <li><span className="step-num">2</span><span>Log Agent 將數據 push 去 Kafka。Kafka 嘅角色好重要——做 buffer：流量突增時下游唔使即時處理，可以慢慢消費，唔會丟數據。</span></li>
        <li><span className="step-num">3</span><span>時序數據（CPU、QPS）去 Time Series DB；Log 文字去 Elasticsearch。Grafana 畫圖表同設定告警規則。記住呢個分工。</span></li>
      </ol>
    </div>
  );
}

function CollectTab() {
  return (
    <div className="card">
      <h2>收集模式：Push vs Pull</h2>
      <div className="subtitle">兩種唔同嘅方式去收集 Metrics 同 Logs</div>
      <p>
        必須分清楚兩種模式。<strong style={{ color: '#34d399' }}>Push 模式</strong>：App 主動將數據送去 collector。適合分散式系統，每個服務自己 push。缺點係 collector 要處理大量連接。
      </p>
      <p>
        <strong style={{ color: '#f59e0b' }}>Pull 模式</strong>：Collector（例如 Prometheus）主動去 scrape 每個 target 嘅 metrics endpoint。集中管理，容易加減 target。Prometheus 就用呢種。建議兩種都要識。
      </p>
      <div className="key-points">
        <div className="key-point">
          <h4>Push vs Pull 收集</h4>
          <p>Push：App → Collector。Pull：Collector 定期去 App 攞。原則係：Log 通常 Push，Metrics 兩種都得。根據場景揀。</p>
        </div>
        <div className="key-point">
          <h4>Kafka Buffer</h4>
          <p>重點係：高流量時下游可能處理唔切。Kafka 做 buffer，解耦 producer 同 consumer，唔會丟數據。呢個係關鍵設計。</p>
        </div>
        <div className="key-point">
          <h4>Time Series DB</h4>
          <p>InfluxDB、Prometheus、VictoriaMetrics 專為時序數據設計，壓縮好、查詢快。建議一定要學識用至少一種。</p>
        </div>
        <div className="key-point">
          <h4>Alert Rules</h4>
          <p>設定告警嘅方法：CPU &gt; 80% 就發 Slack、錯誤率升就 call on-call。Grafana Alertmanager 係最常用嘅組合。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">監控系統設計嘅關鍵決策</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Push vs Pull 收集</h4>
          <p>Push 適合分散式、短生命週期服務（例如 Kubernetes Pod）。Pull 適合集中管理、穩定嘅 target list。根據架構去揀。</p>
        </div>
        <div className="key-point">
          <h4>Kafka Buffer</h4>
          <p>重要原則：千萬唔好 App 直接寫 DB。Kafka 做 buffer，下游可以慢慢處理，流量高峰都頂得住。呢個係實戰經驗。</p>
        </div>
        <div className="key-point">
          <h4>Time Series DB</h4>
          <p>點揀：Metrics 用 InfluxDB、Prometheus；Log 用 Elasticsearch。唔好用 MySQL 存時序數據，會好慢。記住呢個 trade-off。</p>
        </div>
        <div className="key-point">
          <h4>Alert Rules</h4>
          <p>建議學識 Golden Signals：延遲、吞吐量、錯誤率、飽和度。設定合理 threshold，避免告警疲勞。呢四個指標係起步點。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>推薦嘅常見組合</h4>
        <p>Prometheus + Grafana 做 metrics；Elasticsearch + Kibana 做 log 搜尋；Loki 係 lightweight 嘅 log 方案。Kafka 串起成條 pipeline，確保高可用。跟住呢個組合去學就啱。</p>
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
        <h4>Prompt 1 — 設計 Metrics + Logging 基礎設施</h4>
        <div className="prompt-text">
          為 <span className="placeholder">[項目名稱，例如：SaaS 訂閱平台]</span> 設計一套完整嘅 Metrics 同 Logging 基礎設施。{'\n\n'}
          技術棧：<span className="placeholder">[例如：Node.js + PostgreSQL + Redis，部署喺 AWS ECS]</span>{'\n\n'}
          請輸出以下內容：{'\n'}
          1. Metrics Pipeline 架構圖（文字描述）：App → Log Agent → Kafka → Time Series DB → Grafana{'\n'}
          2. 需要收集嘅 Golden Signals：Latency（p50/p95/p99）、Traffic（RPS）、Error Rate、Saturation（CPU/Memory）{'\n'}
          3. 每個 Metric 嘅具體實現方式（用咩 Library、點樣 instrument code）{'\n'}
          4. Kafka 作為 Buffer 嘅配置建議（Topic 設計、Retention Policy、Consumer Group）{'\n'}
          5. Grafana Dashboard 佈局設計（幾個 Panel、每個 Panel 顯示咩數據）{'\n'}
          6. Alert Rules 清單（至少 5 條，包括 Threshold 同通知渠道）{'\n\n'}
          最後列出部署順序同估算嘅 Infrastructure 成本。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 建立 Structured Logging Pipeline</h4>
        <div className="prompt-text">
          為 <span className="placeholder">[微服務名稱，例如：Payment Service]</span> 建立一套 Structured Logging Pipeline。{'\n\n'}
          要求：{'\n'}
          1. 定義統一嘅 Log Format（JSON），包含以下 Fields：{'\n'}
          {'   '}- timestamp, service_name, log_level, trace_id, span_id{'\n'}
          {'   '}- request_id, user_id, endpoint, method, status_code{'\n'}
          {'   '}- duration_ms, error_message, stack_trace（如適用）{'\n\n'}
          2. 用 <span className="placeholder">[語言/框架，例如：Node.js + Winston]</span> 寫一個 Logger Utility，支持：{'\n'}
          {'   '}- 自動注入 trace_id 同 request_id{'\n'}
          {'   '}- 區分 INFO / WARN / ERROR / DEBUG 級別{'\n'}
          {'   '}- 喺 Production 自動隱藏 DEBUG 級別{'\n\n'}
          3. Log 收集方案：Fluentd 配置檔，將 Log 送去 Elasticsearch{'\n'}
          4. Kibana 查詢模板：5 個常用嘅 Query（例如「過去 1 小時所有 5xx 錯誤」）{'\n'}
          5. Log Rotation 同 Retention 策略建議{'\n\n'}
          請直接輸出可以用嘅 Code 同 Config 檔案。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 設計 Alerting 規則同 Runbook</h4>
        <div className="prompt-text">
          為 <span className="placeholder">[系統名稱，例如：電商平台]</span> 設計一套完整嘅 Alerting 規則同對應嘅 Runbook。{'\n\n'}
          系統架構：<span className="placeholder">[簡述，例如：3 個微服務 + PostgreSQL + Redis + Nginx]</span>{'\n\n'}
          請輸出：{'\n'}
          1. 至少 8 條 Alert Rules，每條包含：{'\n'}
          {'   '}- 指標名稱同 PromQL 表達式{'\n'}
          {'   '}- Threshold 數值（Warning 同 Critical 兩個級別）{'\n'}
          {'   '}- 通知渠道（Slack / Email / PagerDuty）{'\n'}
          {'   '}- 預期觸發頻率{'\n\n'}
          2. 每條 Alert 對應嘅 Runbook，包含：{'\n'}
          {'   '}- 問題描述（呢個 Alert 代表咩情況）{'\n'}
          {'   '}- 排查步驟（由第一步到定位問題嘅完整流程）{'\n'}
          {'   '}- 常見根因（Top 3 最可能嘅原因）{'\n'}
          {'   '}- 修復方案（臨時同永久嘅解決方法）{'\n\n'}
          3. Alert 分組同靜默策略（避免 Alert Fatigue）
        </div>
      </div>
    </div>
  );
}

export default function MetricsLogging() {
  return (
    <>
      <TopicTabs
        title="Metrics & Logging 監控日誌系統"
        subtitle="點樣設計時序數據收集同 aggregation pipeline"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'collect', label: '② 收集模式', content: <CollectTab /> },
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
