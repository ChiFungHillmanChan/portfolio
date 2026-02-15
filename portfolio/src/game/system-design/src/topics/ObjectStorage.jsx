import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'cdn', label: 'CDN 內容分發網絡' },
  { slug: 'video-streaming', label: 'Video Streaming 影片串流' },
  { slug: 'deployment', label: '免費部署平台' },
  { slug: 'docker', label: 'Docker 容器化' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Object Storage 核心概念</h2>
      <div className="subtitle">唔係 file system，係 key-value 存大檔案</div>
      <p>
        首先要搞清楚：傳統檔案系統係 hierarchy（folder/file），但 Object Storage（例如 AWS S3）用 <strong style={{ color: '#6366f1' }}>bucket + key</strong> 嘅方式存儲。每個 object 有唯一 key，value 就係檔案內容（blob）。重點係：metadata（檔名、size、content-type）同 actual data 係分開存嘅，各司其職。
      </p>
      <p>必須掌握兩個關鍵設計：大檔案上傳要 support <strong style={{ color: '#34d399' }}>Multipart Upload</strong>；分發要用 <strong style={{ color: '#f59e0b' }}>CDN</strong> 加速下載。呢兩樣嘢係 Object Storage 嘅核心。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowPink" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feFlood floodColor="#EC4899" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2e1a47" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPink" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3d0a2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
            <marker id="arrPink" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#EC4899" /></marker>
          </defs>

          <g transform="translate(20,140)">
            <rect width="110" height="75" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="30" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Client</text>
            <text x="55" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">上傳 / 下載</text>
          </g>

          <g transform="translate(185,130)">
            <rect width="140" height="85" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="70" y="28" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Upload</text>
            <text x="70" y="48" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Service</text>
            <text x="70" y="70" textAnchor="middle" fill="#9ca3af" fontSize="10">Presigned URL</text>
          </g>

          <g transform="translate(400,40)">
            <rect width="160" height="75" rx="12" fill="url(#gradAmber)" stroke="#F59E0B" strokeWidth="2" filter="url(#glowAmber)" />
            <text x="80" y="30" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">S3 Object Store</text>
            <text x="80" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">Blob 存儲</text>
          </g>

          <g transform="translate(400,150)">
            <rect width="160" height="68" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="80" y="28" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Metadata DB</text>
            <text x="80" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">key, size, path</text>
          </g>

          <g transform="translate(400,260)">
            <rect width="160" height="75" rx="12" fill="url(#gradPink)" stroke="#EC4899" strokeWidth="2" filter="url(#glowPink)" />
            <text x="80" y="30" textAnchor="middle" fill="#EC4899" fontSize="13" fontWeight="700">CDN</text>
            <text x="80" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">邊緣快取分發</text>
          </g>

          <path d="M132,175 C155,172 168,170 183,168" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />

          <path d="M327,148 C355,120 375,95 398,85" stroke="#f59e0b" strokeWidth="1.5" fill="none" markerEnd="url(#arrYellow)" />
          <text x="355" y="108" fill="#f59e0b" fontSize="9">Blob</text>

          <path d="M327,175 C355,178 375,180 398,182" stroke="#8B5CF6" strokeWidth="1.5" fill="none" markerEnd="url(#arrPurple)" />
          <text x="355" y="172" fill="#a5b4fc" fontSize="9">Metadata</text>

          <path d="M480,120 C480,170 480,220 480,258" stroke="#EC4899" strokeWidth="1.5" fill="none" markerEnd="url(#arrPink)" />
          <text x="488" y="210" fill="#EC4899" fontSize="9">CDN 分發</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>完整流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>Client 想上傳大檔案，先問 Upload Service 攞 Presigned URL。呢步好關鍵，因為之後 Client 可以直接 upload 去 S3，唔使經 Server。</span></li>
        <li><span className="step-num">2</span><span>Client 直接 upload 去 S3，大幅減輕 backend 負擔。呢個就係 Presigned URL 嘅威力。</span></li>
        <li><span className="step-num">3</span><span>Metadata DB 記錄 object key、path、size、上傳時間等。最佳做法係將 metadata 同 blob 分開，方便搜尋。</span></li>
        <li><span className="step-num">4</span><span>下載時經 CDN，熱門檔案喺 edge 快取。重點係：全球用戶就近下載，速度快好多。</span></li>
      </ol>
    </div>
  );
}

function UploadTab() {
  return (
    <div className="card">
      <h2>上傳策略詳解</h2>
      <div className="subtitle">Presigned URL 同 Multipart Upload</div>
      <p>
        以下係兩個最重要嘅上傳機制。<strong style={{ color: '#34d399' }}>Presigned URL</strong>：Server 生成一個帶簽名嘅 URL，Client 可以直接用呢個 URL 上傳或下載，唔使經過 API。限時有效，安全又減負載。呢個設計必須掌握。
      </p>
      <p><strong style={{ color: '#f59e0b' }}>Multipart Upload</strong>：大檔案（例如 &gt;100MB）分做多個 part 上傳，最後 merge。核心優勢係：支援斷點續傳，失敗咗只需重傳失敗嘅 part，唔使由頭嚟。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>Presigned URL</h4>
          <p>Server 簽名 URL，Client 直接同 S3 溝通。限時（例如 15 min），過期無效。最佳做法係用呢個方式，唔使暴露 AWS key。</p>
        </div>
        <div className="key-point">
          <h4>Multipart Upload</h4>
          <p>分 part 上傳（每 part 5MB–5GB），流程係 Initiate → Upload parts → Complete。可以並行上傳多個 part，大幅加速大檔案傳輸。</p>
        </div>
        <div className="key-point">
          <h4>CDN 分發</h4>
          <p>熱門檔案 cache 喺 edge 節點，用戶就近下載。關鍵在於：CDN 減少 origin 壓力，加快全球訪問速度。</p>
        </div>
        <div className="key-point">
          <h4>Metadata 同 Blob 分開</h4>
          <p>Metadata（檔名、大小、path）放 DB 方便搜尋；blob 放 Object Store 低成本存儲。一定要分開，各司其職先係正確設計。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰要點</h2>
      <div className="subtitle">設計 Object Storage 要諗嘅嘢</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Part Size</h4>
          <p>Multipart 最小 5MB（最後 part 可以細啲）。建議用 5-10MB 做 balance：太大 part 失敗重傳成本高；太細 overhead 多。</p>
        </div>
        <div className="key-point">
          <h4>斷點續傳</h4>
          <p>記錄已上傳嘅 part，resume 時跳過。必須 persist upload_id 同 completed parts，呢步唔好偷懶。</p>
        </div>
        <div className="key-point">
          <h4>Abort 清理</h4>
          <p>用戶 cancel 或者超時，一定要 call Abort Multipart Upload。注意：orphan parts 會佔空間收錢，唔清理會浪費資源。</p>
        </div>
        <div className="key-point">
          <h4>權限控制</h4>
          <p>Presigned URL 可以限制 HTTP method、content-type、expiry。建議下載都用 signed URL + CDN，安全又快。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>總結</h4>
        <p>AWS S3、Google Cloud Storage、阿里雲 OSS 都係 Object Storage。好多大型平台背後都用類似架構：上傳經 Presigned/Multipart，下載經 CDN。掌握咗呢套設計，處理任何大檔案存儲場景都有足夠信心。</p>
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
        <h4>Prompt 1 — 設計檔案上傳同存儲系統</h4>
        <div className="prompt-text">
          幫手設計一個檔案上傳同存儲系統，用 <span className="placeholder">[AWS S3 / Google Cloud Storage / MinIO]</span>，應用場景係 <span className="placeholder">[用戶頭像上傳 / 文件管理系統 / 圖片社交平台]</span>。{'\n\n'}
          要求包括：{'\n'}
          - 實現 Presigned URL 上傳流程：Server 生成簽名 URL，Client 直接上傳去 Object Store{'\n'}
          - 支援 Multipart Upload：大檔案（&gt;100MB）自動分片上傳，支持斷點續傳{'\n'}
          - Metadata 同 Blob 分開存儲：Metadata 入 <span className="placeholder">[PostgreSQL / MongoDB]</span>，Blob 入 Object Store{'\n'}
          - 檔案類型驗證同大小限制{'\n'}
          - 自動生成 thumbnail（圖片場景）{'\n'}
          - 權限控制：signed URL + expiry 限時存取{'\n'}
          - 提供完整嘅 API code，語言用 <span className="placeholder">[Node.js / Python / Go]</span>
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實現 CDN 同 Object Storage 整合</h4>
        <div className="prompt-text">
          設計一套 CDN 同 Object Storage 嘅整合方案，場景係 <span className="placeholder">[靜態資源分發 / 用戶上傳圖片加速 / 全球化內容分發]</span>，預期全球用戶分佈喺 <span className="placeholder">[亞洲 / 歐美 / 全球]</span>。{'\n\n'}
          要求包括：{'\n'}
          - CDN 配置：Origin 指向 S3 bucket，設定 Cache Policy 同 TTL{'\n'}
          - Cache Invalidation 策略：檔案更新時點樣清除 CDN 快取{'\n'}
          - 用 signed URL 或 signed cookie 做 CDN 層嘅存取控制{'\n'}
          - 圖片優化 pipeline：自動壓縮、resize、轉 WebP 格式{'\n'}
          - 分層存儲策略：Hot tier（SSD）/ Cold tier（S3 Glacier）自動遷移{'\n'}
          - 監控方案：Cache Hit Rate、Bandwidth、Origin 請求量{'\n'}
          - 提供完整嘅 CDN 配置同 infrastructure as code
        </div>
      </div>
    </div>
  );
}

export default function ObjectStorage() {
  return (
    <>
      <TopicTabs
        title="Object Storage 物件存儲系統"
        subtitle="深入了解大檔案上傳同 CDN 分發，好似 S3 咁嘅架構設計"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'upload', label: '② 上傳策略', content: <UploadTab /> },
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
