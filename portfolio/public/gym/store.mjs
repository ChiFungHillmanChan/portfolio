const STORAGE_KEY = 'hillman-gym:v1';
const MAX_DATA_LENGTH = 10 * 1024 * 1024;
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const DAY_FIELDS = ['status', 'programId', 'workoutIndex', 'bodyweight', 'notes', 'exercises'];
const SETTINGS_FIELDS = ['programId', 'startDate', 'lastView'];

const copy = value => JSON.parse(JSON.stringify(value));

function invalid(message) {
  throw new Error(`Invalid workout data: ${message}`);
}

function record(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    invalid(`${label} must be an object.`);
  }
  const keys = Object.keys(value);
  if (keys.some(key => UNSAFE_KEYS.has(key) || (fields && !fields.includes(key)))) {
    invalid(`${label} contains an unsupported field.`);
  }
  if (fields && fields.some(key => !Object.prototype.hasOwnProperty.call(value, key))) {
    invalid(`${label} is missing a required field.`);
  }
}

function text(value, maximum, label) {
  if (typeof value !== 'string' || value.length > maximum) invalid(`${label} must be text.`);
}

function identifier(value, label) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_:-]{0,99}$/.test(value) || UNSAFE_KEYS.has(value)) {
    invalid(`${label} is not a valid identifier.`);
  }
}

function numericString(value, maximum, label) {
  if (typeof value !== 'string' || value.length > 24 ||
      (value !== '' && (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) || Number(value) > maximum))) {
    invalid(`${label} must be blank or a number from 0 to ${maximum}.`);
  }
}

function calendarDate(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) invalid('Use a date in YYYY-MM-DD format.');
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(12, 0, 0, 0);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    invalid('The calendar date does not exist.');
  }
  return date;
}

export function localDateKey(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime()) || date.getFullYear() < 1 || date.getFullYear() > 9999) {
    invalid('The date is not valid.');
  }
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function monthCells(year, monthIndex) {
  if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    invalid('The calendar month is not valid.');
  }
  const prefix = `${String(year).padStart(4, '0')}-${String(monthIndex + 1).padStart(2, '0')}`;
  const first = calendarDate(`${prefix}-01`);
  const offset = (first.getUTCDay() + 6) % 7;
  first.setUTCMonth(monthIndex + 1, 0);
  const count = first.getUTCDate();
  const cells = Array(Math.max(35, Math.ceil((offset + count) / 7) * 7)).fill(null);
  for (let day = 1; day <= count; day += 1) cells[offset + day - 1] = `${prefix}-${String(day).padStart(2, '0')}`;
  return cells;
}

export function getScheduledDay(date, startDate, program) {
  const selected = calendarDate(date);
  calendarDate(startDate);
  if (!program || !Array.isArray(program.schedule) || program.schedule.length !== 7 ||
      program.schedule.some(index => index !== null && (!Number.isInteger(index) || index < 0))) {
    invalid('The program needs a seven-day schedule.');
  }
  return date < startDate ? null : program.schedule[(selected.getUTCDay() + 6) % 7];
}

function defaultDay() {
  return { status: '', programId: 'foundation', workoutIndex: 0, bodyweight: '', notes: '', exercises: {} };
}

function defaultData() {
  return { version: 1, days: {}, settings: { programId: 'foundation', startDate: localDateKey(), lastView: 'today' } };
}

function validateDay(day) {
  record(day, DAY_FIELDS, 'The day');
  if (!['', 'planned', 'done', 'rest'].includes(day.status)) invalid('The day status is not supported.');
  identifier(day.programId, 'The program');
  if (!Number.isInteger(day.workoutIndex) || day.workoutIndex < 0 || day.workoutIndex > 99) invalid('The workout index is not valid.');
  numericString(day.bodyweight, 1000, 'Bodyweight');
  text(day.notes, 10000, 'Day notes');
  record(day.exercises, null, 'Exercises');
  if (Object.keys(day.exercises).length > 200) invalid('There are too many exercises in a day.');
  for (const [id, exercise] of Object.entries(day.exercises)) {
    identifier(id, 'The exercise');
    record(exercise, ['sets', 'notes'], 'The exercise');
    text(exercise.notes, 10000, 'Exercise notes');
    if (!Array.isArray(exercise.sets) || exercise.sets.length > 100) invalid('Exercise sets must be a list of up to 100 sets.');
    for (const set of exercise.sets) {
      record(set, ['weight', 'reps', 'done'], 'The set');
      numericString(set.weight, 1000, 'Weight');
      numericString(set.reps, 3600, 'Reps or seconds');
      if (typeof set.done !== 'boolean') invalid('Set completion must be true or false.');
    }
  }
  return copy(day);
}

function validateSettings(settings) {
  record(settings, SETTINGS_FIELDS, 'Settings');
  identifier(settings.programId, 'The program');
  calendarDate(settings.startDate);
  identifier(settings.lastView, 'The view');
  return copy(settings);
}

function parseData(jsonText) {
  if (typeof jsonText !== 'string' || jsonText.length > MAX_DATA_LENGTH) invalid('Choose a JSON backup smaller than 10 MB.');
  let data;
  try { data = JSON.parse(jsonText); } catch { invalid('The backup is not valid JSON.'); }
  record(data, ['version', 'days', 'settings'], 'The backup');
  if (data.version !== 1) invalid('This backup version is not supported.');
  record(data.days, null, 'Saved days');
  const days = {};
  for (const [date, day] of Object.entries(data.days)) {
    calendarDate(date);
    days[date] = validateDay(day);
  }
  return { version: 1, days, settings: validateSettings(data.settings) };
}

export function createStore(storage) {
  let data = defaultData();
  let error = null;
  let errorKind = null;

  function fail(kind, message) {
    errorKind = kind;
    error = new Error(message);
    return error;
  }

  function read() {
    let raw;
    try {
      // Accessing the localStorage property itself can fail in private or restricted contexts.
      if (storage === undefined) storage = globalThis.localStorage;
      if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw new Error();
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      fail('read', 'Browser storage is unavailable. Changes cannot be saved until storage is allowed.');
      return { unreadable: true };
    }
    try {
      data = raw === null ? defaultData() : parseData(raw);
      if (errorKind !== 'write') { error = null; errorKind = null; }
      return { raw, corrupt: false };
    } catch {
      fail('corrupt', 'Saved workout data is damaged and has not been changed. Import a valid backup to recover.');
      return { raw, corrupt: true };
    }
  }

  function writable() {
    const current = read();
    if (current.unreadable || current.corrupt) throw error;
    return current;
  }

  function serialize(next) {
    const serialized = JSON.stringify(next);
    if (serialized.length > MAX_DATA_LENGTH) {
      throw fail('write', 'The combined workout data exceeds the 10 MB storage limit. Your saved data has not been changed.');
    }
    return serialized;
  }

  function persist(next, serialized = serialize(next)) {
    try { storage.setItem(STORAGE_KEY, serialized); }
    catch { throw fail('write', 'Your changes could not be saved to browser storage. Free some space or allow storage, then try again.'); }
    data = next;
    error = null;
    errorKind = null;
  }

  read();
  return {
    get error() { return error; },
    getDay(date) {
      calendarDate(date);
      read();
      return copy(data.days[date] || defaultDay());
    },
    saveDay(date, day) {
      calendarDate(date);
      const saved = validateDay(day);
      writable();
      persist({ ...data, days: { ...data.days, [date]: saved } });
      return copy(saved);
    },
    getSettings() {
      read();
      return copy(data.settings);
    },
    saveSettings(patch) {
      record(patch, null, 'Settings');
      if (Object.keys(patch).some(key => !SETTINGS_FIELDS.includes(key))) invalid('Settings contain an unsupported field.');
      writable();
      const settings = validateSettings({ ...data.settings, ...patch });
      persist({ ...data, settings });
      return copy(settings);
    },
    allDays() {
      read();
      return copy(data.days);
    },
    exportData() {
      writable();
      return JSON.stringify(data);
    },
    importData(jsonText) {
      // Validate everything before making even the first storage change.
      const incoming = parseData(jsonText);
      const current = read();
      if (current.unreadable) throw error;
      const days = { ...incoming.days, ...data.days };
      const imported = Object.keys(days).length - Object.keys(data.days).length;
      const skipped = Object.keys(incoming.days).length - imported;
      const next = { version: 1, days, settings: current.raw === null || current.corrupt ? incoming.settings : data.settings };
      const serialized = serialize(next);
      if (current.corrupt) {
        try {
          let suffix = Date.now();
          while (storage.getItem(`${STORAGE_KEY}:recovery:${suffix}`) !== null) suffix += 1;
          storage.setItem(`${STORAGE_KEY}:recovery:${suffix}`, current.raw);
        } catch { throw fail('corrupt', 'Damaged data could not be preserved in browser storage. Recovery was stopped without replacing it.'); }
      }
      persist(next, serialized);
      return { imported, skipped };
    }
  };
}
