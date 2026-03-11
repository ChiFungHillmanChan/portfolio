import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Big Bang Deployment 最大嘅問題係咩？',
    options: [
      { text: '部署速度太慢', correct: false, explanation: 'Big Bang 嘅部署速度其實好快，因為一次過全部換晒。問題唔係速度，而係風險。' },
      { text: '如果新版本有 bug，所有用戶同時受影響，而且冇即時回退嘅方法', correct: true, explanation: '全部 server 同時換新版，如果新版有問題，所有用戶即刻受影響。回退需要重新部署舊版本，期間整個服務可能 down 晒。呢個係最危險嘅部署方式。' },
      { text: '需要太多 server', correct: false, explanation: 'Big Bang 反而唔需要額外 server，因為係喺現有 server 上直接部署。Blue-Green 先需要雙倍 server。' },
      { text: '唔支援 Docker', correct: false, explanation: 'Big Bang 同任何技術棧都兼容。問題唔係技術限制，而係部署策略本身嘅風險太高。' },
    ],
  },
  {
    question: 'Blue-Green Deployment 點樣做到「幾乎零 Downtime」嘅回退？',
    options: [
      { text: '快速重新部署舊版本到所有 server', correct: false, explanation: '重新部署需要時間（build + deploy），唔係即時嘅。Blue-Green 嘅優勢係唔使重新部署。' },
      { text: '因為舊環境一直開緊，只需要將 Load Balancer 指返去舊環境就得', correct: true, explanation: 'Blue-Green 嘅核心就係兩組環境同時存在。新版有問題？Load Balancer 一切換就立即回退，舊環境一直運行緊，完全唔使等部署。呢個切換通常幾秒內完成。' },
      { text: '自動 restart 出問題嘅 server', correct: false, explanation: '如果新版本代碼本身有 bug，restart 只會重新啟動同樣有 bug 嘅版本。問題唔會自己消失。' },
      { text: '用 database rollback 還原數據', correct: false, explanation: 'Database rollback 同部署回退係兩回事。Blue-Green 解決嘅係應用層面嘅回退，唔係數據層面。' },
    ],
  },
  {
    question: 'Canary Deployment 比 Blue-Green 更安全嘅原因係咩？',
    options: [
      { text: '因為 Canary 用更好嘅 server', correct: false, explanation: 'Canary 同 Blue-Green 嘅 server 冇分別。差異喺於流量分配策略，唔係硬件。' },
      { text: '因為 Canary 先將少量流量（例如 5%）導去新版本，觀察冇問題先逐步增加', correct: true, explanation: '如果新版本有 bug，Blue-Green 一切換就 100% 用戶受影響（雖然可以快速回退）。Canary 只有 5% 用戶先試新版，即使出事都只影響少數人。觀察 metrics 確認冇問題後先逐步加到 100%。' },
      { text: '因為 Canary 唔需要 Load Balancer', correct: false, explanation: 'Canary 一樣需要 Load Balancer 或者流量管理工具嚟按比例分配流量。呢個係 Canary 嘅核心機制。' },
      { text: '因為 Canary 會自動修復 bug', correct: false, explanation: '冇任何部署策略可以自動修復 bug。Canary 嘅優勢係限制 bug 嘅影響範圍，唔係修復 bug。' },
    ],
  },
  {
    question: '你嘅公司 deploy 咗新版本，5 分鐘後發現 error rate 飆升。以下邊個部署策略可以最快回退？',
    options: [
      { text: 'Big Bang — 重新部署舊版本', correct: false, explanation: '重新部署要 build + deploy + restart，可能要 10-30 分鐘。期間所有用戶都受影響。' },
      { text: 'Blue-Green — 將 Load Balancer 切返 Blue 環境', correct: true, explanation: 'Blue（舊版）環境一直運行緊，只需要改 Load Balancer 嘅指向就可以即時回退。通常幾秒到一分鐘內完成，係最快嘅回退方式。' },
      { text: 'Canary — 但如果已經 rollout 到 100% 就同 Big Bang 一樣', correct: false, explanation: '如果 Canary 已經 rollout 到 100%，的確唔容易即時回退。但正確嘅 Canary 做法係觀察每個階段嘅 metrics，唔會喺 5 分鐘內就 rollout 到 100%。' },
      { text: '三種策略嘅回退速度一樣', correct: false, explanation: '完全唔同。Big Bang 要重新部署（最慢）、Blue-Green 切 Load Balancer（最快）、Canary 要逐步降低流量比例。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'deployment', label: '免費部署平台' },
  { slug: 'cicd-pipeline', label: 'CI/CD 自動化部署' },
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
  { slug: 'docker', label: 'Docker 容器化' },
  { slug: 'monitoring', label: 'Monitoring 監控' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>部署策略係咩</h2>
      <div className="subtitle">點樣安全咁將新版本嘅 code 部署到 Production</div>
      <p>
        每次 deploy 都搞到 service 掛？可能係你嘅部署策略有問題。部署策略決定咗你點樣將新版本嘅 code 推上 production——一次過全換？定係慢慢換？呢個選擇直接影響你嘅 downtime 同風險。
      </p>
      <p>
        最差嘅做法叫 <strong style={{ color: '#f87171' }}>Big Bang Deployment</strong>——直接 login 上 server，一次過部署所有改動。如果新版有 bug？恭喜你，全部用戶即刻受影響，而且冇即時回退嘅方法。今日我哋睇三種策略：Big Bang → Blue-Green → Canary，一個比一個安全。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBang" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d1515" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradBlueGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradCanary" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrGray" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#9ca3af" /></marker>
          </defs>

          <text x="390" y="25" textAnchor="middle" fill="#9ca3af" fontSize="13" fontWeight="600">部署策略演進：越嚟越安全</text>

          {/* Big Bang */}
          <g transform="translate(30,55)">
            <rect width="210" height="110" rx="14" fill="url(#gradBang)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="105" y="30" textAnchor="middle" fill="#f87171" fontSize="14" fontWeight="700">Big Bang</text>
            <text x="105" y="52" textAnchor="middle" fill="#fca5a5" fontSize="11">一次過全部換晒</text>
            <text x="105" y="75" textAnchor="middle" fill="#9ca3af" fontSize="10">風險：極高</text>
            <text x="105" y="93" textAnchor="middle" fill="#9ca3af" fontSize="10">回退：重新部署（慢）</text>
          </g>

          {/* Arrow 1 */}
          <path d="M248,110 C270,110 280,110 298,110" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#arrGray)" />
          <text x="273" y="100" textAnchor="middle" fill="#9ca3af" fontSize="10">演進</text>

          {/* Blue-Green */}
          <g transform="translate(305,55)">
            <rect width="210" height="110" rx="14" fill="url(#gradBlueGreen)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="105" y="30" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">Blue-Green</text>
            <text x="105" y="52" textAnchor="middle" fill="#60a5fa" fontSize="11">兩組環境，切換流量</text>
            <text x="105" y="75" textAnchor="middle" fill="#9ca3af" fontSize="10">風險：中</text>
            <text x="105" y="93" textAnchor="middle" fill="#34d399" fontSize="10">回退：即時切換（秒級）</text>
          </g>

          {/* Arrow 2 */}
          <path d="M523,110 C545,110 555,110 573,110" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#arrGray)" />
          <text x="548" y="100" textAnchor="middle" fill="#9ca3af" fontSize="10">演進</text>

          {/* Canary */}
          <g transform="translate(580,55)" filter="url(#glowGreen)">
            <rect width="175" height="110" rx="14" fill="url(#gradCanary)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="88" y="30" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">Canary</text>
            <text x="88" y="52" textAnchor="middle" fill="#34d399" fontSize="11">先 5% 流量試水</text>
            <text x="88" y="75" textAnchor="middle" fill="#9ca3af" fontSize="10">風險：最低</text>
            <text x="88" y="93" textAnchor="middle" fill="#34d399" fontSize="10">回退：停止 rollout</text>
          </g>

          {/* Risk bar */}
          <g transform="translate(30,200)">
            <rect width="725" height="45" rx="10" fill="rgba(30,41,59,0.8)" stroke="#334155" strokeWidth="1" />
            <text x="25" y="18" fill="#f87171" fontSize="11" fontWeight="600">高風險</text>
            <text x="700" y="18" textAnchor="end" fill="#34d399" fontSize="11" fontWeight="600">低風險</text>
            {/* Gradient bar */}
            <defs>
              <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <rect x="25" y="28" width="675" height="8" rx="4" fill="url(#riskGrad)" opacity="0.7" />
          </g>

          {/* Downtime label */}
          <g transform="translate(30,260)">
            <text x="105" y="15" textAnchor="middle" fill="#f87171" fontSize="10">Downtime: 分鐘到小時</text>
            <text x="410" y="15" textAnchor="middle" fill="#60a5fa" fontSize="10">Downtime: ~0（雙環境）</text>
            <text x="668" y="15" textAnchor="middle" fill="#34d399" fontSize="10">Downtime: ~0（漸進式）</text>
          </g>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>Big Bang</strong>：直接喺 production server 上部署所有改動。最簡單但最危險——出事時全部用戶受影響，回退要重新部署舊版本，期間 service 可能 down。</span></li>
        <li><span className="step-num">2</span><span><strong>Blue-Green</strong>：準備兩組完全一樣嘅環境（Blue = 舊版、Green = 新版）。新版部署到 Green 環境，測試冇問題後將 Load Balancer 從 Blue 切去 Green。出事？即刻切返 Blue，幾秒搞掂。</span></li>
        <li><span className="step-num">3</span><span><strong>Canary</strong>：將新版部署到部分 server，先只導 5% 流量過去。觀察 error rate、latency 等 metrics，冇問題先逐步加到 25% → 50% → 100%。出事？只有 5% 用戶受影響。</span></li>
      </ol>
    </div>
  );
}

function BlueGreenTab() {
  return (
    <div className="card">
      <h2>Blue-Green Deployment 詳解</h2>
      <div className="subtitle">兩組環境，一鍵切換，零 Downtime 回退</div>
      <p>
        Blue-Green 嘅核心好簡單：唔好喺正在跑緊嘅 server 上部署新 code。反而，準備另一組 server，喺嗰度部署新版，確認冇問題後先將流量切過去。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 350" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowBG" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <linearGradient id="gradLB" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlueBG" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreenBG" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          {/* Users */}
          <g transform="translate(30,130)">
            <rect width="100" height="65" rx="14" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" filter="url(#shadowBG)" />
            <text x="50" y="28" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">Users</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">100% 流量</text>
          </g>

          {/* Load Balancer */}
          <g transform="translate(185,120)">
            <rect width="130" height="85" rx="14" fill="url(#gradLB)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadowBG)" />
            <text x="65" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Load</text>
            <text x="65" y="46" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Balancer</text>
            <text x="65" y="68" textAnchor="middle" fill="#a78bfa" fontSize="10">切換流量指向</text>
          </g>

          {/* Blue Environment */}
          <g transform="translate(400,30)">
            <rect width="310" height="120" rx="14" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadowBG)" />
            <text x="155" y="25" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Blue 環境（舊版 v1）</text>
            <rect x="15" y="40" width="80" height="35" rx="8" fill="rgba(59,130,246,0.15)" stroke="#3B82F6" strokeWidth="1" />
            <text x="55" y="62" textAnchor="middle" fill="#60a5fa" fontSize="10">Server 1</text>
            <rect x="110" y="40" width="80" height="35" rx="8" fill="rgba(59,130,246,0.15)" stroke="#3B82F6" strokeWidth="1" />
            <text x="150" y="62" textAnchor="middle" fill="#60a5fa" fontSize="10">Server 2</text>
            <rect x="205" y="40" width="80" height="35" rx="8" fill="rgba(59,130,246,0.15)" stroke="#3B82F6" strokeWidth="1" />
            <text x="245" y="62" textAnchor="middle" fill="#60a5fa" fontSize="10">Server 3</text>
            <text x="155" y="100" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">Active — 處理所有流量</text>
          </g>

          {/* Green Environment */}
          <g transform="translate(400,190)">
            <rect width="310" height="120" rx="14" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#shadowBG)" />
            <text x="155" y="25" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Green 環境（新版 v2）</text>
            <rect x="15" y="40" width="80" height="35" rx="8" fill="rgba(52,211,153,0.15)" stroke="#10B981" strokeWidth="1" />
            <text x="55" y="62" textAnchor="middle" fill="#34d399" fontSize="10">Server 1</text>
            <rect x="110" y="40" width="80" height="35" rx="8" fill="rgba(52,211,153,0.15)" stroke="#10B981" strokeWidth="1" />
            <text x="150" y="62" textAnchor="middle" fill="#34d399" fontSize="10">Server 2</text>
            <rect x="205" y="40" width="80" height="35" rx="8" fill="rgba(52,211,153,0.15)" stroke="#10B981" strokeWidth="1" />
            <text x="245" y="62" textAnchor="middle" fill="#34d399" fontSize="10">Server 3</text>
            <text x="155" y="100" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">Standby — 部署 + 測試中</text>
          </g>

          {/* Arrows */}
          <path d="M132,162 C155,162 165,162 183,162" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrBlueBG)" />
          <path d="M317,150 C350,120 370,100 398,90" fill="none" stroke="#3B82F6" strokeWidth="2.5" markerEnd="url(#arrBlueBG)" />
          <path d="M317,175 C350,200 370,220 398,240" fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrGreenBG)" />
          <text x="350" y="108" fill="#3B82F6" fontSize="9" fontWeight="600">Active</text>
          <text x="345" y="218" fill="#10B981" fontSize="9">切換後 →</text>

          {/* Rollback label */}
          <g transform="translate(400,325)">
            <rect width="310" height="25" rx="8" fill="rgba(52,211,153,0.08)" stroke="#10B981" strokeWidth="1" />
            <text x="155" y="17" textAnchor="middle" fill="#34d399" fontSize="10">出事？Load Balancer 一切返 Blue 就即時回退</text>
          </g>
        </svg>
      </div>

      <div className="key-points">
        <div className="key-point">
          <h4>點樣運作</h4>
          <p>準備兩組完全相同嘅環境。Blue 跑舊版本處理流量，Green 部署新版本做測試。確認新版 OK 後，Load Balancer 一切就將所有流量導去 Green。Blue 變成 standby，下次部署再反過嚟。</p>
        </div>
        <div className="key-point" style={{ borderLeftColor: '#34d399' }}>
          <h4>最大優勢：即時回退</h4>
          <p>切換後發現新版有問題？Load Balancer 切返 Blue 就得。因為 Blue 環境一直開緊冇動過，回退幾秒搞掂。呢個係 Blue-Green 嘅殺手鐧——零 downtime 回退。</p>
        </div>
        <div className="key-point" style={{ borderLeftColor: '#f87171' }}>
          <h4>缺點：成本同風險</h4>
          <p>需要雙倍嘅 server 資源（兩組環境同時運行）。而且一切換就係 100% 流量，如果新版有微妙嘅 bug（例如喺高流量下先出現），所有用戶都會受影響——雖然可以快速回退，但嗰幾秒嘅影響已經發生咗。</p>
        </div>
      </div>
    </div>
  );
}

function CanaryTab() {
  return (
    <div className="card">
      <h2>Canary Deployment 詳解</h2>
      <div className="subtitle">先 5% 試水，冇問題先 100% — 最安全嘅部署方式</div>
      <p>
        如果你覺得 Blue-Green 仲唔夠安全（一切換就 100% 流量），Canary 就係你嘅答案。Canary 嘅名字來自煤礦嘅金絲雀——礦工帶金絲雀入礦洞，金絲雀冇事人先入去。部署都係一樣——先派少量流量去試新版本，確認安全先全面推出。
      </p>

      <div className="key-points">
        <div className="key-point">
          <h4>漸進式 Rollout 流程</h4>
          <p>
            將新版部署到部分 server，Load Balancer 先導 5% 流量過去。觀察 error rate、latency、CPU 等 metrics。冇問題？加到 25% → 50% → 100%。每個階段都觀察一段時間先繼續。任何階段出問題，即刻停止 rollout。
          </p>
        </div>
        <div className="key-point" style={{ borderLeftColor: '#34d399' }}>
          <h4>最大優勢：限制 Blast Radius</h4>
          <p>
            新版有 bug？只有 5% 嘅用戶受影響，唔係 100%。你有充足嘅時間觀察 metrics、分析 logs、決定係 rollback 定係 fix forward。呢個「blast radius 控制」係 Canary 最核心嘅價值。
          </p>
        </div>
        <div className="key-point">
          <h4>需要監控配合</h4>
          <p>
            Canary 嘅前提係你有完善嘅 monitoring。需要比較新版同舊版嘅 error rate、p99 latency、CPU 使用率等 metrics。如果冇監控，你都唔知新版有冇問題，Canary 就失去意義。
          </p>
        </div>
        <div className="key-point" style={{ borderLeftColor: '#fbbf24' }}>
          <h4>Canary vs Blue-Green：點揀？</h4>
          <p>
            Blue-Green 適合「要快速回退」嘅場景（例如 database migration）。Canary 適合「要控制影響範圍」嘅場景（例如大型功能上線）。好多公司兩個都用：小改動用 Blue-Green，大功能用 Canary。
          </p>
        </div>
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
        <h4>Prompt 1 — 實作 Blue-Green Deployment</h4>
        <div className="prompt-text">
          {'幫手實作一個 Blue-Green Deployment 策略，用 [工具，例如 Docker + Nginx / AWS ECS + ALB / Kubernetes]。\n\n項目背景：\n- 應用類型：[例如：Node.js REST API / React SPA / Spring Boot 微服務]\n- 目前部署方式：[例如：手動 SSH 上去 deploy / CI/CD 但冇策略]\n- 預算限制：[例如：可以接受雙倍 server 成本 / 需要慳成本]\n\n要求：\n1. 設計兩組完全相同嘅環境（Blue + Green），包括 server 配置\n2. 用 Load Balancer 控制流量切換（一鍵切 Blue ↔ Green）\n3. 部署新版到 inactive 環境時唔影響 active 環境\n4. 設定 Health Check——新版通過 health check 先切換流量\n5. 實作自動 rollback——切換後 error rate > 5% 即刻切返\n6. CI/CD 整合——Git push 自動觸發部署到 inactive 環境\n7. 生成所有配置檔（Dockerfile / nginx.conf / GitHub Actions workflow / 部署 script）'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實作 Canary Deployment</h4>
        <div className="prompt-text">
          {'幫手實作一個 Canary Deployment 策略，用 [工具，例如 Kubernetes + Istio / AWS ECS + ALB weighted routing / Nginx upstream]。\n\n要求：\n1. 設計漸進式 rollout 流程：5% → 25% → 50% → 100%\n2. 每個階段觀察 [時間，例如 10 分鐘 / 30 分鐘] 先進入下一階段\n3. 設定自動判斷標準：\n   - Error rate < [閾值，例如 1%]\n   - P99 latency < [閾值，例如 500ms]\n   - CPU 使用率 < [閾值，例如 80%]\n4. 任何指標超過閾值自動停止 rollout 並回退到 0%\n5. 設定 monitoring dashboard 比較 canary vs baseline 嘅 metrics\n6. CI/CD 整合——merge 到 main 自動開始 canary rollout\n7. 生成所有配置檔同部署 script'}
        </div>
      </div>
    </div>
  );
}

export default function DeploymentStrategies() {
  return (
    <>
      <TopicTabs
        title="部署策略"
        subtitle="Big Bang / Blue-Green / Canary — 點樣安全部署"
        tabs={[
          { id: 'overview', label: '① 三種策略', content: <OverviewTab /> },
          { id: 'blue-green', label: '② Blue-Green', content: <BlueGreenTab /> },
          { id: 'canary', label: '③ Canary', premium: true, content: <CanaryTab /> },
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
