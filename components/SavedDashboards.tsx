'use client';

import { useState } from 'react';
import { SavedDashboard } from '@/types';

interface SavedDashboardsProps {
  dashboards: SavedDashboard[];
  currentDashboardId: string | null;
  isLoading: boolean;
  onSelectDashboard: (dashboard: SavedDashboard) => void;
  onCreateDashboard: (name: string) => void;
  onDeleteDashboard: (id: string) => void;
  onRenameDashboard: (id: string, newName: string) => void;
}

export default function SavedDashboards({
  dashboards,
  currentDashboardId,
  isLoading,
  onSelectDashboard,
  onCreateDashboard,
  onDeleteDashboard,
  onRenameDashboard,
}: SavedDashboardsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateDashboard(newName.trim());
      setNewName('');
      setIsCreating(false);
    }
  };

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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Saved Dashboards
          {isLoading && <span className="ml-2 text-sm text-gray-400">(loading...)</span>}
        </h2>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            + New Dashboard
          </button>
        )}
      </div>

      {isCreating && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Dashboard name..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') {
                setIsCreating(false);
                setNewName('');
              }
            }}
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            Create
          </button>
          <button
            onClick={() => {
              setIsCreating(false);
              setNewName('');
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {dashboards.length === 0 && !isLoading ? (
        <p className="text-gray-500 text-sm">
          No saved dashboards yet. Create one to save your stock lists.
        </p>
      ) : (
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
      )}
    </div>
  );
}
