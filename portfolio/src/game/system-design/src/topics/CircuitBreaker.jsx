import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Circuit Breaker 嘅「Half-Open」狀態係點運作嘅？',
    options: [
      { text: '放一半嘅請求通過', correct: false, explanation: 'Half-Open 唔係放「一半」嘅請求。佢只放少量（通常一個）測試請求通過，睇下下游服務係咪恢復咗。' },
      { text: '等一段時間後，放少量測試請求通過。如果成功就轉返 Closed，失敗就轉返 Open', correct: true, explanation: '啱！Half-Open 係一個探測狀態。Circuit Breaker 由 Open 轉到 Half-Open 後，會放一個測試請求去下游。如果成功，證明下游恢復咗，轉返 Closed；如果失敗，轉返 Open 再等。' },
      { text: '同時用兩個服務做 load balancing', correct: false, explanation: '呢個係 Load Balancer 嘅工作，同 Circuit Breaker 嘅 Half-Open 狀態無關。' },
      { text: '只接受讀取請求，拒絕寫入請求', correct: false, explanation: 'Circuit Breaker 唔分讀寫。Half-Open 係用嚟測試下游服務有冇恢復嘅。' },
    ],
  },
  {
    question: '冇 Circuit Breaker 嘅話，下游服務掛咗會點樣？',
    options: [
      { text: '上游服務會自動切換到其他服務', correct: false, explanation: '冇 Circuit Breaker 嘅話，上游服務唔會自動切換。佢會不停嘗試呼叫掛咗嘅下游服務。' },
      { text: '所有請求 timeout，上游服務嘅 thread / connection pool 被佔滿，最終上游也跟住掛（Cascading Failure）', correct: true, explanation: '啱！呢個就係 Cascading Failure。下游服務唔回應，上游嘅請求全部 timeout，thread pool 同 connection pool 被耗盡。上游服務自己都癱瘓，然後再影響更上游嘅服務，成個系統逐個倒下。' },
      { text: '錯誤會被自動修復', correct: false, explanation: '系統唔會自動修復。冇保護機制嘅話，錯誤只會擴散，唔會縮小。' },
      { text: '只有第一個請求會失敗，之後嘅請求會正常', correct: false, explanation: '如果下游持續掛咗，之後嘅請求全部都會失敗。唔會自動變好。' },
    ],
  },
  {
    question: '以下邊個係 Circuit Breaker 嘅合理 Fallback 策略？',
    options: [
      { text: '直接返回 500 Internal Server Error 俾用戶', correct: false, explanation: '雖然技術上冇錯，但呢個唔係好嘅 Fallback。好嘅 Fallback 應該盡量提供有用嘅回應，而唔係直接報錯。' },
      { text: '返回 Cache 嘅舊數據，或者預設值，或者降級服務（例如唔顯示推薦，但主要功能正常）', correct: true, explanation: '啱！好嘅 Fallback 策略包括：返回 Cached 嘅數據（雖然可能唔係最新）、返回預設值、或者降級服務（Graceful Degradation）。用戶體驗比直接報錯好好多。' },
      { text: '不停重試直到成功', correct: false, explanation: '不停重試會加重下游服務嘅壓力，可能令佢更加難恢復。Circuit Breaker 嘅目的就係避免呢種情況。' },
      { text: '關閉整個系統等待維修', correct: false, explanation: '關閉整個系統影響太大。Circuit Breaker 嘅設計就係令系統喺部分故障時仍然可以運作。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'rate-limiter', label: 'Rate Limiter 限流器' },
  { slug: 'api-gateway', label: 'API Gateway 網關' },
  { slug: 'monitoring', label: '應用程式監控' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Circuit Breaker 係咩？</h2>
      <div className="subtitle">防止 Cascading Failure 嘅關鍵模式</div>
      <p>
        想像屋企嘅電路保險絲——當電流太大嘅時候，保險絲會自動斷開，保護電器唔會燒壞。
        <strong style={{ color: '#3B82F6' }}> Circuit Breaker</strong> 喺軟件系統入面嘅角色一模一樣：
        當下游服務持續失敗，Circuit Breaker 會自動<strong style={{ color: '#f87171' }}>斷開</strong>，
        唔再發請求去掛咗嘅服務，防止成個系統跟住一齊倒。
      </p>
      <p>
        如果冇 Circuit Breaker，下游服務掛咗嘅話，所有請求都會 timeout，
        上游嘅 <strong style={{ color: '#fbbf24' }}>thread pool</strong> 同 <strong style={{ color: '#fbbf24' }}>connection pool</strong> 會被耗盡，
        最終上游服務自己都掛埋——呢個就係恐怖嘅 <strong style={{ color: '#f87171' }}>Cascading Failure</strong>。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <filter id="glowGreen"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowRed"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#f87171" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowAmber"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#fbbf24" floodOpacity="0.25" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradClosed" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradOpen" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradHalf" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
          </defs>

          {/* Closed State */}
          <g transform="translate(50,120)" filter="url(#glowGreen)">
            <rect width="160" height="80" rx="14" fill="url(#gradClosed)" stroke="#34d399" strokeWidth="2.5" filter="url(#shadow)" />
            <text x="80" y="30" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">Closed</text>
            <text x="80" y="50" textAnchor="middle" fill="#6ee7b7" fontSize="10">正常通過</text>
            <text x="80" y="66" textAnchor="middle" fill="#9ca3af" fontSize="9">計算失敗次數</text>
          </g>

          {/* Open State */}
          <g transform="translate(530,120)" filter="url(#glowRed)">
            <rect width="160" height="80" rx="14" fill="url(#gradOpen)" stroke="#f87171" strokeWidth="2.5" filter="url(#shadow)" />
            <text x="80" y="30" textAnchor="middle" fill="#f87171" fontSize="14" fontWeight="700">Open</text>
            <text x="80" y="50" textAnchor="middle" fill="#fca5a5" fontSize="10">全部拒絕</text>
            <text x="80" y="66" textAnchor="middle" fill="#9ca3af" fontSize="9">快速失敗 + Fallback</text>
          </g>

          {/* Half-Open State */}
          <g transform="translate(280,20)" filter="url(#glowAmber)">
            <rect width="160" height="70" rx="14" fill="url(#gradHalf)" stroke="#fbbf24" strokeWidth="2.5" filter="url(#shadow)" />
            <text x="80" y="28" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="700">Half-Open</text>
            <text x="80" y="48" textAnchor="middle" fill="#fcd34d" fontSize="10">放少量測試請求</text>
            <text x="80" y="62" textAnchor="middle" fill="#9ca3af" fontSize="9">探測下游狀態</text>
          </g>

          {/* Closed → Open (failure threshold reached) */}
          <path d="M212,160 Q370,160 528,160" fill="none" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrRed)" />
          <text x="370" y="150" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">失敗次數超過閾值</text>

          {/* Open → Half-Open (timeout elapsed) */}
          <path d="M610,118 Q610,55 442,55" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrAmber)" />
          <text x="560" y="75" textAnchor="middle" fill="#fbbf24" fontSize="10">等待 Timeout 後</text>

          {/* Half-Open → Closed (test succeeds) */}
          <path d="M280,55 Q170,55 130,118" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="170" y="75" textAnchor="middle" fill="#34d399" fontSize="10">測試成功</text>

          {/* Half-Open → Open (test fails) */}
          <path d="M442,40 Q550,10 630,118" fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrRed)" />
          <text x="560" y="35" textAnchor="middle" fill="#f87171" fontSize="10">測試失敗</text>

          {/* Summary */}
          <g transform="translate(120,250)">
            <rect width="480" height="45" rx="10" fill="rgba(59,130,246,0.08)" stroke="#3B82F6" strokeWidth="1" />
            <text x="240" y="18" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="600">State Machine：三個狀態自動切換</text>
            <text x="240" y="35" textAnchor="middle" fill="#9ca3af" fontSize="10">Closed（正常）→ Open（熔斷）→ Half-Open（探測）→ Closed / Open</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>三個狀態點運作</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#34d399' }}>Closed（關閉）</strong>：正常狀態，所有請求都通過。Circuit Breaker 喺背後計算失敗次數。如果喺一段時間內失敗次數超過閾值，就轉去 Open。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#f87171' }}>Open（打開）</strong>：熔斷狀態，所有請求直接被拒絕（Fast Fail），唔會發去下游。上游可以用 Fallback 回應。等一段 Timeout 後，自動轉去 Half-Open。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#fbbf24' }}>Half-Open（半開）</strong>：探測狀態，放少量請求通過去測試下游。如果測試成功，轉返 Closed；如果仍然失敗，轉返 Open。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階模式同配置</h2>
      <div className="subtitle">Bulkhead、Retry、同相關 Resilience 模式</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Failure Threshold 設定</h4>
          <p>閾值設太低，正常嘅偶爾失敗都會觸發熔斷（誤觸發太多）。設太高，真正嘅故障要好耐先被發現。建議：用 <strong style={{ color: '#3B82F6' }}>失敗率</strong>（例如 50% failure rate）而唔係失敗次數（例如 5 次）。同時設定最少請求數（例如至少 20 個請求先開始計算），避免低流量時誤判。</p>
        </div>
        <div className="key-point">
          <h4>Bulkhead Pattern（艙壁模式）</h4>
          <p>將唔同嘅下游服務用<strong style={{ color: '#34d399' }}>獨立嘅 Thread Pool / Connection Pool</strong> 隔離。即使服務 A 嘅 Circuit Breaker 開咗，唔會影響服務 B 嘅可用資源。好似船嘅艙壁——一個艙入水唔會沉成隻船。</p>
        </div>
        <div className="key-point">
          <h4>Retry with Exponential Backoff</h4>
          <p>重試唔係壞事，但要聰明咁重試。用 <strong style={{ color: '#fbbf24' }}>Exponential Backoff</strong>：第一次等 1 秒、第二次 2 秒、第四次 8 秒⋯再加 <strong style={{ color: '#fbbf24' }}>Jitter</strong>（隨機偏移），避免所有 client 同時重試。Circuit Breaker 同 Retry 配合用：先 Retry，Retry 失敗到閾值就觸發 Circuit Breaker。</p>
        </div>
        <div className="key-point">
          <h4>Timeout 配置</h4>
          <p>Circuit Breaker 嘅 Open → Half-Open 嘅 Timeout 點設？太短嘅話下游可能未恢復，太長嘅話影響可用性。建議：初始 Timeout 設 <strong style={{ color: '#8B5CF6' }}>30-60 秒</strong>，然後用 Progressive Timeout（每次 Half-Open 失敗就加倍 Timeout），俾下游更多恢復時間。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰同工具選擇</h2>
      <div className="subtitle">Resilience4j、Istio 同監控</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Resilience4j（Java 生態）</h4>
          <p>Netflix Hystrix 已經唔再維護，而家用 <strong style={{ color: '#3B82F6' }}>Resilience4j</strong>。佢係輕量級嘅，支持 Circuit Breaker、Retry、Bulkhead、Rate Limiter、Time Limiter。配合 Spring Boot Actuator 可以暴露 metrics 到 Prometheus。</p>
        </div>
        <div className="key-point">
          <h4>Service Mesh（Istio / Linkerd）</h4>
          <p>如果用 Kubernetes，可以用 <strong style={{ color: '#34d399' }}>Istio</strong> 做 Circuit Breaker，唔使改應用 code。Istio 嘅 sidecar proxy（Envoy）會自動處理 Circuit Breaking、Retry、Timeout。呢個方法嘅好處係 infrastructure-level，所有服務統一。</p>
        </div>
        <div className="key-point">
          <h4>Fallback 策略設計</h4>
          <p>好嘅 Fallback 策略：1）<strong style={{ color: '#fbbf24' }}>返回 Cached 數據</strong>（推薦系統掛咗就返回上次嘅推薦）、2）<strong style={{ color: '#fbbf24' }}>返回預設值</strong>（價格服務掛咗就返回目錄價）、3）<strong style={{ color: '#fbbf24' }}>Graceful Degradation</strong>（關閉非核心功能，保留主要功能）。</p>
        </div>
        <div className="key-point">
          <h4>監控同 Alert</h4>
          <p>Circuit Breaker 嘅狀態變化一定要做 monitoring。喺 Grafana Dashboard 顯示：Open 狀態次數、Half-Open 成功率、Fallback 觸發頻率。如果 Circuit Breaker 頻繁觸發，代表下游服務有問題，需要 Alert 去調查。</p>
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
        <h4>Prompt 1 — 實現 Circuit Breaker Middleware</h4>
        <div className="prompt-text">
          {'用 '}
          <span className="placeholder">[Node.js / Go / Java Spring Boot]</span>
          {' 實現一個 Circuit Breaker middleware。\n\n要求：\n- 實現三個狀態：Closed → Open → Half-Open → Closed/Open\n- 可配置參數：failure threshold（失敗率 50%）、minimum requests（20）、open timeout（30 秒）、half-open max requests（3）\n- Closed 狀態用 Sliding Window 計算失敗率\n- Open 狀態直接返回 Fallback response\n- Half-Open 狀態放少量請求測試\n- 支持自定義 Fallback function（返回 cached data / 預設值）\n- 暴露 metrics（state changes、failure count、fallback count）\n- 寫齊 unit test 覆蓋所有狀態轉換\n- 用 '}
          <span className="placeholder">[Express middleware / Go middleware / Spring AOP]</span>
          {' 形式'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Resilience 全套方案（CB + Retry + Bulkhead）</h4>
        <div className="prompt-text">
          {'設計一個完整嘅 Resilience 方案，場景係 '}
          <span className="placeholder">[電商 / 金融 / 社交平台]</span>
          {' 嘅微服務架構。\n\n要求：\n- Circuit Breaker：per-service 配置，唔同服務有唔同嘅 threshold\n- Retry：Exponential Backoff + Jitter，可配置最大重試次數\n- Bulkhead：每個下游服務獨立嘅 connection pool\n- Timeout：per-request timeout 配置\n- Fallback：每個服務有對應嘅 degradation 策略\n- 用 '}
          <span className="placeholder">[Resilience4j / Polly / 自己實現]</span>
          {'\n- Grafana Dashboard 配置（Circuit Breaker 狀態、Retry 次數、Fallback 觸發率）\n- Docker Compose + Prometheus + Grafana 完整 setup'}
        </div>
      </div>
    </div>
  );
}

export default function CircuitBreaker() {
  return (
    <>
      <TopicTabs
        title="Circuit Breaker 熔斷器"
        subtitle="防止 Cascading Failure 嘅系統保護機制"
        tabs={[
          { id: 'overview', label: '① 整體概念', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階模式', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰工具', premium: true, content: <PracticeTab /> },
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
