import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
  { slug: 'notification-system', label: 'Notification System 通知系統' },
  { slug: 'scale-reads', label: '擴展讀取能力' },
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>News Feed 係咩</h2>
      <div className="subtitle">打開 Facebook / Instagram 睇到嗰堆動態，就係 News Feed</div>
      <p>
        想像一下：follow 咗 500 個人，每個人都有新 post，系統點樣決定首頁要顯示邊啲 post、用咩順序排列？呢個就係 News Feed 系統要解決嘅問題，亦係面試超高頻題目。
      </p>
      <p>核心挑戰係：follow 嘅人同時發 post，系統要喺毫秒級將呢啲 post 收集、排序、展示出嚟。以下睇成個架構。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a3a2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradYellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a351a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPink" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a1a2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPink" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#EC4899" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(30,120)">
            <rect width="120" height="70" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="60" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">User Post</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">用戶發 post</text>
          </g>

          <g transform="translate(220,120)">
            <rect width="140" height="70" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="70" y="28" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Feed Service</text>
            <text x="70" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">動態消息服務</text>
          </g>

          <g transform="translate(430,50)">
            <rect width="130" height="60" rx="12" fill="url(#gradYellow)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="25" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Fan-out</text>
            <text x="65" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">推送服務</text>
          </g>

          <g transform="translate(620,50)">
            <rect width="140" height="60" rx="12" fill="url(#gradRed)" stroke="#EF4444" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="25" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">Feed Cache</text>
            <text x="70" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">每個用戶嘅 Feed</text>
          </g>

          <g transform="translate(430,190)">
            <rect width="130" height="60" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Posts DB</text>
            <text x="65" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">帖子資料庫</text>
          </g>

          <g transform="translate(620,190)">
            <rect width="140" height="60" rx="12" fill="url(#gradPink)" stroke="#EC4899" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="25" textAnchor="middle" fill="#EC4899" fontSize="12" fontWeight="700">Ranking</text>
            <text x="70" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">排序演算法</text>
          </g>

          <path d="M152,155 C185,155 185,155 218,155" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="185" y="145" textAnchor="middle" fill="#a5b4fc" fontSize="10">New post</text>

          <path d="M362,140 C390,120 410,100 428,85" stroke="#fbbf24" strokeWidth="2" fill="none" markerEnd="url(#arrYellow)" />
          <text x="405" y="105" fill="#fbbf24" fontSize="10">Fan-out</text>

          <path d="M562,80 C585,80 600,80 618,80" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arrGreen)" />
          <text x="590" y="70" textAnchor="middle" fill="#34d399" fontSize="10">Write feeds</text>

          <path d="M362,170 C390,185 410,200 428,210" stroke="#8B5CF6" strokeWidth="1.5" fill="none" markerEnd="url(#arrPurple)" />
          <text x="405" y="200" fill="#a5b4fc" fontSize="10">Store</text>

          <path d="M562,220 C585,220 600,220 618,220" stroke="#EC4899" strokeWidth="1.5" fill="none" markerEnd="url(#arrPink)" />
          <text x="590" y="210" textAnchor="middle" fill="#EC4899" fontSize="10">Rank &amp; sort</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>成個流程一覽</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>首先，用戶發一條新 post，Feed Service 收到。呢個係成個 pipeline 嘅起點。</span></li>
        <li><span className="step-num">2</span><span>跟住 Fan-out Service 會將呢條 post 推送到所有 follower 嘅 Feed Cache 入面。Fan-out 嘅兩種策略會喺下一節詳細解說。</span></li>
        <li><span className="step-num">3</span><span>同時，原始 post 存入 Posts DB 做永久保存。重點係，Cache 同 DB 係兩個唔同嘅存儲層。</span></li>
        <li><span className="step-num">4</span><span>最後，Ranking Algorithm 決定 post 喺每個用戶 Feed 入面嘅顯示順序。呢個排序邏輯係整個系統最有商業價值嘅部分。</span></li>
      </ol>
    </div>
  );
}

function FanoutTab() {
  return (
    <div className="card">
      <h2>Fan-out 策略比較</h2>
      <div className="subtitle">呢個係 News Feed 最核心嘅設計決定，必須要識</div>

      <h3 style={{ color: '#34d399', fontSize: '1.1rem', margin: '20px 0 12px' }}>Fan-out on Write（推模式）</h3>
      <p>先講推模式。用戶一發 post，系統即刻將 post 寫入所有 follower 嘅 Feed Cache。Follower 打開 App 嘅時候，Feed 已經準備好晒，即刻顯示。</p>
      <p><strong style={{ color: '#34d399' }}>好處：</strong>讀取超快，因為 Feed 已經 pre-computed。<br /><strong style={{ color: '#f87171' }}>壞處：</strong>注意呢個陷阱——如果一個名人有 1000 萬 follower，發一條 post 要寫 1000 萬次，呢個叫做 hotkey problem，超慢！</p>

      <h3 style={{ color: '#fbbf24', fontSize: '1.1rem', margin: '24px 0 12px' }}>Fan-out on Read（拉模式）</h3>
      <p>拉模式就唔同。用戶打開 App 嘅時候，系統即時去資料庫拉取所 follow 嘅人嘅最新 post，然後排序顯示。</p>
      <p><strong style={{ color: '#34d399' }}>好處：</strong>寫入簡單，發 post 只需要存一次。<br /><strong style={{ color: '#f87171' }}>壞處：</strong>讀取慢，因為每次都要即時計算 Feed。需要衡量邊個 trade-off 更適合實際場景。</p>

      <h3 style={{ color: '#a5b4fc', fontSize: '1.1rem', margin: '24px 0 12px' }}>混合模式（最推薦嘅方案）</h3>
      <p>結論係：名人（follower 超多）用 <strong>pull 模式</strong>；普通用戶用 <strong>push 模式</strong>。呢個就係最佳平衡，Facebook 同 Twitter 都係咁做。面試嘅時候主動提呢個混合策略，面試官一定會加分。</p>

      <div className="use-case">
        <h4>真實做法參考</h4>
        <p>大型社交平台用混合模式：普通用戶 post 會 fan-out 到 follower，但名人 post 係讀取時先拉取。再配合 Ranking Algorithm（例如 EdgeRank），根據用戶同發帖人嘅互動程度嚟決定顯示順序。設計嘅時候要將呢啲因素全部考慮進去。</p>
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
          <h4>Ranking Algorithm</h4>
          <p>重點係：News Feed 唔係按時間排序咁簡單！大型平台用 machine learning 根據互動率、用戶興趣、post 類型等因素排序。設計嘅時候要預留呢個 ranking layer。</p>
        </div>
        <div className="key-point">
          <h4>Pagination 分頁</h4>
          <p>重點係，Feed 唔可以一次 load 晒。建議用 cursor-based pagination，唔好用 offset-based。每次 load 20 條，往下滑再 load 20 條，咁先能承受大流量。</p>
        </div>
        <div className="key-point">
          <h4>Cache 策略</h4>
          <p>實戰技巧：每個用戶嘅 Feed 存喺 Redis 入面，用 sorted set 按 score（時間或 rank）排列。新 post 加入時插入對應位置，呢個操作係 O(log N)，超快。</p>
        </div>
        <div className="key-point">
          <h4>Real-time Updates</h4>
          <p>建議用 WebSocket 或 Server-Sent Events 推送新 post 通知，用戶唔使 refresh 就可以睇到最新動態。呢個會大幅提升用戶體驗。</p>
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
        <h4>Prompt 1 — 設計 News Feed 系統（Fan-out 策略）</h4>
        <div className="prompt-text">
          幫手設計一個 News Feed 系統嘅後端架構。{'\n\n'}
          要求：{'\n'}
          - 支援 Fan-out on Write 同 Fan-out on Read 兩種模式{'\n'}
          - 普通用戶（follower 少於 <span className="placeholder">[5000]</span>）用 push 模式，名人用戶用 pull 模式{'\n'}
          - 用 Redis Sorted Set 做每個用戶嘅 Feed Cache{'\n'}
          - 用 <span className="placeholder">[Node.js / Python / Go]</span> 寫核心邏輯{'\n'}
          - 包含 Feed Service、Fan-out Service、Ranking Service 三個主要組件{'\n'}
          - 支援 cursor-based pagination，每頁載入 20 條 post{'\n'}
          - 畫出完整嘅系統架構圖，標明每個組件之間嘅數據流向
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實現 Feed Ranking Algorithm</h4>
        <div className="prompt-text">
          用 <span className="placeholder">[Python / TypeScript]</span> 實現一個 News Feed Ranking Algorithm。{'\n\n'}
          需求：{'\n'}
          - 輸入：一組候選 post（包含 post_id、author_id、created_at、likes、comments、shares）{'\n'}
          - 輸出：按 relevance score 排序嘅 post 列表{'\n'}
          - Ranking 因素包括：{'\n'}
          {'  '}1. 時間衰減（越新嘅 post 分數越高，用 exponential decay）{'\n'}
          {'  '}2. 互動率（likes + comments * 2 + shares * 3）{'\n'}
          {'  '}3. 用戶同作者嘅親密度（基於歷史互動次數）{'\n'}
          {'  '}4. Post 類型加權（<span className="placeholder">[圖片 1.2x / 影片 1.5x / 文字 1.0x]</span>）{'\n'}
          - 寫埋單元測試，驗證排序結果係咪合理{'\n'}
          - 附帶解釋每個因素嘅權重點樣調整
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 建立 Real-time Feed 推送</h4>
        <div className="prompt-text">
          用 <span className="placeholder">[Node.js + Socket.io / Go + WebSocket]</span> 建立一個 Real-time News Feed 推送系統。{'\n\n'}
          功能要求：{'\n'}
          - 當有新 post 發佈時，即時推送通知俾相關 follower{'\n'}
          - 用 Redis Pub/Sub 做消息廣播{'\n'}
          - 前端收到通知後顯示「有 X 條新動態」嘅提示{'\n'}
          - 支援多台 Server 嘅分佈式場景{'\n'}
          - 包含 connection 管理（心跳檢測、自動重連）{'\n'}
          - 預計用戶量：<span className="placeholder">[10,000 / 100,000]</span> 同時在線{'\n'}
          - 寫出完整嘅前後端代碼同部署建議
        </div>
      </div>
    </div>
  );
}

export default function NewsFeed() {
  return (
    <>
      <TopicTabs
        title="News Feed 動態消息流"
        subtitle="社交媒體動態設計，掌握 Fan-out on write vs fan-out on read"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'fanout', label: '② Fan-out 策略', content: <FanoutTab /> },
          { id: 'practice', label: '③ 實戰要點', premium: true, content: <PracticeTab /> },
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
