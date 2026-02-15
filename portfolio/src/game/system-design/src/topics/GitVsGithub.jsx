import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'cicd-pipeline', label: 'CI/CD 自動化部署' },
  { slug: 'deployment', label: '免費部署平台' },
  { slug: 'backend-roadmap', label: 'Backend 學習路線' },
];

function GitBasicsTab() {
  return (
    <div className="card">
      <h2>Git 係咩</h2>
      <div className="subtitle">一個本地運行嘅版本控制系統</div>
      <p>Git 係 Linus Torvalds 喺 2005 年為咗管理 Linux kernel 而開發嘅分散式版本控制系統。重點係——Git 完全可以喺冇網絡嘅環境下運行，因為所有歷史記錄都儲存喺本地。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 250" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#F59E0B', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#10B981', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="shadowBlue" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#3B82F6" floodOpacity="0.3" />
            </filter>
            <filter id="glowAmber" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur" />
              <feFlood floodColor="#F59E0B" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="shadowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#10B981" floodOpacity="0.3" />
            </filter>
            <marker id="arrBlue" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 4 L 0 8 z" fill="#3B82F6" />
            </marker>
            <marker id="arrAmber" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 4 L 0 8 z" fill="#F59E0B" />
            </marker>
          </defs>

          <rect x="30" y="70" width="170" height="90" rx="14" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="1.5" filter="url(#shadowBlue)" />
          <text x="115" y="108" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">Working</text>
          <text x="115" y="128" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">Directory</text>

          <rect x="265" y="70" width="170" height="90" rx="14" fill="url(#gradAmber)" stroke="#F59E0B" strokeWidth="1.5" filter="url(#glowAmber)" />
          <text x="350" y="108" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">Staging</text>
          <text x="350" y="128" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">Area</text>

          <rect x="500" y="70" width="170" height="90" rx="14" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="1.5" filter="url(#shadowGreen)" />
          <text x="585" y="108" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">Local</text>
          <text x="585" y="128" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">Repository</text>

          <path d="M 200 115 C 220 90, 245 90, 265 115" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="232" y="82" textAnchor="middle" fill="#9ca3af" fontSize="12" fontWeight="500">git add</text>

          <path d="M 435 115 C 455 90, 480 90, 500 115" stroke="#F59E0B" strokeWidth="2" fill="none" markerEnd="url(#arrAmber)" />
          <text x="467" y="82" textAnchor="middle" fill="#9ca3af" fontSize="12" fontWeight="500">git commit</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span>Working Directory 係正在編輯嘅檔案。任何修改都會被 Git 偵測到，但未被追蹤。</span></li>
        <li><span className="step-num">2</span><span><code>git add</code> 將修改放入 Staging Area——呢個係一個「準備提交」嘅中間狀態。可以選擇性地加入部分檔案。</span></li>
        <li><span className="step-num">3</span><span><code>git commit</code> 將 Staging Area 嘅內容永久記錄到 Local Repository。每次 commit 都有唯一嘅 hash，可以隨時回溯。</span></li>
      </ol>
    </div>
  );
}

function GithubCollabTab() {
  return (
    <div className="card">
      <h2>GitHub 係咩</h2>
      <div className="subtitle">建立喺 Git 之上嘅雲端協作平台（Microsoft 旗下）</div>
      <p>GitHub 唔係 Git。GitHub 係一個基於 Git 嘅雲端平台，提供遠程倉庫託管、Pull Request、Code Review、Issues、Actions（CI/CD）等協作功能。2018 年被 Microsoft 以 75 億美元收購。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gradBlue2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="gradAmber2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#F59E0B', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="gradGreen2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#10B981', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#8B5CF6', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#3B82F6" floodOpacity="0.2" /></filter>
            <filter id="shadowAmber2" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#F59E0B" floodOpacity="0.2" /></filter>
            <filter id="shadowGreen2" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#10B981" floodOpacity="0.2" /></filter>
            <filter id="glowPurple" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur" />
              <feFlood floodColor="#8B5CF6" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <marker id="arrGreen2" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 4 L 0 8 z" fill="#10B981" /></marker>
            <marker id="arrPurple" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 4 L 0 8 z" fill="#8B5CF6" /></marker>
            <marker id="arrBlue2" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 4 L 0 8 z" fill="#3B82F6" /></marker>
            <marker id="arrAmber2" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 4 L 0 8 z" fill="#F59E0B" /></marker>
          </defs>

          <rect x="15" y="40" width="430" height="220" rx="14" fill="none" stroke="#4a5568" strokeWidth="1.5" strokeDasharray="8 4" />
          <text x="230" y="30" textAnchor="middle" fill="#9ca3af" fontSize="13" fontWeight="500">Local</text>

          <rect x="510" y="40" width="270" height="220" rx="14" fill="none" stroke="#4a5568" strokeWidth="1.5" strokeDasharray="8 4" />
          <text x="645" y="30" textAnchor="middle" fill="#9ca3af" fontSize="13" fontWeight="500">Cloud</text>

          <rect x="30" y="100" width="120" height="75" rx="14" fill="url(#gradBlue2)" stroke="#3B82F6" strokeWidth="1.5" filter="url(#shadow2)" />
          <text x="90" y="133" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="600">Working</text>
          <text x="90" y="149" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="600">Directory</text>

          <rect x="180" y="100" width="120" height="75" rx="14" fill="url(#gradAmber2)" stroke="#F59E0B" strokeWidth="1.5" filter="url(#shadowAmber2)" />
          <text x="240" y="133" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="600">Staging</text>
          <text x="240" y="149" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="600">Area</text>

          <rect x="330" y="100" width="120" height="75" rx="14" fill="url(#gradGreen2)" stroke="#10B981" strokeWidth="1.5" filter="url(#shadowGreen2)" />
          <text x="390" y="133" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="600">Local</text>
          <text x="390" y="149" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="600">Repository</text>

          <rect x="545" y="85" width="200" height="105" rx="14" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="1.5" filter="url(#glowPurple)" />
          <text x="645" y="125" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="700">GitHub</text>
          <text x="645" y="145" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="700">Remote</text>
          <text x="645" y="170" textAnchor="middle" fill="#a5b4fc" fontSize="10">Pull Request / Code Review</text>

          <path d="M 150 130 C 158 115, 172 115, 180 130" stroke="#3B82F6" strokeWidth="1.5" fill="none" markerEnd="url(#arrBlue2)" />
          <text x="165" y="110" textAnchor="middle" fill="#9ca3af" fontSize="10">git add</text>

          <path d="M 300 130 C 308 115, 322 115, 330 130" stroke="#F59E0B" strokeWidth="1.5" fill="none" markerEnd="url(#arrAmber2)" />
          <text x="315" y="110" textAnchor="middle" fill="#9ca3af" fontSize="10">git commit</text>

          <path d="M 450 120 C 480 100, 520 100, 545 120" stroke="#10B981" strokeWidth="2" fill="none" markerEnd="url(#arrGreen2)" />
          <text x="497" y="95" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600">git push</text>

          <path d="M 545 165 C 520 185, 480 185, 150 175 Q 90 178, 90 175" stroke="#8B5CF6" strokeWidth="2" fill="none" markerEnd="url(#arrPurple)" />
          <text x="350" y="200" textAnchor="middle" fill="#8B5CF6" fontSize="11" fontWeight="600">git pull</text>
        </svg>
      </div>

      <div className="key-points">
        <div className="key-point">
          <h4>Pull Request (PR)</h4>
          <p>PR 係 GitHub 最核心嘅協作功能。開發者喺自己嘅 branch 完成功能後，發起 PR 請求合併到主分支。其他人可以 review code、留評論、提出修改建議。</p>
        </div>
        <div className="key-point">
          <h4>Code Review</h4>
          <p>每個 PR 都應該經過至少一個人 review。好嘅 code review 唔係挑錯，而係知識分享同質量保證。Review 時重點關注邏輯、安全性同可維護性。</p>
        </div>
        <div className="key-point">
          <h4>GitHub Actions</h4>
          <p>內建嘅 CI/CD 工具，可以自動跑測試、build、部署。每次 push 或者 PR 都可以觸發 workflow。對自動化測試同部署極有幫助。</p>
        </div>
        <div className="key-point">
          <h4>Issues & Projects</h4>
          <p>GitHub 提供 issue tracking 同 project board 功能，方便團隊管理任務、追蹤 bug、規劃 sprint。配合 label 同 milestone 可以做到基本嘅項目管理。</p>
        </div>
      </div>
    </div>
  );
}

function LearningTab() {
  return (
    <div className="card">
      <h2>Git 同 GitHub 學習路線</h2>
      <div className="subtitle">建議嘅學習順序同重點</div>
      <p>好多初學者直接學 GitHub 而跳過 Git 基礎，結果遇到 conflict 或者 rebase 就完全唔知點做。正確嘅學習順序好重要。</p>

      <ol className="steps">
        <li><span className="step-num">1</span><span>第一步：學 Git 基礎命令——init、add、commit、log、diff、branch、merge。呢啲係所有版本控制嘅根基，要做到完全熟練。</span></li>
        <li><span className="step-num">2</span><span>第二步：學 Git branching 策略——feature branch、git flow、trunk-based development。理解唔同策略嘅適用場景。</span></li>
        <li><span className="step-num">3</span><span>第三步：學 GitHub 協作——push、pull、fork、PR、code review。呢一步開始涉及團隊合作。</span></li>
        <li><span className="step-num">4</span><span>第四步：進階技巧——rebase vs merge、cherry-pick、bisect、stash。呢啲係日常開發會經常用到嘅高級操作。</span></li>
      </ol>

      <div className="use-case">
        <h4>常見誤解</h4>
        <p>Git 同 GitHub 嘅關係就好似「電郵」同「Gmail」——Git 係技術標準，GitHub 係其中一個實現平台。除咗 GitHub，仲有 GitLab、Bitbucket、Azure DevOps 等替代品。掌握 Git 本身先係最重要嘅。</p>
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
        <h4>Prompt 1 — 設計 Git Branching 策略</h4>
        <div className="prompt-text">幫手設計一個適合 <span className="placeholder">[團隊規模，例如 2-5 人 / 10+ 人]</span> 嘅 Git branching 策略，項目類型係 <span className="placeholder">[項目類型，例如 SaaS Web App / Mobile App / Open Source Library]</span>。{'\n\n'}要求：{'\n'}1. 定義 branch 命名規範（feature / bugfix / hotfix / release）{'\n'}2. 畫出完整嘅 branching workflow（由開 branch 到 merge 入 main）{'\n'}3. 定義 merge 策略（squash merge / rebase / merge commit）同適用場景{'\n'}4. 設定 branch protection rules（require PR review、status checks、no force push）{'\n'}5. 加入 commit message 規範（Conventional Commits format）{'\n'}6. 處理 conflict resolution 嘅標準流程</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設定 GitHub Actions CI/CD Pipeline</h4>
        <div className="prompt-text">幫手設定一個完整嘅 GitHub Actions CI/CD pipeline，適用於 <span className="placeholder">[框架，例如 Next.js / Express / Django / Spring Boot]</span> 項目，部署到 <span className="placeholder">[平台，例如 Vercel / AWS / Railway / Docker]</span>。{'\n\n'}要求：{'\n'}1. 生成 .github/workflows/ci.yml，包含以下 jobs：{'\n'}   - Lint check（ESLint / Prettier / Black）{'\n'}   - Unit test（Jest / Pytest / JUnit）{'\n'}   - Build verification{'\n'}2. 生成 .github/workflows/deploy.yml，包含：{'\n'}   - 自動部署 main branch 到 production{'\n'}   - PR 自動部署 preview environment{'\n'}3. 設定 environment secrets 管理（API keys、database URL）{'\n'}4. 加入 cache 策略加速 CI（node_modules / pip cache）{'\n'}5. 設定 PR template 同 auto-labeling</div>
      </div>
    </div>
  );
}

export default function GitVsGithub() {
  return (
    <>
      <TopicTabs
        title="Git vs GitHub"
        subtitle="本地版本控制 vs 雲端協作平台，兩者完全唔同"
        tabs={[
          { id: 'git-basics', label: '① Git 基礎', content: <GitBasicsTab /> },
          { id: 'github-collab', label: '② GitHub 協作', content: <GithubCollabTab /> },
          { id: 'learning', label: '③ 學習路線', premium: true, content: <LearningTab /> },
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
