export function calculateReturn(startPrice: number, endPrice: number): number {
  return ((endPrice - startPrice) / startPrice) * 100;
}

export function calculateAnnualizedReturn(startPrice: number, endPrice: number, years: number): number {
  if (years <= 0 || startPrice <= 0) return 0;
  const totalReturn = endPrice / startPrice;
  const annualized = Math.pow(totalReturn, 1 / years) - 1;
  return annualized * 100;
}

export function findClosestPrice(
  prices: { date: Date; close: number }[],
  targetDate: Date
): number | null {
  if (!prices || prices.length === 0) return null;

  // Sort by date descending
  const sorted = [...prices].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Find closest price on or before target date
  for (const price of sorted) {
    if (price.date <= targetDate) {
      return price.close;
    }
  }

  // If no price before target, return earliest available
  return sorted[sorted.length - 1]?.close ?? null;
}

export function getYearEndDate(year: number): Date {
  return new Date(year, 11, 31); // December 31
}

export function getYearStartDate(year: number): Date {
  return new Date(year, 0, 1); // January 1
}
