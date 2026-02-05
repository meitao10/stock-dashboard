'use client';

import { useState, FormEvent } from 'react';

interface AddTickerFormProps {
  onAddTicker: (ticker: string) => void;
  disabled?: boolean;
}

export default function AddTickerForm({ onAddTicker, disabled }: AddTickerFormProps) {
  const [ticker, setTicker] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Split by comma or whitespace, filter empty strings
    const tickers = ticker
      .toUpperCase()
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    tickers.forEach((t) => onAddTicker(t));
    setTicker('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="Enter tickers (e.g., AAPL, MSFT, GOOGL)"
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !ticker.trim()}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Add
      </button>
    </form>
  );
}
