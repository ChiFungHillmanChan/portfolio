import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '12-Factor App 點解要求用環境變數（env vars）嚟管理 Config，而唔係寫死喺代碼入面？',
    options: [
      { text: '環境變數比較快', correct: false, explanation: '速度唔係重點。Config 管理嘅關鍵係 portability 同 security。' },
      { text: '同一份代碼可以唔改動就部署到唔同環境（dev/staging/prod），而且唔會將密鑰洩露到 Git', correct: true, explanation: '如果 database URL 寫死喺代碼入面，deploy 到 production 就要改代碼。用 env vars 嘅話，同一份 Docker image 可以用唔同嘅 env 部署到任何環境。而且密鑰唔會入 Git，減少洩露風險。' },
      { text: '因為環境變數唔使 import', correct: false, explanation: '技術上嘅便利性唔係主因。重點係 deployment flexibility 同 security。' },
      { text: '所有程式語言都支持環境變數', correct: false, explanation: '雖然係事實，但呢個唔係 12-Factor 推薦 env vars 嘅主要原因。' },
    ],
  },
  {
    question: '12-Factor 要求 Processes 係 Stateless（無狀態）。如果用戶嘅 session data 唔存喺 process memory 入面，應該存喺邊？',
    options: [
      { text: '本地文件系統', correct: false, explanation: '本地 file system 同 process 綁定，scale out 嘅時候其他 instance 讀唔到。而且 container 重啟會丟失。' },
      { text: '全局變數', correct: false, explanation: '全局變數存喺 process memory 入面，process 死咗就冇咗，而且多個 instance 之間唔共享。' },
      { text: '外部 Backing Service，例如 Redis 或 Database', correct: true, explanation: '12-Factor 要求 process 係 stateless + share-nothing。Session data 應該存喺外部 backing service（例如 Redis），咁任何一個 process instance 都可以讀到，scale out 或者 process 重啟都唔影響用戶。' },
      { text: '瀏覽器 Cookie（完整 session data）', correct: false, explanation: '將完整 session data 存喺 cookie 有大小限制（4KB）同安全問題。Cookie 應該只存 session ID，實際數據存喺後端。' },
    ],
  },
  {
    question: 'Disposability（可處置性）喺 12-Factor App 入面代表咩意思？',
    options: [
      { text: '可以隨時刪除整個應用', correct: false, explanation: 'Disposability 唔係刪除應用，係指個別 process 可以快速啟動同優雅關閉。' },
      { text: 'Process 可以快速啟動、優雅關閉，隨時可以被替換或重啟', correct: true, explanation: '12-Factor 要求 process 啟動時間短（秒級）、收到 SIGTERM 時優雅關閉（完成進行中嘅請求）、crash 時唔會導致數據損壞。呢個令 deployment、auto-scaling、故障恢復都更加可靠。Docker + K8s 天然支持呢個模式。' },
      { text: '代碼可以隨時被丟棄重寫', correct: false, explanation: 'Disposability 係指 process 層面，唔係代碼層面。' },
      { text: '數據庫可以隨時刪除', correct: false, explanation: '數據庫係 backing service，唔係 disposable process。Database 嘅數據當然要保護。' },
    ],
  },
  {
    question: '以下邊個做法違反咗 12-Factor App 原則？',
    options: [
      { text: '用 Redis 做 session store', correct: false, explanation: '呢個係正確做法。Redis 係 backing service，process 保持 stateless。' },
      { text: '將 database password 寫喺 config.yml 入面然後 commit 到 Git', correct: true, explanation: '嚴重違反 Factor III (Config)。密鑰唔應該存喺 codebase 入面。應該用環境變數或者 secrets manager（例如 AWS Secrets Manager、HashiCorp Vault）。呢個係安全同 portability 嘅大忌。' },
      { text: '用 Docker 將應用打包成 image', correct: false, explanation: 'Docker 完美符合 12-Factor。一次 build，到處 run，配合 env vars 就可以部署到任何環境。' },
      { text: '將 log 輸出到 stdout', correct: false, explanation: '呢個正正係 Factor XI (Logs) 嘅要求。Log 輸出到 stdout，由執行環境（Docker/K8s）負責收集同路由。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'docker', label: 'Docker 容器化' },
  { slug: 'cicd-pipeline', label: 'CI/CD Pipeline' },
  { slug: 'deployment', label: 'Deployment 部署策略' },
  { slug: 'server-vs-serverless', label: 'Server vs Serverless' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>12-Factor App 係咩</h2>
      <div className="subtitle">Cloud-Native 應用嘅 12 條黃金法則</div>
      <p>
        12-Factor App 係 Heroku 嘅工程師喺 2011 年提出嘅方法論，定義咗建立 cloud-native 應用嘅 12 條最佳實踐。雖然已經十幾年，但呢啲原則到今日仲係 Docker、Kubernetes、serverless 嘅核心理念。面試問到 microservices 或者 cloud architecture，識 12-Factor 就加分。
      </p>
      <p>
        點解要遵守？因為如果你嘅 app 唔跟呢啲原則，deploy 到 cloud 嘅時候會遇到好多問題：config 寫死部署唔到、process 有狀態 scale 唔到、log 散落各處 debug 唔到。12-Factor 就係幫你避開呢啲坑。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 520" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradYellow" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d1515" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradTeal" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d3d" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          {/* Title */}
          <text x="390" y="25" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="700">The Twelve Factors</text>

          {/* Row 1: Factors I-IV (Codebase, Dependencies, Config, Backing Services) */}
          <g transform="translate(15,40)">
            <rect width="175" height="65" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#60a5fa" fontSize="11" fontWeight="700">I. Codebase</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">一個 codebase，多個 deploy</text>
            <text x="18" y="56" fill="#3B82F6" fontSize="9">Git repo = single source of truth</text>
          </g>

          <g transform="translate(200,40)">
            <rect width="175" height="65" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#60a5fa" fontSize="11" fontWeight="700">II. Dependencies</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">明確聲明所有依賴</text>
            <text x="18" y="56" fill="#3B82F6" fontSize="9">package.json / requirements.txt</text>
          </g>

          <g transform="translate(385,40)">
            <rect width="175" height="65" rx="12" fill="url(#gradRed)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#fca5a5" fontSize="11" fontWeight="700">III. Config</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">Config 存喺環境變數</text>
            <text x="18" y="56" fill="#f87171" fontSize="9">唔好寫死喺 code 入面！</text>
          </g>

          <g transform="translate(570,40)">
            <rect width="195" height="65" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#a78bfa" fontSize="11" fontWeight="700">IV. Backing Services</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">DB、Redis、S3 當附加資源</text>
            <text x="18" y="56" fill="#8B5CF6" fontSize="9">隨時可以 swap，唔改 code</text>
          </g>

          {/* Row 2: Factors V-VIII */}
          <g transform="translate(15,120)">
            <rect width="175" height="65" rx="12" fill="url(#gradGreen)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#6ee7b7" fontSize="11" fontWeight="700">V. Build, Release, Run</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">嚴格分開 build / release / run</text>
            <text x="18" y="56" fill="#34d399" fontSize="9">Docker build → tag → deploy</text>
          </g>

          <g transform="translate(200,120)">
            <rect width="175" height="65" rx="12" fill="url(#gradRed)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#fca5a5" fontSize="11" fontWeight="700">VI. Processes</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">Stateless + Share-nothing</text>
            <text x="18" y="56" fill="#f87171" fontSize="9">Session 存 Redis，唔好存 memory</text>
          </g>

          <g transform="translate(385,120)">
            <rect width="175" height="65" rx="12" fill="url(#gradYellow)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#fde68a" fontSize="11" fontWeight="700">VII. Port Binding</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">自帶 HTTP server</text>
            <text x="18" y="56" fill="#fbbf24" fontSize="9">export service via port</text>
          </g>

          <g transform="translate(570,120)">
            <rect width="195" height="65" rx="12" fill="url(#gradGreen)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#6ee7b7" fontSize="11" fontWeight="700">VIII. Concurrency</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">用 process model scale out</text>
            <text x="18" y="56" fill="#34d399" fontSize="9">多個 process instance 而唔係 thread</text>
          </g>

          {/* Row 3: Factors IX-XII */}
          <g transform="translate(15,200)">
            <rect width="175" height="65" rx="12" fill="url(#gradRed)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#fca5a5" fontSize="11" fontWeight="700">IX. Disposability</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">快速啟動、優雅關閉</text>
            <text x="18" y="56" fill="#f87171" fontSize="9">SIGTERM → graceful shutdown</text>
          </g>

          <g transform="translate(200,200)">
            <rect width="175" height="65" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#a78bfa" fontSize="11" fontWeight="700">X. Dev/Prod Parity</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">Dev 同 Prod 盡量一致</text>
            <text x="18" y="56" fill="#8B5CF6" fontSize="9">Docker 令環境完全一樣</text>
          </g>

          <g transform="translate(385,200)">
            <rect width="175" height="65" rx="12" fill="url(#gradYellow)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#fde68a" fontSize="11" fontWeight="700">XI. Logs</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">Log 輸出到 stdout</text>
            <text x="18" y="56" fill="#fbbf24" fontSize="9">由環境負責收集 (ELK/Datadog)</text>
          </g>

          <g transform="translate(570,200)">
            <rect width="195" height="65" rx="12" fill="url(#gradTeal)" stroke="#2dd4bf" strokeWidth="2" filter="url(#shadow)" />
            <text x="18" y="25" fill="#5eead4" fontSize="11" fontWeight="700">XII. Admin Processes</text>
            <text x="18" y="42" fill="#9ca3af" fontSize="9">管理任務用 one-off process</text>
            <text x="18" y="56" fill="#2dd4bf" fontSize="9">migration、script 同 app 同環境</text>
          </g>

          {/* Flow arrows showing the journey */}
          <path d="M102,108 L102,118" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <path d="M287,108 L287,118" fill="none" stroke="#f87171" strokeWidth="1.5" />
          <path d="M472,108 L472,118" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
          <path d="M667,108 L667,118" fill="none" stroke="#34d399" strokeWidth="1.5" />

          <path d="M102,188 L102,198" fill="none" stroke="#f87171" strokeWidth="1.5" />
          <path d="M287,188 L287,198" fill="none" stroke="#8B5CF6" strokeWidth="1.5" />
          <path d="M472,188 L472,198" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
          <path d="M667,188 L667,198" fill="none" stroke="#2dd4bf" strokeWidth="1.5" />

          {/* Summary section */}
          <g transform="translate(15,290)">
            <rect width="750" height="110" rx="14" fill="rgba(59,130,246,0.06)" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="5,3" />
            <text x="375" y="25" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="700">核心理念：Build once, run anywhere</text>
            <text x="375" y="48" textAnchor="middle" fill="#60a5fa" fontSize="11">同一份 Docker image + 唔同嘅 env vars = 部署到任何環境</text>
            <text x="187" y="75" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">Stateless Process</text>
            <text x="375" y="75" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">Config in Env Vars</text>
            <text x="562" y="75" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600">Logs to Stdout</text>
            <text x="187" y="95" textAnchor="middle" fill="#9ca3af" fontSize="9">Scale out 無痛</text>
            <text x="375" y="95" textAnchor="middle" fill="#9ca3af" fontSize="9">Deploy anywhere 無改動</text>
            <text x="562" y="95" textAnchor="middle" fill="#9ca3af" fontSize="9">Debug anywhere 無盲點</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>12 Factors 快速記憶</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#3B82F6' }}>Codebase</strong>：一個 Git repo，多個 deployment（dev/staging/prod）。唔好用分支區分環境。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#3B82F6' }}>Dependencies</strong>：所有依賴明確聲明喺 package.json / requirements.txt。唔好假設系統有裝 curl 或者 imagemagick。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#f87171' }}>Config</strong>：Database URL、API key 等 config 用環境變數，唔好寫死喺 code 或 config file commit 到 Git。呢個超級重要。</span></li>
        <li><span className="step-num">4</span><span><strong style={{ color: '#8B5CF6' }}>Backing Services</strong>：Database、Redis、S3 都當做「附加資源」，隨時可以 swap（例如換 MySQL 做 PostgreSQL），唔使改 code。</span></li>
        <li><span className="step-num">5</span><span><strong style={{ color: '#34d399' }}>Build, Release, Run</strong>：嚴格分開三個階段。Build 產出 artifact，Release 加 config，Run 執行。唔好喺 production 直接改 code。</span></li>
        <li><span className="step-num">6</span><span><strong style={{ color: '#f87171' }}>Processes</strong>：Stateless + Share-nothing。Session data 存 Redis，唔好存 process memory。呢個係 scale out 嘅大前提。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>最重要嘅 Factors 深入分析</h2>
      <div className="subtitle">Config / Stateless Processes / Disposability / Dev-Prod Parity / Logs</div>
      <p>
        12 個 Factor 入面，有幾個特別重要，面試同實際開發都會頻繁遇到。以下深入分析呢幾個最關鍵嘅。
      </p>
      <div className="key-points">
        <div className="key-point">
          <h4>Factor III — Config（環境變數）</h4>
          <p>
            Config 係指「喺唔同 deploy 之間會變嘅嘢」：database URL、API key、feature flag。12-Factor 要求用 <code style={{ color: '#60a5fa' }}>env vars</code> 而唔係 config file。原因：config file 容易意外 commit 到 Git（洩露密鑰）、唔同環境要維護唔同嘅 file（容易搞錯）。Env vars 嘅好處係 language-agnostic、唔會入 Git、而且 Docker/K8s 原生支援。
          </p>
        </div>
        <div className="key-point">
          <h4>Factor VI — Stateless Processes</h4>
          <p>
            呢個係好多人犯嘅錯。如果你將 session data 存喺 <code style={{ color: '#60a5fa' }}>process.memory</code> 入面，咁 scale out 到多個 instance 嘅時候，用戶嘅 session 會「唔見咗」（因為 request 可能去到冇佢 session 嘅 instance）。解決方法：session 存 Redis、file 存 S3、cache 存 Memcached。Process 本身唔存任何 persistent state。
          </p>
        </div>
        <div className="key-point">
          <h4>Factor IX — Disposability</h4>
          <p>
            Process 要做到：<strong style={{ color: '#34d399' }}>快速啟動</strong>（秒級，唔好搞幾分鐘嘅 init）同 <strong style={{ color: '#f87171' }}>優雅關閉</strong>（收到 SIGTERM 後完成正在處理嘅 request、釋放資源、然後退出）。呢個令 auto-scaling、rolling deployment、crash recovery 都更加可靠。Docker 會先發 SIGTERM，等 grace period（default 10 秒），之後先 SIGKILL。你嘅 app 要處理 SIGTERM。
          </p>
        </div>
        <div className="key-point">
          <h4>Factor X — Dev/Prod Parity</h4>
          <p>
            「喺我嘅電腦跑得到」——呢句嘢就係因為 dev 同 prod 唔一致。12-Factor 要求三個 parity：<strong style={{ color: '#fbbf24' }}>時間</strong>（code 寫完盡快 deploy，唔好等幾星期）、<strong style={{ color: '#fbbf24' }}>人員</strong>（寫 code 嘅人參與 deploy，唔好丟俾 ops team）、<strong style={{ color: '#fbbf24' }}>工具</strong>（dev 用 SQLite 但 prod 用 PostgreSQL = 災難。用 Docker 令環境一致）。
          </p>
        </div>
        <div className="key-point">
          <h4>Factor XI — Logs as Event Streams</h4>
          <p>
            App 唔應該自己管 log file（寫去 /var/log/app.log）。應該將所有 log 寫去 <code style={{ color: '#60a5fa' }}>stdout</code>，由執行環境負責收集同路由。Docker 會自動 capture stdout/stderr。K8s 配合 Fluentd/Filebeat 收集。Production 用 ELK Stack、Datadog、或 CloudWatch 集中管理。呢個令 log 嘅管理同 app 完全解耦。
          </p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰：Docker + K8s 自然實現 12-Factor</h2>
      <div className="subtitle">Container 化就係 12-Factor 嘅最佳實踐</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Docker 點樣實現 12-Factor</h4>
          <p>Docker 天然符合好多 Factor：Dockerfile 明確聲明 dependencies（Factor II）、docker build 分離 build 同 run（Factor V）、-e 傳 env vars（Factor III）、stdout log 自動 capture（Factor XI）、container 快速啟動同停止（Factor IX）。可以講用 Docker 就已經自動遵守大部分 12-Factor 原則。</p>
        </div>
        <div className="key-point">
          <h4>Kubernetes 加強版</h4>
          <p>K8s 進一步實現：ConfigMap/Secret 管理 config（Factor III）、HPA 用 process model scale out（Factor VIII）、Pod 嘅 lifecycle hook 支援 graceful shutdown（Factor IX）、同一個 image 部署到 dev/staging/prod namespace（Factor X）。K8s 可以話係 12-Factor 嘅最佳載體。</p>
        </div>
        <div className="key-point">
          <h4>常見 Anti-Patterns 要避免</h4>
          <p>
            <strong style={{ color: '#f87171' }}>1.</strong> 將 config 寫喺 JSON/YAML file commit 到 Git（Factor III 違反）。
            <strong style={{ color: '#f87171' }}> 2.</strong> Session 存喺 process memory（Factor VI 違反）。
            <strong style={{ color: '#f87171' }}> 3.</strong> Log 寫去本地 file（Factor XI 違反）。
            <strong style={{ color: '#f87171' }}> 4.</strong> Dev 用 SQLite 但 prod 用 PostgreSQL（Factor X 違反）。
            <strong style={{ color: '#f87171' }}> 5.</strong> 喺 production server SSH 入去改 code（Factor V 違反）。
            呢五個係最常見嘅錯誤，一定要避免。
          </p>
        </div>
        <div className="key-point">
          <h4>Serverless 同 12-Factor</h4>
          <p>AWS Lambda / Google Cloud Functions 天然 stateless（Factor VI）、env vars 管 config（Factor III）、自動 scale（Factor VIII）、log 去 CloudWatch（Factor XI）。Serverless 可以話係最徹底嘅 12-Factor 實現——你甚至唔使諗 process management。不過要注意 cold start 對 Disposability（Factor IX）嘅影響。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>總結</h4>
        <p>12-Factor App 嘅核心就係一句：build once, configure everywhere, scale freely。Docker 令你 build once，env vars 令你 configure everywhere，stateless process 令你 scale freely。掌握呢三點，就掌握咗 12-Factor 嘅精髓。</p>
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
        <h4>Prompt 1 — 將現有應用改造成 12-Factor App</h4>
        <div className="prompt-text">
          幫手將一個現有嘅 <span className="placeholder">[例如：Node.js Express / Python Django / Java Spring Boot]</span> 應用改造成符合 12-Factor App 原則。{'\n\n'}現狀：{'\n'}- Config 寫喺 <span className="placeholder">[config.json / settings.py / application.yml]</span> 入面，包含 database password{'\n'}- Session 存喺 process memory（express-session default store）{'\n'}- Log 寫去本地 file（/var/log/app.log）{'\n'}- Deploy 方式：SSH 入 server 然後 git pull{'\n'}- Dev 用 SQLite，Prod 用 <span className="placeholder">[PostgreSQL / MySQL]</span>{'\n\n'}需要改造嘅部分（按 12 Factor 逐個對照）：{'\n'}1. Factor III — Config：將所有 config 遷移到 env vars，用 dotenv 做 local dev{'\n'}2. Factor VI — Processes：Session 遷移到 Redis{'\n'}3. Factor XI — Logs：改用 stdout，配合 <span className="placeholder">[winston / pino / logging module]</span>{'\n'}4. Factor V — Build/Release/Run：寫 Dockerfile + docker-compose.yml{'\n'}5. Factor X — Dev/Prod Parity：Dev 同 Prod 用同一個 DB engine{'\n'}6. Factor IX — Disposability：加 graceful shutdown handler（SIGTERM）{'\n\n'}請提供改造前後嘅完整代碼對比、Dockerfile、docker-compose.yml、同 CI/CD pipeline 配置。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 從零開始建立 12-Factor Microservice</h4>
        <div className="prompt-text">
          用 <span className="placeholder">[Node.js / Go / Python]</span> 從零開始建立一個完全符合 12-Factor 原則嘅 microservice。{'\n\n'}Service 功能：<span className="placeholder">[例如：用戶認證 API / 訂單處理 / 通知發送]</span>{'\n\n'}要求（逐個 Factor 實現）：{'\n'}1. Codebase：Git repo 結構、branching strategy{'\n'}2. Dependencies：package manager lockfile、Dockerfile multi-stage build{'\n'}3. Config：所有 config via env vars、用 <span className="placeholder">[dotenv / viper / python-decouple]</span> 做 local dev{'\n'}4. Backing Services：<span className="placeholder">[PostgreSQL / MongoDB]</span> + Redis 連線用 URL env var{'\n'}5. Build/Release/Run：Docker build → tag → deploy 流程{'\n'}6. Processes：完全 stateless、session in Redis{'\n'}7. Port Binding：自帶 HTTP server、PORT env var{'\n'}8. Concurrency：horizontal scaling via Kubernetes HPA{'\n'}9. Disposability：SIGTERM graceful shutdown、startup probe{'\n'}10. Dev/Prod Parity：docker-compose for local dev，same DB engine{'\n'}11. Logs：structured JSON logging to stdout{'\n'}12. Admin：database migration as one-off K8s Job{'\n\n'}請提供完整嘅 project structure、所有源代碼、Dockerfile、docker-compose.yml、K8s manifests（Deployment + Service + ConfigMap + Secret + HPA）、同 GitHub Actions CI/CD pipeline。
        </div>
      </div>
    </div>
  );
}

export default function TwelveFactorApp() {
  return (
    <>
      <TopicTabs
        title="12-Factor App"
        subtitle="Config / Logging / Disposability"
        tabs={[
          { id: 'overview', label: '① 12 Factors', content: <OverviewTab /> },
          { id: 'advanced', label: '② 深入分析', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰應用', premium: true, content: <PracticeTab /> },
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
