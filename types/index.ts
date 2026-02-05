import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
  }
}

export interface StockMetrics {
  ticker: string;
  name: string;
  currentPrice: number | null;
  ytdReturn: number | null;
  return2025: number | null;
  return2024: number | null;
  return2023: number | null;
  return5Year: number | null;
  return10Year: number | null;
  peLTM: number | null;
  peNTM: number | null;
  psLTM: number | null;
  psNTM: number | null;
  error?: string;
}

export interface StockTableRow extends StockMetrics {
  isLoading?: boolean;
}

export interface SavedDashboard {
  id: string;
  name: string;
  tickers: string[];
  createdAt: number;
  updatedAt: number;
}
