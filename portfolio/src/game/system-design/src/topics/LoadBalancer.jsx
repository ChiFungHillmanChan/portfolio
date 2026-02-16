import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Load Balancer 最主要嘅功能係咩？',
    options: [
      { text: '將請求分配到多台 Server，確保高可用', correct: true, explanation: 'LB 嘅核心職責就係分配流量同提供高可用性。' },
      { text: '加密所有網路流量', correct: false, explanation: 'SSL Termination 只係 LB 其中一個附加功能，唔係主要功能。' },
      { text: '儲存用戶 Session 資料', correct: false, explanation: 'Session 存儲通常由 Redis 或者 Database 負責。' },
      { text: '壓縮 HTTP 回應', correct: false, explanation: '壓縮通常由 Web Server 或者 CDN 處理。' },
    ],
  },
  {
    question: 'L4 同 L7 Load Balancer 最大嘅分別係咩？',
    options: [
      { text: 'L4 只睇 TCP/IP，L7 可以讀 HTTP 內容', correct: true, explanation: 'L4 喺 Transport Layer 運作，L7 喺 Application Layer，可以根據 URL、Header 等做智慧路由。' },
      { text: 'L4 比 L7 更安全', correct: false, explanation: '兩者各有安全特性，唔存在邊個更安全。' },
      { text: 'L7 唔支援 SSL', correct: false, explanation: 'L7 LB 通常負責 SSL Termination。' },
      { text: 'L4 只能用於內網', correct: false, explanation: 'L4 LB（例如 AWS NLB）可以用於公網。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'api-gateway', label: 'API 閘道' },
  { slug: 'cdn', label: 'CDN 內容分發' },
  { slug: 'rate-limiter', label: '流量限制器' },
  { slug: 'distributed-cache', label: '分散式快取' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Load Balancer 係咩</h2>
      <div className="subtitle">將大量請求平均分配俾多台 Server 處理</div>
      <p>
        想像一個場景：網站每秒有 10 萬個請求湧入，一台 Server 點搞都搞唔掂。呢個時候就需要多台 Server 一齊分擔工作。而 Load Balancer 就係負責決定每個請求應該送去邊台 Server 嘅「交通指揮官」。
      </p>
      <p>
        重點係，Load Balancer 仲會做一樣好重要嘅嘢：<strong style={{ color: '#f87171' }}>Health Check</strong>。LB 會定期檢查每台 Server 係咪正常運作。如果某台 Server 掛咗，LB 會自動將流量轉去其他 Server，用戶完全唔會感受到。呢個就係所謂嘅「高可用」。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 350" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradClient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradLB" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradServer" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>
          <g transform="translate(30,125)">
            <rect width="120" height="75" rx="14" fill="url(#gradClient)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="30" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Clients</text>
            <text x="60" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">大量用戶請求</text>
          </g>
          <g transform="translate(240,110)">
            <rect width="150" height="90" rx="14" fill="url(#gradLB)" stroke="#F59E0B" strokeWidth="2.5" filter="url(#glowAmber)" />
            <text x="75" y="30" textAnchor="middle" fill="#F59E0B" fontSize="15" fontWeight="700">Load</text>
            <text x="75" y="50" textAnchor="middle" fill="#F59E0B" fontSize="15" fontWeight="700">Balancer</text>
            <text x="75" y="72" textAnchor="middle" fill="#9ca3af" fontSize="10">負載均衡</text>
          </g>
          <g transform="translate(490,30)">
            <rect width="130" height="58" rx="14" fill="url(#gradServer)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="24" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Server 1</text>
            <text x="65" y="44" textAnchor="middle" fill="#34d399" fontSize="10">Healthy</text>
          </g>
          <g transform="translate(490,125)">
            <rect width="130" height="58" rx="14" fill="url(#gradServer)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="24" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Server 2</text>
            <text x="65" y="44" textAnchor="middle" fill="#34d399" fontSize="10">Healthy</text>
          </g>
          <g transform="translate(490,220)">
            <rect width="130" height="58" rx="14" fill="url(#gradServer)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="24" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Server 3</text>
            <text x="65" y="44" textAnchor="middle" fill="#34d399" fontSize="10">Healthy</text>
          </g>
          <g transform="translate(255,250)">
            <rect width="135" height="52" rx="12" fill="rgba(239,68,68,0.08)" stroke="#f87171" strokeWidth="1.5" />
            <text x="68" y="22" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="700">Health Check</text>
            <text x="68" y="40" textAnchor="middle" fill="#f87171" fontSize="10">每 5 秒檢查一次</text>
          </g>
          <path d="M152,162 C190,162 200,155 238,155" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="195" y="148" textAnchor="middle" fill="#a5b4fc" fontSize="10">Requests</text>
          <path d="M392,135 C430,125 450,85 488,62" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <path d="M392,155 C420,155 460,155 488,155" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <path d="M392,175 C430,185 450,225 488,248" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <path d="M322,250 L322,202" fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrRed)" />
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span>所有 Client 請求先到達 Load Balancer——關鍵在於，LB 係唯一嘅入口。</span></li>
        <li><span className="step-num">2</span><span>LB 用特定演算法（Round Robin、Least Connections 等）揀一台 Server 去處理請求。每種演算法嘅特點會逐個拆解。</span></li>
        <li><span className="step-num">3</span><span>Health Check 定期 ping 每台 Server，掛咗嘅自動踢走，確保流量只會去到健康嘅 Server。</span></li>
      </ol>
    </div>
  );
}

function AlgorithmsTab() {
  return (
    <div className="card">
      <h2>幾種負載分配演算法</h2>
      <div className="subtitle">揀啱演算法，系統效能差好遠</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Round Robin</h4>
          <p>最簡單嘅方法，建議從呢個開始理解。就係輪流分配：Request 1 去 Server 1，Request 2 去 Server 2，Request 3 去 Server 3，然後再返去 Server 1。</p>
        </div>
        <div className="key-point">
          <h4>Weighted Round Robin</h4>
          <p>現實中每台 Server 嘅性能唔一樣，所以要俾高性能嘅 Server 多啲請求。例如 Server A 權重 5，Server B 權重 3，咁 A 就會收到更多流量。</p>
        </div>
        <div className="key-point">
          <h4>Least Connections</h4>
          <p>呢個好實用——邊台 Server 現時連接數最少就送去邊台。適合請求處理時間差異大嘅場景，因為 LB 會自動平衡工作量。</p>
        </div>
        <div className="key-point">
          <h4>IP Hash</h4>
          <p>根據 Client IP 做 hash 決定去邊台 Server。好處係同一個用戶永遠去同一台 Server（類似 sticky session）。但要留意，呢個方法有風險——如果嗰台 Server 掛咗，用戶就要重新分配。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>L4 vs L7 負載均衡</h2>
      <div className="subtitle">必須搞清楚呢兩種唔同層級嘅 Load Balancing</div>
      <p><strong style={{ color: '#fbbf24' }}>L4（Transport Layer）</strong>：只睇 TCP/IP 資訊（IP + Port），完全唔理 HTTP 內容。速度極快、開銷極小。可以理解為「盲分」——LB 唔知請求內容係咩，只負責快速轉發。例如 AWS NLB 就係 L4。</p>
      <p><strong style={{ color: '#34d399' }}>L7（Application Layer）</strong>：可以讀 HTTP header、URL path、cookie 等內容。功能強好多——可以根據 URL 路由到唔同嘅 Server 組。例如 /api 去 API Server，/static 去 CDN。Nginx 同 AWS ALB 都係 L7。</p>
      <div className="key-points" style={{ marginTop: 20 }}>
        <div className="key-point">
          <h4>SSL Termination</h4>
          <p>最佳做法係將 SSL 解密交俾 LB 處理，後面嘅 Server 只需要處理 HTTP。呢樣可以大幅減少 Server 嘅 CPU 負擔，因為加解密好食 CPU。</p>
        </div>
        <div className="key-point">
          <h4>Sticky Sessions</h4>
          <p>將同一用戶永遠送去同一台 Server。方便係方便，但要注意——如果嗰台 Server 掛咗，用戶嘅 session 就冇咗。所以盡量唔好依賴 sticky session，而係用 Redis 做 shared session。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>部署建議</h4>
        <p>生產環境建議用兩層 LB：L4（NLB）做第一層，L7（ALB/Nginx）做第二層。L4 做 TCP 分流超快，L7 做智慧路由超靈活。兩者配合，既有性能又有彈性。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber 提示模板</h2>
      <div className="subtitle">複製以下 Prompt 直接問 ChatGPT / Claude</div>
      <div className="prompt-card">
        <h4>理解 Load Balancer 架構</h4>
        <div className="prompt-text">
          我想深入理解 Load Balancer 嘅設計。請幫我解答以下問題：{'\n\n'}
          1. L4 同 L7 Load Balancer 嘅具體差別係咩？各自適合咩場景？{'\n'}
          2. Round Robin、Weighted Round Robin、Least Connections 嘅優缺點比較{'\n'}
          3. Health Check 嘅具體實現方式（TCP Check vs HTTP Check）{'\n'}
          4. 點樣設計一個高可用嘅 Load Balancer（避免 LB 自己成為單點故障）{'\n\n'}
          請用簡單嘅廣東話解釋，配合實際例子。
        </div>
      </div>
    </div>
  );
}

export default function LoadBalancer() {
  return (
    <>
      <TopicTabs
        title="Load Balancer 負載均衡器"
        subtitle="點樣將流量分配到多台服務器，保證高可用"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'algorithms', label: '② 分配演算法', content: <AlgorithmsTab /> },
          { id: 'practice', label: '③ L4 vs L7', premium: true, content: <PracticeTab /> },
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
