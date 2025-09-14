export interface User {
  id: string;
  email: string;
  role: 'buyer' | 'publisher' | 'admin';
  organizationId?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  vatNumber?: string;
  country: string;
  createdAt: string;
}

export type MediaOutletStatus = 'pending' | 'approved' | 'rejected' | 'active';

export interface MediaOutlet {
  id: string;
  domain: string;
  language: string;
  country: string;
  niches: string[];
  category: string;
  price: number;
  purchase_price?: number; // What we pay publishers for their websites
  currency: string;
  guidelines: string;
  leadTimeDays: number;
  isActive: boolean;
  status: MediaOutletStatus; // Approval workflow status
  publisherId: string;
  submitted_by?: string; // UUID of user who submitted for approval
  submitted_at?: string; // When the website was submitted for approval
  reviewed_by?: string; // UUID of admin who reviewed the submission
  reviewed_at?: string; // When the submission was reviewed
  review_notes?: string; // Admin feedback on approval/rejection
  createdAt: string;
  updatedAt: string;
  acceptsNoLicense?: boolean; // Legacy field
  acceptsNoLicenseStatus?: 'yes' | 'no' | 'depends';
  sponsorTagStatus?: 'yes' | 'no';
  sponsorTagType?: 'image' | 'text';
}

export interface Metrics {
  id: string;
  mediaOutletId: string;
  ahrefsDR: number;
  mozDA: number;
  semrushAS: number;
  spamScore: number;
  organicTraffic: number;
  referringDomains: number;
  updatedAt: string;
}

export interface Listing {
  id: string;
  mediaOutletId: string;
  isActive: boolean;
  publisherId: string;
}

export interface Favorite {
  id: string;
  userId: string;
  mediaOutletId: string;
  createdAt: string;
}

export interface SavedFilter {
  id: string;
  userId: string;
  name: string;
  query: Record<string, unknown>;
  createdAt: string;
}

export interface CartItem {
  id: string;
  userId: string;
  mediaOutletId: string;
  price: number;
  currency: string;
  addedAt: string;
}

export type OrderStatus = 
  | 'requested' 
  | 'accepted' 
  | 'content_received' 
  | 'published' 
  | 'verified';

export interface Order {
  id: string;
  buyerId: string;
  publisherId: string;
  mediaOutletId: string;
  status: OrderStatus;
  price: number;
  currency: string;
  briefing?: string;
  anchor?: string;
  targetUrl?: string;
  publicationUrl?: string;
  publicationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutletNicheRule {
  id: string;
  mediaOutletId: string;
  nicheId: string;
  accepted: boolean;
  multiplier: number;
  nicheSlug?: string;
  nicheLabel?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaWithMetrics extends MediaOutlet {
  metrics: Metrics;
  isFavorite?: boolean;
  nicheRules?: OutletNicheRule[];
}

export interface FilterOptions {
  countries: string[];
  languages: string[];
  categories: string[];
  niches: string[];
  priceRange: {
    min: number;
    max: number;
  };
  drRange: {
    min: number;
    max: number;
  };
  organicTrafficRange: {
    min: number;
    max: number;
  };
  referringDomainsRange: {
    min: number;
    max: number;
  };
  spamScoreRange: {
    min: number;
    max: number;
  };
  showLowMetricSites: boolean;
  acceptedNiches?: string[];
  acceptsNoLicense?: string | boolean;
  sponsorTag?: string;
  onSale?: boolean;
}