import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '面試官問：「我哋個 API 好慢，你會點 debug？」邊個答案最能展示 Senior 級嘅系統性思維？',
    options: [
      { text: '加多幾台 server 嚟 handle 多啲 request', correct: false, explanation: '呢個係 Intern 級答案。完全冇診斷就 throw hardware — 如果樽頸位係單一條 DB query，加 100 台 server 都係慢' },
      { text: '睇下 DB query 用咗幾耐、third-party API call 幾耐、有冇 index', correct: false, explanation: '呢個係 Junior 答案，已經有 component-level 嘅思考，但仲未到 systematic — 冇 logging、冇 tracing，靠 guess' },
      { text: '加 distributed tracing 同 per-request logging，揾出 latency 喺邊個 component，然後針對性加 index / cache / async job', correct: true, explanation: '啱！Senior 答案：先收集 evidence（tracing + logging），再 target 真正樽頸位，最後用對應方案。冇 evidence 嘅 optimization 係 guess work' },
      { text: '改用 GraphQL 取代 REST，因為 GraphQL 比較快', correct: false, explanation: 'GraphQL 同 REST 速度差異唔大，主要分別係 query flexibility。換 protocol 唔解決 latency 問題' },
    ],
  },
  {
    question: '點解 Senior Engineer 堅持「先加 tracing 先 optimize」，唔可以憑經驗直接落手改？',
    options: [
      { text: 'Tracing 工具係佢哋公司 sponsor 嘅', correct: false, explanation: '同 sponsor 完全冇關係' },
      { text: '冇 evidence 嘅 optimization 通常 optimize 錯位 — 樽頸可能根本唔係你估嘅嗰個 component', correct: true, explanation: '啱！經驗會誤導 — 你以為慢喺 DB，但可能慢喺一個 sync 嘅 email send。冇 tracing 你會 spent 一星期 optimize DB query，結果完全冇 impact' },
      { text: 'Tracing 可以自動修復 bug', correct: false, explanation: 'Tracing 只係觀察工具，唔會自動修嘢' },
      { text: '加 tracing 之後 API 會即時變快', correct: false, explanation: 'Tracing 本身會輕微增加 overhead，唔會加速' },
    ],
  },
  {
    question: '一個 API endpoint 要 send confirmation email、update analytics dashboard、return response 俾 user。點樣設計可以令 user 等少啲？',
    options: [
      { text: '全部 sync 處理，咁先確保所有嘢做完', correct: false, explanation: '咁樣 user 要等到 send email + update analytics 都完成先收到 response — 通常加 2-3 秒不必要嘅延遲' },
      { text: '先 return response 俾 user，將 send email + update analytics 推入 task queue 後台 async 處理', correct: true, explanation: '啱！呢個係 Senior 設計：critical path（return response）保持極短，唔關鍵但耗時嘅嘢（email、analytics）落 queue 後台慢慢做。User 體驗即時提升' },
      { text: '加多幾台 server 處理 sync 嘅 email + analytics', correct: false, explanation: '加 server 唔會令 sync 流程變短 — 每個 request 嘅總時間冇變' },
      { text: '改用更快嘅 SMTP server', correct: false, explanation: '即使 SMTP 變快 100ms，user 都仲係喺等 — 把 email 移出 critical path 先係根本解決' },
    ],
  },
  {
    question: 'Cache 喺 server 同 DB 之間嘅作用係咩？點解 Senior 唔一開始就加 Cache？',
    options: [
      { text: '減少 DB 壓力同加快 read，但 Cache 加錯位置反而會增加 bug（cache invalidation、stale data）', correct: true, explanation: '啱！Cache 確實可以大幅減少 DB load 同 latency，但 cache invalidation 係 distributed system 嘅二大難題之一。加之前要先用 tracing 確認 (1) DB 真係樽頸 (2) 嗰類 query 適合 cache（重複、唔變）' },
      { text: '令數據儲存得更耐', correct: false, explanation: 'Cache 啱啱相反 — 通常有短 TTL，會自動 expire' },
      { text: 'Cache 一定加得越早越好', correct: false, explanation: '冇證據就加 Cache 係 premature optimization，可能帶來 stale data / invalidation 嘅 bug' },
      { text: '取代 Database', correct: false, explanation: 'Cache 唔係持久化儲存，唔可以取代 DB' },
    ],
  },
];

const relatedTopics = [
  { slug: 'fix-slow-database', label: 'Debug 慢 Database' },
  { slug: 'metrics-logging', label: 'Metrics & Logging 監控日誌' },
  { slug: 'monitoring', label: '應用程式監控' },
  { slug: 'task-queue', label: 'Task Queue 任務佇列' },
  { slug: 'junior-vs-senior', label: 'Junior 定 Senior' },
];

function InternTab() {
  return (
    <div className="card">
      <h2>Intern 做法 — 加機就得</h2>
      <div className="subtitle">「個 API 慢？加多幾台 server 啦」</div>
      <p>
        Intern 聽到「API 慢」嘅第一反應，係加 hardware。呢個答案表面上似有道理 — 多啲 server 嘛，理論上 throughput 高啲。但問題係：如果樽頸位喺單一條 DB query 或者 third-party API call，加 100 台 server 一樣慢。加機係 throughput 嘅解決方案，唔係 latency 嘅。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 280" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowDI" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <linearGradient id="gradDIServer" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDIDb" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDISad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a25" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrDIBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrDIRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>

          <g transform="translate(20,40)">
            <rect width="110" height="50" rx="12" fill="url(#gradDIServer)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowDI)" />
            <text x="55" y="22" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="700">Server 1</text>
            <text x="55" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">慢...</text>
          </g>
          <g transform="translate(20,110)">
            <rect width="110" height="50" rx="12" fill="url(#gradDIServer)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowDI)" />
            <text x="55" y="22" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="700">Server 2</text>
            <text x="55" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">仲係慢...</text>
          </g>
          <g transform="translate(20,180)">
            <rect width="110" height="50" rx="12" fill="url(#gradDIServer)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowDI)" />
            <text x="55" y="22" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="700">Server N</text>
            <text x="55" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">一樣慢</text>
          </g>

          <g transform="translate(280,100)">
            <rect width="180" height="80" rx="14" fill="url(#gradDIDb)" stroke="#f87171" strokeWidth="2" filter="url(#shadowDI)" />
            <text x="90" y="30" textAnchor="middle" fill="#fca5a5" fontSize="13" fontWeight="700">同一個 DB</text>
            <text x="90" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">同一條慢 query</text>
            <text x="90" y="66" textAnchor="middle" fill="#fca5a5" fontSize="10">真正樽頸位</text>
          </g>

          <g transform="translate(560,100)">
            <rect width="200" height="80" rx="14" fill="url(#gradDISad)" stroke="#EC4899" strokeWidth="2" filter="url(#shadowDI)" />
            <text x="100" y="30" textAnchor="middle" fill="#f472b6" fontSize="13" fontWeight="700">用戶</text>
            <text x="100" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">依然要等</text>
            <text x="100" y="66" textAnchor="middle" fill="#fca5a5" fontSize="10">加機完全冇用</text>
          </g>

          <path d="M132,65 C200,90 240,120 278,135" stroke="#3B82F6" strokeWidth="1.5" fill="none" markerEnd="url(#arrDIBlue)" />
          <path d="M132,135 C200,135 240,135 278,140" stroke="#3B82F6" strokeWidth="1.5" fill="none" markerEnd="url(#arrDIBlue)" />
          <path d="M132,205 C200,180 240,160 278,148" stroke="#3B82F6" strokeWidth="1.5" fill="none" markerEnd="url(#arrDIBlue)" />

          <path d="M460,140 C500,140 530,140 558,140" stroke="#f87171" strokeWidth="2" fill="none" markerEnd="url(#arrDIRed)" />
          <text x="510" y="130" textAnchor="middle" fill="#fca5a5" fontSize="10">仲係 5 秒</text>
        </svg>
      </div>

      <div className="quote-block">
        <p>「Hardware 解決唔到 latency 問題」— 呢個係 Senior Engineer 嘅口頭禪。Latency 係 sequential 嘅，throughput 先係 parallel 嘅。</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>Intern 做法嘅核心誤解</h3>
      <div className="key-points">
        <div className="key-point"><h4>Throughput ≠ Latency</h4><p>加 server 提高嘅係「每秒處理幾多 request」（throughput），唔係「一個 request 要等幾耐」（latency）。樽頸位喺單條 query 嘅話，一台 server 等 5 秒，100 台都係 5 秒。</p></div>
        <div className="key-point"><h4>冇診斷就治療</h4><p>連病喺邊都唔知，就開始開藥。Intern 通常憑直覺猜，但 production system 嘅 bottleneck 經常出乎意料 — 可能係一個無人留意嘅 sync email send。</p></div>
        <div className="key-point"><h4>Cost 不必要地增加</h4><p>加機係燒錢嘅。加咗一倍 server 之後發現冇用，公司就燒咗一倍嘅 cloud 費。Senior 唔會咁做。</p></div>
        <div className="key-point"><h4>有時仲會更慢</h4><p>加 server 後共享 DB 嘅 connection 競爭會更激烈，可能反而令 latency 升高。冇諗清楚就加 hardware，可以令情況更差。</p></div>
      </div>

      <div className="use-case">
        <h4>Intern 答案嘅可取之處</h4>
        <p>並非完全錯 — 喺 high traffic 但每個 request 都唔慢嘅 case，加 server 確實有用。問題係 Intern 一上嚟就用呢招，冇問清楚「真正慢嘅原因」。先診斷再治療，呢個係 Senior 同 Intern 嘅核心分別。</p>
      </div>
    </div>
  );
}

function JuniorTab() {
  return (
    <div className="card">
      <h2>Junior 做法 — 逐個 component 量時間</h2>
      <div className="subtitle">「睇下 DB query 用咗幾耐、third-party API call 用幾耐」</div>
      <p>
        Junior 已經唔再盲目加機 — 佢哋知道 API 慢通常係因為 server 同其他 component 嘅互動慢。所以佢哋會逐個 component 去問：DB query 用咗幾耐？有冇 index？Third-party API call 用咗幾耐？呢個係由「throw hardware」進化到「component-level analysis」嘅一個大躍進。
      </p>
      <p>
        但 Junior 嘅做法仍然有限制 — 佢哋係靠 manual inspection、用 logger 加 timing log、或者用 Postman 試 API call。呢啲方法可以揾到明顯嘅問題，但複雜 production system 入面，request 經過 5-10 個 service，靠 manual 根本追唔到。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowDJ" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <linearGradient id="gradDJReq" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDJDb" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDJ3rd" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDJTotal" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1f4f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrDJI" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
          </defs>

          <text x="400" y="22" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">Junior 用 Logger 逐個量時間</text>

          <g transform="translate(40,50)">
            <rect width="140" height="60" rx="12" fill="url(#gradDJReq)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowDJ)" />
            <text x="70" y="26" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="700">API Request</text>
            <text x="70" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">GET /users/123</text>
          </g>

          <g transform="translate(240,50)">
            <rect width="140" height="60" rx="12" fill="url(#gradDJDb)" stroke="#10B981" strokeWidth="2" filter="url(#shadowDJ)" />
            <text x="70" y="26" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">DB Query</text>
            <text x="70" y="46" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">1200 ms ⚠️</text>
          </g>

          <g transform="translate(440,50)">
            <rect width="160" height="60" rx="12" fill="url(#gradDJ3rd)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadowDJ)" />
            <text x="80" y="26" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">3rd-party API</text>
            <text x="80" y="46" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">800 ms ⚠️</text>
          </g>

          <g transform="translate(640,50)">
            <rect width="140" height="60" rx="12" fill="url(#gradDJTotal)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadowDJ)" />
            <text x="70" y="26" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="700">Total</text>
            <text x="70" y="46" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="700">2.1 sec 🐢</text>
          </g>

          <path d="M182,80 C200,80 220,80 238,80" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrDJI)" />
          <path d="M382,80 C400,80 420,80 438,80" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrDJI)" />
          <path d="M602,80 C620,80 630,80 638,80" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrDJI)" />

          <g transform="translate(80,160)">
            <rect width="660" height="130" rx="14" fill="rgba(99,102,241,0.06)" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6,3" />
            <text x="330" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">Junior 嘅 checklist</text>
            <text x="330" y="52" textAnchor="middle" fill="#c0c4cc" fontSize="11">DB query 慢？睇 EXPLAIN — 有冇 index？有冇 N+1？</text>
            <text x="330" y="70" textAnchor="middle" fill="#c0c4cc" fontSize="11">3rd-party API 慢？睇 latency log — 有冇 timeout？有冇 retry storm？</text>
            <text x="330" y="88" textAnchor="middle" fill="#c0c4cc" fontSize="11">CPU / Memory 高？睇 metrics — 唔夠資源就 scale up</text>
            <text x="330" y="106" textAnchor="middle" fill="#fbbf24" fontSize="11">⚠️ 但 manual instrument 每條 path 唔 scalable — 系統大就追唔到</text>
          </g>
        </svg>
      </div>

      <div className="code-block"><span className="code-comment"># Junior 做法 — 喺 code 入面手動加 timing log</span>{'\n'}import time{'\n'}import logging{'\n\n'}def get_user_profile(user_id):{'\n'}    t0 = time.time(){'\n'}    user = db.query(&quot;SELECT * FROM users WHERE id = %s&quot;, user_id){'\n'}    logging.info(f&quot;DB query: {'{'}time.time() - t0:.3f{'}'}s&quot;){'\n\n'}    t1 = time.time(){'\n'}    profile = third_party_api.get_profile(user.email){'\n'}    logging.info(f&quot;3rd-party API: {'{'}time.time() - t1:.3f{'}'}s&quot;){'\n\n'}    return {'{'}**user.dict(), &quot;profile&quot;: profile{'}'}{'\n\n'}<span className="code-comment"># 然後 grep log 揾邊個 component 慢</span></div>

      <div className="quote-block">
        <p>「Junior 開始用 evidence，但 evidence 收集得唔系統化 — manual logging 喺 5 個 endpoints 仲 OK，喺 500 個 endpoints 就玩完。」</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>Junior 做法嘅優點</h3>
      <div className="key-points">
        <div className="key-point"><h4>Component-level 思考</h4><p>已經知道 API 慢可以由 DB、third-party、server CPU 等唔同源頭引起。比 Intern 嘅「加機就得」進步咗一個 level。</p></div>
        <div className="key-point"><h4>Index 同 N+1 嘅意識</h4><p>知道用 EXPLAIN 睇 query plan、知道 N+1 query 係 hidden killer、會檢查有冇加 index。呢啲都係 Junior 級實用嘅 debug 技巧。</p></div>
        <div className="key-point"><h4>留意 third-party 依賴</h4><p>明白外部 API 嘅 latency 你控制唔到，係系統嘅 weak link。會諗到 timeout、retry 呢啲問題。</p></div>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>Junior 嘅 ceiling</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>Manual logging 唔 scalable：</strong>系統大咗，每個 endpoint 都加 timing log 就成日整 noise，亦容易遺漏。</span></li>
        <li><span className="step-num">2</span><span><strong>追唔到 distributed flow：</strong>Microservices 入面一個 request 經過 5-10 個 service，靠 logger 追唔到 cross-service latency。</span></li>
        <li><span className="step-num">3</span><span><strong>冇 aggregate view：</strong>單條 log 睇唔到 p95 / p99，分唔清 outlier 同系統性問題。</span></li>
        <li><span className="step-num">4</span><span><strong>反應式 debug：</strong>出咗事先 grep log 揾原因。Senior 會 proactive — 平時 dashboard 已經 show 緊。</span></li>
        <li><span className="step-num">5</span><span><strong>只諗咗 detect，未諗 fix 系統化：</strong>「邊度慢」答到，但「點樣 systematically 防止再慢」答唔到。</span></li>
      </ol>

      <div className="use-case">
        <h4>呢個層次嘅典型答案</h4>
        <p>「我會睇下 DB query 用咗幾耐、有冇 index、third-party API 用幾耐」— 呢個答案技術上係啱嘅，係 Junior 嘅水平。Senior 會更進一步 — 用 tracing 同 systematic instrumentation，唔靠 manual 一個個量。下一個 tab 拆解。</p>
      </div>
    </div>
  );
}

function SeniorTab() {
  return (
    <div className="card">
      <h2>Senior 做法 — Tracing + 系統性優化</h2>
      <div className="subtitle">Comprehensive logging、per-request tracing、針對性優化</div>
      <p>
        Senior Engineer 處理「API 慢」嘅核心思維係：<strong>先建立 observability，再做 targeted optimization</strong>。冇 evidence 嘅 optimization 係 guess work — 你以為慢喺 A，浪費一星期 optimize A，最後發現樽頸喺 B。所以 Senior 第一件事唔係改 code，係加 tracing。
      </p>
      <p>
        典型 Senior 做法：(1) 加 distributed tracing（OpenTelemetry、Datadog、Honeycomb），每個 request 都有 trace ID，可以追到 cross-service flow；(2) 加 per-request structured logging，方便事後 grep；(3) 用 metrics 監控 p50/p95/p99 latency。有咗 evidence 之後，根據真正樽頸位選擇方案：加 DB index、加 cache、async job、或者 redesign。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 880 480" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowDS" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowDSI"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.3" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowDSG"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.3" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradDSReq" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDSTrace" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1f4f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDSIdx" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDSCache" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDSAsync" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e2e25" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrDSI" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrDSG" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#10B981" /></marker>
            <marker id="arrDSY" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" /></marker>
          </defs>

          <text x="440" y="22" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">Senior 嘅 Debug 流程：Observe → Diagnose → Fix</text>

          <g transform="translate(40,55)">
            <rect width="160" height="70" rx="14" fill="url(#gradDSReq)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowDS)" />
            <text x="80" y="28" textAnchor="middle" fill="#60a5fa" fontSize="13" fontWeight="700">API Request</text>
            <text x="80" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">trace_id: abc-123</text>
            <text x="80" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">user_id: 789</text>
          </g>

          <g transform="translate(260,40)" filter="url(#glowDSI)">
            <rect width="220" height="100" rx="14" fill="url(#gradDSTrace)" stroke="#6366f1" strokeWidth="2" />
            <text x="110" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">① Tracing + Logging</text>
            <line x1="20" y1="38" x2="200" y2="38" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="56" fill="#c0c4cc" fontSize="10">• OpenTelemetry / Datadog</text>
            <text x="20" y="72" fill="#c0c4cc" fontSize="10">• Per-request structured logs</text>
            <text x="20" y="88" fill="#c0c4cc" fontSize="10">• p50 / p95 / p99 metrics</text>
          </g>

          <g transform="translate(540,55)">
            <rect width="180" height="70" rx="14" fill="url(#gradDSTrace)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadowDS)" />
            <text x="90" y="28" textAnchor="middle" fill="#a78bfa" fontSize="13" fontWeight="700">② Diagnose</text>
            <text x="90" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">確認真正樽頸位</text>
            <text x="90" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">DB? 3rd-party? Sync work?</text>
          </g>

          <path d="M200,90 C220,90 240,90 258,90" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrDSI)" />
          <path d="M480,90 C500,90 520,90 538,90" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrDSI)" />

          <text x="440" y="170" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">③ 針對性 Fix（按 evidence 選方案）</text>

          <g transform="translate(60,190)" filter="url(#glowDSG)">
            <rect width="200" height="90" rx="14" fill="url(#gradDSIdx)" stroke="#10B981" strokeWidth="2" />
            <text x="100" y="28" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">DB 慢 → 加 Index</text>
            <line x1="20" y1="38" x2="180" y2="38" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="56" fill="#c0c4cc" fontSize="10">• WHERE / JOIN column 加 index</text>
            <text x="20" y="72" fill="#c0c4cc" fontSize="10">• Composite index 配合 query</text>
            <text x="20" y="86" fill="#c0c4cc" fontSize="10">• EXPLAIN ANALYZE 驗證</text>
          </g>

          <g transform="translate(290,190)">
            <rect width="220" height="90" rx="14" fill="url(#gradDSCache)" stroke="#f87171" strokeWidth="2" filter="url(#shadowDS)" />
            <text x="110" y="28" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="700">熱數據 → 加 Cache</text>
            <line x1="20" y1="38" x2="200" y2="38" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="56" fill="#c0c4cc" fontSize="10">• Redis 喺 server 同 DB 之間</text>
            <text x="20" y="72" fill="#c0c4cc" fontSize="10">• TTL + invalidation 策略</text>
            <text x="20" y="86" fill="#c0c4cc" fontSize="10">• 只 cache 讀多寫少嘅 data</text>
          </g>

          <g transform="translate(540,190)">
            <rect width="280" height="90" rx="14" fill="url(#gradDSAsync)" stroke="#34d399" strokeWidth="2" filter="url(#shadowDS)" />
            <text x="140" y="28" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">非 critical → Async / Task Queue</text>
            <line x1="20" y1="38" x2="260" y2="38" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="56" fill="#c0c4cc" fontSize="10">• Send email / update analytics 落 queue</text>
            <text x="20" y="72" fill="#c0c4cc" fontSize="10">• User 即刻收到 response</text>
            <text x="20" y="86" fill="#c0c4cc" fontSize="10">• 用 SQS / Kafka / Sidekiq</text>
          </g>

          <path d="M630,128 C400,150 250,170 160,190" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4,3" fill="none" markerEnd="url(#arrDSG)" />
          <path d="M630,128 C500,150 420,170 400,190" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4,3" fill="none" markerEnd="url(#arrDSG)" />
          <path d="M630,128 C650,150 670,170 680,190" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4,3" fill="none" markerEnd="url(#arrDSG)" />

          <g transform="translate(120,330)">
            <rect width="640" height="120" rx="14" fill="rgba(167,139,250,0.06)" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="6,3" />
            <text x="320" y="28" textAnchor="middle" fill="#a78bfa" fontSize="13" fontWeight="700">Senior 嘅 mental model</text>
            <text x="320" y="52" textAnchor="middle" fill="#c0c4cc" fontSize="11">① Observe — 先建立 evidence，唔靠直覺 guess</text>
            <text x="320" y="70" textAnchor="middle" fill="#c0c4cc" fontSize="11">② Diagnose — Tracing 告訴你樽頸 component；確認 root cause 先動手</text>
            <text x="320" y="88" textAnchor="middle" fill="#c0c4cc" fontSize="11">③ Fix — 按 evidence 揀方案（index / cache / async），唔係見招拆招</text>
            <text x="320" y="106" textAnchor="middle" fill="#fbbf24" fontSize="11">④ Verify — Fix 完再睇 metrics 確認 p99 真係改善咗</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>逐個方案拆解</h3>

      <div className="flow-step" style={{ marginTop: '20px' }}>
        <div className="flow-number">1</div>
        <h4>第一步永遠係 Observability — 唔係 optimization</h4>
        <p>
          加 <strong style={{ color: '#a5b4fc' }}>distributed tracing</strong>（OpenTelemetry 係開源 standard）、加 <strong style={{ color: '#a5b4fc' }}>structured logging</strong>（每個 log 都有 trace_id、user_id、request_path）、加 <strong style={{ color: '#a5b4fc' }}>metrics</strong>（p50/p95/p99 latency dashboard）。冇呢三樣，所有 optimization 都係 guess work。
        </p>
        <div className="code-block"><span className="code-comment"># Python + OpenTelemetry 例子</span>{'\n'}from opentelemetry import trace{'\n'}tracer = trace.get_tracer(__name__){'\n\n'}@app.get(&quot;/users/{'{'}user_id{'}'}&quot;){'\n'}def get_user(user_id: int):{'\n'}    with tracer.start_as_current_span(&quot;db_query&quot;):{'\n'}        user = db.query(...)  <span className="code-comment"># 自動量時間 + cross-service trace</span>{'\n'}    with tracer.start_as_current_span(&quot;third_party_api&quot;):{'\n'}        profile = api.get_profile(user.email){'\n'}    return {'{'}**user.dict(), &quot;profile&quot;: profile{'}'}</div>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">2</div>
        <h4>DB 慢 → 加 Index / 修 Query</h4>
        <p>
          Tracing 顯示 DB 係樽頸？用 <strong style={{ color: '#34d399' }}>EXPLAIN ANALYZE</strong> 睇 query plan。Sequential scan 就加 index；N+1 就改 batch query 或 JOIN；query 寫得差就 rewrite。呢個係最 common 但同時最易 fix 嘅 case。詳情請睇 <strong>Debug 慢 Database</strong> 個 topic。
        </p>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">3</div>
        <h4>熱數據 → 加 Cache 喺 Server 同 DB 之間</h4>
        <p>
          某啲 query 係讀多寫少（例如 dashboard stats），就喺 server 同 DB 之間加 <strong style={{ color: '#f87171' }}>Redis cache</strong>。第一次打 DB，之後 N 次直接食 cache。注意：要設計好 TTL 同 invalidation — cache 過期太短冇用，太長有 stale data 風險。
        </p>
        <div className="code-block">@app.get(&quot;/dashboard/stats&quot;){'\n'}def get_stats():{'\n'}    cached = redis.get(&quot;dashboard:stats&quot;){'\n'}    if cached:{'\n'}        return json.loads(cached){'\n\n'}    stats = compute_expensive_stats()  <span className="code-comment"># 慢 1.5 秒</span>{'\n'}    redis.setex(&quot;dashboard:stats&quot;, 300, json.dumps(stats))  <span className="code-comment"># 5 min TTL</span>{'\n'}    return stats</div>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">4</div>
        <h4>非 critical work → 移出 critical path 做 async</h4>
        <p>
          User 要嘅係 response，唔係 confirmation email。將 send email、update analytics、generate PDF、warm cache 等 non-critical work 推入 <strong style={{ color: '#34d399' }}>task queue</strong>（Celery / Sidekiq / SQS / Kafka）後台慢慢做。User 嘅 critical path 由 2 秒減到 100ms。
        </p>
        <div className="code-block"><span className="code-comment"># Before — 全部 sync，user 等 2.5 秒</span>{'\n'}@app.post(&quot;/orders&quot;){'\n'}def create_order(data):{'\n'}    order = db.save(data)              <span className="code-comment"># 100ms</span>{'\n'}    send_confirmation_email(order)     <span className="code-comment"># 800ms</span>{'\n'}    update_analytics(order)            <span className="code-comment"># 600ms</span>{'\n'}    generate_invoice_pdf(order)        <span className="code-comment"># 1000ms</span>{'\n'}    return order{'\n\n'}<span className="code-comment"># After — 100ms 返 response，其餘嘅落 queue</span>{'\n'}@app.post(&quot;/orders&quot;){'\n'}def create_order(data):{'\n'}    order = db.save(data){'\n'}    task_queue.enqueue(&quot;post_order_tasks&quot;, order_id=order.id){'\n'}    return order  <span className="code-comment"># User happy</span></div>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">5</div>
        <h4>Verify — Fix 完唔代表完</h4>
        <p>
          做完 optimization 之後，<strong style={{ color: '#fbbf24' }}>再睇 metrics dashboard</strong>確認 p95 / p99 真係跌咗。冇 verify 嘅 fix 唔算 fix — 可能 fix 咗 p50，p99 仲係差。亦要 set alert，p99 超標就自動通知，唔好等用戶 complain。
        </p>
      </div>

      <div className="quote-block">
        <p>「Senior 唔係識多咗幾招 optimization — Senior 係知道唔同情況用唔同招，亦知道幾時應該乜都唔做。」</p>
      </div>

      <div className="use-case">
        <h4>面試答題框架</h4>
        <p>
          面試問「API 慢點 debug」，跟住呢個順序答：
          <strong style={{ color: '#a5b4fc' }}>①</strong> 加 tracing + logging + metrics 收集 evidence →
          <strong style={{ color: '#a78bfa' }}>②</strong> 確認真正樽頸（DB / 3rd-party / sync work） →
          <strong style={{ color: '#34d399' }}>③</strong> 按樽頸選方案（加 index / cache / async） →
          <strong style={{ color: '#fbbf24' }}>④</strong> Verify p95/p99 metrics + set alert。
          面試官會 immediate 知道你做過 production。
        </p>
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
        <h4>Prompt 1 — 為現有 API 加 Distributed Tracing</h4>
        <div className="prompt-text">幫手為一個現有 API 加上完整嘅 distributed tracing 同 structured logging。{'\n\n'}技術棧：<span className="placeholder">[Python + FastAPI / Node.js + Express / Java + Spring Boot]</span>{'\n'}現時狀況：<span className="placeholder">[例如 完全冇 tracing、只有 random print statement]</span>{'\n'}部署環境：<span className="placeholder">[AWS ECS / Kubernetes / Heroku]</span>{'\n\n'}請輸出完整方案：{'\n'}1. 選擇 tracing 工具同理由（OpenTelemetry / Datadog / Honeycomb / Jaeger）{'\n'}2. 為每個 HTTP endpoint 加 auto-instrumentation 嘅 code{'\n'}3. 為 DB query、Redis call、external HTTP 加 manual span 嘅例子{'\n'}4. Structured logging 設計：必須包含 trace_id、user_id、endpoint、latency_ms{'\n'}5. 部署 Jaeger / Tempo 嘅 docker-compose 設定（如果 self-host）{'\n'}6. Dashboard 設計：p50/p95/p99 latency by endpoint、top 10 慢嘅 trace、error rate{'\n'}7. Alert 規則：p99 超過 1 秒、error rate 超過 1%{'\n'}8. 點樣由 trace 揾出單一條慢 request 嘅 root cause（step-by-step example）</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 將 Sync API 改寫成 Async + Task Queue</h4>
        <div className="prompt-text">幫手分析現有嘅 sync API endpoint，識別可以 async 嘅部分，並改寫成用 task queue 嘅版本。{'\n\n'}技術棧：<span className="placeholder">[例如 Python + FastAPI + PostgreSQL]</span>{'\n'}現有 endpoint：{'\n'}<span className="placeholder">[貼上完整嘅 endpoint code，包含所有 sync 操作]</span>{'\n'}{'\n'}預計流量：<span className="placeholder">[每日 request 量同 peak qps]</span>{'\n\n'}請輸出：{'\n'}1. 分析每個操作係咪 critical path（影響 response）定 non-critical（可以 async）{'\n'}2. 列出可以推入 task queue 嘅操作（例如 send email、update analytics、generate PDF）{'\n'}3. 選 task queue 工具同理由（Celery / Sidekiq / SQS / Kafka / BullMQ）{'\n'}4. 改寫後嘅 endpoint code（critical path 只剩核心邏輯）{'\n'}5. Worker code：consume task、retry on failure、dead letter queue{'\n'}6. 點樣保證 idempotency（task 可能 retry 多次）{'\n'}7. 估算優化前後嘅 p95 latency 改變{'\n'}8. Docker Compose 部署設定（含 task queue + worker + monitoring）</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 設計 API Caching 策略</h4>
        <div className="prompt-text">為一個現有 API 設計完整嘅 caching 策略。{'\n\n'}技術棧：<span className="placeholder">[例如 Node.js + Express + PostgreSQL + Redis]</span>{'\n'}需要 cache 嘅 endpoints：{'\n'}<span className="placeholder">[列出 endpoints 同預估嘅讀寫比例，例如 GET /dashboard/stats 讀:寫 = 1000:1]</span>{'\n\n'}請輸出：{'\n'}1. 對每個 endpoint，判斷係咪適合 cache（讀多寫少 / 數據可以 slight stale）{'\n'}2. 選 cache 層次：HTTP cache (Cache-Control) / CDN / Redis / In-Memory{'\n'}3. TTL 策略：每個 endpoint 嘅合理 TTL（按 data 變化頻率）{'\n'}4. Cache key 設計：包含 user_id、parameters、version{'\n'}5. Invalidation 策略：write 操作觸發 cache delete / TTL-based / 兩者結合{'\n'}6. Cache stampede 防護：用 stale-while-revalidate 或 lock{'\n'}7. Monitoring：cache hit rate / miss rate 嘅 dashboard{'\n'}8. 完整可運行嘅 code，附 unit test 證明 cache 同 invalidation 正確</div>
      </div>
    </div>
  );
}

export default function DebugSlowAPI() {
  return (
    <>
      <TopicTabs
        title="Debug 慢 API 三個層次"
        subtitle="Intern 加機、Junior 量 component、Senior 用 Tracing 系統性解決"
        tabs={[
          { id: 'intern', label: '① Intern 做法', content: <InternTab /> },
          { id: 'junior', label: '② Junior 做法', content: <JuniorTab /> },
          { id: 'senior', label: '③ Senior 做法', premium: true, content: <SeniorTab /> },
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
