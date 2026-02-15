import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'docker', label: 'Docker 容器化' },
  { slug: 'cicd-pipeline', label: 'CI/CD 自動化部署' },
  { slug: 'system-design-patterns', label: '系統設計模式總覽' },
];

function RoadmapTab() {
  return (
    <div className="card">
      <h2>Backend Engineer 學習路線圖</h2>
      <div className="subtitle">五個階段，由基礎到進階</div>
      <p>Backend 開發嘅學習路線好清晰，但好多人會喺中間迷失方向。關鍵在於按正確嘅順序學，每個階段打好基礎先去下一步。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 500" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#4a1c1c" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#10B981" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          {/* Stage 1: Programming Language */}
          <g transform="translate(225, 10)">
            <rect width="250" height="70" rx="14" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="125" y="30" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">Stage 1: Programming Language</text>
            <text x="125" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">Java / Python / Go</text>
          </g>

          {/* Arrow 1->2 */}
          <path d="M350,80 C350,90 350,95 350,105" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />

          {/* Stage 2: Linux & CLI */}
          <g transform="translate(225, 108)">
            <rect width="250" height="70" rx="14" fill="url(#gradAmber)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="125" y="30" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="700">Stage 2: Linux &amp; CLI</text>
            <text x="125" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">Shell / SSH / Scripting</text>
          </g>

          {/* Arrow 2->3 */}
          <path d="M350,178 C350,188 350,193 350,203" stroke="#F59E0B" strokeWidth="2" fill="none" markerEnd="url(#arrAmber)" />

          {/* Stage 3: Database */}
          <g transform="translate(225, 206)">
            <rect width="250" height="70" rx="14" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="125" y="30" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">Stage 3: Database</text>
            <text x="125" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">PostgreSQL / Redis / MongoDB</text>
          </g>

          {/* Arrow 3->4 */}
          <path d="M350,276 C350,286 350,291 350,301" stroke="#10B981" strokeWidth="2" fill="none" markerEnd="url(#arrGreen)" />

          {/* Stage 4: API & Web Framework */}
          <g transform="translate(225, 304)">
            <rect width="250" height="70" rx="14" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="125" y="30" textAnchor="middle" fill="#8B5CF6" fontSize="14" fontWeight="700">Stage 4: API &amp; Web Framework</text>
            <text x="125" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">Spring Boot / Express / FastAPI</text>
          </g>

          {/* Arrow 4->5 */}
          <path d="M350,374 C350,384 350,389 350,399" stroke="#8B5CF6" strokeWidth="2" fill="none" markerEnd="url(#arrPurple)" />

          {/* Stage 5: Cloud & DevOps */}
          <g transform="translate(225, 402)">
            <rect width="250" height="70" rx="14" fill="url(#gradRed)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="125" y="30" textAnchor="middle" fill="#EF4444" fontSize="14" fontWeight="700">Stage 5: Cloud &amp; DevOps</text>
            <text x="125" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">Docker / AWS / CI/CD</text>
          </g>
        </svg>
      </div>

      <ul className="steps">
        <li>
          <div className="step-num">1</div>
          <div><strong style={{ color: '#3B82F6' }}>Programming Language</strong>：揀一門語言深入學習。Java + Spring Boot 係最穩陣嘅選擇，市場需求最大。Python 同 Go 都係好選擇。</div>
        </li>
        <li>
          <div className="step-num">2</div>
          <div><strong style={{ color: '#F59E0B' }}>Linux &amp; CLI</strong>：Backend 幾乎一定跑喺 Linux 上。必須熟悉基本命令（cd、ls、grep、chmod）、shell scripting、同 SSH。</div>
        </li>
        <li>
          <div className="step-num">3</div>
          <div><strong style={{ color: '#10B981' }}>Database</strong>：SQL 係必修。由 PostgreSQL 或 MySQL 開始，學識 CRUD、JOIN、INDEX、Transaction。之後再學 NoSQL（Redis、MongoDB）。</div>
        </li>
        <li>
          <div className="step-num">4</div>
          <div><strong style={{ color: '#8B5CF6' }}>API &amp; Web Framework</strong>：學識設計 RESTful API，理解 HTTP 協議。用 Spring Boot / Express / FastAPI 等框架建立完整嘅後端服務。</div>
        </li>
        <li>
          <div className="step-num">5</div>
          <div><strong style={{ color: '#EF4444' }}>Cloud &amp; DevOps</strong>：學 Docker、基本 AWS 服務（EC2、S3、RDS）、CI/CD pipeline。呢一步令開發者可以獨立部署同維護系統。</div>
        </li>
      </ul>
    </div>
  );
}

function SkillsTab() {
  return (
    <>
      <div className="card">
        <h2>Backend 核心技能詳解</h2>
        <div className="subtitle">每個技能領域嘅深入要點</div>
        <div className="key-points">
          <div className="key-point">
            <h4>Java + Spring Boot</h4>
            <p>Java 係企業級開發嘅首選。Spring Boot 大幅簡化配置，提供 dependency injection、ORM（JPA/Hibernate）、security 等完整生態。學識 Spring Boot 等於掌握一套完整嘅 backend 解決方案。</p>
          </div>
          <div className="key-point">
            <h4>SQL &amp; Database Design</h4>
            <p>識寫 SQL 只係基本。真正重要嘅係 database design——正規化、index 策略、query optimization。理解 ACID 同 transaction isolation level 對寫出可靠嘅系統至關重要。</p>
          </div>
          <div className="key-point">
            <h4>REST API Design</h4>
            <p>好嘅 API 設計直接影響系統嘅可維護性。遵循 RESTful 規範、用正確嘅 HTTP method 同 status code、設計清晰嘅 endpoint naming。學識用 OpenAPI/Swagger 做文檔。</p>
          </div>
          <div className="key-point">
            <h4>Docker &amp; Containers</h4>
            <p>Docker 解決咗「喺我機行到」嘅問題。學識寫 Dockerfile、docker-compose、理解 image 同 container 嘅分別。Kubernetes 可以之後再學，Docker 先行。</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>進階技能</h2>
        <div className="subtitle">成為更全面嘅 Backend Engineer</div>
        <div className="key-points">
          <div className="key-point">
            <h4>Git 版本控制</h4>
            <p>每日都會用嘅工具。除咗基本嘅 add/commit/push，仲要識 branching strategy、merge conflict resolution、rebase。參考 Git vs GitHub 課題了解更多。</p>
          </div>
          <div className="key-point">
            <h4>Testing</h4>
            <p>寫測試係專業開發者嘅基本要求。學識 unit test（JUnit/pytest）、integration test、同 mocking。目標係建立「改 code 唔怕 break」嘅信心。</p>
          </div>
          <div className="key-point">
            <h4>Security 基礎</h4>
            <p>了解 OWASP Top 10、SQL injection、XSS、CSRF。學識用 bcrypt hash password、實現 JWT authentication、設定 HTTPS。安全唔係選修，係必修。</p>
          </div>
          <div className="key-point">
            <h4>Message Queue</h4>
            <p>當系統需要異步處理，message queue 就登場。學 Kafka 或 RabbitMQ 嘅基本概念：producer、consumer、topic、partition。</p>
          </div>
        </div>
      </div>
    </>
  );
}

function AdviceTab() {
  return (
    <div className="card">
      <h2>學習實戰建議</h2>
      <div className="subtitle">避免常見嘅學習陷阱</div>
      <p>最大嘅陷阱係「Tutorial Hell」——不斷睇教學但從來冇自己動手做 project。學完每個階段都應該做一個小 project 鞏固知識。</p>
      <p>第二個陷阱係「咩都學少少但冇一樣精」。建議揀一個技術棧深入學習（例如 Java + Spring Boot + PostgreSQL + Docker + AWS），而唔係蜻蜓點水咁學五六種語言。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>Portfolio Projects</h4>
          <p>建議做嘅 project：1. REST API CRUD 應用 2. 帶 authentication 嘅完整系統 3. 用 message queue 嘅異步處理系統 4. 部署到 AWS 嘅完整 project。</p>
        </div>
        <div className="key-point">
          <h4>開源貢獻</h4>
          <p>參與開源 project 係最好嘅學習方式之一。由修 bug 同寫文檔開始，慢慢參與 feature 開發。呢個經驗對求職非常有幫助。</p>
        </div>
        <div className="key-point">
          <h4>學習資源</h4>
          <p>官方文檔永遠係最好嘅學習資源。Spring Boot 官方 Guide、PostgreSQL 文檔、AWS 文檔都寫得非常好。避免過度依賴 YouTube 教學。</p>
        </div>
        <div className="key-point">
          <h4>時間預期</h4>
          <p>由零到初級 Backend Engineer 水平，全職學習大概需要 6-12 個月。關鍵係每日保持學習嘅一致性，而唔係短期衝刺。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>建議嘅技術棧</h4>
        <p>最推薦嘅入門組合：Java + Spring Boot + PostgreSQL + Redis + Docker + AWS。呢個組合涵蓋咗大部分 Backend 職位嘅要求，而且每一個技術都有大量嘅學習資源同社區支持。</p>
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
        <h4>Prompt 1 — 生成個人化 Backend 學習路線</h4>
        <div className="prompt-text">
          幫手制定一個個人化嘅 Backend Engineer 學習路線。{'\n\n'}現有基礎：{'\n'}- 程式語言經驗：<span className="placeholder">[完全零基礎 / 識基本 Python / 有前端經驗 / 其他]</span>{'\n'}- 每週可投入學習時間：<span className="placeholder">[10 小時 / 20 小時 / 40 小時（全職）]</span>{'\n'}- 目標時間：<span className="placeholder">[3 個月 / 6 個月 / 12 個月]</span> 內達到初級 Backend Engineer 水平{'\n'}- 偏好語言：<span className="placeholder">[Java / Python / Go / JavaScript]</span>{'\n\n'}需要包含：{'\n'}1. 分階段學習計劃（每個階段嘅目標、學習內容、預計時間）{'\n'}2. 每個階段推薦嘅學習資源（官方文檔、實戰教程）{'\n'}3. 每個階段必做嘅 Mini Project（由簡單到複雜）{'\n'}4. 每週學習時間表模板{'\n'}5. 自我評估 Checklist：每個階段完成前需要識嘅技能清單{'\n'}6. 常見學習陷阱同避免方法（Tutorial Hell、學太廣唔夠深等）{'\n\n'}請根據以上資料生成一個切實可行嘅學習計劃。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Backend 架構練習 Project</h4>
        <div className="prompt-text">
          幫手設計一個完整嘅 Backend Project，用嚟練習核心 Backend 技能。{'\n\n'}Project 主題：<span className="placeholder">[URL Shortener / Todo API / 電商 API / Blog 平台 / 即時聊天系統]</span>{'\n'}技術棧：<span className="placeholder">[Java + Spring Boot / Python + FastAPI / Node.js + Express / Go + Gin]</span>{'\n'}Database：<span className="placeholder">[PostgreSQL / MySQL]</span> + Redis{'\n\n'}需要設計：{'\n'}1. 完整嘅功能需求清單（MVP scope）{'\n'}2. Database Schema 設計（ERD 同 table 定義）{'\n'}3. RESTful API endpoint 設計（路徑、method、request/response format）{'\n'}4. Authentication 方案（JWT / Session）{'\n'}5. Project 結構同檔案組織建議{'\n'}6. Docker Compose 開發環境配置{'\n'}7. 基本嘅 CI/CD Pipeline 設定（GitHub Actions）{'\n'}8. 分階段實施計劃（先做邊個功能，後做邊個）{'\n\n'}請提供可以直接開始 coding 嘅詳細設計文檔。
        </div>
      </div>
    </div>
  );
}

export default function BackendRoadmap() {
  return (
    <>
      <TopicTabs
        title="Backend 學習路線"
        subtitle="由零開始成為 Backend Engineer 嘅完整學習地圖"
        tabs={[
          { id: 'roadmap', label: '① 學習路線', content: <RoadmapTab /> },
          { id: 'skills', label: '② 核心技能', content: <SkillsTab /> },
          { id: 'advice', label: '③ 實戰建議', premium: true, content: <AdviceTab /> },
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
