import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '一個 Solo Dev 應該由邊一步開始一個新項目？',
    options: [
      { text: '即刻打開 Claude Code 開始寫', correct: false, explanation: '冇 PRD 同 System Design 就寫，等於冇地圖就開車。會行錯路、重寫、浪費 token' },
      { text: '寫 PRD（Product Requirements Doc）— 問題、user story、feature scope', correct: true, explanation: '啱！PRD 強迫你 think clearly 個產品到底解決乜問題、邊啲係 must-have、邊啲係 nice-to-have。冇呢個就 AI 都唔知幫你 build 啲乜' },
      { text: '揀 framework 同 tech stack', correct: false, explanation: 'Tech stack 係 System Design 階段先決定，唔係第一步。揀錯 stack 通常都係因為冇 PRD' },
      { text: '租 domain 同 server', correct: false, explanation: 'Infrastructure 係最後 deploy 階段先做。一開始就 setup 通常會 over-engineer' },
    ],
  },
  {
    question: '一份 Solo Dev 嘅 System Design Doc 最重要係包含咩內容？',
    options: [
      { text: '所有可能用到嘅 design pattern', correct: false, explanation: '羅列 pattern 唔等於設計。Solo dev 嘅 SDD 應該短而精，唔係 enterprise 規模嘅文件' },
      { text: 'Tech stack、Database design、同「邊度會先壞」嘅 scaling 假設', correct: true, explanation: '啱！短小精悍嘅 SDD：(1) 揀乜 stack 同點解；(2) DB schema 同關係；(3) 預測邊個 component 會係第一個樽頸 — 知道 scale up 邊度先' },
      { text: 'UML class diagram 同 sequence diagram 全套', correct: false, explanation: 'Solo dev 唔需要完整 UML — overkill。重點係能溝通設計意圖，唔係跟 formal notation' },
      { text: '完整嘅 API specification 同 OpenAPI schema', correct: false, explanation: 'API spec 可以邊 build 邊寫。SDD 階段嘅重點係 architecture 決策，唔係 implementation detail' },
    ],
  },
  {
    question: '點解 Solo Dev pipeline 入面要用 CodeRabbit（或 Claude review）做 PR 前嘅 CLI review？',
    options: [
      { text: '因為 CodeRabbit 可以自動寫 code', correct: false, explanation: 'CodeRabbit 係 review 工具，唔係 code generation 工具' },
      { text: 'AI review 可以揾出 human 容易 miss 嘅 sneaky bug（off-by-one、null check、async race）', correct: true, explanation: '啱！Solo dev 冇隊友幫你 review，AI review 就係你嘅第二對眼。佢哋特別擅長揾 (1) edge case (2) null/undefined 漏洞 (3) async/concurrency bug — 呢啲都係 human 寫 code 時容易遺漏嘅嘢' },
      { text: '令 PR 看起來更專業', correct: false, explanation: '唔係為咗外觀。係為咗實際攔截 bug' },
      { text: '取代寫 unit test', correct: false, explanation: 'Review 同 test 互補，唔係取代。Review 揾 logic bug，test 保證行為一致' },
    ],
  },
  {
    question: 'Solo Dev pipeline 嘅最後一步應該係咩？',
    options: [
      { text: '手動 SSH 入 server 然後 git pull', correct: false, explanation: '呢個係 CI/CD 之前嘅原始做法，容易出錯且冇 rollback' },
      { text: '應用 CodeRabbit 嘅 fixes 後 push to CI/CD pipeline 自動 deploy', correct: true, explanation: '啱！Solo dev 嘅 ship 流程：fix → push → CI/CD 自動跑 test → 自動 deploy。零手動操作，零 downtime。push 完就 "Shipped"' },
      { text: '寫 release note 然後 email 客戶', correct: false, explanation: 'Release note 可以做，但唔係 deploy 嘅最後一步。Auto-deploy 先係' },
      { text: '開啟 monitoring dashboard 望住 24 小時', correct: false, explanation: 'Monitoring 應該係自動 alert，唔需要人 hand-watch。Set 好 alert rules 就放手' },
    ],
  },
];

const relatedTopics = [
  { slug: 'sdd-spec-driven-development', label: 'SDD 規格驅動開發' },
  { slug: 'cicd-pipeline', label: 'CI/CD 自動化部署' },
  { slug: 'multi-ai-workflow', label: '多 AI 協作工作流' },
  { slug: 'claude-skills-building', label: 'Claude Skills 建構' },
  { slug: 'testing-strategy', label: '測試策略' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Solo Dev 全流程：由 Design 到 Deployment</h2>
      <div className="subtitle">PRD → System Design → Build → Review → Ship — 五步搞掂</div>
      <p>
        一個 AI 時代嘅 Solo Developer，唔需要 team 都可以 ship production-grade 嘅產品。關鍵在於有一條穩定、可重複嘅 pipeline，將「諗到一個 idea」轉化為「實際上線」。呢條 pipeline 一共 5 個階段，每個階段都有 AI 工具幫手，但 human 仍然喺啲關鍵 decision point 拍板。
      </p>
      <p>
        重點唔係用幾多工具，係將每個階段嘅 deliverable 諗清楚先動手。冇 PRD 就 Build，AI 都唔知做乜；冇 System Design 就寫 code，三日後 refactor；冇 Review 就 deploy，bug 直接面對用戶。每個階段都有佢嘅作用，跳一步都會喺後面付出代價。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 900 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowO" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowOI"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.3" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradOPRD" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradOSD" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1f4f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradOBuild" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradORev" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#25132a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradODeploy" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrO" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
          </defs>

          <text x="450" y="25" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">Solo Dev 五階段 Pipeline</text>

          <g transform="translate(20,60)">
            <rect width="160" height="110" rx="14" fill="url(#gradOPRD)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowO)" />
            <text x="80" y="28" textAnchor="middle" fill="#60a5fa" fontSize="13" fontWeight="700">① PRD</text>
            <line x1="20" y1="38" x2="140" y2="38" stroke="#2a2d3a" strokeWidth="1" />
            <text x="80" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">問題定義</text>
            <text x="80" y="74" textAnchor="middle" fill="#9ca3af" fontSize="10">User stories</text>
            <text x="80" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">Feature scope</text>
            <text x="80" y="104" textAnchor="middle" fill="#60a5fa" fontSize="9">— 諗清楚做乜</text>
          </g>

          <g transform="translate(195,60)" filter="url(#glowOI)">
            <rect width="160" height="110" rx="14" fill="url(#gradOSD)" stroke="#6366f1" strokeWidth="2" />
            <text x="80" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">② System Design</text>
            <line x1="20" y1="38" x2="140" y2="38" stroke="#2a2d3a" strokeWidth="1" />
            <text x="80" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">Tech stack</text>
            <text x="80" y="74" textAnchor="middle" fill="#9ca3af" fontSize="10">Database design</text>
            <text x="80" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">邊度會先壞？</text>
            <text x="80" y="104" textAnchor="middle" fill="#a5b4fc" fontSize="9">— 諗清楚點做</text>
          </g>

          <g transform="translate(370,60)">
            <rect width="160" height="110" rx="14" fill="url(#gradOBuild)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadowO)" />
            <text x="80" y="28" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">③ Build</text>
            <line x1="20" y1="38" x2="140" y2="38" stroke="#2a2d3a" strokeWidth="1" />
            <text x="80" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">Claude Code</text>
            <text x="80" y="74" textAnchor="middle" fill="#9ca3af" fontSize="10">逐個 feature</text>
            <text x="80" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">按 PRD 實作</text>
            <text x="80" y="104" textAnchor="middle" fill="#fbbf24" fontSize="9">— AI 寫，human 揸軚</text>
          </g>

          <g transform="translate(545,60)">
            <rect width="160" height="110" rx="14" fill="url(#gradORev)" stroke="#EC4899" strokeWidth="2" filter="url(#shadowO)" />
            <text x="80" y="28" textAnchor="middle" fill="#f472b6" fontSize="13" fontWeight="700">④ Review</text>
            <line x1="20" y1="38" x2="140" y2="38" stroke="#2a2d3a" strokeWidth="1" />
            <text x="80" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">Self review</text>
            <text x="80" y="74" textAnchor="middle" fill="#9ca3af" fontSize="10">CodeRabbit CLI</text>
            <text x="80" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">PR 前 catch bug</text>
            <text x="80" y="104" textAnchor="middle" fill="#f472b6" fontSize="9">— 第二對眼</text>
          </g>

          <g transform="translate(720,60)">
            <rect width="160" height="110" rx="14" fill="url(#gradODeploy)" stroke="#10B981" strokeWidth="2" filter="url(#shadowO)" />
            <text x="80" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">⑤ Ship</text>
            <line x1="20" y1="38" x2="140" y2="38" stroke="#2a2d3a" strokeWidth="1" />
            <text x="80" y="58" textAnchor="middle" fill="#9ca3af" fontSize="10">Apply fixes</text>
            <text x="80" y="74" textAnchor="middle" fill="#9ca3af" fontSize="10">Push to CI/CD</text>
            <text x="80" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">自動 deploy</text>
            <text x="80" y="104" textAnchor="middle" fill="#34d399" fontSize="9">— Shipped!</text>
          </g>

          <path d="M180,115 C188,115 188,115 196,115" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrO)" />
          <path d="M355,115 C363,115 363,115 371,115" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrO)" />
          <path d="M530,115 C538,115 538,115 546,115" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrO)" />
          <path d="M705,115 C713,115 713,115 721,115" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrO)" />

          <g transform="translate(100,210)">
            <rect width="700" height="140" rx="14" fill="rgba(99,102,241,0.05)" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6,3" />
            <text x="350" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="700">每階段嘅 AI vs Human 分工</text>
            <text x="40" y="56" fill="#c0c4cc" fontSize="11">① PRD：</text>
            <text x="130" y="56" fill="#9ca3af" fontSize="11">Human 拍板問題定義；AI 幫手結構化 + user story 草稿</text>
            <text x="40" y="74" fill="#c0c4cc" fontSize="11">② SDD：</text>
            <text x="130" y="74" fill="#9ca3af" fontSize="11">Human 揀 tech stack 同預測樽頸；AI 補足細節 + diagram</text>
            <text x="40" y="92" fill="#c0c4cc" fontSize="11">③ Build：</text>
            <text x="130" y="92" fill="#9ca3af" fontSize="11">AI 寫 code，但 human 揸軚 — 持續審查每個 feature 嘅 output</text>
            <text x="40" y="110" fill="#c0c4cc" fontSize="11">④ Review：</text>
            <text x="130" y="110" fill="#9ca3af" fontSize="11">AI 自動 review（CodeRabbit），human 判斷邊啲 suggestion 接受</text>
            <text x="40" y="128" fill="#c0c4cc" fontSize="11">⑤ Ship：</text>
            <text x="130" y="128" fill="#9ca3af" fontSize="11">Pipeline 自動跑，human 監察 alert（唔需要望住 dashboard）</text>
          </g>
        </svg>
      </div>

      <div className="quote-block">
        <p>「AI 時代嘅 Solo Dev 唔係一個人寫晒所有嘢，而係一個人 orchestrate 一條 AI pipeline，每個階段都有清晰嘅 deliverable。」</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>每個階段嘅 Deliverable</h3>
      <div className="key-points">
        <div className="key-point"><h4>① PRD — 1-2 頁 markdown</h4><p>包含：(1) 問題 statement — 解決乜痛點；(2) Target user 同 user stories；(3) Feature scope — must-have / nice-to-have / out-of-scope。Solo dev 寫 1-2 頁就夠，唔需要 enterprise-style 50 頁文件。</p></div>
        <div className="key-point"><h4>② System Design Doc — 一張圖 + 半頁文字</h4><p>包含：tech stack 選擇同理由、database schema、第一個會壞嘅 component 預測。重點係識別「邊度會先 scale 唔到」，提前準備而唔係硬 upfront optimize。</p></div>
        <div className="key-point"><h4>③ Build — 按 PRD feature 逐個落實</h4><p>用 Claude Code 一個 feature 一個 feature 咁 implement。每個 feature 完之後做 self-test：「個 feature 由 user 角度真係 work 咩？」唔係「code 跑得到」就算完。</p></div>
        <div className="key-point"><h4>④ Review — AI + Self 雙重 review</h4><p>自己睇一次 — 邏輯、edge case、命名；再用 CodeRabbit / Claude review CLI 跑一次 — 自動揾 sneaky bug。Solo dev 冇 teammate，AI review 就係你嘅第二對眼。</p></div>
        <div className="key-point"><h4>⑤ Ship — Push 完即上線</h4><p>Apply fix → push to main → CI/CD 自動跑 test → 自動 deploy 上 production。零手動。Push 完三個字：「Shipped.」</p></div>
      </div>

      <div className="use-case">
        <h4>核心心法</h4>
        <p>呢條 pipeline 唔係要你跟死。係要你培養一個「諗清楚再做」嘅習慣。AI 工具加速咗每個階段，但<strong>順序唔可以跳</strong>。最常見嘅錯：跳過 PRD 直接 Build → AI 唔知方向 → 出嚟嘅嘢唔啱用 → refactor 浪費時間。跟住個順序，AI 嘅 leverage 先發揮到最大。</p>
      </div>
    </div>
  );
}

function PlanDesignTab() {
  return (
    <div className="card">
      <h2>① PRD + ② System Design</h2>
      <div className="subtitle">寫之前先諗清楚 — 用 30 分鐘文件節省 30 個鐘 refactor</div>
      <p>
        新手最常見嘅錯誤：諗到 idea 就即刻打開 IDE 寫 code。Solo dev 配 AI 嘅 leverage 好大，但<strong>方向錯</strong>嘅 leverage 等於浪費更多 token。所以喺動手前，必須有 PRD 同 System Design Doc 呢兩份文件。
      </p>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>① PRD — Product Requirements Doc</h3>
      <p>
        PRD 唔係寫俾老闆睇，係寫俾自己同 AI 睇。冇 PRD 你都唔清楚自己想 build 乜，AI 自然唔知幫你寫乜。一份合格嘅 Solo Dev PRD 短小精悍，包含三個 section：
      </p>

      <div className="key-points">
        <div className="key-point"><h4>Problem Statement</h4><p>用 2-3 句話講出：(1) 邊個有問題；(2) 個問題係乜；(3) 點解現有方案唔好。冇問題嘅 product 等於 no product。</p></div>
        <div className="key-point"><h4>User Stories</h4><p>用「作為 [角色]，我想 [行為]，咁我可以 [結果]」嘅格式寫出 5-10 個核心 user story。呢個直接 map 到後面要 build 嘅 feature。</p></div>
        <div className="key-point"><h4>Feature Scope</h4><p>列出：Must-have（v1 必有）/ Nice-to-have（v2 再講）/ Out-of-scope（永遠唔做）。Solo dev 最大嘅敵人係 scope creep — 寫低 out-of-scope 等於提前畫好界線。</p></div>
      </div>

      <div className="code-block"><span className="code-comment"># PRD: 個人記帳 App（example）</span>{'\n\n'}## Problem{'\n'}- 香港打工仔每月想知錢花咗去邊，但市面 app 太複雜（需要連 bank）{'\n'}- 我想要一個 30 秒 input、自動分類嘅 minimal app{'\n\n'}## User Stories{'\n'}- 作為用戶，我想 30 秒內 record 一筆消費，咁我唔會懶得記{'\n'}- 作為用戶，我想自動分類（食物 / 交通 / 娛樂），咁我唔使每次揀{'\n'}- 作為用戶，我想月底睇到圓餅圖，咁我知邊類花最多{'\n\n'}## Scope{'\n'}- Must-have：input、自動分類、月度報告{'\n'}- Nice-to-have：多 currency、export CSV{'\n'}- Out-of-scope：連 bank、發票識別、AI 預測</div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>② System Design Doc</h3>
      <p>
        PRD 講「做乜」，SDD 講「點做」。Solo dev 嘅 SDD 唔需要 enterprise 規模 — 重點係三件事：tech stack、database schema、<strong>邊個 component 會先壞</strong>。第三點最重要 — 預測 scaling bottleneck 等於提前知道將來邊度要動手。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowPD" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <linearGradient id="gradPDStack" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPDDb" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPDBreak" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
          </defs>

          <text x="380" y="22" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">Solo Dev SDD 三大支柱</text>

          <g transform="translate(30,50)">
            <rect width="220" height="220" rx="14" fill="url(#gradPDStack)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowPD)" />
            <text x="110" y="30" textAnchor="middle" fill="#60a5fa" fontSize="13" fontWeight="700">① Tech Stack</text>
            <line x1="20" y1="42" x2="200" y2="42" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="62" fill="#c0c4cc" fontSize="11">Frontend: Next.js 14</text>
            <text x="20" y="80" fill="#c0c4cc" fontSize="11">Backend: Node.js + Hono</text>
            <text x="20" y="98" fill="#c0c4cc" fontSize="11">DB: PostgreSQL (Supabase)</text>
            <text x="20" y="116" fill="#c0c4cc" fontSize="11">Auth: Clerk</text>
            <text x="20" y="134" fill="#c0c4cc" fontSize="11">Hosting: Vercel</text>
            <text x="20" y="152" fill="#c0c4cc" fontSize="11">Payment: Stripe</text>
            <text x="20" y="178" fill="#fbbf24" fontSize="10" fontStyle="italic">點解揀：</text>
            <text x="20" y="194" fill="#9ca3af" fontSize="10">熟、平、free tier 夠用、</text>
            <text x="20" y="208" fill="#9ca3af" fontSize="10">scale 到 10K MAU 都唔使換</text>
          </g>

          <g transform="translate(265,50)">
            <rect width="220" height="220" rx="14" fill="url(#gradPDDb)" stroke="#10B981" strokeWidth="2" filter="url(#shadowPD)" />
            <text x="110" y="30" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">② Database Schema</text>
            <line x1="20" y1="42" x2="200" y2="42" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="62" fill="#c0c4cc" fontSize="11" fontWeight="600">users</text>
            <text x="30" y="76" fill="#9ca3af" fontSize="10">id, email, created_at</text>
            <text x="20" y="94" fill="#c0c4cc" fontSize="11" fontWeight="600">expenses</text>
            <text x="30" y="108" fill="#9ca3af" fontSize="10">id, user_id, amount,</text>
            <text x="30" y="120" fill="#9ca3af" fontSize="10">category, created_at</text>
            <text x="20" y="140" fill="#c0c4cc" fontSize="11" fontWeight="600">categories</text>
            <text x="30" y="154" fill="#9ca3af" fontSize="10">id, name, keywords[]</text>
            <text x="20" y="178" fill="#fbbf24" fontSize="10" fontStyle="italic">關鍵 index：</text>
            <text x="20" y="194" fill="#9ca3af" fontSize="10">expenses(user_id, created_at)</text>
            <text x="20" y="208" fill="#9ca3af" fontSize="10">— 月度 query 嘅 hot path</text>
          </g>

          <g transform="translate(500,50)">
            <rect width="240" height="220" rx="14" fill="url(#gradPDBreak)" stroke="#f87171" strokeWidth="2" filter="url(#shadowPD)" />
            <text x="120" y="30" textAnchor="middle" fill="#fca5a5" fontSize="13" fontWeight="700">③ 邊度會先壞？</text>
            <line x1="20" y1="42" x2="220" y2="42" stroke="#2a2d3a" strokeWidth="1" />
            <text x="20" y="62" fill="#fbbf24" fontSize="11" fontWeight="600">假設 1K MAU →</text>
            <text x="20" y="78" fill="#9ca3af" fontSize="10">DB query 樽頸：月度報告 query</text>
            <text x="20" y="92" fill="#9ca3af" fontSize="10">→ Solution: 加 composite index</text>
            <text x="20" y="116" fill="#fbbf24" fontSize="11" fontWeight="600">假設 10K MAU →</text>
            <text x="20" y="132" fill="#9ca3af" fontSize="10">自動分類嘅 AI call 太多</text>
            <text x="20" y="146" fill="#9ca3af" fontSize="10">→ Solution: 緩存 + batch</text>
            <text x="20" y="170" fill="#fbbf24" fontSize="11" fontWeight="600">假設 100K MAU →</text>
            <text x="20" y="186" fill="#9ca3af" fontSize="10">Supabase free tier 唔夠</text>
            <text x="20" y="200" fill="#9ca3af" fontSize="10">→ Solution: 升級 paid tier</text>
          </g>
        </svg>
      </div>

      <div className="quote-block">
        <p>「Solo dev 嘅 SDD 唔需要 perfect — 需要 sufficient。識別到第一個會壞嘅 component，就已經贏咗 80% 嘅 panic-driven debugging。」</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>呢階段嘅常見錯誤</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>Skip PRD 直接 Build：</strong>係最常見錯。AI 唔知你要乜，build 出嚟唔啱意，refactor 浪費時間。</span></li>
        <li><span className="step-num">2</span><span><strong>SDD 寫得過份完整：</strong>Solo dev 唔需要 50 頁文件。1 頁 + 1 張圖就夠。寫太多反而拖慢。</span></li>
        <li><span className="step-num">3</span><span><strong>揀錯 tech stack：</strong>因為「人哋 trendy」而揀冇用過嘅 stack — 學習成本 + bug rate 雙重 hit。揀熟嘅。</span></li>
        <li><span className="step-num">4</span><span><strong>冇諗 scaling bottleneck：</strong>等到 production 壞咗先 panic。SDD 階段花 5 分鐘預測，可以救返一晚通宵。</span></li>
        <li><span className="step-num">5</span><span><strong>Out-of-scope 唔寫低：</strong>下個禮拜自己就會諗「不如加埋 X」— 寫低 out-of-scope 等於提前 say no。</span></li>
      </ol>

      <div className="use-case">
        <h4>實戰建議</h4>
        <p>Solo dev 寫 PRD 同 SDD 嘅總時間應該係 <strong>30-60 分鐘</strong>。冇少於 30 分鐘嘅深度（會錯過 thinking time），亦冇多於 60 分鐘嘅 over-engineering（會 paralysis-by-analysis）。寫完 commit 入 `docs/` folder — 第時自己會多謝呢個 self。</p>
      </div>
    </div>
  );
}

function BuildReviewShipTab() {
  return (
    <div className="card">
      <h2>③ Build + ④ Review + ⑤ Ship</h2>
      <div className="subtitle">由 AI 寫 code 到自動上線 — 三步閉環</div>
      <p>
        計劃文件 ready 之後，就到 execution 階段。呢個階段嘅 leverage 最大 — AI 工具大幅加速每一步，但同時 human judgment 嘅角色亦最關鍵。Build / Review / Ship 形成一個 tight loop：寫一個 feature → review → push → 自動 deploy → 望 alert → 繼續下一個 feature。
      </p>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>③ Build — 用 Claude Code 一個 feature 一個 feature 落實</h3>
      <p>
        將 PRD 嘅 must-have list 由細到大排序，由最 core 嘅一個 feature 開始用 <strong style={{ color: '#fbbf24' }}>Claude Code</strong>（或 Cursor、Windsurf）實作。重點係<strong>每個 feature 完之後做 user-perspective self-test</strong> — 唔係「code 跑得到」就算完，要「個 user 用呢個 feature 真係解決到佢嘅問題」先算完。
      </p>

      <div className="key-points">
        <div className="key-point"><h4>由最 core feature 入手</h4><p>例如記帳 app 嘅 core 係「30 秒 input + 自動分類」— 呢個 work 咗，整個產品 80% 就 work。其他都係 polish。</p></div>
        <div className="key-point"><h4>每 feature 都做 self-test</h4><p>5 條問題：(1) 真係 run 到？(2) User 睇到乜？(3) 漏咗咩明顯嘢？(4) Happy path + edge case 都試過？(5) 自己會唔會 ashamed 俾人 review？</p></div>
        <div className="key-point"><h4>Commit 細而頻密</h4><p>每個 feature 一個 commit，message 清楚（e.g. <code>feat: add auto-categorization</code>）。小 commit 等於小 PR 等於易 review、易 rollback。</p></div>
        <div className="key-point"><h4>Resist scope creep</h4><p>過程中一定會諗到新 idea — 寫入 `ideas.md`，唔好即刻 build。PRD 嘅 must-have 做完先講。</p></div>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>④ Review — CodeRabbit / Claude review CLI</h3>
      <p>
        Solo dev 冇隊友幫你 review。但你絕對需要 review — 自己寫嘅 code 自己睇成日都睇唔出 bug。所以喺開 PR 之前，先喺 CLI 用 <strong style={{ color: '#f472b6' }}>CodeRabbit</strong>（或者 Claude review skill）跑一次自動 review。佢哋特別擅長揾人類 miss 嘅嘢：
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowBR" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <linearGradient id="gradBRCode" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradBRBot" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#25132a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradBRFix" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBR" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
          </defs>

          <text x="400" y="22" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">PR 前嘅 CLI Review Loop</text>

          <g transform="translate(30,60)">
            <rect width="180" height="80" rx="14" fill="url(#gradBRCode)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadowBR)" />
            <text x="90" y="28" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">寫完 Feature</text>
            <text x="90" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">本地 commit 完</text>
            <text x="90" y="64" textAnchor="middle" fill="#9ca3af" fontSize="10">未開 PR</text>
          </g>

          <g transform="translate(290,60)">
            <rect width="220" height="80" rx="14" fill="url(#gradBRBot)" stroke="#EC4899" strokeWidth="2" filter="url(#shadowBR)" />
            <text x="110" y="28" textAnchor="middle" fill="#f472b6" fontSize="13" fontWeight="700">CodeRabbit CLI</text>
            <text x="110" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">自動掃 changed files</text>
            <text x="110" y="64" textAnchor="middle" fill="#9ca3af" fontSize="10">出 review comments</text>
          </g>

          <g transform="translate(590,60)">
            <rect width="180" height="80" rx="14" fill="url(#gradBRFix)" stroke="#10B981" strokeWidth="2" filter="url(#shadowBR)" />
            <text x="90" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Apply Fixes</text>
            <text x="90" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">判斷邊啲 accept</text>
            <text x="90" y="64" textAnchor="middle" fill="#9ca3af" fontSize="10">改完再 commit</text>
          </g>

          <path d="M210,100 C240,100 260,100 288,100" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBR)" />
          <path d="M510,100 C540,100 560,100 588,100" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBR)" />

          <g transform="translate(80,170)">
            <rect width="640" height="90" rx="14" fill="rgba(244,114,182,0.06)" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="6,3" />
            <text x="320" y="28" textAnchor="middle" fill="#f472b6" fontSize="13" fontWeight="700">CodeRabbit 通常會揾到嘅 sneaky bugs</text>
            <text x="320" y="52" textAnchor="middle" fill="#c0c4cc" fontSize="11">• Null / undefined 漏 check（async response 冇 fallback）</text>
            <text x="320" y="70" textAnchor="middle" fill="#c0c4cc" fontSize="11">• Race condition（兩個 async 同時改同一個 state）</text>
            <text x="320" y="86" textAnchor="middle" fill="#c0c4cc" fontSize="11">• Off-by-one、漏 await、type narrowing miss、SQL injection 風險</text>
          </g>
        </svg>
      </div>

      <div className="quote-block">
        <p>「自己寫嘅 code 自己 review 等於自己改自己嘅 essay — 永遠睇唔到 typo。AI review 就係你嘅 fresh pair of eyes。」</p>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '24px', marginBottom: '12px' }}>⑤ Ship — Push to CI/CD 即上線</h3>
      <p>
        Apply 完 review fixes，下一步就係 <code>git push</code>。背後嘅 <strong style={{ color: '#34d399' }}>CI/CD pipeline</strong>（GitHub Actions、Vercel、Netlify 等）會自動：(1) 跑 unit test + integration test；(2) build production bundle；(3) deploy 上 staging 確認 health check；(4) auto-promote 到 production。整個過程 5-10 分鐘，零手動。
      </p>

      <div className="code-block"><span className="code-comment"># .github/workflows/deploy.yml — Solo Dev minimal pipeline</span>{'\n'}name: Deploy{'\n'}on:{'\n'}  push:{'\n'}    branches: [main]{'\n\n'}jobs:{'\n'}  test-and-deploy:{'\n'}    runs-on: ubuntu-latest{'\n'}    steps:{'\n'}      - uses: actions/checkout@v4{'\n'}      - uses: actions/setup-node@v4{'\n'}        with: {'{'} node-version: 20 {'}'}{'\n'}      - run: npm ci{'\n'}      - run: npm test          <span className="code-comment"># 一失敗 pipeline 即停</span>{'\n'}      - run: npm run build{'\n'}      - run: npx vercel --prod  <span className="code-comment"># 自動 deploy</span></div>

      <div className="key-points">
        <div className="key-point"><h4>Test 唔過就唔 deploy</h4><p>Pipeline 第一道防線。Test fail → pipeline stop → 你收 alert → 修咗再 push。絕對唔可以 skip。</p></div>
        <div className="key-point"><h4>Staging 行先確認</h4><p>有 budget 嘅話加 staging stage — production-like 環境跑 smoke test 確認 build 健康先 promote。</p></div>
        <div className="key-point"><h4>Set Alert，唔好 watch dashboard</h4><p>Deploy 完唔需要望住 metrics — set 好 alert rules（error rate 升、p99 升、health check fail），出事自動 send Slack。冇事就 set and forget。</p></div>
        <div className="key-point"><h4>Rollback 一鍵搞掂</h4><p>Vercel / Netlify 等 platform 自動保留歷史 deployment。出事 click 一下 rollback 到上一個 version，5 秒搞掂。呢個係手動 deploy 永遠做唔到嘅。</p></div>
      </div>

      <div className="quote-block">
        <p>「Solo dev 嘅 ship moment 應該係：<code>git push origin main</code> → 五分鐘後 Vercel email 通知 deployed → 講聲『Shipped』就食飯。」</p>
      </div>

      <div className="use-case">
        <h4>整個 Pipeline 嘅閉環</h4>
        <p>
          <strong style={{ color: '#60a5fa' }}>PRD</strong>（30 分鐘）→
          <strong style={{ color: '#a5b4fc' }}>SDD</strong>（30 分鐘）→
          <strong style={{ color: '#fbbf24' }}>Build</strong>（幾日 - 幾星期，逐個 feature）→
          <strong style={{ color: '#f472b6' }}>Review</strong>（每個 PR 10 分鐘）→
          <strong style={{ color: '#34d399' }}>Ship</strong>（5 分鐘自動）。
          每階段嘅 deliverable 清晰，AI 喺每階段提供 leverage，但 human 留住 critical decision。呢個就係 AI 時代 Solo Dev 嘅實際樣貌 — 唔係一個人寫晒所有嘢，而係一個人 orchestrate 一條 reliable pipeline。
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
        <h4>Prompt 1 — 生成 Solo Dev PRD</h4>
        <div className="prompt-text">幫手寫一份 Solo Dev 規模嘅 PRD（1-2 頁 markdown）。{'\n\n'}產品 idea：<span className="placeholder">[一句話描述產品]</span>{'\n'}目標用戶：<span className="placeholder">[Persona 描述]</span>{'\n'}預計 v1 開發時間：<span className="placeholder">[例如 2 個禮拜 / 1 個月]</span>{'\n\n'}請輸出嚴格按以下結構嘅 markdown：{'\n'}1. ## Problem Statement{'\n'}   - 邊個有問題（target user）{'\n'}   - 個問題具體係乜（pain point）{'\n'}   - 點解現有方案唔好（differentiation）{'\n'}2. ## Target User & Use Cases{'\n'}   - 5-10 個 user story，格式：「作為 [角色]，我想 [行為]，咁我可以 [結果]」{'\n'}3. ## Feature Scope{'\n'}   - Must-have（v1 必有，3-5 個）{'\n'}   - Nice-to-have（v2 再講，3-5 個）{'\n'}   - Out-of-scope（永遠唔做，3-5 個）{'\n'}4. ## Success Metrics{'\n'}   - 點樣判斷 v1 成功（KPI）{'\n'}5. ## Open Questions{'\n'}   - 仲未決定嘅關鍵問題（例如要唔要 free tier）</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 生成 Solo Dev System Design Doc</h4>
        <div className="prompt-text">基於以下 PRD，幫手寫一份 Solo Dev 規模嘅 System Design Doc（1 頁 + 1 張 diagram）。{'\n\n'}PRD 摘要：<span className="placeholder">[貼上 PRD 摘要]</span>{'\n'}預計流量：<span className="placeholder">[預計 v1 launch 後 6 個月嘅 MAU / DAU]</span>{'\n'}我熟悉嘅 stack：<span className="placeholder">[例如 Next.js + Postgres / Python + FastAPI]</span>{'\n'}Budget：<span className="placeholder">[每月 cloud budget，例如 HK$300]</span>{'\n\n'}請輸出嚴格按以下結構嘅 markdown：{'\n'}1. ## Tech Stack（揀乜 + 點解，5-7 個 components）{'\n'}2. ## Database Schema（主要 tables + 關係 + 關鍵 index）{'\n'}3. ## API Endpoints（v1 最核心嘅 5-10 個 endpoint）{'\n'}4. ## 邊度會先壞？{'\n'}   - 1K MAU 時邊個 component 先到極限 + 點 fix{'\n'}   - 10K MAU 時邊個 component 先到極限 + 點 fix{'\n'}   - 100K MAU 時邊個 component 先到極限 + 點 fix{'\n'}5. ## 第三方依賴（auth / payment / email / monitoring，列 vendor）{'\n'}6. ## 部署架構（簡單嘅 ASCII 或 Mermaid diagram）</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 為 Solo Dev 項目 setup CI/CD Pipeline</h4>
        <div className="prompt-text">為一個 Solo Dev 項目 setup 完整嘅 CI/CD pipeline。{'\n\n'}項目技術棧：<span className="placeholder">[例如 Next.js + Postgres + Vercel]</span>{'\n'}Hosting：<span className="placeholder">[Vercel / Netlify / Cloudflare Pages / AWS Amplify]</span>{'\n'}Git host：<span className="placeholder">[GitHub / GitLab]</span>{'\n\n'}請輸出完整方案：{'\n'}1. 完整可用嘅 GitHub Actions / GitLab CI workflow YAML{'\n'}2. Test stage：unit test + lint + type check（並行執行）{'\n'}3. Build stage：production build 同 cache 策略{'\n'}4. Preview deploy：每個 PR 自動 deploy preview URL{'\n'}5. Production deploy：merge to main 後自動 promote{'\n'}6. Alert setup：deploy fail / health check fail / error rate 升 → Slack{'\n'}7. Rollback：點樣一鍵 rollback 到上一個 version{'\n'}8. Secrets 管理：邊啲 secret 應該放邊（GitHub Secrets / Vercel env / Doppler）{'\n'}9. 推薦嘅 review 工具（CodeRabbit / Claude review skill）嘅 setup steps</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 4 — 為 Pre-PR Review 建立 CodeRabbit / Claude Review Workflow</h4>
        <div className="prompt-text">幫手 setup 一個 Solo Dev 嘅 pre-PR review workflow，用 AI 自動 catch sneaky bug。{'\n\n'}項目語言：<span className="placeholder">[TypeScript / Python / Go]</span>{'\n'}IDE：<span className="placeholder">[VS Code / Cursor / Claude Code CLI]</span>{'\n\n'}請輸出：{'\n'}1. CodeRabbit CLI 安裝同設定步驟（含 API key 點攞）{'\n'}2. Claude Code 嘅 /review slash command 用法 + 自訂 review rule 嘅方法{'\n'}3. 建立一份 review checklist 俾 AI 跟：null/undefined、async race、edge case、security、performance{'\n'}4. 點樣寫 review-friendly 嘅 commit message 等 AI 更易理解 changes{'\n'}5. 整合到 git hook（pre-push）強制 review 過先可以 push{'\n'}6. 點樣判斷邊啲 AI suggestion 應該 accept、邊啲 ignore（避免 over-correcting）{'\n'}7. 一個 sample PR — show 出 AI 揾到嘅 typical bug 同對應 fix</div>
      </div>
    </div>
  );
}

export default function SoloDevPipeline() {
  return (
    <>
      <TopicTabs
        title="Solo Dev 全流程：Design to Deployment"
        subtitle="PRD → System Design → Build → Review → Ship 嘅 5 階段 Pipeline"
        tabs={[
          { id: 'overview', label: '① 五階段總覽', content: <OverviewTab /> },
          { id: 'plan', label: '② Plan + Design', content: <PlanDesignTab /> },
          { id: 'build-ship', label: '③ Build + Review + Ship', premium: true, content: <BuildReviewShipTab /> },
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
