import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SavedDashboard } from '@/types';
import '@/types'; // Import NextAuth type extensions

// Check if Redis is configured
const isRedisConfigured = () => {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

// Lazy load Redis
const getRedis = async () => {
  if (!isRedisConfigured()) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
};

const getUserDashboardsKey = (userId: string) => `user:${userId}:dashboards`;
const getDashboardKey = (userId: string, dashboardId: string) => `user:${userId}:dashboard:${dashboardId}`;

// GET /api/dashboards - List all dashboards for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const redis = await getRedis();

    if (!redis) {
      return NextResponse.json([]);
    }

    const dashboardIds = await redis.smembers(getUserDashboardsKey(userId));

    if (!dashboardIds || dashboardIds.length === 0) {
      return NextResponse.json([]);
    }

    const dashboards: SavedDashboard[] = [];
    for (const id of dashboardIds) {
      const dashboard = await redis.get<SavedDashboard>(getDashboardKey(userId, id as string));
      if (dashboard) {
        dashboards.push(dashboard);
      }
    }

    dashboards.sort((a, b) => b.updatedAt - a.updatedAt);

    return NextResponse.json(dashboards);
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json([]);
  }
}

// POST /api/dashboards - Create a new dashboard
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
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
      await redis.set(getDashboardKey(userId, id), dashboard);
      await redis.sadd(getUserDashboardsKey(userId), id);
    }

    return NextResponse.json(dashboard, { status: 201 });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard' },
      { status: 500 }
    );
  }
}
