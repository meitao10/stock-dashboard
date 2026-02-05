'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AddTickerForm from '@/components/AddTickerForm';
import StockTable from '@/components/StockTable';
import SavedDashboards from '@/components/SavedDashboards';
import { StockTableRow, SavedDashboard } from '@/types';

const LOCAL_STORAGE_KEY = 'stock-dashboard-data';

function Dashboard() {
  const searchParams = useSearchParams();
  const [dashboards, setDashboards] = useState<SavedDashboard[]>([]);
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
  const [tickers, setTickers] = useState<string[]>([]);
  const [stockData, setStockData] = useState<Map<string, StockTableRow>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isDashboardsLoading, setIsDashboardsLoading] = useState(true);

  // Load from localStorage
  const loadFromLocalStorage = (): SavedDashboard[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
    return [];
  };

  // Save to localStorage
  const saveToLocalStorage = (data: SavedDashboard[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  };

  // Fetch dashboards on mount
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const response = await fetch('/api/dashboards');
        if (response.ok) {
          const apiData = await response.json();

          // Merge with localStorage data
          const localData = loadFromLocalStorage();
          const mergedMap = new Map<string, SavedDashboard>();

          // Add local data first
          localData.forEach((d) => mergedMap.set(d.id, d));

          // Override with API data (if Redis is configured)
          apiData.forEach((d: SavedDashboard) => mergedMap.set(d.id, d));

          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => b.updatedAt - a.updatedAt
          );

          setDashboards(merged);
          saveToLocalStorage(merged);

          // Check if there's a dashboard ID in the URL
          const dashboardId = searchParams.get('dashboard');
          if (dashboardId) {
            const dashboard = merged.find((d) => d.id === dashboardId);
            if (dashboard) {
              setCurrentDashboardId(dashboard.id);
              setTickers(dashboard.tickers);
            }
          }
        } else {
          // Fallback to localStorage
          const localData = loadFromLocalStorage();
          setDashboards(localData);

          const dashboardId = searchParams.get('dashboard');
          if (dashboardId) {
            const dashboard = localData.find((d) => d.id === dashboardId);
            if (dashboard) {
              setCurrentDashboardId(dashboard.id);
              setTickers(dashboard.tickers);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboards:', error);
        // Fallback to localStorage
        const localData = loadFromLocalStorage();
        setDashboards(localData);
      } finally {
        setIsDashboardsLoading(false);
      }
    };

    fetchDashboards();
  }, [searchParams]);

  // Save dashboards to localStorage whenever they change
  useEffect(() => {
    if (dashboards.length > 0) {
      saveToLocalStorage(dashboards);
    }
  }, [dashboards]);

  // Auto-save tickers to current dashboard when they change
  useEffect(() => {
    if (!currentDashboardId) return;

    const saveDashboard = async () => {
      // Update local state immediately
      setDashboards((prev) => {
        const updated = prev.map((d) =>
          d.id === currentDashboardId
            ? { ...d, tickers, updatedAt: Date.now() }
            : d
        );
        saveToLocalStorage(updated);
        return updated;
      });

      // Try to save to API
      try {
        await fetch(`/api/dashboards/${currentDashboardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers }),
        });
      } catch (error) {
        console.error('Failed to save to API:', error);
        // Already saved locally, so this is fine
      }
    };

    const timeout = setTimeout(saveDashboard, 500);
    return () => clearTimeout(timeout);
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
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const now = Date.now();

    const newDashboard: SavedDashboard = {
      id,
      name: name.trim(),
      tickers: [],
      createdAt: now,
      updatedAt: now,
    };

    // Update local state immediately
    setDashboards((prev) => {
      const updated = [newDashboard, ...prev];
      saveToLocalStorage(updated);
      return updated;
    });
    setCurrentDashboardId(newDashboard.id);
    setTickers([]);
    setStockData(new Map());

    // Update URL
    window.history.pushState({}, '', `?dashboard=${newDashboard.id}`);

    // Try to save to API
    try {
      await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tickers: [] }),
      });
    } catch (error) {
      console.error('Failed to save to API:', error);
      // Already saved locally
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
    // Update local state immediately
    setDashboards((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      saveToLocalStorage(updated);
      return updated;
    });

    if (currentDashboardId === id) {
      setCurrentDashboardId(null);
      setTickers([]);
      setStockData(new Map());
      window.history.pushState({}, '', '/');
    }

    // Try to delete from API
    try {
      await fetch(`/api/dashboards/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete from API:', error);
    }
  };

  const handleRenameDashboard = async (id: string, newName: string) => {
    // Update local state immediately
    setDashboards((prev) => {
      const updated = prev.map((d) =>
        d.id === id ? { ...d, name: newName, updatedAt: Date.now() } : d
      );
      saveToLocalStorage(updated);
      return updated;
    });

    // Try to save to API
    try {
      await fetch(`/api/dashboards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
    } catch (error) {
      console.error('Failed to rename in API:', error);
    }
  };

  const handleAddTicker = (ticker: string) => {
    if (!currentDashboardId) {
      alert('Please create or select a dashboard first.');
      return;
    }
    if (tickers.includes(ticker)) {
      return; // Silently ignore duplicates
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
