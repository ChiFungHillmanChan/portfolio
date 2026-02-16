import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '咩情況下應該揀 NoSQL 而唔係 SQL？',
    options: [
      { text: '需要強一致性同複雜 JOIN 查詢', correct: false, explanation: '需要強一致性同複雜 JOIN 嘅場景係 SQL 嘅強項，例如銀行系統、交易平台。' },
      { text: '數據結構經常變化、需要高擴展性、讀寫量極大', correct: true, explanation: 'NoSQL 嘅 schema-less 設計適合快速迭代，水平擴展容易，適合社交媒體 feed、IoT 數據等場景。' },
      { text: '數據量少但關係複雜', correct: false, explanation: '數據量少但關係複雜嘅場景，SQL 嘅 JOIN 同 foreign key 更加適合。' },
      { text: '所有情況都應該用 NoSQL', correct: false, explanation: '冇一個方案係萬能嘅。選擇 SQL 定 NoSQL 要根據具體嘅業務需求、數據模型同一致性要求。' },
    ],
  },
  {
    question: '加 Index 可以加速 query，但有咩 trade-off？',
    options: [
      { text: 'Index 完全冇壞處，應該每個 column 都加', correct: false, explanation: '過多嘅 index 會嚴重影響寫入性能，因為每次 INSERT/UPDATE/DELETE 都要更新所有相關 index。' },
      { text: '加快讀取速度，但會減慢寫入速度同增加存儲空間', correct: true, explanation: 'Index 本質上係用額外嘅存儲空間同寫入開銷嚟換取更快嘅讀取速度。B-tree index 每次寫入都要維護樹結構。' },
      { text: 'Index 只對 SELECT 有效，對 WHERE 無效', correct: false, explanation: 'Index 主要就係加速 WHERE 條件嘅查詢，令 database 唔使做 full table scan。' },
      { text: 'Index 會令 database 唔穩定', correct: false, explanation: '正確使用 index 唔會影響穩定性，只係需要合理設計，避免過多或無效嘅 index。' },
    ],
  },
  {
    question: 'ACID 入面嘅 Isolation 係咩意思？',
    options: [
      { text: '數據寫入後唔會遺失', correct: false, explanation: '呢個係 Durability（持久性）嘅定義，唔係 Isolation。' },
      { text: '多個 transaction 同時執行時，互相唔會影響對方嘅結果', correct: true, explanation: 'Isolation 確保並發嘅 transaction 之間互相隔離。例如兩個人同時轉帳，唔會因為並發而導致金額計算錯誤。不同嘅 isolation level（Read Uncommitted → Serializable）提供唔同程度嘅保護。' },
      { text: '所有操作要麼全部成功，要麼全部失敗', correct: false, explanation: '呢個係 Atomicity（原子性）嘅定義。' },
      { text: '數據永遠保持有效狀態', correct: false, explanation: '呢個係 Consistency（一致性）嘅定義。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'pick-database', label: '點揀 Database' },
  { slug: 'fix-slow-database', label: 'Debug 慢嘅 Database' },
  { slug: 'scale-reads', label: '擴展讀取能力' },
  { slug: 'key-value-store', label: 'Key-Value Store 鍵值存儲' },
];

function Tab1() {
  return (
    <div className="card">
      <h2>Database 係一個非常廣闊嘅概念</h2>
      <div className="subtitle">電子化儲存嘅數據</div>
      <p>首先要搞清楚，Database 呢個詞其實係一個非常廣闊嘅概念。簡單嚟講，只要係電子化儲存嘅數據，都可以叫做 Database。</p>
      <p>好多人一聽到 Database 就會諗起好複雜嘅系統，但其實日常用緊嘅好多嘢都係 Database。以下係幾個常見例子：</p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#34d399', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="grad4" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#a5b4fc', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feFlood floodColor="#6366f1" floodOpacity="0.5" />
              <feComposite in2="coloredBlur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="shadow">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
            </filter>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#6366f1" />
            </marker>
          </defs>

          <rect x="300" y="20" width="200" height="70" rx="14" fill="url(#grad1)" filter="url(#shadow)" />
          <text x="400" y="50" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="600">Database</text>
          <text x="400" y="72" textAnchor="middle" fill="#e0e0e0" fontSize="13">電子化儲存數據</text>

          <path d="M 400 90 Q 400 130 250 160" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
          <path d="M 400 90 Q 400 130 400 180" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
          <path d="M 400 90 Q 400 130 550 160" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />

          <rect x="50" y="180" width="180" height="80" rx="14" fill="url(#grad2)" filter="url(#shadow)" />
          <text x="140" y="210" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="600">Postgres</text>
          <text x="140" y="230" textAnchor="middle" fill="#e0e0e0" fontSize="12">關係型數據庫</text>
          <text x="140" y="248" textAnchor="middle" fill="#e0e0e0" fontSize="12">結構化儲存</text>

          <rect x="310" y="180" width="180" height="80" rx="14" fill="url(#grad3)" filter="url(#shadow)" />
          <text x="400" y="210" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="600">DynamoDB</text>
          <text x="400" y="230" textAnchor="middle" fill="#e0e0e0" fontSize="12">NoSQL 數據庫</text>
          <text x="400" y="248" textAnchor="middle" fill="#e0e0e0" fontSize="12">靈活性高</text>

          <rect x="570" y="180" width="180" height="80" rx="14" fill="url(#grad4)" filter="url(#shadow)" />
          <text x="660" y="210" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="600">Google Sheets</text>
          <text x="660" y="230" textAnchor="middle" fill="#e0e0e0" fontSize="12">試算表</text>
          <text x="660" y="248" textAnchor="middle" fill="#e0e0e0" fontSize="12">都係 Database！</text>

          <rect x="250" y="300" width="300" height="70" rx="14" fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow)" />
          <text x="400" y="328" textAnchor="middle" fill="#a5b4fc" fontSize="14" fontWeight="500">甚至係一本筆記簿</text>
          <text x="400" y="350" textAnchor="middle" fill="#c0c4cc" fontSize="12">只要係有組織咁儲存數據就係</text>
        </svg>
      </div>

      <div className="key-points">
        <div className="key-point">
          <h4>Postgres</h4>
          <p>傳統關係型數據庫，用表格形式儲存數據，有嚴格嘅結構要求</p>
        </div>
        <div className="key-point">
          <h4>DynamoDB</h4>
          <p>Amazon 嘅 NoSQL 數據庫，無固定結構，擴展性好強</p>
        </div>
        <div className="key-point">
          <h4>Google Sheets</h4>
          <p>冇睇錯，試算表都係一種 Database，只係比較簡單</p>
        </div>
        <div className="key-point">
          <h4>甚至筆記簿</h4>
          <p>從廣義角度睇，有組織咁記錄數據嘅工具都係 Database</p>
        </div>
      </div>

      <div className="use-case">
        <h4>重點</h4>
        <p>Database 唔一定要好複雜、好高科技。只要係電子化儲存數據，無論係 Excel、Google Sheets 定係專業嘅 Postgres、MongoDB，本質上都係 Database。重點係佢哋點樣組織同管理數據。</p>
      </div>
    </div>
  );
}

function Tab2() {
  return (
    <div className="card">
      <h2>唔係所有 Database 都保證 ACID</h2>
      <div className="subtitle">SQL vs NoSQL 嘅核心分別</div>
      <p>好多人以為所有 Database 都會保證某啲特性，例如原子性（Atomicity）、一致性（Consistency）。但事實上，呢個係一個常見嘅誤解。</p>
      <p>ACID 合規只係其中一個類別。大部分 SQL 數據庫都係 ACID 合規，但 NoSQL 數據庫就唔一定會強制執行 ACID。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sqlGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="nosqlGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="acidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#34d399', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <filter id="glow2">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feFlood floodColor="#34d399" floodOpacity="0.5" />
              <feComposite in2="coloredBlur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="50" y="30" width="300" height="420" rx="14" fill="url(#sqlGrad)" filter="url(#shadow)" />
          <text x="200" y="65" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="700">SQL Database</text>
          <text x="200" y="88" textAnchor="middle" fill="#a5b4fc" fontSize="13">大部分支援 ACID</text>

          <rect x="80" y="110" width="240" height="60" rx="10" fill="rgba(52, 211, 153, 0.2)" stroke="#34d399" strokeWidth="2" filter="url(#glow2)" />
          <text x="200" y="135" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="600">ACID 保證</text>
          <text x="200" y="155" textAnchor="middle" fill="#e0e0e0" fontSize="12">強制執行資料一致性</text>

          <rect x="80" y="190" width="240" height="50" rx="10" fill="rgba(255, 255, 255, 0.05)" />
          <text x="200" y="210" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">Atomicity 原子性</text>
          <text x="200" y="228" textAnchor="middle" fill="#c0c4cc" fontSize="11">全做或全唔做</text>

          <rect x="80" y="255" width="240" height="50" rx="10" fill="rgba(255, 255, 255, 0.05)" />
          <text x="200" y="275" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">Consistency 一致性</text>
          <text x="200" y="293" textAnchor="middle" fill="#c0c4cc" fontSize="11">保持數據有效性</text>

          <rect x="80" y="320" width="240" height="50" rx="10" fill="rgba(255, 255, 255, 0.05)" />
          <text x="200" y="340" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">Isolation 隔離性</text>
          <text x="200" y="358" textAnchor="middle" fill="#c0c4cc" fontSize="11">交易之間唔會互相影響</text>

          <rect x="80" y="385" width="240" height="50" rx="10" fill="rgba(255, 255, 255, 0.05)" />
          <text x="200" y="405" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">Durability 持久性</text>
          <text x="200" y="423" textAnchor="middle" fill="#c0c4cc" fontSize="11">寫入後唔會遺失</text>

          <rect x="450" y="30" width="300" height="420" rx="14" fill="url(#nosqlGrad)" filter="url(#shadow)" />
          <text x="600" y="65" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="700">NoSQL Database</text>
          <text x="600" y="88" textAnchor="middle" fill="#f59e0b" fontSize="13">唔強制 ACID 合規</text>

          <rect x="480" y="110" width="240" height="60" rx="10" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="2" />
          <text x="600" y="135" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="600">靈活性優先</text>
          <text x="600" y="155" textAnchor="middle" fill="#e0e0e0" fontSize="12">換取速度同擴展性</text>

          <rect x="480" y="190" width="240" height="50" rx="10" fill="rgba(255, 255, 255, 0.05)" />
          <text x="600" y="210" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">最終一致性</text>
          <text x="600" y="228" textAnchor="middle" fill="#c0c4cc" fontSize="11">唔保證即時一致</text>

          <rect x="480" y="255" width="240" height="50" rx="10" fill="rgba(255, 255, 255, 0.05)" />
          <text x="600" y="275" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">高擴展性</text>
          <text x="600" y="293" textAnchor="middle" fill="#c0c4cc" fontSize="11">容易水平擴展</text>

          <rect x="480" y="320" width="240" height="50" rx="10" fill="rgba(255, 255, 255, 0.05)" />
          <text x="600" y="340" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">靈活 Schema</text>
          <text x="600" y="358" textAnchor="middle" fill="#c0c4cc" fontSize="11">無固定結構</text>

          <rect x="480" y="385" width="240" height="50" rx="10" fill="rgba(255, 255, 255, 0.05)" />
          <text x="600" y="405" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">高效能讀寫</text>
          <text x="600" y="423" textAnchor="middle" fill="#c0c4cc" fontSize="11">犧牲部分一致性</text>
        </svg>
      </div>

      <ul className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong>SQL 數據庫（例如 Postgres、MySQL）</strong>：大部分都係 ACID 合規，保證數據嘅完整性同一致性。適合需要強一致性嘅場景，例如銀行系統、交易平台。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong>NoSQL 數據庫（例如 DynamoDB、MongoDB）</strong>：唔強制執行 ACID，換取更高嘅擴展性同效能。適合需要處理大量數據、高並發嘅場景。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong>最終一致性</strong>：NoSQL 好多時只保證最終一致性，即係話數據可能會有短暫嘅唔一致，但最終會達到一致狀態。</span>
        </li>
      </ul>

      <div className="use-case">
        <h4>建議</h4>
        <p>唔好假設所有 Database 都有相同嘅保證。SQL 同 NoSQL 係兩個唔同嘅世界，各有優勢。需要根據實際需求去選擇：需要強一致性就用 SQL，需要高擴展性就考慮 NoSQL。</p>
      </div>
    </div>
  );
}

function Tab3() {
  return (
    <div className="card">
      <h2>Database 同 DBMS 嘅分別</h2>
      <div className="subtitle">數據 vs 管理軟件</div>
      <p>呢度要搞清楚一個技術上嘅分別。嚴格嚟講，Database 只係指數據本身，而 DBMS（Database Management System）先係管理呢啲數據嘅軟件。</p>
      <p>不過喺日常交流入面，大部分人都會直接叫 DBMS 做 Database。例如講 Postgres，其實係指緊 DBMS，但大家都會簡單咁叫佢做 Database。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dbGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="dbmsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#34d399', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#34d399" />
            </marker>
          </defs>

          <rect x="50" y="50" width="280" height="150" rx="14" fill="url(#dbGrad)" filter="url(#shadow)" />
          <text x="190" y="85" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="700">Database</text>
          <text x="190" y="107" textAnchor="middle" fill="#a5b4fc" fontSize="13">數據本身</text>
          <line x1="70" y1="125" x2="310" y2="125" stroke="#2a2d3a" strokeWidth="1" />
          <text x="190" y="145" textAnchor="middle" fill="#e0e0e0" fontSize="13">用戶資料</text>
          <text x="190" y="165" textAnchor="middle" fill="#e0e0e0" fontSize="13">訂單記錄</text>
          <text x="190" y="185" textAnchor="middle" fill="#e0e0e0" fontSize="13">產品庫存</text>

          <rect x="470" y="50" width="280" height="350" rx="14" fill="url(#dbmsGrad)" filter="url(#shadow)" />
          <text x="610" y="85" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="700">DBMS</text>
          <text x="610" y="107" textAnchor="middle" fill="#34d399" fontSize="13">管理系統軟件</text>

          <rect x="495" y="130" width="230" height="50" rx="10" fill="rgba(255, 255, 255, 0.1)" />
          <text x="610" y="152" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">查詢 (Query)</text>
          <text x="610" y="170" textAnchor="middle" fill="#c0c4cc" fontSize="11">SELECT * FROM users</text>

          <rect x="495" y="195" width="230" height="50" rx="10" fill="rgba(255, 255, 255, 0.1)" />
          <text x="610" y="217" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">插入 (Insert)</text>
          <text x="610" y="235" textAnchor="middle" fill="#c0c4cc" fontSize="11">INSERT INTO orders</text>

          <rect x="495" y="260" width="230" height="50" rx="10" fill="rgba(255, 255, 255, 0.1)" />
          <text x="610" y="282" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">刪除 (Delete)</text>
          <text x="610" y="300" textAnchor="middle" fill="#c0c4cc" fontSize="11">DELETE FROM products</text>

          <rect x="495" y="325" width="230" height="50" rx="10" fill="rgba(255, 255, 255, 0.1)" />
          <text x="610" y="347" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">安全控制</text>
          <text x="610" y="365" textAnchor="middle" fill="#c0c4cc" fontSize="11">權限管理、備份</text>

          <path d="M 330 125 Q 400 125 470 155" stroke="#34d399" strokeWidth="3" fill="none" markerEnd="url(#arrowGreen)" />
          <text x="400" y="115" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="600">管理</text>

          <rect x="150" y="270" width="400" height="100" rx="14" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow)" />
          <text x="350" y="300" textAnchor="middle" fill="#a5b4fc" fontSize="15" fontWeight="600">日常用語</text>
          <text x="350" y="325" textAnchor="middle" fill="#e0e0e0" fontSize="13">講「Postgres」、「MySQL」</text>
          <text x="350" y="347" textAnchor="middle" fill="#e0e0e0" fontSize="13">其實係指 DBMS，但大家都叫佢 Database</text>
        </svg>
      </div>

      <ul className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong>Database 係數據本身</strong>：所有儲存落去嘅資料，例如用戶資料、訂單記錄、產品庫存等等，呢啲先係真正嘅 Database。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong>DBMS 係管理軟件</strong>：負責處理查詢（Query）、插入（Insert）、刪除（Delete）等操作，仲要確保數據嘅安全性同完整性。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong>DBMS 提供介面</strong>：俾開發者同應用程式可以透過 SQL 或者其他查詢語言嚟存取同操作數據。</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span><strong>常見 DBMS 例子</strong>：Postgres、MySQL、MongoDB、DynamoDB 呢啲都係 DBMS，但日常都簡稱佢哋做 Database。</span>
        </li>
      </ul>

      <div className="key-points">
        <div className="key-point">
          <h4>查詢功能</h4>
          <p>DBMS 提供 SQL 或其他語言嚟搵出所需嘅數據</p>
        </div>
        <div className="key-point">
          <h4>數據操作</h4>
          <p>處理插入、更新、刪除等操作，確保數據正確咁儲存</p>
        </div>
        <div className="key-point">
          <h4>安全控制</h4>
          <p>管理用戶權限、數據備份、災難恢復等安全措施</p>
        </div>
        <div className="key-point">
          <h4>效能優化</h4>
          <p>索引管理、查詢優化，確保系統高效運行</p>
        </div>
      </div>

      <div className="use-case">
        <h4>結論</h4>
        <p>雖然技術上 Database 同 DBMS 係兩樣嘢，但喺實際工作入面，唔使太執著呢個分別。當講 Postgres 或者 MySQL 嘅時候，大家都明係講緊成個系統。重點係要明白 DBMS 嘅角色：佢唔只係儲存數據，更加係提供一整套工具嚟管理、查詢同保護數據。</p>
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
        <h4>Prompt 1 — 設計 Database Schema</h4>
        <div className="prompt-text">
          {'幫我設計一個 [項目名稱，例如：電商平台 / 社交媒體 App / 訂餐系統] 嘅 database schema。\n\n要求：\n- 用 PostgreSQL 語法\n- 列出所有需要嘅 table，包括 primary key、foreign key、index\n- 每個 table 加上簡短註釋解釋用途\n- 考慮常見嘅 query pattern，建議適當嘅 index\n- 如果有多對多關係，建立 junction table\n- 加入 created_at 同 updated_at timestamp\n- 寫出完整嘅 CREATE TABLE SQL statements'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — SQL vs NoSQL 選型分析</h4>
        <div className="prompt-text">
          {'分析以下場景應該用 SQL 定 NoSQL database：\n\n場景描述：[描述具體業務場景，例如：即時聊天系統，每日百萬條訊息 / 金融交易平台，需要 ACID 保證]\n\n請從以下角度分析：\n- 數據結構：係結構化定非結構化？會唔會經常改 schema？\n- 一致性需求：需要強一致性（ACID）定最終一致性就夠？\n- 讀寫比例：讀多寫少定寫多讀少？\n- 擴展需求：預計數據量同併發量幾大？\n- 最終建議用邊個具體嘅 database（例如 PostgreSQL / MongoDB / DynamoDB），附上理由'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — Database Migration 計劃</h4>
        <div className="prompt-text">
          {'幫我寫一個 database migration 計劃，將現有嘅 schema 加入以下新功能：\n\n現有系統：[簡單描述現有嘅 table 結構]\n新功能需求：[例如：加入用戶訂閱功能 / 多語言支援 / 軟刪除機制]\n\n要求：\n- 寫出 migration SQL（包括 UP 同 DOWN）\n- 確保 migration 係 backward compatible\n- 考慮現有數據嘅處理（data backfill）\n- 列出可能嘅 downtime 風險同解決方案\n- 建議 migration 嘅執行順序'}
        </div>
      </div>
    </div>
  );
}

export default function DatabaseBasics() {
  return (
    <>
      <TopicTabs
        title="Database 基礎"
        subtitle="以下介紹 Database 嘅基本概念、分類同埋管理系統"
        tabs={[
          { id: 'tab1', label: 'Database 係咩', content: <Tab1 /> },
          { id: 'tab2', label: 'ACID 同 NoSQL', content: <Tab2 /> },
          { id: 'tab3', label: 'DBMS 管理系統', premium: true, content: <Tab3 /> },
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
