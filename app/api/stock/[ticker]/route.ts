import { NextRequest, NextResponse } from 'next/server';
import { fetchStockData } from '@/lib/yahoo-finance';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker;

  if (!ticker || typeof ticker !== 'string') {
    return NextResponse.json(
      { error: 'Invalid ticker symbol' },
      { status: 400 }
    );
  }

  try {
    const data = await fetchStockData(ticker);
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
