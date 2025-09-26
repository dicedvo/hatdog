-- Add comments and subtasks functionality
-- Run this in Supabase SQL Editor

-- 1. CREATE COMMENTS TABLE
CREATE TABLE task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE SUBTASKS TABLE
CREATE TABLE subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE INDEXES
CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_comments_user ON task_comments(user_id);
CREATE INDEX idx_subtasks_task ON subtasks(task_id);

-- 4. ENABLE RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR COMMENTS
CREATE POLICY "Users can view comments" ON task_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON task_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own comments" ON task_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON task_comments FOR DELETE USING (user_id = auth.uid());

-- 6. RLS POLICIES FOR SUBTASKS
CREATE POLICY "Users can view subtasks" ON subtasks FOR SELECT USING (true);
CREATE POLICY "Users can create subtasks" ON subtasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update subtasks" ON subtasks FOR UPDATE USING (true);
CREATE POLICY "Users can delete subtasks" ON subtasks FOR DELETE USING (true);

-- 7. TRIGGER FOR updated_at
CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER subtasks_updated_at
  BEFORE UPDATE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();