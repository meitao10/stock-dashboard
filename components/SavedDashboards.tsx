'use client';

import { useState } from 'react';
import { SavedDashboard } from '@/types';

interface SavedDashboardsProps {
  dashboards: SavedDashboard[];
  currentDashboardId: string | null;
  isLoading: boolean;
  onSelectDashboard: (dashboard: SavedDashboard) => void;
  onDeleteDashboard: (id: string) => void;
  onRenameDashboard: (id: string, newName: string) => void;
  onNewDashboard: () => void;
}

export default function SavedDashboards({
  dashboards,
  currentDashboardId,
  isLoading,
  onSelectDashboard,
  onDeleteDashboard,
  onRenameDashboard,
  onNewDashboard,
}: SavedDashboardsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleRename = (id: string) => {
    if (editName.trim()) {
      onRenameDashboard(id, editName.trim());
      setEditingId(null);
      setEditName('');
    }
  };

  const startEditing = (dashboard: SavedDashboard) => {
    setEditingId(dashboard.id);
    setEditName(dashboard.name);
  };

  const copyShareLink = (id: string) => {
    const url = `${window.location.origin}?dashboard=${id}`;
    navigator.clipboard.writeText(url);
    alert('Share link copied to clipboard!');
  };

  if (dashboards.length === 0 && !isLoading) {
    return null; // Don't show the section if no saved dashboards
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Saved Dashboards
          {isLoading && <span className="ml-2 text-sm text-gray-400">(loading...)</span>}
        </h2>
        {currentDashboardId && (
          <button
            onClick={onNewDashboard}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            + New
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {dashboards.map((dashboard) => (
          <div
            key={dashboard.id}
            className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              currentDashboardId === dashboard.id
                ? 'bg-blue-50 border-blue-300'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {editingId === dashboard.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm w-32 text-gray-900"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(dashboard.id);
                  if (e.key === 'Escape') {
                    setEditingId(null);
                    setEditName('');
                  }
                }}
                onBlur={() => handleRename(dashboard.id)}
              />
            ) : (
              <>
                <button
                  onClick={() => onSelectDashboard(dashboard)}
                  className="text-sm font-medium text-gray-700"
                >
                  {dashboard.name}
                </button>
                <span className="text-xs text-gray-400">
                  ({dashboard.tickers.length})
                </span>
                <div className="hidden group-hover:flex items-center gap-1 ml-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyShareLink(dashboard.id);
                    }}
                    className="text-gray-400 hover:text-blue-600 text-xs"
                    title="Copy share link"
                  >
                    Share
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(dashboard);
                    }}
                    className="text-gray-400 hover:text-blue-600 text-xs"
                    title="Rename"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${dashboard.name}"?`)) {
                        onDeleteDashboard(dashboard.id);
                      }
                    }}
                    className="text-gray-400 hover:text-red-600 text-xs"
                    title="Delete"
                  >
                    Del
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
