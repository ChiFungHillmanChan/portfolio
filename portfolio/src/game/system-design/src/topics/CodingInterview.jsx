import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'star-method', label: 'STAR 面試法' },
  { slug: 'interview-process', label: 'Big Tech 面試流程' },
  { slug: 'backend-roadmap', label: 'Backend 學習路線' },
  { slug: 'junior-vs-senior', label: 'Junior vs Senior Engineer' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Coding Interview 嘅真正考核重點</h2>
      <div className="subtitle">重點係：寫 code 只係一部分，面試官更加睇面試者點樣思考同溝通</div>
      <p>
        好多人以為 coding interview 就係考識唔識寫 code。但事實係：面試官真正想睇嘅，係面試者點樣解決問題——包括點樣理解題目、點樣問問題、點樣規劃方案，同埋係咪一個容易合作嘅人。就算最後嘅 code 唔係 100% 完美，只要展示到良好嘅溝通能力，一樣可以過關。重點係記住呢一點。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#6366f1" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#252840" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2e28" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a2518" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <marker id="arrowPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
            <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#22c55e" />
            </marker>
            <marker id="arrowAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Title */}
          <text x="400" y="30" textAnchor="middle" fill="#9ca3af" fontSize="13" fontWeight="600">Coding Interview 流程圖</text>

          {/* Step 1: Question */}
          <g transform="translate(280,50)">
            <rect width="240" height="60" rx="12" fill="url(#gradPurple)" stroke="#6366f1" strokeWidth="2" filter="url(#glowPurple)" />
            <text x="120" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">面試官出題</text>
            <text x="120" y="46" textAnchor="middle" fill="#9ca3af" fontSize="11">「請寫一個 Battleship 遊戲」</text>
          </g>

          {/* Arrow down */}
          <path d="M400,112 C400,128 400,132 400,145" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowPurple)" />

          {/* Step 2: Clarify */}
          <g transform="translate(260,148)">
            <rect width="280" height="70" rx="12" fill="url(#gradGreen)" stroke="#22c55e" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="140" y="25" textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="700">釐清問題（超重要！）</text>
            <text x="140" y="43" textAnchor="middle" fill="#9ca3af" fontSize="10.5">「Grid 幾大？可以疊船嗎？」</text>
            <text x="140" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10.5">列出假設，問面試官啱唔啱</text>
          </g>

          {/* Arrow down */}
          <path d="M400,220 C400,234 400,238 400,250" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowGreen)" />

          {/* Step 3: Plan */}
          <g transform="translate(270,253)">
            <rect width="260" height="60" rx="12" fill="url(#gradAmber)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow)" />
            <text x="130" y="25" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="700">講出計劃</text>
            <text x="130" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10.5">「會先寫 Ship 同 Player 嘅 class...」</text>
          </g>

          {/* Arrow down */}
          <path d="M400,315 C400,328 400,332 400,345" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arrowAmber)" />

          {/* Step 4: Code */}
          <g transform="translate(280,348)">
            <rect width="240" height="55" rx="12" fill="url(#gradPurple)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow)" />
            <text x="120" y="25" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">寫 Code + 溝通</text>
            <text x="120" y="43" textAnchor="middle" fill="#9ca3af" fontSize="10.5">邊寫邊解釋思路</text>
          </g>

          {/* Side labels */}
          <g transform="translate(30,165)">
            <rect width="180" height="48" rx="10" fill="rgba(34,197,94,0.08)" stroke="#22c55e" strokeWidth="1" strokeDasharray="4,3" />
            <text x="90" y="20" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="600">呢一步最多人跳過</text>
            <text x="90" y="36" textAnchor="middle" fill="#4ade80" fontSize="10">但係最影響結果！</text>
          </g>
          <path d="M212,189 C230,187 245,185 258,183" stroke="#22c55e" strokeWidth="1" strokeDasharray="4,3" fill="none" />

          <g transform="translate(590,270)">
            <rect width="170" height="48" rx="10" fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" />
            <text x="85" y="20" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">唔好靜靜雞寫</text>
            <text x="85" y="36" textAnchor="middle" fill="#fbbf24" fontSize="10">要講出諗緊乜</text>
          </g>
          <path d="M588,294 C565,292 548,291 532,290" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" fill="none" />
        </svg>
      </div>

      <h3>面試官真正想知嘅三樣嘢</h3>
      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong>點樣釐清模糊嘅需求</strong>——會唔會直接衝去寫，定係先搞清楚題目？呢個分別好大。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong>點樣解決問題</strong>——思路清唔清晰？識唔識將大問題拆細？必須養成呢個習慣。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong>合作起嚟係咩感覺</strong>——如果入到公司，一齊做 project 會唔會順暢？呢個先係決定性嘅因素。</span>
        </li>
      </ol>

      <div className="highlight-box amber">
        <h4>重點</h4>
        <p>就算最後嘅 code 唔係 100% 完美，只要展示到強嘅溝通能力，一樣可以進入下一輪（通常係 System Design）。好多人就係靠溝通過關嘅。</p>
      </div>
    </div>
  );
}

function FailVsPassTab() {
  return (
    <div className="card">
      <h2>肥佬 vs 過關 — 同一條題目，兩種做法</h2>
      <div className="subtitle">用 Battleship 做例子，睇清兩種人嘅分別</div>
      <p>
        想像一下呢個情景：面試官叫面試者寫一個 Battleship 遊戲。同一條題目，一個人直接衝去寫 code，另一個人先問清楚先開始。結果完全唔同。以下逐步拆解。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow2" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.25" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowGreen2" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.25" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradPurple2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#252840" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradRed2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a1a1a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradGreen2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2e28" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>

          {/* Question at top */}
          <g transform="translate(250,10)">
            <rect width="300" height="50" rx="10" fill="url(#gradPurple2)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow2)" />
            <text x="150" y="22" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="700">面試官：「請寫一個 Battleship 遊戲」</text>
            <text x="150" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">同一條題目，兩種反應</text>
          </g>

          {/* Split curves */}
          <path d="M400,62 C350,75 280,85 200,95" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,3" fill="none" />
          <path d="M400,62 C450,75 520,85 600,95" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4,3" fill="none" />

          {/* FAIL SIDE */}
          <g transform="translate(40,95)">
            <rect width="320" height="370" rx="14" fill="rgba(239,68,68,0.05)" stroke="#ef4444" strokeWidth="1.5" />
            <text x="160" y="28" textAnchor="middle" fill="#f87171" fontSize="14" fontWeight="700">肥佬做法</text>

            <g transform="translate(20,45)">
              <rect width="280" height="44" rx="8" fill="url(#gradRed2)" stroke="#ef4444" strokeWidth="1" />
              <text x="20" y="18" fill="#f87171" fontSize="11" fontWeight="600">&#10102; 聽完題目</text>
              <text x="20" y="34" fill="#9ca3af" fontSize="10">「Okay.」（冇問任何問題）</text>
            </g>

            <g transform="translate(20,100)">
              <rect width="280" height="44" rx="8" fill="url(#gradRed2)" stroke="#ef4444" strokeWidth="1" />
              <text x="20" y="18" fill="#f87171" fontSize="11" fontWeight="600">&#10103; 直接寫 Code</text>
              <text x="20" y="34" fill="#9ca3af" fontSize="10">冇講計劃、冇解釋思路</text>
            </g>

            <g transform="translate(20,155)">
              <rect width="280" height="44" rx="8" fill="url(#gradRed2)" stroke="#ef4444" strokeWidth="1" />
              <text x="20" y="18" fill="#f87171" fontSize="11" fontWeight="600">&#10104; 全程靜靜雞</text>
              <text x="20" y="34" fill="#9ca3af" fontSize="10">面試官完全唔知對方諗緊乜</text>
            </g>

            <g transform="translate(20,210)">
              <rect width="280" height="44" rx="8" fill="url(#gradRed2)" stroke="#ef4444" strokeWidth="1" />
              <text x="20" y="18" fill="#f87171" fontSize="11" fontWeight="600">&#10105; 寫完就算</text>
              <text x="20" y="34" fill="#9ca3af" fontSize="10">「I'm done.」（冇 review、冇解釋）</text>
            </g>

            <g transform="translate(20,275)">
              <rect width="280" height="70" rx="10" fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth="1.5" filter="url(#glowRed)" />
              <text x="140" y="25" textAnchor="middle" fill="#f87171" fontSize="14" fontWeight="700">結果：肥佬</text>
              <text x="140" y="43" textAnchor="middle" fill="#9ca3af" fontSize="10">就算 code 寫啱都未必過</text>
              <text x="140" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">因為面試官唔知對方嘅思路</text>
            </g>
          </g>

          {/* PASS SIDE */}
          <g transform="translate(440,95)">
            <rect width="320" height="370" rx="14" fill="rgba(34,197,94,0.05)" stroke="#22c55e" strokeWidth="1.5" />
            <text x="160" y="28" textAnchor="middle" fill="#4ade80" fontSize="14" fontWeight="700">過關做法</text>

            <g transform="translate(20,45)">
              <rect width="280" height="44" rx="8" fill="url(#gradGreen2)" stroke="#22c55e" strokeWidth="1" />
              <text x="20" y="18" fill="#4ade80" fontSize="11" fontWeight="600">&#10102; 問清楚先</text>
              <text x="20" y="34" fill="#9ca3af" fontSize="10">「Grid 幾大？可唔可以疊船？」</text>
            </g>

            <g transform="translate(20,100)">
              <rect width="280" height="44" rx="8" fill="url(#gradGreen2)" stroke="#22c55e" strokeWidth="1" />
              <text x="20" y="18" fill="#4ade80" fontSize="11" fontWeight="600">&#10103; 講出假設</text>
              <text x="20" y="34" fill="#9ca3af" fontSize="10">「假設 grid 係 15x15，唔可以射出界」</text>
            </g>

            <g transform="translate(20,155)">
              <rect width="280" height="44" rx="8" fill="url(#gradGreen2)" stroke="#22c55e" strokeWidth="1" />
              <text x="20" y="18" fill="#4ade80" fontSize="11" fontWeight="600">&#10104; 講出計劃</text>
              <text x="20" y="34" fill="#9ca3af" fontSize="10">「會先寫 Ship 同 Player 嘅 class...」</text>
            </g>

            <g transform="translate(20,210)">
              <rect width="280" height="44" rx="8" fill="url(#gradGreen2)" stroke="#22c55e" strokeWidth="1" />
              <text x="20" y="18" fill="#4ade80" fontSize="11" fontWeight="600">&#10105; 邊寫邊講</text>
              <text x="20" y="34" fill="#9ca3af" fontSize="10">解釋每一步嘅思路同決定</text>
            </g>

            <g transform="translate(20,275)">
              <rect width="280" height="70" rx="10" fill="rgba(34,197,94,0.12)" stroke="#22c55e" strokeWidth="1.5" filter="url(#glowGreen2)" />
              <text x="140" y="25" textAnchor="middle" fill="#4ade80" fontSize="14" fontWeight="700">結果：過關</text>
              <text x="140" y="43" textAnchor="middle" fill="#9ca3af" fontSize="10">就算 code 唔係 100% 完美</text>
              <text x="140" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">溝通好一樣可以過！</text>
            </g>
          </g>
        </svg>
      </div>

      <h3>重點對比</h3>
      <div className="compare-grid">
        <div className="compare-fail">
          <h4>肥佬嘅特徵</h4>
          <ul>
            <li>聽完題目直接寫，冇問問題</li>
            <li>全程靜靜雞，面試官唔知對方諗乜</li>
            <li>冇講出假設同計劃</li>
            <li>寫完就算，冇 review</li>
          </ul>
        </div>
        <div className="compare-pass">
          <h4>過關嘅特徵</h4>
          <ul>
            <li>開始之前先問清楚、釐清需求</li>
            <li>主動講出假設，確認啱唔啱</li>
            <li>講出計劃先再動手</li>
            <li>邊寫邊解釋，展示清晰嘅思路</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ClarifyTab() {
  return (
    <div className="card">
      <h2>釐清問題 — 最多人忽略嘅一步</h2>
      <div className="subtitle">面試官出嘅題目通常都故意留低模糊空間</div>
      <p>
        以 Battleship 為例，面試官淨係講咗「請寫一個 Battleship」。但係入面有好多嘢係冇講清楚嘅——Grid 幾大？可唔可以疊船？射出界點算？呢啲全部都要主動問。以下講解點問，因為喺真實嘅工作入面，需求永遠都唔會 100% 清楚，所以呢個能力好重要。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow3" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowGreen3" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.2" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradP3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#252840" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradG3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2e28" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <marker id="arrowR3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#ef4444" />
            </marker>
          </defs>

          {/* Center: Question bubble */}
          <g transform="translate(250,20)">
            <rect width="300" height="55" rx="12" fill="url(#gradP3)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow3)" />
            <text x="150" y="23" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">「寫一個 Battleship 遊戲」</text>
            <text x="150" y="42" textAnchor="middle" fill="#9ca3af" fontSize="10">題目故意好模糊 — 要自己問清楚</text>
          </g>

          {/* Assumptions list */}
          <text x="400" y="100" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="600">正確做法：列出假設，逐個確認</text>

          {/* Assumption 1 */}
          <g transform="translate(80,115)">
            <rect width="280" height="50" rx="10" fill="url(#gradG3)" stroke="#22c55e" strokeWidth="1.5" />
            <text x="18" y="22" fill="#4ade80" fontSize="11" fontWeight="600">Grid 大小</text>
            <text x="18" y="40" fill="#9ca3af" fontSize="10">「假設 grid 係 15 x 15，啱唔啱？」</text>
          </g>

          {/* Assumption 2 */}
          <g transform="translate(440,115)">
            <rect width="280" height="50" rx="10" fill="url(#gradG3)" stroke="#22c55e" strokeWidth="1.5" />
            <text x="18" y="22" fill="#4ade80" fontSize="11" fontWeight="600">射擊規則</text>
            <text x="18" y="40" fill="#9ca3af" fontSize="10">「唔可以射出界或者射已經射過嘅格」</text>
          </g>

          {/* Assumption 3 */}
          <g transform="translate(80,180)">
            <rect width="280" height="50" rx="10" fill="#1e293b" stroke="#f87171" strokeWidth="1.5" />
            <text x="18" y="22" fill="#fbbf24" fontSize="11" fontWeight="600">疊船規則</text>
            <text x="18" y="40" fill="#9ca3af" fontSize="10">「假設可以疊船——但面試官話唔得！」</text>
          </g>

          {/* Correction arrow */}
          <g transform="translate(440,180)">
            <rect width="280" height="50" rx="10" fill="rgba(239,68,68,0.08)" stroke="#ef4444" strokeWidth="1" strokeDasharray="4,3" />
            <text x="18" y="22" fill="#f87171" fontSize="11" fontWeight="600">面試官糾正</text>
            <text x="18" y="40" fill="#9ca3af" fontSize="10">「唔可以疊船，其他都冇問題，繼續！」</text>
          </g>
          <path d="M362,205 C390,205 415,205 438,205" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" fill="none" markerEnd="url(#arrowR3)" />

          {/* Why this matters */}
          <g transform="translate(120,270)">
            <rect width="560" height="110" rx="14" fill="rgba(34,197,94,0.06)" stroke="#22c55e" strokeWidth="1.5" filter="url(#glowGreen3)" />
            <text x="280" y="28" textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="700">點解釐清問題咁重要</text>
            <text x="280" y="52" textAnchor="middle" fill="#c0c4cc" fontSize="11">① 顯示會主動思考，唔係機械式寫 code</text>
            <text x="280" y="70" textAnchor="middle" fill="#c0c4cc" fontSize="11">② 避免做錯方向，浪費晒寶貴嘅面試時間</text>
            <text x="280" y="88" textAnchor="middle" fill="#c0c4cc" fontSize="11">③ 呢個就係真實工作嘅模式——需求永遠唔會 100% 清楚</text>
          </g>
        </svg>
      </div>

      <h3>實戰點樣釐清 Battleship 嘅需求</h3>
      <ol className="steps">
        <li>
          <span className="step-num pass">1</span>
          <span><strong>聽完題目後唔好急住寫。</strong>建議先講：「有幾個問題想確認一下先開始。」呢句嘢已經加分。</span>
        </li>
        <li>
          <span className="step-num pass">2</span>
          <span><strong>列出假設。</strong>例如：「假設 grid 係 15x15、唔可以射出界、唔可以射同一格兩次。」必須主動講出嚟。</span>
        </li>
        <li>
          <span className="step-num pass">3</span>
          <span><strong>主動問唔確定嘅嘢。</strong>例如：「可唔可以將兩隻船疊埋一齊？」唔問，就永遠唔知。</span>
        </li>
        <li>
          <span className="step-num pass">4</span>
          <span><strong>接受糾正，繼續行。</strong>面試官話唔可以疊船，就調整假設：「明白，咁會加一個 validation 去檢查。」呢個反應好緊要。</span>
        </li>
      </ol>

      <div className="highlight-box green">
        <h4>秘訣</h4>
        <p>面試官故意留低模糊空間，就係想睇面試者會唔會主動問。如果乜都唔問就直接寫，面試官會覺得喺真正嘅 project 入面都唔會同團隊溝通。好多人就係輸喺呢度。</p>
      </div>
    </div>
  );
}

function CommunicateTab() {
  return (
    <div className="card">
      <h2>溝通同合作 — 脫穎而出嘅關鍵</h2>
      <div className="subtitle">點樣令面試官覺得合作起嚟好舒服</div>
      <p>
        一個好重要嘅觀念：Coding interview 唔係考試，係模擬同同事一齊工作。面試官想知道：如果入到公司，合作順唔順暢？識唔識解釋想法？會唔會主動提出方案？所以「邊寫邊講」呢個技能，一定要練。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow4" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <filter id="glowCenter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feFlood floodColor="#6366f1" floodOpacity="0.35" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="gradG4" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2e28" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradA4" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a2518" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="gradI4" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#252840" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>

          {/* Center person */}
          <g transform="translate(340,30)">
            <circle cx="60" cy="35" r="28" fill="#6366f1" opacity="0.9" filter="url(#glowCenter)" />
            <text x="60" y="40" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="600">&#128100;</text>
            <text x="60" y="80" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="500">面試者</text>
          </g>

          {/* Skill 1: Plan first */}
          <g transform="translate(40,160)">
            <rect width="210" height="80" rx="12" fill="url(#gradG4)" stroke="#22c55e" strokeWidth="2" filter="url(#shadow4)" />
            <text x="105" y="25" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="700">講出計劃</text>
            <text x="105" y="43" textAnchor="middle" fill="#9ca3af" fontSize="10">寫 code 之前先講打算</text>
            <text x="105" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">用咩 class、咩結構</text>
            <text x="105" y="72" textAnchor="middle" fill="#4ade80" fontSize="9">「會先寫 Ship 同 Player...」</text>
          </g>
          <path d="M250,155 C290,140 320,125 355,115" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4,3" fill="none" />

          {/* Skill 2: Think aloud */}
          <g transform="translate(295,190)">
            <rect width="210" height="80" rx="12" fill="url(#gradA4)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow4)" />
            <text x="105" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">邊寫邊講</text>
            <text x="105" y="43" textAnchor="middle" fill="#9ca3af" fontSize="10">解釋每一步嘅決定</text>
            <text x="105" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">遇到困難都要講出嚟</text>
            <text x="105" y="72" textAnchor="middle" fill="#fbbf24" fontSize="9">「考慮用 array 定 hashmap...」</text>
          </g>
          <path d="M400,185 C400,165 400,140 400,115" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" fill="none" />

          {/* Skill 3: Be collaborative */}
          <g transform="translate(550,160)">
            <rect width="210" height="80" rx="12" fill="url(#gradI4)" stroke="#818cf8" strokeWidth="2" filter="url(#shadow4)" />
            <text x="105" y="25" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="700">展示合作態度</text>
            <text x="105" y="43" textAnchor="middle" fill="#9ca3af" fontSize="10">接受面試官嘅建議</text>
            <text x="105" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">唔好死頂，要識 adapt</text>
            <text x="105" y="72" textAnchor="middle" fill="#a5b4fc" fontSize="9">「好建議，改一下呢度...」</text>
          </g>
          <path d="M548,155 C510,140 480,125 445,115" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4,3" fill="none" />

          {/* Bottom result */}
          <g transform="translate(200,300)">
            <rect width="400" height="45" rx="10" fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth="1.5" />
            <text x="200" y="20" textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="700">結果：就算 code 唔完美，溝通好一樣過關！</text>
            <text x="200" y="37" textAnchor="middle" fill="#9ca3af" fontSize="10">下一輪通常係 System Design Interview</text>
          </g>
        </svg>
      </div>

      <h3>溝通 Checklist</h3>
      <ul className="checklist">
        <li>
          <span className="check-icon green">&#10003;</span>
          <span><strong>開始前講計劃：</strong>「打算先定義 Ship 同 Player 嘅 class，然後再處理遊戲邏輯。」建議每次都咁做。</span>
        </li>
        <li>
          <span className="check-icon green">&#10003;</span>
          <span><strong>寫嘅時候解釋：</strong>「用 2D array 嚟代表個 grid，因為方便用座標嚟 access。」必須養成邊做邊講嘅習慣。</span>
        </li>
        <li>
          <span className="check-icon green">&#10003;</span>
          <span><strong>遇到困難要講：</strong>「而家諗緊點處理船隻重疊嘅 validation，等一陣...」千祈唔好收收埋埋。</span>
        </li>
        <li>
          <span className="check-icon green">&#10003;</span>
          <span><strong>接受 feedback：</strong>面試官提出建議，要正面回應同調整。好多人死頂，結果肥佬。</span>
        </li>
        <li>
          <span className="check-icon green">&#10003;</span>
          <span><strong>寫完之後 review：</strong>「等一等行返一次 code，check 下有冇 edge case 漏咗。」呢個動作好加分。</span>
        </li>
      </ul>

      <div className="highlight-box">
        <h4>最終重點</h4>
        <p>Coding interview 係模擬入職之後嘅工作情景。面試官揀嘅唔只係「識寫 code 嘅人」，而係「識寫 code 又溝通到嘅人」。重點就係呢個——強嘅溝通 = 過關嘅捷徑。由今日開始練，到時候一定會受惠。</p>
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
        <h4>Prompt 1 — 生成 Coding Interview 練習計劃</h4>
        <div className="prompt-text">
          {'幫手制定一個 [4 / 8 / 12 週] 嘅 Coding Interview 練習計劃。\n\n背景資料：\n- 目標公司類型：[例如：FAANG / 中型科技公司 / Startup]\n- 目前水平：[例如：識基本 Data Structure，但 Medium 題做得慢]\n- 每日可用練習時間：[例如：2 小時]\n- 主要用嘅程式語言：[例如：Python / JavaScript / Java]\n\n計劃要求：\n1. 按主題分階段（Array → String → LinkedList → Tree → Graph → DP）\n2. 每個主題列出必做嘅經典題目（Easy / Medium / Hard 比例大約 2:5:3）\n3. 每週安排 1-2 次模擬面試練習（限時 45 分鐘）\n4. 包含「溝通練習」環節——練習邊寫邊講、釐清問題、講出假設\n5. 每週有 Review Checkpoint，評估進度\n\n請用表格形式列出每週嘅計劃，包含具體題目名稱同預計完成時間。'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Mock Interview Session</h4>
        <div className="prompt-text">
          {'扮演一個嚴格但公平嘅 Coding Interview 面試官，進行一場完整嘅 Mock Interview。\n\n面試設定：\n- 難度級別：[例如：Medium / Hard]\n- 題目類型：[例如：Array + HashMap / Tree + DFS / Dynamic Programming]\n- 時間限制：45 分鐘\n- 目標公司風格：[例如：Google / Meta / Amazon]\n\n面試流程：\n1. 出一條題目（故意留低模糊空間，等面試者主動問）\n2. 面試者釐清問題時，適當回答同引導\n3. 面試者講出計劃時，評估合理性\n4. 面試者寫 code 時，適時提示（如果卡住超過 5 分鐘）\n5. 完成後畀詳細 Feedback：\n   - 溝通能力評分（1-5）\n   - 問題釐清能力評分（1-5）\n   - Code 質素評分（1-5）\n   - 整體通過機率\n   - 具體改善建議\n\n請即刻出題開始面試。'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 練習釐清問題同溝通技巧</h4>
        <div className="prompt-text">
          {'幫手設計一個專門練習 Coding Interview 溝通技巧嘅訓練。\n\n出一條 [例如：Medium 難度嘅 Design 題 / Algorithm 題]，然後：\n\n第一階段 — 釐清問題練習：\n- 列出呢條題目入面所有模糊嘅地方\n- 提供 10 個應該主動問嘅問題範例\n- 標記邊啲問題最能展示工程思維\n\n第二階段 — 假設列舉練習：\n- 示範點樣列出合理嘅假設\n- 示範點樣同面試官確認假設\n- 提供「好嘅假設」同「差嘅假設」嘅對比\n\n第三階段 — 邊寫邊講練習：\n- 提供一個完整嘅「思路講解」script 範例\n- 標記每一步應該講咩、點樣解釋決定\n- 包含遇到困難時嘅應對話術\n\n目標係建立一套可以重複使用嘅溝通 Framework。'}
        </div>
      </div>
    </div>
  );
}

export default function CodingInterview() {
  return (
    <>
      <TopicTabs
        title="點樣通過 Coding Interview"
        subtitle="喺面試中展示真正嘅實力——溝通、釐清問題、展示合作能力先係關鍵"
        tabs={[
          { id: 'overview', label: '① 全局概覽', content: <OverviewTab /> },
          { id: 'fail-vs-pass', label: '② 肥佬 vs 過關', content: <FailVsPassTab /> },
          { id: 'clarify', label: '③ 釐清問題', premium: true, content: <ClarifyTab /> },
          { id: 'communicate', label: '④ 溝通同合作', premium: true, content: <CommunicateTab /> },
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
