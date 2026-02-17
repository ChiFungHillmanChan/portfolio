import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Self-host 同 Cloud 最核心嘅 trade-off 係咩？',
    options: [
      { text: 'Self-host 一定平過 Cloud', correct: false, explanation: 'Self-host 唔一定平，前期硬件投入大，而且要計埋維護時間嘅成本' },
      { text: 'Cloud 用錢買方便同彈性，Self-host 用時間換自由同控制權', correct: true, explanation: '啱！Cloud 好似租酒店，乜都幫手搞但要交月租。Self-host 好似買屋，前期投入大但長遠自由度高' },
      { text: 'Cloud 永遠比 Self-host 快', correct: false, explanation: '速度取決於具體配置，Self-host 可以用高規格硬件達到同等甚至更快嘅速度' },
      { text: 'Self-host 唔使任何技術知識', correct: false, explanation: 'Self-host 需要大量技術知識嚟管理硬件、OS、networking、security 等' },
    ],
  },
  {
    question: '邊種情況最適合用 Cloud 而唔係 Self-host？',
    options: [
      { text: '需要快速 scale、唔想管硬件、流量波動大嘅 startup', correct: true, explanation: '啱！Startup 需要快速驗證想法，Cloud 提供即時 scale up/down、唔使管硬件，非常適合流量唔穩定嘅早期階段' },
      { text: '長期穩定運行嘅個人 blog', correct: false, explanation: '個人 blog 流量穩定又低，Self-host 或者 static hosting 可能更划算' },
      { text: '需要完全控制硬件嘅合規要求', correct: false, explanation: '需要完全控制硬件嘅話應該 Self-host' },
      { text: '預算無限嘅大企業', correct: false, explanation: '大企業反而可能有 on-premise data center，唔一定用 Cloud' },
    ],
  },
  {
    question: 'Self-host 最大嘅隱藏成本係咩？',
    options: [
      { text: '電費', correct: false, explanation: '電費雖然係成本之一，但唔係最大嘅隱藏成本' },
      { text: '維護時間同精力 — 硬件故障、OS 更新、security patch 全部要自己搞', correct: true, explanation: '啱！Self-host 最容易低估嘅係人力成本。硬件壞、被攻擊、需要更新都要自己處理，呢啲時間嘅機會成本好高' },
      { text: '購買 domain name', correct: false, explanation: 'Domain name 費用好低，而且 Cloud 同 Self-host 都需要' },
      { text: '辦公室租金', correct: false, explanation: 'Self-host 可以放喺屋企，唔一定需要辦公室' },
    ],
  },
];

const relatedTopics = [
  { slug: 'deployment', label: '免費部署平台' },
  { slug: 'server-vs-serverless', label: 'Server vs Serverless' },
  { slug: 'docker', label: 'Docker 容器化' },
  { slug: 'monitoring', label: '應用程式監控' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>兩種完全唔同嘅哲學</h2>
      <div className="subtitle">一個畀錢買方便，一個用時間換自由</div>
      <p>
        部署應用程式有兩大陣營：用雲端服務（例如 <span className="tag-cloud">AWS</span>）定係自己管理 Server（<span className="tag-self">Self-host</span>）。兩個都得，但 trade-off 完全唔同。
      </p>
      <p>
        簡單講：<span className="tag-cloud">Cloud</span> 就好似租酒店——乜都幫晒手，但每個月要交租。<span className="tag-self">Self-host</span> 就好似買間屋——前期投入大、所有嘢自己搞，但長遠可能平啲同自由啲。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
          </defs>

          <text x="400" y="30" textAnchor="middle" fill="#9ca3af" fontSize="13" fontWeight="500">三大範疇比較</text>

          <g transform="translate(50,50)">
            <rect width="300" height="40" rx="8" fill="rgba(245,158,11,0.12)" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="150" y="26" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="700">☁️ Cloud（AWS）</text>
          </g>

          <g transform="translate(450,50)">
            <rect width="300" height="40" rx="8" fill="rgba(52,211,153,0.12)" stroke="#34d399" strokeWidth="1.5" />
            <text x="150" y="26" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">🏠 Self-host</text>
          </g>

          <g transform="translate(50,110)">
            <rect width="300" height="70" rx="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" filter="url(#shadow)" />
            <text x="150" y="22" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="600">🖥 託管</text>
            <text x="150" y="40" textAnchor="middle" fill="#c0c4cc" fontSize="11">EC2 / Lambda</text>
            <text x="150" y="56" textAnchor="middle" fill="#9ca3af" fontSize="10">按需揀，唔使管硬件</text>
          </g>
          <g transform="translate(450,110)">
            <rect width="300" height="70" rx="10" fill="#1e293b" stroke="#34d399" strokeWidth="1" filter="url(#shadow)" />
            <text x="150" y="22" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="600">🏠 託管</text>
            <text x="150" y="40" textAnchor="middle" fill="#c0c4cc" fontSize="11">自己嘅 Server（屋企/機房）</text>
            <text x="150" y="56" textAnchor="middle" fill="#9ca3af" fontSize="10">完全控制，廢熱仲可以暖屋</text>
          </g>

          <text x="400" y="150" textAnchor="middle" fill="#4b5563" fontSize="11">vs</text>

          <g transform="translate(50,200)">
            <rect width="300" height="70" rx="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" filter="url(#shadow)" />
            <text x="150" y="22" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="600">📈 擴展</text>
            <text x="150" y="40" textAnchor="middle" fill="#c0c4cc" fontSize="11">AWS ECS Auto Scaling</text>
            <text x="150" y="56" textAnchor="middle" fill="#9ca3af" fontSize="10">流量多就加 Server，少就減</text>
          </g>
          <g transform="translate(450,200)">
            <rect width="300" height="70" rx="10" fill="#1e293b" stroke="#34d399" strokeWidth="1" filter="url(#shadow)" />
            <text x="150" y="22" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="600">📈 擴展</text>
            <text x="150" y="40" textAnchor="middle" fill="#c0c4cc" fontSize="11">Kubernetes（K8s）</text>
            <text x="150" y="56" textAnchor="middle" fill="#9ca3af" fontSize="10">免費開源，自動 scale 所有嘢</text>
          </g>

          <text x="400" y="240" textAnchor="middle" fill="#4b5563" fontSize="11">vs</text>

          <g transform="translate(50,290)">
            <rect width="300" height="70" rx="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" filter="url(#shadow)" />
            <text x="150" y="22" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="600">📊 監控</text>
            <text x="150" y="40" textAnchor="middle" fill="#c0c4cc" fontSize="11">CloudWatch</text>
            <text x="150" y="56" textAnchor="middle" fill="#9ca3af" fontSize="10">Logs / Alarms / Metrics / 一站式</text>
          </g>
          <g transform="translate(450,290)">
            <rect width="300" height="70" rx="10" fill="#1e293b" stroke="#34d399" strokeWidth="1" filter="url(#shadow)" />
            <text x="150" y="22" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="600">📊 監控</text>
            <text x="150" y="40" textAnchor="middle" fill="#c0c4cc" fontSize="11">Prometheus + Grafana</text>
            <text x="150" y="56" textAnchor="middle" fill="#9ca3af" fontSize="10">免費開源，自己搭建</text>
          </g>

          <text x="400" y="330" textAnchor="middle" fill="#4b5563" fontSize="11">vs</text>

          <text x="200" y="390" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="500">💰 畀錢買方便</text>
          <text x="600" y="390" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="500">⏰ 用時間換自由</text>
        </svg>
      </div>

      <table className="compare-table">
        <thead>
          <tr>
            <th></th>
            <th>☁️ Cloud（AWS）</th>
            <th>🏠 Self-host</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className="label">💰 成本模式</td><td>按用量收費（pay-as-you-go）</td><td>前期硬件投入 + 電費 + 時間</td></tr>
          <tr><td className="label">🛠 管理難度</td><td>AWS 負責管基礎設施</td><td>所有嘢自己搞：硬件、網絡、安全</td></tr>
          <tr><td className="label">📈 擴展能力</td><td>幾分鐘內加減 Server</td><td>要買新硬件，可能要等幾日</td></tr>
          <tr><td className="label">🔒 安全性</td><td>AWS 有專業安全團隊</td><td>自己負責所有安全更新同防護</td></tr>
          <tr><td className="label">🎛 控制權</td><td>受限於 AWS 嘅規則同定價</td><td>完全控制，想點改就點改</td></tr>
          <tr><td className="label">⚡ 適合邊個</td><td>中小企、初創、快速上線</td><td>技術強嘅團隊、長期穩定需求</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function HostingTab() {
  return (
    <div className="card">
      <h2>🖥 託管方式比較</h2>
      <div className="subtitle">App 跑喺邊度？</div>

      <h3 style={{ color: '#f59e0b' }}>☁️ AWS 方案：EC2 / Lambda</h3>
      <p>
        <strong style={{ color: '#f59e0b' }}>EC2</strong> 就好似喺 AWS 租一台電腦——揀 CPU、記憶體、硬碟大小，然後 SSH 入去裝 App。唔使買硬件、唔使擔心硬碟壞咗。
      </p>
      <p>
        <strong style={{ color: '#f59e0b' }}>Lambda</strong> 更加方便——只需要寫 code，唔使管 Server。AWS 自動執行，用幾多秒收幾多錢。適合簡單嘅 API 或者 event-driven 嘅工作。
      </p>
      <div className="pros-cons">
        <div className="pros">
          <h4>👍 好處</h4>
          <ul>
            <li>幾分鐘就可以開一台 Server</li>
            <li>唔使管硬件，AWS 負責維護</li>
            <li>全球多個 Region，邊度近放邊度</li>
            <li>Lambda 用完即棄，唔使長期付費</li>
          </ul>
        </div>
        <div className="cons">
          <h4>👎 壞處</h4>
          <ul>
            <li>長期跑嘅嘢可能好貴</li>
            <li>被 AWS 綁定（vendor lock-in）</li>
            <li>Lambda 有 cold start 延遲</li>
            <li>帳單好複雜，唔小心會爆預算</li>
          </ul>
        </div>
      </div>

      <h3 style={{ color: '#34d399', marginTop: '28px' }}>🏠 Self-host 方案：自己嘅 Server</h3>
      <p>
        自己買一台（或者幾台）Server，放喺屋企或者租機房空間（colocation）。所有嘢自己控制——作業系統、網絡設定、安全配置。甚至有人話自架 Server 嘅廢熱可以暖屋，一舉兩得。
      </p>
      <div className="pros-cons">
        <div className="pros">
          <h4>👍 好處</h4>
          <ul>
            <li>長期成本可能平過 Cloud</li>
            <li>完全控制硬件同軟件</li>
            <li>冇 vendor lock-in</li>
            <li>資料完全喺自己手</li>
          </ul>
        </div>
        <div className="cons">
          <h4>👎 壞處</h4>
          <ul>
            <li>硬件壞咗要自己修 / 換</li>
            <li>停電 = 服務中斷</li>
            <li>要自己搞備份、安全、網絡</li>
            <li>擴展要買新硬件，唔可以即時加</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ScalingTab() {
  return (
    <div className="card">
      <h2>📈 自動擴展比較</h2>
      <div className="subtitle">流量暴增嘅時候，系統頂唔頂得住？</div>

      <h3 style={{ color: '#f59e0b' }}>☁️ AWS ECS Auto Scaling</h3>
      <p>
        AWS ECS（Elastic Container Service）可以根據 CPU 使用率、記憶體或者自訂 metric 自動加減 Container 數量。例如 CPU 超過 70% 就加一台，低過 30% 就減一台。全自動，唔使人手操作。
      </p>
      <p>仲有 <strong>AWS Fargate</strong>——唔使管 Server，只管 Container。ECS + Fargate 基本上係 Serverless Container，AWS 負責搞晒底層。</p>

      <h3 style={{ color: '#34d399', marginTop: '24px' }}>🏠 Kubernetes（K8s）</h3>
      <p>
        Kubernetes 係 Google 開源嘅 Container 編排工具，完全免費。佢可以做到同 AWS ECS 一樣嘅自動擴展——但需要自己搭建同管理 K8s cluster。
      </p>
      <p>K8s 嘅 <strong>Horizontal Pod Autoscaler（HPA）</strong> 可以根據 CPU / 記憶體自動增減 Pod（Container）數量。仲支援自訂 metric。</p>

      <div className="key-points" style={{ marginTop: '20px' }}>
        <div className="key-point">
          <h4>⚡ ECS 嘅優勢</h4>
          <p>同 AWS 生態系統深度整合（ALB、CloudWatch、IAM）。唔使識 K8s 就可以用。適合已經 all-in AWS 嘅團隊。</p>
        </div>
        <div className="key-point">
          <h4>⚡ K8s 嘅優勢</h4>
          <p>唔被任何雲端綁定——可以跑喺 AWS、GCP、Azure 或者自己嘅 Server 度。社區超大，插件超多。</p>
        </div>
        <div className="key-point">
          <h4>⚠️ ECS 嘅代價</h4>
          <p>AWS 收費。而且一旦用咗 ECS，搬去其他雲端好麻煩（vendor lock-in）。</p>
        </div>
        <div className="key-point">
          <h4>⚠️ K8s 嘅代價</h4>
          <p>學習曲線超陡。管理 K8s cluster 本身就係一份全職工作。「K8s 係免費嘅，但管理 K8s 嘅人唔免費。」</p>
        </div>
      </div>
    </div>
  );
}

function MonitoringTab() {
  return (
    <div className="card">
      <h2>📊 監控與日誌比較</h2>
      <div className="subtitle">出咗事點知？點搵原因？</div>

      <h3 style={{ color: '#f59e0b' }}>☁️ AWS CloudWatch</h3>
      <p>
        一站式監控方案：Logs（日誌）、Metrics（指標）、Alarms（告警）、Dashboards（可視化）全部包晒。同 AWS 嘅所有服務自動整合——EC2 嘅 CPU、Lambda 嘅執行時間、RDS 嘅連接數，乜都有。
      </p>
      <p>缺點係<strong>收費</strong>——Log 量大嘅話帳單會好驚人。而且離開 AWS 生態就用唔到。</p>

      <h3 style={{ color: '#34d399', marginTop: '24px' }}>🏠 Prometheus + Grafana</h3>
      <p>
        <strong style={{ color: '#34d399' }}>Prometheus</strong>：開源嘅 metrics 收集同儲存系統。用 pull 模式——主動去各個 Server 攞數據。內置 alert 功能。
      </p>
      <p>
        <strong style={{ color: '#34d399' }}>Grafana</strong>：開源嘅 dashboard 工具。將 Prometheus 收集嘅數據用靚靚嘅圖表顯示出嚟。社區有幾千個現成嘅 dashboard template。
      </p>
      <p>兩個都係<strong>完全免費</strong>，但需要自己搭建、自己維護、自己寫 alert rule。</p>

      <div className="key-points" style={{ marginTop: '20px' }}>
        <div className="key-point">
          <h4>💰 成本</h4>
          <p>CloudWatch 按 log 量同 metric 數收費，大規模可以好貴。Prometheus + Grafana 免費，但需要 Server 資源去跑。</p>
        </div>
        <div className="key-point">
          <h4>🔧 設定難度</h4>
          <p>CloudWatch 即開即用。Prometheus 要自己寫 config、設定 scrape targets、管理 retention policy。</p>
        </div>
        <div className="key-point">
          <h4>🔗 整合性</h4>
          <p>CloudWatch 同 AWS 服務無縫整合。Prometheus 要手動加 exporter，但支援幾乎所有嘅技術棧。</p>
        </div>
        <div className="key-point">
          <h4>📊 可視化</h4>
          <p>CloudWatch Dashboard 夠用但唔算靚。Grafana 嘅圖表超靚超靈活，係業界可視化嘅標準。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>💡 最佳實踐：混合用</h4>
        <p>好多公司其實係混合用嘅——就算用 AWS，都會額外部署 Prometheus + Grafana 做更靈活嘅監控。唔使二揀一，按需求混搭先係最聰明嘅做法。</p>
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
        <h4>Prompt 1 — Self-host vs Cloud 選型評估</h4>
        <div className="prompt-text">{`幫我評估以下項目應該用 Self-host 定 Cloud（AWS / GCP / Azure）部署：

項目描述：[例如：一個面向 500 用戶嘅內部管理系統 / 一個面向全球嘅 SaaS 產品 / 一個 AI 模型推理服務]
團隊規模：[例如：2 個全端開發者 / 5 人工程團隊有 DevOps]
預算：[例如：每月 $500 以內 / 盡量慳錢]

請從以下角度分析：
- 成本對比：計算 3 年嘅 TCO（Total Cost of Ownership）
- 管理複雜度：需要幾多 DevOps 工作量？
- 擴展需求：流量波動大唔大？需要自動 scaling？
- 安全同合規：有冇特殊嘅數據駐留要求？
- 最終建議用邊個方案，附上具體嘅架構設計同服務選擇`}</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計混合部署架構</h4>
        <div className="prompt-text">{`幫我設計一個混合部署（Hybrid Deployment）架構，結合 Self-host 同 Cloud 嘅優勢。

場景：[例如：核心數據庫要 self-host 保密，但前端同 API 想用 cloud 做 auto-scaling / 開發環境用 cloud，production 用 self-host]

要求：
- 畫出完整嘅架構圖（用文字描述 components 同連接方式）
- Self-host 部分用 Docker + [Docker Compose / Kubernetes]
- Cloud 部分用 [AWS / GCP / Azure] 嘅具體服務
- 設計兩邊嘅安全連接方案（VPN / Cloudflare Tunnel / WireGuard）
- 監控方案：Prometheus + Grafana 統一監控兩邊
- 備份同災難恢復策略
- 列出每月預估成本`}</div>
      </div>
    </div>
  );
}

export default function SelfHostVsCloud() {
  return (
    <>
      <TopicTabs
        title="☁️ Self-host vs Cloud（AWS）"
        subtitle="自己搞 Server 定用雲端？三大範疇比較：託管、擴展、監控"
        tabs={[
          { id: 'overview', label: '① 總覽比較', content: <OverviewTab /> },
          { id: 'hosting', label: '② 託管方式', content: <HostingTab /> },
          { id: 'scaling', label: '③ 自動擴展', premium: true, content: <ScalingTab /> },
          { id: 'monitoring', label: '④ 監控日誌', premium: true, content: <MonitoringTab /> },
          { id: 'ai-viber', label: '⑤ AI Viber', premium: true, content: <AIViberTab /> },
        
          { id: 'quiz', label: '小測', content: <QuizRenderer data={quizData} /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
