'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AddTickerForm from '@/components/AddTickerForm';
import StockTable from '@/components/StockTable';
import SavedDashboards from '@/components/SavedDashboards';
import { StockTableRow, SavedDashboard } from '@/types';

const WORKING_TICKERS_KEY = 'stock-dashboard-working';

function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [dashboards, setDashboards] = useState<SavedDashboard[]>([]);
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
  const [tickers, setTickers] = useState<string[]>([]);
  const [stockData, setStockData] = useState<Map<string, StockTableRow>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isDashboardsLoading, setIsDashboardsLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load working tickers (unsaved)
  const loadWorkingTickers = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(WORKING_TICKERS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load working tickers:', e);
    }
    return [];
  };

  // Save working tickers
  const saveWorkingTickers = (data: string[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(WORKING_TICKERS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save working tickers:', e);
    }
  };

  // Fetch dashboards on mount (only when authenticated)
  useEffect(() => {
    if (status !== 'authenticated') return;

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
              setIsDashboardsLoading(false);
              return;
            }
          }

          // Load working tickers if no dashboard selected
          const workingTickers = loadWorkingTickers();
          if (workingTickers.length > 0) {
            setTickers(workingTickers);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboards:', error);
      } finally {
        setIsDashboardsLoading(false);
      }
    };

    fetchDashboards();
  }, [searchParams, status]);

  // Save working tickers or update dashboard when tickers change
  useEffect(() => {
    if (status !== 'authenticated') return;

    if (currentDashboardId) {
      // Update the current dashboard
      const saveDashboard = async () => {
        setDashboards((prev) =>
          prev.map((d) =>
            d.id === currentDashboardId
              ? { ...d, tickers, updatedAt: Date.now() }
              : d
          )
        );

        try {
          await fetch(`/api/dashboards/${currentDashboardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers }),
          });
        } catch (error) {
          console.error('Failed to save to API:', error);
        }
      };

      const timeout = setTimeout(saveDashboard, 500);
      return () => clearTimeout(timeout);
    } else {
      // Save as working tickers
      saveWorkingTickers(tickers);
    }
  }, [tickers, currentDashboardId, status]);

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

  const handleSaveDashboard = async () => {
    if (!saveName.trim() || tickers.length === 0) return;

    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const now = Date.now();

    const newDashboard: SavedDashboard = {
      id,
      name: saveName.trim(),
      tickers: [...tickers],
      createdAt: now,
      updatedAt: now,
    };

    setDashboards((prev) => [newDashboard, ...prev]);
    setCurrentDashboardId(newDashboard.id);
    setShowSaveDialog(false);
    setSaveName('');
    saveWorkingTickers([]);

    window.history.pushState({}, '', `?dashboard=${newDashboard.id}`);

    try {
      await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName.trim(), tickers }),
      });
    } catch (error) {
      console.error('Failed to save to API:', error);
    }
  };

  const handleSelectDashboard = (dashboard: SavedDashboard) => {
    setCurrentDashboardId(dashboard.id);
    setTickers(dashboard.tickers);
    setStockData(new Map());
    window.history.pushState({}, '', `?dashboard=${dashboard.id}`);
  };

  const handleDeleteDashboard = async (id: string) => {
    setDashboards((prev) => prev.filter((d) => d.id !== id));

    if (currentDashboardId === id) {
      setCurrentDashboardId(null);
      setTickers([]);
      setStockData(new Map());
      window.history.pushState({}, '', '/');
    }

    try {
      await fetch(`/api/dashboards/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete from API:', error);
    }
  };

  const handleRenameDashboard = async (id: string, newName: string) => {
    setDashboards((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, name: newName, updatedAt: Date.now() } : d
      )
    );

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

  const handleNewDashboard = () => {
    setCurrentDashboardId(null);
    setTickers([]);
    setStockData(new Map());
    saveWorkingTickers([]);
    window.history.pushState({}, '', '/');
  };

  const handleAddTicker = (ticker: string) => {
    if (tickers.includes(ticker)) {
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

  // Show loading state while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (status !== 'authenticated') {
    return null;
  }

  const currentDashboard = dashboards.find((d) => d.id === currentDashboardId);

  const tableData: StockTableRow[] = tickers
    .map((ticker) => stockData.get(ticker))
    .filter((data): data is StockTableRow => data !== undefined);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Stock Performance Dashboard
              </h1>
              <p className="text-gray-600">
                Track and compare stock performance metrics. Click column headers to sort.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{session.user?.email}</span>
              <button
                onClick={() => signOut()}
                className="text-sm px-3 py-1 text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <SavedDashboards
          dashboards={dashboards}
          currentDashboardId={currentDashboardId}
          isLoading={isDashboardsLoading}
          onSelectDashboard={handleSelectDashboard}
          onDeleteDashboard={handleDeleteDashboard}
          onRenameDashboard={handleRenameDashboard}
          onNewDashboard={handleNewDashboard}
        />

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Stock</h2>
          <AddTickerForm onAddTicker={handleAddTicker} disabled={isLoading} />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {currentDashboard ? currentDashboard.name : 'Unsaved Dashboard'}
              </h2>
              {currentDashboard && (
                <p className="text-xs text-gray-400">
                  Last updated: {new Date(currentDashboard.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {tickers.length > 0 && (
                <span className="text-sm text-gray-500">
                  {tickers.length} stock{tickers.length !== 1 ? 's' : ''}
                </span>
              )}
              {!currentDashboardId && tickers.length > 0 && (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Dashboard
                </button>
              )}
            </div>
          </div>
          <StockTable data={tableData} onRemoveTicker={handleRemoveTicker} />
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Save Dashboard</h3>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter dashboard name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveDashboard();
                  if (e.key === 'Escape') {
                    setShowSaveDialog(false);
                    setSaveName('');
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveName('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDashboard}
                  disabled={!saveName.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

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
