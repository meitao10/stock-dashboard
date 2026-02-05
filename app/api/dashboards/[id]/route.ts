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

// GET /api/dashboards/[id] - Get a specific dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = params;
    const redis = await getRedis();

    if (!redis) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const dashboard = await redis.get<SavedDashboard>(getDashboardKey(userId, id));

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}

// PUT /api/dashboards/[id] - Update a dashboard
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = params;
    const body = await request.json();
    const redis = await getRedis();

    if (!redis) {
      const now = Date.now();
      return NextResponse.json({
        id,
        name: body.name || 'Dashboard',
        tickers: body.tickers || [],
        createdAt: now,
        updatedAt: now,
      });
    }

    const existing = await redis.get<SavedDashboard>(getDashboardKey(userId, id));

    if (!existing) {
      // Create new if doesn't exist
      const now = Date.now();
      const dashboard: SavedDashboard = {
        id,
        name: body.name || 'Dashboard',
        tickers: body.tickers || [],
        createdAt: now,
        updatedAt: now,
      };
      await redis.set(getDashboardKey(userId, id), dashboard);
      await redis.sadd(getUserDashboardsKey(userId), id);
      return NextResponse.json(dashboard);
    }

    const updated: SavedDashboard = {
      ...existing,
      name: body.name ?? existing.name,
      tickers: body.tickers ?? existing.tickers,
      updatedAt: Date.now(),
    };

    await redis.set(getDashboardKey(userId, id), updated);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating dashboard:', error);
    return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 });
  }
}

// DELETE /api/dashboards/[id] - Delete a dashboard
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = params;
    const redis = await getRedis();

    if (redis) {
      await redis.del(getDashboardKey(userId, id));
      await redis.srem(getUserDashboardsKey(userId), id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return NextResponse.json({ success: true });
  }
}
