export interface Organization {
  id: string;
  name: string;
  invite_code: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMember {
  id: string;
  organization_id: string;
  user_id?: string;
  name: string;
  email?: string;
  initials: string;
  color: string;
  role: 'owner' | 'admin' | 'member';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee_id?: string;
  assignee?: TeamMember;
  due_date?: Date;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  color: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  organization_id?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  user?: {
    email: string;
  };
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: Date;
  updated_at: Date;
}