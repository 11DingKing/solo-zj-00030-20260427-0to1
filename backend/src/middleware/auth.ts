import { Context, Next } from 'koa';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload, UserRole } from '../types';

export const authMiddleware = async (ctx: Context, next: Next) => {
  const authHeader = ctx.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = { error: '未授权访问' };
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    ctx.state.user = payload;
    await next();
  } catch (error) {
    ctx.status = 401;
    ctx.body = { error: 'Token 无效或已过期' };
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as JwtPayload;
    
    if (!user) {
      ctx.status = 401;
      ctx.body = { error: '未授权访问' };
      return;
    }

    if (!roles.includes(user.role)) {
      ctx.status = 403;
      ctx.body = { error: '权限不足' };
      return;
    }

    await next();
  };
};

export const requireTeamLead = async (ctx: Context, next: Next) => {
  const user = ctx.state.user as JwtPayload;
  const teamId = ctx.params.teamId || ctx.request.body.teamId;

  if (!user) {
    ctx.status = 401;
    ctx.body = { error: '未授权访问' };
    return;
  }

  if (user.role === 'super_admin') {
    await next();
    return;
  }

  if (user.role === 'team_lead' && teamId) {
    const { query } = await import('../db');
    const result = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND is_lead = true',
      [teamId, user.userId]
    );
    
    if (result.rows.length > 0) {
      await next();
      return;
    }
  }

  ctx.status = 403;
  ctx.body = { error: '权限不足' };
};
