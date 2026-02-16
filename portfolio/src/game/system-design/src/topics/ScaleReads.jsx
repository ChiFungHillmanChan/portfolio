import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '你嘅 App 突然爆紅，資料庫 CPU 去到 90%。以下邊個係最應該先做嘅一步？',
    options: [
      { text: '即刻加 3 個 Read Replicas 分擔壓力', correct: false, explanation: 'Read Replicas 係最後嘅大招，成本高又複雜。應該先搵出瓶頸，可能只係一條慢 Query 冇加 Index，加咗就搞掂。' },
      { text: '搵出邊啲 Query 最慢，優化 Query 同加 Index', correct: true, explanation: '呢個係成本最低、效果最快嘅第一步。好多時候，加一個 Index 就可以令一條 Query 快幾十倍，根本唔使加機器。面試嘅時候，展示識得「由最低成本開始」嘅思路最加分。' },
      { text: '直接換用 NoSQL Database', correct: false, explanation: '換 Database 係最極端嘅方案，成本同風險都係最高。喺未搞清楚瓶頸之前就換 DB，好大機會解決唔到問題之餘仲引入新問題。' },
      { text: '全部數據放入 Redis Cache', correct: false, explanation: '唔係所有數據都適合 Cache。Cache 適合「讀多寫少、結果可以重用」嘅場景。如果大部分查詢都係獨特嘅，Cache 嘅 hit rate 會好低。應該先優化 Query。' },
    ],
  },
  {
    question: '三層 Cache 入面，邊一層最接近用戶，攔截速度最快？',
    options: [
      { text: '伺服器 Cache（Redis / Memcached）', correct: false, explanation: '伺服器 Cache 喺 Server 同 DB 之間，雖然快過直接讀 DB，但用戶嘅請求仍然要經過網絡去到 Server。唔係最接近用戶嘅一層。' },
      { text: 'CDN 邊緣快取', correct: false, explanation: 'CDN 喺全球各地嘅邊緣節點，比伺服器 Cache 更近用戶。但仲有一層更快——就係用戶裝置本身。' },
      { text: '裝置 Cache（Client-side Cache）', correct: true, explanation: '裝置 Cache 存喺用戶嘅手機或者 Browser 入面，根本唔使發任何網絡請求。例如翻睇啱啱睇過嘅內容，直接從本地攞，係最快嘅一層。' },
      { text: 'Database 嘅 Query Cache', correct: false, explanation: 'Database Query Cache 係 DB 內部嘅快取，唔算係三層 Cache 嘅一部分。而且佢嘅位置最遠離用戶，請求要經過 Client → CDN → Server → DB 先去到。' },
    ],
  },
  {
    question: 'Read Replicas 嘅最大限制係咩？',
    options: [
      { text: '唔支持任何查詢操作', correct: false, explanation: 'Read Replicas 完全支持讀取查詢（SELECT）。佢嘅限制唔係唔能讀，而係唔能寫。' },
      { text: '只能解決讀取問題，寫入仲係去主 DB，而且同步有短暫延遲', correct: true, explanation: '所有寫入操作（INSERT/UPDATE/DELETE）仍然要去 Primary DB。Replica 從 Primary 同步數據會有短暫延遲（Replication Lag），所以剛寫入嘅數據可能喺 Replica 讀唔到。呢個係設計 Read Replica 架構時必須考慮嘅 trade-off。' },
      { text: '最多只能有 2 個 Replica', correct: false, explanation: '大部分 Database（PostgreSQL、MySQL、Aurora 等）都支持多個 Read Replica，唔限於 2 個。可以根據需要加到幾十個。' },
      { text: '每個 Replica 只能處理一種類型嘅 Query', correct: false, explanation: 'Read Replica 係主 DB 嘅完整複製品，可以處理任何 SELECT 查詢，冇類型限制。佢嘅限制係唔能做寫入操作。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
  { slug: 'cache-invalidation', label: 'Cache 失效策略' },
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>全局思路 — 逐步解決讀取瓶頸</h2>
      <div className="subtitle">一個好重要嘅原則：唔好亂嚟，先搵出邊度出事</div>
      <p>
        用個比喻嚟理解。想像開咗間餐廳，突然一夜之間排晒隊入嚟——第一件事唔係即刻請多 50 個廚師，而係先搵出邊度最塞：係落單嗰度慢？定係廚房煮嘢慢？定係上菜太慢？系統設計都係一樣，第一步永遠係「搵出瓶頸喺邊」。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <filter id="glowRed">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowGreenResult">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradStep1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#2a2520" />
            </linearGradient>
            <linearGradient id="gradStep2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1e2e25" />
            </linearGradient>
            <linearGradient id="gradStep3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#252040" />
            </linearGradient>
            <linearGradient id="gradStep4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#2a2040" />
            </linearGradient>
            <marker id="arrowP" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
            <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto">
              <path d="M0,0 L4,8 L8,0 Z" fill="#6366f1" />
            </marker>
          </defs>

          <text x="400" y="25" textAnchor="middle" fill="#9ca3af" fontSize="13" fontWeight="600">解決讀取瓶頸嘅四個層級</text>

          <g transform="translate(250,40)" filter="url(#glowRed)">
            <rect width="300" height="55" rx="14" fill="#1e293b" stroke="#ef4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="150" y="22" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">問題：App 頂唔住百萬用戶</text>
            <text x="150" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10.5">資料庫被大量讀取請求壓爆</text>
          </g>
          <line x1="400" y1="97" x2="400" y2="120" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowDown)" />

          <g transform="translate(200,123)">
            <rect width="400" height="55" rx="14" fill="url(#gradStep1)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow)" />
            <text x="30" y="22" fill="#fbbf24" fontSize="12" fontWeight="700">第一步</text>
            <text x="30" y="42" fill="#9ca3af" fontSize="11">搵出瓶頸喺邊：Server？資料庫讀取？寫入？</text>
            <rect x="310" y="10" width="72" height="22" rx="6" fill="rgba(245,158,11,0.15)" />
            <text x="346" y="26" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="600">診斷問題</text>
          </g>
          <line x1="400" y1="180" x2="400" y2="203" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowDown)" />

          <g transform="translate(200,206)">
            <rect width="400" height="55" rx="14" fill="url(#gradStep2)" stroke="#22c55e" strokeWidth="2" filter="url(#shadow)" />
            <text x="30" y="22" fill="#4ade80" fontSize="12" fontWeight="700">第二步</text>
            <text x="30" y="42" fill="#9ca3af" fontSize="11">優化查詢 + 加 Index（索引）加速資料庫</text>
            <rect x="310" y="10" width="72" height="22" rx="6" fill="rgba(34,197,94,0.15)" />
            <text x="346" y="26" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="600">最低成本</text>
          </g>
          <line x1="400" y1="263" x2="400" y2="286" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowDown)" />

          <g transform="translate(540,248)">
            <rect width="120" height="24" rx="12" fill="rgba(248,113,113,0.12)" />
            <text x="60" y="16" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="600">仲係唔夠快？</text>
          </g>

          <g transform="translate(200,289)">
            <rect width="400" height="55" rx="14" fill="url(#gradStep3)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow)" />
            <text x="30" y="22" fill="#a5b4fc" fontSize="12" fontWeight="700">第三步</text>
            <text x="30" y="42" fill="#9ca3af" fontSize="11">加 Cache（三層快取：伺服器、CDN、裝置）</text>
            <rect x="310" y="10" width="72" height="22" rx="6" fill="rgba(99,102,241,0.15)" />
            <text x="346" y="26" textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="600">大幅提速</text>
          </g>
          <line x1="400" y1="346" x2="400" y2="369" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowDown)" />

          <g transform="translate(540,331)">
            <rect width="120" height="24" rx="12" fill="rgba(248,113,113,0.12)" />
            <text x="60" y="16" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="600">仲係唔夠？</text>
          </g>

          <g transform="translate(200,372)">
            <rect width="400" height="55" rx="14" fill="url(#gradStep4)" stroke="#818cf8" strokeWidth="2" filter="url(#shadow)" />
            <text x="30" y="22" fill="#c4b5fd" fontSize="12" fontWeight="700">第四步</text>
            <text x="30" y="42" fill="#9ca3af" fontSize="11">加 Read Replicas（讀取副本），分擔資料庫壓力</text>
            <rect x="310" y="10" width="72" height="22" rx="6" fill="rgba(129,140,248,0.15)" />
            <text x="346" y="26" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="600">終極方案</text>
          </g>

          <line x1="400" y1="429" x2="400" y2="452" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowDown)" />
          <g transform="translate(250,455)" filter="url(#glowGreenResult)">
            <rect width="300" height="45" rx="12" fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth="1.5" />
            <text x="150" y="20" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="700">系統可以頂住百萬用戶</text>
            <text x="150" y="37" textAnchor="middle" fill="#9ca3af" fontSize="10">每一步都係建基於上一步唔夠嘅時候</text>
          </g>
        </svg>
      </div>

      <h3>核心思路：逐層加碼</h3>
      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong>先搵出瓶頸</strong>——係 Server 唔夠力？定係資料庫頂唔住讀取？定係寫入太多？重點係唔好未搞清就亂加嘢，呢個好重要。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong>優化查詢同加 Index</strong>——呢個成本最低、效果最快。就好似間餐廳先優化流程，再諗請人。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong>加 Cache</strong>——三個地方：伺服器前面、CDN 邊緣節點、用戶裝置上。大部分讀取請求都唔使再去資料庫。後面會詳細講解。</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span><strong>加 Read Replicas</strong>——如果 Cache 都唔夠（例如大部分查詢都係獨特嘅），就開多幾個資料庫副本一齊分擔讀取。呢個係最後嘅大招。</span>
        </li>
      </ol>

      <div className="highlight-box amber">
        <h4>關鍵重點</h4>
        <p>唔好一開始就跳去最複雜嘅方案。面試嘅時候，展示識得「逐步升級」嘅思路，比直接講最複雜嘅答案更加加分。常見嘅錯誤係一上嚟就講 Sharding，面試官反而覺得唔識判斷輕重。</p>
      </div>
    </div>
  );
}

function IndexingTab() {
  return (
    <div className="card">
      <h2>優化查詢 + 加索引（Index）</h2>
      <div className="subtitle">成本最低嘅第一步：唔使加機器，改善查詢就有效果</div>
      <p>
        用個比喻嚟解釋。去圖書館搵一本書。如果冇索引（目錄），要行晒每一行書架先搵到。但如果有索引，可以直接知道本書喺邊個書架、邊個位置。資料庫嘅 Index 就係咁——幫資料庫快速搵到需要嘅資料，唔使逐條記錄慢慢揾。呢個概念必須要理解。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="sh2" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <filter id="glowRedBox">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.2" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowGreenBox">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.2" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradBad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#2a1e22" />
            </linearGradient>
            <linearGradient id="gradGood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1e2e25" />
            </linearGradient>
            <linearGradient id="gradPractice" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(99,102,241,0.08)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
            </linearGradient>
          </defs>

          <text x="200" y="25" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">冇 Index</text>
          <g transform="translate(50,35)" filter="url(#glowRedBox)">
            <rect width="300" height="140" rx="14" fill="url(#gradBad)" stroke="#ef4444" strokeWidth="1.5" filter="url(#sh2)" />
            <text x="20" y="25" fill="#9ca3af" fontSize="10">{"查詢：SELECT * WHERE name = 'hillman'"}</text>
            <g transform="translate(20,40)">
              <rect width="260" height="18" rx="4" fill="rgba(239,68,68,0.08)" stroke="#ef4444" strokeWidth="0.5" />
              <text x="8" y="13" fill="#f87171" fontSize="9">逐條記錄睇... 第 1 條</text>
            </g>
            <g transform="translate(20,62)">
              <rect width="260" height="18" rx="4" fill="rgba(239,68,68,0.08)" stroke="#ef4444" strokeWidth="0.5" />
              <text x="8" y="13" fill="#f87171" fontSize="9">逐條記錄睇... 第 2 條</text>
            </g>
            <g transform="translate(20,84)">
              <rect width="260" height="18" rx="4" fill="rgba(239,68,68,0.08)" stroke="#ef4444" strokeWidth="0.5" />
              <text x="8" y="13" fill="#f87171" fontSize="9">逐條記錄睇... 第 999,999 條</text>
            </g>
            <text x="150" y="125" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">超慢！要掃晒全部記錄</text>
          </g>

          <text x="600" y="25" textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="700">有 Index</text>
          <g transform="translate(450,35)" filter="url(#glowGreenBox)">
            <rect width="300" height="140" rx="14" fill="url(#gradGood)" stroke="#22c55e" strokeWidth="1.5" filter="url(#sh2)" />
            <text x="20" y="25" fill="#9ca3af" fontSize="10">{"查詢：SELECT * WHERE name = 'hillman'"}</text>
            <g transform="translate(20,40)">
              <rect width="260" height="18" rx="4" fill="rgba(34,197,94,0.08)" stroke="#22c55e" strokeWidth="0.5" />
              <text x="8" y="13" fill="#4ade80" fontSize="9">{"查索引：'hillman' 在第 42,567 行"}</text>
            </g>
            <g transform="translate(20,62)">
              <rect width="260" height="18" rx="4" fill="rgba(34,197,94,0.08)" stroke="#22c55e" strokeWidth="0.5" />
              <text x="8" y="13" fill="#4ade80" fontSize="9">直接跳去第 42,567 行攞資料</text>
            </g>
            <g transform="translate(20,84)">
              <rect width="260" height="18" rx="4" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="1" />
              <text x="8" y="13" fill="#4ade80" fontSize="9">搞掂！只用咗 2 步</text>
            </g>
            <text x="150" y="125" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="600">超快！直接定位到資料</text>
          </g>

          <text x="400" y="110" textAnchor="middle" fill="#6366f1" fontSize="24" fontWeight="700">VS</text>

          <g transform="translate(100,210)">
            <rect width="600" height="150" rx="14" fill="url(#gradPractice)" stroke="#6366f1" strokeWidth="1.5" />
            <text x="300" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">實際點做</text>
            <text x="30" y="55" fill="#4ade80" fontSize="11" fontWeight="600">❶ 檢查邊啲查詢最慢</text>
            <text x="50" y="72" fill="#9ca3af" fontSize="10">搵出花最多時間嘅 query，呢啲就係瓶頸</text>
            <text x="30" y="97" fill="#4ade80" fontSize="11" fontWeight="600">❷ 確認用啱資料庫類型</text>
            <text x="50" y="114" fill="#9ca3af" fontSize="10">SQL？NoSQL？唔同嘅資料結構適合唔同嘅資料庫</text>
            <text x="30" y="139" fill="#4ade80" fontSize="11" fontWeight="600">❸ 為最常用嘅查詢加 Index</text>
            <text x="50" y="152" fill="#9ca3af" fontSize="10" fontStyle="italic">（就好似幫圖書館加個目錄，即刻快好多）</text>
          </g>
        </svg>
      </div>

      <h3>具體做法</h3>
      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong>檢查邊啲查詢最慢</strong>——用 monitoring 工具搵出花最多時間嘅 query，呢啲就係需要優化嘅重點。建議用 EXPLAIN 嚟分析。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong>確認資料庫類型啱唔啱</strong>——如果資料係大量 key-value 查詢，用 SQL 可能唔係最快。揀啱嘅工具好重要，常見嘅錯誤係用錯 DB 類型。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong>加 Index</strong>——為最常被查詢嘅欄位加索引。資料庫就可以跳過逐條掃描，直接搵到需要嘅記錄。呢步一定要優先做。</span>
        </li>
      </ol>

      <div className="pros-cons">
        <div className="pros">
          <h4>好處</h4>
          <ul>
            <li>成本最低——唔使加機器、唔使改架構</li>
            <li>效果明顯——常見查詢可能快幾十倍</li>
            <li>最優先做呢一步</li>
          </ul>
        </div>
        <div className="cons">
          <h4>限制</h4>
          <ul>
            <li>Index 會令寫入慢少少（因為每次寫都要更新索引）</li>
            <li>如果讀取量太大，純靠 Index 都頂唔住</li>
          </ul>
        </div>
      </div>

      <div className="highlight-box green">
        <h4>重點記住</h4>
        <p>面試嘅時候，永遠先講呢一步。核心思維方式係：「用最低成本先解決問題」。面試官好鍾意呢種答法，因為佢展示咗工程判斷力。</p>
      </div>
    </div>
  );
}

function CachingTab() {
  return (
    <div className="card">
      <h2>三層 Cache — 層層攔截讀取請求</h2>
      <div className="subtitle">喺三個唔同嘅地方放 Cache，令大部分請求根本唔使去到資料庫</div>
      <p>
        用個比喻嚟理解。想像一間超人氣餐廳。與其每個客人都要入廚房問廚師，可以：① 喺前台放個餐牌（伺服器 Cache）、② 喺附近嘅分店都放（CDN）、③ 俾客人帶餐牌返屋企（裝置 Cache）。咁樣大部分人根本唔使行到廚房。呢個就係「層層攔截」嘅概念。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 530" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="sh3" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <filter id="glowGreenLayer">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.2" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowAmberLayer">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.2" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowIndigoLayer">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#6366f1" floodOpacity="0.2" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradDevice" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1e2e25" />
            </linearGradient>
            <linearGradient id="gradCDN" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#2a2520" />
            </linearGradient>
            <linearGradient id="gradServerC" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#252040" />
            </linearGradient>
            <linearGradient id="gradDBs" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1a2e2a" />
            </linearGradient>
            <marker id="arrB3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
            <marker id="arrG3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#22c55e" />
            </marker>
            <marker id="arrA3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
            </marker>
          </defs>

          <g transform="translate(50,50)">
            <circle cx="25" cy="18" r="16" fill="#6366f1" opacity="0.8" />
            <text x="25" y="23" textAnchor="middle" fill="#fff" fontSize="12">U</text>
          </g>
          <g transform="translate(50,95)">
            <circle cx="25" cy="18" r="16" fill="#6366f1" opacity="0.8" />
            <text x="25" y="23" textAnchor="middle" fill="#fff" fontSize="12">U</text>
          </g>
          <g transform="translate(50,140)">
            <circle cx="25" cy="18" r="16" fill="#6366f1" opacity="0.8" />
            <text x="25" y="23" textAnchor="middle" fill="#fff" fontSize="12">U</text>
          </g>
          <text x="75" y="190" textAnchor="middle" fill="#a5b4fc" fontSize="11">百萬用戶</text>

          <g transform="translate(145,45)" filter="url(#glowGreenLayer)">
            <rect width="150" height="150" rx="14" fill="url(#gradDevice)" stroke="#22c55e" strokeWidth="2" filter="url(#sh3)" />
            <text x="75" y="24" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="700">裝置 Cache</text>
            <text x="75" y="42" textAnchor="middle" fill="#9ca3af" fontSize="9">（第三層）</text>
            <text x="75" y="65" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">睇過嘅嘢存喺手機</text>
            <text x="75" y="80" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">想翻睇？直接攞！</text>
            <text x="75" y="100" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="600">攔截：~30% 請求</text>
            <rect x="20" y="112" width="110" height="24" rx="6" fill="rgba(34,197,94,0.12)" />
            <text x="75" y="129" textAnchor="middle" fill="#4ade80" fontSize="9">例：翻睇啱啱睇過嘅片</text>
          </g>

          <path d="M 97 120 Q 120 118 143 120" fill="none" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrG3)" />

          <g transform="translate(340,45)" filter="url(#glowAmberLayer)">
            <rect width="150" height="150" rx="14" fill="url(#gradCDN)" stroke="#f59e0b" strokeWidth="2" filter="url(#sh3)" />
            <text x="75" y="24" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">CDN 邊緣快取</text>
            <text x="75" y="42" textAnchor="middle" fill="#9ca3af" fontSize="9">（第二層）</text>
            <text x="75" y="65" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">全球分布嘅伺服器</text>
            <text x="75" y="80" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">熱門內容就近回覆</text>
            <text x="75" y="100" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600">攔截：~50% 請求</text>
            <rect x="20" y="112" width="110" height="24" rx="6" fill="rgba(245,158,11,0.12)" />
            <text x="75" y="129" textAnchor="middle" fill="#fbbf24" fontSize="9">例：爆紅影片、熱門內容</text>
          </g>

          <text x="320" y="115" textAnchor="middle" fill="#9ca3af" fontSize="9">冇 hit</text>
          <path d="M 297 120 Q 318 118 338 120" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrA3)" />

          <g transform="translate(535,45)" filter="url(#glowIndigoLayer)">
            <rect width="150" height="150" rx="14" fill="url(#gradServerC)" stroke="#6366f1" strokeWidth="2" filter="url(#sh3)" />
            <text x="75" y="24" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="700">伺服器 Cache</text>
            <text x="75" y="42" textAnchor="middle" fill="#9ca3af" fontSize="9">（第一層）</text>
            <text x="75" y="65" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">放喺 Server 同 DB 之間</text>
            <text x="75" y="80" textAnchor="middle" fill="#c0c4cc" fontSize="9.5">常見查詢直接回覆</text>
            <text x="75" y="100" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="600">攔截：~15% 請求</text>
            <rect x="20" y="112" width="110" height="24" rx="6" fill="rgba(99,102,241,0.12)" />
            <text x="75" y="129" textAnchor="middle" fill="#a5b4fc" fontSize="9">例：Redis / Memcached</text>
          </g>

          <text x="515" y="115" textAnchor="middle" fill="#9ca3af" fontSize="9">冇 hit</text>
          <path d="M 492 120 Q 513 118 533 120" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrB3)" />

          <g transform="translate(535,240)">
            <rect width="150" height="70" rx="14" fill="url(#gradDBs)" stroke="#34d399" strokeWidth="2" filter="url(#sh3)" />
            <text x="75" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">資料庫</text>
            <text x="75" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">只處理 ~5% 嘅請求</text>
            <text x="75" y="62" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="600">壓力大減！</text>
          </g>
          <line x1="610" y1="197" x2="610" y2="238" stroke="#34d399" strokeWidth="1.5" strokeDasharray="5,3" />
          <text x="640" y="222" fill="#9ca3af" fontSize="9">冇 hit</text>

          <g transform="translate(80,350)">
            <rect width="640" height="80" rx="14" fill="rgba(34,197,94,0.06)" stroke="#22c55e" strokeWidth="1.5" />
            <text x="320" y="25" textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="700">三層 Cache 嘅效果</text>
            <text x="320" y="48" textAnchor="middle" fill="#c0c4cc" fontSize="11">裝置 Cache 攔截重複請求 → CDN 攔截熱門內容 → 伺服器 Cache 攔截常見查詢</text>
            <text x="320" y="68" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="600">最終只有好少嘅請求真正去到資料庫</text>
          </g>

          <g transform="translate(80,455)">
            <rect width="640" height="30" rx="6" fill="#1e293b" />
            <rect width="192" height="30" rx="6" fill="rgba(34,197,94,0.3)" />
            <text x="96" y="20" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="600">30%</text>
            <rect x="192" width="320" height="30" fill="rgba(245,158,11,0.3)" />
            <text x="352" y="20" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600">50%</text>
            <rect x="512" width="96" height="30" fill="rgba(99,102,241,0.3)" />
            <text x="560" y="20" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="600">15%</text>
            <rect x="608" width="32" height="30" rx="0 6 6 0" fill="rgba(52,211,153,0.3)" />
            <text x="624" y="20" textAnchor="middle" fill="#4ade80" fontSize="8" fontWeight="600">5%</text>
          </g>
          <text x="400" y="505" textAnchor="middle" fill="#9ca3af" fontSize="10">越左邊越近用戶，越多請求被攔截</text>
        </svg>
      </div>

      <h3>三層 Cache 分別點用</h3>
      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong>伺服器 Cache（Redis / Memcached）</strong>——放喺 Server 同資料庫之間。好常見嘅查詢（例如攞一條爆紅影片嘅資料）唔使每次都打去資料庫。建議由呢層開始實作。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong>CDN 邊緣快取</strong>——全球各地都有伺服器。用戶喺東京？就從東京嘅 CDN 攞內容，唔使飛去美國嘅主伺服器。重點係，熱門內容根本唔使去到 origin server。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong>裝置 Cache</strong>——用戶啱啱睇完一條片，想翻睇？直接喺手機攞，完全唔使發任何請求。呢個係最快嘅一層，因為根本唔使經網絡。</span>
        </li>
      </ol>

      <div className="highlight-box">
        <h4>點解要三層</h4>
        <p>每一層 Cache 擋住唔同類型嘅請求。裝置擋住重複嘅、CDN 擋住熱門嘅、伺服器 Cache 擋住常見嘅。三層加埋，資料庫只需要處理好少嘅請求。關鍵在於呢個「層層防禦」嘅概念。</p>
      </div>
    </div>
  );
}

function ReplicasTab() {
  return (
    <div className="card">
      <h2>Read Replicas — 讀取副本</h2>
      <div className="subtitle">當 Cache 都唔夠用，開多幾個資料庫一齊分擔</div>
      <p>
        用個比喻嚟理解。餐廳得一個廚房（資料庫），就算前台做咗好多分流，廚房仲係忙到頂唔住。解決方法？開多幾個廚房（Read Replicas），每個廚房都有同一份餐牌同食材，可以同時服務唔同嘅客人。重點係：只有一個「主廚房」負責更新食譜，其他都係跟住同步。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 440" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="sh4" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <filter id="glowAmberPrimary">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradLB" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#252040" />
            </linearGradient>
            <linearGradient id="gradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#2a2520" />
            </linearGradient>
            <linearGradient id="gradReplica" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1e2e25" />
            </linearGradient>
            <marker id="arrB4" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
            <marker id="arrG4" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#22c55e" />
            </marker>
            <marker id="arrA4" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
            </marker>
          </defs>

          <g transform="translate(40,160)">
            <circle cx="25" cy="18" r="16" fill="#6366f1" opacity="0.8" />
            <text x="25" y="23" textAnchor="middle" fill="#fff" fontSize="12">U</text>
            <text x="25" y="50" textAnchor="middle" fill="#a5b4fc" fontSize="10">百萬用戶</text>
          </g>

          <g transform="translate(150,130)">
            <rect width="140" height="80" rx="14" fill="url(#gradLB)" stroke="#6366f1" strokeWidth="2" filter="url(#sh4)" />
            <text x="70" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="700">Server</text>
            <text x="70" y="45" textAnchor="middle" fill="#9ca3af" fontSize="9">（負載均衡器）</text>
            <text x="70" y="65" textAnchor="middle" fill="#9ca3af" fontSize="9">分配讀取請求</text>
          </g>
          <path d="M 87 178 Q 118 175 148 172" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrB4)" />

          <g transform="translate(400,20)" filter="url(#glowAmberPrimary)">
            <rect width="170" height="80" rx="14" fill="url(#gradPrimary)" stroke="#f59e0b" strokeWidth="2" filter="url(#sh4)" />
            <text x="85" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">主資料庫</text>
            <text x="85" y="43" textAnchor="middle" fill="#9ca3af" fontSize="9">（Primary / Master）</text>
            <text x="85" y="62" textAnchor="middle" fill="#fbbf24" fontSize="9.5">負責所有寫入操作</text>
          </g>

          <g transform="translate(400,135)">
            <rect width="170" height="70" rx="14" fill="url(#gradReplica)" stroke="#22c55e" strokeWidth="2" filter="url(#sh4)" />
            <text x="85" y="22" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="700">讀取副本 1</text>
            <text x="85" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">（Read Replica）</text>
            <text x="85" y="56" textAnchor="middle" fill="#4ade80" fontSize="9">處理讀取請求</text>
          </g>

          <g transform="translate(400,230)">
            <rect width="170" height="70" rx="14" fill="url(#gradReplica)" stroke="#22c55e" strokeWidth="2" filter="url(#sh4)" />
            <text x="85" y="22" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="700">讀取副本 2</text>
            <text x="85" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">（Read Replica）</text>
            <text x="85" y="56" textAnchor="middle" fill="#4ade80" fontSize="9">處理讀取請求</text>
          </g>

          <g transform="translate(400,325)">
            <rect width="170" height="70" rx="14" fill="url(#gradReplica)" stroke="#22c55e" strokeWidth="2" filter="url(#sh4)" />
            <text x="85" y="22" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="700">讀取副本 3</text>
            <text x="85" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">（Read Replica）</text>
            <text x="85" y="56" textAnchor="middle" fill="#4ade80" fontSize="9">處理讀取請求</text>
          </g>

          <path d="M 292 155 Q 345 148 398 165" fill="none" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrG4)" />
          <path d="M 292 175 Q 345 220 398 260" fill="none" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrG4)" />
          <path d="M 292 185 Q 345 290 398 355" fill="none" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrG4)" />

          <text x="338" y="148" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="500">讀取</text>
          <text x="330" y="220" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="500">讀取</text>
          <text x="320" y="290" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="500">讀取</text>

          <line x1="530" y1="102" x2="530" y2="133" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrA4)" />
          <line x1="572" y1="102" x2="572" y2="228" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrA4)" />
          <line x1="555" y1="102" x2="555" y2="323" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrA4)" />

          <g transform="translate(620,155)">
            <rect width="130" height="48" rx="10" fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" />
            <text x="65" y="18" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600">自動同步</text>
            <text x="65" y="34" textAnchor="middle" fill="#9ca3af" fontSize="9">主 DB 嘅資料</text>
            <text x="65" y="46" textAnchor="middle" fill="#9ca3af" fontSize="9">會複製到每個副本</text>
          </g>

          <g transform="translate(620,60)">
            <rect width="130" height="30" rx="10" fill="rgba(248,113,113,0.08)" stroke="#f87171" strokeWidth="1" strokeDasharray="4,3" />
            <text x="65" y="20" textAnchor="middle" fill="#f87171" fontSize="9">寫入只去主 DB</text>
          </g>
        </svg>
      </div>

      <h3>運作原理</h3>
      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong>主資料庫（Primary）</strong>負責所有寫入操作——改資料、加資料、刪資料全部喺佢度做。重點係，寫入永遠只去一個地方。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong>讀取副本（Read Replicas）</strong>係主資料庫嘅複製品。佢哋有同一份資料，但只負責讀取。可以理解為「只讀嘅影印本」。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong>Server 做負載均衡</strong>——將用戶嘅讀取請求分配俾唔同嘅副本，每個副本都分擔一部分壓力。建議用 round-robin 或者 least-connections 策略。</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span><strong>主 DB 自動同步</strong>——每次主 DB 有新嘅資料，就會自動複製去所有副本。要注意，呢個同步有短暫延遲。</span>
        </li>
      </ol>

      <div className="pros-cons">
        <div className="pros">
          <h4>好處</h4>
          <ul>
            <li>讀取能力可以線性擴展——加多個副本就多一份力</li>
            <li>就算 Cache 幫唔到（例如大量獨特查詢），都有效</li>
            <li>副本掛咗都唔影響主 DB，系統更加穩定</li>
          </ul>
        </div>
        <div className="cons">
          <h4>壞處</h4>
          <ul>
            <li>同步會有短暫延遲——副本嘅資料可能慢幾毫秒</li>
            <li>只解決讀取問題，寫入仲係去主 DB</li>
            <li>管理多個資料庫比較複雜</li>
          </ul>
        </div>
      </div>

      <div className="highlight-box">
        <h4>適用場景</h4>
        <p>當大部分請求都係獨特嘅資料（唔重複），Cache 幫唔到太多嘅時候。例如：每個用戶查自己嘅訂單、個人化推薦結果等。呢啲查詢冇辦法用 Cache 攔截，所以要靠多個 DB 副本一齊頂住。要記住，呢個係最後嘅大招，唔好太早用。</p>
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
        <h4>Prompt 1 — 設計讀取擴展策略</h4>
        <div className="prompt-text">
          幫手設計一個完整嘅讀取擴展策略，應對 App 突然爆紅嘅場景。{'\\n\\n'}
          項目背景：{'\\n'}
          - 應用類型：<span className="placeholder">[例如：社交平台 / 影片串流 / 電商]</span>{'\\n'}
          - 目前用戶量：<span className="placeholder">[例如：1 萬]</span>，目標：<span className="placeholder">[例如：100 萬]</span>{'\\n'}
          - 資料庫：<span className="placeholder">[例如：PostgreSQL / MySQL]</span>{'\\n'}
          - 讀寫比例：<span className="placeholder">[例如：讀 90% / 寫 10%]</span>{'\\n'}
          - 目前瓶頸：<span className="placeholder">[例如：資料庫 CPU 長期 {'>'}80%，查詢延遲 {'>'}500ms]</span>{'\\n\\n'}
          請按以下四個層級逐步設計：{'\\n\\n'}
          第一步：優化查詢 + 加 Index{'\\n'}
          - 分析常見嘅慢查詢模式{'\\n'}
          - 建議加邊啲 Index{'\\n'}
          - 用 EXPLAIN 驗證效果{'\\n\\n'}
          第二步：加 Cache（三層快取）{'\\n'}
          - 伺服器 Cache（Redis）：Cache 咩數據、TTL 策略、Invalidation 方案{'\\n'}
          - CDN Cache：靜態資源同 API Response Cache 設定{'\\n'}
          - 客戶端 Cache：HTTP Cache Header 策略{'\\n\\n'}
          第三步：Read Replicas{'\\n'}
          - 幾多個副本、負載均衡策略{'\\n'}
          - 處理 Replication Lag 嘅方案{'\\n\\n'}
          第四步：進階方案（如果需要）{'\\n'}
          - CQRS Pattern 考量{'\\n'}
          - 資料庫 Sharding 策略{'\\n\\n'}
          每一步都要標明「幾時應該用」同「預期效果」。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實現 Read Replica 架構</h4>
        <div className="prompt-text">
          幫手實現一個 Read Replica 架構，包含完整嘅配置同 Application 層設計。{'\\n\\n'}
          技術棧：{'\\n'}
          - 資料庫：<span className="placeholder">[例如：PostgreSQL / MySQL]</span>{'\\n'}
          - 雲平台：<span className="placeholder">[例如：AWS RDS / GCP Cloud SQL / 自建]</span>{'\\n'}
          - 應用層語言：<span className="placeholder">[例如：Node.js / Python / Go]</span>{'\\n\\n'}
          架構要求：{'\\n'}
          1. 一個 Primary DB（負責所有寫入）{'\\n'}
          2. <span className="placeholder">[2-3]</span> 個 Read Replica（負責讀取）{'\\n'}
          3. Application 層嘅讀寫分離邏輯：{'\\n'}
          {'   '}- 所有 SELECT 查詢自動路由到 Replica{'\\n'}
          {'   '}- 所有 INSERT / UPDATE / DELETE 路由到 Primary{'\\n'}
          {'   '}- 寫入後嘅即時讀取要路由到 Primary（避免 Replication Lag 問題）{'\\n\\n'}
          需要提供：{'\\n'}
          - 資料庫 Replication 配置步驟{'\\n'}
          - Application 層嘅 Connection Pool 設計{'\\n'}
          - 讀寫分離嘅 Middleware / Proxy 實現{'\\n'}
          - Replication Lag 監控同 Alert 設定{'\\n'}
          - Failover 策略：Replica 掛咗點處理{'\\n\\n'}
          請提供完整嘅配置檔案同 code 範例。
        </div>
      </div>
    </div>
  );
}

export default function ScaleReads() {
  return (
    <>
      <TopicTabs
        title="Scale Reads — 擴展讀取能力"
        subtitle="點樣應對：App 突然爆紅，一夜之間由 0 去到 100 萬用戶"
        tabs={[
          { id: 'overview', label: '① 全局思路', content: <OverviewTab /> },
          { id: 'indexing', label: '② 優化查詢 + 索引', content: <IndexingTab /> },
          { id: 'caching', label: '③ 三層 Cache', premium: true, content: <CachingTab /> },
          { id: 'replicas', label: '④ 讀取副本', premium: true, content: <ReplicasTab /> },
          { id: 'ai-viber', label: '⑤ AI Viber', premium: true, content: <AIViberTab /> },
        
          { id: 'quiz', label: '小測', content: <QuizRenderer data={quizData} /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
