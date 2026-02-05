import { Redis } from '@upstash/redis';

// Initialize Redis client - will use environment variables
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Keys
export const DASHBOARDS_KEY = 'dashboards';
export const DASHBOARD_PREFIX = 'dashboard:';
