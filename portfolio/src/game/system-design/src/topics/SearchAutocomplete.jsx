import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const relatedTopics = [
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'distributed-cache', label: 'Distributed Cache 分佈式快取' },
  { slug: 'scale-reads', label: '擴展讀取能力' },
  { slug: 'large-api-response', label: 'Large API Response 處理' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>自動補全係咩</h2>
      <div className="subtitle">喺 Google 打字，出現嘅建議就係 Autocomplete</div>
      <p>
        呢個功能好常見：喺 Google 搜尋框打 "how to"，即刻彈出 "how to tie a tie"、"how to cook rice" 等建議。呢個功能背後嘅核心數據結構叫 <strong style={{ color: '#34d399' }}>Trie（前綴樹）</strong>，配合搜索頻率排名，就可以做到毫秒級嘅即時建議。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 780 300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#3B82F6" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.3" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowTrie" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#EF4444" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a3a2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a1a1a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradYellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a351a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" /></marker>
            <marker id="arrPurple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8B5CF6" /></marker>
          </defs>

          <g transform="translate(30,110)">
            <rect width="120" height="70" rx="12" fill="url(#gradBlue)" stroke="#3B82F6" strokeWidth="2" filter="url(#glowBlue)" />
            <text x="60" y="28" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Search</text>
            <text x="60" y="46" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Input</text>
            <text x="60" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">搜尋框</text>
          </g>

          <g transform="translate(220,100)">
            <rect width="150" height="80" rx="12" fill="url(#gradGreen)" stroke="#10B981" strokeWidth="2" filter="url(#glowGreen)" />
            <text x="75" y="28" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Autocomplete</text>
            <text x="75" y="46" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Service</text>
            <text x="75" y="68" textAnchor="middle" fill="#9ca3af" fontSize="10">自動補全服務</text>
          </g>

          <g transform="translate(450,50)">
            <rect width="140" height="60" rx="12" fill="url(#gradRed)" stroke="#EF4444" strokeWidth="2" filter="url(#glowTrie)" />
            <text x="70" y="25" textAnchor="middle" fill="#EF4444" fontSize="13" fontWeight="700">Trie</text>
            <text x="70" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">In-Memory 前綴樹</text>
          </g>

          <g transform="translate(450,170)">
            <rect width="140" height="60" rx="12" fill="url(#gradYellow)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="25" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Ranking</text>
            <text x="70" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">頻率排名</text>
          </g>

          <g transform="translate(640,110)">
            <rect width="120" height="60" rx="12" fill="url(#gradPurple)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="25" textAnchor="middle" fill="#8B5CF6" fontSize="12" fontWeight="700">Query Logs</text>
            <text x="60" y="45" textAnchor="middle" fill="#9ca3af" fontSize="10">搜索日誌</text>
          </g>

          <path d="M152,145 C185,142 195,140 218,140" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrBlue)" />
          <text x="185" y="130" textAnchor="middle" fill="#a5b4fc" fontSize="10">Prefix</text>

          <path d="M372,125 C400,110 425,95 448,85" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arrGreen)" />
          <text x="420" y="98" fill="#34d399" fontSize="10">Lookup</text>

          <path d="M372,155 C400,170 425,185 448,195" stroke="#fbbf24" strokeWidth="1.5" fill="none" markerEnd="url(#arrYellow)" />
          <text x="420" y="185" fill="#fbbf24" fontSize="10">Sort</text>

          <path d="M592,200 C610,185 625,170 638,155" stroke="#8B5CF6" strokeWidth="1.5" fill="none" markerEnd="url(#arrPurple)" />
          <text x="630" y="185" fill="#a5b4fc" fontSize="10">Update freq</text>
        </svg>
      </div>

      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 12 }}>成個流程一覽</h3>
      <ol className="steps">
        <li><span className="step-num">1</span><span>首先，用戶打字，每個字母都觸發一次 Autocomplete 查詢（例如打 "h" → "ho" → "how"）。後面會講點用 debounce 優化呢度。</span></li>
        <li><span className="step-num">2</span><span>Autocomplete Service 喺 Trie 入面搵到所有以呢個前綴開頭嘅詞語。重點係，Trie 係放喺 memory 入面嘅，所以查詢極快。</span></li>
        <li><span className="step-num">3</span><span>Ranking Service 根據搜索頻率排序，返回 Top 5-10 個建議俾用戶。呢個排名直接影響用戶體驗。</span></li>
        <li><span className="step-num">4</span><span>最後，用戶嘅每次搜索都被記錄到 Query Logs，定期用嚟更新 Trie 入面嘅頻率數據。呢個係一個持續改進嘅循環。</span></li>
      </ol>
    </div>
  );
}

function TrieTab() {
  return (
    <div className="card">
      <h2>Trie 數據結構詳解</h2>
      <div className="subtitle">專門為前綴搜索而生嘅樹狀結構</div>
      <p>Trie（讀做 "try"）係一棵樹，每個節點代表一個字元。從 root 行到任何一個節點，經過嘅字元串起嚟就係一個前綴。呢個概念必須要記入腦。</p>
      <p>用一個例子嚟解釋。假設存咗 "tree", "try", "true" 三個詞：</p>
      <p style={{ fontFamily: 'monospace', color: '#34d399', fontSize: '0.9rem', lineHeight: 2 }}>
        {'root → t → r → e → e ✓'}<br />
        {'             → y ✓'}<br />
        {'             → u → e ✓'}
      </p>
      <p>打 "tr" 就可以搵到呢三個詞。每個終點節點仲可以存一個 frequency count，代表呢個詞被搜索過幾多次。面試嘅時候喺白板上畫呢個圖，會令面試官好有印象。</p>

      <div className="use-case">
        <h4>記憶體考量</h4>
        <p>Trie 放喺記憶體（In-Memory）入面，查詢速度係 O(prefix_length)，超快！但要留意，如果詞彙量超大，可能要用壓縮 Trie（Radix Tree）或者分片存儲。呢個係 scale 嘅時候一定要考慮嘅問題。</p>
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
          <h4>Debounce 防抖</h4>
          <p>呢一點好重要：唔好每打一個字就發一個 Request！必須用 debounce（延遲 200-300ms），等用戶停低打字先發送。呢個簡單嘅優化可以大幅減少請求次數，面試一定要提。</p>
        </div>
        <div className="key-point">
          <h4>定期更新 Trie</h4>
          <p>建議每隔幾小時從 Query Logs 收集數據，重新計算詞頻，更新 Trie。重點係：唔好每次搜索都即時更新，咁做太浪費資源，而且會影響查詢性能。</p>
        </div>
        <div className="key-point">
          <h4>個人化建議</h4>
          <p>進階技巧：可以結合用戶嘅搜索歷史，優先顯示之前搜過嘅關鍵字。需要 per-user 嘅小型 Trie，呢個會令用戶體驗好好多。</p>
        </div>
        <div className="key-point">
          <h4>敏感詞過濾</h4>
          <p>呢個安全考量必須要記住：自動補全建議入面唔可以出現不雅內容。建議設計一個 blocklist（黑名單）做過濾，呢個係 production 環境嘅必備功能。</p>
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
        <h4>Prompt 1 — 用 Trie 建立 Search Autocomplete</h4>
        <div className="prompt-text">
          {'用 '}<span className="placeholder">[TypeScript / Python / Go]</span>{' 實現一個 Search Autocomplete 系統。\n\n'}
          {'核心要求：\n'}
          {'- 用 Trie（前綴樹）做 in-memory 數據結構\n'}
          {'- 每個節點儲存 frequency count，支援按搜索頻率排序\n'}
          {'- 提供 insert(word, frequency) 同 search(prefix, topK) 兩個 API\n'}
          {'- search 返回 Top '}<span className="placeholder">[5 / 10]</span>{' 個最高頻嘅建議詞\n'}
          {'- 實現 Trie 嘅壓縮版本（Radix Tree）以節省記憶體\n'}
          {'- 前端用 debounce（'}<span className="placeholder">[200ms / 300ms]</span>{'）控制請求頻率\n'}
          {'- 寫埋完整嘅 REST API 同前端搜尋框 UI\n'}
          {'- 包含單元測試，測試空前綴、單字前綴、完整匹配等 edge case'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Typeahead Suggestion 系統</h4>
        <div className="prompt-text">
          {'設計一個完整嘅 Typeahead Suggestion 系統，支援大規模搜索場景。\n\n'}
          {'系統規格：\n'}
          {'- 預計詞庫大小：'}<span className="placeholder">[100 萬 / 1000 萬]</span>{' 個關鍵詞\n'}
          {'- 用 Elasticsearch 做後端搜索引擎\n'}
          {'- 支援模糊匹配（typo tolerance）同中英文混合搜索\n'}
          {'- 實現個人化建議（結合用戶搜索歷史）\n'}
          {'- 加入敏感詞過濾（blocklist 機制）\n'}
          {'- 用 Redis 做 hot query cache，減少 Elasticsearch 壓力\n'}
          {'- 設計 Query Log 收集 pipeline，定期更新搜索頻率\n'}
          {'- 技術棧：'}<span className="placeholder">[Node.js / Python]</span>{' + Elasticsearch + Redis\n'}
          {'- 畫出完整嘅系統架構圖同數據流'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — 前端即時搜尋體驗優化</h4>
        <div className="prompt-text">
          {'用 '}<span className="placeholder">[React / Vue / Vanilla JS]</span>{' 建立一個高效能嘅前端搜尋自動補全組件。\n\n'}
          {'功能需求：\n'}
          {'- 搜尋框輸入時即時顯示建議列表\n'}
          {'- 實現 debounce（300ms）避免過多 API 請求\n'}
          {'- 支援鍵盤導航（上下箭頭選擇、Enter 確認、Esc 關閉）\n'}
          {'- 高亮顯示匹配嘅前綴部分\n'}
          {'- 顯示搜索歷史（localStorage 儲存最近 '}<span className="placeholder">[10 / 20]</span>{' 條）\n'}
          {'- 處理 race condition（確保顯示最新一次請求嘅結果）\n'}
          {'- 支援 loading 狀態同空結果提示\n'}
          {'- 完全 accessible（ARIA attributes、screen reader 支援）'}
        </div>
      </div>
    </div>
  );
}

export default function SearchAutocomplete() {
  return (
    <>
      <TopicTabs
        title="Search Autocomplete 搜尋自動補全"
        subtitle="用 Trie 結構同 ranking 演算法實現即時建議"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'trie', label: '② Trie 數據結構', content: <TrieTab /> },
          { id: 'practice', label: '③ 實戰要點', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
