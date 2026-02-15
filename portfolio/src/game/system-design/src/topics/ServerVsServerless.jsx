import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'deployment', label: '免費部署平台' },
  { slug: 'self-host-vs-cloud', label: 'Self-host vs Cloud' },
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
  { slug: 'docker', label: 'Docker 容器化' },
];

function ServerTab() {
  return (
    <div className="card">
      <h2>Server 方案：完全掌控</h2>
      <div className="subtitle">自主掌控，全權負責，乜都自己話事</div>
      <p>
        重點係傳統 Server 嘅玩法。<strong className="tag-server">Server</strong> 就係自己租或者買一台機——可以係雲端嘅 EC2、可以係自己屋企嘅實體機——然後開發者話事晒所有嘢。
      </p>
      <p>
        自行揀 <strong>GPU</strong>、揀 <strong>RAM</strong>、揀 <strong>儲存空間</strong>。自行決定裝咩作業系統、裝咩軟件、開咩 port。開發者負責做 OS update、security patch、防火牆設定。要幾多台就幾多台——但要自己管理 load balancing 同 auto scaling。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="serverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#34d399', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#34d399', stopOpacity: 0.05 }} />
            </linearGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" /></filter>
            <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#34d399" /></marker>
          </defs>
          <text x="400" y="30" textAnchor="middle" fill="#9ca3af" fontSize="14" fontWeight="600">Server 架構：需要管理所有層級</text>
          <g transform="translate(325,60)">
            <rect width="150" height="50" rx="14" fill="#6366f1" filter="url(#glow)" />
            <text x="75" y="32" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">開發者</text>
          </g>
          <path d="M 400 110 L 400 150" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrowGreen)" />
          <text x="420" y="135" fill="#34d399" fontSize="11" fontWeight="600">管理</text>
          <g transform="translate(150,160)">
            <rect width="500" height="260" rx="14" fill="url(#serverGrad)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="250" y="25" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Server（開發者嘅責任範圍）</text>
            <g transform="translate(20,50)">
              <rect width="210" height="70" rx="10" fill="#1e293b" stroke="#34d399" strokeWidth="1" />
              <text x="105" y="20" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">硬件配置</text>
              <text x="105" y="38" textAnchor="middle" fill="#c0c4cc" fontSize="10">GPU / RAM / Storage</text>
              <text x="105" y="54" textAnchor="middle" fill="#9ca3af" fontSize="9">自揀規格，自付費用</text>
            </g>
            <g transform="translate(250,50)">
              <rect width="230" height="70" rx="10" fill="#1e293b" stroke="#34d399" strokeWidth="1" />
              <text x="115" y="20" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">作業系統 + 安全</text>
              <text x="115" y="38" textAnchor="middle" fill="#c0c4cc" fontSize="10">OS updates / Security patch</text>
              <text x="115" y="54" textAnchor="middle" fill="#9ca3af" fontSize="9">需要定期更新同防護</text>
            </g>
            <g transform="translate(20,140)">
              <rect width="210" height="70" rx="10" fill="#1e293b" stroke="#34d399" strokeWidth="1" />
              <text x="105" y="20" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">擴展 Scaling</text>
              <text x="105" y="38" textAnchor="middle" fill="#c0c4cc" fontSize="10">手動加減 Server</text>
              <text x="105" y="54" textAnchor="middle" fill="#9ca3af" fontSize="9">要自己設定 auto scaling</text>
            </g>
            <g transform="translate(250,140)">
              <rect width="230" height="70" rx="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
              <text x="115" y="20" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="600">成本模式</text>
              <text x="115" y="38" textAnchor="middle" fill="#c0c4cc" fontSize="10">Always-on = Always-paying</text>
              <text x="115" y="54" textAnchor="middle" fill="#9ca3af" fontSize="9">開住機就收住錢（按小時計）</text>
            </g>
          </g>
          <text x="400" y="445" textAnchor="middle" fill="#6b7280" fontSize="11">完全控制 = 完全責任</text>
        </svg>
      </div>

      <h3>重點特性</h3>
      <div className="key-points">
        <div className="key-point"><h4>完全控制權</h4><p>想點改就點改。想裝咩軟件、想用咩 port、想點配 network 都得。冇任何限制。</p></div>
        <div className="key-point"><h4>Always-on 成本</h4><p>Server 係 24 小時開住嘅——就算冇人用，都要畀錢。雲端按小時計，自己嘅機就係電費。</p></div>
        <div className="key-point"><h4>自己管理維護</h4><p>OS update、security patch、監控、備份——全部自行負責。有問題半夜三更都要起身搞。</p></div>
        <div className="key-point"><h4>手動擴展</h4><p>流量多咗要自己加 Server。可以寫 auto scaling script，但都係自己搞，唔會自動處理。</p></div>
      </div>

      <div className="pros-cons">
        <div className="pros">
          <h4>優點</h4>
          <ul>
            <li>完全控制硬件同軟件</li>
            <li>可以優化到極致</li>
            <li>長期穩定流量成本可預測</li>
            <li>冇 vendor lock-in</li>
          </ul>
        </div>
        <div className="cons">
          <h4>缺點</h4>
          <ul>
            <li>Always-on = 冇流量都照收錢</li>
            <li>要有人手管理維護</li>
            <li>擴展要時間（手動加機）</li>
            <li>開發者負責所有安全問題</li>
          </ul>
        </div>
      </div>

      <div className="use-case">
        <h4>適合場景</h4>
        <p>流量穩定、有專人維護、長期運行嘅服務。例如公司內部系統、穩定嘅 API、大型網站後端。如果有技術團隊去管理，Server 長遠嚟講可能平過 Serverless。</p>
      </div>
    </div>
  );
}

function ServerlessTab() {
  return (
    <div className="card">
      <h2>Serverless 方案：雲端幫手搞</h2>
      <div className="subtitle">只管寫 code，其他嘢雲端供應商幫手搞晒</div>
      <p>
        跟住講 <strong className="tag-serverless">Serverless</strong> 嘅玩法。Serverless 唔係話冇 Server——而係<strong>唔使管 Server</strong>。硬件、作業系統、擴展、維護——全部雲端供應商處理，開發者只需要 deploy code。
      </p>
      <p>
        最常見嘅係 <strong>AWS Lambda</strong>、<strong>Google Cloud Functions</strong>、<strong>Azure Functions</strong>。寫一個 function，上傳，然後每次有 request 就自動執行。用完即棄，冇 request 就唔收錢。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="serverlessGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 0.05 }} />
            </linearGradient>
            <filter id="glowOrange"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <marker id="arrowOrange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" /></marker>
          </defs>
          <text x="400" y="30" textAnchor="middle" fill="#9ca3af" fontSize="14" fontWeight="600">Serverless 架構：雲端供應商管理底層</text>
          <g transform="translate(325,60)">
            <rect width="150" height="50" rx="14" fill="#6366f1" filter="url(#glowOrange)" />
            <text x="75" y="32" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">開發者</text>
          </g>
          <path d="M 400 110 L 400 150" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arrowOrange)" />
          <text x="420" y="135" fill="#f59e0b" fontSize="11" fontWeight="600">只寫 code</text>
          <g transform="translate(300,160)">
            <rect width="200" height="50" rx="14" fill="#1e293b" stroke="#6366f1" strokeWidth="2" />
            <text x="100" y="22" textAnchor="middle" fill="#6366f1" fontSize="12" fontWeight="700">應用 Code</text>
            <text x="100" y="38" textAnchor="middle" fill="#c0c4cc" fontSize="10">deploy 就收工</text>
          </g>
          <path d="M 400 210 L 400 240" stroke="#f59e0b" strokeWidth="2" fill="none" markerEnd="url(#arrowOrange)" strokeDasharray="4,4" />
          <g transform="translate(150,250)">
            <rect width="500" height="170" rx="14" fill="url(#serverlessGrad)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow)" />
            <text x="250" y="25" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="700">雲端供應商負責（唔使理）</text>
            <g transform="translate(20,45)">
              <rect width="140" height="60" rx="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
              <text x="70" y="20" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="600">硬件</text>
              <text x="70" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">供應商揀</text>
              <text x="70" y="50" textAnchor="middle" fill="#9ca3af" fontSize="9">唔使管</text>
            </g>
            <g transform="translate(180,45)">
              <rect width="140" height="60" rx="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
              <text x="70" y="20" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="600">自動擴展</text>
              <text x="70" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">流量多自動加</text>
              <text x="70" y="50" textAnchor="middle" fill="#9ca3af" fontSize="9">流量少自動減</text>
            </g>
            <g transform="translate(340,45)">
              <rect width="140" height="60" rx="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
              <text x="70" y="20" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="600">維護</text>
              <text x="70" y="36" textAnchor="middle" fill="#9ca3af" fontSize="9">OS update</text>
              <text x="70" y="50" textAnchor="middle" fill="#9ca3af" fontSize="9">Security patch</text>
            </g>
            <g transform="translate(130,120)">
              <rect width="240" height="30" rx="8" fill="#1e293b" stroke="#34d399" strokeWidth="1" />
              <text x="120" y="20" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">Pay per request — 冇 request 就免費</text>
            </g>
          </g>
          <text x="400" y="445" textAnchor="middle" fill="#6b7280" fontSize="11">零維護 = 零控制（改唔到底層）</text>
        </svg>
      </div>

      <h3>重點特性</h3>
      <div className="key-points">
        <div className="key-point"><h4>雲端揀硬件</h4><p>唔使揀 GPU、RAM、Storage。雲端供應商會自動配置適合嘅硬件，唔需要知道底層跑緊咩機。</p></div>
        <div className="key-point"><h4>自動擴展</h4><p>流量多咗會自動加 instance，流量少咗會自動減。完全唔使操心，全自動處理。</p></div>
        <div className="key-point"><h4>按 request 收費</h4><p>冇 request 就唔收錢——真正嘅 pay-as-you-go。但流量大嘅時候帳單會好驚人。</p></div>
        <div className="key-point"><h4>零維護負擔</h4><p>OS update、security patch、監控——全部雲端供應商搞。唔使半夜起身處理服務器問題。</p></div>
      </div>

      <div className="pros-cons">
        <div className="pros">
          <h4>優點</h4>
          <ul>
            <li>冇流量就免費（真正按用量收費）</li>
            <li>自動 scaling，唔使人手操作</li>
            <li>零維護，唔使管 Server</li>
            <li>快速部署，幾分鐘就上線</li>
          </ul>
        </div>
        <div className="cons">
          <h4>缺點</h4>
          <ul>
            <li>大流量時成本爆升</li>
            <li>Vendor lock-in（好難搬走）</li>
            <li>Cold start 延遲問題</li>
            <li>改唔到底層配置</li>
          </ul>
        </div>
      </div>

      <div className="use-case">
        <h4>適合場景</h4>
        <p>流量唔穩定、spiky 嘅服務。例如每日淨係繁忙時間先有流量嘅 App、週末先多人用嘅服務、event-driven 嘅工作（處理上傳、發送通知）。如果唔想請人管 Server、預算充裕，Serverless 係好選擇。</p>
      </div>

      <div className="highlight-box">
        <p><strong>Cold Start 係咩？</strong>第一次 request 嚟嘅時候，Serverless function 要「開機」——要 load code、建立連接。呢個過程可能要幾百 ms 甚至幾秒。如果需要低延遲，就要考慮呢個問題。</p>
      </div>
    </div>
  );
}

function DecisionTab() {
  return (
    <div className="card">
      <h2>點樣揀：三個關鍵問題</h2>
      <div className="subtitle">根據流量模式、預算、團隊規模嚟決定</div>
      <p>
        總結如下三個關鍵因素。問以下呢三條問題，基本上就知道應該揀 Server 定 Serverless。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="decisionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#34d399', stopOpacity: 0.2 }} />
              <stop offset="50%" style={{ stopColor: '#6366f1', stopOpacity: 0.2 }} />
              <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 0.2 }} />
            </linearGradient>
            <marker id="arrowDecision" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#6366f1" /></marker>
          </defs>
          <text x="400" y="30" textAnchor="middle" fill="#9ca3af" fontSize="14" fontWeight="600">決策流程圖</text>
          <g transform="translate(300,60)">
            <rect width="200" height="60" rx="14" fill="#1e293b" stroke="#6366f1" strokeWidth="2" />
            <text x="100" y="24" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="600">問題 1：流量模式</text>
            <text x="100" y="40" textAnchor="middle" fill="#c0c4cc" fontSize="10">穩定定 Spiky？</text>
          </g>
          <path d="M 300 90 L 180 150" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowDecision)" />
          <path d="M 500 90 L 620 150" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowDecision)" />
          <g transform="translate(50,150)">
            <rect width="180" height="70" rx="12" fill="#1e293b" stroke="#34d399" strokeWidth="1.5" />
            <text x="90" y="20" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">穩定流量</text>
            <text x="90" y="38" textAnchor="middle" fill="#c0c4cc" fontSize="9">24 小時都有人用</text>
            <text x="90" y="52" textAnchor="middle" fill="#c0c4cc" fontSize="9">流量波動唔大</text>
            <text x="90" y="64" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">→ Server 平啲</text>
          </g>
          <g transform="translate(570,150)">
            <rect width="180" height="70" rx="12" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="90" y="20" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="600">Spiky 流量</text>
            <text x="90" y="38" textAnchor="middle" fill="#c0c4cc" fontSize="9">大部分時間冇流量</text>
            <text x="90" y="52" textAnchor="middle" fill="#c0c4cc" fontSize="9">繁忙時間先爆</text>
            <text x="90" y="64" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="600">→ Serverless 抵啲</text>
          </g>
          <g transform="translate(300,260)">
            <rect width="200" height="60" rx="14" fill="#1e293b" stroke="#6366f1" strokeWidth="2" />
            <text x="100" y="24" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="600">問題 2：預算</text>
            <text x="100" y="40" textAnchor="middle" fill="#c0c4cc" fontSize="10">有錢定要慳錢？</text>
          </g>
          <path d="M 300 290 L 180 350" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowDecision)" />
          <path d="M 500 290 L 620 350" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowDecision)" />
          <g transform="translate(50,350)">
            <rect width="180" height="70" rx="12" fill="#1e293b" stroke="#34d399" strokeWidth="1.5" />
            <text x="90" y="20" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">預算有限</text>
            <text x="90" y="38" textAnchor="middle" fill="#c0c4cc" fontSize="9">要慳錢</text>
            <text x="90" y="52" textAnchor="middle" fill="#c0c4cc" fontSize="9">有技術人手</text>
            <text x="90" y="64" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">→ Server（長遠平）</text>
          </g>
          <g transform="translate(570,350)">
            <rect width="180" height="70" rx="12" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="90" y="20" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="600">預算充裕</text>
            <text x="90" y="38" textAnchor="middle" fill="#c0c4cc" fontSize="9">用錢買時間</text>
            <text x="90" y="52" textAnchor="middle" fill="#c0c4cc" fontSize="9">唔想煩</text>
            <text x="90" y="64" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="600">→ Serverless（方便）</text>
          </g>
          <g transform="translate(300,460)">
            <rect width="200" height="30" rx="10" fill="#1e293b" stroke="#6366f1" strokeWidth="2" />
            <text x="100" y="20" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="600">問題 3：有冇人管 Server？</text>
          </g>
        </svg>
      </div>

      <ul className="steps">
        <li>
          <div className="step-num">1</div>
          <div>
            <strong>流量模式</strong><br />
            如果流量穩定（例如 24 小時都有人用），Server always-on 嘅成本反而平過 Serverless 按 request 收費。但如果流量 spiky（例如淨係繁忙時間先有），Serverless 就抵好多——大部分時間免費。
          </div>
        </li>
        <li>
          <div className="step-num">2</div>
          <div>
            <strong>預算同團隊</strong><br />
            有技術人手去管 Server？預算有限？咁用 Server，長遠平啲。如果冇人手、唔想煩、預算充裕，就用 Serverless——用錢買方便。
          </div>
        </li>
        <li>
          <div className="step-num">3</div>
          <div>
            <strong>控制權 vs 便利性</strong><br />
            需要完全控制硬件同軟件（例如特殊嘅 GPU、自訂網絡設定）？就要用 Server。如果只係想跑 code、唔想理底層，Serverless 係完美選擇。
          </div>
        </li>
      </ul>

      <table className="compare-table">
        <thead>
          <tr>
            <th></th>
            <th>Server</th>
            <th>Serverless</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className="label">適合流量</td><td>穩定、持續</td><td>Spiky、唔穩定</td></tr>
          <tr><td className="label">成本模式</td><td>Always-on，按小時計</td><td>Pay-per-request，冇 request 免費</td></tr>
          <tr><td className="label">維護負擔</td><td>開發者負責 OS、安全、監控</td><td>雲端供應商負責</td></tr>
          <tr><td className="label">擴展方式</td><td>手動或者自己寫 auto scaling</td><td>完全自動，唔使理</td></tr>
          <tr><td className="label">控制權</td><td>完全控制</td><td>零控制（改唔到底層）</td></tr>
          <tr><td className="label">適合團隊</td><td>有技術人手管理</td><td>小團隊、唔想煩</td></tr>
        </tbody>
      </table>

      <div className="use-case">
        <h4>最佳做法</h4>
        <p>
          如果係 startup，一開始用 Serverless——快速上線、唔使管 Server、成本低（因為一開始流量少）。但當 scale 到一定規模、流量穩定咗，就要考慮搬去 Server——因為大流量下 Serverless 會好貴。
        </p>
        <p>
          如果有技術團隊、流量穩定、長期運行，一開始就用 Server——控制權高、成本可預測。但要有人手去管理維護。
        </p>
      </div>

      <div className="highlight-box">
        <p><strong>混合用都得！</strong>好多公司其實係混合用嘅——主要 App 跑喺 Server 度（穩定流量），但簡單嘅 background job（例如發 email、處理圖片）就用 Serverless。唔使二揀一，按需求混搭先係最聰明。</p>
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
        <h4>Prompt 1 — 評估 Server vs Serverless 方案</h4>
        <div className="prompt-text">{`幫手做一份 Server vs Serverless 技術評估報告，針對以下項目：

項目類型：[項目描述，例如 SaaS 平台 / 電商網站 / 內部工具]
預計用戶量：[用戶數，例如 10K DAU / 100K MAU]
流量模式：[穩定 / Spiky / 有明顯高峰時段]
團隊規模：[人數，例如 2 人 / 5 人 / 10 人以上]
預算範圍：[月預算，例如 $100 / $500 / $2000]

評估內容：
1. 兩個方案嘅月成本估算（包含 compute、storage、bandwidth）
2. 開發同部署時間比較
3. 維護負擔分析（需要幾多人手、幾多時間）
4. Scaling 能力評估（流量增長 10x 時嘅應對方案）
5. Cold Start 影響分析（如果揀 Serverless）
6. Vendor Lock-in 風險評估
7. 最終建議：揀邊個方案，附帶理由

輸出格式：結構化報告，每個評估項目附帶數據同結論。`}</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Serverless 架構（AWS Lambda / Cloudflare Workers）</h4>
        <div className="prompt-text">{`幫手設計一套完整嘅 Serverless 架構，用 [平台，例如 AWS Lambda + API Gateway / Cloudflare Workers] 實現以下功能：

應用類型：[應用描述，例如 REST API / 圖片處理 Pipeline / Webhook 處理器]
主要功能：[功能列表，例如 用戶認證、CRUD 操作、文件上傳]
Database：[數據庫選擇，例如 DynamoDB / Supabase / PlanetScale]

包含以下內容：
1. 架構圖（用文字描述每個 component 同佢哋嘅連接）
2. 每個 Lambda Function / Worker 嘅職責劃分
3. API Gateway / Router 配置
4. Database schema 設計
5. 認證方案（JWT / API Key）
6. 完整嘅 serverless.yml 或 wrangler.toml 配置
7. CI/CD pipeline 設定（GitHub Actions）
8. 監控同 logging 方案（CloudWatch / Sentry）
9. Cold Start 優化策略

輸出格式：架構文檔 + 可以直接用嘅配置檔同 boilerplate code。`}</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 混合架構設計（Server + Serverless）</h4>
        <div className="prompt-text">{`幫手設計一套混合架構，將 Server 同 Serverless 結合使用：

項目背景：[項目描述，例如 電商平台需要處理訂單 + 發送通知 + 生成報表]

設計要求：
- 主要 API 用 Server（[框架，例如 Express / FastAPI / Go]）處理穩定流量
- Background Job 用 Serverless 處理（[任務類型，例如 發送 Email / 圖片壓縮 / PDF 生成]）
- 兩者之間用 Message Queue 連接

包含以下內容：
1. 整體架構圖（邊啲 component 用 Server、邊啲用 Serverless）
2. Message Queue 選擇同配置（SQS / Redis Queue / Kafka）
3. Server 部分嘅 Docker + 部署配置
4. Serverless 部分嘅 Function 設計
5. 兩者之間嘅通訊協議同錯誤處理
6. 成本估算（Server always-on + Serverless pay-per-use）
7. 監控方案（統一 logging 同 alerting）

輸出格式：架構設計文檔 + 核心 code snippet + 部署指南。`}</div>
      </div>
    </div>
  );
}

export default function ServerVsServerless() {
  return (
    <>
      <TopicTabs
        title="Server vs Serverless"
        subtitle="傳統 Server 定 Serverless？兩種完全唔同嘅遊戲規則"
        tabs={[
          { id: 'server', label: '① Server 方案', content: <ServerTab /> },
          { id: 'serverless', label: '② Serverless 方案', content: <ServerlessTab /> },
          { id: 'decision', label: '③ 點樣揀', premium: true, content: <DecisionTab /> },
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
