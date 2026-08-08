CREATE TABLE users (
  uid        TEXT PRIMARY KEY,          -- Firebase UID
  email      TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_created ON users(created_at DESC, uid);  -- admin pagination

CREATE TABLE friends (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  uid        TEXT NOT NULL,
  name       TEXT NOT NULL,             -- 罪人名／花名
  colour     TEXT NOT NULL DEFAULT '#e8a0a0',  -- bookmark tab colour
  threshold  INTEGER NOT NULL DEFAULT 10,      -- 滿卡印數
  reward     TEXT NOT NULL DEFAULT '請食飯',    -- 獎品文字
  archived   INTEGER NOT NULL DEFAULT 0,
  client_id  TEXT,                        -- client-minted idempotency key (offline writes)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_friends_uid ON friends(uid);
-- Partial so pre-existing rows (client_id IS NULL) stay out of it, and so a
-- client that never sends one can keep inserting. The WHERE must be repeated in
-- db.mjs's ON CONFLICT target or SQLite refuses to match the index.
CREATE UNIQUE INDEX idx_friends_client ON friends(uid, client_id) WHERE client_id IS NOT NULL;

CREATE TABLE cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  share_token   TEXT NOT NULL UNIQUE,   -- unguessable (crypto random, 24 chars)
  uid           TEXT NOT NULL,
  friend_id     INTEGER NOT NULL REFERENCES friends(id),
  stamp_total   INTEGER NOT NULL,
  reward        TEXT NOT NULL,          -- snapshot of friend.reward at open time
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','acknowledged','settled')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_at TEXT,
  settled_at    TEXT
);
CREATE INDEX idx_cards_uid_friend ON cards(uid, friend_id);

CREATE TABLE grudges (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uid         TEXT NOT NULL,
  friend_id   INTEGER NOT NULL REFERENCES friends(id),
  content     TEXT NOT NULL,            -- the grievance text
  severity    INTEGER NOT NULL CHECK (severity IN (1,2,3)),  -- 印仔數
  occurred_at TEXT NOT NULL,            -- user-editable date (YYYY-MM-DD)
  card_id     INTEGER REFERENCES cards(id),  -- NULL until claimed by a 找數卡
  client_id   TEXT,                           -- client-minted idempotency key (offline writes)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_grudges_uid_friend ON grudges(uid, friend_id);
CREATE UNIQUE INDEX idx_grudges_client ON grudges(uid, client_id) WHERE client_id IS NOT NULL;
-- getState sums unclaimed stamps by friend_id alone, which cannot use the
-- uid-leading index above; partial index keeps that hot path off a full scan.
CREATE INDEX idx_grudges_open ON grudges(friend_id) WHERE card_id IS NULL;
CREATE INDEX idx_grudges_card ON grudges(card_id);  -- public card page
