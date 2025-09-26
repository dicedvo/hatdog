-- Fix multi-team membership: Remove unique constraint on email, add unique constraint on user_id + organization_id

-- 1. Drop the existing unique constraint on email
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_email_key;

-- 2. Add a unique constraint on user_id + organization_id combo
-- This ensures a user can only be in each organization once, but can be in multiple organizations
ALTER TABLE team_members 
ADD CONSTRAINT team_members_user_org_unique UNIQUE (user_id, organization_id);

-- 3. Also make sure email + organization_id is unique (one email per org)
ALTER TABLE team_members 
ADD CONSTRAINT team_members_email_org_unique UNIQUE (email, organization_id);