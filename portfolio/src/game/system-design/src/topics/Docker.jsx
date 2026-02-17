import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Docker 主要解決咩問題？',
    options: [
      { text: '令程式跑得更快', correct: false, explanation: 'Docker 嘅核心目的唔係提升性能，Container 甚至可能有少少 overhead' },
      { text: '開發環境同生產環境不一致嘅問題', correct: true, explanation: 'Docker 將應用連同所有依賴打包成 Container，確保喺任何環境都運行一致，徹底解決「It works on my machine」嘅問題' },
      { text: '自動幫你寫 code', correct: false, explanation: 'Docker 係容器化工具，唔係 code generator' },
      { text: '取代 Git 做版本控制', correct: false, explanation: 'Docker 同 Git 係完全唔同嘅工具，Docker 管容器，Git 管 code 版本' },
    ],
  },
  {
    question: '點解建議用 Alpine 做 Docker base image，而唔係 Ubuntu？',
    options: [
      { text: 'Alpine 預裝更多工具，用起嚟更方便', correct: false, explanation: '啱啱相反，Alpine 極度精簡，連 Bash 同 Curl 都冇預裝，需要用 apk add 手動安裝' },
      { text: 'Alpine 只有約 5MB，比 Ubuntu 嘅 200MB 細 40 倍，大幅加速 build 同 deploy', correct: true, explanation: 'Alpine 係超輕量 Linux 發行版，核心理念係「只裝需要嘅」。細 Image 意味住更快嘅 build time、更快嘅傳輸同更快嘅啟動速度' },
      { text: 'Alpine 嘅安全性比 Ubuntu 差，所以冇人攻擊', correct: false, explanation: 'Alpine 嘅安全性唔差，反而因為攻擊面更小（裝嘅嘢少），某程度上更安全' },
      { text: 'Ubuntu 已經唔再維護，所以要用 Alpine', correct: false, explanation: 'Ubuntu 仍然係最受歡迎嘅 Linux 發行版之一，持續有維護同更新' },
    ],
  },
  {
    question: '寫 Dockerfile 嘅時候，點解建議將 COPY package.json 同 RUN npm install 放喺 COPY app code 之前？',
    options: [
      { text: '因為 npm install 一定要喺 COPY code 之前跑', correct: false, explanation: '技術上唔係一定要，但呢個順序有好重要嘅性能優勢' },
      { text: '為咗善用 Docker layer cache——依賴唔常變，app code 常變，咁大部分 build 可以用 cache', correct: true, explanation: 'Docker 會 cache 每個 layer。將唔常變嘅指令放前面，當 app code 改變但 package.json 冇變嘅時候，npm install 呢個耗時步驟可以直接用 cache，大幅加速 build' },
      { text: '因為 Docker 規定 COPY 指令一定要按字母順序', correct: false, explanation: 'Docker 冇呢個規定，指令順序係自由嘅' },
      { text: '純粹為咗 Dockerfile 易讀，冇實際影響', correct: false, explanation: '呢個順序對 build 速度有好大嘅實際影響，唔止係可讀性問題' },
    ],
  },
  {
    question: '以下邊個檔案唔應該出現喺 Docker image 入面？',
    options: [
      { text: 'package.json', correct: false, explanation: 'package.json 定義咗應用嘅依賴，係 Docker image 必須包含嘅檔案' },
      { text: 'Dockerfile', correct: false, explanation: 'Dockerfile 本身通常唔會喺 image 入面，但呢個唔係最佳答案' },
      { text: '.env 檔案（包含 API keys 同密碼）', correct: true, explanation: '.env 包含敏感資訊如密碼同 API keys，絕對唔應該打包入 Docker image。應該用 .dockerignore 排除，運行時用環境變數注入' },
      { text: 'index.js（應用入口檔案）', correct: false, explanation: 'index.js 係應用嘅主要 code，當然要包含喺 image 入面' },
    ],
  },
];

const relatedTopics = [
  { slug: 'cicd-pipeline', label: 'CI/CD 自動化部署' },
  { slug: 'deployment', label: '免費部署平台' },
  { slug: 'self-host-vs-cloud', label: 'Self-host vs Cloud' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Docker 解決咩問題</h2>
      <div className="subtitle">「It works on my machine」——呢句話從此消失</div>
      <p>
        開發環境同生產環境唔一致，係軟件開發最經典嘅痛點之一。一個開發者寫好嘅 code，另一個開發者 download 返嚟卻跑唔到——因為缺少依賴、版本唔同、系統配置差異等等。Docker 就係為咗解決呢個問題而誕生嘅。
      </p>
      <p>
        Docker 嘅核心概念係<strong style={{ color: '#3B82F6' }}>容器化（Containerization）</strong>：將應用程式連同所有依賴（runtime、libraries、config）打包成一個獨立嘅 container。無論喺開發機、測試環境、定生產 server，container 入面嘅運行環境都係完全一樣嘅。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 760 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradCode" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDocker" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDev" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradProd" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          <g transform="translate(30,110)">
            <rect width="140" height="80" rx="14" fill="url(#gradCode)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="32" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Application</text>
            <text x="70" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">Code + Dependencies</text>
            <text x="70" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">+ Config</text>
          </g>

          <g transform="translate(280,95)">
            <rect width="170" height="110" rx="14" fill="url(#gradDocker)" stroke="#3B82F6" strokeWidth="2.5" filter="url(#glowBlue)" />
            <text x="85" y="30" textAnchor="middle" fill="#3B82F6" fontSize="15" fontWeight="700">Docker Image</text>
            <text x="85" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">App + Runtime</text>
            <text x="85" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">+ Libraries + OS</text>
            <text x="85" y="90" textAnchor="middle" fill="#60a5fa" fontSize="10">docker build</text>
          </g>

          <g transform="translate(570,40)">
            <rect width="155" height="70" rx="14" fill="url(#gradDev)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="78" y="28" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Dev Machine</text>
            <text x="78" y="48" textAnchor="middle" fill="#34d399" fontSize="10">docker run</text>
          </g>

          <g transform="translate(570,140)">
            <rect width="155" height="70" rx="14" fill="url(#gradProd)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="78" y="28" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Production Server</text>
            <text x="78" y="48" textAnchor="middle" fill="#fbbf24" fontSize="10">docker run</text>
          </g>

          <g transform="translate(570,240)">
            <rect width="155" height="55" rx="14" fill="url(#gradDev)" stroke="#10B981" strokeWidth="1.5" filter="url(#shadow)" strokeDasharray="4,3" />
            <text x="78" y="22" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600">Scale Up</text>
            <text x="78" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">More Containers...</text>
          </g>

          <path d="M172,150 C215,150 230,150 278,150" fill="none" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="225" y="140" textAnchor="middle" fill="#a5b4fc" fontSize="10">Build</text>

          <path d="M452,130 C500,110 530,90 568,78" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <path d="M452,155 C500,160 530,168 568,173" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <path d="M648,212 C648,225 648,232 648,238" fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrGreen)" />

          <text x="510" y="135" textAnchor="middle" fill="#9ca3af" fontSize="10">Deploy</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span>將應用程式嘅 code、runtime、libraries、同系統依賴寫入 Dockerfile，用 <code style={{ color: '#60a5fa' }}>docker build</code> 打包成 Docker Image。</span></li>
        <li><span className="step-num">2</span><span>Docker Image 就好似一個「快照」——包含運行應用需要嘅一切。Image 可以推送到 Docker Hub 或私有 registry 俾任何人使用。</span></li>
        <li><span className="step-num">3</span><span>無論喺 dev machine 定 production server，用 <code style={{ color: '#60a5fa' }}>docker run</code> 就可以啟動一個 container。需要處理更多流量？啟動更多 container 就得。</span></li>
      </ol>
    </div>
  );
}

function OptimizeTab() {
  return (
    <>
      <div className="card">
        <h2>Docker Image 瘦身術</h2>
        <div className="subtitle">Image 越大，build 越慢、啟動越慢、傳輸越慢</div>
        <p>
          好多人習慣用 Ubuntu 做 base image——大概 200MB。聽落唔算大，但呢 200MB 入面有大量根本用唔到嘅工具同 library。每次 build 同 deploy 都要搬運呢啲「垃圾」，嚴重拖慢整個 CI/CD pipeline。
        </p>

        <div className="diagram-container">
          <svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow2" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
              <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <linearGradient id="gradUbuntu" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1f1f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
              <linearGradient id="gradSlim" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
              <linearGradient id="gradAlpine" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
              <marker id="arrRight" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            </defs>

            <g transform="translate(30,50)">
              <rect width="180" height="110" rx="14" fill="url(#gradUbuntu)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow2)" />
              <text x="90" y="30" textAnchor="middle" fill="#EF4444" fontSize="14" fontWeight="700">Ubuntu</text>
              <text x="90" y="52" textAnchor="middle" fill="#f87171" fontSize="20" fontWeight="800">~200 MB</text>
              <text x="90" y="74" textAnchor="middle" fill="#9ca3af" fontSize="10">Bash, Curl, apt, systemd...</text>
              <text x="90" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">大量用唔到嘅工具</text>
            </g>

            <g transform="translate(270,50)">
              <rect width="160" height="110" rx="14" fill="url(#gradSlim)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow2)" />
              <text x="80" y="30" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="700">Slim Variant</text>
              <text x="80" y="52" textAnchor="middle" fill="#fbbf24" fontSize="20" fontWeight="800">~80 MB</text>
              <text x="80" y="74" textAnchor="middle" fill="#9ca3af" fontSize="10">移除文檔同非必要工具</text>
              <text x="80" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">例如 python:slim</text>
            </g>

            <g transform="translate(490,50)">
              <rect width="170" height="110" rx="14" fill="url(#gradAlpine)" stroke="#10B981" strokeWidth="2.5" filter="url(#glowGreen)" />
              <text x="85" y="30" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">Alpine</text>
              <text x="85" y="52" textAnchor="middle" fill="#34d399" fontSize="20" fontWeight="800">~5 MB</text>
              <text x="85" y="74" textAnchor="middle" fill="#9ca3af" fontSize="10">極輕量 Linux 發行版</text>
              <text x="85" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">只裝需要嘅嘢</text>
            </g>

            <path d="M212,105 C230,105 248,105 268,105" fill="none" stroke="#6366f1" strokeWidth="1.5" markerEnd="url(#arrRight)" />
            <text x="240" y="95" textAnchor="middle" fill="#a5b4fc" fontSize="9">-60%</text>

            <path d="M432,105 C450,105 468,105 488,105" fill="none" stroke="#6366f1" strokeWidth="1.5" markerEnd="url(#arrRight)" />
            <text x="460" y="95" textAnchor="middle" fill="#a5b4fc" fontSize="9">-94%</text>
          </svg>
        </div>

        <ol className="steps">
          <li><span className="step-num">1</span><span><strong style={{ color: '#10B981' }}>用 Alpine 做 base image</strong>——Alpine 係一個超輕量嘅 Linux 發行版，只有大約 5MB。同 Ubuntu 嘅 200MB 比較，差距係 40 倍。Boot time 極快，image size 極小。</span></li>
          <li><span className="step-num">2</span><span><strong style={{ color: '#F59E0B' }}>Alpine 嘅取捨</strong>——因為極度精簡，Bash 同 Curl 等常用工具並唔係預裝嘅。需要嘅話要用 <code style={{ color: '#60a5fa' }}>apk add</code> 手動安裝。核心理念係「只裝需要嘅」，而唔係「咩都預裝」。</span></li>
          <li><span className="step-num">3</span><span><strong style={{ color: '#3B82F6' }}>用 .dockerignore 排除無用檔案</strong>——就好似 .gitignore 咁，.dockerignore 可以排除 IDE 配置檔、OS 特定檔案、.git 目錄、node_modules 等。減少 build context 大小，加速 build 過程。</span></li>
        </ol>
      </div>

      <div className="card">
        <h2>進階優化技巧</h2>
        <div className="subtitle">除咗換 base image，仲有其他方法縮小 image</div>
        <div className="key-points">
          <div className="key-point">
            <h4>Multi-stage Build</h4>
            <p>用一個 stage 做 build（安裝 compiler、build 工具），再用另一個乾淨嘅 stage 只複製 build 產物。最終 image 唔會包含任何 build 工具，大幅減少體積。</p>
          </div>
          <div className="key-point">
            <h4>合併 RUN 指令</h4>
            <p>每條 RUN 指令都會產生一個新嘅 image layer。將多條 RUN 合併成一條（用 && 連接），可以減少 layer 數量同 image 大小。記住喺同一條 RUN 入面清理暫存檔案。</p>
          </div>
          <div className="key-point">
            <h4>善用 Layer Cache</h4>
            <p>Docker 會 cache 每個 layer。將唔常變嘅指令（例如安裝系統依賴）放前面，常變嘅指令（例如 COPY 應用 code）放後面。咁樣大部分 layer 都可以用 cache，大幅加速 build。</p>
          </div>
          <div className="key-point">
            <h4>.dockerignore 必備項目</h4>
            <p><code style={{ color: '#60a5fa' }}>.git</code>、<code style={{ color: '#60a5fa' }}>node_modules</code>、<code style={{ color: '#60a5fa' }}>.env</code>、<code style={{ color: '#60a5fa' }}>*.log</code>、IDE 配置（<code style={{ color: '#60a5fa' }}>.vscode</code>、<code style={{ color: '#60a5fa' }}>.idea</code>）、OS 檔案（<code style={{ color: '#60a5fa' }}>.DS_Store</code>）。呢啲檔案完全唔應該出現喺 Docker image 入面。</p>
          </div>
        </div>
      </div>
    </>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>Docker 實戰建議</h2>
      <div className="subtitle">由開發到生產，Docker 嘅最佳實踐</div>
      <p>
        Docker 唔止係開發工具——好多團隊主要係為咗生產部署先用 Docker。應用一旦容器化，擴展就變得極其簡單：需要處理更多流量？啟動更多 container 就得。配合 Kubernetes 或 Docker Swarm，可以實現自動擴縮容。
      </p>

      <div className="key-points">
        <div className="key-point">
          <h4>開發環境一致性</h4>
          <p>用 docker-compose 定義整個開發環境（app + database + cache），新加入嘅開發者只需要一條 <code style={{ color: '#60a5fa' }}>docker compose up</code> 就可以啟動完整環境。徹底解決「喺我機行到」嘅問題。</p>
        </div>
        <div className="key-point">
          <h4>生產部署擴展</h4>
          <p>容器化嘅應用天生適合水平擴展。每個 container 都係獨立嘅，啟動新 container 嘅速度以秒計算。配合 Load Balancer，可以輕鬆應對流量高峰。</p>
        </div>
        <div className="key-point">
          <h4>Base Image 選擇策略</h4>
          <p>大部分情況建議用 Alpine 版本（例如 <code style={{ color: '#60a5fa' }}>node:20-alpine</code>、<code style={{ color: '#60a5fa' }}>python:3.12-alpine</code>）。如果有 C extension 編譯問題，退而求其次用 slim 版本。只有極少數情況需要完整嘅 Ubuntu/Debian。</p>
        </div>
        <div className="key-point">
          <h4>安全注意事項</h4>
          <p>永遠唔好用 root 用戶運行 container——用 USER 指令指定非特權用戶。定期更新 base image 修補安全漏洞。絕對唔好將 secrets（密碼、API key）寫入 Dockerfile 或 image。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>建議嘅 Dockerfile 結構</h4>
        <p>FROM alpine-based image → WORKDIR → COPY package files → RUN install dependencies → COPY app code → USER non-root → CMD start。呢個順序可以最大化利用 layer cache，因為依賴唔會經常變，但 app code 會頻繁更新。</p>
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
        <h4>Prompt 1 — 將應用容器化（Dockerfile + 優化）</h4>
        <div className="prompt-text">幫手將一個 <span className="placeholder">[框架，例如 Next.js / Express / FastAPI / Spring Boot]</span> 應用完全容器化。{'\n\n'}要求：{'\n'}1. 寫一個 production-ready Dockerfile，用 multi-stage build{'\n'}2. Base image 用 Alpine 版本（例如 node:20-alpine / python:3.12-alpine）{'\n'}3. 第一個 stage 做 build（安裝依賴 + 編譯），第二個 stage 只複製 build 產物{'\n'}4. 善用 layer cache——將 package.json / requirements.txt COPY 同 install 放喺 COPY app code 之前{'\n'}5. 用非 root USER 運行 container{'\n'}6. 生成 .dockerignore 排除 .git / node_modules / .env / *.log / .vscode{'\n'}7. 最終 image size 目標：<span className="placeholder">[目標，例如 &lt; 200MB / &lt; 100MB]</span></div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Docker Compose 多容器開發環境</h4>
        <div className="prompt-text">幫手設計一個完整嘅 Docker Compose 開發環境，包含以下服務：{'\n'}- App：<span className="placeholder">[框架，例如 Next.js / Express / Django]</span>{'\n'}- Database：<span className="placeholder">[數據庫，例如 PostgreSQL / MySQL / MongoDB]</span>{'\n'}- Cache：Redis{'\n'}- <span className="placeholder">[其他服務，例如 Nginx reverse proxy / Elasticsearch / RabbitMQ]</span>{'\n\n'}要求：{'\n'}1. 生成 docker-compose.yml，定義所有 services、networks、volumes{'\n'}2. App service 要支援 hot reload（mount source code 做 volume）{'\n'}3. Database 要用 named volume 持久化數據，唔好用 bind mount{'\n'}4. 設定 healthcheck 確保 database ready 先啟動 app（depends_on + condition）{'\n'}5. 用 .env file 管理環境變數（database password、API keys）{'\n'}6. 加入 docker-compose.override.yml 分開 dev 同 production 配置{'\n'}7. 新開發者只需要 docker compose up 就可以啟動完整環境</div>
      </div>
    </div>
  );
}

export default function Docker() {
  return (
    <>
      <TopicTabs
        title="Docker 容器化"
        subtitle="解決「喺我機行到」嘅問題，令應用喺任何環境都能一致運行"
        tabs={[
          { id: 'overview', label: '① 點解用 Docker', content: <OverviewTab /> },
          { id: 'optimize', label: '② Image 優化', content: <OptimizeTab /> },
          { id: 'practice', label: '③ 實戰建議', premium: true, content: <PracticeTab /> },
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
