import Redis from 'ioredis';
import { config } from '../config';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
});

export default redis;

export const getTeamMembersCacheKey = (teamId: string) => `team:${teamId}:members`;
export const getRecentReportsCacheKey = (teamId: string) => `team:${teamId}:recent_reports`;
