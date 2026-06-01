CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  vip_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  area TEXT,
  due_date TEXT,
  interest TEXT,
  source TEXT,
  gift_redeemed INTEGER DEFAULT 0,
  redeemed_at TEXT,
  whatsapp_status TEXT,
  whatsapp_message TEXT,
  whatsapp_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversions (
  id TEXT PRIMARY KEY,
  vip_code TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  amount REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

INSERT OR IGNORE INTO counters (name, value) VALUES ('vip', 1);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads (source);
CREATE INDEX IF NOT EXISTS idx_conversions_vip_code ON conversions (vip_code);
