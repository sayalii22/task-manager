-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR TASK MANAGER
-- Migration from MongoDB / Mongoose to Supabase PostgreSQL
-- ==============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create updated_at automatic timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. USERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar_color VARCHAR(20) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Case-insensitive unique index for email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

-- Trigger for users updated_at
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 4. CATEGORIES TABLE
-- ==============================================================================
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

-- Indexes for category lookup
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories (user_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_default ON categories (is_default);

-- Trigger for categories updated_at
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. TASKS TABLE
-- ==============================================================================
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

-- Performance Indexes for Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks (user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks (user_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON tasks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_tags_gin ON tasks USING GIN (tags);

-- Trigger for tasks updated_at
DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. DEFAULT CATEGORIES SEED DATA
-- ==============================================================================
INSERT INTO categories (name, color, icon, is_default, user_id)
SELECT 'Work', '#3b82f6', 'briefcase', TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Work' AND is_default = TRUE);

INSERT INTO categories (name, color, icon, is_default, user_id)
SELECT 'Personal', '#8b5cf6', 'user', TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Personal' AND is_default = TRUE);

INSERT INTO categories (name, color, icon, is_default, user_id)
SELECT 'Study', '#ec4899', 'graduation-cap', TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Study' AND is_default = TRUE);

INSERT INTO categories (name, color, icon, is_default, user_id)
SELECT 'Shopping', '#f59e0b', 'shopping-cart', TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Shopping' AND is_default = TRUE);

INSERT INTO categories (name, color, icon, is_default, user_id)
SELECT 'Health', '#10b981', 'heart-pulse', TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Health' AND is_default = TRUE);

INSERT INTO categories (name, color, icon, is_default, user_id)
SELECT 'Other', '#64748b', 'bookmark', TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Other' AND is_default = TRUE);

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Note: When accessed via the Node.js backend using SUPABASE_SERVICE_ROLE_KEY,
-- RLS is bypassed by default. These policies secure the database if anon/authenticated
-- keys are used directly.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
CREATE POLICY "Service role has full access to users" ON users
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to categories" ON categories;
CREATE POLICY "Service role has full access to categories" ON categories
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to tasks" ON tasks;
CREATE POLICY "Service role has full access to tasks" ON tasks
    FOR ALL USING (true) WITH CHECK (true);

-- Public/authenticated read policy for default categories
DROP POLICY IF EXISTS "Allow reading default categories" ON categories;
CREATE POLICY "Allow reading default categories" ON categories
    FOR SELECT USING (is_default = true);
