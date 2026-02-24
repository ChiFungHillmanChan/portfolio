import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Client-side Service Discovery 同 Server-side Service Discovery 最大嘅分別係咩？',
    options: [
      { text: 'Client-side 唔需要 Service Registry', correct: false, explanation: '兩種都需要 Service Registry。分別係：Client-side 由 Client 自己查 Registry 再直接呼叫服務；Server-side 由 Load Balancer 查 Registry 再 forward 請求。' },
      { text: 'Client-side 由 Client 負責查 Registry 同選擇服務實例；Server-side 由 Load Balancer / Router 負責', correct: true, explanation: '啱！Client-side 嘅邏輯喺 Client 入面，Client 直接知道所有服務實例。Server-side 嘅邏輯喺 Load Balancer 入面，Client 唔使知道有幾多個服務實例。' },
      { text: 'Server-side 唔支持 Health Check', correct: false, explanation: '兩種模式都支持 Health Check。Health Check 係 Service Registry 嘅功能，同 Discovery 模式無關。' },
      { text: 'Client-side 只能用 HTTP，Server-side 只能用 gRPC', correct: false, explanation: '通訊協議同 Discovery 模式無關。兩種模式都可以用 HTTP、gRPC 或者其他協議。' },
    ],
  },
  {
    question: '如果 Service Registry 掛咗會點？',
    options: [
      { text: '所有服務即刻停止運作', correct: false, explanation: '唔會即刻停止。已經發現咗嘅服務仍然可以通訊，只係新嘅服務實例唔能被發現，舊嘅實例如果掛咗也唔會被移除。' },
      { text: '已有嘅服務通訊唔受影響（用 Cache），但新服務實例無法被發現，服務列表會慢慢過時', correct: true, explanation: '啱！大部分 Service Discovery 框架都會喺本地 Cache 服務列表。Registry 掛咗嘅話，已有嘅通訊正常，但服務列表唔會更新。所以 Registry 嘅高可用性好重要。' },
      { text: '所有流量會自動切換到直連模式', correct: false, explanation: '唔會自動切換。如果 Client 冇 Cache 嘅話，就搵唔到服務嘅地址。有 Cache 就用 Cache 嘅舊列表。' },
      { text: 'DNS 會自動接管 Service Discovery', correct: false, explanation: 'DNS 同 Service Discovery 係獨立嘅系統，唔會自動接管。除非你本身就係用 DNS-based Service Discovery。' },
    ],
  },
  {
    question: 'Kubernetes 入面嘅 Service Discovery 係點運作嘅？',
    options: [
      { text: '用外部嘅 Consul 做 Service Registry', correct: false, explanation: 'Kubernetes 有自己內建嘅 Service Discovery 機制，唔需要外部嘅 Consul（雖然你可以額外裝）。' },
      { text: 'Kubernetes Service 對象提供穩定嘅 ClusterIP / DNS 名，kube-proxy 自動做負載均衡', correct: true, explanation: '啱！Kubernetes 嘅 Service 對象會自動攞到一個 ClusterIP 同 DNS 名（例如 my-service.default.svc.cluster.local）。Pod 用呢個名就可以搵到服務，kube-proxy 會自動分發流量到對應嘅 Pod。' },
      { text: '每個 Pod 要自己硬編碼其他 Pod 嘅 IP', correct: false, explanation: '呢個完全唔啱。Pod 嘅 IP 係動態嘅，重啟就會變。Kubernetes 嘅 Service 就係為咗解決呢個問題。' },
      { text: '用 etcd 直接暴露 Pod IP 俾 Client', correct: false, explanation: 'etcd 係 Kubernetes 嘅底層數據存儲，但唔會直接暴露 Pod IP 俾 Client。Service Discovery 係由 kube-dns / CoreDNS 同 kube-proxy 處理嘅。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
  { slug: 'docker', label: 'Docker 容器化' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>服務發現係咩？</h2>
      <div className="subtitle">微服務環境下點搵到其他服務嘅地址</div>
      <p>
        喺<strong style={{ color: '#3B82F6' }}>微服務架構</strong>入面，每個服務可能有多個實例，而且實例會動態增減（auto-scaling）。
        服務 A 想呼叫服務 B，但服務 B 嘅 IP 同 Port 隨時會變——新嘅實例會啟動，舊嘅會被關閉。
        <strong style={{ color: '#34d399' }}> Service Discovery</strong> 就係解決「點搵到其他服務」呢個問題嘅機制。
      </p>
      <p>
        核心概念好簡單：有一個 <strong style={{ color: '#fbbf24' }}>Service Registry</strong>（服務登記冊），
        每個服務啟動嘅時候向 Registry 註冊自己嘅地址，關閉嘅時候反註冊。
        需要呼叫其他服務嘅時候，去 Registry 查一下就知道邊個實例可以用。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowBlue"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowAmber"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#fbbf24" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradReg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSvc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradClient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          </defs>

          {/* Service Registry */}
          <g transform="translate(260,20)" filter="url(#glowAmber)">
            <rect width="200" height="70" rx="14" fill="url(#gradReg)" stroke="#fbbf24" strokeWidth="2.5" filter="url(#shadow)" />
            <text x="100" y="30" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="700">Service Registry</text>
            <text x="100" y="50" textAnchor="middle" fill="#fcd34d" fontSize="10">Consul / etcd / Eureka</text>
          </g>

          {/* Client Service */}
          <g transform="translate(30,200)" filter="url(#glowBlue)">
            <rect width="150" height="65" rx="14" fill="url(#gradClient)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Service A</text>
            <text x="75" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">Client（呼叫方）</text>
          </g>

          {/* Service instances */}
          <g transform="translate(380,150)">
            <rect width="140" height="50" rx="14" fill="url(#gradSvc)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="22" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Service B #1</text>
            <text x="70" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">10.0.1.5:8080</text>
          </g>

          <g transform="translate(380,220)">
            <rect width="140" height="50" rx="14" fill="url(#gradSvc)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="22" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Service B #2</text>
            <text x="70" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">10.0.1.8:8080</text>
          </g>

          <g transform="translate(380,290)">
            <rect width="140" height="50" rx="14" fill="url(#gradSvc)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="22" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Service B #3</text>
            <text x="70" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">10.0.1.12:8080</text>
          </g>

          {/* Register arrows (services → registry) */}
          <path d="M450,148 Q400,90 462,90" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <text x="490" y="110" fill="#34d399" fontSize="9">Register</text>

          {/* Query arrow (client → registry) */}
          <path d="M105,198 Q200,100 258,55" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="140" y="130" fill="#3B82F6" fontSize="10">1. Query</text>

          {/* Response arrow (registry → client) */}
          <path d="M258,65 Q200,130 115,198" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrAmber)" />
          <text x="210" y="155" fill="#fbbf24" fontSize="10">2. 返回地址列表</text>

          {/* Call arrow (client → service) */}
          <path d="M182,232 Q280,230 378,230" fill="none" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="280" y="222" fill="#8B5CF6" fontSize="10">3. 直接呼叫</text>

          {/* Health check */}
          <g transform="translate(570,50)">
            <rect width="120" height="40" rx="10" fill="rgba(239,68,68,0.1)" stroke="#f87171" strokeWidth="1" />
            <text x="60" y="16" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">Health Check</text>
            <text x="60" y="32" textAnchor="middle" fill="#9ca3af" fontSize="9">定期檢查存活</text>
          </g>
          <path d="M460,60 Q520,60 568,65" fill="none" stroke="#f87171" strokeWidth="1" strokeDasharray="3,3" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>運作流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>每個 Service 實例啟動嘅時候，向 <strong style={{ color: '#fbbf24' }}>Service Registry</strong> 註冊自己嘅 IP + Port。關閉嘅時候反註冊。</span></li>
        <li><span className="step-num">2</span><span>Service A 想呼叫 Service B 嘅時候，先去 Registry 查 Service B 嘅所有可用實例列表。</span></li>
        <li><span className="step-num">3</span><span>Service A 從列表入面揀一個實例（用 Load Balancing 策略），直接呼叫佢。</span></li>
        <li><span className="step-num">4</span><span>Registry 會定期做 <strong style={{ color: '#f87171' }}>Health Check</strong>，如果某個實例唔再回應，就從列表移除佢。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>Discovery 方案比較</h2>
      <div className="subtitle">Consul / etcd / ZooKeeper / DNS-based</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Consul（推薦入門）</h4>
          <p>HashiCorp 出品，<strong style={{ color: '#3B82F6' }}>功能最全面</strong>：Service Discovery + Health Check + KV Store + Service Mesh。支持多 Data Center，有內建嘅 DNS 介面（唔使改 code 就可以用 DNS 做 discovery）。Web UI 好靚，Debug 好方便。</p>
        </div>
        <div className="key-point">
          <h4>etcd</h4>
          <p><strong style={{ color: '#34d399' }}>Kubernetes 嘅底層核心</strong>，用 Raft 共識演算法保證強一致性。純粹係一個分佈式 KV Store，Service Discovery 需要自己 build（或者用 Kubernetes 內建嘅機制）。如果已經用 K8s，就唔需要額外裝。</p>
        </div>
        <div className="key-point">
          <h4>ZooKeeper</h4>
          <p>Apache 嘅老牌方案，用 ZAB 協議保證一致性。<strong style={{ color: '#fbbf24' }}>Kafka、HBase、Hadoop</strong> 都用佢。但佢嘅 API 比較低層，用嚟做 Service Discovery 需要寫好多 wrapper code。而家新項目多數用 Consul 或 etcd。</p>
        </div>
        <div className="key-point">
          <h4>DNS-based Discovery</h4>
          <p>最簡單嘅方案：用 DNS SRV record 或 A record 返回服務嘅地址。好處係唔使額外嘅 dependency，任何語言都支持。壞處係 DNS 有 <strong style={{ color: '#f87171' }}>TTL Cache</strong>，更新唔夠即時，而且唔支持 Health Check。適合簡單嘅場景。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰同 K8s 整合</h2>
      <div className="subtitle">Kubernetes Service Discovery 同 Service Mesh</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Kubernetes 內建 Discovery</h4>
          <p>K8s 嘅 <code style={{ color: '#60a5fa' }}>Service</code> 對象自動做 Discovery：每個 Service 有穩定嘅 ClusterIP 同 DNS 名（<code style={{ color: '#60a5fa' }}>my-service.namespace.svc.cluster.local</code>）。Pod 用呢個 DNS 名就可以搵到服務，kube-proxy 自動做 Load Balancing。唔使額外裝 Consul 或 etcd。</p>
        </div>
        <div className="key-point">
          <h4>Service Mesh（Istio / Linkerd）</h4>
          <p>Service Mesh 喺每個 Pod 旁邊放一個 <strong style={{ color: '#34d399' }}>Sidecar Proxy</strong>（例如 Envoy），自動處理 Service Discovery、Load Balancing、Circuit Breaking、mTLS。應用 code 唔使改——所有 network concern 由 Sidecar 搞掂。代價係每個 Pod 多咗一個 container，有少少 overhead。</p>
        </div>
        <div className="key-point">
          <h4>Health Check 設計</h4>
          <p>三種 Health Check：<strong style={{ color: '#3B82F6' }}>Liveness</strong>（服務仲活唔活）、<strong style={{ color: '#fbbf24' }}>Readiness</strong>（服務準備好接受流量未）、<strong style={{ color: '#8B5CF6' }}>Startup</strong>（服務啟動好未）。Liveness 失敗就重啟，Readiness 失敗就暫時從服務列表移除。一定要分開設。</p>
        </div>
        <div className="key-point">
          <h4>面試點講</h4>
          <p>面試嘅時候講 Service Discovery，記住提呢幾點：1）Client-side vs Server-side Discovery 嘅取捨。2）Registry 嘅高可用性（用 Raft / ZAB 做共識）。3）Health Check 避免路由到掛咗嘅實例。4）如果用 K8s，內建嘅機制已經夠用。</p>
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
        <h4>Prompt 1 — 用 Consul 搭建 Service Discovery</h4>
        <div className="prompt-text">
          {'用 Docker Compose 搭建一套 Service Discovery 環境。\n\n組件：\n- Consul Server（3 節點 cluster）\n- '}
          <span className="placeholder">[Node.js / Go / Python]</span>
          {' 微服務 A（2 個實例）\n- '}
          <span className="placeholder">[Node.js / Go / Python]</span>
          {' 微服務 B（3 個實例）\n\n要求：\n- 服務啟動時自動向 Consul 註冊\n- 服務停止時自動反註冊\n- 實現 HTTP Health Check（每 10 秒檢查一次）\n- 服務 A 透過 Consul DNS 查詢服務 B 嘅地址\n- 實現 Client-side Load Balancing（Round Robin）\n- Consul UI 可以喺 http://localhost:8500 查看\n- 提供完整嘅 Docker Compose + 服務代碼'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Kubernetes Service Discovery + Istio</h4>
        <div className="prompt-text">
          {'設計一個 Kubernetes 原生嘅 Service Discovery 方案，搭配 Istio Service Mesh。\n\n場景：\n- '}
          <span className="placeholder">[電商 / 社交平台]</span>
          {' 微服務架構\n- 5 個微服務，各 2-5 個 Pod\n\n要求：\n- Kubernetes Service + Deployment YAML\n- 配置 Liveness / Readiness / Startup Probe\n- Istio VirtualService + DestinationRule 配置\n- Traffic splitting（90% v1 / 10% v2 做 Canary）\n- mTLS 自動加密服務間通訊\n- Circuit Breaking 配置（Istio DestinationRule）\n- Kiali Dashboard 可視化服務拓撲\n- 提供完整嘅 YAML 同部署步驟'}
        </div>
      </div>
    </div>
  );
}

export default function ServiceDiscovery() {
  return (
    <>
      <TopicTabs
        title="服務發現"
        subtitle="微服務架構入面點搵到同管理其他服務嘅地址"
        tabs={[
          { id: 'overview', label: '① 整體概念', content: <OverviewTab /> },
          { id: 'advanced', label: '② 方案比較', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰整合', premium: true, content: <PracticeTab /> },
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
