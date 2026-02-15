import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [];

const relatedTopics = [
  { slug: 'fix-slow-database', label: 'Debug 慢嘅 Database' },
  { slug: 'metrics-logging', label: 'Metrics & Logging 監控日誌' },
  { slug: 'backend-roadmap', label: 'Backend 學習路線' },
];

function PrintStatementTab() {
  return (
    <div className="card">
      <h2>Print Statement 嘅威力</h2>
      <div className="subtitle">最簡單、最直接嘅 Debug 手段</div>
      <p>
        喺學習程式設計嘅初期，通常會先接觸 Debugger 呢個工具。但問題係，初學者寫嘅 Code 太簡單，根本唔需要用到 Debugger。隨住 Code 越嚟越複雜，好多人會自然咁轉用 Print Statement 嚟檢查變數嘅值。
      </p>
      <p>
        Print Statement 嘅最大優勢係<strong>跨環境兼容性</strong>。無論係 VM、Container、唔同嘅 OS，只要有 stdout 就用得。唔需要額外裝任何工具，亦唔需要特別嘅 IDE 支援。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 220" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="printGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="printGrad2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="printGrad3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="printGrad4" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="glowPrint">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="shadowPrint">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <marker id="arrowPrint" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
            </marker>
          </defs>

          <rect x="20" y="70" width="150" height="80" rx="14" fill="url(#printGrad1)" stroke="#6366f1" strokeWidth="1.5" filter="url(#shadowPrint)" />
          <text x="95" y="102" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="600">Source Code</text>
          <text x="95" y="125" textAnchor="middle" fill="#9ca3af" fontSize="11">console.log()</text>
          <text x="95" y="140" textAnchor="middle" fill="#9ca3af" fontSize="11">print()</text>

          <rect x="230" y="70" width="150" height="80" rx="14" fill="url(#printGrad2)" stroke="#34d399" strokeWidth="1.5" filter="url(#glowPrint)" />
          <text x="305" y="102" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="600">Print Statement</text>
          <text x="305" y="125" textAnchor="middle" fill="#9ca3af" fontSize="11">輸出變數值</text>
          <text x="305" y="140" textAnchor="middle" fill="#9ca3af" fontSize="11">追蹤執行流程</text>

          <rect x="440" y="70" width="150" height="80" rx="14" fill="url(#printGrad3)" stroke="#f59e0b" strokeWidth="1.5" filter="url(#shadowPrint)" />
          <text x="515" y="102" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="600">stdout</text>
          <text x="515" y="125" textAnchor="middle" fill="#9ca3af" fontSize="11">標準輸出</text>
          <text x="515" y="140" textAnchor="middle" fill="#9ca3af" fontSize="11">VM / Container / OS</text>

          <rect x="650" y="70" width="130" height="80" rx="14" fill="url(#printGrad4)" stroke="#a5b4fc" strokeWidth="1.5" filter="url(#shadowPrint)" />
          <text x="715" y="102" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="600">Terminal</text>
          <text x="715" y="125" textAnchor="middle" fill="#9ca3af" fontSize="11">睇到輸出結果</text>

          <path d="M 170 110 C 195 95, 210 95, 230 110" stroke="#6366f1" strokeWidth="1.8" fill="none" markerEnd="url(#arrowPrint)" />
          <path d="M 380 110 C 405 95, 420 95, 440 110" stroke="#34d399" strokeWidth="1.8" fill="none" markerEnd="url(#arrowPrint)" />
          <path d="M 590 110 C 615 95, 630 95, 650 110" stroke="#f59e0b" strokeWidth="1.8" fill="none" markerEnd="url(#arrowPrint)" />

          <text x="400" y="30" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">Print Statement 工作流程</text>
        </svg>
      </div>

      <ul className="steps">
        <li>
          <span className="step-num">1</span>
          <span>喺需要檢查嘅位置加入 Print Statement，將變數值輸出到 stdout</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>執行程式後，喺 Terminal 直接睇到輸出結果，判斷程式行為係咪符合預期</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>跨環境通用 — 無論係 VM、Docker Container、定係唔同 OS，stdout 都一定存在</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span>要留意：Debug 完之後記得清理 Print Statement，避免污染 Production Code</span>
        </li>
      </ul>

      <div className="use-case">
        <h4>常見用途</h4>
        <p>快速驗證某個變數嘅值、確認程式有冇行到某一行、喺 Remote Server 上面做簡單 Debug — 呢啲場景用 Print Statement 最快最直接。</p>
      </div>
    </div>
  );
}

function DebuggerTab() {
  return (
    <div className="card">
      <h2>Debugger 嘅強大功能</h2>
      <div className="subtitle">深入分析複雜邏輯嘅必備工具</div>
      <p>
        當 Code 變得真正複雜嘅時候，Print Statement 就唔夠用。Debugger 可以設定 Breakpoint，逐步 Step Through 邏輯，即時 Inspect 每一個變數嘅狀態。呢啲功能對於理解複雜嘅執行路徑至關重要。
      </p>
      <p>
        另一個重要好處係 — Debugger 唔會喺 Code 入面留低任何痕跡。唔使擔心 Debug 用嘅 Statement 會唔小心 Commit 到 Repository 入面，保持 Codebase 乾淨。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dbgGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="dbgGrad2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="dbgGrad3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="dbgGrad4" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="glowDbg">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="shadowDbg">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <marker id="arrowDbg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc" />
            </marker>
            <marker id="arrowRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f87171" />
            </marker>
          </defs>

          <rect x="40" y="50" width="720" height="240" rx="14" fill="none" stroke="#2a2d3a" strokeWidth="1" strokeDasharray="6 4" />
          <text x="400" y="30" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">IDE Debugger 環境</text>

          <rect x="70" y="80" width="200" height="180" rx="14" fill="url(#dbgGrad1)" stroke="#6366f1" strokeWidth="1.5" filter="url(#shadowDbg)" />
          <text x="170" y="110" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="600">Source Code</text>
          <circle cx="95" cy="140" r="6" fill="#f87171" filter="url(#glowDbg)" />
          <text x="115" y="144" fill="#9ca3af" fontSize="10">Line 12 - Breakpoint</text>
          <circle cx="95" cy="165" r="6" fill="#f87171" opacity="0.5" />
          <text x="115" y="169" fill="#9ca3af" fontSize="10">Line 24 - Breakpoint</text>
          <rect x="85" y="190" width="170" height="22" rx="4" fill="rgba(246, 173, 85, 0.15)" stroke="#f59e0b" strokeWidth="0.8" />
          <text x="170" y="205" textAnchor="middle" fill="#f59e0b" fontSize="10">Current Line Highlight</text>

          <rect x="310" y="80" width="180" height="85" rx="14" fill="url(#dbgGrad3)" stroke="#34d399" strokeWidth="1.5" filter="url(#shadowDbg)" />
          <text x="400" y="108" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="600">Step Controls</text>
          <text x="400" y="130" textAnchor="middle" fill="#9ca3af" fontSize="11">Step Over / Step Into</text>
          <text x="400" y="148" textAnchor="middle" fill="#9ca3af" fontSize="11">Step Out / Continue</text>

          <rect x="310" y="185" width="180" height="75" rx="14" fill="url(#dbgGrad4)" stroke="#f59e0b" strokeWidth="1.5" filter="url(#glowDbg)" />
          <text x="400" y="213" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="600">Variable Inspector</text>
          <text x="400" y="235" textAnchor="middle" fill="#9ca3af" fontSize="11">即時檢視所有變數值</text>

          <rect x="530" y="80" width="200" height="180" rx="14" fill="url(#dbgGrad2)" stroke="#f87171" strokeWidth="1.2" filter="url(#shadowDbg)" />
          <text x="630" y="110" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="600">Call Stack</text>
          <text x="630" y="138" textAnchor="middle" fill="#9ca3af" fontSize="10">main()</text>
          <text x="630" y="158" textAnchor="middle" fill="#9ca3af" fontSize="10">processData()</text>
          <text x="630" y="178" textAnchor="middle" fill="#9ca3af" fontSize="10">validateInput()</text>
          <text x="630" y="198" textAnchor="middle" fill="#c0c4cc" fontSize="10">handleError()</text>
          <text x="630" y="240" textAnchor="middle" fill="#9ca3af" fontSize="10">追蹤完整呼叫路徑</text>

          <path d="M 270 140 C 290 120, 300 110, 310 120" stroke="#a5b4fc" strokeWidth="1.5" fill="none" markerEnd="url(#arrowDbg)" />
          <path d="M 270 200 C 290 210, 300 215, 310 215" stroke="#a5b4fc" strokeWidth="1.5" fill="none" markerEnd="url(#arrowDbg)" />
          <path d="M 490 120 C 510 110, 520 110, 530 120" stroke="#f87171" strokeWidth="1.5" fill="none" markerEnd="url(#arrowRed)" />
          <path d="M 490 220 C 510 230, 520 230, 530 220" stroke="#f87171" strokeWidth="1.5" fill="none" markerEnd="url(#arrowRed)" />
        </svg>
      </div>

      <ul className="steps">
        <li>
          <span className="step-num">1</span>
          <span>喺 IDE 入面設定 Breakpoint — 程式行到嗰一行就會自動暫停</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>用 Step Over / Step Into 逐行執行，觀察每一步嘅邏輯變化</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>透過 Variable Inspector 即時睇到所有變數嘅當前值，唔使手動 Print</span>
        </li>
        <li>
          <span className="step-num">4</span>
          <span>利用 Call Stack 追蹤函數呼叫路徑，快速定位 Bug 嘅源頭</span>
        </li>
        <li>
          <span className="step-num">5</span>
          <span>最大好處：唔會喺 Code 入面留低任何 Debug 痕跡，避免意外 Commit</span>
        </li>
      </ul>

      <div className="use-case">
        <h4>適用場景</h4>
        <p>多層 Function 呼叫、複雜嘅 State 變化、Race Condition 排查 — 呢啲情況下，Debugger 嘅 Breakpoint 同 Step Through 功能遠比 Print Statement 有效率。</p>
      </div>
    </div>
  );
}

function ChooseTab() {
  return (
    <>
      <div className="card">
        <h2>點樣揀：Print 定 Debugger？</h2>
        <div className="subtitle">唔係二選一 — 重點係知道邊個場景用邊個</div>
        <p>
          好多初學者有個誤解，覺得學識 Debugger 就唔應該再用 Print Statement。但現實係兩者各有適用場景。關鍵在於理解各自嘅強項同限制，然後根據實際情況做判斷。
        </p>

        <div className="key-points">
          <div className="key-point">
            <h4>Print Statement 勝出</h4>
            <p>跨環境 Debug（VM、Container、Remote Server），快速驗證單一變數值，唔依賴特定 IDE</p>
          </div>
          <div className="key-point">
            <h4>Debugger 勝出</h4>
            <p>複雜邏輯分析、多層 Call Stack 追蹤、需要即時修改變數值嘅場景</p>
          </div>
          <div className="key-point">
            <h4>Print 嘅風險</h4>
            <p>容易忘記清理，Debug 用嘅 Statement 可能會 Commit 到 Repository，污染 Production Code</p>
          </div>
          <div className="key-point">
            <h4>Debugger 嘅限制</h4>
            <p>需要特定 IDE 支援，某啲環境（例如 Production Server）未必可以用 Debugger</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>決策流程</h2>
        <div className="subtitle">根據實際場景揀合適嘅工具</div>

        <ul className="steps">
          <li>
            <span className="step-num">1</span>
            <span>如果只係想快速 Check 一個變數值 — 用 <strong>Print Statement</strong>，最快最直接</span>
          </li>
          <li>
            <span className="step-num">2</span>
            <span>如果喺 Remote Server / Container 入面 Debug — 用 <strong>Print Statement</strong>，因為 stdout 一定有</span>
          </li>
          <li>
            <span className="step-num">3</span>
            <span>如果需要逐步追蹤複雜邏輯 — 用 <strong>Debugger</strong>，設定 Breakpoint 慢慢分析</span>
          </li>
          <li>
            <span className="step-num">4</span>
            <span>如果擔心 Debug Code 會 Commit 入去 — 用 <strong>Debugger</strong>，完全零污染</span>
          </li>
          <li>
            <span className="step-num">5</span>
            <span>如果兩者都可以 — 建議先試 <strong>Debugger</strong>，養成良好習慣</span>
          </li>
        </ul>

        <div className="use-case">
          <h4>實戰建議</h4>
          <p>最理想嘅做法係兩者都熟練掌握。簡單場景用 Print Statement 提高效率，複雜場景用 Debugger 深入分析。重點係唔好只依賴其中一種 — 靈活切換先係高效 Debug 嘅關鍵。</p>
        </div>
      </div>
    </>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻開始 Build</div>

      <div className="prompt-card">
        <h4>Prompt 1 — 設定 VS Code Debugging 工作流程</h4>
        <div className="prompt-text">幫手設定一個完整嘅 VS Code debugging 工作流程，適用於 <span className="placeholder">[語言，例如 Python / Node.js / TypeScript]</span> 項目。{'\n\n'}要求：{'\n'}1. 生成 .vscode/launch.json 配置檔，包含最常用嘅 debug 設定{'\n'}2. 設定 Breakpoint 嘅最佳實踐位置建議（例如 API endpoint handler、error handling block）{'\n'}3. 加入 Conditional Breakpoint 同 Logpoint 嘅示範{'\n'}4. 如果係 <span className="placeholder">[框架，例如 Express / FastAPI / Next.js]</span>，要支援 hot reload debugging{'\n'}5. 附加一份 Debug Cheatsheet，列出最常用嘅 Step Over / Step Into / Watch Expression 快捷鍵</div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 設計 Logging 策略取代 Print Debugging</h4>
        <div className="prompt-text">設計一個 production-grade 嘅 logging 策略，完全取代 print statement debugging，適用於 <span className="placeholder">[語言，例如 Python / Node.js / Java]</span> 項目。{'\n\n'}要求：{'\n'}1. 用 <span className="placeholder">[logging library，例如 Winston / Pino / Python logging / Log4j]</span> 設定 structured logging{'\n'}2. 定義 log levels（DEBUG / INFO / WARN / ERROR）嘅使用準則{'\n'}3. 加入 request ID / correlation ID 追蹤，方便喺分散式環境 debug{'\n'}4. 設定 log rotation 同 output format（JSON for production, pretty-print for dev）{'\n'}5. 示範點樣用 environment variable 控制 log level，唔使改 code{'\n'}6. 加入敏感資訊過濾（例如唔好 log 密碼、token）</div>
      </div>
    </div>
  );
}

export default function PrintVsDebugger() {
  return (
    <>
      <TopicTabs
        title="Print 定 Debugger"
        subtitle="兩種 Debug 方法各有長短 — 關鍵在於了解邊種場景用邊種工具最有效率"
        tabs={[
          { id: 'tab-print', label: '① Print Statement', content: <PrintStatementTab /> },
          { id: 'tab-debugger', label: '② Debugger', content: <DebuggerTab /> },
          { id: 'tab-choose', label: '③ 點樣揀', premium: true, content: <ChooseTab /> },
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
