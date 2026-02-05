import { NextRequest, NextResponse } from 'next/server';
import { redis, DASHBOARDS_KEY, DASHBOARD_PREFIX } from '@/lib/redis';
import { SavedDashboard } from '@/types';

// GET /api/dashboards - List all dashboards
export async function GET() {
  try {
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
    return NextResponse.json(
      { error: 'Failed to fetch dashboards' },
      { status: 500 }
    );
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

    // Save dashboard and add to set
    await redis.set(`${DASHBOARD_PREFIX}${id}`, dashboard);
    await redis.sadd(DASHBOARDS_KEY, id);

    return NextResponse.json(dashboard, { status: 201 });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard' },
      { status: 500 }
    );
  }
}
