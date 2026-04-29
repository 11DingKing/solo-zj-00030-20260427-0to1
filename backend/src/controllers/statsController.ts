import { Context } from 'koa';
import { query } from '../db';
import redis, { getTeamMembersCacheKey, getRecentReportsCacheKey } from '../redis';

export const getSubmissionRateRanking = async (ctx: Context) => {
  const { teamId } = ctx.params;
  const { days } = ctx.query as { days?: string };

  const daysNum = parseInt(days || '30', 10);

  try {
    const cacheKey = getRecentReportsCacheKey(teamId);
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      ctx.body = JSON.parse(cached);
      return;
    }

    const result = await query(
      `SELECT 
         u.id,
         u.name,
         u.username,
         COUNT(CASE WHEN dr.status = 'submitted' THEN 1 END) as submitted_count,
         COUNT(CASE WHEN dr.id IS NOT NULL THEN 1 END) as total_days,
         ROUND(
           COUNT(CASE WHEN dr.status = 'submitted' THEN 1 END)::numeric / 
           NULLIF($1, 0)::numeric * 100, 
           2
         ) as submission_rate
       FROM users u
       JOIN team_members tm ON u.id = tm.user_id
       LEFT JOIN daily_reports dr ON u.id = dr.user_id 
         AND dr.team_id = tm.team_id 
         AND dr.report_date >= CURRENT_DATE - INTERVAL '1 day' * $2
       WHERE tm.team_id = $3
       GROUP BY u.id, u.name, u.username
       ORDER BY submission_rate DESC NULLS LAST`,
      [daysNum, daysNum, teamId]
    );

    await redis.setex(cacheKey, 3600, JSON.stringify(result.rows));

    ctx.body = result.rows;
  } catch (error) {
    console.error('Get submission rate ranking error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取提交率排行失败' };
  }
};

export const getAverageWordCountTrend = async (ctx: Context) => {
  const { teamId } = ctx.params;
  const { days } = ctx.query as { days?: string };

  const daysNum = parseInt(days || '30', 10);

  try {
    const result = await query(
      `SELECT 
         report_date,
         AVG(
           COALESCE(LENGTH(today_completed), 0) + 
           COALESCE(LENGTH(tomorrow_plan), 0) + 
           COALESCE(LENGTH(problems), 0)
         ) as avg_word_count
       FROM daily_reports
       WHERE team_id = $1 
         AND report_date >= CURRENT_DATE - INTERVAL '1 day' * $2
         AND status = 'submitted'
       GROUP BY report_date
       ORDER BY report_date ASC`,
      [teamId, daysNum]
    );

    ctx.body = result.rows;
  } catch (error) {
    console.error('Get average word count trend error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取平均字数趋势失败' };
  }
};

export const getWorkHoursStats = async (ctx: Context) => {
  const { teamId } = ctx.params;
  const { startDate, endDate } = ctx.query as {
    startDate?: string;
    endDate?: string;
  };

  try {
    const conditions: string[] = ['wr.team_id = $1', 'wr.status = $2'];
    const values: any[] = [teamId, 'submitted'];
    let paramIndex = 3;

    if (startDate) {
      conditions.push(`wr.week_start >= $${paramIndex++}`);
      values.push(startDate);
    }
    if (endDate) {
      conditions.push(`wr.week_end <= $${paramIndex++}`);
      values.push(endDate);
    }

    const result = await query(
      `SELECT wr.work_hours, wr.week_start
       FROM weekly_reports wr
       WHERE ${conditions.join(' AND ')}
       ORDER BY wr.week_start ASC`,
      values
    );

    const projectHours: Record<string, Record<string, number>> = {};
    const weekLabels: string[] = [];

    result.rows.forEach(row => {
      const weekKey = row.week_start.toISOString().split('T')[0];
      if (!weekLabels.includes(weekKey)) {
        weekLabels.push(weekKey);
      }

      if (row.work_hours && Array.isArray(row.work_hours)) {
        row.work_hours.forEach((entry: any) => {
          const projectName = entry.project_name || entry.project_id;
          if (!projectHours[projectName]) {
            projectHours[projectName] = {};
          }

          const totalHours = (entry.hours?.monday || 0) +
            (entry.hours?.tuesday || 0) +
            (entry.hours?.wednesday || 0) +
            (entry.hours?.thursday || 0) +
            (entry.hours?.friday || 0);

          projectHours[projectName][weekKey] = (projectHours[projectName][weekKey] || 0) + totalHours;
        });
      }
    });

    const datasets = Object.entries(projectHours).map(([projectName, hoursByWeek]) => ({
      label: projectName,
      data: weekLabels.map(week => hoursByWeek[week] || 0),
    }));

    ctx.body = {
      labels: weekLabels,
      datasets,
    };
  } catch (error) {
    console.error('Get work hours stats error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取工时统计失败' };
  }
};

export const getUnsubmittedList = async (ctx: Context) => {
  const { teamId } = ctx.params;
  const { date } = ctx.query as { date?: string };

  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const cacheKey = getTeamMembersCacheKey(teamId);
    let members: any[];
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      members = JSON.parse(cached);
    } else {
      const membersResult = await query(
        `SELECT u.id, u.name, u.username, u.email, tm.is_lead
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1
         ORDER BY tm.joined_at`,
        [teamId]
      );
      members = membersResult.rows;
      await redis.setex(cacheKey, 3600, JSON.stringify(members));
    }

    const submittedResult = await query(
      `SELECT user_id, status
       FROM daily_reports
       WHERE team_id = $1 AND report_date = $2`,
      [teamId, targetDate]
    );

    const submittedMap = new Map(
      submittedResult.rows.map(r => [r.user_id, r.status])
    );

    const unsubmitted = members.filter(m => !submittedMap.has(m.id));
    const draft = members.filter(m => submittedMap.get(m.id) === 'draft');

    ctx.body = {
      date: targetDate,
      totalMembers: members.length,
      submittedCount: members.length - unsubmitted.length - draft.length,
      draftCount: draft.length,
      unsubmittedCount: unsubmitted.length,
      unsubmitted,
      draft,
    };
  } catch (error) {
    console.error('Get unsubmitted list error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取未提交列表失败' };
  }
};

export const getTeamOverview = async (ctx: Context) => {
  const { teamId } = ctx.params;

  try {
    const membersCountResult = await query(
      'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1',
      [teamId]
    );

    const todayReportsResult = await query(
      `SELECT status, COUNT(*) as count
       FROM daily_reports
       WHERE team_id = $1 AND report_date = CURRENT_DATE
       GROUP BY status`,
      [teamId]
    );

    const weekReportsResult = await query(
      `SELECT status, COUNT(*) as count
       FROM weekly_reports
       WHERE team_id = $1 AND week_start <= CURRENT_DATE AND week_end >= CURRENT_DATE
       GROUP BY status`,
      [teamId]
    );

    const todayStats: Record<string, number> = {};
    todayReportsResult.rows.forEach(r => {
      todayStats[r.status] = parseInt(r.count, 10);
    });

    const weekStats: Record<string, number> = {};
    weekReportsResult.rows.forEach(r => {
      weekStats[r.status] = parseInt(r.count, 10);
    });

    ctx.body = {
      membersCount: parseInt(membersCountResult.rows[0].count, 10),
      todaySubmitted: todayStats.submitted || 0,
      todayDraft: todayStats.draft || 0,
      weekSubmitted: weekStats.submitted || 0,
      weekDraft: weekStats.draft || 0,
    };
  } catch (error) {
    console.error('Get team overview error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取团队概览失败' };
  }
};
