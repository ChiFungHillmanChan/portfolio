import { t, localizeError } from './i18n.js';

const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stageGoal = {
  C: 'Make the bottom cross and match its four side colors to their centers.',
  F: 'The cross and three pairs are ready. Solve the remaining front-right F2L pair without breaking them.',
  O: 'The first two layers are ready. Make the top face one color while keeping those layers solved.',
  P: 'The first two layers and top color are ready. Permute the last layer to finish the cube.',
};
const summary = answers => t('{count} attempts · {learned} newly memorised · {again} to practise', {
  count: answers.length, learned: answers.filter(a => a.outcome === 'learned').length, again: answers.filter(a => a.outcome === 'again').length,
});

export function dailyExamView({ exam, date, today, day, cases, learned, stages, question, revealed, busy, error, preview, solution, holding }) {
  const isToday = date === today;
  const available = exam.stages.includes('C') || cases.some(c => exam.stages.includes(c.stage) && !learned.has(c.id));
  const answers = day.answers || [];
  return `<div class="daily-exam">
    <div class="page-title"><div><h1>${t('Daily Exam')}</h1><p>${t('A few unknown cases today. A more confident solve tomorrow.')}</p></div><label class="exam-date-label">${t('View a day')}<input type="date" id="exam-date" value="${escape(date)}" max="${today}"></label></div>
    ${isToday ? `<section class="exam-settings panel" aria-label="${t('Choose your daily practice')}"><fieldset><legend>${t('What would you like to practise today?')}</legend><div class="exam-stage-options">${Object.entries(stages).map(([key, stage]) => {
      const pool = cases.filter(c => c.stage === key);
      const unknown = pool.filter(c => !learned.has(c.id)).length;
      return `<label style="--stage-color:${stage.color}" class="${exam.stages.includes(key) ? 'chosen' : ''}"><input type="checkbox" data-exam-stage="${key}" ${exam.stages.includes(key) ? 'checked' : ''}><span class="stage-letter">${key}</span><span><strong>${stage.short}</strong><small>${key === 'C' ? t('Fresh cross scrambles') : t('{count} still learning', { count: unknown })}</small></span>${key !== 'C' && !unknown ? `<span class="stage-complete" aria-label="${t('All cases memorised')}">✓</span>` : ''}</label>`;
    }).join('')}</div></fieldset><div class="exam-settings-footer"><label for="exam-count">${t('Questions per round')} <select id="exam-count">${[5, 10, 20].map(count => `<option value="${count}" ${exam.count === count ? 'selected' : ''}>${count}</option>`).join('')}</select></label><button class="primary" data-action="exam-start" ${!available || !exam.stages.length ? 'disabled' : ''}>${t(question ? 'Start a new round' : 'Start exam')}</button></div><p class="exam-note">${t('Confirm only when you know it. Memorised cases are locked and never appear in random practice or exams again.')} ${t('Cross is a fresh planning exercise each time.')}</p>${question ? `<p class="exam-note">${t('Your current round is saved. New choices apply when you start a new round.')}</p>` : ''}</section>` : ''}
    <div class="exam-daily-summary" role="status"><strong>${escape(date)}</strong><span>${summary(answers)}</span>${question ? `<span>${t('{count} questions remaining', { count: day.queue.length })}</span>` : ''}</div>
    ${error ? `<div class="alert error" role="alert">${escape(localizeError(error))}</div>` : ''}
    ${question ? `<h2 class="exam-question-title" tabindex="-1">${question.stage} · ${stages[question.stage].short}</h2><section class="exam-setup panel"><h3>${t('Set up your physical cube')}</h3><ol><li>${t('Start with a completely solved cube.')} <strong>${escape(holding)}</strong></li><li>${t('Apply the scramble in order, then hold your cube to match the preview.')}</li></ol><code class="exam-scramble">${escape(question.scramble.replaceAll("'", '′'))}</code><p class="exam-goal"><strong>${t('Your task')}</strong> ${t(stageGoal[question.stage])}</p></section>
      <div class="practice-grid">${preview}<div class="exam-answer-column">${revealed ? solution : `<section class="exam-recall panel"><h2>${t('Try it from memory')}</h2><p>${t('Inspect every side, recognise the pattern, then solve it on your cube. Reveal the answer whenever you need help.')}</p><button class="primary" data-action="exam-reveal" ${busy ? 'disabled' : ''}>${t(busy ? 'Planning your cross…' : 'Reveal answer')}</button></section>`}<section class="exam-assessment panel"><h3>${t('How did you do?')}</h3><p>${t(question.stage === 'C' ? 'Solved this cross? Record it and try a fresh scramble next time.' : 'Choose memorised only if you can do this case confidently. This locks it out of every future exam.')}</p><div><button class="secondary" data-action="exam-answer" data-value="again">${t('Still learning · try again later')}</button><button class="primary" data-action="exam-answer" data-value="${question.stage === 'C' ? 'solved' : 'learned'}">✓ ${t(question.stage === 'C' ? 'Solved this cross' : 'Memorised · lock this case')}</button></div></section></div></div>` : isToday ? `<section class="exam-finished panel" tabindex="-1"><h2>${t(answers.length ? 'Round complete' : available || !exam.stages.length ? 'Your daily practice starts here' : 'All selected cases are memorised')}</h2><p>${t(available || !exam.stages.length ? 'Choose your stages above to draw a random round from the cases you still need to learn.' : 'These cases are locked. Choose another stage or practise a fresh cross.')}</p></section>` : `<section class="exam-finished panel"><h2>${t('Daily record')}</h2><p>${t(answers.length ? 'Your recorded practice for this day.' : 'No practice recorded on this day.')}</p><button class="secondary" data-action="exam-date" data-value="${today}">${t('Back to today')}</button></section>`}
    ${answers.length ? `<section class="exam-results panel"><h2>${t('This day’s results')}</h2><ul>${answers.map(answer => {
      const record = cases.find(c => c.id === answer.id);
      return `<li><span>${escape(record?.name || t('Cross practice'))}</span><strong class="${answer.outcome === 'learned' ? 'is-learned' : ''}">${t(answer.outcome === 'learned' ? 'Memorised · locked' : answer.outcome === 'solved' ? 'Solved this cross' : 'Still learning')}</strong></li>`;
    }).join('')}</ul></section>` : ''}
    <section class="exam-history"><h2>${t('Your daily progress')}</h2><p>${t('Saved on this device')}</p><div>${Object.keys(exam.days).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key)).sort().reverse().map(key => `<button data-action="exam-date" data-value="${key}" class="${key === date ? 'active' : ''}"><strong>${key}</strong><span>${summary(exam.days[key].answers || [])}</span></button>`).join('') || `<p>${t('Complete your first question to begin your daily record.')}</p>`}</div></section>
  </div>`;
}
