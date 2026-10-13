-- Network Marketing Agent — schema multi-tenant (RLS per account_id)
--
-- Come si applica: come gli altri file `schema-*.sql` (Supabase SQL editor o
-- `psql`), dopo `schema.sql` e `schema-skills.sql`. Idempotente: ogni
-- CREATE usa `IF NOT EXISTS`.
--
-- account_id referenzia auth.users(id) come in schema-skills.sql
-- (installed_skills.account_id): un account = un utente/profilo.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profilo di onboarding dell'incaricato (1 riga per account)
CREATE TABLE IF NOT EXISTS nm_profiles (
  account_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'incaricato', -- incaricato | team_leader
  products TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'amichevole', -- amichevole | professionale | diretto
  language TEXT NOT NULL DEFAULT 'it',
  monthly_goal TEXT NOT NULL DEFAULT '',
  channels TEXT[] NOT NULL DEFAULT '{}',
  disclaimer_text TEXT NOT NULL DEFAULT '',
  rules_accepted_version TEXT,
  rules_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contatti con consenso, temperatura, pipeline e opt-out
CREATE TABLE IF NOT EXISTS nm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  temperature TEXT NOT NULL DEFAULT 'warm', -- hot | warm | cold
  stage TEXT NOT NULL DEFAULT 'nuovo',
  channel_preferred TEXT NOT NULL DEFAULT '',
  consent_basis TEXT NOT NULL DEFAULT '',
  consent_date DATE,
  do_not_contact BOOLEAN NOT NULL DEFAULT FALSE,
  followup_attempts INTEGER NOT NULL DEFAULT 0,
  next_followup_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  hubspot_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS nm_contacts_account_idx ON nm_contacts (account_id);
CREATE INDEX IF NOT EXISTS nm_contacts_followup_idx ON nm_contacts (account_id, next_followup_at)
  WHERE do_not_contact = FALSE;

-- Bozze e invii verso terzi (ogni invio nasce come bozza approvata)
CREATE TABLE IF NOT EXISTS nm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES nm_contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'message', -- message | call | presentation | order
  draft_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft', -- draft | approved | sent
  compliance_status TEXT NOT NULL DEFAULT 'green', -- green | yellow | red
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS nm_interactions_account_idx ON nm_interactions (account_id);

-- Clienti: prodotti, riordini, soddisfazione
CREATE TABLE IF NOT EXISTS nm_customers (
  contact_id UUID PRIMARY KEY REFERENCES nm_contacts(id) ON DELETE CASCADE,
  products TEXT[] NOT NULL DEFAULT '{}',
  last_order_at DATE,
  reorder_due_at DATE,
  satisfaction TEXT NOT NULL DEFAULT ''
);

-- Membri del team (solo dati con consenso)
CREATE TABLE IF NOT EXISTS nm_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  onboarding_progress INTEGER NOT NULL DEFAULT 0,
  goals TEXT NOT NULL DEFAULT '',
  consent_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS nm_team_members_account_idx ON nm_team_members (account_id);

-- Template di messaggi dell'account
CREATE TABLE IF NOT EXISTS nm_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'approccio', -- approccio | followup | invito | riordino | post
  text TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'it',
  compliance_status TEXT NOT NULL DEFAULT 'green',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Obiettivi misurati per periodo
CREATE TABLE IF NOT EXISTS nm_goals (
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- es. 2026-10
  metric TEXT NOT NULL, -- clienti | incaricati | presentazioni
  target INTEGER NOT NULL DEFAULT 0,
  actual INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, period, metric)
);

-- Audit log del compliance-check su ogni bozza
CREATE TABLE IF NOT EXISTS nm_compliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_id UUID REFERENCES nm_interactions(id) ON DELETE SET NULL,
  rule_id TEXT NOT NULL,
  severity TEXT NOT NULL, -- yellow | red
  rewritten BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS nm_compliance_events_account_idx ON nm_compliance_events (account_id);

-- Documenti ufficiali dell'azienda per la RAG (catalogo, listino, compensi, codice etico)
CREATE TABLE IF NOT EXISTS nm_knowledge_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Casi di test del compliance-check (seed): testo, esito atteso, regola attesa
CREATE TABLE IF NOT EXISTS nm_compliance_cases (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  expected TEXT NOT NULL, -- green | yellow | red
  expected_rule TEXT NOT NULL DEFAULT ''
);

-- === RLS: isolamento per account ===
ALTER TABLE nm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nm_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE nm_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE nm_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nm_compliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nm_knowledge_docs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nm_owner_all' AND tablename = 'nm_profiles') THEN
    CREATE POLICY nm_owner_all ON nm_profiles FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nm_owner_all' AND tablename = 'nm_contacts') THEN
    CREATE POLICY nm_owner_all ON nm_contacts FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nm_owner_all' AND tablename = 'nm_interactions') THEN
    CREATE POLICY nm_owner_all ON nm_interactions FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nm_owner_all' AND tablename = 'nm_templates') THEN
    CREATE POLICY nm_owner_all ON nm_templates FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nm_owner_all' AND tablename = 'nm_team_members') THEN
    CREATE POLICY nm_owner_all ON nm_team_members FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nm_owner_all' AND tablename = 'nm_goals') THEN
    CREATE POLICY nm_owner_all ON nm_goals FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nm_owner_all' AND tablename = 'nm_compliance_events') THEN
    CREATE POLICY nm_owner_all ON nm_compliance_events FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nm_owner_all' AND tablename = 'nm_knowledge_docs') THEN
    CREATE POLICY nm_owner_all ON nm_knowledge_docs FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);
  END IF;
END $$;

-- nm_customers eredita l'isolamento dal contatto (join su nm_contacts)
ALTER TABLE nm_customers ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nm_customer_owner' AND tablename = 'nm_customers') THEN
    CREATE POLICY nm_customer_owner ON nm_customers FOR ALL
      USING (EXISTS (SELECT 1 FROM nm_contacts c WHERE c.id = nm_customers.contact_id AND c.account_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM nm_contacts c WHERE c.id = nm_customers.contact_id AND c.account_id = auth.uid()));
  END IF;
END $$;

-- nm_compliance_cases: casi ufficiali in lettura pubblica, come skills/plugins
ALTER TABLE nm_compliance_cases ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nm_cases_public_read' AND tablename = 'nm_compliance_cases') THEN
    CREATE POLICY nm_cases_public_read ON nm_compliance_cases FOR SELECT USING (true);
  END IF;
END $$;
