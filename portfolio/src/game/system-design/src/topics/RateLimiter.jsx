import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Token Bucket 同 Sliding Window 最大嘅分別係咩？',
    options: [
      { text: 'Token Bucket 可以處理突發流量，Sliding Window 唔得', correct: true, explanation: 'Token Bucket 可以累積 token，短時間內處理 burst 流量。Sliding Window 嚴格限制窗口內嘅請求數量，唔容許超標。' },
      { text: 'Sliding Window 比 Token Bucket 快', correct: false, explanation: '兩者嘅執行速度差唔多，主要分別係限流策略唔同，唔係速度。' },
      { text: 'Token Bucket 唔需要 Redis', correct: false, explanation: '分佈式環境下，Token Bucket 一樣需要 Redis 做中央計數。' },
      { text: 'Sliding Window 唔支持 per-user 限流', correct: false, explanation: 'Sliding Window 完全支持 per-user 限流，只需要用唔同嘅 key 就得。' },
    ],
  },
  {
    question: '分佈式環境下做 rate limiting，點解一定要用 Redis？',
    options: [
      { text: '因為 Redis 最便宜', correct: false, explanation: '成本唔係主要考量，重點係 Redis 嘅特性適合呢個場景。' },
      { text: '因為需要中央計數器，確保所有 server 共享同一個 count', correct: true, explanation: '如果每台 server 自己計自己，用戶換一台 server 就重置 count，限流形同虛設。Redis 做中央計數器可以確保全局一致。' },
      { text: '因為 Redis 支持 SQL', correct: false, explanation: 'Redis 係 key-value store，唔支持 SQL。佢嘅優勢係極低延遲同原子操作。' },
      { text: '因為冇其他選擇', correct: false, explanation: '理論上可以用其他中央存儲，但 Redis 嘅速度同原子操作（INCR + EXPIRE）令佢成為最佳選擇。' },
    ],
  },
  {
    question: 'HTTP 429 response 應該包含咩重要資訊？',
    options: [
      { text: '只需要 status code 429 就夠', correct: false, explanation: '只有 status code 唔夠，client 唔知幾時可以重試。' },
      { text: 'Retry-After header 同 X-RateLimit 相關 headers', correct: true, explanation: 'Retry-After 話俾 client 知幾時可以重試。X-RateLimit-Limit、X-RateLimit-Remaining、X-RateLimit-Reset 幫助 client 了解自己嘅用量。' },
      { text: 'Server 嘅 IP 地址', correct: false, explanation: '暴露 server IP 係安全風險，唔應該放喺 response 入面。' },
      { text: '所有被 block 嘅用戶列表', correct: false, explanation: '呢個係嚴重嘅隱私問題，絕對唔應該暴露其他用戶嘅資訊。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'api-gateway', label: 'API Gateway 網關' },
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
  { slug: 'redis', label: 'Redis' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Rate Limiter 係咩</h2>
      <div className="subtitle">簡單講：一個「閘口」，限制每個用戶每秒可以發幾多請求</div>
      <p>
        想像去主題公園，每個機動遊戲都有排隊限制——每次只可以放 X 個人入去。Rate Limiter 就係網絡世界嘅「排隊管理員」，企喺 API 前面，確保冇人可以不斷瘋狂咁發請求，搞到成個系統死機。
      </p>
      <p>
        如果有人發太多請求，Rate Limiter 會直接回覆 <strong style={{ color: '#f87171' }}>429 Too Many Requests</strong>（即係「太快啦，等陣先」），保護後面嘅 API Server 同 Database。重點係：呢個係保護系統嘅第一道防線。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 770 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#EF4444" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradClient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradLimiter" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d1515" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRedis" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAPI" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDB" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(30,140)">
            <rect width="120" height="75" rx="14" fill="url(#gradClient)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="32" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">Client</text>
            <text x="60" y="54" textAnchor="middle" fill="#9ca3af" fontSize="10">用戶 / App</text>
          </g>

          <g transform="translate(220,130)">
            <rect width="150" height="95" rx="14" fill="url(#gradLimiter)" stroke="#EF4444" strokeWidth="2.5" filter="url(#glowRed)" />
            <text x="75" y="28" textAnchor="middle" fill="#EF4444" fontSize="14" fontWeight="700">Rate</text>
            <text x="75" y="48" textAnchor="middle" fill="#EF4444" fontSize="14" fontWeight="700">Limiter</text>
            <text x="75" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">限流閘口</text>
            <text x="75" y="85" textAnchor="middle" fill="#fbbf24" fontSize="9">100 req/min per user</text>
          </g>

          <g transform="translate(240,20)">
            <rect width="130" height="65" rx="14" fill="url(#gradRedis)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="27" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Redis</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">計數器 Counter</text>
          </g>

          <g transform="translate(450,140)">
            <rect width="140" height="75" rx="14" fill="url(#gradAPI)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="32" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">API Server</text>
            <text x="70" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">處理請求</text>
          </g>

          <g transform="translate(640,140)">
            <rect width="115" height="75" rx="14" fill="url(#gradDB)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="58" y="32" textAnchor="middle" fill="#8B5CF6" fontSize="14" fontWeight="700">Database</text>
            <text x="58" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">資料庫</text>
          </g>

          <path d="M152,177 C180,177 195,172 218,170" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="185" y="165" textAnchor="middle" fill="#a5b4fc" fontSize="10">Request</text>

          <path d="M305,128 C305,105 305,95 305,87" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrYellow)" />
          <text x="335" y="112" fill="#fbbf24" fontSize="10">Check count</text>

          <path d="M372,170 C400,168 420,168 448,170" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="410" y="160" textAnchor="middle" fill="#34d399" fontSize="10">Allow</text>

          <path d="M592,177 C610,177 620,177 638,177" fill="none" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrPurple)" />
          <text x="615" y="167" textAnchor="middle" fill="#a5b4fc" fontSize="10">Query</text>

          <g transform="translate(220,268)">
            <rect width="150" height="48" rx="10" fill="rgba(239,68,68,0.1)" stroke="#f87171" strokeWidth="1.5" />
            <text x="75" y="20" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">429 Too Many</text>
            <text x="75" y="38" textAnchor="middle" fill="#f87171" fontSize="10">Requests — 你太快啦</text>
          </g>
          <path d="M295,227 C295,240 295,255 295,266" fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrRed)" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>完整流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>用戶發一個 Request 過嚟，首先經過 Rate Limiter。關鍵在於 Rate Limiter 係所有請求嘅「閘口」。</span></li>
        <li><span className="step-num">2</span><span>Rate Limiter 去 Redis 度查返呢個用戶喺過去一段時間（例如 1 分鐘）發咗幾多個 Request。Redis 係最適合做呢樣嘢嘅——因為 Redis 超快。</span></li>
        <li><span className="step-num">3</span><span>如果未超額，就放請求過去 API Server 正常處理。</span></li>
        <li><span className="step-num">4</span><span>如果超額，直接回覆 429 Too Many Requests，唔俾請求通過。呢個回覆好快，因為根本唔使打後端。</span></li>
      </ol>
    </div>
  );
}

function AlgorithmsTab() {
  return (
    <div className="card">
      <h2>四種常見限流演算法</h2>
      <div className="subtitle">每種都有唔同嘅精確度同適用場景</div>

      <div className="algo-section">
        <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '16px' }}>Token Bucket（令牌桶）</h3>
        <p>
          想像一個桶，系統會定時放「令牌」入去。每個請求要攞走一個令牌先可以通過。桶滿咗就唔再加令牌。桶空咗就拒絕請求。
        </p>
        <p>
          <strong style={{ color: '#34d399' }}>好處：</strong>可以應付突發流量（burst），因為桶入面可以累積令牌。呢個係最常用嘅演算法，一定要掌握。<br />
          <strong style={{ color: '#f87171' }}>例子：</strong>每秒加 10 個令牌，桶最多放 50 個。平時用 10 個/秒，但突然嚟 50 個都可以即時處理。
        </p>
      </div>

      <div className="algo-section" style={{ marginTop: '24px' }}>
        <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '16px' }}>Sliding Window（滑動窗口）</h3>
        <p>
          用一個時間窗口（例如過去 60 秒）嚟計算請求數量。每秒窗口都會「滑動」——舊嘅請求會跌出窗口，新嘅會加入。
        </p>
        <p>
          <strong style={{ color: '#34d399' }}>好處：</strong>計數更加精確，唔會出現固定窗口嘅邊界問題。建議做精確限流嘅時候用呢個。<br />
          <strong style={{ color: '#f87171' }}>複雜度：</strong>要記住每個請求嘅時間戳，記憶體用得多少少。需要衡量精確度同記憶體嘅取捨。
        </p>
      </div>

      <div className="algo-section" style={{ marginTop: '24px' }}>
        <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '16px' }}>Fixed Window Counter（固定窗口計數器）</h3>
        <p>
          最簡單嘅方法：每分鐘開一個新計數器，過咗就歸零。適合初學或者要求唔高嘅場景。
        </p>
        <p>
          <strong style={{ color: '#34d399' }}>好處：</strong>實現最簡單，Redis 一個 INCR 就搞掂。<br />
          <strong style={{ color: '#f87171' }}>壞處：</strong>要留意呢個問題——窗口交界位可能突然有雙倍請求通過（例如 59 秒同 00 秒各 100 個，一秒內就有 200 個請求通過）。
        </p>
      </div>

      <div className="algo-section" style={{ marginTop: '24px' }}>
        <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '16px' }}>Leaky Bucket（漏桶）</h3>
        <p>
          請求好似水咁倒入桶，桶底有個細孔以固定速率漏水出去。桶滿咗就溢出（拒絕請求）。
        </p>
        <p>
          <strong style={{ color: '#34d399' }}>好處：</strong>輸出速率永遠穩定，適合喺需要平滑流量嘅場景使用。<br />
          <strong style={{ color: '#f87171' }}>壞處：</strong>突發流量冇辦法即時處理，一定要排隊。呢個就係 Leaky Bucket 同 Token Bucket 嘅最大分別。
        </p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>幾個實戰要點</h2>
      <div className="subtitle">面試同實際開發都會問到嘅重點</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Per-user vs Per-IP</h4>
          <p>可以按用戶 ID 限流（登入用戶），或者按 IP 地址限流（未登入嘅訪客）。最佳做法係兩種都做——按 user ID 防止帳戶濫用，按 IP 防止匿名攻擊。甚至可以按 API endpoint 嚟分別限流。</p>
        </div>
        <div className="key-point">
          <h4>分佈式限流</h4>
          <p>如果有好多台 API Server，就需要一個中央計數器（例如 Redis）嚟確保所有 Server 共享同一個 count。關鍵在於：唔用中央計數器嘅話，每台 Server 自己計自己，用戶換一台 Server 就重置 count，限流形同虛設。</p>
        </div>
        <div className="key-point">
          <h4>HTTP Headers</h4>
          <p>好嘅 Rate Limiter 會喺 response 加 header：X-RateLimit-Limit（上限）、X-RateLimit-Remaining（剩餘）、X-RateLimit-Reset（幾時重置）。建議一定要加呢啲 header，俾 Client 知道自己嘅用量。</p>
        </div>
        <div className="key-point">
          <h4>Redis 做計數</h4>
          <p>用 Redis 嘅 INCR 同 EXPIRE 命令，一行 code 就可以做到原子性嘅計數同過期時間設定。超快！實戰經驗顯示 Redis 做 rate limiting 係最穩陣嘅方案。</p>
        </div>
      </div>

      <div className="use-case" style={{ marginTop: '24px' }}>
        <h4>總結</h4>
        <p>GitHub API 限制每小時 5000 次請求；Twitter API 限制每 15 分鐘 900 次。呢啲都係 Rate Limiter 嘅實際應用。重點係：如果 API 係公開嘅，Rate Limiter 係必須嘅——唔加嘅話，DDoS 攻擊或者有人寫個 loop 不停打 API，系統好快就會倒下。</p>
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
        <h4>Prompt 1 — 實現 Rate Limiter（Token Bucket + Sliding Window）</h4>
        <div className="prompt-text">用 <span className="placeholder">[Node.js / Python / Go]</span> + Redis 實現兩種 Rate Limiting 演算法。{'\n\n'}要求：{'\n'}- 實現 Token Bucket 演算法：{'\n'}  - 每秒補充 <span className="placeholder">[10 / 50]</span> 個 token，桶容量上限 <span className="placeholder">[50 / 200]</span>{'\n'}  - 每個 request 消耗 1 個 token{'\n'}  - 用 Redis 儲存每個用戶嘅 token 數量同最後補充時間{'\n'}- 實現 Sliding Window 演算法：{'\n'}  - 窗口大小 <span className="placeholder">[1 分鐘 / 15 分鐘]</span>{'\n'}  - 每個窗口最多 <span className="placeholder">[100 / 900]</span> 個請求{'\n'}  - 用 Redis Sorted Set 記錄每個請求嘅 timestamp{'\n'}- 兩種演算法都要寫成 middleware，可以直接掛載到 API route{'\n'}- 超限時返回 429 Too Many Requests，包含 Retry-After header{'\n'}- 寫埋 HTTP response headers：X-RateLimit-Limit、X-RateLimit-Remaining、X-RateLimit-Reset</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計分佈式 Rate Limiting 系統</h4>
        <div className="prompt-text">設計一個 production-grade 嘅分佈式 Rate Limiting 系統。{'\n\n'}場景：{'\n'}- <span className="placeholder">[10 / 50]</span> 台 API Server 共享同一套限流規則{'\n'}- 支援多維度限流：per-user、per-IP、per-API-endpoint{'\n'}- 技術棧：<span className="placeholder">[Node.js / Go]</span> + Redis Cluster{'\n\n'}詳細要求：{'\n'}- 用 Redis 做中央計數器，確保所有 Server 共享 count{'\n'}- 用 Lua Script 保證 check-and-increment 嘅原子性{'\n'}- 設計 fallback 機制：Redis 掛咗嘅時候點處理（放行 vs 拒絕）{'\n'}- 實現多層限流規則（例如：每秒 10 次 + 每分鐘 100 次 + 每小時 1000 次）{'\n'}- 包含監控 dashboard 設計（顯示每個用戶嘅用量、被 rate limit 嘅次數）{'\n'}- 寫出完整代碼同配置文件</div>
      </div>
    </div>
  );
}

export default function RateLimiter() {
  return (
    <>
      <TopicTabs
        title="Rate Limiter 限流器"
        subtitle="點樣防止系統被過量請求打爆"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'algorithms', label: '② 限流演算法', content: <AlgorithmsTab /> },
          { id: 'practice', label: '③ 實戰要點', premium: true, content: <PracticeTab /> },
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
