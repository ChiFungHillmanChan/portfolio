import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '面試官問：「點樣設計同 Build 一個 Web Scraper？」邊個回答最能展示 Senior 級嘅思維？',
    options: [
      { text: '用 Python `requests` 攞 HTML，再用 BeautifulSoup 解析就搞掂', correct: false, explanation: '呢個係 Intern 級答案。能解決最表面嘅問題，但完全冇諗 robots.txt、scaling、被 ban、JavaScript-rendered 內容、retry 等問題' },
      { text: '打開 Chrome DevTools 偷網站個內部 API，直接 call 嗰個 API', correct: false, explanation: '呢個係 Junior 級嘅聰明做法（比解析 HTML 穩定好多），但仍然冇諗到 robots.txt、scaling、頻率控制、storage 等系統層面嘅問題' },
      { text: '先睇 robots.txt 同有冇 official API → 用 Playwright 定期 scrape → 寫入 DB → 加 retry/exponential backoff/alert', correct: true, explanation: '啱！呢個係 Senior 答案：合規性 + 完整 pipeline + 把 scraped data 落 DB（減少重複 scrape 同被 ban 嘅機會）+ 完整錯誤處理。展示咗系統性思維。' },
      { text: '一次過開 1000 個 thread 同時 scrape 嚟加快速度', correct: false, explanation: '會即刻被網站 ban IP，亦違反 Politeness Policy。速度從來唔係 Web Scraper 嘅第一考量' },
    ],
  },
  {
    question: '點解 Senior Engineer 會堅持將 scraped data 寫入自己嘅 Database，而唔係每次都重新 scrape？',
    options: [
      { text: '因為 Database 永遠比網絡快', correct: false, explanation: '速度只係其中一個原因。更重要嘅係減少對目標網站嘅請求量' },
      { text: '減少對目標網站嘅請求，降低被 ban 嘅機會，亦避免目標網站變動導致數據唔可用', correct: true, explanation: '啱！Scrape 一次、之後從自己 DB 攞 — 對目標網站友好（少請求 = 唔易被 ban），自己嘅 service 又快又穩定，唔受對方 downtime 影響' },
      { text: '為咗節省 Playwright 嘅 licence 費用', correct: false, explanation: 'Playwright 係開源免費嘅，根本冇 licence 費' },
      { text: '為咗符合 GDPR 法規', correct: false, explanation: 'GDPR 同存儲 scraped data 嘅關係好複雜，呢個唔係主要原因' },
    ],
  },
  {
    question: '一個生產級 Web Scraper 點解一定要有 exponential backoff？',
    options: [
      { text: '令 scrape 任務跑得快啲', correct: false, explanation: 'Backoff 嘅作用啱啱相反 — 係慢落嚟，避免短時間內重複錯誤' },
      { text: '目標網站短暫故障或限流時，逐漸拉長重試間隔，避免雪上加霜', correct: true, explanation: '啱！第一次失敗等 1 秒重試、第二次等 2 秒、第三次等 4 秒... 咁樣俾對方 server 時間恢復，亦避免你嘅 retry 變成 DDoS 攻擊' },
      { text: '減少 Playwright 嘅記憶體用量', correct: false, explanation: 'Backoff 同記憶體用量冇直接關係' },
      { text: '令 robots.txt 自動更新', correct: false, explanation: 'robots.txt 嘅讀取係另一個獨立機制，同 backoff 冇關係' },
    ],
  },
  {
    question: '點解 Senior 會用 Playwright 而唔係單純嘅 HTTP requests？',
    options: [
      { text: 'Playwright 嘅 syntax 比較簡單', correct: false, explanation: 'Syntax 簡潔程度兩者差唔多，唔係主因' },
      { text: 'Playwright 可以執行 JavaScript、按掣、登入，處理單純 HTTP requests 攞唔到嘅內容', correct: true, explanation: '啱！而家好多網站係 SPA（例如 React/Vue），內容係 JS 渲染嘅，純 HTTP request 攞返嚟係空 HTML。Playwright 控制一個真實 headless browser，可以渲染晒先攞 DOM' },
      { text: 'Playwright 可以自動 bypass 所有 anti-bot 保護', correct: false, explanation: '冇任何工具可以「自動 bypass 所有」防護。呢個諗法本身就唔對' },
      { text: 'Playwright 自動會遵守 robots.txt', correct: false, explanation: 'Playwright 唔會自動讀 robots.txt，呢個係要自己 implement 嘅' },
    ],
  },
];

const relatedTopics = [
  { slug: 'web-crawler', label: 'Web Crawler 網頁爬蟲' },
  { slug: 'scraping-vs-crawling', label: 'Scraping vs Crawling' },
  { slug: 'rate-limiter', label: '流量限制器' },
  { slug: 'junior-vs-senior', label: 'Junior 定 Senior' },
];

function InternTab() {
  return (
    <div className="card">
      <h2>Intern 做法 — 直接抓 HTML</h2>
      <div className="subtitle">「寫個 Python script 用 requests + BeautifulSoup 就搞掂」</div>
      <p>
        Intern 聽到「設計 Web Scraper」嘅第一反應通常係：「咁簡單啫，幾行 Python 就搞掂啦」。呢個答案表面上係啱嘅 — 技術上的確可以行，但完全冇諗過 production 環境會點。係能做得到，唔代表係合適嘅方案。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 760 270" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowI" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <linearGradient id="gradIBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradIAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradIRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrIBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrIRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>

          <g transform="translate(30,85)">
            <rect width="160" height="80" rx="14" fill="url(#gradIBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowI)" />
            <text x="80" y="30" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Python Script</text>
            <text x="80" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">requests.get(url)</text>
            <text x="80" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">BeautifulSoup 解析</text>
          </g>

          <g transform="translate(280,85)">
            <rect width="160" height="80" rx="14" fill="url(#gradIAmber)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadowI)" />
            <text x="80" y="30" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">目標網站</text>
            <text x="80" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">Return Raw HTML</text>
            <text x="80" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">（可能仲未 render JS）</text>
          </g>

          <g transform="translate(530,85)">
            <rect width="200" height="80" rx="14" fill="url(#gradIRed)" stroke="#f87171" strokeWidth="2" filter="url(#shadowI)" />
            <text x="100" y="30" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">問題一籮籮</text>
            <text x="100" y="50" textAnchor="middle" fill="#fca5a5" fontSize="10">JS-rendered 攞唔到</text>
            <text x="100" y="66" textAnchor="middle" fill="#fca5a5" fontSize="10">改 HTML 結構即崩潰</text>
          </g>

          <path d="M192,125 C220,125 250,125 278,125" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrIBlue)" />
          <path d="M442,125 C475,125 500,125 528,125" stroke="#f87171" strokeWidth="2" fill="none" markerEnd="url(#arrIRed)" />

          <g transform="translate(180,200)">
            <rect width="400" height="44" rx="12" fill="rgba(248,113,113,0.1)" stroke="#f87171" strokeWidth="1" strokeDasharray="5,3" />
            <text x="200" y="20" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">Production 環境冇諗過：被 ban、retry、scaling</text>
            <text x="200" y="36" textAnchor="middle" fill="#fca5a5" fontSize="10">先做到再諗其他？係，但 Senior 一開始就會諗</text>
          </g>
        </svg>
      </div>

      <div className="code-block"><span className="code-comment"># Intern 版本 — 真係就咁幾行</span>{'\n'}import requests{'\n'}from bs4 import BeautifulSoup{'\n\n'}res = requests.get(&quot;https://example.com/products&quot;){'\n'}soup = BeautifulSoup(res.text, &quot;html.parser&quot;){'\n\n'}for item in soup.select(&quot;.product-card&quot;):{'\n'}    print(item.select_one(&quot;.title&quot;).text){'\n'}    print(item.select_one(&quot;.price&quot;).text)</div>

      <div className="quote-block">
        <p>「能 work ≠ 能 ship」。Intern 級嘅做法 demo 出嚟係 OK 嘅，但放上 production 一日就死。</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>Intern 做法嘅致命傷</h3>
      <div className="key-points">
        <div className="key-point"><h4>JavaScript-rendered 內容攞唔到</h4><p>而家大部分網站係 SPA（React、Vue、Next.js）。`requests` 攞返嚟係一個空殼，真正內容係瀏覽器執行 JS 之後先出現。Intern 做法直接 miss 晒。</p></div>
        <div className="key-point"><h4>HTML 結構變動即崩潰</h4><p>對方改個 CSS class name，你嘅 selector 即刻 fail。一個無痛嘅 UI 更新可以令你嘅 scraper 死成日都唔知。冇 alert、冇 retry、冇 fallback。</p></div>
        <div className="key-point"><h4>冇 robots.txt 檢查</h4><p>連對方俾唔俾 scrape 都唔知。輕則違反禮儀俾人 ban IP，重則收律師信。Intern 通常根本未聽過 robots.txt。</p></div>
        <div className="key-point"><h4>冇 rate limit、冇 retry</h4><p>For-loop 一開就連發 1000 個 request，對方 server 接到識破即刻 block。出 error 就 crash，冇 retry、冇 backoff、冇 alert。</p></div>
      </div>

      <div className="use-case">
        <h4>面試官會點睇</h4>
        <p>Intern 答案會令面試官覺得「呢個人見過 toy example，未做過 production」。同樣係寫 scraper，再行多一步去諗「點樣 scale、點樣 reliable、點樣合規」就係 Junior 同 Senior 嘅分水嶺。</p>
      </div>
    </div>
  );
}

function JuniorTab() {
  return (
    <div className="card">
      <h2>Junior 做法 — DevTools 偷 API</h2>
      <div className="subtitle">「打開 Network tab，搵佢自己個 API 嚟用」</div>
      <p>
        Junior 級嘅工程師會聰明少少。佢哋唔會盲目咁解析 HTML — 佢哋知道大部分 modern 網站背後其實有個 internal API，前端 JS 都係 call 嗰個 API 攞 JSON。所以與其辛苦解析 HTML，不如打開 Chrome DevTools → Network tab，睇下個網站 call 緊邊個 API，然後直接 call 嗰個 API 攞 clean 嘅 JSON。
      </p>
      <p>
        呢個係一個質嘅飛躍。HTML 結構成日變，但 API contract 通常穩定好多 — 因為對方自己嘅前端都靠住個 API 食飯。攞 JSON 仲省咗成個 parsing 嘅 layer，code 更乾淨、更可靠。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowJ" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowJ" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.3" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradJChrome" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1f4f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradJApi" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradJScript" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrJI" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrJG" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          <g transform="translate(30,40)" filter="url(#glowJ)">
            <rect width="200" height="100" rx="14" fill="url(#gradJChrome)" stroke="#6366f1" strokeWidth="2" filter="url(#shadowJ)" />
            <text x="100" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">Step 1 — DevTools</text>
            <text x="100" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">Chrome → F12 → Network</text>
            <text x="100" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">過濾 Fetch/XHR</text>
            <text x="100" y="82" textAnchor="middle" fill="#a5b4fc" fontSize="10">睇前端 call 緊邊個 API</text>
          </g>

          <g transform="translate(290,40)">
            <rect width="200" height="100" rx="14" fill="url(#gradJApi)" stroke="#10B981" strokeWidth="2" filter="url(#shadowJ)" />
            <text x="100" y="28" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Step 2 — 偷 endpoint</text>
            <text x="100" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">Copy as cURL</text>
            <text x="100" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">記低 headers / cookies</text>
            <text x="100" y="82" textAnchor="middle" fill="#34d399" fontSize="10">/api/v1/products</text>
          </g>

          <g transform="translate(550,40)">
            <rect width="200" height="100" rx="14" fill="url(#gradJScript)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowJ)" />
            <text x="100" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Step 3 — 自己 call</text>
            <text x="100" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">requests.get(api_url)</text>
            <text x="100" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">直接攞 JSON</text>
            <text x="100" y="82" textAnchor="middle" fill="#60a5fa" fontSize="10">唔使解析 HTML</text>
          </g>

          <path d="M230,90 C250,90 270,90 288,90" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrJI)" />
          <path d="M490,90 C510,90 530,90 548,90" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrJG)" />

          <g transform="translate(80,180)">
            <rect width="620" height="100" rx="14" fill="rgba(52,211,153,0.06)" stroke="#34d399" strokeWidth="1.5" strokeDasharray="6,3" />
            <text x="310" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">為咩呢個做法明顯優於解析 HTML</text>
            <text x="310" y="52" textAnchor="middle" fill="#c0c4cc" fontSize="11">① API contract 穩定 — 前端都靠住，唔會亂改</text>
            <text x="310" y="70" textAnchor="middle" fill="#c0c4cc" fontSize="11">② 攞 JSON 直接食用 — 唔使 parse HTML，唔受 layout 改變影響</text>
            <text x="310" y="88" textAnchor="middle" fill="#c0c4cc" fontSize="11">③ 通常仲附帶 pagination/filter 參數 — 直接 leverage</text>
          </g>
        </svg>
      </div>

      <div className="code-block"><span className="code-comment"># Junior 版本 — 偷返內部 API 嘅 endpoint</span>{'\n'}import requests{'\n\n'}<span className="code-comment"># 由 DevTools Copy as cURL 攞到嘅</span>{'\n'}url = &quot;https://example.com/api/v1/products?page=1&amp;limit=50&quot;{'\n'}headers = {'{'}{'\n'}    &quot;User-Agent&quot;: &quot;Mozilla/5.0...&quot;,{'\n'}    &quot;Accept&quot;: &quot;application/json&quot;,{'\n'}{'}'}{'\n\n'}res = requests.get(url, headers=headers){'\n'}data = res.json()  <span className="code-comment"># 直接 JSON，唔使解析 HTML</span>{'\n\n'}for product in data[&quot;items&quot;]:{'\n'}    print(product[&quot;title&quot;], product[&quot;price&quot;])</div>

      <div className="quote-block">
        <p>「Senior 唔一定寫得快過 Junior，但係 Senior 識揀正確嘅 layer 入手。」直接打 API 就係正確嘅 layer。</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>Junior 做法嘅優勢</h3>
      <div className="key-points">
        <div className="key-point"><h4>跳過 HTML parsing</h4><p>HTML 係俾人睇嘅，API 係俾機器食嘅。直接食 JSON 唔使再 reverse engineer 一堆 CSS selector，code 簡潔好多。</p></div>
        <div className="key-point"><h4>API 比 UI 穩定</h4><p>網站每幾個月可能會 redesign 一次 UI，但 API contract 動一動就會 break 自己嘅前端，所以對方好少亂改。維護成本低好多。</p></div>
        <div className="key-point"><h4>免費攞到 pagination / filter</h4><p>內部 API 通常已經有 `?page=`、`?sort=`、`?category=` 等參數。可以直接 leverage，唔使自己 build 分頁邏輯。</p></div>
        <div className="key-point"><h4>數據已經 typed</h4><p>JSON 直接係 structured data — number 就係 number、boolean 就係 boolean。唔使再做 string parsing，少咗一大堆 edge case。</p></div>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>但 Junior 仲未諗到嘅嘢</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>合規性：</strong>偷 API 算唔算違反對方 ToS？robots.txt 點寫？呢啲 Junior 通常未諗。</span></li>
        <li><span className="step-num">2</span><span><strong>頻率控制：</strong>對方 API 大多有 rate limit。連發太密一樣會被 429。</span></li>
        <li><span className="step-num">3</span><span><strong>Auth token 過期：</strong>內部 API 通常要 cookie / token。token expire 嗰時點 refresh？</span></li>
        <li><span className="step-num">4</span><span><strong>Storage：</strong>scrape 完啲 data 擺去邊？落 CSV？落 DB？下次點 query？</span></li>
        <li><span className="step-num">5</span><span><strong>監控：</strong>對方改晒 API schema、加 captcha、改 auth 機制 — 點樣即時知？</span></li>
      </ol>

      <div className="use-case">
        <h4>由 Junior 升 Senior 嘅關鍵</h4>
        <p>Junior 嘅 scraper 跑得通，但係一個 script。Senior 嘅 scraper 係一個系統 — 有合規 layer、有 storage、有 retry、有監控、有 alert。下一個 tab 會逐個拆。</p>
      </div>
    </div>
  );
}

function SeniorTab() {
  return (
    <div className="card">
      <h2>Senior 做法 — 完整可靠系統</h2>
      <div className="subtitle">合規 + Pipeline + Storage + 錯誤處理 = Production-grade</div>
      <p>
        Senior Engineer 唔會將「Web Scraper」當成一個 script — 而係當成一個系統嚟設計。佢哋首先問三條問題：(1) 對方俾唔俾我做？(2) 有冇 official API 唔使爬？(3) 我自己嘅系統點樣 reliable？呢三條問題答完，先至開始寫 code。
      </p>
      <p>
        典型 Senior 答案：先睇 robots.txt 確認合規，搵下有冇 official API（有就用，唔使爬）。冇嘅話用 Playwright 每 24 小時 scrape 一次，將 data 寫入自己嘅 Database。之後業務系統需要呢啲 data，全部 query 自己嘅 DB — 唔再打對方 server。整個 pipeline 加上 retry、exponential backoff、schema-change alert。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 860 440" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowS" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowSPurple"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#8B5CF6" floodOpacity="0.3" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowSGreen"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.3" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradSRobot" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSCron" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1f4f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSPlay" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSTarget" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#25132a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSDb" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSApp" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e2e25" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSAlert" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrSIndigo" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrSGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#10B981" /></marker>
            <marker id="arrSAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" /></marker>
            <marker id="arrSRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>

          <text x="430" y="22" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">Senior 級 Web Scraper 系統架構</text>

          <g transform="translate(30,55)">
            <rect width="170" height="68" rx="14" fill="url(#gradSRobot)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadowS)" />
            <text x="85" y="26" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">① 合規檢查</text>
            <text x="85" y="44" textAnchor="middle" fill="#9ca3af" fontSize="10">robots.txt</text>
            <text x="85" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">有冇 official API？</text>
          </g>

          <g transform="translate(240,55)" filter="url(#glowSPurple)">
            <rect width="170" height="68" rx="14" fill="url(#gradSCron)" stroke="#8B5CF6" strokeWidth="2" />
            <text x="85" y="26" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="700">② Scheduler</text>
            <text x="85" y="44" textAnchor="middle" fill="#9ca3af" fontSize="10">每 24 小時 trigger</text>
            <text x="85" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">Cron / Airflow</text>
          </g>

          <g transform="translate(450,55)">
            <rect width="170" height="68" rx="14" fill="url(#gradSPlay)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowS)" />
            <text x="85" y="26" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="700">③ Playwright Worker</text>
            <text x="85" y="44" textAnchor="middle" fill="#9ca3af" fontSize="10">登入、按掣、render JS</text>
            <text x="85" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">retry + backoff</text>
          </g>

          <g transform="translate(660,55)">
            <rect width="170" height="68" rx="14" fill="url(#gradSTarget)" stroke="#EC4899" strokeWidth="2" filter="url(#shadowS)" />
            <text x="85" y="26" textAnchor="middle" fill="#f472b6" fontSize="12" fontWeight="700">④ 目標網站</text>
            <text x="85" y="44" textAnchor="middle" fill="#9ca3af" fontSize="10">遵守 Crawl-delay</text>
            <text x="85" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">控速、輪換 UA</text>
          </g>

          <g transform="translate(240,180)" filter="url(#glowSGreen)">
            <rect width="170" height="68" rx="14" fill="url(#gradSDb)" stroke="#10B981" strokeWidth="2" />
            <text x="85" y="26" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">⑤ 自家 Database</text>
            <text x="85" y="44" textAnchor="middle" fill="#9ca3af" fontSize="10">Postgres / Mongo</text>
            <text x="85" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">Scraped data store</text>
          </g>

          <g transform="translate(450,180)">
            <rect width="170" height="68" rx="14" fill="url(#gradSApp)" stroke="#34d399" strokeWidth="2" filter="url(#shadowS)" />
            <text x="85" y="26" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">⑥ 業務系統</text>
            <text x="85" y="44" textAnchor="middle" fill="#9ca3af" fontSize="10">前端 / API server</text>
            <text x="85" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">只 query DB</text>
          </g>

          <g transform="translate(660,180)">
            <rect width="170" height="68" rx="14" fill="url(#gradSAlert)" stroke="#f87171" strokeWidth="2" filter="url(#shadowS)" />
            <text x="85" y="26" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700">⑦ Alert 系統</text>
            <text x="85" y="44" textAnchor="middle" fill="#fca5a5" fontSize="10">Schema change</text>
            <text x="85" y="58" textAnchor="middle" fill="#fca5a5" fontSize="10">Slack / Email</text>
          </g>

          <path d="M200,89 C220,89 230,89 240,89" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrSIndigo)" />
          <path d="M410,89 C430,89 440,89 450,89" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrSIndigo)" />
          <path d="M620,89 C640,89 650,89 660,89" stroke="#F59E0B" strokeWidth="2" fill="none" markerEnd="url(#arrSAmber)" />
          <text x="640" y="80" textAnchor="middle" fill="#fbbf24" fontSize="9">HTTP req</text>

          <path d="M535,123 C500,140 360,160 325,178" stroke="#10B981" strokeWidth="2" fill="none" markerEnd="url(#arrSGreen)" />
          <text x="420" y="150" textAnchor="middle" fill="#34d399" fontSize="10">Save scraped data</text>

          <path d="M410,214 C430,214 440,214 450,214" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrSGreen)" />
          <text x="430" y="205" textAnchor="middle" fill="#34d399" fontSize="9">query</text>

          <path d="M535,123 C580,140 640,160 690,178" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4,3" fill="none" markerEnd="url(#arrSRed)" />
          <text x="650" y="150" textAnchor="middle" fill="#f87171" fontSize="10">Error / schema diff</text>

          <g transform="translate(80,310)">
            <rect width="700" height="100" rx="14" fill="rgba(52,211,153,0.05)" stroke="#34d399" strokeWidth="1.5" strokeDasharray="6,3" />
            <text x="350" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Senior 答案嘅核心思維</text>
            <text x="350" y="52" textAnchor="middle" fill="#c0c4cc" fontSize="11">解耦 Scrape 同 Query — 業務系統永遠唔直接打對方 server</text>
            <text x="350" y="70" textAnchor="middle" fill="#c0c4cc" fontSize="11">每個外部依賴都有 retry / backoff / timeout / alert</text>
            <text x="350" y="88" textAnchor="middle" fill="#c0c4cc" fontSize="11">合規行先 — 唔做違反 robots.txt 嘅嘢，避免法律風險</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>逐個 component 拆解</h3>

      <div className="flow-step" style={{ marginTop: '20px' }}>
        <div className="flow-number">1</div>
        <h4>合規檢查 — Senior 第一步永遠唔係寫 code</h4>
        <p>
          先讀 <strong style={{ color: '#fbbf24' }}>robots.txt</strong>，確認對方俾邊啲 path scrape。同時 check 有冇 <strong>official API</strong> — 好多大平台（Twitter、Reddit、GitHub）都有 public API，行 official API 既穩定又合規，唔使爬。冇得避先去 scrape。
        </p>
        <div className="code-block"><span className="code-comment"># 第一步：永遠係讀 robots.txt</span>{'\n'}from urllib.robotparser import RobotFileParser{'\n\n'}rp = RobotFileParser(){'\n'}rp.set_url(&quot;https://example.com/robots.txt&quot;){'\n'}rp.read(){'\n\n'}if not rp.can_fetch(&quot;MyBot/1.0&quot;, &quot;https://example.com/products&quot;):{'\n'}    raise PermissionError(&quot;robots.txt disallows this path&quot;)</div>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">2</div>
        <h4>Scheduler — 用 batch 思維，唔用 real-time</h4>
        <p>
          每 24 小時 scrape 一次。即時數據需求？俾人 hit 自家 DB 就夠，唔使每 query 都打對方 server。呢個係 <strong style={{ color: '#a78bfa' }}>解耦</strong>嘅核心思維。Tools：Cron、Airflow、AWS EventBridge。
        </p>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">3</div>
        <h4>Playwright Worker — 對付 modern 網站</h4>
        <p>
          用 <strong style={{ color: '#60a5fa' }}>Playwright</strong>（或 Puppeteer）控制 headless browser。可以執行 JS、按掣、登入、scroll、處理 captcha challenge。比純 HTTP 嘅 `requests` 強大好多，亦比 Selenium 快。每個 request 加 timeout、retry、exponential backoff。
        </p>
        <div className="code-block"><span className="code-comment"># Exponential backoff — 第 N 次 retry 等 2^N 秒</span>{'\n'}import asyncio{'\n'}from playwright.async_api import async_playwright{'\n\n'}async def scrape_with_retry(url, max_retries=5):{'\n'}    for attempt in range(max_retries):{'\n'}        try:{'\n'}            async with async_playwright() as p:{'\n'}                browser = await p.chromium.launch(){'\n'}                page = await browser.new_page(){'\n'}                await page.goto(url, timeout=30000){'\n'}                return await page.content(){'\n'}        except Exception as e:{'\n'}            wait = 2 ** attempt  <span className="code-comment"># 1, 2, 4, 8, 16 秒</span>{'\n'}            await asyncio.sleep(wait){'\n'}    raise Exception(&quot;Max retries exceeded&quot;)</div>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">4</div>
        <h4>寫落自家 Database — 一次 scrape，無限 query</h4>
        <p>
          將 scrape 落嚟嘅 data 寫入自家 <strong style={{ color: '#34d399' }}>Postgres / MongoDB / S3</strong>。之後業務需要呢啲 data，全部 query 自家 DB。對對方 server 友好（少 traffic = 唔易被 ban），對自己 reliable（對方 down 機都唔影響你嘅 service）。
        </p>
      </div>

      <div className="flow-connector">↓</div>

      <div className="flow-step">
        <div className="flow-number">5</div>
        <h4>Alert — schema change 即時通知</h4>
        <p>
          每次 scrape 完，diff 一下 schema 同上次有冇變。HTML class name 改咗、API field 改名、新 captcha 出現 — 任何異常即刻 send Slack / Email。唔係等用戶 complain 先發現 scraper 死咗一個禮拜。
        </p>
      </div>

      <div className="quote-block">
        <p>「Senior 唔係寫得快過 Junior，而係 Senior 對 production 嘅 reliability 同 maintainability 有完全唔同嘅 standard。」</p>
      </div>

      <div className="use-case">
        <h4>面試答題框架</h4>
        <p>
          面試問「點樣 Build Web Scraper」，跟住呢個順序答：
          <strong style={{ color: '#fbbf24' }}>①</strong> robots.txt + Official API check →
          <strong style={{ color: '#a78bfa' }}>②</strong> Scheduler（batch 而非 real-time） →
          <strong style={{ color: '#60a5fa' }}>③</strong> Playwright（處理 JS + 登入） →
          <strong style={{ color: '#34d399' }}>④</strong> 寫落自家 DB（解耦 + 減少請求） →
          <strong style={{ color: '#f87171' }}>⑤</strong> Retry + Backoff + Alert（reliable + maintainable）。
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
        <h4>Prompt 1 — Build 一個 Production-grade Web Scraper</h4>
        <div className="prompt-text">幫手由零設計同實作一個 production-grade 嘅 Web Scraper 系統。{'\n\n'}目標網站：<span className="placeholder">[網站類型，例如 電商產品頁 / 新聞網站 / 公開資料庫]</span>{'\n'}預計 scrape 量：<span className="placeholder">[例如 每日 5 萬個 URL]</span>{'\n'}技術棧：<span className="placeholder">[Python + Playwright / Node.js + Puppeteer / Go + chromedp]</span>{'\n'}存儲：<span className="placeholder">[PostgreSQL / MongoDB / S3]</span>{'\n\n'}必須包含以下完整方案：{'\n'}1. robots.txt 自動讀取同合規檢查邏輯{'\n'}2. 確認有冇 official API 嘅 checklist（先嘗試 API 再決定爬）{'\n'}3. Scheduler 設計（每 24 小時 trigger，用 Cron 或 Airflow）{'\n'}4. Playwright Worker 嘅 retry + exponential backoff 邏輯（max 5 retries，wait 2^N 秒）{'\n'}5. Per-domain rate limiter（Token Bucket，預設每秒 1 req）{'\n'}6. User-Agent 輪換策略{'\n'}7. Database schema（包括 scraped_at、source_url、raw_data、parsed_data）{'\n'}8. Schema-change detection：每次 scrape 完 diff schema，異常 send Slack{'\n'}9. 監控 dashboard 設計（成功率、平均延遲、最近錯誤）{'\n'}10. 可以直接執行嘅 Python code + Docker Compose 部署設定</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Scraper 嘅 Retry + Alert 系統</h4>
        <div className="prompt-text">為一個現有嘅 Web Scraper 加上 production-grade 嘅 retry 同 alert 機制。{'\n\n'}現時 Scraper：<span className="placeholder">[簡述現有 scraper，例如 Python + requests + BeautifulSoup]</span>{'\n'}痛點：<span className="placeholder">[例如 對方改 HTML 就死、出 error 就 crash、冇人知幾時掛咗]</span>{'\n\n'}請輸出以下完整方案：{'\n'}1. Retry decorator/wrapper：max retries、exponential backoff、jitter{'\n'}2. 區分 retryable vs non-retryable error（429/503 retry，404/403 唔 retry）{'\n'}3. Circuit Breaker pattern — 連續失敗 N 次後暫停 M 分鐘{'\n'}4. Schema change detection：對比每次 scrape 嘅 field set，diff 出 missing / new fields{'\n'}5. Alert routing：critical → Slack + PagerDuty；warning → Slack only；info → log{'\n'}6. Health check endpoint（exposed 俾 monitoring 工具 query）{'\n'}7. Dashboard：成功率 7-day trend、最近 10 個 failed run、按 domain 嘅 latency{'\n'}8. 完整可運行嘅 code（Python 優先），附 unit test</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 由解析 HTML 升級到偷 API</h4>
        <div className="prompt-text">幫手分析一個目標網站，揾出佢嘅內部 API endpoints，並將現有解析 HTML 嘅 scraper 改寫成直接打 API。{'\n\n'}目標網站：<span className="placeholder">[網站 URL]</span>{'\n'}目前 scraper 解析嘅頁面類型：<span className="placeholder">[例如 產品列表頁、產品詳情頁、用戶評論頁]</span>{'\n\n'}請輸出：{'\n'}1. 分析步驟：點樣用 Chrome DevTools 嘅 Network tab 揾出真正嘅 API endpoint{'\n'}2. 點樣由 Network tab 「Copy as cURL」轉成 Python `requests` 嘅 code{'\n'}3. 點樣處理 authentication（Cookie、Bearer token、CSRF）{'\n'}4. 識別內部 API 嘅 pagination / filter / sort 參數{'\n'}5. 對比 HTML parsing vs API 嘅優劣（穩定性、速度、code 量、合規）{'\n'}6. 提供改寫後嘅完整 code，附 retry + rate limit{'\n'}7. 如果對方 API 用 GraphQL，點樣 introspect schema 同 query</div>
      </div>
    </div>
  );
}

export default function WebScraperLevels() {
  return (
    <>
      <TopicTabs
        title="Web Scraper 三個層次"
        subtitle="Intern 抓 HTML、Junior 偷 API、Senior 設計可靠系統"
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
