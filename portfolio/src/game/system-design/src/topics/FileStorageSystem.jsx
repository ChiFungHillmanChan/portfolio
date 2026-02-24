import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '雲端文件系統點解要將 File Metadata 同 File Content 分開儲存？',
    options: [
      { text: '因為 Metadata 同 Content 嘅 access pattern 完全唔同，分開先至可以各自優化', correct: true, explanation: 'Metadata（文件名、大小、權限）細但查詢頻繁，適合用 SQL Database。Content（實際檔案內容）大但讀寫少，適合用 Object Storage（例如 S3）。分開之後可以各自 scale，呢個係 Google Drive / Dropbox 嘅核心架構。' },
      { text: '因為法律規定要分開儲存', correct: false, explanation: '冇呢條法律。分開儲存係技術架構上嘅最佳實踐，唔係法律要求。' },
      { text: '因為一個 Database 放唔落咁多數據', correct: false, explanation: '現代嘅分佈式 Database 可以放好多數據。分開嘅原因係 access pattern 唔同，唔係容量問題。' },
      { text: '因為分開比較容易 backup', correct: false, explanation: 'Backup 策略同分唔分開關係唔大。分開嘅核心原因係效能優化同架構解耦。' },
    ],
  },
  {
    question: 'Chunked Upload（分塊上傳）嘅主要好處係咩？',
    options: [
      { text: '令檔案上傳更快', correct: false, explanation: '分塊唔一定令總上傳速度更快。佢嘅核心好處係可以斷點續傳同 deduplication，唔係速度。' },
      { text: '大檔案可以斷點續傳，失敗只需重傳個別 chunk，仲可以做 deduplication', correct: true, explanation: '假設上傳 2GB 檔案到一半斷線——如果冇分塊，要從頭嚟過；有分塊嘅話，只需要重傳失敗嗰幾個 chunk。而且如果 chunk 內容同已有嘅一樣（hash 相同），可以直接跳過，慳晒儲存空間同上傳時間。' },
      { text: '減少 Server 嘅 CPU 使用量', correct: false, explanation: 'Server 處理多個 chunk 嘅 CPU 消耗可能仲多過處理一個大檔案。分塊嘅好處唔係 CPU 效能。' },
      { text: '令用戶嘅網速變快', correct: false, explanation: '分塊唔會改變用戶嘅網速。佢改善嘅係上傳嘅可靠性同效率。' },
    ],
  },
  {
    question: '兩個人同時編輯同一個文件時出現衝突，CRDT 同 OT 嘅主要分別係咩？',
    options: [
      { text: 'CRDT 完全唔會有衝突，OT 會有', correct: false, explanation: 'CRDT 唔係冇衝突——佢係「最終一致」嘅，衝突會自動 resolve。但 resolve 嘅結果唔一定係用戶想要嘅。' },
      { text: 'OT 需要中央 Server 排序操作，CRDT 可以去中心化自動合併', correct: true, explanation: 'OT（Operational Transformation）需要一個中央 Server 決定操作順序，然後 transform 衝突嘅操作。CRDT（Conflict-free Replicated Data Type）設計上就可以去中心化——每個 Client 獨立操作，最終保證收斂到同一個狀態。Google Docs 用 OT，Figma 用 CRDT。' },
      { text: 'OT 比 CRDT 新', correct: false, explanation: 'OT 係 1989 年提出嘅，CRDT 係 2011 年左右正式化。兩個都有歷史，唔係新舊嘅分別。' },
      { text: 'CRDT 只能用喺文字編輯', correct: false, explanation: 'CRDT 可以用喺好多場景——文字、圖形、JSON 文檔、計數器等。佢係一種通用嘅數據結構。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'object-storage', label: 'Object Storage 對象存儲' },
  { slug: 'database-basics', label: 'Database Basics 數據庫基礎' },
  { slug: 'message-queue', label: 'Message Queue 消息隊列' },
  { slug: 'cdn', label: 'CDN 內容分發網絡' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>雲端文件系統係咩</h2>
      <div className="subtitle">Google Drive / 分塊上傳 / 同步衝突——點樣設計一個可靠嘅雲端存儲</div>
      <p>
        Google Drive、Dropbox、OneDrive——呢啲產品點樣做到你喺手機改個檔案，電腦即刻就同步到？呢個背後嘅系統設計其實唔簡單。核心挑戰係：點樣高效咁上傳大檔案、點樣處理多人同時編輯嘅衝突、點樣確保數據唔會丟失？
      </p>
      <p>
        設計雲端文件系統嘅第一步係理解：<strong style={{ color: '#3B82F6' }}>File Metadata</strong>（文件名、路徑、權限、版本號）同 <strong style={{ color: '#34d399' }}>File Content</strong>（實際嘅 byte 數據）係完全唔同嘅嘢，一定要分開儲存。Metadata 放 SQL Database，Content 放 Object Storage（例如 S3）。呢個分離係整個架構嘅基石。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 820 360" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a3a2f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a2f1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrGreen2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPurple2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(20,130)">
            <rect width="120" height="80" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Client</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">桌面 / 手機</text>
            <text x="60" y="64" textAnchor="middle" fill="#9ca3af" fontSize="9">上傳 / 下載</text>
          </g>

          <g transform="translate(210,130)" filter="url(#glowGreen)">
            <rect width="140" height="80" rx="12" fill="url(#gradGreen)" stroke="#34d399" strokeWidth="2" />
            <text x="70" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">API</text>
            <text x="70" y="48" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="700">Gateway</text>
            <text x="70" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">路由 + 驗證</text>
          </g>

          <g transform="translate(430,40)">
            <rect width="150" height="70" rx="12" fill="url(#gradAmber)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">Metadata DB</text>
            <text x="75" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">文件名 / 權限 / 版本</text>
            <text x="75" y="60" textAnchor="middle" fill="#9ca3af" fontSize="9">PostgreSQL</text>
          </g>

          <g transform="translate(430,170)">
            <rect width="150" height="70" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Block Storage</text>
            <text x="75" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">實際檔案內容</text>
            <text x="75" y="60" textAnchor="middle" fill="#9ca3af" fontSize="9">S3 / GCS</text>
          </g>

          <g transform="translate(430,290)">
            <rect width="150" height="60" rx="12" fill="url(#gradRed)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="75" y="25" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700">Sync Service</text>
            <text x="75" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">多裝置同步</text>
          </g>

          <path d="M142,170 C170,170 185,170 208,170" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrBlue2)" />
          <text x="175" y="163" textAnchor="middle" fill="#93c5fd" fontSize="10">Upload</text>

          <path d="M352,150 C380,120 400,90 428,82" stroke="#fbbf24" strokeWidth="2" fill="none" markerEnd="url(#arrAmber2)" />
          <text x="385" y="105" fill="#fbbf24" fontSize="9">Metadata</text>

          <path d="M352,180 C380,190 400,198 428,202" stroke="#8B5CF6" strokeWidth="2" fill="none" markerEnd="url(#arrPurple2)" />
          <text x="385" y="200" fill="#a78bfa" fontSize="9">Content</text>

          <path d="M352,195 C380,250 400,290 428,310" stroke="#f87171" strokeWidth="1.5" fill="none" strokeDasharray="5,3" markerEnd="url(#arrPurple2)" />
          <text x="372" y="265" fill="#f87171" fontSize="9">通知變更</text>

          <g transform="translate(650,130)">
            <rect width="140" height="80" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Other</text>
            <text x="70" y="48" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Clients</text>
            <text x="70" y="66" textAnchor="middle" fill="#9ca3af" fontSize="9">同步接收</text>
          </g>
          <path d="M582,320 C620,310 640,280 660,200 C665,180 668,175 648,172" stroke="#f87171" strokeWidth="1.5" fill="none" strokeDasharray="5,3" />
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>運作流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>Client 上傳檔案時，API Gateway 將 Metadata（文件名、大小、類型）寫入 Metadata DB，同時將實際檔案內容分塊存入 Block Storage（S3）。</span></li>
        <li><span className="step-num">2</span><span>大檔案用 Chunked Upload——將檔案切成 4MB 嘅 chunk，逐個上傳。每個 chunk 計算 hash，如果同已有嘅 chunk hash 一樣就跳過（deduplication）。</span></li>
        <li><span className="step-num">3</span><span>上傳完成後，Sync Service 通知所有已登入嘅 Client 有新檔案或者檔案有更新，觸發自動同步。</span></li>
        <li><span className="step-num">4</span><span>下載時，先從 Metadata DB 攞到檔案嘅 block 列表，再從 Block Storage 攞返所有 chunk 組合成完整檔案。</span></li>
      </ol>
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="card">
      <h2>進階技術</h2>
      <div className="subtitle">分塊上傳、去重、衝突解決</div>

      <div className="key-points">
        <div className="key-point">
          <h4>Chunked Upload（分塊上傳）</h4>
          <p>將大檔案切成固定大小嘅 chunk（通常 4-8MB），每個 chunk 獨立上傳。好處係：斷線只需重傳失敗嗰個 chunk；可以並行上傳多個 chunk 加速；每個 chunk 有自己嘅 checksum 保證完整性。Dropbox 用 4MB chunk，Google Drive 用 5MB。</p>
        </div>
        <div className="key-point">
          <h4>Deduplication（去重）</h4>
          <p>每個 chunk 用 SHA-256 計算 hash，存入 Block Storage 時用 hash 做 key。如果兩個檔案有相同嘅 chunk（例如只改咗最後幾行），相同嘅 chunk 只需存一份。呢個可以大幅減少儲存成本——Dropbox 聲稱節省咗 <strong style={{ color: '#34d399' }}>75%+ 嘅儲存空間</strong>。</p>
        </div>
        <div className="key-point">
          <h4>Conflict Resolution：OT vs CRDT</h4>
          <p><strong style={{ color: '#fbbf24' }}>OT（Operational Transformation）</strong>——Google Docs 嘅方案。需要中央 Server 排序操作，transform 衝突嘅 edit。優勢係精確控制，但 Server 係單點瓶頸。<br /><strong style={{ color: '#8B5CF6' }}>CRDT（Conflict-free Replicated Data Type）</strong>——Figma 嘅方案。每個 Client 獨立操作，數據結構設計上保證最終一致。去中心化但實現複雜。</p>
        </div>
        <div className="key-point">
          <h4>簡單場景：Last-Write-Wins</h4>
          <p>如果唔需要實時協作（好似 Dropbox 咁），最簡單嘅策略係 Last-Write-Wins + 版本歷史。衝突時保留最新版本，但保留舊版本俾用戶手動恢復。大部分雲端存儲就係用呢個策略。</p>
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
          <h4>Versioning（版本控制）</h4>
          <p>每次修改檔案都保留一個版本記錄。Metadata DB 入面用 <code style={{ color: '#60a5fa' }}>file_versions</code> 表儲存版本歷史，包含 version_id、timestamp、block_list。用戶可以隨時回滾到任何歷史版本。建議保留最近 30-100 個版本，太舊嘅自動清理慳空間。</p>
        </div>
        <div className="key-point">
          <h4>Sharing Permissions（分享權限）</h4>
          <p>權限模型通常係：Owner → Editor → Commenter → Viewer。用 ACL（Access Control List）儲存每個文件/文件夾嘅權限。注意繼承問題：子文件夾應該繼承父文件夾嘅權限，但可以被覆蓋。Google Drive 嘅 sharing link 就係將 ACL 設為「anyone with link = viewer」。</p>
        </div>
        <div className="key-point">
          <h4>Offline Sync（離線同步）</h4>
          <p>用戶離線時喺本地修改檔案，上線後要同步。核心挑戰係衝突偵測：比較本地版本號同 Server 版本號，如果唔一致就表示有衝突。簡單做法係兩個版本都保留，俾用戶自己揀。複雜做法係用 OT/CRDT 自動合併。</p>
        </div>
        <div className="key-point">
          <h4>Storage Quota 同 Billing</h4>
          <p>每個用戶有儲存上限。用 Metadata DB 嘅 aggregate query 計算用戶已用空間。注意：dedup 之後嘅實際 storage 同用戶「感知」嘅 storage 可能唔同。建議用「用戶感知」嘅 size 嚟計 quota，唔好用 dedup 後嘅 size。</p>
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
        <h4>Prompt 1 — 設計雲端文件系統 + Chunked Upload</h4>
        <div className="prompt-text">
          幫手設計一個類似 Google Drive 嘅雲端文件系統，支持分塊上傳同 deduplication。{'\n\n'}
          核心功能：{'\n'}
          - File Metadata 同 Content 分開儲存（PostgreSQL + S3）{'\n'}
          - Chunked Upload：固定 <span className="placeholder">[4MB / 8MB]</span> chunk，支持斷點續傳{'\n'}
          - Content-based Deduplication（SHA-256 hash）{'\n'}
          - 版本控制：每次修改保留歷史版本，支援回滾{'\n'}
          - 分享權限：Owner / Editor / Viewer{'\n'}
          - 預計用戶量 <span className="placeholder">[例如：100 萬]</span>，平均每用戶 <span className="placeholder">[例如：5GB]</span> 數據{'\n\n'}
          請提供完整嘅架構圖、Database Schema、Upload/Download API 設計、同 Dedup 邏輯嘅實現細節。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實現多裝置同步 + 衝突解決</h4>
        <div className="prompt-text">
          幫手設計一個多裝置文件同步系統，處理離線編輯同衝突。{'\n\n'}
          場景：{'\n'}
          - 用戶喺手機同電腦同時編輯同一個檔案{'\n'}
          - 用戶離線編輯後上線同步{'\n\n'}
          技術要求：{'\n'}
          - 同步機制：用 <span className="placeholder">[WebSocket / Server-Sent Events / Long Polling]</span> 做實時通知{'\n'}
          - 衝突偵測：基於版本向量（version vector）{'\n'}
          - 衝突解決策略：<span className="placeholder">[Last-Write-Wins / 保留兩個版本 / OT / CRDT]</span>{'\n'}
          - 離線支持：本地 Change Log + 上線後批量同步{'\n'}
          - 頻寬優化：只同步變更嘅 chunk，唔同步成個檔案{'\n\n'}
          技術棧：<span className="placeholder">[例如：Node.js + Redis Pub/Sub + PostgreSQL + S3]</span>{'\n'}
          請提供 Sync Protocol 設計、Conflict Resolution 邏輯、同 Offline Queue 嘅實現方案。
        </div>
      </div>
    </div>
  );
}

export default function FileStorageSystem() {
  return (
    <>
      <TopicTabs
        title="雲端文件系統"
        subtitle="Google Drive / 分塊上傳 / 同步衝突"
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
