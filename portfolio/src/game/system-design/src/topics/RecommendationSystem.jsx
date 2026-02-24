import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '推薦系統入面，Collaborative Filtering 同 Content-based Filtering 嘅核心分別係咩？',
    options: [
      { text: 'Collaborative Filtering 用用戶行為數據，Content-based 用物品本身嘅特徵', correct: true, explanation: 'Collaborative Filtering 嘅核心邏輯係「同你相似嘅用戶鍾意咩，你可能都鍾意」——基於用戶行為（點擊、購買、評分）。Content-based 嘅邏輯係「你鍾意 Action 片，推薦其他 Action 片」——基於物品特徵（類型、標籤、描述）。兩者可以結合使用（Hybrid）。' },
      { text: 'Content-based 更準確，Collaborative Filtering 更快', correct: false, explanation: '準確度同速度唔係佢哋嘅核心分別。分別在於用咩數據嚟做推薦。' },
      { text: 'Collaborative Filtering 唔需要機器學習', correct: false, explanation: '兩者都可以用機器學習。Collaborative Filtering 常用 Matrix Factorization（一種 ML 技術）嚟發現潛在嘅用戶偏好。' },
      { text: '冇分別，兩個係同一樣嘢', correct: false, explanation: '完全唔同。一個用用戶行為，一個用物品特徵，解決嘅問題同適用場景都唔一樣。' },
    ],
  },
  {
    question: '推薦系統嘅「Cold Start」問題係咩？點樣解決？',
    options: [
      { text: 'Server 啟動太慢嘅問題，用預熱解決', correct: false, explanation: 'Cold Start 唔係指 Server 啟動慢。係指新用戶或新物品冇歷史數據，系統唔知點推薦。' },
      { text: '新用戶冇行為數據、新物品冇互動記錄，系統冇辦法做個性化推薦', correct: true, explanation: '新用戶 Cold Start：冇歷史行為，唔知佢鍾意咩。解決方法：用熱門推薦兜底、問用戶興趣（onboarding quiz）、用人口統計資料做初步推薦。新物品 Cold Start：冇人互動過，唔知推俾邊個。解決方法：用 Content-based 做初始推薦、人工標籤、Explore-Exploit 策略。' },
      { text: 'Machine Learning 模型訓練太耐嘅問題', correct: false, explanation: '模型訓練時間係另一個問題。Cold Start 特指缺乏數據嘅情況。' },
      { text: '推薦結果冇變化，永遠推薦同一批嘢', correct: false, explanation: '呢個叫 Filter Bubble 或者缺乏 Diversity，唔係 Cold Start。Cold Start 係缺乏數據。' },
    ],
  },
  {
    question: '做推薦系統嘅 A/B Testing 時，點解要小心 feedback loop？',
    options: [
      { text: '因為 A/B Test 會令 Server 變慢', correct: false, explanation: 'A/B Test 對效能嘅影響好細。Feedback loop 係數據偏差問題，唔係效能問題。' },
      { text: '因為推薦結果會影響用戶行為，而用戶行為又會反饋回推薦模型，形成偏差循環', correct: true, explanation: '呢個係推薦系統最陰險嘅問題。例如：系統推薦 Action 片 → 用戶點擊 Action 片 → 模型認為用戶鍾意 Action 片 → 推薦更多 Action 片……結果用戶只能睇到一種類型。A/B Test 都可能被污染——因為 control group 同 treatment group 嘅行為被唔同嘅推薦結果影響，無法公平比較。' },
      { text: '因為 A/B Test 需要太多用戶', correct: false, explanation: '用戶量係 A/B Test 嘅考量之一，但唔係 feedback loop 嘅問題。' },
      { text: '因為 feedback loop 會令 Server crash', correct: false, explanation: 'Feedback loop 係數據層面嘅問題，唔會令 Server crash。' },
    ],
  },
  {
    question: 'Netflix 嘅推薦系統點解要用 Embedding 而唔係簡單嘅 Tag 匹配？',
    options: [
      { text: '因為 Embedding 更容易實現', correct: false, explanation: 'Embedding 嘅實現複雜得多，需要大量訓練數據同 ML 模型。但佢嘅效果遠超 Tag 匹配。' },
      { text: '因為 Embedding 可以捕捉到 Tag 表達唔到嘅隱含特徵同微妙關係', correct: true, explanation: 'Tag 匹配只能發現表面特徵（例如「科幻」、「Tom Cruise」）。但 Embedding 可以學習到隱含嘅關係——例如鍾意《Inception》嘅人可能都鍾意《Interstellar》，唔係因為佢哋嘅 Tag 一樣，而係因為佢哋有類似嘅「複雜劇情 + 視覺震撼」特質。呢啲微妙嘅模式只有 Embedding 先至捕捉到。' },
      { text: '因為 Netflix 有錢，可以用貴啲嘅技術', correct: false, explanation: '技術選擇同預算冇直接關係。Embedding 被廣泛使用係因為佢嘅效果好，唔係因為貴。' },
      { text: '因為 Tag 匹配被 Netflix 嘅專利封鎖咗', correct: false, explanation: 'Tag 匹配冇被專利封鎖。Netflix 用 Embedding 純粹係技術上嘅優勢。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'news-feed', label: 'News Feed 動態消息' },
  { slug: 'search-autocomplete', label: 'Search Autocomplete 搜索自動補全' },
  { slug: 'database-basics', label: 'Database Basics 數據庫基礎' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>推薦系統係咩</h2>
      <div className="subtitle">協同過濾 / 冷啟動 / A/B 測試——Netflix 同 YouTube 點樣知你鍾意睇咩</div>
      <p>
        Netflix 點知你鍾意睇咩片？YouTube 點解成日推啱你口味嘅影片？背後就係推薦系統。呢個系統嘅目標好簡單：喺海量內容入面，搵到你最可能感興趣嘅嘢推俾你。聽落簡單，但實際上係 AI/ML 入面最複雜嘅系統之一。
      </p>
      <p>
        推薦系統主要有兩大流派：<strong style={{ color: '#3B82F6' }}>Content-based Filtering</strong>（你鍾意 Action 片，推其他 Action 片）同 <strong style={{ color: '#34d399' }}>Collaborative Filtering</strong>（同你相似嘅人鍾意咩，推俾你）。現實中嘅大型平台都會將兩者結合，形成 Hybrid 系統。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#8B5CF6" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue4" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen4" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber4" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPurple4" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(20,110)">
            <rect width="130" height="80" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">User</text>
            <text x="65" y="48" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Behavior</text>
            <text x="65" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">點擊/購買/評分</text>
          </g>

          <g transform="translate(220,110)">
            <rect width="140" height="80" rx="12" fill="url(#gradGreen)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="28" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Feature</text>
            <text x="70" y="48" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="700">Extraction</text>
            <text x="70" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">特徵提取</text>
          </g>

          <g transform="translate(430,100)" filter="url(#glowPurple)">
            <rect width="140" height="100" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" />
            <text x="70" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="700">ML Model</text>
            <text x="70" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">Collaborative +</text>
            <text x="70" y="65" textAnchor="middle" fill="#9ca3af" fontSize="10">Content-based</text>
            <text x="70" y="85" textAnchor="middle" fill="#fbbf24" fontSize="9">Ranking Score</text>
          </g>

          <g transform="translate(640,110)">
            <rect width="140" height="80" rx="12" fill="url(#gradAmber)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="28" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">Ranked</text>
            <text x="70" y="48" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="700">Results</text>
            <text x="70" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">推薦列表</text>
          </g>

          <path d="M152,150 C175,150 195,150 218,150" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrBlue4)" />
          <text x="185" y="142" textAnchor="middle" fill="#93c5fd" fontSize="10">Raw Data</text>

          <path d="M362,150 C390,150 405,150 428,150" stroke="#34d399" strokeWidth="2" fill="none" markerEnd="url(#arrGreen4)" />
          <text x="395" y="142" textAnchor="middle" fill="#34d399" fontSize="10">Features</text>

          <path d="M572,150 C595,150 615,150 638,150" stroke="#8B5CF6" strokeWidth="2" fill="none" markerEnd="url(#arrPurple4)" />
          <text x="605" y="142" textAnchor="middle" fill="#a78bfa" fontSize="10">Scores</text>

          <g transform="translate(640,240)">
            <rect width="140" height="50" rx="10" fill="url(#gradRed)" stroke="#f87171" strokeWidth="1.5" />
            <text x="70" y="20" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">Feedback Loop</text>
            <text x="70" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">用戶反饋 → 模型更新</text>
          </g>
          <path d="M710,192 C710,215 710,225 710,238" stroke="#f87171" strokeWidth="1.5" fill="none" strokeDasharray="5,3" markerEnd="url(#arrPurple4)" />
          <path d="M638,265 C400,265 200,220 85,192" stroke="#f87171" strokeWidth="1.5" fill="none" strokeDasharray="5,3" markerEnd="url(#arrBlue4)" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>推薦流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>收集用戶行為數據——點擊、觀看時長、購買、評分、搜索記錄。呢啲數據係推薦系統嘅燃料。數據越多越準確。</span></li>
        <li><span className="step-num">2</span><span>Feature Extraction 將原始數據轉化成可用嘅特徵——例如用戶偏好向量、物品特徵向量、contextual features（時間、地點、裝置）。</span></li>
        <li><span className="step-num">3</span><span>ML Model 用 Collaborative + Content-based 混合策略，為每個候選物品計算一個 relevance score，然後按分數排序。</span></li>
        <li><span className="step-num">4</span><span>排序後嘅結果加入 diversity 同 freshness 調整（唔好全部都推同一類型），最終展示俾用戶。用戶嘅反饋又會回流到系統更新模型。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階推薦技術</h2>
      <div className="subtitle">Matrix Factorization、Embedding、Real-time vs Batch、Cold Start</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Matrix Factorization（矩陣分解）</h4>
          <p>經典嘅 Collaborative Filtering 方法。想像一個巨大嘅「用戶 × 物品」評分矩陣，大部分格仔係空嘅（用戶冇評分過大部分物品）。Matrix Factorization 將呢個大矩陣分解成兩個小矩陣（用戶特徵 × 物品特徵），從而預測空格仔嘅分數。Netflix Prize 嘅冠軍方案就係基於呢個技術。</p>
        </div>
        <div className="key-point">
          <h4>Embedding-based 推薦</h4>
          <p>將用戶同物品都映射到同一個向量空間（Embedding Space）。距離近嘅就係好匹配。好處係可以捕捉到 Tag 表達唔到嘅隱含特徵。例如 YouTube 嘅 Deep Neural Network 推薦系統，用用戶觀看歷史生成 user embedding，同 video embedding 做相似度計算。</p>
        </div>
        <div className="key-point">
          <h4>Real-time vs Batch 推薦</h4>
          <p><strong style={{ color: '#34d399' }}>Batch</strong>：每日/每小時重新計算所有用戶嘅推薦列表，離線處理。適合數據量大但對即時性要求唔高嘅場景。<br /><strong style={{ color: '#fbbf24' }}>Real-time</strong>：用戶每個行為都即時更新推薦。例如你啱啱搜索咗「耳機」，下一秒首頁就出現耳機推薦。需要 streaming pipeline（Kafka + Flink）。大型平台通常兩者結合。</p>
        </div>
        <div className="key-point">
          <h4>Cold Start 解決策略</h4>
          <p>
            <strong style={{ color: '#3B82F6' }}>新用戶</strong>：①用熱門推薦兜底；②Onboarding 問用戶興趣；③用人口統計做初步推薦。<br />
            <strong style={{ color: '#8B5CF6' }}>新物品</strong>：①用 Content-based 做初始推薦；②Explore-Exploit 策略——隨機展示俾部分用戶收集數據；③人工 curate 推薦位。<br />
            重點係：Cold Start 永遠存在，要用多種策略組合應對。
          </p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="key-points">
        <div className="key-point">
          <h4>A/B Testing Framework</h4>
          <p>推薦系統嘅每個改動都要做 A/B Test。關鍵 metrics：CTR（點擊率）、session time、conversion rate、user retention。注意：推薦系統嘅 A/B Test 需要較長時間（至少 1-2 週）先有統計顯著性，因為用戶行為有週期性。記住控制好 Feedback Loop 嘅影響。</p>
        </div>
        <div className="key-point">
          <h4>Feedback Loop 同 Filter Bubble</h4>
          <p>推薦系統最大嘅陷阱：推咩用戶就睇咩，睇咩就推更多同類嘅嘢——形成 echo chamber。解決方法：①加入 exploration 比例（例如 10% 嘅推薦係隨機嘅）；②刻意注入 diversity；③定期重新評估用戶興趣模型，唔好只靠短期行為。</p>
        </div>
        <div className="key-point">
          <h4>Diversity vs Relevance 平衡</h4>
          <p>100% relevance 嘅推薦會令用戶覺得無聊（全部都係同一類型）。好嘅推薦需要 balance：例如 70% 高度相關 + 20% 相關但唔同類型 + 10% 探索性推薦。Netflix 嘅 row-based layout 就係呢個策略——每一行係一個主題，確保用戶睇到唔同類型嘅內容。</p>
        </div>
        <div className="key-point">
          <h4>系統架構考量</h4>
          <p>大型推薦系統通常分兩階段：<strong style={{ color: '#fbbf24' }}>Candidate Generation</strong>（從百萬物品中快速篩選出幾百個候選）+ <strong style={{ color: '#34d399' }}>Ranking</strong>（用複雜模型精排呢幾百個）。呢個 two-stage 設計平衡咗效能同精確度。YouTube 就係用呢個架構。</p>
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
        <h4>Prompt 1 — 設計推薦系統 + Cold Start 策略</h4>
        <div className="prompt-text">
          幫手設計一個推薦系統，應用場景係 <span className="placeholder">[影片平台 / 電商 / 新聞 App]</span>，物品數量 <span className="placeholder">[100 萬 / 1000 萬]</span>，日活用戶 <span className="placeholder">[50 萬 / 500 萬]</span>。{'\n\n'}
          核心要求：{'\n'}
          - Two-stage 架構：Candidate Generation（快速篩選）+ Ranking（精排）{'\n'}
          - 支持 Collaborative Filtering + Content-based 混合策略{'\n'}
          - Cold Start 解決方案：新用戶 + 新物品{'\n'}
          - Real-time 更新（用戶行為即時影響推薦）{'\n'}
          - Diversity 同 Freshness 控制{'\n'}
          - A/B Testing 框架{'\n\n'}
          技術棧：<span className="placeholder">[例如：Python + TensorFlow + Redis + Kafka + Elasticsearch]</span>{'\n'}
          請提供完整架構圖、Feature Engineering 設計、Model Selection 理由、同 Serving Pipeline。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 建立推薦系統 A/B Testing + 監控</h4>
        <div className="prompt-text">
          幫手設計一個推薦系統嘅 A/B Testing 同效果監控平台。{'\n\n'}
          功能需求：{'\n'}
          - 支持多組 A/B Test 同時運行（traffic splitting）{'\n'}
          - 核心 metrics tracking：CTR、session time、conversion、retention{'\n'}
          - 統計顯著性自動計算（p-value &lt; <span className="placeholder">[0.05 / 0.01]</span>）{'\n'}
          - Guardrail metrics：確保新模型唔會令用戶體驗變差{'\n'}
          - Feedback Loop 偵測同告警{'\n'}
          - 推薦結果 Diversity Score 監控{'\n\n'}
          Dashboard 要顯示：{'\n'}
          - 每個實驗嘅即時效果對比{'\n'}
          - 推薦 coverage（推薦咗幾多 % 嘅物品庫）{'\n'}
          - 用戶分群嘅推薦效果差異{'\n\n'}
          請提供系統架構、Event Schema、同核心 Dashboard 嘅 Query 設計。
        </div>
      </div>
    </div>
  );
}

export default function RecommendationSystem() {
  return (
    <>
      <TopicTabs
        title="推薦系統"
        subtitle="協同過濾 / 冷啟動 / A/B 測試"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'advanced', label: '② 進階技術', content: <AdvancedTab /> },
          { id: 'practice', label: '③ 實戰要點', premium: true, content: <PracticeTab /> },
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
