import { Context } from 'koa';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';

const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const resolveUserIds = async (identifiers: string[]): Promise<string[]> => {
  const userIds: string[] = [];
  
  for (const identifier of identifiers) {
    if (isUUID(identifier)) {
      userIds.push(identifier);
    } else {
      const result = await query(
        'SELECT id FROM users WHERE username = $1 OR name = $1 LIMIT 1',
        [identifier]
      );
      if (result.rows.length > 0) {
        userIds.push(result.rows[0].id);
      }
    }
  }
  
  return [...new Set(userIds)];
};

export const createComment = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string; username: string };
  const { reportId, reportType, content, mentions } = ctx.request.body as {
    reportId: string;
    reportType: 'daily' | 'weekly';
    content: string;
    mentions?: string[];
  };

  if (!reportId || !reportType || !content) {
    ctx.status = 400;
    ctx.body = { error: '报告ID、类型和内容不能为空' };
    return;
  }

  try {
    let report;
    if (reportType === 'daily') {
      const result = await query(
        'SELECT * FROM daily_reports WHERE id = $1',
        [reportId]
      );
      report = result.rows[0];
    } else {
      const result = await query(
        'SELECT * FROM weekly_reports WHERE id = $1',
        [reportId]
      );
      report = result.rows[0];
    }

    if (!report) {
      ctx.status = 404;
      ctx.body = { error: '报告不存在' };
      return;
    }

    const mentionUserIds = mentions && mentions.length > 0 
      ? await resolveUserIds(mentions) 
      : [];

    const result = await query(
      `INSERT INTO comments (id, user_id, report_id, report_type, content, mentions)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uuidv4(), user.userId, reportId, reportType, content, mentionUserIds]
    );

    const comment = result.rows[0];

    if (mentionUserIds.length > 0) {
      for (const mentionedUserId of mentionUserIds) {
        if (mentionedUserId !== user.userId) {
          await query(
            `INSERT INTO notifications (id, user_id, type, title, content, related_id, related_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              uuidv4(),
              mentionedUserId,
              'mention',
              '有人在评论中@了你',
              content.substring(0, 100) + (content.length > 100 ? '...' : ''),
              reportId,
              reportType,
            ]
          );
          console.log(`Notification sent to user ${mentionedUserId} for mention`);
        }
      }
    }

    if (report.user_id !== user.userId) {
      await query(
        `INSERT INTO notifications (id, user_id, type, title, content, related_id, related_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          report.user_id,
          'comment',
          '你的报告收到了新评论',
          content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          reportId,
          reportType,
        ]
      );
      console.log(`Notification sent to report owner ${report.user_id}`);
    }

    const commentWithUser = await query(
      `SELECT c.*, u.name as user_name, u.username, u.avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [comment.id]
    );

    ctx.status = 201;
    ctx.body = commentWithUser.rows[0] || comment;
  } catch (error) {
    console.error('Create comment error:', error);
    ctx.status = 500;
    ctx.body = { error: '创建评论失败' };
  }
};

export const getComments = async (ctx: Context) => {
  const { reportId, reportType } = ctx.params;

  try {
    const result = await query(
      `SELECT c.*, u.name as user_name, u.username, u.avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.report_id = $1 AND c.report_type = $2
       ORDER BY c.created_at ASC`,
      [reportId, reportType]
    );

    ctx.body = result.rows;
  } catch (error) {
    console.error('Get comments error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取评论失败' };
  }
};

export const updateComment = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string; role: string };
  const { commentId } = ctx.params;
  const { content, mentions } = ctx.request.body as {
    content: string;
    mentions?: string[];
  };

  if (!content) {
    ctx.status = 400;
    ctx.body = { error: '评论内容不能为空' };
    return;
  }

  try {
    const existingComment = await query(
      'SELECT * FROM comments WHERE id = $1',
      [commentId]
    );

    if (existingComment.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '评论不存在' };
      return;
    }

    const comment = existingComment.rows[0];

    if (comment.user_id !== user.userId && user.role !== 'super_admin') {
      ctx.status = 403;
      ctx.body = { error: '只能编辑自己的评论' };
      return;
    }

    const mentionUserIds = mentions && mentions.length > 0 
      ? await resolveUserIds(mentions) 
      : [];

    const result = await query(
      `UPDATE comments 
       SET content = $1, mentions = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [content, mentionUserIds, commentId]
    );

    const commentWithUser = await query(
      `SELECT c.*, u.name as user_name, u.username, u.avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    ctx.body = commentWithUser.rows[0] || result.rows[0];
  } catch (error) {
    console.error('Update comment error:', error);
    ctx.status = 500;
    ctx.body = { error: '更新评论失败' };
  }
};

export const deleteComment = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string; role: string };
  const { commentId } = ctx.params;

  try {
    const existingComment = await query(
      'SELECT * FROM comments WHERE id = $1',
      [commentId]
    );

    if (existingComment.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '评论不存在' };
      return;
    }

    const comment = existingComment.rows[0];

    if (comment.user_id !== user.userId && user.role !== 'super_admin') {
      ctx.status = 403;
      ctx.body = { error: '只能删除自己的评论' };
      return;
    }

    await query('DELETE FROM comments WHERE id = $1', [commentId]);

    ctx.body = { message: '评论已删除' };
  } catch (error) {
    console.error('Delete comment error:', error);
    ctx.status = 500;
    ctx.body = { error: '删除评论失败' };
  }
};
