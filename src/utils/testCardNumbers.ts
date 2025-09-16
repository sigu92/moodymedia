/**
 * Test Card Number Handling for Stripe Development
 * 
 * Provides comprehensive test card numbers, validation,
 * and simulation for different payment scenarios.
 */

export interface TestCard {
  number: string;
  brand: string;
  country?: string;
  description: string;
  expectedOutcome: 'success' | 'failure' | 'authentication_required';
  errorCode?: string;
  cvc?: string;
  expiry?: {
    month: number;
    year: number;
  };
  category: 'basic' | 'international' | 'declined' | 'authentication' | 'error_testing';
}

export interface TestCardSet {
  [key: string]: TestCard[];
}

/**
 * Comprehensive test card numbers organized by category
 */
export const TEST_CARD_NUMBERS: TestCardSet = {
  basic: [
    {
      number: '4242424242424242',
      brand: 'visa',
      description: 'Visa - Always succeeds',
      expectedOutcome: 'success',
      category: 'basic'
    },
    {
      number: '4000056655665556',
      brand: 'visa',
      description: 'Visa Debit - Always succeeds',
      expectedOutcome: 'success',
      category: 'basic'
    },
    {
      number: '5555555555554444',
      brand: 'mastercard',
      description: 'Mastercard - Always succeeds',
      expectedOutcome: 'success',
      category: 'basic'
    },
    {
      number: '2223003122003222',
      brand: 'mastercard',
      description: 'Mastercard 2-series - Always succeeds',
      expectedOutcome: 'success',
      category: 'basic'
    },
    {
      number: '5200828282828210',
      brand: 'mastercard',
      description: 'Mastercard Debit - Always succeeds',
      expectedOutcome: 'success',
      category: 'basic'
    },
    {
      number: '378282246310005',
      brand: 'amex',
      description: 'American Express - Always succeeds',
      expectedOutcome: 'success',
      category: 'basic'
    },
    {
      number: '371449635398431',
      brand: 'amex',
      description: 'American Express - Always succeeds',
      expectedOutcome: 'success',
      category: 'basic'
    },
    {
      number: '6011111111111117',
      brand: 'discover',
      description: 'Discover - Always succeeds',
      expectedOutcome: 'success',
      category: 'basic'
    },
    {
      number: '3056930009020004',
      brand: 'diners',
      description: 'Diners Club - Always succeeds',
      expectedOutcome: 'success',
      category: 'basic'
    },
    {
      number: '30569309025904',
      brand: 'diners',
      description: 'Diners Club (14-digit) - Always succeeds',
      expectedOutcome: 'success',
      category: 'basic'
    }
  ],

  international: [
    {
      number: '4000000760000002',
      brand: 'visa',
      country: 'Brazil',
      description: 'Visa (Brazil) - Always succeeds',
      expectedOutcome: 'success',
      category: 'international'
    },
    {
      number: '4000001240000000',
      brand: 'visa',
      country: 'Canada',
      description: 'Visa (Canada) - Always succeeds',
      expectedOutcome: 'success',
      category: 'international'
    },
    {
      number: '4000004840008001',
      brand: 'visa',
      country: 'Mexico',
      description: 'Visa (Mexico) - Always succeeds',
      expectedOutcome: 'success',
      category: 'international'
    },
    {
      number: '4000058260000005',
      brand: 'visa',
      country: 'United Kingdom',
      description: 'Visa (UK) - Always succeeds',
      expectedOutcome: 'success',
      category: 'international'
    },
    {
      number: '4000002760003184',
      brand: 'visa',
      country: 'Germany',
      description: 'Visa (Germany) - Always succeeds',
      expectedOutcome: 'success',
      category: 'international'
    },
    {
      number: '4000003920000003',
      brand: 'visa',
      country: 'France',
      description: 'Visa (France) - Always succeeds',
      expectedOutcome: 'success',
      category: 'international'
    }
  ],

  declined: [
    {
      number: '4000000000000002',
      brand: 'visa',
      description: 'Visa - Always declined (generic_decline)',
      expectedOutcome: 'failure',
      errorCode: 'card_declined',
      category: 'declined'
    },
    {
      number: '4000000000009995',
      brand: 'visa',
      description: 'Visa - Always declined (insufficient_funds)',
      expectedOutcome: 'failure',
      errorCode: 'insufficient_funds',
      category: 'declined'
    },
    {
      number: '4000000000009987',
      brand: 'visa',
      description: 'Visa - Always declined (lost_card)',
      expectedOutcome: 'failure',
      errorCode: 'lost_card',
      category: 'declined'
    },
    {
      number: '4000000000009979',
      brand: 'visa',
      description: 'Visa - Always declined (stolen_card)',
      expectedOutcome: 'failure',
      errorCode: 'stolen_card',
      category: 'declined'
    },
    {
      number: '4000000000000069',
      brand: 'visa',
      description: 'Visa - Always declined (expired_card)',
      expectedOutcome: 'failure',
      errorCode: 'expired_card',
      category: 'declined'
    },
    {
      number: '4000000000000127',
      brand: 'visa',
      description: 'Visa - Always declined (incorrect_cvc)',
      expectedOutcome: 'failure',
      errorCode: 'incorrect_cvc',
      category: 'declined'
    },
    {
      number: '4000000000000119',
      brand: 'visa',
      description: 'Visa - Always declined (processing_error)',
      expectedOutcome: 'failure',
      errorCode: 'processing_error',
      category: 'declined'
    }
  ],

  authentication: [
    {
      number: '4000002500003155',
      brand: 'visa',
      description: 'Visa - Requires authentication (3D Secure)',
      expectedOutcome: 'authentication_required',
      category: 'authentication'
    },
    {
      number: '4000002760003184',
      brand: 'visa',
      description: 'Visa - Authentication may be required',
      expectedOutcome: 'authentication_required',
      category: 'authentication'
    },
    {
      number: '4000003800000446',
      brand: 'visa',
      description: 'Visa - Authentication always required',
      expectedOutcome: 'authentication_required',
      category: 'authentication'
    }
  ],

  error_testing: [
    {
      number: '4000000000000101',
      brand: 'visa',
      description: 'Visa - Always fails with approve_with_id',
      expectedOutcome: 'failure',
      errorCode: 'approve_with_id',
      category: 'error_testing'
    },
    {
      number: '4000000000000341',
      brand: 'visa',
      description: 'Visa - Always fails with issuer_not_available',
      expectedOutcome: 'failure',
      errorCode: 'issuer_not_available',
      category: 'error_testing'
    },
    {
      number: '4000000000000259',
      brand: 'visa',
      description: 'Visa - Always fails with pickup_card',
      expectedOutcome: 'failure',
      errorCode: 'pickup_card',
      category: 'error_testing'
    },
    {
      number: '4000000000000267',
      brand: 'visa',
      description: 'Visa - Always fails with reenter_transaction',
      expectedOutcome: 'failure',
      errorCode: 'reenter_transaction',
      category: 'error_testing'
    }
  ]
};

/**
 * Gets all test cards as a flat array
 */
export const getAllTestCards = (): TestCard[] => {
  return Object.values(TEST_CARD_NUMBERS).flat();
};

/**
 * Gets test cards by category
 */
export const getTestCardsByCategory = (category: string): TestCard[] => {
  return TEST_CARD_NUMBERS[category] || [];
};

/**
 * Validates if a card number is a Stripe test card
 */
export const isTestCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  return getAllTestCards().some(card => card.number === cleanNumber);
};

/**
 * Gets test card information by number
 */
export const getTestCardInfo = (cardNumber: string): TestCard | null => {
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  return getAllTestCards().find(card => card.number === cleanNumber) || null;
};

/**
 * Formats card number with spaces for display
 */
export const formatCardNumber = (cardNumber: string): string => {
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  
  // American Express: 4-6-5 format
  if (cleanNumber.length === 15) {
    return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
  }
  
  // Diners Club 14-digit: 4-6-4 format
  if (cleanNumber.length === 14) {
    return cleanNumber.replace(/(\d{4})(\d{6})(\d{4})/, '$1 $2 $3');
  }
  
  // Standard cards: 4-4-4-4 format
  return cleanNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
};

/**
 * Gets the expected CVC length for a card brand
 */
export const getCVCLength = (brand: string): number => {
  return brand === 'amex' ? 4 : 3;
};

/**
 * Generates a valid test expiry date
 */
export const getValidTestExpiry = (): { month: number; year: number } => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Generate a date 1-3 years in the future
  const futureYears = Math.floor(Math.random() * 3) + 1;
  const futureMonth = Math.floor(Math.random() * 12) + 1;
  
  return {
    month: futureMonth,
    year: currentYear + futureYears
  };
};

/**
 * Generates a valid CVC for testing
 */
export const getValidTestCVC = (brand: string = 'visa'): string => {
  const length = getCVCLength(brand);
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
};

/**
 * Creates a complete test card object with all required fields
 */
export const createCompleteTestCard = (baseCard: TestCard): TestCard & {
  cvc: string;
  expiry: { month: number; year: number };
} => {
  return {
    ...baseCard,
    cvc: baseCard.cvc || getValidTestCVC(baseCard.brand),
    expiry: baseCard.expiry || getValidTestExpiry()
  };
};

/**
 * Gets a random test card from a specific category
 */
export const getRandomTestCard = (category?: string): TestCard => {
  let cards: TestCard[];
  
  if (category && TEST_CARD_NUMBERS[category]) {
    cards = TEST_CARD_NUMBERS[category];
  } else {
    cards = getAllTestCards();
  }
  
  return cards[Math.floor(Math.random() * cards.length)];
};

/**
 * Validates card number format (Luhn algorithm)
 */
export const validateCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  
  if (!/^\d+$/.test(cleanNumber)) {
    return false;
  }
  
  let sum = 0;
  let shouldDouble = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);
    
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  
  return sum % 10 === 0;
};

/**
 * Gets card brand from number
 */
export const getCardBrand = (cardNumber: string): string => {
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  
  if (/^4/.test(cleanNumber)) return 'visa';
  if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return 'mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'amex';
  if (/^6011|^65|^644|^645|^646|^647|^648|^649/.test(cleanNumber)) return 'discover';
  if (/^30[0-5]|^36|^38/.test(cleanNumber)) return 'diners';
  if (/^35/.test(cleanNumber)) return 'jcb';
  
  return 'unknown';
};

/**
 * Test card utilities interface
 */
export const testCards = {
  // Card retrieval
  getAll: getAllTestCards,
  getByCategory: getTestCardsByCategory,
  getRandom: getRandomTestCard,
  getInfo: getTestCardInfo,

  // Validation
  isTestCard: isTestCardNumber,
  validateNumber: validateCardNumber,
  getBrand: getCardBrand,

  // Formatting
  formatNumber: formatCardNumber,
  getCVCLength,

  // Generation
  getValidExpiry: getValidTestExpiry,
  getValidCVC: getValidTestCVC,
  createComplete: createCompleteTestCard,

  // Constants
  categories: Object.keys(TEST_CARD_NUMBERS),
  numbers: TEST_CARD_NUMBERS
};

// Make test cards available globally in development
if (import.meta.env.DEV) {
  (window as any).testCards = testCards;
  console.log('🔧 Test cards available globally as: window.testCards');
  console.log('📚 Usage examples:');
  console.log('  - testCards.getByCategory("basic") - Get basic test cards');
  console.log('  - testCards.getRandom("declined") - Get random decline card');
  console.log('  - testCards.isTestCard("4242424242424242") - Check if test card');
  console.log('  - testCards.formatNumber("4242424242424242") - Format card number');
}
