-- Indexes for the three queries that were full-scanning. Idempotent — safe to
-- re-run. Apply with:
--   npx wrangler d1 execute siu-hei-bou-db --remote --file=sql/2026-08-09-indexes.sql
-- (drop --remote to do the local dev copy first).
--
-- Mirrored into schema.sql so a fresh database gets them at create time.

-- getState's stamp count: SUM(severity) WHERE friend_id = ? AND card_id IS NULL.
-- idx_grudges_uid_friend leads on uid, so this subquery could not use it and
-- scanned every grudge row in the table, once per friend, on every app load.
-- Partial index = only the unclaimed rows, which is all this query ever wants.
CREATE INDEX IF NOT EXISTS idx_grudges_open ON grudges(friend_id) WHERE card_id IS NULL;

-- getPublicCard: SELECT ... FROM grudges WHERE card_id = ? (public share link).
CREATE INDEX IF NOT EXISTS idx_grudges_card ON grudges(card_id);

-- getState's open-card lookup (uid) and listCards (uid, friend_id).
CREATE INDEX IF NOT EXISTS idx_cards_uid_friend ON cards(uid, friend_id);

-- Admin pagination: ORDER BY created_at DESC, uid LIMIT/OFFSET.
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC, uid);
