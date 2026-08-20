-- Contexto da sessão (dispositivo, IP, localização aproximada)
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip VARCHAR(80);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS country VARCHAR(80);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS city VARCHAR(120);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS region VARCHAR(120);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_type VARCHAR(20);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS browser VARCHAR(60);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS os VARCHAR(60);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_last_seen ON refresh_tokens(last_seen_at DESC);
