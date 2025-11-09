-- Collaboration features schema extensions
-- Add these tables to support sharing and collaboration

CREATE TABLE IF NOT EXISTS shared_queries (
  id SERIAL PRIMARY KEY,
  query_id INTEGER NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  shared_by TEXT NOT NULL,
  shared_with TEXT[], -- Array of user emails or 'public'
  permissions TEXT NOT NULL DEFAULT 'view', -- 'view', 'edit', 'execute'
  share_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dashboards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  layout JSONB NOT NULL, -- Dashboard widget configuration
  filters JSONB, -- Saved filters
  refresh_interval INTEGER, -- Auto-refresh in seconds
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shared_dashboards (
  id SERIAL PRIMARY KEY,
  dashboard_id INTEGER NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  shared_by TEXT NOT NULL,
  shared_with TEXT[], -- Array of user emails or 'public'
  permissions TEXT NOT NULL DEFAULT 'view',
  share_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS query_comments (
  id SERIAL PRIMARY KEY,
  query_id INTEGER NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS query_favorites (
  id SERIAL PRIMARY KEY,
  query_id INTEGER NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(query_id, user_email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_queries_token ON shared_queries(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_queries_query_id ON shared_queries(query_id);
CREATE INDEX IF NOT EXISTS idx_shared_dashboards_token ON shared_dashboards(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_dashboards_dashboard_id ON shared_dashboards(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_query_comments_query_id ON query_comments(query_id);
CREATE INDEX IF NOT EXISTS idx_query_favorites_user_email ON query_favorites(user_email);
