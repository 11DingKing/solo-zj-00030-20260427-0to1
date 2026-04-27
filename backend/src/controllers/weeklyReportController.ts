import { Context } from 'koa';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import redis, { getRecentReportsCacheKey } from '../redis';

export const createOrUpdateWeeklyReport = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string };
  const { teamId, weekStart, weekEnd, summary, nextWeekPlan, coordinationNeeded, workHours, status } = ctx.request.body as {
    teamId: string;
    weekStart: string;
    weekEnd: string;
    summary?: string;
    nextWeekPlan?: string;
    coordinationNeeded?: string;
    workHours?: any[];
    status?: 'draft' | 'submitted';
  };

  if (!teamId || !weekStart || !weekEnd) {
    ctx.status = 400;
    ctx.body = { error: '团队ID和周日期范围不能为空' };
    return;
  }

  try {
    const existingReport = await query(
      'SELECT * FROM weekly_reports WHERE user_id = $1 AND team_id = $2 AND week_start = $3',
      [user.userId, teamId, weekStart]
    );

    if (existingReport.rows.length > 0) {
      const report = existingReport.rows[0];
      const result = await query(
        `UPDATE weekly_reports 
         SET summary = $1, next_week_plan = $2, coordination_needed = $3, 
             work_hours = $4, status = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [
          summary ?? report.summary,
          nextWeekPlan ?? report.next_week_plan,
          coordinationNeeded ?? report.coordination_needed,
          workHours ?? report.work_hours,
          status || report.status,
          report.id,
        ]
      );

      await redis.del(getRecentReportsCacheKey(teamId));
      ctx.body = result.rows[0];
    } else {
      const result = await query(
        `INSERT INTO weekly_reports 
         (id, user_id, team_id, week_start, week_end, summary, next_week_plan, coordination_needed, work_hours, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          uuidv4(),
          user.userId,
          teamId,
          weekStart,
          weekEnd,
          summary || null,
          nextWeekPlan || null,
          coordinationNeeded || null,
          workHours || null,
          status || 'draft',
        ]
      );

      await redis.del(getRecentReportsCacheKey(teamId));
      ctx.status = 201;
      ctx.body = result.rows[0];
    }
  } catch (error) {
    console.error('Create/Update weekly report error:', error);
    ctx.status = 500;
    ctx.body = { error: '保存周报失败' };
  }
};

export const getWeeklyReport = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string; role: string };
  const { teamId, weekStart } = ctx.params;

  try {
    const result = await query(
      `SELECT wr.*, u.name as user_name, u.username
       FROM weekly_reports wr
       JOIN users u ON wr.user_id = u.id
       WHERE wr.team_id = $1 AND wr.week_start = $2 AND wr.user_id = $3`,
      [teamId, weekStart, user.userId]
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
          `SELECT wr.*, u.name as user_name, u.username
           FROM weekly_reports wr
           JOIN users u ON wr.user_id = u.id
           WHERE wr.team_id = $1 AND wr.week_start = $2`,
          [teamId, weekStart]
        );
        ctx.body = allReports.rows;
        return;
      }
    }

    ctx.body = null;
  } catch (error) {
    console.error('Get weekly report error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取周报失败' };
  }
};

export const getTeamWeeklyReports = async (ctx: Context) => {
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

    const conditions: string[] = ['wr.team_id = $1'];
    const values: any[] = [teamId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`wr.week_start >= $${paramIndex++}`);
      values.push(startDate);
    }
    if (endDate) {
      conditions.push(`wr.week_end <= $${paramIndex++}`);
      values.push(endDate);
    }
    if (userId) {
      conditions.push(`wr.user_id = $${paramIndex++}`);
      values.push(userId);
    }
    if (status) {
      conditions.push(`wr.status = $${paramIndex++}`);
      values.push(status);
    }

    const result = await query(
      `SELECT wr.*, u.name as user_name, u.username
       FROM weekly_reports wr
       JOIN users u ON wr.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY wr.week_start DESC, wr.created_at DESC`,
      values
    );

    ctx.body = result.rows;
  } catch (error) {
    console.error('Get team weekly reports error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取团队周报失败' };
  }
};

export const getWeeklyReportById = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string; role: string };
  const { reportId } = ctx.params;

  try {
    const result = await query(
      `SELECT wr.*, u.name as user_name, u.username
       FROM weekly_reports wr
       JOIN users u ON wr.user_id = u.id
       WHERE wr.id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '周报不存在' };
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
    console.error('Get weekly report by id error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取周报失败' };
  }
};
