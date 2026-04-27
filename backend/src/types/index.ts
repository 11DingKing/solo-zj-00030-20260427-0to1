export type UserRole = 'super_admin' | 'team_lead' | 'member';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  name?: string;
  avatar?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  daily_deadline: string;
  weekly_submit_day: number;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  is_lead: boolean;
  joined_at: Date;
}

export type ReportStatus = 'draft' | 'submitted';

export interface DailyReport {
  id: string;
  user_id: string;
  team_id: string;
  report_date: Date;
  today_completed?: string;
  tomorrow_plan?: string;
  problems?: string;
  status: ReportStatus;
  created_at: Date;
  updated_at: Date;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  team_id: string;
  week_start: Date;
  week_end: Date;
  summary?: string;
  next_week_plan?: string;
  coordination_needed?: string;
  work_hours?: WorkHourEntry[];
  status: ReportStatus;
  created_at: Date;
  updated_at: Date;
}

export interface WorkHourEntry {
  project_id: string;
  project_name: string;
  hours: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
  };
}

export interface Comment {
  id: string;
  user_id: string;
  report_id: string;
  report_type: 'daily' | 'weekly';
  content: string;
  mentions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'mention' | 'comment' | 'reminder' | 'system';
  title: string;
  content?: string;
  related_id?: string;
  related_type?: string;
  is_read: boolean;
  created_at: Date;
}

export interface Template {
  id: string;
  team_id: string;
  type: 'daily' | 'weekly';
  name: string;
  fields: TemplateField[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TemplateField {
  id: string;
  name: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'markdown';
  required: boolean;
}

export interface Project {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  username: string;
}

export interface AppError extends Error {
  statusCode?: number;
}
