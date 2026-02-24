import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '正規化（Normalization）嘅主要目的係咩？',
    options: [
      { text: '令 query 更加快', correct: false, explanation: '正規化唔一定令 query 更快。正規化後需要更多 JOIN 操作，某啲複雜 query 反而會慢咗。正規化嘅目的係減少數據冗餘同保持一致性。' },
      { text: '減少數據冗餘同更新異常，確保數據一致性', correct: true, explanation: '正規化將數據拆分到唔同嘅 table，消除重複數據。好處係更新一個值只需要改一個地方（避免 update anomaly），唔會出現「改咗一處但忘記改另一處」嘅問題。' },
      { text: '減少 table 數量', correct: false, explanation: '正規化通常會增加 table 數量。將一個大 table 拆成多個小 table 正正就係正規化嘅做法。' },
      { text: '令 database 佔用更少空間', correct: false, explanation: '雖然正規化減少冗餘數據，可以節省空間，但呢個只係副作用。主要目的係數據一致性同避免更新異常。而且 index 同 foreign key 都會佔額外空間。' },
    ],
  },
  {
    question: '咩情況下應該考慮反正規化（Denormalization）？',
    options: [
      { text: '任何時候都應該反正規化，因為更快', correct: false, explanation: '反正規化有代價：數據冗餘增加、更新更複雜、一致性更難保證。只有喺特定場景先應該考慮。' },
      { text: '讀取量遠大於寫入量，而且 JOIN 操作成為性能瓶頸', correct: true, explanation: '當系統讀多寫少（例如 10:1 或更高），而且 JOIN 操作嘅 latency 已經影響用戶體驗嘅時候，先值得考慮反正規化。用冗餘數據換取讀取速度。典型例子：新聞 Feed、商品列表頁。' },
      { text: '數據量少嘅時候', correct: false, explanation: '數據量少嘅時候，JOIN 幾乎冇性能問題，正規化就夠。反正規化係為咗解決大規模數據嘅讀取性能問題。' },
      { text: '只要用 NoSQL 就一定要反正規化', correct: false, explanation: 'NoSQL 確實傾向冗餘存儲（因為好多 NoSQL 唔支援 JOIN），但唔係「一定要」。要根據具體嘅 access pattern 同數據模型嚟決定。' },
    ],
  },
  {
    question: '第三範式（3NF）要求咩？',
    options: [
      { text: '每個 column 嘅值都係原子嘅（唔可以再拆分）', correct: false, explanation: '呢個係第一範式（1NF）嘅要求。3NF 建基於 1NF 同 2NF 之上，有額外嘅要求。' },
      { text: '所有非主鍵 column 完全依賴於整個主鍵', correct: false, explanation: '呢個係第二範式（2NF）嘅要求。2NF 消除 partial dependency（部分依賴）。' },
      { text: '消除 transitive dependency，非主鍵 column 唔可以依賴其他非主鍵 column', correct: true, explanation: '3NF 要求：非主鍵 column 只可以依賴主鍵，唔可以依賴其他非主鍵 column。例如 order table 有 customer_id 同 customer_name，customer_name 依賴 customer_id 而唔係直接依賴 order_id，呢個就係 transitive dependency，應該拆出去 customer table。' },
      { text: '每個 table 最多只可以有 3 個 column', correct: false, explanation: '3NF 嘅「3」唔係指 column 數量。係指第三層嘅 normalization 規則。Column 數量冇限制。' },
    ],
  },
  {
    question: 'Entity-Relationship (ER) Diagram 入面，多對多關係通常點樣實現？',
    options: [
      { text: '直接用 foreign key 互相指向對方', correct: false, explanation: '兩個 table 直接互相 reference 會造成 circular dependency，而且一個 foreign key column 只能存一個值，冇辦法表示「多」嘅關係。' },
      { text: '建立一個 junction table（關聯表），包含兩個 table 嘅 foreign key', correct: true, explanation: '例如 students 同 courses 係多對多關係。建一個 student_courses junction table，有 student_id 同 course_id 兩個 foreign key。每一行代表一個學生選咗一門課。呢個係 relational database 處理多對多關係嘅標準做法。' },
      { text: '用 JSON array column 存儲對方嘅 ID 列表', correct: false, explanation: '雖然 PostgreSQL 等支援 JSON column，但呢個做法失去咗 foreign key constraint 嘅保護，query 同 index 都更難。係反模式（anti-pattern），只有喺特殊場景先考慮。' },
      { text: '將兩個 table 合併成一個', correct: false, explanation: '合併會造成大量數據冗餘。例如一個學生選 5 門課，就要重複 5 行學生資料。呢個正正就係正規化要解決嘅問題。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'pick-database', label: '點揀 Database' },
  { slug: 'redis', label: 'Redis' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>數據建模</h2>
      <div className="subtitle">Schema Design / 正規化 / 反正規化</div>
      <p>
        數據建模就係決定數據點樣組織、儲存同埋建立關係。好嘅 data model 係系統成功嘅基礎——設計得差嘅 schema 會令後期改動痛苦到想死。
      </p>
      <p>
        核心概念要分清楚 <strong style={{ color: '#3B82F6' }}>正規化（Normalization）</strong> 同 <strong style={{ color: '#fbbf24' }}>反正規化（Denormalization）</strong>。正規化追求數據唔重複、一致性高；反正規化用冗餘換速度。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gradNorm" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradDenorm" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#fbbf24', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradTable" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#34d399', stopOpacity: 0.6 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <linearGradient id="gradBig" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#f87171', stopOpacity: 0.6 }} />
              <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 0.9 }} />
            </linearGradient>
            <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" /></filter>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>

          {/* Left side: Normalized */}
          <text x="200" y="25" textAnchor="middle" fill="#3B82F6" fontSize="16" fontWeight="700">正規化 (Normalized)</text>

          {/* Users table */}
          <rect x="30" y="45" width="160" height="100" rx="10" fill="url(#gradTable)" filter="url(#shadow)" />
          <text x="110" y="68" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">users</text>
          <line x1="40" y1="78" x2="180" y2="78" stroke="#2a3a4a" strokeWidth="1" />
          <text x="110" y="96" textAnchor="middle" fill="#e0e0e0" fontSize="10">id | name | email</text>
          <text x="110" y="114" textAnchor="middle" fill="#9ca3af" fontSize="9">PK: id</text>
          <text x="110" y="130" textAnchor="middle" fill="#6ee7b7" fontSize="9">冇冗餘</text>

          {/* Orders table */}
          <rect x="220" y="45" width="160" height="100" rx="10" fill="url(#gradTable)" filter="url(#shadow)" />
          <text x="300" y="68" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">orders</text>
          <line x1="230" y1="78" x2="370" y2="78" stroke="#2a3a4a" strokeWidth="1" />
          <text x="300" y="96" textAnchor="middle" fill="#e0e0e0" fontSize="10">id | user_id | total</text>
          <text x="300" y="114" textAnchor="middle" fill="#9ca3af" fontSize="9">FK: user_id → users.id</text>
          <text x="300" y="130" textAnchor="middle" fill="#6ee7b7" fontSize="9">需要 JOIN</text>

          {/* Products table */}
          <rect x="120" y="170" width="160" height="100" rx="10" fill="url(#gradTable)" filter="url(#shadow)" />
          <text x="200" y="193" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">products</text>
          <line x1="130" y1="203" x2="270" y2="203" stroke="#2a3a4a" strokeWidth="1" />
          <text x="200" y="221" textAnchor="middle" fill="#e0e0e0" fontSize="10">id | name | price</text>
          <text x="200" y="239" textAnchor="middle" fill="#9ca3af" fontSize="9">PK: id</text>
          <text x="200" y="255" textAnchor="middle" fill="#6ee7b7" fontSize="9">獨立 table</text>

          {/* Relationship arrows */}
          <path d="M 192 105 Q 205 105 218 105" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />

          {/* Right side: Denormalized */}
          <text x="620" y="25" textAnchor="middle" fill="#fbbf24" fontSize="16" fontWeight="700">反正規化 (Denormalized)</text>

          {/* Big single table */}
          <rect x="470" y="45" width="300" height="230" rx="10" fill="url(#gradBig)" filter="url(#shadow)" />
          <text x="620" y="72" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="700">order_details</text>
          <line x1="480" y1="82" x2="760" y2="82" stroke="#2a3a4a" strokeWidth="1" />
          <text x="620" y="105" textAnchor="middle" fill="#e0e0e0" fontSize="11">order_id | user_name | user_email</text>
          <text x="620" y="125" textAnchor="middle" fill="#e0e0e0" fontSize="11">product_name | product_price</text>
          <text x="620" y="145" textAnchor="middle" fill="#e0e0e0" fontSize="11">total | order_date</text>
          <line x1="480" y1="160" x2="760" y2="160" stroke="#2a3a4a" strokeWidth="1" />
          <text x="620" y="182" textAnchor="middle" fill="#fde68a" fontSize="11">所有數據放一個 table</text>
          <text x="620" y="202" textAnchor="middle" fill="#fde68a" fontSize="11">唔使 JOIN，讀取超快</text>
          <text x="620" y="225" textAnchor="middle" fill="#fca5a5" fontSize="11">但 user_name 改一次</text>
          <text x="620" y="245" textAnchor="middle" fill="#fca5a5" fontSize="11">要更新所有 order 行</text>
          <text x="620" y="265" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">Update Anomaly 風險</text>

          {/* Bottom comparison */}
          <rect x="30" y="310" width="350" height="80" rx="10" fill="rgba(59,130,246,0.12)" stroke="#3B82F6" strokeWidth="1.5" />
          <text x="205" y="335" textAnchor="middle" fill="#93c5fd" fontSize="12" fontWeight="600">正規化：寫入簡單、一致性好</text>
          <text x="205" y="355" textAnchor="middle" fill="#9ca3af" fontSize="11">適合 OLTP（交易系統）</text>
          <text x="205" y="375" textAnchor="middle" fill="#9ca3af" fontSize="11">需要 JOIN → 讀取可能較慢</text>

          <rect x="420" y="310" width="350" height="80" rx="10" fill="rgba(251,191,36,0.12)" stroke="#fbbf24" strokeWidth="1.5" />
          <text x="595" y="335" textAnchor="middle" fill="#fde68a" fontSize="12" fontWeight="600">反正規化：讀取快、查詢簡單</text>
          <text x="595" y="355" textAnchor="middle" fill="#9ca3af" fontSize="11">適合 OLAP（分析系統）</text>
          <text x="595" y="375" textAnchor="middle" fill="#9ca3af" fontSize="11">數據冗餘 → 更新複雜</text>
        </svg>
      </div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span><strong style={{ color: '#3B82F6' }}>正規化（Normalization）</strong>：將數據拆分到唔同 table，用 foreign key 連接。好處係更新一個值只需要改一個地方。第一範式（1NF）→ 第二範式（2NF）→ 第三範式（3NF），逐步消除冗餘。</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span><strong style={{ color: '#fbbf24' }}>反正規化（Denormalization）</strong>：將相關數據合併到一個 table，用冗餘換取查詢速度。唔使 JOIN，讀取超快。代價係更新要改多個地方，數據一致性更難保證。</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span><strong style={{ color: '#34d399' }}>1NF 要求</strong>：每個 column 嘅值必須係原子嘅（atomic），唔可以再拆分。例如 <code style={{ color: '#60a5fa' }}>address</code> column 唔應該存 "123 Main St, City, State"，應該拆成 street、city、state 三個 column。</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span><strong style={{ color: '#f87171' }}>2NF 同 3NF</strong>：2NF 消除 partial dependency（部分依賴），3NF 消除 transitive dependency（傳遞依賴）。大部分生產系統做到 3NF 就夠。BCNF 同更高嘅範式喺實務上好少用到。</span>
        </li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階數據建模</h2>
      <div className="subtitle">ER Diagrams / Indexing 策略 / Schema 演化</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Entity-Relationship (ER) Diagrams</h4>
          <p>
            ER Diagram 係數據建模嘅起點。識別 <strong style={{ color: '#3B82F6' }}>Entity</strong>（例如 User、Order、Product）、<strong style={{ color: '#34d399' }}>Attribute</strong>（例如 name、email）、同 <strong style={{ color: '#fbbf24' }}>Relationship</strong>（一對一、一對多、多對多）。多對多關係用 junction table 實現。先畫 ER Diagram，再轉換成 physical schema，呢個流程可以避免好多設計錯誤。
          </p>
        </div>
        <div className="key-point">
          <h4>Indexing 策略</h4>
          <p>
            Index 係數據建模嘅延伸。原則：<strong style={{ color: '#3B82F6' }}>WHERE 條件常用嘅 column 加 index</strong>、<strong style={{ color: '#34d399' }}>composite index 嘅 column 順序要配合 query pattern</strong>、<strong style={{ color: '#f87171' }}>唔好加太多 index</strong>（每個 index 都會拖慢 write）。常見類型：B-tree（預設，適合 range query）、Hash（適合 equality lookup）、GIN（適合 full-text search 同 JSON）。
          </p>
        </div>
        <div className="key-point">
          <h4>Schema 演化（Migration）</h4>
          <p>
            Schema 唔係一次設計好就唔變。隨住業務增長，需要 alter table、加 column、改關係。重點係 <strong style={{ color: '#fbbf24' }}>backward compatibility</strong>：新舊版本嘅 code 都要能用。策略：1) 加 column 先加 nullable，等舊 code 部署完再改。2) 用 migration tool（Flyway、Alembic）管理版本。3) 大 table alter 用 online DDL 或者 shadow table 方式。
          </p>
        </div>
        <div className="key-point">
          <h4>NoSQL Schema Patterns</h4>
          <p>
            NoSQL 「冇 schema」係誤解，其實係 schema-on-read。常見 pattern：<strong style={{ color: '#3B82F6' }}>Embedding</strong>（將相關數據 embed 喺同一個 document）、<strong style={{ color: '#34d399' }}>Referencing</strong>（用 ID 連接唔同嘅 document）、<strong style={{ color: '#fbbf24' }}>Bucket pattern</strong>（將時序數據分組存儲）。NoSQL 嘅 schema 設計要由 query pattern 驅動，唔係由數據關係驅動。
          </p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰數據建模技巧</h2>
      <div className="subtitle">OLTP vs OLAP / NoSQL Patterns / 設計決策</div>

      <div className="key-points">
        <div className="key-point">
          <h4>OLTP → Normalized</h4>
          <p>
            交易型系統（銀行、電商下單、用戶註冊）需要頻繁 write + update，數據一致性係最高優先級。用 3NF 正規化設計，搭配合理嘅 index。Write path 要盡量簡單快速。典型 stack：<code style={{ color: '#60a5fa' }}>PostgreSQL</code> + 合適嘅 index + connection pooling。
          </p>
        </div>
        <div className="key-point">
          <h4>OLAP → Denormalized</h4>
          <p>
            分析型系統（報表、數據分析、Dashboard）以大量 read + aggregation 為主，write 頻率低。用反正規化嘅 star schema 或 snowflake schema，令 query 唔使做太多 JOIN。典型 stack：<code style={{ color: '#60a5fa' }}>ClickHouse</code>、BigQuery、或者 PostgreSQL + materialized views。
          </p>
        </div>
        <div className="key-point">
          <h4>NoSQL Schema 設計流程</h4>
          <p>
            1) 先列出所有 access pattern（讀同寫分開列）。2) 按 access pattern 設計 document 結構，唔係按 entity。3) 用 embedding 減少 round-trip（如果 sub-document 總係一齊讀取）。4) 用 referencing 如果 sub-document 可能好大或者獨立更新。5) 用 <code style={{ color: '#60a5fa' }}>single table design</code>（DynamoDB 常用）將多個 entity 放同一個 table 用 PK/SK 區分。
          </p>
        </div>
        <div className="key-point">
          <h4>常見設計錯誤</h4>
          <p>
            <strong style={{ color: '#f87171' }}>1) 過度正規化</strong>：拆成太多細 table，每個 query 要 JOIN 5-6 個 table，性能差到爆。
            <strong style={{ color: '#f87171' }}>2) 忽略 query pattern</strong>：只睇數據結構就設計 schema，冇考慮實際嘅 query 點跑。
            <strong style={{ color: '#f87171' }}>3) 用 EAV（Entity-Attribute-Value）模式</strong>：令 query 超複雜。
            <strong style={{ color: '#f87171' }}>4) Nullable column 太多</strong>：一個 table 有 50 個 column 但大部分都係 null，應該拆分或者用 JSON column。
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
        <h4>Prompt 1 — 設計 Database Schema</h4>
        <div className="prompt-text">
          {'幫我設計一個 [電商平台 / 社交媒體 / SaaS 平台] 嘅 database schema。\n\n要求：\n- 先畫出 ER Diagram（用文字描述 Entity、Attribute、Relationship）\n- 正規化到 3NF，解釋每一步消除咗咩冗餘\n- 列出所有 table 嘅 CREATE TABLE SQL（PostgreSQL 語法）\n- 每個 table 加 primary key、foreign key、index\n- 多對多關係用 junction table\n- 加 created_at、updated_at timestamp\n- 建議 index 策略：邊啲 column 要加 index，用 B-tree 定 Hash\n- 考慮未來 schema 演化：列出可能嘅 ALTER TABLE migration'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 正規化 vs 反正規化決策分析</h4>
        <div className="prompt-text">
          {'分析以下系統應該用正規化定反正規化設計：\n\n系統描述：[例如：即時通訊 App，100 萬 DAU，每日 1 億條訊息]\n主要 Query Pattern：[列出 top 5 最頻繁嘅讀取同寫入操作]\n讀寫比例：[例如 80% 讀、20% 寫]\n\n請分析：\n- 用 3NF 正規化嘅 schema 設計同 query 成本\n- 用反正規化嘅 schema 設計同 query 成本\n- 比較兩者嘅 write latency、read latency、storage cost\n- 建議混合方案：邊啲 table 正規化、邊啲反正規化\n- 如果用 NoSQL，schema 點設計（embedding vs referencing）\n- 提供 benchmark 腳本嚟驗證性能差異'}
        </div>
      </div>
    </div>
  );
}

export default function DataModeling() {
  return (
    <>
      <TopicTabs
        title="數據建模"
        subtitle="搞清楚 Schema Design、正規化同反正規化嘅取捨"
        tabs={[
          { id: 'overview', label: '① 正規化 vs 反正規化', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階建模', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰技巧', premium: true, content: <PracticeTab /> },
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
