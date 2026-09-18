import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore, getScheduledDay, localDateKey, monthCells } from '../../portfolio/public/gym/store.mjs';

const STORAGE_KEY = 'hillman-gym:v1';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

function sampleDay(overrides = {}) {
  return {
    status: 'done', programId: 'foundation', workoutIndex: 0,
    bodyweight: '72.5', notes: 'Felt strong',
    exercises: { squat: { sets: [{ weight: '60', reps: '8', done: true }], notes: 'Controlled tempo' } },
    ...overrides
  };
}

function backup(days = {}, settings = {}) {
  return JSON.stringify({
    version: 1, days,
    settings: { programId: 'foundation', startDate: '2026-09-14', lastView: 'today', ...settings }
  });
}

test('local date keys use local calendar fields across DST and UTC boundaries', () => {
  const originalTZ = process.env.TZ;
  try {
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(localDateKey(new Date('2026-09-18T01:30:00Z')), '2026-09-17');
    assert.equal(localDateKey(new Date('2026-03-08T09:30:00Z')), '2026-03-08');
    assert.equal(localDateKey(new Date('2026-03-08T10:30:00Z')), '2026-03-08');
    process.env.TZ = 'Pacific/Auckland';
    assert.equal(localDateKey(new Date('2026-09-18T13:30:00Z')), '2026-09-19');
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
  assert.throws(() => localDateKey(new Date('invalid')));
});

test('calendar grids start Monday and preserve leap days with complete weeks', () => {
  const leap = monthCells(2024, 1);
  assert.equal(leap.length, 35);
  assert.deepEqual(leap.slice(0, 5), [null, null, null, '2024-02-01', '2024-02-02']);
  assert.equal(leap[31], '2024-02-29');
  assert.deepEqual(leap.slice(32), [null, null, null]);
  assert.equal(monthCells(2026, 1).filter(Boolean).length, 28);
  const long = monthCells(2026, 2);
  assert.equal(long.length, 42);
  assert.equal(long[6], '2026-03-01');
  assert.equal(long[36], '2026-03-31');
  assert.equal(monthCells(2021, 1).length, 35);
  assert.throws(() => monthCells(2026, 12));
});

test('schedules use Monday slots, skip rest days, and never schedule before the start', () => {
  const program = { schedule: [0, null, 1, null, 2, null, null] };
  assert.equal(getScheduledDay('2026-09-14', '2026-09-16', program), null);
  assert.equal(getScheduledDay('2026-09-16', '2026-09-16', program), 1);
  assert.equal(getScheduledDay('2026-09-18', '2026-09-16', program), 2);
  assert.equal(getScheduledDay('2026-09-20', '2026-09-16', program), null);
  assert.equal(getScheduledDay('2026-09-21', '2026-09-16', program), 0);
  assert.equal(getScheduledDay('2026-10-26', '2026-09-16', program), 0);
  assert.throws(() => getScheduledDay('2026-02-30', '2026-09-16', program));
});

test('untouched days default independently without making storage writes', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  assert.deepEqual(store.getDay('2026-09-18'), {
    status: '', programId: 'foundation', workoutIndex: 0, bodyweight: '', notes: '', exercises: {}
  });
  const first = store.getDay('2026-09-18');
  first.exercises.squat = { sets: [{ weight: '100', reps: '5', done: true }], notes: '' };
  assert.deepEqual(store.getDay('2026-09-19').exercises, {});
  assert.equal(storage.values.size, 0);
});

test('separate days persist through reload and returned values cannot mutate saved data', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  const input = sampleDay();
  const saved = store.saveDay('2026-09-18', input);
  store.saveDay('2026-09-19', sampleDay({ status: 'rest', notes: 'Walked', exercises: {} }));
  input.exercises.squat.sets[0].weight = '999';
  saved.exercises.squat.sets[0].reps = '999';
  const all = store.allDays();
  all['2026-09-18'].notes = 'Changed outside store';
  const reloaded = createStore(storage);
  assert.equal(reloaded.getDay('2026-09-18').exercises.squat.sets[0].weight, '60');
  assert.equal(reloaded.getDay('2026-09-18').exercises.squat.sets[0].reps, '8');
  assert.equal(reloaded.getDay('2026-09-18').notes, 'Felt strong');
  assert.equal(reloaded.getDay('2026-09-19').status, 'rest');
  assert.equal(reloaded.getDay('2026-09-20').status, '');
});

test('settings merge patches and exports round-trip days and settings', () => {
  const original = createStore(memoryStorage());
  original.saveDay('2024-02-29', sampleDay());
  original.saveSettings({ programId: 'strength', startDate: '2024-02-26' });
  original.saveSettings({ lastView: 'calendar' });
  assert.deepEqual(original.getSettings(), {
    programId: 'strength', startDate: '2024-02-26', lastView: 'calendar'
  });
  const exported = original.exportData();
  assert.equal(JSON.parse(exported).version, 1);
  const restored = createStore(memoryStorage());
  assert.deepEqual(restored.importData(exported), { imported: 1, skipped: 0 });
  assert.deepEqual(restored.allDays(), original.allDays());
  assert.deepEqual(restored.getSettings(), original.getSettings());
});

test('imports merge new days while preserving existing dates and settings', () => {
  const store = createStore(memoryStorage());
  store.saveDay('2026-09-18', sampleDay({ notes: 'Keep this' }));
  store.saveSettings({ lastView: 'calendar' });
  assert.deepEqual(store.importData(backup({
    '2026-09-18': sampleDay({ notes: 'Replace this' }),
    '2026-09-19': sampleDay({ notes: 'New day' })
  })), { imported: 1, skipped: 1 });
  assert.equal(store.getDay('2026-09-18').notes, 'Keep this');
  assert.equal(store.getDay('2026-09-19').notes, 'New day');
  assert.equal(store.getSettings().lastView, 'calendar');
});

test('invalid imports are fully rejected before modifying any saved day', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  store.saveDay('2026-09-18', sampleDay());
  const before = storage.getItem(STORAGE_KEY);
  for (const invalid of [
    '{', 'null', '[]', '{"version":2,"days":{},"settings":{}}',
    backup({ '2026-02-29': sampleDay() }),
    backup({ '2026-09-19': sampleDay(), '2026-09-20': sampleDay({ status: 'finished' }) }),
    backup({ '2026-09-19': sampleDay({ exercises: { squat: { sets: [{ weight: '1001', reps: '8', done: false }], notes: '' } } }) }),
    backup({ '2026-09-19': sampleDay({ exercises: { squat: { sets: [{ weight: '60', reps: '-1', done: false }], notes: '' } } }) }),
    backup({ '2026-09-19': sampleDay({ exercises: { squat: { sets: [{ weight: '60', reps: '3601', done: false }], notes: '' } } }) }),
    backup({ '2026-09-19': sampleDay({ exercises: { squat: { sets: [{ weight: '60', reps: '8', done: 'false' }], notes: '' } } }) }),
    backup({ '2026-09-19': sampleDay({ exercises: { squat: { sets: [{ weight: 60, reps: '8', done: false }], notes: '' } } }) }),
    backup({ '2026-09-19': sampleDay({ bodyweight: '-5' }) }),
    backup({ '2026-09-19': sampleDay({ workoutIndex: -1 }) }),
    backup({}, { startDate: '2026-13-01' })
  ]) {
    assert.throws(() => store.importData(invalid));
    assert.equal(storage.getItem(STORAGE_KEY), before);
    assert.deepEqual(Object.keys(store.allDays()), ['2026-09-18']);
  }
});

test('prototype keys and unknown schema fields cannot be imported', () => {
  const store = createStore(memoryStorage());
  for (const invalid of [
    '{"version":1,"days":{"__proto__":{"polluted":true}},"settings":{}}',
    '{"version":1,"days":{},"settings":{"__proto__":{"polluted":true}}}',
    backup({ '2026-09-18': JSON.parse('{"__proto__":{"polluted":true}}') }),
    backup({ '2026-09-18': sampleDay({ unexpected: true }) }),
    backup({ '2026-09-18': sampleDay({ exercises: JSON.parse('{"constructor":{"sets":[],"notes":""}}') }) })
  ]) assert.throws(() => store.importData(invalid));
  assert.deepEqual(store.allDays(), {});
  assert.equal({}.polluted, undefined);
});

test('zeroes, blanks, and maximum values remain valid numeric strings', () => {
  const store = createStore(memoryStorage());
  const result = store.saveDay('2026-09-18', sampleDay({
    bodyweight: '0', exercises: { squat: { notes: '', sets: [
      { weight: '', reps: '', done: false },
      { weight: '0', reps: '0', done: false },
      { weight: '1000', reps: '3600', done: true }
    ] } }
  }));
  assert.equal(result.exercises.squat.sets[0].weight, '');
  assert.equal(result.exercises.squat.sets[1].reps, '0');
  assert.equal(result.exercises.squat.sets[2].weight, '1000');
  for (const date of ['2026-2-01', '2026-02-30', '2026-13-01', '__proto__']) {
    assert.throws(() => store.getDay(date));
    assert.throws(() => store.saveDay(date, sampleDay()));
  }
});

test('failed saves keep the prior state and never claim a successful write', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  store.saveDay('2026-09-18', sampleDay());
  const before = storage.getItem(STORAGE_KEY);
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => store.saveDay('2026-09-19', sampleDay()), /storage|save/i);
  assert.ok(store.error instanceof Error);
  assert.equal(storage.getItem(STORAGE_KEY), before);
  assert.equal(store.getDay('2026-09-19').status, '');
  assert.throws(() => store.importData(backup({ '2026-09-20': sampleDay() })));
  assert.equal(store.getDay('2026-09-20').status, '');
});

test('denied reads leave the app readable but block unsafe saves', () => {
  const storage = {
    getItem() { throw new Error('Permission denied'); },
    setItem() { assert.fail('Must not overwrite unreadable storage'); }
  };
  const store = createStore(storage);
  assert.ok(store.error instanceof Error);
  assert.equal(store.getDay('2026-09-18').status, '');
  assert.throws(() => store.saveDay('2026-09-18', sampleDay()), /storage/i);
  assert.throws(() => store.importData(backup({ '2026-09-18': sampleDay() })), /storage/i);
});

test('damaged storage is preserved and a valid import recovers without destroying raw data', () => {
  const raw = '{"version":1,"days":{"2026-09-18":';
  const storage = memoryStorage({ [STORAGE_KEY]: raw });
  const store = createStore(storage);
  assert.ok(store.error instanceof Error);
  assert.throws(() => store.saveDay('2026-09-19', sampleDay()), /recover|damaged|corrupt/i);
  assert.throws(() => store.exportData(), /recover|damaged|corrupt/i);
  assert.equal(storage.getItem(STORAGE_KEY), raw);
  assert.throws(() => store.importData('not a backup'));
  assert.equal(storage.values.size, 1);
  assert.deepEqual(store.importData(backup({ '2026-09-19': sampleDay() })), { imported: 1, skipped: 0 });
  assert.ok([...storage.values.entries()].some(([key, value]) => key !== STORAGE_KEY && value === raw));
  assert.equal(store.getDay('2026-09-19').notes, 'Felt strong');
  assert.equal(store.error, null);
});

test('recovery refuses to replace damaged data when its raw backup cannot be stored', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: 'damaged' });
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  const store = createStore(storage);
  assert.throws(() => store.importData(backup({ '2026-09-19': sampleDay() })));
  assert.equal(storage.getItem(STORAGE_KEY), 'damaged');
});

test('two store instances preserve separate dates saved by another tab', () => {
  const storage = memoryStorage();
  const first = createStore(storage);
  const second = createStore(storage);
  first.saveDay('2026-09-18', sampleDay());
  second.saveDay('2026-09-19', sampleDay({ notes: 'Second tab' }));
  assert.deepEqual(Object.keys(first.allDays()).sort(), ['2026-09-18', '2026-09-19']);
  assert.equal(first.getDay('2026-09-19').notes, 'Second tab');
});

test('merging large valid backups never saves data that the store cannot read back', () => {
  const existing = {};
  const incoming = {};
  const day = sampleDay({ notes: 'x'.repeat(10000), exercises: {} });
  for (let index = 0; index < 550; index += 1) {
    existing[new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10)] = day;
    incoming[new Date(Date.UTC(2024, 0, index + 1)).toISOString().slice(0, 10)] = day;
  }
  const raw = backup(existing);
  const storage = memoryStorage({ [STORAGE_KEY]: raw });
  const store = createStore(storage);
  assert.throws(() => store.importData(backup(incoming)), /storage|large|size|MB/i);
  assert.equal(storage.getItem(STORAGE_KEY), raw);
  assert.equal(createStore(storage).getDay('2020-01-01').notes.length, 10000);
});

test('large exported backups remain importable without formatting exceeding the size limit', () => {
  const days = {};
  const day = sampleDay({ notes: '', exercises: { squat: {
    notes: '', sets: Array.from({ length: 50 }, () => ({ weight: '', reps: '', done: false }))
  } } });
  for (let index = 0; index < 2000; index += 1) {
    days[new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10)] = day;
  }
  const raw = backup(days);
  assert.ok(raw.length < 10 * 1024 * 1024);
  assert.ok(JSON.stringify(JSON.parse(raw), null, 2).length > 10 * 1024 * 1024);
  const store = createStore(memoryStorage({ [STORAGE_KEY]: raw }));
  const restored = createStore(memoryStorage());
  assert.deepEqual(restored.importData(store.exportData()), { imported: 2000, skipped: 0 });
  assert.equal(restored.getDay('2020-01-01').exercises.squat.sets.length, 50);
});
