import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const relatedTopics = [
  { slug: 'skill-vs-agent', label: 'Skill vs Agent' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering' },
  { slug: 'ai-tools-landscape', label: 'AI 工具全景圖' },
  { slug: 'coding-agent-design', label: 'Coding Agent 設計' },
];

function OverviewTab() {
  return (
    <div className="card">
      <h2>AI 學習地圖（超精簡版）</h2>
      <div className="subtitle">先識揀工具，再學 workflow，最後做實戰</div>

      <div className="diagram-container">
        <svg viewBox="0 0 760 280" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arr-basic" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
            </marker>
          </defs>

          <rect x="20" y="50" width="220" height="170" rx="14" fill="#1a1d27" stroke="#3B82F6" strokeWidth="2" />
          <text x="130" y="82" textAnchor="middle" fill="#93c5fd" fontSize="13" fontWeight="700">Step 1: 工具定位</text>
          <text x="130" y="110" textAnchor="middle" fill="#d1d5db" fontSize="10">Chat / IDE / Search</text>
          <text x="130" y="130" textAnchor="middle" fill="#9ca3af" fontSize="9">知道每款工具做咩最強</text>
          <text x="130" y="160" textAnchor="middle" fill="#34d399" fontSize="10">成果：揀啱工具組合</text>

          <rect x="270" y="50" width="220" height="170" rx="14" fill="#1a1d27" stroke="#10B981" strokeWidth="2" />
          <text x="380" y="82" textAnchor="middle" fill="#6ee7b7" fontSize="13" fontWeight="700">Step 2: Workflow</text>
          <text x="380" y="110" textAnchor="middle" fill="#d1d5db" fontSize="10">Research → Spec → Code → Test</text>
          <text x="380" y="130" textAnchor="middle" fill="#9ca3af" fontSize="9">唔再一個 AI 做晒全部</text>
          <text x="380" y="160" textAnchor="middle" fill="#34d399" fontSize="10">成果：質量同速度都升</text>

          <rect x="520" y="50" width="220" height="170" rx="14" fill="#1a1d27" stroke="#F59E0B" strokeWidth="2" />
          <text x="630" y="82" textAnchor="middle" fill="#fcd34d" fontSize="13" fontWeight="700">Step 3: 實戰題</text>
          <text x="630" y="110" textAnchor="middle" fill="#d1d5db" fontSize="10">System Design 模擬</text>
          <text x="630" y="130" textAnchor="middle" fill="#9ca3af" fontSize="9">限時、寫 spec、做 trade-off</text>
          <text x="630" y="160" textAnchor="middle" fill="#34d399" fontSize="10">成果：面試可落地答法</text>

          <path d="M242,136 L266,136" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arr-basic)" />
          <path d="M492,136 L516,136" stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arr-basic)" />
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span>用 20 分鐘熟習工具定位，避免「乜都用同一個 AI」。</span></li>
        <li><span className="step-num">2</span><span>學一條固定 pipeline，將輸出格式化交俾下一步。</span></li>
        <li><span className="step-num">3</span><span>每星期最少做 1 次完整 mock，逼自己做取捨解釋。</span></li>
      </ol>
    </div>
  );
}

function ToolsTab() {
  return (
    <div className="card">
      <h2>5 大模型定位表</h2>
      <div className="subtitle">先記住模型分工，先會揀得快</div>

      <div className="content-table-wrapper">
        <table className="content-table">
          <thead>
            <tr>
              <th>模型</th>
              <th>最強場景</th>
              <th>弱點</th>
              <th>建議用法</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600, color: '#e2e8f0' }}>GPT-5.2 Codex</td>
              <td>Multimodal + Agentic coding</td>
              <td>高階任務成本高</td>
              <td>Debug + 架構草稿</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: '#e2e8f0' }}>Claude Opus 4.6</td>
              <td>深度分析、長文件（API 1M）</td>
              <td>價錢較高</td>
              <td>Spec review / 重要決策</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: '#e2e8f0' }}>Gemini 3 Pro</td>
              <td>超長 context、跨文件整理</td>
              <td>推理穩定性因題目而異</td>
              <td>大型文件彙整 / 長文分析</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: '#e2e8f0' }}>Gemini 3 Flash</td>
              <td>大批量任務、快回應</td>
              <td>複雜推理較弱</td>
              <td>分類、總結、批處理</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: '#e2e8f0' }}>DeepSeek V3.2</td>
              <td>低成本 API / 開源路線</td>
              <td>需自行調整 pipeline</td>
              <td>budget 任務 + 自建方案</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="use-case">
        <h4>一條實用規則</h4>
        <p>平任務用 Flash / DeepSeek，貴任務先升 Opus 或 GPT-5.2，永遠做 model routing。</p>
      </div>
    </div>
  );
}

function RoadmapTab() {
  return (
    <div className="card">
      <h2>14 主題學習路線（3 階段）</h2>
      <div className="subtitle">唔洗一次過讀晒，按階段推進</div>

      <div className="diagram-container">
        <svg viewBox="0 0 760 280" xmlns="http://www.w3.org/2000/svg">
          <rect x="30" y="40" width="220" height="190" rx="14" fill="#1a1d27" stroke="#3B82F6" strokeWidth="2" />
          <text x="140" y="70" textAnchor="middle" fill="#93c5fd" fontSize="13" fontWeight="700">Phase A 基礎</text>
          <text x="140" y="95" textAnchor="middle" fill="#d1d5db" fontSize="10">工具全景 / 模型對比</text>
          <text x="140" y="115" textAnchor="middle" fill="#d1d5db" fontSize="10">Prompt / Skill vs Agent</text>
          <text x="140" y="150" textAnchor="middle" fill="#34d399" fontSize="10">目標：識揀工具</text>
          <text x="140" y="170" textAnchor="middle" fill="#9ca3af" fontSize="9">建議：第 1-2 週</text>

          <rect x="270" y="40" width="220" height="190" rx="14" fill="#1a1d27" stroke="#10B981" strokeWidth="2" />
          <text x="380" y="70" textAnchor="middle" fill="#6ee7b7" fontSize="13" fontWeight="700">Phase B 工作流</text>
          <text x="380" y="95" textAnchor="middle" fill="#d1d5db" fontSize="10">Context Rot / SDD</text>
          <text x="380" y="115" textAnchor="middle" fill="#d1d5db" fontSize="10">Token Security / Multi-AI</text>
          <text x="380" y="150" textAnchor="middle" fill="#34d399" fontSize="10">目標：出到穩定流程</text>
          <text x="380" y="170" textAnchor="middle" fill="#9ca3af" fontSize="9">建議：第 3-4 週</text>

          <rect x="510" y="40" width="220" height="190" rx="14" fill="#1a1d27" stroke="#F59E0B" strokeWidth="2" />
          <text x="620" y="70" textAnchor="middle" fill="#fcd34d" fontSize="13" fontWeight="700">Phase C 實戰</text>
          <text x="620" y="95" textAnchor="middle" fill="#d1d5db" fontSize="10">Evaluation Loop / MCP</text>
          <text x="620" y="115" textAnchor="middle" fill="#d1d5db" fontSize="10">Idea Generation / Mock Design</text>
          <text x="620" y="150" textAnchor="middle" fill="#34d399" fontSize="10">目標：面試可輸出</text>
          <text x="620" y="170" textAnchor="middle" fill="#9ca3af" fontSize="9">建議：第 5 週起</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">A</span><span>唔識揀工具前，唔好急住做複雜 project。</span></li>
        <li><span className="step-num">B</span><span>每學一個 workflow 主題，就寫一個你自己可複製模板。</span></li>
        <li><span className="step-num">C</span><span>每週至少做一次 mock design，訓練 trade-off 表達。</span></li>
      </ol>
    </div>
  );
}

function ActionTab() {
  return (
    <div className="card">
      <h2>7 日起步計劃</h2>
      <div className="subtitle">每日 45-60 分鐘，完成第一輪入門</div>

      <div className="content-table-wrapper">
        <table className="content-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>主題</th>
              <th>輸出物</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>D1</td><td>AI 工具全景圖</td><td>你自己嘅工具清單（3+2）</td></tr>
            <tr><td>D2</td><td>AI 模型深入對比</td><td>一頁 model routing 規則</td></tr>
            <tr><td>D3</td><td>Prompt Engineering</td><td>2 個可重用 prompt</td></tr>
            <tr><td>D4</td><td>Skill vs Agent</td><td>任務分類表（skill/agent）</td></tr>
            <tr><td>D5</td><td>Context Rot + SDD</td><td>一份 mini spec</td></tr>
            <tr><td>D6</td><td>API Token 安全與成本</td><td>成本估算表 + 安全 checklist</td></tr>
            <tr><td>D7</td><td>Mock Design</td><td>30 分鐘模擬答題錄音/筆記</td></tr>
          </tbody>
        </table>
      </div>

      <div className="use-case">
        <h4>完成標準</h4>
        <p>你可以喺 3 分鐘內講清楚：點解揀某個 model、點樣控成本、點樣設計 AI workflow。</p>
      </div>
    </div>
  );
}

export default function AIBasicsStartHere() {
  return (
    <>
      <TopicTabs
        title="AI 基礎入門指南"
        subtitle="用圖表快速入門：工具定位、學習路線、7 日行動計劃"
        tabs={[
          { id: 'overview', label: '① 地圖', content: <OverviewTab /> },
          { id: 'tools', label: '② 工具表', content: <ToolsTab /> },
          { id: 'roadmap', label: '③ 路線圖', content: <RoadmapTab /> },
          { id: 'action', label: '④ 7日計劃', content: <ActionTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
