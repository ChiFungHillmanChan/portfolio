import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '點解 AI 對話越嚟越長之後，輸出質素會下降？',
    options: [
      { text: '因為 AI 嘅 GPU 過熱需要休息', correct: false, explanation: 'GPU 溫度同輸出質素冇直接關係，真正原因係 context window 有限' },
      { text: '因為 context window 有限，早期指令嘅 attention 權重會被稀釋', correct: true, explanation: '冇錯！AI 嘅 context window 有上限，對話越長，早期嘅 system prompt 同指示會被新 message 推走或者 attention 被分散，導致輸出走樣' },
      { text: '因為 AI 會自動降低回應質素嚟慳錢', correct: false, explanation: 'AI API 唔會主動降低質素，問題出喺 context window 嘅物理限制' },
      { text: '因為 AI 嘅記憶體會自動清除舊訊息', correct: false, explanation: 'AI 冇「記憶體清除」機制，但 context window 填滿後最早嘅內容會被截斷' },
    ],
  },
  {
    question: 'Checkpoint Summary 策略嘅核心概念係咩？',
    options: [
      { text: '每隔一段時間重新訓練 AI 模型', correct: false, explanation: '重新訓練模型唔係用戶層面可以做嘅嘢，Checkpoint 係指喺對話層面做總結' },
      { text: '定期叫 AI 總結目前進度，然後用 summary 開新對話', correct: true, explanation: '啱！Checkpoint Summary 就好似「存檔再讀檔」——將所有重要決策同進度濃縮成簡短 summary，用喺新對話嘅 context 入面，令 AI 重新獲得乾淨嘅 attention' },
      { text: '每次對話結束後刪除所有歷史記錄', correct: false, explanation: '刪除歷史會失去所有 context，Checkpoint 嘅重點係保留關鍵資訊' },
      { text: '將對話內容壓縮成 ZIP 檔案', correct: false, explanation: 'ZIP 壓縮係檔案層面嘅操作，同 AI context 管理冇關' },
    ],
  },
  {
    question: 'State File（例如 CONTEXT.md）同 Checkpoint Summary 嘅最大分別係咩？',
    options: [
      { text: 'State File 保存喺對話之外（持久化），Checkpoint 係對話內嘅臨時總結', correct: true, explanation: '正確！State File 係一個獨立嘅檔案，跨越多次對話都存在，唔會因為開新對話而消失。Checkpoint 係對話內做嘅即時總結，用嚟開新對話。兩者配合使用效果最好' },
      { text: '兩者完全一樣，只係叫法唔同', correct: false, explanation: '佢哋嘅持久性完全唔同——State File 存喺檔案系統，Checkpoint 存喺對話 context 入面' },
      { text: 'State File 只可以俾 AI 讀，Checkpoint 只可以俾人讀', correct: false, explanation: '兩者都可以俾 AI 同人讀寫，分別在於存儲位置同持久性' },
      { text: 'State File 用嚟管 token，Checkpoint 用嚟管質素', correct: false, explanation: '兩者都係為咗對抗 Context Rot，但透過唔同嘅持久化方式實現' },
    ],
  },
  {
    question: '當你感覺 AI 開始重複或者矛盾嘅時候，最正確嘅做法係咩？',
    options: [
      { text: '繼續對話，用更強硬嘅語氣提醒 AI', correct: false, explanation: '繼續硬撐只會令 context 更加膨脹，質素只會更差' },
      { text: '立即做 Checkpoint Summary，然後開新對話載入 State File + Summary', correct: true, explanation: '完全正確！一旦發現質素下降，最有效嘅做法係停低、總結、重開。新對話有乾淨嘅 context，AI 可以重新聚焦喺你嘅需求上' },
      { text: '換一個 AI 模型繼續', correct: false, explanation: '換模型唔會解決 context rot 問題，因為新模型一樣冇之前嘅 context' },
      { text: '刪除所有對話記錄重頭嚟', correct: false, explanation: '完全重頭嚟會失去所有進度，正確做法係先做 Checkpoint 保存關鍵資訊' },
    ],
  },
];

const relatedTopics = [
  { slug: 'skill-vs-agent', label: 'Skill vs Agent' },
  { slug: 'sdd-spec-driven-development', label: 'SDD 規格驅動開發' },
  { slug: 'ai-evaluation-loop', label: 'AI 評估迴圈' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Context Rot 係咩</h2>
      <div className="subtitle">長對話中 AI 輸出質素逐漸劣化嘅現象</div>
      <p>
        你有冇試過同 AI 傾咗好耐之後，佢開始「唔記得」你之前講嘅嘢？或者輸出質素越嚟越差，開始重複、矛盾、甚至忽略你早期嘅指示？呢個就係 <strong style={{ color: '#f87171' }}>Context Rot</strong>——上下文腐爛。
      </p>
      <p>原因好簡單：AI 嘅 context window 有限（例如 128K token）。當對話越嚟越長，早期嘅內容會被「推出」attention 嘅焦點範圍。AI 唔係真係「忘記」，而係注意力被稀釋咗，早期指令嘅影響力大幅下降。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <linearGradient id="gradWindow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f3d2e" />
              <stop offset="50%" stopColor="#3d2e0a" />
              <stop offset="100%" stopColor="#3d0f0f" />
            </linearGradient>
            <linearGradient id="qualityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x="350" y="30" textAnchor="middle" fill="#9ca3af" fontSize="12" fontWeight="600">Context Window 使用情況（隨時間推移）</text>

          {/* Context Window Box */}
          <rect x="50" y="50" width="600" height="80" rx="12" fill="url(#gradWindow)" stroke="#2a2d3a" strokeWidth="2" filter="url(#shadow)" />

          {/* Segments */}
          <rect x="55" y="55" width="80" height="70" rx="6" fill="rgba(16,185,129,0.3)" stroke="#10B981" strokeWidth="1" />
          <text x="95" y="85" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="600">System</text>
          <text x="95" y="100" textAnchor="middle" fill="#10B981" fontSize="9">Prompt</text>

          <rect x="140" y="55" width="100" height="70" rx="6" fill="rgba(16,185,129,0.2)" stroke="#34d399" strokeWidth="1" />
          <text x="190" y="85" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">Early</text>
          <text x="190" y="100" textAnchor="middle" fill="#34d399" fontSize="9">Instructions</text>

          <rect x="245" y="55" width="120" height="70" rx="6" fill="rgba(245,158,11,0.2)" stroke="#F59E0B" strokeWidth="1" />
          <text x="305" y="85" textAnchor="middle" fill="#F59E0B" fontSize="9" fontWeight="600">Mid Conv.</text>
          <text x="305" y="100" textAnchor="middle" fill="#F59E0B" fontSize="9">Context</text>

          <rect x="370" y="55" width="140" height="70" rx="6" fill="rgba(239,68,68,0.2)" stroke="#f87171" strokeWidth="1" />
          <text x="440" y="85" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="600">Recent Messages</text>
          <text x="440" y="100" textAnchor="middle" fill="#f87171" fontSize="9">(佔據大量 token)</text>

          <rect x="515" y="55" width="130" height="70" rx="6" fill="rgba(239,68,68,0.1)" stroke="#f87171" strokeWidth="1" strokeDasharray="4,3" />
          <text x="580" y="85" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="600">Token Limit</text>
          <text x="580" y="100" textAnchor="middle" fill="#9ca3af" fontSize="9">即將溢出</text>

          {/* Quality Line */}
          <text x="50" y="170" fill="#9ca3af" fontSize="11" fontWeight="600">Output Quality</text>

          {/* Quality degradation curve */}
          <path d="M50,220 C150,220 200,225 300,240 C400,255 500,275 650,285" fill="none" stroke="url(#qualityGrad)" strokeWidth="3" />

          {/* Quality labels */}
          <circle cx="100" cy="220" r="4" fill="#10B981" />
          <text x="100" y="210" textAnchor="middle" fill="#10B981" fontSize="9">高品質</text>

          <circle cx="350" cy="245" r="4" fill="#F59E0B" />
          <text x="350" y="235" textAnchor="middle" fill="#F59E0B" fontSize="9">開始走樣</text>

          <circle cx="600" cy="282" r="4" fill="#EF4444" />
          <text x="600" y="272" textAnchor="middle" fill="#EF4444" fontSize="9">嚴重劣化</text>

          {/* Time axis */}
          <line x1="50" y1="300" x2="650" y2="300" stroke="#2a2d3a" strokeWidth="1" />
          <text x="350" y="315" textAnchor="middle" fill="#9ca3af" fontSize="10">{'對話時間 →'}</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>早期指令被稀釋</strong>：對話開頭嘅 system prompt 同指示，隨住新 message 加入，attention 權重會持續下降。</span></li>
        <li><span className="step-num">2</span><span><strong>Token 預算耗盡</strong>：Context window 有限，一旦填滿，最早嘅內容會被截斷或者壓縮，重要指令可能直接消失。</span></li>
        <li><span className="step-num">3</span><span><strong>輸出品質崩塌</strong>：當 AI 「睇唔到」你嘅原始需求，就會開始產生矛盾、重複、或者偏離方向嘅回應。</span></li>
      </ol>
    </div>
  );
}

function SolutionsTab() {
  return (
    <div className="card">
      <h2>三大解法</h2>
      <div className="subtitle">實用策略對抗 Context Rot</div>
      <div className="key-points">
        <div className="key-point">
          <h4>解法一：Context Budget 預算管理</h4>
          <p>追蹤每次對話嘅 token 使用量。當用到 context window 嘅 60-70% 時，主動觸發清理。可以用 tiktoken 計算 token 數，設定硬性上限。關鍵係「預防勝於治療」——唔好等到爆先處理。</p>
        </div>
        <div className="key-point">
          <h4>解法二：Checkpoint Summary 檢查點總結</h4>
          <p>每隔一段時間（例如每 10 輪對話），叫 AI 總結目前為止嘅所有決定同進度。然後用呢個 summary 開一個新對話。效果等同「存檔再讀檔」，context 重新變得乾淨。</p>
        </div>
        <div className="key-point">
          <h4>解法三：State File 狀態檔案</h4>
          <p>將所有關鍵決策、架構選擇、命名規範寫入一個檔案（例如 DECISIONS.md）。每次新對話時將呢個檔案作為 context 載入。呢個係最持久嘅方法，因為資訊保存喺對話之外。</p>
        </div>
        <div className="key-point">
          <h4>組合使用效果最佳</h4>
          <p>三種方法唔係互斥嘅。最佳實踐係三招齊用：用 Budget 控制長度，用 Checkpoint 定期刷新，用 State File 持久保存。呢個 combo 可以將 Context Rot 嘅影響降到最低。</p>
        </div>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰流程：Step-by-Step 應用</h2>
      <div className="subtitle">喺真實 coding workflow 入面點樣對抗 Context Rot</div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>開始前：建立 State File</strong>——喺 project 根目錄建 CONTEXT.md，記錄：項目目標、技術棧、架構決策、命名規範、已完成嘅功能。每次開新 AI 對話時，首先載入呢個檔案。</span></li>
        <li><span className="step-num">2</span><span><strong>設定 Token Budget</strong>——喺對話開頭就同 AI 講：「呢個對話嘅 token budget 係 50K。當你覺得接近限制時，主動提醒我做 checkpoint。」呢樣 AI 會幫你監控。</span></li>
        <li><span className="step-num">3</span><span><strong>每完成一個功能：做 Checkpoint</strong>——叫 AI 用 3-5 句總結剛剛做咗咩、有咩決策、下一步要做咩。將呢個 summary 加入 CONTEXT.md。</span></li>
        <li><span className="step-num">4</span><span><strong>感覺質素下降時：重開對話</strong>——唔好硬撐。一旦 AI 開始重複或者矛盾，立即做一個完整嘅 checkpoint summary，然後開新對話，載入 CONTEXT.md + summary。</span></li>
        <li><span className="step-num">5</span><span><strong>收工前：更新 State File</strong>——將今日所有嘅決策同進度整理返入 CONTEXT.md。第二日開工時，AI 可以無縫接上。</span></li>
      </ol>

      <div className="use-case">
        <h4>實際效果</h4>
        <p>用呢個 workflow 之後，長達幾日嘅開發項目都可以保持 AI 輸出質素一致。唔會再出現「AI 忘記咗架構決策」或者「推翻之前講好嘅命名規範」嘅情況。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，管理好你嘅 Context</div>

      <div className="prompt-card">
        <h4>Prompt 1 — Checkpoint Summary 生成器</h4>
        <div className="prompt-text">
          {'請幫我總結目前為止嘅對話內容，用以下格式：\n\n## Checkpoint Summary\n\n### 項目背景\n（一句話描述項目）\n\n### 已完成嘅決策\n- 決策 1：...\n- 決策 2：...\n\n### 技術選擇\n- 用咩技術棧 + 原因\n\n### 已完成嘅功能\n- 功能 1：（狀態：完成/進行中）\n- 功能 2：...\n\n### 未解決嘅問題\n- 問題 1：...\n\n### 下一步行動\n- [ ] 下一步 1\n- [ ] 下一步 2\n\n注意：呢個 summary 會用喺新對話嘅 context 入面，所以要包含所有重要資訊，但盡量精簡，控制喺 500 字以內。'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — State File 模板</h4>
        <div className="prompt-text">
          {'幫我建立一個 CONTEXT.md 檔案，用嚟保存項目嘅所有關鍵決策同上下文。\n\n項目名稱：[項目名]\n項目描述：[一兩句描述]\n技術棧：[列出技術棧]\n\n請用以下結構：\n\n# Project Context — [項目名]\n\n## 核心目標\n（項目要達成咩）\n\n## 架構決策記錄 (ADR)\n| 編號 | 決策 | 原因 | 日期 |\n|------|------|------|------|\n\n## 命名規範\n- 檔案命名：...\n- 變數命名：...\n- API endpoint：...\n\n## 已知限制 / Tradeoffs\n- ...\n\n## 進度追蹤\n- [x] 已完成項目\n- [ ] 待做項目\n\n每次 AI 對話開始時載入呢個檔案，每次結束時更新佢。'}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — Context Budget 監控指令</h4>
        <div className="prompt-text">
          {'喺呢個對話入面，請你幫我監控 context 使用情況：\n\n1. 呢個對話嘅 token budget 係 [50K / 80K / 100K]\n2. 當你估計用咗 60% budget 時，提醒我：「建議做 checkpoint」\n3. 當你估計用咗 80% budget 時，自動生成 checkpoint summary\n4. 每次回應嘅結尾加一行：[Context: ~XX% used]\n\n如果我嘅 prompt 太長，建議我點樣精簡。如果之前嘅對話有重複嘅內容，幫我指出邊啲可以清理。'}
        </div>
      </div>
    </div>
  );
}

export default function ContextRotSolution() {
  return (
    <>
      <TopicTabs
        title="Context Rot 解法"
        subtitle="AI 對話越嚟越長，質素越嚟越差？呢度有三招解決"
        tabs={[
          { id: 'overview', label: '① Context Rot 係咩', content: <OverviewTab /> },
          { id: 'solutions', label: '② 三大解法', content: <SolutionsTab /> },
          { id: 'practice', label: '③ 實戰流程', premium: true, content: <PracticeTab /> },
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
