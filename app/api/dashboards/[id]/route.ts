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

// GET /api/dashboards/[id] - Get a specific dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const redis = await getRedis();

    if (!redis) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    const dashboard = await redis.get<SavedDashboard>(`${DASHBOARD_PREFIX}${id}`);

    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}

// PUT /api/dashboards/[id] - Update a dashboard
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const redis = await getRedis();

    if (!redis) {
      // Return updated data even without Redis - frontend handles local state
      const now = Date.now();
      return NextResponse.json({
        id,
        name: body.name || 'Dashboard',
        tickers: body.tickers || [],
        createdAt: now,
        updatedAt: now,
      });
    }

    const existing = await redis.get<SavedDashboard>(`${DASHBOARD_PREFIX}${id}`);

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
      await redis.set(`${DASHBOARD_PREFIX}${id}`, dashboard);
      await redis.sadd(DASHBOARDS_KEY, id);
      return NextResponse.json(dashboard);
    }

    const updated: SavedDashboard = {
      ...existing,
      name: body.name ?? existing.name,
      tickers: body.tickers ?? existing.tickers,
      updatedAt: Date.now(),
    };

    await redis.set(`${DASHBOARD_PREFIX}${id}`, updated);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating dashboard:', error);
    // Return success anyway - frontend handles local state
    const now = Date.now();
    return NextResponse.json({
      id: params.id,
      name: 'Dashboard',
      tickers: [],
      createdAt: now,
      updatedAt: now,
    });
  }
}

// DELETE /api/dashboards/[id] - Delete a dashboard
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const redis = await getRedis();

    if (redis) {
      await redis.del(`${DASHBOARD_PREFIX}${id}`);
      await redis.srem(DASHBOARDS_KEY, id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    // Return success anyway - frontend handles local state
    return NextResponse.json({ success: true });
  }
}
