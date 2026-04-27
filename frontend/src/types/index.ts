export type UserRole = 'super_admin' | 'team_lead' | 'member';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  teams?: TeamMemberInfo[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  daily_deadline: string;
  weekly_submit_day: number;
  created_at: string;
  updated_at: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  is_lead: boolean;
  joined_at: string;
}

export interface TeamMemberInfo {
  id: string;
  name: string;
  is_lead: boolean;
}

export type ReportStatus = 'draft' | 'submitted';

export interface DailyReport {
  id: string;
  user_id: string;
  team_id: string;
  report_date: string;
  today_completed?: string;
  tomorrow_plan?: string;
  problems?: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  user_name?: string;
  username?: string;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  team_id: string;
  week_start: string;
  week_end: string;
  summary?: string;
  next_week_plan?: string;
  coordination_needed?: string;
  work_hours?: WorkHourEntry[];
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  user_name?: string;
  username?: string;
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
  created_at: string;
  updated_at: string;
  user_name?: string;
  username?: string;
  avatar?: string;
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
  created_at: string;
}

export interface Template {
  id: string;
  team_id: string;
  type: 'daily' | 'weekly';
  name: string;
  fields: TemplateField[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface SubmissionRateItem {
  id: string;
  name: string;
  username: string;
  submitted_count: number;
  total_days: number;
  submission_rate: number;
}

export interface WordTrendItem {
  report_date: string;
  avg_word_count: number;
}

export interface WorkHoursStats {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

export interface UnsubmittedList {
  date: string;
  totalMembers: number;
  submittedCount: number;
  draftCount: number;
  unsubmittedCount: number;
  unsubmitted: TeamMember[];
  draft: TeamMember[];
}

export interface TeamOverview {
  membersCount: number;
  todaySubmitted: number;
  todayDraft: number;
  weekSubmitted: number;
  weekDraft: number;
}

export interface CalendarDayData {
  submitted: number;
  draft: number;
  total: number;
  reports: any[];
}
