import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '以下邊個場景最適合用微服務架構？',
    options: [
      { text: '一個人開發嘅 Side Project，功能簡單', correct: false, explanation: '一個人嘅 Side Project 用 Monolith 好過微服務好多。微服務嘅運維成本（部署、監控、服務間通訊）對一個人嚟講太高。' },
      { text: '大團隊開發嘅複雜系統，唔同功能需要獨立部署同擴展', correct: true, explanation: '啱！微服務嘅最大優勢就係：唔同 team 可以獨立開發同部署自己負責嘅服務，熱門功能可以獨立 scale。例如支付服務同搜索服務有唔同嘅流量模式，分開部署可以各自 scale。' },
      { text: '需要快速上線嘅 MVP（最小可行產品）', correct: false, explanation: 'MVP 追求速度，Monolith 可以更快上線。唔使處理服務間通訊、分佈式事務等複雜問題。Martin Fowler 都建議 Monolith First。' },
      { text: '所有功能都共用同一個 Database 嘅系統', correct: false, explanation: '如果所有功能共用一個 Database，微服務嘅好處大打折扣。Shared Database 係 Microservices 嘅反模式——服務之間會因為 DB Schema 變更而互相影響。' },
    ],
  },
  {
    question: 'Strangler Fig Pattern 係咩？',
    options: [
      { text: '直接刪除 Monolith，從零開始寫微服務', correct: false, explanation: '呢個叫 Big Bang Rewrite，風險極高。Strangler Fig Pattern 係漸進式嘅，唔係一次過推倒重來。' },
      { text: '逐步將 Monolith 嘅功能搬到新嘅微服務，新流量導向微服務，直到 Monolith 被完全取代', correct: true, explanation: '啱！好似絞殺榕（Strangler Fig）慢慢包圍大樹一樣。做法：1）喺 Monolith 前面放一個 Proxy。2）新功能寫成微服務。3）舊功能逐個搬到微服務。4）Proxy 將流量從 Monolith 轉到微服務。5）最終 Monolith 冇流量，可以關閉。' },
      { text: '同時運行兩套系統，用 AB Test 決定用邊個', correct: false, explanation: 'AB Test 係用嚟測試用戶體驗嘅，唔係用嚟做系統遷移嘅。Strangler Fig Pattern 係架構遷移策略。' },
      { text: '將 Monolith 拆成兩個 Monolith', correct: false, explanation: '拆成兩個 Monolith 唔係微服務。Strangler Fig Pattern 嘅目標係將功能逐步搬到獨立嘅微服務。' },
    ],
  },
  {
    question: '微服務架構最大嘅痛點係咩？',
    options: [
      { text: '開發速度太快，QA 跟唔上', correct: false, explanation: '微服務唔一定令開發速度更快。初期可能因為需要處理服務間通訊、分佈式事務等問題，開發速度反而更慢。' },
      { text: '分佈式系統嘅複雜性：服務間通訊、分佈式事務、Debugging 困難、運維成本高', correct: true, explanation: '啱！微服務將單體嘅複雜性轉移到網絡層。你需要處理：服務發現、Load Balancing、Circuit Breaker、分佈式 Tracing、Saga Transaction、API Gateway⋯每一個都唔簡單。如果團隊唔夠成熟，呢啲痛點會好明顯。' },
      { text: '每個服務嘅代碼太少', correct: false, explanation: '代碼量少唔係問題，反而係優點。問題係管理好多個小服務嘅運維成本。' },
      { text: 'CI/CD 唔支持微服務', correct: false, explanation: 'CI/CD 完全支持微服務。但每個服務都需要自己嘅 CI/CD pipeline，管理好多個 pipeline 確實係一個挑戰。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'docker', label: 'Docker 容器化' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
  { slug: 'cicd-pipeline', label: 'CI/CD Pipeline' },
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>微服務 vs 單體架構</h2>
      <div className="subtitle">點解要拆？幾時拆？拆咗有咩代價？</div>
      <p>
        <strong style={{ color: '#3B82F6' }}>Monolith（單體）</strong>就係成個 Application 放喺一個 Codebase、一個 Process 入面部署。
        <strong style={{ color: '#34d399' }}> Microservices（微服務）</strong>就係將唔同嘅功能拆成獨立嘅服務，每個服務有自己嘅 Codebase、Database 同部署。
        兩個都唔係好或者壞——關鍵係<strong style={{ color: '#fbbf24' }}>幾時用邊個</strong>。
      </p>
      <p>
        好多人以為微服務一定好過 Monolith，但其實唔係。
        Martin Fowler 有一句名言：<strong style={{ color: '#8B5CF6' }}>「Monolith First」</strong>——先用 Monolith 快速驗證業務，等到真係有需要先拆成微服務。
        過早拆分只會增加唔必要嘅複雜性。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 740 330" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowBlue"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradMono" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSvc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGW" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          {/* Divider */}
          <line x1="370" y1="20" x2="370" y2="310" stroke="#475569" strokeWidth="1" strokeDasharray="5,5" />
          <text x="185" y="18" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Monolith 單體</text>
          <text x="555" y="18" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Microservices 微服務</text>

          {/* Monolith side */}
          <g transform="translate(50,40)" filter="url(#glowBlue)">
            <rect width="260" height="250" rx="14" fill="url(#gradMono)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="130" y="30" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">Monolith App</text>

            {/* Internal modules */}
            <rect x="20" y="50" width="100" height="35" rx="8" fill="rgba(59,130,246,0.2)" stroke="#60a5fa" strokeWidth="1" />
            <text x="70" y="72" textAnchor="middle" fill="#93c5fd" fontSize="10">用戶模組</text>

            <rect x="140" y="50" width="100" height="35" rx="8" fill="rgba(59,130,246,0.2)" stroke="#60a5fa" strokeWidth="1" />
            <text x="190" y="72" textAnchor="middle" fill="#93c5fd" fontSize="10">訂單模組</text>

            <rect x="20" y="100" width="100" height="35" rx="8" fill="rgba(59,130,246,0.2)" stroke="#60a5fa" strokeWidth="1" />
            <text x="70" y="122" textAnchor="middle" fill="#93c5fd" fontSize="10">支付模組</text>

            <rect x="140" y="100" width="100" height="35" rx="8" fill="rgba(59,130,246,0.2)" stroke="#60a5fa" strokeWidth="1" />
            <text x="190" y="122" textAnchor="middle" fill="#93c5fd" fontSize="10">庫存模組</text>

            {/* Shared DB */}
            <rect x="50" y="160" width="160" height="45" rx="10" fill="rgba(139,92,246,0.15)" stroke="#8B5CF6" strokeWidth="1.5" />
            <text x="130" y="180" textAnchor="middle" fill="#8B5CF6" fontSize="11" fontWeight="600">Shared Database</text>
            <text x="130" y="196" textAnchor="middle" fill="#9ca3af" fontSize="9">一個 DB 放晒所有數據</text>

            <text x="130" y="230" textAnchor="middle" fill="#9ca3af" fontSize="9">一個 Codebase · 一齊部署</text>
          </g>

          {/* Microservices side */}
          {/* API Gateway */}
          <g transform="translate(420,40)">
            <rect width="260" height="50" rx="14" fill="url(#gradGW)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="130" y="22" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">API Gateway</text>
            <text x="130" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">路由、認證、Rate Limit</text>
          </g>

          {/* Services */}
          <g transform="translate(400,110)">
            <rect width="95" height="50" rx="10" fill="url(#gradSvc)" stroke="#34d399" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="48" y="20" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">用戶服務</text>
            <text x="48" y="36" textAnchor="middle" fill="#9ca3af" fontSize="8">User DB</text>
          </g>

          <g transform="translate(510,110)">
            <rect width="95" height="50" rx="10" fill="url(#gradSvc)" stroke="#34d399" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="48" y="20" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">訂單服務</text>
            <text x="48" y="36" textAnchor="middle" fill="#9ca3af" fontSize="8">Order DB</text>
          </g>

          <g transform="translate(620,110)">
            <rect width="95" height="50" rx="10" fill="url(#gradSvc)" stroke="#34d399" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="48" y="20" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">支付服務</text>
            <text x="48" y="36" textAnchor="middle" fill="#9ca3af" fontSize="8">Payment DB</text>
          </g>

          <g transform="translate(455,180)">
            <rect width="95" height="50" rx="10" fill="url(#gradSvc)" stroke="#34d399" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="48" y="20" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">庫存服務</text>
            <text x="48" y="36" textAnchor="middle" fill="#9ca3af" fontSize="8">Inventory DB</text>
          </g>

          <g transform="translate(565,180)">
            <rect width="95" height="50" rx="10" fill="rgba(139,92,246,0.15)" stroke="#8B5CF6" strokeWidth="1.5" filter="url(#shadow)" />
            <text x="48" y="20" textAnchor="middle" fill="#8B5CF6" fontSize="10" fontWeight="600">Message Queue</text>
            <text x="48" y="36" textAnchor="middle" fill="#9ca3af" fontSize="8">服務間通訊</text>
          </g>

          <text x="550" y="260" textAnchor="middle" fill="#9ca3af" fontSize="9">獨立 Codebase · 獨立部署 · 獨立 DB</text>

          {/* Arrows from gateway to services */}
          <path d="M550,92 L448,108" fill="none" stroke="#34d399" strokeWidth="1" markerEnd="url(#arrGreen)" />
          <path d="M550,92 L558,108" fill="none" stroke="#34d399" strokeWidth="1" markerEnd="url(#arrGreen)" />
          <path d="M550,92 L668,108" fill="none" stroke="#34d399" strokeWidth="1" markerEnd="url(#arrGreen)" />

          {/* Comparison */}
          <g transform="translate(60,300)">
            <text x="120" y="12" textAnchor="middle" fill="#3B82F6" fontSize="10">簡單、快、容易 Debug</text>
          </g>
          <g transform="translate(430,300)">
            <text x="120" y="12" textAnchor="middle" fill="#34d399" fontSize="10">獨立 Scale、獨立部署、技術自由</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>核心分別</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#3B82F6' }}>Monolith</strong>：所有功能喺一個 Codebase，共用一個 Database，一齊部署。開發快、Debug 容易，但 Scale 受限——要 Scale 就要整個 App 一齊 Scale。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#34d399' }}>Microservices</strong>：每個功能係獨立嘅服務，有自己嘅 DB 同部署。可以獨立 Scale（例如搜索服務需要 10 個實例，用戶服務只需要 2 個），但增加咗分佈式嘅複雜性。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#fbbf24' }}>現實做法</strong>：大部分成功嘅公司都係由 Monolith 開始，等到真係有 Scale / 團隊分工嘅需求，先用 Strangler Fig Pattern 漸進式拆分。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>深入設計考量</h2>
      <div className="subtitle">DDD、Service Boundary、通訊模式</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Domain-Driven Design（DDD）劃分邊界</h4>
          <p>微服務嘅邊界應該沿住<strong style={{ color: '#3B82F6' }}>業務領域（Bounded Context）</strong>嚟劃。例如電商：用戶、訂單、支付、庫存、物流——每個都係一個 Bounded Context，可以成為一個獨立嘅微服務。唔好用技術層嚟劃（例如「API 層」、「DB 層」），咁樣拆出嚟嘅服務唔獨立。</p>
        </div>
        <div className="key-point">
          <h4>Data Ownership 原則</h4>
          <p>每個微服務<strong style={{ color: '#34d399' }}>擁有自己嘅數據</strong>，其他服務唔可以直接讀佢嘅 DB。需要數據嘅時候要通過 API 或者 Event。呢個叫 Database-per-Service。好處係服務之間完全解耦，壞處係跨服務 Query 變得好複雜（要用 API Composition 或者 CQRS）。</p>
        </div>
        <div className="key-point">
          <h4>同步 vs 異步通訊</h4>
          <p><strong style={{ color: '#fbbf24' }}>同步（REST / gRPC）</strong>：簡單直接，但有 Cascading Failure 風險。<strong style={{ color: '#8B5CF6' }}>異步（Message Queue / Event）</strong>：解耦好、容錯好，但增加複雜性同 Eventual Consistency。一般建議：Query 用同步、Command 用異步。</p>
        </div>
        <div className="key-point">
          <h4>Strangler Fig Pattern 實踐</h4>
          <p>步驟：1）喺 Monolith 前面加 <strong style={{ color: '#fbbf24' }}>API Gateway / Proxy</strong>。2）揀一個邊界清晰嘅功能（例如搜索），寫成微服務。3）Proxy 將呢個功能嘅流量導去微服務。4）驗證正常後，繼續搬下一個功能。5）重複直到 Monolith 空咗。呢個過程可能要幾個月到幾年。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰經驗同面試</h2>
      <div className="subtitle">幾時應該拆分同常見嘅坑</div>
      <div className="key-points">
        <div className="key-point">
          <h4>幾時應該拆分？</h4>
          <p>拆分嘅信號：1）<strong style={{ color: '#34d399' }}>Team 大過 10 人</strong>，Merge Conflict 頻繁。2）<strong style={{ color: '#34d399' }}>部署衝突</strong>，Team A 想部署但 Team B 嘅改動仲未 ready。3）<strong style={{ color: '#34d399' }}>唔同功能嘅 Scale 需求差好遠</strong>。4）<strong style={{ color: '#34d399' }}>技術棧限制</strong>，某個功能更適合用另一種語言。</p>
        </div>
        <div className="key-point">
          <h4>分佈式 Debugging 挑戰</h4>
          <p>Monolith Debug 用 Stack Trace 就得。微服務嘅 Request 跨多個服務，你需要 <strong style={{ color: '#3B82F6' }}>Distributed Tracing</strong>（例如 Jaeger / Zipkin）嚟追蹤完整嘅 Request Path。每個服務嘅 log 要帶 <code style={{ color: '#60a5fa' }}>trace-id</code>，咁先可以將唔同服務嘅 log 串聯起嚟。</p>
        </div>
        <div className="key-point">
          <h4>常見錯誤</h4>
          <p>1）<strong style={{ color: '#f87171' }}>太早拆分</strong>——業務都未搞清楚就拆。2）<strong style={{ color: '#f87171' }}>Shared Database</strong>——拆成微服務但共用 DB，根本唔算真正嘅微服務。3）<strong style={{ color: '#f87171' }}>Nano-services</strong>——拆得太細，服務之間嘅通訊成本高過業務邏輯。4）<strong style={{ color: '#f87171' }}>忽略運維</strong>——冇監控、冇 CI/CD、冇 Service Mesh 就上微服務。</p>
        </div>
        <div className="key-point">
          <h4>面試答題</h4>
          <p>面試問「微服務 vs Monolith」嘅時候，唔好一面倒撐微服務。講清楚：1）各有優缺。2）Monolith First 係好嘅策略。3）拆分嘅時機同信號。4）微服務帶嚟嘅分佈式複雜性。5）Strangler Fig Pattern 漸進式遷移。呢個答法顯示你有實戰經驗。</p>
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
        <h4>Prompt 1 — 設計微服務拆分方案</h4>
        <div className="prompt-text">
          {'我有一個 '}
          <span className="placeholder">[電商 / 社交平台 / SaaS]</span>
          {' Monolith 應用，需要拆分成微服務。\n\n現有功能：\n- 用戶管理（註冊、登入、Profile）\n- 訂單管理（建立、支付、物流追蹤）\n- 產品目錄（搜索、分類、評價）\n- 庫存管理（入庫、出庫、預留）\n- 通知（Email、Push、SMS）\n\n要求：\n- 用 DDD Bounded Context 劃分微服務邊界\n- 設計每個服務嘅 API（REST / gRPC）\n- 定義 Database-per-Service 嘅 Schema\n- 設計服務間嘅通訊模式（同步 vs 異步）\n- Strangler Fig Pattern 嘅遷移計劃（分幾期）\n- API Gateway 路由配置\n- 用 '}
          <span className="placeholder">[Docker Compose / Kubernetes]</span>
          {' 部署\n- 畫出完整嘅架構圖'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 微服務 Observability 全套方案</h4>
        <div className="prompt-text">
          {'設計一套微服務嘅 Observability 方案。\n\n場景：\n- '}
          <span className="placeholder">[5 / 10 / 20]</span>
          {' 個微服務\n- 部署喺 '}
          <span className="placeholder">[Docker Compose / Kubernetes]</span>
          {'\n\n要求：\n- Distributed Tracing：用 Jaeger / Zipkin，每個請求帶 trace-id\n- Centralized Logging：所有服務嘅 log 集中到 ELK Stack\n- Metrics：用 Prometheus + Grafana 監控 RPS、Latency、Error Rate\n- Health Check：每個服務暴露 /health endpoint\n- Alerting：Grafana 告警規則（Error Rate > 5%、P99 Latency > 2s）\n- Service Mesh Dashboard（Kiali）\n- 提供完整嘅 Docker Compose / K8s YAML 配置\n- 包含示範 Dashboard JSON'}
        </div>
      </div>
    </div>
  );
}

export default function MicroservicesVsMonolith() {
  return (
    <>
      <TopicTabs
        title="微服務 vs 單體架構"
        subtitle="邊個好？答案係——睇情況"
        tabs={[
          { id: 'overview', label: '① 整體比較', content: <OverviewTab /> },
          { id: 'advanced', label: '② 設計考量', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰經驗', premium: true, content: <PracticeTab /> },
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
