import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EXERCISES, PROGRAMS, GLOSSARY, PHRASES } from '../../portfolio/public/gym/data.mjs';
import {
  EXERCISE_TRANSLATIONS,
  PROGRAM_TRANSLATIONS,
  GLOSSARY_TRANSLATIONS,
} from '../../portfolio/public/gym/data.en.mjs';

const han = /\p{Script=Han}/u;
const root = new URL('../../portfolio/public/gym/', import.meta.url);

function assertEnglish(value, context) {
  assert.equal(typeof value, 'string', `${context}: expected text`);
  assert.ok(value.trim(), `${context}: empty translation`);
  assert.doesNotMatch(value, han, `${context}: untranslated Chinese`);
}

test('every exercise has complete English instructions and attribution labels', () => {
  assert.deepEqual(Object.keys(EXERCISE_TRANSLATIONS).sort(), EXERCISES.map(e => e.id).sort());
  for (const original of EXERCISES) {
    const translated = EXERCISE_TRANSLATIONS[original.id];
    for (const field of ['name', 'muscle', 'equipment', 'tip', 'mediaNote']) {
      assertEnglish(translated[field], `${original.id}.${field}`);
    }
    for (const field of ['steps', 'mistakes']) {
      assert.equal(translated[field].length, original[field].length, `${original.id}.${field}: missing detail`);
      for (const [index, text] of translated[field].entries()) {
        assertEnglish(text, `${original.id}.${field}[${index}]`);
      }
    }
    if (original.source) assertEnglish(translated.sourceLabel, `${original.id}.sourceLabel`);
    if (original.mediaSource) assertEnglish(translated.mediaSourceLabel, `${original.id}.mediaSourceLabel`);
    assertEnglish(translated.mediaCredit ?? original.mediaCredit, `${original.id}.mediaCredit`);
    assertEnglish(translated.reps ?? original.reps, `${original.id}.reps`);
    if (translated.reps) {
      assert.deepEqual(translated.reps.match(/\d+/g), original.reps.match(/\d+/g), `${original.id}.reps: translation must preserve the prescribed range`);
    }
    if (original.unit) assertEnglish(original.unit, `${original.id}.unit`);
    for (const field of ['id', 'media', 'gif', 'poster', 'sets', 'rest', 'unit']) {
      assert.ok(!Object.hasOwn(translated, field), `${original.id}.${field}: translation must not override training values or assets`);
    }
    for (const [field, value] of Object.entries(translated)) {
      if (Array.isArray(value)) value.forEach(text => assertEnglish(text, `${original.id}.${field}`));
      else assertEnglish(value, `${original.id}.${field}`);
    }
  }
});

test('every programme and session label has an English translation', () => {
  assert.deepEqual(Object.keys(PROGRAM_TRANSLATIONS).sort(), PROGRAMS.map(p => p.id).sort());
  for (const original of PROGRAMS) {
    const translated = PROGRAM_TRANSLATIONS[original.id];
    for (const field of ['name', 'description', 'note']) assertEnglish(translated[field], `${original.id}.${field}`);
    assert.equal(translated.days.length, original.days.length, `${original.id}: missing session label`);
    translated.days.forEach(label => assertEnglish(label, `${original.id}.days`));
    assert.ok(!Object.hasOwn(translated, 'schedule'), `${original.id}: translation must not change the schedule`);
  }
});

test('all glossary meanings and existing English phrases are available without Chinese fallbacks', () => {
  assert.deepEqual(Object.keys(GLOSSARY_TRANSLATIONS).sort(), GLOSSARY.map(term => term.en).sort());
  for (const [term, meaning] of Object.entries(GLOSSARY_TRANSLATIONS)) assertEnglish(meaning, term);
  assert.equal(PHRASES.length, 12);
  for (const phrase of PHRASES) assertEnglish(phrase.en, `phrase: ${phrase.zh}`);
});

test('English credits translate the whole page while preserving all source and licence links', async () => {
  const [original, translated] = await Promise.all([
    readFile(new URL('media-credits.md', root), 'utf8'),
    readFile(new URL('media-credits.en.md', root), 'utf8'),
  ]);
  assertEnglish(translated, 'English credits');
  const headings = text => [...text.matchAll(/^### (.+)$/gm)].map(match => match[1]);
  const links = text => [...text.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
  assert.deepEqual(headings(translated), headings(original));
  assert.equal(headings(translated).length, EXERCISES.length);
  assert.deepEqual(links(translated), links(original));
});
