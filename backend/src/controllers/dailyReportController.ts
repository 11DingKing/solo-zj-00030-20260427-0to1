import { Context } from 'koa';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import redis, { getRecentReportsCacheKey } from '../redis';

export const createOrUpdateDailyReport = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string };
  const { teamId, reportDate, todayCompleted, tomorrowPlan, problems, status } = ctx.request.body as {
    teamId: string;
    reportDate: string;
    todayCompleted?: string;
    tomorrowPlan?: string;
    problems?: string;
    status?: 'draft' | 'submitted';
  };

  if (!teamId || !reportDate) {
    ctx.status = 400;
    ctx.body = { error: '团队ID和日期不能为空' };
    return;
  }

  try {
    const existingReport = await query(
      'SELECT * FROM daily_reports WHERE user_id = $1 AND team_id = $2 AND report_date = $3',
      [user.userId, teamId, reportDate]
    );

    if (existingReport.rows.length > 0) {
      const report = existingReport.rows[0];
      const result = await query(
        `UPDATE daily_reports 
         SET today_completed = $1, tomorrow_plan = $2, problems = $3, 
             status = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [
          todayCompleted ?? report.today_completed,
          tomorrowPlan ?? report.tomorrow_plan,
          problems ?? report.problems,
          status || report.status,
          report.id,
        ]
      );

      await redis.del(getRecentReportsCacheKey(teamId));
      ctx.body = result.rows[0];
    } else {
      const result = await query(
        `INSERT INTO daily_reports 
         (id, user_id, team_id, report_date, today_completed, tomorrow_plan, problems, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          uuidv4(),
          user.userId,
          teamId,
          reportDate,
          todayCompleted || null,
          tomorrowPlan || null,
          problems || null,
          status || 'draft',
        ]
      );

      await redis.del(getRecentReportsCacheKey(teamId));
      ctx.status = 201;
      ctx.body = result.rows[0];
    }
  } catch (error) {
    console.error('Create/Update daily report error:', error);
    ctx.status = 500;
    ctx.body = { error: '保存日报失败' };
  }
};

export const getDailyReport = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string; role: string };
  const { teamId, date } = ctx.params;

  try {
    const result = await query(
      `SELECT dr.*, u.name as user_name, u.username
       FROM daily_reports dr
       JOIN users u ON dr.user_id = u.id
       WHERE dr.team_id = $1 AND dr.report_date = $2 AND dr.user_id = $3`,
      [teamId, date, user.userId]
    );

    if (result.rows.length > 0) {
      ctx.body = result.rows[0];
      return;
    }

    if (user.role === 'team_lead' || user.role === 'super_admin') {
      const isLead = user.role === 'super_admin' ? true : (
        await query(
          'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND is_lead = true',
          [teamId, user.userId]
        )
      ).rows.length > 0;

      if (isLead) {
        const allReports = await query(
          `SELECT dr.*, u.name as user_name, u.username
           FROM daily_reports dr
           JOIN users u ON dr.user_id = u.id
           WHERE dr.team_id = $1 AND dr.report_date = $2`,
          [teamId, date]
        );
        ctx.body = allReports.rows;
        return;
      }
    }

    ctx.body = null;
  } catch (error) {
    console.error('Get daily report error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取日报失败' };
  }
};

export const getTeamDailyReports = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string; role: string };
  const { teamId } = ctx.params;
  const { startDate, endDate, userId, status } = ctx.query as {
    startDate?: string;
    endDate?: string;
    userId?: string;
    status?: string;
  };

  try {
    if (user.role !== 'super_admin') {
      const isLead = (
        await query(
          'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND is_lead = true',
          [teamId, user.userId]
        )
      ).rows.length > 0;

      if (!isLead) {
        ctx.status = 403;
        ctx.body = { error: '只有团队负责人可以查看所有报告' };
        return;
      }
    }

    const conditions: string[] = ['dr.team_id = $1'];
    const values: any[] = [teamId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`dr.report_date >= $${paramIndex++}`);
      values.push(startDate);
    }
    if (endDate) {
      conditions.push(`dr.report_date <= $${paramIndex++}`);
      values.push(endDate);
    }
    if (userId) {
      conditions.push(`dr.user_id = $${paramIndex++}`);
      values.push(userId);
    }
    if (status) {
      conditions.push(`dr.status = $${paramIndex++}`);
      values.push(status);
    }

    const result = await query(
      `SELECT dr.*, u.name as user_name, u.username
       FROM daily_reports dr
       JOIN users u ON dr.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY dr.report_date DESC, dr.created_at DESC`,
      values
    );

    ctx.body = result.rows;
  } catch (error) {
    console.error('Get team daily reports error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取团队日报失败' };
  }
};

export const getDailyReportById = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string; role: string };
  const { reportId } = ctx.params;

  try {
    const result = await query(
      `SELECT dr.*, u.name as user_name, u.username
       FROM daily_reports dr
       JOIN users u ON dr.user_id = u.id
       WHERE dr.id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '日报不存在' };
      return;
    }

    const report = result.rows[0];

    if (report.user_id !== user.userId && user.role !== 'super_admin') {
      const isLead = (
        await query(
          'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND is_lead = true',
          [report.team_id, user.userId]
        )
      ).rows.length > 0;

      if (!isLead) {
        ctx.status = 403;
        ctx.body = { error: '无权查看此报告' };
        return;
      }
    }

    ctx.body = report;
  } catch (error) {
    console.error('Get daily report by id error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取日报失败' };
  }
};

export const getCalendarView = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string; role: string };
  const { teamId } = ctx.params;
  const { year, month } = ctx.query as { year?: string; month?: string };

  try {
    const y = parseInt(year || new Date().getFullYear().toString(), 10);
    const m = parseInt(month || (new Date().getMonth() + 1).toString(), 10);

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    let memberIds: string[] = [];
    
    if (user.role === 'super_admin') {
      const members = await query(
        'SELECT user_id FROM team_members WHERE team_id = $1',
        [teamId]
      );
      memberIds = members.rows.map(r => r.user_id);
    } else {
      const isLead = (
        await query(
          'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND is_lead = true',
          [teamId, user.userId]
        )
      ).rows.length > 0;

      if (isLead) {
        const members = await query(
          'SELECT user_id FROM team_members WHERE team_id = $1',
          [teamId]
        );
        memberIds = members.rows.map(r => r.user_id);
      } else {
        memberIds = [user.userId];
      }
    }

    const reports = await query(
      `SELECT report_date, status, user_id
       FROM daily_reports
       WHERE team_id = $1 
         AND report_date >= $2 
         AND report_date <= $3
         AND user_id = ANY($4)`,
      [teamId, startDate, endDate, memberIds]
    );

    const calendarData: Record<string, any> = {};
    const totalMembers = memberIds.length;

    reports.rows.forEach(report => {
      const dateKey = report.report_date.toISOString().split('T')[0];
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = {
          submitted: 0,
          draft: 0,
          total: totalMembers,
          reports: [],
        };
      }
      
      if (report.status === 'submitted') {
        calendarData[dateKey].submitted++;
      } else {
        calendarData[dateKey].draft++;
      }
      
      calendarData[dateKey].reports.push(report);
    });

    ctx.body = calendarData;
  } catch (error) {
    console.error('Get calendar view error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取日历视图失败' };
  }
};
