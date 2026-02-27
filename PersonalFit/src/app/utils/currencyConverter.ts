/**
 * Currency Converter Utility
 * Converts USD to HUF and other currencies.
 * Uses a fixed exchange rate for demo purposes.
 * In production, this would call a live exchange rate API.
 */

// Fixed exchange rate (approximate as of Feb 2026)
const EXCHANGE_RATES: Record<string, number> = {
  HUF: 385.50,  // 1 USD = ~385.50 HUF
  EUR: 0.92,
  GBP: 0.79,
};

/**
 * Convert USD amount to HUF
 */
export function usdToHuf(usdAmount: number): number {
  return Math.round(usdAmount * EXCHANGE_RATES.HUF);
}

/**
 * Format HUF amount with proper formatting
 */
export function formatHuf(amount: number, locale: string = 'hu-HU'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format USD amount
 */
export function formatUsd(amount: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Subscription pricing constants
 */
export const SUBSCRIPTION_PRICE_USD = 5.00;
export const SUBSCRIPTION_PRICE_HUF = usdToHuf(SUBSCRIPTION_PRICE_USD);