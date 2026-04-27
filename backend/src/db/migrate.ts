import { query } from './index';
import bcrypt from 'bcryptjs';

const createTables = async () => {
  const createEnumType = `
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
        CREATE TYPE role_enum AS ENUM ('super_admin', 'team_lead', 'member');
      END IF;
    END$$;
  `;

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role role_enum NOT NULL DEFAULT 'member',
      name VARCHAR(100),
      avatar VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createTeamsTable = `
    CREATE TABLE IF NOT EXISTS teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      daily_deadline TIME NOT NULL DEFAULT '18:00:00',
      weekly_submit_day INTEGER NOT NULL DEFAULT 5,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createTeamMembersTable = `
    CREATE TABLE IF NOT EXISTS team_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_lead BOOLEAN NOT NULL DEFAULT FALSE,
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, user_id)
    );
  `;

  const createDailyReportsTable = `
    CREATE TABLE IF NOT EXISTS daily_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      report_date DATE NOT NULL,
      today_completed TEXT,
      tomorrow_plan TEXT,
      problems TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, team_id, report_date)
    );
  `;

  const createWeeklyReportsTable = `
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      summary TEXT,
      next_week_plan TEXT,
      coordination_needed TEXT,
      work_hours JSONB,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, team_id, week_start)
    );
  `;

  const createCommentsTable = `
    CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      report_id UUID NOT NULL,
      report_type VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      mentions UUID[] DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createNotificationsTable = `
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      related_id UUID,
      related_type VARCHAR(20),
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createTemplatesTable = `
    CREATE TABLE IF NOT EXISTS templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      fields JSONB NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createProjectsTable = `
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      color VARCHAR(7),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_reports_user ON daily_reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_reports_team ON daily_reports(team_id);
    CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date);
    CREATE INDEX IF NOT EXISTS idx_weekly_reports_user ON weekly_reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_reports_team ON weekly_reports(team_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON weekly_reports(week_start);
    CREATE INDEX IF NOT EXISTS idx_comments_report ON comments(report_id, report_type);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_templates_team ON templates(team_id, type);
    CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
  `;

  try {
    await query(createEnumType);
    await query(createUsersTable);
    await query(createTeamsTable);
    await query(createTeamMembersTable);
    await query(createDailyReportsTable);
    await query(createWeeklyReportsTable);
    await query(createCommentsTable);
    await query(createNotificationsTable);
    await query(createTemplatesTable);
    await query(createProjectsTable);
    await query(createIndexes);
    console.log('Tables created successfully');

    const superAdminCheck = await query(
      "SELECT * FROM users WHERE username = 'superadmin'"
    );

    if (superAdminCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await query(
        `INSERT INTO users (username, email, password_hash, role, name)
         VALUES ($1, $2, $3, $4, $5)`,
        ['superadmin', 'superadmin@example.com', passwordHash, 'super_admin', '超级管理员']
      );
      console.log('Super admin created: superadmin / admin123');
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

createTables();
