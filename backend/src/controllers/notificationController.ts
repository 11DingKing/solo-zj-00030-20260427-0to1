import { Context } from 'koa';
import { query } from '../db';

export const getNotifications = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string };
  const { isRead, limit, offset } = ctx.query as {
    isRead?: string;
    limit?: string;
    offset?: string;
  };

  try {
    const conditions: string[] = ['user_id = $1'];
    const values: any[] = [user.userId];
    let paramIndex = 2;

    if (isRead !== undefined) {
      conditions.push(`is_read = $${paramIndex++}`);
      values.push(isRead === 'true');
    }

    const limitNum = parseInt(limit || '20', 10);
    const offsetNum = parseInt(offset || '0', 10);

    const result = await query(
      `SELECT * FROM notifications 
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM notifications WHERE ${conditions.join(' AND ')}`,
      values
    );

    ctx.body = {
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  } catch (error) {
    console.error('Get notifications error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取通知失败' };
  }
};

export const getUnreadCount = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string };

  try {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [user.userId]
    );

    ctx.body = { unreadCount: parseInt(result.rows[0].count, 10) };
  } catch (error) {
    console.error('Get unread count error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取未读数量失败' };
  }
};

export const markAsRead = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string };
  const { notificationId } = ctx.params;

  try {
    const result = await query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, user.userId]
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '通知不存在' };
      return;
    }

    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Mark as read error:', error);
    ctx.status = 500;
    ctx.body = { error: '标记已读失败' };
  }
};

export const markAllAsRead = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string };

  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [user.userId]
    );

    ctx.body = { message: '所有通知已标记为已读' };
  } catch (error) {
    console.error('Mark all as read error:', error);
    ctx.status = 500;
    ctx.body = { error: '标记已读失败' };
  }
};

export const deleteNotification = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string };
  const { notificationId } = ctx.params;

  try {
    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, user.userId]
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '通知不存在' };
      return;
    }

    ctx.body = { message: '通知已删除' };
  } catch (error) {
    console.error('Delete notification error:', error);
    ctx.status = 500;
    ctx.body = { error: '删除通知失败' };
  }
};
