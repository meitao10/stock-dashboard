import { NextRequest, NextResponse } from 'next/server';
import { redis, DASHBOARDS_KEY, DASHBOARD_PREFIX } from '@/lib/redis';
import { SavedDashboard } from '@/types';

// GET /api/dashboards/[id] - Get a specific dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    const existing = await redis.get<SavedDashboard>(`${DASHBOARD_PREFIX}${id}`);

    if (!existing) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
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
    return NextResponse.json(
      { error: 'Failed to update dashboard' },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboards/[id] - Delete a dashboard
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await redis.del(`${DASHBOARD_PREFIX}${id}`);
    await redis.srem(DASHBOARDS_KEY, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to delete dashboard' },
      { status: 500 }
    );
  }
}
