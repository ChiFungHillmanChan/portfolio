import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'STAR 框架入面，邊個部分應該佔答案嘅最大比例？',
    options: [
      { text: 'Situation——要詳細描述背景', correct: false, explanation: 'Situation 應該用 2-3 句講完就得，唔應該花太多時間。面試官最想聽嘅唔係背景' },
      { text: 'Action——要具體講清楚每一步做咗咩', correct: true, explanation: 'Action 應該佔成個答案嘅 60%。呢度係展示能力嘅地方——具體講做咗啲咩、點做、點解咁做。面試官最想聽嘅就係呢部分' },
      { text: 'Result——要用最多時間講成果', correct: false, explanation: 'Result 好重要但唔需要最長。有數據嘅簡潔總結加上學到嘅教訓就夠' },
      { text: 'Task——要詳細解釋任務嘅複雜性', correct: false, explanation: 'Task 同 Situation 加埋唔應該超過 30 秒。簡潔講清楚要做咩就得' },
    ],
  },
  {
    question: '面試嘅時候被問到失敗經歷，最好嘅應對策略係咩？',
    options: [
      { text: '話自己從來冇試過失敗', correct: false, explanation: '呢個答法會被認為唔夠誠實或者經驗唔足。每個工程師都會遇到問題，唔承認反而扣分' },
      { text: '坦誠面對失敗，重點講點處理危機同從中學到咩', correct: true, explanation: '面試官問失敗經歷係想睇自省能力同成長能力。坦誠承認 + 系統性處理 + 預防改善 = 最有說服力嘅答案。呢個先係加分嘅關鍵' },
      { text: '將責任推畀團隊其他成員', correct: false, explanation: '推卸責任係大忌。面試官想睇 ownership 同 accountability' },
      { text: '盡量輕描淡寫，話「其實唔算咩大事」', correct: false, explanation: '淡化問題會令面試官覺得唔夠認真，或者唔識 evaluate impact' },
    ],
  },
  {
    question: '用 STAR 答 Behavioral Question 嘅時候，應該用邊個人稱？',
    options: [
      { text: '「我哋團隊」——強調團隊合作', correct: false, explanation: '全程用「我哋」會令面試官分唔清個人貢獻。面試係評估你個人，唔係團隊' },
      { text: '「我」——清楚展示個人嘅具體貢獻同決策', correct: true, explanation: '用「我負責 X」、「我決定 Y」、「我帶領 Z」。面試官想知嘅係你個人做咗咩。可以提及團隊，但主語一定要係「我」' },
      { text: '「大家」——顯示自己好 humble', correct: false, explanation: '過度 humble 會令面試官唔知道你嘅實際能力同貢獻。呢個唔係面試嘅目的' },
      { text: '唔需要特別注意人稱', correct: false, explanation: '人稱係 behavioral interview 嘅關鍵細節。用錯人稱直接影響面試官對你能力嘅判斷' },
    ],
  },
  {
    question: '準備 Behavioral Interview 嘅最佳策略係咩？',
    options: [
      { text: '背熟所有常見問題嘅標準答案', correct: false, explanation: '背書式答案聽落唔自然，面試官一追問就露底。呢個係最差嘅策略' },
      { text: '預先整理 5-8 個真實故事，用 STAR 格式寫低，練到自然流暢', correct: true, explanation: '大部分 behavioral 問題都可以用同一批故事嚟答（角度唔同）。提前用 STAR 寫低、練到自然——到時唔係「即場作答」，而係「揀最啱嘅故事嚟講」' },
      { text: '完全唔準備，即興發揮最真實', correct: false, explanation: '即興容易答到冇結構、跑題、漏重點。STAR 框架需要練習先可以用得好' },
      { text: '上網搵範例答案，面試時照搬', correct: false, explanation: '用其他人嘅故事風險好大——面試官一追問細節就會穿崩' },
    ],
  },
  {
    question: '以下邊個係用 STAR 答題嘅常見錯誤？',
    options: [
      { text: 'Action 部分有具體步驟', correct: false, explanation: '呢個係正確做法！Action 要越具體越好' },
      { text: 'Result 有可量化嘅成果', correct: false, explanation: '呢個都係正確做法！數字令答案更有可信度' },
      { text: 'Situation 講太長，花 3 分鐘講背景', correct: true, explanation: 'Situation 講太長係最常見嘅錯誤。面試官已經唔耐煩嘅時候你仲未講到 Action。建議 Situation 同 Task 加埋唔超過 30 秒' },
      { text: '用「我」做主語', correct: false, explanation: '用「我」做主語係正確嘅。面試官想聽你個人嘅貢獻' },
    ],
  },
];

const relatedTopics = [
  { slug: 'interview-process', label: 'Big Tech 面試流程' },
  { slug: 'coding-interview', label: 'Coding Interview 攻略' },
  { slug: 'junior-vs-senior', label: 'Junior vs Senior Engineer' },
];

function StarOverviewTab() {
  return (
    <div className="card">
      <h2>STAR 方法係咩？</h2>
      <div className="subtitle">Situation → Task → Action → Result</div>
      <p>
        Behavioral interview（行為面試）係大廠面試最常見嘅環節之一。面試官唔係想聽背書，而係想聽真實經歷過嘅故事。STAR 方法可以將任何經歷都包裝成一個有結構、有說服力嘅答案。跟住呢個方法做，一定答得好。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow1" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowS" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#6366f1" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowT" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#34d399" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowA" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowR" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#f87171" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradS" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradT" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAc" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a2518" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRe" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrowRight" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
          </defs>

          <text x="400" y="30" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">STAR 框架流程</text>

          <g transform="translate(30,60)">
            <rect width="160" height="120" rx="14" fill="url(#gradS)" stroke="#6366f1" strokeWidth="2.5" filter="url(#glowS)" />
            <circle cx="80" cy="35" r="22" fill="#6366f1" />
            <text x="80" y="42" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">S</text>
            <text x="80" y="72" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">Situation</text>
            <text x="80" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">背景係咩？</text>
            <text x="80" y="106" textAnchor="middle" fill="#9ca3af" fontSize="10">喺邊個團隊做咩？</text>
          </g>

          <path d="M195,120 C205,120 215,120 225,120" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowRight)" />

          <g transform="translate(230,60)">
            <rect width="160" height="120" rx="14" fill="url(#gradT)" stroke="#34d399" strokeWidth="2.5" filter="url(#glowT)" />
            <circle cx="80" cy="35" r="22" fill="#34d399" />
            <text x="80" y="42" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">T</text>
            <text x="80" y="72" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">Task</text>
            <text x="80" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">任務係咩？</text>
            <text x="80" y="106" textAnchor="middle" fill="#9ca3af" fontSize="10">要解決咩問題？</text>
          </g>

          <path d="M395,120 C405,120 415,120 425,120" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowRight)" />

          <g transform="translate(430,60)">
            <rect width="160" height="120" rx="14" fill="url(#gradAc)" stroke="#f59e0b" strokeWidth="2.5" filter="url(#glowA)" />
            <circle cx="80" cy="35" r="22" fill="#f59e0b" />
            <text x="80" y="42" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">A</text>
            <text x="80" y="72" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">Action</text>
            <text x="80" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">做咗啲咩？</text>
            <text x="80" y="106" textAnchor="middle" fill="#9ca3af" fontSize="10">具體步驟係點？</text>
          </g>

          <path d="M595,120 C605,120 615,120 625,120" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowRight)" />

          <g transform="translate(630,60)">
            <rect width="160" height="120" rx="14" fill="url(#gradRe)" stroke="#f87171" strokeWidth="2.5" filter="url(#glowR)" />
            <circle cx="80" cy="35" r="22" fill="#f87171" />
            <text x="80" y="42" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">R</text>
            <text x="80" y="72" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">Result</text>
            <text x="80" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">結果係點？</text>
            <text x="80" y="106" textAnchor="middle" fill="#9ca3af" fontSize="10">學到咩教訓？</text>
          </g>

          <g transform="translate(120,220)">
            <rect width="560" height="90" rx="14" fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6,4" />
            <text x="280" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">面試官想聽嘅係</text>
            <text x="280" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">唔係識咩技術，而係遇到問題時點樣思考、點樣行動、點樣收尾</text>
            <text x="280" y="72" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">STAR = 有結構嘅故事 = 令人信服嘅答案</text>
          </g>
        </svg>
      </div>

      <div className="quote-block">
        <p>「Tell me about a time when...」— 幾乎所有 behavioral question 都係呢個格式。需要一個框架去組織答案，STAR 就係呢個框架。</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>點解一定要用 STAR</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>防止答到一舊飯咁。</strong>好多人一緊張就東拉西扯，STAR 幫助保持結構清晰，唔會跑題。靠呢個框架做安全網。</span></li>
        <li><span className="step-num">2</span><span><strong>確保答到重點。</strong>面試官想聽嘅係「做咗啲咩」同「結果係點」。STAR 確保唔會只講背景唔講行動。建議比例係 Action 佔 60%。</span></li>
        <li><span className="step-num">3</span><span><strong>展示思考過程。</strong>大廠面試最重視嘅唔係答案本身，而係點樣去思考同解決問題。STAR 幫助將呢啲展示出嚟。</span></li>
      </ol>

      <div className="use-case">
        <h4>建議用喺呢啲場景</h4>
        <p>Amazon Leadership Principles 面試、Google Behavioral Round、Meta System Design 嘅 follow-up 問題——全部都可以用 STAR 嚟答。準備好幾個故事，就可以應付大部分情況。</p>
      </div>
    </div>
  );
}

function StarExampleTab() {
  return (
    <div className="card">
      <h2>真實示範：「講一次 deploy 炸咗 Production」</h2>
      <div className="subtitle">Describe a time where you deployed code that took down a production environment</div>
      <p>
        用一個真實例子嚟示範，STAR 框架點樣將一個「出事」嘅經歷變成一個加分嘅答案。重點係：好多人怕講自己搞砸嘅嘢，但面試官其實最欣賞嘅係點樣處理危機同從中學習。唔好迴避失敗——呢個先係加分嘅關鍵。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 580" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow2" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowAction" x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.25" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradSit" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradTsk" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAct" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#2a2518" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRes" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#2a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto">
              <path d="M0,0 L4,8 L8,0 Z" fill="#6366f1" />
            </marker>
          </defs>

          <text x="400" y="30" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">STAR 示範：Production Incident</text>

          <g transform="translate(40,50)">
            <rect width="720" height="90" rx="14" fill="url(#gradSit)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow2)" />
            <circle cx="40" cy="45" r="24" fill="#6366f1" />
            <text x="40" y="52" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">S</text>
            <text x="80" y="30" fill="#a5b4fc" fontSize="13" fontWeight="700">Situation — 背景</text>
            <text x="80" y="50" fill="#c0c4cc" fontSize="11">喺 Amazon 做 Network Automation Team 嘅 Software Engineer</text>
            <text x="80" y="68" fill="#c0c4cc" fontSize="11">負責一套 Microservices，每日處理大約 1,000 萬個 requests</text>
          </g>

          <path d="M400,145 C400,155 400,160 400,170" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowDown)" />

          <g transform="translate(40,175)">
            <rect width="720" height="90" rx="14" fill="url(#gradTsk)" stroke="#34d399" strokeWidth="2" filter="url(#shadow2)" />
            <circle cx="40" cy="45" r="24" fill="#34d399" />
            <text x="40" y="52" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">T</text>
            <text x="80" y="30" fill="#34d399" fontSize="13" fontWeight="700">Task — 任務</text>
            <text x="80" y="50" fill="#c0c4cc" fontSize="11">負責將一個 Legacy Service 由 Java 8 升級去 Java 17</text>
            <text x="80" y="68" fill="#c0c4cc" fontSize="11">目的：提升系統嘅可維護性同效能</text>
          </g>

          <path d="M400,270 C400,280 400,285 400,295" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowDown)" />

          <g transform="translate(40,300)">
            <rect width="720" height="130" rx="14" fill="url(#gradAct)" stroke="#f59e0b" strokeWidth="2" filter="url(#glowAction)" />
            <circle cx="40" cy="65" r="24" fill="#f59e0b" />
            <text x="40" y="72" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">A</text>
            <text x="80" y="25" fill="#fbbf24" fontSize="13" fontWeight="700">Action — 做咗啲咩</text>
            <text x="80" y="46" fill="#c0c4cc" fontSize="11">1. 喺本地升級 JDK 17，修正 encapsulation 差異造成嘅問題</text>
            <text x="80" y="64" fill="#c0c4cc" fontSize="11">2. Deploy 去 Test 環境 → 通過；再 deploy 去 Pre-prod 環境跑真實流量一個禮拜</text>
            <text x="80" y="82" fill="#c0c4cc" fontSize="11">3. 同另一位工程師一齊做 Controlled Deployment 去 Production</text>
            <text x="80" y="100" fill="#f87171" fontSize="11" fontWeight="600">4. 5 分鐘內客戶投訴 → 確認同 deploy 相關 → 即刻 rollback → 服務恢復</text>
            <text x="80" y="118" fill="#34d399" fontSize="11">5. 搵到 root cause：Prod 同 Pre-prod 嘅 runtime 設定有差異</text>
          </g>

          <path d="M400,435 C400,445 400,450 400,460" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowDown)" />

          <g transform="translate(40,465)">
            <rect width="720" height="90" rx="14" fill="url(#gradRes)" stroke="#f87171" strokeWidth="2" filter="url(#shadow2)" />
            <circle cx="40" cy="45" r="24" fill="#f87171" />
            <text x="40" y="52" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">R</text>
            <text x="80" y="30" fill="#f87171" fontSize="13" fontWeight="700">Result — 結果同改善</text>
            <text x="80" y="50" fill="#c0c4cc" fontSize="11">寫咗詳細嘅 Post-mortem 文件，記錄成件事嘅時間線同 root cause</text>
            <text x="80" y="68" fill="#c0c4cc" fontSize="11">建立咗新嘅 Alarm 同 Test Case，確保同類問題唔會再發生</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>逐步拆解</h3>
      <ol className="steps">
        <li><span className="step-num">S</span><span><strong>Situation：</strong>喺 Amazon 做 Network Automation Team，負責一套每日處理 1,000 萬 requests 嘅 Microservices。重點係畀面試官知道規模同責任範圍——唔好太長，2-3 句就夠。</span></li>
        <li><span className="step-num">T</span><span><strong>Task：</strong>將 Legacy Service 由 Java 8 升去 Java 17，目的係提升可維護性同效能。建議簡潔講清楚要做咩就得，唔好喺呢度花太多時間。</span></li>
        <li><span className="step-num">A</span><span><strong>Action：</strong>呢度係最重要嘅部分——必須講清楚每一步做咗啲咩：本地修 bug → test 環境 → pre-prod 跑一個禮拜 → controlled deployment → 出事後即刻 rollback → 搵 root cause。要展示系統性思維。</span></li>
        <li><span className="step-num">R</span><span><strong>Result：</strong>寫 post-mortem、建 alarm 同 test case。面試官想聽嘅唔只係「搞掂咗」，而係有冇從中學到嘢、有冇建立防止再犯嘅機制。一定要講呢部分。</span></li>
      </ol>

      <div className="use-case">
        <h4>點解呢個答案好</h4>
        <p>呢個答案好就好在冇迴避失敗——反而展示咗冷靜處理危機嘅能力、系統性嘅 debug 思維、同埋預防再犯嘅改善行動。重點係：面試官唔係想聽樣樣完美，而係想睇遇到問題時嘅反應。</p>
      </div>
    </div>
  );
}

function StarTipsTab() {
  return (
    <div className="card">
      <h2>答 Behavioral 問題嘅實戰技巧</h2>
      <div className="subtitle">點樣用 STAR 答得好、答得有說服力</div>
      <p>
        識 STAR 框架唔代表識答。好多人知道 STAR，但一開口就犯晒典型錯誤。以下係幾個最關鍵嘅技巧，幫助由「識框架」變成「答得好」。呢啲全部係實戰經驗。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow3" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowWrong" x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#f87171" floodOpacity="0.15" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowRight" x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#34d399" floodOpacity="0.15" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradWrong" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradCorrect" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
          </defs>

          <text x="400" y="30" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">常見錯誤 vs 正確做法</text>

          <g transform="translate(30,55)">
            <rect width="355" height="310" rx="14" fill="url(#gradWrong)" stroke="#f87171" strokeWidth="2" filter="url(#glowWrong)" />
            <text x="177" y="30" textAnchor="middle" fill="#f87171" fontSize="14" fontWeight="700">常見錯誤</text>
            <line x1="20" y1="45" x2="335" y2="45" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="72" fill="#f87171" fontSize="11" fontWeight="600">1. Situation 講太長</text>
            <text x="25" y="90" fill="#9ca3af" fontSize="10">花 3 分鐘講背景，面試官已經唔耐煩</text>
            <text x="20" y="118" fill="#f87171" fontSize="11" fontWeight="600">2. Action 太模糊</text>
            <text x="25" y="136" fill="#9ca3af" fontSize="10">「我哋一齊解決咗問題」— 個人做咗咩？</text>
            <text x="20" y="164" fill="#f87171" fontSize="11" fontWeight="600">3. 用「我哋」代替「我」</text>
            <text x="25" y="182" fill="#9ca3af" fontSize="10">面試官想知個人嘅貢獻，唔係團隊</text>
            <text x="20" y="210" fill="#f87171" fontSize="11" fontWeight="600">4. 冇 Result</text>
            <text x="25" y="228" fill="#9ca3af" fontSize="10">講完做咗咩就停，冇交代結果同學到咩</text>
            <text x="20" y="256" fill="#f87171" fontSize="11" fontWeight="600">5. 迴避失敗經歷</text>
            <text x="25" y="274" fill="#9ca3af" fontSize="10">答「我冇試過出問題」= 冇可信度</text>
            <text x="25" y="292" fill="#9ca3af" fontSize="10">或者經驗唔夠豐富</text>
          </g>

          <g transform="translate(415,55)">
            <rect width="355" height="310" rx="14" fill="url(#gradCorrect)" stroke="#34d399" strokeWidth="2" filter="url(#glowRight)" />
            <text x="177" y="30" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">正確做法</text>
            <line x1="20" y1="45" x2="335" y2="45" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="72" fill="#34d399" fontSize="11" fontWeight="600">1. Situation 用 2-3 句講完</text>
            <text x="25" y="90" fill="#9ca3af" fontSize="10">公司、團隊、規模 — 夠 context 就得</text>
            <text x="20" y="118" fill="#34d399" fontSize="11" fontWeight="600">2. Action 要具體到每一步</text>
            <text x="25" y="136" fill="#9ca3af" fontSize="10">「我先做 X，然後做 Y，最後做 Z」</text>
            <text x="20" y="164" fill="#34d399" fontSize="11" fontWeight="600">3. 用「我」做主語</text>
            <text x="25" y="182" fill="#9ca3af" fontSize="10">「我負責 X」、「我決定 Y」、「我帶領 Z」</text>
            <text x="20" y="210" fill="#34d399" fontSize="11" fontWeight="600">4. Result 要有具體數據或改善</text>
            <text x="25" y="228" fill="#9ca3af" fontSize="10">「之後再冇出過同類 incident」</text>
            <text x="20" y="256" fill="#34d399" fontSize="11" fontWeight="600">5. 坦誠面對失敗 + 展示成長</text>
            <text x="25" y="274" fill="#9ca3af" fontSize="10">承認錯誤 → 講點處理 → 講學到咩</text>
            <text x="25" y="292" fill="#9ca3af" fontSize="10">呢個先係面試官想聽嘅嘢</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>5 個實戰建議</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>準備 5-8 個真實故事。</strong>建議面試前將經歷整理成 STAR 格式。大部分 behavioral 問題都可以用同一批故事嚟答，只係角度唔同。由今日開始寫。</span></li>
        <li><span className="step-num">2</span><span><strong>Action 部分要佔成個答案嘅 60%。</strong>呢度係展示能力嘅地方。建議比例：Situation 同 Task 加埋唔應該超過 30 秒。</span></li>
        <li><span className="step-num">3</span><span><strong>數字會加分。</strong>「處理 1,000 萬 requests」、「5 分鐘內 rollback」、「之後零同類 incident」——具體數字令答案更有可信度。重點係記住加數字。</span></li>
        <li><span className="step-num">4</span><span><strong>唔好怕講「搞砸咗」。</strong>面試官問失敗經歷，就係想睇有冇自省能力。坦誠 + 有改善行動 = 加分。</span></li>
        <li><span className="step-num">5</span><span><strong>練到自然為止。</strong>STAR 唔係要背稿，而係幫助組織思路。建議練到可以自然咁講出嚟，聽落似講故事而唔似背書。</span></li>
      </ol>

      <div className="pros-cons">
        <div className="pros">
          <h4>面試官會加分嘅表現</h4>
          <ul>
            <li>答案有清晰結構，唔會跑題</li>
            <li>坦誠面對自己嘅失敗同不足</li>
            <li>Action 部分有具體、可驗證嘅步驟</li>
            <li>展示從失敗中學習同改善嘅能力</li>
          </ul>
        </div>
        <div className="cons">
          <h4>面試官會扣分嘅表現</h4>
          <ul>
            <li>答案冇結構，東拉西扯</li>
            <li>全程用「我哋」，聽唔出個人做咗咩</li>
            <li>迴避問題或者答「我冇遇過」</li>
            <li>只講結果，唔講過程同思考</li>
          </ul>
        </div>
      </div>

      <div className="use-case">
        <h4>建議即刻行動</h4>
        <p>而家就可以開始準備——揀最深刻嘅 5 個工作經歷，用 STAR 寫低。面試時唔係要「即場作答」，而係「揀一個最啱嘅故事嚟講」。準備得越早，到時就越自信。</p>
      </div>
    </div>
  );
}

function StarTakeawayTab() {
  return (
    <div className="card">
      <h2>重點總結 — STAR 嘅核心精神</h2>
      <div className="subtitle">面試唔係考記性，而係考點樣面對問題</div>
      <p>
        總結好簡單：Behavioral interview 考嘅唔係有幾叻，而係遇到問題時會點做。STAR 幫助將經歷變成有說服力嘅故事，而最好嘅故事，往往係曾經搞砸、但從中學到嘢嗰啲。必須記住呢個核心。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow4" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowPlan" x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#34d399" floodOpacity="0.2" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradP4" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradG4" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradA4" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a2518" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradR4" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
          </defs>

          <text x="400" y="35" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">Action Plan</text>

          <g transform="translate(40,60)">
            <rect width="340" height="80" rx="12" fill="url(#gradP4)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow4)" />
            <circle cx="35" cy="40" r="20" fill="#6366f1" />
            <text x="35" y="46" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">1</text>
            <text x="70" y="30" fill="#fff" fontSize="12" fontWeight="600">整理經歷庫</text>
            <text x="70" y="50" fill="#9ca3af" fontSize="10.5">揀 5-8 個真實工作故事</text>
            <text x="70" y="66" fill="#6b7280" fontSize="10">涵蓋：領導力、失敗、衝突、deadline 壓力</text>
          </g>

          <g transform="translate(420,60)">
            <rect width="340" height="80" rx="12" fill="url(#gradG4)" stroke="#34d399" strokeWidth="2" filter="url(#shadow4)" />
            <circle cx="35" cy="40" r="20" fill="#34d399" />
            <text x="35" y="46" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">2</text>
            <text x="70" y="30" fill="#fff" fontSize="12" fontWeight="600">用 STAR 格式寫低每個故事</text>
            <text x="70" y="50" fill="#9ca3af" fontSize="10.5">每個故事控制喺 2 分鐘內講完</text>
            <text x="70" y="66" fill="#6b7280" fontSize="10">Action 部分要最詳細，Situation 最精簡</text>
          </g>

          <g transform="translate(40,170)">
            <rect width="340" height="80" rx="12" fill="url(#gradA4)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow4)" />
            <circle cx="35" cy="40" r="20" fill="#f59e0b" />
            <text x="35" y="46" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">3</text>
            <text x="70" y="30" fill="#fff" fontSize="12" fontWeight="600">對住鏡練習講出嚟</text>
            <text x="70" y="50" fill="#9ca3af" fontSize="10.5">講到自然流暢，唔似背稿</text>
            <text x="70" y="66" fill="#6b7280" fontSize="10">錄音聽返自己，修正語速同重點</text>
          </g>

          <g transform="translate(420,170)">
            <rect width="340" height="80" rx="12" fill="url(#gradR4)" stroke="#f87171" strokeWidth="2" filter="url(#shadow4)" />
            <circle cx="35" cy="40" r="20" fill="#f87171" />
            <text x="35" y="46" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">4</text>
            <text x="70" y="30" fill="#fff" fontSize="12" fontWeight="600">面試時靈活配對</text>
            <text x="70" y="50" fill="#9ca3af" fontSize="10.5">聽到問題 → 揀最啱嘅故事 → 用 STAR 講</text>
            <text x="70" y="66" fill="#6b7280" fontSize="10">同一個故事可以答唔同類型嘅問題</text>
          </g>

          <g transform="translate(120,285)">
            <rect width="560" height="75" rx="14" fill="rgba(52,211,153,0.1)" stroke="#34d399" strokeWidth="2" filter="url(#glowPlan)" />
            <text x="280" y="30" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">記住：最好嘅答案來自真實經歷</text>
            <text x="280" y="52" textAnchor="middle" fill="#9ca3af" fontSize="11">唔需要完美嘅故事，只需要真實嘅故事 + 清晰嘅結構</text>
            <text x="280" y="68" textAnchor="middle" fill="#9ca3af" fontSize="11">STAR 唔係模板，而係幫助講好故事嘅工具</text>
          </g>
        </svg>
      </div>

      <div className="quote-block">
        <p>「Software Engineer 嘅使命就係解決已知嘅問題，同時發現新嘅問題去解決。」— 面試考嘅都係呢件事。</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>最後忠告</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>唔好怕講失敗。</strong>上面嘅例子——deploy 炸咗 production——但用 STAR 將呢件事變成咗一個展示危機處理能力嘅加分項。必須學識呢種轉化。</span></li>
        <li><span className="step-num">2</span><span><strong>展示系統性思維。</strong>即刻 rollback → 搵 root cause → 寫 post-mortem → 建立預防機制。呢個流程本身就係面試官想睇嘅嘢。建議每個故事都有呢個結構。</span></li>
        <li><span className="step-num">3</span><span><strong>面試前做功課。</strong>建議了解間公司重視咩 values（例如 Amazon 嘅 Leadership Principles），然後揀啱嘅故事去配對。</span></li>
        <li><span className="step-num">4</span><span><strong>由今日開始準備。</strong>唔好等到收到面試通知先開始——而家就可以開始整理經歷庫，到時候一定會受惠。準備得越早越好。</span></li>
      </ol>

      <div className="use-case">
        <h4>最後一句</h4>
        <p>Behavioral interview 唔係要做完美嘅人，而係要做一個識面對問題、識反思、識改善嘅工程師。每一次失敗，都係最有價值嘅面試素材。呢個就係核心道理。</p>
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
        <h4>Prompt 1 — 生成 STAR 格式面試答案</h4>
        <div className="prompt-text">
          {`幫手用 STAR 框架撰寫一個 Behavioral Interview 嘅答案。

面試問題：[例如：Tell me about a time when you had to deal with a tight deadline]

背景資料：
- 職位：[Software Engineer / Frontend Developer / Backend Developer]
- 公司類型：[大廠 / Startup / 中型企業]
- 相關經歷簡述：[簡單描述發生過嘅事件]

要求：
- 嚴格跟 STAR 格式：Situation → Task → Action → Result
- Situation 同 Task 加埋唔超過 30 秒（2-3 句）
- Action 部分佔成個答案嘅 60%，要有具體步驟
- Result 要有數據或可量化嘅成果
- 總長度控制喺 2 分鐘以內講完
- 用第一人稱「I」做主語，強調個人貢獻
- 最後附一段精簡版本（30 秒 elevator pitch）`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Behavioral Interview 模擬練習</h4>
        <div className="prompt-text">
          {`扮演一個 [Amazon / Google / Meta / Microsoft] 嘅 Behavioral Interview 面試官，進行模擬面試。

設定：
- 應徵職位：[Software Engineer L4 / Senior SWE / Engineering Manager]
- 面試輪次：Behavioral Round（45 分鐘）
- 重點考核：[Leadership / Conflict Resolution / Failure Handling / Teamwork]

流程：
1. 先問一條 behavioral question
2. 等回答之後，用 STAR 框架評分（S/T/A/R 各 1-5 分）
3. 指出答案嘅優點同可以改善嘅地方
4. 提供 follow-up question（面試官通常會追問嘅問題）
5. 之後再問下一條，模擬真實面試節奏
6. 最後俾一個整體評價同改善建議

一共問 [3 / 5] 條問題，涵蓋唔同類型嘅 behavioral competency。`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 建立個人 STAR 故事庫</h4>
        <div className="prompt-text">
          {`幫手整理一個完整嘅 STAR 故事庫，準備 Behavioral Interview。

個人背景：
- 工作年資：[1-3 年 / 3-5 年 / 5+ 年]
- 目標公司：[FAANG / Startup / 特定公司名]
- 過往經歷重點：[列出 3-5 個印象最深嘅工作經歷]

要求：
1. 根據提供嘅經歷，整理成 5-8 個 STAR 格式嘅故事
2. 每個故事標記適合回答邊類問題（Leadership、Conflict、Failure、Innovation、Teamwork、Deadline Pressure）
3. 建立一個配對表：常見 behavioral question → 最適合用邊個故事
4. 每個故事提供精簡版（30 秒）同完整版（2 分鐘）
5. 標記每個故事嘅「數字亮點」（例如：影響幾多用戶、節省幾多時間）
6. 最後俾一個準備 checklist 同練習計劃`}
        </div>
      </div>
    </div>
  );
}

export default function StarMethod() {
  return (
    <>
      <TopicTabs
        title="STAR 面試法 — 用故事征服 Behavioral Interview"
        subtitle="用 Situation → Task → Action → Result 嘅框架，答好每一條行為面試題"
        tabs={[
          { id: 'star-overview', label: '① 咩係 STAR', content: <StarOverviewTab /> },
          { id: 'star-example', label: '② 真實示範', content: <StarExampleTab /> },
          { id: 'star-tips', label: '③ 答題技巧', premium: true, content: <StarTipsTab /> },
          { id: 'star-takeaway', label: '④ 重點總結', premium: true, content: <StarTakeawayTab /> },
          { id: 'ai-viber', label: '⑤ AI Viber', premium: true, content: <AIViberTab /> },
          { id: 'quiz', label: '⑥ Quiz', premium: true, content: <QuizRenderer data={quizData} /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
