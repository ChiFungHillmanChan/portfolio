import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'cdn', label: 'CDN 內容分發網絡' },
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
  { slug: 'redis', label: 'Redis' },
  { slug: 'scale-reads', label: '擴展讀取能力' },
];

function TTLTab() {
  return (
    <div className="card">
      <h2>TTL — Time to Live（時間到期）</h2>
      <div className="subtitle">最簡單嘅 Cache 失效方法：設個時限，到期就刪</div>
      <p>
        用個簡單嘅例子嚟理解。去餐廳叫外賣，啲嘢食放雪櫃最多擺 5 分鐘就要掉咗佢。TTL 就係咁嘅概念——Cache 入面嘅資料，放咗一段時間之後就會自動被移除，下次有人嚟攞資料，系統就會去資料庫攞返最新嘅。建議由呢個策略開始學，因為佢係最易理解嘅。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow1" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <filter id="glowIndigo1">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#6366f1" floodOpacity="0.3" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradCache1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#252d3f" />
            </linearGradient>
            <linearGradient id="gradDB1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1a2e2a" />
            </linearGradient>
            <marker id="arrowBlue1" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
            <marker id="arrowYellow1" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" />
            </marker>
            <marker id="arrowGreen1" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#34d399" />
            </marker>
            <marker id="arrowRed1" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto">
              <path d="M0,0 L4,8 L8,0 Z" fill="#f87171" />
            </marker>
          </defs>

          {/* User */}
          <g transform="translate(60,160)">
            <circle cx="30" cy="20" r="18" fill="#6366f1" opacity="0.9" />
            <text x="30" y="25" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">&#x1F464;</text>
            <text x="30" y="55" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="500">用戶</text>
          </g>

          {/* Cache */}
          <g transform="translate(300,120)" filter="url(#glowIndigo1)">
            <rect width="160" height="90" rx="14" fill="url(#gradCache1)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow1)" />
            <text x="80" y="35" textAnchor="middle" fill="#6366f1" fontSize="14" fontWeight="700">Cache</text>
            <text x="80" y="55" textAnchor="middle" fill="#9ca3af" fontSize="11">（快取記憶體）</text>
            <text x="80" y="75" textAnchor="middle" fill="#fbbf24" fontSize="11">TTL = 5 分鐘</text>
          </g>

          {/* Database */}
          <g transform="translate(600,120)">
            <rect width="150" height="90" rx="14" fill="url(#gradDB1)" stroke="#34d399" strokeWidth="2" filter="url(#shadow1)" />
            <text x="75" y="35" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">資料庫</text>
            <text x="75" y="55" textAnchor="middle" fill="#9ca3af" fontSize="11">（Database）</text>
            <text x="75" y="75" textAnchor="middle" fill="#9ca3af" fontSize="11">真正嘅資料來源</text>
          </g>

          {/* Arrow: User -> Cache */}
          <path d="M 120 170 Q 210 150 298 170" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowBlue1)" />
          <text x="200" y="150" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="500">1. 讀取請求</text>

          {/* Arrow: Cache -> Database */}
          <path d="M 462 150 Q 530 130 598 150" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6,4" markerEnd="url(#arrowYellow1)" />
          <text x="530" y="128" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="500">2. Cache 冇資料？</text>
          <text x="530" y="115" textAnchor="middle" fill="#fbbf24" fontSize="10">去資料庫攞</text>

          {/* Arrow: Database -> Cache */}
          <path d="M 598 195 Q 530 215 462 195" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrowGreen1)" />
          <text x="530" y="235" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="500">3. 儲存到 Cache</text>

          {/* TTL Expiry */}
          <g transform="translate(310,260)">
            <rect width="140" height="50" rx="10" fill="rgba(239,68,68,0.15)" stroke="#f87171" strokeWidth="1.5" />
            <text x="70" y="22" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">5 分鐘後</text>
            <text x="70" y="40" textAnchor="middle" fill="#f87171" fontSize="11">自動刪除 Cache</text>
          </g>
          <line x1="380" y1="212" x2="380" y2="258" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrowRed1)" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>運作原理</h3>
      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>用戶想攞啲資料，系統先去 Cache 度睇下有冇。重點係，Cache 係第一道防線。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>如果 Cache 冇（即係「Cache Miss」），就去資料庫攞返，然後順便存入 Cache。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>呢份資料喺 Cache 擺咗 5 分鐘之後，就會自動被移除。可以理解為佢有「保質期」。</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span>下次有人再攞同一份資料，就重複上面嘅流程。就係咁簡單！</span>
        </li>
      </ol>

      <div className="pros-cons">
        <div className="pros">
          <h4>好處</h4>
          <ul>
            <li>實現超簡單，建議初學者由呢個開始</li>
            <li>唔使理資料幾時被改過</li>
            <li>適合用嚟快取第三方 API 嘅資料</li>
          </ul>
        </div>
        <div className="cons">
          <h4>壞處</h4>
          <ul>
            <li>喺 TTL 到期之前，用戶可能會睇到舊資料</li>
            <li>如果資料庫嘅資料被更改咗，Cache 唔會即時更新</li>
          </ul>
        </div>
      </div>

      <div className="use-case">
        <h4>適用場景</h4>
        <p>當系統用緊第三方 API（例如天氣預報、匯率），而且控制唔到對方幾時改資料，用 TTL 就最啱。實戰中好多時候都會先試呢個方法。</p>
      </div>
    </div>
  );
}

function WriteThroughTab() {
  return (
    <div className="card">
      <h2>Write Through — 同步寫入</h2>
      <div className="subtitle">寫入資料嘅時候，Cache 同資料庫一齊更新</div>
      <p>
        用個生活例子嚟解釋。記低電話號碼嘅時候，同時寫喺手機同紙上面，兩邊都有最新嘅資料。Write Through 就係咁——每次有人改資料，系統會同時更新 Cache 同資料庫，咁樣 Cache 入面永遠都係最新嘅。呢個策略嘅核心係：<strong>兩邊同步</strong>。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 350" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow2" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <filter id="glowAmber2">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradCache2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#252d3f" />
            </linearGradient>
            <linearGradient id="gradDB2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1a2e2a" />
            </linearGradient>
            <marker id="arrowOrange2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
            </marker>
            <marker id="arrowBlue2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
          </defs>

          {/* User */}
          <g transform="translate(60,130)">
            <circle cx="30" cy="20" r="18" fill="#6366f1" opacity="0.9" />
            <text x="30" y="25" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">&#x1F464;</text>
            <text x="30" y="55" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="500">用戶</text>
          </g>

          {/* Cache */}
          <g transform="translate(300,60)">
            <rect width="160" height="80" rx="14" fill="url(#gradCache2)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow2)" />
            <text x="80" y="30" textAnchor="middle" fill="#6366f1" fontSize="14" fontWeight="700">Cache</text>
            <text x="80" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">（快取記憶體）</text>
            <text x="80" y="68" textAnchor="middle" fill="#34d399" fontSize="11">即時更新</text>
          </g>

          {/* Database */}
          <g transform="translate(300,200)">
            <rect width="160" height="80" rx="14" fill="url(#gradDB2)" stroke="#34d399" strokeWidth="2" filter="url(#shadow2)" />
            <text x="80" y="30" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">資料庫</text>
            <text x="80" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">（Database）</text>
            <text x="80" y="68" textAnchor="middle" fill="#34d399" fontSize="11">即時更新</text>
          </g>

          {/* Arrow: User -> Cache */}
          <path d="M 120 138 Q 200 90 298 100" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowOrange2)" />
          <text x="190" y="95" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="500">1. 寫入 Cache</text>

          {/* Arrow: User -> Database */}
          <path d="M 120 160 Q 200 230 298 238" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowOrange2)" />
          <text x="190" y="220" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="500">1. 寫入資料庫</text>

          {/* Simultaneous Label */}
          <g transform="translate(150,155)" filter="url(#glowAmber2)">
            <rect width="70" height="24" rx="12" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="1" />
            <text x="35" y="16" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="600">同時進行</text>
          </g>

          {/* Read path */}
          <g transform="translate(570,60)">
            <rect width="160" height="80" rx="14" fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="1" strokeDasharray="4,3" />
            <text x="80" y="25" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="600">讀取嘅時候</text>
            <text x="80" y="45" textAnchor="middle" fill="#9ca3af" fontSize="11">Cache 一定有</text>
            <text x="80" y="62" textAnchor="middle" fill="#9ca3af" fontSize="11">最新嘅資料</text>
          </g>
          <path d="M 462 100 Q 515 95 568 100" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrowBlue2)" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>運作原理</h3>
      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>用戶想改資料（例如改名、改地址）。注意，呢個係一個「寫入」操作。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>系統會同時將新資料寫入 Cache 同資料庫。呢個「同時」就係 Write Through 嘅核心。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>之後有人讀取呢份資料嘅時候，Cache 入面已經係最新版本。完全唔使擔心資料過期嘅問題。</span>
        </li>
      </ol>

      <div className="pros-cons">
        <div className="pros">
          <h4>好處</h4>
          <ul>
            <li>Cache 入面嘅資料永遠係最新</li>
            <li>讀取速度快，因為 Cache 一定有資料</li>
            <li>資料一致性強，唔使怕 Cache 同 DB 唔同步</li>
          </ul>
        </div>
        <div className="cons">
          <h4>壞處</h4>
          <ul>
            <li>寫入會慢啲，因為要同時寫兩個地方</li>
            <li>如果其中一邊寫入失敗，Cache 同資料庫可能會唔一致</li>
            <li>有出錯嘅風險需要額外處理</li>
          </ul>
        </div>
      </div>

      <div className="use-case">
        <h4>適用場景</h4>
        <p>當需要 Cache 入面嘅資料永遠都係最新，而且可以接受寫入慢少少嘅時候。例如用戶個人資料、帳戶設定呢啲經常被讀取嘅資料，最適合用呢個策略。</p>
      </div>
    </div>
  );
}

function WriteAroundTab() {
  return (
    <div className="card">
      <h2>Write Around — 繞過快取寫入</h2>
      <div className="subtitle">寫入嘅時候只寫資料庫，然後踢走 Cache 入面嘅舊資料</div>
      <p>
        用個比喻嚟理解。更新咗屋企嘅電話簿，但唔急住喺手機度同步，只係刪除手機舊嘅記錄。下次需要嗰個號碼嘅時候，再從電話簿抄返。Write Around 就係咁——寫入嘅時候只更新資料庫，然後將 Cache 入面嘅舊記錄刪除，等下次有人需要嘅時候再重新快取。關鍵在於呢個模式：<strong>寫 DB、踢 Cache、懶加載</strong>。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow3" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <filter id="glowGreen3">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#34d399" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradCacheR3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#2a2030" />
            </linearGradient>
            <linearGradient id="gradDB3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1a2e2a" />
            </linearGradient>
            <marker id="arrowGreen3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#34d399" />
            </marker>
            <marker id="arrowRed3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#f87171" />
            </marker>
            <marker id="arrowBlue3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
          </defs>

          {/* User */}
          <g transform="translate(60,150)">
            <circle cx="30" cy="20" r="18" fill="#6366f1" opacity="0.9" />
            <text x="30" y="25" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">&#x1F464;</text>
            <text x="30" y="55" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="500">用戶</text>
          </g>

          {/* Cache */}
          <g transform="translate(300,60)">
            <rect width="160" height="80" rx="14" fill="url(#gradCacheR3)" stroke="#f87171" strokeWidth="2" filter="url(#shadow3)" />
            <text x="80" y="30" textAnchor="middle" fill="#6366f1" fontSize="14" fontWeight="700">Cache</text>
            <text x="80" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">（快取記憶體）</text>
            <text x="80" y="68" textAnchor="middle" fill="#f87171" fontSize="11">舊資料被刪除</text>
          </g>

          {/* Database */}
          <g transform="translate(300,220)" filter="url(#glowGreen3)">
            <rect width="160" height="80" rx="14" fill="url(#gradDB3)" stroke="#34d399" strokeWidth="2" filter="url(#shadow3)" />
            <text x="80" y="30" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">資料庫</text>
            <text x="80" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">（Database）</text>
            <text x="80" y="68" textAnchor="middle" fill="#34d399" fontSize="11">直接寫入新資料</text>
          </g>

          {/* Arrow: User -> Database */}
          <path d="M 120 178 Q 200 260 298 258" fill="none" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowGreen3)" />
          <text x="185" y="245" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">1. 直接寫入資料庫</text>

          {/* Arrow: Evict Cache */}
          <path d="M 120 160 Q 200 100 298 102" fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="6,4" markerEnd="url(#arrowRed3)" />
          <text x="195" y="110" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="500">2. 刪除 Cache 舊記錄</text>

          {/* Later Read */}
          <g transform="translate(570,120)">
            <rect width="180" height="100" rx="14" fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="1" strokeDasharray="4,3" />
            <text x="90" y="25" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="600">之後有人讀取時</text>
            <text x="90" y="48" textAnchor="middle" fill="#9ca3af" fontSize="11">Cache 冇資料（Miss）</text>
            <text x="90" y="66" textAnchor="middle" fill="#9ca3af" fontSize="11">去資料庫攞最新版本</text>
            <text x="90" y="84" textAnchor="middle" fill="#34d399" fontSize="11">重新存入 Cache</text>
          </g>
          <path d="M 462 100 Q 515 130 568 155" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrowBlue3)" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>運作原理</h3>
      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>用戶想改資料，系統直接寫入資料庫，唔寫 Cache。留意，佢「繞過」咗 Cache。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>如果 Cache 入面有呢份資料嘅舊版本，即刻刪除佢（即係「evict」）。呢步好重要，唔好忽略。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>下次有人要讀呢份資料，Cache 冇嘢（Cache Miss），就去資料庫攞返最新版，然後重新存入 Cache。呢個就係「懶加載」嘅概念。</span>
        </li>
      </ol>

      <div className="pros-cons">
        <div className="pros">
          <h4>好處</h4>
          <ul>
            <li>唔使擔心 Cache 同資料庫唔同步</li>
            <li>寫入只寫一個地方，減低出錯風險</li>
            <li>簡單直接，好適合初學者使用</li>
          </ul>
        </div>
        <div className="cons">
          <h4>壞處</h4>
          <ul>
            <li>寫入之後第一次讀取會慢啲（因為要去資料庫攞）</li>
            <li>如果啲資料寫完之後好快就被讀，就唔夠快</li>
          </ul>
        </div>
      </div>

      <div className="use-case">
        <h4>適用場景</h4>
        <p>當改完資料之後，唔預期即刻會有人讀返佢，或者唔想處理 Cache 同資料庫同步出錯嘅問題嘅時候。例如日誌記錄、歷史資料更新等，呢個策略係最佳選擇。</p>
      </div>
    </div>
  );
}

function WriteBackTab() {
  return (
    <div className="card">
      <h2>Write Back — 延遲寫入（寫先快取）</h2>
      <div className="subtitle">追求最快寫入速度：先寫 Cache，遲啲再同步去資料庫</div>
      <p>
        呢個係一個進階嘅策略。想像一下喺白板度快速記低嘢，遲啲得閒先抄入筆記簿。Write Back 就係呢個概念——用戶改資料嘅時候，系統只寫入 Cache（超快！），然後背景會有個「小助手」定時將 Cache 入面嘅新資料同步返去資料庫。要特別留意嘅風險係：<strong>Cache 一掛，未同步嘅資料就冇咗</strong>。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow4" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <filter id="glowIndigo4">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#6366f1" floodOpacity="0.3" />
              <feComposite in2="blur" operator="in" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradCache4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#252d3f" />
            </linearGradient>
            <linearGradient id="gradDB4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#1a2e2a" />
            </linearGradient>
            <linearGradient id="gradAsync4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(245,158,11,0.2)" />
              <stop offset="100%" stopColor="rgba(245,158,11,0.08)" />
            </linearGradient>
            <marker id="arrowBlue4" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
            <marker id="arrowOrange4" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* User */}
          <g transform="translate(60,120)">
            <circle cx="30" cy="20" r="18" fill="#6366f1" opacity="0.9" />
            <text x="30" y="25" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">&#x1F464;</text>
            <text x="30" y="55" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="500">用戶</text>
          </g>

          {/* Cache */}
          <g transform="translate(250,90)" filter="url(#glowIndigo4)">
            <rect width="180" height="90" rx="14" fill="url(#gradCache4)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow4)" />
            <text x="90" y="30" textAnchor="middle" fill="#6366f1" fontSize="14" fontWeight="700">Cache</text>
            <text x="90" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">（快取記憶體）</text>
            <text x="90" y="70" textAnchor="middle" fill="#34d399" fontSize="11">直接寫入，超快！</text>
          </g>

          {/* Async Job */}
          <g transform="translate(280,240)">
            <rect width="130" height="60" rx="30" fill="url(#gradAsync4)" stroke="#f59e0b" strokeWidth="2" />
            <text x="65" y="25" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="700">背景任務</text>
            <text x="65" y="42" textAnchor="middle" fill="#fbbf24" fontSize="10">（Async Job）</text>
          </g>

          {/* Database */}
          <g transform="translate(560,90)">
            <rect width="170" height="90" rx="14" fill="url(#gradDB4)" stroke="#34d399" strokeWidth="2" filter="url(#shadow4)" />
            <text x="85" y="30" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">資料庫</text>
            <text x="85" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">（Database）</text>
            <text x="85" y="70" textAnchor="middle" fill="#fbbf24" fontSize="11">遲啲先更新</text>
          </g>

          {/* Arrow: User -> Cache */}
          <path d="M 120 138 Q 185 115 248 133" fill="none" stroke="#6366f1" strokeWidth="2.5" markerEnd="url(#arrowBlue4)" />
          <text x="175" y="112" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="600">1. 寫入 Cache</text>
          <g transform="translate(155,118)">
            <rect width="48" height="16" rx="8" fill="rgba(52,211,153,0.2)" stroke="#34d399" strokeWidth="1" />
            <text x="24" y="12" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="700">超快</text>
          </g>

          {/* Arrow: Cache -> Async Job */}
          <line x1="340" y1="182" x2="340" y2="238" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4" markerEnd="url(#arrowOrange4)" />

          {/* Arrow: Async Job -> Database */}
          <path d="M 412 270 Q 500 270 558 160" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4" markerEnd="url(#arrowOrange4)" />
          <text x="510" y="250" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="500">2. 稍後同步到資料庫</text>

          {/* No direct write to DB */}
          <g transform="translate(430,30)">
            <rect width="160" height="40" rx="10" fill="rgba(248,113,113,0.1)" stroke="#f87171" strokeWidth="1" strokeDasharray="4,3" />
            <text x="80" y="16" textAnchor="middle" fill="#f87171" fontSize="10">寫入時唔直接寫資料庫</text>
            <text x="80" y="32" textAnchor="middle" fill="#f87171" fontSize="10">所以寫入超級快！</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>運作原理</h3>
      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>用戶想寫資料，系統只寫入 Cache——唔寫資料庫，所以超快！呢個就係 Write Back 嘅精髓。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>背景有個自動任務（Async Job），會定時將 Cache 入面嘅新資料同步返去資料庫。可以理解為有個「小助手」自動處理同步。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>讀取嘅時候，Cache 入面已經有最新嘅資料，即刻回覆用戶。用戶體驗超好。</span>
        </li>
      </ol>

      <div className="pros-cons">
        <div className="pros">
          <h4>好處</h4>
          <ul>
            <li>寫入速度係所有策略入面最快嘅</li>
            <li>用戶唔使等資料庫寫入完成</li>
            <li>適合高流量嘅系統</li>
          </ul>
        </div>
        <div className="cons">
          <h4>壞處</h4>
          <ul>
            <li>如果 Cache 掛咗（例如斷電），未同步嘅資料可能會不見</li>
            <li>資料庫同 Cache 之間會有短暫嘅唔一致</li>
            <li>實現比較複雜，需要處理同步失敗嘅情況</li>
          </ul>
        </div>
      </div>

      <div className="use-case">
        <h4>適用場景</h4>
        <p>當最在乎寫入速度，而且可以接受短暫嘅資料唔一致。例如社交媒體嘅「讚」數、即時通訊嘅訊息狀態、遊戲入面嘅分數記錄等。注意，用呢個策略之前一定要做好容錯機制。</p>
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
        <h4>Prompt 1 — 設計 Cache 失效策略</h4>
        <div className="prompt-text">
          幫手設計一個完整嘅 Cache 失效策略，應用場景係 <span className="placeholder">[業務場景，例如：電商產品頁、社交媒體 Feed、即時排行榜]</span>。{'\n\n'}技術棧：<span className="placeholder">[技術棧，例如：Redis + MySQL / Memcached + PostgreSQL]</span>{'\n'}數據特徵：<span className="placeholder">[讀寫比例、數據更新頻率、一致性要求]</span>{'\n'}流量規模：<span className="placeholder">[預計 QPS，例如：讀 100K QPS、寫 5K QPS]</span>{'\n\n'}要求：{'\n'}1. 分析 Write Through、Write Around、Write Back 三種策略，推薦最適合嘅方案{'\n'}2. 設計 TTL 策略——唔同類型嘅數據用唔同嘅 TTL{'\n'}3. 處理 Cache Stampede（緩存雪崩）嘅方案：mutex lock / probabilistic early expiration{'\n'}4. 處理 Cache Penetration（穿透）：Bloom Filter 擋住唔存在嘅 key{'\n'}5. 設計 Cache Warming 策略，避免冷啟動問題{'\n'}6. 提供完整嘅代碼實現，包括 cache middleware
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 選擇 Cache Pattern 同實作方案</h4>
        <div className="prompt-text">
          根據以下場景，設計最適合嘅 Cache Pattern 同具體實作：{'\n\n'}場景描述：<span className="placeholder">[具體場景，例如：用戶 Profile 頁面，寫入少但讀取非常頻繁]</span>{'\n'}一致性要求：<span className="placeholder">[可接受幾秒延遲 / 必須即時一致]</span>{'\n'}現有架構：<span className="placeholder">[現有嘅 DB 同 Cache 技術]</span>{'\n\n'}要求：{'\n'}1. 對比 Cache-Aside、Read-Through、Write-Through、Write-Behind 四種 pattern{'\n'}2. 針對呢個場景推薦最佳 pattern，解釋原因{'\n'}3. 設計 cache key 命名規則同 namespace 策略{'\n'}4. 實現 cache invalidation 觸發機制（DB trigger / event-driven / TTL）{'\n'}5. 處理分佈式環境下嘅 cache consistency（多節點同步）{'\n'}6. 加入 cache hit rate monitoring 同 alerting{'\n'}7. 提供完整嘅 Redis 配置同應用層代碼
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 實作 Cache Stampede 防護機制</h4>
        <div className="prompt-text">
          用 <span className="placeholder">[技術棧，例如：Node.js + Redis / Python + Redis / Go + Redis]</span> 實作一個 Cache Stampede（緩存雪崩）防護模組：{'\n\n'}要求：{'\n'}1. 實現 Mutex Lock 方案：Cache Miss 時只有一個 request 去 DB 查，其他 request 等待{'\n'}2. 實現 Probabilistic Early Expiration：喺 TTL 到期之前隨機提前刷新{'\n'}3. 實現 Stale-While-Revalidate：返回舊數據嘅同時背景刷新{'\n'}4. 對比三種方案嘅 latency 同 throughput 影響{'\n'}5. 寫 load test 腳本模擬 stampede 場景，驗證防護效果{'\n'}6. 提供完整嘅代碼，包括 unit test 同 integration test
        </div>
      </div>
    </div>
  );
}

export default function CacheInvalidation() {
  return (
    <>
      <TopicTabs
        title="Cache 失效策略"
        subtitle="用最簡單嘅方式，搞清楚四種常見嘅 Cache（快取）更新策略"
        tabs={[
          { id: 'ttl', label: '① TTL 時間到期', content: <TTLTab /> },
          { id: 'write-through', label: '② Write Through 同步寫入', content: <WriteThroughTab /> },
          { id: 'write-around', label: '③ Write Around 繞過快取', premium: true, content: <WriteAroundTab /> },
          { id: 'write-back', label: '④ Write Back 延遲寫入', premium: true, content: <WriteBackTab /> },
          { id: 'ai-viber', label: '⑤ AI Viber', premium: true, content: <AIViberTab /> },
        ]}
      />
      <div className="topic-container">
        <QuizRenderer data={quizData} />
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
