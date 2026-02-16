import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Big Tech 面試流程通常嘅第一輪係咩？',
    options: [
      { text: 'On-site 面對面技術面試', correct: false, explanation: 'On-site 通常係第三輪，唔係第一輪' },
      { text: 'HR Screen — 了解背景、動機同薪資期望', correct: true, explanation: '啱！HR Screen 係第一輪，大約 30 分鐘，主要了解候選人嘅背景、轉工動機同薪資範圍' },
      { text: 'System Design 面試', correct: false, explanation: 'System Design 通常係 On-site 其中一環，唔係第一輪' },
      { text: 'Take-home coding assignment', correct: false, explanation: 'Take-home 唔係 Big Tech 嘅標準流程，佢哋通常用 live coding' },
    ],
  },
  {
    question: '面試準備策略入面，邊個做法最有效？',
    options: [
      { text: '背晒所有 LeetCode 題目嘅答案', correct: false, explanation: '背答案唔夠，面試官會變題，重點係理解解題嘅思路同 pattern' },
      { text: '分 pattern 練習 coding 題（例如 Two Pointers、BFS/DFS），同時練習 mock interview 訓練溝通能力', correct: true, explanation: '啱！按 pattern 歸類練習可以建立解題直覺，配合 mock interview 練溝通，雙管齊下最有效' },
      { text: '只做 Easy 題就夠', correct: false, explanation: 'Big Tech 面試通常考 Medium 到 Hard 難度，只做 Easy 準備唔夠' },
      { text: '直接去面試，邊做邊學', correct: false, explanation: '冇準備就面試會浪費機會，而且 Big Tech 通常有 cooldown period，fail 咗要等半年先至可以再申請' },
    ],
  },
  {
    question: 'On-site 面試通常包含邊啲環節？',
    options: [
      { text: '只有 coding interview', correct: false, explanation: 'On-site 唔止 coding，通常仲有 System Design 同 Behavioral' },
      { text: 'Coding + System Design + Behavioral，全面考核技術同軟技能', correct: true, explanation: '啱！On-site 通常 4-5 輪，包括 2 輪 coding、1 輪 System Design、1 輪 Behavioral，全面評估候選人' },
      { text: '只做一個 take-home project', correct: false, explanation: 'Big Tech 嘅 On-site 係即場面試，唔係 take-home' },
      { text: '只問理論知識同背書', correct: false, explanation: 'Big Tech 重視實戰能力同解決問題嘅過程，唔會純粹問理論' },
    ],
  },
];

const relatedTopics = [
  { slug: 'coding-interview', label: 'Coding Interview 攻略' },
  { slug: 'star-method', label: 'STAR 面試法' },
  { slug: 'junior-vs-senior', label: 'Junior vs Senior Engineer' },
  { slug: 'backend-roadmap', label: 'Backend 學習路線' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>Big Tech 面試流程全覽</h2>
      <div className="subtitle">由申請到 Offer，通常要經過四大階段</div>
      <p>
        Big Tech（Google、Meta、Amazon、Apple、Microsoft）嘅面試流程大致相同，由 HR Screen 開始，經過 Virtual Technical，再到 On-site，最後係 Team Match。每一輪都有唔同嘅考核重點。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 220" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#F59E0B" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradHR" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradTech" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradOnsite" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradTeam" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d1f5e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3B82F6" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#10B981" /></marker>
          </defs>

          <g transform="translate(20,50)">
            <rect width="160" height="75" rx="14" fill="url(#gradHR)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="80" y="32" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="700">HR Screen</text>
            <text x="80" y="55" textAnchor="middle" fill="#9ca3af" fontSize="10">30 min</text>
          </g>
          <text x="100" y="148" textAnchor="middle" fill="#9ca3af" fontSize="10">背景 / 動機 / 薪資</text>

          <g transform="translate(220,50)">
            <rect width="160" height="75" rx="14" fill="url(#gradTech)" stroke="#F59E0B" strokeWidth="2.5" filter="url(#glowAmber)" />
            <text x="80" y="32" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="700">Virtual Technical</text>
            <text x="80" y="55" textAnchor="middle" fill="#9ca3af" fontSize="10">45-60 min</text>
          </g>
          <text x="300" y="148" textAnchor="middle" fill="#9ca3af" fontSize="10">Coding x2</text>

          <g transform="translate(420,50)">
            <rect width="160" height="75" rx="14" fill="url(#gradOnsite)" stroke="#10B981" strokeWidth="2" filter="url(#shadow)" />
            <text x="80" y="32" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">On-site</text>
            <text x="80" y="55" textAnchor="middle" fill="#9ca3af" fontSize="10">4-6 Rounds</text>
          </g>
          <text x="500" y="148" textAnchor="middle" fill="#9ca3af" fontSize="10">DSA / Design / BQ</text>

          <g transform="translate(620,50)">
            <rect width="160" height="75" rx="14" fill="url(#gradTeam)" stroke="#8B5CF6" strokeWidth="2" filter="url(#shadow)" />
            <text x="80" y="32" textAnchor="middle" fill="#8B5CF6" fontSize="14" fontWeight="700">Team Match</text>
            <text x="80" y="55" textAnchor="middle" fill="#9ca3af" fontSize="10">Manager Chat</text>
          </g>
          <text x="700" y="148" textAnchor="middle" fill="#9ca3af" fontSize="10">雙向選擇</text>

          <path d="M182,87 C195,87 207,87 218,87" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <path d="M382,87 C395,87 407,87 418,87" fill="none" stroke="#F59E0B" strokeWidth="2" markerEnd="url(#arrAmber)" />
          <path d="M582,87 C595,87 607,87 618,87" fill="none" stroke="#10B981" strokeWidth="2" markerEnd="url(#arrGreen)" />
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span>HR Screen：通常 30 分鐘電話，主要了解背景、動機同薪資期望。呢一輪嘅淘汰率其實好低，重點係展示對公司嘅熱誠。</span></li>
        <li><span className="step-num">2</span><span>Virtual Technical：遠程技術面試，通常 45-60 分鐘。會有 2 題 LeetCode medium 到 hard 難度嘅 coding 題目。重點係邊寫 code 邊講解思路。</span></li>
        <li><span className="step-num">3</span><span>On-site：最核心嘅環節，通常 4-6 輪面試，包括 DSA（數據結構同演算法）、System Design、Behavioral 同 Coding。每輪 45-60 分鐘。</span></li>
        <li><span className="step-num">4</span><span>Team Match：通過技術面試之後，會同唔同 team 嘅 manager 傾，搵最適合嘅團隊。呢一步唔係技術考核，而係雙向選擇。</span></li>
      </ol>
    </div>
  );
}

function PreparationTab() {
  return (
    <div className="card">
      <h2>每一輪嘅準備重點</h2>
      <div className="subtitle">針對唔同面試類型，準備方向完全唔同</div>
      <div className="key-points">
        <div className="key-point">
          <h4>HR Screen 準備</h4>
          <p>準備好「點解想加入呢間公司」同「過往經驗 highlight」。薪資問題建議用範圍回答，唔好俾確實數字。保持自然、有禮、有熱誠。</p>
        </div>
        <div className="key-point">
          <h4>Coding 面試準備</h4>
          <p>LeetCode 至少刷 150-200 題，重點掌握 Array、HashMap、Tree、Graph、DP。面試時一定要先釐清問題、講解思路，再寫 code。時間管理係關鍵。</p>
        </div>
        <div className="key-point">
          <h4>System Design 準備</h4>
          <p>熟讀常見系統設計題目（URL Shortener、Chat System、News Feed 等）。掌握估算能力（QPS、Storage）同常用組件（LB、Cache、MQ、DB Sharding）。</p>
        </div>
        <div className="key-point">
          <h4>Behavioral 準備</h4>
          <p>用 STAR 方法準備 8-10 個故事，涵蓋 leadership、conflict resolution、failure、impact。Amazon 特別重視 Leadership Principles，要逐條準備例子。</p>
        </div>
      </div>
    </div>
  );
}

function TipsTab() {
  return (
    <div className="card">
      <h2>面試實戰要點</h2>
      <div className="subtitle">好多人技術過關但最後失敗，通常係呢啲原因</div>
      <p>溝通能力同技術能力一樣重要。面試官想知道嘅唔係淨係答案，而係思考過程。每一步都要講出嚟：「呢度用 HashMap 因為需要 O(1) lookup」。</p>
      <p>遇到唔識嘅題目唔好死撐。承認唔確定，然後講出最接近嘅思路，面試官會引導。最差嘅做法係沉默或者亂答。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>時間管理</h4>
          <p>Coding 面試通常得 35-40 分鐘寫 code（扣除溝通時間）。如果 15 分鐘都冇思路，果斷要求提示。卡住浪費時間係大忌。</p>
        </div>
        <div className="key-point">
          <h4>Code Quality</h4>
          <p>面試唔係 LeetCode 提交，要寫出可讀嘅 code。用有意義嘅變數名、加簡單註釋、處理 edge case。寫完之後主動 dry run 一次。</p>
        </div>
        <div className="key-point">
          <h4>System Design 框架</h4>
          <p>標準流程：Requirements → Estimation → API Design → High-Level Design → Deep Dive → Bottlenecks。唔好跳步，每步都要同面試官確認。</p>
        </div>
        <div className="key-point">
          <h4>面試後跟進</h4>
          <p>每輪面試後發 thank you email 俾 recruiter。如果有多個 offer，合理地利用 competing offer 談判。整個過程保持專業同禮貌。</p>
        </div>
      </div>

      <div className="use-case">
        <h4>總結</h4>
        <p>Big Tech 面試流程雖然長，但每一步都有明確嘅準備方向。關鍵在於提早開始準備、持續練習、同埋保持良好嘅心態。技術係基本門檻，溝通同態度先係真正嘅決勝關鍵。</p>
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
        <h4>Prompt 1 — 制定面試準備計劃</h4>
        <div className="prompt-text">幫手制定一個完整嘅 Big Tech 面試準備計劃。{'\n\n'}背景資料：{'\n'}- 目標公司：<span className="placeholder">[Google / Meta / Amazon / Apple / Microsoft]</span>{'\n'}- 目標職位：<span className="placeholder">[Software Engineer / Senior SWE / Staff Engineer]</span>{'\n'}- 現有經驗：<span className="placeholder">[年資同技術棧]</span>{'\n'}- 準備時間：<span className="placeholder">[2 個月 / 3 個月 / 6 個月]</span>{'\n\n'}需要包含：{'\n'}1. 每週詳細嘅學習同練習時間表{'\n'}2. LeetCode 刷題計劃（按 topic 分類，由易到難）{'\n'}3. System Design 學習路線同練習題目清單{'\n'}4. Behavioral 面試 STAR 故事準備框架（至少 8 個故事主題）{'\n'}5. Mock Interview 安排建議{'\n'}6. 每個階段嘅 milestone 同自我評估標準{'\n\n'}請按照準備時間制定詳細嘅每週計劃。</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 模擬 System Design 面試</h4>
        <div className="prompt-text">模擬一場 45 分鐘嘅 System Design 面試。{'\n\n'}面試題目：設計 <span className="placeholder">[URL Shortener / Chat System / News Feed / Rate Limiter / 其他系統]</span>{'\n\n'}請扮演面試官，按以下流程進行：{'\n'}1. 先提出題目，等候 Requirements Clarification{'\n'}2. 引導完成 Capacity Estimation（QPS、Storage、Bandwidth）{'\n'}3. 討論 API Design（endpoints、request/response format）{'\n'}4. High-Level Architecture 設計（畫出核心組件）{'\n'}5. Deep Dive 其中一個組件嘅細節{'\n'}6. 討論 Bottleneck 同 Scaling 方案{'\n\n'}每一步都要：{'\n'}- 提出追問問題，測試深度理解{'\n'}- 對回答畀評價同改善建議{'\n'}- 最後畀出整體評分（Hire / No Hire）同詳細 Feedback{'\n\n'}面試官風格：<span className="placeholder">[友善引導型 / 嚴格挑戰型]</span></div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 3 — Behavioral 面試故事準備</h4>
        <div className="prompt-text">幫手用 STAR 方法整理 Behavioral 面試故事。{'\n\n'}以下係需要準備嘅情境，請針對每個情境生成一個結構化嘅 STAR 故事框架：{'\n\n'}1. 一次帶領團隊完成困難 project 嘅經驗{'\n'}2. 同事意見唔同、需要解決 conflict 嘅經驗{'\n'}3. 一次技術決策失誤同點樣補救{'\n'}4. 喺 tight deadline 下交付 project{'\n'}5. 主動發現同解決一個冇人注意到嘅問題{'\n\n'}背景：<span className="placeholder">[過往工作經驗簡述]</span>{'\n'}目標公司：<span className="placeholder">[公司名，如 Amazon 需要對應 Leadership Principles]</span>{'\n\n'}每個故事需要包含：{'\n'}- Situation：清晰嘅背景描述（2-3 句）{'\n'}- Task：具體嘅責任同目標{'\n'}- Action：採取咗咩具體行動（重點部分，要詳細）{'\n'}- Result：量化嘅成果（數字、百分比、影響範圍）{'\n\n'}請同時標注每個故事適合回答邊啲常見 Behavioral 問題。</div>
      </div>
    </div>
  );
}

export default function InterviewProcess() {
  return (
    <>
      <TopicTabs
        title="Big Tech 面試流程"
        subtitle="由 HR Screen 到 On-site，拆解科技公司嘅完整面試流程"
        tabs={[
          { id: 'overview', label: '① 面試流程', content: <OverviewTab /> },
          { id: 'preparation', label: '② 每輪準備', content: <PreparationTab /> },
          { id: 'tips', label: '③ 實戰要點', premium: true, content: <TipsTab /> },
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
