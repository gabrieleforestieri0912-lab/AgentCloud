-- Skills & Plugins System for AgentCloud
-- Enables reusable skill packages that teach agents how to perform specific tasks

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Skills table: individual reusable instructions
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  locale TEXT NOT NULL DEFAULT 'it',
  owner TEXT NOT NULL DEFAULT 'official', -- official | community | user
  risk_level TEXT NOT NULL DEFAULT 'low', -- low | medium | high
  permissions TEXT[] DEFAULT '{}',
  zip_url TEXT,
  downloads INTEGER DEFAULT 0,
  account_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for official/community
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plugins table: themed packages grouping skills + integrations
CREATE TABLE IF NOT EXISTS plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT,
  price_tier TEXT NOT NULL DEFAULT 'free', -- free | included | addon
  version TEXT NOT NULL DEFAULT '1.0.0',
  zip_url TEXT,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plugin-Skills junction table
CREATE TABLE IF NOT EXISTS plugin_skills (
  plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (plugin_id, skill_id)
);

-- Plugin-Agents compatibility table
CREATE TABLE IF NOT EXISTS plugin_agents (
  plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
  agent_slug TEXT NOT NULL,
  fit TEXT NOT NULL, -- primary | secondary
  rationale TEXT,
  PRIMARY KEY (plugin_id, agent_slug)
);

-- Plugin-Integrations requirements table
CREATE TABLE IF NOT EXISTS plugin_integrations (
  plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
  integration_slug TEXT NOT NULL,
  status TEXT NOT NULL, -- required | optional
  availability TEXT NOT NULL, -- live | coming_soon
  rationale TEXT,
  PRIMARY KEY (plugin_id, integration_slug)
);

-- Installed skills per account and agent instance
CREATE TABLE IF NOT EXISTS installed_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_instance_id TEXT NOT NULL, -- identifier for agent instance
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, agent_instance_id, skill_id)
);

-- Skill execution logs for analytics
CREATE TABLE IF NOT EXISTS skill_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installed_skill_id UUID REFERENCES installed_skills(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL,
  outcome TEXT NOT NULL, -- success | failure | skipped
  tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_owner ON skills(owner);
CREATE INDEX IF NOT EXISTS idx_plugins_slug ON plugins(slug);
CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins(category);
CREATE INDEX IF NOT EXISTS idx_installed_skills_account ON installed_skills(account_id);
CREATE INDEX IF NOT EXISTS idx_installed_skills_agent ON installed_skills(agent_instance_id);
CREATE INDEX IF NOT EXISTS idx_skill_runs_installed ON skill_runs(installed_skill_id);

-- Row Level Security Policies
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE installed_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_runs ENABLE ROW LEVEL SECURITY;

-- Skills: public read for official/community, account read/write for user skills
CREATE POLICY "Skills: public read official/community" ON skills
  FOR SELECT USING (owner IN ('official', 'community'));

CREATE POLICY "Skills: account read own user skills" ON skills
  FOR SELECT USING (auth.uid() = account_id);

CREATE POLICY "Skills: account insert own skills" ON skills
  FOR INSERT WITH CHECK (auth.uid() = account_id);

CREATE POLICY "Skills: account update own skills" ON skills
  FOR UPDATE USING (auth.uid() = account_id);

CREATE POLICY "Skills: account delete own skills" ON skills
  FOR DELETE USING (auth.uid() = account_id);

-- Plugins: public read
CREATE POLICY "Plugins: public read" ON plugins
  FOR SELECT USING (true);

-- Plugin junction tables: public read
CREATE POLICY "Plugin skills: public read" ON plugin_skills
  FOR SELECT USING (true);

CREATE POLICY "Plugin agents: public read" ON plugin_agents
  FOR SELECT USING (true);

CREATE POLICY "Plugin integrations: public read" ON plugin_integrations
  FOR SELECT USING (true);

-- Installed skills: account isolation
CREATE POLICY "Installed skills: account read own" ON installed_skills
  FOR SELECT USING (auth.uid() = account_id);

CREATE POLICY "Installed skills: account insert own" ON installed_skills
  FOR INSERT WITH CHECK (auth.uid() = account_id);

CREATE POLICY "Installed skills: account update own" ON installed_skills
  FOR UPDATE USING (auth.uid() = account_id);

CREATE POLICY "Installed skills: account delete own" ON installed_skills
  FOR DELETE USING (auth.uid() = account_id);

-- Skill runs: account isolation
CREATE POLICY "Skill runs: account read own" ON skill_runs
  FOR SELECT USING (
    auth.uid() = (
      SELECT account_id FROM installed_skills
      WHERE installed_skills.id = skill_runs.installed_skill_id
    )
  );

CREATE POLICY "Skill runs: account insert own" ON skill_runs
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT account_id FROM installed_skills
      WHERE installed_skills.id = skill_runs.installed_skill_id
    )
  );

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_plugin_downloads(plugin_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE plugins
  SET downloads = downloads + 1
  WHERE id = plugin_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_skill_downloads(skill_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE skills
  SET downloads = downloads + 1
  WHERE id = skill_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plugins_updated_at BEFORE UPDATE ON plugins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
