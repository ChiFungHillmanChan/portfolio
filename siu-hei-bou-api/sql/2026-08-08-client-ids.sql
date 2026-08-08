-- client_id — the client-minted idempotency key that makes an offline write safe
-- to retry. Without it the failure mode is: a phone posts a grudge on a dying
-- connection, the server commits, the response is lost, the outbox retries, and
-- the grudge now exists twice with no way to tell which one is real.
--
-- NOT idempotent: SQLite has no "ADD COLUMN IF NOT EXISTS", so re-running this
-- file errors on the ALTERs. One-shot — apply once, then verify with
--   npx wrangler d1 execute siu-hei-bou-db --remote --command "PRAGMA table_info(grudges)"
--
-- Apply with:
--   npx wrangler d1 execute siu-hei-bou-db --remote --file=sql/2026-08-08-client-ids.sql
-- (drop --remote to do the local dev copy first; retry on an intermittent
-- "Authentication error [code: 10000]").
--
-- Mirrored into schema.sql so a fresh database gets it at create time.

ALTER TABLE friends ADD COLUMN client_id TEXT;
ALTER TABLE grudges ADD COLUMN client_id TEXT;

-- SQLite refuses ALTER TABLE ... ADD COLUMN ... UNIQUE, hence separate indexes.
-- PARTIAL so every pre-existing row (all client_id IS NULL) stays out of them —
-- a plain unique index would collapse all of them into one.
--
-- The WHERE is load-bearing a second time, at query time: SQLite only matches an
-- upsert's ON CONFLICT target to a partial index when the index's own WHERE is
-- repeated there, which is why db.mjs writes
--   ON CONFLICT(uid, client_id) WHERE client_id IS NOT NULL DO UPDATE ...
-- Drop the WHERE from either place and the insert dies with "ON CONFLICT clause
-- does not match any PRIMARY KEY or UNIQUE constraint".
CREATE UNIQUE INDEX IF NOT EXISTS idx_friends_client
  ON friends(uid, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_grudges_client
  ON grudges(uid, client_id) WHERE client_id IS NOT NULL;
