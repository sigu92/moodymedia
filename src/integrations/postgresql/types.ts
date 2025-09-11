// PostgreSQL Database Types
// Dessa typer baseras på din befintliga databasstruktur

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Enum types
export type AppRole = "admin" | "publisher" | "buyer" | "system_admin";
export type OrderStatus = "requested" | "accepted" | "content_received" | "published" | "verified";

// Tabelltyper - baserat på din befintliga Supabase struktur
export interface ActivityFeed {
  id: string;
  user_id: string;
  actor_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Json;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string;
  action: string;
  target_table: string;
  target_id?: string;
  before_data?: Json;
  after_data?: Json;
  metadata?: Json;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  media_outlet_id: string;
  niche_id?: string;
  price: number;
  base_price?: number;
  final_price?: number;
  price_multiplier?: number;
  currency: string;
  added_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  media_outlet_id: string;
  created_at: string;
}

export interface Import {
  id: string;
  batch_id: string;
  created_by: string;
  source: string;
  source_url?: string;
  row_count: number;
  succeeded: number;
  failed: number;
  log_data?: Json;
  created_at: string;
}

export interface Listing {
  id: string;
  media_outlet_id: string;
  is_active: boolean;
  created_at: string;
}

export interface MediaOutlet {
  id: string;
  publisher_id: string;
  domain: string;
  category: string;
  country: string;
  language: string;
  niches: string[];
  price: number;
  sale_price?: number;
  currency: string;
  lead_time_days: number;
  min_word_count?: number;
  max_word_count?: number;
  content_types?: string[];
  forbidden_topics?: string[];
  required_format?: string;
  guidelines?: string;
  sale_note?: string;
  turnaround_time?: string;
  sponsor_tag?: string;
  sponsor_tag_type?: string;
  sponsor_tag_status?: string;
  accepts_no_license?: boolean;
  accepts_no_license_status?: string;
  source?: string;
  admin_tags?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: string;
  media_outlet_id: string;
  ahrefs_dr: number;
  moz_da: number;
  semrush_as: number;
  organic_traffic: number;
  referring_domains: number;
  spam_score: number;
  updated_at: string;
}

export interface Niche {
  id: string;
  label: string;
  slug: string;
  created_at: string;
}

export interface NicheMultiplierGlobal {
  id: string;
  niche_id: string;
  default_multiplier: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Json;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  order_updates: boolean;
  referral_updates: boolean;
  marketing_emails: boolean;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  buyer_id: string;
  publisher_id: string;
  media_outlet_id: string;
  original_price: number;
  suggested_price: number;
  message?: string;
  status: string;
  created_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  publisher_id: string;
  media_outlet_id: string;
  niche_id?: string;
  price: number;
  base_price?: number;
  final_price?: number;
  price_multiplier?: number;
  currency: string;
  status: OrderStatus;
  briefing?: string;
  anchor?: string;
  target_url?: string;
  publication_date?: string;
  publication_url?: string;
  stripe_session_id?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status?: OrderStatus;
  to_status: OrderStatus;
  changed_by: string;
  changed_at: string;
}

export interface Organization {
  id: string;
  name: string;
  country: string;
  company_name?: string;
  contact_person_name?: string;
  contact_person_email?: string;
  phone_number?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  website?: string;
  company_logo_url?: string;
  business_registration_number?: string;
  organizational_number?: string;
  tax_id?: string;
  vat_number?: string;
  default_currency?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  iban?: string;
  swift_bic?: string;
  payment_terms?: string;
  invoice_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface OutletNicheRule {
  id: string;
  media_outlet_id: string;
  niche_id: string;
  accepted: boolean;
  multiplier: number;
  created_at: string;
  updated_at: string;
}

export interface PayoutRequest {
  id: string;
  referrer_user_id: string;
  amount: number;
  status: string;
  notes?: string;
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  organization_id?: string;
  created_at: string;
}

export interface Referral {
  id: string;
  user_id: string;
  referred_user_id?: string;
  code: string;
  status?: string;
  total_orders?: number;
  total_spent?: number;
  reward_amount?: number;
  reward_paid?: boolean;
  first_order_date?: string;
  created_at: string;
}

export interface ReferralTransaction {
  id: string;
  user_id: string;
  referral_id: string;
  type: string;
  amount: number;
  status: string;
  description?: string;
  paid_at?: string;
  created_at: string;
}

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  query: Json;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  memo?: string;
  created_at: string;
}

export interface OrgSettings {
  id: string;
  user_id: string;
  name: string;
  company_name: string;
  primary_email: string;
  notification_email: string;
  orders_email: string;
  created_at: string;
  updated_at: string;
}

// Insert types (för att skapa nya poster)
export type ActivityFeedInsert = Omit<ActivityFeed, 'id' | 'created_at'>;
export type AuditLogInsert = Omit<AuditLog, 'id' | 'created_at'>;
export type CartItemInsert = Omit<CartItem, 'id' | 'added_at'>;
export type FavoriteInsert = Omit<Favorite, 'id' | 'created_at'>;
export type ImportInsert = Omit<Import, 'id' | 'created_at'>;
export type ListingInsert = Omit<Listing, 'id' | 'created_at'>;
export type MediaOutletInsert = Omit<MediaOutlet, 'id' | 'created_at' | 'updated_at'>;
export type MetricInsert = Omit<Metric, 'id' | 'updated_at'>;
export type NicheInsert = Omit<Niche, 'id' | 'created_at'>;
export type NicheMultiplierGlobalInsert = Omit<NicheMultiplierGlobal, 'id' | 'created_at'>;
export type NotificationInsert = Omit<Notification, 'id' | 'created_at' | 'updated_at'>;
export type NotificationSettingsInsert = Omit<NotificationSettings, 'id' | 'created_at' | 'updated_at'>;
export type OfferInsert = Omit<Offer, 'id' | 'created_at'>;
export type OrderInsert = Omit<Order, 'id' | 'created_at' | 'updated_at'>;
export type OrderStatusHistoryInsert = Omit<OrderStatusHistory, 'id' | 'changed_at'>;
export type OrganizationInsert = Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
export type OutletNicheRuleInsert = Omit<OutletNicheRule, 'id' | 'created_at' | 'updated_at'>;
export type PayoutRequestInsert = Omit<PayoutRequest, 'id' | 'created_at' | 'updated_at'>;
export type ProfileInsert = Omit<Profile, 'id' | 'created_at'>;
export type ReferralInsert = Omit<Referral, 'id' | 'created_at'>;
export type ReferralTransactionInsert = Omit<ReferralTransaction, 'id' | 'created_at'>;
export type SavedFilterInsert = Omit<SavedFilter, 'id' | 'created_at'>;
export type UserRoleInsert = Omit<UserRole, 'id' | 'created_at'>;
export type UserRoleAssignmentInsert = Omit<UserRoleAssignment, 'id' | 'created_at'>;
export type WalletTransactionInsert = Omit<WalletTransaction, 'id' | 'created_at'>;
export type OrgSettingsInsert = Omit<OrgSettings, 'id' | 'created_at' | 'updated_at'>;

// Update types (för att uppdatera poster)
export type ActivityFeedUpdate = Partial<Omit<ActivityFeed, 'id' | 'created_at'>>;
export type AuditLogUpdate = Partial<Omit<AuditLog, 'id' | 'created_at'>>;
export type CartItemUpdate = Partial<Omit<CartItem, 'id' | 'added_at'>>;
export type FavoriteUpdate = Partial<Omit<Favorite, 'id' | 'created_at'>>;
export type ImportUpdate = Partial<Omit<Import, 'id' | 'created_at'>>;
export type ListingUpdate = Partial<Omit<Listing, 'id' | 'created_at'>>;
export type MediaOutletUpdate = Partial<Omit<MediaOutlet, 'id' | 'created_at' | 'updated_at'>>;
export type MetricUpdate = Partial<Omit<Metric, 'id' | 'updated_at'>>;
export type NicheUpdate = Partial<Omit<Niche, 'id' | 'created_at'>>;
export type NicheMultiplierGlobalUpdate = Partial<Omit<NicheMultiplierGlobal, 'id' | 'created_at'>>;
export type NotificationUpdate = Partial<Omit<Notification, 'id' | 'created_at' | 'updated_at'>>;
export type NotificationSettingsUpdate = Partial<Omit<NotificationSettings, 'id' | 'created_at' | 'updated_at'>>;
export type OfferUpdate = Partial<Omit<Offer, 'id' | 'created_at'>>;
export type OrderUpdate = Partial<Omit<Order, 'id' | 'created_at' | 'updated_at'>>;
export type OrderStatusHistoryUpdate = Partial<Omit<OrderStatusHistory, 'id' | 'changed_at'>>;
export type OrganizationUpdate = Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>;
export type OutletNicheRuleUpdate = Partial<Omit<OutletNicheRule, 'id' | 'created_at' | 'updated_at'>>;
export type PayoutRequestUpdate = Partial<Omit<PayoutRequest, 'id' | 'created_at' | 'updated_at'>>;
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>;
export type ReferralUpdate = Partial<Omit<Referral, 'id' | 'created_at'>>;
export type ReferralTransactionUpdate = Partial<Omit<ReferralTransaction, 'id' | 'created_at'>>;
export type SavedFilterUpdate = Partial<Omit<SavedFilter, 'id' | 'created_at'>>;
export type UserRoleUpdate = Partial<Omit<UserRole, 'id' | 'created_at'>>;
export type UserRoleAssignmentUpdate = Partial<Omit<UserRoleAssignment, 'id' | 'created_at'>>;
export type WalletTransactionUpdate = Partial<Omit<WalletTransaction, 'id' | 'created_at'>>;
export type OrgSettingsUpdate = Partial<Omit<OrgSettings, 'id' | 'created_at' | 'updated_at'>>;
