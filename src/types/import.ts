export interface CSVRowData {
  domain?: string;
  price?: string | number;
  currency?: string;
  country?: string;
  language?: string;
  category?: string;
  niches?: string | string[];
  guidelines?: string;
  lead_time_days?: string | number;
  accepts_no_license?: string | boolean;
  accepts_no_license_status?: string;
  sponsor_tag_status?: string;
  sponsor_tag_type?: string;
  ahrefs_dr?: string | number;
  moz_da?: string | number;
  semrush_as?: string | number;
  spam_score?: string | number;
  organic_traffic?: string | number;
  referring_domains?: string | number;
  is_active?: string | boolean;
  sale_price?: string | number;
  sale_note?: string;
  errors?: string[];
}

export interface ImportResult {
  row: number;
  domain: string;
  success: boolean;
  error?: string;
  skipped?: boolean;
  outletId?: string;
}


