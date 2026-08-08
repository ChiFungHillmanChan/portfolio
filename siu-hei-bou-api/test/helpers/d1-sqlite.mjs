// A D1-shaped façade over node:sqlite, so tests can run the REAL SQL from
// db.mjs against the REAL schema.sql.
//
// Why not a hand-written fake db object like the rest of these tests use: the
// behaviour that matters most here — "the same client_id twice returns the row
// that already exists" — lives entirely inside an ON CONFLICT clause. A fake
// would only prove the fake. Running it for real is also what caught that a
// PARTIAL unique index needs its WHERE repeated in the conflict target.
//
// Lives under test/helpers/ rather than test/ because `npm test` globs
// `test/*.mjs` and would otherwise run this file as a (empty) test suite.
//
// node:sqlite is experimental in Node 22 (importable, prints one warning);
// it bundles SQLite 3.50, i.e. newer than the sqlite3 CLI on most machines and
// close to what D1 runs.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCHEMA_PATH = fileURLToPath(new URL('../../schema.sql', import.meta.url));

// D1 surface db.mjs actually uses: prepare().bind().first()/.all()/.run() and
// batch(). Statements are prepared per call, exactly as db.mjs does.
export function makeSqliteD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(SCHEMA_PATH, 'utf8'));

  const prepare = (sql) => {
    const stmt = sqlite.prepare(sql);
    let args = [];
    const api = {
      bind: (...a) => { args = a; return api; },
      first: async () => stmt.get(...args) ?? null,
      all: async () => ({ results: stmt.all(...args) }),
      run: async () => ({ success: true, meta: stmt.run(...args) }),
      // d1.batch is one transaction; node:sqlite has no async batch, so run the
      // statements inside a real transaction to keep the all-or-nothing shape.
      _run: () => stmt.run(...args),
    };
    return api;
  };

  return {
    prepare,
    batch: async (stmts) => {
      sqlite.exec('BEGIN');
      try {
        const out = stmts.map((s) => s._run());
        sqlite.exec('COMMIT');
        return out;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
    // Escape hatch for arranging fixtures / EXPLAIN in a test.
    _sqlite: sqlite,
  };
}
