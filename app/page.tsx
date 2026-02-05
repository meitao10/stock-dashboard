'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AddTickerForm from '@/components/AddTickerForm';
import StockTable from '@/components/StockTable';
import SavedDashboards from '@/components/SavedDashboards';
import { StockTableRow, SavedDashboard } from '@/types';

function Dashboard() {
  const searchParams = useSearchParams();
  const [dashboards, setDashboards] = useState<SavedDashboard[]>([]);
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
  const [tickers, setTickers] = useState<string[]>([]);
  const [stockData, setStockData] = useState<Map<string, StockTableRow>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isDashboardsLoading, setIsDashboardsLoading] = useState(true);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch all dashboards on mount
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const response = await fetch('/api/dashboards');
        if (response.ok) {
          const data = await response.json();
          setDashboards(data);

          // Check if there's a dashboard ID in the URL
          const dashboardId = searchParams.get('dashboard');
          if (dashboardId) {
            const dashboard = data.find((d: SavedDashboard) => d.id === dashboardId);
            if (dashboard) {
              setCurrentDashboardId(dashboard.id);
              setTickers(dashboard.tickers);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboards:', error);
      } finally {
        setIsDashboardsLoading(false);
      }
    };

    fetchDashboards();
  }, [searchParams]);

  // Auto-save tickers to current dashboard when they change (debounced)
  useEffect(() => {
    if (!currentDashboardId) return;

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Debounce the save
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/dashboards/${currentDashboardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers }),
        });

        if (response.ok) {
          const updated = await response.json();
          setDashboards((prev) =>
            prev.map((d) => (d.id === currentDashboardId ? updated : d))
          );
        }
      } catch (error) {
        console.error('Failed to save dashboard:', error);
      }
    }, 1000);

    setSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [tickers, currentDashboardId]);

  // Fetch data for a single ticker
  const fetchTickerData = useCallback(async (ticker: string) => {
    setStockData((prev) => {
      const newMap = new Map(prev);
      newMap.set(ticker, {
        ticker,
        name: ticker,
        currentPrice: null,
        ytdReturn: null,
        return2025: null,
        return2024: null,
        return2023: null,
        return5Year: null,
        return10Year: null,
        peLTM: null,
        peNTM: null,
        psLTM: null,
        psNTM: null,
        isLoading: true,
      });
      return newMap;
    });

    try {
      const response = await fetch(`/api/stock/${ticker}`);
      const data = await response.json();

      setStockData((prev) => {
        const newMap = new Map(prev);
        newMap.set(ticker, { ...data, isLoading: false });
        return newMap;
      });
    } catch (error) {
      console.error(`Failed to fetch data for ${ticker}:`, error);
      setStockData((prev) => {
        const newMap = new Map(prev);
        newMap.set(ticker, {
          ticker,
          name: ticker,
          currentPrice: null,
          ytdReturn: null,
          return2025: null,
          return2024: null,
          return2023: null,
          return5Year: null,
          return10Year: null,
          peLTM: null,
          peNTM: null,
          psLTM: null,
          psNTM: null,
          isLoading: false,
          error: 'Failed to fetch data',
        });
        return newMap;
      });
    }
  }, []);

  // Fetch data for all tickers when they change
  useEffect(() => {
    const fetchAll = async () => {
      if (tickers.length === 0) return;

      setIsLoading(true);
      await Promise.all(tickers.map((ticker) => fetchTickerData(ticker)));
      setIsLoading(false);
    };

    fetchAll();
  }, [tickers, fetchTickerData]);

  const handleCreateDashboard = async (name: string) => {
    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tickers: [] }),
      });

      if (response.ok) {
        const newDashboard = await response.json();
        setDashboards((prev) => [newDashboard, ...prev]);
        setCurrentDashboardId(newDashboard.id);
        setTickers([]);
        setStockData(new Map());

        // Update URL
        window.history.pushState({}, '', `?dashboard=${newDashboard.id}`);
      }
    } catch (error) {
      console.error('Failed to create dashboard:', error);
    }
  };

  const handleSelectDashboard = (dashboard: SavedDashboard) => {
    setCurrentDashboardId(dashboard.id);
    setTickers(dashboard.tickers);
    setStockData(new Map());

    // Update URL
    window.history.pushState({}, '', `?dashboard=${dashboard.id}`);
  };

  const handleDeleteDashboard = async (id: string) => {
    try {
      const response = await fetch(`/api/dashboards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDashboards((prev) => prev.filter((d) => d.id !== id));
        if (currentDashboardId === id) {
          setCurrentDashboardId(null);
          setTickers([]);
          setStockData(new Map());
          window.history.pushState({}, '', '/');
        }
      }
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
    }
  };

  const handleRenameDashboard = async (id: string, newName: string) => {
    try {
      const response = await fetch(`/api/dashboards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        const updated = await response.json();
        setDashboards((prev) =>
          prev.map((d) => (d.id === id ? updated : d))
        );
      }
    } catch (error) {
      console.error('Failed to rename dashboard:', error);
    }
  };

  const handleAddTicker = (ticker: string) => {
    if (!currentDashboardId) {
      alert('Please create or select a dashboard first.');
      return;
    }
    if (tickers.includes(ticker)) {
      alert(`${ticker} is already in your list.`);
      return;
    }
    setTickers((prev) => [...prev, ticker]);
  };

  const handleRemoveTicker = (ticker: string) => {
    setTickers((prev) => prev.filter((t) => t !== ticker));
    setStockData((prev) => {
      const newMap = new Map(prev);
      newMap.delete(ticker);
      return newMap;
    });
  };

  const currentDashboard = dashboards.find((d) => d.id === currentDashboardId);

  const tableData: StockTableRow[] = tickers
    .map((ticker) => stockData.get(ticker))
    .filter((data): data is StockTableRow => data !== undefined);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Stock Performance Dashboard
          </h1>
          <p className="text-gray-600">
            Track and compare stock performance metrics. Click column headers to sort.
          </p>
        </header>

        <SavedDashboards
          dashboards={dashboards}
          currentDashboardId={currentDashboardId}
          isLoading={isDashboardsLoading}
          onSelectDashboard={handleSelectDashboard}
          onCreateDashboard={handleCreateDashboard}
          onDeleteDashboard={handleDeleteDashboard}
          onRenameDashboard={handleRenameDashboard}
        />

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Stock</h2>
          <AddTickerForm
            onAddTicker={handleAddTicker}
            disabled={isLoading || !currentDashboardId}
          />
          {!currentDashboardId && (
            <p className="text-sm text-amber-600 mt-2">
              Create or select a dashboard above to add stocks.
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {currentDashboard ? currentDashboard.name : 'Your Stocks'}
              </h2>
              {currentDashboard && (
                <p className="text-xs text-gray-400">
                  Last updated: {new Date(currentDashboard.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
            {tickers.length > 0 && (
              <span className="text-sm text-gray-500">
                {tickers.length} stock{tickers.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <StockTable data={tableData} onRemoveTicker={handleRemoveTicker} />
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>Data provided by Yahoo Finance. Returns are calculated based on historical prices.</p>
          <p className="mt-1">5Y and 10Y returns are annualized.</p>
        </footer>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}
