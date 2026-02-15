import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'metrics-logging', label: 'Metrics & Logging 監控日誌' },
  { slug: 'cicd-pipeline', label: 'CI/CD 自動化部署' },
  { slug: 'deployment', label: '免費部署平台' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
];

function ToolsTab() {
  return (
    <>
      <div className="card">
        <h2>點解需要監控工具？</h2>
        <div className="subtitle">console.log 嘅局限性</div>
        <p>
          好多時候 service 不停 crash，但排查方法得返 <strong style={{ color: '#f87171' }}>console.log</strong> 或者 <strong style={{ color: '#f87171' }}>print</strong>。呢種做法喺 production 環境完全唔夠用 — 無法追蹤歷史數據、無法設置告警、更加無法做到實時可視化。
        </p>
        <p>
          正確嘅做法係引入專業監控工具。核心組合：<strong style={{ color: '#6366f1' }}>Prometheus</strong> 負責收集 metrics，<strong style={{ color: '#34d399' }}>Grafana</strong> 負責可視化，<strong style={{ color: '#f59e0b' }}>ELK Stack</strong>（Elasticsearch + Logstash + Kibana）負責日誌管理。呢三樣工具組合起嚟，就可以全面掌握系統健康狀態。
        </p>

        <div className="diagram-container">
          <svg viewBox="0 0 780 380" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
              </filter>
              <filter id="glowProm" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="#6366f1" floodOpacity="0.3" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="gradApp" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="gradProm" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4338ca" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="gradGrafana" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#065f46" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="gradLogstash" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#92400e" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="gradES" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#854d0e" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="gradKibana" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9a3412" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <marker id="arrowIndigo" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
              </marker>
              <marker id="arrowGreen" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#34d399" />
              </marker>
              <marker id="arrowAmber" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
              </marker>
            </defs>

            <text x="390" y="30" fill="#6366f1" fontSize="13" fontWeight="600" textAnchor="middle">Metrics Path</text>

            <rect x="20" y="140" width="150" height="60" rx="14" fill="url(#gradApp)" filter="url(#shadow)" stroke="#475569" strokeWidth="1" />
            <text x="95" y="167" fill="#e2e8f0" fontSize="13" fontWeight="600" textAnchor="middle">Application</text>
            <text x="95" y="185" fill="#94a3b8" fontSize="10" textAnchor="middle">Emit metrics + logs</text>

            <rect x="260" y="60" width="160" height="60" rx="14" fill="url(#gradProm)" filter="url(#glowProm)" stroke="#6366f1" strokeWidth="1.5" />
            <text x="340" y="87" fill="#a5b4fc" fontSize="13" fontWeight="600" textAnchor="middle">Prometheus</text>
            <text x="340" y="105" fill="#94a3b8" fontSize="10" textAnchor="middle">Metrics Collection</text>

            <rect x="520" y="60" width="160" height="60" rx="14" fill="url(#gradGrafana)" filter="url(#shadow)" stroke="#34d399" strokeWidth="1" />
            <text x="600" y="87" fill="#6ee7b7" fontSize="13" fontWeight="600" textAnchor="middle">Grafana</text>
            <text x="600" y="105" fill="#94a3b8" fontSize="10" textAnchor="middle">Dashboards</text>

            <path d="M170,155 C215,155 215,90 260,90" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowIndigo)" />
            <text x="210" y="110" fill="#818cf8" fontSize="9" textAnchor="middle">metrics</text>

            <path d="M420,90 C470,90 470,90 520,90" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrowGreen)" />
            <text x="470" y="80" fill="#6ee7b7" fontSize="9" textAnchor="middle">query</text>

            <text x="390" y="210" fill="#f59e0b" fontSize="13" fontWeight="600" textAnchor="middle">Logs Path (ELK Stack)</text>

            <rect x="260" y="240" width="160" height="60" rx="14" fill="url(#gradLogstash)" filter="url(#shadow)" stroke="#f59e0b" strokeWidth="1" />
            <text x="340" y="267" fill="#fbbf24" fontSize="13" fontWeight="600" textAnchor="middle">Logstash</text>
            <text x="340" y="285" fill="#94a3b8" fontSize="10" textAnchor="middle">Log Ingestion</text>

            <rect x="520" y="240" width="160" height="60" rx="14" fill="url(#gradES)" filter="url(#shadow)" stroke="#f59e0b" strokeWidth="1" />
            <text x="600" y="267" fill="#fbbf24" fontSize="13" fontWeight="600" textAnchor="middle">Elasticsearch</text>
            <text x="600" y="285" fill="#94a3b8" fontSize="10" textAnchor="middle">Log Storage + Search</text>

            <rect x="520" y="330" width="160" height="40" rx="14" fill="url(#gradKibana)" filter="url(#shadow)" stroke="#fb923c" strokeWidth="1" />
            <text x="600" y="355" fill="#fdba74" fontSize="13" fontWeight="600" textAnchor="middle">Kibana</text>

            <path d="M170,185 C215,185 215,270 260,270" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowAmber)" />
            <text x="210" y="240" fill="#fbbf24" fontSize="9" textAnchor="middle">logs</text>

            <path d="M420,270 C470,270 470,270 520,270" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowAmber)" />
            <text x="470" y="260" fill="#fbbf24" fontSize="9" textAnchor="middle">index</text>

            <path d="M600,300 C600,310 600,320 600,330" fill="none" stroke="#fb923c" strokeWidth="1.5" markerEnd="url(#arrowAmber)" />
          </svg>
        </div>
      </div>

      <div className="card">
        <h2>工具分工</h2>
        <div className="subtitle">每個工具嘅角色同職責</div>
        <div className="key-points">
          <div className="key-point">
            <h4>Prometheus</h4>
            <p>以 pull model 主動拉取 metrics，支援時序數據儲存。適合追蹤 CPU、memory、request count 等數值型指標。</p>
          </div>
          <div className="key-point">
            <h4>Grafana</h4>
            <p>連接 Prometheus 做數據源，將 metrics 變成圖表同 dashboard。一眼就睇到系統健康狀態。</p>
          </div>
          <div className="key-point">
            <h4>Elasticsearch</h4>
            <p>全文搜索引擎，用嚟儲存同搜索大量 log 數據。支援複雜嘅 query 去搵特定錯誤。</p>
          </div>
          <div className="key-point">
            <h4>Logstash + Kibana</h4>
            <p>Logstash 負責收集同轉換 log 格式；Kibana 提供 UI 去查詢同可視化 log 數據。</p>
          </div>
        </div>
      </div>
    </>
  );
}

function MetricsTab() {
  return (
    <>
      <div className="card">
        <h2>必須追蹤嘅關鍵指標</h2>
        <div className="subtitle">5 個最重要嘅 production metrics</div>
        <p>
          監控嘅核心唔係收集越多數據越好，而係識得揀 <strong style={{ color: '#6366f1' }}>最關鍵嘅指標</strong>。以下呢五個指標覆蓋咗系統健康嘅各個維度 — 資源、流量、質量同速度。
        </p>

        <div className="key-points">
          <div className="key-point">
            <h4>CPU Utilization</h4>
            <p>CPU 使用率反映計算資源嘅壓力。持續超過 80% 就要考慮 scale up 或者優化 code。</p>
          </div>
          <div className="key-point">
            <h4>Memory Utilization</h4>
            <p>記憶體使用率過高可能係 memory leak。需要持續監控走勢，唔係淨係睇當前值。</p>
          </div>
          <div className="key-point">
            <h4>Traffic Volume</h4>
            <p>每秒請求數（RPS）反映流量負載。異常飆升可能係 DDoS，突然下跌可能係 service 故障。</p>
          </div>
          <div className="key-point">
            <h4>Error Rate</h4>
            <p>錯誤率係 5xx 回應佔總請求嘅百分比。正常情況應該低過 0.1%，超過就要立即排查。</p>
          </div>
        </div>

        <div className="use-case">
          <h4>Latency（平均延遲）</h4>
          <p>每個 request 嘅平均回應時間。建議同時追蹤 p50、p95、p99 — 平均值有時會掩蓋長尾問題。p99 latency 先至真正反映用戶體驗。</p>
        </div>
      </div>

      <div className="card">
        <h2>Dashboard 概覽</h2>
        <div className="subtitle">典型嘅 Grafana Dashboard 佈局</div>

        <div className="diagram-container">
          <svg viewBox="0 0 780 360" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadowD" x="-4%" y="-4%" width="108%" height="108%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
              </filter>
              <linearGradient id="gradPanel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="gradCPU" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="gradMem" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.1" /><stop offset="100%" stopColor="#34d399" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="gradErr" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#f87171" stopOpacity="0.1" /><stop offset="100%" stopColor="#f87171" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="gradLat" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            <text x="390" y="28" fill="#e2e8f0" fontSize="14" fontWeight="700" textAnchor="middle">Production Monitoring Dashboard</text>

            <rect x="20" y="50" width="175" height="130" rx="14" fill="url(#gradPanel)" filter="url(#shadowD)" stroke="#2a2d3a" strokeWidth="1" />
            <text x="107" y="75" fill="#a5b4fc" fontSize="11" fontWeight="600" textAnchor="middle">CPU Utilization</text>
            <text x="107" y="100" fill="#6366f1" fontSize="22" fontWeight="700" textAnchor="middle">42%</text>
            <path d="M40,145 C55,140 70,148 85,135 C100,125 115,138 130,130 C145,125 160,132 175,128" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
            <path d="M40,145 C55,140 70,148 85,135 C100,125 115,138 130,130 C145,125 160,132 175,128 L175,165 L40,165 Z" fill="url(#gradCPU)" />

            <rect x="210" y="50" width="175" height="130" rx="14" fill="url(#gradPanel)" filter="url(#shadowD)" stroke="#2a2d3a" strokeWidth="1" />
            <text x="297" y="75" fill="#6ee7b7" fontSize="11" fontWeight="600" textAnchor="middle">Memory Usage</text>
            <text x="297" y="100" fill="#34d399" fontSize="22" fontWeight="700" textAnchor="middle">67%</text>
            <path d="M230,145 C245,138 260,142 275,136 C290,142 305,132 320,140 C335,135 350,142 365,138" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
            <path d="M230,145 C245,138 260,142 275,136 C290,142 305,132 320,140 C335,135 350,142 365,138 L365,165 L230,165 Z" fill="url(#gradMem)" />

            <rect x="400" y="50" width="175" height="130" rx="14" fill="url(#gradPanel)" filter="url(#shadowD)" stroke="#2a2d3a" strokeWidth="1" />
            <text x="487" y="75" fill="#fca5a5" fontSize="11" fontWeight="600" textAnchor="middle">Error Rate</text>
            <text x="487" y="100" fill="#f87171" fontSize="22" fontWeight="700" textAnchor="middle">0.03%</text>
            <path d="M420,155 C435,155 450,152 465,155 C480,153 495,155 510,150 C525,155 540,153 555,155" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            <path d="M420,155 C435,155 450,152 465,155 C480,153 495,155 510,150 C525,155 540,153 555,155 L555,165 L420,165 Z" fill="url(#gradErr)" />

            <rect x="590" y="50" width="175" height="130" rx="14" fill="url(#gradPanel)" filter="url(#shadowD)" stroke="#2a2d3a" strokeWidth="1" />
            <text x="677" y="75" fill="#fbbf24" fontSize="11" fontWeight="600" textAnchor="middle">Avg Latency</text>
            <text x="677" y="100" fill="#f59e0b" fontSize="22" fontWeight="700" textAnchor="middle">128ms</text>
            <path d="M610,142 C625,145 640,138 655,145 C670,140 685,148 700,135 C715,140 730,138 745,142" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <path d="M610,142 C625,145 640,138 655,145 C670,140 685,148 700,135 C715,140 730,138 745,142 L745,165 L610,165 Z" fill="url(#gradLat)" />

            <rect x="20" y="200" width="365" height="140" rx="14" fill="url(#gradPanel)" filter="url(#shadowD)" stroke="#2a2d3a" strokeWidth="1" />
            <text x="202" y="225" fill="#c4b5fd" fontSize="11" fontWeight="600" textAnchor="middle">Traffic Volume (RPS)</text>
            <text x="202" y="250" fill="#a78bfa" fontSize="18" fontWeight="700" textAnchor="middle">1,247 req/s</text>
            <path d="M40,290 C70,285 100,295 130,280 C160,275 190,290 220,270 C250,280 280,265 310,275 C340,268 360,272 365,270" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M40,290 C70,285 100,295 130,280 C160,275 190,290 220,270 C250,280 280,265 310,275 C340,268 360,272 365,270 L365,325 L40,325 Z" fill="url(#gradCPU)" opacity="0.5" />

            <rect x="400" y="200" width="365" height="140" rx="14" fill="url(#gradPanel)" filter="url(#shadowD)" stroke="#2a2d3a" strokeWidth="1" />
            <text x="582" y="225" fill="#fbbf24" fontSize="11" fontWeight="600" textAnchor="middle">Latency Percentiles</text>
            <text x="500" y="265" fill="#94a3b8" fontSize="10" textAnchor="middle">p50</text>
            <text x="500" y="282" fill="#34d399" fontSize="16" fontWeight="700" textAnchor="middle">85ms</text>
            <text x="582" y="265" fill="#94a3b8" fontSize="10" textAnchor="middle">p95</text>
            <text x="582" y="282" fill="#f59e0b" fontSize="16" fontWeight="700" textAnchor="middle">240ms</text>
            <text x="664" y="265" fill="#94a3b8" fontSize="10" textAnchor="middle">p99</text>
            <text x="664" y="282" fill="#f87171" fontSize="16" fontWeight="700" textAnchor="middle">520ms</text>
            <rect x="485" y="298" width="30" height="30" rx="4" fill="#34d399" opacity="0.6" />
            <rect x="567" y="288" width="30" height="40" rx="4" fill="#f59e0b" opacity="0.6" />
            <rect x="649" y="272" width="30" height="56" rx="4" fill="#f87171" opacity="0.6" />
          </svg>
        </div>
      </div>
    </>
  );
}

function AlertingTab() {
  return (
    <>
      <div className="card">
        <h2>告警系統架構</h2>
        <div className="subtitle">Alerting Pipeline 點樣運作</div>
        <p>
          有咗監控數據之後，下一步就係設定 <strong style={{ color: '#6366f1' }}>告警規則</strong>。重點係唔好等到用戶投訴先知出事 — 系統應該主動通知相關人員。
        </p>
        <p>
          常見嘅告警條件包括：平均 latency 超過某個 threshold、error rate 突破 0.1%、CPU 持續超過 90% 等。告警觸發之後，透過 Alert Manager 統一管理，再分發到 Email、Slack 或者 PagerDuty。
        </p>

        <div className="diagram-container">
          <svg viewBox="0 0 780 260" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadowA" x="-4%" y="-4%" width="108%" height="108%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
              </filter>
              <filter id="glowAlert" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feFlood floodColor="#f87171" floodOpacity="0.25" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="gradMetric" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4338ca" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="gradThresh" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#92400e" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="gradAlertMgr" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#991b1b" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="gradChannel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#065f46" /><stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <marker id="arrowRed" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
              </marker>
              <marker id="arrowIndigoA" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
              </marker>
              <marker id="arrowGreenA" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#34d399" />
              </marker>
            </defs>

            <rect x="20" y="90" width="140" height="60" rx="14" fill="url(#gradMetric)" filter="url(#shadowA)" stroke="#6366f1" strokeWidth="1" />
            <text x="90" y="117" fill="#a5b4fc" fontSize="13" fontWeight="600" textAnchor="middle">Metrics</text>
            <text x="90" y="135" fill="#94a3b8" fontSize="10" textAnchor="middle">Prometheus Data</text>

            <rect x="220" y="90" width="150" height="60" rx="14" fill="url(#gradThresh)" filter="url(#shadowA)" stroke="#f59e0b" strokeWidth="1" />
            <text x="295" y="117" fill="#fbbf24" fontSize="13" fontWeight="600" textAnchor="middle">Threshold Check</text>
            <text x="295" y="135" fill="#94a3b8" fontSize="10" textAnchor="middle">Rule Evaluation</text>

            <rect x="430" y="90" width="150" height="60" rx="14" fill="url(#gradAlertMgr)" filter="url(#glowAlert)" stroke="#f87171" strokeWidth="1.5" />
            <text x="505" y="117" fill="#fca5a5" fontSize="13" fontWeight="600" textAnchor="middle">Alert Manager</text>
            <text x="505" y="135" fill="#94a3b8" fontSize="10" textAnchor="middle">Route + Deduplicate</text>

            <rect x="640" y="30" width="120" height="44" rx="14" fill="url(#gradChannel)" filter="url(#shadowA)" stroke="#34d399" strokeWidth="1" />
            <text x="700" y="57" fill="#6ee7b7" fontSize="12" fontWeight="600" textAnchor="middle">Email</text>

            <rect x="640" y="98" width="120" height="44" rx="14" fill="url(#gradChannel)" filter="url(#shadowA)" stroke="#34d399" strokeWidth="1" />
            <text x="700" y="125" fill="#6ee7b7" fontSize="12" fontWeight="600" textAnchor="middle">Slack</text>

            <rect x="640" y="166" width="120" height="44" rx="14" fill="url(#gradChannel)" filter="url(#shadowA)" stroke="#34d399" strokeWidth="1" />
            <text x="700" y="193" fill="#6ee7b7" fontSize="12" fontWeight="600" textAnchor="middle">PagerDuty</text>

            <path d="M160,120 C190,120 190,120 220,120" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowIndigoA)" />
            <path d="M370,120 C400,120 400,120 430,120" fill="none" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrowRed)" />
            <path d="M580,110 C610,110 610,52 640,52" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrowGreenA)" />
            <path d="M580,120 C610,120 610,120 640,120" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrowGreenA)" />
            <path d="M580,130 C610,130 610,188 640,188" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrowGreenA)" />

            <text x="190" y="108" fill="#818cf8" fontSize="9" textAnchor="middle">evaluate</text>
            <text x="400" y="108" fill="#fca5a5" fontSize="9" textAnchor="middle">trigger</text>
            <text x="618" y="72" fill="#6ee7b7" fontSize="9" textAnchor="middle">notify</text>
          </svg>
        </div>
      </div>

      <div className="card">
        <h2>建立告警嘅步驟</h2>
        <div className="subtitle">由零開始設定 Alerting Pipeline</div>
        <ul className="steps">
          <li><span className="step-num">1</span><span><strong style={{ color: '#a5b4fc' }}>定義告警規則</strong> — 喺 Prometheus 設定 alerting rules，例如 <code style={{ color: '#f59e0b' }}>error_rate &gt; 0.001</code>（即 0.1%）或者 <code style={{ color: '#f59e0b' }}>avg_latency &gt; 500ms</code>。</span></li>
          <li><span className="step-num">2</span><span><strong style={{ color: '#a5b4fc' }}>配置 Alert Manager</strong> — 設定告警嘅路由規則、分組策略同靜默時間。避免同一個問題重複發送大量通知。</span></li>
          <li><span className="step-num">3</span><span><strong style={{ color: '#a5b4fc' }}>接入通知渠道</strong> — 將 Alert Manager 連接到 Email、Slack channel 或者 PagerDuty。唔同嚴重程度嘅告警發送到唔同渠道。</span></li>
          <li><span className="step-num">4</span><span><strong style={{ color: '#a5b4fc' }}>建立 Runbook</strong> — 每條告警都應該附帶處理指引。收到告警之後，on-call 工程師可以即刻跟住步驟排查。</span></li>
          <li><span className="step-num">5</span><span><strong style={{ color: '#a5b4fc' }}>持續調整 Threshold</strong> — 告警唔係設定完就算。需要根據實際數據不斷調整，避免 alert fatigue（告警疲勞）。</span></li>
        </ul>
        <div className="use-case">
          <h4>實戰場景</h4>
          <p>假設 production 嘅 error rate 突然由 0.02% 飆升到 0.15%，超過咗 0.1% 嘅 threshold。Alert Manager 即時觸發告警，Slack channel 收到通知，on-call 工程師打開 Grafana dashboard 查看 error 分佈，再用 Kibana 搜索相關嘅 error log，快速定位到係某個 API endpoint 嘅 database connection pool 耗盡。整個排查過程由收到告警到定位問題只需幾分鐘。</p>
        </div>
      </div>

      <div className="card">
        <h2>監控成熟度模型</h2>
        <div className="subtitle">由初級到專業嘅進化路徑</div>
        <p>監控系統嘅建設唔係一步到位，而係逐步進化嘅過程。以下係三個階段嘅典型特徵：</p>
        <div className="key-points">
          <div className="key-point">
            <h4>Level 1：Console Logs</h4>
            <p>只靠 console.log / print 輸出。出事之後先去翻 log，無法即時發現問題，無歷史數據可追溯。</p>
          </div>
          <div className="key-point">
            <h4>Level 2：監控工具</h4>
            <p>引入 Prometheus + Grafana + ELK。有 dashboard 可以實時睇到系統狀態，有搜索功能去 debug。</p>
          </div>
          <div className="key-point">
            <h4>Level 3：告警系統</h4>
            <p>基於 metrics 設定自動告警。問題發生時主動通知，大幅縮短 MTTR（Mean Time To Recovery）。</p>
          </div>
          <div className="key-point">
            <h4>最佳做法</h4>
            <p>建議盡早由 Level 1 過渡到 Level 2，production 環境必須達到 Level 3。關鍵在於唔好等出事先補救。</p>
          </div>
        </div>
      </div>
    </>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻開始 Build</div>

      <div className="prompt-card">
        <h4>Prompt 1 — 設計監控 + 告警系統架構</h4>
        <div className="prompt-text">
          為 <span className="placeholder">[系統名稱，例如：線上教育平台]</span> 設計一套完整嘅監控同告警系統。{'\n\n'}
          系統架構：<span className="placeholder">[簡述，例如：React 前端 + Node.js API + PostgreSQL + Redis，部署喺 Kubernetes]</span>{'\n\n'}
          請輸出以下內容：{'\n'}
          1. 監控架構圖（文字描述），包含：{'\n'}
          {'   '}- Metrics 收集路徑：Application → Prometheus → Grafana{'\n'}
          {'   '}- Logs 收集路徑：Application → Fluentd → Elasticsearch → Kibana{'\n'}
          {'   '}- Tracing 路徑（如適用）：Application → Jaeger{'\n\n'}
          2. 必須追蹤嘅 5 大關鍵指標：{'\n'}
          {'   '}- 每個指標嘅 PromQL 查詢語句{'\n'}
          {'   '}- 正常範圍同異常 Threshold{'\n'}
          {'   '}- 對應嘅 Grafana Panel 類型（Gauge / Graph / Table）{'\n\n'}
          3. 告警規則設計（至少 6 條）：{'\n'}
          {'   '}- Warning 同 Critical 兩個級別{'\n'}
          {'   '}- 每條規則嘅通知渠道同靜默策略{'\n\n'}
          4. Dashboard 佈局建議（Overview Dashboard + Service-level Dashboard）{'\n\n'}
          5. 由零開始嘅部署步驟（用 Docker Compose 或 Helm Chart）
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Build Health Check Dashboard</h4>
        <div className="prompt-text">
          用 <span className="placeholder">[技術棧，例如：Node.js + Express]</span> 建立一個 Health Check Dashboard 系統。{'\n\n'}
          需要監控嘅服務：<span className="placeholder">[列出服務，例如：API Server、Database、Redis、Message Queue、Third-party Payment API]</span>{'\n\n'}
          功能要求：{'\n'}
          1. Health Check Endpoint（/health）：{'\n'}
          {'   '}- 檢查每個依賴服務嘅連接狀態{'\n'}
          {'   '}- 返回 JSON 格式嘅健康報告（每個服務嘅狀態、延遲、最後檢查時間）{'\n'}
          {'   '}- 整體狀態判斷邏輯（全部 healthy = 200，部分 degraded = 200 + warning，核心服務 down = 503）{'\n\n'}
          2. Dashboard 前端頁面：{'\n'}
          {'   '}- 實時顯示所有服務嘅健康狀態（綠 / 黃 / 紅）{'\n'}
          {'   '}- 歷史 Uptime 百分比（過去 24 小時 / 7 日 / 30 日）{'\n'}
          {'   '}- 自動刷新（每 30 秒）{'\n\n'}
          3. 告警整合：{'\n'}
          {'   '}- 服務狀態變化時發送 <span className="placeholder">[通知渠道，例如：Slack Webhook]</span> 通知{'\n'}
          {'   '}- 避免重複告警（同一個問題只通知一次，恢復時再通知）{'\n\n'}
          請直接輸出可以運行嘅完整 Code。
        </div>
      </div>
    </div>
  );
}

export default function Monitoring() {
  return (
    <>
      <TopicTabs
        title="應用程式監控"
        subtitle="由 console.log 進化到專業監控工具同告警系統"
        tabs={[
          { id: 'tools', label: '① 監控工具', content: <ToolsTab /> },
          { id: 'metrics', label: '② 關鍵指標', content: <MetricsTab /> },
          { id: 'alerting', label: '③ 告警系統', premium: true, content: <AlertingTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
        ]}
      />
      <div className="topic-container">
        <QuizRenderer data={quizData} />
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
