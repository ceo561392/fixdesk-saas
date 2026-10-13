PRAGMA foreign_keys = ON;
CREATE TABLE tenants (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
 plan TEXT NOT NULL DEFAULT 'demo', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL
);
CREATE TABLE users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE memberships (
 tenant_id TEXT NOT NULL REFERENCES tenants(id), user_id TEXT NOT NULL REFERENCES users(id),
 role TEXT NOT NULL CHECK(role IN ('admin','technician','requester')), created_at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,user_id)
);
CREATE TABLE assets (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), asset_code TEXT NOT NULL,
 name TEXT NOT NULL, category TEXT NOT NULL, location TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('active','maintenance','retired')), created_at TEXT NOT NULL,
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,asset_code)
);
CREATE TABLE ticket_counters (
 tenant_id TEXT PRIMARY KEY REFERENCES tenants(id), value INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE tickets (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), ticket_no TEXT NOT NULL,
 asset_id TEXT, requester_id TEXT NOT NULL, assignee_id TEXT,
 title TEXT NOT NULL, description TEXT NOT NULL,
 priority TEXT NOT NULL CHECK(priority IN ('low','normal','high','urgent')),
 status TEXT NOT NULL CHECK(status IN ('open','assigned','in_progress','resolved','closed','cancelled')),
 location TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, resolved_at TEXT,
 version INTEGER NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,ticket_no),
 FOREIGN KEY(tenant_id,asset_id) REFERENCES assets(tenant_id,id),
 FOREIGN KEY(tenant_id,requester_id) REFERENCES memberships(tenant_id,user_id),
 FOREIGN KEY(tenant_id,assignee_id) REFERENCES memberships(tenant_id,user_id)
);
CREATE INDEX tickets_tenant_status_date ON tickets(tenant_id,status,created_at);
CREATE INDEX tickets_requester ON tickets(tenant_id,requester_id,created_at);
CREATE INDEX tickets_asset ON tickets(tenant_id,asset_id);
CREATE TABLE ticket_events (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, ticket_id TEXT NOT NULL, actor_id TEXT NOT NULL,
 event_type TEXT NOT NULL, old_value TEXT, new_value TEXT, created_at TEXT NOT NULL,
 FOREIGN KEY(tenant_id,ticket_id) REFERENCES tickets(tenant_id,id),
 FOREIGN KEY(tenant_id,actor_id) REFERENCES memberships(tenant_id,user_id)
);
CREATE INDEX events_ticket ON ticket_events(tenant_id,ticket_id,created_at);
CREATE TABLE sessions (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), tenant_id TEXT NOT NULL,
 token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
 FOREIGN KEY(tenant_id,user_id) REFERENCES memberships(tenant_id,user_id)
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
