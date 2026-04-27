import { Context } from 'koa';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const createProject = async (ctx: Context) => {
  const { teamId, name, description, color } = ctx.request.body as {
    teamId: string;
    name: string;
    description?: string;
    color?: string;
  };

  if (!teamId || !name) {
    ctx.status = 400;
    ctx.body = { error: '团队ID和项目名称不能为空' };
    return;
  }

  try {
    const result = await query(
      `INSERT INTO projects (id, team_id, name, description, color, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [uuidv4(), teamId, name, description || null, color || null]
    );

    ctx.status = 201;
    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Create project error:', error);
    ctx.status = 500;
    ctx.body = { error: '创建项目失败' };
  }
};

export const getProjects = async (ctx: Context) => {
  const { teamId } = ctx.params;
  const { isActive } = ctx.query as { isActive?: string };

  try {
    const conditions: string[] = ['team_id = $1'];
    const values: any[] = [teamId];
    let paramIndex = 2;

    if (isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(isActive === 'true');
    }

    const result = await query(
      `SELECT * FROM projects 
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`,
      values
    );

    ctx.body = result.rows;
  } catch (error) {
    console.error('Get projects error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取项目列表失败' };
  }
};

export const getProjectById = async (ctx: Context) => {
  const { projectId } = ctx.params;

  try {
    const result = await query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '项目不存在' };
      return;
    }

    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Get project error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取项目失败' };
  }
};

export const updateProject = async (ctx: Context) => {
  const { projectId } = ctx.params;
  const { name, description, color, isActive } = ctx.request.body as {
    name?: string;
    description?: string;
    color?: string;
    isActive?: boolean;
  };

  try {
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name) {
      fieldsToUpdate.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      fieldsToUpdate.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (color) {
      fieldsToUpdate.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (isActive !== undefined) {
      fieldsToUpdate.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    if (fieldsToUpdate.length === 0) {
      ctx.status = 400;
      ctx.body = { error: '没有要更新的字段' };
      return;
    }

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(projectId);

    const result = await query(
      `UPDATE projects SET ${fieldsToUpdate.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '项目不存在' };
      return;
    }

    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Update project error:', error);
    ctx.status = 500;
    ctx.body = { error: '更新项目失败' };
  }
};

export const deleteProject = async (ctx: Context) => {
  const { projectId } = ctx.params;

  try {
    const result = await query(
      'DELETE FROM projects WHERE id = $1 RETURNING *',
      [projectId]
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '项目不存在' };
      return;
    }

    ctx.body = { message: '项目已删除' };
  } catch (error) {
    console.error('Delete project error:', error);
    ctx.status = 500;
    ctx.body = { error: '删除项目失败' };
  }
};
