import { countries } from '@/data/countries';

export interface CheckoutValidationError {
  field: string;
  message: string;
}

export interface CheckoutFormData {
  billingInfo?: {
    firstName: string;
    lastName: string;
    company?: string;
    email: string;
    phone?: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    taxId?: string;
  };
  paymentMethod?: {
    type: 'stripe' | 'paypal' | 'invoice';
    stripePaymentMethodId?: string;
    poNumber?: string;
  };
  cartItems?: Array<{
    id: string;
    quantity: number;
    nicheId?: string;
    contentOption: 'self-provided' | 'professional';
  }>;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation - normalize and check digit count
function validatePhoneNumber(phone: string): boolean {
  // Normalize: remove spaces, parentheses, hyphens, and dots
  const normalized = phone.replace(/[\s().-]/g, '');

  // Must start with optional + and contain 7-15 digits
  const phoneRegex = /^\+?\d{7,15}$/;
  return phoneRegex.test(normalized);
}

// Postal code validation regex (basic international)
const POSTAL_CODE_REGEX = /^[A-Z0-9\s-]{3,10}$/i;

// Tax ID validation (basic alphanumeric with dashes)
const TAX_ID_REGEX = /^[A-Z0-9-]{5,20}$/i;

export class CheckoutValidator {
  static validateBillingInfo(data: CheckoutFormData['billingInfo']): CheckoutValidationError[] {
    const errors: CheckoutValidationError[] = [];

    console.log('[VALIDATE BILLING INFO]', {
      hasData: !!data,
      data: data ? {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        street: data.address?.street,
        city: data.address?.city,
        postalCode: data.address?.postalCode,
        country: data.address?.country
      } : null
    });

    if (!data) {
      console.log('[VALIDATE BILLING INFO] No data provided');
      errors.push({ field: 'billingInfo', message: 'Billing information is required' });
      return errors;
    }

    // Required fields validation
    if (!data.firstName?.trim()) {
      errors.push({ field: 'firstName', message: 'First name is required' });
    } else if (data.firstName.trim().length < 2) {
      errors.push({ field: 'firstName', message: 'First name must be at least 2 characters' });
    }

    if (!data.lastName?.trim()) {
      errors.push({ field: 'lastName', message: 'Last name is required' });
    } else if (data.lastName.trim().length < 2) {
      errors.push({ field: 'lastName', message: 'Last name must be at least 2 characters' });
    }

    if (!data.email?.trim()) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!EMAIL_REGEX.test(data.email)) {
      errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    // Address validation
    if (!data.address?.street?.trim()) {
      errors.push({ field: 'street', message: 'Street address is required' });
    }

    if (!data.address?.city?.trim()) {
      errors.push({ field: 'city', message: 'City is required' });
    }

    if (!data.address?.postalCode?.trim()) {
      errors.push({ field: 'postalCode', message: 'Postal code is required' });
    } else {
      // Country-specific postal code validation
      let isValidPostalCode = false;
      const postalCode = data.address.postalCode.trim();
      const country = data.address.country;

      switch (country) {
        case 'SE':
          // Swedish format: XXX XX (e.g., 163 44)
          isValidPostalCode = /^\d{3} ?\d{2}$/.test(postalCode);
          console.log('[POSTAL CODE VALIDATION SE]', {
            postalCode,
            isValid: isValidPostalCode,
            regex: /^\d{3} ?\d{2}$/.test(postalCode)
          });
          break;
        case 'US':
          // US format: XXXXX or XXXXX-XXXX
          isValidPostalCode = /^\d{5}(-\d{4})?$/.test(postalCode);
          break;
        case 'GB':
          // UK format: XX XX or XXXX XXX or similar
          isValidPostalCode = /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/i.test(postalCode);
          break;
        case 'DE':
          // German format: XXXXX
          isValidPostalCode = /^\d{5}$/.test(postalCode);
          break;
        case 'FR':
          // French format: XXXXX
          isValidPostalCode = /^\d{5}$/.test(postalCode);
          break;
        default:
          // Generic validation for other countries
          isValidPostalCode = POSTAL_CODE_REGEX.test(postalCode);
      }

      if (!isValidPostalCode) {
        const countryName = countries.find(c => c.code === country)?.name || country;
        const examples = {
          'SE': '163 44',
          'US': '12345 or 12345-6789',
          'GB': 'SW1A 1AA',
          'DE': '12345',
          'FR': '75001'
        };
        const example = examples[country] || 'your local format';
        errors.push({
          field: 'postalCode',
          message: `Invalid postal code for ${countryName}. Please use format: ${example}`
        });
      }
    }

    if (!data.address?.country?.trim()) {
      errors.push({ field: 'country', message: 'Country is required' });
    }

    // Optional fields validation
    if (data.phone && !validatePhoneNumber(data.phone)) {
      errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
    }

    if (data.taxId && !TAX_ID_REGEX.test(data.taxId)) {
      errors.push({ field: 'taxId', message: 'Please enter a valid tax ID' });
    }

    console.log('[VALIDATE BILLING INFO RESULT]', {
      errors: errors.map(e => ({ field: e.field, message: e.message })),
      errorCount: errors.length
    });

    return errors;
  }

  static validatePaymentMethod(data: CheckoutFormData['paymentMethod']): CheckoutValidationError[] {
    const errors: CheckoutValidationError[] = [];

    if (!data) {
      errors.push({ field: 'paymentMethod', message: 'Payment method is required' });
      return errors;
    }

    if (!data.type) {
      errors.push({ field: 'paymentType', message: 'Payment type is required' });
    }

    // Stripe-specific validation - no specific payment method ID needed for hosted checkout
    if (data.type === 'stripe') {
      // For Stripe hosted checkout, we just need the type to be 'stripe'
      // The actual payment method selection happens on Stripe's side
    }

    // Invoice-specific validation
    if (data.type === 'invoice' && !data.poNumber?.trim()) {
      errors.push({ field: 'poNumber', message: 'PO number is required for invoice payment' });
    }

    return errors;
  }

  static validateCartItems(data: CheckoutFormData['cartItems']): CheckoutValidationError[] {
    const errors: CheckoutValidationError[] = [];

    if (!data || data.length === 0) {
      errors.push({ field: 'cartItems', message: 'Cart cannot be empty' });
      return errors;
    }

    data.forEach((item, index) => {
      if (!item.id) {
        errors.push({ field: `cartItem_${index}_id`, message: 'Invalid cart item' });
      }

      if (!item.quantity || item.quantity < 1) {
        errors.push({ field: `cartItem_${index}_quantity`, message: 'Quantity must be at least 1' });
      }

      if (!item.contentOption) {
        errors.push({ field: `cartItem_${index}_contentOption`, message: 'Please select a content option' });
      }
    });

    return errors;
  }

  static validateStep(
    step: 'cart-review' | 'payment-method' | 'billing-info' | 'content-upload' | 'confirmation',
    data: CheckoutFormData
  ): CheckoutValidationError[] {
    const errors: CheckoutValidationError[] = [];

    console.log('[VALIDATE STEP]', {
      step,
      hasBillingInfo: !!data.billingInfo,
      hasPaymentMethod: !!data.paymentMethod,
      billingInfo: data.billingInfo ? {
        firstName: data.billingInfo.firstName,
        lastName: data.billingInfo.lastName,
        email: data.billingInfo.email,
        address: data.billingInfo.address
      } : null
    });

    switch (step) {
      case 'cart-review':
        errors.push(...this.validateCartItems(data.cartItems));
        break;

      case 'payment-method':
        errors.push(...this.validatePaymentMethod(data.paymentMethod));
        break;

      case 'billing-info':
        errors.push(...this.validateBillingInfo(data.billingInfo));
        break;

      case 'content-upload':
        // Content upload validation will be handled by the file upload component
        break;

      case 'confirmation':
        // Final validation of all data
        errors.push(...this.validateCartItems(data.cartItems));
        errors.push(...this.validateBillingInfo(data.billingInfo));
        errors.push(...this.validatePaymentMethod(data.paymentMethod));
        break;
    }

    return errors;
  }

  static formatErrorMessage(errors: CheckoutValidationError[]): string {
    if (errors.length === 0) return '';

    if (errors.length === 1) {
      return errors[0].message;
    }

    return `${errors.length} validation errors found. Please check the form and try again.`;
  }
}

// Utility functions for checkout calculations
export const calculateItemTotal = (
  price: number,
  quantity: number,
  contentOption: 'self-provided' | 'professional',
  nicheMultiplier: number = 1.0
): number => {
  const basePrice = price * quantity;
  const withNiche = basePrice * nicheMultiplier;
  const withContent = contentOption === 'professional' ? withNiche + 25 : withNiche; // €25 for professional writing
  return Math.round(withContent * 100) / 100; // Round to 2 decimal places
};

export const calculateSubtotal = (
  items: Array<{
    price: number;
    quantity: number;
    contentOption: 'self-provided' | 'professional';
    nicheMultiplier: number;
  }>
): number => {
  return items.reduce((total, item) =>
    total + calculateItemTotal(item.price, item.quantity, item.contentOption, item.nicheMultiplier), 0
  );
};

export const calculateVAT = (subtotal: number, vatRate: number = 0.25): number => {
  return Math.round(subtotal * vatRate * 100) / 100;
};

export const calculateTotal = (subtotal: number, vat: number): number => {
  return Math.round((subtotal + vat) * 100) / 100;
};

// VAT rate configuration by country
export interface VATConfig {
  rate: number;
  label: string;
  requiresVATNumber: boolean;
}

// EU countries list for reverse charge logic
const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
]);

// Default VAT rates by country (simplified - in production this would be more comprehensive)
const VAT_RATES: Record<string, VATConfig> = {
  'SE': { rate: 0.25, label: '25%', requiresVATNumber: true }, // Sweden
  'DE': { rate: 0.19, label: '19%', requiresVATNumber: true }, // Germany
  'FR': { rate: 0.20, label: '20%', requiresVATNumber: true }, // France
  'GB': { rate: 0.20, label: '20%', requiresVATNumber: true }, // United Kingdom
  'US': { rate: 0.00, label: '0%', requiresVATNumber: false }, // United States (no VAT)
  'DEFAULT': { rate: 0.25, label: '25%', requiresVATNumber: true }, // Default/fallback
};

// Get VAT configuration for a country
export const getVATConfig = (countryCode?: string): VATConfig => {
  if (!countryCode) return VAT_RATES.DEFAULT;
  return VAT_RATES[countryCode.toUpperCase()] || VAT_RATES.DEFAULT;
};

// Get VAT rate for a country (convenience function)
export const getVATRate = (countryCode?: string): number => {
  return getVATConfig(countryCode).rate;
};

// Calculate VAT with country-specific rates and reverse charge logic
export const calculateVATForCountry = async (
  subtotal: number, 
  buyerCountryCode?: string, 
  taxId?: string, 
  sellerCountryCode?: string
): Promise<number> => {
  // If no buyer country provided, return 0 VAT (treat as no VAT)
  if (!buyerCountryCode) {
    return 0;
  }

  const vatRate = getVATRate(buyerCountryCode);
  const buyerCountryIsInEU = EU_COUNTRIES.has(buyerCountryCode.toUpperCase());
  const sellerCountryIsInEU = sellerCountryCode ? EU_COUNTRIES.has(sellerCountryCode.toUpperCase()) : false;

  // Check for reverse charge logic for EU VAT IDs
  // Reverse charge applies only when:
  // 1. Seller is in the EU
  // 2. Buyer is in the EU  
  // 3. Their country codes differ (cross-border)
  // 4. VAT ID is valid
  if (taxId && sellerCountryIsInEU && buyerCountryIsInEU && sellerCountryCode !== buyerCountryCode) {
    const vatValidation = await isValidEUVATNumber(taxId, buyerCountryCode);
    if (vatValidation.isValid) {
      // Valid EU VAT number - apply reverse charge (customer pays no VAT, supplier handles VAT)
      return 0;
    }
  }

  return calculateVAT(subtotal, vatRate);
};

// Country-specific VAT number validation patterns
const VAT_PATTERNS: Record<string, { pattern: RegExp; checkDigit?: (vat: string) => boolean }> = {
  'AT': { pattern: /^ATU\d{8}$/ }, // Austria
  'BE': { pattern: /^BE[0-1]\d{9}$/ }, // Belgium
  'BG': { pattern: /^BG\d{9,10}$/ }, // Bulgaria
  'HR': { pattern: /^HR\d{11}$/ }, // Croatia
  'CY': { pattern: /^CY\d{8}[A-Z]$/ }, // Cyprus
  'CZ': { pattern: /^CZ\d{8,10}$/ }, // Czech Republic
  'DK': { pattern: /^DK\d{8}$/ }, // Denmark
  'EE': { pattern: /^EE\d{9}$/ }, // Estonia
  'FI': { pattern: /^FI\d{8}$/ }, // Finland
  'FR': { 
    pattern: /^FR[A-HJ-NP-Z0-9]{2}\d{9}$/,
    checkDigit: (vat: string) => {
      // Require exact length of 13
      if (vat.length !== 13) return false;
      const vatKeyStr = vat.substring(2, 4).toUpperCase();
      const sirenStr = vat.substring(4, 13);
      if (!/^\d{9}$/.test(sirenStr)) return false;

      const siren = parseInt(sirenStr, 10);
      if (!Number.isFinite(siren)) return false;
      // If the key is purely digits, perform numeric check-digit computation
      if (/^\d{2}$/.test(vatKeyStr)) {
        const providedKey = parseInt(vatKeyStr, 10);
        if (!Number.isFinite(providedKey)) return false;
        const computedKey = (12 + 3 * (siren % 97)) % 97;
        return computedKey === providedKey;
      }
      // For alphanumeric keys, accept here and defer to VIES for authoritative validation
      return true;
    }
  },
  'DE': { pattern: /^DE\d{9}$/ }, // Germany
  'GR': { pattern: /^GR\d{9}$/ }, // Greece
  'HU': { pattern: /^HU\d{8}$/ }, // Hungary
  'IE': {
    pattern: /^IE\d[A-Z0-9+*]\d{5}[A-Z]$/,
    checkDigit: (vat: string) => {
      // Irish VAT check digit algorithm
      const digits = vat.substring(2).replace(/\D/g, '');
      if (digits.length !== 7) return false;
      
      let sum = 0;
      const weights = [8, 7, 6, 5, 4, 3, 2];
      for (let i = 0; i < 7; i++) {
        sum += parseInt(digits[i]) * weights[i];
      }
      const remainder = sum % 23;
      const checkDigit = remainder === 0 ? 0 : 23 - remainder;
      return checkDigit === parseInt(digits[6]);
    }
  },
  'IT': { pattern: /^IT\d{11}$/ }, // Italy
  'LV': { pattern: /^LV\d{11}$/ }, // Latvia
  'LT': { pattern: /^LT(\d{9}|\d{12})$/ }, // Lithuania
  'LU': { pattern: /^LU\d{8}$/ }, // Luxembourg
  'MT': { pattern: /^MT\d{8}$/ }, // Malta
  'NL': { 
    pattern: /^NL\d{9}B\d{2}$/,
    checkDigit: (vat: string) => {
      // Dutch VAT check digit algorithm
      const digits = vat.substring(2, 11).replace(/\D/g, '');
      if (digits.length !== 9) return false;
      
      let sum = 0;
      const weights = [9, 8, 7, 6, 5, 4, 3, 2];
      for (let i = 0; i < 8; i++) {
        sum += parseInt(digits[i]) * weights[i];
      }
      const remainder = sum % 11;
      const checkDigit = remainder < 2 ? remainder : 11 - remainder;
      return checkDigit === parseInt(digits[8]);
    }
  },
  'PL': { pattern: /^PL\d{10}$/ }, // Poland
  'PT': { pattern: /^PT\d{9}$/ }, // Portugal
  'RO': { pattern: /^RO\d{2,10}$/ }, // Romania
  'SK': { pattern: /^SK\d{10}$/ }, // Slovakia
  'SI': { pattern: /^SI\d{8}$/ }, // Slovenia
  'ES': { 
    pattern: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
    checkDigit: (vat: string) => {
      // Spanish VAT check digit algorithm
      const digits = vat.substring(2).replace(/\D/g, '');
      if (digits.length !== 8) return false;
      
      let sum = 0;
      const weights = [2, 1, 2, 1, 2, 1, 2];
      for (let i = 0; i < 7; i++) {
        const product = parseInt(digits[i]) * weights[i];
        sum += Math.floor(product / 10) + (product % 10);
      }
      const remainder = sum % 10;
      const checkDigit = remainder === 0 ? 0 : 10 - remainder;
      return checkDigit === parseInt(digits[7]);
    }
  },
  'SE': { pattern: /^SE\d{12}$/ }, // Sweden
};

// VIES API integration for real-time VAT validation
interface VIESResponse {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  requestDate: string;
  name?: string;
  address?: string;
}

// Cache for VIES responses to avoid rate limits
const viesCache = new Map<string, { response: VIESResponse; timestamp: number }>();
const VIES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 1000; // Maximum number of entries to keep in cache

// Helper function to cleanup expired entries from cache
const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, value] of viesCache.entries()) {
    if (now - value.timestamp > VIES_CACHE_TTL) {
      viesCache.delete(key);
    }
  }
};

// Helper function to enforce cache size limit with LRU eviction
const enforceCacheSize = () => {
  if (viesCache.size > MAX_CACHE_SIZE) {
    // Remove oldest entries (LRU - Map maintains insertion order)
    const entriesToRemove = viesCache.size - MAX_CACHE_SIZE;
    const keys = Array.from(viesCache.keys());
    for (let i = 0; i < entriesToRemove; i++) {
      viesCache.delete(keys[i]);
    }
  }
};

// Optional: Set up periodic cleanup timer (runs every hour)
let cleanupTimer: NodeJS.Timeout | null = null;
if (typeof window !== 'undefined') {
  // Only set up timer in browser environment
  cleanupTimer = setInterval(() => {
    cleanupExpiredEntries();
  }, 60 * 60 * 1000); // Every hour
}

const validateVATWithVIES = async (vatNumber: string, countryCode: string): Promise<VIESResponse | null> => {
  const cacheKey = `${countryCode}-${vatNumber}`;
  
  // Clean up expired entries periodically
  cleanupExpiredEntries();
  
  const cached = viesCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < VIES_CACHE_TTL) {
    // Refresh LRU order by re-inserting the entry (delete then set)
    viesCache.delete(cacheKey);
    viesCache.set(cacheKey, cached);
    return cached.response;
  }

  try {
    // Use backend proxy to avoid CORS and mixed-content issues with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/validate-vat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vatNumber, countryCode }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`VAT validation service error: ${response.status}`);
      }

      const result: VIESResponse = await response.json();

      // Cache the result with size enforcement
      viesCache.set(cacheKey, { response: result, timestamp: Date.now() });
      enforceCacheSize();
      
      return result;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn('VIES validation failed:', error);
    return null; // Return null on VIES failure - treat as fail-safe
  }
};

// Enhanced EU VAT number validation with country-specific patterns and VIES integration
const isValidEUVATNumber = async (vatNumber: string, countryCode: string): Promise<{ isValid: boolean; reason?: string; viesResponse?: VIESResponse }> => {
  // Use shared synchronous validation logic first
  const formatValidation = validateVATFormatSync(vatNumber, countryCode);
  if (!formatValidation.isValid) {
    return formatValidation;
  }

  const normalizedVAT = vatNumber.replace(/\s/g, '').toUpperCase();
  const country = countryCode.toUpperCase();

  // VIES validation (server-side verification)
  try {
    // Check if normalizedVAT starts with country code and strip it if present
    let vatNumberForVIES = normalizedVAT;
    if (normalizedVAT.toUpperCase().startsWith(country.toUpperCase())) {
      vatNumberForVIES = normalizedVAT.substring(country.length);
    }
    
    // Guard against very short values and trim whitespace
    vatNumberForVIES = vatNumberForVIES.trim();
    if (vatNumberForVIES.length < 2) {
      return { isValid: false, reason: 'VAT number too short after removing country prefix' };
    }
    
    const viesResponse = await validateVATWithVIES(vatNumberForVIES, country);
    
    if (viesResponse === null) {
      // VIES unavailable - fail-safe approach
      return { isValid: false, reason: 'VAT validation service unavailable - manual review required' };
    }

    if (!viesResponse.valid) {
      return { isValid: false, reason: 'VAT number not registered in VIES database', viesResponse };
    }

    return { isValid: true, viesResponse };
  } catch (error) {
    console.error('VAT validation error:', error);
    return { isValid: false, reason: 'VAT validation failed - manual review required' };
  }
};

// Export the enhanced VAT validation function
export { isValidEUVATNumber };

// Helper function for synchronous VAT format validation (used by both functions)
const validateVATFormatSync = (vatNumber: string, countryCode: string): { isValid: boolean; reason?: string } => {
  const normalizedVAT = vatNumber.replace(/\s/g, '').toUpperCase();
  const country = countryCode.toUpperCase();

  // Check if country is in EU
  if (!VAT_PATTERNS[country]) {
    return { isValid: false, reason: 'Country not in EU VAT system' };
  }

  // Format validation
  const pattern = VAT_PATTERNS[country];
  if (!pattern.pattern.test(normalizedVAT)) {
    return { isValid: false, reason: 'Invalid VAT number format for country' };
  }

  // Check digit validation (if applicable)
  if (pattern.checkDigit && !pattern.checkDigit(normalizedVAT)) {
    return { isValid: false, reason: 'Invalid VAT number check digit' };
  }

  return { isValid: true };
};

// Utility function for client-side VAT format validation (without VIES)
export const validateVATFormat = (vatNumber: string, countryCode: string): { isValid: boolean; reason?: string } => {
  // Delegate to the shared synchronous validation logic
  return validateVATFormatSync(vatNumber, countryCode);
};

// Currency formatting utility
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
