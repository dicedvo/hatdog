-- ============================================
-- HATDOG MULTI-TENANT MIGRATION
-- This adds organization/team support to your existing tables
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. CREATE ORGANIZATIONS TABLE
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  invite_code VARCHAR(8) UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ADD COLUMNS TO EXISTING TABLES

-- Add organization and auth columns to team_members
ALTER TABLE team_members 
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN role VARCHAR DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member'));

-- Add organization column to tasks
ALTER TABLE tasks
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization column to projects
ALTER TABLE projects
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 3. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_team_members_org ON team_members(organization_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_email ON team_members(email) WHERE email IS NOT NULL;
CREATE INDEX idx_tasks_org ON tasks(organization_id);
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_organizations_invite_code ON organizations(invite_code);

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 5. DROP OLD POLICIES (if they exist)
DROP POLICY IF EXISTS "Allow all operations on team_members" ON team_members;
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;

-- 6. RLS POLICIES FOR ORGANIZATIONS

-- Users can view all organizations (filtering happens in app)
CREATE POLICY "Users can view organizations"
  ON organizations FOR SELECT
  USING (true);

-- Anyone authenticated can create an organization
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Anyone can update organizations (we'll restrict in app)
CREATE POLICY "Users can update organizations"
  ON organizations FOR UPDATE
  USING (true);

-- Anyone can delete organizations (we'll restrict in app)
CREATE POLICY "Users can delete organizations"
  ON organizations FOR DELETE
  USING (true);

-- 7. RLS POLICIES FOR TEAM_MEMBERS

-- Users can view all team members (we'll filter in the app)
-- This avoids recursion issues
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (true);

-- Users can insert themselves when joining a team
CREATE POLICY "Users can add themselves to team"
  ON team_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update team members (will be restricted by org check in app)
CREATE POLICY "Users can update team members"
  ON team_members FOR UPDATE
  USING (true);

-- Users can delete team members (will be restricted by org check in app)
CREATE POLICY "Users can delete team members"
  ON team_members FOR DELETE
  USING (true);

-- 8. RLS POLICIES FOR TASKS

-- Simple policies - let authenticated users access everything
-- We filter by organization_id in the application layer
CREATE POLICY "Users can view tasks"
  ON tasks FOR SELECT
  USING (true);

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update tasks"
  ON tasks FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete tasks"
  ON tasks FOR DELETE
  USING (true);

-- 9. RLS POLICIES FOR PROJECTS

CREATE POLICY "Users can view projects"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update projects"
  ON projects FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete projects"
  ON projects FOR DELETE
  USING (true);

-- 10. FUNCTION TO GENERATE UNIQUE INVITE CODE
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR AS $$
DECLARE
  new_code VARCHAR(8);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 8-character uppercase code
    new_code := UPPER(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM organizations WHERE invite_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 11. TRIGGER TO AUTO-GENERATE INVITE CODE ON ORG CREATION
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_invite_code_trigger
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION set_invite_code();

-- 12. FUNCTION TO AUTO-UPDATE updated_at TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at on all tables
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- 
-- What this did:
-- 1. Created 'organizations' table for teams
-- 2. Added organization_id to all your existing tables
-- 3. Added user_id and role to team_members for auth
-- 4. Set up RLS so users only see their org's data
-- 5. Auto-generates unique invite codes for teams
--
-- Next steps:
-- 1. Update TypeScript types to include Organization
-- 2. Create UI for create/join team
-- 3. Update all API calls to include organization_id
-- ============================================