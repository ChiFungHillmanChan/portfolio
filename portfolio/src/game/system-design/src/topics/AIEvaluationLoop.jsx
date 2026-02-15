import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'skill-vs-agent', label: 'Skill vs Agent' },
  { slug: 'context-rot-solution', label: 'Context Rot 解法' },
  { slug: 'sdd-spec-driven-development', label: 'SDD 規格驅動開發' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>點解一定要評估 AI 輸出</h2>
      <div className="subtitle">冇評估 = 盲飛，你根本唔知 AI 做得好唔好</div>
      <p>
        大部分人用 AI 嘅方式係：俾個 prompt，睇下 output，「感覺」OK 就用。但呢種「vibes-based」嘅評估方式有個致命問題——<strong style={{ color: '#f87171' }}>你嘅感覺會隨心情、時間壓力改變</strong>。今日覺得 OK 嘅 output，聽日可能覺得完全唔得。
      </p>
      <p>AI 評估迴圈嘅核心概念係：<strong style={{ color: '#34d399' }}>將「感覺」變成「數據」</strong>。設計一套評分標準（Rubric），用固定嘅 golden samples 做基準，然後系統化地評估每次 AI 輸出。呢樣你先可以知道 prompt 改動有冇真正改善結果。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 350" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradInput" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAI2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradEval" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2e1a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradScore" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrLoop" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" /></marker>
          </defs>

          <text x="350" y="30" textAnchor="middle" fill="#9ca3af" fontSize="12" fontWeight="600">AI 評估迴圈 (Eval Loop)</text>

          <g transform="translate(50,60)">
            <rect width="130" height="80" rx="14" fill="url(#gradInput)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Prompt</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">輸入任務</text>
            <text x="65" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">+ Golden Sample</text>
          </g>

          <g transform="translate(280,60)">
            <rect width="130" height="80" rx="14" fill="url(#gradAI2)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow)" />
            <text x="65" y="28" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="700">AI Output</text>
            <text x="65" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">生成結果</text>
            <text x="65" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">（待評估）</text>
          </g>

          <g transform="translate(510,60)">
            <rect width="140" height="80" rx="14" fill="url(#gradEval)" stroke="#6366f1" strokeWidth="2.5" filter="url(#glowPurple)" />
            <text x="70" y="28" textAnchor="middle" fill="#6366f1" fontSize="12" fontWeight="700">Evaluation</text>
            <text x="70" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">Rubric 評分</text>
            <text x="70" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">+ 自動化檢查</text>
          </g>

          <g transform="translate(300,220)">
            <rect width="140" height="80" rx="14" fill="url(#gradScore)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="70" y="28" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="700">Score</text>
            <text x="70" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">分數 + 分析</text>
            <text x="70" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">邊度要改善</text>
          </g>

          <path d="M182,100 L278,100" fill="none" stroke="#F59E0B" strokeWidth="2" markerEnd="url(#arrAmber2)" />
          <path d="M412,100 L508,100" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrLoop)" />
          <path d="M580,142 C580,180 440,200 440,218" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen3)" />
          <path d="M300,260 C200,260 100,220 100,142" fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="5,3" markerEnd="url(#arrLoop)" />
          <text x="155" y="240" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="600">改進 Prompt</text>
          <text x="155" y="255" textAnchor="middle" fill="#f87171" fontSize="10">再跑一次</text>

          <g transform="translate(50,310)">
            <line x1="0" y1="0" x2="20" y2="0" stroke="#F59E0B" strokeWidth="2" />
            <text x="28" y="4" fill="#9ca3af" fontSize="10">正向流程</text>
            <line x1="120" y1="0" x2="140" y2="0" stroke="#f87171" strokeWidth="2" strokeDasharray="5,3" />
            <text x="148" y="4" fill="#9ca3af" fontSize="10">回饋改進</text>
          </g>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>冇評估就冇改進</strong>：你改咗 prompt 之後，點知新 prompt 好過舊 prompt？靠感覺？唔得。你需要一個可量化嘅評分系統。</span></li>
        <li><span className="step-num">2</span><span><strong>Golden Sample 係基準</strong>：揀 5-10 個代表性嘅 input，人手寫出「完美 output」。呢啲就係你嘅 golden sample，用嚟同 AI output 做對比。</span></li>
        <li><span className="step-num">3</span><span><strong>迴圈改進</strong>：評估 → 搵出弱點 → 改 prompt → 再評估。呢個 loop 跑幾次之後，output 質素會顯著提升。唔係一次過搞掂，而係持續改進。</span></li>
      </ol>
    </div>
  );
}

function FrameworkTab() {
  return (
    <div className="card">
      <h2>評估框架</h2>
      <div className="subtitle">四個核心組件，建立完整嘅 Eval 系統</div>
      <div className="key-points">
        <div className="key-point">
          <h4>Rubric 評分標準</h4>
          <p>定義明確嘅評分維度同分數。例如 code review 嘅 rubric：準確性（0-5）、完整性（0-5）、可操作性（0-5）、語氣（0-5）。每個分數都要有明確嘅描述——例如「5 分 = 指出所有 bug 並提供修復建議」。</p>
        </div>
        <div className="key-point">
          <h4>Golden Samples 黃金樣本</h4>
          <p>人手建立 5-10 個「完美 output」作為基準。揀嘅 sample 要覆蓋唔同嘅 edge case：簡單 case、複雜 case、邊界 case。AI output 會同呢啲 golden sample 做比較嚟評分。</p>
        </div>
        <div className="key-point">
          <h4>A/B Testing</h4>
          <p>同時跑兩個版本嘅 prompt，用同一套 golden samples 評分。邊個 prompt 嘅平均分高就用邊個。呢個方法可以避免「改 prompt 改到越改越差」嘅問題——每次改動都有數據支撐。</p>
        </div>
        <div className="key-point">
          <h4>Automated Scoring 自動化評分</h4>
          <p>用另一個 AI 做評分員（LLM-as-Judge），或者寫 script 做自動化檢查。例如：code output 可以自動跑 lint + test；文字 output 可以用 LLM 根據 rubric 打分。目標係減少人手評估嘅成本。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>評估頻率建議</h4>
        <p>唔需要每次都做完整評估。建議：大改 prompt 時做完整 eval（跑所有 golden samples）；小改 prompt 時做快速 eval（跑 3 個核心 samples）。重點係保持「改動 → 評估」嘅習慣。</p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰流程：建立 Code Review 嘅 Eval Loop</h2>
      <div className="subtitle">完整示範點樣評估 AI Code Review 嘅質素</div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>定義 Rubric</strong>：Code Review 嘅四個評分維度——Bug Detection（搵到幾多真實 bug）0-5 分、False Positive Rate（幾多 comment 係無用嘅）0-5 分、Actionability（建議可唔可以直接用）0-5 分、Prioritization（重要嘅問題有冇排先）0-5 分。</span></li>
        <li><span className="step-num">2</span><span><strong>建立 Golden Samples</strong>：搵 5 個真實嘅 PR diff，人手寫出「完美嘅 review comment」。包括：一個有安全漏洞嘅 diff、一個有性能問題嘅 diff、一個冇問題嘅 diff（測試 AI 會唔會 over-flag）、一個有多個小問題嘅 diff、一個有架構設計問題嘅 diff。</span></li>
        <li><span className="step-num">3</span><span><strong>跑 Baseline Eval</strong>：用你現有嘅 prompt 跑一次所有 golden samples。記錄每個維度嘅分數。呢個就係你嘅 baseline——之後嘅所有改進都同呢個比。</span></li>
        <li><span className="step-num">4</span><span><strong>改進 Prompt 同再 Eval</strong>：根據 baseline 嘅弱項改 prompt。例如如果 Bug Detection 得 2 分，就加入「請特別留意 null check、race condition、SQL injection」嘅指示。改完之後再跑一次 eval，比較分數。</span></li>
        <li><span className="step-num">5</span><span><strong>設置 Automated Check</strong>：寫一個 script，每次改 prompt 後自動跑所有 golden samples 同評分。可以用 LLM-as-Judge：將 AI output 同 golden sample 一齊俾另一個 AI，叫佢根據 rubric 打分。</span></li>
      </ol>

      <div className="use-case">
        <h4>實際效果</h4>
        <p>經過 3-4 輪 eval loop，Code Review prompt 嘅平均分通常可以從 12/20 提升到 17/20。最大嘅改善通常出現喺 False Positive Rate——加入「唔好 flag style preference，只 flag real issues」嘅指示後，無用 comment 大幅減少。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，建立你嘅 Eval 系統</div>

      <div className="prompt-card">
        <h4>Prompt 1 — Rubric 設計器</h4>
        <div className="prompt-text">幫我設計一個評估 Rubric，用嚟衡量 AI 喺以下任務嘅輸出質素：{'\n\n'}任務描述：<span className="placeholder">[描述 AI 要做嘅任務，例如：Code Review / 寫技術文檔 / 生成 SQL query]</span>{'\n'}目標用戶：<span className="placeholder">[邊個會用 AI 嘅 output，例如：開發者 / 產品經理 / 終端用戶]</span>{'\n\n'}請設計一個 4-6 維度嘅 Rubric，每個維度：{'\n'}1. 維度名稱{'\n'}2. 權重（所有維度加埋 = 100%）{'\n'}3. 0-5 分嘅評分定義（每個分數都要有具體描述）{'\n'}4. 2-3 個具體例子（「呢個算 X 分因為...」）{'\n\n'}然後俾我一個 scoring template，方便我每次評估時直接填分。{'\n\n'}格式範例：{'\n'}| 維度 | 權重 | 分數 | 理由 |{'\n'}|------|------|------|------|{'\n'}| ... | ... | /5 | ... |{'\n'}| **總分** | | **/5** | |</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — LLM-as-Judge 評分器</h4>
        <div className="prompt-text">你係一個 AI 輸出質素評估員。請根據以下 Rubric 評估呢個 AI Output：{'\n\n'}### 任務描述{'\n'}<span className="placeholder">[原始任務 / prompt]</span>{'\n\n'}### AI Output（待評估）{'\n'}<span className="placeholder">[貼入 AI 嘅 output]</span>{'\n\n'}### Golden Sample（參考答案）{'\n'}<span className="placeholder">[貼入人手寫嘅理想 output]</span>{'\n\n'}### Rubric{'\n'}<span className="placeholder">[貼入你嘅評分標準]</span>{'\n\n'}請逐個維度評分，並且：{'\n'}1. 俾出每個維度嘅分數 + 具體理由{'\n'}2. 指出 AI Output 同 Golden Sample 嘅主要差異{'\n'}3. 俾出 3 個具體改善建議（點樣改 prompt 可以提升分數）{'\n'}4. 算出加權總分</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — Golden Sample 生成助手</h4>
        <div className="prompt-text">幫我建立一組 Golden Samples，用嚟評估 AI 喺以下任務嘅表現：{'\n\n'}任務：<span className="placeholder">[任務描述]</span>{'\n'}預計 edge cases：<span className="placeholder">[列出你知道嘅 edge case]</span>{'\n\n'}請生成 5 個 Golden Sample，覆蓋：{'\n'}1. 一個簡單、標準嘅 case{'\n'}2. 一個複雜嘅 case{'\n'}3. 一個 edge case / 邊界情況{'\n'}4. 一個「陷阱」case（容易出錯嘅）{'\n'}5. 一個「冇嘢做」嘅 case（測試 AI 會唔會過度反應）{'\n\n'}每個 sample 包括：{'\n'}- Input（餵俾 AI 嘅內容）{'\n'}- Expected Output（理想嘅 AI 回應）{'\n'}- Key Points（一定要包含嘅重點）{'\n'}- Common Mistakes（AI 常見嘅錯誤）</div>
      </div>
    </div>
  );
}

export default function AIEvaluationLoop() {
  return (
    <>
      <TopicTabs
        title="AI 評估迴圈"
        subtitle="點樣系統化地衡量 AI 輸出質素，持續改進結果"
        tabs={[
          { id: 'overview', label: '① 點解要評估', content: <OverviewTab /> },
          { id: 'framework', label: '② 評估框架', content: <FrameworkTab /> },
          { id: 'practice', label: '③ 實戰流程', premium: true, content: <PracticeTab /> },
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
