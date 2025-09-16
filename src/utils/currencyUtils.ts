export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  region: string;
  isSupported: boolean;
}

export const CURRENCIES: Currency[] = [
  // Major currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, region: 'North America', isSupported: true },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, region: 'Europe', isSupported: true },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, region: 'Europe', isSupported: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, region: 'Asia', isSupported: false },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2, region: 'Europe', isSupported: true },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2, region: 'North America', isSupported: true },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, region: 'Oceania', isSupported: true },
  
  // Nordic currencies
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalPlaces: 2, region: 'Europe', isSupported: true },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimalPlaces: 2, region: 'Europe', isSupported: true },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimalPlaces: 2, region: 'Europe', isSupported: true },
  { code: 'ISK', name: 'Icelandic Krona', symbol: 'kr', decimalPlaces: 0, region: 'Europe', isSupported: false },
  
  // Other European currencies
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', decimalPlaces: 2, region: 'Europe', isSupported: false },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimalPlaces: 2, region: 'Europe', isSupported: false },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimalPlaces: 2, region: 'Europe', isSupported: false },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimalPlaces: 2, region: 'Europe', isSupported: false },
  
  // Asian currencies
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2, region: 'Asia', isSupported: false },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimalPlaces: 0, region: 'Asia', isSupported: false },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2, region: 'Asia', isSupported: false },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalPlaces: 2, region: 'Asia', isSupported: false },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2, region: 'Asia', isSupported: false },
  
  // Other currencies
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2, region: 'South America', isSupported: false },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimalPlaces: 2, region: 'North America', isSupported: false },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalPlaces: 2, region: 'Africa', isSupported: false },
];

// Default currency for the application
export const DEFAULT_CURRENCY = 'EUR';

// Helper functions
export const getCurrencyByCode = (code: string): Currency | undefined => {
  return CURRENCIES.find(currency => currency.code === code);
};

export const getSupportedCurrencies = (): Currency[] => {
  return CURRENCIES.filter(currency => currency.isSupported);
};

export const getCurrenciesByRegion = (region: string): Currency[] => {
  return CURRENCIES.filter(currency => currency.region === region);
};

export const formatCurrency = (
  amount: number, 
  currencyCode: string = DEFAULT_CURRENCY, 
  locale: string = 'en-US'
): string => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
    }).format(amount);
  } catch (error) {
    // Fallback if Intl.NumberFormat fails
    return `${currency.symbol}${amount.toFixed(currency.decimalPlaces)}`;
  }
};

export const parseCurrencyAmount = (value: string, currencyCode: string = DEFAULT_CURRENCY): number => {
  const currency = getCurrencyByCode(currencyCode);
  const decimalPlaces = currency?.decimalPlaces || 2;
  
  // Remove currency symbols and parse as float
  const cleanValue = value.replace(/[^\d.,-]/g, '');
  const parsed = parseFloat(cleanValue.replace(',', '.'));
  
  if (isNaN(parsed)) {
    return 0;
  }
  
  // Round to appropriate decimal places
  return Math.round(parsed * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
};

// Cache for exchange rates with TTL
interface CachedRate {
  rate: number;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const rateCache = new Map<string, CachedRate>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetch exchange rate from a trusted API
 */
const fetchExchangeRate = async (fromCurrency: string, toCurrency: string): Promise<number> => {
  // Use a free tier currency API (you should replace this with your preferred service)
  const apiKey = import.meta.env.VITE_EXCHANGE_RATE_API_KEY || 'free';
  const url = `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();
    const rate = data.rates[toCurrency];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    // Fallback to hardcoded rates if API fails
    return getFallbackRate(fromCurrency, toCurrency);
  }
};

/**
 * Get fallback rate from hardcoded values (used when API is unavailable)
 */
const getFallbackRate = (fromCurrency: string, toCurrency: string): number => {
  const fallbackRates: Record<string, Record<string, number>> = {
    'USD': { 'EUR': 0.85, 'GBP': 0.73, 'SEK': 8.50, 'NOK': 8.20, 'DKK': 6.30 },
    'EUR': { 'USD': 1.18, 'GBP': 0.86, 'SEK': 10.00, 'NOK': 9.65, 'DKK': 7.44 },
    'SEK': { 'USD': 0.12, 'EUR': 0.10, 'GBP': 0.086, 'NOK': 0.97, 'DKK': 0.74 },
  };

  const rate = fallbackRates[fromCurrency]?.[toCurrency];
  if (!rate) {
    throw new Error(`No conversion rate available for ${fromCurrency} to ${toCurrency}`);
  }

  return rate;
};

/**
 * Get cached rate if available and not expired
 */
const getCachedRate = (cacheKey: string): number | null => {
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.rate;
  }

  // Remove expired cache entry
  if (cached) {
    rateCache.delete(cacheKey);
  }

  return null;
};

/**
 * Cache a rate with TTL
 */
const setCachedRate = (cacheKey: string, rate: number, ttl: number = CACHE_TTL): void => {
  rateCache.set(cacheKey, {
    rate,
    timestamp: Date.now(),
    ttl
  });
};

export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  // Early return for identical currencies
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const cacheKey = `${fromCurrency}_${toCurrency}`;
  const targetCurrency = getCurrencyByCode(toCurrency);
  const decimalPlaces = targetCurrency?.decimalPlaces || 2;

  try {
    // Check cache first
    let rate = getCachedRate(cacheKey);

    if (rate === null) {
      // Fetch fresh rate from API
      rate = await fetchExchangeRate(fromCurrency, toCurrency);

      // Cache the rate
      setCachedRate(cacheKey, rate);
      console.log(`Fetched and cached exchange rate: ${fromCurrency} to ${toCurrency} = ${rate}`);
    } else {
      console.log(`Using cached exchange rate: ${fromCurrency} to ${toCurrency} = ${rate}`);
    }

    const convertedAmount = amount * rate;
    // Use currency-specific decimal places for rounding
    const multiplier = Math.pow(10, decimalPlaces);
    return Math.round(convertedAmount * multiplier) / multiplier;

  } catch (error) {
    console.error(`Currency conversion failed for ${fromCurrency} to ${toCurrency}:`, error);

    // Try to use cached fallback rate first
    const cachedRate = getCachedRate(cacheKey);
    if (cachedRate !== null) {
      console.warn(`Using cached fallback rate for ${fromCurrency} to ${toCurrency}`);
      const convertedAmount = amount * cachedRate;
      const multiplier = Math.pow(10, decimalPlaces);
      return Math.round(convertedAmount * multiplier) / multiplier;
    }

    // If no cached rate, try hardcoded fallback
    try {
      const fallbackRate = getFallbackRate(fromCurrency, toCurrency);
      console.warn(`Using hardcoded fallback rate for ${fromCurrency} to ${toCurrency}`);
      const convertedAmount = amount * fallbackRate;
      const multiplier = Math.pow(10, decimalPlaces);
      return Math.round(convertedAmount * multiplier) / multiplier;
    } catch (fallbackError) {
      // Only throw if no fallback is available
      throw new Error(`Unable to convert ${fromCurrency} to ${toCurrency}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

export const getCurrencyForCountry = (countryCode: string): string => {
  const countryCurrencyMap: Record<string, string> = {
    'US': 'USD',
    'CA': 'CAD',
    'GB': 'GBP',
    'DE': 'EUR',
    'FR': 'EUR',
    'IT': 'EUR',
    'ES': 'EUR',
    'NL': 'EUR',
    'SE': 'SEK',
    'NO': 'NOK',
    'DK': 'DKK',
    'FI': 'EUR',
    'CH': 'CHF',
    'AU': 'AUD',
    'JP': 'JPY',
    'CN': 'CNY',
    'KR': 'KRW',
    'SG': 'SGD',
    'HK': 'HKD',
    'IN': 'INR',
    'BR': 'BRL',
    'MX': 'MXN',
    'ZA': 'ZAR',
  };

  return countryCurrencyMap[countryCode] || DEFAULT_CURRENCY;
};
