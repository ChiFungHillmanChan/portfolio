// premium-gate.js — Shared premium status module
(function () {
  const PREMIUM_KEY = 'sd_premium';
  const PREMIUM_ACTIVATED_EVENT = 'sd:premium-activated';

  function isPremium() {
    try {
      const data = JSON.parse(localStorage.getItem(PREMIUM_KEY));
      return data && data.active === true;
    } catch {
      return false;
    }
  }

  function activatePremium(sessionId) {
    localStorage.setItem(PREMIUM_KEY, JSON.stringify({
      active: true,
      activatedAt: new Date().toISOString(),
      sessionId: sessionId || 'manual'
    }));
    window.dispatchEvent(new CustomEvent(PREMIUM_ACTIVATED_EVENT));
  }

  // Expose globally
  window.SDPremium = { isPremium, activatePremium, PREMIUM_KEY, PREMIUM_ACTIVATED_EVENT };
})();

// Auto-apply tab gating when loaded in a topic page
document.addEventListener('DOMContentLoaded', function () {
  if (!window.SDPremium) return;

  const premiumTabs = document.querySelectorAll('.tab-btn[data-premium="true"]');
  if (premiumTabs.length === 0) return;

  // Inject lock overlay styles
  const style = document.createElement('style');
  style.textContent = `
    .premium-lock-overlay {
      position: relative;
      min-height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 24px;
    }
    .premium-lock-overlay::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 0%, #0f1117 100%);
      pointer-events: none;
    }
    .lock-icon { font-size: 3rem; margin-bottom: 16px; position: relative; z-index: 1; }
    .lock-title { font-size: 1.2rem; font-weight: 700; color: #ffffff; margin-bottom: 8px; position: relative; z-index: 1; }
    .lock-desc { font-size: 0.9rem; color: #9ca3af; margin-bottom: 20px; line-height: 1.6; position: relative; z-index: 1; max-width: 400px; }
    .unlock-btn {
      padding: 12px 28px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s ease;
      position: relative;
      z-index: 1;
    }
    .unlock-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4); }
    .tab-btn[data-premium="true"]::after {
      content: '🚧';
      font-size: 0.7rem;
      margin-left: 4px;
    }
    .tab-btn[data-premium="true"].premium-unlocked::after {
      content: '';
    }
  `;
  document.head.appendChild(style);

  if (window.SDPremium.isPremium()) {
    // Premium user — remove lock indicators
    premiumTabs.forEach(tab => tab.classList.add('premium-unlocked'));
    return;
  }

  // Free user — replace premium tab content with lock overlay
  premiumTabs.forEach(tab => {
    const tabId = tab.getAttribute('data-tab');
    const content = document.getElementById(tabId);
    if (!content) return;

    // Store original content
    content.setAttribute('data-original', content.innerHTML);

    // Replace with coming soon overlay
    content.innerHTML = `
      <div class="premium-lock-overlay">
        <div class="lock-icon">🚧</div>
        <div class="lock-title">Coming Soon</div>
        <div class="lock-desc">呢個部分嘅實戰練習同 AI 提示模板即將推出。<br>而家付款 HK$150，上線後即刻解鎖全部內容。</div>
        <button class="unlock-btn" onclick="window.top.location.hash='premium'">預購 Premium — HK$150</button>
      </div>
    `;
  });
});

// Pitfall stories renderer — auto-injects if pitfall data exists
document.addEventListener('DOMContentLoaded', function () {
  const pitfallData = document.getElementById('pitfall-data');
  if (!pitfallData) return;

  const pitfalls = JSON.parse(pitfallData.textContent);
  if (!pitfalls || pitfalls.length === 0) return;

  const firstTab = document.querySelector('.tab-content.active') || document.querySelector('.tab-content');
  if (!firstTab) return;

  const pitfallHtml = `
    <div class="card" style="border-left:3px solid #f59e0b;margin-top:24px;">
      <h2 style="color:#fbbf24;font-size:1.2rem;margin-bottom:16px;">⚠️ 踩坑故事</h2>
      ${pitfalls.map(p => `
        <div style="margin-bottom:20px;padding:16px;background:#13151c;border-radius:10px;border:1px solid #2a2d3a;">
          <h4 style="color:#fbbf24;font-size:0.95rem;margin-bottom:8px;">${p.title}</h4>
          <p style="color:#c0c4cc;font-size:0.88rem;line-height:1.7;margin-bottom:8px;">${p.story}</p>
          <div style="font-size:0.82rem;color:#34d399;font-weight:600;">💡 教訓：${p.lesson}</div>
        </div>
      `).join('')}
    </div>
  `;

  firstTab.insertAdjacentHTML('beforeend', pitfallHtml);
});

// Quiz renderer — auto-injects quiz tab if quiz data exists
document.addEventListener('DOMContentLoaded', function () {
  const quizData = document.getElementById('quiz-data');
  if (!quizData) return;

  const questions = JSON.parse(quizData.textContent);
  if (!questions || questions.length === 0) return;

  const tabsContainer = document.querySelector('.tabs');
  if (!tabsContainer) return;

  const quizBtn = document.createElement('button');
  quizBtn.className = 'tab-btn';
  quizBtn.setAttribute('data-tab', 'quiz');
  quizBtn.setAttribute('data-premium', 'true');
  quizBtn.textContent = '⑤ Quiz';
  tabsContainer.appendChild(quizBtn);

  const quizContent = document.createElement('div');
  quizContent.className = 'tab-content';
  quizContent.id = 'quiz';

  if (!window.SDPremium?.isPremium()) {
    quizContent.innerHTML = `
      <div class="premium-lock-overlay">
        <div class="lock-icon">🚧</div>
        <div class="lock-title">Quiz — Coming Soon</div>
        <div class="lock-desc">互動測驗即將推出。付款 HK$150 即可喺上線後解鎖全部 Quiz。</div>
        <button class="unlock-btn" onclick="window.top.location.hash='premium'">預購 Premium — HK$150</button>
      </div>
    `;
  } else {
    quizContent.innerHTML = renderQuiz(questions);
  }

  const lastContent = document.querySelector('.tab-content:last-of-type');
  if (lastContent) {
    lastContent.parentNode.insertBefore(quizContent, lastContent.nextSibling);
  }

  // Apply lock styling to quiz tab if not premium
  if (!window.SDPremium?.isPremium()) {
    // Lock styles already injected by tab gating above
  } else {
    quizBtn.classList.add('premium-unlocked');
  }

  // Wire up tab click
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  quizBtn.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    quizBtn.classList.add('active');
    quizContent.classList.add('active');
  });
});

function renderQuiz(questions) {
  return `<div class="card" style="margin-top:0">
    <h2>Quiz</h2>
    <div class="subtitle">測試你對呢個課題嘅理解</div>
    <div id="quiz-container">
      ${questions.map((q, i) => `
        <div class="quiz-question" data-index="${i}" style="margin-bottom:24px;padding:20px;background:#13151c;border-radius:12px;border:1px solid #2a2d3a;">
          <p style="font-weight:600;color:#fff;margin-bottom:16px;">${i + 1}. ${q.question}</p>
          ${q.options.map((opt, j) => `
            <button class="quiz-option" data-correct="${opt.correct}" data-explanation="${encodeURIComponent(opt.explanation || '')}"
              style="display:block;width:100%;text-align:left;padding:12px 16px;margin-bottom:8px;background:#1a1d27;border:1px solid #2a2d3a;border-radius:8px;color:#c0c4cc;cursor:pointer;font-family:inherit;font-size:0.9rem;transition:all 0.2s ease;"
              onmouseover="this.style.borderColor='#6366f1'" onmouseout="if(!this.closest('.answered'))this.style.borderColor='#2a2d3a'"
              onclick="handleQuizAnswer(this)">
              ${opt.text}
            </button>
          `).join('')}
          <div class="quiz-feedback" style="display:none;margin-top:12px;padding:12px 16px;border-radius:8px;font-size:0.85rem;line-height:1.6;"></div>
        </div>
      `).join('')}
    </div>
    <div id="quiz-score" style="display:none;text-align:center;padding:24px;background:rgba(99,102,241,0.1);border-radius:12px;margin-top:16px;">
      <div style="font-size:2rem;margin-bottom:8px;">🎯</div>
      <div style="font-size:1.2rem;font-weight:700;color:#fff;" id="quiz-score-text"></div>
    </div>
  </div>`;
}

window.handleQuizAnswer = function (btn) {
  const question = btn.closest('.quiz-question');
  if (question.classList.contains('answered')) return;
  question.classList.add('answered');

  const isCorrect = btn.getAttribute('data-correct') === 'true';
  const explanation = decodeURIComponent(btn.getAttribute('data-explanation'));

  // Disable all options in this question
  question.querySelectorAll('.quiz-option').forEach(opt => {
    opt.style.cursor = 'default';
    opt.onmouseover = null;
    opt.onmouseout = null;
    if (opt.getAttribute('data-correct') === 'true') {
      opt.style.borderColor = '#10B981';
      opt.style.background = 'rgba(16,185,129,0.1)';
    }
  });

  if (!isCorrect) {
    btn.style.borderColor = '#f87171';
    btn.style.background = 'rgba(248,113,113,0.1)';
  }

  // Show feedback
  const feedback = question.querySelector('.quiz-feedback');
  feedback.style.display = 'block';
  feedback.style.background = isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)';
  feedback.style.color = isCorrect ? '#34d399' : '#fca5a5';
  feedback.innerHTML = `<strong>${isCorrect ? '✅ 正確！' : '❌ 唔啱'}</strong> ${explanation}`;

  // Check if all answered
  const total = document.querySelectorAll('.quiz-question').length;
  const answered = document.querySelectorAll('.quiz-question.answered').length;
  if (answered === total) {
    let score = 0;
    document.querySelectorAll('.quiz-question.answered').forEach(q => {
      const clickedWrong = q.querySelector('.quiz-option[style*="border-color: rgb(248"]');
      if (!clickedWrong) score++;
    });
    const scoreEl = document.getElementById('quiz-score');
    const scoreText = document.getElementById('quiz-score-text');
    scoreEl.style.display = 'block';
    scoreText.textContent = `你答啱咗 ${score} / ${total} 題`;
  }
};

// Interview checklist renderer (premium-gated)
document.addEventListener('DOMContentLoaded', function () {
  const checklistData = document.getElementById('interview-checklist');
  if (!checklistData) return;

  const data = JSON.parse(checklistData.textContent);
  if (!data || !data.points) return;

  const container = document.querySelector('.container');
  if (!container) return;

  const isPremium = window.SDPremium?.isPremium();
  const checklistHtml = isPremium
    ? `<div class="card" style="border-left:3px solid #6366f1;margin-top:24px;">
        <h2 style="color:#a5b4fc;font-size:1.1rem;margin-bottom:12px;">📝 面試必講 Checklist</h2>
        <ol style="padding-left:20px;">
          ${data.points.map(p => `<li style="color:#c0c4cc;font-size:0.9rem;line-height:1.8;margin-bottom:4px;">${p}</li>`).join('')}
        </ol>
      </div>`
    : `<div class="card" style="border-left:3px solid #6366f1;margin-top:24px;position:relative;overflow:hidden;">
        <h2 style="color:#a5b4fc;font-size:1.1rem;margin-bottom:12px;">📝 面試必講 Checklist</h2>
        <div style="filter:blur(4px);pointer-events:none;">
          <ol style="padding-left:20px;">
            ${data.points.slice(0, 2).map(p => `<li style="color:#c0c4cc;font-size:0.9rem;line-height:1.8;">${p}</li>`).join('')}
            <li style="color:#c0c4cc;font-size:0.9rem;">...</li>
          </ol>
        </div>
        <div style="text-align:center;margin-top:8px;">
          <button class="unlock-btn" onclick="window.top.location.hash='premium'" style="font-size:0.85rem;padding:8px 20px;">Coming Soon — 預購即享</button>
        </div>
      </div>`;

  container.insertAdjacentHTML('beforeend', checklistHtml);
});
