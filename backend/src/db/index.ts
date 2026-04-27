import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
});

export const query = async (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
