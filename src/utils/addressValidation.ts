import { countries, Country } from '@/data/countries';

export interface AddressValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: {
    street?: string;
    city?: string;
    postalCode?: string;
  };
}

export interface AddressFormat {
  country: string;
  requiredFields: string[];
  optionalFields: string[];
  postalCodePattern: RegExp;
  postalCodeLabel: string;
  stateRequired: boolean;
  stateLabel?: string;
  stateOptions?: string[];
}

// Address formats for different countries
const ADDRESS_FORMATS: Record<string, AddressFormat> = {
  'US': {
    country: 'United States',
    requiredFields: ['street', 'city', 'state', 'postalCode'],
    optionalFields: ['apartment', 'company'],
    postalCodePattern: /^\d{5}(-\d{4})?$/,
    postalCodeLabel: 'ZIP Code',
    stateRequired: true,
    stateLabel: 'State',
    stateOptions: [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ]
  },
  'CA': {
    country: 'Canada',
    requiredFields: ['street', 'city', 'state', 'postalCode'],
    optionalFields: ['apartment', 'company'],
    postalCodePattern: /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/,
    postalCodeLabel: 'Postal Code',
    stateRequired: true,
    stateLabel: 'Province',
    stateOptions: [
      'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
    ]
  },
  'GB': {
    country: 'United Kingdom',
    requiredFields: ['street', 'city', 'postalCode'],
    optionalFields: ['apartment', 'company', 'county'],
    postalCodePattern: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/i,
    postalCodeLabel: 'Postcode',
    stateRequired: false
  },
  'DE': {
    country: 'Germany',
    requiredFields: ['street', 'city', 'postalCode'],
    optionalFields: ['apartment', 'company'],
    postalCodePattern: /^\d{5}$/,
    postalCodeLabel: 'PLZ',
    stateRequired: false
  },
  'FR': {
    country: 'France',
    requiredFields: ['street', 'city', 'postalCode'],
    optionalFields: ['apartment', 'company'],
    postalCodePattern: /^\d{5}$/,
    postalCodeLabel: 'Code Postal',
    stateRequired: false
  },
  'SE': {
    country: 'Sweden',
    requiredFields: ['street', 'city', 'postalCode'],
    optionalFields: ['apartment', 'company'],
    postalCodePattern: /^\d{3} ?\d{2}$/, // Allow optional space
    postalCodeLabel: 'Postnummer',
    stateRequired: false
  },
  'NO': {
    country: 'Norway',
    requiredFields: ['street', 'city', 'postalCode'],
    optionalFields: ['apartment', 'company'],
    postalCodePattern: /^\d{4}$/,
    postalCodeLabel: 'Postnummer',
    stateRequired: false
  },
  'DK': {
    country: 'Denmark',
    requiredFields: ['street', 'city', 'postalCode'],
    optionalFields: ['apartment', 'company'],
    postalCodePattern: /^\d{4}$/,
    postalCodeLabel: 'Postnummer',
    stateRequired: false
  },
  'FI': {
    country: 'Finland',
    requiredFields: ['street', 'city', 'postalCode'],
    optionalFields: ['apartment', 'company'],
    postalCodePattern: /^\d{5}$/,
    postalCodeLabel: 'Postinumero',
    stateRequired: false
  },
  'CH': {
    country: 'Switzerland',
    requiredFields: ['street', 'city', 'postalCode'],
    optionalFields: ['apartment', 'company'],
    postalCodePattern: /^\d{4}$/,
    postalCodeLabel: 'PLZ',
    stateRequired: false
  },
  'AU': {
    country: 'Australia',
    requiredFields: ['street', 'city', 'state', 'postalCode'],
    optionalFields: ['apartment', 'company'],
    postalCodePattern: /^\d{4}$/,
    postalCodeLabel: 'Postcode',
    stateRequired: true,
    stateLabel: 'State',
    stateOptions: [
      'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'
    ]
  }
};

// Default format for countries not specifically defined
const DEFAULT_FORMAT: AddressFormat = {
  country: 'International',
  requiredFields: ['street', 'city', 'postalCode'],
  optionalFields: ['apartment', 'company', 'state'],
  postalCodePattern: /^.{3,10}$/,
  postalCodeLabel: 'Postal Code',
  stateRequired: false
};

export const getAddressFormat = (countryCode: string): AddressFormat => {
  return ADDRESS_FORMATS[countryCode] || DEFAULT_FORMAT;
};

export const validateAddress = (
  address: {
    street: string;
    city: string;
    postalCode: string;
    state?: string;
    country: string;
  }
): AddressValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: Record<string, string> = {};

  const format = getAddressFormat(address.country);
  const country = countries.find(c => c.code === address.country);

  // Debug logging - temporarily disabled for compatibility
  if (false) {
    console.log('[ADDRESS VALIDATION]', {
      input: address,
      format: {
        country: format.country,
        postalCodePattern: format.postalCodePattern.toString(),
        postalCodeLabel: format.postalCodeLabel
      }
    });
  }

  // Validate required fields
  if (!address.street?.trim()) {
    errors.push('Street address is required');
  } else if (address.street.trim().length < 5) {
    errors.push('Street address is too short');
  }

  if (!address.city?.trim()) {
    errors.push('City is required');
  } else if (address.city.trim().length < 2) {
    errors.push('City name is too short');
  }

  if (!address.postalCode?.trim()) {
    errors.push(`${format.postalCodeLabel} is required`);
  } else {
    const postalCode = address.postalCode.trim();
    const pattern = format.postalCodePattern;
    const isValid = pattern.test(postalCode);

    // Debug logging - temporarily disabled for compatibility
    if (false) {
      console.log('[POSTAL CODE VALIDATION]', {
        postalCode,
        pattern: pattern.toString(),
        isValid,
        expectedFormat: format.country === 'Sweden' ? 'XXX XX (e.g. 163 44)' : pattern.toString()
      });
    }

    if (!isValid) {
      errors.push(`${format.postalCodeLabel} format is invalid for ${format.country}. Expected format: ${format.country === 'Sweden' ? 'XXX XX (e.g. 163 44)' : pattern.toString()}`);
    }
  }

  if (format.stateRequired && !address.state?.trim()) {
    errors.push(`${format.stateLabel || 'State/Province'} is required`);
  }

  // Validate state/province if required
  if (format.stateRequired && address.state && format.stateOptions) {
    if (!format.stateOptions.includes(address.state.toUpperCase())) {
      errors.push(`Invalid ${format.stateLabel || 'State/Province'}. Valid options: ${format.stateOptions.join(', ')}`);
    }
  }

  // Add country-specific suggestions
  if (address.country === 'US' && address.postalCode && !address.postalCode.includes('-')) {
    const zip = address.postalCode.replace(/\D/g, '');
    if (zip.length === 9) {
      // Format as ZIP+4 when we have a complete 9-digit postal code
      suggestions.postalCode = `${zip.slice(0, 5)}-${zip.slice(5, 9)}`;
    } else if (zip.length === 5) {
      // Leave 5-digit ZIP codes as-is (don't add fake ZIP+4)
      suggestions.postalCode = zip;
    }
  }

  // Add warnings for potential issues
  if (address.street && address.street.length > 100) {
    warnings.push('Street address is very long, please verify it\'s correct');
  }

  if (address.city && address.city.length > 50) {
    warnings.push('City name is very long, please verify it\'s correct');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions: Object.keys(suggestions).length > 0 ? suggestions : undefined
  };
};

export const formatAddressForDisplay = (
  address: {
    street: string;
    city: string;
    postalCode: string;
    state?: string;
    country: string;
  }
): string => {
  const country = countries.find(c => c.code === address.country);
  const countryName = country?.name || address.country;
  
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    countryName
  ].filter(Boolean);
  
  return parts.join(', ');
};

export const formatAddressForShipping = (
  address: {
    street: string;
    city: string;
    postalCode: string;
    state?: string;
    country: string;
  }
): string => {
  const format = getAddressFormat(address.country);
  const country = countries.find(c => c.code === address.country);
  const countryName = country?.name || address.country;
  
  const lines = [
    address.street,
    address.city + (address.state ? `, ${address.state}` : ''),
    `${address.postalCode} ${countryName}`
  ].filter(Boolean);
  
  return lines.join('\n');
};

export const getAddressSuggestions = (
  partialAddress: string,
  countryCode: string
): Promise<Array<{
  street: string;
  city: string;
  postalCode: string;
  state?: string;
  formatted: string;
}>> => {
  // In a real application, this would call an address validation API like Google Places or SmartyStreets
  // For now, we'll return empty array
  return Promise.resolve([]);
};

export const normalizeAddress = (
  address: {
    street: string;
    city: string;
    postalCode: string;
    state?: string;
    country: string;
  }
): {
  street: string;
  city: string;
  postalCode: string;
  state?: string;
  country: string;
} => {
  return {
    street: address.street?.trim() || '',
    city: address.city?.trim() || '',
    postalCode: address.postalCode?.trim() || '',
    state: address.state?.trim() || undefined,
    country: address.country?.trim() || '',
  };
};
