import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'system-design-patterns', label: '系統設計模式總覽' },
  { slug: 'backend-roadmap', label: 'Backend 學習路線' },
  { slug: 'docker', label: 'Docker 容器化' },
];

function ConceptTab() {
  return (
    <div className="card">
      <h2>咩係 Dependency Injection？</h2>
      <div className="subtitle">OOP Design Pattern — 由外部提供依賴</div>
      <p>
        Dependency Injection（依賴注入）係一個 OOP 設計模式。核心概念係：一個 Class 所需要嘅依賴，唔應該由佢自己喺內部用 <code>new</code> keyword 去建立，而係應該由外部提供（注入）畀佢。
      </p>
      <p>
        最常見嘅做法係透過 Constructor 嘅參數嚟接收依賴。噉樣做嘅好處係：Class 本身唔需要知道依賴嘅具體實作，只需要知道依賴嘅 Interface 就夠。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-external" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="grad-constructor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="grad-class" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="grad-dep" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="glow-indigo">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#6366f1" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <marker id="arrow-indigo" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8" fill="#6366f1" />
            </marker>
            <marker id="arrow-amber" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8" fill="#f59e0b" />
            </marker>
            <marker id="arrow-green" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8" fill="#34d399" />
            </marker>
          </defs>

          {/* External Caller */}
          <rect x="40" y="50" width="160" height="70" rx="14" fill="url(#grad-external)" stroke="#6366f1" strokeWidth="1.5" filter="url(#glow-indigo)" />
          <text x="120" y="82" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontWeight="600">External Caller</text>
          <text x="120" y="102" textAnchor="middle" fill="#9ca3af" fontSize="11">( Main / Factory )</text>

          {/* Dependency */}
          <rect x="40" y="210" width="160" height="70" rx="14" fill="url(#grad-dep)" stroke="#a78bfa" strokeWidth="1.5" filter="url(#shadow)" />
          <text x="120" y="242" textAnchor="middle" fill="#c4b5fd" fontSize="12" fontWeight="600">Logger</text>
          <text x="120" y="262" textAnchor="middle" fill="#9ca3af" fontSize="11">( Dependency )</text>

          {/* Constructor */}
          <rect x="320" y="110" width="160" height="70" rx="14" fill="url(#grad-constructor)" stroke="#f59e0b" strokeWidth="1.5" filter="url(#shadow)" />
          <text x="400" y="142" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="600">Constructor</text>
          <text x="400" y="162" textAnchor="middle" fill="#9ca3af" fontSize="11">( Parameter )</text>

          {/* Target Class */}
          <rect x="590" y="110" width="170" height="70" rx="14" fill="url(#grad-class)" stroke="#34d399" strokeWidth="1.5" filter="url(#shadow)" />
          <text x="675" y="142" textAnchor="middle" fill="#6ee7b7" fontSize="12" fontWeight="600">UserService</text>
          <text x="675" y="162" textAnchor="middle" fill="#9ca3af" fontSize="11">( Uses Dependency )</text>

          {/* Arrow: External -> Constructor */}
          <path d="M200,85 C260,85 260,145 320,145" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow-indigo)" />
          <text x="260" y="100" textAnchor="middle" fill="#a5b4fc" fontSize="10">new Logger()</text>

          {/* Arrow: Dependency -> Constructor */}
          <path d="M200,245 C280,245 280,155 320,155" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4" markerEnd="url(#arrow-amber)" />
          <text x="275" y="218" textAnchor="middle" fill="#fbbf24" fontSize="10">inject</text>

          {/* Arrow: Constructor -> Class */}
          <path d="M480,145 C530,145 540,145 590,145" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrow-green)" />
          <text x="535" y="135" textAnchor="middle" fill="#6ee7b7" fontSize="10">this.logger</text>

          {/* Label */}
          <text x="400" y="310" textAnchor="middle" fill="#6b7280" fontSize="12">Dependency 由外部建立，再透過 Constructor 注入到 Class 入面</text>
        </svg>
      </div>

      <ul className="steps">
        <li>
          <span className="step-num">1</span>
          <span>External Caller（例如 Main function 或者 Factory）負責建立依賴嘅 Instance，例如 <code>new Logger()</code></span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>建立好嘅依賴會透過 Constructor 嘅參數傳入目標 Class，而唔係喺 Class 內部用 <code>new</code> 建立</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>目標 Class 只需要使用依賴提供嘅方法（例如 <code>this.logger.log()</code>），完全唔需要知道依賴嘅具體實作</span>
        </li>
      </ul>

      <div className="use-case">
        <h4>關鍵在於</h4>
        <p>Class 唔負責建立自己嘅依賴 — 依賴由外部控制同注入。呢個原則叫做 Inversion of Control (IoC)。</p>
      </div>
    </div>
  );
}

function ComparisonTab() {
  return (
    <div className="card">
      <h2>冇 DI vs 有 DI</h2>
      <div className="subtitle">Tightly Coupled vs Loosely Coupled</div>
      <p>
        重點係理解兩種寫法嘅分別。冇用 DI 嘅時候，Class 會自己喺 Constructor 入面用 <code>new</code> keyword 建立依賴，造成緊密耦合（Tightly Coupled）。用咗 DI 之後，依賴由外部傳入，Class 同具體實作之間就鬆散耦合（Loosely Coupled）。
      </p>

      <div className="comparison-grid">
        <div className="comparison-col bad">
          <h4>冇 DI — Tightly Coupled</h4>
          <div className="code-block">
            <span className="keyword">class</span> <span className="class-name">UserService</span> {'{'}<br />
            &nbsp;&nbsp;<span className="func">constructor</span>() {'{'}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;<span className="comment">// 直接喺內部建立依賴</span><br />
            &nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">this</span>.logger = <span className="keyword">new</span> <span className="class-name">ConsoleLogger</span>();<br />
            &nbsp;&nbsp;{'}'}<br />
            {'}'}
          </div>
          <p>Class 自己決定用邊個 Logger — 冇辦法換走佢，測試都好難做 Mock。</p>
        </div>
        <div className="comparison-col good">
          <h4>有 DI — Loosely Coupled</h4>
          <div className="code-block">
            <span className="keyword">class</span> <span className="class-name">UserService</span> {'{'}<br />
            &nbsp;&nbsp;<span className="func">constructor</span>(<span className="param">logger</span>) {'{'}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;<span className="comment">// 依賴由外部注入</span><br />
            &nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">this</span>.logger = <span className="param">logger</span>;<br />
            &nbsp;&nbsp;{'}'}<br />
            {'}'}
          </div>
          <p>外部決定傳入邊個 Logger — 可以隨時替換，測試時傳入 Mock 就得。</p>
        </div>
      </div>

      <div className="diagram-container">
        <svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="grad-green2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="grad-neutral" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#f87171" floodOpacity="0.35" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-green">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#34d399" floodOpacity="0.35" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="shadow2">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
            <marker id="arrow-red" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8" fill="#f87171" />
            </marker>
            <marker id="arrow-green2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8" fill="#34d399" />
            </marker>
          </defs>

          {/* Section Labels */}
          <text x="200" y="30" textAnchor="middle" fill="#f87171" fontSize="14" fontWeight="700">Without DI</text>
          <text x="600" y="30" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">With DI</text>

          {/* Divider */}
          <line x1="400" y1="15" x2="400" y2="365" stroke="#2a2d3a" strokeWidth="1" strokeDasharray="8,6" />

          {/* LEFT SIDE: Without DI */}
          <rect x="80" y="60" width="240" height="80" rx="14" fill="url(#grad-red)" stroke="#f87171" strokeWidth="1.5" filter="url(#glow-red)" />
          <text x="200" y="92" textAnchor="middle" fill="#fca5a5" fontSize="13" fontWeight="600">UserService</text>
          <text x="200" y="115" textAnchor="middle" fill="#9ca3af" fontSize="11">this.logger = new Logger()</text>

          <rect x="110" y="220" width="180" height="65" rx="14" fill="url(#grad-neutral)" stroke="#64748b" strokeWidth="1.5" filter="url(#shadow2)" />
          <text x="200" y="250" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="600">ConsoleLogger</text>
          <text x="200" y="268" textAnchor="middle" fill="#6b7280" fontSize="10">( Hard-coded )</text>

          <path d="M200,140 C200,170 200,185 200,220" fill="none" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrow-red)" />
          <text x="215" y="183" fill="#f87171" fontSize="10">new</text>

          <text x="200" y="330" textAnchor="middle" fill="#f87171" fontSize="11">Cannot swap dependency</text>
          <text x="200" y="350" textAnchor="middle" fill="#6b7280" fontSize="10">Tightly Coupled</text>

          {/* RIGHT SIDE: With DI */}
          <rect x="460" y="60" width="180" height="55" rx="14" fill="url(#grad-green2)" stroke="#34d399" strokeWidth="1" filter="url(#shadow2)" />
          <text x="550" y="85" textAnchor="middle" fill="#6ee7b7" fontSize="12" fontWeight="600">External Caller</text>
          <text x="550" y="100" textAnchor="middle" fill="#9ca3af" fontSize="10">new Logger() + inject</text>

          <rect x="470" y="170" width="220" height="65" rx="14" fill="url(#grad-green2)" stroke="#34d399" strokeWidth="1.5" filter="url(#glow-green)" />
          <text x="580" y="197" textAnchor="middle" fill="#6ee7b7" fontSize="13" fontWeight="600">UserService</text>
          <text x="580" y="217" textAnchor="middle" fill="#9ca3af" fontSize="11">constructor(logger)</text>

          <rect x="440" y="290" width="120" height="55" rx="14" fill="url(#grad-neutral)" stroke="#a78bfa" strokeWidth="1" filter="url(#shadow2)" />
          <text x="500" y="315" textAnchor="middle" fill="#c4b5fd" fontSize="11" fontWeight="600">RealLogger</text>
          <text x="500" y="332" textAnchor="middle" fill="#6b7280" fontSize="9">Production</text>

          <rect x="600" y="290" width="120" height="55" rx="14" fill="url(#grad-neutral)" stroke="#fbbf24" strokeWidth="1" filter="url(#shadow2)" />
          <text x="660" y="315" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">MockLogger</text>
          <text x="660" y="332" textAnchor="middle" fill="#6b7280" fontSize="9">Testing</text>

          <path d="M550,115 C550,135 580,150 580,170" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrow-green2)" />
          <text x="590" y="143" fill="#34d399" fontSize="10">inject</text>

          <path d="M540,235 C520,260 510,270 500,290" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrow-green2)" />
          <path d="M620,235 C640,260 650,270 660,290" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrow-green2)" />

          <text x="580" y="365" textAnchor="middle" fill="#34d399" fontSize="11">Swap freely between implementations</text>
        </svg>
      </div>

      <ul className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong>冇 DI：</strong>UserService 喺 Constructor 入面直接 <code>new ConsoleLogger()</code>，同 ConsoleLogger 呢個具體實作綁死咗。想換做 FileLogger 就要改 UserService 嘅 code。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong>有 DI：</strong>UserService 嘅 Constructor 接受一個 <code>logger</code> 參數。邊個 Logger 實作由外部決定 — 可以係 RealLogger、FileLogger、甚至 MockLogger。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong>結果：</strong>UserService 完全唔知道具體用緊邊個 Logger，只要符合相同嘅 Interface 就可以注入，達到 Loosely Coupled 嘅效果。</span>
        </li>
      </ul>
    </div>
  );
}

function TestingTab() {
  return (
    <>
      <div className="card">
        <h2>DI 嘅測試優勢</h2>
        <div className="subtitle">Mock Dependencies for Unit Testing</div>
        <p>
          Dependency Injection 最大嘅實際好處之一，就係令 Unit Testing 變得簡單。重點係：當 Class 嘅依賴由外部注入，測試嘅時候就可以傳入 Mock（模擬物件），而唔需要依賴真實嘅 Service。
        </p>

        <div className="diagram-container">
          <svg viewBox="0 0 800 350" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="grad-test" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="grad-mock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="grad-target" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="grad-result" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <filter id="glow-amber">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feFlood floodColor="#fbbf24" floodOpacity="0.4" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="shadow3">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.3" />
              </filter>
              <marker id="arrow-amber2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                <path d="M0,0 L10,4 L0,8" fill="#fbbf24" />
              </marker>
              <marker id="arrow-indigo2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                <path d="M0,0 L10,4 L0,8" fill="#6366f1" />
              </marker>
              <marker id="arrow-green3" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                <path d="M0,0 L10,4 L0,8" fill="#34d399" />
              </marker>
            </defs>

            {/* Test File */}
            <rect x="40" y="60" width="180" height="80" rx="14" fill="url(#grad-test)" stroke="#fbbf24" strokeWidth="1.5" filter="url(#glow-amber)" />
            <text x="130" y="90" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="600">Unit Test</text>
            <text x="130" y="112" textAnchor="middle" fill="#9ca3af" fontSize="10">userService.test.js</text>

            {/* Mock Logger */}
            <rect x="40" y="210" width="180" height="70" rx="14" fill="url(#grad-mock)" stroke="#f59e0b" strokeWidth="1.5" filter="url(#shadow3)" />
            <text x="130" y="240" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="600">MockLogger</text>
            <text x="130" y="260" textAnchor="middle" fill="#9ca3af" fontSize="10">{'{ log: jest.fn() }'}</text>

            {/* UserService under test */}
            <rect x="330" y="110" width="200" height="80" rx="14" fill="url(#grad-target)" stroke="#6366f1" strokeWidth="1.5" filter="url(#shadow3)" />
            <text x="430" y="140" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="600">UserService</text>
            <text x="430" y="163" textAnchor="middle" fill="#9ca3af" fontSize="10">new UserService(mockLogger)</text>

            {/* Result */}
            <rect x="620" y="120" width="150" height="60" rx="14" fill="url(#grad-result)" stroke="#34d399" strokeWidth="1.5" filter="url(#shadow3)" />
            <text x="695" y="148" textAnchor="middle" fill="#6ee7b7" fontSize="12" fontWeight="600">Test Passes</text>
            <text x="695" y="165" textAnchor="middle" fill="#9ca3af" fontSize="10">Isolated + Fast</text>

            {/* Arrows */}
            <path d="M220,100 C270,100 280,140 330,145" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrow-amber2)" />
            <text x="275" y="108" fill="#fbbf24" fontSize="10">create</text>

            <path d="M130,140 C130,165 130,180 130,210" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow-amber2)" />
            <text x="150" y="178" fill="#f59e0b" fontSize="10">build mock</text>

            <path d="M220,245 C280,245 300,165 330,155" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="6,4" markerEnd="url(#arrow-indigo2)" />
            <text x="285" y="220" fill="#a5b4fc" fontSize="10">inject</text>

            <path d="M530,150 C570,150 590,150 620,150" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrow-green3)" />
            <text x="575" y="140" fill="#34d399" fontSize="10">assert</text>

            {/* Bottom label */}
            <text x="400" y="325" textAnchor="middle" fill="#6b7280" fontSize="12">Mock 取代真實依賴 — 測試快速、獨立、可靠</text>
          </svg>
        </div>

        <p>
          喺上面嘅流程入面，Unit Test 首先建立一個 MockLogger（例如用 <code>jest.fn()</code>），然後將佢注入去 UserService。測試執行嘅時候，UserService 用嘅係 Mock 而唔係真正嘅 Logger，所以測試唔會受到外部因素影響。
        </p>

        <div className="comparison-grid" style={{ marginBottom: 24 }}>
          <div className="comparison-col bad">
            <h4>冇 DI 嘅測試困難</h4>
            <div className="code-block">
              <span className="comment">// UserService 自己 new ConsoleLogger()</span><br />
              <span className="comment">// 冇辦法替換依賴</span><br />
              <span className="comment">// 測試會觸發真正嘅 console.log</span><br />
              <span className="comment">// 難以驗證 log 被調用咗幾次</span>
            </div>
          </div>
          <div className="comparison-col good">
            <h4>有 DI 嘅測試寫法</h4>
            <div className="code-block">
              <span className="keyword">const</span> mock = {'{'} <span className="func">log</span>: jest.<span className="func">fn</span>() {'}'};<br />
              <span className="keyword">const</span> svc = <span className="keyword">new</span> <span className="class-name">UserService</span>(mock);<br />
              svc.<span className="func">createUser</span>(<span className="string">"Alice"</span>);<br />
              <span className="func">expect</span>(mock.log).<span className="func">toHaveBeenCalled</span>();
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>DI 帶來嘅核心好處</h2>
        <div className="subtitle">Beyond Testing — Design Benefits</div>

        <div className="key-points">
          <div className="key-point">
            <h4>Loose Coupling</h4>
            <p>Class 唔再同具體嘅依賴實作綁死。只要 Interface 一致，可以自由替換任何實作。</p>
          </div>
          <div className="key-point">
            <h4>Testability</h4>
            <p>測試嘅時候可以注入 Mock / Stub / Fake，唔需要啟動真實嘅 Database 或者 API。</p>
          </div>
          <div className="key-point">
            <h4>Single Responsibility</h4>
            <p>Class 只負責自己嘅邏輯，唔需要負責建立同管理依賴。符合 SRP 原則。</p>
          </div>
          <div className="key-point">
            <h4>Flexibility</h4>
            <p>Production 用 RealLogger、Testing 用 MockLogger、Staging 用 FileLogger — 全部由外部控制。</p>
          </div>
        </div>

        <div className="use-case">
          <h4>常見應用場景</h4>
          <p>大型應用通常會用 DI Container（如 Spring、Angular 嘅 Injector）嚟自動管理依賴嘅建立同注入，減少手動 wiring 嘅工作量。不過核心原理同手動 Constructor Injection 係一樣嘅。</p>
        </div>
      </div>
    </>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻開始 Build</div>

      <div className="prompt-card">
        <h4>Prompt 1 — 喺 Project 入面實現 DI Pattern</h4>
        <div className="prompt-text">
          {'幫手喺 [語言：TypeScript / Java / Python / Go] Project 入面實現 Dependency Injection Pattern。\n\nProject 類型：[REST API / CLI 工具 / Web Application]\n框架：[Express / Spring Boot / FastAPI / Gin]\n\n需要實現：\n1. 定義核心 Interface / Abstract Class：\n   - Logger Interface（ConsoleLogger、FileLogger、CloudLogger 實作）\n   - Database Interface（PostgresDB、MockDB 實作）\n   - EmailService Interface（SMTPService、MockEmailService 實作）\n2. Constructor Injection：所有 Service Class 透過 Constructor 接收依賴\n3. DI Container / Composition Root：集中管理所有依賴嘅建立同注入\n4. 環境切換：Production 用真實依賴，Testing 用 Mock 依賴\n5. Unit Test 範例：展示點樣用 Mock 測試每個 Service\n\n請提供完整嘅 code 結構、每個 Interface 同實作嘅 code、同 DI Container 嘅配置。'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 重構現有 Code 使用 DI</h4>
        <div className="prompt-text">
          {'幫手將以下 tightly coupled 嘅 code 重構為使用 Dependency Injection。\n\n現有 code（有問題嘅寫法）：\n[貼上需要重構嘅 code，例如：\nclass OrderService {\n  constructor() {\n    this.db = new PostgresDatabase();\n    this.mailer = new SMTPMailer();\n    this.logger = new ConsoleLogger();\n  }\n}]\n\n重構要求：\n1. 將所有 hard-coded 依賴改為 Constructor Injection\n2. 為每個依賴定義 Interface / Type\n3. 建立 Composition Root，集中管理依賴 wiring\n4. 提供對應嘅 Unit Test，用 Mock 替代所有外部依賴\n5. 確保重構後功能完全唔變（行為一致）\n6. 加入清楚嘅註釋解釋每個改動嘅原因\n\n請逐步展示重構過程，由識別問題 → 定義 Interface → 改寫 Constructor → 建立 DI Container → 寫 Test。'}
        </div>
      </div>
    </div>
  );
}

export default function DependencyInjection() {
  return (
    <>
      <TopicTabs
        title="Dependency Injection"
        subtitle="OOP 設計模式 — 將依賴從外部注入，而唔係喺內部建立"
        tabs={[
          { id: 'tab-concept', label: '基本概念', content: <ConceptTab /> },
          { id: 'tab-comparison', label: '有 vs 冇 DI', content: <ComparisonTab /> },
          { id: 'tab-testing', label: '測試優勢', premium: true, content: <TestingTab /> },
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
