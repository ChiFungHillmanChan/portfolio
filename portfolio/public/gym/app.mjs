import { EXERCISES, PROGRAMS, GLOSSARY, PHRASES } from './data.mjs';
import { createStore, localDateKey, monthCells, getScheduledDay } from './store.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const store = createStore();
const main = $('#main');
const exercises = new Map(EXERCISES.map(exercise => [exercise.id, exercise]));
let selectedDate = localDateKey();
let month = new Date(`${selectedDate}T12:00:00`);
let view = 'today';
let search = '';
let filter = '全部';
let toastTimeout;
let offlineReady = false;
let installPrompt;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let previewsPlaying = !motionPreference.matches;
let previewObserver;
const dateObject = key => new Date(`${key}T12:00:00`);
const displayDate = key => dateObject(key).toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'long' });
const repUnit = exercise => exercise.unit === 'seconds' ? '秒' : exercise.unit === 'minutes' ? '分鐘' : '下';
const programById = id => PROGRAMS.find(program => program.id === id) || PROGRAMS[0];

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.hidden = true; }, 4500);
}

function storageError(error) {
  const target = $('#storage-error');
  target.textContent = `未能儲存：${error.message}。請先匯出備份，檢查瀏覽器儲存空間或設定。`;
  target.hidden = false;
}

function readDay() {
  const days = store.allDays();
  const day = store.getDay(selectedDate);
  if (!days[selectedDate]) {
    const settings = store.getSettings();
    const program = programById(settings.programId);
    const index = getScheduledDay(selectedDate, settings.startDate, program);
    day.programId = program.id;
    day.workoutIndex = index ?? 0;
    day.status = index === null ? 'rest' : '';
  }
  return day;
}

function persist(day, showToast = false) {
  try {
    store.saveDay(selectedDate, day);
    $('#storage-error').hidden = true;
    document.querySelectorAll('.save-state').forEach(el => { el.textContent = '✓ 已儲存喺呢部裝置'; });
    if (showToast) notify('已儲存喺呢部裝置');
    updateCalendarMarks();
    return true;
  } catch (error) {
    storageError(error);
    return false;
  }
}

function currentWorkout(day = readDay()) {
  const program = programById(day.programId);
  return { program, workout: program.days[day.workoutIndex] || program.days[0] };
}

function exerciseLog(day, exercise) {
  return day.exercises[exercise.id] || {
    sets: Array.from({ length: Math.min(Number(exercise.sets) || 3, 6) }, () => ({ weight: '', reps: '', done: false })), notes: '',
  };
}

function totalSets(day) {
  return Object.values(day.exercises).reduce((sum, entry) => sum + entry.sets.filter(set => set.done).length, 0);
}

function previousLog(id) {
  const days = store.allDays();
  const key = Object.keys(days).filter(date => date < selectedDate && days[date].exercises[id]?.sets.some(set => set.done)).sort().at(-1);
  if (!key) return '記低今次，留畀下次嘅自己。';
  const entry = days[key].exercises[id].sets.find(set => set.done);
  return `上次 ${key.slice(5).replace('-', '/')} · ${entry.weight ? `${entry.weight} kg × ` : ''}${entry.reps || '—'} ${repUnit(exercises.get(id) || {})}`;
}

function artwork() {
  return `<div class="hero-art" aria-hidden="true"><div class="big-type">GYM.</div><svg viewBox="0 0 380 210" fill="none"><g stroke="#85936b" stroke-width="1"><path d="M20 177H355M31 32V186M51 167H345" stroke-dasharray="3 6"/><path d="M69 141L281 48M96 176L310 80" opacity=".4"/></g><g transform="translate(36 43)"><path d="M57 83L229 30L245 77L74 130Z" fill="#a6b68d" stroke="#57623b" stroke-width="2"/><path d="M63 96L236 43M67 109L240 57" stroke="#74895b" stroke-width="2"/><path d="M42 54L70 45L108 153L79 163Z" fill="#20271f"/><path d="M20 70L44 62L74 151L50 159Z" fill="#49553b"/><path d="M1 91L23 84L43 140L20 147Z" fill="#788968"/><path d="M241 1L270 0L304 98L276 108Z" fill="#20271f"/><path d="M270 5L295 0L326 88L303 99Z" fill="#49553b"/><path d="M300 19L323 13L343 69L321 77Z" fill="#788968"/><path d="M49 64L77 144M249 13L278 96" stroke="#d9f277" stroke-width="2"/></g><path d="M126 187h82M167 178v18" stroke="#85936b"/><circle cx="333" cy="30" r="16" fill="#d9f277"/><path d="M326 30h14M333 23v14" stroke="#57623b"/></svg><span class="art-caption">FORM FIRST. WEIGHT FOLLOWS.</span></div>`;
}

function calendarMarkup(wide = false) {
  const days = store.allDays();
  const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const completed = Object.entries(days).filter(([key, day]) => key.startsWith(prefix) && day.status === 'done').length;
  return `<section class="panel calendar-panel ${wide ? 'wide-calendar' : ''}" aria-label="訓練月曆"><div class="panel-title"><div><p class="month-name">${month.getFullYear()} 年 ${month.getMonth() + 1} 月</p></div><div class="month-control"><button data-month="-1" aria-label="上一個月">←</button><button data-month="1" aria-label="下一個月">→</button></div></div><div class="calendar-grid">${['一','二','三','四','五','六','日'].map(day => `<span class="weekday">${day}</span>`).join('')}${monthCells(month.getFullYear(), month.getMonth()).map(key => key ? calendarButton(key, days[key]) : '<span></span>').join('')}</div><div class="legend"><span><i></i>已完成</span><span><i class="note"></i>有紀錄</span><span><i class="rest"></i>休息</span></div><div class="calendar-foot"><span>今個月完成 <b data-month-count>${completed}</b> 日</span><button class="text-button" data-action="go-today">返去今日 ↗</button></div></section>`;
}

function calendarButton(key, day) {
  const marker = day?.status === 'done' ? 'done' : day?.status === 'rest' ? 'rest' : day && (day.notes || day.bodyweight || day.status || Object.keys(day.exercises).length) ? 'note' : '';
  const status = marker === 'done' ? '，已完成' : marker === 'rest' ? '，休息' : marker ? '，有紀錄' : '';
  return `<button class="calendar-day ${key === selectedDate ? 'selected' : ''} ${key === localDateKey() ? 'today' : ''} ${marker ? `has-${marker}` : ''}" data-date="${key}" aria-label="${key}${status}" aria-pressed="${key === selectedDate}">${Number(key.slice(-2))}${marker ? '<i class="dot" aria-hidden="true"></i>' : ''}</button>`;
}

function updateCalendarMarks() {
  const days = store.allDays();
  document.querySelectorAll('.calendar-day').forEach(button => {
    button.outerHTML = calendarButton(button.dataset.date, days[button.dataset.date]);
  });
  const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  document.querySelectorAll('[data-month-count]').forEach(el => {
    el.textContent = Object.entries(days).filter(([key, day]) => key.startsWith(prefix) && day.status === 'done').length;
  });
  const count = $('[data-set-count]');
  if (count) count.textContent = totalSets(readDay());
  document.querySelectorAll('[data-completed-count]').forEach(el => { el.textContent = totalSets(readDay()); });
}

function notesMarkup(day) {
  return `<section class="panel daily-notes"><div class="panel-title"><h3>今日手記</h3><small>DAILY NOTES</small></div><label for="bodyweight">體重 · Body weight (kg)<input type="number" id="bodyweight" data-day-field="bodyweight" min="0" max="1000" step="0.1" inputmode="decimal" placeholder="例如 72.5" value="${esc(day.bodyweight)}"></label><label for="day-notes">今日感覺點？<textarea id="day-notes" data-day-field="notes" maxlength="10000" placeholder="今日嘅狀態、重量、教練提你嘅重點…">${esc(day.notes)}</textarea></label><div class="status-buttons" aria-label="當日狀態">${[['planned','計劃訓練'],['done','已完成'],['rest','休息日']].map(([id,label]) => `<button data-status="${id}" aria-pressed="${day.status === id}">${label}</button>`).join('')}</div><p class="notes-hint">一邊記，一邊自動儲存。只限呢個瀏覽器。</p><div class="save-state" role="status"></div></section>`;
}

function previewMarkup(exercise) {
  if (!exercise.media || !exercise.poster) return '<span class="preview-pending">示範整理中</span>';
  if (/\.(mp4|webm)$/i.test(exercise.media)) {
    return `<video class="motion-preview" src="${esc(exercise.media)}" poster="${esc(exercise.poster)}" muted loop playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video>`;
  }
  return `<img class="motion-preview" src="${esc(exercise.poster)}" data-motion-src="${esc(exercise.media)}" data-poster="${esc(exercise.poster)}" alt="" loading="lazy">`;
}

function updatePreview(media) {
  const play = previewsPlaying && media.dataset.visible === 'true' && !document.hidden && !document.querySelector('dialog[open]');
  if (media.tagName === 'VIDEO') {
    media.muted = true;
    if (play) media.play().catch(() => {});
    else media.pause();
  } else {
    const source = play ? media.dataset.motionSrc : media.dataset.poster;
    if (media.getAttribute('src') !== source) media.src = source;
  }
}

function attachPreviews() {
  previewObserver?.disconnect();
  previewObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.dataset.visible = String(entry.isIntersecting);
      updatePreview(entry.target);
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.motion-preview').forEach(media => previewObserver.observe(media));
  const button = $('#motion-toggle');
  button.textContent = previewsPlaying ? 'Ⅱ 暫停示範' : '▶ 播放示範';
  button.setAttribute('aria-pressed', String(previewsPlaying));
}

function exerciseCard(exercise, index, day) {
  const log = exerciseLog(day, exercise);
  return `<article class="exercise-card" data-exercise="${exercise.id}"><div class="exercise-top"><span class="exercise-number">${String(index + 1).padStart(2,'0')}</span><button class="exercise-thumb" data-demo="${exercise.id}" aria-label="睇${esc(exercise.zh)}示範">${previewMarkup(exercise)}<span class="play">▶</span></button><div><h3>${esc(exercise.zh)}</h3><div class="exercise-en">${esc(exercise.en)}</div><div class="prescription">${exercise.sets} 組 × ${esc(exercise.reps)} ${repUnit(exercise)} <span> / 休息 ${exercise.rest} 秒</span></div></div><button class="demo-link" data-demo="${exercise.id}">動作示範 ↗</button></div><table class="log-table"><thead><tr><th>組</th><th>重量 KG</th><th>${exercise.unit === 'seconds' ? '時間 SEC' : exercise.unit === 'minutes' ? '時間 MIN' : '次數 REPS'}</th><th>完成</th></tr></thead><tbody>${log.sets.map((set, setIndex) => `<tr><td>${String(setIndex + 1).padStart(2,'0')}</td><td><input type="number" min="0" max="1000" step="0.25" inputmode="decimal" data-set="${setIndex}" data-field="weight" aria-label="${esc(exercise.zh)}第${setIndex + 1}組重量" placeholder="—" value="${esc(set.weight)}"></td><td><input type="number" min="0" max="3600" step="1" inputmode="numeric" data-set="${setIndex}" data-field="reps" aria-label="${esc(exercise.zh)}第${setIndex + 1}組${exercise.unit === 'seconds' ? '秒數' : exercise.unit === 'minutes' ? '分鐘' : '次數'}" placeholder="${esc(exercise.reps)}" value="${esc(set.reps)}"></td><td><input type="checkbox" data-set="${setIndex}" data-field="done" aria-label="${esc(exercise.zh)}第${setIndex + 1}組完成" ${set.done ? 'checked' : ''}></td></tr>`).join('')}</tbody></table><div class="exercise-actions"><span class="previous">${esc(previousLog(exercise.id))}</span><button data-add-set="${exercise.id}" ${log.sets.length >= 20 ? 'disabled' : ''}>＋ 加一組</button></div></article>`;
}

function workoutMarkup(day, compact = false) {
  const { program, workout } = currentWorkout(day);
  const rest = day.status === 'rest';
  const list = workout.exerciseIds.map(id => exercises.get(id)).filter(Boolean);
  return `<div class="workout-column scroll-target" id="day-workout"><div class="section-heading"><div><h2>${selectedDate === localDateKey() ? '今日訓練' : '當日訓練'}</h2><p>${displayDate(selectedDate)}</p></div>${compact ? '' : `<div class="day-selector"><button class="icon-button" data-shift="-1" aria-label="前一日">←</button><input type="date" id="training-date" aria-label="訓練日期" value="${selectedDate}"><button class="icon-button" data-shift="1" aria-label="後一日">→</button></div>`}</div><div class="workout-banner"><div><div class="eyebrow">${esc(program.en)}</div><h3>${rest ? '休息，都係訓練一部分。' : esc(workout.label)}</h3><p>${rest ? '回一回氣，等下一次做得更好。' : `${list.length} 個動作 · 專注姿勢，逐步進步`}</p></div><div class="count"><span data-set-count>${totalSets(day)}</span><small>SETS DONE</small></div></div><div class="workout-controls"><label>課表 · Programme<select id="day-program">${PROGRAMS.map(item => `<option value="${item.id}" ${program.id === item.id ? 'selected' : ''}>${esc(item.zh)}</option>`).join('')}</select></label><label>訓練內容 · Session<select id="day-workout-select">${program.days.map((item,index) => `<option value="${index}" ${day.workoutIndex === index ? 'selected' : ''}>${esc(item.label)}</option>`).join('')}</select></label></div>${rest ? `<div class="empty"><div class="rest-illustration">RECOVER.</div><h3>今日可以輕鬆啲。</h3><p>行下路、活動下關節，或者記低身體狀態。想改期訓練，揀好課表就可以開始。</p><button class="primary-button" data-action="start-training">今日照樣練 →</button></div>` : `<p class="warmup-note">先做 5–10 分鐘輕量熱身，再用較輕重量練習第一個動作。正式組保留約 2–3 下餘力；有尖銳痛就停。</p>${list.map((exercise,index) => exerciseCard(exercise,index,day)).join('')}<div class="finish-row"><button class="primary-button ${day.status === 'done' ? 'lime' : ''}" data-action="finish">${day.status === 'done' ? '✓ 呢日已完成 · 取消完成' : '完成今日訓練　✓'}</button><small>已完成 <span data-completed-count>${totalSets(day)}</span> 組</small></div>`}${compact ? notesMarkup(day) : ''}</div>`;
}

function todayView() {
  const day = readDay();
  return `<section class="hero"><div><div class="eyebrow">YOUR PERSONAL TRAINING JOURNAL</div><h1>練好每一下。<br><span>記低每一步。</span></h1><p>由第一下開始，練出自己嘅節奏。<br>廣東話指引・英文動作名・離線都用得。</p></div>${artwork()}</section><div class="workspace">${workoutMarkup(day)}<aside class="sidebar">${calendarMarkup()}${notesMarkup(day)}<section class="panel tip-panel"><div class="eyebrow">A NOTE TO YOURSELF</div><p>重量係紀錄，姿勢先係重點。<br>做到目標次數、每組都穩定，<br>下次先考慮加少少重量。</p><a href="#guide">唔識用器材？試下咁問教練 ↗</a></section></aside></div>`;
}

function calendarView() {
  return `<section class="page-intro"><div class="eyebrow">YOUR WORK, DAY BY DAY</div><h1>每一日，都有紀錄。</h1><p>撳一日，睇返重量、完成嘅組數，同嗰日嘅自己講過嘅嘢。</p></section><div class="calendar-layout"><div>${calendarMarkup(true)}<section class="panel tip-panel"><div class="eyebrow">LOCAL TO THIS DEVICE</div><p>紀錄只會留喺呢個瀏覽器。換電話、清除網站資料之前，記得喺「設定」匯出備份。</p></section></div>${workoutMarkup(readDay(),true)}</div>`;
}

function libraryView() {
  return `<section class="page-intro"><div class="eyebrow">THE MOVEMENT LIBRARY / ${EXERCISES.length} EXERCISES</div><h1>先學識，再加重。</h1><p>睇示範、記住發力重點，再將每一下做好。</p></section><div class="toolbar"><input class="search" type="search" id="exercise-search" aria-label="搜尋動作" placeholder="搵動作：深蹲、Bench Press、啞鈴…" value="${esc(search)}"><div class="filters" aria-label="篩選器材">${['全部','啞鈴','槓鈴','機械','徒手'].map(label => `<button class="filter" data-filter="${label}" aria-pressed="${filter === label}">${label}</button>`).join('')}</div></div><div class="library-grid" id="library-results">${libraryCards()}</div>`;
}

function matchesFilter(exercise) {
  const value = `${exercise.equipment} ${exercise.en}`.toLowerCase();
  return filter === '全部' || (filter === '啞鈴' && /啞鈴|dumbbell|kettlebell/.test(value)) || (filter === '槓鈴' && /槓鈴|barbell/.test(value) && !/smith/.test(value)) || (filter === '機械' && /機|machine|cable|leg press|pulldown/.test(value)) || (filter === '徒手' && /徒手|bodyweight|pull-up bar|單槓|mat/.test(value));
}

function libraryCards() {
  const list = EXERCISES.filter(exercise => `${exercise.zh} ${exercise.en} ${exercise.muscle} ${exercise.equipment}`.toLowerCase().includes(search.toLowerCase()) && matchesFilter(exercise));
  if (!list.length) return '<div class="empty"><h3>未搵到呢個動作。</h3><p>試下英文名，或者揀「全部」。</p></div>';
  return list.map(exercise => `<button class="movement-tile" data-demo="${exercise.id}"><div class="tile-image"><span class="tile-no">${String(EXERCISES.indexOf(exercise)+1).padStart(2,'0')} / MOVEMENT</span>${previewMarkup(exercise)}<span class="play-label">${exercise.media ? '▶ 睇示範' : '動作指引 ↗'}</span></div><div class="tile-info"><h3>${esc(exercise.zh)}</h3><div class="exercise-en">${esc(exercise.en)}</div><div class="tile-meta">${esc(exercise.muscle)}　↗</div></div></button>`).join('');
}

function guideView() {
  const settings = store.getSettings();
  const program = programById(settings.programId);
  return `<section class="page-intro"><div class="eyebrow">FEEL AT HOME IN A UK GYM</div><h1>識做，亦識講。</h1><p>唔知點開口？直接畀教練睇呢一頁。</p></section><div class="guide-grid"><section class="guide-section"><h2>喺 Gym，用得着嘅英文。</h2>${PHRASES.map(phrase => `<div class="phrase"><p class="phrase-en" lang="en-GB">${esc(phrase.en)}</p><p class="phrase-zh">${esc(phrase.zh)}</p></div>`).join('')}</section><div><section class="guide-section"><h2>器材同訓練用語</h2>${GLOSSARY.map(item => `<div class="glossary-row"><b>${esc(item.zh)}</b><span lang="en-GB">${esc(item.en)}${item.meaning ? `<small lang="zh-HK">${esc(item.meaning)}</small>` : ''}</span></div>`).join('')}</section><section class="guide-section" style="margin-top:24px"><h2>你而家嘅節奏</h2><p>${esc(program.zh)}</p><p class="source-note">${esc(program.description)}</p><div class="week-summary">${['一','二','三','四','五','六','日'].map((day,index) => `<span class="${program.schedule[index] === null ? '' : 'training'}">${day} ${program.schedule[index] === null ? '休息' : '訓練'}</span>`).join('')}</div><ol class="instruction-list"><li>打底期每星期 2–3 日，兩次全身訓練之間留休息日。唔使急住轉課表。</li><li>每組用控制到嘅重量，記低 kg 同實際次數。啞鈴重量記單邊；槓鈴重量包括槓。</li><li>示範係參考；初次使用器材，請教練調座椅、安全架同睇姿勢。</li><li>保持正常呼吸；關節痛、頭暈或者胸痛就停止運動。</li></ol><p class="source-note">參考：<a href="https://www.nhs.uk/live-well/exercise/physical-activity-guidelines-for-adults-aged-19-to-64/" target="_blank" rel="noopener">NHS 成人活動指引 ↗</a>。每個動作嘅來源及媒體授權，見動作示範頁。</p></section></div></div>`;
}

function render() {
  view = ['today','calendar','library','guide'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'today';
  document.querySelectorAll('[data-view]').forEach(link => {
    if (link.dataset.view === view) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  main.innerHTML = view === 'calendar' ? calendarView() : view === 'library' ? libraryView() : view === 'guide' ? guideView() : todayView();
  attachPreviews();
  if (store.error) storageError(store.error);
}

function selectDate(key) {
  try {
    store.getDay(key);
    selectedDate = key;
    month = dateObject(key);
    if (view !== 'today' && view !== 'calendar') location.hash = 'calendar';
    else render();
  } catch (error) { notify('請揀有效日期。'); }
}

function openDemo(id) {
  const exercise = exercises.get(id);
  if (!exercise) return;
  const dialog = $('#exercise-dialog');
  const video = /\.(mp4|webm)$/i.test(exercise.media || '');
  const animated = /\.(mp4|webm|gif)$/i.test(exercise.media || '');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const credit = typeof exercise.mediaCredit === 'string' ? exercise.mediaCredit : exercise.mediaCredit ? JSON.stringify(exercise.mediaCredit) : '';
  dialog.innerHTML = `<div class="dialog-header"><div><div class="eyebrow">MOVEMENT ${String(EXERCISES.indexOf(exercise)+1).padStart(2,'0')}</div><h2 id="exercise-title">${esc(exercise.zh)}</h2><div class="exercise-en">${esc(exercise.en)}</div></div><button class="close" data-close aria-label="關閉示範">×</button></div><div class="dialog-body"><div class="demo-media">${video ? `<video id="demo-video" src="${esc(exercise.media)}" ${exercise.poster ? `poster="${esc(exercise.poster)}"` : ''} controls loop muted playsinline ${reduced ? '' : 'autoplay'} preload="metadata" aria-label="${esc(exercise.zh)}動作示範"></video>` : `<img id="demo-image" src="${esc(reduced ? exercise.poster || exercise.media || './icons/icon.svg' : exercise.media || exercise.poster || './icons/icon.svg')}" alt="${esc(exercise.zh)}動作示範">`}</div><div class="demo-controls"><span>${esc(exercise.mediaNote || (animated ? '睇清楚動作路線，再試做。' : '靜態姿勢參考'))}</span>${animated && !video ? `<button data-toggle-gif="${id}" data-playing="${!reduced}">${reduced ? '▶ 播放動作' : 'Ⅱ 暫停動作'}</button>` : ''}</div><div class="demo-meta"><span>${esc(exercise.equipment)}</span><span>${esc(exercise.muscle)}</span><span>${exercise.sets} 組 × ${esc(exercise.reps)} ${repUnit(exercise)}</span><span>休息 ${exercise.rest} 秒</span></div><div class="instructions-grid"><section><h3>點樣做 / HOW TO</h3><ol>${exercise.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol></section><section><h3>留意呢幾點 / FORM CHECK</h3><ul class="mistakes">${exercise.mistakes.map(item => `<li>${esc(item)}</li>`).join('')}</ul></section></div>${exercise.tip ? `<p class="demo-tip">${esc(exercise.tip)}</p>` : ''}<p class="source-note">動作參考：${exercise.source ? `<a href="${esc(exercise.source.url)}" target="_blank" rel="noopener">${esc(exercise.source.label)} ↗</a>` : '原有訓練指南'}<br>${esc(credit)}${exercise.gif ? `<br><a href="${esc(exercise.gif)}" target="_blank" rel="noopener">開啟 GIF 循環示範 ↗</a>` : ''}<br><a href="./media-credits.md" target="_blank" rel="noopener">媒體來源與授權 ↗</a></p></div>`;
  dialog.showModal();
  document.querySelectorAll('.motion-preview').forEach(updatePreview);
}

function openSettings() {
  const settings = store.getSettings();
  const dialog = $('#settings-dialog');
  dialog.innerHTML = `<div class="dialog-header"><div><div class="eyebrow">MAKE IT YOURS</div><h2 id="settings-title">你嘅訓練手記</h2></div><button class="close" data-close aria-label="關閉設定">×</button></div><div class="dialog-body"><section class="settings-section"><h3>預設課表</h3><p>只影響未記錄嘅日子；已儲存嘅訓練會保留原本安排。</p><label>Programme<select id="setting-program">${PROGRAMS.map(program => `<option value="${program.id}" ${settings.programId === program.id ? 'selected' : ''}>${esc(program.zh)} / ${esc(program.en)}</option>`).join('')}</select></label><label>開始日期<input type="date" id="setting-start" value="${settings.startDate}"></label><button class="primary-button" data-action="save-settings">儲存課表設定</button><p id="programme-description">${esc(programById(settings.programId).description)}</p></section><section class="settings-section"><h3>備份你嘅紀錄</h3><p>資料只儲喺呢部裝置、呢個瀏覽器。清除網站資料會刪除紀錄。匯出 JSON 備份可以喺另一部裝置匯入；已有日期會保留，唔會被覆蓋。</p><div class="button-row"><button class="primary-button" data-action="export">↓ 匯出備份</button><button class="secondary-button" data-action="import">↑ 匯入備份</button></div><input type="file" id="import-file" accept=".json,application/json" hidden><div class="inline-status" id="import-status" role="status"></div></section><section class="settings-section"><h3>帶住入 Gym，冇網都用到。</h3><p id="offline-detail">${offlineReady ? '✓ 動作示範同介面已下載，可以離線使用。' : '第一次請保持連線，等頁頂顯示「已可離線用」。'}</p><p>iPhone：Safari → 分享 → 加入主畫面。Android / Chrome：選單 → 安裝應用程式。網站資料被清除後，需要重新下載。</p><div class="button-row">${installPrompt ? '<button class="primary-button" data-action="install">安裝到主畫面</button>' : ''}<button class="secondary-button" data-action="retry-offline">重新檢查離線內容</button><button class="secondary-button" data-action="persist-storage">保留裝置儲存空間</button></div></section></div>`;
  dialog.showModal();
  document.querySelectorAll('.motion-preview').forEach(updatePreview);
}

main.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.demo) return openDemo(button.dataset.demo);
  if (button.dataset.date) return selectDate(button.dataset.date);
  if (button.dataset.month) {
    month.setMonth(month.getMonth() + Number(button.dataset.month),1);
    return render();
  }
  if (button.dataset.shift) {
    const date = dateObject(selectedDate);
    date.setDate(date.getDate() + Number(button.dataset.shift));
    return selectDate(localDateKey(date));
  }
  if (button.dataset.filter) {
    filter = button.dataset.filter;
    return render();
  }
  if (button.dataset.addSet) {
    const day = readDay();
    const exercise = exercises.get(button.dataset.addSet);
    const log = exerciseLog(day,exercise);
    log.sets.push({ weight:'', reps:'', done:false });
    day.exercises[exercise.id] = log;
    if (persist(day)) render();
  }
  if (button.dataset.status) {
    const day = readDay();
    day.status = day.status === button.dataset.status ? '' : button.dataset.status;
    if (persist(day,true)) render();
  }
  if (button.dataset.action === 'go-today') return selectDate(localDateKey());
  if (button.dataset.action === 'start-training' || button.dataset.action === 'finish') {
    const day = readDay();
    day.status = button.dataset.action === 'start-training' ? 'planned' : day.status === 'done' ? 'planned' : 'done';
    if (persist(day,true)) render();
  }
});

main.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'exercise-search') {
    search = input.value;
    $('#library-results').innerHTML = libraryCards();
    attachPreviews();
    return;
  }
  if (!input.dataset.dayField && !input.dataset.field) return;
  if (input.type === 'number' && (input.validity.badInput || input.validity.rangeOverflow || input.validity.rangeUnderflow)) {
    input.setAttribute('aria-invalid','true');
    notify(`請輸入 0 至 ${input.max} 之間嘅數字；呢個數值未儲存。`);
    return;
  }
  input.removeAttribute('aria-invalid');
  const day = readDay();
  if (input.dataset.dayField) day[input.dataset.dayField] = input.value;
  if (input.dataset.field) {
    const exercise = exercises.get(input.closest('[data-exercise]').dataset.exercise);
    const log = exerciseLog(day,exercise);
    log.sets[Number(input.dataset.set)][input.dataset.field] = input.type === 'checkbox' ? input.checked : input.value;
    day.exercises[exercise.id] = log;
  }
  persist(day);
});

main.addEventListener('change', event => {
  const input = event.target;
  if (input.id === 'training-date' && input.value) return selectDate(input.value);
  if (!['day-program','day-workout-select'].includes(input.id)) return;
  const day = readDay();
  if (input.id === 'day-program') {
    day.programId = input.value;
    day.workoutIndex = 0;
  } else day.workoutIndex = Number(input.value);
  // Keep completed set records when choosing another session on the same date.
  day.status = 'planned';
  if (persist(day)) render();
});

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-close]') || event.target === dialog) dialog.close();
    const toggle = event.target.closest('[data-toggle-gif]');
    if (toggle) {
      const exercise = exercises.get(toggle.dataset.toggleGif);
      const playing = toggle.dataset.playing !== 'true';
      $('#demo-image').src = playing ? exercise.media : exercise.poster || './icons/icon.svg';
      toggle.dataset.playing = String(playing);
      toggle.textContent = playing ? 'Ⅱ 暫停動作' : '▶ 播放動作';
    }
  });
  dialog.addEventListener('close', () => { dialog.innerHTML = ''; attachPreviews(); });
}

$('#settings-button').addEventListener('click',openSettings);
$('#motion-toggle').addEventListener('click', () => {
  previewsPlaying = !previewsPlaying;
  attachPreviews();
});
motionPreference.addEventListener('change', () => {
  previewsPlaying = !motionPreference.matches;
  attachPreviews();
});
document.addEventListener('visibilitychange', () => document.querySelectorAll('.motion-preview').forEach(updatePreview));
$('#settings-dialog').addEventListener('click', async event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  try {
    if (action === 'save-settings') {
      store.saveSettings({ programId:$('#setting-program').value, startDate:$('#setting-start').value });
      notify('課表已儲存；已有紀錄保持不變。');
      render();
    }
    if (action === 'export') {
      const url = URL.createObjectURL(new Blob([store.exportData()],{ type:'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `hillman-gym-${localDateKey()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      notify('備份已匯出，記得保留檔案。');
    }
    if (action === 'import') $('#import-file').click();
    if (action === 'retry-offline') { await setupOffline(); notify('已重新檢查離線內容。'); }
    if (action === 'persist-storage') {
      const granted = await navigator.storage?.persist?.();
      notify(granted ? '瀏覽器已允許保留網站儲存空間。' : '瀏覽器未允許永久保留；請定期匯出備份。');
    }
    if (action === 'install' && installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      event.target.hidden = true;
    }
  } catch (error) { notify(`未能完成：${error.message}`); }
});

$('#settings-dialog').addEventListener('change', async event => {
  if (event.target.id === 'setting-program') $('#programme-description').textContent = programById(event.target.value).description;
  if (event.target.id !== 'import-file') return;
  const file = event.target.files[0];
  if (!file) return;
  try {
    // Cantonese UTF-8 uses up to three bytes per character; the store validates
    // the decoded JSON length against the same limit used when exporting.
    if (file.size > 30 * 1024 * 1024) throw new Error('備份檔案超過 30 MB');
    const result = store.importData(await file.text());
    $('#import-status').textContent = `已匯入 ${result.imported} 日；保留 ${result.skipped} 日現有紀錄。`;
    $('#storage-error').hidden = true;
    render();
  } catch (error) { $('#import-status').textContent = `匯入唔到，現有紀錄冇改動：${error.message}`; }
  event.target.value = '';
});

function setOfflineStatus(label, ready = false) {
  const el = $('#offline-status');
  el.innerHTML = `<i></i>${esc(label)}`;
  el.title = label;
  el.setAttribute('aria-label', label);
  el.classList.toggle('ready', ready);
  if ($('#offline-detail')) $('#offline-detail').textContent = ready ? '✓ 動作示範同介面已下載，可以離線使用。' : label;
}

async function setupOffline() {
  if (!('serviceWorker' in navigator)) return setOfflineStatus('呢個瀏覽器未支援離線使用');
  try {
    // Read the existing registration locally first. Registering again can fail
    // without a network even though the complete offline app is already cached.
    const registration = await navigator.serviceWorker.getRegistration('./') ||
      await navigator.serviceWorker.register('./sw.js', { scope:'./', updateViaCache:'none' });
    if (registration.active) registration.active.postMessage({ type:'CHECK_READY' });
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'redundant' && !offlineReady) setOfflineStatus('離線下載未完成，請連線後喺設定重試');
      });
    });
    navigator.serviceWorker.ready.then(ready => ready.active.postMessage({ type:'CHECK_READY' }));
    await registration.update();
  } catch { setOfflineStatus(offlineReady ? '已可離線用' : '離線下載未完成，請連線後喺設定重試',offlineReady); }
}

navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data?.type === 'CACHE_PROGRESS') {
    offlineReady = false;
    setOfflineStatus(`下載離線內容 ${event.data.done}/${event.data.total}`);
  }
  if (event.data?.type === 'CACHE_READY') {
    offlineReady = true;
    setOfflineStatus(navigator.onLine ? '已可離線用' : '離線模式 · 已下載',true);
  }
  if (event.data?.type === 'CACHE_ERROR') {
    offlineReady = false;
    setOfflineStatus('離線下載未完成，請連線後喺設定重試');
  }
});
window.addEventListener('online', () => { setOfflineStatus(offlineReady ? '已可離線用' : '準備離線內容…',offlineReady); setupOffline(); });
window.addEventListener('offline', () => setOfflineStatus(offlineReady ? '離線模式 · 已下載' : '未完成離線下載',offlineReady));
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
window.addEventListener('hashchange', () => { render(); window.scrollTo({ top:0 }); });
window.addEventListener('storage', event => {
  if (event.key === 'hillman-gym:v1') notify('另一個分頁更新咗紀錄。重新整理後再編輯，避免覆蓋。');
});
render();
setupOffline();
