import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'ai-vs-software-engineer', label: 'AI 時代做 Software Engineer' },
  { slug: 'backend-roadmap', label: 'Backend 學習路線' },
  { slug: 'interview-process', label: 'Big Tech 面試流程' },
  { slug: 'coding-interview', label: 'Coding Interview 攻略' },
];

function JuniorTaskTab() {
  return (
    <div className="card">
      <h2>Junior 做 Task — 清晰嘅任務</h2>
      <div className="subtitle">有明確嘅 Acceptance Criteria，execute 就完</div>
      <p>
        以下介紹 Junior Engineer 做緊啲咩。簡單嚟講，Junior 嘅工作係接到一個清晰嘅 Task，然後完成佢。呢啲 Task 都有好清楚嘅定義同埋 Acceptance Criteria——起點同終點好清楚，執行落去就可以。
      </p>
      <p>
        舉例：Junior 會收到一個 Task 話「Build 一個 REST API endpoint 去 return user profile」，或者「將個系統由 Java 8 升上去 Java 17」。呢啲都係好明確嘅 Task，清楚知道要做啲咩，只需要完成佢就夠。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow1" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowTask" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradTask1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradTask2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e2235" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          <text x="400" y="35" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">Junior Engineer 嘅工作流程</text>

          <g transform="translate(60,80)">
            <rect width="320" height="120" rx="14" fill="url(#gradTask1)" stroke="#34d399" strokeWidth="2" filter="url(#shadow1)" />
            <text x="160" y="30" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Task 例子 ①</text>
            <line x1="30" y1="42" x2="290" y2="42" stroke="#2a2d3a" strokeWidth="1" />
            <text x="160" y="65" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">Build REST API Endpoint</text>
            <text x="30" y="88" fill="#9ca3af" fontSize="10.5">Acceptance Criteria:</text>
            <text x="30" y="105" fill="#c0c4cc" fontSize="10">✓ Return user profile as JSON</text>
          </g>

          <g transform="translate(420,80)">
            <rect width="320" height="120" rx="14" fill="url(#gradTask1)" stroke="#34d399" strokeWidth="2" filter="url(#shadow1)" />
            <text x="160" y="30" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Task 例子 ②</text>
            <line x1="30" y1="42" x2="290" y2="42" stroke="#2a2d3a" strokeWidth="1" />
            <text x="160" y="65" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">Upgrade Java 8 to 17</text>
            <text x="30" y="88" fill="#9ca3af" fontSize="10.5">Acceptance Criteria:</text>
            <text x="30" y="105" fill="#c0c4cc" fontSize="10">✓ All tests pass on Java 17</text>
          </g>

          <path d="M400,210 L400,245" stroke="#34d399" strokeWidth="2.5" fill="none" markerEnd="url(#arrowGreen)" />

          <g transform="translate(140,250)">
            <rect width="520" height="130" rx="14" fill="url(#gradTask2)" stroke="#6366f1" strokeWidth="2" filter="url(#glowTask)" />
            <text x="260" y="30" textAnchor="middle" fill="#6366f1" fontSize="13" fontWeight="700">Junior 嘅工作方式</text>
            <line x1="30" y1="45" x2="490" y2="45" stroke="#2a2d3a" strokeWidth="1" />
            <g transform="translate(30,60)">
              <circle cx="15" cy="10" r="10" fill="#6366f1" />
              <text x="15" y="15" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">1</text>
              <text x="35" y="15" fill="#c0c4cc" fontSize="11">收到清晰嘅 Task + Acceptance Criteria</text>
            </g>
            <g transform="translate(280,60)">
              <circle cx="15" cy="10" r="10" fill="#6366f1" />
              <text x="15" y="15" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">2</text>
              <text x="35" y="15" fill="#c0c4cc" fontSize="11">Execute 個 Task</text>
            </g>
            <g transform="translate(30,90)">
              <circle cx="15" cy="10" r="10" fill="#6366f1" />
              <text x="15" y="15" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">3</text>
              <text x="35" y="15" fill="#c0c4cc" fontSize="11">Complete = Done，唔駛諗其他嘢</text>
            </g>
            <g transform="translate(280,90)">
              <circle cx="15" cy="10" r="10" fill="#34d399" />
              <text x="15" y="15" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">✓</text>
              <text x="35" y="15" fill="#34d399" fontSize="11">Task 完成</text>
            </g>
          </g>
        </svg>
      </div>

      <div className="quote-block">
        <p>「Junior Engineer 嘅 Task 特點：簡單、清晰、有明確嘅 Acceptance Criteria。Complete task = done。」</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>Task 嘅特徵</h3>
      <div className="key-points">
        <div className="key-point"><h4>清晰嘅起點同終點</h4><p>清楚知道要做啲咩，有明確嘅定義。唔需要自己去 define 個問題，個問題已經 define 好晒。</p></div>
        <div className="key-point"><h4>明確嘅 Acceptance Criteria</h4><p>有 checklist 定義咗點樣先算完成。例如「All tests pass」、「API return correct JSON format」。</p></div>
        <div className="key-point"><h4>執行導向</h4><p>重點係執行，唔係設計。有人已經諗好點樣做，只需要實現出嚟。</p></div>
        <div className="key-point"><h4>Complete = Done</h4><p>一旦完成 Acceptance Criteria，個 Task 就完。唔駛負責其他後續嘅設計決策。</p></div>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>典型嘅 Junior Task 例子</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>Build API endpoint:</strong> 例如「寫個 GET /users/:id 返 user profile」。有清楚嘅 spec 指明要做啲咩。</span></li>
        <li><span className="step-num">2</span><span><strong>Upgrade library:</strong> 例如「將 Java 8 升上 Java 17」。好清楚嘅技術任務，有明確嘅成功標準。</span></li>
        <li><span className="step-num">3</span><span><strong>Fix bug:</strong> 例如「修復登入頁面嘅驗證錯誤」。問題已經 identify 咗，只需要解決佢。</span></li>
        <li><span className="step-num">4</span><span><strong>Add feature:</strong> 例如「加個 filter 功能去 user list page」。功能已經 spec 好晒，implement 就得。</span></li>
      </ol>

      <div className="use-case">
        <h4>重點理解</h4>
        <p>Junior Task 嘅核心：有人已經諗好晒點樣做，只需要執行。呢個唔係貶低，而係清楚嘅分工——專注喺實現，唔駛負責高層次嘅設計決策。</p>
      </div>
    </div>
  );
}

function SeniorGoalTab() {
  return (
    <div className="card">
      <h2>Senior 做 Goal — 模糊嘅目標</h2>
      <div className="subtitle">冇 initial tasks，需要自己 design + break down</div>
      <p>
        以下介紹 Senior Engineer 做緊啲咩。同 Junior 最大嘅分別係：Senior 唔係收 Task，而係收 Goal。呢個 Goal 係模糊嘅、冇清晰答案嘅。例如「管理 100M users 嘅數據」——留意，呢個係目標，唔係 Task。
      </p>
      <p>
        冇人會指明要點樣做，Senior 需要自己去做 System Design，諗出最適合嘅方案，然後將佢 break down 做一堆堆 Task，再分配俾 Junior 同其他團隊成員去做。Senior 係帶領整個 execution，唔係淨係執行一個 Task。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow2" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGoal" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradGoal1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#252840" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGoal2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e2235" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradTask3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2e28" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrowBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrowGreen2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          <text x="400" y="35" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">Senior Engineer 嘅工作流程</text>

          <g transform="translate(240,65)">
            <rect width="320" height="80" rx="14" fill="url(#gradGoal1)" stroke="#f59e0b" strokeWidth="2.5" filter="url(#glowGoal)" />
            <text x="160" y="28" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="700">模糊嘅 Goal</text>
            <text x="160" y="50" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">「管理 100M users 嘅數據」</text>
            <text x="160" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">冇人指明點樣做，冇 initial tasks</text>
          </g>

          <path d="M400,155 L400,185" stroke="#f59e0b" strokeWidth="2.5" fill="none" markerEnd="url(#arrowBlue)" />

          <g transform="translate(190,190)">
            <rect width="420" height="100" rx="14" fill="url(#gradGoal2)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow2)" />
            <text x="210" y="28" textAnchor="middle" fill="#6366f1" fontSize="13" fontWeight="700">Senior 做 System Design</text>
            <line x1="30" y1="40" x2="390" y2="40" stroke="#2a2d3a" strokeWidth="1" />
            <text x="30" y="60" fill="#c0c4cc" fontSize="10.5">• 諗出點樣設計個系統去支持 100M users</text>
            <text x="30" y="78" fill="#c0c4cc" fontSize="10.5">• 權衡唔同方案嘅 Trade-off (e.g., Sharding vs Replication)</text>
            <text x="30" y="96" fill="#c0c4cc" fontSize="10.5">• 決定用咩 Database、Cache、Load Balancer</text>
          </g>

          <path d="M400,300 L400,330" stroke="#6366f1" strokeWidth="2.5" fill="none" markerEnd="url(#arrowGreen2)" />

          <g transform="translate(100,335)">
            <rect width="600" height="125" rx="14" fill="url(#gradTask3)" stroke="#34d399" strokeWidth="2" filter="url(#shadow2)" />
            <text x="300" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Break Down 成 Tasks → 分配俾 Junior</text>
            <line x1="30" y1="40" x2="570" y2="40" stroke="#2a2d3a" strokeWidth="1" />
            <g transform="translate(20,55)">
              <rect width="165" height="55" rx="8" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="1" />
              <text x="82" y="20" textAnchor="middle" fill="#6366f1" fontSize="10" fontWeight="600">Task 1</text>
              <text x="82" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">Set up Database Sharding</text>
              <text x="82" y="50" textAnchor="middle" fill="#6b7280" fontSize="8">→ 分配俾 Junior A</text>
            </g>
            <g transform="translate(210,55)">
              <rect width="165" height="55" rx="8" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="1" />
              <text x="82" y="20" textAnchor="middle" fill="#6366f1" fontSize="10" fontWeight="600">Task 2</text>
              <text x="82" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">Implement Cache Layer</text>
              <text x="82" y="50" textAnchor="middle" fill="#6b7280" fontSize="8">→ 分配俾 Junior B</text>
            </g>
            <g transform="translate(400,55)">
              <rect width="165" height="55" rx="8" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="1" />
              <text x="82" y="20" textAnchor="middle" fill="#6366f1" fontSize="10" fontWeight="600">Task 3</text>
              <text x="82" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">Add Load Balancer</text>
              <text x="82" y="50" textAnchor="middle" fill="#6b7280" fontSize="8">→ 分配俾 Junior C</text>
            </g>
          </g>
        </svg>
      </div>

      <div className="quote-block">
        <p>「Senior Engineer own goal，唔係 own task。冇人指明點樣做，需要自己設計晒成個系統。」</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>Goal 嘅特徵</h3>
      <div className="key-points">
        <div className="key-point"><h4>模糊嘅起點</h4><p>Goal 係一個方向，唔係一個清晰嘅任務。例如「支持 100M users」——點樣支持？冇人指明。</p></div>
        <div className="key-point"><h4>冇 Initial Tasks</h4><p>唔似 Junior 有清楚嘅 Task，Senior 一開始乜都冇。需要自己去 define 要做啲咩先可以達成個 Goal。</p></div>
        <div className="key-point"><h4>需要 System Design</h4><p>需要諗晒成個系統應該點樣設計，權衡唔同方案嘅 Trade-off，然後做決策。</p></div>
        <div className="key-point"><h4>帶領 Junior</h4><p>Senior 將個 Goal break down 成 Task，然後分配俾團隊成員。唔係淨係執行，而係帶領整個 execution。</p></div>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>Senior 點樣處理 Goal</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>收到模糊嘅 Goal：</strong>例如「管理 100M users 嘅數據」。呢個唔係 Task，係方向。冇人指明點樣做。</span></li>
        <li><span className="step-num">2</span><span><strong>做 System Design：</strong>諗晒成個系統應該點樣設計。Database 用 Sharding？Cache 點樣擺？Load Balancer 擺邊？</span></li>
        <li><span className="step-num">3</span><span><strong>權衡 Trade-off：</strong>冇完美方案，只有最適合嘅。必須諗清楚每個選擇嘅利弊，然後做決策。</span></li>
        <li><span className="step-num">4</span><span><strong>Break down 成 Tasks：</strong>將個大 Goal 拆細做一堆清晰嘅 Task，每個 Task 都有明確嘅 Acceptance Criteria。</span></li>
        <li><span className="step-num">5</span><span><strong>分配 Tasks 俾 Junior：</strong>將呢啲 Task 分配俾團隊成員去執行。Senior 帶領整個過程，確保個 Goal 達成。</span></li>
      </ol>

      <div className="use-case">
        <h4>核心分別</h4>
        <p>Junior 嘅工作係「執行已經 define 好嘅 Task」，Senior 嘅工作係「將模糊嘅 Goal 變做清晰嘅 Task」。呢個就係最大分別。</p>
      </div>
    </div>
  );
}

function UpgradePathTab() {
  return (
    <div className="card">
      <h2>點樣由 Junior 升做 Senior</h2>
      <div className="subtitle">關鍵：主動搵模糊嘅任務，唔好等清晰嘅 Task</div>
      <p>
        關鍵在於點樣快速升級。最快嘅方法就係——主動搵啲模糊嘅、冇清晰答案嘅任務嚟做。唔好淨係等人分配清晰嘅 Task，要主動去搵啲需要諗 System Design、需要權衡 Trade-off 嘅任務。
      </p>
      <p>
        點解？因為呢啲模糊嘅任務先可以訓練做 Senior 需要嘅能力——System Design、Trade-off 思考、將 Goal break down 成 Task。而且，呢啲能力令人變得 irreplaceable by AI，因為 AI 暫時幫唔到做呢啲決策。
      </p>

      <div className="quote-block">
        <p>「快速升級嘅秘訣：主動搵啲模糊嘅、冇清晰答案嘅任務嚟做。呢啲任務先可以訓練做 Senior 需要嘅能力。」</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>升級策略</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>主動搵模糊嘅任務：</strong>唔好淨係等人分配清晰嘅 Task。主動問「有冇啲需要設計嘅任務？」、「呢個 Goal 應該點樣實現？」必須主動出擊。</span></li>
        <li><span className="step-num">2</span><span><strong>練習 System Design：</strong>就算而家做緊 Junior Task，都要諗「如果自己設計，會點樣做？」訓練自己嘅思維。呢個好重要。</span></li>
        <li><span className="step-num">3</span><span><strong>學權衡 Trade-off：</strong>冇完美方案，只有最適合嘅。每次做決策都要諗「呢個方案嘅利弊係咩？」養成呢個習慣。</span></li>
        <li><span className="step-num">4</span><span><strong>練習 Break Down Goal：</strong>試下將大 Goal 拆細做小 Task。例如「支持 100M users」可以拆成「Database Sharding + Cache + Load Balancer」。</span></li>
        <li><span className="step-num">5</span><span><strong>唔好怕犯錯：</strong>模糊嘅任務冇標準答案，可能會錯。但犯錯先學得快。必須擁抱呢個過程。</span></li>
      </ol>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>點解模糊任務令人 Irreplaceable by AI</h3>
      <div className="key-points">
        <div className="key-point"><h4>AI 幫唔到做決策</h4><p>AI 可以幫手寫 Code，但幫唔到決定「應該用邊個架構」、「呢兩個方案邊個好」。呢啲判斷只有人做得到。</p></div>
        <div className="key-point"><h4>AI 幫唔到權衡 Trade-off</h4><p>每個方案都有利弊，AI 可以列出利弊，但唔可以根據公司嘅實際情況去做最終決定。</p></div>
        <div className="key-point"><h4>AI 幫唔到理解業務需求</h4><p>System Design 唔係淨係技術問題，係業務問題。必須理解公司需要啲咩，先可以設計出適合嘅系統。</p></div>
        <div className="key-point"><h4>AI 幫唔到帶領團隊</h4><p>將 Goal break down 成 Task，分配俾團隊成員，跟進進度——呢啲係 leadership，唔係 coding。</p></div>
      </div>

      <div className="use-case">
        <h4>行動建議</h4>
        <p>由聽日開始，每次收到 Task，都問自己：「如果自己設計個系統，會點樣做？」就算而家只係執行，都要訓練自己諗 System Design。呢個習慣會令人快速升級。</p>
      </div>

      <div className="use-case" style={{ marginTop: '16px', borderLeftColor: '#34d399' }}>
        <h4>最後總結</h4>
        <p>Junior 做 Task，Senior 做 Goal。想升級？主動搵模糊嘅任務，練習 System Design，變得 irreplaceable by AI。呢個就係升級嘅最快路徑。</p>
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
        <h4>Prompt 1 — 制定個人發展計劃（Junior → Senior）</h4>
        <div className="prompt-text">幫手制定一份 6 個月嘅個人發展計劃，目標係由 Junior Engineer 升級到 Senior Engineer 水平。{'\n\n'}目前技術棧：<span className="placeholder">[技術棧，例如 React + Node.js / Python + Django / Java + Spring Boot]</span>{'\n'}目前工作年資：<span className="placeholder">[年資，例如 1 年 / 2 年]</span>{'\n'}目前主要工作內容：<span className="placeholder">[工作內容，例如 寫 CRUD API / 前端頁面開發 / Bug fixing]</span>{'\n'}想發展嘅方向：<span className="placeholder">[方向，例如 Backend Architecture / Full-stack / DevOps]</span>{'\n\n'}計劃需要包含：{'\n'}1. 每月學習目標同里程碑{'\n'}2. System Design 練習計劃（每週一個經典題目，例如設計 URL Shortener、Chat System）{'\n'}3. 推薦嘅學習資源（書籍、課程、開源項目）{'\n'}4. 實戰項目建議——用嚟練習將 Goal break down 成 Tasks 嘅能力{'\n'}5. 每週自我評估 checklist（技術決策能力、Trade-off 思考、溝通能力）{'\n'}6. 點樣喺日常工作中主動搵模糊任務嘅具體策略{'\n'}7. 建立技術影響力嘅方法（Code Review、Tech Talk、寫文檔）{'\n\n'}輸出格式：週曆式計劃表，每週有明確嘅學習同實踐目標。</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Code Review 流程提升團隊能力</h4>
        <div className="prompt-text">幫手設計一套 Code Review 流程同規範，目標係透過 Code Review 提升整個團隊嘅技術水平。{'\n\n'}團隊規模：<span className="placeholder">[人數，例如 3-5 人 / 5-10 人]</span>{'\n'}主要技術棧：<span className="placeholder">[技術棧，例如 TypeScript + React + Node.js]</span>{'\n'}目前痛點：<span className="placeholder">[痛點，例如 Review 流於形式 / 冇統一標準 / Junior 唔知點 Review]</span>{'\n\n'}流程設計需要包含：{'\n'}1. Code Review Checklist（分 Junior 同 Senior 兩個版本）{'\n'}2. PR Template（描述變更、影響範圍、測試方案）{'\n'}3. Review 優先級分類（Critical / Major / Minor / Nitpick）{'\n'}4. 建設性 feedback 嘅寫法示範{'\n'}5. Pair Review 機制——Senior 帶 Junior 一齊做 Review{'\n'}6. 每週 Review Recap 會議嘅議程模板{'\n'}7. 衡量 Review 質量嘅指標</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — System Design 練習：將 Goal 拆解成 Tasks</h4>
        <div className="prompt-text">模擬一個 Senior Engineer 嘅工作場景，幫手練習將模糊 Goal 拆解成可執行 Tasks。{'\n\n'}模糊嘅 Goal：<span className="placeholder">[Goal 描述，例如「設計一個支持 50K 同時在線嘅即時聊天系統」/「建立一個可以處理每日 1M 訂單嘅電商後端」]</span>{'\n\n'}請按照以下步驟拆解：{'\n'}1. 需求分析——呢個 Goal 實際上要解決啲咩問題？{'\n'}2. 技術方案設計——提出 2-3 個可行方案{'\n'}3. Trade-off 分析——每個方案嘅優缺點對比表{'\n'}4. 最終決策——推薦邊個方案，附帶理由{'\n'}5. Task Breakdown——將最終方案拆成 8-12 個獨立嘅 Task{'\n'}6. 執行順序——Task 之間嘅依賴關係同建議執行順序{'\n'}7. 風險評估——可能遇到嘅技術風險同 mitigation 策略{'\n\n'}輸出格式：完整嘅技術設計文檔，可以直接用嚟做 Sprint Planning。</div>
      </div>
    </div>
  );
}

export default function JuniorVsSenior() {
  return (
    <>
      <TopicTabs
        title="Junior vs Senior Engineer：Task 定 Goal？"
        subtitle="最大分別：Junior 做 Task，Senior 做 Goal"
        tabs={[
          { id: 'junior-task', label: '① Junior 做 Task', content: <JuniorTaskTab /> },
          { id: 'senior-goal', label: '② Senior 做 Goal', content: <SeniorGoalTab /> },
          { id: 'upgrade-path', label: '③ 點樣升級', premium: true, content: <UpgradePathTab /> },
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
