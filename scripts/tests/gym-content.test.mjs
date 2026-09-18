import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EXERCISES, PROGRAMS } from '../../portfolio/public/gym/data.mjs';

const root = new URL('../../portfolio/public/gym/', import.meta.url);

test('every exercise ships a real moving demo and a still poster without placeholder icons', async () => {
  assert.equal(EXERCISES.length, 29);
  assert.equal(new Set(EXERCISES.map(exercise => exercise.id)).size, 29);
  for (const exercise of EXERCISES) {
    assert.match(exercise.media, /^media\/.+\.(mp4|gif|webm)$/, `${exercise.id}: moving demo missing`);
    assert.match(exercise.poster, /^media\/.+\.(jpg|png|webp)$/, `${exercise.id}: poster missing`);
    for (const path of [exercise.media, exercise.poster]) {
      const bytes = await readFile(new URL(path, root));
      assert.ok(bytes.length > 1000, `${exercise.id}: empty or placeholder asset`);
    }
    assert.ok(exercise.mediaCredit, `${exercise.id}: attribution missing`);
    assert.ok(exercise.source?.url.startsWith('https://'), `${exercise.id}: reference missing`);
  }
});

test('programme sessions and weekly schedules refer to existing exercises and sessions', () => {
  const ids = new Set(EXERCISES.map(exercise => exercise.id));
  for (const program of PROGRAMS) {
    assert.equal(program.schedule.length, 7);
    for (const index of program.schedule) {
      assert.ok(index === null || program.days[index], `${program.id}: unknown session`);
    }
    for (const day of program.days) {
      assert.ok(day.exerciseIds.length);
      for (const id of day.exerciseIds) assert.ok(ids.has(id), `${program.id}: unknown exercise ${id}`);
    }
  }
});
