export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
  euMember: boolean;
}

export const countries: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', euMember: false },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', euMember: false },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', euMember: false },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', euMember: false },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', euMember: true },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', euMember: true },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', euMember: true },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', euMember: true },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', euMember: true },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR', euMember: true },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'EUR', euMember: true },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'SEK', euMember: true },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', currency: 'DKK', euMember: true },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', currency: 'EUR', euMember: true },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', euMember: true },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', currency: 'EUR', euMember: true },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', currency: 'EUR', euMember: true },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', currency: 'EUR', euMember: true },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', currency: 'CZK', euMember: true },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN', euMember: true },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', currency: 'HUF', euMember: true },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', currency: 'EUR', euMember: true },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', currency: 'EUR', euMember: true },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', currency: 'EUR', euMember: true },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', currency: 'EUR', euMember: true },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', currency: 'EUR', euMember: true },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', currency: 'EUR', euMember: true },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', currency: 'EUR', euMember: true },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', currency: 'EUR', euMember: true },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', euMember: false },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', currency: 'NOK', euMember: false },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', euMember: false },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW', euMember: false },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', euMember: false },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', euMember: false },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', euMember: false },
];
