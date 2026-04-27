import { Context } from 'koa';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import redis, { getTeamMembersCacheKey } from '../redis';

export const createTeam = async (ctx: Context) => {
  const { name, description, dailyDeadline, weeklySubmitDay } = ctx.request.body as {
    name: string;
    description?: string;
    dailyDeadline?: string;
    weeklySubmitDay?: number;
  };

  if (!name) {
    ctx.status = 400;
    ctx.body = { error: '团队名称不能为空' };
    return;
  }

  try {
    const result = await query(
      `INSERT INTO teams (id, name, description, daily_deadline, weekly_submit_day)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        uuidv4(),
        name,
        description || null,
        dailyDeadline || '18:00:00',
        weeklySubmitDay || 5,
      ]
    );

    ctx.status = 201;
    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Create team error:', error);
    ctx.status = 500;
    ctx.body = { error: '创建团队失败' };
  }
};

export const getTeams = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string; role: string };

  try {
    let teams;

    if (user.role === 'super_admin') {
      const result = await query(
        `SELECT t.*,
                (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'is_lead', tm.is_lead))
                 FROM team_members tm
                 JOIN users u ON tm.user_id = u.id
                 WHERE tm.team_id = t.id) as members
         FROM teams t
         ORDER BY t.created_at DESC`
      );
      teams = result.rows;
    } else {
      const result = await query(
        `SELECT t.*, tm.is_lead,
                (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'is_lead', tm2.is_lead))
                 FROM team_members tm2
                 JOIN users u ON tm2.user_id = u.id
                 WHERE tm2.team_id = t.id) as members
         FROM teams t
         JOIN team_members tm ON t.id = tm.team_id
         WHERE tm.user_id = $1
         ORDER BY t.created_at DESC`,
        [user.userId]
      );
      teams = result.rows;
    }

    ctx.body = teams;
  } catch (error) {
    console.error('Get teams error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取团队列表失败' };
  }
};

export const getTeamById = async (ctx: Context) => {
  const { teamId } = ctx.params;
  const user = ctx.state.user as { userId: string; role: string };

  try {
    const teamResult = await query(
      `SELECT t.*,
              (SELECT json_agg(json_build_object(
                'id', u.id,
                'name', u.name,
                'username', u.username,
                'email', u.email,
                'role', u.role,
                'is_lead', tm.is_lead,
                'joined_at', tm.joined_at
              ) ORDER BY tm.joined_at)
               FROM team_members tm
               JOIN users u ON tm.user_id = u.id
               WHERE tm.team_id = t.id) as members
       FROM teams t
       WHERE t.id = $1`,
      [teamId]
    );

    if (teamResult.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '团队不存在' };
      return;
    }

    if (user.role !== 'super_admin') {
      const memberCheck = await query(
        'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
        [teamId, user.userId]
      );

      if (memberCheck.rows.length === 0) {
        ctx.status = 403;
        ctx.body = { error: '您不是该团队成员' };
        return;
      }
    }

    ctx.body = teamResult.rows[0];
  } catch (error) {
    console.error('Get team error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取团队信息失败' };
  }
};

export const updateTeam = async (ctx: Context) => {
  const { teamId } = ctx.params;
  const { name, description, dailyDeadline, weeklySubmitDay } = ctx.request.body as {
    name?: string;
    description?: string;
    dailyDeadline?: string;
    weeklySubmitDay?: number;
  };

  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name) {
      fields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (dailyDeadline) {
      fields.push(`daily_deadline = $${paramIndex++}`);
      values.push(dailyDeadline);
    }
    if (weeklySubmitDay !== undefined) {
      fields.push(`weekly_submit_day = $${paramIndex++}`);
      values.push(weeklySubmitDay);
    }

    if (fields.length === 0) {
      ctx.status = 400;
      ctx.body = { error: '没有要更新的字段' };
      return;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(teamId);

    const result = await query(
      `UPDATE teams SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '团队不存在' };
      return;
    }

    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Update team error:', error);
    ctx.status = 500;
    ctx.body = { error: '更新团队失败' };
  }
};

export const addTeamMember = async (ctx: Context) => {
  const { teamId } = ctx.params;
  const { userId, isLead } = ctx.request.body as {
    userId: string;
    isLead?: boolean;
  };

  if (!userId) {
    ctx.status = 400;
    ctx.body = { error: '用户ID不能为空' };
    return;
  }

  try {
    const userCheck = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '用户不存在' };
      return;
    }

    const existingMember = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );

    if (existingMember.rows.length > 0) {
      ctx.status = 400;
      ctx.body = { error: '用户已经是团队成员' };
      return;
    }

    const result = await query(
      `INSERT INTO team_members (id, team_id, user_id, is_lead)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [uuidv4(), teamId, userId, isLead || false]
    );

    await redis.del(getTeamMembersCacheKey(teamId));

    ctx.status = 201;
    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Add team member error:', error);
    ctx.status = 500;
    ctx.body = { error: '添加团队成员失败' };
  }
};

export const removeTeamMember = async (ctx: Context) => {
  const { teamId, userId } = ctx.params;

  try {
    const result = await query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING *',
      [teamId, userId]
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '团队成员不存在' };
      return;
    }

    await redis.del(getTeamMembersCacheKey(teamId));

    ctx.body = { message: '已移除团队成员' };
  } catch (error) {
    console.error('Remove team member error:', error);
    ctx.status = 500;
    ctx.body = { error: '移除团队成员失败' };
  }
};

export const setTeamLead = async (ctx: Context) => {
  const { teamId, userId } = ctx.params;
  const { isLead } = ctx.request.body as { isLead: boolean };

  try {
    const result = await query(
      `UPDATE team_members 
       SET is_lead = $1 
       WHERE team_id = $2 AND user_id = $3
       RETURNING *`,
      [isLead, teamId, userId]
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '团队成员不存在' };
      return;
    }

    const user = await query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role",
      [isLead ? 'team_lead' : 'member', userId]
    );

    await redis.del(getTeamMembersCacheKey(teamId));

    ctx.body = { ...result.rows[0], new_role: user.rows[0]?.role };
  } catch (error) {
    console.error('Set team lead error:', error);
    ctx.status = 500;
    ctx.body = { error: '设置团队负责人失败' };
  }
};

export const searchUsers = async (ctx: Context) => {
  const { q } = ctx.query as { q?: string };

  if (!q || q.trim().length < 1) {
    ctx.body = [];
    return;
  }

  try {
    const result = await query(
      `SELECT id, username, name, email, role 
       FROM users 
       WHERE name ILIKE $1 OR username ILIKE $1 OR email ILIKE $1
       LIMIT 20`,
      [`%${q}%`]
    );

    ctx.body = result.rows;
  } catch (error) {
    console.error('Search users error:', error);
    ctx.status = 500;
    ctx.body = { error: '搜索用户失败' };
  }
};
