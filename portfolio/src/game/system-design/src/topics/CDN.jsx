import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '你嘅網站用 CDN，但 cache hit ratio 只有 40%。最可能嘅原因係咩？',
    options: [
      { text: 'CDN 節點太少', correct: false, explanation: '節點數量通常唔係主因，大部分 CDN 供應商都有足夠嘅 PoP。' },
      { text: 'Cache-Control TTL 設得太短，或者 URL 帶有動態 query string', correct: true, explanation: 'TTL 太短會令 cache 經常過期，而每個唔同嘅 query string 都會被當成獨立資源，大幅降低 hit ratio。' },
      { text: '用戶太多', correct: false, explanation: '用戶越多反而應該令 hit ratio 越高，因為同一資源被更多人請求。' },
      { text: 'Origin server 太慢', correct: false, explanation: 'Origin 速度影響 cache miss 嘅回應時間，但唔會影響 hit ratio。' },
    ],
  },
  {
    question: '部署新版本前端之後，點樣確保用戶即刻睇到新版？',
    options: [
      { text: '等 cache 自然過期', correct: false, explanation: '如果 TTL 設咗好長（例如 1 年），用戶可能好耐先睇到新版。' },
      { text: '用 versioned URL（例如 main.abc123.js）配合長 TTL', correct: true, explanation: '檔名包含 content hash，新版本自動用新 URL，舊 cache 唔影響。HTML 用 no-cache 確保每次都拉最新嘅 HTML，入面引用新嘅 JS/CSS URL。' },
      { text: '每次都 purge 全站 cache', correct: false, explanation: '全站 purge 會導致所有資源 cache miss，短時間內 origin 壓力大增，而且有 quota 限制。' },
      { text: '將所有資源設為 no-store', correct: false, explanation: 'no-store 會令 CDN 完全唔 cache，失去 CDN 嘅意義，每個請求都要去 origin。' },
    ],
  },
  {
    question: 'GeoDNS 嘅主要作用係咩？',
    options: [
      { text: '加密 DNS 查詢', correct: false, explanation: '加密 DNS 係 DNS-over-HTTPS (DoH) 嘅功能，同 GeoDNS 無關。' },
      { text: '根據用戶地理位置返回最近嘅 CDN edge server IP', correct: true, explanation: 'GeoDNS 會分析用戶嘅 IP 地理位置，返回距離最近嘅 PoP 節點 IP，減少網絡延遲。' },
      { text: '防止 DDoS 攻擊', correct: false, explanation: 'DDoS 防護係 CDN 嘅另一個功能，唔係 GeoDNS 嘅主要職責。' },
      { text: '加速 DNS 解析速度', correct: false, explanation: 'GeoDNS 嘅重點係地理位置路由，唔係加速 DNS 解析本身。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'load-balancer', label: 'Load Balancer 負載均衡器' },
  { slug: 'cache-invalidation', label: 'Cache 失效策略' },
  { slug: 'object-storage', label: 'Object Storage 物件存儲' },
  { slug: 'large-api-response', label: 'Large API Response 處理' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>CDN 係咩</h2>
      <div className="subtitle">將靜態資源（圖片、影片、JS、CSS）放喺全球各地嘅 Edge Server，用戶就近攞</div>
      <p>
        想像一個場景：網站 Server 喺美國，但香港用戶要 load 一張圖，呢個請求要跨越半個地球先到。慢到乜咁。CDN（Content Delivery Network）就係解決方案——喺全球好多地方（香港、東京、倫敦......）擺 Edge Server，將靜態資源 cache 喺嗰度。
      </p>
      <p>
        當香港用戶問 DNS 嘅時候，DNS 會揀最近嘅 Edge Server（香港 PoP）嘅 IP 返回。用戶直接從香港攞資源，快好多。如果 Edge Server 冇嗰個資源，Edge 就會去 Origin Server（主機）拉，拉完 cache 落嚟，之後其他用戶就唔使再問 Origin。呢個流程好重要，一定要掌握。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 740 370" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.2" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradUser" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDNS" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradEdge" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradOrigin" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8b5cf6" /></marker>
          </defs>

          {/* User (HK) */}
          <g transform="translate(30,145)">
            <rect width="100" height="65" rx="14" fill="url(#gradUser)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="50" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">User</text>
            <text x="50" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">(香港)</text>
          </g>

          {/* DNS GeoDNS */}
          <g transform="translate(175,125)">
            <rect width="135" height="85" rx="14" fill="url(#gradDNS)" stroke="#8b5cf6" strokeWidth="2" filter="url(#shadow)" />
            <text x="68" y="28" textAnchor="middle" fill="#8b5cf6" fontSize="13" fontWeight="700">DNS</text>
            <text x="68" y="48" textAnchor="middle" fill="#8b5cf6" fontSize="12" fontWeight="600">(GeoDNS)</text>
            <text x="68" y="70" textAnchor="middle" fill="#9ca3af" fontSize="10">按地理位置路由</text>
          </g>

          {/* Edge Server HK */}
          <g transform="translate(365,80)">
            <rect width="130" height="95" rx="14" fill="url(#gradEdge)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="65" y="28" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Edge Server</text>
            <text x="65" y="48" textAnchor="middle" fill="#34d399" fontSize="11">(香港 PoP)</text>
            <text x="65" y="70" textAnchor="middle" fill="#9ca3af" fontSize="10">Cache 靜態資源</text>
            <text x="65" y="85" textAnchor="middle" fill="#34d399" fontSize="9">Cache Hit = 超快</text>
          </g>

          {/* Edge Server US */}
          <g transform="translate(365,210)">
            <rect width="130" height="70" rx="14" fill="url(#gradEdge)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Edge (US PoP)</text>
            <text x="65" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">美國節點</text>
          </g>

          {/* Origin Server */}
          <g transform="translate(555,100)">
            <rect width="120" height="75" rx="14" fill="url(#gradOrigin)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Origin</text>
            <text x="60" y="48" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="600">Server</text>
            <text x="60" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">源站</text>
          </g>

          {/* Object Storage */}
          <g transform="translate(555,210)">
            <rect width="120" height="65" rx="14" fill="url(#gradOrigin)" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="28" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="700">Object Storage</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">S3 / GCS</text>
          </g>

          {/* Arrows */}
          <path d="M132,177 C150,177 160,170 173,168" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <text x="152" y="165" textAnchor="middle" fill="#a5b4fc" fontSize="9">1. DNS 查詢</text>

          <path d="M312,170 C330,165 345,140 363,132" fill="none" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arrPurple)" />
          <text x="332" y="145" textAnchor="middle" fill="#a78bfa" fontSize="9">2. 揀 HK PoP</text>

          <path d="M430,175 C430,190 420,200 395,172" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen)" />
          <text x="440" y="192" fill="#34d399" fontSize="9">3. Cache Hit</text>

          <path d="M497,135 C520,130 535,128 553,130" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrYellow)" />
          <text x="525" y="122" textAnchor="middle" fill="#f59e0b" fontSize="9">Cache Miss</text>

          <path d="M615,175 C615,195 615,205 615,208" fill="none" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arrYellow)" />
          <text x="640" y="195" fill="#f59e0b" fontSize="9">拉資源</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px' }}>完整流程</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>用戶（香港）請求 static.example.com/image.jpg。DNS（GeoDNS）根據用戶 IP 嘅地理位置，返回最近嘅 Edge Server（香港 PoP）嘅 IP。呢步好關鍵——揀啱節點快好多。</span></li>
        <li><span className="step-num">2</span><span>用戶向香港 Edge Server 攞資源。如果 Edge 有 cache（Cache Hit），直接返回。重點係：Cache Hit 嘅速度通常只有幾毫秒。</span></li>
        <li><span className="step-num">3</span><span>如果 Edge 冇（Cache Miss），Edge 會去 Origin Server 或 Object Storage 拉資源，cache 落嚟，再返回畀用戶。之後其他用戶請求同一個資源就會 Cache Hit。</span></li>
      </ol>
    </div>
  );
}

function CacheTab() {
  return (
    <div className="card">
      <h2>快取策略</h2>
      <div className="subtitle">Cache-Control headers 同 Purge 機制——一定要識</div>
      <p>
        CDN 快取幾耐，由 <strong style={{ color: '#6366f1' }}>Cache-Control</strong> header 話事。例如 <code style={{ background: '#13151c', padding: '2px 6px', borderRadius: '4px' }}>max-age=3600</code> 表示 cache 1 小時。建議根據資源類型設定：圖片、影片可以 cache 耐啲（幾個月甚至一年）；HTML 可能要短啲，因為會經常更新。
      </p>
      <p>
        當更新咗資源（例如改咗 logo），就要做 <strong style={{ color: '#f87171' }}>Purge / Invalidation</strong>：通知 CDN 刪除舊 cache，下次請求就會去 Origin 拉新版本。呢個操作一定要識，唔係更新咗用戶都仲睇到舊嘢。
      </p>
      <div className="key-points">
        <div className="key-point">
          <h4>GeoDNS 路由</h4>
          <p>根據用戶 IP 嘅地理位置，返回最近 Edge 嘅 IP。CloudFlare、AWS CloudFront、Akamai 都支援。揀邊個 CDN 都會有呢個功能。</p>
        </div>
        <div className="key-point">
          <h4>Cache-Control headers</h4>
          <p>幾個關鍵值：max-age（幾耐過期）、no-cache（要驗證先用）、immutable（完全唔會變）。正確設定可以大幅提升 hit ratio。</p>
        </div>
        <div className="key-point">
          <h4>Cache hit ratio</h4>
          <p>Hit / (Hit + Miss)。越高越好，表示多數請求唔使去 Origin。建議目標要 &gt;90%，低過嘅話要檢查設定。</p>
        </div>
        <div className="key-point">
          <h4>Purge / Invalidation</h4>
          <p>更新內容後要 invalidate cache。可以按 URL、prefix、或者全站 purge。注意：有 quota 限制要留意，唔好亂 purge。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>幾個實戰要點</h2>
      <div className="subtitle">設計 CDN 架構嘅關鍵</div>
      <div className="key-points">
        <div className="key-point">
          <h4>GeoDNS 路由</h4>
          <p>用 anycast 或 GeoDNS，確保用戶連去最近嘅 PoP。常見嘅錯誤係忽略呢步，結果 latency 高到冇朋友。</p>
        </div>
        <div className="key-point">
          <h4>Cache-Control 策略</h4>
          <p>建議靜態資源用 max-age=31536000（1年）+ 檔名加 hash（例如 main.abc123.js），更新時換檔名自然會拉新版本。HTML 就用短 TTL 或 no-cache。</p>
        </div>
        <div className="key-point">
          <h4>監控 Cache hit ratio</h4>
          <p>要持續監控 hit ratio。如果低嘅話要檢查：TTL 是否太短？Purge 是否太密？URL 是否太多變化（例如帶 query string）？呢啲都係常見嘅「兇手」。</p>
        </div>
        <div className="key-point">
          <h4>Purge 策略</h4>
          <p>部署新版本時 purge 相關 URL。但更好嘅做法係用 versioned URL（/v2/image.jpg），可以完全避免 purge，直接換 path 就得。簡單又可靠。</p>
        </div>
      </div>
      <div className="use-case">
        <h4>CDN 供應商建議</h4>
        <p>CloudFlare（平、功能多，適合入門）、AWS CloudFront（整合 S3 好方便）、Akamai（老牌、企業級）、Fastly（edge computing 強）、Bunny CDN（性價比極高）。揀邊個要睇流量、預算同功能需求。</p>
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
        <h4>Prompt 1 — 設計 CDN 策略</h4>
        <div className="prompt-text">
          幫手設計一個完整嘅 CDN 策略，適用於 <span className="placeholder">[例如：電商網站 / 影片串流平台 / SaaS Dashboard]</span>。{'\n\n'}項目背景：{'\n'}- 主要用戶分佈地區：<span className="placeholder">[例如：亞太區為主，歐美為次]</span>{'\n'}- 靜態資源類型：<span className="placeholder">[例如：圖片、JS/CSS Bundle、影片、PDF]</span>{'\n'}- 預計每日流量：<span className="placeholder">[例如：50TB]</span>{'\n'}- Origin Server 位置：<span className="placeholder">[例如：AWS us-east-1]</span>{'\n\n'}需要設計嘅部分：{'\n'}1. GeoDNS 路由策略：點樣確保用戶連去最近嘅 PoP{'\n'}2. Cache-Control Header 策略：{'\n'}   - 圖片 / 影片：長 TTL + content hash 檔名{'\n'}   - HTML：短 TTL 或 no-cache{'\n'}   - API Response：按場景設定{'\n'}3. Origin Shield 配置（減少 Origin 壓力）{'\n'}4. CDN 供應商選擇建議（CloudFlare / CloudFront / Fastly）{'\n\n'}請提供具體嘅 HTTP Header 設定範例、DNS 配置、同預期嘅 Cache Hit Ratio 分析。
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實現 Cache Invalidation 策略</h4>
        <div className="prompt-text">
          幫手設計一套完整嘅 CDN Cache Invalidation 策略，解決「更新咗內容但用戶仲睇到舊版本」嘅問題。{'\n\n'}需要覆蓋嘅場景：{'\n'}1. 前端部署新版本（JS / CSS Bundle）{'\n'}2. 用戶上傳新嘅圖片（替換舊圖）{'\n'}3. 緊急修復：需要即時令所有 Edge 失效{'\n'}4. API Response Cache 更新{'\n\n'}建議方案對比：{'\n'}- Versioned URL（例如 main.abc123.js）vs Purge API{'\n'}- Tag-based Invalidation（Surrogate Key）{'\n'}- Soft Purge vs Hard Purge{'\n\n'}自動化需求：{'\n'}- CI/CD Pipeline 整合：部署時自動 invalidate 相關資源{'\n'}- CDN 供應商：<span className="placeholder">[例如：CloudFlare / CloudFront / Fastly]</span>{'\n'}- 監控 Cache Hit Ratio 嘅 Dashboard 設計{'\n\n'}請提供 CI/CD Pipeline 配置範例、Invalidation API 調用嘅 code、同監控 Alert 規則。
        </div>
      </div>
    </div>
  );
}

export default function CDN() {
  return (
    <>
      <TopicTabs
        title="CDN 內容分發網絡"
        subtitle="點樣用全球加速分發靜態資源"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'cache', label: '② 快取策略', content: <CacheTab /> },
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
