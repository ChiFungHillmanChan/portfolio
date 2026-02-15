import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'docker', label: 'Docker 容器化' },
  { slug: 'deployment', label: '免費部署平台' },
  { slug: 'monitoring', label: '應用程式監控' },
  { slug: 'git-vs-github', label: 'Git vs GitHub' },
];

function ManualTab() {
  return (
    <div className="card">
      <h2>手動部署嘅痛點</h2>
      <div className="subtitle">每次部署都令服務中斷，問題出喺邊？</div>
      <p>
        最原始嘅部署方式係噉：喺本地 Build 好個 App，跑一輪 Unit Test，然後 SSH 入 Server，Clone 最新嘅 Code，再啟動服務。聽落好合理？但現實係——每次一 Deploy，服務就斷線。用戶投訴不斷，團隊壓力極大。
      </p>
      <p>
        問題嘅根源在於：本地環境同 Production 環境根本唔一樣。本地跑得好好哋嘅 Code，一搬上 Server 就出事。可能係 Node.js 版本唔同、可能係環境變數漏咗、可能係 Dependency 衝突。手動操作仲容易出人為錯誤——漏咗一步、打錯一個指令，整個服務就炸咗。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow1" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <linearGradient id="gradDev" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSSH" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradServer" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arr1Blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arr1Amber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arr1Red" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>
          <g transform="translate(30,70)">
            <rect width="140" height="80" rx="14" fill="url(#gradDev)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow1)" />
            <text x="70" y="30" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Developer</text>
            <text x="70" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">Build + Unit Test</text>
            <text x="70" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">（本地環境）</text>
          </g>
          <g transform="translate(270,70)">
            <rect width="130" height="80" rx="14" fill="url(#gradSSH)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow1)" />
            <text x="65" y="30" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">SSH</text>
            <text x="65" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">手動登入 Server</text>
            <text x="65" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">Clone + Restart</text>
          </g>
          <g transform="translate(500,70)">
            <rect width="160" height="80" rx="14" fill="url(#gradServer)" stroke="#f87171" strokeWidth="2" filter="url(#shadow1)" />
            <text x="80" y="30" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700">Production Server</text>
            <text x="80" y="50" textAnchor="middle" fill="#f87171" fontSize="10">環境唔一致</text>
            <text x="80" y="66" textAnchor="middle" fill="#f87171" fontSize="10">服務中斷</text>
          </g>
          <path d="M172,110 C210,108 230,108 268,110" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arr1Blue)" />
          <text x="220" y="100" textAnchor="middle" fill="#a5b4fc" fontSize="10">手動操作</text>
          <path d="M402,110 C440,108 460,108 498,110" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arr1Amber)" />
          <text x="450" y="100" textAnchor="middle" fill="#fbbf24" fontSize="10">部署上線</text>
          <g transform="translate(500,170)">
            <rect width="160" height="36" rx="10" fill="rgba(248,113,113,0.1)" stroke="#f87171" strokeWidth="1" strokeDasharray="4,3" />
            <text x="80" y="22" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">每次 Deploy 都炸服務</text>
          </g>
          <path d="M580,152 C580,160 580,164 580,168" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4,3" fill="none" markerEnd="url(#arr1Red)" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>手動部署嘅典型流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>喺本地 Build 個 Application，跑一輪 Unit Test 確保基本邏輯無問題。</span></li>
        <li><span className="step-num">2</span><span>SSH 入 Production Server，手動 Clone 最新嘅 Code 落去。</span></li>
        <li><span className="step-num">3</span><span>重新啟動 Server 進程，服務恢復。但過程中會有 Downtime，而且一旦有任何環境差異就即刻出錯。</span></li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>環境不一致</h4>
          <p>本地用 Node 18，Server 裝咗 Node 16——單係版本差異已經可以令 App Crash。重點係：本地能跑唔代表 Production 能跑。</p>
        </div>
        <div className="key-point">
          <h4>人為錯誤</h4>
          <p>手動打指令容易出錯：漏咗設環境變數、忘記裝 Dependency、Restart 錯咗 Process。人手操作係最大嘅風險來源。</p>
        </div>
        <div className="key-point">
          <h4>Downtime 無可避免</h4>
          <p>手動部署必定有服務中斷嘅時段。Clone Code、裝 Dependencies、Restart Server——每一步都係 Downtime。</p>
        </div>
        <div className="key-point">
          <h4>無法快速 Rollback</h4>
          <p>出事之後要 SSH 返入去手動還原，過程慢而且混亂。關鍵在於：手動部署冇內建嘅回退機制。</p>
        </div>
      </div>
    </div>
  );
}

function IaCTab() {
  return (
    <div className="card">
      <h2>Infrastructure as Code</h2>
      <div className="subtitle">用 Code 定義環境，完美複製 Production</div>
      <p>
        手動部署最大嘅問題係環境不一致。解決方案係 Infrastructure as Code（IaC）——用設定檔去定義成個 Server 環境，包括 OS 版本、Runtime 版本、環境變數、Network 設定等等。關鍵在於：用同一份 Config 可以生成同 Production 一模一樣嘅 Staging 環境。
      </p>
      <p>
        有咗 IaC，部署之前可以先喺 Staging 環境跑一次，確保所有嘢正常先至上 Production。呢一步可以攔截到 90% 以上嘅環境相關 Bug。常見工具包括 Docker、Terraform、Ansible 等。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow2" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowIaC" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradProd" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradIaC" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1f4f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradStaging" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arr2Indigo" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arr2Green" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>
          <g transform="translate(30,40)">
            <rect width="180" height="90" rx="14" fill="url(#gradProd)" stroke="#10B981" strokeWidth="2" filter="url(#shadow2)" />
            <text x="90" y="30" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">Production Server</text>
            <text x="90" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">Node 18 + Ubuntu 22</text>
            <text x="90" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">ENV Variables + DB</text>
            <text x="90" y="82" textAnchor="middle" fill="#34d399" fontSize="10">正式環境</text>
          </g>
          <g transform="translate(270,60)" filter="url(#glowIaC)">
            <rect width="160" height="80" rx="14" fill="url(#gradIaC)" stroke="#6366f1" strokeWidth="2" />
            <text x="80" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="14" fontWeight="700">IaC Config</text>
            <text x="80" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Docker / Terraform</text>
            <text x="80" y="64" textAnchor="middle" fill="#a5b4fc" fontSize="10">環境定義檔</text>
          </g>
          <g transform="translate(490,40)">
            <rect width="180" height="90" rx="14" fill="url(#gradStaging)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow2)" />
            <text x="90" y="30" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">Staging Server</text>
            <text x="90" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">Node 18 + Ubuntu 22</text>
            <text x="90" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">ENV Variables + DB</text>
            <text x="90" y="82" textAnchor="middle" fill="#3B82F6" fontSize="10">測試環境（一模一樣）</text>
          </g>
          <path d="M212,85 C235,90 250,95 268,98" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arr2Indigo)" />
          <text x="240" y="82" textAnchor="middle" fill="#a5b4fc" fontSize="10">擷取設定</text>
          <path d="M432,98 C450,95 465,90 488,85" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arr2Indigo)" />
          <text x="460" y="82" textAnchor="middle" fill="#a5b4fc" fontSize="10">生成環境</text>
          <g transform="translate(220,170)">
            <rect width="260" height="40" rx="12" fill="rgba(52,211,153,0.08)" stroke="#34d399" strokeWidth="1.5" strokeDasharray="6,3" />
            <text x="130" y="25" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="600">兩個環境完全一致 = 零環境差異</text>
          </g>
          <path d="M120,132 C120,145 180,160 240,172" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4,3" fill="none" markerEnd="url(#arr2Green)" />
          <path d="M580,132 C580,145 520,160 462,172" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4,3" fill="none" markerEnd="url(#arr2Green)" />
          <g transform="translate(150,235)">
            <rect width="400" height="40" rx="12" fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="1" />
            <text x="200" y="25" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="500">先喺 Staging 測試通過 → 再部署到 Production</text>
          </g>
        </svg>
      </div>

      <div className="key-points">
        <div className="key-point">
          <h4>環境一致性</h4>
          <p>用同一份 Config 生成 Staging 同 Production，保證兩個環境完全一致。喺 Staging 跑得通嘅 Code，上到 Production 一定冇問題。</p>
        </div>
        <div className="key-point">
          <h4>版本控制</h4>
          <p>IaC 設定檔可以 Commit 入 Git，每次環境變動都有記錄。最佳做法係：環境設定同 Application Code 一齊版本管理。</p>
        </div>
        <div className="key-point">
          <h4>可重複性</h4>
          <p>同一份 Config 可以生成無限個一模一樣嘅環境。需要新嘅測試環境？跑一次 Script 就搞掂，唔使再手動設定。</p>
        </div>
        <div className="key-point">
          <h4>常見工具</h4>
          <p>Docker 處理 Application 層面嘅環境一致性；Terraform 管理雲端基礎設施；Ansible 處理 Server Configuration。建議由 Docker 開始學起。</p>
        </div>
      </div>
    </div>
  );
}

function CICDTab() {
  return (
    <div className="card">
      <h2>CI/CD Pipeline 全自動化</h2>
      <div className="subtitle">Commit 一 Push，自動測試、自動部署</div>
      <p>
        有咗 IaC 確保環境一致之後，下一步係將成個部署流程自動化。呢個就係 CI/CD Pipeline——Continuous Integration / Continuous Deployment。核心概念係：每次 Git Commit 之後，所有嘢自動發生。Build、Test、Deploy 全部由 Pipeline 處理，唔再需要人手介入。
      </p>
      <p>
        用 GitHub Actions 做例子：開發者 Push Code 到 Repository，GitHub Actions 自動觸發 Pipeline。首先 Build 個 Application，然後跑 Unit Test 同 Integration Test。測試全部通過之後，自動部署到 Staging 環境做最後驗證。Staging 測試都 Pass 嘅話，自動部署到 Production。整個過程零人手操作、零 Downtime。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow3" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGHA" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.35" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradCommit" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGHA" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2a1f4f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradBuild" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradTest" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradStagingCI" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDecision" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradProdCI" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arr3Indigo" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arr3Amber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arr3Green" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arr3Red" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f87171" /></marker>
          </defs>
          <g transform="translate(20,50)">
            <rect width="130" height="65" rx="14" fill="url(#gradCommit)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow3)" />
            <text x="65" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Git Commit</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Push to Repo</text>
          </g>
          <g transform="translate(210,40)" filter="url(#glowGHA)">
            <rect width="160" height="80" rx="14" fill="url(#gradGHA)" stroke="#6366f1" strokeWidth="2.5" />
            <text x="80" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="14" fontWeight="700">GitHub Actions</text>
            <text x="80" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">CI/CD Pipeline</text>
            <text x="80" y="66" textAnchor="middle" fill="#a5b4fc" fontSize="10">自動觸發</text>
          </g>
          <g transform="translate(430,50)">
            <rect width="120" height="65" rx="14" fill="url(#gradBuild)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow3)" />
            <text x="60" y="28" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Build</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">編譯 + 打包</text>
          </g>
          <g transform="translate(610,50)">
            <rect width="130" height="65" rx="14" fill="url(#gradTest)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow3)" />
            <text x="65" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Test</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Unit + Integration</text>
          </g>
          <path d="M152,82 C175,80 190,80 208,80" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arr3Indigo)" />
          <path d="M372,80 C395,80 410,80 428,82" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arr3Indigo)" />
          <path d="M552,82 C575,80 590,80 608,82" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arr3Amber)" />
          <g transform="translate(120,190)">
            <rect width="160" height="65" rx="14" fill="url(#gradStagingCI)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow3)" />
            <text x="80" y="28" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Deploy Staging</text>
            <text x="80" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">部署到測試環境</text>
          </g>
          <g transform="translate(390,185)">
            <rect width="140" height="70" rx="14" fill="url(#gradDecision)" stroke="#34d399" strokeWidth="2" filter="url(#shadow3)" />
            <text x="70" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Tests Pass?</text>
            <text x="70" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Staging 測試結果</text>
          </g>
          <g transform="translate(610,190)">
            <rect width="160" height="65" rx="14" fill="url(#gradProdCI)" stroke="#10B981" strokeWidth="2.5" filter="url(#shadow3)" />
            <text x="80" y="28" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">Deploy Prod</text>
            <text x="80" y="48" textAnchor="middle" fill="#34d399" fontSize="10">正式上線</text>
          </g>
          <path d="M675,117 C678,140 400,160 280,188" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arr3Indigo)" />
          <text x="500" y="155" textAnchor="middle" fill="#a5b4fc" fontSize="10">測試通過</text>
          <path d="M282,222 C320,220 350,220 388,222" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arr3Amber)" />
          <path d="M532,222 C560,220 580,220 608,222" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arr3Green)" />
          <text x="570" y="212" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">Pass</text>
          <path d="M460,257 C460,280 460,295 460,310" stroke="#f87171" strokeWidth="1.5" strokeDasharray="5,3" fill="none" markerEnd="url(#arr3Red)" />
          <g transform="translate(380,315)">
            <rect width="160" height="32" rx="10" fill="rgba(248,113,113,0.1)" stroke="#f87171" strokeWidth="1" strokeDasharray="4,3" />
            <text x="80" y="21" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">Fail → 通知團隊修正</text>
          </g>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>CI/CD Pipeline 運作流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>開發者 Push Code 到 Git Repository，GitHub Actions 自動偵測到 Commit 並觸發 Pipeline。</span></li>
        <li><span className="step-num">2</span><span>Pipeline 首先 Build 個 Application（編譯、安裝 Dependencies、打包），然後跑全套 Unit Test 同 Integration Test。</span></li>
        <li><span className="step-num">3</span><span>測試通過後，自動部署到 Staging 環境。喺 Staging 度再做一輪 Smoke Test 同 End-to-End Test。</span></li>
        <li><span className="step-num">4</span><span>Staging 測試全部 Pass，Pipeline 自動將新版本 Deploy 到 Production。如果任何一步 Fail，Pipeline 即刻停止並通知團隊。</span></li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>Continuous Integration</h4>
          <p>每次 Commit 都自動跑 Build + Test。重點係：盡早發現問題，唔好等到部署時先知 Code 有 Bug。</p>
        </div>
        <div className="key-point">
          <h4>Continuous Deployment</h4>
          <p>測試通過後自動部署到 Production。零人手介入，減少人為錯誤同部署延遲。關鍵在於：對 Test Suite 要有足夠信心。</p>
        </div>
        <div className="key-point">
          <h4>Zero Downtime</h4>
          <p>配合 Rolling Deployment 或 Blue-Green Deployment，可以做到零停機時間部署。最佳做法係用 Health Check 確保新版本正常先至切換流量。</p>
        </div>
        <div className="key-point">
          <h4>自動 Rollback</h4>
          <p>Production 部署後如果 Health Check 失敗，Pipeline 可以自動回退到上一個穩定版本。呢個係手動部署做唔到嘅嘢。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>進化之路總結：Manual → IaC → CI/CD</h4>
        <p>部署方式嘅進化分三個階段：<strong style={{ color: '#f87171' }}>第一階段</strong>係手動 SSH 部署，充滿風險同 Downtime。<strong style={{ color: '#f59e0b' }}>第二階段</strong>引入 Infrastructure as Code，用設定檔確保環境一致，喺 Staging 先測試。<strong style={{ color: '#34d399' }}>第三階段</strong>用 GitHub Actions 實現全自動 CI/CD Pipeline——Commit 即觸發、自動測試、自動部署。最終目標係：開發者只需要 Push Code，其餘所有嘢由 Pipeline 搞掂。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber 提示模板</h2>
      <div className="subtitle">複製以下 Prompt 直接問 ChatGPT / Claude</div>
      <div className="prompt-card">
        <h4>Prompt 1 — 設計完整嘅 CI/CD Pipeline</h4>
        <div className="prompt-text">
          {'為 [項目名稱，例如：全端 SaaS 應用] 設計一條完整嘅 CI/CD Pipeline。\n\n技術棧：[例如：React 前端 + Node.js API + PostgreSQL，部署喺 AWS ECS]\nCI/CD 工具：[例如：GitHub Actions]\n\n請輸出以下內容：\n\n1. Pipeline 各階段設計：\n   - Build Stage：編譯、安裝 Dependencies、生成 Docker Image\n   - Test Stage：Unit Test → Integration Test → E2E Test（並行執行策略）\n   - Security Stage：Dependency Vulnerability Scan、SAST 靜態分析\n   - Deploy Staging：自動部署到 Staging 環境 + Smoke Test\n   - Deploy Production：Blue-Green 或 Rolling Deployment + Health Check\n\n2. 完整嘅 GitHub Actions YAML 設定檔（可直接使用）\n\n3. 環境管理策略：\n   - Staging 同 Production 嘅環境變數管理（用 GitHub Secrets）\n   - Docker Image Tag 策略（Git SHA / Semantic Version）\n\n4. Rollback 機制：\n   - 自動 Rollback 觸發條件\n   - 手動 Rollback 嘅操作步驟\n\n5. Pipeline 優化建議：\n   - Cache 策略（Node Modules / Docker Layer）\n   - 並行執行同 Matrix Build\n   - 預計每次 Pipeline 嘅執行時間'}
        </div>
      </div>
      <div className="prompt-card">
        <h4>Prompt 2 — 實現自動化測試 + 部署策略</h4>
        <div className="prompt-text">
          {'為 [項目名稱，例如：電商 API 後端] 實現一套自動化測試同部署策略。\n\n技術棧：[例如：Node.js + Express + PostgreSQL + Redis]\n\n請輸出以下完整方案：\n\n1. 測試金字塔設計：\n   - Unit Test：核心業務邏輯嘅測試（目標覆蓋率 80%+）\n   - Integration Test：API Endpoint + Database 嘅整合測試\n   - E2E Test：關鍵用戶流程嘅端到端測試\n   - 每層嘅測試框架選擇同配置\n\n2. Infrastructure as Code：\n   - Docker Compose 開發環境設定（Application + DB + Redis）\n   - Dockerfile 最佳實踐（多階段 Build、最小化 Image Size）\n   - 環境變數管理方案（.env 檔案結構）\n\n3. 部署策略比較同建議：\n   - Rolling Deployment vs Blue-Green vs Canary\n   - 根據項目規模推薦最適合嘅策略\n   - Health Check Endpoint 設計（/health 返回咩數據）\n\n4. 可直接使用嘅設定檔：\n   - Dockerfile\n   - docker-compose.yml\n   - GitHub Actions workflow YAML\n   - 測試 Config 檔案'}
        </div>
      </div>
    </div>
  );
}

export default function CICDPipeline() {
  return (
    <>
      <TopicTabs
        title="CI/CD 自動化部署"
        subtitle="從手動部署到全自動 Pipeline 嘅進化之路"
        tabs={[
          { id: 'manual', label: '① 手動部署問題', content: <ManualTab /> },
          { id: 'iac', label: '② Infrastructure as Code', content: <IaCTab /> },
          { id: 'cicd', label: '③ CI/CD Pipeline', premium: true, content: <CICDTab /> },
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
