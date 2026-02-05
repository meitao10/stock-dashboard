import { NextRequest, NextResponse } from 'next/server';
import { SavedDashboard } from '@/types';

// Check if Redis is configured
const isRedisConfigured = () => {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

// Lazy load Redis to avoid errors when not configured
const getRedis = async () => {
  if (!isRedisConfigured()) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
};

const DASHBOARDS_KEY = 'dashboards';
const DASHBOARD_PREFIX = 'dashboard:';

// GET /api/dashboards - List all dashboards
export async function GET() {
  try {
    const redis = await getRedis();

    if (!redis) {
      // Return empty array if Redis not configured - frontend will use localStorage
      return NextResponse.json([]);
    }

    // Get all dashboard IDs
    const dashboardIds = await redis.smembers(DASHBOARDS_KEY);

    if (!dashboardIds || dashboardIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch all dashboards
    const dashboards: SavedDashboard[] = [];
    for (const id of dashboardIds) {
      const dashboard = await redis.get<SavedDashboard>(`${DASHBOARD_PREFIX}${id}`);
      if (dashboard) {
        dashboards.push(dashboard);
      }
    }

    // Sort by updatedAt descending
    dashboards.sort((a, b) => b.updatedAt - a.updatedAt);

    return NextResponse.json(dashboards);
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    // Return empty array on error - frontend will use localStorage
    return NextResponse.json([]);
  }
}

// POST /api/dashboards - Create a new dashboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, tickers = [] } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Dashboard name is required' },
        { status: 400 }
      );
    }

    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const now = Date.now();

    const dashboard: SavedDashboard = {
      id,
      name: name.trim(),
      tickers,
      createdAt: now,
      updatedAt: now,
    };

    const redis = await getRedis();

    if (redis) {
      // Save dashboard and add to set
      await redis.set(`${DASHBOARD_PREFIX}${id}`, dashboard);
      await redis.sadd(DASHBOARDS_KEY, id);
    }

    return NextResponse.json(dashboard, { status: 201 });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    // Still return the dashboard so frontend can save locally
    const body = await request.json().catch(() => ({}));
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const now = Date.now();

    return NextResponse.json({
      id,
      name: body.name || 'New Dashboard',
      tickers: body.tickers || [],
      createdAt: now,
      updatedAt: now,
    }, { status: 201 });
  }
}
