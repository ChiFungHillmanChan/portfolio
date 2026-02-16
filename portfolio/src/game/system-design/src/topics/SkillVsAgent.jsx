import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Skill 模式同 Agent 模式嘅最核心分別係咩？',
    options: [
      { text: 'Skill 用平啲嘅 AI 模型，Agent 用貴嘅', correct: false, explanation: '價錢唔係核心分別，兩者都可以用同一個模型。關鍵在於任務執行方式嘅唔同' },
      { text: 'Skill 係 deterministic（結果穩定可預測），Agent 係 non-deterministic（AI 自主決策）', correct: true, explanation: '完全正確！Skill 好似 function call——固定 input 產生穩定 output。Agent 就好似自主探索——AI 自己決定下一步做咩，結果唔可預測。揀錯模式會浪費成本或者出錯' },
      { text: 'Skill 只可以處理文字，Agent 可以處理圖片', correct: false, explanation: '兩者都可以處理多種 input 類型，分別在於任務執行嘅確定性' },
      { text: 'Agent 一定好過 Skill，因為更靈活', correct: false, explanation: '唔係！用 Agent 做 Skill 嘅嘢會浪費 token 成本，用 Skill 做 Agent 嘅嘢會出錯。各有最適合嘅場景' },
    ],
  },
  {
    question: '以下邊個任務最適合用 Skill 模式？',
    options: [
      { text: 'Debug 一個未知嘅 production bug', correct: false, explanation: 'Debug 需要探索、推理、嘗試唔同假設，屬於 Agent 模式嘅場景' },
      { text: '設計一個新嘅 microservice 架構', correct: false, explanation: '架構設計需要考慮 tradeoff、探索唔同方案，係 Agent 場景' },
      { text: '用固定 template 對每個 PR diff 做 code review', correct: true, explanation: '啱！Code Review 有明確嘅 input（diff）同 output（review comments），規則固定（檢查 style、security、performance），每次做法一樣。完美符合 Skill 嘅定義：結構化、可重複、input/output 明確' },
      { text: '分析公司嘅 tech debt 並提出重構方案', correct: false, explanation: '呢個需要深度分析同創意思考，每個公司情況唔同，屬於 Agent 場景' },
    ],
  },
  {
    question: 'Hybrid 模式（Agent + Skill 混合）嘅最佳實踐係點樣嘅？',
    options: [
      { text: '先用 Skill 做所有嘢，搞唔掂再用 Agent', correct: false, explanation: '唔係按「搞唔搞得掂」嚟揀，而係按任務性質分工' },
      { text: '先用 Agent 做規劃同決策，再用 Skill 做執行同重複性工作', correct: true, explanation: '正確！Agent 擅長規劃（分析 schema 差異、設計遷移策略），Skill 擅長執行（按 plan 逐步跑 migration script）。呢樣可以同時攞到 Agent 嘅靈活性同 Skill 嘅穩定性' },
      { text: '同一個任務交替用 Agent 同 Skill', correct: false, explanation: '唔係交替用，而係按任務嘅唔同階段（規劃 vs 執行）分配最適合嘅模式' },
      { text: 'Hybrid 就係將 Agent 同 Skill 嘅結果取平均', correct: false, explanation: 'Hybrid 唔係取平均，而係唔同階段用唔同模式' },
    ],
  },
];

const relatedTopics = [
  { slug: 'context-rot-solution', label: 'Context Rot 解法' },
  { slug: 'sdd-spec-driven-development', label: 'SDD 規格驅動開發' },
  { slug: 'ai-evaluation-loop', label: 'AI 評估迴圈' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Skill vs Agent 係咩</h2>
      <div className="subtitle">兩種完全唔同嘅 AI 任務執行模式</div>
      <p>
        用 AI 做嘢嘅時候，唔係所有任務都應該用同一種方式。<strong style={{ color: '#34d399' }}>Skill</strong> 係指可重複、有明確輸入輸出嘅結構化任務——好似一個 function call，你俾 input，佢俾 output，每次結果都穩定。<strong style={{ color: '#F59E0B' }}>Agent</strong> 就係探索式、自主嘅任務執行——AI 自己決定下一步做咩，適合處理模糊同複雜嘅問題。
      </p>
      <p>簡單講：Skill 係「你話佢做」，Agent 係「你話個目標，佢自己搵路」。揀錯模式，輕則浪費 token，重則出錯都唔知。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 700 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#10B981" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradTask" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradSkill" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradAgent" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" /></marker>
          </defs>

          <g transform="translate(30,145)">
            <rect width="120" height="75" rx="14" fill="url(#gradTask)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="30" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Task</text>
            <text x="60" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">任務輸入</text>
          </g>

          <g transform="translate(250,155)">
            <polygon points="60,0 120,40 60,80 0,40" fill="#1a1d27" stroke="#6366f1" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="36" textAnchor="middle" fill="#a5b4fc" fontSize="11" fontWeight="700">任務分類</text>
            <text x="60" y="50" textAnchor="middle" fill="#9ca3af" fontSize="9">清晰 or 模糊?</text>
          </g>

          <g transform="translate(490,40)">
            <rect width="160" height="100" rx="14" fill="url(#gradSkill)" stroke="#10B981" strokeWidth="2.5" filter="url(#glowGreen)" />
            <text x="80" y="28" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">Skill</text>
            <text x="80" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">結構化、可重複</text>
            <text x="80" y="64" textAnchor="middle" fill="#9ca3af" fontSize="10">明確 Input/Output</text>
            <text x="80" y="80" textAnchor="middle" fill="#9ca3af" fontSize="10">成本低、速度快</text>
          </g>

          <g transform="translate(490,210)">
            <rect width="160" height="100" rx="14" fill="url(#gradAgent)" stroke="#F59E0B" strokeWidth="2.5" filter="url(#glowAmber)" />
            <text x="80" y="28" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="700">Agent</text>
            <text x="80" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">探索式、自主決策</text>
            <text x="80" y="64" textAnchor="middle" fill="#9ca3af" fontSize="10">處理模糊需求</text>
            <text x="80" y="80" textAnchor="middle" fill="#9ca3af" fontSize="10">成本高、彈性大</text>
          </g>

          <path d="M152,182 C190,182 210,195 248,195" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <path d="M370,175 C410,155 440,110 488,95" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#arrGreen)" />
          <text x="420" y="125" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">清晰任務</text>
          <path d="M370,215 C410,235 440,250 488,258" fill="none" stroke="#F59E0B" strokeWidth="1.5" markerEnd="url(#arrAmber)" />
          <text x="420" y="260" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="600">模糊任務</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>Skill 模式</strong>：任務有明確嘅 input/output 格式，每次執行結果穩定可預測。例如：格式化代碼、生成 boilerplate、跑 lint 檢查。好處係快、平、穩。</span></li>
        <li><span className="step-num">2</span><span><strong>Agent 模式</strong>：任務需要探索、推理、做多步決策。AI 自己決定下一步行動。例如：debug 一個未知 bug、設計系統架構。好處係可以處理複雜問題。</span></li>
        <li><span className="step-num">3</span><span><strong>關鍵區別</strong>：Skill 係 deterministic（確定性），Agent 係 non-deterministic（非確定性）。揀錯模式嘅後果——用 Agent 做 Skill 嘅嘢會浪費成本；用 Skill 做 Agent 嘅嘢會出錯。</span></li>
      </ol>
    </div>
  );
}

function FrameworkTab() {
  return (
    <div className="card">
      <h2>選型框架：點樣決定用 Skill 定 Agent</h2>
      <div className="subtitle">四個維度幫你快速分類任務</div>
      <p>唔使死記，記住呢四個問題就夠：任務清唔清晰？重唔重複？在唔在意成本？容唔容許出錯？</p>
      <div className="key-points">
        <div className="key-point">
          <h4>任務清晰度 (Task Clarity)</h4>
          <p><strong style={{ color: '#34d399' }}>高 → Skill</strong>：你可以寫出明確嘅 spec，input 同 output 格式固定。<br /><strong style={{ color: '#F59E0B' }}>低 → Agent</strong>：需求模糊，可能要多次探索先搵到答案。</p>
        </div>
        <div className="key-point">
          <h4>重複性 (Repetition)</h4>
          <p><strong style={{ color: '#34d399' }}>高 → Skill</strong>：同類型嘅任務會做好多次，值得寫一個標準流程。<br /><strong style={{ color: '#F59E0B' }}>低 → Agent</strong>：每次情況都唔同，難以標準化。</p>
        </div>
        <div className="key-point">
          <h4>成本敏感度 (Cost Sensitivity)</h4>
          <p><strong style={{ color: '#34d399' }}>高 → Skill</strong>：Skill 通常用少啲 token，成本可預測。<br /><strong style={{ color: '#F59E0B' }}>低 → Agent</strong>：Agent 嘅 token 用量唔確定，但換嚟更好嘅結果。</p>
        </div>
        <div className="key-point">
          <h4>錯誤容忍度 (Error Tolerance)</h4>
          <p><strong style={{ color: '#34d399' }}>低 → Skill</strong>：唔容許出錯嘅任務，用結構化嘅 Skill 更安全。<br /><strong style={{ color: '#F59E0B' }}>高 → Agent</strong>：可以接受 AI 自己探索，即使偶爾走錯路。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>快速判斷法則</h4>
        <p>如果你可以喺 3 句話內講清楚個任務嘅 input、output 同規則，咁就用 Skill。如果你需要寫一大段 context 先解釋到個任務，咁就用 Agent。</p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰例子：5 個真實場景分類</h2>
      <div className="subtitle">真實開發場景，逐個分析用 Skill 定 Agent</div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong style={{ color: '#34d399' }}>Code Review → Skill</strong>：輸入係 diff，輸出係 review comments。規則明確（檢查 style、security、performance），每次做法一樣。寫好 prompt template，每次餵 diff 入去就得。</span></li>
        <li><span className="step-num">2</span><span><strong style={{ color: '#F59E0B' }}>Debugging → Agent</strong>：你唔知 bug 喺邊，需要 AI 自己去睇 log、trace code、試唔同假設。每次情況唔同，冇辦法用固定流程。Agent 可以自主決定下一步查邊度。</span></li>
        <li><span className="step-num">3</span><span><strong style={{ color: '#34d399' }}>Deployment Script → Skill</strong>：部署流程有固定步驟：build → test → deploy → verify。Input 係 config，output 係部署結果。高度結構化，完全適合 Skill。</span></li>
        <li><span className="step-num">4</span><span><strong style={{ color: '#F59E0B' }}>Architecture Design → Agent</strong>：需要考慮 tradeoff、探索唔同方案、評估 pros/cons。冇標準答案，需要 AI 嘅推理能力。Agent 可以逐步分析，提出多個方案比較。</span></li>
        <li><span className="step-num">5</span><span><strong style={{ color: '#a5b4fc' }}>Data Migration → Hybrid</strong>：規劃階段用 Agent（分析 schema 差異、設計遷移策略），執行階段用 Skill（按 migration plan 逐步執行）。呢個係最佳實踐——先 Agent 規劃，再 Skill 執行。</span></li>
      </ol>

      <div className="use-case">
        <h4>Hybrid 模式嘅威力</h4>
        <p>好多真實場景唔係純 Skill 或純 Agent，而係混合使用。最佳做法：用 Agent 做規劃同決策，用 Skill 做執行同重複性工作。呢樣可以同時攞到 Agent 嘅靈活性同 Skill 嘅穩定性。</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻開始分類你嘅任務</div>

      <div className="prompt-card">
        <h4>Prompt 1 — 任務分類器</h4>
        <div className="prompt-text">
          {`我需要你幫我分類以下任務，判斷應該用 Skill 模式定 Agent 模式：

任務描述：[描述你嘅任務，例如：每日自動生成 changelog / 重構舊系統架構]

請用以下四個維度評分（1-5）：
1. 任務清晰度（5=非常清晰，1=非常模糊）
2. 重複性（5=每日都做，1=一次性）
3. 成本敏感度（5=要控制成本，1=唔在意）
4. 錯誤容忍度（5=可以接受錯誤，1=絕對唔可以錯）

然後俾出建議：
- 用 Skill / Agent / Hybrid
- 如果係 Skill：寫出 input/output 格式同 prompt template
- 如果係 Agent：列出 AI 需要嘅工具同權限
- 如果係 Hybrid：分清邊部分用 Skill，邊部分用 Agent`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 批量任務分類</h4>
        <div className="prompt-text">
          {`幫我將以下開發任務分類為 Skill 或 Agent，並排優先級：

任務列表：
[列出你嘅任務，例如：
1. 每次 PR 自動跑 code review
2. 設計新嘅 notification service 架構
3. 將舊 API 從 REST 遷移到 GraphQL
4. 每日生成 test coverage report
5. Debug 生產環境嘅 memory leak]

對每個任務：
1. 分類為 Skill / Agent / Hybrid
2. 預估 token 成本（低/中/高）
3. 實施難度（低/中/高）
4. 建議嘅優先級同實施順序
5. 如果係 Skill，寫出可以直接用嘅 prompt template`}
        </div>
      </div>
    </div>
  );
}

export default function SkillVsAgent() {
  return (
    <>
      <TopicTabs
        title="Skill vs Agent"
        subtitle="AI 任務分配：幾時用 Skill，幾時用 Agent，點樣揀最有效率"
        tabs={[
          { id: 'overview', label: '① 基本概念', content: <OverviewTab /> },
          { id: 'framework', label: '② 選型框架', content: <FrameworkTab /> },
          { id: 'practice', label: '③ 實戰例子', premium: true, content: <PracticeTab /> },
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
