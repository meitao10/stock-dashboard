import YahooFinance from 'yahoo-finance2';
import { StockMetrics } from '@/types';
import {
  calculateReturn,
  calculateAnnualizedReturn,
  findClosestPrice,
  getYearEndDate,
} from './calculations';

// Initialize yahoo-finance2 v3
const yahooFinance = new YahooFinance();

interface HistoricalPrice {
  date: Date;
  close: number;
}

interface ChartQuote {
  date: Date;
  close: number | null;
}

interface ChartResult {
  quotes?: ChartQuote[];
}

interface QuoteSummaryResult {
  price?: {
    regularMarketPrice?: number;
    shortName?: string;
    longName?: string;
  };
  summaryDetail?: {
    trailingPE?: number;
    forwardPE?: number;
    priceToSalesTrailing12Months?: number;
  };
  defaultKeyStatistics?: {
    priceToSalesTrailing12Months?: number;
  };
}

export async function fetchStockData(ticker: string): Promise<StockMetrics> {
  const upperTicker = ticker.toUpperCase();

  try {
    // Fetch quote summary for P/E and P/S ratios
    const quoteSummary = (await yahooFinance.quoteSummary(upperTicker, {
      modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData'],
    })) as QuoteSummaryResult;

    // Fetch historical data for return calculations (10+ years)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 11); // 11 years to ensure we have 10 full years

    const historical = (await yahooFinance.chart(upperTicker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    })) as ChartResult;

    // Extract prices from chart data
    const prices: HistoricalPrice[] = [];
    if (historical.quotes) {
      for (const quote of historical.quotes) {
        if (quote.date && quote.close != null) {
          prices.push({
            date: new Date(quote.date),
            close: quote.close,
          });
        }
      }
    }

    const currentPrice = quoteSummary.price?.regularMarketPrice ?? null;
    const name = quoteSummary.price?.shortName ?? quoteSummary.price?.longName ?? upperTicker;

    // Calculate returns
    const currentYear = new Date().getFullYear();
    const prevYearEnd = getYearEndDate(currentYear - 1);

    // YTD Return
    const prevYearEndPrice = findClosestPrice(prices, prevYearEnd);
    const ytdReturn =
      currentPrice && prevYearEndPrice
        ? calculateReturn(prevYearEndPrice, currentPrice)
        : null;

    // 2025 Return (if we have data for it - might be partial or full year)
    const end2024 = getYearEndDate(2024);
    const end2025 = getYearEndDate(2025);
    const price2024End = findClosestPrice(prices, end2024);
    const price2025End = findClosestPrice(prices, end2025);
    const return2025 =
      price2024End && price2025End && price2025End !== price2024End
        ? calculateReturn(price2024End, price2025End)
        : null;

    // 2024 Return
    const end2023 = getYearEndDate(2023);
    const price2023End = findClosestPrice(prices, end2023);
    const return2024 =
      price2023End && price2024End ? calculateReturn(price2023End, price2024End) : null;

    // 2023 Return
    const end2022 = getYearEndDate(2022);
    const price2022End = findClosestPrice(prices, end2022);
    const return2023 =
      price2022End && price2023End ? calculateReturn(price2022End, price2023End) : null;

    // 5-Year Return (annualized)
    const fiveYearsAgo = getYearEndDate(currentYear - 5);
    const fiveYearPrice = findClosestPrice(prices, fiveYearsAgo);
    const return5Year =
      currentPrice && fiveYearPrice
        ? calculateAnnualizedReturn(fiveYearPrice, currentPrice, 5)
        : null;

    // 10-Year Return (annualized)
    const tenYearsAgo = getYearEndDate(currentYear - 10);
    const tenYearPrice = findClosestPrice(prices, tenYearsAgo);
    const return10Year =
      currentPrice && tenYearPrice
        ? calculateAnnualizedReturn(tenYearPrice, currentPrice, 10)
        : null;

    // P/E Ratios
    const peLTM = quoteSummary.summaryDetail?.trailingPE ?? null;
    const peNTM = quoteSummary.summaryDetail?.forwardPE ?? null;

    // P/S Ratios
    const psLTM = quoteSummary.summaryDetail?.priceToSalesTrailing12Months ?? null;
    // Forward P/S is not directly available, but we can try to get it from other sources
    const psNTM = quoteSummary.defaultKeyStatistics?.priceToSalesTrailing12Months ?? null;

    return {
      ticker: upperTicker,
      name,
      currentPrice,
      ytdReturn,
      return2025,
      return2024,
      return2023,
      return5Year,
      return10Year,
      peLTM,
      peNTM,
      psLTM,
      psNTM,
    };
  } catch (error) {
    console.error(`Error fetching data for ${upperTicker}:`, error);
    return {
      ticker: upperTicker,
      name: upperTicker,
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
      error: error instanceof Error ? error.message : 'Failed to fetch stock data',
    };
  }
}
