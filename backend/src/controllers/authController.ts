import { Context } from 'koa';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export const register = async (ctx: Context) => {
  const { username, email, password, name } = ctx.request.body as {
    username: string;
    email: string;
    password: string;
    name?: string;
  };

  if (!username || !email || !password) {
    ctx.status = 400;
    ctx.body = { error: '用户名、邮箱和密码不能为空' };
    return;
  }

  try {
    const existingUser = await query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      ctx.status = 400;
      ctx.body = { error: '用户名或邮箱已存在' };
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (id, username, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5, 'member')
       RETURNING id, username, email, name, role, created_at`,
      [uuidv4(), username, email, passwordHash, name || username]
    );

    ctx.status = 201;
    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Register error:', error);
    ctx.status = 500;
    ctx.body = { error: '注册失败' };
  }
};

export const login = async (ctx: Context) => {
  const { username, password } = ctx.request.body as {
    username: string;
    password: string;
  };

  if (!username || !password) {
    ctx.status = 400;
    ctx.body = { error: '用户名和密码不能为空' };
    return;
  }

  try {
    const result = await query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      ctx.status = 401;
      ctx.body = { error: '用户名或密码错误' };
      return;
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      ctx.status = 401;
      ctx.body = { error: '用户名或密码错误' };
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, username: user.username },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    ctx.body = {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    ctx.status = 500;
    ctx.body = { error: '登录失败' };
  }
};

export const getCurrentUser = async (ctx: Context) => {
  const user = ctx.state.user as { userId: string };

  try {
    const result = await query(
      `SELECT u.id, u.username, u.email, u.name, u.role, u.avatar, u.created_at,
              json_agg(DISTINCT jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'is_lead', tm.is_lead
              )) FILTER (WHERE t.id IS NOT NULL) as teams
       FROM users u
       LEFT JOIN team_members tm ON u.id = tm.user_id
       LEFT JOIN teams t ON tm.team_id = t.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [user.userId]
    );

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: '用户不存在' };
      return;
    }

    ctx.body = result.rows[0];
  } catch (error) {
    console.error('Get current user error:', error);
    ctx.status = 500;
    ctx.body = { error: '获取用户信息失败' };
  }
};
