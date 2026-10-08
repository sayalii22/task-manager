/**
 * Apply Supabase schema via the correct Management API v1 endpoint
 * Run: node supabase/apply-schema.js
 */
require('dotenv').config();
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

// The full combined schema as one statement block
const FULL_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar_color VARCHAR(20) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(30) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    icon VARCHAR(50) NOT NULL DEFAULT 'folder',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories (user_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_default ON categories (is_default);

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'completed')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50) NOT NULL DEFAULT 'Work',
    tags TEXT[] NOT NULL DEFAULT '{}',
    due_date TIMESTAMPTZ DEFAULT NULL,
    reminder_date TIMESTAMPTZ DEFAULT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
    completed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks (user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks (user_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON tasks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_tags_gin ON tasks USING GIN (tags);

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO categories (name, color, icon, is_default, user_id) SELECT 'Work','#3b82f6','briefcase',TRUE,NULL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Work' AND is_default=TRUE);
INSERT INTO categories (name, color, icon, is_default, user_id) SELECT 'Personal','#8b5cf6','user',TRUE,NULL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Personal' AND is_default=TRUE);
INSERT INTO categories (name, color, icon, is_default, user_id) SELECT 'Study','#ec4899','graduation-cap',TRUE,NULL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Study' AND is_default=TRUE);
INSERT INTO categories (name, color, icon, is_default, user_id) SELECT 'Shopping','#f59e0b','shopping-cart',TRUE,NULL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Shopping' AND is_default=TRUE);
INSERT INTO categories (name, color, icon, is_default, user_id) SELECT 'Health','#10b981','heart-pulse',TRUE,NULL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Health' AND is_default=TRUE);
INSERT INTO categories (name, color, icon, is_default, user_id) SELECT 'Other','#64748b','bookmark',TRUE,NULL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Other' AND is_default=TRUE);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to users" ON users;
CREATE POLICY "Service role has full access to users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to categories" ON categories;
CREATE POLICY "Service role has full access to categories" ON categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to tasks" ON tasks;
CREATE POLICY "Service role has full access to tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow reading default categories" ON categories;
CREATE POLICY "Allow reading default categories" ON categories FOR SELECT USING (is_default = true);
`;

function postSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });

    // Supabase Management API for running SQL
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Alternative: use supabase-js to test if exec_sql function exists
async function tryViaRPC() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  // Try calling a simple RPC if it exists
  const { data, error } = await supabase.rpc('version');
  return { data, error };
}

async function main() {
  console.log(`\n🐘 Applying schema to Supabase: ${projectRef}\n`);
  console.log('📡 Trying Management API endpoint...\n');

  const result = await postSQL(FULL_SCHEMA);
  console.log('Response status:', result.status);
  console.log('Response body:', JSON.stringify(result.body, null, 2).substring(0, 500));

  if (result.status >= 200 && result.status < 300) {
    console.log('\n✅ Schema applied successfully via Management API!');
    return;
  }

  console.log('\n⚠️  Management API did not accept the request.');
  console.log('    This is expected — the Management API requires a Supabase Personal Access Token,');
  console.log('    not the service_role JWT key.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 MANUAL STEP REQUIRED (takes ~30 seconds):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Open: https://supabase.com/dashboard/project/tdmhpaejxcscyysfbeax/sql');
  console.log('2. Click "New query"');
  console.log('3. Paste the contents of: supabase/schema.sql');
  console.log('4. Click "Run"\n');
  console.log('The schema.sql file is at:');
  console.log('  c:\\Users\\sayli\\Task Manager\\supabase\\schema.sql\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  console.log('\n📋 Please run schema manually:');
  console.log('   https://supabase.com/dashboard/project/tdmhpaejxcscyysfbeax/sql\n');
});
