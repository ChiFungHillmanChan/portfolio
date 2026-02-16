import TopicTabs from '../components/TopicTabs';
import QuizRenderer from '../components/QuizRenderer';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: '國際象棋配對系統點樣確保公平性？',
    options: [
      { text: '隨機配對任何兩個玩家', correct: false, explanation: '隨機配對會令新手對上高手，完全唔公平' },
      { text: '按玩家嘅技術等級分成唔同隊列，優先配對同等級嘅對手', correct: true, explanation: '啱！將玩家分成低/中/高技術隊列，優先將同一隊列嘅玩家配對，確保比賽公平同有意義' },
      { text: '畀玩家自己揀對手', correct: false, explanation: '自己揀容易被濫用，例如專門揀弱嘅對手' },
      { text: '按登記時間排序配對', correct: false, explanation: '按時間排序冇考慮技術水平，可能配對出完全唔對等嘅比賽' },
    ],
  },
  {
    question: '線上國際象棋用 WebSocket 而唔係 HTTP Polling 嘅原因係咩？',
    options: [
      { text: '因為 WebSocket 比較新', correct: false, explanation: '新唔代表適合，關鍵係 WebSocket 嘅特性符合需求' },
      { text: 'WebSocket 支援雙向即時通訊，server 可以主動 push 對手嘅棋步，唔使 client 不斷輪詢', correct: true, explanation: '啱！象棋需要即時顯示對手嘅每一步棋。WebSocket 保持持久連接，server 可以即刻 push 更新，比 HTTP polling 更高效更即時' },
      { text: '因為 HTTP 唔安全', correct: false, explanation: 'HTTP 加上 TLS（即 HTTPS）都係安全嘅，安全性唔係揀 WebSocket 嘅原因' },
      { text: '因為 HTTP 唔支援 JSON 格式', correct: false, explanation: 'HTTP 完全支援 JSON，呢個唔係問題' },
    ],
  },
  {
    question: '國際象棋系統點樣防止玩家作弊（例如用 AI engine 幫手出棋）？',
    options: [
      { text: '完全冇辦法防', correct: false, explanation: '雖然好難完全杜絕，但有多種偵測方法' },
      { text: '分析玩家嘅棋步同 engine 嘅建議棋步嘅吻合度，配合時間分析同行為模式偵測', correct: true, explanation: '啱！如果玩家嘅棋步同頂級 engine 嘅建議長期高度吻合，而且每步嘅思考時間異常一致，就好大機會係作弊' },
      { text: '要求玩家開 webcam', correct: false, explanation: '開 webcam 唔一定有效，因為可以用另一部裝置跑 engine' },
      { text: '限制每局只可以用 10 分鐘', correct: false, explanation: '限時只係遊戲模式之一，唔係防作弊嘅方法' },
    ],
  },
];

const relatedTopics = [
  { slug: 'system-design-patterns', label: '系統設計模式總覽' },
  { slug: 'database-basics', label: 'Database 基礎' },
  { slug: 'unique-id-generator', label: 'Unique ID Generator' },
];

function MatchmakingTab() {
  return (
    <div className="card">
      <h2>配對系統設計</h2>
      <div className="subtitle">按技術等級分流，確保公平競技</div>
      <p>
        重點係一個好實際嘅問題：點樣將兩個玩家配對埋一齊玩國際象棋？表面睇好簡單，實際上要考慮好多嘢。最核心嘅係<strong style={{ color: '#34d399' }}>公平性</strong>——唔可以將一個初學者同棋王擺埋一齊，呢場比賽會毫無意義。
      </p>
      <p>
        所以常見做法係按玩家嘅技術等級分成三個隊列：<strong style={{ color: '#fbbf24' }}>低技術、中等技術、高技術</strong>。當玩家按「Join」嘅時候，系統會根據佢嘅 rank 將佢放入對應嘅隊列入面等待。配對系統會優先將同一個隊列入面嘅第一個玩家配對埋一齊。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowIndigo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#6366f1" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradPlayer" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradQueue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradMatch" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
            <marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
          </defs>
          <g transform="translate(30,80)">
            <rect width="110" height="60" rx="14" fill="url(#gradPlayer)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="26" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Player A</text>
            <text x="55" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">Rank: Low</text>
          </g>
          <g transform="translate(30,180)">
            <rect width="110" height="60" rx="14" fill="url(#gradPlayer)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="26" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Player B</text>
            <text x="55" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">Rank: Average</text>
          </g>
          <g transform="translate(30,280)">
            <rect width="110" height="60" rx="14" fill="url(#gradPlayer)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow)" />
            <text x="55" y="26" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Player C</text>
            <text x="55" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">Rank: High</text>
          </g>
          <g transform="translate(230,155)">
            <rect width="150" height="90" rx="14" fill="url(#gradQueue)" stroke="#F59E0B" strokeWidth="2.5" filter="url(#glowIndigo)" />
            <text x="75" y="28" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="700">Matchmaking</text>
            <text x="75" y="48" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="700">Service</text>
            <text x="75" y="70" textAnchor="middle" fill="#9ca3af" fontSize="10">三個隊列分流</text>
          </g>
          <g transform="translate(470,50)">
            <rect width="120" height="55" rx="14" fill="url(#gradQueue)" stroke="#f87171" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="22" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="700">Low Skill Queue</text>
            <text x="60" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">新手玩家</text>
          </g>
          <g transform="translate(470,150)">
            <rect width="120" height="55" rx="14" fill="url(#gradQueue)" stroke="#fbbf24" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="22" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">Average Queue</text>
            <text x="60" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">中等玩家</text>
          </g>
          <g transform="translate(470,250)">
            <rect width="120" height="55" rx="14" fill="url(#gradQueue)" stroke="#34d399" strokeWidth="2" filter="url(#shadow)" />
            <text x="60" y="22" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">High Skill Queue</text>
            <text x="60" y="40" textAnchor="middle" fill="#9ca3af" fontSize="9">高手玩家</text>
          </g>
          <g transform="translate(480,340)">
            <rect width="110" height="45" rx="10" fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="1.5" />
            <text x="55" y="18" textAnchor="middle" fill="#a5b4fc" fontSize="9" fontWeight="700">Timeout: 30s</text>
            <text x="55" y="34" textAnchor="middle" fill="#9ca3af" fontSize="8">容許跨隊列配對</text>
          </g>
          <path d="M142,110 C180,110 190,180 228,180" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <path d="M142,210 C180,210 190,200 228,195" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <path d="M142,310 C180,310 190,220 228,210" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue)" />
          <path d="M382,180 C420,180 430,90 468,78" fill="none" stroke="#f59e0b" strokeWidth="1.8" markerEnd="url(#arrAmber)" />
          <path d="M382,195 C410,195 440,177 468,177" fill="none" stroke="#f59e0b" strokeWidth="1.8" markerEnd="url(#arrAmber)" />
          <path d="M382,210 C420,210 430,270 468,277" fill="none" stroke="#f59e0b" strokeWidth="1.8" markerEnd="url(#arrAmber)" />
          <path d="M530,305 L530,340" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4,3" />
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span>玩家按「Join」後，系統檢查佢嘅 rank，然後將佢放入對應嘅技術等級隊列（Low / Average / High）。</span></li>
        <li><span className="step-num">2</span><span>配對系統優先將同一隊列入面嘅第一個玩家配對埋一齊——呢個係最公平嘅做法。</span></li>
        <li><span className="step-num">3</span><span>如果玩家等咗超過 30 秒仍未配對成功，系統會<strong style={{ color: '#f59e0b' }}>自動容許跨隊列配對</strong>。例如 Low Skill 玩家可以配對到 Average Skill 隊列。呢個係避免玩家等太耐，提升用戶體驗。</span></li>
      </ol>

      <div className="use-case">
        <h4>為咩要設 Timeout？</h4>
        <p>假設深夜時段，High Skill 隊列只有一個玩家在線，佢可能永遠等唔到對手。設定 30 秒 timeout 後，佢可以同 Average Skill 嘅玩家配對，總好過完全玩唔到。呢個係在公平性同可用性之間取得平衡。</p>
      </div>
    </div>
  );
}

function GameServiceTab() {
  return (
    <div className="card">
      <h2>遊戲服務架構</h2>
      <div className="subtitle">ALB Sticky Session + WebSocket 實現雙人對戰</div>
      <p>
        配對完成之後，下一步就係將兩個玩家連接到同一個遊戲容器。呢個係整個架構最關鍵嘅部分——<strong style={{ color: '#34d399' }}>兩個玩家必須連到同一台 Server</strong>，否則佢哋根本冇辦法即時對戰。
      </p>
      <p>
        可以用 <strong style={{ color: '#6366f1' }}>Application Load Balancer (ALB) with Sticky Sessions</strong> 嚟解決呢個問題。當 Matchmaking Service 將兩個玩家配對成功後，佢會發送一個請求俾 Game Service。ALB 會用 sticky session 嘅機制，確保呢兩個玩家嘅連接都會被路由到同一個 Game Container。
      </p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow2" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feFlood floodColor="#34d399" floodOpacity="0.25" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="gradMatch2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradALB" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradContainer" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrGreen2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrAmber2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
          </defs>
          <g transform="translate(40,150)">
            <rect width="140" height="80" rx="14" fill="url(#gradMatch2)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow2)" />
            <text x="70" y="30" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Matchmaking</text>
            <text x="70" y="50" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Service</text>
            <text x="70" y="68" textAnchor="middle" fill="#9ca3af" fontSize="9">配對完成</text>
          </g>
          <g transform="translate(270,140)">
            <rect width="160" height="100" rx="14" fill="url(#gradALB)" stroke="#34d399" strokeWidth="2.5" filter="url(#glowGreen)" />
            <text x="80" y="30" textAnchor="middle" fill="#34d399" fontSize="15" fontWeight="700">ALB</text>
            <text x="80" y="52" textAnchor="middle" fill="#9ca3af" fontSize="10">Application Load Balancer</text>
            <text x="80" y="72" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">Sticky Session</text>
            <text x="80" y="88" textAnchor="middle" fill="#9ca3af" fontSize="9">確保同一容器</text>
          </g>
          <g transform="translate(530,50)">
            <rect width="140" height="70" rx="14" fill="url(#gradContainer)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow2)" />
            <text x="70" y="26" textAnchor="middle" fill="#6366f1" fontSize="12" fontWeight="700">Game Container 1</text>
            <text x="70" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">Player A + B</text>
            <text x="70" y="60" textAnchor="middle" fill="#34d399" fontSize="9">WebSocket Active</text>
          </g>
          <g transform="translate(530,160)">
            <rect width="140" height="70" rx="14" fill="url(#gradContainer)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow2)" />
            <text x="70" y="26" textAnchor="middle" fill="#6366f1" fontSize="12" fontWeight="700">Game Container 2</text>
            <text x="70" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">Player C + D</text>
            <text x="70" y="60" textAnchor="middle" fill="#34d399" fontSize="9">WebSocket Active</text>
          </g>
          <g transform="translate(530,270)">
            <rect width="140" height="70" rx="14" fill="url(#gradContainer)" stroke="#6366f1" strokeWidth="2" filter="url(#shadow2)" />
            <text x="70" y="26" textAnchor="middle" fill="#6366f1" fontSize="12" fontWeight="700">Game Container 3</text>
            <text x="70" y="46" textAnchor="middle" fill="#9ca3af" fontSize="10">Idle</text>
            <text x="70" y="60" textAnchor="middle" fill="#9ca3af" fontSize="9">等待配對</text>
          </g>
          <path d="M182,190 C220,190 230,190 268,190" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrAmber2)" />
          <text x="225" y="180" textAnchor="middle" fill="#fbbf24" fontSize="10">Match Request</text>
          <path d="M432,170 C470,170 490,100 528,85" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen2)" />
          <path d="M432,190 C470,190 490,195 528,195" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen2)" />
          <g transform="translate(270,280)">
            <rect width="160" height="50" rx="10" fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="1.5" />
            <text x="80" y="20" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="700">WebSocket Connection</text>
            <text x="80" y="38" textAnchor="middle" fill="#9ca3af" fontSize="9">即時雙向通訊</text>
          </g>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span>Matchmaking Service 配對成功後，發送請求俾 Game Service，請求會經過 ALB。</span></li>
        <li><span className="step-num">2</span><span>ALB 使用 Sticky Session 機制（通常用 Cookie 或 Session ID），確保同一場遊戲嘅兩個玩家都會被路由到同一個 Game Container。呢個係關鍵。</span></li>
        <li><span className="step-num">3</span><span>兩個玩家同一個 Container 建立 <strong style={{ color: '#6366f1' }}>WebSocket 連接</strong>，之後所有棋步都透過 WebSocket 即時傳送。Container 會維護遊戲狀態（棋盤、輪到邊個行棋等）。</span></li>
        <li><span className="step-num">4</span><span>遊戲結束後，Container 會將最終狀態（勝負結果、玩家表現）寫入 Ranking Database，更新玩家嘅 rank。</span></li>
      </ol>

      <div className="key-points">
        <div className="key-point">
          <h4>點解要 Sticky Session？</h4>
          <p>如果兩個玩家連到唔同嘅 Container，佢哋根本冇辦法睇到對方嘅棋步。Sticky Session 確保同一場遊戲嘅所有請求都去同一台 Server，遊戲狀態就唔使跨 Server 同步。</p>
        </div>
        <div className="key-point">
          <h4>ALB 點樣做到 Sticky？</h4>
          <p>ALB 會生成一個 Session Cookie（例如 AWSALB），並且將佢同特定嘅 Container 綁定。之後所有帶住呢個 Cookie 嘅請求都會被路由到同一個 Container。</p>
        </div>
      </div>
    </div>
  );
}

function WebSocketTab() {
  return (
    <div className="card">
      <h2>WebSocket vs UDP — 點解揀 TCP？</h2>
      <div className="subtitle">國際象棋需要嘅係可靠性，唔係速度</div>
      <p>
        好多人會問：既然係即時遊戲，點解唔用 UDP？UDP 唔係更快咩？呢個係一個好好嘅問題，答案係<strong style={{ color: '#f59e0b' }}>遊戲類型決定通訊協議</strong>。
      </p>
      <p>
        國際象棋係一個<strong style={{ color: '#6366f1' }}>回合制、慢節奏</strong>嘅遊戲。玩家每步棋可能要諗幾分鐘，所以延遲 100ms 同 10ms 根本冇分別——玩家根本感受唔到。但係，如果有一步棋嘅訊息丟失咗，個遊戲就會出現嚴重 bug（例如玩家 A 已經移動咗棋子，但玩家 B 睇唔到）。
      </p>
      <p>
        所以適合用 <strong style={{ color: '#34d399' }}>WebSocket（基於 TCP）</strong>。TCP 會保證每一個訊息都<strong>準確送達</strong>，而且<strong>按順序送達</strong>。呢個對國際象棋嚟講係最重要嘅——可靠性遠比低延遲重要。
      </p>

      <div className="key-points" style={{ marginTop: '20px' }}>
        <div className="key-point">
          <h4>WebSocket over TCP</h4>
          <p>每個訊息都會被確認收到（ACK），如果丟失咗會自動重傳。訊息會按發送順序送達，唔會出現亂序。呢個對遊戲邏輯嚟講非常重要。</p>
        </div>
        <div className="key-point">
          <h4>UDP 適用場景</h4>
          <p>如果係快節奏遊戲（例如 FPS、MOBA），UDP 會係更好嘅選擇。因為呢啲遊戲需要極低延遲，丟失少量封包（例如某一幀嘅位置更新）係可以接受嘅。</p>
        </div>
        <div className="key-point">
          <h4>訊息可靠性</h4>
          <p>TCP 保證「exactly once delivery」——每個訊息只會送達一次，唔會重複、唔會丟失。呢個對國際象棋嘅棋步紀錄、悔棋邏輯都好重要。</p>
        </div>
        <div className="key-point">
          <h4>順序保證</h4>
          <p>TCP 保證訊息按發送順序送達。例如玩家 A 連續行咗兩步棋，玩家 B 一定會按正確順序收到呢兩步。UDP 就冇呢個保證。</p>
        </div>
      </div>

      <div className="diagram-container">
        <svg viewBox="0 0 750 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow3" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <linearGradient id="gradPlayer2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradGame" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f3d2e" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <linearGradient id="gradDB" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3d2e0a" /><stop offset="100%" stopColor="#1e293b" /></linearGradient>
            <marker id="arrGreen3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34d399" /></marker>
            <marker id="arrBlue3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
            <marker id="arrAmber3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" /></marker>
          </defs>
          <g transform="translate(40,60)">
            <rect width="120" height="65" rx="14" fill="url(#gradPlayer2)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow3)" />
            <text x="60" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Player A</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">移動棋子</text>
          </g>
          <g transform="translate(40,180)">
            <rect width="120" height="65" rx="14" fill="url(#gradPlayer2)" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow3)" />
            <text x="60" y="28" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">Player B</text>
            <text x="60" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">接收對手棋步</text>
          </g>
          <g transform="translate(280,100)">
            <rect width="160" height="90" rx="14" fill="url(#gradGame)" stroke="#34d399" strokeWidth="2.5" filter="url(#shadow3)" />
            <text x="80" y="28" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="700">Game Container</text>
            <text x="80" y="50" textAnchor="middle" fill="#9ca3af" fontSize="10">維護遊戲狀態</text>
            <text x="80" y="68" textAnchor="middle" fill="#6366f1" fontSize="11" fontWeight="700">WebSocket (TCP)</text>
          </g>
          <g transform="translate(560,105)">
            <rect width="140" height="80" rx="14" fill="url(#gradDB)" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow3)" />
            <text x="70" y="28" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">Ranking DB</text>
            <text x="70" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10">更新玩家 rank</text>
            <text x="70" y="66" textAnchor="middle" fill="#9ca3af" fontSize="9">遊戲結束後</text>
          </g>
          <path d="M162,92 C210,92 240,125 278,125" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen3)" />
          <path d="M278,140 C240,140 210,110 162,110" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue3)" strokeDasharray="4,3" />
          <path d="M162,212 C210,212 240,165 278,165" fill="none" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrGreen3)" />
          <path d="M278,175 C240,175 210,225 162,225" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrBlue3)" strokeDasharray="4,3" />
          <path d="M442,145 C490,145 520,145 558,145" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrAmber3)" />
          <text x="500" y="135" textAnchor="middle" fill="#fbbf24" fontSize="10">Game Result</text>
          <text x="220" y="80" textAnchor="middle" fill="#34d399" fontSize="9">Move</text>
          <text x="220" y="130" textAnchor="middle" fill="#6366f1" fontSize="9">ACK</text>
          <text x="220" y="200" textAnchor="middle" fill="#34d399" fontSize="9">State Update</text>
          <text x="220" y="245" textAnchor="middle" fill="#6366f1" fontSize="9">ACK</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span>Player A 移動一隻棋子，訊息透過 WebSocket 發送俾 Game Container。</span></li>
        <li><span className="step-num">2</span><span>Game Container 收到訊息後，更新遊戲狀態（棋盤佈局、輪到邊個行棋），並且<strong style={{ color: '#6366f1' }}>發送 ACK 俾 Player A 確認收到</strong>。</span></li>
        <li><span className="step-num">3</span><span>Container 將更新後嘅遊戲狀態透過 WebSocket 發送俾 Player B，Player B 睇到對手嘅棋步。</span></li>
        <li><span className="step-num">4</span><span>遊戲結束後，Container 將最終結果（勝負、玩家表現）寫入 Ranking Database，更新兩個玩家嘅 rank。下次配對時會使用新嘅 rank。</span></li>
      </ol>

      <div className="use-case">
        <h4>實際考量</h4>
        <p>對於國際象棋呢類遊戲，應該優先考慮可靠性、狀態一致性、訊息順序。TCP 完美符合呢啲需求。如果係做緊 FPS 遊戲，咁就應該考慮 UDP + 自訂可靠性層（例如只對重要訊息做 ACK）。記住：技術選型永遠要根據業務需求。</p>
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
        <h4>Prompt 1 — 設計國際象棋遊戲架構（OOP）</h4>
        <div className="prompt-text">
{`幫手用 [語言，例如 TypeScript / Python / Java / C#] 設計一個國際象棋遊戲嘅 OOP 架構。

要求：
1. 設計 class hierarchy：
   - 抽象 Piece class（共用邏輯）→ King / Queen / Rook / Bishop / Knight / Pawn 子類
   - Board class 管理 8x8 棋盤狀態
   - Game class 管理遊戲流程（輪次、勝負判定）
   - Player class（白方 / 黑方）
2. 每隻棋子實作 getValidMoves() 方法，返回所有合法移動位置
3. 實作特殊規則：Castling（王車易位）、En Passant（吃過路兵）、Pawn Promotion（兵升變）
4. 實作 Check（將軍）同 Checkmate（將殺）判定邏輯
5. 用 Design Patterns：Strategy Pattern（棋子移動策略）、Observer Pattern（UI 更新通知）
6. 提供完整嘅 UML class diagram 描述`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — 實作即時對戰 Game State 管理系統</h4>
        <div className="prompt-text">
{`幫手實作一個即時對戰嘅 game state 管理系統，用 [技術棧，例如 Node.js + Socket.IO / Python + WebSocket / Go + gorilla/websocket]。

要求：
1. 設計 Game State 數據結構：
   - 棋盤狀態（每格嘅棋子資訊）
   - 當前輪次（白方 / 黑方）
   - 移動歷史記錄（支援 undo / replay）
   - 計時器狀態（每方剩餘時間）
2. 實作 WebSocket server 處理即時通訊：
   - 玩家連接 / 斷線重連機制
   - 棋步驗證（server-side validation，防止作弊）
   - 廣播棋步俾對手
3. 實作 matchmaking 配對邏輯（按 ELO rating 分隊列）
4. 遊戲結束後更新玩家 ranking（ELO 計算公式）
5. 加入 spectator mode（觀戰功能）——只接收 state update，唔可以操作
6. 處理 edge cases：玩家斷線超過 [時間，例如 60 秒] 自動判負`}
        </div>
      </div>
    </div>
  );
}

export default function ChessGameDesign() {
  return (
    <>
      <TopicTabs
        title="國際象棋遊戲架構"
        subtitle="配對系統、遊戲服務、WebSocket 通訊完整拆解"
        tabs={[
          { id: 'matchmaking', label: '① 配對系統', content: <MatchmakingTab /> },
          { id: 'game-service', label: '② 遊戲服務', content: <GameServiceTab /> },
          { id: 'websocket', label: '③ WebSocket vs UDP', premium: true, content: <WebSocketTab /> },
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
