import { Context } from 'koa';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { TemplateField } from '../types';

export const createTemplate = async (ctx: Context) => {
  const { teamId, type, name, fields } = ctx.request.body as {
    teamId: string;
    type: 'daily' | 'weekly';
    name: string;
    fields: TemplateField[];
  };

  if (!teamId || !type || !name || !fields) {
    ctx.status = 400;
    ctx.body = { error: '团队ID、类型、名称和字段不能为空' };
    return;
  }

  try {
    const result = await query(
      `INSERT INTO templates (id, team_id, type, name, fields, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [uuidv4(), teamId, type, name, JSON.stringify(fields)]
    );

    ctx.status = 201;
    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Create template error:', error);
    ctx.status = 500;
    ctx.body = { error: '创建模板失败' };
  }
};

export const getTemplates = async (ctx: Context) => {
  const { teamId } = ctx.params;
  const { type, isActive } = ctx.query as {
    type?: string;
    isActive?: string;
  };

  try {
    const conditions: string[] = ['team_id = $1'];
    const values: any[] = [teamId];
    let paramIndex = 2;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(isActive === 'true');
    }

    const result = await query(
      `SELECT * FROM templates 
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`,
      values
    );

    ctx.body = result.rows;
  } catch (error) {
    console.error('Get templates error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取模板失败' };
  }
};

export const getTemplateById = async (ctx: Context) => {
  const { templateId } = ctx.params;

  try {
    const result = await query(
      'SELECT * FROM templates WHERE id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '模板不存在' };
      return;
    }

    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Get template error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取模板失败' };
  }
};

export const updateTemplate = async (ctx: Context) => {
  const { templateId } = ctx.params;
  const { name, fields, isActive } = ctx.request.body as {
    name?: string;
    fields?: TemplateField[];
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
    if (fields) {
      fieldsToUpdate.push(`fields = $${paramIndex++}`);
      values.push(JSON.stringify(fields));
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
    values.push(templateId);

    const result = await query(
      `UPDATE templates SET ${fieldsToUpdate.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '模板不存在' };
      return;
    }

    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Update template error:', error);
    ctx.status = 500;
    ctx.body = { error: '更新模板失败' };
  }
};

export const deleteTemplate = async (ctx: Context) => {
  const { templateId } = ctx.params;

  try {
    const result = await query(
      'DELETE FROM templates WHERE id = $1 RETURNING *',
      [templateId]
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '模板不存在' };
      return;
    }

    ctx.body = { message: '模板已删除' };
  } catch (error) {
    console.error('Delete template error:', error);
    ctx.status = 500;
    ctx.body = { error: '删除模板失败' };
  }
};

export const getActiveTemplate = async (ctx: Context) => {
  const { teamId, type } = ctx.params;

  try {
    const result = await query(
      `SELECT * FROM templates 
       WHERE team_id = $1 AND type = $2 AND is_active = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [teamId, type]
    );

    ctx.body = result.rows[0] || null;
  } catch (error) {
    console.error('Get active template error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取模板失败' };
  }
};
