import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '喺 AI 時代，Software Engineer 最唔容易被取代嘅能力係咩？',
    options: [
      { text: '打字速度同背語法', correct: false, explanation: '打字同背語法係 AI 最容易取代嘅部分' },
      { text: '理解模糊需求、做 trade-off 決策、同 stakeholder 溝通嘅能力', correct: true, explanation: '啱！AI 擅長寫 code，但理解商業需求、喺唔確定情況下做決策、同非技術人員溝通，呢啲軟技能係 AI 短期內取代唔到嘅' },
      { text: '識幾多種 programming language', correct: false, explanation: 'AI 可以寫幾乎任何語言嘅 code，識多種語言唔再係核心優勢' },
      { text: '寫 boilerplate code 嘅能力', correct: false, explanation: 'Boilerplate code 正正係 AI 最擅長生成嘅' },
    ],
  },
  {
    question: '「AI 會取代 Software Engineer」呢個論點最大嘅問題係咩？',
    options: [
      { text: 'AI 嘅計算速度唔夠快', correct: false, explanation: 'AI 速度唔係問題，問題喺於理解力同判斷力' },
      { text: '叫人轉行嘅人通常唔係真正嘅工程師，佢哋唔了解 Software Engineering 嘅真正工作範圍', correct: true, explanation: '啱！Software Engineering 唔止係寫 code，仲包括需求分析、架構設計、debugging、維護、團隊協作等。唔做呢行嘅人容易低估呢啲工作嘅複雜性' },
      { text: '因為 AI 太貴', correct: false, explanation: 'AI 工具嘅成本持續下降，呢個唔係核心問題' },
      { text: '因為法律唔允許 AI 寫 code', correct: false, explanation: '冇呢條法律，AI 寫 code 係合法嘅' },
    ],
  },
  {
    question: 'AI 時代嘅 Software Engineer 應該點樣適應？',
    options: [
      { text: '完全唔用 AI 工具，證明自己唔靠 AI', correct: false, explanation: '拒絕用 AI 工具反而會令自己生產力落後' },
      { text: '善用 AI 工具提升生產力，同時專注發展 AI 取代唔到嘅能力（系統設計、架構決策、溝通協作）', correct: true, explanation: '啱！最聰明嘅做法係將 AI 當做強大嘅工具，用佢嚟加速 routine 工作，自己專注喺更高層次嘅設計同決策' },
      { text: '轉行做 AI 研究員', correct: false, explanation: '唔係所有人都適合做 AI 研究，而且 Software Engineering 本身仍然有巨大需求' },
      { text: '只學 Prompt Engineering 就夠', correct: false, explanation: 'Prompt Engineering 只係其中一個技能，唔可以取代紮實嘅工程能力' },
    ],
  },
];

const relatedTopics = [
  { slug: 'coding-agent-design', label: 'Coding Agent 設計' },
  { slug: 'backend-roadmap', label: 'Backend 學習路線' },
  { slug: 'coding-interview', label: 'Coding Interview 攻略' },
  { slug: 'junior-vs-senior', label: 'Junior vs Senior Engineer' },
];

function CoreDebateTab() {
  return (
    <div className="card">
      <h2>AI 取代工程師？— 正反雙方</h2>
      <div className="subtitle">留意：叫人轉行嘅人，自己幾乎從來都唔係真正嘅工程師</div>
      <p>
        一個好大膽嘅問題：「喺 AI 年代，Software Developer 係咪應該轉行？」有啲人會話「絕對係」，但事實並非如此。留意下，叫人轉行嘅人，自己幾乎都唔係做 Software Engineering 嘅。必須學識分辨呢啲聲音。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow1" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowVs" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.4" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradRed1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGrn1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
          </defs>

          <text x="400" y="35" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">AI 時代：Software Engineer 嘅定位</text>

          <g transform="translate(40,60)">
            <rect width="320" height="160" rx="14" fill="url(#gradRed1)" stroke="#f87171" strokeWidth="2" filter="url(#shadow1)" />
            <text x="160" y="32" textAnchor="middle" fill="#f87171" fontSize="14" fontWeight="700">「AI 會取代工程師」派</text>
            <line x1="30" y1="45" x2="290" y2="45" stroke="#2a2d3a" strokeWidth="1" />
            <text x="30" y="70" fill="#9ca3af" fontSize="11">講嘅人：管理層、媒體、KOL</text>
            <text x="30" y="92" fill="#fbbf24" fontSize="11">Leaders 話員工用 AI 生產力大增</text>
            <text x="30" y="114" fill="#9ca3af" fontSize="11">覺得 AI 可以寫晒所有 Code</text>
            <text x="30" y="136" fill="#9ca3af" fontSize="11">覺得工程師 = 打字員</text>
          </g>

          <g transform="translate(440,60)">
            <rect width="320" height="160" rx="14" fill="url(#gradGrn1)" stroke="#34d399" strokeWidth="2" filter="url(#shadow1)" />
            <text x="160" y="32" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">「工程師唔會被取代」派</text>
            <line x1="30" y1="45" x2="290" y2="45" stroke="#2a2d3a" strokeWidth="1" />
            <text x="30" y="70" fill="#9ca3af" fontSize="11">講嘅人：真正做 Engineering 嘅人</text>
            <text x="30" y="92" fill="#34d399" fontSize="11">大部分 IC 話 AI 提速幅度好細</text>
            <text x="30" y="114" fill="#9ca3af" fontSize="11">工程師嘅核心工作從來唔係打 Code</text>
            <text x="30" y="136" fill="#9ca3af" fontSize="11">系統設計、Trade-off 先係重點</text>
          </g>

          <g transform="translate(370,120)">
            <circle cx="30" cy="25" r="24" fill="#6366f1" opacity="0.9" filter="url(#glowVs)" />
            <text x="30" y="31" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800">VS</text>
          </g>

          <g transform="translate(120,260)">
            <rect width="560" height="130" rx="14" fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6,4" />
            <text x="280" y="30" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">現實嘅落差（Perception Gap）</text>
            <line x1="40" y1="45" x2="520" y2="45" stroke="#2a2d3a" strokeWidth="1" />
            <g transform="translate(30,55)">
              <rect width="230" height="55" rx="8" fill="rgba(248,113,113,0.1)" stroke="#f87171" strokeWidth="1" />
              <text x="115" y="22" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">管理層嘅感覺</text>
              <text x="115" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">「AI 令生產力大幅提升！」</text>
            </g>
            <g transform="translate(300,55)">
              <rect width="230" height="55" rx="8" fill="rgba(52,211,153,0.1)" stroke="#34d399" strokeWidth="1" />
              <text x="115" y="22" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">IC 工程師嘅現實</text>
              <text x="115" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">「提速好有限，negligible speed ups」</text>
            </g>
          </g>
        </svg>
      </div>

      <div className="quote-block">
        <p>「叫人轉行嘅人，自己幾乎從來都唔係真正做 Software Engineering 嘅。」</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>核心論點</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>管理層同媒體嘅觀感同前線工程師嘅實際體驗有好大落差——Leaders 覺得 AI 好勁，但大部分 Individual Contributors 話提速好有限。唔好被表面嘅聲音嚇到。</span></li>
        <li><span className="step-num">2</span><span>話工程師會被取代嘅人，幾乎都唔係自己做 Engineering 嘅。呢啲人可能低估咗工程師真正做緊嘅嘢。必須識分辨。</span></li>
        <li><span className="step-num">3</span><span>呢個落差嘅根本原因：大部分人從來冇真正理解過 Software Engineer 實際做緊乜嘢。以下會詳細解釋。</span></li>
      </ol>

      <div className="use-case">
        <h4>值得反思</h4>
        <p>如果聽到有人話「AI 會取代工程師」，先問下：講呢句嘢嘅人，有冇實際做過 Engineering？有冇理解工程師日常做緊啲咩？養成呢個批判思維好重要。</p>
      </div>
    </div>
  );
}

function RealJobTab() {
  return (
    <div className="card">
      <h2>寫 Code 從來都唔係主要工作</h2>
      <div className="subtitle">重點：Writing code has never been the main part of the job</div>
      <p>
        好多人以為 Software Engineer = 寫 Code 嘅人。但事實係：寫 Code 從來都唔係主要嘅工作。大部分時間同精力，其實係花喺設計系統、思考 Trade-off、確保系統可靠同可擴展。以下講解點樣正確理解工程師嘅角色。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow2" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowCore" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowCode" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#fbbf24" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradCard2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradInner2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e2235" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
          </defs>

          <text x="400" y="35" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">Software Engineer 真正嘅工作分佈</text>

          <g transform="translate(120,60)">
            <circle cx="180" cy="180" r="170" fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="2" filter="url(#glowCore)" />
            <text x="180" y="90" textAnchor="middle" fill="#a5b4fc" fontSize="14" fontWeight="700">系統設計 + 決策思考</text>
            <text x="180" y="112" textAnchor="middle" fill="#6b7280" fontSize="11">（佔大部分時間同精力）</text>
            <g transform="translate(50,130)">
              <rect width="115" height="48" rx="8" fill="url(#gradInner2)" stroke="#818cf8" strokeWidth="1.5" />
              <text x="57" y="20" textAnchor="middle" fill="#818cf8" fontSize="10" fontWeight="600">設計系統架構</text>
              <text x="57" y="36" textAnchor="middle" fill="#6b7280" fontSize="9">System Design</text>
            </g>
            <g transform="translate(195,130)">
              <rect width="115" height="48" rx="8" fill="url(#gradInner2)" stroke="#818cf8" strokeWidth="1.5" />
              <text x="57" y="20" textAnchor="middle" fill="#818cf8" fontSize="10" fontWeight="600">思考 Trade-off</text>
              <text x="57" y="36" textAnchor="middle" fill="#6b7280" fontSize="9">權衡利弊</text>
            </g>
            <g transform="translate(50,200)">
              <rect width="115" height="48" rx="8" fill="url(#gradInner2)" stroke="#818cf8" strokeWidth="1.5" />
              <text x="57" y="20" textAnchor="middle" fill="#818cf8" fontSize="10" fontWeight="600">確保可靠性</text>
              <text x="57" y="36" textAnchor="middle" fill="#6b7280" fontSize="9">Reliability</text>
            </g>
            <g transform="translate(195,200)">
              <rect width="115" height="48" rx="8" fill="url(#gradInner2)" stroke="#818cf8" strokeWidth="1.5" />
              <text x="57" y="20" textAnchor="middle" fill="#818cf8" fontSize="10" fontWeight="600">確保可擴展性</text>
              <text x="57" y="36" textAnchor="middle" fill="#6b7280" fontSize="9">Extensibility</text>
            </g>
            <g transform="translate(110,270)">
              <circle cx="70" cy="40" r="48" fill="rgba(251,191,36,0.12)" stroke="#fbbf24" strokeWidth="2" filter="url(#glowCode)" />
              <text x="70" y="36" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">寫 Code</text>
              <text x="70" y="52" textAnchor="middle" fill="#fbbf24" fontSize="9">只係其中一個任務</text>
            </g>
          </g>

          <g transform="translate(510,80)">
            <rect width="250" height="310" rx="14" fill="url(#gradCard2)" stroke="#2a2d3a" strokeWidth="1.5" filter="url(#shadow2)" />
            <text x="125" y="30" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">工程師嘅核心價值</text>
            <line x1="20" y1="45" x2="230" y2="45" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="72" fill="#34d399" fontSize="11" fontWeight="600">1. 發現問題</text>
            <text x="25" y="90" fill="#9ca3af" fontSize="10">搵出系統潛在嘅風險同瓶頸</text>
            <text x="20" y="118" fill="#34d399" fontSize="11" fontWeight="600">2. 解決已知問題</text>
            <text x="25" y="136" fill="#9ca3af" fontSize="10">用最合適嘅方案去解決問題</text>
            <text x="20" y="164" fill="#34d399" fontSize="11" fontWeight="600">3. 權衡 Trade-off</text>
            <text x="25" y="182" fill="#9ca3af" fontSize="10">冇完美方案，只有最適合嘅</text>
            <text x="20" y="210" fill="#34d399" fontSize="11" fontWeight="600">4. 確保系統穩定</text>
            <text x="25" y="228" fill="#9ca3af" fontSize="10">1 小時 downtime = 百萬甚至</text>
            <text x="25" y="244" fill="#9ca3af" fontSize="10">幾億美金嘅損失</text>
            <text x="20" y="272" fill="#fbbf24" fontSize="11" fontWeight="600">5. 寫 Code（一部分）</text>
            <text x="25" y="290" fill="#9ca3af" fontSize="10">AI 可以幫手加速呢個部分</text>
          </g>
        </svg>
      </div>

      <div className="quote-block">
        <p>「Software Engineer 嘅使命係解決已知嘅問題，同時發現新嘅問題去解決。寫 Code 只係其中一個任務。」</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>點解大家會誤解</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>外行人見到工程師日日對住 IDE 打字，就以為工作就係打字。呢個好似見到醫生揸筆寫嘢，就以為工作係寫字咁荒謬。</span></li>
        <li><span className="step-num">2</span><span>寫 Code 只係將「已經想好嘅方案」實現出嚟。真正花時間嘅係——想個方案出嚟。</span></li>
        <li><span className="step-num">3</span><span>AI 可以幫手快啲寫完 Code，但幫唔到決定「應該點樣設計個系統」、「呢兩個方案邊個好」。必須記住呢個分別。</span></li>
      </ol>

      <div className="pros-cons">
        <div className="pros">
          <h4>AI 幫到手嘅地方</h4>
          <ul>
            <li>自動補全 Code</li>
            <li>寫 Boilerplate / 重複性嘅 Code</li>
            <li>快速查文件同 API 用法</li>
            <li>寫測試同 Debug 輔助</li>
          </ul>
        </div>
        <div className="cons">
          <h4>AI 暫時幫唔到嘅地方</h4>
          <ul>
            <li>判斷邊個架構方案最適合</li>
            <li>衡量 Downtime 風險同 Trade-off</li>
            <li>同 Stakeholder 溝通需求同優先級</li>
            <li>處理跨團隊嘅系統依賴關係</li>
          </ul>
        </div>
      </div>

      <div className="use-case">
        <h4>值得反思</h4>
        <p>如果覺得自己份工係「寫 Code」，咁真係有機會被 AI 取代。但如果理解自己嘅角色係「解決問題」，AI 只係手上多咗一件好好用嘅工具。呢個就係關鍵嘅思維轉變。</p>
      </div>
    </div>
  );
}

function MarketDemandTab() {
  return (
    <div className="card">
      <h2>市場需求反而增加</h2>
      <div className="subtitle">每一間公司而家都想 build 更多 software，唔係更少</div>
      <p>好多人驚 AI 會令工程師冇工做。但現實恰恰相反——每一間公司而家都想 build 更多 software，唔係更少。AI 唔係令工程師消失，而係令工程師更加有價值，因為公司需要工程師去善用 AI 嘅能力嚟 build 得更快。以下詳細解釋。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 430" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow3" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowEng" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradAmb3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a2518" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPur3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGrn3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrowOrangeM" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arrowBlueM" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
          </defs>

          <text x="400" y="35" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">AI 時代嘅市場動態</text>

          <g transform="translate(40,60)">
            <rect width="210" height="110" rx="12" fill="url(#gradAmb3)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow3)" />
            <text x="105" y="30" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="700">競爭壓力 ①</text>
            <text x="105" y="52" textAnchor="middle" fill="#9ca3af" fontSize="11">Startup 創業者用 AI</text>
            <text x="105" y="70" textAnchor="middle" fill="#9ca3af" fontSize="11">快速 build 新產品</text>
            <text x="105" y="92" textAnchor="middle" fill="#fbbf24" fontSize="10">速度越嚟越快</text>
          </g>

          <g transform="translate(40,200)">
            <rect width="210" height="110" rx="12" fill="url(#gradAmb3)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow3)" />
            <text x="105" y="30" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="700">競爭壓力 ②</text>
            <text x="105" y="52" textAnchor="middle" fill="#9ca3af" fontSize="11">大公司用 AI 加速開發</text>
            <text x="105" y="70" textAnchor="middle" fill="#9ca3af" fontSize="11">搶先推出功能</text>
            <text x="105" y="92" textAnchor="middle" fill="#fbbf24" fontSize="10">Moving faster with AI</text>
          </g>

          <path d="M252,115 C280,140 305,165 330,195" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arrowOrangeM)" />
          <path d="M252,255 C280,240 305,225 330,215" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arrowOrangeM)" />

          <g transform="translate(330,165)">
            <rect width="180" height="100" rx="14" fill="url(#gradPur3)" stroke="#6366f1" strokeWidth="2.5" filter="url(#shadow3)" />
            <text x="90" y="30" textAnchor="middle" fill="#6366f1" fontSize="13" fontWeight="700">公司</text>
            <text x="90" y="52" textAnchor="middle" fill="#9ca3af" fontSize="11">感受到競爭壓力</text>
            <text x="90" y="72" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">需要 build 更多更快</text>
            <text x="90" y="90" textAnchor="middle" fill="#34d399" fontSize="10">唔係減少 software！</text>
          </g>

          <path d="M512,215 C535,215 555,215 580,215" stroke="#6366f1" strokeWidth="2.5" fill="none" markerEnd="url(#arrowBlueM)" />
          <text x="546" y="205" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="500">靠邊個？</text>

          <g transform="translate(580,140)">
            <rect width="190" height="150" rx="14" fill="url(#gradGrn3)" stroke="#34d399" strokeWidth="2.5" filter="url(#glowEng)" />
            <text x="95" y="30" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Software Engineers</text>
            <text x="95" y="52" textAnchor="middle" fill="#9ca3af" fontSize="11">有 Leverage 去利用 AI</text>
            <text x="95" y="72" textAnchor="middle" fill="#9ca3af" fontSize="11">幫公司 build 更快</text>
            <line x1="20" y1="85" x2="170" y2="85" stroke="#2a2d3a" strokeWidth="1" />
            <text x="95" y="105" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">價值不跌反升</text>
            <text x="95" y="125" textAnchor="middle" fill="#34d399" fontSize="10">因為公司更加依賴工程師</text>
            <text x="95" y="140" textAnchor="middle" fill="#34d399" fontSize="10">去善用 AI 嘅能力</text>
          </g>

          <g transform="translate(180,340)">
            <rect width="430" height="70" rx="12" fill="rgba(248,113,113,0.08)" stroke="#f87171" strokeWidth="1.5" strokeDasharray="6,4" />
            <text x="215" y="25" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="600">1 小時 Downtime 嘅代價</text>
            <text x="215" y="48" textAnchor="middle" fill="#9ca3af" fontSize="11">= 百萬至幾億美金損失 &gt;&gt; 請幾個好工程師嘅成本</text>
            <text x="215" y="63" textAnchor="middle" fill="#6b7280" fontSize="10">所以公司永遠都需要好嘅 Engineer 去確保系統穩定</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>點解需求反而增加</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>Startup 競爭加劇：</strong>個個都用 AI 快速 build 產品，大公司要跟上就要 build 更多、更快。必須明白呢個連鎖反應。</span></li>
        <li><span className="step-num">2</span><span><strong>大公司之間嘅軍備賽：</strong>競爭對手用 AI 推快咗開發速度，唔跟就落後。呢個趨勢只會加速。</span></li>
        <li><span className="step-num">3</span><span><strong>工程師有 Leverage：</strong>公司視工程師為有能力善用 AI 去加速 build 嘅關鍵人物。呢個價值必須認識到。</span></li>
        <li><span className="step-num">4</span><span><strong>Downtime 成本極高：</strong>Scale 大嘅公司，1 小時故障可以蝕百萬到幾億美金，遠超請工程師嘅成本。必須理解呢個經濟邏輯。</span></li>
      </ol>

      <div className="pros-cons">
        <div className="pros">
          <h4>對工程師有利嘅趨勢</h4>
          <ul>
            <li>公司想 build 更多 software，唔係更少</li>
            <li>AI 令工程師嘅生產力提升 = 更有價值</li>
            <li>系統越嚟越複雜，更加需要專業判斷</li>
            <li>懂用 AI 嘅工程師會更搶手</li>
          </ul>
        </div>
        <div className="cons">
          <h4>需要留意嘅風險</h4>
          <ul>
            <li>只識寫 Code 但唔識思考嘅人，真係會被淘汰</li>
            <li>唔肯學用 AI 工具嘅人會被拋離</li>
            <li>Junior 工程師嘅入行門檻可能會變高</li>
            <li>某啲重複性高嘅工作確實會被 AI 取代</li>
          </ul>
        </div>
      </div>

      <div className="use-case">
        <h4>結論</h4>
        <p>AI 唔係敵人，而係工具。真正有風險嘅唔係「工程師呢個職業」，而係「唔肯進步嘅工程師」。重點就係點樣做一個會進步嘅工程師。</p>
      </div>
    </div>
  );
}

function TakeawayTab() {
  return (
    <div className="card">
      <h2>重點總結 — 並冇被 Cook</h2>
      <div className="subtitle">結論：工程師嘅工作從來都唔係寫 Code，而係解決問題</div>
      <p>結論好清晰：如果係 Software Engineer 或者打算入行，並唔係「被 cook 咗」。只需要認清一件事——工程師嘅工作從來都唔係寫 Code，而係解決問題。帶住呢個認知繼續行落去。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow4" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowResult" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradP4b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradG4b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradA4b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a2518" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradR4b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
          </defs>

          <text x="400" y="35" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">Action Plan</text>

          <g transform="translate(40,60)">
            <rect width="340" height="80" rx="12" fill="url(#gradP4b)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow4)" />
            <circle cx="35" cy="40" r="20" fill="#6366f1" />
            <text x="35" y="46" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">1</text>
            <text x="70" y="30" fill="#fff" fontSize="12" fontWeight="600">認清自己嘅角色</text>
            <text x="70" y="50" fill="#9ca3af" fontSize="10.5">工程師係 Problem Solver，唔係 Code Writer</text>
            <text x="70" y="66" fill="#6b7280" fontSize="10">工程師嘅目的 = 解決已知問題 + 發現新問題</text>
          </g>

          <g transform="translate(420,60)">
            <rect width="340" height="80" rx="12" fill="url(#gradG4b)" stroke="#34d399" strokeWidth="2" filter="url(#shadow4)" />
            <circle cx="35" cy="40" r="20" fill="#34d399" />
            <text x="35" y="46" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">2</text>
            <text x="70" y="30" fill="#fff" fontSize="12" fontWeight="600">投資喺系統設計能力</text>
            <text x="70" y="50" fill="#9ca3af" fontSize="10.5">學識點樣設計可靠、可擴展嘅系統</text>
            <text x="70" y="66" fill="#6b7280" fontSize="10">呢啲能力 AI 暫時幫唔到</text>
          </g>

          <g transform="translate(40,170)">
            <rect width="340" height="80" rx="12" fill="url(#gradA4b)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow4)" />
            <circle cx="35" cy="40" r="20" fill="#f59e0b" />
            <text x="35" y="46" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">3</text>
            <text x="70" y="30" fill="#fff" fontSize="12" fontWeight="600">善用 AI 做工具</text>
            <text x="70" y="50" fill="#9ca3af" fontSize="10.5">用 AI 加速寫 Code、Debug、寫文件</text>
            <text x="70" y="66" fill="#6b7280" fontSize="10">但記住：AI 係工具，唔係替代品</text>
          </g>

          <g transform="translate(420,170)">
            <rect width="340" height="80" rx="12" fill="url(#gradR4b)" stroke="#f87171" strokeWidth="2" filter="url(#shadow4)" />
            <circle cx="35" cy="40" r="20" fill="#f87171" />
            <text x="35" y="46" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">4</text>
            <text x="70" y="30" fill="#fff" fontSize="12" fontWeight="600">唔好淨係識寫 Code</text>
            <text x="70" y="50" fill="#9ca3af" fontSize="10.5">學識同人溝通、理解業務需求</text>
            <text x="70" y="66" fill="#6b7280" fontSize="10">只識打 Code 嘅人先會被淘汰</text>
          </g>

          <g transform="translate(120,285)">
            <rect width="560" height="75" rx="14" fill="rgba(52,211,153,0.1)" stroke="#34d399" strokeWidth="2" filter="url(#glowResult)" />
            <text x="280" y="30" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">結論：Software Engineering 仲有大把前途</text>
            <text x="280" y="52" textAnchor="middle" fill="#9ca3af" fontSize="11">但需要重新定義自己——唔係「寫 Code 嘅人」</text>
            <text x="280" y="68" textAnchor="middle" fill="#9ca3af" fontSize="11">而係「用技術解決問題嘅人」，AI 只係枱面上嘅一件新工具</text>
          </g>
        </svg>
      </div>

      <div className="quote-block">
        <p>「如果係 Software Engineer 或者打算入行，並冇被 cook。只需要認清工程師嘅工作從來都唔係寫 Code。」</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>最後忠告</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>並冇被「Cook」。</strong>Software Engineering 唔會消失，但定義會進化。做一個適應能力強嘅工程師——呢種人會更加吃香。</span></li>
        <li><span className="step-num">2</span><span><strong>重新理解工程師嘅價值。</strong>價值唔係喺打字速度，而係喺思考能力——設計系統、權衡利弊、確保穩定。呢啲就係核心。</span></li>
        <li><span className="step-num">3</span><span><strong>擁抱 AI，但唔好依賴。</strong>AI 幫手寫得更快，但邊度要寫、點解要寫、寫啲乜——呢啲判斷仲係工程師嘅。必須牢牢掌握呢個主導權。</span></li>
        <li><span className="step-num">4</span><span><strong>由今日開始，學系統設計。</strong>呢個正正係本課程嘅目的——由「寫 Code 嘅人」進化做「設計系統嘅人」。跟住課程學落去就啱。</span></li>
      </ol>

      <div className="use-case">
        <h4>最後一句</h4>
        <p>揀咗入呢個教室，已經證明唔係淨係識寫 Code 嘅人。繼續學落去，價值只會越嚟越高。</p>
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
        <h4>Prompt 1 — 評估 AI 工具喺開發流程嘅實際價值</h4>
        <div className="prompt-text">針對 <span className="placeholder">[項目名稱，例如：電商平台後端]</span> 嘅開發流程，評估以下 AI 工具嘅實際應用價值：{'\n\n'}1. Code Autocomplete（如 GitHub Copilot）— 喺邊啲場景最有用？邊啲場景反而會拖慢速度？{'\n'}2. AI Code Review — 可以取代人工 Code Review 嘅邊啲部分？邊啲部分一定要人手做？{'\n'}3. AI Testing — 自動生成 Unit Test 嘅質素點樣？覆蓋率同可維護性點樣？{'\n\n'}針對每個工具，列出：{'\n'}- 適合嘅使用場景（具體到 Task 層面）{'\n'}- 唔適合嘅場景（會增加風險嘅情況）{'\n'}- 預計節省時間嘅百分比（保守估算）{'\n'}- 需要額外投入嘅學習成本同配置時間{'\n\n'}最後建議一個「漸進式引入」計劃，分三個月逐步整合 AI 工具到團隊工作流程。</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 AI 輔助嘅系統設計工作流程</h4>
        <div className="prompt-text">設計一個 AI-Augmented System Design 工作流程，應用喺 <span className="placeholder">[系統類型，例如：高併發即時通訊系統]</span>。{'\n\n'}核心要求：{'\n'}- 明確劃分「AI 負責」同「工程師負責」嘅職責邊界{'\n'}- AI 負責嘅範圍：Boilerplate Code 生成、API Schema 草稿、Test Case 生成、文件初稿{'\n'}- 工程師負責嘅範圍：架構決策、Trade-off 分析、安全性審查、性能調優策略{'\n\n'}請輸出以下內容：{'\n'}1. 系統設計階段嘅分工矩陣（邊啲步驟用 AI、邊啲步驟要人手）{'\n'}2. AI 生成內容嘅 Review Checklist（點樣快速驗證 AI 輸出嘅質素）{'\n'}3. 一個具體嘅例子：用 AI 生成 <span className="placeholder">[具體功能，例如：用戶認證模組]</span> 嘅初版設計，再由工程師審查同修改{'\n'}4. 衡量呢個工作流程效率嘅 KPI（例如 Time-to-Design、Bug Rate 等）</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 建立工程師技能進化路線圖</h4>
        <div className="prompt-text">基於「AI 時代工程師嘅核心價值唔係寫 Code，而係解決問題」呢個前提，設計一份為期 6 個月嘅技能進化路線圖。{'\n\n'}目標角色：<span className="placeholder">[當前職級，例如：Mid-level Backend Engineer]</span>{'\n'}目標方向：<span className="placeholder">[發展方向，例如：System Design + AI-Augmented Development]</span>{'\n\n'}路線圖需要包含：{'\n'}1. 每月嘅學習重點（由基礎到進階）{'\n'}2. 實戰項目練習（每個月至少一個 Mini Project）{'\n'}3. AI 工具熟練度目標（由「識用」到「高效運用」）{'\n'}4. 系統設計能力目標（由「理解概念」到「獨立設計」）{'\n'}5. 每個月嘅自我評估 Checklist{'\n\n'}重點係平衡「AI 工具掌握」同「系統設計思維」兩條線，唔好只偏向一邊。</div>
      </div>
    </div>
  );
}

export default function AIVsSoftwareEngineer() {
  return (
    <>
      <TopicTabs
        title="AI 時代做 Software Engineer 仲有冇前途？"
        subtitle="點解寫 Code 從來都唔係工程師嘅核心工作"
        tabs={[
          { id: 'core-debate', label: '① 核心爭論', content: <CoreDebateTab /> },
          { id: 'real-job', label: '② 真正嘅工作', content: <RealJobTab /> },
          { id: 'market-demand', label: '③ 市場需求', premium: true, content: <MarketDemandTab /> },
          { id: 'takeaway', label: '④ 重點總結', premium: true, content: <TakeawayTab /> },
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
