-- D1 schema for the handbook downloads worker. Apply with:
--   npx wrangler d1 execute hillmanchan-handbook --remote --file schema.sql
CREATE TABLE IF NOT EXISTS downloads (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL,          -- ISO time (UTC)
  day TEXT NOT NULL,         -- YYYY-MM-DD (UTC)
  handbook TEXT NOT NULL,    -- site slug, e.g. ai-engineer
  part INTEGER NOT NULL,     -- 0 = intro booklet
  lang TEXT NOT NULL,        -- zh | en
  visitor TEXT NOT NULL,     -- salted SHA-256 of the IP address, truncated; never the IP itself
  country TEXT
);
CREATE INDEX IF NOT EXISTS downloads_by_part ON downloads (handbook, part, lang);
CREATE INDEX IF NOT EXISTS downloads_by_visitor ON downloads (visitor, handbook, part, lang, at);
CREATE INDEX IF NOT EXISTS downloads_by_day ON downloads (day);

CREATE TABLE IF NOT EXISTS payments (
  session_id TEXT PRIMARY KEY,  -- Stripe Checkout Session id (makes webhook retries harmless)
  at TEXT NOT NULL,
  handbook TEXT NOT NULL,
  part INTEGER,                 -- NULL when the payment did not say which part
  lang TEXT,
  amount INTEGER NOT NULL,      -- minor units (cents)
  currency TEXT NOT NULL,
  payment_link TEXT,
  livemode INTEGER NOT NULL
);
