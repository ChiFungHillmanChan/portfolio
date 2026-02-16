import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '你嘅應用需要處理用戶之間嘅複雜關聯（例如朋友關係、訂單同產品嘅關係），而且需要 ACID transaction。以下邊個 Database 最適合？',
    options: [
      { text: 'Redis', correct: false, explanation: 'Redis 係 Key-Value Store，適合做快取同簡單數據存取，但唔支持複雜嘅關聯查詢同 ACID transaction。' },
      { text: 'PostgreSQL', correct: true, explanation: '結構化數據加上複雜關聯同 ACID 需求，SQL Database 係最佳選擇。PostgreSQL 支持 JOIN、Foreign Key、Transaction，完美匹配呢個場景。' },
      { text: 'MongoDB', correct: false, explanation: 'MongoDB 係 Document Store，適合非結構化數據。雖然支持 transaction，但處理複雜關聯唔係佢嘅強項。' },
      { text: 'Cassandra', correct: false, explanation: 'Cassandra 係 AP 系統，擅長高寫入量同最終一致性場景，但唔支持複雜 JOIN 同強一致性 transaction。' },
    ],
  },
  {
    question: '根據 CAP 定理，當網絡分區（Partition）發生嘅時候，一個分散式系統可以點做？',
    options: [
      { text: '同時保證 Consistency、Availability 同 Partition Tolerance', correct: false, explanation: 'CAP 定理話明三者只能揀兩個。網絡分區係無可避免嘅，所以實際上只能喺 C 同 A 之間揀。' },
      { text: '保證 Consistency 但犧牲 Availability（CP），或者保證 Availability 但犧牲 Consistency（AP）', correct: true, explanation: '因為 Partition 係無可避免嘅，實際上只能喺 CP 同 AP 之間揀。CP 適合金融場景，AP 適合社交媒體等場景。' },
      { text: '完全避免 Partition 發生，咁就可以同時有 C 同 A', correct: false, explanation: '喺分散式系統入面，網絡分區係無可避免嘅。冇辦法完全消除 Partition，所以必須要做取捨。' },
      { text: '只需要保證 Partition Tolerance 就夠', correct: false, explanation: 'Partition Tolerance 係前提，唔係目標。真正嘅決策係喺 Consistency 同 Availability 之間揀。' },
    ],
  },
  {
    question: '你嘅團隊要開始一個新 Project，唔確定用咩 Database。以下邊個建議最合理？',
    options: [
      { text: '用最新最潮嘅 NoSQL Database，因為佢一定比 SQL 快', correct: false, explanation: 'NoSQL 唔一定比 SQL 快，關鍵在於 workload 類型。盲目追新技術係常見嘅錯誤。' },
      { text: '每種數據用唔同嘅 Database，咁就可以發揮每個 DB 嘅優勢', correct: false, explanation: '每多一種 Database 就多一套運維負擔。除非有好明確嘅技術理由，否則應該控制喺 2-3 種以內。' },
      { text: '由 PostgreSQL 開始，因為佢幾乎可以覆蓋大部分場景，之後有需要再加其他 DB', correct: true, explanation: 'PostgreSQL 支持 JSON、全文搜索、GIS，生態成熟。唔確定嘅時候，佢幾乎永遠係最安全嘅選擇。之後有明確需求先加 Redis 做快取或者其他專門 DB。' },
      { text: '用 MongoDB 因為佢唔使 define schema，開發最快', correct: false, explanation: 'Schema-less 喺初期確實快，但隨著系統成熟，缺少 schema 會帶嚟維護困難。揀 Database 要考慮長遠，唔好只睇開發速度。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'key-value-store', label: 'Key-Value Store 鍵值存儲' },
  { slug: 'redis', label: 'Redis' },
  { slug: 'fix-slow-database', label: 'Debug 慢嘅 Database' },
];

function FrameworkTab() {
  return (
    <div className="card">
      <h2>Database 選擇決策樹</h2>
      <div className="subtitle">根據數據類型同存取模式揀啱 Database</div>
      <p>
        揀 Database 唔係「邊個最新就用邊個」。關鍵在於理解應用嘅數據特性：結構化定非結構化？讀多定寫多？需要強一致性定最終一致性就夠？
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradRoot" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSQL" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDecision" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradKV" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d0a2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDoc" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2e0a3d" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#10B981" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" /></marker>
            <marker id="arrPink" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#ec4899" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(290,30)">
            <rect width="200" height="70" rx="14" fill="url(#gradRoot)" stroke="#3B82F6" strokeWidth="2.5" filter="url(#glowBlue)" />
            <text x="100" y="38" textAnchor="middle" fill="#3B82F6" fontSize="16" fontWeight="700">Data Type?</text>
            <text x="100" y="58" textAnchor="middle" fill="#9ca3af" fontSize="11">數據類型</text>
          </g>

          <g transform="translate(60,170)">
            <rect width="180" height="65" rx="14" fill="url(#gradSQL)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="90" y="28" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">SQL Database</text>
            <text x="90" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">PostgreSQL / MySQL</text>
          </g>

          <g transform="translate(500,170)">
            <rect width="200" height="65" rx="14" fill="url(#gradDecision)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="100" y="28" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="700">Access Pattern?</text>
            <text x="100" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">存取模式</text>
          </g>

          <g transform="translate(420,310)">
            <rect width="180" height="65" rx="14" fill="url(#gradKV)" stroke="#ec4899" strokeWidth="2" filter="url(#shadow)" />
            <text x="90" y="28" textAnchor="middle" fill="#ec4899" fontSize="13" fontWeight="700">Key-Value Store</text>
            <text x="90" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">Redis / DynamoDB</text>
          </g>

          <g transform="translate(640,310)">
            <rect width="130" height="65" rx="14" fill="url(#gradDoc)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">Document</text>
            <text x="65" y="50" textAnchor="middle" fill="#9ca3af" fontSize="11">MongoDB</text>
          </g>

          <path d="M340,100 C300,130 220,140 195,168" fill="none" stroke="#10B981" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="235" y="125" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">結構化</text>

          <path d="M440,100 C480,130 540,140 560,168" fill="none" stroke="#F59E0B" strokeWidth="2" markerEnd="url(#arrAmber)" />
          <text x="530" y="125" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">非結構化</text>

          <path d="M560,235 C540,265 530,280 525,308" fill="none" stroke="#ec4899" strokeWidth="2" markerEnd="url(#arrPink)" />
          <text x="510" y="275" textAnchor="middle" fill="#f472b6" fontSize="11" fontWeight="600">Key-Value</text>

          <path d="M640,235 C660,265 680,280 695,308" fill="none" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrPurple)" />
          <text x="700" y="275" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">Document</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span>首先確定數據係結構化（有明確 schema）定非結構化。結構化數據優先考慮 SQL。</span></li>
        <li><span className="step-num">2</span><span>如果係非結構化，再睇存取模式：簡單 key-value lookup 用 Redis/DynamoDB，複雜查詢用 MongoDB。</span></li>
        <li><span className="step-num">3</span><span>最終決定仲要考慮團隊熟悉度——一個團隊完全唔識嘅 Database，再好都唔應該用。</span></li>
      </ol>
    </div>
  );
}

function CAPTab() {
  return (
    <div className="card">
      <h2>CAP 定理</h2>
      <div className="subtitle">分散式系統只能三揀二：Consistency、Availability、Partition Tolerance</div>
      <p>
        喺分散式系統入面，網絡分區（Partition）係無可避免嘅。所以實際上只係喺 Consistency 同 Availability 之間揀。CP 系統保證數據一致但可能短暫不可用，AP 系統保證可用但數據可能暫時唔同步。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadowCap" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowC" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradC" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradA" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradP" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradCA" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2a3a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradCP" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a2040" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAP" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3020" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
          </defs>

          <path d="M300,55 C200,55 120,180 110,340" fill="none" stroke="#2a2d3a" strokeWidth="2" />
          <path d="M300,55 C400,55 480,180 490,340" fill="none" stroke="#2a2d3a" strokeWidth="2" />
          <path d="M110,340 C200,360 400,360 490,340" fill="none" stroke="#2a2d3a" strokeWidth="2" />

          <g transform="translate(240,20)">
            <rect width="120" height="55" rx="14" fill="url(#gradC)" stroke="#3B82F6" strokeWidth="2.5" filter="url(#glowC)" />
            <text x="60" y="24" textAnchor="middle" fill="#3B82F6" fontSize="15" fontWeight="700">C</text>
            <text x="60" y="44" textAnchor="middle" fill="#93c5fd" fontSize="11">Consistency</text>
          </g>

          <g transform="translate(40,325)">
            <rect width="140" height="55" rx="14" fill="url(#gradA)" stroke="#10B981" strokeWidth="2" filter="url(#shadowCap)" />
            <text x="70" y="24" textAnchor="middle" fill="#10B981" fontSize="15" fontWeight="700">A</text>
            <text x="70" y="44" textAnchor="middle" fill="#6ee7b7" fontSize="11">Availability</text>
          </g>

          <g transform="translate(420,325)">
            <rect width="140" height="55" rx="14" fill="url(#gradP)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadowCap)" />
            <text x="70" y="24" textAnchor="middle" fill="#F59E0B" fontSize="15" fontWeight="700">P</text>
            <text x="70" y="44" textAnchor="middle" fill="#fcd34d" fontSize="11">Partition Tolerance</text>
          </g>

          <g transform="translate(80,175)">
            <rect width="160" height="50" rx="14" fill="url(#gradCA)" stroke="#64748b" strokeWidth="1.5" filter="url(#shadowCap)" />
            <text x="80" y="20" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">CA</text>
            <text x="80" y="38" textAnchor="middle" fill="#9ca3af" fontSize="10">PostgreSQL (單節點)</text>
          </g>

          <g transform="translate(360,175)">
            <rect width="180" height="50" rx="14" fill="url(#gradCP)" stroke="#64748b" strokeWidth="1.5" filter="url(#shadowCap)" />
            <text x="90" y="20" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">CP</text>
            <text x="90" y="38" textAnchor="middle" fill="#9ca3af" fontSize="10">MongoDB / HBase / Redis Cluster</text>
          </g>

          <g transform="translate(185,390)">
            <rect width="230" height="28" rx="14" fill="url(#gradAP)" stroke="#64748b" strokeWidth="1.5" filter="url(#shadowCap)" />
            <text x="115" y="12" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">AP</text>
          </g>
          <text x="300" y="415" textAnchor="middle" fill="#9ca3af" fontSize="10">Cassandra / DynamoDB / CouchDB</text>
        </svg>
      </div>

      <div className="key-points">
        <div className="key-point">
          <h4>CP 系統</h4>
          <p>保證每次讀取都係最新數據。適合銀行、支付等需要強一致性嘅場景。代價係網絡分區時部分請求可能失敗。</p>
        </div>
        <div className="key-point">
          <h4>AP 系統</h4>
          <p>保證系統永遠可用，但數據可能暫時唔一致（最終一致性）。適合社交媒體、電商商品列表等場景。</p>
        </div>
        <div className="key-point">
          <h4>CA 系統</h4>
          <p>理論上同時保證一致性同可用性，但前提係冇網絡分區。實際上只存在喺單節點系統（例如單機 PostgreSQL）。</p>
        </div>
        <div className="key-point">
          <h4>現實選擇</h4>
          <p>大部分互聯網應用選 AP + 最終一致性。只有涉及金錢嘅場景先需要 CP。要留意，CAP 係理論框架，實際系統嘅取捨比呢個複雜好多。</p>
        </div>
      </div>
    </div>
  );
}

function AdviceTab() {
  return (
    <div className="card">
      <h2>Database 選擇實戰建議</h2>
      <div className="subtitle">理論之外，仲有好多現實因素要考慮</div>

      <div className="key-points">
        <div className="key-point">
          <h4>PostgreSQL 萬能首選</h4>
          <p>如果唔確定用咩，PostgreSQL 幾乎永遠係最安全嘅選擇。支持 JSON、全文搜索、GIS，生態成熟，社區龐大。</p>
        </div>
        <div className="key-point">
          <h4>Redis 做快取層</h4>
          <p>Redis 唔係用嚟取代主 Database 嘅。最佳用法係做快取層（Cache Layer），減少主 DB 壓力。Session、排行榜、計數器都適合。</p>
        </div>
        <div className="key-point">
          <h4>MongoDB 適合原型</h4>
          <p>Schema-less 特性令 MongoDB 好適合快速開發同原型驗證。但隨著系統成熟，schema validation 同 index 管理會變得越嚟越重要。</p>
        </div>
        <div className="key-point">
          <h4>唔好用太多種 DB</h4>
          <p>每多一種 Database 就多一套運維負擔。除非有好明確嘅技術理由，否則盡量控制喺 2-3 種以內。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>典型組合建議</h4>
        <p>最常見嘅組合係 PostgreSQL（主存儲）+ Redis（快取）+ S3（檔案存儲）。呢個組合可以覆蓋 90% 以上嘅應用場景，而且運維成本可控。</p>
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
        <h4>Prompt 1 — 幫 Project 揀啱 Database</h4>
        <div className="prompt-text">
          幫手分析同推薦最適合嘅 Database 方案。{'\n\n'}
          Project 背景：{'\n'}
          - 應用類型：<span className="placeholder">[電商平台 / 社交媒體 / SaaS 工具 / IoT 數據平台]</span>{'\n'}
          - 預計用戶量：<span className="placeholder">[1 萬 / 10 萬 / 100 萬]</span> 月活躍用戶{'\n'}
          - 數據特性：<span className="placeholder">[結構化交易數據 / 非結構化用戶內容 / 時序數據 / 混合]</span>{'\n'}
          - 讀寫比例：<span className="placeholder">[讀多寫少 / 讀寫均衡 / 寫多讀少]</span>{'\n'}
          - 一致性需求：<span className="placeholder">[強一致性（涉及金錢）/ 最終一致性]</span>{'\n'}
          - 團隊經驗：<span className="placeholder">[熟悉嘅 Database 列表]</span>{'\n\n'}
          需要分析：{'\n'}
          1. 根據以上條件推薦主 Database + 輔助 Database 組合{'\n'}
          2. 每個推薦嘅理由（對應 CAP 定理嘅取捨）{'\n'}
          3. Schema 設計建議（核心 table / collection 結構）{'\n'}
          4. Index 策略建議{'\n'}
          5. 未來 scaling 路線（Sharding / Read Replica / 遷移方案）{'\n\n'}
          請提供詳細嘅技術分析同最終推薦方案。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Multi-Database 架構</h4>
        <div className="prompt-text">
          幫手設計一個 Multi-Database 架構方案，適用於 <span className="placeholder">[應用類型描述]</span>。{'\n\n'}
          系統需要處理以下唔同類型嘅數據：{'\n'}
          1. 用戶帳戶同交易紀錄（需要 ACID 同強一致性）{'\n'}
          2. 用戶 session 同快取數據（需要低延遲 key-value 存取）{'\n'}
          3. <span className="placeholder">[搜尋索引 / 日誌數據 / 文件儲存 / 即時分析]</span>{'\n\n'}
          需要設計：{'\n'}
          1. 每種數據用邊個 Database，附詳細理由{'\n'}
          2. Database 之間嘅數據同步策略（CDC / Event Sourcing / Dual Write）{'\n'}
          3. 統一嘅 Data Access Layer 設計（Repository Pattern）{'\n'}
          4. 連線池管理同 connection 配置建議{'\n'}
          5. 備份同災難恢復方案{'\n'}
          6. 監控指標（query latency、connection count、replication lag）{'\n\n'}
          技術棧偏好：<span className="placeholder">[語言 + 框架]</span>{'\n'}
          部署環境：<span className="placeholder">[AWS / GCP / Azure / 自建]</span>{'\n\n'}
          請提供完整嘅架構設計同實施步驟。
        </div>
      </div>
    </div>
  );
}

export default function PickDatabase() {
  return (
    <>
      <TopicTabs
        title="點揀 Database"
        subtitle="唔同場景用唔同 Database，揀錯代價好大"
        tabs={[
          { id: 'framework', label: '① 選擇框架', content: <FrameworkTab /> },
          { id: 'cap', label: '② CAP 定理', content: <CAPTab /> },
          { id: 'advice', label: '③ 實戰建議', premium: true, content: <AdviceTab /> },
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
