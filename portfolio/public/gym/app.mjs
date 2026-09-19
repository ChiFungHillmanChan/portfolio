import { createTranslator, localizeContent, weekdayLabels } from './i18n.mjs';
import { readLocale, saveLocale, LOCALE_STORAGE_KEY } from './locale.mjs';
import { createStore, localDateKey, monthCells, getScheduledDay } from './store.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const store = createStore();
const main = $('#main');
let locale = readLocale();
let t = createTranslator(locale);
let content = localizeContent(locale);
let EXERCISES = content.exercises;
let PROGRAMS = content.programs;
let GLOSSARY = content.glossary;
const PHRASES = content.phrases;
let exercises = new Map(EXERCISES.map(exercise => [exercise.id, exercise]));
let offlineMessage = { key: 'offlinePreparing', values: {} };
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
const displayDate = key => dateObject(key).toLocaleDateString(locale, { month: 'long', day: 'numeric', weekday: 'long' });
const repUnit = exercise => t(exercise.unit === 'seconds' ? 'seconds' : exercise.unit === 'minutes' ? 'minutes' : 'reps');
const secondaryName = exercise => locale === 'en-GB' ? '' : `<div class="exercise-en" lang="en-GB">${esc(exercise.en)}</div>`;
const monthLabel = () => month.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
const programById = id => PROGRAMS.find(program => program.id === id) || PROGRAMS[0];

function localizeShell() {
  document.documentElement.lang = locale;
  document.title = t('title');
  $('meta[name="description"]').content = t('description');
  $('link[rel="manifest"]').href = locale === 'en-GB' ? './manifest.en.webmanifest' : './manifest.webmanifest';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
  $('#language-select').value = locale;
  $('#language-select').setAttribute('aria-label', t('language'));
  setOfflineStatus(offlineMessage.key, offlineReady, offlineMessage.values);
}

function changeLocale(next, remember = true) {
  if (!['zh-HK', 'en-GB'].includes(next)) return;
  let saved = true;
  if (remember) {
    try { saveLocale(next); } catch { saved = false; }
  }
  locale = next;
  t = createTranslator(locale);
  content = localizeContent(locale);
  EXERCISES = content.exercises;
  PROGRAMS = content.programs;
  GLOSSARY = content.glossary;
  exercises = new Map(EXERCISES.map(exercise => [exercise.id, exercise]));
  localizeShell();
  render();
  if (!saved) notify(t('languageNotSaved'));
}

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.hidden = true; }, 4500);
}

function storageError(error) {
  const target = $('#storage-error');
  target.textContent = t('savingError', { error: error.message });
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
    document.querySelectorAll('.save-state').forEach(el => { el.textContent = `✓ ${t('saved')}`; });
    if (showToast) notify(t('saved'));
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
  if (!key) return t('noPrevious');
  const entry = days[key].exercises[id].sets.find(set => set.done);
  return t('previous', { date: dateObject(key).toLocaleDateString(locale, {day:'numeric', month:'short'}), value: `${entry.weight ? `${entry.weight} kg × ` : ''}${entry.reps || '—'} ${repUnit(exercises.get(id) || {})}` });
}

function artwork() {
  return `<div class="hero-art" aria-hidden="true"><div class="big-type">GYM.</div><svg viewBox="0 0 380 210" fill="none"><g stroke="#85936b" stroke-width="1"><path d="M20 177H355M31 32V186M51 167H345" stroke-dasharray="3 6"/><path d="M69 141L281 48M96 176L310 80" opacity=".4"/></g><g transform="translate(36 43)"><path d="M57 83L229 30L245 77L74 130Z" fill="#a6b68d" stroke="#57623b" stroke-width="2"/><path d="M63 96L236 43M67 109L240 57" stroke="#74895b" stroke-width="2"/><path d="M42 54L70 45L108 153L79 163Z" fill="#20271f"/><path d="M20 70L44 62L74 151L50 159Z" fill="#49553b"/><path d="M1 91L23 84L43 140L20 147Z" fill="#788968"/><path d="M241 1L270 0L304 98L276 108Z" fill="#20271f"/><path d="M270 5L295 0L326 88L303 99Z" fill="#49553b"/><path d="M300 19L323 13L343 69L321 77Z" fill="#788968"/><path d="M49 64L77 144M249 13L278 96" stroke="#d9f277" stroke-width="2"/></g><path d="M126 187h82M167 178v18" stroke="#85936b"/><circle cx="333" cy="30" r="16" fill="#d9f277"/><path d="M326 30h14M333 23v14" stroke="#57623b"/></svg><span class="art-caption">FORM FIRST. WEIGHT FOLLOWS.</span></div>`;
}

function calendarMarkup(wide = false) {
  const days = store.allDays();
  const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const completed = Object.entries(days).filter(([key, day]) => key.startsWith(prefix) && day.status === 'done').length;
  return `<section class="panel calendar-panel ${wide ? 'wide-calendar' : ''}" aria-label="${t('calendarLabel')}"><div class="panel-title"><div><p class="month-name">${monthLabel()}</p></div><div class="month-control"><button data-month="-1" aria-label="${t('prevMonth')}">←</button><button data-month="1" aria-label="${t('nextMonth')}">→</button></div></div><div class="calendar-grid">${weekdayLabels(locale).map(day => `<span class="weekday">${day}</span>`).join('')}${monthCells(month.getFullYear(), month.getMonth()).map(key => key ? calendarButton(key, days[key]) : '<span></span>').join('')}</div><div class="legend"><span><i></i>${t('done')}</span><span><i class="note"></i>${t('recorded')}</span><span><i class="rest"></i>${t('rest')}</span></div><div class="calendar-foot"><span>${t('monthDoneBefore')}<b data-month-count>${completed}</b>${locale === 'en-GB' ? '' : ` ${t('days')}`}</span><button class="text-button" data-action="go-today">${t('backToday')}</button></div></section>`;
}

function calendarButton(key, day) {
  const marker = day?.status === 'done' ? 'done' : day?.status === 'rest' ? 'rest' : day && (day.notes || day.bodyweight || day.status || Object.keys(day.exercises).length) ? 'note' : '';
  const status = marker ? `, ${t(marker === 'done' ? 'done' : marker === 'rest' ? 'rest' : 'recorded')}` : '';
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
  return `<section class="panel daily-notes"><div class="panel-title"><h3>${t('notesTitle')}</h3><small>DAILY NOTES</small></div><label for="bodyweight">${t('bodyweight')}<input type="number" id="bodyweight" data-day-field="bodyweight" min="0" max="1000" step="0.1" inputmode="decimal" placeholder="${t('bodyweightExample')}" value="${esc(day.bodyweight)}"></label><label for="day-notes">${t('feeling')}<textarea id="day-notes" data-day-field="notes" maxlength="10000" placeholder="${t('notesPlaceholder')}">${esc(day.notes)}</textarea></label><div class="status-buttons" aria-label="${t('dayStatus')}">${[['planned',t('planned')],['done',t('done')],['rest',t('restDay')]].map(([id,label]) => `<button data-status="${id}" aria-pressed="${day.status === id}">${label}</button>`).join('')}</div><p class="notes-hint">${t('autosave')}</p><div class="save-state" role="status"></div></section>`;
}

function previewMarkup(exercise) {
  if (!exercise.media || !exercise.poster) return `<span class="preview-pending">${t('pending')}</span>`;
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
  button.textContent = t(previewsPlaying ? 'pauseDemos' : 'playDemos');
  button.setAttribute('aria-pressed', String(previewsPlaying));
}

function exerciseCard(exercise, index, day) {
  const log = exerciseLog(day, exercise);
  return `<article class="exercise-card" data-exercise="${exercise.id}"><div class="exercise-top"><span class="exercise-number">${String(index + 1).padStart(2,'0')}</span><button class="exercise-thumb" data-demo="${exercise.id}" aria-label="${esc(t('watchExercise', { name: exercise.name }))}">${previewMarkup(exercise)}<span class="play">▶</span></button><div><h3>${esc(exercise.name)}</h3>${secondaryName(exercise)}<div class="prescription">${exercise.sets} ${t('sets')} × ${esc(exercise.reps)} ${repUnit(exercise)} <span> / ${t('restTime', { seconds: exercise.rest })}</span></div></div><button class="demo-link" data-demo="${exercise.id}">${t('demoLink')}</button></div><table class="log-table"><thead><tr><th>${t('setHeading')}</th><th>${t('weightHeading')}</th><th>${t(exercise.unit === 'seconds' ? 'timeSec' : exercise.unit === 'minutes' ? 'timeMin' : 'repsHeading')}</th><th>${t('done')}</th></tr></thead><tbody>${log.sets.map((set, setIndex) => `<tr><td>${String(setIndex + 1).padStart(2,'0')}</td><td><input type="number" min="0" max="1000" step="0.25" inputmode="decimal" data-set="${setIndex}" data-field="weight" aria-label="${esc(t('setWeight', { name: exercise.name, set: setIndex + 1 }))}" placeholder="—" value="${esc(set.weight)}"></td><td><input type="number" min="0" max="3600" step="1" inputmode="numeric" data-set="${setIndex}" data-field="reps" aria-label="${esc(t('setReps', { name: exercise.name, set: setIndex + 1, unit: repUnit(exercise) }))}" placeholder="${esc(exercise.reps)}" value="${esc(set.reps)}"></td><td><input type="checkbox" data-set="${setIndex}" data-field="done" aria-label="${esc(t('setDone', { name: exercise.name, set: setIndex + 1 }))}" ${set.done ? 'checked' : ''}></td></tr>`).join('')}</tbody></table><div class="exercise-actions"><span class="previous">${esc(previousLog(exercise.id))}</span><button data-add-set="${exercise.id}" ${log.sets.length >= 20 ? 'disabled' : ''}>${t('addSet')}</button></div></article>`;
}

function workoutMarkup(day, compact = false) {
  const { program, workout } = currentWorkout(day);
  const rest = day.status === 'rest';
  const list = workout.exerciseIds.map(id => exercises.get(id)).filter(Boolean);
  return `<div class="workout-column scroll-target" id="day-workout"><div class="section-heading"><div><h2>${t(selectedDate === localDateKey() ? 'todayTraining' : 'dayTraining')}</h2><p>${displayDate(selectedDate)}</p></div>${compact ? '' : `<div class="day-selector"><button class="icon-button" data-shift="-1" aria-label="${t('prevDay')}">←</button><input type="date" id="training-date" aria-label="${t('trainingDate')}" value="${selectedDate}"><button class="icon-button" data-shift="1" aria-label="${t('nextDay')}">→</button></div>`}</div><div class="workout-banner"><div><div class="eyebrow">${esc(program.en)}</div><h3>${rest ? t('restTitle') : esc(workout.label)}</h3><p>${t(rest ? 'restSubtitle' : 'sessionSubtitle', {count:list.length})}</p></div><div class="count"><span data-set-count>${totalSets(day)}</span><small>SETS DONE</small></div></div><div class="workout-controls"><label>${t('programme')}<select id="day-program">${PROGRAMS.map(item => `<option value="${item.id}" ${program.id === item.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label><label>${t('session')}<select id="day-workout-select">${program.days.map((item,index) => `<option value="${index}" ${day.workoutIndex === index ? 'selected' : ''}>${esc(item.label)}</option>`).join('')}</select></label></div>${rest ? `<div class="empty"><div class="rest-illustration">RECOVER.</div><h3>${t('takeEasy')}</h3><p>${t('restHelp')}</p><button class="primary-button" data-action="start-training">${t('startTraining')}</button></div>` : `<p class="warmup-note">${t('warmup')}</p>${list.map((exercise,index) => exerciseCard(exercise,index,day)).join('')}<div class="finish-row"><button class="primary-button ${day.status === 'done' ? 'lime' : ''}" data-action="finish">${t(day.status === 'done' ? 'undoFinish' : 'finish')}</button><small>${t('completedBefore')}<span data-completed-count>${totalSets(day)}</span>${locale === 'en-GB' ? '' : ` ${t('sets')}`}</small></div>`}${compact ? notesMarkup(day) : ''}</div>`;
}

function todayView() {
  const day = readDay();
  return `<section class="hero"><div><div class="eyebrow">YOUR PERSONAL TRAINING JOURNAL</div><h1>${t('heroFirst')}<br><span>${t('heroSecond')}</span></h1><p>${t('heroIntro')}<br>${t('heroDetails')}</p></div>${artwork()}</section><div class="workspace">${workoutMarkup(day)}<aside class="sidebar">${calendarMarkup()}${notesMarkup(day)}<section class="panel tip-panel"><div class="eyebrow">A NOTE TO YOURSELF</div><p>${t('trainingTip')}</p><a href="#guide">${t('askTrainer')}</a></section></aside></div>`;
}

function calendarView() {
  return `<section class="page-intro"><div class="eyebrow">YOUR WORK, DAY BY DAY</div><h1>${t('calendarTitle')}</h1><p>${t('calendarIntro')}</p></section><div class="calendar-layout"><div>${calendarMarkup(true)}<section class="panel tip-panel"><div class="eyebrow">LOCAL TO THIS DEVICE</div><p>${t('localNote')}</p></section></div>${workoutMarkup(readDay(),true)}</div>`;
}

function libraryView() {
  return `<section class="page-intro"><div class="eyebrow">THE MOVEMENT LIBRARY / ${EXERCISES.length} EXERCISES</div><h1>${t('libraryTitle')}</h1><p>${t('libraryIntro')}</p></section><div class="toolbar"><input class="search" type="search" id="exercise-search" aria-label="${t('searchLabel')}" placeholder="${t('searchPlaceholder')}" value="${esc(search)}"><div class="filters" aria-label="${t('filterLabel')}">${['全部','啞鈴','槓鈴','機械','徒手'].map(label => `<button class="filter" data-filter="${label}" aria-pressed="${filter === label}">${t(({ '全部':'all', '啞鈴':'dumbbell', '槓鈴':'barbell', '機械':'machine', '徒手':'bodyweightFilter' })[label])}</button>`).join('')}</div></div><div class="library-grid" id="library-results">${libraryCards()}</div>`;
}

function matchesFilter(exercise) {
  const value = `${exercise.equipment} ${exercise.en}`.toLowerCase();
  return filter === '全部' || (filter === '啞鈴' && /啞鈴|dumbbell|kettlebell/.test(value)) || (filter === '槓鈴' && /槓鈴|barbell/.test(value) && !/smith/.test(value)) || (filter === '機械' && /機|machine|cable|leg press|pulldown/.test(value)) || (filter === '徒手' && /徒手|bodyweight|pull-up bar|單槓|mat/.test(value));
}

function libraryCards() {
  const list = EXERCISES.filter(exercise => `${exercise.name} ${exercise.zh} ${exercise.en} ${exercise.muscle} ${exercise.equipment}`.toLowerCase().includes(search.toLowerCase()) && matchesFilter(exercise));
  if (!list.length) return `<div class="empty"><h3>${t('noResults')}</h3><p>${t('searchHelp')}</p></div>`;
  return list.map(exercise => `<button class="movement-tile" data-demo="${exercise.id}"><div class="tile-image"><span class="tile-no">${String(EXERCISES.indexOf(exercise)+1).padStart(2,'0')} / MOVEMENT</span>${previewMarkup(exercise)}<span class="play-label">${t(exercise.media ? 'watch' : 'movementGuide')}</span></div><div class="tile-info"><h3>${esc(exercise.name)}</h3>${secondaryName(exercise)}<div class="tile-meta">${esc(exercise.muscle)}　↗</div></div></button>`).join('');
}

function guideView() {
  const settings = store.getSettings();
  const program = programById(settings.programId);
  return `<section class="page-intro"><div class="eyebrow">FEEL AT HOME IN A UK GYM</div><h1>${t('guideTitle')}</h1><p>${t('guideIntro')}</p></section><div class="guide-grid"><section class="guide-section"><h2>${t('usefulEnglish')}</h2>${PHRASES.map(phrase => `<div class="phrase"><p class="phrase-en" lang="en-GB">${esc(phrase.en)}</p>${locale === 'en-GB' ? '' : `<p class="phrase-zh">${esc(phrase.zh)}</p>`}</div>`).join('')}</section><div><section class="guide-section"><h2>${t('glossary')}</h2>${GLOSSARY.map(item => `<div class="glossary-row"><b>${esc(item.name)}</b><span>${locale === 'en-GB' ? '' : esc(item.en)}${item.meaning ? `<small lang="${locale}">${esc(item.meaning)}</small>` : ''}</span></div>`).join('')}</section><section class="guide-section" style="margin-top:24px"><h2>${t('yourRoutine')}</h2><p>${esc(program.name)}</p><p class="source-note">${esc(program.description)}</p><div class="week-summary">${weekdayLabels(locale).map((day,index) => `<span class="${program.schedule[index] === null ? '' : 'training'}">${day} ${t(program.schedule[index] === null ? 'rest' : 'training')}</span>`).join('')}</div><ol class="instruction-list"><li>${t('guideTip1')}</li><li>${t('guideTip2')}</li><li>${t('guideTip3')}</li><li>${t('guideTip4')}</li></ol><p class="source-note">${t('reference')}<a href="https://www.nhs.uk/live-well/exercise/physical-activity-guidelines-for-adults-aged-19-to-64/" target="_blank" rel="noopener">${t('nhs')}</a>${t('sourceHelp')}</p></section></div></div>`;
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
  } catch (error) { notify(t('validDate')); }
}

function openDemo(id) {
  const exercise = exercises.get(id);
  if (!exercise) return;
  const dialog = $('#exercise-dialog');
  const video = /\.(mp4|webm)$/i.test(exercise.media || '');
  const animated = /\.(mp4|webm|gif)$/i.test(exercise.media || '');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const credit = typeof exercise.mediaCredit === 'string' ? exercise.mediaCredit : exercise.mediaCredit ? JSON.stringify(exercise.mediaCredit) : '';
  dialog.innerHTML = `<div class="dialog-header"><div><div class="eyebrow">MOVEMENT ${String(EXERCISES.indexOf(exercise)+1).padStart(2,'0')}</div><h2 id="exercise-title">${esc(exercise.name)}</h2>${secondaryName(exercise)}</div><button class="close" data-close aria-label="${t('closeDemo')}">×</button></div><div class="dialog-body"><div class="demo-media">${video ? `<video id="demo-video" src="${esc(exercise.media)}" ${exercise.poster ? `poster="${esc(exercise.poster)}"` : ''} controls loop muted playsinline ${reduced ? '' : 'autoplay'} preload="metadata" aria-label="${esc(t('demoDescription', { name: exercise.name }))}"></video>` : `<img id="demo-image" src="${esc(reduced ? exercise.poster || exercise.media || './icons/icon.svg' : exercise.media || exercise.poster || './icons/icon.svg')}" alt="${esc(t('demoDescription', { name: exercise.name }))}">`}</div><div class="demo-controls"><span>${esc(exercise.mediaNote || (t(animated ? 'watchPath' : 'stillReference')))}</span>${animated && !video ? `<button data-toggle-gif="${id}" data-playing="${!reduced}">${t(reduced ? 'playMovement' : 'pauseMovement')}</button>` : ''}</div><div class="demo-meta"><span>${esc(exercise.equipment)}</span><span>${esc(exercise.muscle)}</span><span>${exercise.sets} ${t('sets')} × ${esc(exercise.reps)} ${repUnit(exercise)}</span><span>${t('restTime', { seconds: exercise.rest })}</span></div><div class="instructions-grid"><section><h3>${t('howTo')}</h3><ol>${exercise.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol></section><section><h3>${t('formCheck')}</h3><ul class="mistakes">${exercise.mistakes.map(item => `<li>${esc(item)}</li>`).join('')}</ul></section></div>${exercise.tip ? `<p class="demo-tip">${esc(exercise.tip)}</p>` : ''}<p class="source-note">${t('movementSource')}${exercise.source ? `<a href="${esc(exercise.source.url)}" target="_blank" rel="noopener">${esc(exercise.source.label)} ↗</a>` : t('originalGuide')}<br>${esc(credit)}${exercise.gif ? `<br><a href="${esc(exercise.gif)}" target="_blank" rel="noopener">${t('openGif')}</a>` : ''}<br><a href="${locale === 'en-GB' ? './media-credits.en.md' : './media-credits.md'}" target="_blank" rel="noopener">${t('credits')}</a></p></div>`;
  dialog.showModal();
  document.querySelectorAll('.motion-preview').forEach(updatePreview);
}

function openSettings() {
  const settings = store.getSettings();
  const dialog = $('#settings-dialog');
  dialog.innerHTML = `<div class="dialog-header"><div><div class="eyebrow">MAKE IT YOURS</div><h2 id="settings-title">${t('settingsTitle')}</h2></div><button class="close" data-close aria-label="${t('closeSettings')}">×</button></div><div class="dialog-body"><section class="settings-section"><h3>${t('defaultProgramme')}</h3><p>${t('programmeHelp')}</p><label>Programme<select id="setting-program">${PROGRAMS.map(program => `<option value="${program.id}" ${settings.programId === program.id ? 'selected' : ''}>${esc(program.name)}${locale === 'en-GB' ? '' : ` / ${esc(program.en)}`}</option>`).join('')}</select></label><label>${t('startDate')}<input type="date" id="setting-start" value="${settings.startDate}"></label><button class="primary-button" data-action="save-settings">${t('saveProgramme')}</button><p id="programme-description">${esc(programById(settings.programId).description)}</p></section><section class="settings-section"><h3>${t('backupTitle')}</h3><p>${t('backupHelp')}</p><div class="button-row"><button class="primary-button" data-action="export">${t('export')}</button><button class="secondary-button" data-action="import">${t('import')}</button></div><input type="file" id="import-file" accept=".json,application/json" hidden><div class="inline-status" id="import-status" role="status"></div></section><section class="settings-section"><h3>${t('offlineTitle')}</h3><p id="offline-detail">${t(offlineReady ? 'offlineDetail' : 'offlineFirst')}</p><p>${t('installHelp')}</p><div class="button-row">${installPrompt ? `<button class="primary-button" data-action="install">${t('install')}</button>` : ''}<button class="secondary-button" data-action="retry-offline">${t('retryOffline')}</button><button class="secondary-button" data-action="persist-storage">${t('retainStorage')}</button></div></section></div>`;
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
    notify(t('invalidNumber', {max:input.max}));
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
      toggle.textContent = t(playing ? 'pauseMovement' : 'playMovement');
    }
  });
  dialog.addEventListener('close', () => { dialog.innerHTML = ''; attachPreviews(); });
}

$('#settings-button').addEventListener('click',openSettings);
$('#language-select').addEventListener('change', event => changeLocale(event.target.value));
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
      notify(t('programmeSaved'));
      render();
    }
    if (action === 'export') {
      const url = URL.createObjectURL(new Blob([store.exportData()],{ type:'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `hillman-gym-${localDateKey()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      notify(t('backupExported'));
    }
    if (action === 'import') $('#import-file').click();
    if (action === 'retry-offline') { await setupOffline(); notify(t('offlineChecked')); }
    if (action === 'persist-storage') {
      const granted = await navigator.storage?.persist?.();
      notify(t(granted ? 'storageGranted' : 'storageNotGranted'));
    }
    if (action === 'install' && installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      event.target.hidden = true;
    }
  } catch (error) { notify(t('failedAction', {error:error.message})); }
});

$('#settings-dialog').addEventListener('change', async event => {
  if (event.target.id === 'setting-program') $('#programme-description').textContent = programById(event.target.value).description;
  if (event.target.id !== 'import-file') return;
  const file = event.target.files[0];
  if (!file) return;
  try {
    // Cantonese UTF-8 uses up to three bytes per character; the store validates
    // the decoded JSON length against the same limit used when exporting.
    if (file.size > 30 * 1024 * 1024) throw new Error(t('backupTooLarge'));
    const result = store.importData(await file.text());
    $('#import-status').textContent = t('imported', result);
    $('#storage-error').hidden = true;
    render();
  } catch (error) { $('#import-status').textContent = t('importFailed', {error:error.message}); }
  event.target.value = '';
});

function setOfflineStatus(key, ready = false, values = {}) {
  offlineMessage = { key, values };
  const label = t(key, values);
  const el = $('#offline-status');
  el.innerHTML = `<i></i>${esc(label)}`;
  el.title = label;
  el.setAttribute('aria-label', label);
  el.classList.toggle('ready', ready);
  if ($('#offline-detail')) $('#offline-detail').textContent = ready ? t('offlineDetail') : label;
}

async function setupOffline() {
  if (!('serviceWorker' in navigator)) return setOfflineStatus('offlineUnsupported');
  try {
    // Read the existing registration locally first. Registering again can fail
    // without a network even though the complete offline app is already cached.
    const registration = await navigator.serviceWorker.getRegistration('./') ||
      await navigator.serviceWorker.register('./sw.js', { scope:'./', updateViaCache:'none' });
    if (registration.active) registration.active.postMessage({ type:'CHECK_READY' });
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'redundant' && !offlineReady) setOfflineStatus('offlineError');
      });
    });
    navigator.serviceWorker.ready.then(ready => ready.active.postMessage({ type:'CHECK_READY' }));
    await registration.update();
  } catch { setOfflineStatus(offlineReady ? 'offlineReady' : 'offlineError',offlineReady); }
}

navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data?.type === 'CACHE_PROGRESS') {
    offlineReady = false;
    setOfflineStatus('offlineDownloading', false, event.data);
  }
  if (event.data?.type === 'CACHE_READY') {
    offlineReady = true;
    setOfflineStatus(navigator.onLine ? 'offlineReady' : 'offlineMode',true);
  }
  if (event.data?.type === 'CACHE_ERROR') {
    offlineReady = false;
    setOfflineStatus('offlineError');
  }
});
window.addEventListener('online', () => { setOfflineStatus(offlineReady ? 'offlineReady' : 'offlinePreparing',offlineReady); setupOffline(); });
window.addEventListener('offline', () => setOfflineStatus(offlineReady ? 'offlineMode' : 'offlineIncomplete',offlineReady));
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
window.addEventListener('hashchange', () => { render(); window.scrollTo({ top:0 }); });
window.addEventListener('storage', event => {
  if (event.key === LOCALE_STORAGE_KEY && !document.querySelector('dialog[open]')) changeLocale(readLocale(), false);
  if (event.key === 'hillman-gym:v1') notify(t('otherTab'));
});
localizeShell();
render();
setupOffline();
