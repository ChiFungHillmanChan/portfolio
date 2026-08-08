-- 書末 ·個人檔案 needs COUNT(*) FROM cards WHERE uid = ?, and 撕爛本簿 needs
-- DELETE FROM cards WHERE uid = ?. Neither could use an index — cards had none
-- on uid at all — so both were SCAN TABLE cards. D1 bills rows read, so that is
-- a bill that grows with every card every user has ever opened.
--
--   before: SCAN TABLE cards
--   after:  SEARCH TABLE cards USING COVERING INDEX idx_cards_uid_friend (uid=?)
--
-- Idempotent — safe to re-run. Apply with:
--   npx wrangler d1 execute siu-hei-bou-db --remote --file=sql/2026-08-09-cards-uid-index.sql
-- (drop --remote to do the local dev copy first).
--
-- Mirrored into schema.sql so a fresh database gets it at create time.
-- Same name/definition as the index getState's open-card lookup wants, so the
-- two are deliberately one object, not two overlapping ones.

CREATE INDEX IF NOT EXISTS idx_cards_uid_friend ON cards(uid, friend_id);
