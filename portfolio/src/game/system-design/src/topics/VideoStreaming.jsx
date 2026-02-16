import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Adaptive Bitrate Streaming 嘅核心原理係咩？',
    options: [
      { text: '用戶手動揀想睇嘅畫質', correct: false, explanation: 'Adaptive Bitrate 嘅重點係「自動」——播放器根據網速自動切換，唔需要用戶手動操作' },
      { text: '播放器根據用戶網速自動揀唔同清晰度嘅串流', correct: true, explanation: '播放器會持續偵測 bandwidth，自動切換最合適嘅 quality level，確保流暢播放同最佳畫質嘅平衡' },
      { text: '伺服器固定推送最高畫質嘅影片', correct: false, explanation: '固定推送最高畫質會導致網速慢嘅用戶不斷 buffer，體驗極差' },
      { text: '將影片壓縮到最細嘅檔案大小', correct: false, explanation: '壓縮到最細會犧牲畫質。Adaptive Bitrate 係提供多種畫質讓播放器動態選擇' },
    ],
  },
  {
    question: 'HLS 格式入面，.m3u8 檔案嘅作用係咩？',
    options: [
      { text: '儲存實際嘅影片畫面數據', correct: false, explanation: '.m3u8 係 playlist 文件，唔係影片數據。實際影片數據儲存喺 .ts segment 檔案入面' },
      { text: '做為 playlist，列出所有 video segment 嘅 URL 同 metadata', correct: true, explanation: '.m3u8 係一個文本格式嘅 playlist，列出每個 .ts segment 嘅 URL、時長同 quality 資訊，播放器靠佢嚟知道去邊度攞影片數據' },
      { text: '儲存影片嘅字幕資料', correct: false, explanation: '字幕通常用獨立嘅 .vtt 或 .srt 檔案，唔係 .m3u8 嘅主要用途' },
      { text: '做為 DRM 加密嘅密鑰檔案', correct: false, explanation: 'DRM 密鑰通常獨立管理，.m3u8 嘅核心功能係做 playlist' },
    ],
  },
  {
    question: '影片上傳後點解唔可以直接俾用戶睇？',
    options: [
      { text: '因為法律規定要審核先可以播放', correct: false, explanation: '雖然審核好重要，但技術上嘅原因係原始影片唔適合直接串流' },
      { text: '因為要等 CDN 全球同步完畢', correct: false, explanation: 'CDN 同步係分發階段嘅考量，真正嘅原因係影片需要先做 transcoding' },
      { text: '需要先做 Transcoding 轉成多種解像度同格式，先可以做 Adaptive Bitrate Streaming', correct: true, explanation: '原始影片可能係 4K 單一碼率，直接播放會令網速慢嘅用戶不斷 buffer。必須先轉碼成多種清晰度，再用 HLS/DASH 格式分片，先可以做到自適應串流' },
      { text: '因為原始影片太大，要壓縮先可以存儲', correct: false, explanation: '存儲成本係一個考量，但核心原因係需要 transcoding 支持 adaptive streaming' },
    ],
  },
  {
    question: 'HLS segment 長度建議設為幾多秒？',
    options: [
      { text: '0.5 秒——切換畫質反應最快', correct: false, explanation: 'Segment 太短會產生大量 HTTP 請求 overhead，增加延遲同伺服器壓力' },
      { text: '6 秒——平衡切換反應同 overhead', correct: true, explanation: '6 秒係業界推薦嘅平衡點。太短 overhead 多，太長切換 quality 嘅反應就唔夠快。呢個係 latency 同 efficiency 嘅 trade-off' },
      { text: '60 秒——減少 HTTP 請求數量', correct: false, explanation: '60 秒 segment 會導致切換畫質時要等好耐，用戶體驗好差' },
      { text: '300 秒——一條片一個 segment 最簡單', correct: false, explanation: '單一大 segment 完全冇辦法做 adaptive bitrate，失去咗 HLS 嘅核心優勢' },
    ],
  },
  {
    question: '點樣優化冷門影片嘅存儲成本？',
    options: [
      { text: '刪除所有冷門影片', correct: false, explanation: '刪除影片會影響用戶體驗，萬一有人想睇就冇咗' },
      { text: '只保留低解像度版本，或者用分層存儲（hot/cold tier）', correct: true, explanation: '冷門片只留 360p 或者將高解像度版本搬去 cold storage（例如 S3 Glacier），需要時再取出。呢樣可以慳大量存儲成本之餘唔完全失去內容' },
      { text: '將冷門片全部轉成 4K 提升質量', correct: false, explanation: '冇人睇嘅片轉 4K 只會增加存儲成本，完全唔合理' },
      { text: '所有影片都保留全部解像度版本', correct: false, explanation: '多解像度 = 多倍存儲成本。對冷門片嚟講呢個成本效益比好低' },
    ],
  },
];

const relatedTopics = [
  { slug: 'cdn', label: 'CDN 內容分發網絡' },
  { slug: 'object-storage', label: 'Object Storage 物件存儲' },
  { slug: 'chat-system', label: 'Chat System 即時通訊' },
  { slug: 'large-api-response', label: 'Large API Response 處理' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>影片串流系統拆解</h2>
      <div className="subtitle">上傳、轉碼、分發、播放一條龍</div>
      <p>
        關鍵概念：用戶上傳一條影片，唔可以直接俾人睇。必須先做 <strong style={{ color: '#6366f1' }}>Transcoding（轉碼）</strong>——將影片轉成多種解像度同碼率，然後放上 Object Storage，經 <strong style={{ color: '#f59e0b' }}>CDN</strong> 分發到全球各地。播放器用 HLS 或 DASH 協議，根據用戶網速自動揀唔同清晰度，呢個就係 Adaptive Bitrate。
      </p>
      <p>成個流程係一個 <strong style={{ color: '#34d399' }}>DAG Pipeline</strong>——上傳 → 轉碼（多解像度）→ 儲存 → CDN 快取 → 播放。每一步都有依賴關係，設計嘅時候要諗清楚。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowPink" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#EC4899" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#172033" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#13251e" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#1f1a10" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#1c1530" /></linearGradient>
            <linearGradient id="gradPink" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#25132a" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arrPink" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#EC4899" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(20,145)">
            <rect width="100" height="60" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Upload</text>
            <text x="50" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">上傳影片</text>
          </g>

          <g transform="translate(165,125)">
            <rect width="140" height="80" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="70" y="28" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Transcoding</text>
            <text x="70" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">FFmpeg 多解像度</text>
            <text x="70" y="66" textAnchor="middle" fill="#34d399" fontSize="9">1080p / 720p / 480p / 360p</text>
          </g>

          <g transform="translate(355,55)">
            <rect width="130" height="60" rx="12" fill="url(#gradAmber)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">Object Store</text>
            <text x="65" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">HLS 分片存儲</text>
          </g>

          <g transform="translate(355,150)">
            <rect width="130" height="55" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Video Metadata</text>
            <text x="65" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">標題、長度、URL</text>
          </g>

          <g transform="translate(535,105)">
            <rect width="120" height="70" rx="12" fill="url(#gradPink)" stroke="#EC4899" strokeWidth="2" filter="url(#glowPink)" />
            <text x="60" y="28" textAnchor="middle" fill="#EC4899" fontSize="13" fontWeight="700">CDN</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Edge Cache</text>
            <text x="60" y="64" textAnchor="middle" fill="#EC4899" fontSize="9">全球分發</text>
          </g>

          <g transform="translate(700,120)">
            <rect width="100" height="70" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Player</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">HLS / DASH</text>
            <text x="50" y="62" textAnchor="middle" fill="#3B82F6" fontSize="9">Adaptive Bitrate</text>
          </g>

          <path d="M 120 170 Q 142 165 163 162" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <path d="M 305 140 Q 330 100 353 88" fill="none" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <text x="322" y="108" fill="#f59e0b" fontSize="9">.m3u8 + .ts</text>
          <path d="M 305 172 Q 330 175 353 175" fill="none" stroke="#8B5CF6" strokeWidth="1.5" markerEnd="url(#arrPurple)" />
          <text x="330" y="190" fill="#8B5CF6" fontSize="9">Metadata</text>
          <path d="M 485 85 Q 510 100 533 118" fill="none" stroke="#EC4899" strokeWidth="1.5" markerEnd="url(#arrPink)" />
          <text x="505" y="95" fill="#EC4899" fontSize="9">分發</text>
          <path d="M 655 145 Q 678 148 698 150" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <text x="672" y="138" fill="#34d399" fontSize="9">播放</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>成個流程一覽</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>用戶上傳影片，送入 Transcoding Pipeline。推薦用 FFmpeg，係業界標準。</span></li>
        <li><span className="step-num">2</span><span>轉碼成多種解像度（1080p、720p、480p、360p），輸出 HLS 格式（.m3u8 + .ts）或 DASH 格式。重點係，每個 quality level 都係獨立嘅 playlist。</span></li>
        <li><span className="step-num">3</span><span>分片存入 Object Storage，同時 Video Metadata DB 記錄影片資訊同 playlist URL。建議將 metadata 同實際檔案分開存。</span></li>
        <li><span className="step-num">4</span><span>CDN 快取熱門影片，用戶播放時從最近嘅 edge node 攞。呢個大幅減少延遲，必須善用 CDN。</span></li>
        <li><span className="step-num">5</span><span>播放器根據網速揀唔同清晰度——呢個就係 Adaptive Bitrate Streaming。呢個機制令到用戶體驗大幅提升。</span></li>
      </ol>
    </div>
  );
}

function TranscodingTab() {
  return (
    <div className="card">
      <h2>Transcoding 流程詳解</h2>
      <div className="subtitle">點樣將一條片變成多種清晰度</div>
      <p>
        原始影片可能係 4K、單一碼率，唔可以直接咁送出去。需要用 <strong style={{ color: '#10B981' }}>FFmpeg</strong>（或類似工具）生成多條不同解像度嘅串流。HLS 用 .m3u8 做 playlist，列出每個 segment（.ts 檔）嘅 URL。DASH 就用 MPD（XML）做類似嘅嘢。
      </p>
      <p>播放器會根據當前 bandwidth 揀最合適嘅 quality level，動態切換。呢個就係 Adaptive Bitrate Streaming 嘅核心原理——唔使用戶手動揀畫質，系統自動搞掂。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>Transcoding 多解像度</h4>
          <p>建議將一條源片至少轉成 1080p、720p、480p、360p。每種有獨立 playlist，player 按網速自動揀。低端裝置都睇到，高速網絡有靚畫質。</p>
        </div>
        <div className="key-point">
          <h4>HLS / DASH 協議</h4>
          <p>兩種主流協議：HLS（Apple 主導）用 .m3u8 + .ts；DASH（開放標準）用 MPD + 分片。兩者都 support adaptive bitrate。建議優先用 HLS，兼容性最好。</p>
        </div>
        <div className="key-point">
          <h4>CDN Edge Caching</h4>
          <p>熱門影片嘅 .m3u8 同 .ts segment 會 cache 喺 CDN edge 節點。全球用戶就近下載，大幅減輕 origin server 壓力。必須諗清楚 cache invalidation 策略。</p>
        </div>
        <div className="key-point">
          <h4>DAG Pipeline</h4>
          <p>成個流程係：上傳 → 轉碼（可以並行多個 quality）→ 儲存 → 通知。建議用 DAG 管理依賴關係，某個 step 失敗可以單獨 retry，唔使重頭嚟。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">設計影片串流系統時必須注意呢幾點</div>
      <div className="key-points">
        <div className="key-point">
          <h4>轉碼時間</h4>
          <p>一條 1 小時嘅片轉碼可能要幾十分鐘。需要用 worker 集群並行處理，或者 pre-transcode 熱門片。用戶唔會等慢慢轉。</p>
        </div>
        <div className="key-point">
          <h4>Segment 長度</h4>
          <p>HLS segment 一般 2 到 10 秒。建議用 6 秒——太短 overhead 多，太長切換 quality 嘅反應就唔夠快。呢個係個平衡點。</p>
        </div>
        <div className="key-point">
          <h4>進度通知</h4>
          <p>轉碼完成後需要通知前端。建議用 Webhook 或者 Server-Sent Events，唔好用 polling——浪費資源。更新影片狀態為「可播放」。</p>
        </div>
        <div className="key-point">
          <h4>存儲成本</h4>
          <p>要留意，多解像度 = 多倍存儲成本。建議係：熱門片保留所有 quality，冷門片只留 360p 或者用分層存儲（hot/cold tier），慳錢之餘唔影響用戶體驗。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>總結</h4>
        <p>影片串流系統嘅核心就係三個字：Transcoding + CDN + Adaptive Bitrate。掌握呢三個概念，就可以設計出一個 production-ready 嘅串流架構。記住，先從小規模開始，但架構要可以水平擴展。</p>
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
        <h4>Prompt 1 — 建立影片串流平台架構</h4>
        <div className="prompt-text">
          {`幫手設計一個影片串流平台嘅後端架構，類似 [YouTube / 線上課程平台 / 企業內部影片系統]，預期影片數量係 [1000 / 10000 / 100000] 條。

要求包括：
- 影片上傳 API：支持大檔案 Multipart Upload，上傳完觸發 Transcoding Pipeline
- Transcoding 服務：用 FFmpeg 將源片轉成 1080p、720p、480p、360p
- 輸出 HLS 格式（.m3u8 + .ts segments），segment 長度 6 秒
- DAG Pipeline 管理：上傳 → 轉碼 → 儲存 → 通知，每步可獨立 retry
- Video Metadata DB 設計：標題、描述、長度、playlist URL、轉碼狀態
- CDN 配置：熱門影片 cache 喺 edge 節點
- 提供完整嘅 code 同系統架構圖，語言用 [Node.js / Python / Go]`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實現 Adaptive Bitrate Streaming</h4>
        <div className="prompt-text">
          {`實現一個 Adaptive Bitrate Streaming 播放方案，場景係 [Web 播放器 / Mobile App / Smart TV]，需要支持 [HLS / DASH / 兩者都要]。

要求包括：
- FFmpeg 轉碼配置：生成多個 quality level（1080p@5Mbps、720p@2.5Mbps、480p@1Mbps、360p@500Kbps）
- Master playlist（.m3u8）結構設計，列出所有 quality variant
- 前端播放器整合：用 hls.js 或 dash.js，自動根據 bandwidth 切換清晰度
- Bandwidth estimation 算法邏輯
- 進度通知機制：轉碼完成後用 Webhook 通知前端更新狀態
- 存儲成本優化：熱門片保留所有 quality，冷門片只留低解像度
- 提供完整嘅前後端 code 同 FFmpeg 命令`}
        </div>
      </div>
    </div>
  );
}

export default function VideoStreaming() {
  return (
    <>
      <TopicTabs
        title="Video Streaming 影片串流系統"
        subtitle="影片編碼、Adaptive Bitrate 同 CDN 分發架構全解"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'transcoding', label: '② Transcoding 流程', content: <TranscodingTab /> },
          { id: 'practice', label: '③ 實戰要點', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
          { id: 'quiz', label: '⑤ Quiz', premium: true, content: <QuizRenderer data={quizData} /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
