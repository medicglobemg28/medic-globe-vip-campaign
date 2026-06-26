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

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  link TEXT NOT NULL,
  link_label TEXT DEFAULT 'Website',
  clicks INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO counters (name, value) VALUES ('vip', 1);

INSERT OR IGNORE INTO partners (id, name, area, link, link_label, clicks, created_at) VALUES
  ('diamond-baby', 'Diamond Baby Confinement Center', 'Selangor', 'https://www.facebook.com/', 'Facebook', 0, datetime('now')),
  ('yk-home', 'YK Confinement Home', 'Kuala Lumpur', 'https://www.facebook.com/', 'Facebook', 0, datetime('now')),
  ('mama-care', 'Mama Care Confinement', 'Penang', 'https://www.youtube.com/', 'Video', 0, datetime('now')),
  ('harmony-mom', 'Harmony Mom Care', 'Johor', 'https://www.facebook.com/', 'Facebook', 0, datetime('now'));

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads (source);
CREATE INDEX IF NOT EXISTS idx_conversions_vip_code ON conversions (vip_code);
CREATE INDEX IF NOT EXISTS idx_partners_area ON partners (area);
