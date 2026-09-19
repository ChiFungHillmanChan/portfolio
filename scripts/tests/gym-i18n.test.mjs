import assert from 'node:assert/strict';
import test from 'node:test';
import { EXERCISES, PROGRAMS, GLOSSARY, PHRASES } from '../../portfolio/public/gym/data.mjs';
import { createTranslator, localizeContent, MESSAGES, weekdayLabels } from '../../portfolio/public/gym/i18n.mjs';

const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
const hasChinese = /\p{Script=Han}/u;

test('every interface message is available in both languages with matching placeholders', () => {
  for (const [key, variants] of Object.entries(MESSAGES)) {
    assert.equal(variants.length, 2, key);
    for (const value of variants) assert.ok(typeof value === 'string' && value.trim(), key);
    assert.deepEqual(placeholders(variants[0]), placeholders(variants[1]), key);
    for (const locale of ['zh-HK', 'en-GB']) {
      const values = Object.fromEntries(placeholders(variants[0]).map(name => [name, `value-${name}`]));
      const translated = createTranslator(locale)(key, values);
      assert.equal(/\{\w+\}/.test(translated), false, `${locale}: ${key}`);
      for (const value of Object.values(values)) assert.ok(translated.includes(value), `${locale}: ${key}`);
    }
  }
});

test('English interface messages contain no untranslated Chinese labels', () => {
  for (const key of Object.keys(MESSAGES)) {
    assert.equal(hasChinese.test(createTranslator('en-GB')(key)), false, key);
  }
});

test('dynamic status, unit, filter, playback, and offline messages resolve in both languages', () => {
  const keys = [
    'planned', 'done', 'rest', 'recorded', 'restDay',
    'seconds', 'minutes', 'reps', 'timeSec', 'timeMin', 'repsHeading',
    'all', 'dumbbell', 'barbell', 'machine', 'bodyweightFilter',
    'pauseDemos', 'playDemos', 'pauseMovement', 'playMovement',
    'offlineReady', 'offlineMode', 'offlineError', 'offlineUnsupported',
    'offlinePreparing', 'offlineIncomplete', 'offlineDownloading'
  ];
  for (const locale of ['zh-HK', 'en-GB']) {
    const t = createTranslator(locale);
    for (const key of keys) assert.ok(t(key, { done: 0, total: 94 }).trim(), `${locale}: ${key}`);
    assert.equal(t('offlineDownloading', { done: 0, total: 94 }).includes('0/94'), true);
    assert.throws(() => t('missing-message'), /Missing translation/);
  }
});

test('localisation preserves exercise identifiers, media paths, and workout prescriptions', () => {
  for (const locale of ['zh-HK', 'en-GB']) {
    const { exercises } = localizeContent(locale);
    assert.equal(exercises.length, EXERCISES.length);
    exercises.forEach((exercise, index) => {
      const original = EXERCISES[index];
      for (const key of ['id', 'media', 'poster', 'gif', 'sets', 'rest', 'unit']) {
        assert.deepEqual(exercise[key], original[key], `${locale}: ${original.id}.${key}`);
      }
      assert.deepEqual(exercise.reps.match(/\d+/g), original.reps.match(/\d+/g), `${locale}: ${original.id}.reps`);
      assert.equal(exercise.source.url, original.source.url, `${locale}: ${original.id}.source`);
      assert.ok(exercise.name.trim(), `${locale}: ${original.id}.name`);
      assert.equal(exercise.steps.length, original.steps.length, `${locale}: ${original.id}.steps`);
      assert.equal(exercise.mistakes.length, original.mistakes.length, `${locale}: ${original.id}.mistakes`);
    });
  }
});

test('localisation preserves programme IDs, weekly scheduling, and session exercise lists', () => {
  for (const locale of ['zh-HK', 'en-GB']) {
    const { programs } = localizeContent(locale);
    assert.equal(programs.length, PROGRAMS.length);
    programs.forEach((program, index) => {
      const original = PROGRAMS[index];
      assert.equal(program.id, original.id);
      assert.deepEqual(program.schedule, original.schedule, `${locale}: ${original.id}`);
      assert.equal(program.days.length, original.days.length, `${locale}: ${original.id}`);
      assert.ok(program.name.trim(), `${locale}: ${original.id}.name`);
      program.days.forEach((day, dayIndex) => {
        assert.deepEqual(day.exerciseIds, original.days[dayIndex].exerciseIds, `${locale}: ${original.id}, session ${dayIndex}`);
        assert.ok(day.label.trim(), `${locale}: ${original.id}, session ${dayIndex}`);
      });
    });
  }
});

test('English content translates all displayed details while retaining legacy names for searches', () => {
  const content = localizeContent('en-GB');
  function check(value, path = 'content') {
    if (typeof value === 'string') assert.equal(hasChinese.test(value), false, `${path}: ${value}`);
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        // Original bilingual names and phrase translations remain internal search/source data.
        if (!['zh', 'en'].includes(key)) check(child, `${path}.${key}`);
      }
    }
  }
  check(content);
  assert.equal(content.glossary.length, GLOSSARY.length);
  for (const term of content.glossary) assert.ok(term.name.trim() && term.meaning.trim(), term.en);
});

test('switching content languages does not mutate the original Cantonese content', () => {
  const before = JSON.stringify({ EXERCISES, PROGRAMS, GLOSSARY, PHRASES });
  localizeContent('en-GB');
  const cantonese = localizeContent('zh-HK');
  assert.equal(JSON.stringify({ EXERCISES, PROGRAMS, GLOSSARY, PHRASES }), before);
  assert.deepEqual(cantonese.exercises.map(exercise => exercise.name), EXERCISES.map(exercise => exercise.zh));
  assert.deepEqual(cantonese.programs.map(program => program.name), PROGRAMS.map(program => program.zh));
});

test('weekday headings keep the Monday-first calendar order in English', () => {
  assert.deepEqual(weekdayLabels('en-GB'), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const cantonese = weekdayLabels('zh-HK');
  assert.equal(cantonese.length, 7);
  assert.equal(new Set(cantonese).size, 7);
  assert.equal(hasChinese.test(cantonese[0]), true);
});
