-- Postgres schema for the AI calling agent pilot

CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  property TEXT,
  status TEXT DEFAULT 'new',            -- new | contacted | qualified | not_interested | callback
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE calls (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id),
  elevenlabs_conversation_id TEXT,
  recording_url TEXT,
  transcript JSONB,                     -- array of {speaker, text}
  duration_seconds INTEGER,
  outcome TEXT,                         -- qualified | callback | not_interested
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calls_lead_id ON calls(lead_id);
